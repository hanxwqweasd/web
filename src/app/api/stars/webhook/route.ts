import { NextRequest, NextResponse } from 'next/server';

/**
 * Telegram Stars payment webhook.
 *
 * Telegram sends two types of updates here:
 * 1. pre_checkout_query — validate before payment
 * 2. successful_payment — payment completed (via getUpdates or webhook)
 *
 * Note: For a production app, you'd want to verify the signature of
 * the Telegram update. This is a basic implementation without crypto checks.
 */

// In-memory cache of recently processed payment IDs to prevent duplicates
const processedPayments = new Set<string>();
const MAX_CACHE_SIZE = 1000;

function markProcessed(id: string) {
  processedPayments.add(id);
  // Evict oldest entries if cache grows too large
  if (processedPayments.size > MAX_CACHE_SIZE) {
    const iter = processedPayments.values();
    processedPayments.delete(iter.next().value);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle pre_checkout_query — Telegram asks us to validate the payment
    if (body.pre_checkout_query) {
      const { id, from, invoice_payload } = body.pre_checkout_query;

      // Validate payload format: "itemId:telegramUserId"
      if (!invoice_payload || !invoice_payload.includes(':')) {
        console.error('[Stars Webhook] Invalid pre_checkout_query payload:', invoice_payload);
        return NextResponse.json({ ok: true, method: 'answerPreCheckoutQuery' });
      }

      const [itemId] = invoice_payload.split(':');

      // Validate the item exists in our donation catalog
      const validItems = ['support', 'ally', 'patron', 'legend'];
      if (!validItems.includes(itemId)) {
        console.error('[Stars Webhook] Unknown item in pre_checkout_query:', itemId);
        // We still answer ok to avoid hanging the user, but log the issue
      }

      // In production, you'd call:
      // await fetch(`https://api.telegram.org/bot${TOKEN}/answerPreCheckoutQuery`, {
      //   method: 'POST',
      //   body: JSON.stringify({ pre_checkout_query_id: id, ok: true }),
      // });

      console.log(`[Stars Webhook] pre_checkout_query: user=${from?.id}, payload=${invoice_payload}`);

      // Return instructions for the caller to answer
      return NextResponse.json({
        type: 'pre_checkout_query',
        pre_checkout_query_id: id,
        ok: true,
        user_id: from?.id,
        payload: invoice_payload,
      });
    }

    // Handle successful_payment (comes via getUpdates or message update)
    // This can be nested in different structures depending on how updates are received
    let successfulPayment = body.successful_payment;

    // It could also be inside a message update
    if (!successfulPayment && body.message?.successful_payment) {
      successfulPayment = body.message.successful_payment;
    }

    if (successfulPayment) {
      const { telegram_payment_charge_id, invoice_payload, total_amount, currency } = successfulPayment;
      const userId = body.message?.from?.id ?? body.from?.id;

      // Deduplicate
      if (telegram_payment_charge_id && processedPayments.has(telegram_payment_charge_id)) {
        console.log(`[Stars Webhook] Duplicate payment ignored: ${telegram_payment_charge_id}`);
        return NextResponse.json({ type: 'duplicate', ok: true });
      }

      if (telegram_payment_charge_id) {
        markProcessed(telegram_payment_charge_id);
      }

      // Parse payload: "itemId:telegramUserId"
      let itemId: string | null = null;
      let tgUserId: string | null = null;

      if (invoice_payload && invoice_payload.includes(':')) {
        [itemId, tgUserId] = invoice_payload.split(':');
      }

      console.log(`[Stars Webhook] successful_payment: userId=${userId}, itemId=${itemId}, amount=${total_amount} ${currency}, chargeId=${telegram_payment_charge_id}`);

      // In a full implementation, here you would:
      // 1. Credit the user's account with the purchased resources
      // 2. Update the database
      // 3. Send a confirmation message to the user

      return NextResponse.json({
        type: 'successful_payment',
        ok: true,
        user_id: userId,
        item_id: itemId,
        telegram_user_id: tgUserId,
        amount: total_amount,
        currency,
        charge_id: telegram_payment_charge_id,
      });
    }

    // Unknown update type
    console.warn('[Stars Webhook] Unknown update type received');
    return NextResponse.json({ ok: true, type: 'unknown' });
  } catch (error) {
    console.error('[Stars Webhook] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}