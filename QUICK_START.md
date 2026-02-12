# Quick Start - Email Service with Resend

## ⚡ What Was Fixed

Your backend was trying to use Gmail SMTP which was failing with authentication errors. 

**The email service has been migrated to Resend API** which is:
- ✅ More reliable
- ✅ Better deliverability
- ✅ No SMTP configuration needed
- ✅ Works with your verified `goboclean.be` domain

## 🚀 How to Get Started

### Step 1: Get Your Resend API Key

1. Go to [resend.com](https://resend.com) and sign in
2. Navigate to **API Keys** in the dashboard
3. Click **Create API Key**
4. Copy the API key (starts with `re_`)

### Step 2: Update Your .env File

Open `/Users/julienmatondo/goboclean-rapport-backend/.env` and replace:

```bash
RESEND_API_KEY=your_resend_api_key_here
```

with your actual API key:

```bash
RESEND_API_KEY=re_your_actual_key_here
```

### Step 3: Start the Backend

```bash
cd /Users/julienmatondo/goboclean-rapport-backend
npm run start:dev
```

You should see:
```
✅ Resend initialized successfully
📧 Email: Resend API ✅
```

## 📧 Email Behavior

### All emails are now sent to:
1. **emjisolutions@gmail.com** (ALWAYS - this is your admin email)
2. **Client email** (from mission data, when available)

### When are emails sent?

1. **Final Report Email** (with PDF attachment):
   - Triggered when a report is finalized
   - Sent to: admin + client email
   - Includes: PDF report as attachment

2. **Mission Assigned**:
   - Triggered when mission is assigned to workers
   - Sent to: admin + worker emails

3. **Report Submitted**:
   - Triggered when before photos are submitted
   - Sent to: admin + specified recipients

4. **Mission Completed**:
   - Triggered when mission is marked complete
   - Sent to: admin + specified recipients

5. **Mission Cancelled**:
   - Triggered when mission is cancelled
   - Sent to: admin + worker emails

## 🧪 Testing

After starting the backend, test the email service using Swagger:

1. Go to http://localhost:3001/api
2. Authorize with your admin token
3. Try the test endpoints:
   - `POST /api/email/test-connection` - Check if Resend is working
   - `POST /api/email/test-send` - Send a test email

## ❓ Troubleshooting

### Error: "RESEND_API_KEY is required"
- Make sure you added the API key to `.env`
- Restart the backend after updating `.env`

### Backend won't start
- Check that your API key is valid (starts with `re_`)
- Make sure there are no spaces around the `=` in `.env`
- Check the terminal for specific error messages

### Emails not received
- Check your Resend dashboard for delivery status
- Verify your domain `goboclean.be` is verified in Resend
- Check spam folder
- Make sure `FROM_EMAIL=info@goboclean.be` is set in `.env`

## 📚 More Information

- **Setup Guide**: See `RESEND_SETUP.md` for detailed instructions
- **Migration Summary**: See `EMAIL_MIGRATION_SUMMARY.md` for technical details
- **Resend Docs**: https://resend.com/docs

## 🎯 Key Points

- ✅ No more SMTP errors
- ✅ You'll receive ALL emails at emjisolutions@gmail.com
- ✅ PDF attachments work automatically
- ✅ Better email deliverability
- ✅ Verified domain (goboclean.be)

---

**Need help?** Check the Resend dashboard for delivery logs and status.
