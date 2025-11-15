from flask import Blueprint, request, jsonify
from middleware.auth_middleware import verify_token
from services.supabase_client import get_supabase_client
from services.stripe_client import get_stripe_client
import stripe
import os
from datetime import datetime

bp = Blueprint('payments', __name__)

# Price ID mapping
TIER_MAPPING = {
    'starter_monthly': {'tier': 'starter', 'limit': 300},
    'starter_yearly': {'tier': 'starter', 'limit': 300},
    'pro_monthly': {'tier': 'pro', 'limit': 1000},
    'pro_yearly': {'tier': 'pro', 'limit': 1000},
    'business_monthly': {'tier': 'business', 'limit': 3500},
    'business_yearly': {'tier': 'business', 'limit': 3500},
}

def get_price_id(plan_key):
    """Get Stripe price ID from plan key"""
    env_key = f'STRIPE_{plan_key.upper()}_PRICE_ID'
    return os.getenv(env_key)

@bp.route('/create-checkout-session', methods=['POST'])
@verify_token
def create_checkout_session():
    """Create Stripe checkout session"""
    try:
        data = request.get_json()
        price_id_key = data.get('price_id')  # e.g., 'starter_monthly'
        
        if not price_id_key:
            return jsonify({'success': False, 'error': 'Price ID is required'}), 400
        
        price_id = get_price_id(price_id_key)
        if not price_id:
            return jsonify({'success': False, 'error': 'Invalid plan'}), 400
        
        supabase = get_supabase_client()
        user_id = request.user_id
        
        # Get or create Stripe customer
        user_response = supabase.table('users').select('email, stripe_customer_id').eq('id', user_id).execute()
        if not user_response.data:
            return jsonify({'success': False, 'error': 'User not found'}), 404
        
        user = user_response.data[0]
        email = user['email']
        stripe_customer_id = user.get('stripe_customer_id')
        
        # Create customer if doesn't exist
        if not stripe_customer_id:
            customer = stripe.Customer.create(
                email=email,
                metadata={'supabase_user_id': user_id}
            )
            stripe_customer_id = customer.id
            
            # Update user
            supabase.table('users').update({
                'stripe_customer_id': stripe_customer_id
            }).eq('id', user_id).execute()
        
        # Create checkout session
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        checkout_session = stripe.checkout.Session.create(
            customer=stripe_customer_id,
            payment_method_types=['card'],
            line_items=[{
                'price': price_id,
                'quantity': 1,
            }],
            mode='subscription',
            success_url=f'{frontend_url}/dashboard?session_id={{CHECKOUT_SESSION_ID}}',
            cancel_url=f'{frontend_url}/pricing',
            metadata={
                'supabase_user_id': user_id
            }
        )
        
        return jsonify({
            'checkout_url': checkout_session.url
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/webhook', methods=['POST'])
def webhook():
    """Handle Stripe webhooks"""
    try:
        payload = request.get_data(as_text=True)
        sig_header = request.headers.get('Stripe-Signature')
        webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
        
        if not webhook_secret:
            return jsonify({'error': 'Webhook secret not configured'}), 500
        
        # Verify webhook signature
        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
        except ValueError:
            return jsonify({'error': 'Invalid payload'}), 400
        except stripe.error.SignatureVerificationError:
            return jsonify({'error': 'Invalid signature'}), 400
        
        # Handle event
        if event['type'] == 'checkout.session.completed':
            handle_checkout_completed(event['data']['object'])
        elif event['type'] == 'customer.subscription.created':
            handle_subscription_created(event['data']['object'])
        elif event['type'] == 'customer.subscription.updated':
            handle_subscription_updated(event['data']['object'])
        elif event['type'] == 'customer.subscription.deleted':
            handle_subscription_deleted(event['data']['object'])
        elif event['type'] == 'invoice.payment_failed':
            handle_payment_failed(event['data']['object'])
        
        return jsonify({'received': True}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def handle_checkout_completed(session):
    """Handle checkout.session.completed event"""
    try:
        supabase = get_supabase_client()
        customer_id = session['customer']
        subscription_id = session.get('subscription')
        user_id = session['metadata'].get('supabase_user_id')
        
        if not user_id:
            return
        
        # Get subscription details
        subscription = stripe.Subscription.retrieve(subscription_id)
        price_id = subscription['items']['data'][0]['price']['id']
        
        # Determine tier from price ID
        tier_info = None
        for key, info in TIER_MAPPING.items():
            if get_price_id(key) == price_id:
                tier_info = info
                break
        
        if not tier_info:
            return
        
        # Update user
        supabase.table('users').update({
            'subscription_tier': tier_info['tier'],
            'subscription_status': 'active',
            'monthly_minute_limit': tier_info['limit'],
            'stripe_customer_id': customer_id
        }).eq('id', user_id).execute()
        
        # Create subscription record
        supabase.table('subscriptions').insert({
            'user_id': user_id,
            'stripe_subscription_id': subscription_id,
            'stripe_price_id': price_id,
            'status': 'active',
            'current_period_start': datetime.fromtimestamp(subscription['current_period_start']).isoformat(),
            'current_period_end': datetime.fromtimestamp(subscription['current_period_end']).isoformat()
        }).execute()
        
    except Exception as e:
        print(f"Error handling checkout completed: {e}")

def handle_subscription_created(subscription):
    """Handle customer.subscription.created event"""
    # Similar to checkout completed
    pass

def handle_subscription_updated(subscription):
    """Handle customer.subscription.updated event"""
    try:
        supabase = get_supabase_client()
        subscription_id = subscription['id']
        status = subscription['status']
        
        # Find subscription in database
        sub_response = supabase.table('subscriptions').select('user_id').eq('stripe_subscription_id', subscription_id).execute()
        if not sub_response.data:
            return
        
        user_id = sub_response.data[0]['user_id']
        
        # Update subscription status
        supabase.table('subscriptions').update({
            'status': status,
            'current_period_start': datetime.fromtimestamp(subscription['current_period_start']).isoformat(),
            'current_period_end': datetime.fromtimestamp(subscription['current_period_end']).isoformat(),
            'cancel_at_period_end': subscription.get('cancel_at_period_end', False)
        }).eq('stripe_subscription_id', subscription_id).execute()
        
        # If canceled, downgrade user
        if status == 'canceled' or subscription.get('cancel_at_period_end'):
            supabase.table('users').update({
                'subscription_tier': 'free',
                'subscription_status': 'canceled',
                'monthly_minute_limit': 60
            }).eq('id', user_id).execute()
        
    except Exception as e:
        print(f"Error handling subscription updated: {e}")

def handle_subscription_deleted(subscription):
    """Handle customer.subscription.deleted event"""
    try:
        supabase = get_supabase_client()
        subscription_id = subscription['id']
        customer_id = subscription['customer']
        
        # Find user
        user_response = supabase.table('users').select('id').eq('stripe_customer_id', customer_id).execute()
        if not user_response.data:
            return
        
        user_id = user_response.data[0]['id']
        
        # Downgrade to free
        supabase.table('users').update({
            'subscription_tier': 'free',
            'subscription_status': 'canceled',
            'monthly_minute_limit': 60
        }).eq('id', user_id).execute()
        
        # Update subscription record
        supabase.table('subscriptions').update({
            'status': 'canceled',
            'canceled_at': datetime.utcnow().isoformat()
        }).eq('stripe_subscription_id', subscription_id).execute()
        
    except Exception as e:
        print(f"Error handling subscription deleted: {e}")

def handle_payment_failed(invoice):
    """Handle invoice.payment_failed event"""
    try:
        supabase = get_supabase_client()
        customer_id = invoice['customer']
        
        # Find user
        user_response = supabase.table('users').select('id').eq('stripe_customer_id', customer_id).execute()
        if not user_response.data:
            return
        
        user_id = user_response.data[0]['id']
        
        # Update status
        supabase.table('users').update({
            'subscription_status': 'past_due'
        }).eq('id', user_id).execute()
        
    except Exception as e:
        print(f"Error handling payment failed: {e}")

@bp.route('/create-portal-session', methods=['POST'])
@verify_token
def create_portal_session():
    """Create Stripe Customer Portal session"""
    try:
        supabase = get_supabase_client()
        user_id = request.user_id
        
        # Get user's Stripe customer ID
        user_response = supabase.table('users').select('stripe_customer_id').eq('id', user_id).execute()
        if not user_response.data or not user_response.data[0].get('stripe_customer_id'):
            return jsonify({'success': False, 'error': 'No subscription found'}), 404
        
        customer_id = user_response.data[0]['stripe_customer_id']
        frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:3000')
        
        # Create portal session
        portal_session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=f'{frontend_url}/profile'
        )
        
        return jsonify({
            'portal_url': portal_session.url
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/cancel-subscription', methods=['POST'])
@verify_token
def cancel_subscription():
    """Cancel subscription"""
    try:
        supabase = get_supabase_client()
        user_id = request.user_id
        
        # Get subscription
        sub_response = supabase.table('subscriptions').select('stripe_subscription_id').eq('user_id', user_id).eq('status', 'active').execute()
        if not sub_response.data:
            return jsonify({'success': False, 'error': 'No active subscription found'}), 404
        
        subscription_id = sub_response.data[0]['stripe_subscription_id']
        
        # Cancel at period end
        subscription = stripe.Subscription.modify(
            subscription_id,
            cancel_at_period_end=True
        )
        
        # Update database
        supabase.table('subscriptions').update({
            'cancel_at_period_end': True
        }).eq('stripe_subscription_id', subscription_id).execute()
        
        cancel_at = datetime.fromtimestamp(subscription['current_period_end']).isoformat()
        
        return jsonify({
            'success': True,
            'message': 'Subscription will cancel at period end',
            'cancel_at': cancel_at
        }), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/billing-history', methods=['GET'])
@verify_token
def get_billing_history():
    """Get billing history"""
    try:
        supabase = get_supabase_client()
        user_id = request.user_id
        
        # Get user's Stripe customer ID
        user_response = supabase.table('users').select('stripe_customer_id').eq('id', user_id).execute()
        if not user_response.data or not user_response.data[0].get('stripe_customer_id'):
            return jsonify({'invoices': []}), 200
        
        customer_id = user_response.data[0]['stripe_customer_id']
        
        # Get invoices from Stripe
        invoices = stripe.Invoice.list(
            customer=customer_id,
            limit=10
        )
        
        invoice_list = []
        for invoice in invoices.data:
            invoice_list.append({
                'id': invoice.id,
                'date': datetime.fromtimestamp(invoice.created).isoformat(),
                'amount': invoice.amount_paid,
                'currency': invoice.currency,
                'status': invoice.status,
                'invoice_pdf': invoice.invoice_pdf
            })
        
        return jsonify({'invoices': invoice_list}), 200
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

