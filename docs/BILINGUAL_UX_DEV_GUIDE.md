# 📚 **SAMIA TAROT BILINGUAL UX DEVELOPER GUIDE**

## 🎯 **Overview**

This guide provides comprehensive documentation for the SAMIA TAROT Bilingual UX system, which delivers single-language user experiences while maintaining dual-language content management capabilities for administrators.

---

## 🏗️ **System Architecture**

### **Core Principle: Single-Language UX**
Users see content in **one language only** (Arabic OR English), never both simultaneously. Administrators can edit content in both languages using special toggle controls.

### **Key Components**
- **LanguageContext**: Central state management for language switching
- **BilingualInput**: Single-language input with admin dual-language mode
- **BilingualTextarea**: Single-language textarea with RTL/LTR support
- **BilingualSelect**: Single-language dropdown with localized options
- **AdminLanguageToggle**: Admin-only control for dual-language editing

---

## 🚀 **Quick Start**

### **1. Using Bilingual Components**

```jsx
import { useLanguage } from '../../context/LanguageContext';
import BilingualInput from '../UI/BilingualInput';
import BilingualTextarea from '../UI/BilingualTextarea';
import AdminLanguageToggle from '../UI/AdminLanguageToggle';

function MyForm() {
  const { 
    currentLanguage, 
    validateCurrentLanguageField,
    createSingleLanguageFormData 
  } = useLanguage();
  
  const [formData, setFormData] = useState({
    name_en: '',
    name_ar: '',
    description_en: '',
    description_ar: ''
  });

  return (
    <form>
      {/* Admin can toggle between single/dual language mode */}
      <AdminLanguageToggle />
      
      {/* User sees only current language input */}
      <BilingualInput
        label="Name"
        value={formData}
        onChange={setFormData}
        field="name"
        required
      />
      
      <BilingualTextarea
        label="Description"
        value={formData}
        onChange={setFormData}
        field="description"
        rows={4}
      />
    </form>
  );
}
```

### **2. Form Submission Pattern**

```jsx
const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Validate current language fields only
  const validation = validateCurrentLanguageField(formData, 'name', true);
  if (!validation.valid) {
    showError(validation.message);
    return;
  }
  
  // Create single-language payload
  const submitData = createSingleLanguageFormData(formData, ['name', 'description']);
  
  // Submit to API
  const response = await fetch('/api/endpoint', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(submitData)
  });
};
```

---

## 📖 **LanguageContext API Reference**

### **Core State**
```jsx
const {
  currentLanguage,        // 'ar' | 'en'
  isLoading,             // boolean
  direction,             // 'rtl' | 'ltr'
  textAlign,             // 'right' | 'left'
  showBothLanguages,     // boolean (admin only)
  isAdmin                // boolean
} = useLanguage();
```

### **Actions**
```jsx
const {
  changeLanguage,        // (lang: 'ar' | 'en') => Promise<void>
  toggleDualLanguageView // () => void (admin only)
} = useLanguage();
```

### **Text Utilities**
```jsx
const {
  getLocalizedText,      // (data, field, fallback) => string
  localizeArray,         // (array, fields) => Array
  formatText,            // (text, forceDirection) => string
  needsRTL              // (text) => boolean
} = useLanguage();

// Usage examples:
const localizedName = getLocalizedText(service, 'name', 'Untitled');
const localizedServices = localizeArray(services, ['name', 'description']);
```

### **Field Name Utilities**
```jsx
const {
  getFieldName,          // (baseField) => string
  getOppositeFieldName,  // (baseField) => string  
  getAllFieldNames       // (baseField) => object
} = useLanguage();

// Examples:
getFieldName('name')          // 'name_en' or 'name_ar'
getOppositeFieldName('name')  // 'name_ar' or 'name_en'
getAllFieldNames('name')      // { current: 'name_en', opposite: 'name_ar', ar: 'name_ar', en: 'name_en' }
```

