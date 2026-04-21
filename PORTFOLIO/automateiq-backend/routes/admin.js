require('dotenv').config()
const router    = require('express').Router()
const bcrypt    = require('bcryptjs')
const jwt       = require('jsonwebtoken')
const multer    = require('multer')
const cloudinary = require('cloudinary').v2
const { createClient } = require('@supabase/supabase-js')
const verifyToken = require('../middleware/auth')
const { uploadImage, uploadVideo } = require('../middleware/upload')
const { deleteFile } = require('../utils/cloudinary')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const multiStorage = multer({ storage: multer.memoryStorage() })

async function uploadToCloudinary(buffer, folder, resourceType = 'image') {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (err, result) => err ? reject(err) : resolve(result)
    )
    stream.end(buffer)
  })
}

function getPublicId(url) {
  if (!url) return null
  const parts  = url.split('/')
  const folder = parts.slice(parts.indexOf('automateiq')).join('/').split('.')[0]
  return folder || parts[parts.length - 1].split('.')[0]
}

// ─────────────────────────────────────────────────────────────
// POST /api/admin/login
// ─────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password)
      return res.status(400).json({ success: false, message: 'Email and password required' })

    const { data: admin, error } = await supabase
      .from('admin')
      .select('*')
      .eq('email', email.toLowerCase())
      .single()

    if (error || !admin)
      return res.status(401).json({ success: false, message: 'Invalid credentials' })

    const valid = await bcrypt.compare(password, admin.password_hash)
    if (!valid)
      return res.status(401).json({ success: false, message: 'Invalid credentials' })

    const token = jwt.sign(
      { id: admin.id, email: admin.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      success: true,
      message: 'Login successful',
      data: { token, admin: { id: admin.id, email: admin.email, name: admin.name } }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────
// TESTIMONIALS  /api/admin/testimonials
// ─────────────────────────────────────────────────────────────
router.get('/testimonials', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase.from('testimonials').select('*').order('sort_order')
    if (error) throw error
    res.json({ success: true, message: 'Testimonials fetched', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

router.post('/testimonials', verifyToken, async (req, res) => {
  try {
    const { quote, client_name, client_role, client_company, initials, rating, sort_order } = req.body
    if (!quote || !client_name || !initials)
      return res.status(400).json({ success: false, message: 'quote, client_name and initials are required' })
    const { data, error } = await supabase
      .from('testimonials')
      .insert({ quote, client_name, client_role, client_company, initials, rating: rating || 5, sort_order: sort_order || 0, is_active: true })
      .select().single()
    if (error) throw error
    res.status(201).json({ success: true, message: 'Testimonial created', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

router.put('/testimonials/:id', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('testimonials').update(req.body).eq('id', req.params.id).select().single()
    if (error) throw error
    res.json({ success: true, message: 'Testimonial updated', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

router.delete('/testimonials/:id', verifyToken, async (req, res) => {
  try {
    const { error } = await supabase.from('testimonials').delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ success: true, message: 'Testimonial deleted', data: {} })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────
// TEAM  /api/admin/team
// ─────────────────────────────────────────────────────────────
router.get('/team', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase.from('team_members').select('*').order('sort_order')
    if (error) throw error
    res.json({ success: true, message: 'Team fetched', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

router.post('/team', verifyToken, async (req, res) => {
  try {
    const { name, role, bio, initials, avatar_url, sort_order } = req.body
    if (!name || !role || !initials)
      return res.status(400).json({ success: false, message: 'name, role and initials are required' })
    const { data, error } = await supabase
      .from('team_members')
      .insert({ name, role, bio, initials, avatar_url, sort_order: sort_order || 0, is_active: true })
      .select().single()
    if (error) throw error
    res.status(201).json({ success: true, message: 'Team member created', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

router.put('/team/:id', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('team_members').update(req.body).eq('id', req.params.id).select().single()
    if (error) throw error
    res.json({ success: true, message: 'Team member updated', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

router.delete('/team/:id', verifyToken, async (req, res) => {
  try {
    const { error } = await supabase.from('team_members').delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ success: true, message: 'Team member deleted', data: {} })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────
// STATS  /api/admin/stats
// ─────────────────────────────────────────────────────────────
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase.from('stats').select('*').order('sort_order')
    if (error) throw error
    res.json({ success: true, message: 'Stats fetched', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

router.post('/stats', verifyToken, async (req, res) => {
  try {
    const { label, value, sort_order } = req.body
    if (!label || !value)
      return res.status(400).json({ success: false, message: 'label and value are required' })
    const { data, error } = await supabase
      .from('stats').insert({ label, value, sort_order: sort_order || 0 }).select().single()
    if (error) throw error
    res.status(201).json({ success: true, message: 'Stat created', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

router.put('/stats/:id', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('stats').update(req.body).eq('id', req.params.id).select().single()
    if (error) throw error
    res.json({ success: true, message: 'Stat updated', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

router.delete('/stats/:id', verifyToken, async (req, res) => {
  try {
    const { error } = await supabase.from('stats').delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ success: true, message: 'Stat deleted', data: {} })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────
// PRICING  /api/admin/pricing
// ─────────────────────────────────────────────────────────────
router.get('/pricing', verifyToken, async (req, res) => {
  try {
    let query = supabase.from('pricing_plans').select('*').order('sort_order')
    if (req.query.page) query = query.eq('page', req.query.page)
    const { data, error } = await query
    if (error) throw error
    res.json({ success: true, message: 'Pricing fetched', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

router.post('/pricing', verifyToken, async (req, res) => {
  try {
    const { name, price, currency, period, description, features, is_popular, page, sort_order } = req.body
    if (!name || price === undefined)
      return res.status(400).json({ success: false, message: 'name and price are required' })
    const { data, error } = await supabase
      .from('pricing_plans')
      .insert({ name, price, currency: currency || 'INR', period: period || 'project', description, features: features || [], is_popular: is_popular || false, page: page || 'web', sort_order: sort_order || 0, is_active: true })
      .select().single()
    if (error) throw error
    res.status(201).json({ success: true, message: 'Pricing plan created', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

router.put('/pricing/:id', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pricing_plans').update({ ...req.body, updated_at: new Date() }).eq('id', req.params.id).select().single()
    if (error) throw error
    res.json({ success: true, message: 'Plan updated', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

router.delete('/pricing/:id', verifyToken, async (req, res) => {
  try {
    const { error } = await supabase.from('pricing_plans').delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ success: true, message: 'Plan deleted', data: {} })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────
// SERVICES  /api/admin/services
// ─────────────────────────────────────────────────────────────
router.get('/services', verifyToken, async (req, res) => {
  try {
    let query = supabase.from('services').select('*').order('sort_order')
    if (req.query.page) query = query.eq('page', req.query.page)
    const { data, error } = await query
    if (error) throw error
    res.json({ success: true, message: 'Services fetched', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

router.post('/services', verifyToken, async (req, res) => {
  try {
    const { title, description, icon, page, sort_order } = req.body
    if (!title) return res.status(400).json({ success: false, message: 'title is required' })
    const { data, error } = await supabase
      .from('services')
      .insert({ title, description, icon, page, sort_order: sort_order || 0, is_active: true })
      .select().single()
    if (error) throw error
    res.status(201).json({ success: true, message: 'Service created', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

router.put('/services/:id', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('services').update(req.body).eq('id', req.params.id).select().single()
    if (error) throw error
    res.json({ success: true, message: 'Service updated', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

router.delete('/services/:id', verifyToken, async (req, res) => {
  try {
    const { error } = await supabase.from('services').delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ success: true, message: 'Service deleted', data: {} })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// ─────────────────────────────────────────────────────────────
// PROJECTS  /api/admin/projects
// ─────────────────────────────────────────────────────────────
router.get('/projects', verifyToken, async (req, res) => {
  try {
    let query = supabase.from('projects').select('*').order('sort_order')
    if (req.query.category) query = query.eq('category', req.query.category)
    const { data, error } = await query
    if (error) throw error
    res.json({ success: true, message: 'Projects fetched', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

router.post('/projects', verifyToken, multiStorage.fields([{ name: 'video' }, { name: 'thumbnail' }]), async (req, res) => {
  try {
    const { title, description, category, sort_order, live_url, is_featured } = req.body
    if (!title) return res.status(400).json({ success: false, message: 'title is required' })

    const tech_stack = JSON.parse(req.body.tech_stack || '[]')
    let video_url     = req.body.video_url     || null
    let thumbnail_url = req.body.thumbnail_url || null

    if (req.files?.video?.[0]) {
      const r = await uploadToCloudinary(req.files.video[0].buffer, 'automateiq/videos', 'video')
      video_url = r.secure_url
    }
    if (req.files?.thumbnail?.[0]) {
      const r = await uploadToCloudinary(req.files.thumbnail[0].buffer, 'automateiq/images', 'image')
      thumbnail_url = r.secure_url
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({ title, description, category, tech_stack, video_url, thumbnail_url, live_url, is_featured, sort_order: sort_order ? parseInt(sort_order) : 0, is_active: true })
      .select().single()
    if (error) throw error
    res.status(201).json({ success: true, message: 'Project created', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

router.put('/projects/:id', verifyToken, multiStorage.fields([{ name: 'video' }, { name: 'thumbnail' }]), async (req, res) => {
  try {
    const { data: existing, error: fetchErr } = await supabase
      .from('projects').select('*').eq('id', req.params.id).single()
    if (fetchErr || !existing)
      return res.status(404).json({ success: false, message: 'Project not found' })

    const updates = {}
    const fields = ['title', 'description', 'category', 'live_url', 'is_featured', 'sort_order', 'is_active', 'video_url', 'thumbnail_url']
    fields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f] })
    if (req.body.tech_stack) updates.tech_stack = JSON.parse(req.body.tech_stack)
    if (req.body.sort_order) updates.sort_order = parseInt(req.body.sort_order)

    if (req.files?.video?.[0]) {
      if (existing.video_url) await deleteFile(getPublicId(existing.video_url), 'video').catch(() => {})
      const r = await uploadToCloudinary(req.files.video[0].buffer, 'automateiq/videos', 'video')
      updates.video_url = r.secure_url
    }
    if (req.files?.thumbnail?.[0]) {
      if (existing.thumbnail_url) await deleteFile(getPublicId(existing.thumbnail_url), 'image').catch(() => {})
      const r = await uploadToCloudinary(req.files.thumbnail[0].buffer, 'automateiq/images', 'image')
      updates.thumbnail_url = r.secure_url
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

router.delete('/projects/:id', verifyToken, async (req, res) => {
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

// ─────────────────────────────────────────────────────────────
// ENQUIRIES  /api/admin/enquiries
// ─────────────────────────────────────────────────────────────
router.get('/enquiries', verifyToken, async (req, res) => {
  try {
    const page  = parseInt(req.query.page  || '1')
    const limit = parseInt(req.query.limit || '20')
    const from  = (page - 1) * limit
    const to    = from + limit - 1

    let query = supabase.from('contact_enquiries').select('*', { count: 'exact' }).order('created_at', { ascending: false }).range(from, to)
    if (req.query.is_read !== undefined) query = query.eq('is_read', req.query.is_read === 'true')

    const { data, error, count } = await query
    if (error) throw error
    res.json({
      success: true,
      message: 'Enquiries fetched',
      data,
      meta: { total: count, page, limit, pages: Math.ceil(count / limit) }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

router.put('/enquiries/:id', verifyToken, async (req, res) => {
  try {
    const { is_read } = req.body
    if (is_read === undefined)
      return res.status(400).json({ success: false, message: 'is_read is required' })
    const { data, error } = await supabase
      .from('contact_enquiries')
      .update({ is_read })
      .eq('id', req.params.id)
      .select().single()
    if (error) throw error
    res.json({ success: true, message: 'Enquiry updated', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

module.exports = router
