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

function analyze(name, url) {
  console.log('\n' + name + ':')
  if (!url) {
    console.log('  missing')
    return
  }

  // Manual parse so unencoded special chars in password don't break URL()
  const m = url.match(
    /^(postgresql(?:ql)?:\/\/)([^:]+):(.+)@([^/?]+)(\/[^?]*)?(\?.*)?$/
  )
  if (!m) {
    console.log('  MANUAL PARSE FAILED')
    try {
      const u = new URL(url)
      console.log('  URL.username:', u.username)
      console.log('  URL.password length:', u.password.length)
      console.log('  URL.host:', u.host)
    } catch (e) {
      console.log('  URL() also failed:', e.message)
    }
    return
  }

  const pass = m[3]
  console.log('  user:', m[2])
  console.log('  host:', m[4])
  console.log('  path:', m[5] || '')
  console.log('  search:', m[6] || '')
  console.log('  pass length:', pass.length)
  console.log('  pass already percent-encoded:', /%[0-9A-Fa-f]{2}/.test(pass))

  const special = [...pass].filter((c) => /[^A-Za-z0-9._~-]/.test(c))
  const codes = [...new Set(special)].map((c) => c.charCodeAt(0))
  console.log('  special char codes:', codes.join(',') || '(none)')

  try {
    const u = new URL(url)
    console.log('  URL() password length:', u.password.length)
    console.log(
      '  URL() matches manual:',
      u.password === pass || decodeURIComponent(u.password) === pass
    )
  } catch (e) {
    console.log('  URL() failed:', e.message)
  }
}

analyze('DATABASE_URL', get('DATABASE_URL'))
analyze('DIRECT_URL', get('DIRECT_URL'))
