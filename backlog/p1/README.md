# P1 Backlog

P1 contains strongly recommended hardening after P0:

| Ticket | Title | Skills |
|--------|-------|--------|
| P1-01 | Profile Media Polish | `ayuni-mobile-product`, `ayuni-backend-foundation` |
| P1-02 | WhatsApp/SMS Reminders | `ayuni-backend-foundation`, `ayuni-bookings-and-payments` |
| P1-03 | Logistics-Only Chat | `ayuni-backend-foundation`, `ayuni-mobile-product` |
| P1-04 | Venue Management System | `ayuni-backend-foundation`, `ayuni-ops-console` |
| P1-05 | Booking Support Workflows | `ayuni-bookings-and-payments`, `ayuni-ops-console` |
| P1-06 | Push Notifications and Inbox | `ayuni-backend-foundation`, `ayuni-mobile-product` |
| P1-07 | Analytics and Funnel Instrumentation | `ayuni-backend-foundation`, `ayuni-mobile-product` |
| P1-08 | Testing Expansion | `ayuni-test-gate` |
| P1-09 | CI/CD Pipeline | `ayuni-release-hardening` |
| P1-10 | Monitoring and Auditability | `ayuni-backend-foundation`, `ayuni-ops-console` |
| P1-11 | Legal/Privacy/Account Deletion | `ayuni-backend-foundation`, `ayuni-mobile-product` |

## Suggested Execution Order

1. **P1-08** Testing Expansion — establishes safety net before other changes
2. **P1-09** CI/CD Pipeline — automates testing and deployment
3. **P1-10** Monitoring and Auditability — visibility before adding features
4. **P1-01** Profile Media Polish — completes P0-05 gaps
5. **P1-06** Push Notifications and Inbox — foundational for engagement
6. **P1-02** WhatsApp/SMS Reminders — builds on notification infra
7. **P1-04** Venue Management System — required for scaling operations
8. **P1-05** Booking Support Workflows — required for real customer support
9. **P1-03** Logistics-Only Chat — enhances confirmed booking experience
10. **P1-07** Analytics and Funnel Instrumentation — data for P2 prioritization
11. **P1-11** Legal/Privacy/Account Deletion — required for app store compliance
