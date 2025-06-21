import { useState, useEffect } from 'react';
import { serviceFeedbackAPI } from '../api/serviceFeedbackApi';

/**
 * Hook to manage feedback prompts after service completion
 * Automatically checks if feedback is required and shows the modal
 */
export const useFeedbackPrompt = () => {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackBooking, setFeedbackBooking] = useState(null);
  const [feedbackServiceType, setFeedbackServiceType] = useState(null);

  /**
   * Check if feedback is required for a completed booking
   * @param {Object} booking - Completed booking object
   * @param {string} serviceType - Type of service completed
   */
  const checkFeedbackRequired = async (booking, serviceType) => {
    if (!booking || !serviceType) return;

    try {
      const response = await serviceFeedbackAPI.checkFeedbackRequired(booking.id);
      
      if (response.success && response.data?.feedback_required) {
        setFeedbackBooking(booking);
        setFeedbackServiceType(serviceType);
        setShowFeedbackModal(true);
      }
    } catch (error) {
      console.error('Error checking feedback requirement:', error);
    }
  };

  /**
   * Manually trigger feedback modal for a booking
   * @param {Object} booking - Booking object
   * @param {string} serviceType - Type of service
   */
  const promptFeedback = (booking, serviceType) => {
    setFeedbackBooking(booking);
    setFeedbackServiceType(serviceType);
    setShowFeedbackModal(true);
  };

  /**
   * Close feedback modal
   */
  const closeFeedbackModal = () => {
    setShowFeedbackModal(false);
    setFeedbackBooking(null);
    setFeedbackServiceType(null);
  };

  /**
   * Handle successful feedback submission
   * @param {Object} submittedFeedback - The submitted feedback data
   */
  const handleFeedbackSubmitted = (submittedFeedback) => {
    // Modal will auto-close, just clean up state
    setFeedbackBooking(null);
    setFeedbackServiceType(null);
  };

  return {
    showFeedbackModal,
    feedbackBooking,
    feedbackServiceType,
    checkFeedbackRequired,
    promptFeedback,
    closeFeedbackModal,
    handleFeedbackSubmitted
  };
};

export default useFeedbackPrompt;