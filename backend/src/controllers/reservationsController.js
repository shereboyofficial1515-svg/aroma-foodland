const { supabaseAdmin } = require('../config/supabase');
const { AppError, asyncHandler } = require('../utils/AppError');
const { notify } = require('../services/notificationService');
const { sendEmail } = require('../services/emailService');
const templates = require('../services/emailTemplates');
const { recordAudit } = require('../services/auditService');

const isStaff = (req) => req.user && ['staff', 'manager', 'admin', 'super_admin'].includes(req.user.profile.role);

// ---------------------------------------------------------------------------
// GET /api/v1/reservations/availability?date=YYYY-MM-DD
// Returns every active slot for that date with remaining capacity, so the
// frontend can grey out full slots instead of letting the customer hit the
// DB-level capacity guard and get an error.
// ---------------------------------------------------------------------------
const availability = asyncHandler(async (req, res) => {
  const { date } = req.query;

  const { data: slots, error: slotsError } = await supabaseAdmin
    .from('reservation_slots')
    .select('*')
    .eq('is_active', true)
    .order('slot_time', { ascending: true });
  if (slotsError) {
    console.error('[reservationsController] database error:', slotsError);
    throw new AppError('Could not load availability.', 500, 'FETCH_FAILED');
  }
  const { data: booked, error: bookedError } = await supabaseAdmin
    .from('reservations')
    .select('reservation_time, guests')
    .eq('reservation_date', date)
    .in('status', ['pending', 'confirmed', 'seated']);
  if (bookedError) {
    console.error('[reservationsController] database error:', bookedError);
    throw new AppError('Could not load availability.', 500, 'FETCH_FAILED');
  }
  const bookedByTime = booked.reduce((acc, r) => {
    acc[r.reservation_time] = (acc[r.reservation_time] || 0) + r.guests;
    return acc;
  }, {});

  const result = slots.map((slot) => {
    const usedGuests = bookedByTime[slot.slot_time] || 0;
    return {
      slot_time: slot.slot_time,
      max_capacity: slot.max_capacity,
      remaining: Math.max(slot.max_capacity - usedGuests, 0),
      is_full: usedGuests >= slot.max_capacity,
    };
  });

  res.json({ success: true, date, slots: result });
});

// ---------------------------------------------------------------------------
// POST /api/v1/reservations
// ---------------------------------------------------------------------------
const create = asyncHandler(async (req, res) => {
  const payload = { ...req.body, user_id: req.user?.id || null };

  const { data: reservation, error } = await supabaseAdmin.from('reservations').insert(payload).select().single();

  if (error) {
    // The DB trigger (check_reservation_capacity) raises a plain exception
    // with a customer-friendly message when a slot is full — surface it as-is.
    if (error.message?.includes('fully booked')) {
      throw new AppError('This time slot is fully booked. Please choose another time.', 409, 'SLOT_FULL');
    }
    throw new AppError('Your reservation could not be completed. Please choose another time.', 400, 'RESERVATION_FAILED');
  }

  await notify({
    userId: reservation.user_id,
    type: 'reservation_confirmed',
    title: 'Reservation received',
    message: `We've received your reservation for ${reservation.guests} on ${reservation.reservation_date} at ${reservation.reservation_time}.`,
    metadata: { reservation_id: reservation.id },
  });
  await sendEmail({ to: reservation.customer_email, subject: 'Reservation Received — Aroma FoodLand', html: templates.reservationConfirmation(reservation) });

  res.status(201).json({ success: true, reservation, message: 'Reservation received. We will confirm it shortly.' });
});

// ---------------------------------------------------------------------------
// GET /api/v1/reservations — mine (customer) or all (staff)
// ---------------------------------------------------------------------------
const list = asyncHandler(async (req, res) => {
  const { status, date, page = 1, limit = 20 } = req.query;

  let query = supabaseAdmin.from('reservations').select('*', { count: 'exact' }).order('reservation_date', { ascending: false }).order('reservation_time', { ascending: false });

  if (!isStaff(req)) query = query.eq('user_id', req.user.id);
  if (status) query = query.eq('status', status);
  if (date) query = query.eq('reservation_date', date);

  const from = (page - 1) * limit;
  query = query.range(from, from + limit - 1);

  const { data, error, count } = await query;
  if (error) {
    console.error('[reservationsController] database error:', error);
    throw new AppError('Could not load reservations.', 500, 'FETCH_FAILED');
  }
  res.json({ success: true, reservations: data, pagination: { page: Number(page), limit: Number(limit), total: count || 0 } });
});

const getById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabaseAdmin.from('reservations').select('*').eq('id', id).single();
  if (error || !data) throw new AppError('Reservation not found.', 404, 'NOT_FOUND');
  if (data.user_id !== req.user.id && !isStaff(req)) throw new AppError("You don't have permission to view this reservation.", 403, 'FORBIDDEN');
  res.json({ success: true, reservation: data });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/reservations/:id/status  (staff+): confirm/seat/complete/cancel/no-show
