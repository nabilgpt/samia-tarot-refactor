/**
 * Calls Repository - SAMIA TAROT
 * 
 * Repository for call system with consent logging and emergency extensions.
 * Legal compliance: IP address and timestamp logging mandatory.
 */

import { DatabaseClient, QueryResult } from '../db/pg';
import { TABLES } from '../db/tables';

/**
 * Call consent log interface
 */
export interface CallConsentLog {
  id: string;
  session_id: string;
  user_id: string;
  consent_type: 'recording' | 'participation' | 'emergency_extension';
  consent_given: boolean;
  ip_address: string; // Required for legal compliance
  user_agent?: string;
  timestamp: string;
}

/**
 * Emergency extension interface
 */
export interface CallEmergencyExtension {
  id: string;
  session_id: string;
  client_id: string;
  extension_type: '5min' | '10min' | '15min' | '30min';
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  amount_charged?: number;
  payment_method?: string;
  approved_by?: string;
  requested_at: string;
  approved_at?: string;
  expires_at?: string;
}

/**
 * Calls repository with legal compliance
 */
export class CallsRepository {
  constructor(private db: DatabaseClient) {}

  /**
   * Log user consent (legal requirement)
   */
  async logConsent(consentData: {
    sessionId: string;
    userId: string;
    consentType: CallConsentLog['consent_type'];
    consentGiven: boolean;
    ipAddress: string; // REQUIRED
    userAgent?: string;
  }): Promise<QueryResult<CallConsentLog>> {
    if (!consentData.ipAddress) {
      return {
        data: null,
        error: new Error('IP address is required for legal compliance'),
      };
    }

    const consent = {
      session_id: consentData.sessionId,
      user_id: consentData.userId,
      consent_type: consentData.consentType,
      consent_given: consentData.consentGiven,
      ip_address: consentData.ipAddress,
      user_agent: consentData.userAgent,
      timestamp: new Date().toISOString(),
    };

    return this.db.insert<CallConsentLog>(TABLES.CALL_CONSENT_LOGS, consent);
  }

  /**
   * Get consent history for session
   */
  async getConsentHistory(sessionId: string): Promise<QueryResult<CallConsentLog[]>> {
    return this.db.select<CallConsentLog>(TABLES.CALL_CONSENT_LOGS, {
      conditions: { session_id: sessionId },
      orderBy: { column: 'timestamp', ascending: false },
    });
  }

  /**
   * Verify all required consents given
   */
  async verifyRequiredConsents(
    sessionId: string,
    requiredTypes: CallConsentLog['consent_type'][]
  ): Promise<QueryResult<{
    all_consents_given: boolean;
    missing_consents: string[];
    consent_summary: Record<string, boolean>;
  }[]>> {
    const historyResult = await this.getConsentHistory(sessionId);
    
    if (historyResult.error) {
      return { data: null, error: historyResult.error };
    }

    const consents = historyResult.data || [];
    const consentSummary: Record<string, boolean> = {};
    const missingConsents: string[] = [];

    requiredTypes.forEach(type => {
      const consent = consents.find(c => 
        c.consent_type === type && c.consent_given === true
      );
      consentSummary[type] = !!consent;
      
      if (!consent) {
        missingConsents.push(type);
      }
    });

    const verification = {
      all_consents_given: missingConsents.length === 0,
      missing_consents: missingConsents,
      consent_summary: consentSummary,
    };

    return { data: [verification], error: null };
  }

  /**
   * Request emergency extension
   */
  async requestEmergencyExtension(extensionData: {
    sessionId: string;
    clientId: string;
    extensionType: CallEmergencyExtension['extension_type'];
    amountCharged?: number;
    paymentMethod?: string;
  }): Promise<QueryResult<CallEmergencyExtension>> {
    // Calculate expiration time (15 minutes to respond)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    const extension = {
      session_id: extensionData.sessionId,
      client_id: extensionData.clientId,
      extension_type: extensionData.extensionType,
      status: 'pending' as const,
      amount_charged: extensionData.amountCharged,
      payment_method: extensionData.paymentMethod,
      requested_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
    };

