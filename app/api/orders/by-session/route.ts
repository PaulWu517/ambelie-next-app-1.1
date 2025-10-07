import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';

// GET /api/orders/by-session?session_id=...&email=...
// Server-side route: uses Stripe Secret to look up Checkout Session and map to order details.
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id');
    const email = url.searchParams.get('email');

    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'Missing session_id' }, { status: 400 });
    }

    // Avoid exposing Stripe Secret in client; use server-side env only.
    const secret = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET;
    if (!secret) {
      return NextResponse.json({ success: false, error: 'Stripe secret not configured' }, { status: 501 });
    }

    // Dynamically import stripe to avoid build issues if dependency is missing in some environments.
    let StripeCtor: any;
    try {
      const mod = await import('stripe');
      StripeCtor = mod.default;
    } catch (e) {
      return NextResponse.json({ success: false, error: 'Stripe SDK not installed' }, { status: 501 });
    }

    const stripe = new StripeCtor(secret, { apiVersion: '2023-10-16' });

    // Retrieve the session and expand line items.
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items', 'customer_details']
    });

    const customerEmail = session?.customer_details?.email || session?.customer_email || null;

    // Security: if email provided, enforce match with session customer email.
    if (email && customerEmail && email.toLowerCase() !== customerEmail.toLowerCase()) {
      return NextResponse.json({ success: false, error: 'Email mismatch' }, { status: 403 });
    }

    // Map Stripe session to order-like details used by frontend.
    const lineItems = (session?.line_items?.data || []).map((item: any) => {
      const qty = item.quantity || 1;
      const unitAmount = typeof item.amount_subtotal === 'number' ? item.amount_subtotal / 100 / qty : (item.price?.unit_amount || 0) / 100;
      return {
        name: item.description || item.price?.nickname || 'Item',
        price: unitAmount,
        quantity: qty,
        currency: (item.currency || session.currency || 'GBP').toUpperCase(),
      };
    });

    const orderDetails = {
      id: session.client_reference_id || session.id,
      orderNumber: session.metadata?.order_number || session.id,
      totalAmount: (session.amount_total || 0) / 100,
      currency: (session.currency || 'GBP').toUpperCase(),
      customerEmail: customerEmail || email || 'Unknown',
      customerName: session?.customer_details?.name || 'Customer',
      orderDate: new Date((session.created || Math.floor(Date.now() / 1000)) * 1000).toISOString(),
      status: session.payment_status === 'paid' ? 'paid' : session.status || 'pending',
      items: lineItems,
    };

    return NextResponse.json({ success: true, data: orderDetails }, { status: 200 });
  } catch (err: any) {
    // Sanitize Stripe error messages.
    const message = err?.message ? String(err.message) : 'Internal Server Error';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}