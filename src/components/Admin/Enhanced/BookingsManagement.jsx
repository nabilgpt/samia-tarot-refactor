import React from 'react';
import { motion } from 'framer-motion';
import BookingsTab from '../BookingsTab';
import { useUI } from '../../../context/UIContext';

const BookingsManagement = () => {
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
          {language === 'ar' ? 'إدارة الحجوزات' : 'Bookings Management'}
        </h2>
        <p className="text-gray-400 mt-1">
          {language === 'ar' ? 'عرض وإدارة جميع الحجوزات والمواعيد في النظام' : 'View and manage all bookings and appointments in the system'}
        </p>
      </div>

      <BookingsTab />
    </motion.div>
  );
};

export default BookingsManagement; 