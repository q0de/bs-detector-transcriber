import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentAPI } from '../services/api';
import { supabase } from '../services/supabase';
import PricingCard from '../components/PricingCard';
import './PricingPage.css';

function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const navigate = useNavigate();

  const plans = [
    {
      name: 'Free',
      monthlyPrice: 0,
      yearlyPrice: 0,
      minutes: 60,
      features: [
        'Video transcription',
        'AI Summarization only',
        '2-3 fact-checks/month',
        'No history saved',
        'Community support'
      ],
      popular: false,
      priceId: null
    },
    {
      name: 'Starter',
      monthlyPrice: 17,
      yearlyPrice: 170,
      minutes: 300,
      features: [
        'Everything in Free',
        '✨ FULL Fact-Checking',
        '✨ Creator Reputation Tracking',
        'History saved 30 days',
        'Export to PDF',
        'Email support (24hr response)'
      ],
      popular: true,
      priceId: 'starter_monthly',
      savings: 34
    },
    {
      name: 'Pro',
      monthlyPrice: 39,
      yearlyPrice: 390,
      minutes: 1000,
      features: [
        'Everything in Starter',
        'History saved 90 days',
        'Export to PDF/Word/DOCX',
        'Custom analysis prompts (5 saved)',
        'API access (100 calls/month)',
        'Priority support (12hr response)'
      ],
      popular: false,
      priceId: 'pro_monthly',
      savings: 78
    },
    {
      name: 'Business',
      monthlyPrice: 99,
      yearlyPrice: 990,
      minutes: 3500,
      features: [
        'Everything in Pro',
        'History saved forever',
        'Team workspace (up to 10 users)',
        'Unlimited custom prompts',
        'API access (1000 calls/month)',
        'Bulk processing',
        'Priority support (4hr response)',
        'White-label option'
      ],
      popular: false,
      priceId: 'business_monthly',
      savings: 198
    }
  ];

  const handleSubscribe = async (plan) => {
    if (plan.name === 'Free') {
      navigate('/signup');
      return;
    }

    // Check if logged in
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/signup');
      return;
    }

    try {
      const priceId = billingPeriod === 'monthly' 
        ? `${plan.priceId}` 
        : `${plan.priceId.replace('_monthly', '_yearly')}`;
      
      const response = await paymentAPI.createCheckoutSession(priceId);
      window.location.href = response.data.checkout_url;
    } catch (err) {
      console.error('Failed to start checkout:', err);
    }
  };

  return (
    <div className="pricing-page">
      <div className="container">
        <div className="pricing-header">
          <h1>Pricing Plans</h1>
          <p>Choose the plan that fits your needs</p>
          
          <div className="billing-toggle">
            <button
              className={billingPeriod === 'monthly' ? 'active' : ''}
              onClick={() => setBillingPeriod('monthly')}
            >
              Monthly
            </button>
            <button
              className={billingPeriod === 'yearly' ? 'active' : ''}
              onClick={() => setBillingPeriod('yearly')}
            >
              Yearly (Save 17%)
            </button>
          </div>
        </div>

        <div className="pricing-explainer">
          <div className="explainer-card">
            <h3>💡 How Minutes Work</h3>
            <div className="minute-types">
              <div className="minute-type">
                <div className="minute-icon">📝</div>
                <div className="minute-details">
                  <strong>Summarize</strong>
                  <p>1 video minute = 1 credit minute</p>
                  <small>Quick AI-powered summaries</small>
                </div>
              </div>
              <div className="minute-type premium">
                <div className="minute-icon">🔍</div>
                <div className="minute-details">
                  <strong>Fact Check ⭐</strong>
                  <p>1 video minute = 2.5 credit minutes</p>
                  <small>Premium BS detection with sources, claims analysis, and creator reputation</small>
                </div>
              </div>
            </div>
            <div className="example-box">
              <strong>Example:</strong> 300 minutes = <strong>300 summaries</strong> OR <strong>120 fact-checks</strong> (or any combination)
            </div>
          </div>
        </div>

        <div className="pricing-grid">
          {plans.map((plan) => (
            <PricingCard
              key={plan.name}
              plan={plan}
              billingPeriod={billingPeriod}
              onSubscribe={() => handleSubscribe(plan)}
            />
          ))}
        </div>

        <div className="pricing-faq">
          <h2>Frequently Asked Questions</h2>
          <div className="faq-item">
            <h3>How does billing work?</h3>
            <p>You're billed monthly or yearly based on your plan. Minutes reset on the 1st of each month.</p>
          </div>
          <div className="faq-item">
            <h3>Can I change plans later?</h3>
            <p>Yes! You can upgrade or downgrade at any time. Changes take effect immediately.</p>
          </div>
          <div className="faq-item">
            <h3>What happens if I exceed my limit?</h3>
            <p>You'll need to upgrade your plan or purchase additional minutes. Processing will pause until you upgrade.</p>
          </div>
          <div className="faq-item">
            <h3>Why does fact-checking cost more minutes?</h3>
            <p>Fact-checking uses advanced AI to analyze every claim, find sources, check creator reputation, and provide detailed evidence. This requires significantly more computational power (3-5x) than simple summarization, so we use a 2.5× multiplier to reflect the real cost while keeping it affordable.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PricingPage;