    return this.db.insert<CallEmergencyExtension>(TABLES.CALL_EMERGENCY_EXTENSIONS, extension);
  }

  /**
   * Approve emergency extension
   */
  async approveEmergencyExtension(
    extensionId: string,
    approvedBy: string
  ): Promise<QueryResult<CallEmergencyExtension[]>> {
    return this.db.update<CallEmergencyExtension>(
      TABLES.CALL_EMERGENCY_EXTENSIONS,
      {
        status: 'approved',
        approved_by: approvedBy,
        approved_at: new Date().toISOString(),
      },
      { id: extensionId }
    );
  }

  /**
   * Reject emergency extension
   */
  async rejectEmergencyExtension(
    extensionId: string,
    rejectedBy: string
  ): Promise<QueryResult<CallEmergencyExtension[]>> {
    return this.db.update<CallEmergencyExtension>(
      TABLES.CALL_EMERGENCY_EXTENSIONS,
      {
        status: 'rejected',
        approved_by: rejectedBy, // Track who rejected
        approved_at: new Date().toISOString(),
      },
      { id: extensionId }
    );
  }

  /**
   * Get extension by ID
   */
  async getEmergencyExtension(extensionId: string): Promise<QueryResult<CallEmergencyExtension[]>> {
    return this.db.select<CallEmergencyExtension>(TABLES.CALL_EMERGENCY_EXTENSIONS, {
      conditions: { id: extensionId },
    });
  }

  /**
   * Get extensions for session
   */
  async getSessionExtensions(sessionId: string): Promise<QueryResult<CallEmergencyExtension[]>> {
    return this.db.select<CallEmergencyExtension>(TABLES.CALL_EMERGENCY_EXTENSIONS, {
      conditions: { session_id: sessionId },
      orderBy: { column: 'requested_at', ascending: false },
    });
  }

  /**
   * Get pending extensions (for admin approval)
   */
  async getPendingExtensions(): Promise<QueryResult<CallEmergencyExtension[]>> {
    return this.db.select<CallEmergencyExtension>(TABLES.CALL_EMERGENCY_EXTENSIONS, {
      conditions: { status: 'pending' },
      orderBy: { column: 'requested_at', ascending: true },
    });
  }

  /**
   * Expire old pending extensions
   */
  async expireOldExtensions(): Promise<QueryResult<CallEmergencyExtension[]>> {
    const now = new Date().toISOString();
    
    return this.db.query<CallEmergencyExtension[]>(TABLES.CALL_EMERGENCY_EXTENSIONS, async (table) => {
      return await table
        .update({ status: 'expired' })
        .eq('status', 'pending')
        .lt('expires_at', now)
        .select();
    });
  }

  /**
   * Calculate extension pricing (progressive)
   */
  async calculateExtensionPrice(
    sessionId: string,
    extensionType: CallEmergencyExtension['extension_type']
  ): Promise<QueryResult<{
    base_price: number;
    extension_count: number;
    progressive_multiplier: number;
    final_price: number;
  }[]>> {
    const extensionsResult = await this.getSessionExtensions(sessionId);
    
    if (extensionsResult.error) {
      return { data: null, error: extensionsResult.error };
    }

    const approvedExtensions = extensionsResult.data?.filter(e => e.status === 'approved') || [];
    const extensionCount = approvedExtensions.length;

    // Base pricing
    const basePrices = {
      '5min': 5.00,
      '10min': 10.00,
      '15min': 15.00,
      '30min': 25.00,
    };

    const basePrice = basePrices[extensionType];
    
    // Progressive pricing multiplier
    let multiplier = 1;
    if (extensionCount >= 3) multiplier = 2.0;      // 4th+ extension: 2x
    else if (extensionCount >= 1) multiplier = 1.5; // 2nd-3rd extension: 1.5x

    const finalPrice = Math.round(basePrice * multiplier * 100) / 100; // Round to cents

    const pricing = {
      base_price: basePrice,
      extension_count: extensionCount,
      progressive_multiplier: multiplier,
      final_price: finalPrice,
    };

    return { data: [pricing], error: null };
  }

  /**
   * Get call session statistics
   */
  async getCallSessionStats(sessionId: string): Promise<QueryResult<{
    total_consents: number;
    recording_consent: boolean;
    participation_consent: boolean;
    total_extensions: number;
    approved_extensions: number;
    total_extension_time: number; // in minutes
    total_charges: number;
  }[]>> {
    const [consentsResult, extensionsResult] = await Promise.all([
      this.getConsentHistory(sessionId),
      this.getSessionExtensions(sessionId),
    ]);

    if (consentsResult.error || extensionsResult.error) {
      return { 
        data: null, 
        error: consentsResult.error || extensionsResult.error 
      };
    }

    const consents = consentsResult.data || [];
    const extensions = extensionsResult.data || [];
    const approvedExtensions = extensions.filter(e => e.status === 'approved');

    // Calculate total extension time
    const timeMap = { '5min': 5, '10min': 10, '15min': 15, '30min': 30 };
    const totalExtensionTime = approvedExtensions.reduce((total, ext) => 
      total + (timeMap[ext.extension_type] || 0), 0
    );

    // Calculate total charges
    const totalCharges = approvedExtensions.reduce((total, ext) => 
      total + (ext.amount_charged || 0), 0
    );

    const stats = {
      total_consents: consents.length,
      recording_consent: consents.some(c => 
        c.consent_type === 'recording' && c.consent_given
      ),
      participation_consent: consents.some(c => 
        c.consent_type === 'participation' && c.consent_given
      ),
      total_extensions: extensions.length,
      approved_extensions: approvedExtensions.length,
      total_extension_time: totalExtensionTime,
      total_charges: totalCharges,
    };

    return { data: [stats], error: null };
  }

  /**
   * Legal compliance audit
   */
  async auditConsentCompliance(options: {
    startDate?: string;
    endDate?: string;
    sessionId?: string;
  } = {}): Promise<QueryResult<CallConsentLog[]>> {
    return this.db.query<CallConsentLog[]>(TABLES.CALL_CONSENT_LOGS, async (table) => {
      let query = table.select('*').order('timestamp', { ascending: false });

      if (options.startDate) {
        query = query.gte('timestamp', options.startDate);
      }
      if (options.endDate) {
        query = query.lte('timestamp', options.endDate);
      }
      if (options.sessionId) {
        query = query.eq('session_id', options.sessionId);
      }

      return await query;
    });
  }

  /**
   * Validate IP address format
   */
  private validateIPAddress(ip: string): boolean {
    // Basic IPv4/IPv6 validation
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    const ipv6Regex = /^[0-9a-fA-F:]+$/;
    
    return ipv4Regex.test(ip) || ipv6Regex.test(ip);
  }

  /**
   * Bulk consent logging (for session initialization)
   */
  async logMultipleConsents(
    sessionId: string,
    userId: string,
    consents: Array<{
      type: CallConsentLog['consent_type'];
      given: boolean;
    }>,
    ipAddress: string,
    userAgent?: string
  ): Promise<QueryResult<CallConsentLog[]>> {
    if (!this.validateIPAddress(ipAddress)) {
      return {
        data: null,
        error: new Error('Invalid IP address format'),
      };
    }

    const consentRecords = consents.map(consent => ({
      session_id: sessionId,
      user_id: userId,
      consent_type: consent.type,
      consent_given: consent.given,
      ip_address: ipAddress,
      user_agent: userAgent,
      timestamp: new Date().toISOString(),
    }));

    return this.db.insertMany<CallConsentLog>(TABLES.CALL_CONSENT_LOGS, consentRecords);
  }
}