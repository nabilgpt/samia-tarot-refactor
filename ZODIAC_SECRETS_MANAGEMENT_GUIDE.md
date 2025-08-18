# 🔮 Daily Zodiac System - Secrets Management Guide

## Overview / نظرة عامة

This guide explains how to manage API keys and configurations for the Daily Zodiac System through the Super Admin Dashboard's System Secrets tab.

يشرح هذا الدليل كيفية إدارة مفاتيح API وإعدادات نظام الأبراج اليومية من خلال تبويب أسرار النظام في لوحة تحكم المدير الفائق.

## 🎯 Key Features / الميزات الرئيسية

### English
- **Centralized API Key Management**: All OpenAI and ElevenLabs credentials in one secure location
- **Voice Configuration**: Specific voice settings for Arabic and English zodiac readings
- **System Settings**: Auto-generation, timezone, and AI personality management
- **Security Compliance**: All sensitive data encrypted and access-controlled
- **Real-time Testing**: Test API connections directly from the dashboard

### العربية
- **إدارة مفاتيح API المركزية**: جميع بيانات اعتماد OpenAI و ElevenLabs في موقع آمن واحد
- **إعدادات الصوت**: إعدادات صوتية محددة لقراءات الأبراج العربية والإنجليزية
- **إعدادات النظام**: إدارة التوليد التلقائي والمنطقة الزمنية وشخصية الذكاء الاصطناعي
- **الامتثال الأمني**: جميع البيانات الحساسة مشفرة ومحكومة الوصول
- **الاختبار في الوقت الفعلي**: اختبار اتصالات API مباشرة من لوحة التحكم

## 🔐 Access Instructions / تعليمات الوصول

### Step 1: Navigate to System Secrets / الخطوة 1: الانتقال إلى أسرار النظام
1. Log in as Super Admin / تسجيل الدخول كمدير فائق
2. Go to Super Admin Dashboard / الذهاب إلى لوحة تحكم المدير الفائق
3. Click on "System Secrets" tab / النقر على تبويب "أسرار النظام"

### Step 2: Access AI Services / الخطوة 2: الوصول إلى خدمات الذكاء الاصطناعي
1. In the left sidebar, click "AI Services" / في الشريط الجانبي الأيسر، انقر على "خدمات الذكاء الاصطناعي"
2. You will see three subcategories / ستظهر ثلاث فئات فرعية:
   - 🤖 **OpenAI Services**
   - 🎙️ **ElevenLabs TTS**
   - 🔮 **Daily Zodiac System**

## ⚙️ Configuration Settings / إعدادات التكوين

### 🔮 Daily Zodiac System Settings

| Setting / الإعداد | Description / الوصف | Default / الافتراضي |
|-------------------|---------------------|---------------------|
| **ZODIAC_DEFAULT_TTS_PROVIDER** | Default TTS provider (openai/elevenlabs)<br/>موفر النص إلى كلام الافتراضي | `openai` |
| **ZODIAC_OPENAI_VOICE_AR** | OpenAI voice for Arabic readings<br/>صوت OpenAI للقراءات العربية | `nova` |
| **ZODIAC_OPENAI_VOICE_EN** | OpenAI voice for English readings<br/>صوت OpenAI للقراءات الإنجليزية | `alloy` |
| **ZODIAC_ELEVENLABS_VOICE_AR** | ElevenLabs voice ID for Arabic<br/>معرف صوت ElevenLabs للعربية | `samia_ar` |
| **ZODIAC_ELEVENLABS_VOICE_EN** | ElevenLabs voice ID for English<br/>معرف صوت ElevenLabs للإنجليزية | `samia_en` |
| **ZODIAC_AUTO_GENERATION_ENABLED** | Enable automatic generation<br/>تمكين التوليد التلقائي | `true` |
| **ZODIAC_GENERATION_TIMEZONE** | Timezone for scheduling<br/>المنطقة الزمنية للجدولة | `UTC` |
| **ZODIAC_SAMIA_PROMPT** | AI personality prompt (string)<br/>نص شخصية الذكاء الاصطناعي (نص) | Samia character description |

### 🤖 OpenAI Services (Required for Zodiac)

| Setting / الإعداد | Description / الوصف | Required / مطلوب |
|-------------------|---------------------|------------------|
| **OPENAI_API_KEY** | OpenAI API key<br/>مفتاح OpenAI API | ✅ Yes |
| **OPENAI_ORG_ID** | OpenAI organization ID<br/>معرف منظمة OpenAI | ❌ Optional |

### 🎙️ ElevenLabs TTS (Optional Alternative)

| Setting / الإعداد | Description / الوصف | Required / مطلوب |
|-------------------|---------------------|------------------|
| **ELEVENLABS_API_KEY** | ElevenLabs API key<br/>مفتاح ElevenLabs API | ❌ Optional |
| **ELEVENLABS_VOICE_ID** | Default voice ID<br/>معرف الصوت الافتراضي | ❌ Optional |

