import { supabase } from '../lib/supabase.js';

export const BusinessAPI = {
  // Reader Business Profile Management
  async getBusinessProfile(readerId) {
    try {
      const { data, error } = await supabase
        .from('reader_business_profiles')
        .select('*')
        .eq('reader_id', readerId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching business profile:', error);
      return { success: false, error: error.message };
    }
  },

  async updateBusinessProfile(readerId, profileData) {
    try {
      const { data, error } = await supabase
        .from('reader_business_profiles')
        .upsert({
          reader_id: readerId,
          ...profileData,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating business profile:', error);
      return { success: false, error: error.message };
    }
  },

  // Financial Transactions
  async getFinancialTransactions(readerId, filters = {}) {
    try {
      let query = supabase
        .from('financial_transactions')
        .select('*')
        .eq('reader_id', readerId)
        .order('created_at', { ascending: false });

      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      if (filters.type) {
        query = query.eq('transaction_type', filters.type);
      }
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return { success: false, error: error.message };
    }
  },

  async createTransaction(transactionData) {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .insert(transactionData)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating transaction:', error);
      return { success: false, error: error.message };
    }
  },

  // Client Relationship Management
  async getClientRelationships(readerId) {
    try {
      const { data, error } = await supabase
        .from('client_relationships')
        .select(`
          *,
          client:client_id(
            id,
            first_name,
            last_name,
            avatar_url,
            email
          )
        `)
        .eq('reader_id', readerId)
        .order('last_interaction', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching client relationships:', error);
      return { success: false, error: error.message };
    }
  },

  async updateClientRelationship(relationshipId, updateData) {
    try {
      const { data, error } = await supabase
        .from('client_relationships')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', relationshipId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating client relationship:', error);
      return { success: false, error: error.message };
    }
  },

  // Service Package Management
  async getServicePackages(readerId) {
    try {
      const { data, error } = await supabase
        .from('service_packages')
        .select('*')
        .eq('reader_id', readerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching service packages:', error);
      return { success: false, error: error.message };
    }
  },

  async createServicePackage(packageData) {
    try {
      const { data, error } = await supabase
        .from('service_packages')
        .insert(packageData)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating service package:', error);
      return { success: false, error: error.message };
    }
  },

  async updateServicePackage(packageId, updateData) {
    try {
      const { data, error } = await supabase
        .from('service_packages')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', packageId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating service package:', error);
      return { success: false, error: error.message };
    }
  },

  // Business Analytics
  async getBusinessMetrics(readerId, period = '30d') {
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      switch (period) {
        case '7d':
          startDate.setDate(endDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(endDate.getDate() - 30);
          break;
        case '90d':
          startDate.setDate(endDate.getDate() - 90);
          break;
        case '1y':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
        default:
          startDate.setDate(endDate.getDate() - 30);
      }

      // Get revenue metrics
      const { data: transactions } = await supabase
        .from('financial_transactions')
        .select('amount, transaction_type, created_at')
        .eq('reader_id', readerId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Get session metrics
      const { data: sessions } = await supabase
        .from('reading_sessions')
        .select('status, duration_minutes, created_at, rating')
        .eq('reader_id', readerId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Calculate metrics
      const revenue = transactions
        ?.filter(t => t.transaction_type === 'earning')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

      const completedSessions = sessions?.filter(s => s.status === 'completed') || [];
      const averageRating = completedSessions.length > 0
        ? completedSessions.reduce((sum, s) => sum + (s.rating || 0), 0) / completedSessions.length
        : 0;

      const metrics = {
        revenue,
        totalSessions: sessions?.length || 0,
        completedSessions: completedSessions.length,
        averageRating,
        averageSessionDuration: completedSessions.length > 0
          ? completedSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / completedSessions.length
          : 0
      };

      return { success: true, data: metrics };
    } catch (error) {
      console.error('Error fetching business metrics:', error);
      return { success: false, error: error.message };
    }
  },

  // Payout Management
  async requestPayout(readerId, amount, paymentMethod) {
    try {
      const { data, error } = await supabase
        .from('financial_transactions')
        .insert({
          reader_id: readerId,
          transaction_type: 'payout',
          amount: -Math.abs(amount),
          payment_method: paymentMethod,
          status: 'pending',
          description: 'Payout request'
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error requesting payout:', error);
      return { success: false, error: error.message };
    }
  },

  // Integration Management
  async getIntegrations(readerId) {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('reader_id', readerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching integrations:', error);
      return { success: false, error: error.message };
    }
  },

  async createIntegration(integrationData) {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .insert(integrationData)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating integration:', error);
      return { success: false, error: error.message };
    }
  },

  async updateIntegration(integrationId, updateData) {
    try {
      const { data, error } = await supabase
        .from('integrations')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', integrationId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating integration:', error);
      return { success: false, error: error.message };
    }
  },

  // Business Insights
  async getBusinessInsights(readerId) {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get revenue data
      const { data: transactions } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('reader_id', readerId)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      // Get client data
      const { data: clients } = await supabase
        .from('client_relationships')
        .select('*')
        .eq('reader_id', readerId);

      // Get package data
      const { data: packages } = await supabase
        .from('service_packages')
        .select('*')
        .eq('reader_id', readerId);

      // Calculate insights
      const currentRevenue = transactions
        ?.filter(t => t.transaction_type === 'earning')
        .reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

      const previousPeriodStart = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      const { data: previousTransactions } = await supabase
        .from('financial_transactions')
        .select('*')
        .eq('reader_id', readerId)
        .eq('transaction_type', 'earning')
        .gte('created_at', previousPeriodStart.toISOString())
        .lt('created_at', startDate.toISOString());

      const previousRevenue = previousTransactions
        ?.reduce((sum, t) => sum + parseFloat(t.amount), 0) || 0;

      const revenueGrowth = previousRevenue > 0 
        ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
        : 0;

      const activeClients = clients?.filter(c => c.relationship_status === 'active').length || 0;
      const totalClients = clients?.length || 0;
      const retentionRate = totalClients > 0 ? (activeClients / totalClients) * 100 : 0;
      const averageClientValue = totalClients > 0 
        ? clients.reduce((sum, c) => sum + (c.total_spent || 0), 0) / totalClients 
        : 0;

      const activePackages = packages?.filter(p => p.is_active).length || 0;
      const totalPackageSales = packages?.reduce((sum, p) => sum + (p.sales_count || 0), 0) || 0;

      const successfulTransactions = transactions?.filter(t => t.status === 'completed').length || 0;
      const totalTransactions = transactions?.length || 0;
      const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;

      const insights = {
        revenue: {
          currentPeriodRevenue: currentRevenue,
          previousPeriodRevenue: previousRevenue,
          growthPercentage: revenueGrowth,
          trend: revenueGrowth > 0 ? 'up' : revenueGrowth < 0 ? 'down' : 'stable'
        },
        clients: {
          totalClients,
          activeClients,
          retentionRate,
          averageClientValue
        },
        packages: {
          activePackages,
          totalSales: totalPackageSales
        },
        transactions: {
          successRate
        },
        recommendations: [
          {
            title: "Optimize Peak Hours",
            description: "Focus on availability during high-demand periods to maximize revenue",
            action: "Update Schedule",
            priority: "medium"
          },
          {
            title: "Client Retention Strategy",
            description: "Implement follow-up communications to improve client retention",
            action: "Create Campaign",
            priority: "high"
          },
          {
            title: "Package Optimization",
            description: "Review and optimize service packages based on client preferences",
            action: "Review Packages",
            priority: "low"
          }
        ]
      };

      return { success: true, data: insights };
    } catch (error) {
      console.error('Error fetching business insights:', error);
      return { success: false, error: error.message };
    }
  }
}; 