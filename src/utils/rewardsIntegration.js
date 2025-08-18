import api from '../services/frontendApi.js';

/**
 * Rewards Integration Utilities
 * Handles automatic point awarding for various user actions
 */

class RewardsIntegration {
  /**
   * Award points after successful booking payment
   * @param {string} bookingId - The booking ID
   * @param {number} amount - Payment amount in dollars
   * @param {string} userId - User ID (optional, will use current user if not provided)
   */
  static async awardBookingPoints(bookingId, amount, userId = null) {
    try {
      console.log(`Awarding booking points: ${amount} USD for booking ${bookingId}`);
      
      const result = await api.awardBookingPoints(bookingId, amount);
      
      if (result.success) {
        console.log(`Successfully awarded ${result.data.points} points for booking ${bookingId}`);
        
        // Show notification to user if possible
        if (window.showSuccess) {
          window.showSuccess(`You earned ${result.data.points} points from your booking!`);
        }
        
        return result;
      } else {
        console.error('Failed to award booking points:', result.error);
        return result;
      }
    } catch (error) {
      console.error('Error in awardBookingPoints:', error);
      return {
        success: false,
        error: error.message || 'Failed to award booking points'
      };
    }
  }

  /**
   * Award welcome bonus to new users
   * @param {string} userId - User ID (optional, will use current user if not provided)
   */
  static async awardWelcomeBonus(userId = null) {
    try {
      console.log('Awarding welcome bonus to new user');
      
      const result = await api.awardWelcomeBonus();
      
      if (result.success) {
        console.log(`Successfully awarded welcome bonus`);
        
        // Show notification to user if possible
        if (window.showSuccess) {
          window.showSuccess(`Welcome! You've received a bonus of points for joining SAMIA TAROT!`);
        }
        
        return result;
      } else {
        console.error('Failed to award welcome bonus:', result.error);
        return result;
      }
    } catch (error) {
      console.error('Error in awardWelcomeBonus:', error);
      return {
        success: false,
        error: error.message || 'Failed to award welcome bonus'
      };
    }
  }

  /**
   * Process referral code during signup
   * @param {string} referralCode - The referral code to use
   */
  static async processReferralCode(referralCode) {
    try {
      if (!referralCode || !referralCode.trim()) {
        return { success: true, message: 'No referral code provided' };
      }

      console.log(`Processing referral code: ${referralCode}`);
      
      // FIX: ESLint error - useReferralCode is not a React Hook, it's a static API method
      // eslint-disable-next-line react-hooks/rules-of-hooks
      const result = await api.useReferralCode(referralCode.trim());
      
      if (result.success) {
        console.log(`Successfully processed referral code: ${referralCode}`);
        
        // Show notification to user if possible
        if (window.showSuccess) {
          window.showSuccess(result.message);
        }
        
        return result;
      } else {
        console.error('Failed to process referral code:', result.error);
        
        // Show error notification if possible
        if (window.showError) {
          window.showError(result.error);
        }
        
        return result;
      }
    } catch (error) {
      console.error('Error in processReferralCode:', error);
      return {
        success: false,
        error: error.message || 'Failed to process referral code'
      };
    }
  }

  /**
   * Award points for completing profile setup
   * @param {string} userId - User ID (optional, will use current user if not provided)
   */
  static async awardProfileCompletionBonus(userId = null) {
    try {
      console.log('Awarding profile completion bonus');
      
      const result = await api.earnPoints(
        25, // 25 points for profile completion
        'profile_completion',
        'Bonus for completing your profile',
        'earn',
        { action: 'profile_completion' }
      );
      
      if (result.success) {
        console.log('Successfully awarded profile completion bonus');
        
        // Show notification to user if possible
        if (window.showSuccess) {
          window.showSuccess('You earned 25 points for completing your profile!');
        }
        
        return result;
      } else {
        console.error('Failed to award profile completion bonus:', result.error);
        return result;
      }
    } catch (error) {
      console.error('Error in awardProfileCompletionBonus:', error);
      return {
        success: false,
        error: error.message || 'Failed to award profile completion bonus'
      };
    }
  }

  /**
   * Award points for first booking
   * @param {string} bookingId - The booking ID
   */
  static async awardFirstBookingBonus(bookingId) {
    try {
      console.log(`Awarding first booking bonus for booking ${bookingId}`);
      
      const result = await api.earnPoints(
        50, // 50 points for first booking
        bookingId,
        'Bonus for your first tarot reading booking',
        'booking_bonus',
        { booking_id: bookingId, first_booking: true }
      );
      
      if (result.success) {
        console.log('Successfully awarded first booking bonus');
        
        // Show notification to user if possible
        if (window.showSuccess) {
          window.showSuccess('Congratulations! You earned 50 bonus points for your first booking!');
        }
        
        return result;
      } else {
        console.error('Failed to award first booking bonus:', result.error);
        return result;
      }
    } catch (error) {
      console.error('Error in awardFirstBookingBonus:', error);
      return {
        success: false,
        error: error.message || 'Failed to award first booking bonus'
      };
    }
  }

