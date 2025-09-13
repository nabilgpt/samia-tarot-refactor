# Triage Checklist

**Version**: 1.0  
**Owner**: Engineering Team  
**Last Updated**: 2025-01-13  

## Quick Reference

**Triage Goal**: Quickly identify customer symptoms and assign appropriate severity  
**Focus**: Customer impact, not internal technical details  
**Timeline**: Complete triage within 5 minutes for immediate response

---

## Step 1: Customer Symptoms Assessment (2 minutes)

### 🚨 **Critical Symptoms (SEV-1)**
Check if ANY of these customer symptoms are present:

- [ ] **Cannot access Samia Tarot website at all**
- [ ] **Cannot sign in or register** (authentication completely broken)
- [ ] **Cannot make any payments** (all payment methods failing)
- [ ] **Cannot book any readings** (booking system completely down)
- [ ] **Emergency Call feature not working** (cannot reach emergency services)
- [ ] **All readers reporting system unavailable**
- [ ] **Customer reports of data loss** (readings, profiles disappeared)

**If ANY checked**: **Declare SEV-1 immediately**, skip to [Emergency Response](#emergency-response)

### ⚠️ **Major Symptoms (SEV-2)**
Check if ANY of these symptoms are present:

- [ ] **Payment success rate significantly degraded** (>20% failures)
- [ ] **Booking system frequently failing** (users having to retry multiple times)
- [ ] **Website very slow** (takes >10 seconds to load pages)
- [ ] **Readers cannot deliver services** (reader tools not working)
- [ ] **Customers not receiving notifications** (emails/SMS not sending)
- [ ] **Multiple customer complaints** about same issue (>5 in 30 minutes)
- [ ] **One payment method completely down** (but others work)

**If ANY checked**: **Declare SEV-2**, proceed to [Investigation](#investigation-checklist)

### 📝 **Minor Symptoms (SEV-3)**
Check if symptoms are limited to:

- [ ] **Non-critical features not working** (daily horoscope, profile updates)
- [ ] **Cosmetic UI issues** (display problems but functionality works)
- [ ] **Admin tools slow or unavailable** (not affecting customer experience)
- [ ] **Individual user issues** (can be resolved with account-specific fixes)
- [ ] **Background processes delayed** (analytics, reporting not customer-facing)

**If ONLY these present**: **Declare SEV-3**, handle during business hours

---

## Step 2: Scope & Impact Assessment (2 minutes)

### User Impact Scale
- [ ] **All users affected** (100%) → SEV-1
- [ ] **Most users affected** (50-90%) → SEV-1 or SEV-2
- [ ] **Many users affected** (20-50%) → SEV-2
- [ ] **Some users affected** (5-20%) → SEV-2 or SEV-3
- [ ] **Few users affected** (<5%) → SEV-3

### Revenue Impact
- [ ] **All transactions blocked** → SEV-1
- [ ] **Significant revenue loss** (>20% of normal volume) → SEV-2
- [ ] **Minimal revenue impact** → SEV-3

### Duration Assessment
- [ ] **Issue ongoing >30 minutes** → Consider upgrading severity
- [ ] **Issue getting worse** → Consider upgrading severity
- [ ] **Issue spreading to other systems** → Consider upgrading severity

---

## Step 3: Quick System Health Check (1 minute)

### Automated Health Checks
```bash
# Run quick health validation
curl -s https://samia-tarot.com/health | grep -q "healthy" && echo "API: OK" || echo "API: FAIL"
curl -s https://samia-tarot.com/api/health/database | grep -q "healthy" && echo "DB: OK" || echo "DB: FAIL"
curl -s https://samia-tarot.com/api/health/providers | grep -q "healthy" && echo "Providers: OK" || echo "Providers: FAIL"
```

### Dashboard Quick Check
- [ ] **Golden Signals Dashboard**: Green/Yellow/Red?
- [ ] **Error Rate**: Above 1%?
- [ ] **Response Time**: P95 above 500ms?
- [ ] **Active Incidents**: Any existing alerts?

### Recent Changes
- [ ] **Deployment in last 4 hours**: Check deployment log
- [ ] **Config changes**: Any recent feature flag changes?
- [ ] **External provider issues**: Check Stripe/Twilio status pages

---

## Investigation Checklist

### For SEV-1 Incidents
Skip detailed investigation - focus on immediate mitigation:
- [ ] **Execute emergency rollback**: `python rollback_mechanisms.py emergency`
- [ ] **Notify team immediately**: Post in #samia-incident-response
- [ ] **Page on-call manager**: Use PagerDuty escalation
- [ ] **Start incident bridge**: Set up video call for coordination

### For SEV-2 Incidents
Quick investigation before mitigation:
- [ ] **Check error logs**: Look for patterns in last 30 minutes
- [ ] **Identify timeline**: When did symptoms start?
- [ ] **Check dependencies**: Are external services down?
- [ ] **Form hypothesis**: Most likely cause based on evidence
- [ ] **Test hypothesis**: Quick validation before implementing fix

### For SEV-3 Incidents
Standard investigation during business hours:
- [ ] **Assign to appropriate team member**
- [ ] **Create detailed ticket with reproduction steps**
- [ ] **Set priority based on customer impact**
- [ ] **Communicate timeline to stakeholders**

---

## Emergency Response

### Immediate Actions (SEV-1)
```bash
# 1. Emergency rollback (execute immediately)
python rollback_mechanisms.py emergency

# 2. Check if rollback helped
curl -f https://samia-tarot.com/health
```

### Communication (SEV-1)
```
🚨 SEV-1 INCIDENT DECLARED
Time: $(date)
Symptoms: [Brief customer-facing description]
Impact: [All users/Most users] cannot [core functionality]
Action: Emergency rollback executed
IC: [Assign incident commander]
ETA: Updates every 15 minutes
```

### Escalation (SEV-1)
- [ ] **Page primary on-call** immediately
- [ ] **Page engineering manager** if primary doesn't respond in 5 minutes
- [ ] **Activate incident bridge** for coordination
- [ ] **Update status page** within 10 minutes

---

## Symptom-Based Alert Patterns

### Website Availability
**Customer Symptom**: "Can't access the website"
**Investigation**:
- [ ] Check DNS resolution: `nslookup samia-tarot.com`
- [ ] Check CDN status
- [ ] Check load balancer health
- [ ] Check application server status

### Authentication Issues
**Customer Symptom**: "Can't sign in" or "Login not working"
**Investigation**:
- [ ] Test auth endpoint: `curl https://samia-tarot.com/api/auth/signin`
- [ ] Check Supabase Auth status
- [ ] Verify JWT validation
- [ ] Check rate limiting on auth endpoints

### Payment Failures
**Customer Symptom**: "Payment not going through" or "Card declined"
**Investigation**:
- [ ] Check Stripe/Square dashboards
- [ ] Test payment endpoints
- [ ] Check circuit breaker status: `python -c "from production_monitoring_service import ProductionMonitoringService; svc=ProductionMonitoringService(); print([cb.provider_name + ':' + cb.state.value for cb in svc.get_all_circuit_breakers()])"`
- [ ] Verify payment provider connectivity

### Booking Problems
**Customer Symptom**: "Can't book readings" or "Booking page not working"
**Investigation**:
- [ ] Test booking flow: `curl https://samia-tarot.com/api/orders`
- [ ] Check reader availability system
- [ ] Verify calendar integration
- [ ] Check database connectivity for bookings table

### Performance Issues
**Customer Symptom**: "Website very slow" or "Takes forever to load"
**Investigation**:
- [ ] Check response times: `curl -w "@curl-format.txt" https://samia-tarot.com/`
- [ ] Monitor CPU/memory usage
- [ ] Check database query performance
- [ ] Verify CDN cache hit rates

---

## Common False Alarms

### Not Usually Incidents
- [ ] **Single user account issues** (password resets, individual data problems)
- [ ] **Browser-specific problems** (cache issues, specific browser bugs)
- [ ] **Network issues from user's location** (ISP problems, local connectivity)
- [ ] **Feature requests** disguised as bug reports
- [ ] **Training/education issues** (users not understanding how to use features)

### Escalate If
- [ ] **Multiple users report same issue**
- [ ] **Issue affects core functionality**
- [ ] **Revenue impact detected**
- [ ] **Security implications**

---

## Handoff Checklist

### When Escalating
- [ ] **Document symptoms clearly**: What customers are experiencing
- [ ] **Provide timeline**: When issue started, when reported
- [ ] **Share evidence**: Logs, screenshots, error messages
- [ ] **State hypothesis**: Current theory of root cause
- [ ] **List actions taken**: What has been tried already

### When Resolving
- [ ] **Confirm customer symptoms resolved**: Test from customer perspective
- [ ] **Monitor for stability**: Watch metrics for 30+ minutes
- [ ] **Update stakeholders**: Notify everyone issue is resolved
- [ ] **Document root cause**: For postmortem and prevention

---

## Triage Decision Tree

```
Customer reports issue
    ↓
Can customers use core features? (sign in, book, pay)
    ↓
NO → SEV-1 (Emergency Response)
    ↓
YES → Are many customers affected?
    ↓
YES → How many? >50% → SEV-1, 20-50% → SEV-2, <20% → SEV-3
    ↓
NO → Is it affecting revenue or safety?
    ↓
YES → SEV-2
    ↓
NO → SEV-3
```

---

**Remember**: Focus on customer symptoms, not technical details. When in doubt, escalate. It's better to over-respond to a false alarm than to under-respond to a real incident.