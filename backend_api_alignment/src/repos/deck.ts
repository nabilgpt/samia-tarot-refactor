/**
 * Deck Repository - SAMIA TAROT
 * 
 * Repository pattern for deck management operations
 * using the new flat table schema.
 */

import { DatabaseClient, QueryResult } from '../db/pg';
import { TABLES } from '../db/tables';

/**
 * Deck card interface
 */
export interface DeckCard {
  id: string;
  deck_type_id: string;
  card_number: number;
  image_url: string;
  name: string;
  created_at: string;
}

/**
 * Deck upload session interface
 */
export interface DeckUpload {
  id: string;
  deck_type_id: string;
  upload_session_id: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed';
  progress: number;
  total_files: number;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

/**
 * Deck repository class
 */
export class DeckRepository {
  constructor(private db: DatabaseClient) {}

  /**
   * Get all cards for a specific deck type
   */
  async listDeckCards(deckTypeId: string): Promise<QueryResult<DeckCard[]>> {
    return this.db.select<DeckCard>(TABLES.DECK_CARDS, {
      conditions: { deck_type_id: deckTypeId },
      orderBy: { column: 'card_number', ascending: true },
    });
  }

  /**
   * Get a specific card by number
   */
  async getDeckCardByNumber(
    deckTypeId: string, 
    cardNumber: number
  ): Promise<QueryResult<DeckCard[]>> {
    return this.db.select<DeckCard>(TABLES.DECK_CARDS, {
      conditions: { 
        deck_type_id: deckTypeId,
        card_number: cardNumber 
      },
    });
  }

  /**
   * Create a new deck card
   */
  async createDeckCard(cardData: Omit<DeckCard, 'id' | 'created_at'>): Promise<QueryResult<DeckCard>> {
    return this.db.insert<DeckCard>(TABLES.DECK_CARDS, cardData);
  }

  /**
   * Bulk insert deck cards (for upload)
   */
  async createDeckCardsBulk(
    cardsData: Omit<DeckCard, 'id' | 'created_at'>[]
  ): Promise<QueryResult<DeckCard[]>> {
    return this.db.insertMany<DeckCard>(TABLES.DECK_CARDS, cardsData);
  }

  /**
   * Update deck card image URL
   */
  async updateCardImage(
    cardId: string, 
    imageUrl: string
  ): Promise<QueryResult<DeckCard[]>> {
    return this.db.update<DeckCard>(
      TABLES.DECK_CARDS,
      { image_url: imageUrl },
      { id: cardId }
    );
  }

  /**
   * Delete deck card
   */
  async deleteDeckCard(cardId: string): Promise<QueryResult<void>> {
    return this.db.delete(TABLES.DECK_CARDS, { id: cardId });
  }

  /**
   * Create upload session
   */
  async createUploadSession(sessionData: {
    deckTypeId: string;
    uploadedBy: string;
    totalFiles?: number;
  }): Promise<QueryResult<DeckUpload>> {
    const uploadData = {
      deck_type_id: sessionData.deckTypeId,
      upload_session_id: crypto.randomUUID(),
      status: 'pending' as const,
      progress: 0,
      total_files: sessionData.totalFiles || 79,
      uploaded_by: sessionData.uploadedBy,
    };

    return this.db.insert<DeckUpload>(TABLES.DECK_UPLOADS, uploadData);
  }

  /**
   * Update upload progress
   */
  async updateUploadProgress(
    sessionId: string, 
    progress: number,
    status?: DeckUpload['status']
  ): Promise<QueryResult<DeckUpload[]>> {
    const updateData: Partial<DeckUpload> = { 
      progress,
      updated_at: new Date().toISOString(),
    };
    
    if (status) {
      updateData.status = status;
    }

    return this.db.update<DeckUpload>(
      TABLES.DECK_UPLOADS,
      updateData,
      { upload_session_id: sessionId }
    );
  }