### **Validation**
```jsx
const {
  validateCurrentLanguageField,  // (data, field, required) => { valid, message }
  validateBilingualField        // (data, field, required) => { valid, message }
} = useLanguage();

// Examples:
const nameValidation = validateCurrentLanguageField(formData, 'name', true);
const bothLangsValidation = validateBilingualField(formData, 'name', true);
```

### **Form Data Processing**
```jsx
const {
  createSingleLanguageFormData  // (formData, fields) => object
} = useLanguage();

// Example:
const payload = createSingleLanguageFormData(
  { name_en: 'Service', name_ar: 'خدمة', price: 100 },
  ['name']
);
// Result: { name_en: 'Service' } or { name_ar: 'خدمة' } depending on current language
```

### **Direction & Styling Helpers**
```jsx
const {
  getOppositeTextAlign,   // () => 'left' | 'right'
  getMarginStart,         // () => 'mr' | 'ml'
  getMarginEnd,           // () => 'ml' | 'mr'
  getPaddingStart,        // () => 'pr' | 'pl'
  getPaddingEnd,          // () => 'pl' | 'pr'
  getDirectionClasses     // () => object
} = useLanguage();

// Example usage in Tailwind classes:
<div className={`${getMarginStart()}-4 ${getPaddingStart()}-2`}>
```

### **Localization**
```jsx
const {
  formatDate,            // (date, options) => string
  formatNumber,          // (number, options) => string
  getLanguageLabel,      // (lang) => string
  getAvailableLanguages, // () => Array
  t                      // (key, fallback) => string
} = useLanguage();

// Examples:
formatDate(new Date(), { dateStyle: 'medium' });  // "Jan 15, 2024" or "١٥ يناير ٢٠٢٤"
formatNumber(1234.56, { style: 'currency', currency: 'USD' });
t('save', 'Save');  // "Save" or "حفظ"
```

---

## 🎨 **Bilingual Component APIs**

### **BilingualInput**

```jsx
<BilingualInput
  label="Field Label"           // string | { en: string, ar: string }
  value={formData}              // object with field_en and field_ar
  onChange={setFormData}        // function to update form data
  field="fieldName"            // base field name (without _en/_ar suffix)
  type="text"                  // input type
  placeholder="Enter value"    // string | { en: string, ar: string }
  required={true}              // boolean
  disabled={false}             // boolean
  className="custom-class"     // additional CSS classes
  maxLength={100}              // number
  minLength={2}                // number
  pattern="[A-Za-z]+"         // regex pattern
  autoComplete="name"          // autocomplete attribute
  testId="my-input"           // data-testid attribute
/>
```

### **BilingualTextarea**

```jsx
<BilingualTextarea
  label="Description"
  value={formData}
  onChange={setFormData}
  field="description"
  rows={4}                     // number of rows
  cols={50}                    // number of columns
  resize="vertical"            // 'none' | 'both' | 'horizontal' | 'vertical'
  placeholder="Enter description"
  maxLength={500}
  required={true}
  className="custom-textarea"
  testId="description-input"
/>
```

### **BilingualSelect**

```jsx
<BilingualSelect
  label="Category"
  value={formData}
  onChange={setFormData}
  field="category"
  options={[                   // Array of options
    { 
      value: 'love', 
      label: 'Love & Relationships',
      label_ar: 'الحب والعلاقات' 
    },
    { 
      value: 'career', 
      label: 'Career',
      label_ar: 'مهنة' 
    }
  ]}
  required={true}
  disabled={false}
  placeholder="Select category"
  className="custom-select"
  testId="category-select"
/>
```

### **AdminLanguageToggle**

```jsx
<AdminLanguageToggle
  className="mb-4"             // additional CSS classes
  showLabels={true}            // show "Single/Dual Language" labels
  size="md"                    // 'sm' | 'md' | 'lg'
  variant="cosmic"             // 'cosmic' | 'minimal'
  testId="language-toggle"
/>
```

---

## 🔄 **Migration Patterns**

### **Pattern 1: Converting Dual-Field Forms**

