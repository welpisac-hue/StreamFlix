'use client'

import { useState } from 'react'
import Navbar from '@/components/Navbar'
import { HelpCircle, ChevronDown, ChevronUp } from 'lucide-react'

const faqs = [
  {
    question: "Is StreamFlix free to use?",
    answer: "Yes, StreamFlix is completely free to use. We don't charge any subscription fees or require payments for access to our content."
  },
  {
    question: "Do I need to create an account?",
    answer: "While you can browse content without an account, creating one allows you to personalize your experience with features like watch history, watch later lists, and personalized recommendations."
  },
  {
    question: "Where does the content come from?",
    answer: "All video content on StreamFlix is embedded from third-party sources, primarily VidKing. We don't host or upload any content ourselves."
  },
  {
    question: "Is this service legal?",
    answer: "StreamFlix operates as a content aggregation platform that embeds content from third-party sources. We don't host or distribute copyrighted material. Please review our Legal Disclaimer for more information."
  },
  {
    question: "Why is some content not available?",
    answer: "Content availability depends on our third-party sources. Some content may be temporarily unavailable or removed by the source providers. We regularly update our library based on what's available."
  },
  {
    question: "Can I download movies or shows?",
    answer: "No, StreamFlix doesn't support downloading content. All content is streamed directly through our embedded players."
  },
  {
    question: "How do the recommendations work?",
    answer: "Our recommendation system analyzes your watch history, ratings, and preferences to suggest content you might enjoy. The more you use StreamFlix, the better the recommendations become."
  },
  {
    question: "Can I request specific movies or shows?",
    answer: "We don't currently accept content requests. Our library is based on what's available through our third-party sources. We regularly update our catalog with new content."
  },
  {
    question: "Is my data safe?",
    answer: "We take data security seriously. Your password is encrypted, and we use industry-standard security practices. However, as with any online service, we recommend using a strong, unique password."
  },
  {
    question: "How do I delete my account?",
    answer: "To delete your account, please contact us at Real5wagger5oup@Gmail.com with your username. We'll process your request within a reasonable timeframe."
  },
  {
    question: "Why do videos sometimes buffer or load slowly?",
    answer: "Video performance depends on your internet connection and the third-party source servers. We recommend having a stable internet connection for the best experience."
  },
  {
    question: "Can I use StreamFlix on mobile devices?",
    answer: "Yes, StreamFlix is responsive and works on all devices including smartphones, tablets, and desktop computers."
  },
  {
    question: "What are the system requirements?",
    answer: "StreamFlix works on any modern web browser (Chrome, Firefox, Safari, Edge) with JavaScript enabled. A stable internet connection is required for streaming."
  },
  {
    question: "How do I report an issue?",
    answer: "If you encounter any issues, please contact us at Real5wagger5oup@Gmail.com with details about the problem you're experiencing."
  },
  {
    question: "Does StreamFlix have subtitles?",
    answer: "Subtitle availability depends on the embedded video source. Some content may include subtitles, but we don't have control over this feature."
  }
]

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <div className="pt-24 px-8 md:px-16 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <HelpCircle className="w-12 h-12 text-red-500" />
            <h1 className="text-4xl font-bold text-white">Frequently Asked Questions</h1>
          </div>
          <p className="text-gray-400 text-lg">
            Find answers to common questions about StreamFlix
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-gray-900 rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-800 transition-colors"
              >
                <span className="text-white font-semibold pr-4">{faq.question}</span>
                {openIndex === index ? (
                  <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
              </button>
              
              {openIndex === index && (
                <div className="px-6 pb-4">
                  <p className="text-gray-300 leading-relaxed">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 bg-gray-900 rounded-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Still have questions?</h2>
          <p className="text-gray-400 mb-6">
            Can't find the answer you're looking for? Please reach out to our support team.
          </p>
          <a
            href="mailto:Real5wagger5oup@Gmail.com"
            className="inline-block bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            Contact Support
          </a>
        </div>
      </div>
    </div>
  )
}