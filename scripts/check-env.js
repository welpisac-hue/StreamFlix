const fs = require('fs')
const env = fs.readFileSync('.env', 'utf8')
const keys = [
  'DATABASE_URL',
  'DIRECT_URL',
  'NEXTAUTH_SECRET',
  'NEXTAUTH_URL',
  'TMDB_API_KEY',
  'CONTACT_EMAIL',
]

for (const k of keys) {
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'))
  if (!m) {
    console.log(k + ': MISSING')
    continue
  }
  let v = m[1].trim()
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1)
  }
  const bad =
    /YOUR-PASSWORD|your-tmdb|your-secret|change-this|user:password@localhost/i.test(
      v
    )
  const extra = k.includes('URL') && v ? ` len=${v.length}` : ''
  console.log(`${k}: ${v ? 'set' : 'EMPTY'}${bad ? ' (still placeholder)' : ''}${extra}`)
}
