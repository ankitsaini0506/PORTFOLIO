require('dotenv').config()
const router = require('express').Router()
const { createClient } = require('@supabase/supabase-js')
const verifyToken = require('../middleware/auth')
const { uploadImage } = require('../middleware/upload')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// GET /api/settings  or  GET /api/agency  (public)
router.get('/', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()
    if (error) throw error
    res.json({ success: true, message: 'Settings fetched', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// PUT /api/settings  or  PUT /api/agency  (admin)
router.put('/', verifyToken, async (req, res) => {
  try {
    const {
      agency_name, name,
      tagline, description,
      email, phone,
      instagram_url, twitter_url, linkedin_url, github_url
    } = req.body

    const payload = {
      agency_name:   agency_name || name,
      tagline:       tagline || description,
      email,
      phone,
      instagram_url,
      twitter_url,
      linkedin_url,
      github_url,
      updated_at:    new Date()
    }
    // Remove undefined keys so we don't overwrite existing values with null
    Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k])

    // Upsert: update existing row or insert first row
    const { data: existing } = await supabase
      .from('site_settings').select('id').limit(1).single()

    let data, dbError
    if (existing) {
      ;({ data, error: dbError } = await supabase
        .from('site_settings').update(payload).eq('id', existing.id).select().single())
    } else {
      ;({ data, error: dbError } = await supabase
        .from('site_settings').insert(payload).select().single())
    }
    if (dbError) throw dbError

    res.json({ success: true, message: 'Settings updated', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// POST /api/agency/logo  (admin, Cloudinary)
router.post('/logo', verifyToken, uploadImage.single('logo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No logo file uploaded' })
    const logo_url = req.file.path

    const { data: existing } = await supabase
      .from('site_settings').select('id').limit(1).single()

    let data, dbError
    if (existing) {
      ;({ data, error: dbError } = await supabase
        .from('site_settings').update({ logo_url, updated_at: new Date() }).eq('id', existing.id).select().single())
    } else {
      ;({ data, error: dbError } = await supabase
        .from('site_settings').insert({ logo_url }).select().single())
    }
    if (dbError) throw dbError

    res.json({ success: true, message: 'Logo uploaded', data: { ...data, logo_url } })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

module.exports = router
