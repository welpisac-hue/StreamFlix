const fs = require('fs')
const env = fs.readFileSync('.env', 'utf8')

function get(key) {
  const m = env.match(new RegExp('^' + key + '=(.*)$', 'm'))
  if (!m) return null
  let v = m[1].trim()
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1)
  }
  return v
}

function inspect(name, url) {
  console.log('\n' + name + ':')
  if (!url) {
    console.log('  missing')
    return
  }
  try {
    const u = new URL(url)
    console.log('  protocol:', u.protocol)
    console.log('  username:', u.username)
    console.log('  host:', u.host)
    console.log('  pathname:', u.pathname)
    console.log('  password length:', u.password.length)
    const decoded = decodeURIComponent(u.password)
    const needsEncode = /[^A-Za-z0-9._~-]/.test(decoded)
    console.log('  password needs URL-encoding:', needsEncode)
    // Detect common mistakes
    if (u.password.includes('[YOUR-PASSWORD]') || u.password === 'YOUR-PASSWORD') {
      console.log('  ISSUE: password still placeholder')
    }
    if (u.password.startsWith('eyJ')) {
      console.log('  ISSUE: looks like a JWT/API key, not the DB password')
    }
    if (u.hostname.includes('supabase.co') && !u.hostname.includes('pooler') && !u.hostname.startsWith('db.')) {
      console.log('  ISSUE: this looks like the project API host, not the DB host')
    }
  } catch (e) {
    console.log('  ISSUE: invalid URL —', e.message)
    // maybe unencoded @ or : in password broke parsing
    const atCount = (url.match(/@/g) || []).length
    if (atCount > 1) {
      console.log('  HINT: password may contain @ — URL-encode it as %40')
    }
  }
}

inspect('DATABASE_URL', get('DATABASE_URL'))
inspect('DIRECT_URL', get('DIRECT_URL'))
