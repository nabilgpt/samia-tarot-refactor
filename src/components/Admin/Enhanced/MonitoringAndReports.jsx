import React from 'react';
import { motion } from 'framer-motion';
import MonitoringTab from '../MonitoringTab';
import { useUI } from '../../../context/UIContext';

const MonitoringAndReports = () => {
  const { language } = useUI();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 15 }}
      className="space-y-6"
    >
      {/* Title and Description */}
      <div className="mb-8">
        <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-red-400 bg-clip-text text-transparent">
          {language === 'ar' ? 'المراقبة' : 'Monitoring'}
        </h2>
        <p className="text-gray-400 mt-1">
          {language === 'ar' ? 'مراقبة الجلسات المباشرة وتتبع أنشطة المنصة' : 'Monitor live sessions and track platform activities'}
        </p>
      </div>

      <MonitoringTab />
    </motion.div>
  );
};

export default MonitoringAndReports; 