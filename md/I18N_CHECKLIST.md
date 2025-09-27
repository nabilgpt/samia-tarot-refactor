# M37 — Internationalization (i18n) Checklist

## Overview
This checklist ensures proper internationalization implementation for Arabic-English bilingual support on the Samia Tarot platform, with WCAG 2.2 AA compliance.

## ✅ Language Configuration

### Language Detection & Storage
- [ ] Default language set to Arabic (`ar`)
- [ ] Language preference stored in `localStorage`
- [ ] Browser language detection fallback implemented
- [ ] Language switching preserves user session

### Document Language Attributes
- [ ] `<html lang="ar">` dynamically updated
- [ ] `<html dir="rtl">` switches with language
- [ ] Meta content-language headers set correctly
- [ ] Direction meta tag updated (`name="direction"`)

### Language Context
- [ ] `LanguageContext` provider wraps application
- [ ] `useLanguage()` hook available in all components
- [ ] Language change functions accessible globally
- [ ] Loading states handled during language switches

## ✅ Text Direction & Layout

### RTL/LTR Support
- [ ] Arabic content displays right-to-left
- [ ] English content displays left-to-right
- [ ] Mixed content handles bidirectional text correctly
- [ ] Form inputs respect text direction

### CSS Direction Classes
- [ ] `.rtl` and `.ltr` classes applied to `<html>`
- [ ] Direction-specific styles implemented
- [ ] Icon positioning adjusts for RTL/LTR
- [ ] Margin/padding use logical properties

### Layout Adjustments
- [ ] Navigation menus flip for RTL
- [ ] Dropdown positioning respects text direction
- [ ] Form layouts adapt to language direction
- [ ] Card/grid layouts handle RTL correctly

## ✅ Font & Typography

### Font Stacks
- [ ] Arabic fonts loaded (Noto Sans Arabic, Cairo, Amiri)
- [ ] Latin fonts loaded (Inter, system fonts)
- [ ] Font loading optimized with `font-display: swap`
- [ ] Fallback fonts provide good coverage

### Typography Scales
- [ ] Font sizes appropriate for both scripts
- [ ] Line heights work for Arabic and Latin text
- [ ] Letter spacing optimized per language
- [ ] Font weights available across languages

### Text Rendering
- [ ] Arabic text shaping works correctly
- [ ] Ligatures and contextual forms supported
- [ ] Diacritics/kashida handled properly
- [ ] Word wrapping respects language rules

## ✅ Translation System

### Translation Architecture
- [ ] CLDR-compliant plural rules implemented
- [ ] Arabic plurals (zero/one/two/few/many/other) working
- [ ] English plurals (one/other) working
- [ ] MessageFormat with explicit categories

### Translation Keys
- [ ] Consistent naming convention used
- [ ] Nested key structure for organization
- [ ] Plural forms defined for countable items
- [ ] Variable interpolation working (`{{variable}}`)

### Content Coverage
- [ ] All user-visible text translated
- [ ] Error messages in both languages
- [ ] Form labels and placeholders translated
- [ ] Navigation and menu items translated
- [ ] SEO meta tags translated

## ✅ CLDR Plural Rules

### Arabic Plural Categories
- [ ] `zero`: 0 items → "لا توجد عناصر"
- [ ] `one`: 1 item → "عنصر واحد"
- [ ] `two`: 2 items → "عنصران"
- [ ] `few`: 3-10 items → "{{count}} عناصر"
- [ ] `many`: 11-99 items → "{{count}} عنصراً"
- [ ] `other`: 100+ items → "{{count}} عنصر"

### English Plural Categories
- [ ] `one`: 1 item → "{{count}} item"
- [ ] `other`: all other counts → "{{count}} items"

### Implementation
- [ ] `getPluralCategory()` function working
- [ ] Plural rules tested with comprehensive test cases
- [ ] Edge cases handled (negatives, decimals, large numbers)
- [ ] Consistent behavior across components

## ✅ Pseudo-localization Testing

### Test Coverage
- [ ] Pseudo-localization utility implemented
- [ ] Text expansion testing (30-60% longer text)
- [ ] Pseudo-Arabic RTL testing
- [ ] Layout overflow detection

### Testing Tools
- [ ] `PseudoLocalizationTester` component available
- [ ] Length analysis for truncation detection
- [ ] Visual layout tests for buttons/cards
- [ ] Recommendations for text length issues

### Test Cases
- [ ] Button text expansion tested
- [ ] Form labels tested with longer text
- [ ] Error messages tested for overflow
- [ ] Navigation items tested for truncation

## ✅ Cultural Adaptation

### Date & Time
- [ ] Date formats localized (Hijri calendar support planned)
- [ ] Time zones handled correctly
- [ ] First day of week varies by locale
- [ ] Date/time input formats localized

### Numbers & Currency
- [ ] Number formatting per locale (Arabic numerals)
- [ ] Currency symbols and formatting
- [ ] Percentage and decimal formatting
- [ ] Large number formatting (thousands separators)

### Cultural Considerations
- [ ] Color meanings considered (green, red, etc.)
- [ ] Religious/cultural sensitivity in content
- [ ] Region-specific legal requirements
- [ ] Local business practices reflected

## ✅ Form & Input Handling

