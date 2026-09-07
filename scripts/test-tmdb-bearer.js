const fs = require('fs')
const env = fs.readFileSync('.env', 'utf8')
const m = env.match(/^TMDB_API_KEY=(.*)$/m)
let v = m[1].trim()
if (
  (v.startsWith('"') && v.endsWith('"')) ||
  (v.startsWith("'") && v.endsWith("'"))
) {
  v = v.slice(1, -1)
}

async function main() {
  const res = await fetch('https://api.themoviedb.org/3/trending/movie/week', {
    headers: { Authorization: 'Bearer ' + v },
  })
  const data = await res.json()
  console.log('status', res.status)
  console.log('results', (data.results || []).length)
  console.log('message', data.status_message || 'ok')
}
main()
