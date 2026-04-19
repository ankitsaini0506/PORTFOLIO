require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const { createClient } = require('@supabase/supabase-js')

// ── Env var check ───────────────────────────────────────
const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET'
]

required.forEach(key => {
  if (!process.env[key]) {
    console.warn(`⚠️ Missing env var: ${key}`)
  }
})

const app = express()

// ── Middleware ──────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'https://automateiq.in',
  'https://www.automateiq.in',
  process.env.FRONTEND_URL,
].filter(Boolean)

app.use(helmet())
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(morgan('dev'))
app.use(express.json())

// ── Supabase ────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
module.exports.supabase = supabase
console.log('✅ Supabase connected')

// ── Root Route (IMPORTANT FIX) ──────────────────────────
app.get('/', (req, res) => {
  res.send('🚀 AutomateIQ Backend is Live')
})

// ── Health Check ────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    db: 'connected',
    timestamp: new Date()
  })
})

// ── Routes ──────────────────────────────────────────────
app.use('/api/auth', require('./routes/auth'))
app.use('/api/projects', require('./routes/projects'))
app.use('/api/services', require('./routes/services'))
app.use('/api/pricing', require('./routes/pricing'))
app.use('/api/templates', require('./routes/templates'))
app.use('/api/leads', require('./routes/leads'))
app.use('/api/settings', require('./routes/settings'))

app.use('/api/contact',      require('./routes/contact'))
app.use('/api/testimonials', require('./routes/testimonials'))
app.use('/api/team',         require('./routes/team'))
app.use('/api/stats',        require('./routes/stats'))

// alias so Postman collection works
app.use('/api/agency', require('./routes/settings'))

// ── 404 Handler ─────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  })
})

// ── Global Error Handler ────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err)

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: err.message
  })
})

// ── Start Server ────────────────────────────────────────
const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`🚀 AutomateIQ server running on port ${PORT}`)
})