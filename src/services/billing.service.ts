import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_mock_stripe_key';
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20' as any
});

export interface AgencyTierConfig {
  tierName: 'starter' | 'growth' | 'scale' | 'enterprise';
  basePriceUsd: number;
  includedClients: number;
  overagePerClientUsd: number;
  monthlyEventAllowance: number; // e.g. 500k events
  overagePer10kEventsUsd: number;
}

export const AGENCY_TIERS: Record<string, AgencyTierConfig> = {
  starter: {
    tierName: 'starter',
    basePriceUsd: 299,
    includedClients: 5,
    overagePerClientUsd: 50,
    monthlyEventAllowance: 250_000,
    overagePer10kEventsUsd: 2.50
  },
  growth: {
    tierName: 'growth',
    basePriceUsd: 599,
    includedClients: 15,
    overagePerClientUsd: 40,
    monthlyEventAllowance: 1_000_000,
    overagePer10kEventsUsd: 2.00
  },
  scale: {
    tierName: 'scale',
    basePriceUsd: 999,
    includedClients: 35,
    overagePerClientUsd: 30,
    monthlyEventAllowance: 3_000_000,
    overagePer10kEventsUsd: 1.50
  }
};

export class BillingService {
  /**
   * Creates a Stripe Checkout session for an agency onboarding to a subscription tier
   */
  static async createCheckoutSession(
    organizationId: string,
    agencyName: string,
    agencyEmail: string,
    tier: 'starter' | 'growth' | 'scale',
    successUrl: string,
    cancelUrl: string
  ): Promise<{ sessionId: string; url: string | null }> {
    const tierConfig = AGENCY_TIERS[tier];
    if (!tierConfig) throw new Error(`Invalid tier: ${tier}`);

    // Look up or create Stripe Customer
    const customer = await stripe.customers.create({
      email: agencyEmail,
      name: agencyName,
      metadata: { organizationId, tier }
    });

    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Pulse Retention Engine - ${tier.toUpperCase()} Agency Plan`,
              description: `Includes up to ${tierConfig.includedClients} connected client stores and ${tierConfig.monthlyEventAllowance.toLocaleString()} monthly events.`
            },
            unit_amount: tierConfig.basePriceUsd * 100,
            recurring: { interval: 'month' }
          },
          quantity: 1
        }
      ],
      metadata: { organizationId, tier },
      success_url: successUrl,
      cancel_url: cancelUrl
    });

    return { sessionId: session.id, url: session.url };
  }

  /**
   * Generates a Stripe Customer Billing Portal session for managing payment methods & invoices
   */
  static async createCustomerPortalSession(
    stripeCustomerId: string,
    returnUrl: string
  ): Promise<{ url: string }> {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl
    });

    return { url: portalSession.url };
  }

  /**
   * Handles incoming Stripe Webhooks for subscription state transitions & automated tier adjustments
   */
  static async handleWebhookEvent(event: Stripe.Event): Promise<{ handled: boolean; action?: string }> {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orgId = session.metadata?.organizationId;
        const tier = session.metadata?.tier;
        console.log(`[Stripe Webhook] Subscription activated for Org: ${orgId}, Tier: ${tier}`);
        return { handled: true, action: 'subscription_created' };
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        console.log(`[Stripe Webhook] Subscription canceled: ${subscription.id}`);
        return { handled: true, action: 'subscription_canceled' };
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn(`[Stripe Webhook] Payment failed for invoice: ${invoice.id}`);
        return { handled: true, action: 'payment_failed' };
      }

      default:
        return { handled: false };
    }
  }
}
