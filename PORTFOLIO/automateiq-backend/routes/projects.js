require('dotenv').config()
const router   = require('express').Router()
const { createClient } = require('@supabase/supabase-js')
const verifyToken = require('../middleware/auth')
const { uploadImage, uploadVideo } = require('../middleware/upload')
const { deleteFile } = require('../utils/cloudinary')
const multer = require('multer')
const cloudinary = require('cloudinary').v2

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// ── Multi-field upload (video + thumbnail in one request) ──
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const multiStorage = multer({
  storage: multer.memoryStorage()
})

// Helper: upload buffer to Cloudinary
async function uploadToCloudinary(buffer, folder, resourceType = 'image') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (err, result) => err ? reject(err) : resolve(result)
    )
    stream.end(buffer)
  })
}

// Helper: extract public_id from Cloudinary URL
function getPublicId(url) {
  if (!url) return null
  const parts = url.split('/')
  const file  = parts[parts.length - 1].split('.')[0]
  const folder = parts.slice(parts.indexOf('automateiq')).join('/').split('.')[0]
  return folder || file
}

// ── PUBLIC ──────────────────────────────────────────────────

// GET /api/projects
router.get('/', async (req, res) => {
  try {
    let query = supabase.from('projects').select('*').eq('is_active', true).order('sort_order')
    if (req.query.category) query = query.eq('category', req.query.category)
    const { data, error } = await query
    if (error) throw error
    res.json({ success: true, message: 'Projects fetched', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('projects').select('*').eq('id', req.params.id).single()
    if (error || !data)
      return res.status(404).json({ success: false, message: 'Project not found' })
    res.json({ success: true, message: 'Project fetched', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// ── ADMIN ───────────────────────────────────────────────────

// POST /api/projects  (multipart: video + thumbnail optional)
router.post('/', verifyToken, multiStorage.fields([{ name: 'video' }, { name: 'thumbnail' }]), async (req, res) => {
  try {
    const { title, description, category, sort_order, live_url, is_featured } = req.body
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' })

    const tech_stack = JSON.parse(req.body.tech_stack || '[]')

    let video_url     = req.body.video_url     || null
    let thumbnail_url = req.body.thumbnail_url || null

    if (req.files?.video?.[0]) {
      const result = await uploadToCloudinary(req.files.video[0].buffer, 'automateiq/videos', 'video')
      video_url = result.secure_url
    }
    if (req.files?.thumbnail?.[0]) {
      const result = await uploadToCloudinary(req.files.thumbnail[0].buffer, 'automateiq/images', 'image')
      thumbnail_url = result.secure_url
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({ title, description, category, tech_stack, video_url, thumbnail_url, live_url, is_featured, sort_order: sort_order ? parseInt(sort_order) : 0, is_active: true })
      .select()
      .single()
    if (error) throw error

    res.status(201).json({ success: true, message: 'Project created', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// PUT /api/projects/reorder  — MUST come before /:id
router.put('/reorder', verifyToken, async (req, res) => {
  try {
    const { order } = req.body
    if (!Array.isArray(order))
      return res.status(400).json({ success: false, message: 'order must be an array' })

    for (const item of order) {
      await supabase.from('projects').update({ sort_order: item.sort_order }).eq('id', item.id)
    }
    res.json({ success: true, message: 'Order updated', data: {} })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// PUT /api/projects/:id  (multipart: video + thumbnail optional)
router.put('/:id', verifyToken, multiStorage.fields([{ name: 'video' }, { name: 'thumbnail' }]), async (req, res) => {
  try {
    const { data: existing, error: fetchErr } = await supabase
      .from('projects').select('*').eq('id', req.params.id).single()
    if (fetchErr || !existing)
      return res.status(404).json({ success: false, message: 'Project not found' })

    const updates = {}
    const fields = ['title', 'description', 'category', 'live_url', 'is_featured', 'sort_order', 'video_url', 'thumbnail_url']
    fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f] })
    if (req.body.tech_stack) updates.tech_stack = JSON.parse(req.body.tech_stack)
    if (req.body.sort_order) updates.sort_order = parseInt(req.body.sort_order)

    if (req.files?.video?.[0]) {
      if (existing.video_url) await deleteFile(getPublicId(existing.video_url), 'video').catch(() => {})
      const result = await uploadToCloudinary(req.files.video[0].buffer, 'automateiq/videos', 'video')
      updates.video_url = result.secure_url
    }
    if (req.files?.thumbnail?.[0]) {
      if (existing.thumbnail_url) await deleteFile(getPublicId(existing.thumbnail_url), 'image').catch(() => {})
      const result = await uploadToCloudinary(req.files.thumbnail[0].buffer, 'automateiq/images', 'image')
      updates.thumbnail_url = result.secure_url
    }

    updates.updated_at = new Date()

    const { data, error } = await supabase
      .from('projects').update(updates).eq('id', req.params.id).select().single()
    if (error) throw error

    res.json({ success: true, message: 'Project updated', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// PATCH /api/projects/:id/toggle
router.patch('/:id/toggle', verifyToken, async (req, res) => {
  try {
    const { is_active } = req.body
    const { data, error } = await supabase
      .from('projects')
      .update({ is_active, updated_at: new Date() })
      .eq('id', req.params.id)
      .select('id, is_active')
      .single()
    if (error) throw error
    res.json({ success: true, message: 'Project visibility updated', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// POST /api/projects/:id/video  (Cloudinary — attach .mp4)
router.post('/:id/video', verifyToken, uploadVideo.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No video file uploaded' })
    const video_url = req.file.path
    const { data, error } = await supabase
      .from('projects')
      .update({ video_url, updated_at: new Date() })
      .eq('id', req.params.id).select().single()
    if (error) throw error
    res.json({ success: true, message: 'Video uploaded', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// POST /api/projects/:id/thumbnail  (Cloudinary — attach image)
router.post('/:id/thumbnail', verifyToken, uploadImage.single('thumbnail'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded' })
    const thumbnail_url = req.file.path
    const { data, error } = await supabase
      .from('projects')
      .update({ thumbnail_url, updated_at: new Date() })
      .eq('id', req.params.id).select().single()
    if (error) throw error
    res.json({ success: true, message: 'Thumbnail uploaded', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// DELETE /api/projects/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { data: existing } = await supabase.from('projects').select('*').eq('id', req.params.id).single()
    if (existing?.video_url)     await deleteFile(getPublicId(existing.video_url), 'video').catch(() => {})
    if (existing?.thumbnail_url) await deleteFile(getPublicId(existing.thumbnail_url), 'image').catch(() => {})

    const { error } = await supabase.from('projects').delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ success: true, message: 'Project deleted', data: {} })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

module.exports = router
