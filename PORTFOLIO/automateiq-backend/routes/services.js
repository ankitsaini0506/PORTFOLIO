require('dotenv').config()
const router = require('express').Router()
const { createClient } = require('@supabase/supabase-js')
const verifyToken = require('../middleware/auth')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// GET /api/services  (public)
router.get('/', async (req, res) => {
  try {
    let query = supabase.from('services').select('*').eq('is_active', true).order('sort_order')
    if (req.query.page) query = query.eq('page', req.query.page)
    const { data, error } = await query
    if (error) throw error
    res.json({ success: true, message: 'Services fetched', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// GET /api/services/:id  (public)
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('services').select('*').eq('id', req.params.id).single()
    if (error || !data) return res.status(404).json({ success: false, message: 'Service not found' })
    res.json({ success: true, message: 'Service fetched', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// POST /api/services  (admin)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { title, description, icon, page, sort_order } = req.body
    if (!title) return res.status(400).json({ success: false, message: 'Title is required' })
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

// PUT /api/services/:id  (admin)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { title, description, icon, page, sort_order, is_active } = req.body
    const { data, error } = await supabase
      .from('services')
      .update({ title, description, icon, page, sort_order, is_active })
      .eq('id', req.params.id)
      .select().single()
    if (error) throw error
    res.json({ success: true, message: 'Service updated', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// DELETE /api/services/:id  (admin)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { error } = await supabase.from('services').delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ success: true, message: 'Service deleted', data: {} })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

module.exports = router
