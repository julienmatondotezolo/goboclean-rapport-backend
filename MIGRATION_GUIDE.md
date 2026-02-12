# Migration Guide: Consolidate Reports

## Prerequisites
- Backup your database before running the migration
- Ensure no active missions are in progress during migration

## Steps to Apply

### 1. Apply Database Migration

Run the migration file to update the database schema:

```bash
# If using Supabase CLI
supabase db push

# Or apply the migration directly via SQL
psql -h your-db-host -U your-user -d your-database -f supabase/migrations/007_consolidate_reports.sql
```

### 2. Verify Migration

Check that the migration was successful:

```sql
-- Verify new column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'missions' AND column_name = 'report_id';

-- Verify old columns are removed
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'missions' 
  AND column_name IN ('pre_report_id', 'final_report_id');
-- Should return 0 rows

-- Check data migration
SELECT 
  COUNT(*) as total_missions,
  COUNT(report_id) as missions_with_reports
FROM missions;
```

### 3. Deploy Backend Changes

```bash
cd goboclean-rapport-backend
npm run build
npm run start:prod
```

### 4. Deploy Frontend Changes

```bash
cd goboclean-rapport
npm run build
# Deploy to your hosting platform
```

### 5. Test the System

1. **Test Before-Pictures Submission**:
   - Create a new mission
   - Assign to a worker
   - Start the mission
   - Submit before-pictures
   - Verify a report is created in draft status

2. **Test Mission Completion**:
   - Complete the mission with after-pictures and signatures
   - Verify the same report is updated to completed status
   - Check that PDF is generated
   - Verify email is sent

3. **Test Photo Display**:
   - View mission details
   - Verify before_pictures array is populated
   - Verify after_pictures array is populated

4. **Test Debug Endpoint** (Admin only):
   ```bash
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://your-api/admin/missions-test/photo-debug/MISSION_ID
   ```

## Rollback Plan

If you need to rollback:

```sql
-- Add back old columns
ALTER TABLE missions ADD COLUMN pre_report_id UUID REFERENCES reports(id);
ALTER TABLE missions ADD COLUMN final_report_id UUID REFERENCES reports(id);

-- Restore data (this is a simplified example)
UPDATE missions
SET pre_report_id = report_id
WHERE status IN ('waiting_completion', 'in_progress');

UPDATE missions
SET final_report_id = report_id
WHERE status = 'completed';

-- Remove new column
ALTER TABLE missions DROP COLUMN report_id;
```

## Troubleshooting

### Issue: Photos not showing
- Check that photos table has correct report_id references
- Verify storage paths are correct
- Check Supabase storage bucket permissions

### Issue: PDF not generating
- Check reports service logs
- Verify report has both before and after photos
- Check that report status is 'completed'

### Issue: Migration fails
- Check for foreign key constraints
- Verify no orphaned reports exist
- Check database user permissions

## Support
If you encounter issues, check the logs:
```bash
# Backend logs
npm run start:dev

# Check specific service logs
# Look for MissionsService, ReportsService, PdfService logs
```
