# Incident Response & Communications

## Incident Classification

| Severity | Description | Response Time | Escalation |
|----------|-------------|---------------|------------|
| **Critical (P0)** | Complete outage, data breach | 15 minutes | Immediate |
| **High (P1)** | Major functionality impaired | 1 hour | Auto-escalate after 2h |
| **Medium (P2)** | Minor functionality issues | 4 hours | Manual escalation |
| **Low (P3)** | Cosmetic or enhancement | 24 hours | Standard workflow |

## RACI Matrix

| Role | Responsible | Accountable | Consulted | Informed |
|------|-------------|-------------|-----------|----------|
| **On-Call Engineer** | Initial response, triage | Resolution | Security team | All stakeholders |
| **Tech Lead** | Technical decisions | Technical quality | DevOps, Product | Management |
| **Security Lead** | Security assessment | Security posture | Legal, Compliance | CISO |
| **Customer Success** | Customer communication | Customer satisfaction | Support team | Customers |

## Response Workflow

### 1. Detection & Triage (0-15 minutes)
- **Automatic**: M40 Siren alerts trigger
- **Manual**: Support tickets, monitoring alerts
- **Customer**: Direct reports via support channels

**Actions:**
1. Acknowledge incident in Siren system
2. Create incident record in tracking system
3. Assess severity using classification matrix
4. Page appropriate responders

### 2. Initial Response (15-60 minutes)
**Critical/High Priority:**
1. Assemble incident response team
2. Establish communication channels
3. Begin technical investigation
4. Prepare customer communication

**Medium/Low Priority:**
1. Assign to appropriate engineer
2. Set expected resolution timeline
3. Update internal tracking

### 3. Investigation & Mitigation
**Technical Steps:**
1. Gather system state and logs
2. Identify root cause
3. Implement immediate mitigation
4. Verify resolution effectiveness

**Communication Steps:**
1. Internal updates every 30 minutes (Critical) or 2 hours (others)
2. Customer updates as needed
3. Stakeholder notifications per severity

### 4. Resolution & Post-Mortem
1. Confirm full resolution
2. Update all tracking systems
3. Schedule post-mortem (Critical/High)
4. Document lessons learned

## Communication Templates

### Internal Communication (Slack)

**Initial Alert:**
```
🚨 INCIDENT: P{severity} - {title}
Detected: {timestamp}
Impact: {description}
Assigned: @{engineer}
Siren ID: {incident_id}
Status: Investigating
```

**Status Update:**
```
📊 UPDATE: P{severity} - {title}
Current Status: {status}
Progress: {details}
ETA: {estimate}
Next Update: {time}
```

**Resolution:**
```
✅ RESOLVED: P{severity} - {title}
Resolution: {summary}
Duration: {total_time}
Root Cause: {brief_cause}
Post-mortem: {scheduled/not_required}
```

### Customer Communication

**Service Status Page (Critical/High):**
```markdown
## Service Disruption - {Component}

**Status:** Investigating
**Started:** {timestamp}
**Impact:** {customer_facing_description}

We are investigating reports of {issue_description}. We will provide updates every hour until resolved.

**Updates:**
- {timestamp}: Issue identified, implementing fix
- {timestamp}: Fix deployed, monitoring recovery
- {timestamp}: Service fully restored
```

**Email Notification (High Impact):**
```
Subject: Service Disruption Update - {Service}

Hello,

We experienced a service disruption affecting {component} between {start_time} and {end_time}.

Impact: {customer_impact}
Root Cause: {technical_summary}
Resolution: {fix_description}
Prevention: {future_measures}

We apologize for any inconvenience. If you have questions, please contact support.

The SAMIA TAROT Team
```

## Escalation Procedures

### Technical Escalation
1. **L1**: On-call engineer
2. **L2**: Senior engineer + tech lead
3. **L3**: Engineering manager + external resources

### Business Escalation
1. **Customer Impact**: Customer Success Manager
2. **Revenue Impact**: Product Manager + Sales Lead
3. **Legal/Compliance**: Legal team + CISO
4. **Media/PR**: Marketing lead + CEO

## Emergency Contacts

### Internal Team
```
On-Call Rotation: Siren M40 policy
Tech Lead: GitHub @mentions
Security Lead: security@samiatarot.com
Customer Success: support@samiatarot.com
```

### External Vendors
```
Supabase Support: Technical issues
Stripe Support: Payment problems
Twilio Support: Communications issues
CDN Provider: Performance/availability
```

## Tools & Resources

### Monitoring & Alerting
- **Siren (M40)**: Primary alerting system
- **Supabase Dashboard**: Database metrics
- **GitHub Actions**: CI/CD pipeline status
- **Performance CI (M36)**: Core Web Vitals

### Communication Channels
- **Slack**: Internal coordination
- **Status Page**: Customer communication
- **Email**: Direct customer updates
- **WhatsApp (M41)**: High-priority notifications

### Documentation
- **Runbooks**: This docs/ops directory
- **Architecture**: System design documents
- **Audit Logs**: Complete activity trail
- **Performance Budgets**: M36 thresholds

## Post-Mortem Process

### When Required
- All Critical (P0) incidents
- High (P1) incidents with customer impact
- Any incident lasting >4 hours
- Security incidents
- Repeat incidents

### Timeline
- Schedule within 48 hours of resolution
- Complete report within 1 week
- Action items assigned with owners
- Follow-up review in 30 days

### Template
1. **Incident Summary**
   - Timeline with key events
   - Customer impact assessment
   - Resolution steps taken

2. **Root Cause Analysis**
   - Technical root cause
   - Process failures
   - Human factors

3. **Action Items**
   - Technical improvements
   - Process changes
   - Documentation updates
   - Training needs

4. **Prevention Measures**
   - Monitoring improvements
   - Automated checks
   - System hardening
   - Team processes

## Metrics & KPIs

### Response Times
- **Detection to Acknowledgment**: <15 minutes
- **Acknowledgment to Initial Response**: <1 hour
- **Mean Time to Resolution (MTTR)**:
  - Critical: <4 hours
  - High: <24 hours

### Quality Metrics
- **False Positive Rate**: <5%
- **Repeat Incident Rate**: <10%
- **Customer Satisfaction**: >90%
- **Post-mortem Completion**: 100% for required incidents

### Availability Targets
- **API Uptime**: 99.9%
- **Database Uptime**: 99.95%
- **Payment Processing**: 99.5%
- **WhatsApp Integration**: 99.0%