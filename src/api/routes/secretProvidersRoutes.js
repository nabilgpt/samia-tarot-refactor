import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js'; // Corrected import

const router = express.Router();
const superAdminOnly = requireRole(['super_admin']); // Correct usage

// GET /api/secret-providers - List all secret providers
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('secret_providers')
            .select('*')
            .order('name', { ascending: true });

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error) {
        console.error('Error fetching secret providers:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

// POST /api/secret-providers - Create a new secret provider
router.post('/', authenticateToken, superAdminOnly, async (req, res) => {
    const { name, default_key, category, icon_url } = req.body;

    if (!name) {
        return res.status(400).json({ success: false, error: 'Provider name is required.' });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('secret_providers')
            .insert([{ name, default_key, category, icon_url }])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // Unique constraint violation
                return res.status(409).json({ success: false, error: `Provider with name "${name}" already exists.` });
            }
            throw error;
        }
        res.status(201).json({ success: true, data });
    } catch (error) {
        console.error('Error creating secret provider:', error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

// PUT /api/secret-providers/:id - Update a secret provider
router.put('/:id', authenticateToken, superAdminOnly, async (req, res) => {
    const { id } = req.params;
    const { name, default_key, category, icon_url } = req.body;

    if (!name) {
        return res.status(400).json({ success: false, error: 'Provider name is required.' });
    }
    
    try {
        const { data, error } = await supabaseAdmin
            .from('secret_providers')
            .update({ name, default_key, category, icon_url })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        if (!data) return res.status(404).json({ success: false, error: 'Provider not found.' });

        res.json({ success: true, data });
    } catch (error) {
        console.error(`Error updating secret provider ${id}:`, error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

// DELETE /api/secret-providers/:id - Delete a secret provider
router.delete('/:id', authenticateToken, superAdminOnly, async (req, res) => {
    const { id } = req.params;
    
    try {
        const { error } = await supabaseAdmin
            .from('secret_providers')
            .delete()
            .eq('id', id);

        if (error) throw error;
        
        res.status(204).send(); // No content
    } catch (error) {
        console.error(`Error deleting secret provider ${id}:`, error);
        res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
});

export default router; 