## 🔧 Setup Process / عملية الإعداد

### English Instructions

1. **Set API Keys First**:
   - Configure `OPENAI_API_KEY` in OpenAI Services section
   - Optionally configure `ELEVENLABS_API_KEY` for alternative TTS

2. **Configure Voice Settings**:
   - Set Arabic and English voices for your preferred TTS provider
   - Test voices using the test functionality

3. **System Configuration**:
   - Choose default TTS provider (OpenAI recommended)
   - Set timezone for your region
   - Customize Samia's AI personality prompt

4. **Enable Auto-Generation**:
   - Set `ZODIAC_AUTO_GENERATION_ENABLED` to `true`
   - Configure generation schedule in Daily Zodiac Management tab

### تعليمات باللغة العربية

1. **تعيين مفاتيح API أولاً**:
   - تكوين `OPENAI_API_KEY` في قسم خدمات OpenAI
   - اختيارياً تكوين `ELEVENLABS_API_KEY` للنص إلى كلام البديل

2. **تكوين إعدادات الصوت**:
   - تعيين الأصوات العربية والإنجليزية لموفر النص إلى كلام المفضل
   - اختبار الأصوات باستخدام وظيفة الاختبار

3. **تكوين النظام**:
   - اختيار موفر النص إلى كلام الافتراضي (OpenAI موصى به)
   - تعيين المنطقة الزمنية لمنطقتك
   - تخصيص نص شخصية الذكاء الاصطناعي لسامية

4. **تمكين التوليد التلقائي**:
   - تعيين `ZODIAC_AUTO_GENERATION_ENABLED` إلى `true`
   - تكوين جدول التوليد في تبويب إدارة الأبراج اليومية

## 🧪 Testing Configuration / اختبار التكوين

### Test API Connections / اختبار اتصالات API
1. Click the test button (🧪) next to each API key setting
2. Wait for the test result (green ✅ = success, red ❌ = error)
3. Fix any connection issues before proceeding

### Test Voice Generation / اختبار توليد الصوت
1. Go to "Daily Zodiac Management" tab
2. Use the "Voice Testing" section
3. Test both Arabic and English voices
4. Adjust voice settings if needed

## 🔒 Security Best Practices / أفضل الممارسات الأمنية

### English
- **Never store API keys in .env files** - Use only the dashboard
- **Regularly rotate API keys** for enhanced security
- **Monitor API usage** through provider dashboards
- **Test configurations** after any changes
- **Backup configurations** before major updates

### العربية
- **لا تخزن مفاتيح API في ملفات .env أبداً** - استخدم لوحة التحكم فقط
- **قم بتدوير مفاتيح API بانتظام** لتعزيز الأمان
- **راقب استخدام API** من خلال لوحات تحكم الموفرين
- **اختبر التكوينات** بعد أي تغييرات
- **احتفظ بنسخ احتياطية من التكوينات** قبل التحديثات الرئيسية

## 🚀 Quick Setup Script / سكريبت الإعداد السريع

To add the zodiac configurations to your database:

```bash
# Run the setup script
psql -d your_database -f scripts/add-zodiac-secrets-config.sql
```

## 📊 Integration with Daily Zodiac Management / التكامل مع إدارة الأبراج اليومية

The settings configured in System Secrets are automatically used by:
- Daily Zodiac Management Tab
- Automatic generation processes
- Voice testing functionality
- API credential validation

الإعدادات المكونة في أسرار النظام تُستخدم تلقائياً بواسطة:
- تبويب إدارة الأبراج اليومية
- عمليات التوليد التلقائي
- وظيفة اختبار الصوت
- التحقق من صحة بيانات اعتماد API

## 🆘 Troubleshooting / استكشاف الأخطاء وإصلاحها

### Common Issues / المشاكل الشائعة

1. **API Key Not Working** / مفتاح API لا يعمل
   - Verify key is correctly entered without extra spaces
   - Check API key permissions and quotas
   - Test connection using the test button

2. **Voice Generation Fails** / فشل توليد الصوت
   - Ensure API keys are valid and active
   - Check voice IDs are correct for your provider
   - Verify sufficient API credits/quota

3. **Settings Not Saving** / الإعدادات لا تحفظ
   - Check you have super_admin role
   - Verify database connection
   - Look for validation errors in console

## 📞 Support / الدعم

For technical support or questions:
- Check the Daily Zodiac Management documentation
- Review API provider documentation (OpenAI/ElevenLabs)
- Contact system administrator

للدعم الفني أو الأسئلة:
- راجع توثيق إدارة الأبراج اليومية
- راجع توثيق موفري API (OpenAI/ElevenLabs)
- اتصل بمدير النظام

---

**Last Updated**: January 16, 2025  
**Version**: 1.0  
**Compatibility**: SAMIA TAROT v2.0+ 