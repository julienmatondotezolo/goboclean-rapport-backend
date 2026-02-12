# Backend Restart Required

## ⚠️ Important: Backend needs to be restarted

The backend code has been updated to fix the PDF URL issue. Please restart the backend server.

## How to Restart

In the terminal where the backend is running (Terminal 2), run:

```bash
cd /Users/julienmatondo/goboclean-rapport-backend
npm run start:dev
```

## What Was Fixed

1. **PDF URL Transformation**: The backend now properly handles invalid `pdf_url` values like `"{}"` and converts them to `null`
2. **New Endpoint**: Added `/api/reports/:id/regenerate-pdf` to manually regenerate PDFs
3. **Proper URL Construction**: If a PDF exists but the URL is relative, it will be converted to a full public URL

## Testing After Restart

1. Navigate to a report in the frontend
2. The `pdf_url` should now be either:
   - A full URL: `https://...supabase.co/storage/v1/object/public/pdfs/...`
   - Or `null` if no PDF exists
3. The download button should appear for admins when a valid PDF URL exists

## If PDF is Still Missing

You can manually trigger PDF generation:

```bash
POST /api/reports/{report-id}/regenerate-pdf
```

This will generate the PDF and update the database with the correct URL.
