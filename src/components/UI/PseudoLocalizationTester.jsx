/**
 * M37 — Pseudo-localization Testing Component
 * Visual testing tool for text truncation and layout overlap issues
 */

import React, { useState } from 'react';
import { pseudoLocalize, pseudoArabic, analyzeTextLength, PSEUDO_TEST_CASES } from '../../utils/pseudoLocalization';
import { useLanguage } from '../../context/LanguageContext';

const PseudoLocalizationTester = ({ className = '' }) => {
  const { t } = useLanguage();
  const [testText, setTestText] = useState('Welcome to Samia Tarot');
  const [expansionType, setExpansionType] = useState('medium');
  const [testMode, setTestMode] = useState('pseudo');
  const [maxLength, setMaxLength] = useState(50);

  const getProcessedText = () => {
    switch (testMode) {
      case 'pseudo':
        return pseudoLocalize(testText, expansionType);
      case 'arabic':
        return pseudoArabic(testText);
      case 'original':
      default:
        return testText;
    }
  };

  const processedText = getProcessedText();
  const analysis = analyzeTextLength(processedText, maxLength);

  return (
    <div className={`p-6 bg-card border border-cosmic-border rounded-lg space-y-6 ${className}`}>
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-high-contrast">
          Pseudo-localization Tester
        </h3>
        <div className="text-sm text-muted">
          M37 Testing Tool
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-high-contrast">
            Test Mode
          </label>
          <select
            value={testMode}
            onChange={(e) => setTestMode(e.target.value)}
            className="w-full px-3 py-2 bg-input border border-cosmic-border rounded-lg text-text-primary"
          >
            <option value="original">Original Text</option>
            <option value="pseudo">Pseudo-localized</option>
            <option value="arabic">Pseudo-Arabic (RTL)</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-high-contrast">
            Expansion Type
          </label>
          <select
            value={expansionType}
            onChange={(e) => setExpansionType(e.target.value)}
            className="w-full px-3 py-2 bg-input border border-cosmic-border rounded-lg text-text-primary"
            disabled={testMode !== 'pseudo'}
          >
            <option value="short">Short Text (30%)</option>
            <option value="medium">Medium Text (40%)</option>
            <option value="long">Long Text (50%)</option>
            <option value="arabic">Arabic-like (60%)</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-high-contrast">
            Max Length
          </label>
          <input
            type="number"
            value={maxLength}
            onChange={(e) => setMaxLength(parseInt(e.target.value) || 50)}
            className="w-full px-3 py-2 bg-input border border-cosmic-border rounded-lg text-text-primary"
            min="10"
            max="200"
          />
        </div>
      </div>

      {/* Input Text */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-high-contrast">
          Test Text
        </label>
        <textarea
          value={testText}
          onChange={(e) => setTestText(e.target.value)}
          className="w-full px-3 py-2 bg-input border border-cosmic-border rounded-lg text-text-primary"
          rows="3"
          placeholder="Enter text to test..."
        />
      </div>

      {/* Output */}
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-high-contrast">
            Processed Text
          </label>
          <div className="p-4 bg-bg-secondary border border-cosmic-border rounded-lg">
            <div 
              className={`text-text-primary break-words ${testMode === 'arabic' ? 'text-right' : 'text-left'}`}
              dir={testMode === 'arabic' ? 'rtl' : 'ltr'}
            >
              {processedText}
            </div>
          </div>
        </div>

        {/* Analysis */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-high-contrast">
            Length Analysis
          </label>
          <div className="p-4 bg-bg-secondary border border-cosmic-border rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted">Length:</span>
              <span className={analysis.valid ? 'text-success' : 'text-error'}>
                {analysis.length} / {analysis.maxLength}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Word Count:</span>
              <span className="text-text-primary">{analysis.wordCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Has Variables:</span>
              <span className="text-text-primary">{analysis.hasVariables ? 'Yes' : 'No'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted">Status:</span>
              <span className={analysis.valid ? 'text-success' : 'text-error'}>
                {analysis.valid ? 'Valid' : 'Too Long'}
              </span>
            </div>
            {analysis.truncationRisk && (
              <div className="text-warning text-sm">
                ⚠️ Truncation risk detected
              </div>
            )}
          </div>
        </div>

        {/* Recommendations */}
        {analysis.recommendations.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-high-contrast">
              Recommendations
            </label>
            <div className="p-4 bg-bg-secondary border border-cosmic-border rounded-lg">
              <ul className="space-y-1 text-sm text-muted">
                {analysis.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start">
                    <span className="text-cosmic-primary mr-2">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Test Cases */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-high-contrast">
          Predefined Test Cases
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(PSEUDO_TEST_CASES).map(([key, testCase]) => (
            <div key={key} className="p-4 bg-bg-secondary border border-cosmic-border rounded-lg space-y-2">
              <h5 className="font-medium text-high-contrast capitalize">{key}</h5>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-muted">Original:</span>
                  <div className="text-text-primary">{testCase.original}</div>
                </div>
                <div>
                  <span className="text-muted">Pseudo:</span>
                  <div className="text-text-primary">{testCase.pseudo}</div>
                </div>
                <div>
                  <span className="text-muted">Arabic-like:</span>
                  <div className="text-text-primary text-right" dir="rtl">
                    {testCase.arabicLike}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setTestText(testCase.original)}
                className="px-3 py-1 text-xs bg-cosmic-primary text-white rounded hover:bg-cosmic-secondary transition-colors"
              >
                Test This
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Visual Layout Tests */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-high-contrast">
          Visual Layout Tests
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Button Test */}
          <div className="p-4 bg-bg-secondary border border-cosmic-border rounded-lg space-y-2">
            <h5 className="font-medium text-high-contrast">Button Test</h5>
            <div className="flex flex-wrap gap-2">
              <button className="px-4 py-2 bg-cosmic-primary text-white rounded hover:bg-cosmic-secondary transition-colors">
                {processedText}
              </button>
              <button className="px-4 py-2 bg-gold-primary text-gray-900 rounded hover:bg-gold-secondary transition-colors">
                {pseudoLocalize('Cancel', 'short')}
              </button>
            </div>
          </div>

          {/* Card Test */}
          <div className="p-4 bg-bg-secondary border border-cosmic-border rounded-lg space-y-2">
            <h5 className="font-medium text-high-contrast">Card Layout Test</h5>
            <div className="bg-bg-tertiary p-3 rounded border">
              <h6 className="font-medium text-high-contrast mb-2">
                {pseudoLocalize('Card Title', 'medium')}
              </h6>
              <p className="text-sm text-muted">
                {pseudoLocalize('This is a description that might wrap to multiple lines and could cause layout issues.', 'long')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Usage Instructions */}
      <div className="p-4 bg-bg-secondary border border-cosmic-border rounded-lg">
        <h4 className="text-md font-medium text-high-contrast mb-2">
          How to Use This Tool
        </h4>
        <div className="text-sm text-muted space-y-1">
          <p>• <strong>Pseudo-localized:</strong> Tests text expansion (common in translations)</p>
          <p>• <strong>Pseudo-Arabic:</strong> Tests RTL layout and right-to-left text flow</p>
          <p>• <strong>Length Analysis:</strong> Checks for potential truncation issues</p>
          <p>• <strong>Visual Tests:</strong> Shows how text looks in actual UI components</p>
          <p>• Look for text overflow, broken layouts, or awkward line breaks</p>
        </div>
      </div>
    </div>
  );
};

export default PseudoLocalizationTester;