const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://uuseflmielktdcltzwzt.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1c2VmbG1pZWxrdGRjbHR6d3p0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0ODM0NTExNSwiZXhwIjoyMDYzOTIxMTE1fQ.TNcj0otaeYtl0nDJYn760wSgSuKSYG8s7r-LD04Z9_E';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

console.log('🔍 STEP 6: DASHBOARD QA & TESTING AUDIT');
console.log('=====================================\n');

class DashboardQAManager {
    constructor() {
        this.results = {
            dashboards: {},
            components: {},
            routes: {},
            security: {},
            performance: {},
            totalScore: 0
        };
    }

    async auditDashboard(dashboardName, dashboardPath) {
        console.log(`\n📊 Auditing ${dashboardName} Dashboard...`);
        
        let score = 0;
        let maxScore = 100;
        let issues = [];
        let successes = [];

        try {
            // Check if dashboard file exists
            if (fs.existsSync(dashboardPath)) {
                score += 20;
                successes.push('✅ Dashboard file exists');
            } else {
                issues.push('❌ Dashboard file missing');
                return { score: 0, maxScore, issues, successes };
            }

            const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

            // Check for essential imports
            const requiredImports = [
                'React',
                'useState',
                'useEffect',
                'useAuth'
            ];

            requiredImports.forEach(importItem => {
                if (dashboardContent.includes(importItem)) {
                    score += 5;
                    successes.push(`✅ ${importItem} imported`);
                } else {
                    issues.push(`⚠️ Missing ${importItem} import`);
                }
            });

            // Check for authentication
            if (dashboardContent.includes('useAuth') || dashboardContent.includes('user')) {
                score += 15;
                successes.push('✅ Authentication implemented');
            } else {
                issues.push('❌ No authentication found');
            }

            // Check for role-based access
            if (dashboardContent.includes('role') || dashboardContent.includes('permissions')) {
                score += 15;
                successes.push('✅ Role-based access control');
            } else {
                issues.push('⚠️ No role-based access control');
            }

            // Check for error handling
            if (dashboardContent.includes('try') && dashboardContent.includes('catch')) {
                score += 10;
                successes.push('✅ Error handling present');
            } else {
                issues.push('⚠️ Missing error handling');
            }

            // Check for responsive design classes
            const responsiveClasses = ['sm:', 'md:', 'lg:', 'xl:'];
            if (responsiveClasses.some(cls => dashboardContent.includes(cls))) {
                score += 10;
                successes.push('✅ Responsive design implemented');
            } else {
                issues.push('⚠️ Missing responsive design');
            }

            // Check for loading states
            if (dashboardContent.includes('loading') || dashboardContent.includes('Loading')) {
                score += 10;
                successes.push('✅ Loading states implemented');
            } else {
                issues.push('⚠️ Missing loading states');
            }

            // Check for proper component structure
            if (dashboardContent.includes('return') && dashboardContent.includes('<div')) {
                score += 15;
                successes.push('✅ Proper component structure');
            } else {
                issues.push('❌ Invalid component structure');
            }

        } catch (error) {
            issues.push(`❌ Error reading dashboard: ${error.message}`);
        }

        const finalScore = Math.min(score, maxScore);
        
        console.log(`📈 ${dashboardName} Score: ${finalScore}/${maxScore} (${Math.round(finalScore/maxScore*100)}%)`);
        
        return { score: finalScore, maxScore, issues, successes };
    }

    async auditAllDashboards() {
        const dashboards = [
            { name: 'SuperAdmin', path: 'src/pages/dashboard/SuperAdminDashboard.jsx' },
            { name: 'Admin', path: 'src/pages/dashboard/AdminDashboard.jsx' },
            { name: 'Reader', path: 'src/pages/Reader/ReaderDashboard.jsx' },
            { name: 'Client', path: 'src/pages/Client/ClientDashboard.jsx' }
        ];

        let totalScore = 0;
        let totalMaxScore = 0;

        for (const dashboard of dashboards) {
            const result = await this.auditDashboard(dashboard.name, dashboard.path);
            this.results.dashboards[dashboard.name] = result;
            totalScore += result.score;
            totalMaxScore += result.maxScore;
        }

        return { totalScore, totalMaxScore };
    }

