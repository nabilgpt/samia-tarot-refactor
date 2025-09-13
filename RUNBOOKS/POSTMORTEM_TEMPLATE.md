# Postmortem Template

**Incident ID**: INC-YYYY.MM.DD-HHMM  
**Date**: YYYY-MM-DD  
**Duration**: XX minutes  
**Severity**: SEV-1/2/3  

---

## Executive Summary

**Brief Description** (1-2 sentences):
[What happened from a customer perspective]

**Root Cause** (1 sentence):
[Technical root cause]

**Impact** (1-2 sentences):
[Customer and business impact]

**Resolution** (1 sentence):
[How it was fixed]

---

## Incident Details

### Timeline

| Time (UTC) | Event | Action Taken | Owner |
|------------|--------|--------------|--------|
| YYYY-MM-DD HH:MM | **Incident Start** | [First symptom observed] | - |
| HH:MM | **Detection** | [How incident was detected] | [Person/System] |
| HH:MM | **Response** | [Initial response action] | [Engineer] |
| HH:MM | **Investigation** | [Key investigation findings] | [Engineer] |
| HH:MM | **Mitigation** | [Mitigation action taken] | [Engineer] |
| HH:MM | **Resolution** | [How incident was resolved] | [Engineer] |
| HH:MM | **Monitoring** | [Post-resolution monitoring] | [Team] |

### Impact Assessment

#### Customer Impact
- **Users Affected**: [Number/percentage of users impacted]
- **Services Affected**: [Which features/services were down/degraded]
- **Geographic Impact**: [Any regional concentration]
- **Customer Complaints**: [Number of support tickets/complaints received]
- **Workarounds Available**: [Any workarounds customers could use]

#### Business Impact
- **Revenue Loss**: [Estimated financial impact, if measurable]
- **SLA Breach**: [Yes/No - which SLAs were violated]
- **Reputation Impact**: [Social media mentions, press coverage, etc.]
- **Support Load**: [Additional support burden]

#### Technical Impact
- **Systems Affected**: [Which technical systems were impacted]
- **Data Loss**: [Any data loss - should normally be "None"]
- **Security Impact**: [Any security implications]

### Detection and Response

#### How We Detected the Issue
- **Detection Method**: [Monitoring alert / Customer report / Internal discovery]
- **Detection Time**: [How long after incident start was it detected]
- **Alert Quality**: [Was the alert actionable and accurate?]

#### Response Effectiveness
- **Response Time**: [Time from detection to first response]
- **Escalation**: [How escalation worked - what went well/poorly]
- **Communication**: [How well did internal/external communication work]
- **Decision Making**: [Quality of technical and business decisions]

---

## Root Cause Analysis