**Before (Legacy):**
```jsx
<input 
  placeholder="Name in English"
  value={formData.name_en}
  onChange={(e) => setFormData({...formData, name_en: e.target.value})}
/>
<input 
  placeholder="Name in Arabic"
  value={formData.name_ar}
  onChange={(e) => setFormData({...formData, name_ar: e.target.value})}
/>
```

**After (Bilingual):**
```jsx
<BilingualInput
  label="Name"
  value={formData}
  onChange={setFormData}
  field="name"
  required
/>
```

### **Pattern 2: Form Validation Migration**

**Before:**
```jsx
const validateForm = () => {
  if (!formData.name_en.trim() || !formData.name_ar.trim()) {
    setError('Name is required in both languages');
    return false;
  }
  return true;
};
```

**After:**
```jsx
const validateForm = () => {
  const validation = validateCurrentLanguageField(formData, 'name', true);
  if (!validation.valid) {
    setError(validation.message);
    return false;
  }
  return true;
};
```

### **Pattern 3: Data Display Migration**

**Before:**
```jsx
<h3>{currentLanguage === 'ar' ? service.name_ar : service.name_en}</h3>
```

**After:**
```jsx
<h3>{getLocalizedText(service, 'name', 'Untitled Service')}</h3>
```

### **Pattern 4: Form Submission Migration**

**Before:**
```jsx
const submitData = {
  name_en: formData.name_en,
  name_ar: formData.name_ar,
  description_en: formData.description_en,
  description_ar: formData.description_ar,
  // ... other fields
};
```

**After:**
```jsx
const submitData = createSingleLanguageFormData(formData, ['name', 'description']);
```

---

## 🛠️ **Implementation Guidelines**

### **1. Component Structure**

```jsx
// ✅ Good: Use bilingual components
function MyForm() {
  const { currentLanguage, t } = useLanguage();
  
  return (
    <div>
      <AdminLanguageToggle />
      <BilingualInput label={t('name')} field="name" {...props} />
    </div>
  );
}

// ❌ Bad: Manual dual inputs
function MyForm() {
  return (
    <div>
      <input placeholder="English name" />
      <input placeholder="Arabic name" />
    </div>
  );
}
```

### **2. State Management**

```jsx
// ✅ Good: Single state object with both languages
const [formData, setFormData] = useState({
  name_en: '',
  name_ar: '',
  description_en: '',
  description_ar: ''
});

// ❌ Bad: Separate state for each language
const [nameEn, setNameEn] = useState('');
const [nameAr, setNameAr] = useState('');
```

### **3. Conditional Rendering**

```jsx
// ✅ Good: Use isAdmin from context
const { isAdmin } = useLanguage();
return (
  <div>
    {isAdmin && <AdminLanguageToggle />}
    <BilingualInput {...props} />
  </div>
);

// ❌ Bad: Manual role checking
if (user.role === 'admin' || user.role === 'super_admin') {
  // render admin controls
}
```

### **4. CSS and Styling**

```jsx
// ✅ Good: Use direction helpers
const { getDirectionClasses, currentLanguage } = useLanguage();
const directionClasses = getDirectionClasses();

return (
  <div className={`${directionClasses.text} ${directionClasses.flex}`}>
    <span className={`${directionClasses.margin.start}-2`}>
      Content
    </span>
  </div>
);

// ❌ Bad: Manual direction handling
const isRTL = currentLanguage === 'ar';
return (
  <div className={isRTL ? 'text-right flex-row-reverse' : 'text-left flex-row'}>
    <span className={isRTL ? 'mr-2' : 'ml-2'}>Content</span>
  </div>
);
```

---

## 🎯 **Best Practices**

### **Performance Optimization**

1. **Memoize Language Context Value**
```jsx
const contextValue = useMemo(() => ({
  currentLanguage,
  changeLanguage,
  getLocalizedText,
  // ... other values
}), [currentLanguage, /* other dependencies */]);
```

2. **Lazy Load Language-Specific Content**
```jsx
const LazyArabicComponent = lazy(() => import('./ArabicComponent'));
const LazyEnglishComponent = lazy(() => import('./EnglishComponent'));

return (
  <Suspense fallback={<Loading />}>
    {currentLanguage === 'ar' ? <LazyArabicComponent /> : <LazyEnglishComponent />}
  </Suspense>
);
```

