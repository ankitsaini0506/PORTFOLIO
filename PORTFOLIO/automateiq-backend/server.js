require('dotenv').config()
const express = require('express')
const cors    = require('cors')
const helmet  = require('helmet')
const morgan  = require('morgan')
const { createClient } = require('@supabase/supabase-js')

// ── Env var check ───────────────────────────────────────
const required = ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','JWT_SECRET','CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET']
required.forEach(key => { if (!process.env[key]) console.warn(`⚠️  Missing env var: ${key}`) })

const app = express()

// ── Middleware ──────────────────────────────────────────
app.use(helmet())
app.use(cors({ origin: process.env.FRONTEND_URL || '*' }))
app.use(morgan('dev'))
app.use(express.json())

// ── Supabase ────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
module.exports.supabase = supabase
console.log('✅ Supabase connected')

// ── Health ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ success: true, status: 'ok', db: 'connected', timestamp: new Date() })
})

// ── Routes ──────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'))
app.use('/api/projects',  require('./routes/projects'))
app.use('/api/services',  require('./routes/services'))
app.use('/api/pricing',   require('./routes/pricing'))
app.use('/api/templates', require('./routes/templates'))
app.use('/api/leads',     require('./routes/leads'))
app.use('/api/settings',  require('./routes/settings'))
// alias so Postman collection /api/agency still works
app.use('/api/agency',    require('./routes/settings'))

// ── 404 ─────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' })
})

// ── Global error handler ────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ success: false, message: 'Internal server error', error: err.message })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => console.log(`🚀 AutomateIQ server running on port ${PORT}`))
