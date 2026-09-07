// Aroma FoodLand — transactional email design system.
// One shared layout + a small set of composable pieces (button, item table,
// status badge, detail rows) so every email in the app looks like it came
// from the same brand, and adding a new email type is a few lines, not a
// new HTML document. Colors are kept in sync with frontend/css/tokens.css.

const { env } = require('../config/env');

const COLOR_PRIMARY = '#B8452F';
const COLOR_PRIMARY_DARK = '#93341F';
const COLOR_SECONDARY = '#1F3D2B';
const COLOR_ACCENT = '#D69A3C';
const COLOR_BG = '#FBF6EF';
const COLOR_SURFACE = '#FFFFFF';
const COLOR_SURFACE_ALT = '#F3ECE1';
const COLOR_TEXT = '#221A14';
const COLOR_MUTED = '#6E6154';
const COLOR_BORDER = '#E6DCCC';

const SITE_URL = env.frontendUrl || '';
const RESTAURANT_ADDRESS = '74 Okpe Road, beside Foodland, Sapele, Delta State, Nigeria';
const RESTAURANT_PHONE = '+234 810 398 0362';

const naira = (n) => `\u20A6${Number(n || 0).toLocaleString('en-NG')}`;

// ---------------------------------------------------------------------------
// Layout & building blocks
// ---------------------------------------------------------------------------

// Preheader: invisible text that shows as the preview line in most inboxes
// (Gmail/Outlook/Apple Mail), so the email is useful before it's even opened.
function preheader(text) {
  return `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;opacity:0;">${text}</div>`;
}

function button(label, url, { color = COLOR_PRIMARY } = {}) {
  if (!url) return '';
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
      <tr><td style="border-radius:999px; background:${color};">
        <a href="${url}" target="_blank" style="display:inline-block; padding:12px 28px; font-size:14px; font-weight:600; color:#ffffff; text-decoration:none; border-radius:999px;">${label}</a>
      </td></tr>
    </table>`;
}

function badge(text, color = COLOR_ACCENT, bg = '#F6E7CB') {
  return `<span style="display:inline-block; padding:4px 12px; border-radius:999px; font-size:12px; font-weight:700; color:${color}; background:${bg};">${text}</span>`;
}

function detailRow(label, value) {
  if (!value) return '';
  return `
    <tr>
      <td style="padding:6px 0; font-size:13px; color:${COLOR_MUTED}; width:140px; vertical-align:top;">${label}</td>
      <td style="padding:6px 0; font-size:13px; color:${COLOR_TEXT}; font-weight:600;">${value}</td>
    </tr>`;
}

function detailTable(rows) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:16px 0;">${rows.join('')}</table>`;
}

