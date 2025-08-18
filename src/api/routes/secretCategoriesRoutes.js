// ============================================================================
// SAMIA TAROT - SECRET CATEGORIES MANAGEMENT API ROUTES
// Dynamic CRUD operations for secret categories and subcategories
// ============================================================================
// Date: July 23, 2025
// Purpose: Provide full management capabilities for system secrets organization
// Security: JWT protected, super_admin role required
// ============================================================================

import express from 'express';
import { supabaseAdmin } from '../lib/supabase.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

// ============================================================================
// MIDDLEWARE - Apply to all routes
// ============================================================================

// JWT Authentication + Super Admin Role Required
router.use(authenticateToken);
router.use(requireRole(['super_admin']));

// ============================================================================
// SECRET CATEGORIES ENDPOINTS
// ============================================================================

/**
 * GET /api/secret-categories
 * List all categories with subcategory and secrets count
 */
router.get('/', async (req, res) => {
    try {
        console.log('📁 [SECRET CATEGORIES] GET / - Fetching all categories');

        const { data: categories, error } = await supabaseAdmin
            .from('secret_categories')
            .select(`
                *,
                subcategories:secret_subcategories(count),
                secrets:system_secrets(count)
            `)
            .order('name_en');

        if (error) {
            console.error('🚨 [SECRET CATEGORIES] Database error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch categories',
                details: error.message
            });
        }

        // Format response with counts
        const formattedCategories = categories.map(cat => ({
            id: cat.id,
            name: cat.name,
            name_en: cat.name_en,
            name_ar: cat.name_ar,
            description_en: cat.description_en,
            description_ar: cat.description_ar,
            display_order: cat.display_order,
            is_active: cat.is_active,
            created_at: cat.created_at,
            updated_at: cat.updated_at,
            subcategory_count: cat.subcategories?.[0]?.count || 0,
            secrets_count: cat.secrets?.[0]?.count || 0
        }));

        console.log(`✅ [SECRET CATEGORIES] Found ${formattedCategories.length} categories`);

        res.json({
            success: true,
            data: formattedCategories,
            count: formattedCategories.length
        });

    } catch (error) {
        console.error('🚨 [SECRET CATEGORIES] Error in GET /:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/secret-categories/:id
 * Get specific category with full details
 */
router.get('/:id', async (req, res) => {
    try {
        const categoryId = req.params.id;
        console.log(`📁 [SECRET CATEGORIES] GET /${categoryId} - Fetching category details`);

        const { data: category, error } = await supabaseAdmin
            .from('secret_categories')
            .select(`
                *,
                subcategories:secret_subcategories(*),
                secrets:system_secrets(*)
            `)
            .eq('id', categoryId)
            .single();

        if (error) {
            console.error('🚨 [SECRET CATEGORIES] Database error:', error);
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }

        console.log(`✅ [SECRET CATEGORIES] Found category: ${category.name_en}`);

        res.json({
            success: true,
            data: category
        });

    } catch (error) {
        console.error('🚨 [SECRET CATEGORIES] Error in GET /:id:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/secret-categories
 * Create new category
 */
router.post('/', async (req, res) => {
    try {
        const {
            name,
            display_name_en,
            display_name_ar,
            description_en,
            description_ar,
            sort_order,
            is_active = true
        } = req.body;

        console.log('📁 [SECRET CATEGORIES] POST / - Creating new category:', { name, display_name_en, display_name_ar });

        // Validation
        if (!name && !display_name_en) {
            return res.status(400).json({
                success: false,
                error: 'Category name (name or display_name_en) is required'
            });
        }

        // Check for duplicates
        const { data: existing } = await supabaseAdmin
            .from('secret_categories')
            .select('id, name, display_name_en')
            .or(`name.eq.${name},display_name_en.eq.${display_name_en || name}`)
            .limit(1);

        if (existing && existing.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Category with this name already exists'
            });
        }

        // Create category
        const categoryData = {
            name: name || display_name_en,
            display_name_en: display_name_en || name,
            display_name_ar: display_name_ar || '',
            description_en: description_en || '',
            description_ar: description_ar || '',
            sort_order: sort_order || 0,
            is_active
        };

        const { data: newCategory, error } = await supabaseAdmin
            .from('secret_categories')
            .insert([categoryData])
            .select()
            .single();

        if (error) {
            console.error('🚨 [SECRET CATEGORIES] Database error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to create category',
                details: error.message
            });
        }

        console.log(`✅ [SECRET CATEGORIES] Created category: ${newCategory.display_name_en} (ID: ${newCategory.id})`);

        res.status(201).json({
            success: true,
            data: newCategory,
            message: 'Category created successfully'
        });

    } catch (error) {
        console.error('🚨 [SECRET CATEGORIES] Error in POST /:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * PUT /api/secret-categories/:id
 * Update existing category
 */
router.put('/:id', async (req, res) => {
    try {
        const categoryId = req.params.id;
        const {
            name,
            name_en,
            name_ar,
            description_en,
            description_ar,
            display_order,
            is_active
        } = req.body;

        console.log(`📁 [SECRET CATEGORIES] PUT /${categoryId} - Updating category`);

        // Check if category exists
        const { data: existing } = await supabaseAdmin
            .from('secret_categories')
            .select('id, name_en')
            .eq('id', categoryId)
            .single();

        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }

        // Prepare update data
        const updateData = {
            updated_at: new Date().toISOString()
        };

        if (name !== undefined) updateData.name = name;
        if (name_en !== undefined) updateData.name_en = name_en;
        if (name_ar !== undefined) updateData.name_ar = name_ar;
        if (description_en !== undefined) updateData.description_en = description_en;
        if (description_ar !== undefined) updateData.description_ar = description_ar;
        if (display_order !== undefined) updateData.display_order = display_order;
        if (is_active !== undefined) updateData.is_active = is_active;

        // Update category
        const { data: updatedCategory, error } = await supabaseAdmin
            .from('secret_categories')
            .update(updateData)
            .eq('id', categoryId)
            .select()
            .single();

        if (error) {
            console.error('🚨 [SECRET CATEGORIES] Database error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to update category',
                details: error.message
            });
        }

        console.log(`✅ [SECRET CATEGORIES] Updated category: ${updatedCategory.name_en}`);

        res.json({
            success: true,
            data: updatedCategory,
            message: 'Category updated successfully'
        });

    } catch (error) {
        console.error('🚨 [SECRET CATEGORIES] Error in PUT /:id:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * DELETE /api/secret-categories/:id
 * Delete category (if no subcategories or secrets exist)
 */
router.delete('/:id', async (req, res) => {
    try {
        const categoryId = req.params.id;
        console.log(`📁 [SECRET CATEGORIES] DELETE /${categoryId} - Deleting category`);

        // Check if category exists
        const { data: category } = await supabaseAdmin
            .from('secret_categories')
            .select('id, name_en')
            .eq('id', categoryId)
            .single();

        if (!category) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }

        // Check for dependencies
        const [subcategoriesCheck, secretsCheck] = await Promise.all([
            supabaseAdmin
                .from('secret_subcategories')
                .select('id')
                .eq('category_id', categoryId)
                .limit(1),
            supabaseAdmin
                .from('system_secrets')
                .select('id')
                .eq('secret_category_id', categoryId)
                .limit(1)
        ]);

        if (subcategoriesCheck.data && subcategoriesCheck.data.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Cannot delete category: subcategories exist'
            });
        }

        if (secretsCheck.data && secretsCheck.data.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Cannot delete category: secrets exist in this category'
            });
        }

        // Delete category
        const { error } = await supabaseAdmin
            .from('secret_categories')
            .delete()
            .eq('id', categoryId);

        if (error) {
            console.error('🚨 [SECRET CATEGORIES] Database error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to delete category',
                details: error.message
            });
        }

        console.log(`✅ [SECRET CATEGORIES] Deleted category: ${category.name_en}`);

        res.json({
            success: true,
            message: 'Category deleted successfully'
        });

    } catch (error) {
        console.error('🚨 [SECRET CATEGORIES] Error in DELETE /:id:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * PATCH /api/secret-categories/:id/toggle
 * Toggle category active status
 */
router.patch('/:id/toggle', async (req, res) => {
    try {
        const categoryId = req.params.id;
        console.log(`📁 [SECRET CATEGORIES] PATCH /${categoryId}/toggle - Toggling status`);

        // Get current status
        const { data: category } = await supabaseAdmin
            .from('secret_categories')
            .select('id, name_en, is_active')
            .eq('id', categoryId)
            .single();

        if (!category) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }

        // Toggle status
        const newStatus = !category.is_active;
        const { data: updated, error } = await supabaseAdmin
            .from('secret_categories')
            .update({ 
                is_active: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', categoryId)
            .select()
            .single();

        if (error) {
            console.error('🚨 [SECRET CATEGORIES] Database error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to toggle category status',
                details: error.message
            });
        }

        console.log(`✅ [SECRET CATEGORIES] Toggled ${category.name_en}: ${category.is_active} → ${newStatus}`);

        res.json({
            success: true,
            data: updated,
            message: `Category ${newStatus ? 'activated' : 'deactivated'} successfully`
        });

    } catch (error) {
        console.error('🚨 [SECRET CATEGORIES] Error in PATCH /:id/toggle:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * GET /api/secret-categories/:categoryId/subcategories
 * List all subcategories for a specific category
 */
router.get('/:categoryId/subcategories', async (req, res) => {
    try {
        const categoryId = req.params.categoryId;
        console.log(`📁 [SECRET CATEGORIES] GET /${categoryId}/subcategories - Fetching subcategories`);

        // Verify category exists
        const { data: category } = await supabaseAdmin
            .from('secret_categories')
            .select('id, name_en')
            .eq('id', categoryId)
            .single();

        if (!category) {
            return res.status(404).json({
                success: false,
                error: 'Category not found'
            });
        }

        // Get subcategories with secrets count
        const { data: subcategories, error } = await supabaseAdmin
            .from('secret_subcategories')
            .select(`
                *,
                secrets:system_secrets(count)
            `)
            .eq('category_id', categoryId)
            .order('name_en');

        if (error) {
            console.error('🚨 [SECRET CATEGORIES] Database error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch subcategories',
                details: error.message
            });
        }

        // Format response with counts
        const formattedSubcategories = subcategories.map(sub => ({
            ...sub,
            secrets_count: sub.secrets?.[0]?.count || 0
        }));

        console.log(`✅ [SECRET CATEGORIES] Found ${formattedSubcategories.length} subcategories for ${category.name_en}`);

        res.json({
            success: true,
            data: formattedSubcategories,
            count: formattedSubcategories.length,
            category: {
                id: category.id,
                name_en: category.name_en
            }
        });

    } catch (error) {
        console.error('🚨 [SECRET CATEGORIES] Error in GET /:categoryId/subcategories:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

// ============================================================================
// SECRET SUBCATEGORIES ENDPOINTS
// ============================================================================

/**
 * GET /api/secret-subcategories
 * List all subcategories with category info
 */
router.get('/subcategories', async (req, res) => {
    try {
        console.log('📁 [SECRET SUBCATEGORIES] GET / - Fetching all subcategories');

        const { data: subcategories, error } = await supabaseAdmin
            .from('secret_subcategories')
            .select(`
                *,
                category:secret_categories(*),
                secrets:system_secrets(count)
            `)
            .order('name_en');

        if (error) {
            console.error('🚨 [SECRET SUBCATEGORIES] Database error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to fetch subcategories',
                details: error.message
            });
        }

        // Format response
        const formattedSubcategories = subcategories.map(sub => ({
            ...sub,
            secrets_count: sub.secrets?.[0]?.count || 0
        }));

        console.log(`✅ [SECRET SUBCATEGORIES] Found ${formattedSubcategories.length} subcategories`);

        res.json({
            success: true,
            data: formattedSubcategories,
            count: formattedSubcategories.length
        });

    } catch (error) {
        console.error('🚨 [SECRET SUBCATEGORIES] Error in GET /:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * POST /api/secret-subcategories
 * Create new subcategory
 */
router.post('/subcategories', async (req, res) => {
    try {
        const {
            category_id,
            name,
            name_en,
            name_ar,
            description_en,
            description_ar,
            display_order,
            is_active = true
        } = req.body;

        console.log('📁 [SECRET SUBCATEGORIES] POST / - Creating new subcategory:', { name, name_en, category_id });

        // Validation
        if (!category_id) {
            return res.status(400).json({
                success: false,
                error: 'Category ID is required'
            });
        }

        if (!name && !name_en) {
            return res.status(400).json({
                success: false,
                error: 'Subcategory name (name or name_en) is required'
            });
        }

        // Verify category exists
        const { data: category } = await supabaseAdmin
            .from('secret_categories')
            .select('id')
            .eq('id', category_id)
            .single();

        if (!category) {
            return res.status(400).json({
                success: false,
                error: 'Invalid category ID'
            });
        }

        // Check for duplicates within category
        const { data: existing } = await supabaseAdmin
            .from('secret_subcategories')
            .select('id, name, name_en')
            .eq('category_id', category_id)
            .or(`name.eq.${name || name_en},name_en.eq.${name_en || name}`)
            .limit(1);

        if (existing && existing.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Subcategory with this name already exists in this category'
            });
        }

        // Create subcategory
        const subcategoryData = {
            category_id,
            name: name || name_en,
            name_en: name_en || name,
            name_ar: name_ar || '',
            description_en: description_en || '',
            description_ar: description_ar || '',
            display_order: display_order || 999,
            is_active,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data: newSubcategory, error } = await supabaseAdmin
            .from('secret_subcategories')
            .insert([subcategoryData])
            .select(`
                *,
                category:secret_categories(*)
            `)
            .single();

        if (error) {
            console.error('🚨 [SECRET SUBCATEGORIES] Database error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to create subcategory',
                details: error.message
            });
        }

        console.log(`✅ [SECRET SUBCATEGORIES] Created subcategory: ${newSubcategory.name_en} (ID: ${newSubcategory.id})`);

        res.status(201).json({
            success: true,
            data: newSubcategory,
            message: 'Subcategory created successfully'
        });

    } catch (error) {
        console.error('🚨 [SECRET SUBCATEGORIES] Error in POST /:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * PUT /api/secret-subcategories/:id
 * Update existing subcategory
 */
router.put('/subcategories/:id', async (req, res) => {
    try {
        const subcategoryId = req.params.id;
        const {
            category_id,
            name,
            name_en,
            name_ar,
            description_en,
            description_ar,
            display_order,
            is_active
        } = req.body;

        console.log(`📁 [SECRET SUBCATEGORIES] PUT /${subcategoryId} - Updating subcategory`);

        // Check if subcategory exists
        const { data: existing } = await supabaseAdmin
            .from('secret_subcategories')
            .select('id, name_en, category_id')
            .eq('id', subcategoryId)
            .single();

        if (!existing) {
            return res.status(404).json({
                success: false,
                error: 'Subcategory not found'
            });
        }

        // If changing category, verify new category exists
        if (category_id && category_id !== existing.category_id) {
            const { data: category } = await supabaseAdmin
                .from('secret_categories')
                .select('id')
                .eq('id', category_id)
                .single();

            if (!category) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid category ID'
                });
            }
        }

        // Prepare update data
        const updateData = {
            updated_at: new Date().toISOString()
        };

        if (category_id !== undefined) updateData.category_id = category_id;
        if (name !== undefined) updateData.name = name;
        if (name_en !== undefined) updateData.name_en = name_en;
        if (name_ar !== undefined) updateData.name_ar = name_ar;
        if (description_en !== undefined) updateData.description_en = description_en;
        if (description_ar !== undefined) updateData.description_ar = description_ar;
        if (display_order !== undefined) updateData.display_order = display_order;
        if (is_active !== undefined) updateData.is_active = is_active;

        // Update subcategory
        const { data: updatedSubcategory, error } = await supabaseAdmin
            .from('secret_subcategories')
            .update(updateData)
            .eq('id', subcategoryId)
            .select(`
                *,
                category:secret_categories(*)
            `)
            .single();

        if (error) {
            console.error('🚨 [SECRET SUBCATEGORIES] Database error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to update subcategory',
                details: error.message
            });
        }

        console.log(`✅ [SECRET SUBCATEGORIES] Updated subcategory: ${updatedSubcategory.name_en}`);

        res.json({
            success: true,
            data: updatedSubcategory,
            message: 'Subcategory updated successfully'
        });

    } catch (error) {
        console.error('🚨 [SECRET SUBCATEGORIES] Error in PUT /:id:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * DELETE /api/secret-subcategories/:id
 * Delete subcategory (if no secrets exist)
 */
router.delete('/subcategories/:id', async (req, res) => {
    try {
        const subcategoryId = req.params.id;
        console.log(`📁 [SECRET SUBCATEGORIES] DELETE /${subcategoryId} - Deleting subcategory`);

        // Check if subcategory exists
        const { data: subcategory } = await supabaseAdmin
            .from('secret_subcategories')
            .select('id, name_en')
            .eq('id', subcategoryId)
            .single();

        if (!subcategory) {
            return res.status(404).json({
                success: false,
                error: 'Subcategory not found'
            });
        }

        // Check for dependencies
        const { data: secretsCheck } = await supabaseAdmin
            .from('system_secrets')
            .select('id')
            .eq('secret_subcategory_id', subcategoryId)
            .limit(1);

        if (secretsCheck && secretsCheck.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'Cannot delete subcategory: secrets exist in this subcategory'
            });
        }

        // Delete subcategory
        const { error } = await supabaseAdmin
            .from('secret_subcategories')
            .delete()
            .eq('id', subcategoryId);

        if (error) {
            console.error('🚨 [SECRET SUBCATEGORIES] Database error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to delete subcategory',
                details: error.message
            });
        }

        console.log(`✅ [SECRET SUBCATEGORIES] Deleted subcategory: ${subcategory.name_en}`);

        res.json({
            success: true,
            message: 'Subcategory deleted successfully'
        });

    } catch (error) {
        console.error('🚨 [SECRET SUBCATEGORIES] Error in DELETE /:id:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

/**
 * PATCH /api/secret-subcategories/:id/toggle
 * Toggle subcategory active status
 */
router.patch('/subcategories/:id/toggle', async (req, res) => {
    try {
        const subcategoryId = req.params.id;
        console.log(`📁 [SECRET SUBCATEGORIES] PATCH /${subcategoryId}/toggle - Toggling status`);

        // Get current status
        const { data: subcategory } = await supabaseAdmin
            .from('secret_subcategories')
            .select('id, name_en, is_active')
            .eq('id', subcategoryId)
            .single();

        if (!subcategory) {
            return res.status(404).json({
                success: false,
                error: 'Subcategory not found'
            });
        }

        // Toggle status
        const newStatus = !subcategory.is_active;
        const { data: updated, error } = await supabaseAdmin
            .from('secret_subcategories')
            .update({ 
                is_active: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', subcategoryId)
            .select(`
                *,
                category:secret_categories(*)
            `)
            .single();

        if (error) {
            console.error('🚨 [SECRET SUBCATEGORIES] Database error:', error);
            return res.status(500).json({
                success: false,
                error: 'Failed to toggle subcategory status',
                details: error.message
            });
        }

        console.log(`✅ [SECRET SUBCATEGORIES] Toggled ${subcategory.name_en}: ${subcategory.is_active} → ${newStatus}`);

        res.json({
            success: true,
            data: updated,
            message: `Subcategory ${newStatus ? 'activated' : 'deactivated'} successfully`
        });

    } catch (error) {
        console.error('🚨 [SECRET SUBCATEGORIES] Error in PATCH /:id/toggle:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

export default router; 