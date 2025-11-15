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
        'Standard processing',
        'No history saved',
        'Community support'
      ],
      popular: false,
      priceId: null
    },
    {
      name: 'Starter',
      monthlyPrice: 12,
      yearlyPrice: 120,
      minutes: 300,
      features: [
        'Video transcription',
        'AI Summarization + Fact-checking',
        'Priority processing',
        'History saved 30 days',
        'Export to TXT/PDF',
        'Email support (24hr response)'
      ],
      popular: true,
      priceId: 'starter_monthly'
    },
    {
      name: 'Pro',
      monthlyPrice: 29,
      yearlyPrice: 290,
      minutes: 1000,
      features: [
        'All Starter features',
        'History saved 90 days',
        'Export to PDF/Word/DOCX',
        'Custom analysis prompts (5 saved)',
        'API access (100 calls/month)',
        'Priority support (12hr response)'
      ],
      popular: false,
      priceId: 'pro_monthly'
    },
    {
      name: 'Business',
      monthlyPrice: 79,
      yearlyPrice: 790,
      minutes: 3500,
      features: [
        'All Pro features',
        'History saved forever',
        'Team workspace (up to 10 users)',
        'Unlimited custom prompts',
        'API access (1000 calls/month)',
        'Bulk processing',
        'Priority support (4hr response)',
        'White-label option'
      ],
      popular: false,
      priceId: 'business_monthly'
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
      alert('Failed to start checkout. Please try again.');
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
        </div>
      </div>
    </div>
  );
}

export default PricingPage;

