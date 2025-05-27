# 🚀 SUPABASE SETUP GUIDE - SAMIA TAROT

This guide will help you set up your Supabase database and configure your project for full functionality.

## 📋 Prerequisites

- Supabase account (free tier is sufficient)
- Access to your Supabase project dashboard
- Basic understanding of SQL

## 🔧 Step 1: Database Schema Setup

1. **Open Supabase SQL Editor**
   - Go to your Supabase project dashboard
   - Navigate to `SQL Editor` in the left sidebar
   - Click `New Query`

2. **Run the Schema Script**
   - Copy the entire content from `database/schema.sql`
   - Paste it into the SQL editor
   - Click `Run` to execute the script

3. **Verify Tables Creation**
   - Go to `Table Editor` in the left sidebar
   - You should see the following tables:
     - `profiles`
     - `services`
     - `bookings`
     - `payments`
     - `messages`
     - `reviews`
     - `notifications`

## 🔐 Step 2: Authentication Configuration

1. **Enable Authentication Providers**
   - Go to `Authentication` > `Providers`
   - Enable the following providers:
     - ✅ Google OAuth
     - ✅ Phone (SMS/WhatsApp)
     - ✅ Email (if needed)

2. **Configure Google OAuth**
   - Add your Google Client ID: `986731878819-0m1c37imfcna13b6r2j8pkscf04rieca.apps.googleusercontent.com`
   - Add your Google Client Secret (from your Google Console)
   - Set redirect URL: `https://uusefmlielktdcltzwzt.supabase.co/auth/v1/callback`

3. **Configure Phone Authentication**
   - Enable Phone provider
   - Configure Twilio settings:
     - Account SID: `ACbea6761e4edb95a695c739b733ff33e4`
     - Message Service SID: `VA8be8fc33969f9e3dbf23e16fd4174e00`
     - Auth Token: (Add your Twilio auth token)

## 📁 Step 3: Storage Setup

1. **Create Storage Buckets**
   - Go to `Storage` in the left sidebar
   - Create the following buckets:
     - `profile-pictures` (for user avatars)
     - `chat-files` (for message attachments)
     - `service-images` (for service photos)

2. **Configure Bucket Policies**
   ```sql
   -- Profile pictures bucket policy
   create policy "Users can upload their own profile pictures" on storage.objects
     for insert with check (bucket_id = 'profile-pictures' and auth.uid()::text = (storage.foldername(name))[1]);

   create policy "Profile pictures are publicly viewable" on storage.objects
     for select using (bucket_id = 'profile-pictures');

   -- Chat files bucket policy
   create policy "Users can upload chat files" on storage.objects
     for insert with check (bucket_id = 'chat-files' and auth.uid() is not null);

   create policy "Users can view chat files they have access to" on storage.objects
     for select using (bucket_id = 'chat-files' and auth.uid() is not null);
   ```

## 🌐 Step 4: Environment Configuration

1. **Copy Environment Variables**
   - Copy `.env.example` to `.env`
   - Update the values with your actual credentials:

   ```env
   # Supabase Configuration
   VITE_SUPABASE_URL=https://uusefmlielktdcltzwzt.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here

   # Twilio Configuration
   VITE_TWILIO_ACCOUNT_SID=ACbea6761e4edb95a695c739b733ff33e4
   VITE_TWILIO_MESSAGE_SERVICE_SID=VA8be8fc33969f9e3dbf23e16fd4174e00

   # Google OAuth Configuration
   VITE_GOOGLE_CLIENT_ID=986731878819-0m1c37imfcna13b6r2j8pkscf04rieca.apps.googleusercontent.com

   # reCAPTCHA Configuration
   VITE_RECAPTCHA_SITE_KEY=6LfwzksrAAAAAAx_w7utBIM572cyg3bDMj10yVw2

   # Backend Configuration
   VITE_BACKEND_URL=http://localhost:3001
   ```

## 🎯 Step 5: Seed Data (Optional)

