require('dotenv').config()
const router = require('express').Router()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const VALID_SERVICES = ['website', 'mobile-app', 'ai', 'branding', 'other']
const VALID_BUDGETS  = ['under-500', '500-2000', '2000-5000', '5000+']

// POST /api/contact  (public)
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, service, budget, message } = req.body
    const errors = {}

    if (!name || typeof name !== 'string' || !name.trim())       errors.name    = 'Name is required'
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))   errors.email   = 'Invalid email address'
    if (!service || !VALID_SERVICES.includes(service))           errors.service = `Service must be one of: ${VALID_SERVICES.join(', ')}`
    if (!message || typeof message !== 'string' || !message.trim()) errors.message = 'Message is required'
    if (budget && !VALID_BUDGETS.includes(budget))               errors.budget  = `Budget must be one of: ${VALID_BUDGETS.join(', ')}`

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors })
    }

    const { data, error } = await supabase
      .from('contact_enquiries')
      .insert({ name: name.trim(), email, phone: phone || null, service, budget: budget || null, message: message.trim() })
      .select('id, created_at')
      .single()

    if (error) throw error

    res.status(201).json({
      success: true,
      message: 'Enquiry submitted successfully',
      data: { id: data.id, created_at: data.created_at }
    })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

module.exports = router
