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
