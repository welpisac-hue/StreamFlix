# StreamFlix - Movie Streaming Website

## Project Overview
A Netflix-like streaming website built with Next.js, featuring free movie and TV show streaming via vidsrc.sbs embedding, user authentication, personalized recommendations, and comprehensive content management.

## Tech Stack
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS 4
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: Supabase (PostgreSQL)
- **Authentication**: NextAuth.js with credentials provider
- **API**: TMDB (The Movie Database) API
- **UI Components**: Framer Motion, Lucide React
- **Styling**: Tailwind CSS with custom animations

## Environment Setup

### Required Environment Variables
Copy `env.example` to `.env` and fill in values. See `env.example` for Supabase connection string format.

### Database Setup (Supabase)
1. In Supabase: **Project Settings → Database → Connection string (URI)**
2. Set `DATABASE_URL` (pooler) and `DIRECT_URL` (direct) in `.env`
3. Push the Prisma schema:
```bash
npx prisma generate
npx prisma db push
```

### Installation
```bash
npm install
```

## Development Commands

### Start Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Start Production Server
```bash
npm start
```

### Database Commands
```bash
# Generate Prisma client
npx prisma generate

# Push schema changes to database
npx prisma db push

# Open Prisma Studio (database GUI)
npx prisma studio
```

### Linting
```bash
npm run lint
```

## Key Features Implemented

### Core Features
- ✅ Movie and TV show streaming via vidsrc.sbs embedding
- ✅ User authentication (sign up/sign in)
- ✅ Personalized watch history with progress tracking
- ✅ Watch later list
- ✅ User reviews and ratings system
- ✅ Recommendation algorithm based on watch history
- ✅ Advanced search with genre and mood filters
- ✅ Browse by mood section

### Content Sections
- ✅ Top 10 trending content
- ✅ Trending movies and TV shows
- ✅ Popular and top-rated content
- ✅ Netflix Originals showcase
- ✅ Coming soon section
- ✅ Recommended for you (personalized)

### Pages
- ✅ Homepage with multiple content rows
- ✅ Movie detail pages with embedded player
- ✅ TV show detail pages with season/episode selection
- ✅ Watch pages for movies and TV shows
- ✅ Search page with filters
- ✅ My List page
- ✅ Continue Watching page
- ✅ Legal pages (Disclaimer, Terms, Privacy Policy)
- ✅ FAQ page
- ✅ About page
- ✅ Contact page
- ✅ Authentication pages

### UI/UX Features
- ✅ Modern dark theme (Netflix-inspired)
- ✅ Smooth animations with Framer Motion
- ✅ Responsive design
- ✅ Custom scrollbar styling
- ✅ Loading skeletons
- ✅ Hover effects and transitions
- ✅ Toast notifications

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/[...nextauth]` - NextAuth authentication

### Watch History
- `GET /api/watch-history` - Get user's watch history
- `POST /api/watch-history` - Add/update watch history
- `DELETE /api/watch-history/[id]` - Delete watch history entry

### Watch Later
- `GET /api/watch-later` - Get user's watch later list
- `POST /api/watch-later` - Add/remove from watch later

### Reviews
- `GET /api/reviews?tmdbId=123` - Get reviews for content
- `POST /api/reviews` - Create/update review

### Recommendations
- `GET /api/recommendations` - Get personalized recommendations

### Contact
- `POST /api/contact` - Submit contact form

## Database Schema

### Models
- **User**: User accounts with authentication
- **Account**: NextAuth account provider
- **Session**: User sessions
- **UserPreferences**: User preferences for recommendations
- **WatchHistory**: User's watch history with progress
- **WatchLater**: User's watch later list
- **Review**: User reviews and ratings

## Key Components

### UI Components
- `Navbar` - Main navigation with search
- `MovieCard` - Movie/TV show card component
- `MovieRow` - Horizontal scrolling content row
- `Top10` - Top 10 ranking display
- `ReviewSection` - User reviews and ratings
- `WatchLaterButton` - Add to watch later functionality
- `RecommendedSection` - Personalized recommendations

### Pages
- Homepage with hero section and content rows
- Movie detail pages with embedded player
- TV show detail pages with season selection
- Watch pages for streaming
- Search with filters
- User account pages

## TMDB API Integration

The project uses TMDB API for:
- Movie and TV show data
- Posters and backdrops
- Trailers and videos
- Cast and crew information
- Genre data
- Search functionality
- Trending and popular content

## Video Embedding

Videos are embedded using vidsrc.sbs:
- Movies: `https://vidsrc.sbs/embed/movie/{tmdb_id}`
- TV Shows: `https://vidsrc.sbs/embed/tv/{tmdb_id}/{season_number}/{episode_number}`

