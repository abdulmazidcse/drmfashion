import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { executeBkashPayment, queryBkashPayment, type BkashExecutePaymentResult } from "@/lib/bkash"
import { resolveOrderShipping } from "@/lib/shippingServer"
import {
  createOrderFromCheckout,
  findOrCreateCheckoutUser,
  runPostOrderSideEffects,
  type CheckoutBody,
} from "@/lib/orderCreation"
import { requestSiteUrl } from "@/lib/siteUrl"
import { baseCurrencyCode } from "@/lib/settings"

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

// bKash's own `status` query param is only a UX hint — the real answer comes
// from calling Execute Payment (falling back to Query Payment per bKash's
// documented pattern) ourselves, never from trusting a redirect parameter.
async function confirmBkashPayment(paymentID: string): Promise<BkashExecutePaymentResult | null> {
  try {
    const executed = await executeBkashPayment(paymentID)
    if (executed.transactionStatus === "Completed") return executed
  } catch (e) {
    console.error("[BKASH_EXECUTE_ERROR]", e)
  }

  try {
    return await queryBkashPayment(paymentID)
  } catch (e) {
    console.error("[BKASH_QUERY_ERROR]", e)
    return null
  }
}

/**
 * This is the callbackURL handed to bKash's Create Payment API — the
 * customer's browser lands here after approving, cancelling, or failing
 * payment in bKash's hosted checkout. The order is created here, and only
 * here, once payment is independently confirmed — see lib/orderCreation.ts
 * for why this can't happen synchronously the way card/COD orders do.
 */
export async function GET(req: NextRequest) {
  const siteUrl = await requestSiteUrl()
  const redirect = (qs: string) => NextResponse.redirect(`${siteUrl}/checkout?${qs}`)

  const paymentID = req.nextUrl.searchParams.get("paymentID")
  if (!paymentID) return redirect("bkash=failed")

  const pending = await prisma.pendingCheckout.findUnique({ where: { paymentID } })
  if (!pending || pending.status !== "PENDING" || pending.expiresAt < new Date()) {
    return redirect("bkash=failed")
  }

  const confirmed = await confirmBkashPayment(paymentID)

  if (!confirmed || confirmed.transactionStatus !== "Completed") {
    await prisma.pendingCheckout.update({
      where: { id: pending.id },
      data: { status: "FAILED", failureReason: confirmed?.statusMessage || "Payment not completed" },
    })
    return redirect("bkash=failed")
  }

  // Tamper/consistency guard — the amount bKash confirms must match what we
  // quoted at Create Payment time, the same principle as the Stripe amount
  // check in lib/orderCreation.ts.
  const confirmedAmount = Number(confirmed.amount)
  if (Number.isFinite(confirmedAmount) && Math.abs(confirmedAmount - pending.amount) > 0.01) {
    console.error("[BKASH_ORPHANED_PAYMENT] amount mismatch", {
      paymentID,
      trxID: confirmed.trxID,
      expected: pending.amount,
      confirmed: confirmedAmount,
    })
    await prisma.pendingCheckout.update({
      where: { id: pending.id },
      data: {
        status: "FAILED",
        failureReason: `Amount mismatch: expected ${pending.amount}, bKash confirmed ${confirmedAmount}`,
      },
    })
    return redirect("bkash=payment_captured_error")
  }

  const checkoutBody = pending.payload as unknown as CheckoutBody

  const settings = await prisma.setting.findMany()
  const settingsObj = settings.reduce((acc: Record<string, string>, setting) => {
    acc[setting.key] = setting.value
    return acc
  }, {})
  const earnRate = Number(settingsObj["reward_point_earn_rate"]) || 10

  // findOrCreateCheckoutUser is idempotent — this finds the account created
  // during Create Payment rather than making a second one.
  const { user } = await findOrCreateCheckoutUser({
    email: checkoutBody.email,
    fullName: checkoutBody.fullName,
    phone: checkoutBody.phone,
  })

  const resolvedShipping = await resolveOrderShipping({
    settings: settingsObj,
    shippingMethodId: checkoutBody.shippingMethodId,
    destination: checkoutBody.shippingDestination,
    items: checkoutBody.items,
  })

  let order
  try {
    const result = await prisma.$transaction(async (tx) => {
      return createOrderFromCheckout(tx, {
        body: checkoutBody,
        user,
        settingsObj,
        earnRate,
        resolvedShipping,
        verifiedPayment: { method: "bkash", transactionId: confirmed.trxID || paymentID },
      })
    })
    order = result.order
  } catch (err) {
    // Money is already captured by bKash but the order couldn't be created
    // (stock sold out while the customer was on bKash's site, a coupon
    // expired in the meantime, etc.) — this must never be silently lost.
    console.error("[BKASH_ORPHANED_PAYMENT] order creation failed after payment", {
      paymentID,
      trxID: confirmed.trxID,
      amount: confirmedAmount,
      error: errorMessage(err),
    })
    await prisma.pendingCheckout.update({
      where: { id: pending.id },
      data: {
        status: "FAILED",
        failureReason: `Order creation failed after payment: ${errorMessage(err)}`.slice(0, 500),
      },
    })
    return redirect("bkash=payment_captured_error")
  }

  if (!order) {
    // Unreachable — verifiedPayment is always set above, so dryRun's early
    // return never triggers here. Satisfies TypeScript.
    return redirect("bkash=failed")
  }

  await prisma.pendingCheckout.update({
    where: { id: pending.id },
    data: { status: "COMPLETED", orderId: order.id },
  })

  await runPostOrderSideEffects({
    order,
    body: checkoutBody,
    generatedPassword: pending.generatedPassword,
  })

  const params = new URLSearchParams({
    bkash: "success",
    orderId: order.id,
    value: String(order.totalAmount),
    currency: baseCurrencyCode(settingsObj),
    shipping: String(order.shippingFee),
    // The customer's browser lands here on a fresh page load — none of the
    // checkout form's in-memory state survives the redirect to bKash and
    // back — so the confirmation panel needs these passed through explicitly.
    name: checkoutBody.fullName || "",
    email: checkoutBody.email || "",
  })
  return redirect(params.toString())
}
