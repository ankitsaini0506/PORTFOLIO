# AutomateIQ Agency — Backend Build Prompts
# ══════════════════════════════════════════════════════════
# 6 prompts total. Run in ORDER. Never skip one.
# Goal: Full Node.js + Express + Supabase + Cloudinary backend
# Stack: Node.js | Express | Supabase | Cloudinary | Nodemailer
# Postman File: AutomateIQ_API_Collection.json (42 endpoints, 7 folders)
# Test Script:  automateiq_test_all.sh  → bash automateiq_test_all.sh
# DB Test:      automateiq_supabase_test.js → node automateiq_supabase_test.js
# ══════════════════════════════════════════════════════════

---

## ★★★ MASTER CONTEXT — Paste this at the TOP of EVERY prompt ★★★

```
PROJECT: AutomateIQ Digital Agency Website Backend
STACK: Node.js + Express + Supabase (PostgreSQL) + Cloudinary + Nodemailer

RESPONSE FORMAT (every API must return this):
  Success → { success: true,  message: "...", data: { ... } }
  Error   → { success: false, message: "...", error: "..."  }

KEY RULES:
1. Every admin route MUST use verifyToken middleware (JWT)
2. Never store video/image files in DB → always store Cloudinary URL string only
3. Public GET routes (projects, pricing, templates) → NO auth required (frontend reads them)
4. Admin POST/PUT/DELETE routes → verifyToken required
5. Lead form submissions (contact form) → public POST, no auth needed
6. Video upload via Cloudinary (resource_type: "video")
7. Image upload via Cloudinary (resource_type: "image")

FOLDER STRUCTURE:
automateiq-backend/
├── server.js
├── seed.js
├── .env
├── .env.example
├── automateiq_supabase_test.js
├── middleware/
│   ├── auth.js          → verifyToken (JWT check)
│   └── upload.js        → multer + cloudinary config (image + video)
├── routes/
│   ├── auth.js          → /api/auth/*
│   ├── projects.js      → /api/projects/*   (FanCardDeck data)
│   ├── services.js      → /api/services/*   (Websites + Apps services)
│   ├── pricing.js       → /api/pricing/*    (Pricing plans)
│   ├── templates.js     → /api/templates/*  (Template catalogue)
│   ├── leads.js         → /api/leads/*      (Contact form submissions)
│   └── settings.js      → /api/settings/*   (Agency info / site config)
└── utils/
    ├── cloudinary.js    → upload helpers (image + video)
    └── mailer.js        → Nodemailer (email on new lead)

SUPABASE TABLES (7 total):
  admin, projects, services, pricing_plans, templates, leads, site_settings

EXPECTED FINAL DB STATE (after all 6 prompts):
  admin          → 1 row  (admin@automateiq.com)
  projects       → 3 rows (Web App, Mobile App, AI Dashboard — each with video_url)
  services       → 4 rows (2 website services, 2 app services)
  pricing_plans  → 4 rows (2 website plans, 2 app plans)
  templates      → 4 rows (2 website templates, 2 app templates)
  leads          → 2 rows (test form submissions)
  site_settings  → 1 row  (agency name, email, social links)
```

---
---

# ══════════════════════════════════════════════════════════
# PROMPT 1 — Project Setup + Supabase Schema + DB Verify
# ══════════════════════════════════════════════════════════
# Postman test after this → GET /health
# DB check after this    → node automateiq_supabase_test.js → all 7 tables ✅
# Supabase verify        → Table Editor: 7 empty tables visible

[Paste MASTER CONTEXT above this line]

You are a senior Node.js backend developer building the AutomateIQ agency website backend.

TASK: Project setup + complete Supabase SQL schema + DB verification script.

## STEP A — Create project and install packages

```bash
mkdir automateiq-backend && cd automateiq-backend
npm init -y
npm install express dotenv cors helmet morgan
npm install @supabase/supabase-js
npm install cloudinary multer multer-storage-cloudinary
npm install jsonwebtoken bcryptjs
npm install nodemailer
```

Create the exact folder structure from MASTER CONTEXT above.
Create empty placeholder files for all routes so server.js can import them without crashing.

## STEP B — Write server.js