  /**
   * Award points for leaving a review
   * @param {string} bookingId - The booking ID
   * @param {number} rating - The rating given (1-5)
   */
  static async awardReviewBonus(bookingId, rating) {
    try {
      console.log(`Awarding review bonus for booking ${bookingId}, rating: ${rating}`);
      
      // Award more points for higher ratings
      const basePoints = 15;
      const bonusPoints = rating >= 4 ? 10 : 0;
      const totalPoints = basePoints + bonusPoints;
      
      const result = await api.earnPoints(
        totalPoints,
        bookingId,
        `Thank you for your ${rating}-star review!`,
        'earn',
        { booking_id: bookingId, rating, review_bonus: true }
      );
      
      if (result.success) {
        console.log(`Successfully awarded ${totalPoints} points for review`);
        
        // Show notification to user if possible
        if (window.showSuccess) {
          window.showSuccess(`You earned ${totalPoints} points for leaving a review!`);
        }
        
        return result;
      } else {
        console.error('Failed to award review bonus:', result.error);
        return result;
      }
    } catch (error) {
      console.error('Error in awardReviewBonus:', error);
      return {
        success: false,
        error: error.message || 'Failed to award review bonus'
      };
    }
  }

  /**
   * Check if user is eligible for specific bonuses
   * @param {string} bonusType - Type of bonus to check
   */
  static async checkBonusEligibility(bonusType) {
    try {
      // This would typically check the user's transaction history
      // to see if they've already received certain bonuses
      const transactionHistory = await api.getTransactionHistory(1, 100);
      
      if (!transactionHistory.success) {
        return { eligible: false, reason: 'Could not check eligibility' };
      }

      const transactions = transactionHistory.data.transactions || [];
      
      switch (bonusType) {
        case 'welcome': {
          const hasWelcomeBonus = transactions.some(t => t.type === 'welcome_bonus');
          return { 
            eligible: !hasWelcomeBonus, 
            reason: hasWelcomeBonus ? 'Welcome bonus already received' : 'Eligible for welcome bonus' 
          };
        }
          
        case 'first_booking': {
          const hasFirstBookingBonus = transactions.some(t => 
            t.type === 'booking_bonus' && t.metadata?.first_booking === true
          );
          return { 
            eligible: !hasFirstBookingBonus, 
            reason: hasFirstBookingBonus ? 'First booking bonus already received' : 'Eligible for first booking bonus' 
          };
        }
          
        case 'profile_completion': {
          const hasProfileBonus = transactions.some(t => 
            t.source === 'profile_completion'
          );
          return { 
            eligible: !hasProfileBonus, 
            reason: hasProfileBonus ? 'Profile completion bonus already received' : 'Eligible for profile completion bonus' 
          };
        }
          
        default:
          return { eligible: true, reason: 'Unknown bonus type, assuming eligible' };
      }
    } catch (error) {
      console.error('Error checking bonus eligibility:', error);
      return { eligible: false, reason: 'Error checking eligibility' };
    }
  }

  /**
   * Get user's current points balance
   */
  static async getCurrentBalance() {
    try {
      const result = await api.getUserPoints();
      
      if (result.success) {
        return {
          success: true,
          balance: result.data.balance || 0,
          lifetime_earned: result.data.lifetime_earned || 0,
          lifetime_redeemed: result.data.lifetime_redeemed || 0
        };
      } else {
        console.error('Failed to get current balance:', result.error);
        return {
          success: false,
          error: result.error,
          balance: 0
        };
      }
    } catch (error) {
      console.error('Error getting current balance:', error);
      return {
        success: false,
        error: error.message || 'Failed to get current balance',
        balance: 0
      };
    }
  }

  /**
   * Initialize rewards system for new user
   * @param {string} referralCode - Optional referral code
   */
  static async initializeNewUser(referralCode = null) {
    try {
      console.log('Initializing rewards system for new user');
      
      const results = [];
      
      // Award welcome bonus
      const welcomeResult = await this.awardWelcomeBonus();
      results.push({ type: 'welcome', result: welcomeResult });
      
      // Process referral code if provided
      if (referralCode) {
        const referralResult = await this.processReferralCode(referralCode);
        results.push({ type: 'referral', result: referralResult });
      }
      
      return {
        success: true,
        results,
        message: 'Rewards system initialized successfully'
      };
    } catch (error) {
      console.error('Error initializing rewards for new user:', error);
      return {
        success: false,
        error: error.message || 'Failed to initialize rewards system'
      };
    }
  }
}

export default RewardsIntegration; 