// Renders an order's line items as a clean itemized table with a totals
// footer — used by the order confirmation email.
function itemsTable(items = [], { subtotal, deliveryFee, total } = {}) {
  if (!items.length) return '';
  const rows = items.map((it) => `
    <tr>
      <td style="padding:10px 0; border-bottom:1px solid ${COLOR_BORDER}; font-size:13px; color:${COLOR_TEXT};">
        ${it.quantity}&times; ${it.meal_name}
        ${it.special_instructions ? `<div style="font-size:12px; color:${COLOR_MUTED}; margin-top:2px;">"${it.special_instructions}"</div>` : ''}
      </td>
      <td style="padding:10px 0; border-bottom:1px solid ${COLOR_BORDER}; font-size:13px; color:${COLOR_TEXT}; text-align:right; white-space:nowrap;">${naira(it.line_total)}</td>
    </tr>`).join('');

  const totalsRows = [
    subtotal !== undefined ? `<tr><td style="padding:4px 0; font-size:13px; color:${COLOR_MUTED};">Subtotal</td><td style="padding:4px 0; font-size:13px; text-align:right;">${naira(subtotal)}</td></tr>` : '',
    deliveryFee ? `<tr><td style="padding:4px 0; font-size:13px; color:${COLOR_MUTED};">Delivery fee</td><td style="padding:4px 0; font-size:13px; text-align:right;">${naira(deliveryFee)}</td></tr>` : '',
    total !== undefined ? `<tr><td style="padding:10px 0 0; font-size:15px; font-weight:700; color:${COLOR_TEXT};">Total</td><td style="padding:10px 0 0; font-size:15px; font-weight:700; text-align:right; color:${COLOR_PRIMARY};">${naira(total)}</td></tr>` : '',
  ].join('');

  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:16px 0;">
      ${rows}
    </table>
    <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin-top:4px;">
      ${totalsRows}
    </table>`;
}

// The shared shell every email is rendered inside.
function baseLayout({ title, preheaderText = '', bodyHtml, accent = COLOR_PRIMARY }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${title}</title>
</head>
<body style="margin:0; padding:0;">
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif; background:${COLOR_BG}; padding:32px 16px;">
    ${preheaderText ? preheader(preheaderText) : ''}
    <table role="presentation" cellpadding="0" cellspacing="0" align="center" style="width:100%; max-width:560px; margin:0 auto; background:${COLOR_SURFACE}; border-radius:16px; overflow:hidden; border:1px solid ${COLOR_BORDER};">
      <tr>
        <td style="background:${COLOR_SECONDARY}; padding:28px 32px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="width:40px; height:40px; border-radius:50%; background:${accent}; text-align:center; vertical-align:middle;">
              <span style="color:#fff; font-family:Georgia,serif; font-weight:700; font-size:16px; line-height:40px;">AF</span>
            </td>
            <td style="padding-left:12px; vertical-align:middle;">
              <span style="color:#F6F1E8; font-size:18px; font-weight:700; letter-spacing:0.2px;">Aroma FoodLand</span>
            </td>
          </tr></table>
        </td>
      </tr>
      <tr>
        <td style="padding:32px;">
          <h1 style="margin:0 0 6px; font-size:20px; color:${COLOR_TEXT}; font-family:Georgia,serif;">${title}</h1>
          <div style="font-size:14px; line-height:1.65; color:${COLOR_TEXT};">${bodyHtml}</div>
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px; background:${COLOR_SURFACE_ALT}; border-top:1px solid ${COLOR_BORDER};">
          <p style="margin:0 0 4px; font-size:12px; color:${COLOR_MUTED}; font-weight:600;">Aroma FoodLand</p>
          <p style="margin:0; font-size:12px; color:${COLOR_MUTED};">${RESTAURANT_ADDRESS}<br/>${RESTAURANT_PHONE}</p>
        </td>
      </tr>
    </table>
    <p style="text-align:center; font-size:11px; color:#B3A793; margin-top:16px;">You're receiving this because of an interaction with Aroma FoodLand.</p>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Customer-facing templates
// ---------------------------------------------------------------------------

const orderConfirmation = (order, items = []) => baseLayout({
  title: `Order Confirmed — #${order.order_number}`,
  preheaderText: `Your order is confirmed. Total ${naira(order.total)}.`,
  bodyHtml: `
    <p>Hi ${order.customer_name},</p>
    <p>Thanks for your order! We've received it and it's ${badge((order.status || 'confirmed').replace('_', ' '), COLOR_SECONDARY, '#E4EAE3')}.</p>
    ${itemsTable(items, { subtotal: order.subtotal, deliveryFee: order.delivery_fee, total: order.total })}
    ${detailTable([
    detailRow('Order type', order.order_type ? order.order_type.replace('_', ' ') : ''),
    detailRow('Delivery to', order.delivery_address_text),
  ])}
    ${button('Track your order', SITE_URL ? `${SITE_URL}/order-details.html?id=${order.id}` : '')}
    <p style="color:${COLOR_MUTED}; font-size:13px;">We'll email you again as your order moves through preparation.</p>`,
});

const paymentConfirmation = (order, payment) => baseLayout({
  title: 'Payment Received',
  preheaderText: `We've received your payment of ${naira(payment.amount)}.`,
  bodyHtml: `
    <p>Hi ${order.customer_name},</p>
    <p>We've confirmed your payment for order <strong>#${order.order_number}</strong>.</p>
    ${detailTable([
    detailRow('Amount paid', naira(payment.amount)),
    detailRow('Reference', payment.payment_reference),
    detailRow('Method', payment.payment_method ? payment.payment_method.replace('_', ' ') : 'Card / Transfer'),
  ])}
    ${button('View order', SITE_URL ? `${SITE_URL}/order-details.html?id=${order.id}` : '')}`,
});

