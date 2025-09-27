#!/usr/bin/env python3

"""
M37 — WCAG 2.2 AA Color Contrast Audit
Analyzes CSS color combinations for WCAG compliance
"""

import re
import math
import json
from pathlib import Path

class ColorContrastAuditor:
    def __init__(self):
        self.wcag_aa_normal = 4.5  # WCAG AA for normal text
        self.wcag_aa_large = 3.0   # WCAG AA for large text (18pt+ or 14pt+ bold)
        self.wcag_aa_ui = 3.0      # WCAG AA for UI components
        
        # CSS color definitions from the cosmic theme
        self.theme_colors = {
            # Dark theme (default)
            '--bg-primary': '#0f172a',
            '--bg-secondary': '#1e293b', 
            '--bg-tertiary': '#334155',
            '--bg-card': 'rgba(30, 41, 59, 0.8)',
            '--text-primary': '#ffffff',
            '--text-secondary': '#e2e8f0',
            '--text-muted': '#94a3b8',
            '--cosmic-primary': '#d946ef',
            '--cosmic-secondary': '#8b5cf6',
            '--gold-primary': '#fbbf24',
            '--gold-secondary': '#f59e0b',
            '--border-cosmic': 'rgba(217, 70, 239, 0.3)',
            '--border-color': 'rgba(251, 191, 36, 0.2)',
            
            # WCAG compliant colors (enhanced)
            '--text-primary-wcag': '#ffffff',
            '--text-secondary-wcag': '#e2e8f0',
            '--text-muted-wcag': '#cbd5e1',
            '--cosmic-primary-wcag': '#e879f9',
            '--cosmic-secondary-wcag': '#a78bfa',
            '--gold-primary-wcag': '#fcd34d',
            '--gold-secondary-wcag': '#fbbf24',
            '--border-cosmic-wcag': 'rgba(232, 121, 249, 0.6)',
            '--border-gold-wcag': 'rgba(252, 211, 77, 0.5)',
            
            # Light theme
            '--bg-primary-light': '#f8fafc',
            '--bg-secondary-light': '#e2e8f0',
            '--text-primary-light': '#1e293b',
            '--text-secondary-light': '#475569',
            '--text-muted-light': '#64748b',
            '--cosmic-primary-light': '#8b5cf6',
            '--gold-primary-light': '#d97706',
            
            # WCAG light theme
            '--cosmic-primary-light-wcag': '#7c3aed',
            '--gold-primary-light-wcag': '#d97706'
        }

    def hex_to_rgb(self, hex_color):
        """Convert hex color to RGB tuple"""
        hex_color = hex_color.lstrip('#')
        if len(hex_color) == 3:
            hex_color = ''.join([c*2 for c in hex_color])
        try:
            return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
        except ValueError:
            return None

    def rgba_to_rgb(self, rgba_str, background_rgb=(15, 23, 42)):
        """Convert rgba string to RGB with alpha blending"""
        match = re.search(r'rgba?\(([^)]+)\)', rgba_str)
        if not match:
            return None
            
        values = [float(x.strip()) for x in match.group(1).split(',')]
        
        if len(values) == 3:
            return tuple(int(v) for v in values)
        elif len(values) == 4:
            # Alpha blending with background
            alpha = values[3]
            r = int(values[0] * alpha + background_rgb[0] * (1 - alpha))
            g = int(values[1] * alpha + background_rgb[1] * (1 - alpha))
            b = int(values[2] * alpha + background_rgb[2] * (1 - alpha))
            return (r, g, b)
        
        return None

    def parse_color(self, color_str):
        """Parse various color formats to RGB"""
        color_str = color_str.strip()
        
        # Hex colors
        if color_str.startswith('#'):
            return self.hex_to_rgb(color_str)
        
        # RGB/RGBA colors
        if 'rgb' in color_str:
            return self.rgba_to_rgb(color_str)
        
        # CSS variables - resolve from theme
        if color_str.startswith('var('):
            var_match = re.search(r'var\((--[^,)]+)', color_str)
            if var_match:
                var_name = var_match.group(1)
                if var_name in self.theme_colors:
                    return self.parse_color(self.theme_colors[var_name])
        
        # Named colors
        named_colors = {
            'white': (255, 255, 255),
            'black': (0, 0, 0),
            'red': (255, 0, 0),
            'green': (0, 128, 0),
            'blue': (0, 0, 255),
            'transparent': None
        }
        
        return named_colors.get(color_str.lower())

    def get_relative_luminance(self, rgb):
        """Calculate relative luminance according to WCAG"""
        if not rgb:
            return 0
            
        def luminance_component(c):
            c = c / 255.0
            if c <= 0.03928:
                return c / 12.92
            else:
                return math.pow((c + 0.055) / 1.055, 2.4)
        
        r, g, b = rgb
        return 0.2126 * luminance_component(r) + 0.7152 * luminance_component(g) + 0.0722 * luminance_component(b)

    def calculate_contrast_ratio(self, color1, color2):
        """Calculate contrast ratio between two colors"""
        rgb1 = self.parse_color(color1)
        rgb2 = self.parse_color(color2)
        
        if not rgb1 or not rgb2:
            return None
            
        lum1 = self.get_relative_luminance(rgb1)
        lum2 = self.get_relative_luminance(rgb2)
        
        # Ensure lighter color is numerator
        if lum1 < lum2:
            lum1, lum2 = lum2, lum1
            
        return (lum1 + 0.05) / (lum2 + 0.05)

    def check_contrast_compliance(self, foreground, background, text_size='normal'):
        """Check if color combination meets WCAG AA standards"""
        ratio = self.calculate_contrast_ratio(foreground, background)
        
        if ratio is None:
            return {'ratio': None, 'compliant': False, 'standard': 'unknown'}
        
        # Determine required ratio based on text size and type
        if text_size == 'large':
            required_ratio = self.wcag_aa_large
            standard = 'WCAG AA Large Text'
        elif text_size == 'ui':
            required_ratio = self.wcag_aa_ui
            standard = 'WCAG AA UI Component'
        else:
            required_ratio = self.wcag_aa_normal
            standard = 'WCAG AA Normal Text'
        
        return {
            'ratio': round(ratio, 2),
            'compliant': ratio >= required_ratio,
            'required': required_ratio,
            'standard': standard,
            'foreground': foreground,
            'background': background
        }

    def audit_cosmic_theme_combinations(self):
        """Audit all cosmic theme color combinations"""
        results = {
            'dark_theme': [],
            'light_theme': [],
            'summary': {
                'total_combinations': 0,
                'compliant_combinations': 0,
                'violations': []
            }
        }
        
        # Dark theme combinations (original + WCAG enhanced)
        dark_combinations = [
            # Original text on backgrounds
            ('#ffffff', '#0f172a', 'normal'),  # text-primary on bg-primary
            ('#e2e8f0', '#0f172a', 'normal'),  # text-secondary on bg-primary
            ('#94a3b8', '#0f172a', 'normal'),  # text-muted on bg-primary
            ('#ffffff', '#1e293b', 'normal'),  # text-primary on bg-secondary
            ('#e2e8f0', '#1e293b', 'normal'),  # text-secondary on bg-secondary
            ('#ffffff', 'rgba(30, 41, 59, 0.8)', 'normal'),  # text-primary on bg-card
            
            # WCAG enhanced text on backgrounds
            ('#cbd5e1', '#0f172a', 'normal'),  # text-muted-wcag on bg-primary
            
            # Original interactive elements
            ('#d946ef', '#0f172a', 'ui'),      # cosmic-primary on bg-primary
            ('#fbbf24', '#0f172a', 'ui'),      # gold-primary on bg-primary
            ('#8b5cf6', '#0f172a', 'ui'),      # cosmic-secondary on bg-primary
            ('#ffffff', '#d946ef', 'normal'),  # white text on cosmic-primary
            ('#ffffff', '#fbbf24', 'normal'),  # white text on gold-primary
            
            # WCAG enhanced interactive elements
            ('#e879f9', '#0f172a', 'ui'),      # cosmic-primary-wcag on bg-primary
            ('#fcd34d', '#0f172a', 'ui'),      # gold-primary-wcag on bg-primary
            ('#a78bfa', '#0f172a', 'ui'),      # cosmic-secondary-wcag on bg-primary
            ('#1e1b4b', '#e879f9', 'normal'),  # text on cosmic-primary-wcag
            ('#1e1b4b', '#fcd34d', 'normal'),  # text on gold-primary-wcag
            
            # Original borders and subtle elements
            ('rgba(217, 70, 239, 0.3)', '#0f172a', 'ui'),  # border-cosmic
            ('rgba(251, 191, 36, 0.2)', '#0f172a', 'ui'),  # border-color
            
            # WCAG enhanced borders
            ('rgba(232, 121, 249, 0.6)', '#0f172a', 'ui'),  # border-cosmic-wcag
            ('rgba(252, 211, 77, 0.5)', '#0f172a', 'ui'),  # border-gold-wcag
        ]
        
        # Light theme combinations (original + WCAG enhanced)
        light_combinations = [
            # Original light theme
            ('#1e293b', '#f8fafc', 'normal'),  # text-primary-light on bg-primary-light
            ('#475569', '#f8fafc', 'normal'),  # text-secondary-light on bg-primary-light
            ('#64748b', '#f8fafc', 'normal'),  # text-muted-light on bg-primary-light
            ('#8b5cf6', '#f8fafc', 'ui'),      # cosmic-primary-light on bg-primary-light
            ('#d97706', '#f8fafc', 'ui'),      # gold-primary-light on bg-primary-light
            ('#ffffff', '#8b5cf6', 'normal'),  # white text on cosmic-primary-light
            ('#ffffff', '#d97706', 'normal'),  # white text on gold-primary-light
            
            # WCAG enhanced light theme
            ('#7c3aed', '#f8fafc', 'ui'),      # cosmic-primary-light-wcag on bg-primary-light
            ('#ffffff', '#7c3aed', 'normal'),  # white text on cosmic-primary-light-wcag
        ]
        
        # Audit dark theme
        for fg, bg, size in dark_combinations:
            result = self.check_contrast_compliance(fg, bg, size)
            result['theme'] = 'dark'
            results['dark_theme'].append(result)
            
            results['summary']['total_combinations'] += 1
            if result['compliant']:
                results['summary']['compliant_combinations'] += 1
            else:
                results['summary']['violations'].append({
                    'theme': 'dark',
                    'foreground': fg,
                    'background': bg,
                    'type': size,
                    'ratio': result['ratio'],
                    'required': result['required']
                })
        
        # Audit light theme
        for fg, bg, size in light_combinations:
            result = self.check_contrast_compliance(fg, bg, size)
            result['theme'] = 'light'
            results['light_theme'].append(result)
            
            results['summary']['total_combinations'] += 1
            if result['compliant']:
                results['summary']['compliant_combinations'] += 1
            else:
                results['summary']['violations'].append({
                    'theme': 'light',
                    'foreground': fg,
                    'background': bg,
                    'type': size,
                    'ratio': result['ratio'],
                    'required': result['required']
                })
        
        return results

    def generate_contrast_report(self):
        """Generate comprehensive contrast audit report"""
        results = self.audit_cosmic_theme_combinations()
        
        # Calculate compliance rate
        total = results['summary']['total_combinations']
        compliant = results['summary']['compliant_combinations']
        compliance_rate = (compliant / total * 100) if total > 0 else 0
        
        # Generate recommendations for violations
        recommendations = []
        for violation in results['summary']['violations']:
            if violation['type'] == 'normal' and violation['ratio'] < 4.5:
                if violation['ratio'] < 3.0:
                    priority = 'HIGH'
                    action = 'Critical contrast violation - immediate fix required'
                else:
                    priority = 'MEDIUM'
                    action = 'Improve contrast for WCAG AA compliance'
            elif violation['type'] in ['large', 'ui'] and violation['ratio'] < 3.0:
                priority = 'MEDIUM'
                action = 'Improve contrast for large text/UI elements'
            else:
                priority = 'LOW'
                action = 'Minor contrast improvement needed'
            
            recommendations.append({
                'priority': priority,
                'action': action,
                'theme': violation['theme'],
                'combination': f"{violation['foreground']} on {violation['background']}",
                'current_ratio': violation['ratio'],
                'required_ratio': violation['required'],
                'suggestions': self.get_color_suggestions(violation)
            })
        
        report = {
            'timestamp': 'audit_timestamp',
            'wcag_version': '2.2 AA',
            'compliance_summary': {
                'total_combinations': total,
                'compliant_combinations': compliant,
                'violation_count': len(results['summary']['violations']),
                'compliance_rate': f"{compliance_rate:.1f}%",
                'overall_status': 'PASS' if len(results['summary']['violations']) == 0 else 'FAIL'
            },
            'theme_results': {
                'dark_theme': results['dark_theme'],
                'light_theme': results['light_theme']
            },
            'violations': results['summary']['violations'],
            'recommendations': recommendations,
            'standards': {
                'normal_text': f"≥{self.wcag_aa_normal}:1",
                'large_text': f"≥{self.wcag_aa_large}:1", 
                'ui_components': f"≥{self.wcag_aa_ui}:1"
            }
        }
        
        return report

    def get_color_suggestions(self, violation):
        """Generate specific color adjustment suggestions"""
        suggestions = []
        
        if violation['ratio'] < violation['required']:
            # Calculate how much we need to improve
            improvement_factor = violation['required'] / violation['ratio']
            
            if violation['theme'] == 'dark':
                suggestions.extend([
                    "Lighten the foreground color",
                    "Darken the background color", 
                    "Increase font weight for better perceived contrast",
                    "Add text shadow or stroke for enhanced visibility"
                ])
            else:
                suggestions.extend([
                    "Darken the foreground color",
                    "Lighten the background color",
                    "Use a bolder font weight",
                    "Consider adding subtle background patterns"
                ])
        
        return suggestions