  /**
   * Get upload session by ID
   */
  async getUploadSession(sessionId: string): Promise<QueryResult<DeckUpload[]>> {
    return this.db.select<DeckUpload>(TABLES.DECK_UPLOADS, {
      conditions: { upload_session_id: sessionId },
    });
  }

  /**
   * Get all upload sessions for a deck type
   */
  async getUploadSessions(deckTypeId: string): Promise<QueryResult<DeckUpload[]>> {
    return this.db.select<DeckUpload>(TABLES.DECK_UPLOADS, {
      conditions: { deck_type_id: deckTypeId },
      orderBy: { column: 'created_at', ascending: false },
    });
  }

  /**
   * Complete upload session
   */
  async completeUploadSession(sessionId: string): Promise<QueryResult<DeckUpload[]>> {
    return this.updateUploadProgress(sessionId, 100, 'completed');
  }

  /**
   * Fail upload session
   */
  async failUploadSession(sessionId: string): Promise<QueryResult<DeckUpload[]>> {
    return this.db.update<DeckUpload>(
      TABLES.DECK_UPLOADS,
      { 
        status: 'failed',
        updated_at: new Date().toISOString(),
      },
      { upload_session_id: sessionId }
    );
  }

  /**
   * Get deck completeness statistics
   */
  async getDeckStats(deckTypeId: string): Promise<QueryResult<{
    total_cards: number;
    uploaded_cards: number;
    missing_cards: number[];
    completion_percentage: number;
  }[]>> {
    // This would be implemented as a stored procedure or complex query
    // For now, using basic aggregation
    const cardsResult = await this.listDeckCards(deckTypeId);
    
    if (cardsResult.error || !cardsResult.data) {
      return { data: null, error: cardsResult.error };
    }

    const cards = cardsResult.data;
    const expectedCards = 78; // Standard tarot deck
    const cardNumbers = cards.map(card => card.card_number).sort((a, b) => a - b);
    const missingCards = [];
    
    for (let i = 0; i < expectedCards; i++) {
      if (!cardNumbers.includes(i)) {
        missingCards.push(i);
      }
    }

    const stats = {
      total_cards: expectedCards,
      uploaded_cards: cards.length,
      missing_cards: missingCards,
      completion_percentage: Math.round((cards.length / expectedCards) * 100),
    };

    return { data: [stats], error: null };
  }

  /**
   * Validate deck completeness (78 + back)
   */
  async validateDeckCompleteness(deckTypeId: string): Promise<QueryResult<{
    is_complete: boolean;
    missing_cards: number[];
    has_back_card: boolean;
  }[]>> {
    const cardsResult = await this.listDeckCards(deckTypeId);
    
    if (cardsResult.error || !cardsResult.data) {
      return { data: null, error: cardsResult.error };
    }

    const cards = cardsResult.data;
    const cardNumbers = cards.map(card => card.card_number);
    const missingCards = [];
    
    // Check for cards 0-77
    for (let i = 0; i <= 77; i++) {
      if (!cardNumbers.includes(i)) {
        missingCards.push(i);
      }
    }

    // Check for back card (usually -1 or special number)
    const hasBackCard = cardNumbers.includes(-1) || 
                       cards.some(card => card.name.toLowerCase().includes('back'));

    const validation = {
      is_complete: missingCards.length === 0 && hasBackCard,
      missing_cards: missingCards,
      has_back_card: hasBackCard,
    };

    return { data: [validation], error: null };
  }

  /**
   * Search deck cards by name
   */
  async searchDeckCards(
    deckTypeId: string, 
    searchTerm: string
  ): Promise<QueryResult<DeckCard[]>> {
    // Note: This would typically use full-text search in production
    return this.db.query<DeckCard[]>(TABLES.DECK_CARDS, async (table) => {
      return await table
        .select('*')
        .eq('deck_type_id', deckTypeId)
        .ilike('name', `%${searchTerm}%`)
        .order('card_number');
    });
  }
}