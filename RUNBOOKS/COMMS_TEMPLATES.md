# Communications Templates

**Version**: 1.0  
**Owner**: Engineering Team  
**Last Updated**: 2025-01-13  

## Quick Reference

- **Internal Channel**: `#samia-incident-response`
- **Public Status**: https://status.samia-tarot.com
- **Customer Support**: support@samia-tarot.com
- **Update Frequency**: SEV-1 (15 min), SEV-2 (30 min), SEV-3 (60 min)

---

## Internal Communications

### Initial Incident Declaration

#### SEV-1 Declaration
```
🚨 SEV-1 INCIDENT DECLARED
Incident ID: INC-$(date +%Y%m%d-%H%M)
Time: $(date +"%Y-%m-%d %H:%M:%S %Z")
Impact: [Brief description of customer impact]
Scope: [All users/Most users/Specific feature]
Symptoms: [What customers are experiencing]

ROLES ASSIGNED:
IC (Incident Commander): @[name]
Tech Lead: @[name] 
Comms Lead: @[name]

IMMEDIATE ACTIONS:
- Emergency rollback executed
- Status page updating
- Customer notification preparing

Next update: 15 minutes
Bridge: [meeting link if needed]
```

#### SEV-2 Declaration  
```
⚠️ SEV-2 INCIDENT DECLARED
Incident ID: INC-$(date +%Y%m%d-%H%M)
Time: $(date +"%Y-%m-%d %H:%M:%S %Z")
Impact: [Description of issue]
Scope: [Affected users/features]
Symptoms: [Customer experience]

ROLES ASSIGNED:
On-Call Engineer: @[name]
Backup: @[name]

CURRENT STATUS:
- Investigating root cause
- Monitoring dashboards
- Preparing mitigation

Next update: 30 minutes
```

#### SEV-3 Declaration
```
📝 SEV-3 INCIDENT REPORTED  
Incident ID: INC-$(date +%Y%m%d-%H%M)
Time: $(date +"%Y-%m-%d %H:%M:%S %Z")
Impact: [Minor issue description]
Scope: [Limited impact]
Assigned: @[engineer]
Priority: [Normal/Low]
ETA: [Business hours resolution]
```

### Progress Updates

#### SEV-1 Update Template (Every 15 minutes)
```
⏰ SEV-1 UPDATE [T+XX minutes]
Incident ID: INC-$(date +%Y%m%d-%H%M)

STATUS: [Investigating/Mitigating/Monitoring/Resolved]
CURRENT ACTION: [What we're doing right now]
FINDINGS: [What we've discovered so far]
IMPACT: [Current customer impact]
ETA: [Next update time or resolution estimate]

METRICS:
- Error rate: [X%]
- Response time: [Xms]  
- Users affected: [estimate]

Next update: [time]
```

#### SEV-2 Update Template (Every 30 minutes)
```
⏰ SEV-2 UPDATE [T+XX minutes]
Incident ID: INC-$(date +%Y%m%d-%H%M)

STATUS: [Current phase]
ACTION: [Current investigation/mitigation]
IMPACT: [Customer impact level]
PROGRESS: [What has been ruled out/confirmed]
ETA: [Resolution timeline]

Next update: [time]
```

### Resolution Notification
```
✅ INCIDENT RESOLVED
Incident ID: INC-$(date +%Y%m%d-%H%M)
Resolved at: $(date +"%Y-%m-%d %H:%M:%S %Z")
Duration: [XX minutes]

RESOLUTION: [Brief description of what fixed it]
ROOT CAUSE: [Initial assessment]
IMPACT: [Final customer impact summary]

POST-INCIDENT:
- Monitoring for stability (30 minutes)
- Postmortem scheduled: [date/time]
- Status page updated
- Customer notification sent

Thank you team! 🙏
```

---

## External Communications

### Status Page Updates

#### Incident Identified
```
🔍 Investigating: We are currently investigating reports of [issue description]. Our team is actively working to identify the cause. We will provide updates as more information becomes available.

Started: [timestamp]
Updates: Every [15/30] minutes
```

#### Mitigation In Progress
```
🔧 Mitigating: We have identified the cause of [issue description] and are implementing a fix. [Brief explanation of what's being done]. 

Expected resolution: [timeframe]
Workaround: [if available]
```

#### Monitoring Resolution
```
👀 Monitoring: A fix has been implemented and we are monitoring the results. [Brief explanation of fix]. We will continue to monitor and provide updates.

Status: Monitoring for stability
```

#### Resolved
```
✅ Resolved: The issue with [description] has been fully resolved. All systems are operating normally. We apologize for any inconvenience caused.

Duration: [XX minutes] 
Resolved: [timestamp]
Postmortem: Will be published within 48 hours
```

### Customer Email Notifications

#### SEV-1 Customer Alert
```
Subject: Service Alert - Samia Tarot Platform Issue

Dear Valued Customer,

We are currently experiencing an issue with our platform that may prevent you from [specific impact]. Our engineering team is actively working to resolve this as quickly as possible.

What's happening: [Brief, non-technical explanation]
What we're doing: [Our response]
Expected resolution: [Timeline if available]

We sincerely apologize for this inconvenience and will update you as soon as the issue is resolved.

For the latest updates: https://status.samia-tarot.com
Questions: support@samia-tarot.com

Thank you for your patience.

The Samia Tarot Team
```

