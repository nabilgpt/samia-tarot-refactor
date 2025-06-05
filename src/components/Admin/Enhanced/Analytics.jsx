import React from 'react';
import { motion } from 'framer-motion';
import AdminAnalyticsDashboard from '../../Analytics/AdminAnalyticsDashboard';

const Analytics = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 15 }}
    >
      <AdminAnalyticsDashboard />
    </motion.div>
  );
};

export default Analytics; 