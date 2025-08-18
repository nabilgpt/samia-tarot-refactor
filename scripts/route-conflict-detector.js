#!/usr/bin/env node

/**
 * Route Conflict Detection Script - SAMIA TAROT API
 * 
 * This script automatically detects duplicate route mounting patterns
 * that could cause conflicts in the Express.js API server.
 * 
 * Usage: node scripts/route-conflict-detector.js
 */

import fs from 'fs';
import path from 'path';

const API_INDEX_FILE = 'src/api/index.js';

class RouteConflictDetector {
  constructor() {
    this.routes = new Map();
    this.conflicts = [];
    this.imports = new Map();
  }

  /**
   * Read and analyze the API index file
   */
  async analyzeRoutes() {
    try {
      const filePath = path.resolve(API_INDEX_FILE);
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');

      console.log('🔍 [ROUTE DETECTOR] Analyzing route mounting patterns...');
      console.log(`📁 File: ${API_INDEX_FILE}`);
      console.log(`📄 Total lines: ${lines.length}`);

      this.detectImports(lines);
      this.detectRouteMounts(lines);
      this.detectConflicts();

      return this.generateReport();

    } catch (error) {
      console.error('❌ [ERROR] Failed to analyze routes:', error.message);
      return false;
    }
  }

  /**
   * Detect import statements for route modules
   */
  detectImports(lines) {
    const importRegex = /import\s+(\w+)\s+from\s+['"](.+?)['"];?/;
    
    lines.forEach((line, index) => {
      const match = line.match(importRegex);
      if (match && line.includes('Routes')) {
        const [, varName, modulePath] = match;
        if (this.imports.has(varName)) {
          this.imports.get(varName).push({ line: index + 1, path: modulePath });
        } else {
          this.imports.set(varName, [{ line: index + 1, path: modulePath }]);
        }
      }
    });
  }

  /**
   * Detect app.use() route mounting statements
   */
  detectRouteMounts(lines) {
    const routeMountRegex = /app\.use\s*\(\s*['"]([^'"]+)['"](?:\s*,\s*(.+))?\);?/;
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('app.use(')) {
        const match = trimmedLine.match(routeMountRegex);
        if (match) {
          const [, routePath, middleware] = match;
          const routeInfo = {
            line: index + 1,
            path: routePath,
            middleware: middleware ? middleware.trim() : '',
            fullLine: trimmedLine
          };

          if (this.routes.has(routePath)) {
            this.routes.get(routePath).push(routeInfo);
          } else {
            this.routes.set(routePath, [routeInfo]);
          }
        }
      }
    });
  }

  /**
   * Detect routing conflicts
   */
  detectConflicts() {
    // Check for duplicate route paths
    this.routes.forEach((mounts, routePath) => {
      if (mounts.length > 1) {
        this.conflicts.push({
          type: 'DUPLICATE_ROUTE_PATH',
          path: routePath,
          mounts: mounts,
          severity: 'HIGH'
        });
      }
    });

    // Check for duplicate imports
    this.imports.forEach((imports, varName) => {
      if (imports.length > 1) {
        this.conflicts.push({
          type: 'DUPLICATE_IMPORT',
          variable: varName,
          imports: imports,
          severity: 'CRITICAL'
        });
      }
    });
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 ROUTE CONFLICT DETECTION REPORT - SAMIA TAROT API');
    console.log('='.repeat(80));

    if (this.conflicts.length === 0) {
      console.log('✅ NO CONFLICTS DETECTED');
      console.log('🎉 All route mounting patterns are clean!');
      console.log('\n📊 SUMMARY:');
      console.log(`   • Total route paths: ${this.routes.size}`);
      console.log(`   • Total imports: ${this.imports.size}`);
      console.log(`   • Conflicts found: 0`);
      return true;
    }

    console.log(`❌ ${this.conflicts.length} CONFLICTS DETECTED`);

    // Group conflicts by severity
    const criticalConflicts = this.conflicts.filter(c => c.severity === 'CRITICAL');
    const highConflicts = this.conflicts.filter(c => c.severity === 'HIGH');

    if (criticalConflicts.length > 0) {
      console.log('\n🚨 CRITICAL CONFLICTS (MUST FIX):');
      criticalConflicts.forEach((conflict, index) => {
        console.log(`\n${index + 1}. ${conflict.type}:`);
        if (conflict.type === 'DUPLICATE_IMPORT') {
          console.log(`   Variable: ${conflict.variable}`);
          conflict.imports.forEach((imp, i) => {
            console.log(`   ${i + 1}) Line ${imp.line}: import from '${imp.path}'`);
          });
        }
      });
    }

    if (highConflicts.length > 0) {
      console.log('\n⚠️  HIGH SEVERITY CONFLICTS (RECOMMENDED FIX):');
      highConflicts.forEach((conflict, index) => {
        console.log(`\n${index + 1}. ${conflict.type}:`);
        if (conflict.type === 'DUPLICATE_ROUTE_PATH') {
          console.log(`   Route Path: ${conflict.path}`);
          conflict.mounts.forEach((mount, i) => {
            console.log(`   ${i + 1}) Line ${mount.line}: ${mount.fullLine}`);
          });
        }
      });
    }

    console.log('\n📊 SUMMARY:');
    console.log(`   • Total route paths: ${this.routes.size}`);
    console.log(`   • Total imports: ${this.imports.size}`);
    console.log(`   • Critical conflicts: ${criticalConflicts.length}`);
    console.log(`   • High severity conflicts: ${highConflicts.length}`);
    
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('   • Remove duplicate import statements');
    console.log('   • Consolidate duplicate route mounts');
    console.log('   • Use route arrays for multiple handlers on same path');
    
    return false;
  }
}

// Main execution
async function main() {
  const detector = new RouteConflictDetector();
  const success = await detector.analyzeRoutes();
  
  console.log('\n' + '='.repeat(80));
  
  if (success) {
    console.log('✅ Route conflict detection PASSED');
    process.exit(0);
  } else {
    console.log('❌ Route conflict detection FAILED');
    console.log('🔧 Please fix the conflicts before deployment');
    process.exit(1);
  }
}

// Run the detector
main().catch(error => {
  console.error('💥 Route conflict detector crashed:', error);
  process.exit(1);
}); 