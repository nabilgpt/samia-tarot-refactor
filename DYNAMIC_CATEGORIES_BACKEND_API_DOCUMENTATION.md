# 🔐 DYNAMIC CATEGORIES BACKEND API DOCUMENTATION
**SAMIA TAROT - System Secrets Dynamic Category Management**

---

**Date:** July 23, 2025  
**Implementation:** Task 2 - Backend API Endpoints  
**Status:** ✅ **COMPLETED**  
**Security:** JWT Protected, Super Admin Role Required  

---

## 📋 **OVERVIEW**

The Dynamic Categories Backend API provides comprehensive CRUD operations for managing system secrets categories and subcategories. All endpoints are fully secured with JWT authentication and require `super_admin` role access.

### **Key Features**
- ✅ Dynamic category and subcategory management
- ✅ Foreign key relationships instead of string names  
- ✅ Bilingual support (Arabic/English)
- ✅ Real-time validation and dependency checking
- ✅ Comprehensive error handling and logging
- ✅ Full integration with existing system secrets

---

## 🔗 **API ENDPOINTS**

### 🗂️ **SECRET CATEGORIES**

#### **GET /api/secret-categories**
List all categories with subcategory and secrets count
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "infrastructure",
      "name_en": "Infrastructure", 
      "name_ar": "البنية التحتية",
      "description_en": "Infrastructure services",
      "description_ar": "خدمات البنية التحتية",
      "display_order": 1,
      "is_active": true,
      "subcategory_count": 3,
      "secrets_count": 6,
      "created_at": "2025-07-23T10:00:00Z",
      "updated_at": "2025-07-23T10:00:00Z"
    }
  ],
  "count": 9
}
```

#### **GET /api/secret-categories/:id**
Get specific category with full details
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name_en": "Infrastructure",
    "subcategories": [...],
    "secrets": [...]
  }
}
```

#### **POST /api/secret-categories**
Create new category
```json
// Request Body
{
  "name": "custom_category",
  "name_en": "Custom Category",
  "name_ar": "فئة مخصصة", 
  "description_en": "Custom category description",
  "description_ar": "وصف الفئة المخصصة",
  "display_order": 10,
  "is_active": true
}

// Response
{
  "success": true,
  "data": { /* created category */ },
  "message": "Category created successfully"
}
```

#### **PUT /api/secret-categories/:id**
Update existing category
```json
// Request Body (all fields optional)
{
  "name_en": "Updated Category Name",
  "name_ar": "اسم الفئة المحدث",
  "is_active": false
}

// Response
{
  "success": true,
  "data": { /* updated category */ },
  "message": "Category updated successfully"
}
```

#### **DELETE /api/secret-categories/:id**
Delete category (only if no subcategories or secrets exist)
```json
// Response
{
  "success": true,
  "message": "Category deleted successfully"
}

// Error if dependencies exist
{
  "success": false,
  "error": "Cannot delete category: subcategories exist"
}
```

#### **PATCH /api/secret-categories/:id/toggle**
Toggle category active status
```json
{
  "success": true,
  "data": { /* updated category */ },
  "message": "Category activated successfully"
}
```

#### **GET /api/secret-categories/:categoryId/subcategories**
List all subcategories for a specific category
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "category_id": "uuid",
      "name": "database",
      "name_en": "Database",
      "name_ar": "قاعدة البيانات",
      "secrets_count": 2
    }
  ],
  "count": 3,
  "category": {
    "id": "uuid",
    "name_en": "Infrastructure"
  }
}
```

---

### 🏷️ **SECRET SUBCATEGORIES**

#### **GET /api/secret-categories/subcategories**
List all subcategories with category info
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "category_id": "uuid",
      "name": "database",
      "name_en": "Database",
      "name_ar": "قاعدة البيانات",
      "category": {
        "id": "uuid",
        "name_en": "Infrastructure"
      },
      "secrets_count": 2
    }
  ],
  "count": 15
}
```

#### **POST /api/secret-categories/subcategories**
Create new subcategory
```json
// Request Body
{
  "category_id": "uuid",
  "name": "custom_sub",
  "name_en": "Custom Subcategory",
  "name_ar": "فئة فرعية مخصصة",
  "description_en": "Custom subcategory description",
  "display_order": 5,
  "is_active": true
}

// Response
{
  "success": true,
  "data": { /* created subcategory with category info */ },
  "message": "Subcategory created successfully"
}
```

#### **PUT /api/secret-categories/subcategories/:id**
Update existing subcategory
```json
// Request Body (all fields optional)
{
  "category_id": "uuid", // Can move to different category
  "name_en": "Updated Subcategory",
  "is_active": false
}
```

