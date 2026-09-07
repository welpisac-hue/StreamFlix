import Navbar from '@/components/Navbar'
import { Film, Heart, Users, Zap } from 'lucide-react'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <div className="pt-24 px-8 md:px-16 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Film className="w-12 h-12 text-red-500" />
            <h1 className="text-4xl font-bold text-white">About StreamFlix</h1>
          </div>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Your ultimate destination for streaming movies and TV shows. Free, fast, and always entertaining.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="bg-gray-900 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
            <p className="text-gray-300 leading-relaxed">
              At StreamFlix, we believe everyone deserves access to quality entertainment. Our mission is to provide a seamless, free streaming experience that brings movies and TV shows from around the world to your screen. We're passionate about connecting viewers with content they love, without barriers or expensive subscriptions.
            </p>
          </div>

          <div className="bg-gray-900 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-white mb-4">What We Offer</h2>
            <p className="text-gray-300 leading-relaxed">
              StreamFlix aggregates content from various third-party sources to provide you with an extensive library of movies and TV shows. From the latest blockbusters to classic films, from trending series to hidden gems, we're constantly updating our catalog to ensure there's always something new to discover.
            </p>
          </div>
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold text-white text-center mb-8">Why Choose StreamFlix?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-900 rounded-lg p-6 text-center">
              <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Completely Free</h3>
              <p className="text-gray-400 text-sm">
                No subscriptions, no hidden fees. Enjoy unlimited streaming at no cost.
              </p>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 text-center">
              <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Film className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Huge Library</h3>
              <p className="text-gray-400 text-sm">
                Thousands of movies and TV shows across all genres and eras.
              </p>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 text-center">
              <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Personalized</h3>
              <p className="text-gray-400 text-sm">
                Smart recommendations based on your viewing history and preferences.
              </p>
            </div>

            <div className="bg-gray-900 rounded-lg p-6 text-center">
              <div className="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Community</h3>
              <p className="text-gray-400 text-sm">
                Read and write reviews, see what others are watching.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg p-8 mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Smart Search</h3>
              <p className="text-gray-400">
                Advanced search with genre filters and mood-based browsing to find exactly what you're in the mood for.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Watch History</h3>
              <p className="text-gray-400">
                Never lose your place. Continue watching from where you left off, across all your devices.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Watch Later</h3>
              <p className="text-gray-400">
                Save movies and shows to your watch list for easy access later.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Reviews & Ratings</h3>
              <p className="text-gray-400">
                Read community reviews and share your own thoughts on the content you watch.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Coming Soon</h3>
              <p className="text-gray-400">
                Stay updated with upcoming releases and content coming to our platform.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-2">Popular Series</h3>
              <p className="text-gray-400">
                Discover popular series and trending shows curated for StreamFlix viewers.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-lg p-8 mb-16">
          <h2 className="text-2xl font-bold text-white mb-6">Our Technology</h2>
          <p className="text-gray-300 mb-4">
            StreamFlix is built with modern web technologies to ensure a fast, responsive, and enjoyable user experience:
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-400">
            <li>Next.js for optimal performance and SEO</li>
            <li>React for a dynamic, interactive interface</li>
            <li>Tailwind CSS for a beautiful, responsive design</li>
            <li>Framer Motion for smooth animations</li>
            <li>PostgreSQL with Prisma for reliable data management</li>
            <li>NextAuth.js for secure authentication</li>
            <li>TMDB API for comprehensive movie and TV show data</li>
          </ul>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Get In Touch</h2>
          <p className="text-gray-400 mb-6">
            Have questions, feedback, or suggestions? We'd love to hear from you.
          </p>
          <a
            href="mailto:Real5wagger5oup@Gmail.com"
            className="inline-block bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            Contact Us
          </a>
        </div>
      </div>
    </div>
  )
}