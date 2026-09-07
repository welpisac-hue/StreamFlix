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

/**
 * Split credentials safely: take username up to first ':',
 * then password is everything after that until the LAST '@' before host.
 */
function splitCreds(url) {
  const withoutProto = url.replace(/^postgresql(?:ql)?:\/\//, '')
  const at = withoutProto.lastIndexOf('@')
  if (at < 0) return null
  const creds = withoutProto.slice(0, at)
  const rest = withoutProto.slice(at + 1)
  const colon = creds.indexOf(':')
  if (colon < 0) return null
  return {
    user: creds.slice(0, colon),
    pass: creds.slice(colon + 1),
    rest,
  }
}

for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
  const url = get(key)
  console.log('\n' + key + ':')
  const parts = splitCreds(url)
  if (!parts) {
    console.log('  split failed')
    continue
  }
  const { user, pass, rest } = parts
  console.log('  user:', user)
  console.log('  host/path starts:', rest.slice(0, 40) + '...')
  console.log('  pass length:', pass.length)
  console.log('  starts with [:', pass.startsWith('['))
  console.log('  ends with ]:', pass.endsWith(']'))
  console.log('  contains @:', pass.includes('@'))
  console.log('  looks like placeholder:', /YOUR-PASSWORD|YOUR_PASSWORD/i.test(pass))
  console.log(
    '  only brackets wrapping:',
    pass.startsWith('[') && pass.endsWith(']') && pass.indexOf('[', 1) === -1
  )
  // char codes of non-alphanumeric
  const specials = [...pass]
    .map((c, i) => (/[A-Za-z0-9]/.test(c) ? null : `${i}:${c.charCodeAt(0)}`))
    .filter(Boolean)
  console.log('  special positions (index:code):', specials.join(', '))
}
