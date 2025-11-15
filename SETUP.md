# Setup Guide - Video Transcriber & Analyzer

This guide will walk you through setting up the complete SaaS platform.

## Prerequisites

- Python 3.9+
- Node.js 16+
- Supabase account (free tier available)
- Stripe account (test mode initially)
- Anthropic API key
- Railway account (for backend hosting)
- Vercel account (for frontend hosting - optional, can use other providers)

## Step 1: Supabase Setup

1. Go to https://supabase.com and create a new project
2. Wait for the project to be created (takes ~2 minutes)
3. Go to **SQL Editor** in the Supabase dashboard
4. Copy and paste the entire contents of `database/schema.sql`
5. Click **Run** to execute the SQL
6. Verify tables were created by checking the **Table Editor**
7. Go to **Settings → API** and copy:
   - Project URL → This is your `SUPABASE_URL`
   - anon/public key → This is your `SUPABASE_KEY`

## Step 2: Stripe Setup

1. Go to https://stripe.com and create an account
2. Go to **Developers → API keys** and copy:
   - Secret key (test mode) → This is your `STRIPE_SECRET_KEY`
   - Publishable key (test mode) → This is your `REACT_APP_STRIPE_PUBLISHABLE_KEY`
3. Go to **Products** and create the following products:

   **Starter Plan:**
   - Name: Starter Monthly
   - Price: $12.00 USD, Recurring monthly
   - Copy the Price ID → `STRIPE_STARTER_MONTHLY_PRICE_ID`
   
   - Name: Starter Yearly
   - Price: $120.00 USD, Recurring yearly
   - Copy the Price ID → `STRIPE_STARTER_YEARLY_PRICE_ID`

   **Pro Plan:**
   - Name: Pro Monthly
   - Price: $29.00 USD, Recurring monthly
   - Copy the Price ID → `STRIPE_PRO_MONTHLY_PRICE_ID`
   
   - Name: Pro Yearly
   - Price: $290.00 USD, Recurring yearly
   - Copy the Price ID → `STRIPE_PRO_YEARLY_PRICE_ID`

   **Business Plan:**
   - Name: Business Monthly
   - Price: $79.00 USD, Recurring monthly
   - Copy the Price ID → `STRIPE_BUSINESS_MONTHLY_PRICE_ID`
   
   - Name: Business Yearly
   - Price: $790.00 USD, Recurring yearly
   - Copy the Price ID → `STRIPE_BUSINESS_YEARLY_PRICE_ID`

4. Go to **Developers → Webhooks** and click **Add endpoint**
   - Endpoint URL: `https://your-backend.railway.app/api/payments/webhook` (update after deployment)
   - Events to send: Select these events:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy the **Signing secret** → This is your `STRIPE_WEBHOOK_SECRET`

## Step 3: Anthropic API Setup

1. Go to https://console.anthropic.com
2. Create an account or sign in
3. Go to **API Keys**
4. Create a new API key
5. Copy the key → This is your `ANTHROPIC_API_KEY`

## Step 4: Backend Setup (Local Development)

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment:
   ```bash
   python -m venv venv
   ```

3. Activate the virtual environment:
   - **Windows:**
     ```bash
     venv\Scripts\activate
     ```
   - **Mac/Linux:**
     ```bash
     source venv/bin/activate
     ```

4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

5. Create `.env` file:
   ```bash
   # Copy the example file
   cp .env.example .env
   ```

6. Edit `.env` and fill in all the values:
   ```env
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ANTHROPIC_API_KEY=sk-ant-api03-xxxxx...
   STRIPE_SECRET_KEY=sk_test_51xxxxx...
   STRIPE_WEBHOOK_SECRET=whsec_xxxxx...
   STRIPE_STARTER_MONTHLY_PRICE_ID=price_xxxxx
   STRIPE_STARTER_YEARLY_PRICE_ID=price_xxxxx
   STRIPE_PRO_MONTHLY_PRICE_ID=price_xxxxx
   STRIPE_PRO_YEARLY_PRICE_ID=price_xxxxx
   STRIPE_BUSINESS_MONTHLY_PRICE_ID=price_xxxxx
   STRIPE_BUSINESS_YEARLY_PRICE_ID=price_xxxxx
   FRONTEND_URL=http://localhost:3000
   PORT=5000
   FLASK_ENV=development
   ```

