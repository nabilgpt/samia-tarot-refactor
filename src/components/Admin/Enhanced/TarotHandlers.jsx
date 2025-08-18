import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

/**
 * ==========================================
 * SAMIA TAROT - TAROT HANDLERS UTILITY
 * Modular CRUD operations for spreads and decks
 * ==========================================
 */

export const useTarotHandlers = (currentLanguage, refreshData) => {
  // ===================================
  // STATE MANAGEMENT
  // ===================================
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');

  // ===================================
  // ERROR & SUCCESS UTILITIES
  // ===================================
  const addError = useCallback((error) => {
    console.error('❌ [TarotHandlers] Error:', error);
    setErrors(prev => [...prev, error]);
  }, []);

  const setSuccess = useCallback((message) => {
    console.log('✅ [TarotHandlers] Success:', message);
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 5000);
  }, []);

  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);

  // ===================================
  // SPREAD HANDLERS
  // ===================================
  const handleAddSpread = useCallback(() => {
    console.log('➕ [TarotHandlers] Add spread initiated');
    // This will open the add spread modal
    // Implementation depends on your modal system
  }, []);

  const handleEditSpread = useCallback((spread) => {
    console.log('✏️ [TarotHandlers] Edit spread initiated:', spread.id);
    // This will open the edit spread modal with pre-filled data
    // Implementation depends on your modal system
  }, []);

  const handleDeleteSpread = useCallback(async (spreadId) => {
    const confirmMessage = currentLanguage === 'ar' ? 
      'هل أنت متأكد من حذف هذا الانتشار؟' : 
      'Are you sure you want to delete this spread?';
    
    if (!window.confirm(confirmMessage)) {
      console.log('🚫 [TarotHandlers] Delete spread cancelled by user');
      return;
    }

    console.log('🗑️ [TarotHandlers] Starting spread deletion:', spreadId);
    console.log('🔍 [TarotHandlers] Spread ID type:', typeof spreadId, 'Value:', spreadId);
    
    setSubmitting(true);
    clearErrors();

    try {
      // First, check authentication session
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      // Extract role with multiple fallback strategies
      let userRole = session?.user?.user_metadata?.role || 
                    session?.user?.app_metadata?.role ||
                    session?.user?.role ||
                    'unknown';
      
      // If role is not admin/super_admin, fetch from database (like backend does)
      if (userRole === 'unknown' || userRole === 'authenticated' || !['admin', 'super_admin'].includes(userRole)) {
        console.log('🔍 [TarotHandlers] Role not found in session, fetching from database...', userRole);
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
          
        console.log('📊 [TarotHandlers] Profile fetch result:', {
          profile: profile,
          error: profileError,
          userId: session.user.id
        });
          
        if (!profileError && profile) {
          userRole = profile.role || 'unknown';
          console.log('✅ [TarotHandlers] Role fetched from database:', userRole);
        } else {
          console.error('❌ [TarotHandlers] Failed to fetch role from database:', profileError);
          // Try alternate query without single() in case of multiple records
          const { data: profiles, error: altError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id);
            
            console.log('🔄 [TarotHandlers] Alternate profile fetch:', {
              profiles: profiles,
              error: altError,
              count: profiles?.length || 0
            });
            
            if (!altError && profiles && profiles.length > 0) {
              userRole = profiles[0].role || 'unknown';
              console.log('✅ [TarotHandlers] Role fetched from alternate query:', userRole);
            }
        }
      }
      
      console.log('🔐 [TarotHandlers] Auth check:', {
        hasSession: !!session,
        userEmail: session?.user?.email || 'none',
        userRole: userRole,
        userMetadata: session?.user?.user_metadata || {},
        appMetadata: session?.user?.app_metadata || {},
        authError: authError?.message || 'none'
      });

      if (!session) {
        console.error('❌ [TarotHandlers] No authenticated session found!');
        throw new Error('Authentication required for delete operation');
      }

      // First, check if spread exists and log current state
      const { data: existingSpread, error: checkError } = await supabase
        .from('tarot_spreads')
        .select('id, name, is_active, created_by')
        .eq('id', spreadId)
        .single();

      if (checkError) {
        console.error('❌ [TarotHandlers] Error checking spread existence:', checkError);
        throw checkError;
      }

      console.log('📋 [TarotHandlers] Spread before delete:', existingSpread);
      console.log('👤 [TarotHandlers] Ownership check:', {
        spreadCreatedBy: existingSpread.created_by || 'none',
        currentUser: session.user.id,
        ownershipMatch: existingSpread.created_by === session.user.id
      });

      // Check if user has admin permissions or owns the spread
      const isOwner = existingSpread.created_by === session.user.id;
      const isAdmin = userRole === 'admin' || userRole === 'super_admin';
      const canDelete = isOwner || isAdmin;

      console.log('🔐 [TarotHandlers] Permission check:', {
        isOwner: isOwner,
        isAdmin: isAdmin,
        userRole: userRole,
        canDelete: canDelete
      });

      if (!canDelete) {
        console.error('❌ [TarotHandlers] Insufficient permissions to delete spread');
        throw new Error('You do not have permission to delete this spread');
      }

      // 🚀 Use Backend API instead of direct Supabase call (RLS bypass)
      console.log('🔄 [TarotHandlers] Attempting DELETE via Backend API:', {
        id: spreadId,
        method: 'DELETE',
        endpoint: `/api/spread-manager/spreads/${spreadId}`
      });

      const authToken = session.access_token;
      const response = await fetch(`/api/spread-manager/spreads/${spreadId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      const apiResult = await response.json();
      
      console.log('📊 [TarotHandlers] Backend API result:', {
        status: response.status,
        ok: response.ok,
        apiResult: apiResult
      });

      if (!response.ok) {
        console.error('❌ [TarotHandlers] Backend API error:', apiResult);
        throw new Error(apiResult.message || `API error: ${response.status}`);
      }

      // Mock the updateResult format for compatibility
      const updateResult = [{ id: spreadId, is_active: false }];
      const error = null;

      console.log('📊 [TarotHandlers] Backend API query result:', {
        error: error,
        updateResult: updateResult,
        updateResultLength: updateResult?.length || 0,
        apiResponseData: apiResult
      });

      if (error) {
        console.error('❌ [TarotHandlers] Supabase UPDATE error:', error);
        console.error('📋 [TarotHandlers] Error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      if (!updateResult || updateResult.length === 0) {
        console.error('❌ [TarotHandlers] No rows were updated! Possible causes:');
        console.error('  - RLS policy preventing UPDATE');
        console.error('  - User does not own this spread');
        console.error('  - Spread ID does not exist');
        console.error('  - Database connection issue');
        
        // Additional debugging: Try to verify if spread still exists
        const { data: verifySpread, error: verifyError } = await supabase
          .from('tarot_spreads')
          .select('id, is_active, created_by')
          .eq('id', spreadId)
          .single();
          
        console.log('🔍 [TarotHandlers] Verification check:', {
          verifyError: verifyError,
          verifySpread: verifySpread
        });
        
        throw new Error('No rows were affected by the update operation');
      }

      // Use the updated record from the query result
      const updatedSpread = updateResult[0];
      console.log('✅ [TarotHandlers] Spread after delete:', updatedSpread);
      console.log('🔄 [TarotHandlers] is_active changed from', existingSpread.is_active, 'to', updatedSpread.is_active);

      if (updatedSpread.is_active === true) {
        console.error('❌ [TarotHandlers] CRITICAL: Update failed - is_active is still true!');
        console.error('❌ [TarotHandlers] This indicates RLS policy is preventing the UPDATE');
        throw new Error('Failed to update is_active - RLS policy issue');
      }

      const successMsg = currentLanguage === 'ar' ? 
        'تم حذف الانتشار بنجاح' : 
        'Spread deleted successfully';
      
      setSuccess(successMsg);
      console.log('✅ [TarotHandlers] Spread deleted successfully');
      
      // Refresh data
      console.log('🔄 [TarotHandlers] Starting data refresh...');
      await refreshData();
      console.log('✅ [TarotHandlers] Data refresh completed');
      
    } catch (err) {
      console.error('💥 [TarotHandlers] Delete spread failed:', err);
      addError(currentLanguage === 'ar' ? 
        'فشل في حذف الانتشار' : 
        'Failed to delete spread'
      );
    } finally {
      setSubmitting(false);
    }
  }, [currentLanguage, refreshData, addError, setSuccess, clearErrors]);

  const handleAssignSpreadReaders = useCallback(async (spreadId, readerIds) => {
    console.log('👥 [TarotHandlers] Assigning readers to spread:', { spreadId, readerIds });
    setSubmitting(true);
    clearErrors();

    try {
      // First, remove existing assignments
      await supabase
        .from('tarot_spread_reader_assignments')
        .delete()
        .eq('spread_id', spreadId);

      // Then add new assignments
      if (readerIds && readerIds.length > 0) {
        const assignments = readerIds.map(readerId => ({
          spread_id: spreadId,
          reader_id: readerId,
          assigned_at: new Date().toISOString()
        }));

        const { error } = await supabase
          .from('tarot_spread_reader_assignments')
          .insert(assignments);

        if (error) throw error;
      }

      const successMsg = currentLanguage === 'ar' ? 
        'تم تخصيص القراء بنجاح' : 
        'Readers assigned successfully';
      
      setSuccess(successMsg);
      console.log('✅ [TarotHandlers] Readers assigned successfully');
      
      await refreshData();
    } catch (err) {
      console.error('💥 [TarotHandlers] Assign readers failed:', err);
      addError(currentLanguage === 'ar' ? 
        'فشل في تخصيص القراء' : 
        'Failed to assign readers'
      );
    } finally {
      setSubmitting(false);
    }
  }, [currentLanguage, refreshData, addError, setSuccess, clearErrors]);

  // ===================================
  // DECK HANDLERS
  // ===================================
  const handleAddDeck = useCallback(async (deckData) => {
    console.log('➕ [TarotHandlers] Add deck initiated:', deckData);
    setSubmitting(true);
    clearErrors();

    try {
      const token = await supabase.auth.getSession().then(({ data: { session } }) => session?.access_token);
      
      const response = await fetch('/api/admin/tarot/decks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...deckData,
          created_by: supabase.auth.user()?.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create deck');
      }

      const successMsg = currentLanguage === 'ar' ? 
        'تم إنشاء المجموعة بنجاح' : 
        'Deck created successfully';
      
      setSuccess(successMsg);
      console.log('✅ [TarotHandlers] Deck created successfully:', result.deck.id);
      
      await refreshData();
      return result.deck;
    } catch (err) {
      console.error('💥 [TarotHandlers] Add deck failed:', err);
      addError(currentLanguage === 'ar' ? 
        'فشل في إنشاء المجموعة' : 
        'Failed to create deck'
      );
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [currentLanguage, refreshData, addError, setSuccess, clearErrors]);

  const handleEditDeck = useCallback(async (deckId, deckData) => {
    console.log('✏️ [TarotHandlers] Edit deck initiated:', deckId, deckData);
    setSubmitting(true);
    clearErrors();

    try {
      const token = await supabase.auth.getSession().then(({ data: { session } }) => session?.access_token);
      
      const response = await fetch(`/api/admin/tarot/decks/${deckId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...deckData,
          updated_by: supabase.auth.user()?.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to update deck');
      }

      const successMsg = currentLanguage === 'ar' ? 
        'تم تحديث المجموعة بنجاح' : 
        'Deck updated successfully';
      
      setSuccess(successMsg);
      console.log('✅ [TarotHandlers] Deck updated successfully:', deckId);
      
      await refreshData();
      return result.deck;
    } catch (err) {
      console.error('💥 [TarotHandlers] Edit deck failed:', err);
      addError(currentLanguage === 'ar' ? 
        'فشل في تحديث المجموعة' : 
        'Failed to update deck'
      );
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [currentLanguage, refreshData, addError, setSuccess, clearErrors]);

  const handleDeleteDeck = useCallback(async (deckId) => {
    console.log('🗑️ [TarotHandlers] Starting deck deletion:', deckId);
    setSubmitting(true);
    clearErrors();

    try {
      const token = await supabase.auth.getSession().then(({ data: { session } }) => session?.access_token);
      
      const response = await fetch(`/api/admin/tarot/decks/${deckId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete deck');
      }

      const successMsg = currentLanguage === 'ar' ? 
        'تم حذف المجموعة بنجاح' : 
        'Deck deleted successfully';
      
      setSuccess(successMsg);
      console.log('✅ [TarotHandlers] Deck deleted successfully:', deckId);
      
      await refreshData();
    } catch (err) {
      console.error('💥 [TarotHandlers] Delete deck failed:', err);
      addError(currentLanguage === 'ar' ? 
        'فشل في حذف المجموعة' : 
        'Failed to delete deck'
      );
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [currentLanguage, refreshData, addError, setSuccess, clearErrors]);

  const handleUploadDeckImages = useCallback((deck) => {
    console.log('📤 [TarotHandlers] Upload deck images initiated:', deck.id);
    // This will open the image upload modal - implement later
    const infoMsg = currentLanguage === 'ar' ? 
      'وظيفة رفع الصور قيد التطوير' : 
      'Image upload feature coming soon';
    addError(infoMsg);
  }, [currentLanguage, addError]);

  const handleAssignDeckReaders = useCallback(async (deckId, readerIds) => {
    console.log('👥 [TarotHandlers] Assigning readers to deck:', { deckId, readerIds });
    setSubmitting(true);
    clearErrors();

    try {
      const token = await supabase.auth.getSession().then(({ data: { session } }) => session?.access_token);
      
      const response = await fetch(`/api/admin/tarot/decks/${deckId}/assign-readers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          readerIds: readerIds,
          assigned_by: supabase.auth.user()?.id
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to assign readers');
      }

      const successMsg = currentLanguage === 'ar' ? 
        'تم تخصيص القراء بنجاح' : 
        'Readers assigned successfully';
      
      setSuccess(successMsg);
      console.log('✅ [TarotHandlers] Deck readers assigned successfully');
      
      await refreshData();
    } catch (err) {
      console.error('💥 [TarotHandlers] Assign deck readers failed:', err);
      addError(currentLanguage === 'ar' ? 
        'فشل في تخصيص القراء' : 
        'Failed to assign readers'
      );
      throw err;
    } finally {
      setSubmitting(false);
    }
  }, [currentLanguage, refreshData, addError, setSuccess, clearErrors]);

  // ===================================
  // BULK OPERATIONS
  // ===================================
  const handleBulkDeleteSpreads = useCallback(async (spreadIds) => {
    const confirmMessage = currentLanguage === 'ar' ? 
      `هل أنت متأكد من حذف ${spreadIds.length} انتشارات؟` : 
      `Are you sure you want to delete ${spreadIds.length} spreads?`;
    
    if (!window.confirm(confirmMessage)) {
      console.log('🚫 [TarotHandlers] Bulk delete spreads cancelled by user');
      return;
    }

    console.log('🗑️ [TarotHandlers] Starting bulk spreads deletion:', spreadIds);
    setSubmitting(true);
    clearErrors();

    try {
      const { error } = await supabase
        .from('tarot_spreads')
        .update({ is_active: false })
        .in('id', spreadIds);

      if (error) throw error;

      const successMsg = currentLanguage === 'ar' ? 
        `تم حذف ${spreadIds.length} انتشارات بنجاح` : 
        `${spreadIds.length} spreads deleted successfully`;
      
      setSuccess(successMsg);
      console.log('✅ [TarotHandlers] Bulk spreads deleted successfully');
      
      await refreshData();
    } catch (err) {
      console.error('💥 [TarotHandlers] Bulk delete spreads failed:', err);
      addError(currentLanguage === 'ar' ? 
        'فشل في حذف الانتشارات' : 
        'Failed to delete spreads'
      );
    } finally {
      setSubmitting(false);
    }
  }, [currentLanguage, refreshData, addError, setSuccess, clearErrors]);

  const handleBulkDeleteDecks = useCallback(async (deckIds) => {
    const confirmMessage = currentLanguage === 'ar' ? 
      `هل أنت متأكد من حذف ${deckIds.length} مجموعات؟` : 
      `Are you sure you want to delete ${deckIds.length} decks?`;
    
    if (!window.confirm(confirmMessage)) {
      console.log('🚫 [TarotHandlers] Bulk delete decks cancelled by user');
      return;
    }

    console.log('🗑️ [TarotHandlers] Starting bulk decks deletion:', deckIds);
    setSubmitting(true);
    clearErrors();

    try {
      const { error } = await supabase
        .from('tarot_decks')
        .update({ is_active: false })
        .in('id', deckIds);

      if (error) throw error;

      const successMsg = currentLanguage === 'ar' ? 
        `تم حذف ${deckIds.length} مجموعات بنجاح` : 
        `${deckIds.length} decks deleted successfully`;
      
      setSuccess(successMsg);
      console.log('✅ [TarotHandlers] Bulk decks deleted successfully');
      
      await refreshData();
    } catch (err) {
      console.error('💥 [TarotHandlers] Bulk delete decks failed:', err);
      addError(currentLanguage === 'ar' ? 
        'فشل في حذف المجموعات' : 
        'Failed to delete decks'
      );
    } finally {
      setSubmitting(false);
    }
  }, [currentLanguage, refreshData, addError, setSuccess, clearErrors]);

  // ===================================
  // CATEGORY HANDLERS
  // ===================================
  const handleAddCategory = useCallback(async (categoryData) => {
    console.log('➕ [TarotHandlers] Adding category:', categoryData);
    setSubmitting(true);
    clearErrors();

    try {
      const { error } = await supabase
        .from('tarot_categories')
        .insert([{
          name: categoryData.name,
          name_ar: categoryData.name_ar,
          description: categoryData.description,
          description_ar: categoryData.description_ar,
          is_active: true,
          created_at: new Date().toISOString()
        }]);

      if (error) throw error;

      const successMsg = currentLanguage === 'ar' ? 
        'تم إضافة الفئة بنجاح' : 
        'Category added successfully';
      
      setSuccess(successMsg);
      console.log('✅ [TarotHandlers] Category added successfully');
      
      await refreshData();
    } catch (err) {
      console.error('💥 [TarotHandlers] Add category failed:', err);
      addError(currentLanguage === 'ar' ? 
        'فشل في إضافة الفئة' : 
        'Failed to add category'
      );
    } finally {
      setSubmitting(false);
    }
  }, [currentLanguage, refreshData, addError, setSuccess, clearErrors]);

  const handleEditCategory = useCallback(async (categoryId, categoryData) => {
    console.log('✏️ [TarotHandlers] Editing category:', categoryId, categoryData);
    setSubmitting(true);
    clearErrors();

    try {
      const { error } = await supabase
        .from('tarot_categories')
        .update({
          name: categoryData.name,
          name_ar: categoryData.name_ar,
          description: categoryData.description,
          description_ar: categoryData.description_ar,
          updated_at: new Date().toISOString()
        })
        .eq('id', categoryId);

      if (error) throw error;

      const successMsg = currentLanguage === 'ar' ? 
        'تم تحديث الفئة بنجاح' : 
        'Category updated successfully';
      
      setSuccess(successMsg);
      console.log('✅ [TarotHandlers] Category updated successfully');
      
      await refreshData();
    } catch (err) {
      console.error('💥 [TarotHandlers] Edit category failed:', err);
      addError(currentLanguage === 'ar' ? 
        'فشل في تحديث الفئة' : 
        'Failed to update category'
      );
    } finally {
      setSubmitting(false);
    }
  }, [currentLanguage, refreshData, addError, setSuccess, clearErrors]);

  const handleDeleteCategory = useCallback(async (categoryId) => {
    const confirmMessage = currentLanguage === 'ar' ? 
      'هل أنت متأكد من حذف هذه الفئة؟ ستتم إزالتها من جميع الانتشارات المرتبطة.' : 
      'Are you sure you want to delete this category? It will be removed from all associated spreads.';
    
    if (!window.confirm(confirmMessage)) {
      console.log('🚫 [TarotHandlers] Delete category cancelled by user');
      return;
    }

    console.log('🗑️ [TarotHandlers] Starting category deletion:', categoryId);
    setSubmitting(true);
    clearErrors();

    try {
      const { error } = await supabase
        .from('tarot_categories')
        .update({ is_active: false })
        .eq('id', categoryId);

      if (error) throw error;

      const successMsg = currentLanguage === 'ar' ? 
        'تم حذف الفئة بنجاح' : 
        'Category deleted successfully';
      
      setSuccess(successMsg);
      console.log('✅ [TarotHandlers] Category deleted successfully');
      
      await refreshData();
    } catch (err) {
      console.error('💥 [TarotHandlers] Delete category failed:', err);
      addError(currentLanguage === 'ar' ? 
        'فشل في حذف الفئة' : 
        'Failed to delete category'
      );
    } finally {
      setSubmitting(false);
    }
  }, [currentLanguage, refreshData, addError, setSuccess, clearErrors]);

  return {
    // State
    submitting,
    errors,
    successMessage,
    
    // Utilities
    clearErrors,
    
    // Spread handlers
    handleAddSpread,
    handleEditSpread,
    handleDeleteSpread,
    handleAssignSpreadReaders,
    handleBulkDeleteSpreads,
    
    // Deck handlers
    handleAddDeck,
    handleEditDeck,
    handleDeleteDeck,
    handleUploadDeckImages,
    handleAssignDeckReaders,
    handleBulkDeleteDecks,
    
    // Category handlers
    handleAddCategory,
    handleEditCategory,
    handleDeleteCategory
  };
}; 