# P1-04 Venue Management System

## Objective
Build a structured venue data model and management workflow so ops can maintain venue inventory with capacity, availability, areas, and booking assignment rules — replacing ad-hoc venue references.

## Why This Exists
P0-08 introduced basic venue assignment but venues are loosely defined. For real operations, ops needs to manage venue capacity, mark venues as temporarily unavailable, assign venues by area/date-type, and prevent overbooking. This is required before scaling beyond a handful of test venues.

## Scope

- Venue data model: name, address, area/neighborhood, city, capacity, venue type (restaurant, café, lounge, etc.), status (active/inactive/maintenance), operating hours, contact info
- Backend CRUD endpoints for venue management (ops-only)
- Venue availability tracking: capacity per time slot, blackout dates
- Venue-booking assignment rules: match venue area to user preferences, check capacity
- Venue search and filtering in ops console
- Venue detail view with booking history
- Migration for venues table with full schema

## Non-Goals

- User-facing venue browsing or selection (Ayuni assigns venues)
- Venue reviews or ratings
- Integration with external venue listing APIs
- Venue photos (defer to P2)

## Dependencies

- `P0-08` (booking lifecycle — complete)
- `P0-10` (ops console — complete)
- `P0-01` (persistence — complete)

## Affected Areas

- `backend/src/modules/` — new `venue.service.ts`, `venue.controller.ts` or extend `ops.controller.ts`
- `backend/migrations/` — new migration for venues table
- `backend/src/modules/app.service.ts` — update booking venue assignment logic
- `ops-console/src/` — venue management pages (list, detail, create, edit)

## Implementation Notes

- Venues should have a `status` enum: `active`, `inactive`, `maintenance`.
- Capacity tracking per time slot prevents double-booking same venue.
- Area/neighborhood mapping should align with the dating preference `dateAreas` field from P0-07.
- Operating hours stored as day-of-week + open/close times (WAT timezone).
- Venue assignment during booking should prefer venues in the user's preferred area with available capacity.

## Acceptance Criteria

- [ ] Ops can create, edit, and deactivate venues.
- [ ] Venue data model includes name, address, area, city, capacity, type, status, and hours.
- [ ] Venue availability prevents overbooking for a given time slot.
- [ ] Booking assignment considers venue area vs user preference.
- [ ] Ops console shows venue list with search/filter by area, status, type.
- [ ] Ops console shows venue detail with recent booking history.
- [ ] Migration creates venues table with proper schema and indexes.

## Review Checklist

- [ ] Venue capacity checked atomically during booking assignment.
- [ ] Inactive/maintenance venues excluded from booking assignment.
- [ ] Area field aligns with existing `dateAreas` preference values.
- [ ] Operating hours correctly handle WAT timezone.
- [ ] No public (unauthenticated) access to venue management endpoints.

## Test Checklist

- [ ] CRUD operations for venues via API.
- [ ] Venue capacity limit enforced during concurrent booking assignment.
- [ ] Inactive venue excluded from assignment pool.
- [ ] Ops console venue list renders with filtering.
- [ ] Venue detail page shows correct booking history.
- [ ] Migration applies cleanly on fresh database.

## Completion Notes

### Files Changed
- `backend/migrations/009_add_venue_management.sql` — New migration: adds structured columns to venues table, creates venue_time_slots table, adds indexes
- `backend/src/modules/app.types.ts` — Expanded VenuePartner type with full schema (status, capacity, address, operatingHours, blackoutDates), added VenueStatus, OperatingHours, VenueTimeSlot, CreateVenuePayload, UpdateVenuePayload, VenueListFilter, VenueDetail types
- `backend/src/modules/app.service.ts` — Added createVenue, updateVenue, getVenueDetail, listVenues, setVenueStatus, checkVenueAvailability, reserveVenueSlot, assignVenueForBooking methods; updated createBooking to use smart venue assignment; updated toggleVenue to sync status field; updated loadVenues/loadAllVenues
- `backend/src/modules/ops.controller.ts` — Added CRUD endpoints for venues (POST/GET/PUT /ops/venues, GET /ops/venues/:id, POST activate/deactivate/maintenance, GET availability)
- `backend/src/modules/demo-data.ts` — Expanded venue fixtures with full schema (address, capacity, contactPhone, contactEmail, operatingHours, status)
- `ops-console/src/App.tsx` — Full venue management UI: list with search/filter by area/status/type, create venue form, detail view with operating hours/time slots/booking history, status change controls
- `backend/src/modules/app.service.spec.ts` — 11 new venue management tests

### Acceptance Criteria Status
- [x] Ops can create, edit, and deactivate venues
- [x] Venue data model includes name, address, area, city, capacity, type, status, and hours
- [x] Venue availability prevents overbooking for a given time slot
- [x] Booking assignment considers venue area vs user preference
- [x] Ops console shows venue list with search/filter by area, status, type
- [x] Ops console shows venue detail with recent booking history
- [x] Migration creates venues table with proper schema and indexes

### Review: No findings

### Test Evidence
62/62 tests pass (11 new venue management tests):
- CRUD operations for venues via API
- Venue capacity limit enforced during concurrent booking assignment
- Inactive venue excluded from assignment pool
- Venue detail page shows correct booking history
- Smart venue assignment prefers user preferred area
- Migration applies cleanly on fresh database (venue_time_slots table created)
- Venue status changes reflect in ops dashboard

### Unresolved Risks
- None
