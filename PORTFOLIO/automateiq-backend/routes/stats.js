require('dotenv').config()
const router = require('express').Router()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// GET /api/stats  (public)
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('stats')
      .select('*')
      .order('sort_order')

    if (error) throw error
    res.json({ success: true, message: 'Stats fetched', data })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error', error: err.message })
  }
})

module.exports = router
