require('dotenv').config()
const bcrypt = require('bcryptjs')
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function seed() {
  console.log('🌱 Seeding AutomateIQ DB...')

  // Admin
  const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10)
  const { error: ae } = await supabase.from('admin').upsert(
    [{ email: process.env.ADMIN_EMAIL || 'admin@automateiq.com', password_hash: hash, name: 'AutomateIQ Admin' }],
    { onConflict: 'email' }
  )
  if (!ae) console.log('✅ Admin seeded')
  else console.log('❌ Admin error:', ae.message)

  // Site settings
  const { error: se } = await supabase.from('site_settings').upsert(
    [{ agency_name: 'AutomateIQ', tagline: 'We build digital products', email: process.env.ADMIN_EMAIL }]
  )
  if (!se) console.log('✅ Site settings seeded')
  else console.log('❌ Site settings error:', se.message)

  // Projects (skip if already exist)
  const { data: existingProjects } = await supabase.from('projects').select('id').limit(1)
  if (!existingProjects?.length) {
    const { error: pe } = await supabase.from('projects').insert([
      { title: 'E-Commerce Platform', description: 'Full stack shopping app', category: 'web', tech_stack: ['React','Node.js','Stripe'], sort_order: 1 },
      { title: 'Social Dashboard',    description: 'Analytics manager',       category: 'web', tech_stack: ['Next.js','Tailwind'],       sort_order: 2 },
      { title: 'AI Chat App',         description: 'Real-time AI chat',       category: 'ai',  tech_stack: ['React','OpenAI'],           sort_order: 3 },
    ])
    if (!pe) console.log('✅ Projects seeded')
    else console.log('❌ Projects error:', pe.message)
  } else console.log('⏭️  Projects already exist — skipped')

  // Pricing plans (skip if already exist)
  const { data: existingPricing } = await supabase.from('pricing_plans').select('id').limit(1)
  if (!existingPricing?.length) {
    const { error: pre } = await supabase.from('pricing_plans').insert([
      { name: 'Starter',      price: 15000, description: 'Perfect for small businesses', features: ['5 Pages','Responsive Design','SEO Setup','1 Month Support'],              page: 'web', sort_order: 1 },
      { name: 'Professional', price: 35000, description: 'For growing companies',        features: ['10 Pages','Custom Design','CMS Integration','3 Months Support'],          page: 'web', sort_order: 2, is_popular: true },
      { name: 'Basic App',    price: 25000, description: 'Simple mobile app',            features: ['iOS + Android','5 Screens','Push Notifications','1 Month Support'],       page: 'app', sort_order: 1 },
      { name: 'Pro App',      price: 60000, description: 'Feature-rich mobile app',      features: ['iOS + Android','Unlimited Screens','API Integration','3 Months Support'], page: 'app', sort_order: 2, is_popular: true },
    ])
    if (!pre) console.log('✅ Pricing plans seeded')
    else console.log('❌ Pricing error:', pre.message)
  } else console.log('⏭️  Pricing plans already exist — skipped')

  // Services (skip if already exist)
  const { data: existingServices } = await supabase.from('services').select('id').limit(1)
  if (!existingServices?.length) {
    const { error: sve } = await supabase.from('services').insert([
      { title: 'Landing Pages',      description: 'High converting landing pages',  icon: '🌐', page: 'web', sort_order: 1 },
      { title: 'Web Applications',   description: 'Full stack web apps',            icon: '💻', page: 'web', sort_order: 2 },
      { title: 'iOS & Android Apps', description: 'Cross platform mobile apps',     icon: '📱', page: 'app', sort_order: 1 },
      { title: 'UI/UX Design',       description: 'Beautiful app interface design', icon: '🎨', page: 'app', sort_order: 2 },
    ])
    if (!sve) console.log('✅ Services seeded')
    else console.log('❌ Services error:', sve.message)
  } else console.log('⏭️  Services already exist — skipped')

  // Templates (skip if already exist)
  const { data: existingTemplates } = await supabase.from('templates').select('id').limit(1)
  if (!existingTemplates?.length) {
    const { error: te } = await supabase.from('templates').insert([
      { name: 'Agency Pro',      description: 'Modern agency website template',  category: 'web', tags: ['agency','dark','modern'],   sort_order: 1 },
      { name: 'SaaS Starter',    description: 'SaaS product landing page',       category: 'web', tags: ['saas','light','minimal'],   sort_order: 2 },
      { name: 'Food Delivery',   description: 'Restaurant order app UI',         category: 'app', tags: ['food','orange','clean'],    sort_order: 1 },
      { name: 'Fitness Tracker', description: 'Health & workout tracking app',   category: 'app', tags: ['fitness','dark','purple'],  sort_order: 2 },
    ])
    if (!te) console.log('✅ Templates seeded')
    else console.log('❌ Templates error:', te.message)
  } else console.log('⏭️  Templates already exist — skipped')

  console.log('\n✅ All seeded! Run: node automateiq_supabase_test.js')
  process.exit(0)
}
seed()
