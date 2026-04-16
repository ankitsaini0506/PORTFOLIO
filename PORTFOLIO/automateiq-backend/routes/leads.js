require('dotenv').config()
const router = require('express').Router()
const { createClient } = require('@supabase/supabase-js')
const verifyToken = require('../middleware/auth')
const { sendLeadEmail } = require('../utils/mailer')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// POST /api/leads  (public — contact form / Modal.jsx)
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, budget, idea, template, source } = req.body

    if (!name || !email)
      return res.status(400).json({ success: false, message: 'Name and email are required' })

    const { data, error } = await supabase
      .from('leads')
      .insert({ name, email, phone, budget, idea, template, source: source || 'modal', status: 'new' })
      .select()
      .single()
    if (error) throw error

    // Fire-and-forget email — never fail the request if email fails
    sendLeadEmail(data).catch(e => console.error('Mail error:', e.message))

    res.json({ success: true, message: "Thanks! We'll contact you soon.", data: { id: data.id } })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// GET /api/leads  (admin — with pagination + filter)
router.get('/', verifyToken, async (req, res) => {
  try {
    const page  = parseInt(req.query.page)  || 1
    const limit = parseInt(req.query.limit) || 20
    const from  = (page - 1) * limit
    const to    = from + limit - 1

    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to)

    if (req.query.status) query = query.eq('status', req.query.status)

    const { data, error, count } = await query
    if (error) throw error

    res.json({ success: true, message: 'Leads fetched', data, total: count, page })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// GET /api/leads/:id  (admin)
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('leads').select('*').eq('id', req.params.id).single()
    if (error || !data)
      return res.status(404).json({ success: false, message: 'Lead not found' })
    res.json({ success: true, message: 'Lead fetched', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// PATCH /api/leads/:id/status  (admin)
router.patch('/:id/status', verifyToken, async (req, res) => {
  try {
    const { status } = req.body
    if (!['new', 'contacted', 'closed'].includes(status))
      return res.status(400).json({ success: false, message: 'Invalid status. Use: new | contacted | closed' })

    const { data, error } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', req.params.id)
      .select('id, status')
      .single()
    if (error) throw error
    res.json({ success: true, message: 'Lead status updated', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// DELETE /api/leads/:id  (admin)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { error } = await supabase.from('leads').delete().eq('id', req.params.id)
    if (error) throw error
    res.json({ success: true, message: 'Lead deleted', data: {} })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

module.exports = router
