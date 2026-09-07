const { supabaseAdmin } = require('../config/supabase');
const { AppError, asyncHandler } = require('../utils/AppError');
const { notify } = require('../services/notificationService');
const { sendEmail } = require('../services/emailService');
const templates = require('../services/emailTemplates');
const { recordAudit } = require('../services/auditService');

const isStaff = (req) => req.user && ['staff', 'manager', 'admin', 'super_admin'].includes(req.user.profile.role);

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.length) return value.split(',').map((s) => s.trim()).filter(Boolean);
  return undefined;
}

// Factory that builds a full CRUD controller for a bookings-shaped table
// (catering_bookings, hotel_bookings). Keeps the two booking types
// consistent without duplicating the same logic twice.
function makeBookingController(table, { label, kind, notifyType = 'booking_update' }) {
  const create = asyncHandler(async (req, res) => {
    const payload = { ...req.body, user_id: req.user?.id || null };
    if (payload.services_required !== undefined) payload.services_required = toArray(payload.services_required);

    const { data, error } = await supabaseAdmin.from(table).insert(payload).select().single();
    if (error) {
      console.error('[bookingsController] database error:', error);
      throw new AppError(`Could not submit your ${label} request. Please try again.`, 400, 'BOOKING_FAILED');
    }
    await notify({
      userId: data.user_id,
      type: notifyType,
      title: `${label} request received`,
      message: `We've received your ${label} request. Our team will get back to you shortly.`,
      metadata: { booking_id: data.id, table },
    });

    // Admin alert — sent to the restaurant's own inbox so staff notice new
    // requests even before checking the admin dashboard.
    const { data: settings } = await supabaseAdmin.from('restaurant_settings').select('email').eq('id', 1).single();
    if (settings?.email) {
      await sendEmail({
        to: settings.email,
        subject: `New ${label} request — ${data.customer_name}`,
        html: templates.adminNewBookingAlert(data, kind),
      });
    }

    res.status(201).json({ success: true, booking: data, message: `Your ${label} request has been received.` });
  });

  const list = asyncHandler(async (req, res) => {
    const { status, page = 1, limit = 20 } = req.query;
    let query = supabaseAdmin.from(table).select('*', { count: 'exact' }).order('created_at', { ascending: false });
    if (!isStaff(req)) query = query.eq('user_id', req.user.id);
    if (status) query = query.eq('status', status);
    const from = (page - 1) * limit;
    query = query.range(from, from + limit - 1);

    const { data, error, count } = await query;
    if (error) {
      console.error('[bookingsController] database error:', error);
      throw new AppError(`Could not load ${label} requests.`, 500, 'FETCH_FAILED');
    }
    res.json({ success: true, bookings: data, pagination: { page: Number(page), limit: Number(limit), total: count || 0 } });
  });

  const getById = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabaseAdmin.from(table).select('*').eq('id', id).single();
    if (error || !data) throw new AppError('Booking not found.', 404, 'NOT_FOUND');
    if (data.user_id !== req.user.id && !isStaff(req)) throw new AppError("You don't have permission to view this booking.", 403, 'FORBIDDEN');
    res.json({ success: true, booking: data });
  });

  const updateStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, admin_notes } = req.body;

    const { data, error } = await supabaseAdmin
      .from(table)
      .update({ status, ...(admin_notes !== undefined && { admin_notes }) })
      .eq('id', id)
      .select()
      .single();
    if (error || !data) throw new AppError('Booking not found.', 404, 'NOT_FOUND');

    await notify({
      userId: data.user_id,
      type: notifyType,
      title: `${label} request ${status}`,
      message: `Your ${label} request has been ${status}.`,
      metadata: { booking_id: id, table },
    });
    await sendEmail({
      to: data.customer_email,
      subject: `${label} Request ${status[0].toUpperCase()}${status.slice(1)} — Aroma FoodLand`,
      html: templates.bookingStatusUpdate(data, kind, admin_notes),
    });
    await recordAudit({ userId: req.user.id, action: `${table}_status_changed`, resourceType: table, resourceId: id, metadata: { status }, ip: req.ip });

    res.json({ success: true, booking: data });
  });

  return { create, list, getById, updateStatus };
}

const catering = makeBookingController('catering_bookings', { label: 'catering/event', kind: 'catering', notifyType: 'booking_update' });
const hotel = makeBookingController('hotel_bookings', { label: 'hotel', kind: 'hotel', notifyType: 'booking_update' });

module.exports = { catering, hotel };