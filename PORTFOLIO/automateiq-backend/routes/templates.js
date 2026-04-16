require('dotenv').config()
const router  = require('express').Router()
const { createClient } = require('@supabase/supabase-js')
const verifyToken = require('../middleware/auth')
const { uploadImage } = require('../middleware/upload')
const { deleteFile } = require('../utils/cloudinary')
const multer = require('multer')
const cloudinary = require('cloudinary').v2

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// Multi-field upload with memory buffer → manual Cloudinary upload
const memUpload = multer({ storage: multer.memoryStorage() })

async function uploadPreview(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'automateiq/images', resource_type: 'image' },
      (err, result) => err ? reject(err) : resolve(result)
    )
    stream.end(buffer)
  })
}

function getPublicId(url) {
  if (!url) return null
  const parts = url.split('/')
  const file  = parts[parts.length - 1].split('.')[0]
  const idx   = parts.indexOf('automateiq')
  return idx !== -1 ? parts.slice(idx).join('/').split('.')[0] : file
}

// GET /api/templates  (public)
router.get('/', async (req, res) => {
  try {
    let query = supabase.from('templates').select('*').eq('is_active', true).order('sort_order')
    if (req.query.category) query = query.eq('category', req.query.category)
    const { data, error } = await query
    if (error) throw error
    res.json({ success: true, message: 'Templates fetched', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// GET /api/templates/:id  (public)
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('templates').select('*').eq('id', req.params.id).single()
    if (error || !data) return res.status(404).json({ success: false, message: 'Template not found' })
    res.json({ success: true, message: 'Template fetched', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// POST /api/templates  (admin, multipart)
router.post('/', verifyToken, memUpload.single('preview'), async (req, res) => {
  try {
    const { name, description, live_url, category, sort_order } = req.body
    if (!name) return res.status(400).json({ success: false, message: 'Name is required' })

    const tags = JSON.parse(req.body.tags || '[]')
    let preview_url = null

    if (req.file) {
      const result = await uploadPreview(req.file.buffer)
      preview_url = result.secure_url
    }

    const { data, error } = await supabase
      .from('templates')
      .insert({ name, description, live_url, category: category || 'web', tags, preview_url, sort_order: sort_order || 0, is_active: true })
      .select().single()
    if (error) throw error
    res.status(201).json({ success: true, message: 'Template created', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// POST /api/templates/:id/image  (admin, Cloudinary — Postman collection uses this)
router.post('/:id/image', verifyToken, uploadImage.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded' })
    const image_url = req.file.path
    const { data, error } = await supabase
      .from('templates')
      .update({ preview_url: image_url })
      .eq('id', req.params.id).select().single()
    if (error) throw error
    res.json({ success: true, message: 'Template image uploaded', data: { ...data, image_url } })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// PUT /api/templates/:id  (admin, multipart)
router.put('/:id', verifyToken, memUpload.single('preview'), async (req, res) => {
  try {
    const { data: existing, error: fetchErr } = await supabase
      .from('templates').select('*').eq('id', req.params.id).single()
    if (fetchErr || !existing) return res.status(404).json({ success: false, message: 'Template not found' })

    const updates = {}
    const fields = ['name', 'description', 'live_url', 'category', 'sort_order', 'is_active']
    fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f] })
    if (req.body.tags) updates.tags = JSON.parse(req.body.tags)

    if (req.file) {
      if (existing.preview_url) await deleteFile(getPublicId(existing.preview_url)).catch(() => {})
      const result = await uploadPreview(req.file.buffer)
      updates.preview_url = result.secure_url
    }

    const { data, error } = await supabase
      .from('templates').update(updates).eq('id', req.params.id).select().single()
    if (error) throw error
    res.json({ success: true, message: 'Template updated', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// PATCH /api/templates/:id/toggle  (admin)
router.patch('/:id/toggle', verifyToken, async (req, res) => {
  try {
    const { is_active } = req.body
    const { data, error } = await supabase
      .from('templates')
      .update({ is_active })
      .eq('id', req.params.id)
      .select('id, is_active').single()
    if (error) throw error
    res.json({ success: true, message: 'Template visibility updated', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// DELETE /api/templates/:id  (admin)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { data: existing } = await supabase.from('templates').select('*').eq('id', req.params.id).single()
    if (existing?.preview_url) await deleteFile(getPublicId(existing.preview_url)).catch(() => {})
    const { error } = await supabase.from('templates').delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ success: true, message: 'Template deleted', data: {} })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

module.exports = router
