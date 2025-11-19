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
- Render (Backend hosting)
- Vercel (Frontend hosting)
- Supabase (Database + Auth)

## 🔧 Infrastructure & Performance Notes

### PyTorch Configuration (CPU vs GPU)

This project currently uses **CPU-only PyTorch** (`torch==2.2.0+cpu`) for optimal deployment on Render's free/standard tiers.

#### Why CPU-Only?

**Current Setup:**
- ✅ **Fast deployments**: 2-3 minutes (vs 10-15 minutes with GPU libraries)
- ✅ **Minimal disk usage**: 200 MB (vs 2.5 GB with CUDA/cuDNN)
- ✅ **No performance loss**: Render free tier has no GPU anyway
- ✅ **Same transcription speed**: ~30-45 seconds for 10-minute videos

**GPU libraries being excluded:**
- `nvidia-cudnn-cu12` (~731 MB) - Deep learning primitives
- `nvidia-cublas-cu12` (~400 MB) - Linear algebra
- `nvidia-cuda-runtime-cu12` (~800 MB) - CUDA runtime
- **Total saved: ~2.3 GB of unused dependencies**

#### When to Switch to GPU Version

You should consider switching to GPU-enabled PyTorch when:

**Volume Triggers:**
- Processing 500+ videos per day
- CPU usage consistently at 90-100%
- Users complaining about wait times (>2 minutes per video)
- Queue backlog building up

**Business Triggers:**
- Revenue of $1000+/month (can afford GPU infrastructure)
- 50+ paying customers with high usage
- Need for real-time transcription features
- Batch processing requirements (50+ videos simultaneously)

**Infrastructure Triggers:**
- Migrating from Render to AWS/GCP/Azure with GPU instances
- Upgrading to dedicated GPU servers
- Adding live transcription features

#### How to Switch to GPU Version

When the time comes, here's how to enable GPU support:

**1. Update `backend/requirements.txt`:**

Remove these lines:
```txt
--extra-index-url https://download.pytorch.org/whl/cpu
torch==2.2.0+cpu
```

Replace with:
```txt
torch==2.2.0
```

**2. Deploy to GPU-enabled hosting:**
- AWS EC2 with GPU instances (p3.2xlarge: ~$400/month)
- Google Cloud with GPU VMs (n1-standard-4 + T4: ~$350/month)
- Azure with GPU compute (NC6: ~$400/month)

**3. Expected Performance Gains:**

| Metric | CPU | GPU | Improvement |
|--------|-----|-----|-------------|
| 10-min video transcription | 30-45s | 5-10s | **6x faster** |
| 60-min video transcription | 3-4 min | 30-45s | **5x faster** |
| Concurrent processing | 2-3 videos | 10-15 videos | **5x capacity** |

#### Cost Analysis

**Current Setup (CPU-only):**
```
Render Free Tier:    $0/month
OR Render Standard:  $25/month (2GB RAM, 1 CPU)
Supabase:            $0-25/month
Total:               $0-50/month
```

**GPU Setup (if needed):**
```
AWS p3.2xlarge:      $400/month (V100 GPU)
OR AWS g4dn.xlarge:  $250/month (T4 GPU - good budget option)
Supabase Pro:        $25/month
Total:               $275-425/month
```

**Break-even calculation:**
- GPU costs extra $250-375/month
- At $25/user/month, need 10-15 extra users to justify
- Or processing volume where CPU becomes bottleneck

#### Monitoring & Alerts

Set up alerts to know when GPU upgrade is needed:

```python
# Recommended thresholds:
- CPU usage > 85% for 15+ minutes → Warning
- Transcription time > 90 seconds for 10-min video → Warning  
- Queue depth > 10 videos → Warning
- Daily video volume > 300 → Consider GPU
```

#### Scaling Alternatives to GPU

Before jumping to expensive GPU instances, consider:

1. **Horizontal Scaling** (Often cheaper)
   - Run 3x CPU servers ($25 each = $75/month)
   - Still cheaper than 1x GPU server ($250-400/month)
   - Better for distributed load

2. **Optimize Code**
   - Use faster Whisper models (base/small vs medium/large)
   - Implement better queue management
   - Cache transcripts more aggressively

3. **Hybrid Approach**
   - CPU for videos < 10 minutes (most reels/short videos)
   - GPU for videos > 30 minutes (long-form content)
   - Route based on video length

### Current Infrastructure Costs

**Development/MVP Phase (Current):**
```
Render Free Tier:        $0/month
Vercel Free Tier:        $0/month  
Supabase Free Tier:      $0/month
IPRoyal Proxy:           $7-15/month
OpenAI API:              ~$5-20/month (usage-based)
Anthropic API:           ~$10-30/month (usage-based)
Domain:                  ~$1/month
─────────────────────────────────
TOTAL:                   ~$25-70/month
```

**Break-even: 5-10 customers at $7-15/month**

**Growth Phase (15-50 customers):**
```
Render Standard:         $25/month (2GB RAM)
Vercel Free:             $0/month (still fine)
Supabase Pro:            $25/month (backups + better limits)
Proxy + APIs:            ~$50-100/month (increased usage)
Domain:                  $1/month
─────────────────────────────────
TOTAL:                   ~$100-150/month
```

**Revenue at 30 customers @ $15/mo = $450/mo**
**Profit margin: ~$300-350/month**

**Scale Phase (50-200 customers):**
```
Render Pro:              $85/month (4GB RAM) OR multiple Standard instances
Vercel Pro:              $20/month (better analytics)
Supabase Pro:            $25/month
Proxy + APIs:            ~$200-400/month
CDN/Assets:              ~$10-20/month
─────────────────────────────────
TOTAL:                   ~$340-550/month
```

**Revenue at 100 customers @ $25/mo = $2,500/mo**
**Profit margin: ~$1,950-2,160/month** ✅ Healthy SaaS margins

### When to Upgrade Infrastructure

| Trigger | Action | Cost Impact |
|---------|--------|-------------|
| 15+ customers | Upgrade Render to Standard | +$25/mo |
| 30+ customers | Add Supabase Pro | +$25/mo |
| CPU at 90%+ consistently | Add second Render instance OR upgrade to Pro | +$25-60/mo |
| 50+ customers | Consider Vercel Pro for analytics | +$20/mo |
| 100+ customers | Multiple backend instances + load balancer | +$50-100/mo |
| 500+ videos/day | Evaluate GPU instance (probably not worth it yet) | +$250/mo |
| 1000+ videos/day | GPU instance becomes cost-effective | +$250-400/mo |

### Deployment Speed Optimization

**Current (with CPU-only PyTorch):**
- Code push → GitHub: ~5 seconds
- Render build: ~2-3 minutes
- Health checks: ~20 seconds
- **Total: ~3 minutes per deploy**

**If you had GPU PyTorch (not recommended):**
- Code push → GitHub: ~5 seconds
- Render build: ~10-15 minutes (downloading 2.3GB CUDA)
- Health checks: ~20 seconds  
- **Total: ~11-16 minutes per deploy** ❌

**Why fast deploys matter:**
- Fix bugs quickly
- Iterate on features faster
- Less downtime during updates
- Better developer experience

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

