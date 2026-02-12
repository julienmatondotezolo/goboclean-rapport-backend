# Migration 008: Reset and Seed Test Missions - Analysis

## Overview
This migration performs a complete reset of mission and report data, then seeds the database with 3 test missions assigned to Marc for February 12, 2026 at 10:15 Brussels time.

## Migration File
`008_reset_and_seed_test_missions.sql`

## Operations Performed

### 1. Data Cleanup (Deletion Order)
The migration deletes data in the correct order to respect foreign key constraints:

1. **Notifications** - Delete mission-related notifications first
2. **Mission References** - Clear `report_id` from missions
3. **Photos** - Delete all photos (FK to reports)
4. **Reports** - Delete all reports
5. **Missions** - Delete all missions

### 2. Storage Bucket Cleanup
⚠️ **Important Limitation**: Direct deletion from `storage.objects` is protected by Supabase and will fail with error `42501`. The migration includes commented code for documentation purposes.

**Manual cleanup required for:**
- `pdfs` bucket
- `signatures` bucket  
- `roof-photos` bucket

**Cleanup methods:**
- Supabase Dashboard (Storage section)
- Supabase Storage API in backend code
- Supabase CLI storage commands

### 3. Mission Creation
Creates 3 test missions with the following characteristics:

#### Mission 1: Charlotte Dubois
- **Address**: Boulevard du Midi 111, 1000 Bruxelles
- **Type**: Roof cleaning
- **Surface**: 95.0 m²
- **Phone**: +32 475 22 33 44
- **Email**: charlotte.dubois@email.be
- **Note**: Standard roof cleaning service

#### Mission 2: Louis Bernard
- **Address**: Rue du Trône 222, 1050 Ixelles
- **Type**: Roof cleaning + coating
- **Surface**: 145.0 m²
- **Phone**: +32 476 55 66 77
- **Email**: louis.bernard@email.be
- **Note**: Full service with coating application

#### Mission 3: Camille Moreau
- **Address**: Avenue Louise 333, 1060 Saint-Gilles
- **Type**: Roof cleaning
- **Surface**: 108.0 m²
- **Phone**: +32 477 88 99 00
- **Email**: camille.moreau@email.be
- **Note**: Quick cleaning required

## Technical Details

### Timezone Handling
- **Input**: `2026-02-12 10:15:00+01` (Brussels time, CET = UTC+1)
- **Storage**: `2026-02-12 09:15:00+00` (UTC)
- **Display**: Automatically converted to Brussels time when queried with `AT TIME ZONE 'Europe/Brussels'`

### Dynamic User Lookup
The migration uses a `DO` block to dynamically look up user IDs:
- Finds Marc Janssens (worker) by name
- Finds an admin user for `created_by` field
- Raises exceptions if required users are not found

### Safety Features
1. **Transaction-safe**: All operations run in a single transaction
2. **Error handling**: Validates user existence before insertion
3. **Verification query**: Includes a SELECT to verify created missions
4. **Logging**: Uses `RAISE NOTICE` to log success

## Test Results

### ✅ Cleanup Phase
```sql
missions_count: 0
reports_count: 0
photos_count: 0
mission_notifications_count: 0
```

### ✅ Creation Phase
All 3 missions created successfully:

| Client | Address | Time (Brussels) | Status | Assigned To |
|--------|---------|-----------------|--------|-------------|
| Charlotte Dubois | Boulevard du Midi 111 | 2026-02-12 10:15 | assigned | Marc Janssens |
| Louis Bernard | Rue du Trône 222 | 2026-02-12 10:15 | assigned | Marc Janssens |
| Camille Moreau | Avenue Louise 333 | 2026-02-12 10:15 | assigned | Marc Janssens |

### ✅ Timezone Verification
- **UTC Storage**: 2026-02-12 09:15:00+00
- **Brussels Display**: 2026-02-12 10:15:00
- **Conversion**: Correct (UTC+1)

## Potential Issues & Solutions

### Issue 1: Storage Bucket Cleanup
**Problem**: Cannot delete storage objects via SQL
**Solution**: Manual cleanup required via Dashboard or API

### Issue 2: User Not Found
**Problem**: Migration fails if Marc Janssens or admin user doesn't exist
**Solution**: Migration includes error handling with descriptive messages

### Issue 3: Idempotency
**Problem**: Running migration multiple times will delete and recreate missions
**Solution**: This is intentional for testing purposes. For production, add conditional logic.

## Recommendations

### For Development/Testing
✅ Use this migration as-is to reset test data

### For Production
⚠️ **DO NOT USE** - This migration deletes all data!

### For CI/CD
Consider creating a separate seed file that:
1. Checks if missions exist before deleting
2. Uses environment variables for user selection
3. Includes rollback procedures

## Usage

### Apply Migration
```bash
# Using Supabase CLI
supabase db push

# Or apply specific migration
psql $DATABASE_URL -f supabase/migrations/008_reset_and_seed_test_missions.sql
```

### Verify Results
```sql
SELECT 
  client_first_name || ' ' || client_last_name as client,
  appointment_time AT TIME ZONE 'Europe/Brussels' as appointment,
  status,
  (SELECT first_name || ' ' || last_name FROM users WHERE id = ANY(assigned_workers) LIMIT 1) as worker
FROM missions
ORDER BY created_at DESC;
```

## Conclusion

✅ **Migration Status**: TESTED AND WORKING
✅ **Data Cleanup**: Complete (database only)
⚠️ **Storage Cleanup**: Manual action required
✅ **Mission Creation**: 3 missions created successfully
✅ **Timezone Handling**: Correct
✅ **User Assignment**: Marc Janssens assigned correctly

The migration is ready for use in development/testing environments.
