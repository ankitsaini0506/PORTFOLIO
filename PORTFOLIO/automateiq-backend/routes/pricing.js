require('dotenv').config()
const router = require('express').Router()
const { createClient } = require('@supabase/supabase-js')
const verifyToken = require('../middleware/auth')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// GET /api/pricing  (public)
router.get('/', async (req, res) => {
  try {
    let query = supabase.from('pricing_plans').select('*').eq('is_active', true).order('sort_order')
    if (req.query.page)     query = query.eq('page', req.query.page)
    if (req.query.category) query = query.eq('category', req.query.category)
    const { data, error } = await query
    if (error) throw error
    res.json({ success: true, message: 'Pricing fetched', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// GET /api/pricing/:id  (public)
router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await supabase.from('pricing_plans').select('*').eq('id', req.params.id).single()
    if (error || !data) return res.status(404).json({ success: false, message: 'Plan not found' })
    res.json({ success: true, message: 'Plan fetched', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// POST /api/pricing  (admin)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { name, price, currency, period, description, features, is_popular, page, sort_order, category, billing_cycle } = req.body
    if (!name || price === undefined)
      return res.status(400).json({ success: false, message: 'Name and price are required' })
    const { data, error } = await supabase
      .from('pricing_plans')
      .insert({
        name, price, currency: currency || 'INR',
        period: period || billing_cycle || 'project',
        description, features: features || [],
        is_popular: is_popular || false,
        page: page || category || 'web',
        sort_order: sort_order || 0,
        is_active: true
      })
      .select().single()
    if (error) throw error
    res.status(201).json({ success: true, message: 'Pricing plan created', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// PUT /api/pricing/:id  (admin)
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const updates = { ...req.body, updated_at: new Date() }
    const { data, error } = await supabase
      .from('pricing_plans').update(updates).eq('id', req.params.id).select().single()
    if (error) throw error
    res.json({ success: true, message: 'Plan updated', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// PATCH /api/pricing/:id/toggle  (admin)
router.patch('/:id/toggle', verifyToken, async (req, res) => {
  try {
    const { is_active } = req.body
    const { data, error } = await supabase
      .from('pricing_plans')
      .update({ is_active, updated_at: new Date() })
      .eq('id', req.params.id)
      .select('id, is_active').single()
    if (error) throw error
    res.json({ success: true, message: 'Plan visibility updated', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// DELETE /api/pricing/:id  (admin)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { error } = await supabase.from('pricing_plans').delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ success: true, message: 'Plan deleted', data: {} })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

module.exports = router
