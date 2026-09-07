'use client'

import { useState } from 'react'
import Navbar from '@/components/Navbar'
import { Mail, Send, MapPin, Phone } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) throw new Error('Failed to send message')

      toast.success('Message sent successfully!')
      setFormData({ name: '', email: '', subject: '', message: '' })
    } catch (error) {
      toast.error('Failed to send message. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <div className="pt-24 px-8 md:px-16 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Mail className="w-12 h-12 text-red-500" />
            <h1 className="text-4xl font-bold text-white">Contact Us</h1>
          </div>
          <p className="text-gray-400 text-lg">
            Have questions or feedback? We'd love to hear from you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div>
            <div className="bg-gray-900 rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">Send us a message</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-white mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                    placeholder="Your name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white mb-2">Subject</label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                    placeholder="What's this about?"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white mb-2">Message</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full bg-gray-800 text-white px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 h-32 resize-none"
                    placeholder="Your message..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-red-600 text-white py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? 'Sending...' : (
                    <>
                      <Send className="w-5 h-5" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          <div>
            <div className="bg-gray-900 rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-bold text-white mb-6">Contact Information</h2>
              
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Email</h3>
                    <a
                      href="mailto:Real5wagger5oup@Gmail.com"
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      Real5wagger5oup@Gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Location</h3>
                    <p className="text-gray-400">
                      Online streaming platform<br />
                      Available worldwide
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-red-600/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-1">Response Time</h3>
                    <p className="text-gray-400">
                      We typically respond within 24-48 hours
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg p-8">
              <h2 className="text-2xl font-bold text-white mb-6">FAQ Quick Links</h2>
              <ul className="space-y-3">
                <li>
                  <a href="/faq" className="text-gray-400 hover:text-red-500 transition-colors">
                    → General Questions
                  </a>
                </li>
                <li>
                  <a href="/faq" className="text-gray-400 hover:text-red-500 transition-colors">
                    → Account Issues
                  </a>
                </li>
                <li>
                  <a href="/faq" className="text-gray-400 hover:text-red-500 transition-colors">
                    → Technical Support
                  </a>
                </li>
                <li>
                  <a href="/legal/disclaimer" className="text-gray-400 hover:text-red-500 transition-colors">
                    → Legal Information
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}