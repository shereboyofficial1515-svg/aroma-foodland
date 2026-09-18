const { supabaseAdmin } = require('../config/supabase');
const { AppError, asyncHandler } = require('../utils/AppError');
const { slugify } = require('../utils/schemas/serviceSchemas');
const { uploadImage, deleteImage } = require('../services/storageService');
const { recordAudit } = require('../services/auditService');

const isStaff = (req) => req.user && ['staff', 'manager', 'admin', 'super_admin'].includes(req.user.profile.role);

// ---------------------------------------------------------------------------
// GET /api/v1/services — public: active only, ordered for display.
// Staff (optionalAuth) also see inactive ones so the admin list can show
// disabled services with their real state instead of hiding them entirely.
// ---------------------------------------------------------------------------
const list = asyncHandler(async (req, res) => {
    let query = supabaseAdmin.from('services').select('*').order('display_order', { ascending: true });
    if (!isStaff(req)) query = query.eq('is_active', true);

    const { data, error } = await query;
    if (error) {
        console.error('[services] database error:', error);
        throw new AppError('Could not load services.', 500, 'FETCH_FAILED');
    }
    res.json({ success: true, services: data });
});

const create = asyncHandler(async (req, res) => {
    const payload = { ...req.body };
    const slug = slugify(payload.name);

    const { data, error } = await supabaseAdmin
        .from('services')
        .insert({ ...payload, slug, created_by: req.user.id })
        .select()
        .single();

    if (error) {
        if (error.code === '23505') throw new AppError('A service with this name already exists.', 409, 'DUPLICATE_SERVICE');
        console.error('[services] create failed:', error);
        throw new AppError('Could not create service.', 500, 'CREATE_FAILED');
    }

    await recordAudit({ userId: req.user.id, action: 'service_created', resourceType: 'service', resourceId: data.id, metadata: { name: data.name }, ip: req.ip });
    res.status(201).json({ success: true, service: data });
});

const update = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const payload = { ...req.body };
    if (payload.name) payload.slug = slugify(payload.name);

    const { data, error } = await supabaseAdmin.from('services').update(payload).eq('id', id).select().single();
    if (error || !data) throw new AppError('Service not found.', 404, 'NOT_FOUND');

    await recordAudit({ userId: req.user.id, action: 'service_updated', resourceType: 'service', resourceId: id, metadata: payload, ip: req.ip });
    res.json({ success: true, service: data });
});

const remove = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { data: service } = await supabaseAdmin.from('services').select('image_url').eq('id', id).single();

    const { error } = await supabaseAdmin.from('services').delete().eq('id', id);
    if (error) throw new AppError('Could not delete service.', 500, 'DELETE_FAILED');

    if (service?.image_url) {
        const path = service.image_url.split('/promo-images/')[1];
        if (path) await deleteImage('promo-images', path);
    }

    await recordAudit({ userId: req.user.id, action: 'service_deleted', resourceType: 'service', resourceId: id, ip: req.ip });
    res.json({ success: true, message: 'Service deleted.' });
});

// ---------------------------------------------------------------------------
// POST /api/v1/services/:id/image  (staff+) — single image upload, replaces
// any existing image (and cleans up the old file from Storage).
// ---------------------------------------------------------------------------
const uploadServiceImage = asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!req.file) throw new AppError('No image uploaded.', 400, 'NO_FILE');

    const { data: service } = await supabaseAdmin.from('services').select('id, image_url').eq('id', id).single();
    if (!service) throw new AppError('Service not found.', 404, 'NOT_FOUND');

    const { url } = await uploadImage('promo-images', req.file, `services/${id}`);

    const { data, error } = await supabaseAdmin.from('services').update({ image_url: url }).eq('id', id).select().single();
    if (error) throw new AppError('Image uploaded but could not be attached to the service.', 500, 'LINK_FAILED');

    if (service.image_url) {
        const oldPath = service.image_url.split('/promo-images/')[1];
        if (oldPath) await deleteImage('promo-images', oldPath);
    }

    res.status(201).json({ success: true, service: data });
});

module.exports = { list, create, update, remove, uploadServiceImage };