- Express app with cors, helmet, morgan, express.json()
- Mount all 7 route files:
  ```javascript
  app.use('/api/auth',      require('./routes/auth'))
  app.use('/api/projects',  require('./routes/projects'))
  app.use('/api/services',  require('./routes/services'))
  app.use('/api/pricing',   require('./routes/pricing'))
  app.use('/api/templates', require('./routes/templates'))
  app.use('/api/leads',     require('./routes/leads'))
  app.use('/api/settings',  require('./routes/settings'))
  ```
- `GET /health` → returns `{ success: true, status: "ok", db: "connected", timestamp: new Date() }`
- Create Supabase client using SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, log "✅ Supabase connected"
- 404 handler: `{ success: false, message: "Route not found" }`
- Global error handler: `{ success: false, message: "Internal server error", error: err.message }`

## STEP C — Write .env.example

```
PORT=5000
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
JWT_SECRET=your_jwt_secret_minimum_32_characters_long
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
ADMIN_EMAIL=admin@automateiq.com
ADMIN_PASSWORD=admin123
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_gmail@gmail.com
SMTP_PASS=your_gmail_app_password
NOTIFY_EMAIL=your_gmail@gmail.com
FRONTEND_URL=http://localhost:5174
```

## STEP D — Run this SQL in Supabase SQL Editor

