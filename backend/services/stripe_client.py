import stripe
import os

stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

def get_stripe_client():
    """Get Stripe client (already configured via api_key)"""
    return stripe

