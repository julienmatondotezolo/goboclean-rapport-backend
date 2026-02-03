# RoofReport Backend API

NestJS backend for RoofReport PWA - Handles PDF generation and email delivery.

## 🚀 Features

- ✅ **PDF Generation** with @react-pdf/renderer
- ✅ **Email Service** with Nodemailer
- ✅ **Supabase Integration** for data and storage
- ✅ **Admin Statistics** endpoint
- ✅ **Swagger Documentation** at `/api`
- ✅ **TypeScript** with strong typing

## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- SMTP credentials (Resend, SendGrid, etc.)

## 🛠️ Installation

```bash
npm install
```

## ⚙️ Configuration

Create a `.env` file in the root directory:

```env
# Supabase Configuration
SUPABASE_URL=your-project-url.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# SMTP Configuration (Example with Resend)
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=re_xxxxxxxxxx
SMTP_FROM=noreply@goboclean.be

# Application
PORT=3001
NODE_ENV=development

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

### Using Resend (Recommended)

1. Sign up at [resend.com](https://resend.com)
2. Get your API key
3. Use these settings:
   - Host: `smtp.resend.com`
   - Port: `587`
   - User: `resend`
   - Password: Your API key

### Using SendGrid

1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Create an API key
3. Use these settings:
   - Host: `smtp.sendgrid.net`
   - Port: `587`
   - User: `apikey`
   - Password: Your API key

## 🚀 Running the Application

### Development

```bash
npm run start:dev
```

The server will start on `http://localhost:3001`

### Production

```bash
npm run build
npm run start:prod
```

## 📚 API Documentation

Once the server is running, visit:

```
http://localhost:3001/api
```

Swagger UI will provide interactive API documentation.

## 🔌 API Endpoints

### Reports

- `POST /reports/:id/generate-pdf` - Generate PDF and send email
- `GET /reports/:id` - Get a specific report
- `GET /reports?workerId=xxx` - Get all reports or filter by worker

### Admin

- `GET /admin/stats` - Get dashboard statistics
- `GET /admin/workers` - Get all workers
- `GET /admin/workers/:id/reports` - Get reports by worker

## 🏗️ Project Structure

```
src/
├── main.ts              # Application entry point
├── app.module.ts        # Root module
├── supabase/            # Supabase service
│   ├── supabase.module.ts
│   └── supabase.service.ts
├── reports/             # Reports module
│   ├── reports.module.ts
│   ├── reports.controller.ts
│   └── reports.service.ts
├── pdf/                 # PDF generation
│   ├── pdf.module.ts
│   ├── pdf.service.ts
│   └── templates/
│       └── report-pdf.tsx
├── email/               # Email service
│   ├── email.module.ts
│   └── email.service.ts
└── admin/               # Admin endpoints
    ├── admin.module.ts
    ├── admin.controller.ts
    └── admin.service.ts
```

## 🔒 Security

- Uses Supabase **Service Role Key** for privileged operations
- CORS enabled for frontend origin only
- Environment variables for sensitive data
- Validation pipes for request data

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## 📊 Workflow

1. Frontend creates a report in Supabase
2. Frontend calls `POST /reports/:id/generate-pdf`
3. Backend retrieves report data from Supabase
4. Backend generates PDF using @react-pdf/renderer
5. Backend uploads PDF to Supabase Storage
6. Backend sends email with PDF attachment
7. Backend updates report status to "completed"

## 🐛 Debugging

Enable debug logs:

```bash
npm run start:debug
```

Check SMTP connection:

The email service has a `testConnection()` method that can be called during startup.

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_URL` | Supabase project URL | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (not anon key!) | ✅ |
| `SMTP_HOST` | SMTP server host | ✅ |
| `SMTP_PORT` | SMTP server port | ✅ |
| `SMTP_USER` | SMTP username | ✅ |
| `SMTP_PASSWORD` | SMTP password/API key | ✅ |
| `SMTP_FROM` | Sender email address | ✅ |
| `PORT` | API port | ❌ (default: 3001) |
| `FRONTEND_URL` | Frontend URL for CORS | ❌ (default: localhost:3000) |

## 📦 Deployment

### Docker

Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3001

CMD ["npm", "run", "start:prod"]
```

Build and run:

```bash
docker build -t goboclean-backend .
docker run -p 3001:3001 --env-file .env goboclean-backend
```

### Vercel/Railway/Render

1. Connect your Git repository
2. Set environment variables in the dashboard
3. Deploy with build command: `npm run build`
4. Start command: `npm run start:prod`

## 🤝 Support

For issues or questions, contact: contact@goboclean.be

## 📄 License

MIT © GoBo Clean 2026