### What Happened
[Detailed technical explanation of what went wrong. Include:]
- [The specific component/system that failed]
- [The sequence of events that led to the failure]
- [Why our defenses (monitoring, circuit breakers, etc.) didn't prevent it]
- [Any contributing factors or conditions]

### Why It Happened
[Analysis of underlying causes:]

#### Immediate Cause
[The direct technical reason for the failure]

#### Contributing Factors
[Other factors that made the incident more likely or severe:]
- [Technical factors: code bugs, configuration issues, etc.]
- [Process factors: insufficient testing, inadequate monitoring, etc.]
- [Human factors: lack of knowledge, time pressure, etc.]
- [Organizational factors: resource constraints, communication issues, etc.]

#### Root Cause
[The fundamental issue that, if fixed, would prevent this class of incident]

---

## What Went Well

### Positive Aspects of Our Response
- [Things that worked well during the incident]
- [Effective processes or tools]
- [Good decisions made under pressure]
- [Effective teamwork or communication]

### Effective Safeguards
- [Monitoring/alerting that worked as intended]
- [Circuit breakers or other automated protection that helped]
- [Rollback procedures that worked smoothly]
- [Any systems that continued working despite the incident]

---

## What Could Have Gone Better

### Response Issues
- [Delays in detection, response, or resolution]
- [Communication problems]
- [Coordination issues]
- [Ineffective troubleshooting approaches]

### Prevention Opportunities
- [Monitoring gaps that delayed detection]
- [Missing safeguards that could have prevented the incident]
- [Testing gaps that could have caught the issue earlier]
- [Documentation or training gaps]

---

## Action Items

### Immediate Actions (Within 1 Week)
| Action | Owner | Due Date | Status |
|--------|--------|----------|---------|
| [Urgent fix to prevent recurrence] | [Name] | YYYY-MM-DD | Open |
| [Critical monitoring gap to fill] | [Name] | YYYY-MM-DD | Open |
| [Documentation to update] | [Name] | YYYY-MM-DD | Open |

### Short-term Actions (Within 1 Month)
| Action | Owner | Due Date | Status |
|--------|--------|----------|---------|
| [Process improvement] | [Name] | YYYY-MM-DD | Open |
| [Tooling enhancement] | [Name] | YYYY-MM-DD | Open |
| [Testing improvement] | [Name] | YYYY-MM-DD | Open |

### Long-term Actions (Within 1 Quarter)
| Action | Owner | Due Date | Status |
|--------|--------|----------|---------|
| [Architectural improvement] | [Name] | YYYY-MM-DD | Open |
| [Training or hiring need] | [Name] | YYYY-MM-DD | Open |
| [Major process change] | [Name] | YYYY-MM-DD | Open |

---

## Lessons Learned

### Technical Lessons
- [What we learned about our systems]
- [New failure modes we discovered]
- [Assumptions that were proven wrong]

### Process Lessons
- [What we learned about our incident response]
- [Gaps in our procedures or training]
- [Communication improvements needed]

### Organizational Lessons
- [What we learned about our team/company]
- [Resource allocation insights]
- [Cultural or structural issues revealed]

---

## Appendices

### Supporting Data
- [Links to relevant dashboards, logs, or other evidence]
- [Screenshots of key metrics during the incident]
- [Relevant chat logs or communication records]

### Related Incidents
- [Links to similar past incidents]
- [Patterns or trends this incident continues/breaks]

### External Dependencies
- [Third-party services that were involved]
- [Vendor communications or status pages]

---

## Sign-off

### Postmortem Review
- **Facilitator**: [Name]
- **Attendees**: [List of all attendees]
- **Review Date**: YYYY-MM-DD
- **Approved By**: [Engineering Manager/Director]

### Distribution
- [X] Engineering Team
- [X] Product Team  
- [X] Customer Support
- [X] Management
- [ ] Public (if customer-facing incident)

### Follow-up
- **Action Item Review Meeting**: [Scheduled for YYYY-MM-DD]
- **Progress Check**: [30/60/90 days]
- **Postmortem Archive**: [Link to permanent storage]

---

## Template Usage Notes

### Before the Postmortem Meeting
1. **Gather Data**: Collect logs, metrics, timeline, and communication records
2. **Draft Timeline**: Create initial timeline with key events
3. **Identify Participants**: Include incident responders + relevant stakeholders
4. **Schedule Meeting**: Within 48 hours of incident resolution, 60-90 minutes

### During the Postmortem Meeting
1. **Review Timeline**: Walk through timeline chronologically
2. **Discuss What Happened**: Focus on facts, not blame
3. **Identify Contributing Factors**: Look for systemic issues
4. **Brainstorm Improvements**: Generate action items collaboratively
5. **Assign Owners**: Every action item needs an owner and due date

### After the Postmortem Meeting
1. **Finalize Document**: Complete all sections within 2 business days
2. **Distribute**: Share with all stakeholders
3. **Track Action Items**: Create tickets and track progress
4. **Schedule Follow-up**: Review action item progress regularly

### Blameless Culture Guidelines
- **Focus on Systems**: What systemic factors contributed to the incident?
- **Assume Good Intentions**: People did their best with the information they had
- **Learn and Improve**: The goal is prevention, not punishment
- **Encourage Honesty**: Create safety for people to share what really happened
- **Look for Multiple Causes**: Most incidents have several contributing factors

### Writing Tips
- **Be Specific**: Use concrete examples and data
- **Be Honest**: Don't hide embarrassing details if they're relevant
- **Be Actionable**: Every problem identified should have a corresponding action item
- **Be Readable**: Write for someone not familiar with the incident
- **Be Complete**: Include enough detail for someone to understand what happened

---

**Remember**: The goal of a postmortem is learning and improvement, not blame. Focus on making our systems and processes more resilient.