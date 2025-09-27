import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Shield, Lock, Eye, Database } from 'lucide-react';

const Privacy = () => {
  const shouldReduceMotion = useReducedMotion();

  const itemVariants = {
    hidden: shouldReduceMotion ? { opacity: 0 } : { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: shouldReduceMotion ? { duration: 0.3 } : {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="container mx-auto max-w-4xl">

        {/* Header */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center mb-6">
            <Shield className="w-12 h-12 text-gold-primary mr-4" />
            <h1 className="text-4xl md:text-5xl font-bold gradient-text">
              Privacy Policy
            </h1>
          </div>
          <div className="w-32 h-1 bg-cosmic-gradient mx-auto mb-6 rounded-full shadow-theme-cosmic" />
          <p className="text-theme-secondary text-lg">
            Last updated: January 2025
          </p>
        </motion.div>

        {/* Content */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="bg-theme-card/80 backdrop-blur-lg border border-theme-cosmic rounded-2xl p-8"
        >

          {/* Privacy Commitment */}
          <div className="bg-gold-primary/10 border border-gold-primary/20 rounded-xl p-6 mb-8">
            <div className="flex items-start">
              <Lock className="w-6 h-6 text-gold-primary mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-theme-primary mb-2">Our Privacy Commitment</h3>
                <p className="text-theme-secondary text-sm leading-relaxed">
                  Your privacy is sacred to us. We use industry-standard encryption and never share your personal
                  information or reading details with third parties.
                </p>
              </div>
            </div>
          </div>

          <div className="prose prose-invert max-w-none space-y-8">

            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-bold text-theme-primary mb-4 flex items-center">
                <Eye className="w-6 h-6 text-gold-primary mr-2" />
                1. Information We Collect
              </h2>
              <h3 className="text-lg font-semibold text-theme-primary mb-3">Personal Information</h3>
              <ul className="list-disc list-inside text-theme-secondary space-y-2 ml-4 mb-4">
                <li>Email address for account creation and communication</li>
                <li>Name for personalized reading experiences</li>
                <li>Date of birth for astrology services</li>
                <li>Payment information (processed securely by our payment partners)</li>
              </ul>

              <h3 className="text-lg font-semibold text-theme-primary mb-3">Reading Information</h3>
              <ul className="list-disc list-inside text-theme-secondary space-y-2 ml-4 mb-4">
                <li>Questions submitted for readings</li>
                <li>Reading preferences and history</li>
                <li>Communication with readers</li>
              </ul>

              <h3 className="text-lg font-semibold text-theme-primary mb-3">Technical Information</h3>
              <ul className="list-disc list-inside text-theme-secondary space-y-2 ml-4">
                <li>Device and browser information</li>
                <li>IP address and location data</li>
                <li>Usage patterns and preferences</li>
              </ul>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold text-theme-primary mb-4 flex items-center">
                <Database className="w-6 h-6 text-gold-primary mr-2" />
                2. How We Use Your Information
              </h2>
              <p className="text-theme-secondary leading-relaxed mb-4">We use collected information to:</p>
              <ul className="list-disc list-inside text-theme-secondary space-y-2 ml-4">
                <li>Provide personalized spiritual guidance and readings</li>
                <li>Process payments and manage your account</li>
                <li>Communicate about your orders and services</li>
                <li>Improve our platform and user experience</li>
                <li>Send relevant updates and promotional content (with your consent)</li>
                <li>Ensure platform security and prevent fraud</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold text-theme-primary mb-4">3. Information Sharing</h2>
              <p className="text-theme-secondary leading-relaxed mb-4">
                We maintain strict confidentiality and never sell your personal information. Limited sharing occurs only in these situations:
              </p>
              <ul className="list-disc list-inside text-theme-secondary space-y-2 ml-4">
                <li><strong>With Readers:</strong> Only information necessary to provide your requested reading</li>
                <li><strong>Service Providers:</strong> Trusted partners who assist in platform operations (payment processing, hosting)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In the event of a merger or acquisition (with continued privacy protection)</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold text-theme-primary mb-4">4. Data Security</h2>
              <p className="text-theme-secondary leading-relaxed mb-4">
                We implement comprehensive security measures to protect your information:
              </p>
              <ul className="list-disc list-inside text-theme-secondary space-y-2 ml-4">
                <li>End-to-end encryption for all sensitive communications</li>
                <li>Secure cloud storage with regular backups</li>
                <li>Multi-factor authentication for reader and admin accounts</li>
                <li>Regular security audits and updates</li>
                <li>Limited access on a need-to-know basis</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-bold text-theme-primary mb-4">5. Your Privacy Rights</h2>
              <p className="text-theme-secondary leading-relaxed mb-4">You have the right to:</p>
              <ul className="list-disc list-inside text-theme-secondary space-y-2 ml-4">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correct:</strong> Update or correct inaccurate information</li>
                <li><strong>Delete:</strong> Request deletion of your account and data</li>
                <li><strong>Port:</strong> Receive your data in a machine-readable format</li>
                <li><strong>Object:</strong> Opt out of marketing communications</li>
                <li><strong>Restrict:</strong> Limit how we process your information</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-bold text-theme-primary mb-4">6. Cookies and Tracking</h2>
              <p className="text-theme-secondary leading-relaxed mb-4">
                We use cookies and similar technologies to enhance your experience:
              </p>
              <ul className="list-disc list-inside text-theme-secondary space-y-2 ml-4">
                <li><strong>Essential Cookies:</strong> Required for platform functionality</li>
                <li><strong>Preference Cookies:</strong> Remember your settings and preferences</li>
                <li><strong>Analytics Cookies:</strong> Help us improve the platform</li>
                <li><strong>Marketing Cookies:</strong> Deliver relevant content (with your consent)</li>
              </ul>
              <p className="text-theme-secondary leading-relaxed mt-4">
                You can manage cookie preferences through your browser settings.
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-bold text-theme-primary mb-4">7. Data Retention</h2>
              <p className="text-theme-secondary leading-relaxed mb-4">
                We retain your information only as long as necessary:
              </p>
              <ul className="list-disc list-inside text-theme-secondary space-y-2 ml-4">
                <li><strong>Account Data:</strong> Until account deletion or 3 years of inactivity</li>
                <li><strong>Reading History:</strong> 7 years for quality assurance and legal compliance</li>
                <li><strong>Payment Records:</strong> As required by financial regulations</li>
                <li><strong>Communications:</strong> 2 years for support and improvement purposes</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-bold text-theme-primary mb-4">8. International Transfers</h2>
              <p className="text-theme-secondary leading-relaxed">
                Your information may be processed in countries other than your residence. We ensure adequate
                protection through appropriate safeguards including standard contractual clauses and
                adequacy decisions.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl font-bold text-theme-primary mb-4">9. Children's Privacy</h2>
              <p className="text-theme-secondary leading-relaxed">
                Our services are not intended for individuals under 18. We do not knowingly collect
                personal information from children. If we become aware of such collection,
                we will delete the information immediately.
              </p>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-2xl font-bold text-theme-primary mb-4">10. Policy Updates</h2>
              <p className="text-theme-secondary leading-relaxed">
                We may update this privacy policy to reflect changes in our practices or legal requirements.
                Significant changes will be communicated via email or platform notifications. Your continued
                use constitutes acceptance of the updated policy.
              </p>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="text-2xl font-bold text-theme-primary mb-4">11. Contact Us</h2>
              <p className="text-theme-secondary leading-relaxed">
                For privacy-related questions, data requests, or concerns, please contact our privacy team
                through the support channels available on the platform. We respond to all privacy inquiries
                within 30 days.
              </p>
            </section>

          </div>
        </motion.div>

        {/* Navigation */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="text-center mt-12"
        >
          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 bg-cosmic-gradient hover:shadow-theme-cosmic text-theme-inverse font-medium rounded-lg transition-all duration-300 transform hover:scale-105"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
        </motion.div>

      </div>
    </div>
  );
};

export default Privacy;