const ORDER_STATUS_COPY = {
  confirmed: { label: 'Confirmed', note: "We've sent it to the kitchen." },
  preparing: { label: 'Preparing', note: 'Our kitchen is working on it now.' },
  ready: { label: 'Ready', note: 'Your order is ready.' },
  out_for_delivery: { label: 'Out for delivery', note: "It's on its way to you." },
  completed: { label: 'Completed', note: 'Enjoy your meal! We\u2019d love a review.' },
  cancelled: { label: 'Cancelled', note: 'If this is unexpected, please contact us.' },
};

const orderStatusUpdate = (order) => {
  const copy = ORDER_STATUS_COPY[order.status] || { label: order.status.replace('_', ' '), note: '' };
  return baseLayout({
    title: `Order Update — #${order.order_number}`,
    preheaderText: `Your order is now ${copy.label}.`,
    bodyHtml: `
      <p>Hi ${order.customer_name},</p>
      <p>Your order is now ${badge(copy.label, COLOR_SECONDARY, '#E4EAE3')}</p>
      <p style="color:${COLOR_MUTED};">${copy.note}</p>
      ${button('View order', SITE_URL ? `${SITE_URL}/order-details.html?id=${order.id}` : '')}`,
  });
};

const reservationConfirmation = (r) => baseLayout({
  title: 'Reservation Received',
  preheaderText: `Table for ${r.guests} on ${r.reservation_date} at ${r.reservation_time}.`,
  bodyHtml: `
    <p>Hi ${r.customer_name},</p>
    <p>We've received your reservation request.</p>
    ${detailTable([
    detailRow('Date', r.reservation_date),
    detailRow('Time', r.reservation_time),
    detailRow('Party size', `${r.guests} guest${r.guests === 1 ? '' : 's'}`),
    detailRow('Special request', r.special_request),
  ])}
    <p style="color:${COLOR_MUTED}; font-size:13px;">Our team will confirm this shortly — you'll get another email once it's confirmed.</p>`,
});

const reservationStatusUpdate = (r) => baseLayout({
  title: r.status === 'confirmed' ? 'Reservation Confirmed' : `Reservation ${r.status.replace('_', ' ')}`,
  preheaderText: `Your table for ${r.guests} on ${r.reservation_date}.`,
  bodyHtml: `
    <p>Hi ${r.customer_name},</p>
    <p>Your reservation is now ${badge(r.status.replace('_', ' '), COLOR_SECONDARY, '#E4EAE3')}</p>
    ${detailTable([
    detailRow('Date', r.reservation_date),
    detailRow('Time', r.reservation_time),
    detailRow('Party size', `${r.guests} guest${r.guests === 1 ? '' : 's'}`),
  ])}
    <p>We look forward to hosting you at Aroma FoodLand.</p>`,
});

const reservationReminder = (r) => baseLayout({
  title: 'Reservation Reminder',
  preheaderText: `Reminder: your table today at ${r.reservation_time}.`,
  bodyHtml: `
    <p>Hi ${r.customer_name},</p>
    <p>Just a reminder \u2014 your table for <strong>${r.guests}</strong> is booked <strong>today at ${r.reservation_time}</strong>.</p>
    <p style="color:${COLOR_MUTED}; font-size:13px;">We look forward to seeing you.</p>`,
});

const BOOKING_LABELS = { catering: 'catering/event', hotel: 'hotel' };