7. Run the backend:
   ```bash
   python app.py
   ```

   The backend should start on http://localhost:5000

## Step 5: Frontend Setup (Local Development)

1. Navigate to the `frontend/` directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file:
   ```bash
   # Copy the example file
   cp .env.example .env
   ```

4. Edit `.env` and fill in all the values:
   ```env
   REACT_APP_API_URL=http://localhost:5000/api
   REACT_APP_SUPABASE_URL=https://xxxxx.supabase.co
   REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   REACT_APP_STRIPE_PUBLISHABLE_KEY=pk_test_51xxxxx...
   ```

5. Run the frontend:
   ```bash
   npm start
   ```

   The frontend should start on http://localhost:3000

## Step 6: Railway Deployment (Backend)

1. Go to https://railway.app and sign up with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository
4. Railway will detect Python and start building
5. Go to **Variables** tab and add all environment variables from your `.env` file
6. Update `FRONTEND_URL` to your frontend URL (e.g., `https://your-app.vercel.app`)
7. Railway will automatically deploy
8. Copy your Railway URL (e.g., `https://your-app.railway.app`)
9. Update Stripe webhook URL with your Railway URL

## Step 7: Vercel Deployment (Frontend)

1. Go to https://vercel.com and sign up with GitHub
2. Click **New Project** → **Import Git Repository**
3. Select your repository
4. Set **Root Directory** to `frontend`
5. Framework Preset: **Create React App**
6. Add environment variables:
   - `REACT_APP_API_URL` → Your Railway backend URL + `/api`
   - `REACT_APP_SUPABASE_URL` → Your Supabase URL
   - `REACT_APP_SUPABASE_ANON_KEY` → Your Supabase anon key
   - `REACT_APP_STRIPE_PUBLISHABLE_KEY` → Your Stripe publishable key
7. Click **Deploy**
8. Copy your Vercel URL
9. Update Railway `FRONTEND_URL` environment variable with your Vercel URL

## Step 8: Final Configuration

1. Update Stripe webhook endpoint URL in Stripe Dashboard:
   - Go to **Developers → Webhooks**
   - Edit your webhook
   - Update URL to: `https://your-backend.railway.app/api/payments/webhook`
   - Save

2. Test the application:
   - Sign up a new account
   - Verify email (check Supabase dashboard → Authentication → Users)
   - Login
   - Process a test video
   - Try subscribing to a plan (use Stripe test card: `4242 4242 4242 4242`)

## Troubleshooting

### Backend Issues

- **Import errors**: Make sure all dependencies are installed (`pip install -r requirements.txt`)
- **Supabase connection errors**: Check your `SUPABASE_URL` and `SUPABASE_KEY`
- **Stripe webhook errors**: Verify webhook secret matches in both Stripe and Railway

### Frontend Issues

- **API connection errors**: Check `REACT_APP_API_URL` matches your backend URL
- **Supabase auth errors**: Verify `REACT_APP_SUPABASE_URL` and `REACT_APP_SUPABASE_ANON_KEY`
- **Stripe checkout errors**: Check `REACT_APP_STRIPE_PUBLISHABLE_KEY`

### Video Processing Issues

- **Whisper model download**: First run will download the model (~150MB), be patient
- **Video download errors**: Make sure video URL is public and accessible
- **Transcription errors**: Check video has audio track

## Next Steps

1. Test all features thoroughly
2. Set up monitoring (Railway provides logs)
3. Configure custom domain (optional)
4. Switch Stripe to live mode when ready
5. Set up email notifications (Supabase has built-in email)

## Support

For issues or questions:
- Check the README.md for API documentation
- Review the PRD for feature requirements
- Check Supabase, Stripe, and Railway documentation

