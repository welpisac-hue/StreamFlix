import Navbar from '@/components/Navbar'
import { AlertTriangle } from 'lucide-react'

export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <div className="pt-24 px-8 md:px-16 max-w-4xl mx-auto">
        <div className="bg-gray-900 rounded-lg p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
            <h1 className="text-3xl font-bold text-white">Legal Disclaimer</h1>
          </div>
          
          <div className="space-y-6 text-gray-300">
            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
              <p className="text-yellow-400 font-semibold mb-2">Important Notice</p>
              <p className="text-sm">
                Please read this disclaimer carefully before using StreamFlix.
              </p>
            </div>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">No Ownership of Content</h2>
              <p className="mb-3">
                StreamFlix does not own, host, or distribute any of the movies, TV shows, or other content available on this platform. All content is embedded from third-party sources, primarily VidKing and similar services.
              </p>
              <p>
                We do not have any control over the content, its availability, or its legality. All content is the property of their respective owners and copyright holders.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">Third-Party Sources</h2>
              <p className="mb-3">
                The video content on StreamFlix is provided by external third-party services. We do not:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Upload or host any video files</li>
                <li>Control the availability or quality of content</li>
                <li>Have any affiliation with the content owners</li>
                <li>Guarantee the accuracy or completeness of content information</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">Copyright and Fair Use</h2>
              <p className="mb-3">
                StreamFlix is intended for personal, non-commercial use only. We respect copyright laws and encourage users to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Use the service only for personal viewing</li>
                <li>Not reproduce or distribute copyrighted content</li>
                <li>Support content creators by using official platforms when available</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">User Responsibility</h2>
              <p className="mb-3">
                By using StreamFlix, you agree to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Use the service in compliance with applicable laws</li>
                <li>Accept full responsibility for your use of the platform</li>
                <li>Understand that StreamFlix is not liable for any copyright infringement</li>
                <li>Recognize that content availability may change without notice</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">DMCA Policy</h2>
              <p className="mb-3">
                If you believe that any content on StreamFlix infringes your copyright, please contact us immediately with:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Your name and contact information</li>
                <li>Description of the copyrighted work</li>
                <li>Location of the alleged infringing content</li>
                <li>Statement of good faith belief</li>
                <li>Electronic or physical signature</li>
              </ul>
              <p className="mt-3">
                Contact: Real5wagger5oup@Gmail.com
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">No Warranty</h2>
              <p>
                StreamFlix is provided "as is" without any warranties, express or implied. We do not guarantee:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4 mt-3">
                <li>Uninterrupted or error-free service</li>
                <li>Content availability or quality</li>
                <li>Accuracy of content information</li>
                <li>Security of the platform</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">Limitation of Liability</h2>
              <p>
                StreamFlix and its operators shall not be liable for any damages arising from the use or inability to use this service, including but not limited to direct, indirect, incidental, or consequential damages.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">Changes to This Disclaimer</h2>
              <p>
                We reserve the right to modify this disclaimer at any time. Continued use of StreamFlix after changes constitutes acceptance of the updated terms.
              </p>
            </section>

            <div className="bg-gray-800 rounded-lg p-4 mt-8">
              <p className="text-sm text-gray-400">
                Last Updated: September 2024
              </p>
              <p className="text-sm text-gray-400 mt-2">
                For questions or concerns, contact us at: Real5wagger5oup@Gmail.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}