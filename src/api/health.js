/**
 * Health Check API Endpoint
 * SAMIA TAROT Platform
 */

import { supabase } from './lib/supabase.js';

/**
 * Application health status
 */
export class HealthAPI {
  /**
   * Get comprehensive health status
   */
  static async getHealthStatus() {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      environment: import.meta.env.VITE_ENV || 'production',
      checks: {}
    };

    try {
      // Database health check
      health.checks.database = await this.checkDatabase();
      
      // Authentication health check
      health.checks.authentication = await this.checkAuthentication();
      
      // Storage health check
      health.checks.storage = await this.checkStorage();
      
      // External services health check
      health.checks.externalServices = await this.checkExternalServices();

      // Determine overall health
      const allHealthy = Object.values(health.checks).every(
        check => check.status === 'healthy'
      );
      
      health.status = allHealthy ? 'healthy' : 'degraded';
      
      return {
        success: true,
        data: health,
        error: null
      };

    } catch (error) {
      return {
        success: false,
        data: {
          ...health,
          status: 'unhealthy',
          error: error.message
        },
        error: error.message
      };
    }
  }

  /**
   * Check database connectivity
   */
  static async checkDatabase() {
    try {
      const startTime = Date.now();
      
      // Simple query to test database connection
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);

      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          status: 'unhealthy',
          error: error.message,
          responseTime
        };
      }

      return {
        status: 'healthy',
        responseTime,
        message: 'Database connection successful'
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        message: 'Database connection failed'
      };
    }
  }

  /**
   * Check authentication service
   */
  static async checkAuthentication() {
    try {
      const startTime = Date.now();
      
      // Test auth service availability
      const { data: { session }, error } = await supabase.auth.getSession();
      
      const responseTime = Date.now() - startTime;

      if (error && error.message !== 'No session found') {
        return {
          status: 'unhealthy',
          error: error.message,
          responseTime
        };
      }

      return {
        status: 'healthy',
        responseTime,
        authenticated: !!session,
        message: 'Authentication service operational'
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        message: 'Authentication service unavailable'
      };
    }
  }

  /**
   * Check storage service
   */
  static async checkStorage() {
    try {
      const startTime = Date.now();
      
      // Test storage service by listing buckets
      const { data, error } = await supabase.storage.listBuckets();
      
      const responseTime = Date.now() - startTime;

      if (error) {
        return {
          status: 'degraded',
          error: error.message,
          responseTime,
          message: 'Storage service may have limited functionality'
        };
      }

      return {
        status: 'healthy',
        responseTime,
        bucketsCount: data?.length || 0,
        message: 'Storage service operational'
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        message: 'Storage service unavailable'
      };
    }
  }

  /**
   * Check external services
   */
  static async checkExternalServices() {
    const services = [];
    
    // Check Stripe (if available)
    if (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY) {
      services.push(this.checkStripe());
    }

    // Check other external services here
    // e.g., OpenAI API, Twilio, etc.

    try {
      const results = await Promise.allSettled(services);
      const healthyServices = results.filter(r => r.status === 'fulfilled').length;
      const totalServices = results.length;

      return {
        status: healthyServices === totalServices ? 'healthy' : 'degraded',
        healthyServices,
        totalServices,
        details: results.map((result, index) => ({
          service: `external_service_${index}`,
          status: result.status,
          ...(result.status === 'fulfilled' ? result.value : { error: result.reason })
        }))
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        message: 'External services check failed'
      };
    }
  }

  /**
   * Check Stripe connectivity
   */
  static async checkStripe() {
    try {
      // Basic check - just verify we can load Stripe
      const stripe = await import('@stripe/stripe-js').then(module => 
        module.loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)
      );

      return {
        status: 'healthy',
        service: 'stripe',
        message: 'Stripe service loaded successfully'
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        service: 'stripe',
        error: error.message,
        message: 'Stripe service unavailable'
      };
    }
  }

  /**
   * Get basic health status (minimal check)
   */
  static async getBasicHealth() {
    try {
      return {
        success: true,
        data: {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          uptime: process.uptime ? process.uptime() : 'unknown',
          version: import.meta.env.VITE_APP_VERSION || '1.0.0'
        },
        error: null
      };
    } catch (error) {
      return {
        success: false,
        data: {
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          error: error.message
        },
        error: error.message
      };
    }
  }
}

// Export default for direct endpoint use
export default HealthAPI; 