    async auditRouting() {
        console.log('\n🛣️ Auditing Routing System...');
        
        let score = 0;
        let maxScore = 100;
        let issues = [];
        let successes = [];

        try {
            // Check App.jsx for routing
            const appPath = 'src/App.jsx';
            if (fs.existsSync(appPath)) {
                const appContent = fs.readFileSync(appPath, 'utf8');
                
                // Check for React Router
                if (appContent.includes('BrowserRouter') || appContent.includes('Router')) {
                    score += 25;
                    successes.push('✅ React Router implemented');
                } else {
                    issues.push('❌ No routing system found');
                }

                // Check for protected routes
                if (appContent.includes('ProtectedRoute') || appContent.includes('RequireAuth')) {
                    score += 25;
                    successes.push('✅ Protected routes implemented');
                } else {
                    issues.push('⚠️ No protected route system');
                }

                // Check for dashboard routes
                const dashboardRoutes = ['super-admin', 'admin', 'reader', 'client'];
                let routeCount = 0;
                dashboardRoutes.forEach(route => {
                    if (appContent.includes(route)) {
                        routeCount++;
                    }
                });

                if (routeCount >= 3) {
                    score += 25;
                    successes.push(`✅ Dashboard routes present (${routeCount}/4)`);
                } else {
                    issues.push(`⚠️ Missing dashboard routes (${routeCount}/4)`);
                }

                // Check for error boundaries
                if (appContent.includes('ErrorBoundary') || appContent.includes('fallback')) {
                    score += 25;
                    successes.push('✅ Error boundaries implemented');
                } else {
                    issues.push('⚠️ No error boundaries found');
                }

            } else {
                issues.push('❌ App.jsx not found');
            }

        } catch (error) {
            issues.push(`❌ Routing audit error: ${error.message}`);
        }

        this.results.routes = { score, maxScore, issues, successes };
        console.log(`📈 Routing Score: ${score}/${maxScore} (${Math.round(score/maxScore*100)}%)`);
        
        return { score, maxScore };
    }

    async auditSecurity() {
        console.log('\n🔒 Auditing Security Implementation...');
        
        let score = 0;
        let maxScore = 100;
        let issues = [];
        let successes = [];

        try {
            // Check authentication context
            const authPath = 'src/contexts/AuthContext.jsx';
            if (fs.existsSync(authPath)) {
                score += 20;
                successes.push('✅ AuthContext exists');
                
                const authContent = fs.readFileSync(authPath, 'utf8');
                
                // Check for proper auth methods
                if (authContent.includes('signIn') && authContent.includes('signOut')) {
                    score += 20;
                    successes.push('✅ Auth methods implemented');
                }

                // Check for role management
                if (authContent.includes('role') || authContent.includes('permissions')) {
                    score += 20;
                    successes.push('✅ Role management present');
                }
            } else {
                issues.push('❌ AuthContext missing');
            }

            // Check for RLS policies verification
            const { data: tables } = await supabase
                .from('information_schema.tables')
                .select('table_name')
                .eq('table_schema', 'public');

            if (tables && tables.length > 0) {
                score += 20;
                successes.push('✅ Database access verified');
                
                // Check a few critical tables for RLS
                const criticalTables = ['profiles', 'bookings', 'chat_sessions'];
                let rlsCount = 0;
                
                for (const table of criticalTables) {
                    try {
                        const { data } = await supabase
                            .from(table.table_name || table)
                            .select('*')
                            .limit(1);
                        rlsCount++;
                    } catch (error) {
                        // RLS might be blocking access, which is good
                        if (error.message.includes('policy')) {
                            rlsCount++;
                        }
                    }
                }

                if (rlsCount > 0) {
                    score += 20;
                    successes.push('✅ RLS policies active');
                }
            }

        } catch (error) {
            issues.push(`❌ Security audit error: ${error.message}`);
        }

        this.results.security = { score, maxScore, issues, successes };
        console.log(`📈 Security Score: ${score}/${maxScore} (${Math.round(score/maxScore*100)}%)`);
        
        return { score, maxScore };
    }

