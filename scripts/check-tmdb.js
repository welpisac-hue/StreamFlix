const fs = require('fs')
const env = fs.readFileSync('.env', 'utf8')
const m = env.match(/^TMDB_API_KEY=(.*)$/m)
if (!m) {
  console.log('TMDB_API_KEY: MISSING')
  process.exit(1)
}
let v = m[1].trim()
if (
  (v.startsWith('"') && v.endsWith('"')) ||
  (v.startsWith("'") && v.endsWith("'"))
) {
  v = v.slice(1, -1)
}
console.log('len:', v.length)
console.log('starts with [:', v.startsWith('['))
console.log('ends with ]:', v.endsWith(']'))
console.log('has spaces:', /\s/.test(v))
console.log('placeholder:', /your-tmdb|changeme|xxx|example/i.test(v))
console.log('looks like v3 key (hex-ish):', /^[a-f0-9]{32}$/i.test(v))
console.log('looks like jwt/v4:', v.startsWith('eyJ'))

async function test() {
  const key = v.startsWith('[') && v.endsWith(']') ? v.slice(1, -1) : v
  const url = `https://api.themoviedb.org/3/configuration?api_key=${encodeURIComponent(key)}`
  try {
    const res = await fetch(url)
    const text = await res.text()
    console.log('TMDB status:', res.status)
    console.log('body preview:', text.slice(0, 120))
  } catch (e) {
    console.log('fetch error:', e.message)
  }
}
test()
