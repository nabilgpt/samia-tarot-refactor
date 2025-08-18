import express from 'express';
import { authenticateToken, requireRole } from '../middleware/auth.js';
import { supabaseAdmin } from '../lib/supabase.js';

const router = express.Router();

/**
 * Global Search Routes for Admin Dashboard
 * Provides unified search across all admin entities
 */

// Search users
router.get('/users/search', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { q: query, lang = 'en' } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.json([]);
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        role,
        is_active,
        phone,
        created_at
      `)
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,role.ilike.%${query}%`)
      .limit(10)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Users search error:', error);
      return res.status(500).json({ error: 'Failed to search users' });
    }

    const results = (data || []).map(user => ({
      id: user.id,
      title: `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.email,
      description: `${user.role} • ${user.email}`,
      entity: 'users',
      metadata: {
        role: user.role,
        status: user.is_active ? 'Active' : 'Inactive',
        phone: user.phone,
        created: user.created_at
      }
    }));

    res.json(results);
  } catch (error) {
    console.error('Users search error:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Search services
router.get('/services/search', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { q: query, lang = 'en' } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.json([]);
    }

    const searchColumn = lang === 'ar' ? 'name_ar' : 'name_en';
    const descColumn = lang === 'ar' ? 'description_ar' : 'description_en';

    const { data, error } = await supabaseAdmin
      .from('services')
      .select(`
        id,
        name_en,
        name_ar,
        description_en,
        description_ar,
        type,
        price,
        duration,
        is_active,
        created_at
      `)
      .or(`name_en.ilike.%${query}%,name_ar.ilike.%${query}%,description_en.ilike.%${query}%,description_ar.ilike.%${query}%,type.ilike.%${query}%`)
      .limit(10)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Services search error:', error);
      return res.status(500).json({ error: 'Failed to search services' });
    }

    const results = (data || []).map(service => ({
      id: service.id,
      title: service[searchColumn] || service.name_en,
      description: `${service.type} • $${service.price} • ${service.duration}min`,
      entity: 'services',
      metadata: {
        type: service.type,
        price: service.price,
        duration: service.duration,
        status: service.is_active ? 'Active' : 'Inactive',
        created: service.created_at
      }
    }));

    res.json(results);
  } catch (error) {
    console.error('Services search error:', error);
    res.status(500).json({ error: 'Failed to search services' });
  }
});

// Search bookings
router.get('/bookings/search', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { q: query, lang = 'en' } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.json([]);
    }

    const { data, error } = await supabaseAdmin
      .from('bookings')
      .select(`
        id,
        user_id,
        reader_id,
        service_id,
        scheduled_at,
        status,
        notes,
        created_at,
        services!inner(name_en, name_ar),
        profiles!bookings_user_id_fkey(first_name, last_name, email)
      `)
      .or(`status.ilike.%${query}%,notes.ilike.%${query}%`)
      .limit(10)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Bookings search error:', error);
      return res.status(500).json({ error: 'Failed to search bookings' });
    }

    const results = (data || []).map(booking => {
      const clientName = booking.profiles ? `${booking.profiles.first_name || ''} ${booking.profiles.last_name || ''}`.trim() : 'Unknown';
      const serviceName = booking.services ? (booking.services.name_en || booking.services.name_ar) : 'Unknown Service';
      
      return {
        id: booking.id,
        title: `${serviceName} - ${clientName}`,
        description: `${booking.status} • ${booking.scheduled_at ? new Date(booking.scheduled_at).toLocaleDateString() : 'Not scheduled'}`,
        entity: 'bookings',
        metadata: {
          status: booking.status,
          scheduled: booking.scheduled_at,
          client: clientName,
          service: serviceName,
          created: booking.created_at
        }
      };
    });

    res.json(results);
  } catch (error) {
    console.error('Bookings search error:', error);
    res.status(500).json({ error: 'Failed to search bookings' });
  }
});

// Search payments
router.get('/payments/search', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { q: query, lang = 'en' } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.json([]);
    }

    const { data, error } = await supabaseAdmin
      .from('payments')
      .select(`
        id,
        user_id,
        booking_id,
        amount,
        currency,
        method,
        status,
        transaction_id,
        created_at,
        profiles!payments_user_id_fkey(first_name, last_name, email)
      `)
      .or(`method.ilike.%${query}%,status.ilike.%${query}%,transaction_id.ilike.%${query}%,currency.ilike.%${query}%`)
      .limit(10)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Payments search error:', error);
      return res.status(500).json({ error: 'Failed to search payments' });
    }

    const results = (data || []).map(payment => {
      const clientName = payment.profiles ? `${payment.profiles.first_name || ''} ${payment.profiles.last_name || ''}`.trim() : 'Unknown';
      
      return {
        id: payment.id,
        title: `${payment.amount} ${payment.currency} - ${clientName}`,
        description: `${payment.method} • ${payment.status} • ${payment.transaction_id || 'No TX ID'}`,
        entity: 'payments',
        metadata: {
          amount: payment.amount,
          currency: payment.currency,
          method: payment.method,
          status: payment.status,
          client: clientName,
          created: payment.created_at
        }
      };
    });

    res.json(results);
  } catch (error) {
    console.error('Payments search error:', error);
    res.status(500).json({ error: 'Failed to search payments' });
  }
});

// Search tarot decks
router.get('/tarot/decks/search', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { q: query, lang = 'en' } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.json([]);
    }

    const { data, error } = await supabaseAdmin
      .from('tarot_decks')
      .select(`
        id,
        name,
        name_ar,
        description,
        description_ar,
        deck_type,
        total_cards,
        is_active,
        is_default,
        created_at
      `)
      .or(`name.ilike.%${query}%,name_ar.ilike.%${query}%,description.ilike.%${query}%,description_ar.ilike.%${query}%,deck_type.ilike.%${query}%`)
      .limit(10)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Tarot decks search error:', error);
      return res.status(500).json({ error: 'Failed to search tarot decks' });
    }

    const results = (data || []).map(deck => {
      const name = lang === 'ar' ? (deck.name_ar || deck.name) : deck.name;
      const description = lang === 'ar' ? (deck.description_ar || deck.description) : deck.description;
      
      return {
        id: deck.id,
        title: name,
        description: `${deck.deck_type} • ${deck.total_cards} cards • ${deck.is_active ? 'Active' : 'Inactive'}`,
        entity: 'tarot_decks',
        metadata: {
          type: deck.deck_type,
          cards: deck.total_cards,
          status: deck.is_active ? 'Active' : 'Inactive',
          default: deck.is_default,
          created: deck.created_at
        }
      };
    });

    res.json(results);
  } catch (error) {
    console.error('Tarot decks search error:', error);
    res.status(500).json({ error: 'Failed to search tarot decks' });
  }
});

// Search tarot spreads
router.get('/tarot/spreads/search', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { q: query, lang = 'en' } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.json([]);
    }

    const { data, error } = await supabaseAdmin
      .from('tarot_spreads')
      .select(`
        id,
        name,
        name_ar,
        description,
        description_ar,
        card_count,
        difficulty_level,
        category,
        is_active,
        is_public,
        created_at
      `)
      .or(`name.ilike.%${query}%,name_ar.ilike.%${query}%,description.ilike.%${query}%,description_ar.ilike.%${query}%,category.ilike.%${query}%,difficulty_level.ilike.%${query}%`)
      .limit(10)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Tarot spreads search error:', error);
      return res.status(500).json({ error: 'Failed to search tarot spreads' });
    }

    const results = (data || []).map(spread => {
      const name = lang === 'ar' ? (spread.name_ar || spread.name) : spread.name;
      const description = lang === 'ar' ? (spread.description_ar || spread.description) : spread.description;
      
      return {
        id: spread.id,
        title: name,
        description: `${spread.card_count} cards • ${spread.difficulty_level} • ${spread.category || 'General'}`,
        entity: 'tarot_spreads',
        metadata: {
          cards: spread.card_count,
          difficulty: spread.difficulty_level,
          category: spread.category,
          status: spread.is_active ? 'Active' : 'Inactive',
          public: spread.is_public,
          created: spread.created_at
        }
      };
    });

    res.json(results);
  } catch (error) {
    console.error('Tarot spreads search error:', error);
    res.status(500).json({ error: 'Failed to search tarot spreads' });
  }
});

// Search readers
router.get('/readers/search', authenticateToken, requireRole(['admin', 'super_admin']), async (req, res) => {
  try {
    const { q: query, lang = 'en' } = req.query;
    
    if (!query || query.trim().length < 2) {
      return res.json([]);
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select(`
        id,
        email,
        first_name,
        last_name,
        phone,
        is_active,
        created_at
      `)
      .eq('role', 'reader')
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Readers search error:', error);
      return res.status(500).json({ error: 'Failed to search readers' });
    }

    const results = (data || []).map(reader => ({
      id: reader.id,
      title: `${reader.first_name || ''} ${reader.last_name || ''}`.trim() || reader.email,
      description: `Reader • ${reader.email} • ${reader.is_active ? 'Active' : 'Inactive'}`,
      entity: 'readers',
      metadata: {
        email: reader.email,
        phone: reader.phone,
        status: reader.is_active ? 'Active' : 'Inactive',
        created: reader.created_at
      }
    }));

    res.json(results);
  } catch (error) {
    console.error('Readers search error:', error);
    res.status(500).json({ error: 'Failed to search readers' });
  }
});

export default router; 