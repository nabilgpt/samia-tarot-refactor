import React from 'react';
import { motion } from 'framer-motion';
import PaymentsTab from '../PaymentsTab';

const PaymentsAndWallets = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 100, damping: 15 }}
    >
      <PaymentsTab />
    </motion.div>
  );
};

export default PaymentsAndWallets; 