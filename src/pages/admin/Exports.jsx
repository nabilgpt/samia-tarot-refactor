import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Download, FileText, Calendar, CheckCircle, AlertCircle } from 'lucide-react';

const Exports = () => {
  const [selectedType, setSelectedType] = useState('orders');
  const [dateRange, setDateRange] = useState('last_30_days');
  const [exporting, setExporting] = useState(false);
  const [success, setSuccess] = useState(null);
  const [error, setError] = useState(null);
  const shouldReduceMotion = useReducedMotion();

  const exportTypes = [
    { id: 'orders', label: 'Orders', description: 'Export all order data' },
    { id: 'users', label: 'Users', description: 'Export user profiles' },
    { id: 'payments', label: 'Payments', description: 'Export payment transactions' },
    { id: 'audit', label: 'Audit Log', description: 'Export audit trail' }
  ];

  const dateRanges = [
    { id: 'today', label: 'Today' },
    { id: 'last_7_days', label: 'Last 7 Days' },
    { id: 'last_30_days', label: 'Last 30 Days' },
    { id: 'last_90_days', label: 'Last 90 Days' },
    { id: 'custom', label: 'Custom Range' }
  ];

  const handleExport = async () => {
    setExporting(true);
    setError(null);
    setSuccess(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      setSuccess(`Successfully exported ${selectedType} data for ${dateRange.replace('_', ' ')}`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const itemVariants = {
    hidden: shouldReduceMotion ? { opacity: 0 } : { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: shouldReduceMotion ? { duration: 0.2 } : {
        type: "spring",
        stiffness: 100,
        damping: 12
      }
    }
  };

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="container mx-auto max-w-4xl">

        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="text-center mb-12"
        >
          <h1 className="fluid-heading-xl font-bold gradient-text mb-4">
            Data Exports
          </h1>
          <div className="w-32 h-1 bg-cosmic-gradient mx-auto mb-6 rounded-full shadow-theme-cosmic" />
          <p className="text-theme-secondary text-lg">
            Export platform data for reporting and compliance
          </p>
        </motion.div>

        {success && (
          <motion.div
            variants={itemVariants}
            className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 mb-8"
          >
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-400 mr-3" />
              <p className="text-green-400">{success}</p>
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div
            variants={itemVariants}
            className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-8"
          >
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
              <p className="text-red-400">{error}</p>
            </div>
          </motion.div>
        )}

        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="bg-theme-card backdrop-blur-lg border border-theme-cosmic rounded-2xl p-8"
        >

          <div className="mb-8">
            <h3 className="text-xl font-bold text-theme-primary mb-4 flex items-center">
              <FileText className="w-5 h-5 text-gold-primary mr-2" />
              Export Type
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {exportTypes.map((type) => (
                <label
                  key={type.id}
                  className="cursor-pointer"
                >
                  <input
                    type="radio"
                    name="exportType"
                    value={type.id}
                    checked={selectedType === type.id}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="sr-only"
                  />
                  <div className={`p-4 border-2 rounded-lg transition-all duration-300 ${
                    selectedType === type.id
                      ? 'border-gold-primary bg-gold-primary/10'
                      : 'border-theme-cosmic hover:border-theme-cosmic/60'
                  }`}>
                    <div className="font-medium text-theme-primary mb-1">{type.label}</div>
                    <div className="text-theme-secondary text-sm">{type.description}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h3 className="text-xl font-bold text-theme-primary mb-4 flex items-center">
              <Calendar className="w-5 h-5 text-gold-primary mr-2" />
              Date Range
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {dateRanges.map((range) => (
                <label
                  key={range.id}
                  className="cursor-pointer"
                >
                  <input
                    type="radio"
                    name="dateRange"
                    value={range.id}
                    checked={dateRange === range.id}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="sr-only"
                  />
                  <div className={`p-3 border rounded-lg text-center transition-all duration-300 ${
                    dateRange === range.id
                      ? 'border-gold-primary bg-gold-primary/10 text-gold-primary'
                      : 'border-theme-cosmic text-theme-secondary hover:border-theme-cosmic/60'
                  }`}>
                    <span className="text-sm font-medium">{range.label}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {dateRange === 'custom' && (
            <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-theme-secondary text-sm mb-2">Start Date</label>
                <input
                  type="date"
                  className="w-full bg-theme-card border border-theme-cosmic rounded-lg p-3 text-theme-primary focus:border-gold-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary transition-colors duration-300"
                />
              </div>
              <div>
                <label className="block text-theme-secondary text-sm mb-2">End Date</label>
                <input
                  type="date"
                  className="w-full bg-theme-card border border-theme-cosmic rounded-lg p-3 text-theme-primary focus:border-gold-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-primary transition-colors duration-300"
                />
              </div>
            </div>
          )}

          <div className="pt-6 border-t border-theme-cosmic">
            <button
              onClick={handleExport}
              disabled={exporting}
              className="btn-base btn-primary w-full inline-flex items-center justify-center"
            >
              {exporting ? (
                <>
                  <div className="w-5 h-5 border-2 border-theme-inverse border-t-transparent rounded-full animate-spin mr-2"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" />
                  Export Data
                </>
              )}
            </button>
            <p className="text-theme-muted text-xs text-center mt-4">
              Exports are generated in CSV format and comply with data retention policies
            </p>
          </div>

        </motion.div>

      </div>
    </div>
  );
};

export default Exports;