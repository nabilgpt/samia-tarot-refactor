# 🚀 SAMIA TAROT - PRODUCTION DEPLOYMENT GUIDE
## **Enterprise-Grade Deployment & Operations Manual**

---

## 📋 **QUICK DEPLOYMENT CHECKLIST**

### **Pre-Deployment Verification** ✅
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificates obtained
- [ ] Monitoring systems ready
- [ ] Backup procedures tested
- [ ] Team notification setup

### **Deployment Execution** 🚀
- [ ] Run pre-deployment tests
- [ ] Create system backup
- [ ] Execute blue-green deployment
- [ ] Verify health checks
- [ ] Run smoke tests
- [ ] Monitor system metrics

### **Post-Deployment** 📊
- [ ] Confirm all services running
- [ ] Verify external integrations
- [ ] Check monitoring alerts
- [ ] Update documentation
- [ ] Notify stakeholders

---

## 🏗️ **INFRASTRUCTURE REQUIREMENTS**

### **Minimum Server Specifications**
```
🖥️ Production Server:
├── CPU: 4+ cores (Intel/AMD)
├── RAM: 8GB+ (16GB recommended)
├── Storage: 50GB+ SSD
├── Network: 1Gbps+ bandwidth
└── OS: Ubuntu 20.04+ LTS or CentOS 8+
```

### **Software Prerequisites**
```bash
📦 Required Software:
├── Docker 24.0+
├── Docker Compose 2.0+
├── Git 2.30+
├── Node.js 18+ (for development)
└── SSL Certificate (Let's Encrypt or commercial)
```

---

## 🔧 **INITIAL SERVER SETUP**

### **1. Server Preparation**
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git unzip htop

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Reboot to apply changes
sudo reboot
```

### **2. Security Configuration**
```bash
# Configure firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Create application user
sudo adduser samia
sudo usermod -aG docker samia
sudo su - samia
```

### **3. Directory Structure Setup**
```bash
# Create application directories
mkdir -p ~/samia-tarot/{logs,backups,uploads,temp-audio,monitoring,security}
cd ~/samia-tarot

# Set proper permissions
chmod 755 logs backups uploads temp-audio
chmod 700 monitoring security
```

---

## 📥 **APPLICATION DEPLOYMENT**

### **1. Repository Setup**
```bash
# Clone repository
git clone https://github.com/your-org/samia-tarot.git
cd samia-tarot

# Create environment file
cp .env.example .env
```

### **2. Environment Configuration**
```bash
# Edit environment variables
nano .env
```

#### **Required Environment Variables**
```env
# 🔒 Core Configuration
NODE_ENV=production
PORT=5001

# 🗄️ Database Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 🔐 Security
JWT_SECRET=your-ultra-secure-jwt-secret-min-64-chars
BCRYPT_ROUNDS=12

# 🤖 AI Services (Managed via Admin Dashboard)
# Note: Store in database via Super Admin Dashboard, not here

# 📧 Email Configuration
EMAIL_FROM=noreply@samiatarot.com
EMAIL_REPLY_TO=info@samiatarot.com

# 💳 Payment Configuration (Optional)
STRIPE_PUBLIC_KEY=pk_live_your_stripe_public_key
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key

# 📊 Monitoring
GRAFANA_PASSWORD=secure-grafana-password
REDIS_PASSWORD=secure-redis-password

# 🌐 Domain Configuration
DOMAIN=samiatarot.com
API_DOMAIN=api.samiatarot.com
```

### **3. SSL Certificate Setup**
```bash
# Install Certbot
sudo apt install certbot

# Generate SSL certificates
sudo certbot certonly --standalone -d samiatarot.com -d api.samiatarot.com

# Verify certificates
sudo ls -la /etc/letsencrypt/live/samiatarot.com/
```

### **4. Database Initialization**
```bash
# Apply database migrations
npm run db:migrate

# Seed initial data (if needed)
npm run db:seed:production
```

---

## 🚀 **PRODUCTION DEPLOYMENT**

### **Method 1: Using Deployment Script (Recommended)**
```bash
# Make script executable
chmod +x scripts/deploy.sh

# Run deployment
./scripts/deploy.sh deploy production
```

### **Method 2: Manual Deployment**
```bash
# Build and deploy
docker-compose down --remove-orphans
docker-compose build --no-cache
docker-compose up -d

# Verify deployment
docker-compose ps
docker-compose logs -f
```

### **3. Post-Deployment Verification**
```bash
# Check service health
curl -f http://localhost:5001/api/health
curl -f http://localhost:3000

# Monitor logs
docker-compose logs -f samia-backend
docker-compose logs -f samia-frontend

# Check monitoring stack
curl -f http://localhost:9090  # Prometheus
curl -f http://localhost:3001  # Grafana
```

---

## 🏥 **HEALTH MONITORING**

### **Automated Health Checks**
```bash
# Backend health endpoint
GET /api/health
Expected: 200 OK with {"status": "healthy"}

# Frontend health check
GET /
Expected: 200 OK with main page content

