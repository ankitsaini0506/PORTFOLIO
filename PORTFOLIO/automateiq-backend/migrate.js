require('dotenv').config()
const { Client } = require('pg')

// Supabase connection string format
// postgresql://postgres:[SERVICE_ROLE_KEY_ISN'T_THE_DB_PASS]
// We use the DB URL: postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
// But we don't have the DB password — use the REST API approach via supabase-js instead

// Alternative: use Supabase's direct connection via SUPABASE_DB_URL if set
const dbUrl = process.env.SUPABASE_DB_URL

if (!dbUrl) {
  console.error('❌ SUPABASE_DB_URL not set in .env')
  console.log('\nTo get it:')
  console.log('1. Go to https://supabase.com/dashboard/project/yksgpgrwlozrnyjqdlyt/settings/database')
  console.log('2. Under "Connection string" → "URI" (use Transaction mode for serverless)')
  console.log('3. Copy and add to .env as: SUPABASE_DB_URL=postgresql://...')
  process.exit(1)
}

const client = new Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })

const sql = `
CREATE TABLE IF NOT EXISTS contact_enquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  service TEXT NOT NULL,
  budget TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_role TEXT NOT NULL,
  client_company TEXT NOT NULL,
  initials TEXT NOT NULL,
  rating INTEGER DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  bio TEXT,
  initials TEXT NOT NULL,
  avatar_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  value TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);
`

async function run() {
  await client.connect()
  console.log('✅ Connected to Supabase DB')
  await client.query(sql)
  console.log('✅ All tables created (or already existed)')
  await client.end()
}

run().catch(err => { console.error('❌', err.message); process.exit(1) })
