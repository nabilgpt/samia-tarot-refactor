# Incident Response Runbook

**Version**: 1.0  
**Owner**: Engineering Team  
**Last Updated**: 2025-01-13  

## Quick Reference

- **Incident Channel**: `#samia-incident-response`
- **Escalation**: Monitor → Admin → Super Admin (5 min intervals)
- **Emergency Call Override**: Always pages, ignores quiet hours
- **Status Page**: https://status.samia-tarot.com

---

## Incident Response Roles

### Incident Commander (IC) 👨‍💼
**Responsibilities**:
- Overall incident coordination and decision making
- Authorize rollbacks and emergency changes
- Interface with stakeholders and customers
- Ensure postmortem is scheduled and completed

**Who**: Senior Engineer or Engineering Manager  
**Escalation**: Engineering Manager → CTO for prolonged incidents

### Communications Lead 📢  
**Responsibilities**:
- All customer/public communications
- Status page updates
- Internal team coordination
- Stakeholder notifications

**Who**: Product Manager or designated Communications person  
**Escalation**: Marketing/PR team for public incidents

### Technical Lead (Scribe) 🔧
**Responsibilities**:
- Hands-on technical investigation and fixes
- Execute rollbacks and deployments
- Document timeline and technical details
- Coordinate with Engineering team

**Who**: On-call Engineer or Subject Matter Expert  
**Escalation**: Database Admin or Architect for complex issues

---

## Incident Response Timeline

### T+0 to T+5: Initial Response
#### Immediate Actions (IC)
- [ ] **Declare incident**: Post in `#samia-incident-response`
- [ ] **Assign severity**: Use [INCIDENT_SEVERITY.md](./INCIDENT_SEVERITY.md)
- [ ] **Assign roles**: IC, Communications Lead, Technical Lead
- [ ] **Start timer**: Note incident start time
- [ ] **Create incident bridge**: Set up video call if needed

#### First Responder (Technical Lead)
- [ ] **Triage symptoms**: Use [TRIAGE_CHECKLIST.md](./TRIAGE_CHECKLIST.md)
- [ ] **Check dashboards**: Golden Signals, error rates, latency
- [ ] **Assess scope**: How many users affected?
- [ ] **Initial containment**: Consider circuit breakers, feature flags

#### Communications (First 10 minutes)
- [ ] **Internal notification**: Alert relevant teams
- [ ] **Status page**: Update with initial status (SEV-1/SEV-2)
- [ ] **Customer notification**: For SEV-1, notify customers within 15 minutes

### T+5 to T+30: Investigation & Mitigation
#### Investigation (Technical Lead)
- [ ] **Gather evidence**: Logs, metrics, user reports
- [ ] **Identify timeline**: When did issue start?
- [ ] **Check recent changes**: Deployments, config changes
- [ ] **Form hypothesis**: Most likely root cause
- [ ] **Test hypothesis**: Verify with data

#### Mitigation Options (IC Decision)
- [ ] **Rollback**: If recent deployment caused issue
- [ ] **Feature flags**: Disable problematic features
- [ ] **Circuit breakers**: Isolate failing dependencies
- [ ] **Scaling**: Add resources if capacity issue
- [ ] **Manual intervention**: Direct database/API fixes

#### Communications (Every 15 min for SEV-1, 30 min for SEV-2)
- [ ] **Progress updates**: What we know, what we're doing
- [ ] **Timeline updates**: Revised ETA if needed
- [ ] **Stakeholder notifications**: Keep management informed

### T+30 to Resolution: Fix & Verify
#### Implementation (Technical Lead)
- [ ] **Execute fix**: Deploy changes, rollback, or workaround
- [ ] **Monitor impact**: Verify metrics are improving
- [ ] **Test functionality**: Ensure fix doesn't break other features
- [ ] **Document actions**: Record what was done

#### Verification (All Roles)
- [ ] **Confirm resolution**: Metrics back to normal
- [ ] **Customer validation**: Test from customer perspective
- [ ] **Team validation**: All stakeholders agree issue is resolved
- [ ] **Monitor stability**: Watch for 30+ minutes post-fix

---

## Incident Declaration Process

### Step 1: Incident Detection
**Who can declare**: Anyone who suspects an incident
**Triggers**:
- Monitoring alerts
- Customer reports
- Internal team discovery
- Support ticket escalation

### Step 2: Initial Assessment (2 minutes)
```bash
# Quick health check
curl -f https://samia-tarot.com/health
curl -f https://samia-tarot.com/api/health/database

# Check error rates
python -c "
from production_monitoring_service import ProductionMonitoringService
svc = ProductionMonitoringService()
dashboard = svc.get_golden_signals_dashboard(5)
print('Current error rate:', dashboard.get('error_rate', 'unknown'))
"
```

### Step 3: Declare in Slack
```
🚨 INCIDENT DECLARED
Severity: [SEV-1/2/3]
Issue: [Brief description]
Impact: [User impact description]
IC: [Assign Incident Commander]
Tech Lead: [Assign Technical Lead]
Comms: [Assign Communications Lead]
Started: $(date)
```

---

## Escalation Policies

### Monitor → Admin → Super Admin
**Timeline**: 5 minutes between escalation levels

#### Level 1: Monitor (On-Call)
- **Response Time**: Immediate for SEV-1, 15min for SEV-2
- **Authority**: Can execute rollbacks, toggle feature flags
- **Escalation Trigger**: Cannot be reached or needs additional authority

