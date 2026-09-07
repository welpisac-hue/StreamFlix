import Navbar from '@/components/Navbar'
import { Shield } from 'lucide-react'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <div className="pt-24 px-8 md:px-16 max-w-4xl mx-auto">
        <div className="bg-gray-900 rounded-lg p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-8 h-8 text-green-500" />
            <h1 className="text-3xl font-bold text-white">Privacy Policy</h1>
          </div>
          
          <div className="space-y-6 text-gray-300">
            <section>
              <h2 className="text-xl font-bold text-white mb-3">1. Information We Collect</h2>
              <p className="mb-3">
                StreamFlix collects information you provide directly to us and information we collect automatically when you use our service.
              </p>
              
              <h3 className="text-lg font-semibold text-white mb-2">Information You Provide</h3>
              <ul className="list-disc list-inside space-y-2 ml-4 mb-4">
                <li>Account information (username)</li>
                <li>Password (encrypted and hashed)</li>
                <li>Watch history and viewing preferences</li>
                <li>Reviews and ratings you submit</li>
                <li>Watch later list</li>
              </ul>

              <h3 className="text-lg font-semibold text-white mb-2">Automatically Collected Information</h3>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Device information (browser type, operating system)</li>
                <li>IP address</li>
                <li>Usage data and browsing patterns</li>
                <li>Cookies and similar technologies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">2. How We Use Your Information</h2>
              <p className="mb-3">
                We use the information we collect for various purposes, including:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Providing and maintaining our service</li>
                <li>Personalizing your experience (recommendations, watch history)</li>
                <li>Improving our service and developing new features</li>
                <li>Communicating with you about your account</li>
                <li>Analyzing usage patterns to improve performance</li>
                <li>Detecting and preventing fraudulent activity</li>
                <li>Complying with legal obligations</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">3. Data Storage and Security</h2>
              <p className="mb-3">
                We take reasonable measures to protect your information:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Passwords are encrypted using industry-standard hashing (bcrypt)</li>
                <li>Data is stored in secure databases</li>
                <li>We use HTTPS encryption for data transmission</li>
                <li>Access to personal data is restricted</li>
                <li>Regular security reviews and updates</li>
              </ul>
              <p className="mt-3">
                However, no method of transmission over the internet is 100% secure. While we strive to protect your data, we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">4. Data Retention</h2>
              <p className="mb-3">
                We retain your personal data for as long as necessary to provide our services and fulfill the purposes outlined in this policy:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Account information: Until you delete your account</li>
                <li>Watch history: Until you delete it or your account</li>
                <li>Reviews and ratings: Until you delete them or your account</li>
                <li>Usage data: Typically 12-24 months for analytics</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">5. Your Rights and Choices</h2>
              <p className="mb-3">
                You have certain rights regarding your personal information:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update or correct your information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                <li><strong>Opt-out:</strong> Opt out of data collection where possible</li>
                <li><strong>Portability:</strong> Request transfer of your data</li>
                <li><strong>Objection:</strong> Object to processing of your data</li>
              </ul>
              <p className="mt-3">
                To exercise these rights, please contact us at Real5wagger5oup@Gmail.com
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">6. Cookies and Tracking</h2>
              <p className="mb-3">
                We use cookies and similar technologies to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Remember your preferences and login state</li>
                <li>Analyze website traffic and usage patterns</li>
                <li>Improve user experience</li>
                <li>Provide personalized content</li>
              </ul>
              <p className="mt-3">
                You can control cookies through your browser settings, but this may affect functionality.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">7. Third-Party Services</h2>
              <p className="mb-3">
                StreamFlix integrates with third-party services:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Video Content:</strong> Embedded from VidKing and similar services</li>
                <li><strong>Movie Data:</strong> Provided by TMDB (The Movie Database)</li>
                <li><strong>Authentication:</strong> NextAuth.js for secure login</li>
              </ul>
              <p className="mt-3">
                These third parties have their own privacy policies. We encourage you to review them.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">8. Children's Privacy</h2>
              <p>
                StreamFlix is not intended for children under 13. We do not knowingly collect personal information from children under 13. If we become aware that we have collected such information, we will take steps to delete it.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">9. International Data Transfers</h2>
              <p>
                Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data in accordance with this privacy policy.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">10. Changes to This Policy</h2>
              <p>
                We may update our privacy policy from time to time. We will notify you of significant changes by posting the new policy on this page and updating the "Last Updated" date.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">11. Contact Us</h2>
              <p className="mb-3">
                If you have any questions about this privacy policy or our data practices, please contact us:
              </p>
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-white">Email: Real5wagger5oup@Gmail.com</p>
              </div>
            </section>

            <div className="bg-gray-800 rounded-lg p-4 mt-8">
              <p className="text-sm text-gray-400">
                Last Updated: September 2024
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}