# 🛠️ SAMIA TAROT - Dynamic Configuration System

## Overview

The SAMIA TAROT application now features a comprehensive **Dynamic Configuration System** that allows administrators to manage all external integrations and settings without modifying code. This system provides a secure, user-friendly interface for configuring AI providers, databases, storage, and notifications.

## 🏗️ Architecture

### Components

1. **ConfigContext** (`src/context/ConfigContext.jsx`)
   - Provides configuration data throughout the application
   - Handles loading, updating, and caching of configuration values
   - Offers specialized getters for different configuration sections

2. **ConfigurationPanel** (`src/components/Admin/ConfigurationPanel.jsx`)
   - Admin interface for managing all configuration settings
   - Tabbed interface with sections for AI, Database, Storage, and Notifications
   - Secure input handling with masked sensitive fields

3. **Database Table** (`app_config`)
   - Stores all configuration values as JSON
   - Supports encryption for sensitive data
   - Includes metadata like section, editability, and descriptions

## 🚀 Features

### 🧠 AI Management
- **Add Multiple AI Providers**: OpenAI, Google Gemini, Anthropic, etc.
- **Dynamic Model Configuration**: Add/remove models for each provider
- **Provider Settings**: Enable/disable providers, set default provider
- **API Key Management**: Secure storage and masked input fields

### 🗄️ Database Configuration
- **Supabase Settings**: URL, anon key, service key, storage bucket
- **Multi-Database Support**: Ready for Firebase, PlanetScale integration
- **Connection Testing**: Validate database connections

### 💾 Storage Management
- **Provider Selection**: Switch between Supabase Storage and Backblaze B2
- **B2 Configuration**: Bucket name, endpoint, access keys
- **Storage Testing**: Verify storage connectivity

### 🔔 Notification Settings
- **Email Providers**: SendGrid, Mailgun, Amazon SES, Custom SMTP
- **SMS/WhatsApp**: Twilio integration
- **Push Notifications**: Enable/disable push notifications
- **Broadcast System**: Send notifications to all users by role

## 📋 Setup Instructions

### 1. Database Setup

Run the setup script to create the configuration table:

```bash
node scripts/setup-config-table.js
```

Or manually execute the SQL file:

```sql
-- Execute the contents of database/create_app_config_table.sql
```

### 2. Application Integration

The configuration system is automatically integrated when you wrap your app with `ConfigProvider`:

```jsx
// Already done in src/App.jsx
<ConfigProvider>
  <YourApp />
</ConfigProvider>
```

### 3. Access Configuration Panel

1. Log in as an admin user
2. Navigate to Admin Dashboard
3. Click on the "Configuration" tab
4. Configure your integrations

## 🔧 Usage Examples

### Using Configuration in Components

```jsx
import { useConfig } from '../context/ConfigContext';

function MyComponent() {
  const { getAIConfig, getDatabaseConfig } = useConfig();
  
  const aiConfig = getAIConfig();
  const dbConfig = getDatabaseConfig();
  
  // Use configuration values
  const apiKey = aiConfig.openaiApiKey;
  const supabaseUrl = dbConfig.supabaseUrl;
}
```

### Updating Configuration

```jsx
const { updateConfig } = useConfig();

// Update a configuration value
await updateConfig('ai_default_model', 'gpt-4-turbo', 'ai');
```

### Getting Configuration by Section

```jsx
const { getConfigBySection } = useConfig();

const aiSettings = getConfigBySection('ai');
const storageSettings = getConfigBySection('storage');
```

## 🔒 Security Features

### Sensitive Data Protection
- API keys and secrets are masked in the UI
- Toggle visibility with eye/eye-off icons
- Encrypted storage option in database

### Access Control
- Only admin users can access the configuration panel
- Row-level security (RLS) policies protect the app_config table
- Audit trail with updated_by tracking

### Validation
- Input validation for URLs, email formats, etc.
- Required field validation
- Type checking for configuration values

## 📊 Configuration Sections