Supported query parameters:
- `?autoplay=1` - Auto-play
- `?color=e50914` - Custom accent color
- `?sub=en` - Preselect subtitles
- `?t=120` - Start at timestamp
- `?controls=0` - Hide controls

## Deployment Notes

### Prerequisites
- Supabase project (PostgreSQL)
- TMDB API key
- Environment variables configured

### Build Process
1. Set environment variables
2. Run database migrations (`npx prisma db push`)
3. Build the application
4. Start production server

### Hosting Recommendations
- Vercel (recommended for Next.js)
- Supabase for PostgreSQL
- Environment variables must be configured in hosting platform

## Legal Considerations

### Disclaimer
The site includes a comprehensive legal disclaimer stating:
- No ownership of content
- Content embedded from third-party sources
- Compliance with copyright laws
- DMCA policy for copyright holders

### Required Pages
- Legal Disclaimer
- Terms of Service
- Privacy Policy
- Contact information (Real5wagger5oup@Gmail.com)

## Future Enhancements

### Potential Features
- User profiles with avatars
- Social features (follow users, share lists)
- Advanced recommendation algorithms
- Multiple language support
- Download functionality (where legal)
- Live chat/discussion features
- Watch parties
- Content reminders

### Performance Optimizations
- Image optimization
- API response caching
- Database query optimization
- CDN integration
- Lazy loading components

## Troubleshooting

### Common Issues
1. **Database connection errors**: Check `DATABASE_URL` / `DIRECT_URL` and your Supabase DB password
2. **TMDB API errors**: Verify TMDB_API_KEY is valid
3. **Authentication issues**: Check NEXTAUTH_SECRET and NEXTAUTH_URL
4. **Build errors**: Ensure all dependencies are installed

### Debug Mode
Set `NODE_ENV=development` for detailed error messages and NextAuth debug mode.

## Contact
For support or questions: Real5wagger5oup@Gmail.com

## Base44 Dev Environment

This repo runs under Base44 via `docker-compose.base44.yml` (not the repo's own
Cloudflare/Vercel deploy config). It runs the Next.js dev server from the cloned
source with live reload, plus a local PostgreSQL.

### Running
```bash
docker compose -f docker-compose.base44.yml up -d --build
```
- `db` — PostgreSQL 16 with a baked-in self-signed SSL cert (see `docker/Dockerfile.pg`).
  SSL is required because `src/lib/prisma.ts` hardcodes `ssl: { rejectUnauthorized: false }`
  on the pg Pool, so a plain non-SSL Postgres would be rejected.
- `migrate` — one-shot: `npm ci` → `prisma generate` → `prisma db push` → seed. Installs
  deps into a shared `node_modules` volume so the `web` service reuses them.
- `web` — `next dev -H 0.0.0.0 -p 3000` (Turbopack). Port 3000. Depends on `migrate` finishing.

### Environment
- `.env.base44-defaults` holds local-only placeholders (DB URL, NEXTAUTH_URL, admin slug).
- Real secrets (`TMDB_API_KEY`, `NEXTAUTH_SECRET`) come from `/run/base44/app.env` (loaded
  last, so they override the defaults). See `.base44/environment.json`.
- `BASE44_PUBLIC_HOST_SUFFIX` is passed into `web` so `next.config.ts` `allowedDevOrigins`
  allows the preview origin for dev assets/HMR.

### Notes
- The app is invite-only: the root redirects unauthenticated users to `/auth/signin`.
  The seed creates admin invite code `WILLCHANGE` (1 use, grants ADMIN).
- To re-run migrations after a schema change: `docker compose -f docker-compose.base44.yml
  up -d --force-recreate migrate` (this re-seeds and wipes app data).