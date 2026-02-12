# Resend Email Setup Guide

## Overview
The email service has been migrated from SMTP to **Resend API** for better reliability and deliverability.

## Key Features
- ✅ All emails automatically sent to `emjisolutions@gmail.com` (admin email)
- ✅ Client emails also included when available
- ✅ PDF attachments supported for final reports
- ✅ No SMTP configuration needed
- ✅ Better deliverability and reliability

## Setup Instructions

### 1. Get Your Resend API Key
1. Go to [resend.com](https://resend.com)
2. Sign in or create an account
3. Navigate to **API Keys** section
4. Create a new API key
5. Copy the API key (starts with `re_`)

### 2. Verify Your Domain
1. In Resend dashboard, go to **Domains**
2. Your domain `goboclean.be` should already be verified
3. If not, follow Resend's domain verification instructions

### 3. Update Environment Variables
Add the following to your `.env` file:

```bash
# Email Configuration with Resend
RESEND_API_KEY=re_your_api_key_here
FROM_EMAIL=info@goboclean.be
```

### 4. Remove Old SMTP Configuration
You can remove these old SMTP variables from `.env`:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASSWORD`

## Email Recipients

### All emails are sent to:
1. **Admin Email**: `emjisolutions@gmail.com` (always included)
2. **Client Email**: From mission data (when available)

### Email Types:
- **Report Email**: Sent when final report is generated (includes PDF attachment)
- **Mission Assigned**: Sent to workers when mission is assigned
- **Report Submitted**: Sent to admins when before photos are submitted
- **Mission Completed**: Sent to admins when mission is completed
- **Mission Cancelled**: Sent to workers when mission is cancelled

## Testing

### Test the Email Service:
```bash
# Test connection
curl -X POST http://localhost:3001/api/email/test-connection \
  -H "Authorization: Bearer YOUR_TOKEN"

# Send test email
curl -X POST http://localhost:3001/api/email/test-send \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"to": "emjisolutions@gmail.com", "subject": "Test Email"}'
```

## Troubleshooting

### Error: "RESEND_API_KEY is required"
- Make sure you've added `RESEND_API_KEY` to your `.env` file
- Restart the backend server after updating `.env`

### Emails not being received
- Check Resend dashboard for delivery status
- Verify your domain is properly configured in Resend
- Check spam folder
- Ensure `FROM_EMAIL` matches your verified domain

### PDF attachments not working
- PDF is automatically converted to base64 for Resend
- Check that the PDF buffer is valid before sending
- Resend has a 40MB attachment limit

## Migration Notes

### What Changed:
- ✅ Replaced `nodemailer` with `resend` package
- ✅ Updated all email methods to use Resend API
- ✅ All emails now include admin email automatically
- ✅ PDF attachments converted to base64 for Resend
- ✅ Better error handling and logging

### What Stayed the Same:
- ✅ Email templates (HTML unchanged)
- ✅ Email triggers (same workflow)
- ✅ API endpoints (same endpoints)

## Support
For Resend support, visit: https://resend.com/docs
