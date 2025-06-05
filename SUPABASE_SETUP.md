# 🚀 SAMIA TAROT - Supabase Database Setup Guide

## 📋 Quick Setup Instructions

### Option 1: Manual Setup (Recommended)

1. **Open Supabase SQL Editor**
   - Go to your Supabase project dashboard: https://uusefmlielktdcltzwzt.supabase.co
   - Click **"SQL Editor"** in the left sidebar
   - Click **"New Query"**

2. **Execute the Schema**
   - Copy the entire contents of `database/schema.sql`
   - Paste it into the SQL Editor
   - Click **"RUN"** to execute

3. **Set up Storage Buckets**
   - Copy the entire contents of `database/storage-policies.sql`
   - Paste it into a new SQL query
   - Click **"RUN"** to execute

4. **Verify Setup**
   - Go to **"Table Editor"** in the left sidebar
   - You should see 7 new tables: `profiles`, `services`, `bookings`, `payments`, `messages`, `reviews`, `notifications`
   - Go to **"Storage"** and verify `profile-pictures` and `chat-files` buckets exist

### Option 2: Test Connection First

Run this command to test your Supabase connection:

```bash
npm run dev
```

Then visit: http://localhost:5173/test

---

## 🗄️ Database Schema Overview

### Tables Created:

1. **`profiles`** - Extended user information with roles
2. **`services`** - Available spiritual services (tarot, coffee, palm, etc.)
3. **`bookings`** - User appointments with readers
4. **`payments`** - Payment transactions
5. **`messages`** - Chat system between users and readers
6. **`reviews`** - User reviews and ratings
7. **`notifications`** - System notifications

### Storage Buckets:

1. **`profile-pictures`** - User avatar images (public)
2. **`chat-files`** - Voice messages and file attachments (private)

### Features Included:

✅ **Row Level Security (RLS)** - Secure data access  
✅ **Auto-profile creation** - Profiles created on user signup  
✅ **Performance indexes** - Optimized queries  
✅ **Sample data** - 11 pre-loaded services  
✅ **Triggers** - Automatic timestamp updates  
✅ **Storage policies** - Secure file upload/access  
✅ **Role-based dashboards** - Client and Reader interfaces  

---

## 🔧 Manual SQL Execution

If you prefer to run the SQL manually, here are the key sections:

### 1. Create Tables
```sql
-- Copy from database/schema.sql lines 1-150
-- This creates all 7 tables with proper relationships
```

### 2. Enable RLS and Policies
```sql
-- Copy from database/schema.sql lines 151-250
-- This sets up security policies
```

### 3. Create Functions and Triggers
```sql
-- Copy from database/schema.sql lines 251-300
-- This adds auto-profile creation and timestamps
```

### 4. Insert Sample Data
```sql
-- Copy from database/schema.sql lines 301-350
-- This adds 11 sample services
```

### 5. Set up Storage
```sql
-- Copy from database/storage-policies.sql
-- This creates storage buckets and policies
```

---

## ✅ Verification Steps

After running the schema, verify everything works:

### 1. Check Tables
Go to **Table Editor** and confirm these tables exist:
- ✅ profiles
- ✅ services  
- ✅ bookings
- ✅ payments
- ✅ messages
- ✅ reviews
- ✅ notifications

### 2. Check Storage
Go to **Storage** and confirm these buckets exist:
- ✅ profile-pictures (public)
- ✅ chat-files (private)

### 3. Check Sample Data
In the **services** table, you should see 11 services:
- Classic Tarot Reading ($25)
- VIP Tarot Reading ($75)
- AI-Enhanced Tarot ($35)
- Turkish Coffee Reading ($20)
- VIP Coffee Reading ($60)
- Palm Reading ($30)
- VIP Palm Reading ($80)
- Dream Analysis ($40)
- VIP Dream Analysis ($90)
- Emergency Spiritual Call ($50)
- VIP Emergency Call ($120)

### 4. Test Authentication
Try signing up a new user - a profile should be automatically created in the `profiles` table.

### 5. Test Dashboards
- Visit: http://localhost:5173/dashboard/client (for clients)
- Visit: http://localhost:5173/dashboard/reader (for readers)

---

## 🚨 Troubleshooting

### Issue: Tables not created
**Solution:** Make sure you're using the **service_role** key, not the anon key.

### Issue: RLS policies blocking access
**Solution:** Check that your user has the correct role in the `profiles` table.

### Issue: Sample data not inserted
**Solution:** Re-run just the INSERT statements from the schema file.

### Issue: Auto-profile creation not working
**Solution:** Verify the trigger was created by checking the **Database** > **Triggers** section.

### Issue: Storage buckets not created
**Solution:** Run the storage-policies.sql file separately and check **Storage** section.

### Issue: Avatar upload failing
**Solution:** Verify storage policies are applied and bucket permissions are correct.

---

## 🎯 Next Steps

Once your database is set up:

1. **Test the connection** with the React app
2. **Test role-based dashboards**:
   - Client Dashboard: `/dashboard/client`
   - Reader Dashboard: `/dashboard/reader`
3. **Test the booking system**: `/book`
4. **Add payment integration**
5. **Build admin and monitor dashboards**

---

## 🔮 Reader Dashboard Features

The Reader Dashboard includes:

### 📄 Profile Tab:
- ✅ View/edit profile information
- ✅ Avatar upload with Supabase storage
- ✅ Bio, specialties, and languages management
- ✅ Zodiac sign and country settings

### 🧙 Services Tab:
- ✅ View all available services
- ✅ Toggle service availability ON/OFF
- ✅ Service pricing and duration display
- ✅ VIP service indicators

### 📅 Calendar Tab:
- ✅ Today's bookings overview
- ✅ Upcoming sessions list
- ✅ Complete bookings table with filters
- ✅ Client information and booking status
- ✅ Service type filtering

### 💬 Chat Tab:
- ✅ Real-time conversation list
- ✅ Message history with clients
- ✅ Voice message recording capability
- ✅ "Finish Reading" button to complete sessions
- ✅ Message input disabled after completion

---

## 📞 Need Help?

If you encounter any issues:

1. Check the Supabase logs in **Logs** > **Database**
2. Verify your service_role key has admin permissions
3. Make sure all foreign key relationships are properly created
4. Test individual table creation if the full schema fails
5. Check storage bucket policies in **Storage** > **Policies**

---

**🎉 Once complete, your SAMIA TAROT platform will be fully operational with complete Reader Dashboard functionality!** 