Add some test data to get started:

```sql
-- Create a test reader profile
INSERT INTO profiles (id, first_name, last_name, zodiac, country, role)
VALUES (gen_random_uuid(), 'Samia', 'Tarot', 'Virgo', 'Lebanon', 'reader');

-- Add sample services
INSERT INTO services (name, description, type, duration_minutes, price, is_vip, reader_id)
SELECT 
  'Tarot Reading', 
  'Complete tarot card reading session', 
  'tarot', 
  30, 
  49.99, 
  false,
  id 
FROM profiles WHERE role = 'reader' LIMIT 1;

INSERT INTO services (name, description, type, duration_minutes, price, is_vip, reader_id)
SELECT 
  'VIP Tarot Reading', 
  'Premium tarot reading with detailed analysis', 
  'tarot', 
  60, 
  99.99, 
  true,
  id 
FROM profiles WHERE role = 'reader' LIMIT 1;

INSERT INTO services (name, description, type, duration_minutes, price, is_vip, reader_id)
SELECT 
  'Coffee Reading', 
  'Traditional coffee cup fortune telling', 
  'coffee', 
  20, 
  29.99, 
  false,
  id 
FROM profiles WHERE role = 'reader' LIMIT 1;
```

## 🧪 Step 6: Test the Setup

1. **Test Authentication**
   - Run your React app: `npm run dev`
   - Try signing up with Google OAuth
   - Try phone authentication
   - Verify user profile is created in `profiles` table

2. **Test Database Operations**
   - Check if profile is automatically created after signup
   - Try updating profile information
   - Test creating a booking

3. **Test API Functions**
   ```javascript
   import { UserAPI } from './src/api/userApi.js';

   // Test getting current user
   const user = await UserAPI.getCurrentUser();
   console.log('Current user:', user);

   // Test getting user stats
   if (user.success && user.data) {
     const stats = await UserAPI.getUserStats(user.data.id);
     console.log('User stats:', stats);
   }
   ```

## 🔍 Step 7: Verify RLS Policies

Test that Row Level Security is working:

1. **Create a test user**
2. **Try accessing data from different user contexts**
3. **Verify users can only see their own data**

## 🚨 Troubleshooting

### Common Issues:

1. **Authentication not working**
   - Check if providers are enabled in Supabase
   - Verify redirect URLs are correct
   - Check environment variables

2. **Database queries failing**
   - Verify RLS policies are set up correctly
   - Check if user is authenticated
   - Review table permissions

3. **Storage uploads failing**
   - Check bucket policies
   - Verify bucket names match your code
   - Ensure user is authenticated

### Debug Commands:

```javascript
// Check current session
const session = await supabase.auth.getSession();
console.log('Session:', session);

// Check current user
const user = await supabase.auth.getUser();
console.log('User:', user);

// Test database connection
const { data, error } = await supabase.from('profiles').select('count');
console.log('DB Test:', { data, error });
```

## ✅ Success Checklist

- [ ] All database tables created successfully
- [ ] RLS policies are active and working
- [ ] Authentication providers configured
- [ ] Storage buckets created with proper policies
- [ ] Environment variables set up
- [ ] Test user can sign up and sign in
- [ ] Profile is automatically created on signup
- [ ] API functions work correctly
- [ ] Frontend can connect to Supabase

## 🎉 Next Steps

Once your Supabase setup is complete, you can proceed to:

1. **User Dashboards** - Create role-based dashboards
2. **Booking System** - Implement service booking flow
3. **Payment Integration** - Add Stripe/Square payment processing
4. **Real-time Chat** - Build messaging system
5. **Admin Panel** - Create admin management interface

## 📞 Support

If you encounter any issues:

1. Check the Supabase documentation
2. Review the error logs in Supabase dashboard
3. Test with the provided debug commands
4. Verify all environment variables are correct

---

**🔮 Your Samia Tarot platform foundation is now ready!** 