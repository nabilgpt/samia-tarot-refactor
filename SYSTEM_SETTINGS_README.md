# SAMIA TAROT - System Settings & AI Management

## 🚀 New Features Added

This update adds comprehensive **System Settings** management to the Admin Dashboard, allowing dynamic configuration of AI providers, database settings, and storage without code changes.

## 📋 Features Overview

### 1. **AI Providers Management**
- ✅ Add/Edit/Delete AI providers (OpenAI, Google Gemini, Anthropic Claude, Custom)
- ✅ Manage API keys and host URLs
- ✅ Configure available models for each provider
- ✅ Set active models dynamically
- ✅ Test connections before saving
- ✅ Quick setup with default provider templates

### 2. **Database & Storage Configuration**
- ✅ Dynamic Supabase configuration (Project URL, Anon Key, Service Key)
- ✅ Backblaze B2 storage setup (Bucket, Access Keys, Region, Endpoint)
- ✅ Connection testing for both services
- ✅ Secure credential storage with show/hide functionality

### 3. **Enhanced Notification System**
- ✅ Broadcast notifications to specific user groups (Clients, Readers, Monitors)
- ✅ Priority levels and delivery tracking
- ✅ Rich text message support
- ✅ Delivery status monitoring

### 4. **Dynamic Configuration Service**
- ✅ Automatic AI provider switching
- ✅ Cached configuration for performance
- ✅ Support for multiple AI providers (OpenAI, Gemini, Claude)
- ✅ Dynamic storage switching (Supabase ↔ Backblaze B2)

## 🛠️ Setup Instructions

### Step 1: Database Setup

Run the following SQL commands in your **Supabase SQL Editor**:

```sql
-- Copy and paste the entire content from src/lib/database-setup.sql
-- This will create all necessary tables and security policies
```

**Tables Created:**
- `ai_providers` - AI provider configurations
- `system_configurations` - System settings (Supabase, B2, etc.)
- `notification_logs` - Broadcast notification tracking
- `notification_deliveries` - Individual delivery tracking

### Step 2: Access System Settings

1. **Login as Admin** to your SAMIA TAROT application
2. **Navigate to Admin Dashboard**
3. **Click on "System Settings" tab** (⚙️ icon)
4. **Choose from 3 sub-panels:**
   - **AI Providers** - Manage AI services
   - **Database & Storage** - Configure Supabase/B2
   - **Notification System** - Send broadcasts

### Step 3: Configure AI Providers

#### Quick Setup (Recommended):
1. Go to **AI Providers** panel
2. Click on **OpenAI**, **Google Gemini**, or **Anthropic Claude** quick-add buttons
3. Enter your **API key** for the selected provider
4. **Save** the configuration
5. **Test connection** to verify

#### Manual Setup:
1. Click **"Add Provider"**
2. Fill in:
   - **Provider Name**: e.g., "My OpenAI"
   - **Provider Type**: Select from dropdown
   - **API Host URL**: e.g., `https://api.openai.com/v1`
   - **API Key**: Your provider's API key
   - **Models**: Add available models (e.g., gpt-4o, gpt-4o-mini)
   - **Active Model**: Select default model
3. **Save** and **Test**

### Step 4: Configure Database & Storage

#### Supabase Configuration:
1. Go to **Database & Storage** panel
2. Enter your **Supabase Project URL**
3. Add **Anon Key** and **Service Key**
4. **Test connection**
5. **Save configuration**

#### Backblaze B2 Setup (Optional):
1. Enter **B2 Bucket Name**
2. Add **Access Key** and **Secret Key**
3. Set **Region** (e.g., us-west-002)
4. Enter **Endpoint URL**
5. **Enable B2** checkbox
6. **Test** and **Save**

### Step 5: Using Dynamic AI Throughout App

The app now automatically uses your configured AI provider. No code changes needed!

```javascript
// Example: Using AI in any component
import { useAI } from '../hooks/useAI';

const MyComponent = () => {
  const { generateTarotReading, loading } = useAI();
  
  const handleReading = async () => {
    const reading = await generateTarotReading(cards, question);
    // Uses your configured AI provider automatically!
  };
};
```

## 🔧 Configuration Files

### Key Files Added/Modified:

1. **`src/components/Admin/AIProvidersPanel.jsx`** - AI provider management
2. **`src/components/Admin/DatabaseStoragePanel.jsx`** - Database/storage config
3. **`src/components/Admin/SystemSettingsTab.jsx`** - Main system settings interface
4. **`src/services/configService.js`** - Dynamic configuration service
5. **`src/hooks/useAI.js`** - AI service hook for components
6. **`src/lib/database-setup.sql`** - Database schema
7. **`src/pages/dashboard/AdminDashboard.jsx`** - Updated with new tab

## 🎯 Usage Examples

### 1. Switch AI Providers Instantly
- Configure multiple AI providers
- Set different models as active
- App automatically uses the active provider
- No restart required!

### 2. Dynamic Storage Switching
- Start with Supabase storage
- Later switch to Backblaze B2
- All file uploads use the active storage
- Seamless transition

### 3. Broadcast Notifications
- Send announcements to all users
- Target specific groups (readers only)
- Track delivery status
- Set priority levels

## 🔒 Security Features

- ✅ **Row Level Security (RLS)** on all tables
- ✅ **Admin-only access** to system settings
- ✅ **Encrypted API key storage**
- ✅ **Show/hide sensitive data** in UI
- ✅ **Connection testing** before saving
- ✅ **Input validation** and sanitization

## 🚨 Important Notes

### Before Using:
1. **Backup your database** before running setup SQL
2. **Test in development** environment first
3. **Verify admin permissions** are working
4. **Keep API keys secure** - never share them

### API Key Security:
- API keys are stored encrypted in Supabase
- Only admins can view/edit them
- Use environment variables for extra security
- Rotate keys regularly

### Performance:
- Configurations are **cached for 5 minutes**
- **Clear cache** when making changes
- **Test connections** to verify settings
- Monitor API usage and costs

## 🆘 Troubleshooting

### Common Issues:

**1. "No active AI provider configured"**
- Go to System Settings → AI Providers
- Add and activate at least one provider
- Test the connection

**2. "Database tables not found"**
- Run the SQL setup script in Supabase
- Check table permissions
- Verify admin role access

**3. "API connection failed"**
- Check API key validity
- Verify host URL format
- Test internet connectivity
- Check provider service status

**4. "Access denied to system settings"**
- Ensure user has admin role
- Check RLS policies
- Verify authentication

### Getting Help:
- Check browser console for errors
- Verify Supabase logs
- Test API endpoints manually
- Contact support with error details

## 🎉 Benefits

### For Admins:
- **No code changes** needed for configuration
- **Real-time switching** between providers
- **Cost optimization** by choosing best models
- **Centralized management** of all settings

### For Developers:
- **Clean separation** of config and code
- **Easy testing** with different providers
- **Scalable architecture** for future providers
- **Consistent API** across all AI services

### For Users:
- **Better performance** with optimized models
- **More reliable service** with fallback options
- **Enhanced features** with latest AI capabilities
- **Seamless experience** during provider switches

---

## 🔮 Future Enhancements

- **Multi-provider fallback** (auto-switch on failure)
- **Usage analytics** and cost tracking
- **Model performance** comparison
- **Automated provider** health checks
- **Custom model fine-tuning** support
- **API rate limiting** and quotas

---

**✨ The SAMIA TAROT system is now fully dynamic and future-proof! ✨** 