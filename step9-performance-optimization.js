const fs = require('fs');
const path = require('path');

console.log('⚡ STEP 9: PERFORMANCE OPTIMIZATION AUDIT');
console.log('=========================================\n');

class PerformanceOptimizationManager {
    constructor() {
        this.results = {
            bundleSize: {},
            codeOptimization: {},
            assetsOptimization: {},
            renderingOptimization: {},
            caching: {},
            recommendations: [],
            totalScore: 0
        };
    }

    async auditBundleSize() {
        console.log('📦 Auditing Bundle Size...');
        
        let score = 0;
        let maxScore = 100;
        let bundleFiles = [];
        let optimizations = [];

        try {
            // Check if build directory exists
            if (fs.existsSync('dist') || fs.existsSync('build')) {
                const buildDir = fs.existsSync('dist') ? 'dist' : 'build';
                score += 20;
                console.log(`✅ Build directory found: ${buildDir}`);
                
                // Analyze bundle files
                const files = this.getAllFiles(buildDir);
                bundleFiles = files.filter(f => f.endsWith('.js') || f.endsWith('.css'));
                
                bundleFiles.forEach(file => {
                    const stats = fs.statSync(file);
                    const sizeKB = Math.round(stats.size / 1024);
                    
                    if (sizeKB < 500) { // Good size
                        score += 5;
                        optimizations.push(`✅ ${path.basename(file)}: ${sizeKB}KB (Good)`);
                    } else if (sizeKB < 1000) { // Acceptable
                        score += 3;
                        optimizations.push(`⚠️ ${path.basename(file)}: ${sizeKB}KB (Large)`);
                    } else { // Too large
                        optimizations.push(`❌ ${path.basename(file)}: ${sizeKB}KB (Too Large)`);
                    }
                });
                
                score = Math.min(score, maxScore);
            } else {
                console.log('❌ No build directory found');
                optimizations.push('Build the project first: npm run build');
            }

        } catch (error) {
            console.log(`❌ Bundle size audit error: ${error.message}`);
        }

        this.results.bundleSize = { 
            score, 
            maxScore, 
            bundleFiles: bundleFiles.length,
            optimizations,
            percentage: Math.round(score/maxScore*100)
        };

        console.log(`📈 Bundle Size Score: ${score}/${maxScore} (${Math.round(score/maxScore*100)}%)\n`);
        return { score, maxScore };
    }

    async auditCodeOptimization() {
        console.log('🔧 Auditing Code Optimization...');
        
        let score = 0;
        let maxScore = 100;
        let optimizations = [];

        try {
            const srcFiles = this.getAllJSFiles('src');
            let lazyLoadingCount = 0;
            let memoizationCount = 0;
            let unusedImportsCount = 0;

            srcFiles.forEach(file => {
                try {
                    const content = fs.readFileSync(file, 'utf8');
                    
                    // Check for lazy loading
                    if (content.includes('React.lazy') || content.includes('lazy(')) {
                        lazyLoadingCount++;
                    }

                    // Check for memoization
                    if (content.includes('useMemo') || content.includes('useCallback') || content.includes('React.memo')) {
                        memoizationCount++;
                    }

                    // Simple check for unused imports (basic pattern)
                    const importMatches = content.match(/import.*from/g);
                    if (importMatches) {
                        importMatches.forEach(imp => {
                            const varName = imp.match(/import\s+(\w+)/);
                            if (varName && !content.includes(varName[1] + '(') && !content.includes('<' + varName[1])) {
                                unusedImportsCount++;
                            }
                        });
                    }
                } catch (error) {
                    // Skip files that can't be read
                }
            });

            // Scoring
            if (lazyLoadingCount > 0) {
                score += 25;
                optimizations.push(`✅ Lazy loading used in ${lazyLoadingCount} files`);
            } else {
                optimizations.push('❌ No lazy loading found');
            }

            if (memoizationCount > srcFiles.length * 0.2) {
                score += 25;
                optimizations.push(`✅ Good memoization coverage (${memoizationCount} files)`);
            } else {
                optimizations.push(`⚠️ Limited memoization (${memoizationCount} files)`);
            }

            if (unusedImportsCount === 0) {
                score += 25;
                optimizations.push('✅ No unused imports detected');
            } else {
                optimizations.push(`⚠️ ${unusedImportsCount} potential unused imports`);
            }

            // Check for build optimization
            if (fs.existsSync('package.json')) {
                const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
                if (pkg.scripts && pkg.scripts.build && pkg.scripts.build.includes('--optimize')) {
                    score += 25;
                    optimizations.push('✅ Build optimization configured');
                } else {
                    optimizations.push('⚠️ Build optimization not configured');
                }
            }

        } catch (error) {
            console.log(`❌ Code optimization audit error: ${error.message}`);
        }

        this.results.codeOptimization = { 
            score, 
            maxScore, 
            optimizations,
            percentage: Math.round(score/maxScore*100)
        };

        console.log(`📈 Code Optimization Score: ${score}/${maxScore} (${Math.round(score/maxScore*100)}%)\n`);
        return { score, maxScore };
    }

