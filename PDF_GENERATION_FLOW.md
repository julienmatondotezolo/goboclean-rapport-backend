# PDF Generation Flow - Complete Documentation

## Overview
The system automatically generates a PDF report when a mission is completed. The PDF includes before/after photos and signatures, and is stored in Supabase Storage.

## Complete Flow

### 1. Mission Lifecycle

```
1. Create Mission → assigned
2. Start Mission → in_progress
3. Submit Before Pictures → waiting_completion (creates report in draft)
4. Complete Mission → completed (updates report to completed + generates PDF)
```

### 2. Report Creation (Before Pictures)

**Endpoint**: `POST /api/missions/:id/before-pictures`

**What happens**:
1. Worker uploads before-pictures
2. Photos are stored in Supabase Storage (`roof-photos` bucket)
3. A **report** is created in `draft` status
4. Photos are linked to the report with `type: 'before'`
5. Mission is updated with `report_id`
6. Mission status changes to `waiting_completion`

**Code Location**: `src/missions/missions.service.ts` - `submitBeforePictures()`

### 3. Mission Completion (After Pictures + Signatures)

**Endpoint**: `POST /api/missions/:id/complete`

**What happens**:
1. Worker uploads after-pictures and signatures
2. After-photos are stored in Supabase Storage (`roof-photos` bucket)
3. Signatures are stored in Supabase Storage (`signatures` bucket)
4. The **existing report** is updated:
   - Status: `draft` → `completed`
   - Signatures added
   - Completed timestamp added
5. After-photos are linked to the same report with `type: 'after'`
6. Mission status changes to `completed`
7. **PDF is automatically generated** ✨
8. PDF is uploaded to Supabase Storage (`pdfs` bucket)
9. Report is updated with `pdf_url`
10. Email is sent to client with PDF attachment

**Code Location**: `src/missions/missions.service.ts` - `completeMission()`

### 4. PDF Generation Details

**Service**: `src/reports/reports.service.ts` - `generateAndSendReport()`

**Process**:
1. Fetch report with all photos from database
2. Fetch company settings (logo, contact info)
3. Generate public URLs for all photos
4. Use signature URLs (already public URLs in DB)
5. Generate PDF using React PDF template
6. Upload PDF to storage: `pdfs/{reportId}/report.pdf`
7. Update report with `pdf_url`
8. Send email with PDF attachment

**PDF Template**: `src/pdf/templates/report-pdf.tsx`

**PDF Contents**:
- ✅ Company header with logo
- ✅ Report number and date
- ✅ Client information
- ✅ Roof state details
- ✅ Worker information
- ✅ Technical observations
- ✅ **Before photos** (filtered by `type: 'before'`)
- ✅ **After photos** (filtered by `type: 'after'`)
- ✅ **Worker signature** with timestamp
- ✅ **Client signature** with timestamp
- ✅ Legal mentions and footer

## Storage Structure

### Supabase Storage Buckets

1. **roof-photos** (before/after pictures)
   ```
   missions/{missionId}/before/{timestamp}_0.jpg
   missions/{missionId}/before/{timestamp}_1.jpg
   missions/{missionId}/after/{timestamp}_0.jpg
   missions/{missionId}/after/{timestamp}_1.jpg
   ```

2. **signatures** (worker/client signatures)
   ```
   missions/{missionId}/signatures/worker.png
   missions/{missionId}/signatures/client.png
   ```

3. **pdfs** (generated reports)
   ```
   {reportId}/report.pdf
   ```

## Database Schema

### Reports Table
```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY,
  worker_id UUID REFERENCES users(id),
  client_first_name TEXT,
  client_last_name TEXT,
  client_address TEXT,
  client_phone TEXT,
  status TEXT, -- 'draft' or 'completed'
  worker_signature_url TEXT, -- Full public URL
  client_signature_url TEXT, -- Full public URL
  pdf_url TEXT, -- Full public URL to PDF
  created_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Photos Table
```sql
CREATE TABLE photos (
  id UUID PRIMARY KEY,
  report_id UUID REFERENCES reports(id),
  type TEXT, -- 'before' or 'after'
  storage_path TEXT,
  url TEXT, -- Full public URL
  order INTEGER,
  created_at TIMESTAMPTZ
);
```

### Missions Table
```sql
CREATE TABLE missions (
  id UUID PRIMARY KEY,
  report_id UUID REFERENCES reports(id), -- Single report reference
  status mission_status,
  -- ... other fields
);
```

## Frontend Integration

### Download PDF Button

**Location**: `src/app/[locale]/(pages)/reports/[id]/page.tsx`

**Code**:
```typescript
const handleDownloadPDF = async () => {
  if (!report?.pdf_url) return;
  
  // Open PDF in new tab for download
  window.open(report.pdf_url, '_blank');
};
```

**Button Display**:
- Only shown if `report.pdf_url` exists
- Only admins can download (security check)
- Opens PDF in new tab

### Reports List

**Location**: `src/app/[locale]/(pages)/reports/page.tsx`

**Status Indicator**:
- Shows "synced" if report has `pdf_url`
- Shows "pending" if report is in draft without PDF

## API Endpoints

### Generate PDF (Manual Trigger)
```
POST /api/reports/:id/generate-pdf
```
This can be used to regenerate a PDF if needed (e.g., if automatic generation failed).

### Get Report
```
GET /api/reports/:id
```
Returns report with `pdf_url` field.

### List Reports
```
GET /api/reports
```
Returns all reports with their PDF URLs.

## Error Handling

### PDF Generation Failure
- Mission completion does NOT fail if PDF generation fails
- Error is logged but mission is marked as completed
- PDF can be regenerated manually via the endpoint

### Missing Photos
- PDF will show empty sections if photos are missing
- At least one before and one after photo should be required

### Missing Signatures
- PDF will show empty signature boxes if signatures are missing
- Signatures are optional but recommended

## Testing Checklist

### Test Complete Flow
1. ✅ Create a mission
2. ✅ Start the mission
3. ✅ Submit before-pictures (check report created in draft)
4. ✅ Complete mission with after-pictures and signatures
5. ✅ Verify PDF is generated automatically
6. ✅ Check PDF contains:
   - Before photos
   - After photos
   - Worker signature
   - Client signature
7. ✅ Verify PDF can be downloaded from reports page
8. ✅ Check email was sent with PDF attachment

### Test Edge Cases
- Mission without signatures (should still generate PDF)
- Mission with many photos (check PDF pagination)
- PDF regeneration after failure
- Download permission (only admins)

## Troubleshooting

### PDF Not Generated
1. Check backend logs for errors
2. Verify report has both before and after photos
3. Check Supabase storage permissions
4. Try manual regeneration: `POST /api/reports/:id/generate-pdf`

### PDF Missing Photos
1. Verify photos are in database with correct `report_id`
2. Check photo URLs are accessible
3. Verify storage bucket permissions

### PDF Missing Signatures
1. Check signatures were uploaded during mission completion
2. Verify signature URLs in reports table
3. Check signatures bucket permissions

### Download Not Working
1. Verify user is admin
2. Check `pdf_url` exists in report
3. Verify PDF exists in storage
4. Check storage bucket is public or has correct RLS policies

## Security Notes

- PDF URLs are public (anyone with URL can access)
- Download button has admin-only restriction in UI
- Consider adding RLS policies if PDFs should be private
- Signatures are stored as images, not encrypted