def main():
    """Run the contrast audit"""
    print("M37 WCAG 2.2 AA Color Contrast Audit")
    print("=====================================")
    
    auditor = ColorContrastAuditor()
    report = auditor.generate_contrast_report()
    
    # Save detailed report
    with open('contrast_audit_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    # Print summary
    print(f"\nAudit Summary:")
    print(f"Total combinations tested: {report['compliance_summary']['total_combinations']}")
    print(f"Compliant combinations: {report['compliance_summary']['compliant_combinations']}")
    print(f"Violations found: {report['compliance_summary']['violation_count']}")
    print(f"Compliance rate: {report['compliance_summary']['compliance_rate']}")
    print(f"Overall status: {report['compliance_summary']['overall_status']}")
    
    if report['violations']:
        print(f"\nWCAG Violations Found:")
        for i, violation in enumerate(report['violations'][:5], 1):
            print(f"  {i}. {violation['theme']} theme: {violation['foreground']} on {violation['background']}")
            print(f"     Ratio: {violation['ratio']}:1 (required: {violation['required']}:1)")
    
    if report['recommendations']:
        print(f"\nTop Recommendations:")
        for rec in report['recommendations'][:3]:
            print(f"  {rec['priority']}: {rec['action']}")
            print(f"    {rec['combination']} - {rec['suggestions'][0]}")
    
    print(f"\nDetailed report saved: contrast_audit_report.json")
    
    return 0 if report['compliance_summary']['overall_status'] == 'PASS' else 1

if __name__ == "__main__":
    import sys
    sys.exit(main())