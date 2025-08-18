/**
 * PostgreSQL Connection Helper - SAMIA TAROT
 * 
 * Simplified database connection with proper error handling
 * and type safety for the new flat table schema.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TABLES, TableName, validateTableNames } from './tables';

/**
 * Database connection configuration
 */
interface DatabaseConfig {
  supabaseUrl: string;
  supabaseKey: string;
  enforceRLS?: boolean;
  enableLogging?: boolean;
}

/**
 * Query result wrapper
 */
export interface QueryResult<T = any> {
  data: T | null;
  error: Error | null;
  count?: number;
}

/**
 * Database client wrapper with enhanced error handling
 */
export class DatabaseClient {
  private supabase: SupabaseClient;
  private config: DatabaseConfig;

  constructor(config: DatabaseConfig) {
    this.config = config;
    this.supabase = createClient(config.supabaseUrl, config.supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
      global: {
        headers: {
          ...(config.enforceRLS && { 'x-rls-enforced': 'true' }),
        },
      },
    });

    // Validate table names on initialization
    if (!validateTableNames()) {
      throw new Error('Invalid table name configuration detected');
    }
  }

  /**
   * Get Supabase client instance
   */
  getClient(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Execute a safe query with error handling
   */
  async query<T = any>(
    tableName: TableName,
    operation: (table: any) => Promise<any>
  ): Promise<QueryResult<T>> {
    try {
      if (this.config.enableLogging) {
        console.log(`🔍 Querying table: ${tableName}`);
      }

      const table = this.supabase.from(tableName);
      const result = await operation(table);

      if (result.error) {
        console.error(`❌ Database error on ${tableName}:`, result.error);
        return {
          data: null,
          error: new Error(`Database operation failed: ${result.error.message}`),
        };
      }

      return {
        data: result.data,
        error: null,
        count: result.count || undefined,
      };
    } catch (error) {
      console.error(`💥 Unexpected error querying ${tableName}:`, error);
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Unknown database error'),
      };
    }
  }

  /**
   * Insert single record
   */
  async insert<T = any>(tableName: TableName, data: Partial<T>): Promise<QueryResult<T>> {
    return this.query<T>(tableName, async (table) => {
      return await table.insert(data).select().single();
    });
  }

  /**
   * Insert multiple records
   */
  async insertMany<T = any>(tableName: TableName, data: Partial<T>[]): Promise<QueryResult<T[]>> {
    return this.query<T[]>(tableName, async (table) => {
      return await table.insert(data).select();
    });
  }

  /**
   * Update records with conditions
   */
  async update<T = any>(
    tableName: TableName,
    data: Partial<T>,
    conditions: Record<string, any>
  ): Promise<QueryResult<T[]>> {
    return this.query<T[]>(tableName, async (table) => {
      let query = table.update(data);
      
      // Apply conditions
      Object.entries(conditions).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      return await query.select();
    });
  }

  /**
   * Select records with conditions
   */
  async select<T = any>(
    tableName: TableName,
    options: {
      select?: string;
      conditions?: Record<string, any>;
      orderBy?: { column: string; ascending?: boolean };
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<QueryResult<T[]>> {
    return this.query<T[]>(tableName, async (table) => {
      let query = table.select(options.select || '*');

      // Apply conditions
      if (options.conditions) {
        Object.entries(options.conditions).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      // Apply ordering
      if (options.orderBy) {
        query = query.order(options.orderBy.column, { 
          ascending: options.orderBy.ascending ?? true 
        });
      }

      // Apply pagination
      if (options.limit) {
        query = query.limit(options.limit);
      }
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }

      return await query;
    });
  }

  /**
   * Delete records with conditions
   */
  async delete(
    tableName: TableName,
    conditions: Record<string, any>
  ): Promise<QueryResult<void>> {
    return this.query<void>(tableName, async (table) => {
      let query = table.delete();
      
      // Apply conditions
      Object.entries(conditions).forEach(([key, value]) => {
        query = query.eq(key, value);
      });

      return await query;
    });
  }

  /**
   * Execute raw SQL (use sparingly)
   */
  async raw<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T[]>> {
    try {
      if (this.config.enableLogging) {
        console.log(`🔍 Raw SQL:`, sql);
      }

      const { data, error } = await this.supabase.rpc('execute_sql', {
        sql_query: sql,
        sql_params: params,
      });

      if (error) {
        return {
          data: null,
          error: new Error(`Raw SQL error: ${error.message}`),
        };
      }

      return { data, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Raw SQL execution failed'),
      };
    }
  }

  /**
   * Test database connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from(TABLES.SYSTEM_SETTINGS)
        .select('id')
        .limit(1);

      if (error) {
        console.error('❌ Database connection test failed:', error);
        return false;
      }

      console.log('✅ Database connection successful');
      return true;
    } catch (error) {
      console.error('💥 Database connection test error:', error);
      return false;
    }
  }

  /**
   * Check if new production tables exist
   */
  async validateProductionSchema(): Promise<boolean> {
    try {
      const tablesToCheck = [
        TABLES.DECK_CARDS,
        TABLES.CALL_CONSENT_LOGS,
        TABLES.READER_AVAILABILITY,
        TABLES.TAROT_V2_CARD_SELECTIONS,
        TABLES.PAYMENT_TRANSACTIONS,
        TABLES.USER_WALLETS,
      ];

      for (const tableName of tablesToCheck) {
        const { error } = await this.supabase
          .from(tableName)
          .select('*')
          .limit(0);

        if (error) {
          console.error(`❌ Table ${tableName} not accessible:`, error.message);
          return false;
        }
      }

      console.log('✅ All production tables accessible');
      return true;
    } catch (error) {
      console.error('💥 Schema validation error:', error);
      return false;
    }
  }
}

/**
 * Create database client instance
 */
export const createDatabaseClient = (config: DatabaseConfig): DatabaseClient => {
  return new DatabaseClient(config);
};

/**
 * Default client for production
 */
export const createProductionClient = (): DatabaseClient => {
  const config: DatabaseConfig = {
    supabaseUrl: process.env.SUPABASE_URL || '',
    supabaseKey: process.env.SUPABASE_ANON_KEY || '',
    enforceRLS: true,
    enableLogging: process.env.NODE_ENV === 'development',
  };

  if (!config.supabaseUrl || !config.supabaseKey) {
    throw new Error('Missing required Supabase configuration');
  }

  return createDatabaseClient(config);
};

/**
 * Type-safe query builder
 */
export class TypedQueryBuilder<T> {
  constructor(
    private client: DatabaseClient,
    private tableName: TableName
  ) {}

  async insert(data: Partial<T>): Promise<QueryResult<T>> {
    return this.client.insert<T>(this.tableName, data);
  }

  async update(data: Partial<T>, conditions: Record<string, any>): Promise<QueryResult<T[]>> {
    return this.client.update<T>(this.tableName, data, conditions);
  }

  async select(options?: Parameters<DatabaseClient['select']>[1]): Promise<QueryResult<T[]>> {
    return this.client.select<T>(this.tableName, options);
  }

  async delete(conditions: Record<string, any>): Promise<QueryResult<void>> {
    return this.client.delete(this.tableName, conditions);
  }
}

/**
 * Create typed query builder
 */
export const createTypedQuery = <T>(
  client: DatabaseClient,
  tableName: TableName
): TypedQueryBuilder<T> => {
  return new TypedQueryBuilder<T>(client, tableName);
};