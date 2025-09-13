# Observability Dashboards & Alert Rules

**Version**: 1.0  
**Owner**: Engineering Team  
**Last Updated**: 2025-01-13  

## Overview

M33 provides production-grade observability following Google SRE Golden Signals:
- **Latency**: Response time percentiles (p50, p95, p99)
- **Traffic**: Request rate and throughput
- **Errors**: Error rate and types
- **Saturation**: Resource utilization

## Components

### Golden Signals Dashboards
- `/api/*` endpoints monitoring
- Authentication service metrics
- Payment processing observability
- Emergency call system monitoring

### SLOs and SLIs
- Service Level Objectives per critical journey
- Service Level Indicators measurement
- Error budget tracking

### Burn-Rate Alerting
- Multi-window burn rate alerts
- Fast/slow detection windows
- Escalation to M32 on-call system

### Synthetic Monitoring
- Automated user journey probes
- Health check endpoints
- External dependency monitoring

### User Journey Dashboards
- Login → Booking → Payment flow
- Emergency Call response times
- Reader availability and response

## Integration

All dashboards integrate with:
- M31 Production Monitoring infrastructure
- M32 On-Call escalation policies  
- Admin dashboard (role-based access)

## Access Control

- **Monitor**: Triage dashboards and basic metrics
- **Admin**: Full observability access
- **Super Admin**: All metrics + configuration