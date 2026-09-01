import { createHmac, timingSafeEqual } from 'node:crypto';
import Stripe from 'stripe';
import { env } from '$env/dynamic/private';

let stripeClient: Stripe | null = null;

export function getStripe(): Stripe {
    const secretKey = env.STRIPE_SECRET_KEY?.trim();

    if (!secretKey) {
        throw new Error('STRIPE_SECRET_KEY is not configured.');
    }

    if (!stripeClient) {
        stripeClient = new Stripe(secretKey);
    }

    return stripeClient;
}

export function getStripeWebhookSecret(): string {
    const webhookSecret = env.STRIPE_WEBHOOK_SECRET?.trim();

    if (!webhookSecret) {
        throw new Error('STRIPE_WEBHOOK_SECRET is not configured.');
    }

    return webhookSecret;
}

function getPaymentLinkSecret(): string {
    const secret = env.STRIPE_PAYMENT_LINK_SECRET?.trim();

    if (!secret) {
        throw new Error('STRIPE_PAYMENT_LINK_SECRET is not configured.');
    }

    return secret;
}

export function createPaymentLinkToken(documentId: string): string {
    return createHmac('sha256', getPaymentLinkSecret())
        .update(documentId)
        .digest('hex');
}

export function verifyPaymentLinkToken(documentId: string, token: string): boolean {
    if (!documentId || !token) return false;

    const expected = createPaymentLinkToken(documentId);

    const expectedBuffer = Buffer.from(expected, 'utf8');
    const suppliedBuffer = Buffer.from(token, 'utf8');

    if (expectedBuffer.length !== suppliedBuffer.length) {
        return false;
    }

    return timingSafeEqual(expectedBuffer, suppliedBuffer);
}