    async auditRenderingOptimization() {
        console.log('🖼️ Auditing Rendering Optimization...');
        
        let score = 0;
        let maxScore = 100;
        let optimizations = [];

        try {
            const componentFiles = this.getAllJSFiles('src').filter(f => 
                f.endsWith('.jsx') || f.endsWith('.tsx')
            );

            let memoizedComponents = 0;
            let virtualScrolling = 0;
            let imageOptimization = 0;

            componentFiles.forEach(file => {
                try {
                    const content = fs.readFileSync(file, 'utf8');
                    
                    // Check for memoized components
                    if (content.includes('React.memo') || content.includes('memo(')) {
                        memoizedComponents++;
                    }

                    // Check for virtual scrolling
                    if (content.includes('react-window') || content.includes('react-virtualized')) {
                        virtualScrolling++;
                    }

                    // Check for image optimization
                    if (content.includes('loading="lazy"') || content.includes('Image') || content.includes('picture')) {
                        imageOptimization++;
                    }
                } catch (error) {
                    // Skip files that can't be read
                }
            });

            // Scoring
            if (memoizedComponents > componentFiles.length * 0.3) {
                score += 30;
                optimizations.push(`✅ Good component memoization (${memoizedComponents})`);
            } else {
                optimizations.push(`⚠️ Limited component memoization (${memoizedComponents})`);
            }

            if (virtualScrolling > 0) {
                score += 25;
                optimizations.push(`✅ Virtual scrolling implemented (${virtualScrolling})`);
            } else {
                optimizations.push('⚠️ No virtual scrolling found');
            }

            if (imageOptimization > 0) {
                score += 25;
                optimizations.push(`✅ Image optimization found (${imageOptimization})`);
            } else {
                optimizations.push('⚠️ No image optimization found');
            }

            // Check for performance monitoring
            const hasPerformanceMonitoring = componentFiles.some(file => {
                try {
                    const content = fs.readFileSync(file, 'utf8');
                    return content.includes('useProfiler') || content.includes('performance.');
                } catch {
                    return false;
                }
            });

            if (hasPerformanceMonitoring) {
                score += 20;
                optimizations.push('✅ Performance monitoring detected');
            } else {
                optimizations.push('⚠️ No performance monitoring found');
            }

        } catch (error) {
            console.log(`❌ Rendering optimization audit error: ${error.message}`);
        }

        this.results.renderingOptimization = { 
            score, 
            maxScore, 
            optimizations,
            percentage: Math.round(score/maxScore*100)
        };

        console.log(`📈 Rendering Optimization Score: ${score}/${maxScore} (${Math.round(score/maxScore*100)}%)\n`);
        return { score, maxScore };
    }

    async createPerformanceOptimizations() {
        console.log('🔧 Creating Performance Optimizations...');

        // Create performance monitoring hook
        if (!fs.existsSync('src/hooks/usePerformance.js')) {
            await this.createPerformanceHook();
        }

        // Create image optimization component
        if (!fs.existsSync('src/components/OptimizedImage.jsx')) {
            await this.createOptimizedImageComponent();
        }

        // Update package.json with optimization scripts
        await this.updatePackageJsonOptimizations();

        console.log('✅ Performance optimizations created\n');
    }

