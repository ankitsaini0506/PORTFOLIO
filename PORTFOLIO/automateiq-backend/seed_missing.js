require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
  // ── 1. contact_enquiries table (create if not exists via insert test) ──
  console.log('\n📋 Seeding missing data...\n')

  // ── 2. AI + Brand pricing ──────────────────────────────────────────────
  const pricingPlans = [
    { name: 'AI Starter',       price: 30000, currency: 'INR', period: 'project', description: 'Basic AI integration for your product',       features: ['Chatbot Setup','API Integration','1 AI Model','1 Month Support'],               is_popular: false, page: 'ai',    sort_order: 1 },
    { name: 'AI Professional',  price: 70000, currency: 'INR', period: 'project', description: 'Full AI-powered automation suite',             features: ['Custom AI Model','Workflow Automation','Analytics Dashboard','3 Months Support'], is_popular: true,  page: 'ai',    sort_order: 2 },
    { name: 'AI Enterprise',    price: 150000,currency: 'INR', period: 'project', description: 'End-to-end AI transformation',                 features: ['Multiple AI Models','Custom Training','Dedicated Support','Unlimited Revisions'],  is_popular: false, page: 'ai',    sort_order: 3 },
    { name: 'Brand Essentials', price: 8000,  currency: 'INR', period: 'project', description: 'Core identity for new businesses',             features: ['Logo Design','Color Palette','Typography','Brand Guidelines'],                    is_popular: false, page: 'brand', sort_order: 1 },
    { name: 'Brand Professional',price: 20000,currency: 'INR', period: 'project', description: 'Complete visual identity system',              features: ['Full Logo Suite','Brand Strategy','Social Templates','Presentation Deck'],         is_popular: true,  page: 'brand', sort_order: 2 },
    { name: 'Brand Premium',    price: 45000, currency: 'INR', period: 'project', description: 'Agency-grade brand overhaul',                  features: ['Brand Strategy','Full Identity System','Motion Guidelines','Ongoing Support'],     is_popular: false, page: 'brand', sort_order: 3 },
  ]

  for (const plan of pricingPlans) {
    const { data: existing } = await supabase.from('pricing_plans').select('id').eq('name', plan.name).eq('page', plan.page).maybeSingle()
    if (existing) { console.log(`  skip pricing: ${plan.name}`); continue }
    const { error } = await supabase.from('pricing_plans').insert(plan)
    if (error) console.error(`  ❌ pricing ${plan.name}:`, error.message)
    else console.log(`  ✅ pricing: ${plan.name}`)
  }

  // ── 3. AI + Brand services ─────────────────────────────────────────────
  const services = [
    { title: 'AI Chatbots',        description: 'Intelligent bots that handle support',   icon: '🤖', page: 'ai',    sort_order: 1, is_active: true },
    { title: 'Workflow Automation', description: 'Automate repetitive business tasks',     icon: '⚡', page: 'ai',    sort_order: 2, is_active: true },
    { title: 'Brand Strategy',     description: 'Define your market positioning',          icon: '🎯', page: 'brand', sort_order: 1, is_active: true },
    { title: 'Logo & Identity',    description: 'Visual systems that stick',               icon: '✏️', page: 'brand', sort_order: 2, is_active: true },
  ]

  for (const svc of services) {
    const { data: existing } = await supabase.from('services').select('id').eq('title', svc.title).eq('page', svc.page).maybeSingle()
    if (existing) { console.log(`  skip service: ${svc.title}`); continue }
    const { error } = await supabase.from('services').insert(svc)
    if (error) console.error(`  ❌ service ${svc.title}:`, error.message)
    else console.log(`  ✅ service: ${svc.title}`)
  }

  // ── 4. Fix is_popular = null ───────────────────────────────────────────
  const { error: fixErr } = await supabase.from('pricing_plans').update({ is_popular: false }).is('is_popular', null)
  if (fixErr) console.error('  ❌ fix is_popular:', fixErr.message)
  else console.log('  ✅ fixed is_popular nulls')

  // ── 5. Testimonials ────────────────────────────────────────────────────
  const testimonials = [
    { quote: 'AutomateIQ built our website in 10 days. The result was beyond what we imagined possible.', client_name: 'Rahul S.',  client_role: 'Founder', client_company: 'TechStart',   initials: 'RS', rating: 5, sort_order: 1 },
    { quote: 'Our app went from idea to launch in 3 weeks. Incredible team.',                             client_name: 'Priya M.',  client_role: 'CEO',     client_company: 'QuickServe',  initials: 'PM', rating: 5, sort_order: 2 },
    { quote: 'The AI chatbot they built handles 80% of our support tickets now.',                         client_name: 'Arjun K.',  client_role: 'COO',     client_company: 'RetailPro',   initials: 'AK', rating: 5, sort_order: 3 },
    { quote: 'Best branding investment we ever made. Our identity finally feels like us.',                client_name: 'Sneha P.',  client_role: 'Founder', client_company: 'GlowBrand',   initials: 'SP', rating: 5, sort_order: 4 },
    { quote: 'Clean code, great communication, zero surprises. Will work with them again.',               client_name: 'Dev R.',    client_role: 'CTO',     client_company: 'FinanceFlow', initials: 'DR', rating: 5, sort_order: 5 },
    { quote: 'They understood our vision immediately. Felt like they were part of our team.',             client_name: 'Ananya V.', client_role: 'MD',      client_company: 'HealthPlus',  initials: 'AV', rating: 5, sort_order: 6 },
  ]

  for (const t of testimonials) {
    const { data: existing } = await supabase.from('testimonials').select('id').eq('client_name', t.client_name).maybeSingle()
    if (existing) { console.log(`  skip testimonial: ${t.client_name}`); continue }
    const { error } = await supabase.from('testimonials').insert({ ...t, is_active: true })
    if (error) console.error(`  ❌ testimonial ${t.client_name}:`, error.message)
    else console.log(`  ✅ testimonial: ${t.client_name}`)
  }

  // ── 6. Stats ───────────────────────────────────────────────────────────
  const stats = [
    { label: 'Projects',      value: '50+', sort_order: 1 },
    { label: 'Clients',       value: '20+', sort_order: 2 },
    { label: 'Years Building',value: '3',   sort_order: 3 },
  ]

  for (const s of stats) {
    const { data: existing } = await supabase.from('stats').select('id').eq('label', s.label).maybeSingle()
    if (existing) { console.log(`  skip stat: ${s.label}`); continue }
    const { error } = await supabase.from('stats').insert(s)
    if (error) console.error(`  ❌ stat ${s.label}:`, error.message)
    else console.log(`  ✅ stat: ${s.label}`)
  }

  console.log('\n✅ Done.\n')
  process.exit(0)
}

run().catch(err => { console.error(err); process.exit(1) })
