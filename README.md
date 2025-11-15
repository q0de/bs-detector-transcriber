# Video Transcriber & Analyzer - Full SaaS Platform

A subscription-based SaaS platform for transcribing and analyzing YouTube and Instagram videos using AI.

## Features

- ✅ URL-based video processing (YouTube, Instagram)
- ✅ AI-powered transcription with Whisper
- ✅ AI analysis (summarization and fact-checking) with Claude
- ✅ Minute-based usage tracking
- ✅ Stripe payment integration
- ✅ Multiple subscription tiers
- ✅ Video history and export (TXT, PDF, DOCX)
- ✅ User authentication with Supabase

## Tech Stack

### Backend
- Python 3.9+ with Flask
- Supabase (PostgreSQL + Auth)
- Stripe (Payments)
- OpenAI Whisper (Transcription)
- Anthropic Claude (Analysis)
- yt-dlp (Video Download)

### Frontend
- React 18
- React Router v6
- Supabase JavaScript client
- Stripe.js

### Infrastructure
- Railway (Backend hosting)
- Vercel (Frontend hosting - recommended)
- Supabase (Database + Auth)

## Setup Instructions

### 1. Database Setup (Supabase)

1. Create a Supabase project at https://supabase.com
2. Go to SQL Editor
3. Run the SQL script from `database/schema.sql`
4. Copy your Supabase URL and anon key

### 2. Backend Setup

1. Navigate to `backend/` directory
2. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Create `.env` file (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```
5. Fill in your environment variables:
   - `SUPABASE_URL` - Your Supabase project URL
   - `SUPABASE_KEY` - Your Supabase anon key
   - `ANTHROPIC_API_KEY` - Your Anthropic API key
   - `STRIPE_SECRET_KEY` - Your Stripe secret key
   - `STRIPE_WEBHOOK_SECRET` - Your Stripe webhook secret
   - `STRIPE_*_PRICE_ID` - Your Stripe price IDs for each plan
   - `FRONTEND_URL` - Your frontend URL (http://localhost:3000 for dev)
6. Run the backend:
   ```bash
   python app.py
   ```

### 3. Frontend Setup

1. Navigate to `frontend/` directory
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create `.env` file (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```
4. Fill in your environment variables:
   - `REACT_APP_API_URL` - Your backend API URL (http://localhost:5000/api)
   - `REACT_APP_SUPABASE_URL` - Your Supabase project URL
   - `REACT_APP_SUPABASE_ANON_KEY` - Your Supabase anon key
   - `REACT_APP_STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key
5. Run the frontend:
   ```bash
   npm start
   ```

### 4. Stripe Setup

1. Create a Stripe account at https://stripe.com
2. Create products and prices for each plan:
   - Starter Monthly ($12)
   - Starter Yearly ($120)
   - Pro Monthly ($29)
   - Pro Yearly ($290)
   - Business Monthly ($79)
   - Business Yearly ($790)
3. Copy the price IDs and add them to your backend `.env`
4. Set up webhook endpoint in Stripe Dashboard:
   - URL: `https://your-backend.railway.app/api/payments/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.*`, `invoice.payment_*`

## Deployment

### Backend (Railway)

1. Create a Railway account at https://railway.app
2. Create a new project
3. Connect your GitHub repository
4. Select the `backend/` directory
5. Add all environment variables from `.env`
6. Railway will automatically deploy

### Frontend (Vercel)

1. Create a Vercel account at https://vercel.com
2. Import your GitHub repository
3. Set root directory to `frontend/`
4. Add environment variables
5. Deploy

## Project Structure

```
.
├── backend/
│   ├── app.py                 # Flask application entry point
│   ├── requirements.txt       # Python dependencies
│   ├── railway.json          # Railway deployment config
│   ├── routes/               # API route handlers
│   │   ├── auth.py           # Authentication endpoints
│   │   ├── videos.py         # Video processing endpoints
│   │   ├── payments.py        # Stripe payment endpoints
│   │   └── users.py          # User endpoints
│   ├── services/             # Business logic services
│   │   ├── supabase_client.py
│   │   ├── stripe_client.py
│   │   ├── video_processor.py
│   │   └── export_service.py
│   └── middleware/           # Middleware functions
│       └── auth_middleware.py
├── frontend/
│   ├── src/
│   │   ├── App.js            # Main React app
│   │   ├── pages/             # Page components
│   │   ├── components/        # Reusable components
│   │   └── services/          # API service functions
│   └── package.json
├── database/
│   └── schema.sql             # Database schema
└── README.md

```

## API Endpoints

### Authentication
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/reset-password` - Send password reset email

### Videos
- `POST /api/videos/process` - Process video from URL
- `GET /api/videos/history` - Get video history
- `GET /api/videos/:id` - Get single video
- `DELETE /api/videos/:id` - Delete video
- `GET /api/videos/:id/export` - Export video (txt/pdf/docx)

### Payments
- `POST /api/payments/create-checkout-session` - Create Stripe checkout
- `POST /api/payments/webhook` - Stripe webhook handler
- `POST /api/payments/create-portal-session` - Create customer portal
- `POST /api/payments/cancel-subscription` - Cancel subscription
- `GET /api/payments/billing-history` - Get billing history

### Users
- `GET /api/users/me` - Get current user
- `GET /api/users/usage` - Get usage statistics
- `DELETE /api/users/me` - Delete account

## Pricing Tiers

- **Free**: $0/month - 60 minutes
- **Starter**: $12/month - 300 minutes
- **Pro**: $29/month - 1000 minutes
- **Business**: $79/month - 3500 minutes

## License

MIT

