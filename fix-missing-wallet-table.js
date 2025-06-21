#!/usr/bin/env node

/**
 * 🔧 SAMIA TAROT - Fix Missing Wallet Table
 * Creates the missing user_wallets table
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://uuseflmielktdcltzwzt.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODM0NTExNSwiZXhwIjoyMDYzOTIxMTE1fQ.TNcj0otaeYtl0nDJYn760wSgSuKSYG8s7r-LD04Z9_E';

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createUserWalletsTable() {
  console.log('🔧 Creating missing user_wallets table...');
  
  try {
    const createTableSQL = `
      -- Create user_wallets table
      CREATE TABLE IF NOT EXISTS user_wallets (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        balance DECIMAL(10,2) DEFAULT 0.00 CHECK (balance >= 0),
        currency VARCHAR(3) DEFAULT 'USD',
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'closed')),
        last_transaction_id UUID,
        last_transaction_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, currency)
      );

      -- Create wallet_transactions table
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        wallet_id UUID NOT NULL REFERENCES user_wallets(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
        transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('credit', 'debit', 'transfer_in', 'transfer_out', 'refund', 'bonus')),
        amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
        balance_before DECIMAL(10,2) NOT NULL,
        balance_after DECIMAL(10,2) NOT NULL,
        reference_id UUID, -- Reference to payment, booking, etc.
        reference_type VARCHAR(50), -- 'payment', 'booking', 'refund', etc.
        description TEXT,
        metadata JSONB DEFAULT '{}',
        status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create indexes for better performance
      CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_wallets_status ON user_wallets(status);
      CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
      CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON wallet_transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON wallet_transactions(transaction_type);
      CREATE INDEX IF NOT EXISTS idx_wallet_transactions_reference ON wallet_transactions(reference_id, reference_type);
      CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created_at ON wallet_transactions(created_at);

      -- Enable RLS
      ALTER TABLE user_wallets ENABLE ROW LEVEL SECURITY;
      ALTER TABLE wallet_transactions ENABLE ROW LEVEL SECURITY;

      -- Create RLS policies for user_wallets
      CREATE POLICY "Users can view their own wallet" ON user_wallets
        FOR SELECT USING (auth.uid() = user_id);

      CREATE POLICY "Users can update their own wallet" ON user_wallets
        FOR UPDATE USING (auth.uid() = user_id);

      CREATE POLICY "Admins can view all wallets" ON user_wallets
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
          )
        );

      -- Create RLS policies for wallet_transactions
      CREATE POLICY "Users can view their own transactions" ON wallet_transactions
        FOR SELECT USING (auth.uid() = user_id);

      CREATE POLICY "System can insert transactions" ON wallet_transactions
        FOR INSERT WITH CHECK (true);

      CREATE POLICY "Admins can view all transactions" ON wallet_transactions
        FOR ALL USING (
          EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role IN ('admin', 'super_admin')
          )
        );

      -- Create function to update wallet balance
      CREATE OR REPLACE FUNCTION update_wallet_balance()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Update the updated_at timestamp
        NEW.updated_at = NOW();
        
        -- Update last transaction info
        IF TG_OP = 'INSERT' THEN
          UPDATE user_wallets 
          SET 
            last_transaction_id = NEW.id,
            last_transaction_date = NEW.created_at,
            updated_at = NOW()
          WHERE id = NEW.wallet_id;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Create trigger for wallet balance updates
      CREATE TRIGGER trigger_update_wallet_balance
        BEFORE INSERT OR UPDATE ON wallet_transactions
        FOR EACH ROW
        EXECUTE FUNCTION update_wallet_balance();

      -- Create function to create default wallet for new users
      CREATE OR REPLACE FUNCTION create_default_wallet()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO user_wallets (user_id, balance, currency, status)
        VALUES (NEW.id, 0.00, 'USD', 'active')
        ON CONFLICT (user_id, currency) DO NOTHING;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Create trigger to auto-create wallet for new users
      CREATE TRIGGER trigger_create_default_wallet
        AFTER INSERT ON profiles
        FOR EACH ROW
        EXECUTE FUNCTION create_default_wallet();
    `;

    const { error } = await supabase.rpc('exec_sql', { 
      sql_query: createTableSQL 
    });

    if (error) {
      console.log('❌ Failed to create user_wallets table:', error.message);
      return false;
    }

    console.log('✅ user_wallets table created successfully');

    // Create default wallets for existing users
    console.log('🔧 Creating default wallets for existing users...');
    
    const { data: existingUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id');

    if (usersError) {
      console.log('⚠️  Could not fetch existing users:', usersError.message);
    } else {
      let walletsCreated = 0;
      for (const user of existingUsers) {
        const { error: walletError } = await supabase
          .from('user_wallets')
          .insert({
            user_id: user.id,
            balance: 0.00,
            currency: 'USD',
            status: 'active'
          });

        if (!walletError) {
          walletsCreated++;
        }
      }
      console.log(`✅ Created ${walletsCreated} default wallets for existing users`);
    }

    // Test the new table
    console.log('🧪 Testing user_wallets table...');
    const { data: testWallets, error: testError } = await supabase
      .from('user_wallets')
      .select('*')
      .limit(5);

    if (testError) {
      console.log('❌ user_wallets table test failed:', testError.message);
      return false;
    }

    console.log(`✅ user_wallets table test passed (${testWallets.length} wallets found)`);
    return true;

  } catch (error) {
    console.error('💥 Error creating user_wallets table:', error);
    return false;
  }
}

// Execute the fix
createUserWalletsTable().then(success => {
  if (success) {
    console.log('\n🎉 user_wallets table fix completed successfully!');
    console.log('📋 Next steps:');
    console.log('1. Re-run API validation tests');
    console.log('2. Test wallet functionality in the frontend');
    console.log('3. Verify wallet transactions work correctly');
  } else {
    console.log('\n❌ user_wallets table fix failed!');
    process.exit(1);
  }
}); 