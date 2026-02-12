# Report Consolidation Changes

## Overview
Consolidated the pre-report and final-report system into a single report that transitions from `draft` to `completed` status.

## What Changed

### Database Schema
- **Migration**: `007_consolidate_reports.sql`
- Replaced `pre_report_id` and `final_report_id` columns with single `report_id` column in `missions` table
- Migrated existing data (prioritized final_report_id, fallback to pre_report_id)
- Added index for `report_id`

### Backend Changes

#### 1. Missions Service (`src/missions/missions.service.ts`)
- **Before Pictures Submission**: 
  - Creates a new report in `draft` status (or reuses existing if present)
  - Links before-photos to this report
  - Updates mission with `report_id`
  
- **Mission Completion**:
  - Updates existing report to `completed` status
  - Adds signatures to the report
  - Links after-photos to the same report
  - Generates PDF for the completed report

- **Photo Enrichment**:
  - Fetches both before and after photos from single report
  - Filters by photo type (`before` or `after`)

- **Notifications**:
  - Renamed `notifyAdminsPreReport` → `notifyAdminsReportSubmitted`

#### 2. Email Service (`src/email/email.service.ts`)
- Renamed `sendPreReportEmail` → `sendReportSubmittedEmail`
- Updated email subject and content to reflect single report concept

#### 3. Test Controller (`src/missions/missions-test.controller.ts`)
- Updated debug endpoints to use `report_id` instead of separate IDs
- Fetches all photos from single report and filters by type

#### 4. Documentation (`src/main.ts`)
- Updated API documentation to reflect single report architecture

### Frontend Changes

#### Types (`src/types/mission.ts`)
- Replaced `pre_report_id` and `final_report_id` with single `report_id` field

## Report Lifecycle

### Old System
1. Worker submits before-pictures → Creates **pre-report** (draft)
2. Worker completes mission → Creates **final-report** (completed)
3. Two separate reports, two separate PDFs

### New System
1. Worker submits before-pictures → Creates **report** (draft status)
2. Worker completes mission → Updates **same report** to completed status
3. One report, one PDF (generated only when completed)

## Benefits
1. **Simpler data model**: One report per mission instead of two
2. **Single PDF**: Only generated when mission is fully completed
3. **Better data consistency**: All mission data in one report
4. **Easier to track**: One ID to reference throughout the system
5. **Reduced database complexity**: Fewer foreign keys and joins

## Migration Notes
- Existing data is automatically migrated by the SQL migration
- The migration prioritizes `final_report_id` over `pre_report_id` when both exist
- All photos remain linked correctly through the `photos` table

## Testing
After applying the migration:
1. Test before-picture submission (should create draft report)
2. Test mission completion (should update report to completed)
3. Verify PDF generation works correctly
4. Check that photo arrays are populated correctly in API responses
5. Test debug endpoints: `/admin/missions-test/photo-debug/:id`