    async createPerformanceHook() {
        const performanceHookContent = `import { useEffect, useCallback, useRef } from 'react';

/**
 * Performance monitoring hook
 * Tracks component render times and provides optimization insights
 */
export const usePerformance = (componentName) => {
  const renderStartTime = useRef();
  const renderCount = useRef(0);

  const startTiming = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  const endTiming = useCallback(() => {
    if (renderStartTime.current) {
      const duration = performance.now() - renderStartTime.current;
      renderCount.current++;
      
      // Log slow renders (>16ms for 60fps)
      if (duration > 16) {
        console.warn(\`Slow render detected in \${componentName}: \${duration.toFixed(2)}ms\`);
      }

      // Log performance data for analysis
      if (process.env.NODE_ENV === 'development') {
        console.log(\`\${componentName} render #\${renderCount.current}: \${duration.toFixed(2)}ms\`);
      }
    }
  }, [componentName]);

  const measureRender = useCallback((renderFunction) => {
    startTiming();
    const result = renderFunction();
    endTiming();
    return result;
  }, [startTiming, endTiming]);

  return {
    startTiming,
    endTiming,
    measureRender,
    renderCount: renderCount.current
  };
};

/**
 * Web Vitals monitoring hook
 */
export const useWebVitals = () => {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'web-vitals' in window) {
      import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
        getCLS(console.log);
        getFID(console.log);
        getFCP(console.log);
        getLCP(console.log);
        getTTFB(console.log);
      });
    }
  }, []);
};

export default usePerformance;
`;

        fs.writeFileSync('src/hooks/usePerformance.js', performanceHookContent);
        console.log('✅ Created performance monitoring hook');
    }

    async createOptimizedImageComponent() {
        const optimizedImageContent = `import React, { useState, useRef, useEffect } from 'react';

/**
 * Optimized image component with lazy loading and progressive enhancement
 */
const OptimizedImage = ({ 
  src, 
  alt, 
  className = '', 
  placeholder = null,
  lazy = true,
  webp = true,
  ...props 
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(!lazy);
  const [imageSrc, setImageSrc] = useState(placeholder || '');
  const imgRef = useRef();

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazy || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [lazy, isInView]);

  // Load image when in view
  useEffect(() => {
    if (!isInView) return;

    const img = new Image();
    img.onload = () => {
      setImageSrc(src);
      setIsLoaded(true);
    };
    img.onerror = () => {
      console.error(\`Failed to load image: \${src}\`);
      setIsLoaded(true); // Show alt text
    };
    
    // Use WebP if supported and requested
    if (webp && supportsWebP()) {
      const webpSrc = src.replace(/\\.(jpg|jpeg|png)$/i, '.webp');
      img.src = webpSrc;
    } else {
      img.src = src;
    }
  }, [isInView, src, webp]);

  // Check WebP support
  const supportsWebP = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').startsWith('data:image/webp');
  };

  return (
    <div 
      ref={imgRef}
      className={\`relative overflow-hidden \${className}\`}
      {...props}
    >
      {/* Placeholder while loading */}
      {!isLoaded && placeholder && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center">
          {typeof placeholder === 'string' ? (
            <div className="text-gray-400 text-sm">{placeholder}</div>
          ) : (
            placeholder
          )}
        </div>
      )}
      
      {/* Actual image */}
      {isInView && (
        <img
          src={imageSrc}
          alt={alt}
          loading={lazy ? "lazy" : "eager"}
          className={\`transition-opacity duration-300 \${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } \${className}\`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setIsLoaded(true)}
        />
      )}
    </div>
  );
};

export default OptimizedImage;
`;

        if (!fs.existsSync('src/components')) {
            fs.mkdirSync('src/components', { recursive: true });
        }
        
        fs.writeFileSync('src/components/OptimizedImage.jsx', optimizedImageContent);
        console.log('✅ Created optimized image component');
    }