# Database connectivity
GET /api/health/database
Expected: 200 OK with database status
```

### **Service Monitoring URLs**
```
📊 Monitoring Dashboard URLs:
├── 🎯 Grafana: https://grafana.samiatarot.com
├── 🔍 Prometheus: https://prometheus.samiatarot.com
├── 📋 Traefik: https://traefik.samiatarot.com
└── 🏥 Uptime: https://uptime.samiatarot.com
```

---

## 📊 **MONITORING & ALERTING**

### **Key Metrics to Monitor**
```
🎯 Critical Metrics:
├── 🖥️ CPU Usage (Alert: >80%)
├── 💾 Memory Usage (Alert: >85%)
├── 💿 Disk Usage (Alert: >90%)
├── 🌐 Response Time (Alert: >2s)
├── 🔍 Error Rate (Alert: >5%)
└── 📊 Uptime (Alert: <99.9%)
```

### **Alert Configuration**
```yaml
# Prometheus Alert Rules
groups:
  - name: samia-tarot-alerts
    rules:
      - alert: HighCPUUsage
        expr: cpu_usage > 80
        for: 5m
        annotations:
          summary: "High CPU usage detected"
          
      - alert: ServiceDown
        expr: up == 0
        for: 1m
        annotations:
          summary: "Service is down"
```

---

## 🔄 **BACKUP & RECOVERY**

### **Automated Backup Strategy**
```bash
# Database backup (runs daily via cron)
0 2 * * * docker-compose exec -T samia-backend npm run backup:db

# Application backup
0 3 * * * tar -czf /backups/samia-app-$(date +%Y%m%d).tar.gz /home/samia/samia-tarot

# Cleanup old backups (keep 7 days)
0 4 * * * find /backups -name "*.tar.gz" -mtime +7 -delete
```

### **Manual Backup Process**
```bash
# Create immediate backup
./scripts/deploy.sh backup

# Verify backup
ls -la backups/

# Test restore process (staging environment)
./scripts/deploy.sh rollback latest
```

---

## 🚨 **TROUBLESHOOTING GUIDE**

### **Common Issues & Solutions**

#### **🚨 Service Won't Start**
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs service-name

# Check resource usage
docker stats

# Restart specific service
docker-compose restart service-name
```

#### **🚨 Database Connection Issues**
```bash
# Check database connectivity
docker-compose exec samia-backend npm run test:db-connection

# Verify environment variables
docker-compose exec samia-backend env | grep SUPABASE

# Check network connectivity
docker-compose exec samia-backend ping supabase.co
```

#### **🚨 SSL Certificate Issues**
```bash
# Check certificate status
sudo certbot certificates

# Renew certificates
sudo certbot renew --dry-run

# Reload Traefik
docker-compose restart traefik
```

#### **🚨 High Memory Usage**
```bash
# Check memory usage by container
docker stats --no-stream

# Clean up unused resources
docker system prune -f

# Restart high-memory services
docker-compose restart samia-backend
```

### **Emergency Procedures**

#### **🚨 Complete Service Outage**
```bash
# Emergency rollback
./scripts/deploy.sh rollback

# Check system resources
htop
df -h
free -m

# Restart all services
docker-compose down
docker-compose up -d
```

#### **🚨 Database Issues**
```bash
# Check database status
curl -f http://localhost:5001/api/health/database

# Restore from backup
# (Follow your database restore procedures)

# Verify data integrity
npm run test:data-integrity
```

---

## 📈 **PERFORMANCE OPTIMIZATION**

### **Application Performance**
```bash
# Enable production optimizations
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=2048"

# Configure PM2 for production
npm install -g pm2
pm2 start ecosystem.config.json --env production
pm2 startup
pm2 save
```

### **Database Performance**
```sql
-- Optimize database queries
-- Add indexes for frequently queried columns
-- Monitor slow query log
-- Regular VACUUM and ANALYZE
```

### **Caching Strategy**
```bash
# Redis configuration for caching
# Set appropriate TTL values
# Monitor cache hit rates
# Regular cache cleanup
```

---

## 🔐 **SECURITY BEST PRACTICES**

### **System Security**
- ✅ Regular security updates
- ✅ Firewall configuration
- ✅ SSH key authentication only
- ✅ Fail2ban intrusion detection
- ✅ Log monitoring and alerting

### **Application Security**
- ✅ Environment variable secrets
- ✅ HTTPS enforcement
- ✅ Security headers
- ✅ Input validation
- ✅ SQL injection prevention

### **Container Security**
- ✅ Non-root user containers
- ✅ Security scanning with Trivy
- ✅ Minimal base images
- ✅ Regular image updates
- ✅ Secret management

---

## 📞 **SUPPORT & CONTACTS**

### **Emergency Contacts**
```
🚨 Emergency Support:
├── 📧 Technical Lead: lead@samiatarot.com
├── 📱 DevOps Team: +1-xxx-xxx-xxxx
├── 🔒 Security Team: security@samiatarot.com
└── 💼 Management: info@samiatarot.com
```

### **Documentation Links**
- 📖 **API Documentation**: `/docs/api`
- 🏗️ **Architecture Guide**: `/docs/architecture`
- 🔒 **Security Policies**: `/docs/security`
- 📊 **Monitoring Guide**: `/docs/monitoring`

---

## ✅ **DEPLOYMENT CHECKLIST**

### **Final Pre-Launch Verification**
- [ ] All services responding to health checks
- [ ] SSL certificates valid and auto-renewing
- [ ] Monitoring and alerting configured
- [ ] Backup procedures tested
- [ ] Documentation updated
- [ ] Team trained on procedures
- [ ] Emergency procedures tested
- [ ] Performance baselines established
- [ ] Security audit completed
- [ ] Rollback procedures verified

---

**🚀 SAMIA TAROT is now PRODUCTION READY!**

**Deployment Date**: ___________  
**Deployed By**: ___________  
**Version**: ___________  
**Next Review**: ___________ 