3. **Debounce Language Switching**
```jsx
const debouncedChangeLanguage = useCallback(
  debounce((lang) => changeLanguage(lang), 300),
  [changeLanguage]
);
```

### **Error Handling**

```jsx
const { validateCurrentLanguageField, t } = useLanguage();

const handleSubmit = async (formData) => {
  try {
    // Validate required fields
    const nameValidation = validateCurrentLanguageField(formData, 'name', true);
    if (!nameValidation.valid) {
      throw new Error(nameValidation.message);
    }
    
    // Submit data
    const response = await submitForm(formData);
    showSuccess(t('success', 'Success!'));
    
  } catch (error) {
    showError(error.message || t('error', 'An error occurred'));
  }
};
```

### **Testing Guidelines**

```jsx
// Component testing
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '../context/LanguageContext';

const renderWithLanguage = (component, language = 'en') => {
  return render(
    <LanguageProvider initialLanguage={language}>
      {component}
    </LanguageProvider>
  );
};

test('should display content in selected language', () => {
  renderWithLanguage(<MyComponent />, 'ar');
  expect(screen.getByText(/[\u0600-\u06FF]/)).toBeInTheDocument();
});
```

---

## 🔧 **Troubleshooting**

### **Common Issues**

**1. "LanguageContext not found" Error**
```jsx
// ❌ Problem: Component not wrapped in LanguageProvider
function App() {
  return <MyComponent />; // This will fail
}

// ✅ Solution: Wrap in LanguageProvider
function App() {
  return (
    <LanguageProvider>
      <MyComponent />
    </LanguageProvider>
  );
}
```

**2. RTL Layout Not Applied**
```jsx
// ❌ Problem: Not applying direction to document
const { currentLanguage } = useLanguage();

// ✅ Solution: LanguageProvider handles this automatically
// Or manually apply if needed:
useEffect(() => {
  document.body.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
}, [currentLanguage]);
```

**3. Form Data Not Saving Correctly**
```jsx
// ❌ Problem: Not using createSingleLanguageFormData
const submitData = {
  name_en: formData.name_en,
  name_ar: formData.name_ar
};

// ✅ Solution: Use helper function
const submitData = createSingleLanguageFormData(formData, ['name']);
```

**4. Validation Errors**
```jsx
// ❌ Problem: Validating both languages when only current is needed
if (!formData.name_en || !formData.name_ar) {
  // This fails in single-language mode
}

// ✅ Solution: Use validateCurrentLanguageField
const validation = validateCurrentLanguageField(formData, 'name', true);
if (!validation.valid) {
  showError(validation.message);
}
```

### **Debug Tools**

```jsx
// Add to any component to debug language state
const LanguageDebugger = () => {
  const context = useLanguage();
  
  if (process.env.NODE_ENV === 'development') {
    console.log('Language Context:', context);
  }
  
  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-2 text-xs">
      Lang: {context.currentLanguage} | 
      RTL: {context.direction} | 
      Admin: {context.isAdmin} |
      Dual: {context.showBothLanguages}
    </div>
  );
};
```

---

## 🌐 **Adding New Languages**

### **1. Update LanguageContext**

```jsx
// In getAvailableLanguages function:
const getAvailableLanguages = () => [
  { code: 'ar', label: 'العربية', native: 'العربية', flag: '🇸🇾' },
  { code: 'en', label: 'English', native: 'English', flag: '🇺🇸' },
  { code: 'fr', label: 'Français', native: 'Français', flag: '🇫🇷' },  // New
  { code: 'tr', label: 'Türkçe', native: 'Türkçe', flag: '🇹🇷' }      // New
];

// Update validation arrays:
if (stored && ['ar', 'en', 'fr', 'tr'].includes(stored)) {
```

### **2. Update Database Schema**

