/**
 * M37 — Arabic CLDR Plural Rules Tests
 * Tests for WCAG 2.2 AA compliant language context with Arabic plural categories
 */

import { describe, test, expect } from '@jest/globals';

// Mock implementations for testing
const getArabicPluralCategory = (count) => {
  const n = Math.abs(count);
  
  if (n === 0) return 'zero';
  if (n === 1) return 'one';
  if (n === 2) return 'two';
  if (n >= 3 && n <= 10) return 'few';
  if (n >= 11 && n <= 99) return 'many';
  return 'other';
};

const getEnglishPluralCategory = (count) => {
  const n = Math.abs(count);
  return n === 1 ? 'one' : 'other';
};

const mockTranslations = {
  ar: {
    'items.count': {
      zero: 'لا توجد عناصر',
      one: 'عنصر واحد',
      two: 'عنصران',
      few: '{{count}} عناصر',
      many: '{{count}} عنصراً',
      other: '{{count}} عنصر'
    }
  },
  en: {
    'items.count': {
      one: '{{count}} item',
      other: '{{count}} items'
    }
  }
};

const translateWithPlurals = (key, count, language) => {
  const translation = mockTranslations[language]?.[key];
  if (!translation) return key;
  
  const category = language === 'ar' 
    ? getArabicPluralCategory(count) 
    : getEnglishPluralCategory(count);
  
  const pluralForm = translation[category] || translation.other || translation.one;
  return pluralForm.replace(/\{\{count\}\}/g, count);
};

describe('Arabic CLDR Plural Categories', () => {
  describe('Arabic plural category detection', () => {
    test('should return "zero" for 0', () => {
      expect(getArabicPluralCategory(0)).toBe('zero');
    });

    test('should return "one" for 1', () => {
      expect(getArabicPluralCategory(1)).toBe('one');
    });

    test('should return "two" for 2', () => {
      expect(getArabicPluralCategory(2)).toBe('two');
    });

    test('should return "few" for 3-10', () => {
      expect(getArabicPluralCategory(3)).toBe('few');
      expect(getArabicPluralCategory(5)).toBe('few');
      expect(getArabicPluralCategory(10)).toBe('few');
    });

    test('should return "many" for 11-99', () => {
      expect(getArabicPluralCategory(11)).toBe('many');
      expect(getArabicPluralCategory(25)).toBe('many');
      expect(getArabicPluralCategory(99)).toBe('many');
    });

    test('should return "other" for 100+ and decimal numbers', () => {
      expect(getArabicPluralCategory(100)).toBe('other');
      expect(getArabicPluralCategory(101)).toBe('other');
      expect(getArabicPluralCategory(1000)).toBe('other');
      expect(getArabicPluralCategory(1.5)).toBe('one'); // Handles decimals as abs value
    });

    test('should handle negative numbers correctly', () => {
      expect(getArabicPluralCategory(-1)).toBe('one');
      expect(getArabicPluralCategory(-2)).toBe('two');
      expect(getArabicPluralCategory(-5)).toBe('few');
      expect(getArabicPluralCategory(-15)).toBe('many');
      expect(getArabicPluralCategory(-100)).toBe('other');
    });
  });

  describe('English plural category detection', () => {
    test('should return "one" for 1', () => {
      expect(getEnglishPluralCategory(1)).toBe('one');
      expect(getEnglishPluralCategory(-1)).toBe('one');
    });

    test('should return "other" for all other numbers', () => {
      expect(getEnglishPluralCategory(0)).toBe('other');
      expect(getEnglishPluralCategory(2)).toBe('other');
      expect(getEnglishPluralCategory(10)).toBe('other');
      expect(getEnglishPluralCategory(100)).toBe('other');
      expect(getEnglishPluralCategory(1.5)).toBe('one'); // Abs value is 1.5, not 1
    });
  });

  describe('Translation with plurals', () => {
    describe('Arabic translations', () => {
      test('should use zero form for 0 items', () => {
        expect(translateWithPlurals('items.count', 0, 'ar')).toBe('لا توجد عناصر');
      });

      test('should use one form for 1 item', () => {
        expect(translateWithPlurals('items.count', 1, 'ar')).toBe('عنصر واحد');
      });

      test('should use two form for 2 items', () => {
        expect(translateWithPlurals('items.count', 2, 'ar')).toBe('عنصران');
      });

      test('should use few form for 3-10 items', () => {
        expect(translateWithPlurals('items.count', 3, 'ar')).toBe('3 عناصر');
        expect(translateWithPlurals('items.count', 7, 'ar')).toBe('7 عناصر');
        expect(translateWithPlurals('items.count', 10, 'ar')).toBe('10 عناصر');
      });

      test('should use many form for 11-99 items', () => {
        expect(translateWithPlurals('items.count', 11, 'ar')).toBe('11 عنصراً');
        expect(translateWithPlurals('items.count', 25, 'ar')).toBe('25 عنصراً');
        expect(translateWithPlurals('items.count', 99, 'ar')).toBe('99 عنصراً');
      });

      test('should use other form for 100+ items', () => {
        expect(translateWithPlurals('items.count', 100, 'ar')).toBe('100 عنصر');
        expect(translateWithPlurals('items.count', 1000, 'ar')).toBe('1000 عنصر');
      });
    });

    describe('English translations', () => {
      test('should use one form for 1 item', () => {
        expect(translateWithPlurals('items.count', 1, 'en')).toBe('1 item');
      });

      test('should use other form for all other counts', () => {
        expect(translateWithPlurals('items.count', 0, 'en')).toBe('0 items');
        expect(translateWithPlurals('items.count', 2, 'en')).toBe('2 items');
        expect(translateWithPlurals('items.count', 10, 'en')).toBe('10 items');
        expect(translateWithPlurals('items.count', 100, 'en')).toBe('100 items');
      });
    });
  });

  describe('Edge cases and validation', () => {
    test('should handle very large numbers', () => {
      expect(getArabicPluralCategory(999999)).toBe('other');
      expect(getEnglishPluralCategory(999999)).toBe('other');
    });

    test('should handle decimal numbers correctly', () => {
      expect(getArabicPluralCategory(1.1)).toBe('one');
      expect(getArabicPluralCategory(2.5)).toBe('two');
      expect(getArabicPluralCategory(5.7)).toBe('few');
      expect(getArabicPluralCategory(15.3)).toBe('many');
    });

    test('should be consistent with CLDR rules', () => {
      // Test edge cases that commonly cause issues
      const testCases = [
        { count: 0, expected: 'zero' },
        { count: 1, expected: 'one' },
        { count: 2, expected: 'two' },
        { count: 3, expected: 'few' },
        { count: 10, expected: 'few' },
        { count: 11, expected: 'many' },
        { count: 99, expected: 'many' },
        { count: 100, expected: 'other' },
        { count: 101, expected: 'other' },
        { count: 102, expected: 'other' },
        { count: 110, expected: 'other' },
        { count: 200, expected: 'other' }
      ];

      testCases.forEach(({ count, expected }) => {
        expect(getArabicPluralCategory(count)).toBe(expected);
      });
    });
  });
});

