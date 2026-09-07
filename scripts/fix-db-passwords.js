const fs = require('fs')

const envPath = '.env'
let env = fs.readFileSync(envPath, 'utf8')

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

function splitCreds(url) {
  const protoMatch = url.match(/^(postgresql(?:ql)?:\/\/)/)
  if (!protoMatch) return null
  const proto = protoMatch[1]
  const withoutProto = url.slice(proto.length)
  const at = withoutProto.lastIndexOf('@')
  if (at < 0) return null
  const creds = withoutProto.slice(0, at)
  const rest = withoutProto.slice(at + 1)
  const colon = creds.indexOf(':')
  if (colon < 0) return null
  return {
    proto,
    user: creds.slice(0, colon),
    pass: creds.slice(colon + 1),
    rest,
  }
}

function fixUrl(url) {
  const parts = splitCreds(url)
  if (!parts) throw new Error('Could not parse URL')

  let pass = parts.pass
  // Decode if already partially encoded
  try {
    pass = decodeURIComponent(pass)
  } catch {
    // keep as-is
  }

  let strippedBrackets = false
  if (pass.startsWith('[') && pass.endsWith(']') && pass.length > 2) {
    pass = pass.slice(1, -1)
    strippedBrackets = true
  }

  const encoded = encodeURIComponent(pass)
  const fixed = `${parts.proto}${parts.user}:${encoded}@${parts.rest}`
  return { fixed, strippedBrackets, passLength: pass.length }
}

for (const key of ['DATABASE_URL', 'DIRECT_URL']) {
  const current = get(key)
  if (!current) {
    console.log(key + ': missing')
    continue
  }
  const { fixed, strippedBrackets, passLength } = fixUrl(current)
  env = env.replace(new RegExp('^' + key + '=.*$', 'm'), `${key}="${fixed}"`)
  console.log(
    `${key}: fixed (stripped brackets: ${strippedBrackets}, pass length: ${passLength})`
  )
}

fs.writeFileSync(envPath, env)
console.log('Updated .env')
