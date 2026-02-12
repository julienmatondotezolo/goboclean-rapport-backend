#!/bin/bash
# Test PDF generation for report
REPORT_ID="3df85228-aae1-462c-9475-e69c6cc6dc61"
echo "Testing PDF generation for report: $REPORT_ID"
echo "Backend should be running on http://localhost:3000"
echo ""
echo "Run this command to trigger PDF generation:"
echo "curl -X POST http://localhost:3000/api/reports/$REPORT_ID/regenerate-pdf -H 'Authorization: Bearer YOUR_TOKEN'"