#### Level 2: Admin (Engineering Manager)
- **Response Time**: 5 minutes after Level 1 escalation
- **Authority**: Full system access, can authorize emergency changes
- **Escalation Trigger**: Complex technical issues or prolonged incident

#### Level 3: Super Admin (CTO/Senior Leadership)
- **Response Time**: 5 minutes after Level 2 escalation  
- **Authority**: Business decisions, external communications
- **Escalation Trigger**: Customer-facing incident >1 hour or security breach

### Emergency Call Exception
- **Always pages** regardless of quiet hours
- **Override all settings** for Emergency Call feature issues
- **Immediate escalation** to all levels simultaneously

---

## Communication Protocols

### Internal Communications

#### Slack Channels
- **#samia-incident-response**: Primary incident coordination
- **#samia-engineering**: Technical team updates
- **#samia-management**: Executive briefings
- **#samia-support**: Customer support coordination

#### Update Frequency
- **SEV-1**: Every 15 minutes until resolution
- **SEV-2**: Every 30 minutes during investigation
- **SEV-3**: Every hour or at major milestones

#### Update Template
```
⏰ INCIDENT UPDATE [T+XX minutes]
Status: [Investigating/Mitigating/Resolved]
Current Action: [What we're doing now]
Impact: [Current user impact]
ETA: [Next update time or resolution estimate]
```

### External Communications

#### Status Page Updates
- **SEV-1**: Update within 10 minutes, then every 30 minutes
- **SEV-2**: Update within 30 minutes, then hourly
- **SEV-3**: Update only if customer-facing

#### Customer Notifications
```
Service Alert: We're currently experiencing issues with [service]. 
Our team is actively working on a resolution. 
Updates: https://status.samia-tarot.com
```

#### Support Team Briefing
```
SUPPORT BRIEFING - Incident [ID]
Issue: [Brief description]
Customer Impact: [What customers will experience]
Workarounds: [Any available workarounds]
ETA: [Expected resolution time]
Talking Points: [Approved customer communication]
```

---

## Decision Making Framework

### Rollback Decisions (IC Authority)
**Immediate Rollback**: 
- Service completely down
- Critical security issue
- Data corruption detected

**Investigate First**:
- Performance degradation
- Partial feature failure
- Limited user impact

### Feature Flag Decisions (Technical Lead)
**Emergency Disable**:
- New feature causing issues
- High error rates from specific feature
- Performance impact from feature

### External Communication (Communications Lead)
**Public Communication Required**:
- SEV-1 incidents affecting all users
- Security incidents with user data impact
- Prolonged SEV-2 incidents (>2 hours)

---

## Incident Hand-off Procedures

### Shift Changes During Incident
1. **Current IC briefs** incoming IC on status
2. **Transfer all context**: timeline, actions taken, current hypothesis
3. **Update Slack** with new IC assignment
4. **Continue same update cadence**

### Weekend/Off-hours Coverage
1. **On-call engineer** is primary responder
2. **Escalate to manager** if incident extends >1 hour
3. **Page additional help** if technical expertise needed
4. **Document everything** for Monday morning briefing

---

## Tools & Resources

### Monitoring & Dashboards
- **Golden Signals Dashboard**: [Link to monitoring system]
- **Error Tracking**: [Link to error tracking]
- **Performance Monitoring**: [Link to APM]
- **Infrastructure Status**: [Link to infrastructure monitoring]

### Runbooks & Procedures
- **Deployment**: [DEPLOY.md](./DEPLOY.md)
- **Rollback**: [ROLLBACK.md](./ROLLBACK.md)  
- **Triage**: [TRIAGE_CHECKLIST.md](./TRIAGE_CHECKLIST.md)

### Emergency Scripts
```bash
# Emergency rollback
python rollback_mechanisms.py emergency

# Check system health
python d0_d7_monitoring_tools.py 0 --single-run

# Validate security
python test_m30_security_readiness.py
```

---

## Post-Incident Actions

### Immediate (Within 1 hour of resolution)
- [ ] **Confirm stability**: Monitor for 30+ minutes
- [ ] **Update status page**: Mark as resolved
- [ ] **Thank team**: Acknowledge everyone's contributions
- [ ] **Schedule postmortem**: Within 48 hours of resolution

### Follow-up (Within 24 hours)
- [ ] **Incident report**: Create detailed timeline
- [ ] **Customer follow-up**: If external communication was sent
- [ ] **Process review**: Identify any process improvements
- [ ] **Action items**: Create tickets for preventive measures

### Postmortem (Within 48 hours)
- [ ] **Use template**: [POSTMORTEM_TEMPLATE.md](./POSTMORTEM_TEMPLATE.md)
- [ ] **Include all stakeholders**: IC, Technical Lead, Communications
- [ ] **Focus on learning**: Blameless culture
- [ ] **Action items**: Concrete improvements with owners and due dates

---

## Emergency Contacts

### Primary On-Call Rotation
Check PagerDuty schedule for current assignments:
- **Primary On-Call**: [PagerDuty contact]
- **Secondary On-Call**: [PagerDuty contact]
- **Engineering Manager**: [PagerDuty escalation]

### Emergency Escalation
- **Database Issues**: [Database Admin contact]
- **Security Issues**: [Security team contact]
- **Payment Issues**: [Finance team contact]
- **Legal/Compliance**: [Legal team contact]

### External Contacts
- **Hosting Provider**: [Emergency support number]
- **Payment Processors**: [Stripe/Square emergency contacts]
- **Communication Providers**: [Twilio support]

---

**Remember**: Stay calm, communicate clearly, and focus on customer impact. Every incident is a learning opportunity.