#### SEV-1 Resolution Notification
```
Subject: Service Restored - Samia Tarot Platform

Dear Valued Customer,

We're pleased to inform you that the service issue we reported earlier has been fully resolved. All platform features are now operating normally.

Issue duration: [XX minutes]
Resolved at: [timestamp]
What was fixed: [Brief explanation]

We sincerely apologize for any inconvenience this may have caused. To prevent similar issues in the future, we are [brief mention of preventive measures].

If you continue to experience any problems, please don't hesitate to contact our support team.

Thank you for your patience and understanding.

The Samia Tarot Team
```

### Support Team Briefing

#### Customer Service Alert
```
🚨 CUSTOMER SUPPORT ALERT
Incident ID: INC-$(date +%Y%m%d-%H%M)
Severity: [SEV-1/2/3]

CUSTOMER IMPACT: [What customers will experience]
CURRENT STATUS: [What's being done]
ETA: [Resolution timeline]

TALKING POINTS for customer inquiries:
✅ "We're aware of the issue and actively working on it"
✅ "Our engineering team is treating this as a priority"
✅ "We'll update you as soon as it's resolved"
✅ "You can check status.samia-tarot.com for updates"

AVOID saying:
❌ Technical details about root cause
❌ Blame on third parties
❌ Definitive timelines unless confirmed
❌ "It should be working" (if it's not for them)

WORKAROUNDS: [Any available workarounds]
ESCALATION: Forward complex cases to @[tech lead]

Updates will be provided every [X] minutes in this channel.
```

---

## Stakeholder Communications

### Management Briefing

#### Executive Summary
```
📊 INCIDENT EXECUTIVE SUMMARY
Incident ID: INC-$(date +%Y%m%d-%H%M)
Status: [Ongoing/Resolved]
Duration: [XX minutes]

BUSINESS IMPACT:
- Customer impact: [description]
- Revenue impact: [estimated if applicable]
- Reputation impact: [assessment]

RESPONSE:
- Team response time: [X minutes]
- Resolution time: [X minutes]
- Customer communication: [sent/not needed]

NEXT STEPS:
- Postmortem scheduled: [date]
- Process improvements: [planned]
- Customer follow-up: [if needed]
```

#### Board/Investor Notification (Major incidents only)
```
Subject: Service Incident Notification - Samia Tarot

[Executive/Board Member],

I'm writing to inform you of a service incident that occurred on [date] affecting our platform.

Incident Summary:
- Issue: [Brief description]
- Duration: [XX minutes]
- Customer impact: [scope and severity]
- Resolution: [how it was fixed]

Our Response:
- Immediate incident response activated
- Issue resolved within [timeframe]
- Customers notified and updated throughout
- No data loss or security issues

Prevention:
- Postmortem scheduled for [date]
- Additional monitoring being implemented
- Process improvements planned

The incident was handled professionally by our team and service has been fully restored. We'll share the postmortem findings and prevention plan once completed.

Please let me know if you have any questions.

[Engineering Manager/CTO]
```

---

## Social Media Communications

### Twitter/X Updates

#### Incident Acknowledgment
```
We're currently investigating reports of login issues on our platform. Our team is working on a resolution. Updates: https://status.samia-tarot.com
```

#### Resolution Announcement
```
✅ Update: The platform issue has been resolved. All services are operating normally. Thank you for your patience! 🙏
```

### LinkedIn (For major incidents)
```
We experienced a brief service disruption today that prevented some users from accessing our platform. Our team responded quickly and service was restored within [XX] minutes. We apologize for any inconvenience and thank our users for their patience as we continue to improve our service reliability.
```

---

## Template Variables Reference

### Common Variables
- `$(date +"%Y-%m-%d %H:%M:%S %Z")` - Full timestamp
- `$(date +%Y%m%d-%H%M)` - Incident ID format
- `[incident_commander]` - Person leading incident response
- `[technical_lead]` - Engineer working on technical resolution
- `[communications_lead]` - Person handling external communications
- `[customer_impact]` - What customers are experiencing
- `[root_cause]` - Technical reason (for internal use)
- `[resolution_summary]` - How the issue was fixed
- `[duration]` - How long the incident lasted
- `[affected_users]` - Estimated number of users impacted

### Severity-Specific Variables
- **SEV-1**: "critical", "all users", "immediate", "emergency"
- **SEV-2**: "significant", "many users", "urgent", "investigating"  
- **SEV-3**: "minor", "some users", "scheduled", "monitoring"

---

## Communication Best Practices

### Internal Communications
- **Be specific**: Include concrete details and metrics
- **Be frequent**: Regular updates reduce anxiety
- **Be honest**: Don't speculate or give false hope
- **Be actionable**: Include next steps and assignments

### External Communications  
- **Be empathetic**: Acknowledge customer frustration
- **Be clear**: Use simple, non-technical language
- **Be transparent**: Share what you know, admit what you don't
- **Be timely**: Communicate early and often

### Crisis Communication
- **Speed over perfection**: It's better to communicate quickly with basic info
- **Consistency**: Ensure all channels have the same information
- **Ownership**: Take responsibility without making excuses
- **Follow-up**: Always close the loop with resolution details

---

**Remember**: Good communication during incidents builds trust and confidence, even when things go wrong.