### AI Configuration
```json
{
  "ai_providers": [
    {
      "id": "openai",
      "name": "OpenAI",
      "host": "https://api.openai.com/v1/chat/completions",
      "apiKey": "sk-...",
      "models": ["gpt-4", "gpt-3.5-turbo"],
      "enabled": true,
      "isDefault": true
    }
  ],
  "ai_default_provider": "openai",
  "ai_default_model": "gpt-4"
}
```

### Database Configuration
```json
{
  "database_type": "supabase",
  "supabase_url": "https://your-project.supabase.co",
  "supabase_anon_key": "eyJ...",
  "supabase_service_key": "eyJ...",
  "supabase_storage_bucket": "samia-tarot-uploads"
}
```

### Storage Configuration
```json
{
  "storage_provider": "supabase",
  "b2_bucket_name": "",
  "b2_endpoint_url": "",
  "b2_access_key_id": "",
  "b2_secret_access_key": ""
}
```

### Notification Configuration
```json
{
  "notifications_enabled": true,
  "email_provider": "sendgrid",
  "push_notifications_enabled": true,
  "sendgrid_api_key": "SG...",
  "twilio_account_sid": "AC...",
  "twilio_auth_token": "..."
}
```

## 🎨 UI/UX Features

### Cosmic Theme Integration
- Maintains the exact cosmic theme and styling
- Dark background with gold accents
- Animated backgrounds and hover effects
- Responsive design for all screen sizes

### User Experience
- Tabbed interface for easy navigation
- Real-time validation and feedback
- Loading states and success/error messages
- Intuitive form controls and layouts

### Accessibility
- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader compatibility
- High contrast ratios

## 🧪 Testing

### Configuration Testing
```bash
# Test AI provider configuration
curl -X POST https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model": "gpt-4", "messages": [{"role": "user", "content": "Test"}]}'

# Test Supabase connection
# Use the configuration panel's built-in connection testing

# Test storage upload
# Upload a test file through the application
```

### Runtime Testing
1. Switch AI providers and verify model responses
2. Change database credentials and test connectivity
3. Toggle storage providers and test file uploads
4. Send test notifications to different user roles

## 🔄 Migration and Backup

### Backup Configuration
```javascript
// Export current configuration
const { config } = useConfig();
const backup = JSON.stringify(config, null, 2);
localStorage.setItem('config_backup', backup);
```

### Restore Configuration
```javascript
// Restore from backup
const backup = localStorage.getItem('config_backup');
const configData = JSON.parse(backup);

// Update each configuration value
for (const [key, value] of Object.entries(configData)) {
  await updateConfig(key, value);
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Configuration not loading**
   - Check if user has admin role
   - Verify app_config table exists
   - Check network connectivity

2. **API keys not working**
   - Verify keys are correctly entered
   - Check for extra spaces or characters
   - Test keys with provider's API directly

3. **Database connection issues**
   - Verify Supabase URL format
   - Check key permissions
   - Test connection from Supabase dashboard

### Debug Mode
Enable debug logging in ConfigContext:
```javascript
// Add to ConfigContext.jsx
console.log('Config loaded:', config);
console.log('Update result:', result);
```

## 📈 Future Enhancements

### Planned Features
- **Configuration Templates**: Pre-defined setups for different environments
- **Bulk Import/Export**: JSON/YAML configuration file support
- **Configuration History**: Track changes and rollback capability
- **Environment Switching**: Dev/staging/production configurations
- **Health Monitoring**: Real-time status of all integrations

### Integration Roadmap
- **Additional AI Providers**: Anthropic Claude, Cohere, Hugging Face
- **More Databases**: MongoDB, PostgreSQL, MySQL
- **Storage Providers**: AWS S3, Google Cloud Storage, Azure Blob
- **Communication Services**: Discord, Slack, Microsoft Teams

## 📞 Support

For issues or questions about the configuration system:

1. Check this documentation first
2. Review the console for error messages
3. Test individual components in isolation
4. Contact the development team with specific error details

---

**Note**: Always backup your configuration before making significant changes. Test new configurations in a development environment first. 