const bookingStatusUpdate = (booking, kind, adminNotes) => {
  const label = BOOKING_LABELS[kind] || 'booking';
  const rows = kind === 'catering'
    ? [detailRow('Event type', booking.event_type?.replace('_', ' ')), detailRow('Date', booking.event_date), detailRow('Guests', booking.guests), detailRow('Location', booking.location)]
    : [detailRow('Check-in', booking.check_in), detailRow('Check-out', booking.check_out), detailRow('Guests', booking.guests), detailRow('Room type', booking.room_type)];

  return baseLayout({
    title: `${label[0].toUpperCase()}${label.slice(1)} Request ${booking.status[0].toUpperCase()}${booking.status.slice(1)}`,
    preheaderText: `Your ${label} request has been ${booking.status}.`,
    bodyHtml: `
      <p>Hi ${booking.customer_name},</p>
      <p>Your ${label} request is now ${badge(booking.status, COLOR_SECONDARY, '#E4EAE3')}</p>
      ${detailTable(rows)}
      ${adminNotes ? `<div style="margin-top:16px; padding:14px 16px; background:${COLOR_SURFACE_ALT}; border-radius:10px; font-size:13px; color:${COLOR_TEXT};"><strong>Note from our team:</strong><br/>${adminNotes}</div>` : ''}`,
  });
};

const contactAcknowledgement = (msg) => baseLayout({
  title: "We've received your message",
  preheaderText: 'Thanks for reaching out to Aroma FoodLand.',
  bodyHtml: `
    <p>Hi ${msg.name},</p>
    <p>Thanks for reaching out to Aroma FoodLand. Our team will respond shortly.</p>
    <div style="margin-top:16px; padding:14px 16px; background:${COLOR_SURFACE_ALT}; border-left:3px solid ${COLOR_ACCENT}; border-radius:0 10px 10px 0; font-size:13px; color:${COLOR_MUTED}; white-space:pre-wrap;">${msg.message}</div>`,
});

// ---------------------------------------------------------------------------
// Internal / staff-facing alert templates (sent to restaurant_settings.email)
// ---------------------------------------------------------------------------

const adminNewOrderAlert = (order, itemCount) => baseLayout({
  title: `New Order — #${order.order_number}`,
  accent: COLOR_ACCENT,
  bodyHtml: `
    <p>A new ${order.order_type.replace('_', ' ')} order just came in.</p>
    ${detailTable([
    detailRow('Customer', `${order.customer_name} (${order.customer_phone})`),
    detailRow('Items', itemCount ? `${itemCount} item${itemCount === 1 ? '' : 's'}` : undefined),
    detailRow('Total', naira(order.total)),
  ])}
    ${button('Open in admin dashboard', SITE_URL ? `${SITE_URL}/admin.html` : '', { color: COLOR_SECONDARY })}`,
});

const adminNewBookingAlert = (booking, kind) => {
  const label = BOOKING_LABELS[kind] || 'booking';
  return baseLayout({
    title: `New ${label} request \u2014 ${booking.customer_name}`,
    accent: COLOR_ACCENT,
    bodyHtml: `
      <p>A new ${label} request needs review.</p>
      ${detailTable([
      detailRow('Customer', `${booking.customer_name} (${booking.customer_phone}, ${booking.customer_email})`),
      detailRow(kind === 'catering' ? 'Event date' : 'Check-in', kind === 'catering' ? booking.event_date : booking.check_in),
    ])}
      ${button('Review in admin dashboard', SITE_URL ? `${SITE_URL}/admin.html` : '', { color: COLOR_SECONDARY })}`,
  });
};

const adminNewContactAlert = (msg) => baseLayout({
  title: `New message: ${msg.subject || 'General inquiry'}`,
  accent: COLOR_ACCENT,
  bodyHtml: `
    ${detailTable([
    detailRow('From', `${msg.name} (${msg.email}${msg.phone ? `, ${msg.phone}` : ''})`),
  ])}
    <div style="margin-top:12px; padding:14px 16px; background:${COLOR_SURFACE_ALT}; border-radius:10px; font-size:13px; white-space:pre-wrap;">${msg.message}</div>
    ${button('Open in admin dashboard', SITE_URL ? `${SITE_URL}/admin.html` : '', { color: COLOR_SECONDARY })}`,
});

module.exports = {
  orderConfirmation,
  paymentConfirmation,
  orderStatusUpdate,
  reservationConfirmation,
  reservationStatusUpdate,
  reservationReminder,
  bookingStatusUpdate,
  contactAcknowledgement,
  adminNewOrderAlert,
  adminNewBookingAlert,
  adminNewContactAlert,
};