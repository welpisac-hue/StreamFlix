const fs = require('fs')
const env = fs.readFileSync('.env', 'utf8')

function get(key) {
  const m = env.match(new RegExp('^' + key + '=(.*)$', 'm'))
  if (!m) return null
  let v = m[1].trim()
  const quoted =
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  if (quoted) v = v.slice(1, -1)
  return { raw: m[1], value: v, quoted }
}

function summarize(name) {
  const g = get(name)
  console.log('\n' + name)
  if (!g) {
    console.log('  MISSING')
    return null
  }
  console.log('  quoted:', g.quoted)
  console.log('  starts with postgresql:', g.value.startsWith('postgresql://'))
  console.log('  contains YOUR-PASSWORD:', /YOUR-PASSWORD/i.test(g.value))
  console.log('  contains brackets:', /\[|\]/.test(g.value))
  try {
    const u = new URL(g.value)
    const pass = decodeURIComponent(u.password)
    console.log('  user:', u.username)
    console.log('  host:', u.host)
    console.log('  pass len:', pass.length)
    console.log('  pass starts with eyJ (jwt?):', pass.startsWith('eyJ'))
    console.log('  pass has whitespace:', /\s/.test(pass))
    // fingerprint only — not the password
    console.log(
      '  pass fingerprint:',
      pass.charCodeAt(0),
      pass.charCodeAt(pass.length - 1),
      pass.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
    )
    return { user: u.username, host: u.host, pass }
  } catch (e) {
    console.log('  parse error:', e.message)
    return null
  }
}

const a = summarize('DATABASE_URL')
const b = summarize('DIRECT_URL')
if (a && b) {
  console.log('\npasswords match:', a.pass === b.pass)
}
