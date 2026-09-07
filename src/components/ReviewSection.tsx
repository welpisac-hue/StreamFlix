'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Star, ThumbsUp, MessageSquare } from 'lucide-react'
import toast from 'react-hot-toast'

interface Review {
  id: string
  title: string
  rating: number
  comment: string
  likes: number
  createdAt: string
  user: {
    id: string
    name: string | null
    username?: string
  }
}

interface ReviewSectionProps {
  tmdbId: number
  title: string
}

export default function ReviewSection({ tmdbId, title }: ReviewSectionProps) {
  const { data: session } = useSession()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    rating: 5,
    title: '',
    comment: ''
  })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetchReviews()
  }, [tmdbId])

  const fetchReviews = async () => {
    try {
      const response = await fetch(`/api/reviews?tmdbId=${tmdbId}`)
      if (response.ok) {
        const data = await response.json()
        setReviews(data)
      }
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId,
          title: formData.title,
          rating: formData.rating,
          comment: formData.comment
        })
      })

      if (!response.ok) throw new Error('Failed to submit review')

      toast.success('Review submitted successfully!')
      setFormData({ rating: 5, title: '', comment: '' })
      setShowForm(false)
      fetchReviews()
    } catch (error) {
      toast.error('Failed to submit review')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLike = async (reviewId: string) => {
    // In a real app, you'd implement like functionality
    toast.success('Thanks for your feedback!')
  }

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : 'N/A'

  return (
    <div className="bg-gray-900 rounded-lg p-6 mt-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">User Reviews</h2>
          <div className="flex items-center gap-2 mt-2">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            <span className="text-white font-semibold">{averageRating}</span>
            <span className="text-gray-400">({reviews.length} reviews)</span>
          </div>
        </div>
        
        {session && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <MessageSquare className="w-4 h-4" />
            Write a Review
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-white mb-4">Write Your Review</h3>
          
          <div className="mb-4">
            <label className="block text-white mb-2">Rating</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setFormData({ ...formData, rating: star })}
                  className={`w-8 h-8 rounded-full transition-colors ${
                    star <= formData.rating
                      ? 'bg-yellow-400 text-black'
                      : 'bg-gray-700 text-gray-400'
                  }`}
                >
                  {star}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-white mb-2">Review Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
              placeholder="Sum up your review"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-white mb-2">Your Review</label>
            <textarea
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              className="w-full bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 h-32 resize-none"
              placeholder="What did you think of this title?"
              required
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-gray-700 text-white px-6 py-2 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-center py-8">
          <div className="text-gray-400">Loading reviews...</div>
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8">
          <MessageSquare className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No reviews yet. Be the first to review!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {review.user.username?.[0]?.toUpperCase() ||
                        review.user.name?.[0] ||
                        'U'}
                    </div>
                    <span className="text-white font-medium">
                      {review.user.username
                        ? `@${review.user.username}`
                        : review.user.name || 'Anonymous'}
                    </span>
                  </div>
                  <h4 className="text-white font-semibold">{review.title}</h4>
                </div>
                <div className="flex items-center gap-1 bg-yellow-400/20 px-2 py-1 rounded">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-yellow-400 font-semibold">{review.rating}/10</span>
                </div>
              </div>
              
              <p className="text-gray-300 mb-3">{review.comment}</p>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  {new Date(review.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={() => handleLike(review.id)}
                  className="flex items-center gap-1 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <ThumbsUp className="w-4 h-4" />
                  {review.likes}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}