Go to: Supabase Dashboard → SQL Editor → New Query → paste this → Run

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. admin
CREATE TABLE admin (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name          TEXT DEFAULT 'AutomateIQ Admin',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 2. projects (shown in FanCardDeck on homepage)
CREATE TABLE projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         TEXT NOT NULL,
  description   TEXT,
  category      TEXT DEFAULT 'web',  -- 'web' | 'app' | 'ai'
  tech_stack    TEXT[] DEFAULT '{}',
  video_url     TEXT,                -- Cloudinary video URL
  thumbnail_url TEXT,                -- Cloudinary image URL
  sort_order    INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 3. services (Websites page + Apps page service list)
CREATE TABLE services (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  description TEXT,
  icon        TEXT,                  -- icon name or emoji
  page        TEXT DEFAULT 'web',    -- 'web' | 'app'
  sort_order  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. pricing_plans (Websites page + Apps page pricing section)
CREATE TABLE pricing_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  price         INTEGER NOT NULL,    -- in INR
  currency      TEXT DEFAULT 'INR',
  period        TEXT DEFAULT 'project', -- 'project' | 'month' | 'year'
  description   TEXT,
  features      TEXT[] DEFAULT '{}', -- list of features
  is_popular    BOOLEAN DEFAULT false,
  page          TEXT DEFAULT 'web',  -- 'web' | 'app'
  sort_order    INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 5. templates (template catalogue on Websites + Apps pages)
CREATE TABLE templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  preview_url   TEXT,               -- Cloudinary image URL (screenshot)
  live_url      TEXT,               -- live demo link (optional)
  category      TEXT DEFAULT 'web', -- 'web' | 'app'
  tags          TEXT[] DEFAULT '{}',
  is_active     BOOLEAN DEFAULT true,
  sort_order    INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- 6. leads (contact form submissions from Modal.jsx)
CREATE TABLE leads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  budget      TEXT,
  idea        TEXT,
  template    TEXT,                  -- which template they clicked "I Want This" on
  status      TEXT DEFAULT 'new',   -- 'new' | 'contacted' | 'closed'
  source      TEXT DEFAULT 'modal', -- 'modal' | 'pricing'
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 7. site_settings (agency info shown on frontend)
CREATE TABLE site_settings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_name   TEXT DEFAULT 'AutomateIQ',
  tagline       TEXT,
  email         TEXT,
  phone         TEXT,
  instagram_url TEXT,
  twitter_url   TEXT,
  linkedin_url  TEXT,
  github_url    TEXT,
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

## STEP E — Write automateiq_supabase_test.js

```javascript
require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const tables = ['admin','projects','services','pricing_plans','templates','leads','site_settings']

async function test() {
  console.log('\n🔍 AutomateIQ — Supabase Table Check\n' + '═'.repeat(40))
  let pass = 0
  for (const t of tables) {
    const { error } = await supabase.from(t).select('id').limit(1)
    if (!error) { console.log(`✅ ${t}`); pass++ }
    else          console.log(`❌ ${t} → ${error.message}`)
  }
  console.log(`\n${'═'.repeat(40)}\n${pass}/${tables.length} tables ready\n`)
  process.exit(0)
}
test()
```

Run: `node automateiq_supabase_test.js` → all 7 tables ✅

---
---

# ══════════════════════════════════════════════════════════
# PROMPT 2 — Auth + Middleware + Cloudinary Setup
# ══════════════════════════════════════════════════════════
# Postman test after this → POST /api/auth/login → get token ✅
# DB check: admin table → 1 row seeded

[Paste MASTER CONTEXT above this line]

TASK: Admin authentication + JWT middleware + Cloudinary upload middleware + seed admin.

## STEP A — middleware/auth.js

```javascript
// verifyToken middleware
const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
  const header = req.headers['authorization']
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ success: false, message: 'No token provided' })

  try {
    const token = header.split(' ')[1]
    req.admin = jwt.verify(token, process.env.JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ success: false, message: 'Invalid or expired token' })
  }
}
```

## STEP B — middleware/upload.js

Support BOTH image and video uploads to Cloudinary:

```javascript
const cloudinary = require('cloudinary').v2
const { CloudinaryStorage } = require('multer-storage-cloudinary')
const multer = require('multer')

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Image upload → automateiq/images folder
const imageStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'automateiq/images', allowed_formats: ['jpg','jpeg','png','webp'], transformation: [{ quality: 'auto', fetch_format: 'auto' }] }
})

// Video upload → automateiq/videos folder
const videoStorage = new CloudinaryStorage({
  cloudinary,
  params: { folder: 'automateiq/videos', resource_type: 'video', allowed_formats: ['mp4','mov','webm'] }
})

module.exports = {
  uploadImage: multer({ storage: imageStorage }),
  uploadVideo: multer({ storage: videoStorage }),
}
```

## STEP C — utils/cloudinary.js

```javascript
const cloudinary = require('cloudinary').v2

const deleteFile = async (publicId, resourceType = 'image') => {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType })
}

module.exports = { deleteFile }
```

## STEP D — utils/mailer.js

Send email to admin when a new lead arrives:

```javascript
const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
})

const sendLeadEmail = async (lead) => {
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: process.env.NOTIFY_EMAIL,
    subject: `🔥 New Lead: ${lead.name} — AutomateIQ`,
    html: `
      <h2>New Lead from AutomateIQ Website</h2>
      <p><b>Name:</b> ${lead.name}</p>
      <p><b>Email:</b> ${lead.email}</p>
      <p><b>Phone:</b> ${lead.phone || 'N/A'}</p>
      <p><b>Budget:</b> ${lead.budget || 'N/A'}</p>
      <p><b>Idea:</b> ${lead.idea || 'N/A'}</p>
      <p><b>Template:</b> ${lead.template || 'N/A'}</p>
      <p><b>Source:</b> ${lead.source}</p>
      <p><b>Time:</b> ${new Date().toLocaleString('en-IN')}</p>
    `
  })
}

module.exports = { sendLeadEmail }
```

## STEP E — routes/auth.js

```
POST /api/auth/login
  Body: { email, password }
  → bcrypt compare password_hash
  → return JWT token (expires in 7d)
  → { success: true, data: { token, admin: { id, email, name } } }

GET /api/auth/profile (verifyToken)
  → return admin row from DB

PUT /api/auth/profile (verifyToken)
  Body: { name }
  → update admin name in DB

PUT /api/auth/change-password (verifyToken)
  Body: { old_password, new_password }
  → verify old, bcrypt hash new, update DB
```

## STEP F — seed.js (seed admin + sample data)

```javascript
require('dotenv').config()
const bcrypt = require('bcryptjs')
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function seed() {
  console.log('🌱 Seeding AutomateIQ DB...')

  // Admin
  const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10)
  const { error: ae } = await supabase.from('admin').upsert([{ email: process.env.ADMIN_EMAIL || 'admin@automateiq.com', password_hash: hash, name: 'AutomateIQ Admin' }], { onConflict: 'email' })
  if (!ae) console.log('✅ Admin seeded')

  // Site settings
  await supabase.from('site_settings').upsert([{ agency_name: 'AutomateIQ', tagline: 'We build digital products', email: process.env.ADMIN_EMAIL }])
  console.log('✅ Site settings seeded')

  // Sample projects (no video yet — frontend dev will upload via admin)
  await supabase.from('projects').insert([
    { title: 'E-Commerce Platform', description: 'Full stack shopping app', category: 'web', tech_stack: ['React','Node.js','Stripe'], sort_order: 1 },
    { title: 'Social Dashboard',    description: 'Analytics manager',        category: 'web', tech_stack: ['Next.js','Tailwind'],       sort_order: 2 },
    { title: 'AI Chat App',         description: 'Real-time AI chat',        category: 'ai',  tech_stack: ['React','OpenAI'],           sort_order: 3 },
  ])
  console.log('✅ Projects seeded')

  // Pricing plans
  await supabase.from('pricing_plans').insert([
    { name: 'Starter',      price: 15000, description: 'Perfect for small businesses', features: ['5 Pages','Responsive Design','SEO Setup','1 Month Support'],              page: 'web', sort_order: 1 },
    { name: 'Professional', price: 35000, description: 'For growing companies',        features: ['10 Pages','Custom Design','CMS Integration','3 Months Support'],          page: 'web', sort_order: 2, is_popular: true },
    { name: 'Basic App',    price: 25000, description: 'Simple mobile app',            features: ['iOS + Android','5 Screens','Push Notifications','1 Month Support'],       page: 'app', sort_order: 1 },
    { name: 'Pro App',      price: 60000, description: 'Feature-rich mobile app',      features: ['iOS + Android','Unlimited Screens','API Integration','3 Months Support'], page: 'app', sort_order: 2, is_popular: true },
  ])
  console.log('✅ Pricing plans seeded')

  console.log('\n✅ All seeded! Run: node automateiq_supabase_test.js')
  process.exit(0)
}
seed()
```

Run seed: `node seed.js`

DB verify checklist:
- [ ] admin table → 1 row (admin@automateiq.com)
- [ ] projects → 3 rows (no video_url yet)
- [ ] pricing_plans → 4 rows
- [ ] site_settings → 1 row

---
---

# ══════════════════════════════════════════════════════════
# PROMPT 3 — Projects API (Video + Image Upload via Cloudinary)
# ══════════════════════════════════════════════════════════
# This is the most important route — powers FanCardDeck on homepage
# Postman test after this → GET /api/projects → 3 projects returned ✅
# DB check: projects table → video_url filled after upload test

[Paste MASTER CONTEXT above this line]

TASK: Build routes/projects.js — full CRUD with video + thumbnail upload via Cloudinary.

## routes/projects.js

All endpoints:

```
PUBLIC (no auth):
  GET /api/projects
    → Return all active projects ORDER BY sort_order ASC
    → Query param: ?category=web|app|ai (optional filter)
    → { success: true, data: [ project objects ] }

  GET /api/projects/:id
    → Return single project by id
    → { success: true, data: { ...project } }

ADMIN (verifyToken required):
  POST /api/projects (multipart/form-data)
    Fields: title, description, category, tech_stack (JSON string array), sort_order
    Files:  video (mp4/mov) → Cloudinary videos folder
            thumbnail (jpg/png) → Cloudinary images folder
    → Insert row in DB with video_url + thumbnail_url from Cloudinary
    → { success: true, data: { ...project } }

  PUT /api/projects/:id (multipart/form-data)
    → Update project fields
    → If new video uploaded → delete old Cloudinary video → upload new
    → If new thumbnail uploaded → delete old → upload new
    → { success: true, data: { ...updated project } }

  PATCH /api/projects/:id/toggle
    Body: { is_active: true|false }
    → Toggle project visibility on frontend
    → { success: true, data: { is_active } }

  DELETE /api/projects/:id
    → Delete Cloudinary video + thumbnail (if exist)
    → Delete DB row
    → { success: true, message: "Project deleted" }

  PUT /api/projects/reorder
    Body: { order: [ { id, sort_order }, ... ] }
    → Bulk update sort_order for all projects
    → { success: true, message: "Order updated" }
```

IMPORTANT implementation notes:
- For multipart uploads, use `uploadVideo.single('video')` and `uploadImage.single('thumbnail')` from middleware/upload.js
- Since we need BOTH video and image in same request, use `multer().fields([{name:'video'},{name:'thumbnail'}])` with Cloudinary
- tech_stack comes as JSON string → parse it: `JSON.parse(req.body.tech_stack || '[]')`
- Always update `updated_at = NOW()` on PUT

---
---

# ══════════════════════════════════════════════════════════
# PROMPT 4 — Services + Pricing + Templates APIs
# ══════════════════════════════════════════════════════════
# Postman test after this → GET /api/pricing?page=web → 2 plans ✅
# DB check: services(4 rows), pricing_plans(4 rows), templates(4 rows)

[Paste MASTER CONTEXT above this line]

TASK: Build routes/services.js + routes/pricing.js + routes/templates.js

## STEP A — routes/services.js

```
PUBLIC:
  GET /api/services
    → ?page=web|app filter (optional)
    → ORDER BY sort_order ASC
    → { success: true, data: [...] }

ADMIN (verifyToken):
  POST /api/services
    Body: { title, description, icon, page, sort_order }
    → Insert new service

  PUT /api/services/:id
    Body: { title, description, icon, page, sort_order, is_active }
    → Update service

  DELETE /api/services/:id
    → Delete service
```

Seed 4 services after writing route:
```javascript
// Run in seed.js or directly via Postman:
[
  { title: 'Landing Pages',      description: 'High converting landing pages',     icon: '🌐', page: 'web', sort_order: 1 },
  { title: 'Web Applications',   description: 'Full stack web apps',               icon: '💻', page: 'web', sort_order: 2 },
  { title: 'iOS & Android Apps', description: 'Cross platform mobile apps',        icon: '📱', page: 'app', sort_order: 1 },
  { title: 'UI/UX Design',       description: 'Beautiful app interface design',    icon: '🎨', page: 'app', sort_order: 2 },
]
```

## STEP B — routes/pricing.js

```
PUBLIC:
  GET /api/pricing
    → ?page=web|app filter (optional)
    → ORDER BY sort_order ASC
    → { success: true, data: [...] }

  GET /api/pricing/:id
    → Single plan details

ADMIN (verifyToken):
  POST /api/pricing
    Body: { name, price, currency, period, description, features (array), is_popular, page, sort_order }
    → Insert new pricing plan

  PUT /api/pricing/:id
    Body: same as POST
    → Update plan, always update updated_at

  PATCH /api/pricing/:id/toggle
    Body: { is_active: true|false }
    → Toggle plan on/off on frontend

  DELETE /api/pricing/:id
    → Delete plan
```

## STEP C — routes/templates.js

```
PUBLIC:
  GET /api/templates
    → ?category=web|app filter (optional)
    → ORDER BY sort_order ASC, only is_active=true
    → { success: true, data: [...] }

ADMIN (verifyToken):
  POST /api/templates (multipart/form-data)
    Fields: name, description, live_url, category, tags (JSON string), sort_order
    File:   preview (jpg/png) → Cloudinary images folder → preview_url
    → Insert template with preview_url

  PUT /api/templates/:id (multipart/form-data)
    → Update template, replace preview image on Cloudinary if new one uploaded

  PATCH /api/templates/:id/toggle
    Body: { is_active }
    → Toggle visibility

  DELETE /api/templates/:id
    → Delete Cloudinary image + DB row
```

Seed 4 templates after writing route:
```javascript
[
  { name: 'Agency Pro',     description: 'Modern agency website template',  category: 'web', tags: ['agency','dark','modern'],   sort_order: 1 },
  { name: 'SaaS Starter',   description: 'SaaS product landing page',       category: 'web', tags: ['saas','light','minimal'],   sort_order: 2 },
  { name: 'Food Delivery',  description: 'Restaurant order app UI',         category: 'app', tags: ['food','orange','clean'],    sort_order: 1 },
  { name: 'Fitness Tracker','description': 'Health & workout tracking app', category: 'app', tags: ['fitness','dark','purple'],  sort_order: 2 },
]
```

---
---

# ══════════════════════════════════════════════════════════
# PROMPT 5 — Leads API + Settings API
# ══════════════════════════════════════════════════════════
# This hooks up Modal.jsx on the frontend to actually save submissions
# Postman test after this → POST /api/leads → lead saved + email sent ✅
# DB check: leads table → 2 rows after tests

[Paste MASTER CONTEXT above this line]

TASK: Build routes/leads.js + routes/settings.js

## STEP A — routes/leads.js

```
PUBLIC:
  POST /api/leads
    Body: { name, email, phone, budget, idea, template, source }
    Validation: name and email are required
    → Insert into leads table with status='new'
    → Call sendLeadEmail(lead) from utils/mailer.js
       (if email fails → still save lead, just log error — don't fail the request)
    → { success: true, message: "Thanks! We'll contact you soon.", data: { id } }

ADMIN (verifyToken):
  GET /api/leads
    → ?status=new|contacted|closed filter (optional)
    → ?page=1&limit=20 pagination
    → ORDER BY created_at DESC
    → { success: true, data: [...], total: N, page: 1 }

  GET /api/leads/:id
    → Single lead details
    → { success: true, data: { ...lead } }

  PATCH /api/leads/:id/status
    Body: { status: 'new'|'contacted'|'closed' }
    → Update lead status
    → { success: true, data: { id, status } }

  DELETE /api/leads/:id
    → Delete lead
    → { success: true, message: "Lead deleted" }
```

## STEP B — routes/settings.js

```
PUBLIC:
  GET /api/settings
    → Return first row of site_settings table
    → { success: true, data: { agency_name, tagline, email, phone, social links... } }

ADMIN (verifyToken):
  PUT /api/settings
    Body: { agency_name, tagline, email, phone, instagram_url, twitter_url, linkedin_url, github_url }
    → Update (upsert) site_settings row
    → Always update updated_at
    → { success: true, data: { ...settings } }
```

## STEP C — Test both routes with Postman

Test lead submission (simulating Modal.jsx):
```json
POST /api/leads
{
  "name": "Test Client Rahul",
  "email": "rahul@test.com",
  "phone": "9876543210",
  "budget": 
  "₹25,000 - ₹50,000",
  "idea": "I want an e-commerce website for my clothing brand",
  "template": "Agency Pro",
  "source": "modal"
}
```

Expected:
- [ ] Response → `{ success: true, message: "Thanks! We'll contact you soon." }`
- [ ] Supabase leads table → 1 new row with status='new'
- [ ] Email received at NOTIFY_EMAIL (check Gmail inbox)

---
---

# ══════════════════════════════════════════════════════════
# PROMPT 6 — Test Script + Final Verification + Deployment
# ══════════════════════════════════════════════════════════
# Run bash automateiq_test_all.sh → all tests pass ✅
# Deploy on Render.com → live URL for frontend to use

[Paste MASTER CONTEXT above this line]

TASK: Write test script + final server.js check + deployment guide.

## STEP A — Write automateiq_test_all.sh

```bash
#!/bin/bash
BASE="http://localhost:3000"
TOKEN=""
PASS=0; FAIL=0

check() {
  if [ "$1" = "200" ] || [ "$1" = "201" ]; then
    echo "✅ $2"; ((PASS++))
  else
    echo "❌ $2 (got $1)"; ((FAIL++))
  fi
}

echo ""
echo "🚀 AutomateIQ — Full API Test"
echo "══════════════════════════════════════════"

# Health
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE/health)
check $STATUS "GET /health"

# Auth
RESP=$(curl -s -X POST $BASE/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@automateiq.com","password":"admin123"}')
TOKEN=$(echo $RESP | grep -o '"token":"[^"]*' | cut -d'"' -f4)
STATUS=$(echo $RESP | grep -o '"success":true' | wc -l | tr -d ' ')
[ "$STATUS" = "1" ] && { echo "✅ POST /api/auth/login (token received)"; ((PASS++)); } || { echo "❌ POST /api/auth/login"; ((FAIL++)); }

AUTH="Authorization: Bearer $TOKEN"

# Projects
check $(curl -s -o /dev/null -w "%{http_code}" $BASE/api/projects) "GET /api/projects (public)"
check $(curl -s -o /dev/null -w "%{http_code}" $BASE/api/projects?category=web) "GET /api/projects?category=web"

# Pricing
check $(curl -s -o /dev/null -w "%{http_code}" $BASE/api/pricing) "GET /api/pricing (public)"
check $(curl -s -o /dev/null -w "%{http_code}" $BASE/api/pricing?page=web) "GET /api/pricing?page=web"
check $(curl -s -o /dev/null -w "%{http_code}" $BASE/api/pricing?page=app) "GET /api/pricing?page=app"

# Services
check $(curl -s -o /dev/null -w "%{http_code}" $BASE/api/services) "GET /api/services (public)"
check $(curl -s -o /dev/null -w "%{http_code}" $BASE/api/services?page=web) "GET /api/services?page=web"

# Templates
check $(curl -s -o /dev/null -w "%{http_code}" $BASE/api/templates) "GET /api/templates (public)"
check $(curl -s -o /dev/null -w "%{http_code}" $BASE/api/templates?category=web) "GET /api/templates?category=web"

# Settings
check $(curl -s -o /dev/null -w "%{http_code}" $BASE/api/settings) "GET /api/settings (public)"

# Leads (public POST)
LEAD_RESP=$(curl -s -X POST $BASE/api/leads -H "Content-Type: application/json" -d '{"name":"Test Lead","email":"test@test.com","phone":"9999999999","budget":"25000","idea":"Test project idea","source":"modal"}')
LEAD_OK=$(echo $LEAD_RESP | grep -o '"success":true' | wc -l | tr -d ' ')
[ "$LEAD_OK" = "1" ] && { echo "✅ POST /api/leads (lead saved)"; ((PASS++)); } || { echo "❌ POST /api/leads"; ((FAIL++)); }

# Admin routes (auth required)
check $(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" $BASE/api/auth/profile) "GET /api/auth/profile (admin)"
check $(curl -s -o /dev/null -w "%{http_code}" -H "$AUTH" $BASE/api/leads) "GET /api/leads (admin)"

# Auth guard test
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE/api/leads)
[ "$STATUS" = "401" ] && { echo "✅ GET /api/leads without token → 401 (auth guard works)"; ((PASS++)); } || { echo "❌ Auth guard failed"; ((FAIL++)); }

# 404
check $(curl -s -o /dev/null -w "%{http_code}" $BASE/api/unknown-route | grep -c "404" || echo "404") "404 handler works"

echo ""
echo "══════════════════════════════════════════"
echo "Total: $((PASS+FAIL)) | ✅ PASS: $PASS | ❌ FAIL: $FAIL"
echo ""
```

## STEP B — Final server.js env check

Add this to server.js startup:
```javascript
const required = ['SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','JWT_SECRET','CLOUDINARY_CLOUD_NAME','CLOUDINARY_API_KEY','CLOUDINARY_API_SECRET']
required.forEach(key => { if (!process.env[key]) console.warn(`⚠️  Missing env var: ${key}`) })
```

## STEP C — Run all tests

```bash
# Terminal 1
npm start

# Terminal 2
bash automateiq_test_all.sh
```

Expected: 14+ tests pass ✅

## STEP D — Final DB check in Supabase

```
admin          → 1 row  (admin@automateiq.com, password_hash not null)
projects       → 3 rows (E-Commerce, Social Dashboard, AI Chat)
services       → 4 rows (2 web, 2 app)
pricing_plans  → 4 rows (Starter, Professional, Basic App, Pro App)
templates      → 4 rows (Agency Pro, SaaS Starter, Food Delivery, Fitness Tracker)
leads          → 1+ rows (from test submission)
site_settings  → 1 row  (AutomateIQ)
```

## STEP E — Deploy on Render.com (FREE)

```bash
# 1. Push to GitHub
git add .
git commit -m "AutomateIQ backend complete — 42 endpoints"
git push origin main

# 2. Go to render.com → New Web Service → Connect GitHub → select automateiq-backend
#    Build command: npm install
#    Start command: node server.js

# 3. Set ALL env vars in Render dashboard (copy from your .env file)
```

## FINAL CHECKLIST ✅
- [ ] bash automateiq_test_all.sh → 14+ tests pass
- [ ] POST /api/leads → email received in Gmail inbox
- [ ] GET /api/projects → 3 projects returned
- [ ] GET /api/pricing?page=web → 2 plans returned
- [ ] POST /api/projects with video → video_url is a Cloudinary URL
- [ ] Admin route without token → 401 response
- [ ] node automateiq_supabase_test.js → all 7 tables ✅
- [ ] Render.com URL live and /health returns 200
```
