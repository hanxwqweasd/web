import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Telegram Stars payment webhook.
 * Processes successful_payment events and grants items to players.
 */

const processedPayments = new Set<string>();
const MAX_CACHE_SIZE = 1000;

function markProcessed(id: string) {
  processedPayments.add(id);
  if (processedPayments.size > MAX_CACHE_SIZE) {
    const iter = processedPayments.values();
    processedPayments.delete(iter.next().value);
  }
}

// Donation items and their rewards
const DONATION_REWARDS: Record<string, { minerals: number; energy: number; bioMatter: number; crystals: number; starShards: number; description: string }> = {
  support: {
    minerals: 500,
    energy: 500,
    bioMatter: 200,
    crystals: 0,
    starShards: 10,
    description: '500 минералов, 500 энергии, 200 биоматерии, 10 осколков',
  },
  ally: {
    minerals: 5000,
    energy: 3000,
    bioMatter: 1000,
    crystals: 0,
    starShards: 100,
    description: '5000 минералов, 3000 энергии, 1000 биоматерии, 100 осколков',
  },
  patron: {
    minerals: 5000,
    energy: 5000,
    bioMatter: 2000,
    crystals: 100,
    starShards: 500,
    description: '5000 энергии, 5000 минералов, 100 кристаллов, 500 осколков',
  },
  legend: {
    minerals: 10000,
    energy: 10000,
    bioMatter: 5000,
    crystals: 500,
    starShards: 2000,
    description: 'Все ресурсы по 10000, 500 кристаллов, 2000 осколков',
  },
};

const BOT_TOKEN = '8945065009:AAHqr6U-n11Mo48rKiL_Ib9DtAxJktQ4-B0';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Handle pre_checkout_query
    if (body.pre_checkout_query) {
      const { id, from, invoice_payload } = body.pre_checkout_query;

      if (!invoice_payload || !invoice_payload.includes(':')) {
        console.error('[Stars Webhook] Invalid pre_checkout_query payload:', invoice_payload);
      }

      // Answer OK to Telegram
      if (id) {
        fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerPreCheckoutQuery`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pre_checkout_query_id: id, ok: true }),
        }).catch(() => {});
      }

      console.log(`[Stars Webhook] pre_checkout_query: user=${from?.id}, payload=${invoice_payload}`);
      return NextResponse.json({ type: 'pre_checkout_query', ok: true });
    }

    // Handle successful_payment
    let successfulPayment = body.successful_payment;
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
      let tgUserId: number | null = null;

      if (invoice_payload && invoice_payload.includes(':')) {
        const parts = invoice_payload.split(':');
        itemId = parts[0];
        tgUserId = parseInt(parts[1], 10);
      }

      console.log(`[Stars Webhook] successful_payment: userId=${userId}, itemId=${itemId}, tgUserId=${tgUserId}, amount=${total_amount} ${currency}`);

      // Grant rewards to the player in the database
      if (tgUserId && itemId) {
        const rewards = DONATION_REWARDS[itemId];
        if (rewards) {
          try {
            const player = await db.player.findUnique({ where: { telegramUserId: tgUserId } });
            if (player) {
              await db.player.update({
                where: { telegramUserId: tgUserId },
                data: {
                  energy: { increment: rewards.energy },
                  minerals: { increment: rewards.minerals },
                  bioMatter: { increment: rewards.bioMatter },
                  crystals: { increment: rewards.crystals },
                  starShards: { increment: rewards.starShards },
                },
              });
              console.log(`[Stars Webhook] Granted to user ${tgUserId}: ${rewards.description}`);
            } else {
              console.warn(`[Stars Webhook] Player not found: ${tgUserId}`);
            }
          } catch (dbError) {
            console.error('[Stars Webhook] DB update error:', dbError);
          }
        }
      }

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

    console.warn('[Stars Webhook] Unknown update type received');
    return NextResponse.json({ ok: true, type: 'unknown' });
  } catch (error) {
    console.error('[Stars Webhook] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}