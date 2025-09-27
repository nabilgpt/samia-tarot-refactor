import React from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, CreditCard, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

const Refund = () => {
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
            <CreditCard className="w-12 h-12 text-gold-primary mr-4" />
            <h1 className="text-4xl md:text-5xl font-bold gradient-text">
              Refund Policy
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

          {/* Satisfaction Guarantee */}
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 mb-8">
            <div className="flex items-start">
              <CheckCircle className="w-6 h-6 text-green-400 mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="font-bold text-theme-primary mb-2">Satisfaction Guarantee</h3>
                <p className="text-theme-secondary text-sm leading-relaxed">
                  We stand behind the quality of our readings. If you're not satisfied with your experience,
                  we're here to make it right within our refund timeframe.
                </p>
              </div>
            </div>
          </div>

          <div className="prose prose-invert max-w-none space-y-8">

            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-bold text-theme-primary mb-4 flex items-center">
                <Clock className="w-6 h-6 text-gold-primary mr-2" />
                1. Refund Timeframe
              </h2>
              <p className="text-theme-secondary leading-relaxed mb-4">
                Refund requests must be submitted within specific timeframes depending on the service:
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-theme-card/50 rounded-lg p-4">
                  <h3 className="font-semibold text-theme-primary mb-2">Written Readings</h3>
                  <p className="text-theme-secondary text-sm">48 hours after delivery</p>
                </div>
                <div className="bg-theme-card/50 rounded-lg p-4">
                  <h3 className="font-semibold text-theme-primary mb-2">Live Sessions</h3>
                  <p className="text-theme-secondary text-sm">24 hours after completion</p>
                </div>
                <div className="bg-theme-card/50 rounded-lg p-4">
                  <h3 className="font-semibold text-theme-primary mb-2">Pre-recorded Content</h3>
                  <p className="text-theme-secondary text-sm">24 hours after access</p>
                </div>
                <div className="bg-theme-card/50 rounded-lg p-4">
                  <h3 className="font-semibold text-theme-primary mb-2">Subscription Services</h3>
                  <p className="text-theme-secondary text-sm">7 days from purchase</p>
                </div>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-bold text-theme-primary mb-4">2. Eligible Refund Reasons</h2>
              <p className="text-theme-secondary leading-relaxed mb-4">
                Refunds may be granted for the following reasons:
              </p>
              <ul className="list-disc list-inside text-theme-secondary space-y-2 ml-4">
                <li><strong>Technical Issues:</strong> Platform errors preventing service delivery</li>
                <li><strong>Quality Concerns:</strong> Reading significantly below standard expectations</li>
                <li><strong>Service Not Delivered:</strong> Failure to receive purchased service within promised timeframe</li>
                <li><strong>Billing Errors:</strong> Unauthorized or incorrect charges</li>
                <li><strong>Reader Misconduct:</strong> Violation of professional standards</li>
                <li><strong>Duplicate Orders:</strong> Accidental multiple purchases of the same service</li>
              </ul>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-bold text-theme-primary mb-4">3. Non-Refundable Situations</h2>
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 mb-4">
                <div className="flex items-start">
                  <AlertTriangle className="w-6 h-6 text-red-400 mr-3 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-theme-primary mb-2">Important Notice</h3>
                    <p className="text-theme-secondary text-sm leading-relaxed">
                      Spiritual readings are interpretive services. Disagreement with interpretation or
                      outcomes not aligning with expectations are not grounds for refund.
                    </p>
                  </div>
                </div>
              </div>
              <p className="text-theme-secondary leading-relaxed mb-4">
                Refunds will not be provided in the following situations:
              </p>
              <ul className="list-disc list-inside text-theme-secondary space-y-2 ml-4">
                <li>Dissatisfaction with reading interpretation or spiritual guidance</li>
                <li>Changes in personal circumstances after reading completion</li>
                <li>Requests made after the specified refund timeframe</li>
                <li>Services already fully consumed (e.g., completed live sessions)</li>
                <li>Violation of terms of service by the client</li>
                <li>Refund requests made in bad faith or as abuse of the system</li>
              </ul>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-bold text-theme-primary mb-4">4. Refund Process</h2>
              <p className="text-theme-secondary leading-relaxed mb-4">
                To request a refund, follow these steps:
              </p>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="bg-gold-primary text-theme-inverse rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm mr-4 mt-1 flex-shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-theme-primary mb-1">Submit Request</h3>
                    <p className="text-theme-secondary text-sm">
                      Contact support through the platform with your order details and reason for refund
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="bg-gold-primary text-theme-inverse rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm mr-4 mt-1 flex-shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-theme-primary mb-1">Review Process</h3>
                    <p className="text-theme-secondary text-sm">
                      Our team will review your request within 2-3 business days
                    </p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="bg-gold-primary text-theme-inverse rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm mr-4 mt-1 flex-shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-theme-primary mb-1">Decision & Processing</h3>
                    <p className="text-theme-secondary text-sm">
                      Approved refunds are processed within 5-7 business days to original payment method
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-bold text-theme-primary mb-4">5. Partial Refunds</h2>
              <p className="text-theme-secondary leading-relaxed mb-4">
                In some cases, we may offer partial refunds:
              </p>
              <ul className="list-disc list-inside text-theme-secondary space-y-2 ml-4">
                <li>When only part of a multi-session package was unsatisfactory</li>
                <li>For subscription services partially used before cancellation</li>
                <li>When technical issues affected but didn't completely prevent service delivery</li>
                <li>As a goodwill gesture for borderline cases</li>
              </ul>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-bold text-theme-primary mb-4">6. Alternative Solutions</h2>
              <p className="text-theme-secondary leading-relaxed mb-4">
                Before processing refunds, we may offer alternative solutions:
              </p>
              <ul className="list-disc list-inside text-theme-secondary space-y-2 ml-4">
                <li><strong>Re-reading:</strong> Assignment to a different reader for fresh perspective</li>
                <li><strong>Service Credit:</strong> Platform credit for future purchases</li>
                <li><strong>Complimentary Add-on:</strong> Additional questions or extended reading time</li>
                <li><strong>Reader Training:</strong> Feedback to improve future service quality</li>
              </ul>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-bold text-theme-primary mb-4">7. Payment Method Considerations</h2>
              <p className="text-theme-secondary leading-relaxed mb-4">
                Refund processing times vary by payment method:
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-theme-card/50 rounded-lg p-4">
                  <h3 className="font-semibold text-theme-primary mb-2">Credit/Debit Cards</h3>
                  <p className="text-theme-secondary text-sm">3-5 business days</p>
                </div>
                <div className="bg-theme-card/50 rounded-lg p-4">
                  <h3 className="font-semibold text-theme-primary mb-2">PayPal</h3>
                  <p className="text-theme-secondary text-sm">1-2 business days</p>
                </div>
                <div className="bg-theme-card/50 rounded-lg p-4">
                  <h3 className="font-semibold text-theme-primary mb-2">Bank Transfer</h3>
                  <p className="text-theme-secondary text-sm">5-7 business days</p>
                </div>
                <div className="bg-theme-card/50 rounded-lg p-4">
                  <h3 className="font-semibold text-theme-primary mb-2">Digital Wallets</h3>
                  <p className="text-theme-secondary text-sm">1-3 business days</p>
                </div>
              </div>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-bold text-theme-primary mb-4">8. Chargebacks & Disputes</h2>
              <p className="text-theme-secondary leading-relaxed mb-4">
                We encourage resolving issues through our refund process before initiating chargebacks:
              </p>
              <ul className="list-disc list-inside text-theme-secondary space-y-2 ml-4">
                <li>Chargebacks may result in account suspension pending resolution</li>
                <li>We will provide complete transaction documentation to financial institutions</li>
                <li>Successful chargebacks may prevent future platform access</li>
                <li>Direct communication often resolves issues faster than formal disputes</li>
              </ul>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl font-bold text-theme-primary mb-4">9. Policy Updates</h2>
              <p className="text-theme-secondary leading-relaxed">
                This refund policy may be updated to reflect changes in our services or legal requirements.
                Significant changes will be communicated via email or platform notifications. Updates apply
                to purchases made after the effective date.
              </p>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-2xl font-bold text-theme-primary mb-4">10. Contact Support</h2>
              <p className="text-theme-secondary leading-relaxed mb-4">
                For refund requests or questions about this policy:
              </p>
              <ul className="list-disc list-inside text-theme-secondary space-y-2 ml-4">
                <li>Use the support ticket system in your account dashboard</li>
                <li>Provide order number, service details, and specific concerns</li>
                <li>Include any supporting documentation (screenshots, chat logs)</li>
                <li>Be as detailed as possible to expedite the review process</li>
              </ul>
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

export default Refund;