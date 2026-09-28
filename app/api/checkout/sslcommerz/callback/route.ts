import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import type { Order } from "@prisma/client"
import { validateSslcommerzTransaction } from "@/lib/sslcommerz"
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

type ConfirmOutcome =
  | { status: "failed" }
  | { status: "captured_error" }
  | { status: "success"; order: Order; checkoutBody: CheckoutBody; currency: string }

/**
 * Validates a transaction and creates the order — shared by both the
 * success_url redirect (the customer's browser) and the ipn_url callback
 * (server-to-server), since SSLCommerz fires both independently and whichever
 * arrives first must win. The atomic PENDING → PROCESSING claim below is what
 * stops the loser from creating a second order for the same payment. See
 * app/api/checkout/bkash/callback/route.ts for the sibling implementation —
 * that one gets away without this claim step because bKash only ever calls
 * back once, via the browser redirect alone.
 */
async function confirmAndCreateOrder(tranId: string, valId: string): Promise<ConfirmOutcome | null> {
  const pending = await prisma.pendingCheckout.findUnique({ where: { merchantInvoiceNumber: tranId } })
  if (!pending) return null

  if (pending.status === "COMPLETED") {
    if (!pending.orderId) return null
    const order = await prisma.order.findUnique({ where: { id: pending.orderId } })
    if (!order) return null
    const settings = await prisma.setting.findMany()
    const settingsObj = settings.reduce((acc: Record<string, string>, s) => ((acc[s.key] = s.value), acc), {} as Record<string, string>)
    return { status: "success", order, checkoutBody: pending.payload as unknown as CheckoutBody, currency: baseCurrencyCode(settingsObj) }
  }

  if (pending.status === "FAILED") return { status: "failed" }

  if (pending.expiresAt < new Date()) {
    await prisma.pendingCheckout.update({
      where: { id: pending.id },
      data: { status: "FAILED", failureReason: "Expired before payment was confirmed" },
    })
    return { status: "failed" }
  }

  // Atomic claim — only the caller that flips PENDING → PROCESSING proceeds
  // to validate/create the order; the other backs off.
  const claim = await prisma.pendingCheckout.updateMany({
    where: { id: pending.id, status: "PENDING" },
    data: { status: "PROCESSING" },
  })
  if (claim.count === 0) {
    const latest = await prisma.pendingCheckout.findUnique({ where: { id: pending.id } })
    if (latest?.status === "COMPLETED" && latest.orderId) {
      const order = await prisma.order.findUnique({ where: { id: latest.orderId } })
      if (order) {
        const settings = await prisma.setting.findMany()
        const settingsObj = settings.reduce((acc: Record<string, string>, s) => ((acc[s.key] = s.value), acc), {} as Record<string, string>)
        return { status: "success", order, checkoutBody: latest.payload as unknown as CheckoutBody, currency: baseCurrencyCode(settingsObj) }
      }
    }
    if (latest?.status === "FAILED") return { status: "failed" }
    // Still being processed by the other caller — nothing more to do here.
    return null
  }

  // SSLCommerz's own POSTed status/amount fields are only a UX hint — the
  // real answer comes from the Validation API, the same principle as the
  // bKash callback never trusting its redirect query params.
  const validation = await validateSslcommerzTransaction(valId).catch((e) => {
    console.error("[SSLCOMMERZ_VALIDATE_ERROR]", e)
    return null
  })

  if (!validation || !["VALID", "VALIDATED"].includes(validation.status) || validation.tranId !== tranId) {
    await prisma.pendingCheckout.update({
      where: { id: pending.id },
      data: { status: "FAILED", failureReason: `Validation failed: ${validation?.status || "no response"}` },
    })
    return { status: "failed" }
  }

  // Tamper/consistency guard — the amount SSLCommerz confirms must match what
  // we quoted at Session creation time, the same principle as the bKash and
  // Stripe amount checks.
  if (Math.abs(validation.amount - pending.amount) > 0.01) {
    console.error("[SSLCOMMERZ_ORPHANED_PAYMENT] amount mismatch", {
      tranId,
      valId,
      expected: pending.amount,
      confirmed: validation.amount,
    })
    await prisma.pendingCheckout.update({
      where: { id: pending.id },
      data: {
        status: "FAILED",
        failureReason: `Amount mismatch: expected ${pending.amount}, SSLCommerz confirmed ${validation.amount}`,
      },
    })
    return { status: "captured_error" }
  }

  const checkoutBody = pending.payload as unknown as CheckoutBody

  const settings = await prisma.setting.findMany()
  const settingsObj = settings.reduce((acc: Record<string, string>, s) => ((acc[s.key] = s.value), acc), {} as Record<string, string>)
  const earnRate = Number(settingsObj["reward_point_earn_rate"]) || 10

  // findOrCreateCheckoutUser is idempotent — this finds the account created
  // during Session creation rather than making a second one.
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

  let order: Order
  try {
    const result = await prisma.$transaction(async (tx) => {
      return createOrderFromCheckout(tx, {
        body: checkoutBody,
        user,
        settingsObj,
        earnRate,
        resolvedShipping,
        verifiedPayment: { method: "sslcommerz", transactionId: validation.bankTranId || valId },
      })
    })
    if (!result.order) throw new Error("Order creation failed unexpectedly.")
    order = result.order
  } catch (err) {
    // Money is already captured by SSLCommerz but the order couldn't be
    // created (stock sold out while the customer was off-site, a coupon
    // expired in the meantime, etc.) — this must never be silently lost.
    console.error("[SSLCOMMERZ_ORPHANED_PAYMENT] order creation failed after payment", {
      tranId,
      valId,
      amount: validation.amount,
      error: errorMessage(err),
    })
    await prisma.pendingCheckout.update({
      where: { id: pending.id },
      data: {
        status: "FAILED",
        failureReason: `Order creation failed after payment: ${errorMessage(err)}`.slice(0, 500),
      },
    })
    return { status: "captured_error" }
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

  return { status: "success", order, checkoutBody, currency: baseCurrencyCode(settingsObj) }
}

/**
 * The success_url/fail_url/cancel_url/ipn_url handed to SSLCommerz's Session
 * API all point here, distinguished by `?result=`. SSLCommerz POSTs
 * form-urlencoded data to all four — see confirmAndCreateOrder above for why
 * success and ipn share the same verification path.
 */
export async function POST(req: NextRequest) {
  const result = req.nextUrl.searchParams.get("result")
  const siteUrl = await requestSiteUrl()
  // 303: forces the browser to GET the destination regardless of this being a
  // POST — the standard "redirect after form submission" status.
  const redirect = (qs: string) => NextResponse.redirect(`${siteUrl}/checkout?${qs}`, 303)

  const form = await req.formData().catch(() => null)
  const tranId = form?.get("tran_id")?.toString()
  const valId = form?.get("val_id")?.toString()

  if (result === "ipn") {
    if (!tranId || !valId) return NextResponse.json({ received: true }, { status: 400 })
    await confirmAndCreateOrder(tranId, valId)
    return NextResponse.json({ received: true })
  }

  if (!tranId) return redirect("sslcommerz=failed")

  if (result === "fail" || result === "cancel") {
    await prisma.pendingCheckout.updateMany({
      where: { merchantInvoiceNumber: tranId, status: "PENDING" },
      data: {
        status: "FAILED",
        failureReason: result === "cancel" ? "Cancelled by customer" : "Payment failed at gateway",
      },
    })
    return redirect(result === "cancel" ? "sslcommerz=cancelled" : "sslcommerz=failed")
  }

  // result === "success"
  if (!valId) return redirect("sslcommerz=failed")

  const outcome = await confirmAndCreateOrder(tranId, valId)
  if (!outcome || outcome.status === "failed") return redirect("sslcommerz=failed")
  if (outcome.status === "captured_error") return redirect("sslcommerz=payment_captured_error")

  const params = new URLSearchParams({
    sslcommerz: "success",
    orderId: outcome.order.id,
    value: String(outcome.order.totalAmount),
    currency: outcome.currency,
    shipping: String(outcome.order.shippingFee),
    // The customer's browser lands here on a fresh page load — none of the
    // checkout form's in-memory state survives the redirect to SSLCommerz and
    // back — so the confirmation panel needs these passed through explicitly.
    name: outcome.checkoutBody.fullName || "",
    email: outcome.checkoutBody.email || "",
  })
  return redirect(params.toString())
}
