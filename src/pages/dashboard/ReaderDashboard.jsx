import React from 'react';
import { motion } from 'framer-motion';

const ReaderDashboard = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold text-white mb-4">
            Reader Dashboard
          </h1>
          <p className="text-gray-300 text-lg">
            Manage your readings, schedule, and client interactions.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default ReaderDashboard;