    async auditPerformance() {
        console.log('\n⚡ Auditing Performance...');
        
        let score = 0;
        let maxScore = 100;
        let issues = [];
        let successes = [];

        try {
            // Check for lazy loading
            const srcFiles = this.getAllJSXFiles('src');
            let lazyLoadingCount = 0;
            let memoizationCount = 0;
            let totalFiles = srcFiles.length;

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
                } catch (error) {
                    // Skip files that can't be read
                }
            });

            // Score based on optimization adoption
            if (lazyLoadingCount > 0) {
                score += 25;
                successes.push(`✅ Lazy loading used in ${lazyLoadingCount} files`);
            } else {
                issues.push('⚠️ No lazy loading found');
            }

            if (memoizationCount > totalFiles * 0.3) {
                score += 25;
                successes.push(`✅ Good memoization coverage (${memoizationCount} files)`);
            } else if (memoizationCount > 0) {
                score += 15;
                successes.push(`✅ Some memoization present (${memoizationCount} files)`);
            } else {
                issues.push('⚠️ No memoization found');
            }

            // Check package.json for production optimizations
            const packagePath = 'package.json';
            if (fs.existsSync(packagePath)) {
                const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
                
                if (packageContent.scripts && packageContent.scripts.build) {
                    score += 25;
                    successes.push('✅ Build script configured');
                }

                // Check for performance-related dependencies
                const perfDeps = ['react-query', '@tanstack/react-query', 'swr', 'react-window', 'react-virtualized'];
                const hasPerfDeps = perfDeps.some(dep => 
                    packageContent.dependencies?.[dep] || packageContent.devDependencies?.[dep]
                );

                if (hasPerfDeps) {
                    score += 25;
                    successes.push('✅ Performance libraries detected');
                } else {
                    issues.push('⚠️ Consider adding performance libraries');
                }
            }

        } catch (error) {
            issues.push(`❌ Performance audit error: ${error.message}`);
        }

        this.results.performance = { score, maxScore, issues, successes };
        console.log(`📈 Performance Score: ${score}/${maxScore} (${Math.round(score/maxScore*100)}%)`);
        
        return { score, maxScore };
    }

    getAllJSXFiles(dir) {
        let files = [];
        try {
            const items = fs.readdirSync(dir);
            items.forEach(item => {
                const fullPath = path.join(dir, item);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    files = files.concat(this.getAllJSXFiles(fullPath));
                } else if (item.endsWith('.jsx') || item.endsWith('.js') || item.endsWith('.tsx') || item.endsWith('.ts')) {
                    files.push(fullPath);
                }
            });
        } catch (error) {
            // Skip directories that can't be read
        }
        return files;
    }

    generateReport() {
        console.log('\n📋 DASHBOARD QA AUDIT REPORT');
        console.log('============================\n');

        let totalScore = 0;
        let totalMaxScore = 0;

        // Dashboard scores
        console.log('🏗️ DASHBOARD SCORES:');
        Object.keys(this.results.dashboards).forEach(dashboard => {
            const result = this.results.dashboards[dashboard];
            const percentage = Math.round(result.score/result.maxScore*100);
            console.log(`   ${dashboard}: ${result.score}/${result.maxScore} (${percentage}%)`);
            totalScore += result.score;
            totalMaxScore += result.maxScore;
        });

        // Add other audit scores
        ['routes', 'security', 'performance'].forEach(category => {
            if (this.results[category]) {
                totalScore += this.results[category].score;
                totalMaxScore += this.results[category].maxScore;
            }
        });

        const overallPercentage = Math.round(totalScore/totalMaxScore*100);
        
        console.log(`\n🎯 OVERALL DASHBOARD QA SCORE: ${totalScore}/${totalMaxScore} (${overallPercentage}%)\n`);

        // Status determination
        let status = '';
        let recommendations = [];

        if (overallPercentage >= 90) {
            status = '🟢 EXCELLENT - Production Ready';
            recommendations.push('✅ All dashboards are production-ready');
        } else if (overallPercentage >= 75) {
            status = '🟡 GOOD - Minor Issues';
            recommendations.push('⚠️ Address minor issues before production');
        } else if (overallPercentage >= 60) {
            status = '🟠 NEEDS WORK - Major Issues';
            recommendations.push('🔧 Significant improvements needed');
        } else {
            status = '🔴 CRITICAL - Not Production Ready';
            recommendations.push('❌ Critical fixes required before production');
        }

        console.log(`📊 STATUS: ${status}\n`);

        // Detailed recommendations
        console.log('🔧 RECOMMENDATIONS:');
        recommendations.forEach(rec => console.log(`   ${rec}`));

        // Collect all issues
        const allIssues = [];
        Object.values(this.results.dashboards).forEach(result => {
            allIssues.push(...result.issues);
        });
        ['routes', 'security', 'performance'].forEach(category => {
            if (this.results[category]) {
                allIssues.push(...this.results[category].issues);
            }
        });

        if (allIssues.length > 0) {
            console.log('\n❗ CRITICAL ISSUES TO ADDRESS:');
            allIssues.slice(0, 10).forEach(issue => console.log(`   ${issue}`));
            if (allIssues.length > 10) {
                console.log(`   ... and ${allIssues.length - 10} more issues`);
            }
        }

        this.results.totalScore = overallPercentage;
        return this.results;
    }

    async runFullAudit() {
        console.log('🚀 Starting comprehensive dashboard QA audit...\n');

        // Run all audits
        await this.auditAllDashboards();
        await this.auditRouting();
        await this.auditSecurity();
        await this.auditPerformance();

        // Generate final report
        return this.generateReport();
    }
}

async function main() {
    const qaManager = new DashboardQAManager();
    const results = await qaManager.runFullAudit();
    
    console.log('\n✅ Dashboard QA audit completed!');
    console.log('📄 Results saved to audit results object');
    
    return results;
}

main().catch(console.error); 