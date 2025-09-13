# Incident Severity Classification

**Version**: 1.0  
**Owner**: Engineering Team  
**Last Updated**: 2025-01-13  

## Quick Reference

| Severity | Response Time | Escalation | Communication |
|----------|---------------|------------|---------------|
| **SEV-1** | Immediate | Page on-call + manager | Public status + customers |
| **SEV-2** | <15 minutes | On-call engineer | Internal + key customers |  
| **SEV-3** | <1 hour | During business hours | Internal teams only |

---

## SEV-1: Critical Impact 🚨

### Definition
Service is completely down or core functionality is broken, affecting **all or most users**.

### Examples
- ✅ **Samia Tarot website completely inaccessible**
- ✅ **Payment processing completely broken** (no payments can be made)
- ✅ **Database completely unavailable** (no user data accessible)
- ✅ **Authentication system down** (no one can sign in)
- ✅ **Emergency Call feature not working** (critical for user safety)
- ✅ **Data corruption or loss detected**
- ✅ **Security breach confirmed**

### Impact Criteria
- **Customer Impact**: Complete service unavailability
- **Financial Impact**: All revenue streams stopped
- **User Base**: >90% of users cannot use core features
- **Duration**: Any duration is unacceptable

### Response Requirements
- **Response Time**: Immediate (within 5 minutes)
- **Escalation**: Page on-call engineer + engineering manager immediately
- **Communication**: 
  - Update public status page within 10 minutes
  - Notify all customers via email/SMS
  - Post in #samia-incident-response every 15 minutes
- **Decision Authority**: Incident Commander has full authority for rollbacks

---

## SEV-2: Major Impact ⚠️

### Definition
Core functionality is significantly impacted or specific critical features are broken, affecting **many users**.

### Examples
- ✅ **Payment processing degraded** (>20% failure rate)
- ✅ **Booking system intermittent failures** (users cannot complete bookings)
- ✅ **Performance severely degraded** (P95 latency >5 seconds)
- ✅ **Reader tools not working** (readers cannot deliver services)
- ✅ **Email/SMS notifications not sending**
- ✅ **Single payment provider completely down** (but other methods work)
- ✅ **Monitor tools unavailable** (cannot moderate content)

### Impact Criteria
- **Customer Impact**: Major features unavailable or severely degraded
- **Financial Impact**: Significant revenue impact (>20% of transactions affected)
- **User Base**: 20-90% of users experiencing issues
- **Duration**: >15 minutes is concerning, >1 hour is unacceptable

### Response Requirements
- **Response Time**: Within 15 minutes
- **Escalation**: On-call engineer responds, escalate to manager if not resolved in 30 minutes
- **Communication**:
  - Update internal teams immediately
  - Update status page within 30 minutes
  - Notify affected customers if issue persists >1 hour
  - Post in #samia-incident-response every 30 minutes

---

## SEV-3: Minor Impact 📝

### Definition
Non-critical functionality is impacted or performance is degraded, affecting **some users**.