#### **DELETE /api/secret-categories/subcategories/:id**
Delete subcategory (only if no secrets exist)

#### **PATCH /api/secret-categories/subcategories/:id/toggle**
Toggle subcategory active status

---

## 🔐 **UPDATED SYSTEM SECRETS ENDPOINTS**

### **Enhanced Data Structure**
All system secrets endpoints now use foreign key relationships:

```json
{
  "id": "uuid",
  "secret_key": "OPENAI_API_KEY",
  "secret_category_id": "uuid",        // ← Foreign key
  "secret_subcategory_id": "uuid",     // ← Foreign key  
  "display_name": "OpenAI API Key",
  "category": {                        // ← Joined data
    "id": "uuid",
    "name_en": "AI Services",
    "name_ar": "خدمات الذكاء الاصطناعي"
  },
  "subcategory": {                     // ← Joined data
    "id": "uuid", 
    "name_en": "OpenAI Services",
    "name_ar": "خدمات OpenAI"
  }
}
```

### **Backward Compatibility**
For frontend compatibility, the API still returns:
- `secret_category`: Extracted from `category.name_en`
- `secret_subcategory`: Extracted from `subcategory.name_en`

---

## 🛡️ **SECURITY & VALIDATION**

### **Authentication & Authorization**
- ✅ JWT token required for all endpoints
- ✅ `super_admin` role validation
- ✅ Request logging and audit trails

### **Data Validation**
- ✅ Category/subcategory existence validation
- ✅ Foreign key relationship validation
- ✅ Duplicate name prevention
- ✅ Dependency checking before deletion

### **Error Handling**
```json
// Validation Error
{
  "success": false,
  "error": "Invalid category ID"
}

// Dependency Error  
{
  "success": false,
  "error": "Cannot delete category: subcategories exist"
}

// System Error
{
  "success": false,
  "error": "Internal server error",
  "details": "Database connection failed"
}
```

---

## 📊 **INTEGRATION STATUS**

### ✅ **Completed**
- [x] All CRUD endpoints for categories
- [x] All CRUD endpoints for subcategories
- [x] Category-to-subcategories relationship endpoint
- [x] System secrets integration with foreign keys
- [x] Comprehensive validation and error handling
- [x] JWT authentication and role-based access
- [x] Bilingual support throughout

### 🎯 **Next Steps (Task 3)**
- [ ] Frontend UI components for category management
- [ ] Dynamic dropdowns in Add/Edit Secret modals
- [ ] Inline category/subcategory management
- [ ] Real-time dropdown updates

---

## 🔧 **TESTING ENDPOINTS**

### **Test Category Creation**
```bash
POST /api/secret-categories
{
  "name": "test_category",
  "name_en": "Test Category", 
  "name_ar": "فئة الاختبار"
}
```

### **Test Subcategory Creation**
```bash
POST /api/secret-categories/subcategories
{
  "category_id": "category-uuid-here",
  "name": "test_subcategory",
  "name_en": "Test Subcategory",
  "name_ar": "فئة فرعية للاختبار"  
}
```

### **Test Secret Creation with New Structure**
```bash
POST /api/system-secrets
{
  "secret_key": "TEST_SECRET_KEY",
  "secret_category_id": "category-uuid-here",
  "secret_subcategory_id": "subcategory-uuid-here",
  "secret_value": "test-secret-value",
  "display_name": "Test Secret"
}
```

---

## 📚 **DATABASE SCHEMA REFERENCE**

### **secret_categories**
- `id` (UUID, PK)
- `name` (VARCHAR) - Internal identifier
- `name_en` (VARCHAR) - English display name
- `name_ar` (VARCHAR) - Arabic display name  
- `description_en` (TEXT)
- `description_ar` (TEXT)
- `display_order` (INTEGER)
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### **secret_subcategories**
- `id` (UUID, PK)
- `category_id` (UUID, FK → secret_categories.id)
- `name` (VARCHAR) - Internal identifier
- `name_en` (VARCHAR) - English display name
- `name_ar` (VARCHAR) - Arabic display name
- `description_en` (TEXT)
- `description_ar` (TEXT)
- `display_order` (INTEGER)
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### **system_secrets (Updated)**
- `secret_category_id` (UUID, FK → secret_categories.id)
- `secret_subcategory_id` (UUID, FK → secret_subcategories.id)
- *(All other existing fields remain unchanged)*

---

**🎉 Task 2 Implementation: COMPLETE ✅**

The backend API is now fully implemented with comprehensive category management capabilities, proper foreign key relationships, and complete integration with the existing system secrets infrastructure. 