```sql
-- Add new language columns to existing tables
ALTER TABLE services 
ADD COLUMN name_fr TEXT,
ADD COLUMN description_fr TEXT,
ADD COLUMN name_tr TEXT,
ADD COLUMN description_tr TEXT;

-- Update indexes if needed
CREATE INDEX idx_services_name_fr ON services(name_fr);
CREATE INDEX idx_services_name_tr ON services(name_tr);
```

### **3. Update Components**

```jsx
// Bilingual components automatically support new languages
// Just ensure field naming follows pattern: field_[langcode]

const getFieldName = (baseField) => `${baseField}_${currentLanguage}`;
// This will work for 'fr' and 'tr' automatically
```

### **4. Add RTL Support (if needed)**

```jsx
// Update direction detection
const getRTLLanguages = () => ['ar', 'he', 'fa']; // Add other RTL languages

const getDirection = () => getRTLLanguages().includes(currentLanguage) ? 'rtl' : 'ltr';
```

---

## 📊 **Performance Monitoring**

### **Key Metrics to Track**

1. **Language Switch Performance**
```jsx
const trackLanguageSwitch = (fromLang, toLang, duration) => {
  analytics.track('language_switch', {
    from: fromLang,
    to: toLang,
    duration_ms: duration,
    user_role: profile.role
  });
};
```

2. **Component Render Count**
```jsx
const useRenderCount = (componentName) => {
  const renderCount = useRef(0);
  renderCount.current++;
  
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`${componentName} rendered ${renderCount.current} times`);
    }
  });
};
```

3. **Memory Usage**
```jsx
const trackMemoryUsage = () => {
  if (performance.memory) {
    console.log({
      used: Math.round(performance.memory.usedJSHeapSize / 1048576),
      total: Math.round(performance.memory.totalJSHeapSize / 1048576),
      limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
    });
  }
};
```

---

## 🔄 **Migration Checklist**

### **Before Migration**
- [ ] Backup database with existing dual-language data
- [ ] Document current language field patterns
- [ ] Identify all forms and components requiring migration
- [ ] Test current functionality in both languages

### **During Migration**
- [ ] Install enhanced LanguageContext
- [ ] Create bilingual components (BilingualInput, BilingualTextarea, etc.)
- [ ] Migrate forms one by one
- [ ] Update validation logic
- [ ] Test each migrated component
- [ ] Verify admin dual-language toggle works

### **After Migration**
- [ ] Remove old dual-field components
- [ ] Update all form submissions to use single-language payloads
- [ ] Run comprehensive testing suite
- [ ] Verify performance benchmarks
- [ ] Document any custom patterns
- [ ] Train team on new system

---

## 🚀 **Deployment**

### **Pre-deployment Checklist**
- [ ] All tests passing (unit, integration, e2e)
- [ ] Performance benchmarks met
- [ ] Build size within acceptable limits
- [ ] No console errors or warnings
- [ ] Accessibility tests passed
- [ ] Cross-browser testing completed

### **Post-deployment Monitoring**
- [ ] Monitor language switch success rates
- [ ] Track form submission error rates
- [ ] Monitor page load times in both languages
- [ ] Check for memory leaks in production
- [ ] Gather user feedback on new UX

---

## 🎉 **Success Metrics**

### **User Experience**
- Language switch completion time < 500ms
- Zero dual-language confusion reports
- Improved form completion rates
- Positive user feedback on single-language UX

### **Developer Experience**
- Reduced form development time by 60%
- Consistent patterns across all components
- Easy language addition process
- Comprehensive test coverage

### **Performance**
- No measurable performance regression
- Optimized bundle size
- Efficient re-rendering patterns
- Memory usage within normal bounds

---

## 📞 **Support & Resources**

### **Documentation**
- [Component Storybook](./storybook-url)
- [API Reference](./api-docs)
- [Testing Guide](./testing-guide)

### **Team Contacts**
- **Frontend Lead**: [Contact Info]
- **UX Designer**: [Contact Info]  
- **QA Engineer**: [Contact Info]

### **Useful Links**
- [Figma Designs](./figma-url)
- [GitHub Repository](./github-url)
- [Issue Tracker](./issues-url)

---

*This guide is a living document. Please update it as the system evolves and new patterns emerge.* 