### Examples
- ✅ **Daily horoscope delayed or missing** (not core booking functionality)
- ✅ **Notification preferences not saving** (workaround available)
- ✅ **Admin dashboard slow performance** (doesn't affect customer experience)
- ✅ **Analytics/reporting issues** (internal tools only)
- ✅ **Profile update features intermittent** (users can still book services)
- ✅ **Minor UI/UX issues** (display problems but functionality works)
- ✅ **Background job failures** (not immediately customer-facing)

### Impact Criteria
- **Customer Impact**: Minor inconvenience, core features still work
- **Financial Impact**: Minimal or no revenue impact
- **User Base**: <20% of users affected
- **Duration**: Can be tolerated for several hours if needed

### Response Requirements
- **Response Time**: Within 1 hour during business hours
- **Escalation**: Handle during normal business hours, no immediate paging
- **Communication**:
  - Post in #samia-incident-response
  - No immediate customer communication needed
  - May update status page if multiple SEV-3 issues

---

## Special Classifications

### Security Incidents
**Always start as SEV-1** regardless of apparent impact:
- Any suspected data breach
- Unauthorized access detected
- Payment data potentially compromised
- Authentication bypass discovered

### Emergency Call Related
**Always SEV-1** for Emergency Call feature issues:
- Emergency siren not working
- Cannot reach emergency services
- Call dropping during emergencies
- Emergency escalation not working

### Data Issues
- **Data Loss**: SEV-1 (any user data lost)
- **Data Corruption**: SEV-1 (incorrect data stored)
- **Backup Failures**: SEV-2 (potential future risk)
- **Sync Issues**: SEV-2 or SEV-3 depending on scope

---

## Classification Decision Tree

```
Is the service completely down for all users?
├─ YES → SEV-1
└─ NO
   ├─ Are core features (booking, payments, emergency) broken for many users?
   │  ├─ YES → SEV-2
   │  └─ NO
   │     ├─ Are non-core features broken or performance degraded?
   │     │  ├─ YES → SEV-3
   │     │  └─ NO → Not an incident (may be routine issue)
```

### When in Doubt
- **If questioning between SEV-1 and SEV-2**: Choose SEV-1
- **If questioning between SEV-2 and SEV-3**: Choose SEV-2
- **Better to over-escalate than under-escalate**

---

## Impact Assessment Questions

### Business Impact
1. **Revenue**: Are customers unable to make payments?
2. **User Experience**: Can users complete their primary task (booking readings)?
3. **Trust**: Does this affect user trust or safety?
4. **Compliance**: Are we violating SLAs or regulatory requirements?

### Technical Impact
1. **Scope**: How many users are affected?
2. **Duration**: How long has this been ongoing?
3. **Escalation**: Is the issue getting worse?
4. **Dependencies**: What other systems could be affected?

### Customer Impact
1. **Frustration**: Are users contacting support?
2. **Workarounds**: Can users achieve their goals another way?
3. **Safety**: Does this affect emergency call functionality?
4. **Data**: Is user data at risk?

---

## Severity Escalation

### Upgrading Severity
Incidents can be upgraded if:
- Impact spreads to more users
- Duration exceeds expected resolution time
- Secondary effects discovered
- Customer complaints increase

### Downgrading Severity
Incidents can be downgraded if:
- Workaround implemented successfully
- Impact scope reduced significantly
- Root cause isolated and contained
- Customer impact minimized

---

## Communication Templates by Severity

### SEV-1 Initial Alert
```
🚨 SEV-1 INCIDENT DECLARED
Time: $(date)
Impact: [Service/feature] completely unavailable
Scope: All users affected
Action: Incident Commander assigned, investigation ongoing
ETA: Will update every 15 minutes
Status Page: Updated
```

### SEV-2 Initial Alert
```
⚠️ SEV-2 INCIDENT DECLARED
Time: $(date)
Impact: [Service/feature] significantly degraded
Scope: [X%] of users affected
Action: On-call engineer investigating
ETA: Will update every 30 minutes
```

### SEV-3 Initial Alert
```
📝 SEV-3 INCIDENT REPORTED
Time: $(date)
Impact: [Service/feature] minor issues
Scope: Limited user impact
Action: Assigned to [engineer]
Resolution: During business hours
```

---

## SLO Alignment

### Error Budget Impact
- **SEV-1**: Major error budget burn, may require immediate feature flag changes
- **SEV-2**: Significant error budget impact, monitor closely
- **SEV-3**: Minor error budget impact, acceptable within monthly allocation

### SLA Implications
- **SEV-1**: Likely SLA breach, customer credits may apply
- **SEV-2**: Potential SLA impact, monitor carefully
- **SEV-3**: Usually within SLA tolerances

---

**Remember**: It's better to respond to a false alarm than to miss a real incident. When in doubt, escalate.