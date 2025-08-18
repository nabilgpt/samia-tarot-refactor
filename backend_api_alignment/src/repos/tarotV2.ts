/**
 * Tarot V2 Repository - SAMIA TAROT
 * 
 * Repository for Tarot V2 progressive reveal system with AI content isolation.
 * Critical security: AI content NEVER exposed to clients.
 */

import { DatabaseClient, QueryResult } from '../db/pg';
import { TABLES } from '../db/tables';

/**
 * Tarot V2 Reading interface
 */
export interface TarotV2Reading {
  id: string;
  client_id: string;
  reader_id: string;
  spread_id?: string;
  status: 'active' | 'completed' | 'cancelled';
  ai_draft_visible_to_client: boolean; // CRITICAL: Always false
  ai_interpretation?: string;
  confidence_score?: number;
  generated_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Card selection interface
 */
export interface TarotV2CardSelection {
  id: string;
  reading_id: string;
  card_id: string;
  position: number;
  is_revealed: boolean;
  revealed_at?: string;
  created_at: string;
}

/**
 * Audit log interface
 */
export interface TarotV2AuditLog {
  id: string;
  reading_id: string;
  action: string;
  user_id: string;
  ai_content_accessed: boolean;
  details?: Record<string, any>;
  timestamp: string;
}

/**
 * Tarot V2 repository with security enforcement
 */
export class TarotV2Repository {
  constructor(private db: DatabaseClient) {}