### Input Validation
- [ ] Validation messages in user's language
- [ ] Error messages culturally appropriate
- [ ] Input methods support Arabic keyboard
- [ ] Input direction changes with language

### Field Labels & Hints
- [ ] All form labels translated
- [ ] Placeholder text in correct language
- [ ] Help text and tooltips translated
- [ ] Required field indicators localized

### Data Entry
- [ ] Name fields support Arabic characters
- [ ] Address formats per country/region
- [ ] Phone number formats per locale
- [ ] Search supports both languages

## ✅ SEO & Metadata

### HTML Meta Tags
- [ ] `hreflang` attributes for language versions
- [ ] Translated page titles
- [ ] Meta descriptions in both languages
- [ ] Open Graph tags localized

### URL Structure
- [ ] Language-specific URLs planned
- [ ] URL slugs transliterated appropriately
- [ ] Canonical URLs for each language
- [ ] Sitemap includes all language versions

### Search Optimization
- [ ] Keywords researched per language
- [ ] Content optimized for Arabic search
- [ ] Local search optimization
- [ ] Social media tags localized

## ✅ Performance & Loading

### Font Loading
- [ ] Critical fonts preloaded
- [ ] Font loading doesn't block rendering
- [ ] FOUT/FOIT minimized with font-display
- [ ] Subsetting for better performance

### Translation Loading
- [ ] Translations bundled efficiently
- [ ] Language switching doesn't require full reload
- [ ] Translation updates don't break caching
- [ ] Dynamic imports for large translation files

### Image Localization
- [ ] Images with text available in both languages
- [ ] Icon directions adjusted for RTL
- [ ] Cultural imagery appropriate
- [ ] Alt text translated for images

## ✅ Testing & Quality Assurance

### Automated Testing
- [ ] Translation completeness tests
- [ ] CLDR plural rule tests pass
- [ ] Language switching integration tests
- [ ] RTL/LTR layout tests

### Manual Testing
- [ ] Native speakers review translations
- [ ] Cultural consultants review content
- [ ] RTL layout manually verified
- [ ] Cross-browser testing completed

### User Testing
- [ ] Arabic-speaking users test interface
- [ ] English-speaking users test interface
- [ ] Mixed-content scenarios tested
- [ ] Accessibility with screen readers in Arabic

## ✅ Accessibility Integration

### Screen Reader Support
- [ ] ARIA labels translated appropriately
- [ ] Language changes announced to screen readers
- [ ] Arabic screen reader compatibility verified
- [ ] Direction changes announced properly

### Keyboard Navigation
- [ ] Tab order logical in both RTL and LTR
- [ ] Keyboard shortcuts work in both layouts
- [ ] Focus indicators visible in both directions
- [ ] Skip links work with RTL layout

## Implementation Status

### Completed Features ✅
- [x] CLDR Arabic plural rules with comprehensive tests
- [x] Dynamic language switching with document attribute updates
- [x] RTL/LTR layout support with CSS classes
- [x] Pseudo-localization testing tools
- [x] Translation system with variable interpolation
- [x] Screen reader announcements for language changes
- [x] Font optimization for Arabic and Latin scripts

### Integration Points
- [x] `LanguageContext` with CLDR support
- [x] `pseudoLocalize()` and `pseudoArabic()` utilities
- [x] `PseudoLocalizationTester` component
- [x] Translation tests (`LanguageContext.test.js`)

## Testing Commands

```bash
# Run i18n tests
npm run test:i18n

# Test CLDR plural rules
npm test src/context/LanguageContext.test.js

# Test pseudo-localization
npm run test:pseudo

# Validate translations
npm run validate:translations
```

## Language-Specific Considerations

### Arabic Language Features
- **Script**: Arabic (right-to-left)
- **Plural Rules**: 6 categories (zero/one/two/few/many/other)
- **Character Set**: Arabic Unicode blocks
- **Calendars**: Gregorian + Hijri support planned
- **Numerals**: Arabic-Indic (٠١٢٣) + Arabic (0123)

### English Language Features
- **Script**: Latin (left-to-right)
- **Plural Rules**: 2 categories (one/other)
- **Character Set**: Basic Latin + extended
- **Calendars**: Gregorian
- **Numerals**: Arabic (0123)

## Resources

### Standards & Guidelines
- [Unicode CLDR](http://cldr.unicode.org/)
- [BCP 47 Language Tags](https://www.rfc-editor.org/rfc/bcp/bcp47.txt)
- [Unicode Bidirectional Algorithm](https://unicode.org/reports/tr9/)
- [W3C Internationalization](https://www.w3.org/International/)

### Arabic Language Resources
- [Arabic Typography](https://arabictypography.com/)
- [Arabic Localization Standards](https://www.lisa.org/)
- [Arabic Keyboard Layouts](https://en.wikipedia.org/wiki/Arabic_keyboard)

### Testing Tools
- [Pseudo-localization Examples](https://developer.mozilla.org/en-US/docs/Web/Localization/Pseudo_localization)
- [RTL Testing Tools](https://rtlstyling.com/)
- [Arabic Text Analysis](https://github.com/unicode-org/icu)

---

**Last Updated:** M37 Implementation  
**Next Review:** Before production deployment  
**Maintained By:** Internationalization Team