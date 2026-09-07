import Navbar from '@/components/Navbar'
import { FileText } from 'lucide-react'

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <div className="pt-24 px-8 md:px-16 max-w-4xl mx-auto">
        <div className="bg-gray-900 rounded-lg p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="w-8 h-8 text-red-500" />
            <h1 className="text-3xl font-bold text-white">Terms of Service</h1>
          </div>
          
          <div className="space-y-6 text-gray-300">
            <section>
              <h2 className="text-xl font-bold text-white mb-3">1. Acceptance of Terms</h2>
              <p>
                By accessing and using StreamFlix, you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to abide by these terms, please do not use this service.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">2. Description of Service</h2>
              <p className="mb-3">
                StreamFlix is a free streaming platform that provides access to movies and TV shows through embedded third-party content. Our service includes:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Access to embedded video content from third-party sources</li>
                <li>Search and discovery features for movies and TV shows</li>
                <li>User accounts for personalized experiences</li>
                <li>Watch history and watch later functionality</li>
                <li>User reviews and ratings</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">3. User Accounts</h2>
              <p className="mb-3">
                To access certain features of StreamFlix, you may be required to create an account. You agree to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provide accurate and complete information</li>
                <li>Maintain the security of your password</li>
                <li>Accept responsibility for all activities under your account</li>
                <li>Notify us immediately of unauthorized access</li>
                <li>Not share your account credentials with others</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">4. Acceptable Use</h2>
              <p className="mb-3">
                You agree to use StreamFlix only for lawful purposes and in accordance with these Terms. You agree NOT to:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Use the service for any illegal purpose</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt the service</li>
                <li>Upload viruses or malicious code</li>
                <li>Reproduce, duplicate, or copy any content</li>
                <li>Use the service for commercial purposes</li>
                <li>Harass or abuse other users</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">5. Content and Intellectual Property</h2>
              <p className="mb-3">
                All content on StreamFlix is owned by third parties and is embedded from external sources. We do not claim ownership of any content. You acknowledge that:
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>All content is the property of their respective owners</li>
                <li>Any use of content beyond personal viewing may violate copyright laws</li>
                <li>We are not responsible for content availability or quality</li>
                <li>Content may be removed or changed without notice</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">6. User-Generated Content</h2>
              <p className="mb-3">
                By submitting reviews, ratings, or other content to StreamFlix, you grant us a non-exclusive, royalty-free license to use, display, and distribute such content. You represent that you have the right to grant this license.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">7. Privacy</h2>
              <p>
                Your use of StreamFlix is subject to our Privacy Policy, which describes how we collect, use, and protect your personal information. Please review our Privacy Policy carefully.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">8. Disclaimer of Warranties</h2>
              <p>
                StreamFlix is provided on an "as is" and "as available" basis. We make no warranties, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">9. Limitation of Liability</h2>
              <p>
                In no event shall StreamFlix or its operators be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">10. Termination</h2>
              <p className="mb-3">
                We reserve the right to terminate or suspend your account and access to StreamFlix at our sole discretion, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">11. Governing Law</h2>
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which StreamFlix operates, without regard to its conflict of law provisions.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">12. Changes to Terms</h2>
              <p>
                We reserve the right to modify these Terms at any time. We will notify users of significant changes by posting the new Terms on this page. Your continued use of StreamFlix after such modifications constitutes your acceptance of the new Terms.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-white mb-3">13. Contact Information</h2>
              <p>
                If you have any questions about these Terms, please contact us at: Real5wagger5oup@Gmail.com
              </p>
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