    async updatePackageJsonOptimizations() {
        try {
            if (fs.existsSync('package.json')) {
                const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
                
                // Add performance scripts
                pkg.scripts = pkg.scripts || {};
                pkg.scripts['analyze'] = 'npm run build && npx webpack-bundle-analyzer build/static/js/*.js';
                pkg.scripts['perf:audit'] = 'lighthouse http://localhost:3000 --output=json --output-path=./performance-audit.json';
                pkg.scripts['build:analyze'] = 'npm run build -- --analyze';
                
                // Add performance dependencies
                pkg.devDependencies = pkg.devDependencies || {};
                if (!pkg.devDependencies['webpack-bundle-analyzer'] && !pkg.dependencies['webpack-bundle-analyzer']) {
                    pkg.devDependencies['webpack-bundle-analyzer'] = '^4.9.0';
                }
                if (!pkg.devDependencies['web-vitals'] && !pkg.dependencies['web-vitals']) {
                    pkg.dependencies['web-vitals'] = '^3.4.0';
                }

                fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
                console.log('✅ Updated package.json with performance optimizations');
            }
        } catch (error) {
            console.log(`⚠️ Error updating package.json: ${error.message}`);
        }
    }

    getAllFiles(dir, files = []) {
        try {
            const items = fs.readdirSync(dir);
            items.forEach(item => {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    this.getAllFiles(fullPath, files);
                } else {
                    files.push(fullPath);
                }
            });
        } catch (error) {
            // Skip directories that can't be read
        }
        return files;
    }

    getAllJSFiles(dir) {
        const allFiles = this.getAllFiles(dir);
        return allFiles.filter(file => 
            file.endsWith('.js') || file.endsWith('.jsx') || 
            file.endsWith('.ts') || file.endsWith('.tsx')
        );
    }

    generateReport() {
        console.log('\n📋 PERFORMANCE OPTIMIZATION AUDIT REPORT');
        console.log('========================================\n');

        const totalScore = this.results.bundleSize.score + 
                          this.results.codeOptimization.score + 
                          this.results.renderingOptimization.score;

        const maxScore = this.results.bundleSize.maxScore + 
                        this.results.codeOptimization.maxScore + 
                        this.results.renderingOptimization.maxScore;

        const overallPercentage = Math.round(totalScore / maxScore * 100);

        console.log('⚡ PERFORMANCE COMPONENT SCORES:');
        console.log(`   Bundle Size: ${this.results.bundleSize.score}/${this.results.bundleSize.maxScore} (${this.results.bundleSize.percentage}%)`);
        console.log(`   Code Optimization: ${this.results.codeOptimization.score}/${this.results.codeOptimization.maxScore} (${this.results.codeOptimization.percentage}%)`);
        console.log(`   Rendering Optimization: ${this.results.renderingOptimization.score}/${this.results.renderingOptimization.maxScore} (${this.results.renderingOptimization.percentage}%)`);

        console.log(`\n🎯 OVERALL PERFORMANCE SCORE: ${totalScore}/${maxScore} (${overallPercentage}%)\n`);

        // Status determination
        let status = '';
        if (overallPercentage >= 80) {
            status = '🟢 EXCELLENT - Highly Optimized';
        } else if (overallPercentage >= 60) {
            status = '🟡 GOOD - Well Optimized';
        } else if (overallPercentage >= 40) {
            status = '🟠 NEEDS WORK - Optimization Required';
        } else {
            status = '🔴 CRITICAL - Poor Performance';
        }

        console.log(`📊 STATUS: ${status}\n`);

        this.results.totalScore = overallPercentage;
        return this.results;
    }

    async runFullAudit() {
        console.log('🚀 Starting comprehensive performance optimization audit...\n');

        await this.auditBundleSize();
        await this.auditCodeOptimization();
        await this.auditRenderingOptimization();
        await this.createPerformanceOptimizations();

        return this.generateReport();
    }
}

async function main() {
    const perfManager = new PerformanceOptimizationManager();
    const results = await perfManager.runFullAudit();
    
    console.log('\n✅ Performance optimization audit completed!');
    console.log('⚡ Performance enhancements implemented');
    
    return results;
}

main().catch(console.error); 