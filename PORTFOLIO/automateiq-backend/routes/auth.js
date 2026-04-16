require('dotenv').config()
const router  = require('express').Router()
const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const { createClient } = require('@supabase/supabase-js')
const verifyToken = require('../middleware/auth')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// POST /api/auth/login
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

// GET /api/auth/profile
router.get('/profile', verifyToken, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('admin')
      .select('id, email, name, created_at')
      .eq('id', req.admin.id)
      .single()
    if (error) throw error
    res.json({ success: true, message: 'Profile fetched', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// PUT /api/auth/profile
router.put('/profile', verifyToken, async (req, res) => {
  try {
    const { name } = req.body
    const { data, error } = await supabase
      .from('admin')
      .update({ name })
      .eq('id', req.admin.id)
      .select('id, email, name')
      .single()
    if (error) throw error
    res.json({ success: true, message: 'Profile updated', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// PUT /api/auth/change-password
router.put('/change-password', verifyToken, async (req, res) => {
  try {
    const { old_password, new_password } = req.body
    if (!old_password || !new_password)
      return res.status(400).json({ success: false, message: 'Both passwords required' })

    const { data: admin } = await supabase.from('admin').select('*').eq('id', req.admin.id).single()
    const valid = await bcrypt.compare(old_password, admin.password_hash)
    if (!valid)
      return res.status(400).json({ success: false, message: 'Old password is incorrect' })

    const hash = await bcrypt.hash(new_password, 10)
    await supabase.from('admin').update({ password_hash: hash }).eq('id', req.admin.id)

    res.json({ success: true, message: 'Password changed successfully', data: {} })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

// POST /api/auth/logout
router.post('/logout', verifyToken, (_req, res) => {
  res.json({ success: true, message: 'Logged out', data: {} })
})

module.exports = router
