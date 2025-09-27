import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, Shield, FileText, AlertCircle } from 'lucide-react';

const Terms = () => {
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
            <FileText className="w-12 h-12 text-gold-primary mr-4" />
            <h1 className="text-4xl md:text-5xl font-bold gradient-text">
              Terms of Service
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

          {/* Important Notice */}
          <div className="bg-gold-primary/10 border border-gold-primary/20 rounded-xl p-6 mb-8">
            <div className="flex items-start">
              <AlertCircle className="w-6 h-6 text-gold-primary mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-theme-primary mb-2">Important Notice</h3>
                <p className="text-theme-secondary text-sm leading-relaxed">
                  By using Samia Tarot services, you acknowledge that our readings are for entertainment purposes only.
                  We do not guarantee specific outcomes and encourage responsible decision-making.
                </p>
              </div>
            </div>
          </div>

          <div className="prose prose-invert max-w-none space-y-8">

            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-bold text-theme-primary mb-4 flex items-center">
                <Shield className="w-6 h-6 text-gold-primary mr-2" />
                1. Acceptance of Terms
              </h2>
              <p className="text-theme-secondary leading-relaxed mb-4">
                By accessing and using the Samia Tarot platform, you accept and agree to be bound by the terms and provision of this agreement.
              </p>
              <p className="text-theme-secondary leading-relaxed">
                If you do not agree to abide by the above, please do not use this service.
              </p>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold text-theme-primary mb-4">2. Service Description</h2>
              <p className="text-theme-secondary leading-relaxed mb-4">
                Samia Tarot provides spiritual guidance services including but not limited to:
              </p>
              <ul className="list-disc list-inside text-theme-secondary space-y-2 ml-4">
                <li>Tarot card readings</li>
                <li>Astrology analysis</li>
                <li>Numerology consultations</li>
                <li>Palm reading interpretations</li>
                <li>Daily horoscopes</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold text-theme-primary mb-4">3. Age Restriction</h2>
              <p className="text-theme-secondary leading-relaxed">
                Our services are restricted to individuals who are 18 years of age or older. By using our platform,
                you confirm that you meet this age requirement.
              </p>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold text-theme-primary mb-4">4. Entertainment Purpose</h2>
              <p className="text-theme-secondary leading-relaxed mb-4">
                All readings and consultations provided through Samia Tarot are intended for entertainment purposes only.
                Our services should not be used as a substitute for professional advice including but not limited to:
              </p>
              <ul className="list-disc list-inside text-theme-secondary space-y-2 ml-4">
                <li>Medical or health advice</li>
                <li>Legal counsel</li>
                <li>Financial planning</li>
                <li>Mental health treatment</li>
              </ul>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-bold text-theme-primary mb-4">5. Payment Terms</h2>
              <p className="text-theme-secondary leading-relaxed mb-4">
                All payments are processed securely through our payment partners. By making a purchase, you agree to:
              </p>
              <ul className="list-disc list-inside text-theme-secondary space-y-2 ml-4">
                <li>Provide accurate payment information</li>
                <li>Pay all charges incurred by your account</li>
                <li>Comply with our refund policy</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-bold text-theme-primary mb-4">6. Privacy & Confidentiality</h2>
              <p className="text-theme-secondary leading-relaxed">
                We respect your privacy and maintain strict confidentiality of all readings and personal information.
                Please refer to our Privacy Policy for detailed information about data handling.
              </p>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-bold text-theme-primary mb-4">7. Prohibited Uses</h2>
              <p className="text-theme-secondary leading-relaxed mb-4">You may not use our service:</p>
              <ul className="list-disc list-inside text-theme-secondary space-y-2 ml-4">
                <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
                <li>To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
                <li>To transmit, or procure the sending of, any advertising or promotional material without our prior written consent</li>
                <li>To impersonate or attempt to impersonate the company, employees, or other users</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-bold text-theme-primary mb-4">8. Limitation of Liability</h2>
              <p className="text-theme-secondary leading-relaxed">
                Samia Tarot shall not be liable for any direct, indirect, incidental, special, consequential, or exemplary damages
                resulting from your use of our services, even if we have been advised of the possibility of such damages.
              </p>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl font-bold text-theme-primary mb-4">9. Changes to Terms</h2>
              <p className="text-theme-secondary leading-relaxed">
                We reserve the right to update these terms at any time. Users will be notified of significant changes
                via email or platform notifications. Continued use of our services constitutes acceptance of updated terms.
              </p>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-2xl font-bold text-theme-primary mb-4">10. Contact Information</h2>
              <p className="text-theme-secondary leading-relaxed">
                For questions about these Terms of Service, please contact us through our support channels available on the platform.
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

export default Terms;