  /**
   * Create new Tarot V2 reading session
   */
  async createReading(readingData: {
    clientId: string;
    readerId: string;
    spreadId?: string;
  }): Promise<QueryResult<TarotV2Reading>> {
    const reading = {
      client_id: readingData.clientId,
      reader_id: readingData.readerId,
      spread_id: readingData.spreadId,
      status: 'active' as const,
      ai_draft_visible_to_client: false, // CRITICAL: Always false
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    return this.db.insert<TarotV2Reading>(TABLES.TAROT_V2_READINGS, reading);
  }

  /**
   * Get reading by ID (client-safe version - NO AI content)
   */
  async getReadingForClient(readingId: string): Promise<QueryResult<Partial<TarotV2Reading>[]>> {
    return this.db.select<Partial<TarotV2Reading>>(TABLES.TAROT_V2_READINGS, {
      select: 'id, client_id, reader_id, spread_id, status, created_at, updated_at',
      conditions: { id: readingId },
    });
  }

  /**
   * Get reading with AI content (reader/admin only)
   */
  async getReadingWithAI(
    readingId: string, 
    accessorUserId: string,
    accessorRole: string
  ): Promise<QueryResult<TarotV2Reading[]>> {
    // Log AI content access
    await this.logAuditEvent({
      reading_id: readingId,
      action: 'AI_DRAFT_ACCESSED',
      user_id: accessorUserId,
      ai_content_accessed: true,
      details: { accessor_role: accessorRole },
    });

    return this.db.select<TarotV2Reading>(TABLES.TAROT_V2_READINGS, {
      conditions: { id: readingId },
    });
  }

  /**
   * Update AI interpretation (reader/admin only)
   */
  async updateAIInterpretation(
    readingId: string,
    aiData: {
      interpretation: string;
      confidenceScore: number;
      generatedAt?: string;
    },
    updatedBy: string
  ): Promise<QueryResult<TarotV2Reading[]>> {
    // Log AI update
    await this.logAuditEvent({
      reading_id: readingId,
      action: 'AI_INTERPRETATION_UPDATED',
      user_id: updatedBy,
      ai_content_accessed: true,
      details: { confidence_score: aiData.confidenceScore },
    });

    return this.db.update<TarotV2Reading>(
      TABLES.TAROT_V2_READINGS,
      {
        ai_interpretation: aiData.interpretation,
        confidence_score: aiData.confidenceScore,
        generated_at: aiData.generatedAt || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { id: readingId }
    );
  }

  /**
   * Add card selection to reading
   */
  async addCardSelection(selectionData: {
    readingId: string;
    cardId: string;
    position: number;
  }): Promise<QueryResult<TarotV2CardSelection>> {
    const selection = {
      reading_id: selectionData.readingId,
      card_id: selectionData.cardId,
      position: selectionData.position,
      is_revealed: false,
      created_at: new Date().toISOString(),
    };

    return this.db.insert<TarotV2CardSelection>(TABLES.TAROT_V2_CARD_SELECTIONS, selection);
  }

  /**
   * Reveal card (irreversible action)
   */
  async revealCard(
    readingId: string,
    position: number,
    revealedBy: string
  ): Promise<QueryResult<TarotV2CardSelection[]>> {
    // Log card reveal for audit
    await this.logAuditEvent({
      reading_id: readingId,
      action: 'CARD_REVEALED',
      user_id: revealedBy,
      ai_content_accessed: false,
      details: { position, irreversible: true },
    });

    return this.db.update<TarotV2CardSelection>(
      TABLES.TAROT_V2_CARD_SELECTIONS,
      {
        is_revealed: true,
        revealed_at: new Date().toISOString(),
      },
      { reading_id: readingId, position: position }
    );
  }

  /**
   * Get card selections for reading (client-safe)
   */
  async getRevealedCards(readingId: string): Promise<QueryResult<TarotV2CardSelection[]>> {
    return this.db.select<TarotV2CardSelection>(TABLES.TAROT_V2_CARD_SELECTIONS, {
      conditions: { 
        reading_id: readingId,
        is_revealed: true 
      },
      orderBy: { column: 'position', ascending: true },
    });
  }

  /**
   * Get all card selections (reader/admin only)
   */
  async getAllCardSelections(readingId: string): Promise<QueryResult<TarotV2CardSelection[]>> {
    return this.db.select<TarotV2CardSelection>(TABLES.TAROT_V2_CARD_SELECTIONS, {
      conditions: { reading_id: readingId },
      orderBy: { column: 'position', ascending: true },
    });
  }

  /**
   * Validate reveal sequence (ensure progressive 1→N)
   */
  async validateRevealSequence(readingId: string, position: number): Promise<QueryResult<{
    is_valid: boolean;
    reason?: string;
    next_position: number;
  }[]>> {
    const selectionsResult = await this.getRevealedCards(readingId);
    
    if (selectionsResult.error) {
      return { data: null, error: selectionsResult.error };
    }

    const revealedPositions = selectionsResult.data?.map(s => s.position).sort((a, b) => a - b) || [];
    const expectedNext = revealedPositions.length + 1;

    const validation = {
      is_valid: position === expectedNext,
      reason: position !== expectedNext ? 
        `Must reveal cards in sequence. Expected position ${expectedNext}, got ${position}` : 
        undefined,
      next_position: expectedNext,
    };

    return { data: [validation], error: null };
  }

  /**
   * Complete reading session
   */
  async completeReading(
    readingId: string, 
    completedBy: string
  ): Promise<QueryResult<TarotV2Reading[]>> {
    // Log completion
    await this.logAuditEvent({
      reading_id: readingId,
      action: 'READING_COMPLETED',
      user_id: completedBy,
      ai_content_accessed: false,
      details: { completed_at: new Date().toISOString() },
    });

    return this.db.update<TarotV2Reading>(
      TABLES.TAROT_V2_READINGS,
      {
        status: 'completed',
        updated_at: new Date().toISOString(),
      },
      { id: readingId }
    );
  }

  /**
   * Log audit event (security critical)
   */
  async logAuditEvent(eventData: {
    reading_id: string;
    action: string;
    user_id: string;
    ai_content_accessed: boolean;
    details?: Record<string, any>;
  }): Promise<QueryResult<TarotV2AuditLog>> {
    const auditLog = {
      reading_id: eventData.reading_id,
      action: eventData.action,
      user_id: eventData.user_id,
      ai_content_accessed: eventData.ai_content_accessed,
      details: eventData.details,
      timestamp: new Date().toISOString(),
    };

    return this.db.insert<TarotV2AuditLog>(TABLES.TAROT_V2_AUDIT_LOGS, auditLog);
  }

  /**
   * Get audit logs for reading (admin only)
   */
  async getAuditLogs(readingId: string): Promise<QueryResult<TarotV2AuditLog[]>> {
    return this.db.select<TarotV2AuditLog>(TABLES.TAROT_V2_AUDIT_LOGS, {
      conditions: { reading_id: readingId },
      orderBy: { column: 'timestamp', ascending: false },
    });
  }

  /**
   * Security audit: Check for AI content leaks
   */
  async auditAIContentAccess(options: {
    startDate?: string;
    endDate?: string;
    userId?: string;
  } = {}): Promise<QueryResult<TarotV2AuditLog[]>> {
    return this.db.query<TarotV2AuditLog[]>(TABLES.TAROT_V2_AUDIT_LOGS, async (table) => {
      let query = table
        .select('*')
        .eq('ai_content_accessed', true)
        .order('timestamp', { ascending: false });

      if (options.startDate) {
        query = query.gte('timestamp', options.startDate);
      }
      if (options.endDate) {
        query = query.lte('timestamp', options.endDate);
      }
      if (options.userId) {
        query = query.eq('user_id', options.userId);
      }

      return await query;
    });
  }

  /**
   * Security check: Ensure AI isolation
   */
  async validateAIIsolation(): Promise<QueryResult<{
    isolation_intact: boolean;
    violations: number;
    last_check: string;
  }[]>> {
    // Check if any readings have ai_draft_visible_to_client = true
    const violationsResult = await this.db.select<TarotV2Reading>(TABLES.TAROT_V2_READINGS, {
      conditions: { ai_draft_visible_to_client: true },
    });

    if (violationsResult.error) {
      return { data: null, error: violationsResult.error };
    }

    const violations = violationsResult.data?.length || 0;
    
    if (violations > 0) {
      // Log critical security violation
      console.error('🚨 CRITICAL SECURITY VIOLATION: AI content exposed to clients!');
    }

    const check = {
      isolation_intact: violations === 0,
      violations: violations,
      last_check: new Date().toISOString(),
    };

    return { data: [check], error: null };
  }

  /**
   * Get reading statistics
   */
  async getReadingStats(readingId: string): Promise<QueryResult<{
    total_cards: number;
    revealed_cards: number;
    progress_percentage: number;
    has_ai_interpretation: boolean;
    audit_events: number;
  }[]>> {
    const [selectionsResult, readingResult, auditResult] = await Promise.all([
      this.getAllCardSelections(readingId),
      this.getReadingForClient(readingId),
      this.getAuditLogs(readingId),
    ]);

    if (selectionsResult.error || readingResult.error || auditResult.error) {
      return { 
        data: null, 
        error: selectionsResult.error || readingResult.error || auditResult.error 
      };
    }

    const selections = selectionsResult.data || [];
    const revealedCount = selections.filter(s => s.is_revealed).length;
    
    const stats = {
      total_cards: selections.length,
      revealed_cards: revealedCount,
      progress_percentage: selections.length > 0 ? 
        Math.round((revealedCount / selections.length) * 100) : 0,
      has_ai_interpretation: false, // We don't expose this in client stats
      audit_events: auditResult.data?.length || 0,
    };

    return { data: [stats], error: null };
  }
}