// ---------------------------------------------------------------------------
const updateStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const { data: reservation, error } = await supabaseAdmin.from('reservations').update({ status }).eq('id', id).select().single();
  if (error || !reservation) throw new AppError('Reservation not found.', 404, 'NOT_FOUND');

  if (status === 'confirmed') {
    await notify({ userId: reservation.user_id, type: 'reservation_confirmed', title: 'Reservation confirmed', message: `Your table for ${reservation.guests} on ${reservation.reservation_date} at ${reservation.reservation_time} is confirmed.`, metadata: { reservation_id: id } });
    await sendEmail({ to: reservation.customer_email, subject: 'Reservation Confirmed — Aroma FoodLand', html: templates.reservationStatusUpdate(reservation) });
  } else if (status === 'cancelled') {
    await notify({ userId: reservation.user_id, type: 'reservation_cancelled', title: 'Reservation cancelled', message: `Your reservation for ${reservation.reservation_date} at ${reservation.reservation_time} was cancelled.`, metadata: { reservation_id: id } });
    await sendEmail({ to: reservation.customer_email, subject: 'Reservation Cancelled — Aroma FoodLand', html: templates.reservationStatusUpdate(reservation) });
  }

  await recordAudit({ userId: req.user.id, action: 'reservation_status_changed', resourceType: 'reservation', resourceId: id, metadata: { status }, ip: req.ip });
  res.json({ success: true, reservation });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/reservations/:id/reschedule  (owner or staff)
// ---------------------------------------------------------------------------
const reschedule = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const { data: existing } = await supabaseAdmin.from('reservations').select('*').eq('id', id).single();
  if (!existing) throw new AppError('Reservation not found.', 404, 'NOT_FOUND');
  if (existing.user_id !== req.user.id && !isStaff(req)) throw new AppError("You don't have permission to modify this reservation.", 403, 'FORBIDDEN');

  const { data, error } = await supabaseAdmin
    .from('reservations')
    .update({ reservation_date: req.body.reservation_date, reservation_time: req.body.reservation_time, status: 'pending' })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.message?.includes('fully booked')) throw new AppError('That time slot is fully booked. Please choose another time.', 409, 'SLOT_FULL');
    throw new AppError('Could not reschedule. Please choose another time.', 400, 'RESCHEDULE_FAILED');
  }

  res.json({ success: true, reservation: data, message: 'Reservation rescheduled and is pending confirmation again.' });
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/reservations/:id  (owner cancels their own, or staff)
// ---------------------------------------------------------------------------
const cancel = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { data: existing } = await supabaseAdmin.from('reservations').select('*').eq('id', id).single();
  if (!existing) throw new AppError('Reservation not found.', 404, 'NOT_FOUND');
  if (existing.user_id !== req.user.id && !isStaff(req)) throw new AppError("You don't have permission to cancel this reservation.", 403, 'FORBIDDEN');

  const { data, error } = await supabaseAdmin.from('reservations').update({ status: 'cancelled' }).eq('id', id).select().single();
  if (error) {
    console.error('[reservationsController] database error:', error);
    throw new AppError('Could not cancel reservation.', 500, 'CANCEL_FAILED');
  }
  res.json({ success: true, reservation: data });
});

// ---------------------------------------------------------------------------
// Slot capacity management (staff+)
// ---------------------------------------------------------------------------
const listSlots = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin.from('reservation_slots').select('*').order('slot_time', { ascending: true });
  if (error) {
    console.error('[reservationsController] database error:', error);
    throw new AppError('Could not load slots.', 500, 'FETCH_FAILED');
  }
  res.json({ success: true, slots: data });
});

const upsertSlot = asyncHandler(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('reservation_slots')
    .upsert(req.body, { onConflict: 'slot_time' })
    .select()
    .single();
  if (error) {
    console.error('[reservationsController] database error:', error);
    throw new AppError('Could not save slot.', 500, 'SAVE_FAILED');
  }
  await recordAudit({ userId: req.user.id, action: 'reservation_slot_updated', resourceType: 'reservation_slot', resourceId: data.id, metadata: req.body, ip: req.ip });
  res.json({ success: true, slot: data });
});

// ---------------------------------------------------------------------------
// POST /api/v1/reservations/send-reminders (staff+) — sends reminder emails
// for today's confirmed reservations. Intended to be triggered by an
// external scheduler (cron / hosting platform's scheduled jobs) hitting
// this endpoint once a day; also callable manually from the admin dashboard.
// ---------------------------------------------------------------------------
const sendReminders = asyncHandler(async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const { data: reservations, error } = await supabaseAdmin
    .from('reservations')
    .select('*')
    .eq('reservation_date', today)
    .eq('status', 'confirmed');
  if (error) {
    console.error('[reservationsController] database error:', error);
    throw new AppError('Could not load today\'s reservations.', 500, 'FETCH_FAILED');
  }
  let sent = 0;
  for (const r of reservations) {
    // eslint-disable-next-line no-await-in-loop
    const result = await sendEmail({ to: r.customer_email, subject: 'Reservation Reminder — Aroma FoodLand', html: templates.reservationReminder(r) });
    if (result.sent) sent += 1;
    // eslint-disable-next-line no-await-in-loop
    await notify({ userId: r.user_id, type: 'reservation_reminder', title: 'Reservation today', message: `Reminder: your table for ${r.guests} is booked today at ${r.reservation_time}.`, metadata: { reservation_id: r.id } });
  }

  res.json({ success: true, message: `Sent ${sent} of ${reservations.length} reminder(s).` });
});

module.exports = { availability, create, list, getById, updateStatus, reschedule, cancel, listSlots, upsertSlot, sendReminders };