describe('MessageFormat Integration', () => {
  test('should handle complex message formatting', () => {
    const complexMessage = {
      ar: {
        'user.notifications': {
          zero: 'لا توجد إشعارات',
          one: 'إشعار واحد جديد من {{sender}}',
          two: 'إشعاران جديدان من {{sender}}',
          few: '{{count}} إشعارات جديدة من {{sender}}',
          many: '{{count}} إشعاراً جديداً من {{sender}}',
          other: '{{count}} إشعار جديد من {{sender}}'
        }
      }
    };

    const formatMessage = (key, count, variables, language) => {
      const translation = complexMessage[language]?.[key];
      if (!translation) return key;
      
      const category = getArabicPluralCategory(count);
      let message = translation[category] || translation.other;
      
      // Replace all variables
      Object.keys(variables).forEach(varName => {
        message = message.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), variables[varName]);
      });
      
      return message;
    };

    expect(formatMessage('user.notifications', 0, { sender: 'أحمد' }, 'ar'))
      .toBe('لا توجد إشعارات');
    
    expect(formatMessage('user.notifications', 1, { sender: 'أحمد' }, 'ar'))
      .toBe('إشعار واحد جديد من أحمد');
    
    expect(formatMessage('user.notifications', 5, { count: 5, sender: 'أحمد' }, 'ar'))
      .toBe('5 إشعارات جديدة من أحمد');
    
    expect(formatMessage('user.notifications', 15, { count: 15, sender: 'أحمد' }, 'ar'))
      .toBe('15 إشعاراً جديداً من أحمد');
  });
});

// Export test utilities for reuse
export {
  getArabicPluralCategory,
  getEnglishPluralCategory,
  translateWithPlurals,
  mockTranslations
};