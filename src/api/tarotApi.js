// =====================================================
// SAMIA TAROT - TAROT API SERVICE
// HANDLES MANUAL CARD OPENING, AI CONTENT, AND SESSION MANAGEMENT
// =====================================================

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

class TarotAPIService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Get authentication headers
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : '',
    };
  }

  // Handle API responses
  async handleResponse(response) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  // Make API request
  async makeRequest(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getAuthHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      return await this.handleResponse(response);
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      return {
        success: false,
        error: error.message || 'Network error occurred'
      };
    }
  }

  // =====================================================
  // READING SESSION MANAGEMENT
  // =====================================================

  /**
   * Start a new tarot reading session
   * @param {Object} sessionData - Session configuration
   * @returns {Promise<Object>} Session creation result
   */
  async startReadingSession(sessionData) {
    return this.makeRequest('/tarot/sessions/start', {
      method: 'POST',
      body: JSON.stringify({
        question: sessionData.question,
        question_category: sessionData.category,
        spread_type: sessionData.spreadType,
        spread_positions: sessionData.spreadPositions,
        client_id: sessionData.clientId,
        reader_id: sessionData.readerId,
        language: sessionData.language || 'en'
      })
    });
  }

  /**
   * Get reading session details
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Session data
   */
  async getReadingSession(sessionId) {
    return this.makeRequest(`/tarot/sessions/${sessionId}`);
  }

  /**
   * Update reading session
   * @param {string} sessionId - Session ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Update result
   */
  async updateReadingSession(sessionId, updateData) {
    return this.makeRequest(`/tarot/sessions/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData)
    });
  }

  // =====================================================
  // MANUAL CARD OPENING
  // =====================================================

  /**
   * Open a specific card in sequence
   * @param {string} sessionId - Reading session ID
   * @param {Object} cardData - Card opening data
   * @returns {Promise<Object>} Opened card data
   */
  async openCard(sessionId, cardData) {
    return this.makeRequest(`/tarot/sessions/${sessionId}/open-card`, {
      method: 'POST',
      body: JSON.stringify({
        card_index: cardData.cardIndex,
        position: cardData.position,
        timestamp: cardData.timestamp,
        force_sequential: true // Enforce sequential opening
      })
    });
  }

  /**
   * Get available cards for opening
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Available cards
   */
  async getAvailableCards(sessionId) {
    return this.makeRequest(`/tarot/sessions/${sessionId}/available-cards`);
  }

  /**
   * Validate card opening sequence
   * @param {string} sessionId - Session ID
   * @param {number} cardIndex - Card index to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateCardSequence(sessionId, cardIndex) {
    return this.makeRequest(`/tarot/sessions/${sessionId}/validate-sequence`, {
      method: 'POST',
      body: JSON.stringify({ card_index: cardIndex })
    });
  }

  // =====================================================
  // AI CONTENT GENERATION (READER ONLY)
  // =====================================================

  /**
   * Generate AI interpretation for a specific card
   * @param {string} sessionId - Session ID
   * @param {Object} cardData - Card and context data
   * @returns {Promise<Object>} AI interpretation
   */
  async generateCardInterpretation(sessionId, cardData) {
    return this.makeRequest(`/tarot/ai-drafts/card-interpretation`, {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        card: cardData.card,
        position: cardData.position,
        question: cardData.question,
        context: cardData.context,
        reader_only: true // Explicitly mark as reader content
      })
    });
  }

  /**
   * Generate comprehensive reading analysis
   * @param {string} sessionId - Session ID
   * @param {Object} readingData - Complete reading data
   * @returns {Promise<Object>} Comprehensive AI analysis
   */
  async generateFullReading(sessionId, readingData) {
    return this.makeRequest(`/tarot/ai-drafts/full-reading`, {
      method: 'POST',
      body: JSON.stringify({
        session_id: sessionId,
        cards: readingData.cards,
        spread: readingData.spread,
        question: readingData.question,
        category: readingData.category,
        comprehensive: true,
        reader_only: true
      })
    });
  }

  /**
   * Get AI drafts for session (reader only)
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} AI drafts
   */
  async getAIDrafts(sessionId) {
    return this.makeRequest(`/tarot/ai-drafts/${sessionId}`);
  }

  // =====================================================
  // AUDIT AND MONITORING
  // =====================================================

  /**
   * Log reading audit event
   * @param {Object} auditData - Audit event data
   * @returns {Promise<Object>} Audit log result
   */
  async logReadingAudit(auditData) {
    return this.makeRequest('/audit/ai-reading', {
      method: 'POST',
      body: JSON.stringify(auditData)
    });
  }

  /**
   * Get session audit trail
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Audit trail
   */
  async getSessionAuditTrail(sessionId) {
    return this.makeRequest(`/audit/session/${sessionId}`);
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Check API health and connectivity
   * @returns {Promise<Object>} Health check result
   */
  async healthCheck() {
    return this.makeRequest('/health');
  }

  /**
   * Get current user permissions
   * @returns {Promise<Object>} User permissions
   */
  async getUserPermissions() {
    return this.makeRequest('/auth/permissions');
  }

  /**
   * Validate session access
   * @param {string} sessionId - Session ID
   * @returns {Promise<Object>} Access validation
   */
  async validateSessionAccess(sessionId) {
    return this.makeRequest(`/tarot/sessions/${sessionId}/validate-access`);
  }
}

// Create and export singleton instance
export const TarotAPI = new TarotAPIService();

// Export class for testing
export { TarotAPIService };

// Default export
export default TarotAPI; 