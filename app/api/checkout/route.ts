import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import Stripe from "stripe"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { sendOrderConfirmationEmail, sendAccountCreatedEmail } from "@/lib/email"
import { baseCurrencyCode } from "@/lib/settings"
import { resolveOrderShipping } from "@/lib/shippingServer"
import { resolveTax, taxSettingsFromSettings } from "@/lib/tax"
import { postOrderEntry } from "@/lib/accounting"
import {
  calculateCustomFeeBreakdown,
  resolveSurcharge,
  roundMoney,
  validateMeasurements,
  type MeasurementFieldSpec,
  type MeasurementSnapshot,
} from "@/lib/measurement"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-04-22.dahlia",
})

// Generates a readable but strong password (no ambiguous chars like 0/O, 1/l).
function generatePassword(length = 10): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"
  const bytes = crypto.randomBytes(length)
  let out = ""
  for (let i = 0; i < length; i++) out += chars[bytes[i] % chars.length]
  return out
}
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      fullName,
      email,
      phone,
      address,
      paymentMethod,
      totalAmount,
      items,
      paymentDetails,
      pointsRedeemed,
      promoCode,
      shippingMethodId,
      shippingDestination,
      currencyCode,
      currencySymbol,
      exchangeRate,
    } = body

    if (!email || !fullName || !phone || !address || !items || items.length === 0) {
      return NextResponse.json(
        { message: "Missing required fields for order submission." },
        { status: 400 }
      )
    }

    // Fetch dynamic settings
    const settings = await prisma.setting.findMany()
    const settingsObj = settings.reduce((acc: Record<string, string>, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {})
    const earnRate = Number(settingsObj["reward_point_earn_rate"]) || 10

    // 1. Create or Find User.
    // Guest checkout (no login) auto-creates a real, loginable account:
    // a password is generated, hashed and later emailed to the customer.
    let user = await prisma.user.findUnique({
      where: { email },
    })

    // Plaintext of a freshly generated password — set only when we create or
    // upgrade an account, so we know to email credentials after the order.
    let generatedPassword: string | null = null

    if (!user) {
      generatedPassword = generatePassword()
      const hashedPassword = await bcrypt.hash(generatedPassword, 12)
      user = await prisma.user.create({
        data: {
          email,
          name: fullName,
          password: hashedPassword,
          phone,
          role: "USER",
        },
      })
    } else if (!user.password || user.password.startsWith("GUEST_")) {
      // Legacy guest account (placeholder password) → upgrade to a loginable one.
      generatedPassword = generatePassword()
      const hashedPassword = await bcrypt.hash(generatedPassword, 12)
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          name: user.name || fullName,
          phone: user.phone || phone,
        },
      })
    }
    // else: existing real account — leave credentials untouched, just attach the order.

    // Shipping is priced before the transaction opens: a UPS service needs an
    // outbound re-quote, and holding a pooled DB connection across that call is
    // what turns a slow carrier into a database outage.
    const resolvedShipping = await resolveOrderShipping({
      settings: settingsObj,
      shippingMethodId,
      destination: shippingDestination,
      items,
    })

    // 2. Run order creation inside an atomic transaction
    const order = await prisma.$transaction(async (tx) => {
      // Refetch user inside transaction to get latest rewardPoints and prevent race conditions
      const txUser = await tx.user.findUnique({
        where: { id: user.id },
      })

      if (!txUser) {
        throw new Error("User record not found.")
      }

      let pointsToDeduct = 0
      if (pointsRedeemed && pointsRedeemed > 0) {
        if (txUser.rewardPoints < pointsRedeemed) {
          throw new Error(`Insufficient reward points. Available: ${txUser.rewardPoints}`)
        }
        pointsToDeduct = pointsRedeemed
      }

      let calculatedTotal = 0;
      const orderItemsData = []

      for (const item of items) {
        // Find matching variant
        let variant = await tx.productVariant.findFirst({
          where: {
            productId: item.productId,
            color: item.color,
            size: item.size,
            length: item.length || null,
          },
          include: {
            product: {
              include: { measurementTemplate: { include: { fields: { include: { tiers: true } } } } }
            }
          }
        })

        // Fallback: If exact variant is not found (e.g. slight metadata mismatch), find the first available variant for the product
        if (!variant) {
          variant = await tx.productVariant.findFirst({
            where: { productId: item.productId },
            include: {
              product: {
                include: { measurementTemplate: { include: { fields: { include: { tiers: true } } } } }
              }
            }
          })
        }

        if (!variant) {
          throw new Error(`Product variant not found for ${item.title || item.productId}`)
        }

        const product = variant.product

        // ─── Made-to-measure ────────────────────────────────────────────────
        // The browser only supplies raw measurements; the fee is always
        // re-derived here from the product/template rows.
        const wantsCustom = Boolean(item.custom)
        const customEnabled =
          product.customMeasurementEnabled &&
          product.measurementTemplate &&
          product.measurementTemplate.active &&
          product.measurementTemplate.fields.length > 0

        if (wantsCustom && !customEnabled) {
          throw new Error(`"${product.title}" is no longer available made-to-measure.`)
        }

        let measurementSnapshot: MeasurementSnapshot | null = null
        let fieldSpecs: MeasurementFieldSpec[] = []
        let customFee = 0

        if (wantsCustom && product.measurementTemplate) {
          const template = product.measurementTemplate
          const rawValues: Record<string, unknown> = {}

          // Accept either the cart's { key, value } list or a plain object.
          if (Array.isArray(item.custom.values)) {
            for (const entry of item.custom.values) {
              if (entry && typeof entry.key === "string") rawValues[entry.key] = entry.value
            }
          } else if (item.custom.values && typeof item.custom.values === "object") {
            Object.assign(rawValues, item.custom.values)
          }

          fieldSpecs = template.fields.map((f) => ({
            key: f.key,
            label: f.label,
            unit: f.unit,
            required: f.required,
            minValue: f.minValue,
            maxValue: f.maxValue,
            tiers: f.tiers,
          }))

          const validation = validateMeasurements(fieldSpecs, rawValues)

          if (!validation.ok) {
            throw new Error(`${product.title}: ${validation.error}`)
          }

          measurementSnapshot = {
            templateId: template.id,
            templateName: template.name,
            values: validation.values,
          }
        }

        // Made-to-order items are cut on demand, so they never touch stock.
        if (!wantsCustom) {
          // ✅ Stock validation — prevent oversell
          if (variant.stock < item.quantity) {
            throw new Error(`Insufficient stock for "${item.title || "item"}". Available: ${variant.stock}, Requested: ${item.quantity}`)
          }

          // Decrement product variant stock
          const newStock = variant.stock - item.quantity
          await tx.productVariant.update({
            where: { id: variant.id },
            data: { stock: newStock },
          })

          // Log inventory change
          await tx.inventoryLog.create({
            data: {
              variantId: variant.id,
              previousStock: variant.stock,
              newStock: newStock,
              note: `Stock reduced due to checkout purchase. Order placed by ${fullName}.`,
            },
          })
        }

        // Calculate actual price
        const unitPrice = variant.price || product.discountPrice || product.basePrice;

        if (wantsCustom && measurementSnapshot) {
          // Base tailoring fee plus any size upcharge the measurements land in —
          // all of it re-derived from the database, never from the cart.
          const breakdown = calculateCustomFeeBreakdown(
            unitPrice,
            resolveSurcharge(product, product.measurementTemplate),
            fieldSpecs,
            measurementSnapshot.values
          )
          customFee = breakdown.total
          measurementSnapshot.feeBreakdown = breakdown.lines
        }

        const actualPrice = roundMoney(unitPrice + customFee);
        calculatedTotal += actualPrice * item.quantity;

        orderItemsData.push({
          variantId: variant.id,
          quantity: item.quantity,
          price: actualPrice,
          isCustom: wantsCustom,
          customFee,
          customMeasurements: measurementSnapshot as any,
        })
      }

      // Calculate subtotal
      let preTaxAmount = Math.max(0, calculatedTotal - pointsToDeduct);
      
      let appliedDiscount = 0;

      if (promoCode) {
        const coupon = await tx.coupon.findUnique({ where: { code: promoCode.toUpperCase() } });
        if (!coupon || !coupon.active) throw new Error("Invalid or inactive coupon code.");
        if (coupon.expiresAt && new Date() > coupon.expiresAt) throw new Error("This coupon has expired.");
        if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) throw new Error("This coupon has reached its usage limit.");
        if (coupon.minOrderAmount && calculatedTotal < coupon.minOrderAmount) throw new Error(`This coupon requires a minimum order of ৳${coupon.minOrderAmount.toFixed(0)}.`);

        // Signup-reward codes only work for someone who actually signed up.
        // Checked here rather than only at /api/coupons/validate because the
        // cart applies the code before an email is known — this is the first
        // point where the buyer is identified, and the last before money moves.
        if (coupon.subscribersOnly) {
          // Case-insensitive: nothing normalises the address on the way in, so
          // subscribing as Sam@Example.com and checking out as sam@example.com
          // must still count as the same person.
          const subscriber = await tx.subscriber.findFirst({
            where: { email: { equals: email, mode: "insensitive" } },
            select: { id: true },
          });
          if (!subscriber) {
            throw new Error(
              "This code is for email subscribers. Sign up with this email address first, then apply the code."
            );
          }
        }

        // "…off your first order". Matched on the order email rather than the
        // user id so a guest checkout counts as an order too — otherwise the
        // same person could reuse the code by not signing in.
        if (coupon.firstOrderOnly) {
          // Orders carry no email of their own; guest checkout still creates a
          // User row with the real address, so the relation covers both.
          const previousOrder = await tx.order.findFirst({
            where: {
              user: { email: { equals: email, mode: "insensitive" } },
              status: { not: "CANCELLED" },
            },
            select: { id: true },
          });
          if (previousOrder) {
            throw new Error("This code is for first orders only.");
          }
        }


        if (coupon.type === "PERCENTAGE") {
          appliedDiscount = Math.min((calculatedTotal * coupon.discount) / 100, calculatedTotal);
        } else {
          appliedDiscount = Math.min(coupon.discount, calculatedTotal);
        }
        preTaxAmount = Math.max(0, preTaxAmount - appliedDiscount);

        // Update coupon usage
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } }
        });
      }
      
      const finalShippingFee = resolvedShipping.fee;

      // Tax is by destination and comes from the same settings the storefront
      // displayed. It is worked out after shipping because the merchant can
      // choose to tax the shipping fee too, which is the rule in Canada.
      const resolvedTax = resolveTax(taxSettingsFromSettings(settingsObj), {
        country: shippingDestination?.countryCode,
        state: shippingDestination?.state,
        taxableAmount: preTaxAmount,
        shippingFee: finalShippingFee,
      });
      const tax = resolvedTax.amount;
      
      const finalPayableAmount = preTaxAmount + tax + finalShippingFee;
      
      // Calculate reward points earned from this real total
      const pointsEarned = Math.floor(finalPayableAmount / earnRate)

      let squareTxId = "SQUARE_PAY";

      // VERIFY STRIPE PAYMENT
      if (paymentMethod === "card" && finalPayableAmount > 0) {
        if (!paymentDetails?.paymentIntentId) {
          throw new Error("Missing Payment Intent ID for Card payment.");
        }
        
        const intent = await stripe.paymentIntents.retrieve(paymentDetails.paymentIntentId);
        
        if (intent.status !== "succeeded") {
          throw new Error(`Stripe payment not successful. Status: ${intent.status}`);
        }
        
        // Stripe uses cents, so multiply by 100
        const expectedAmountInCents = Math.round(finalPayableAmount * 100);
        if (intent.amount !== expectedAmountInCents) {
          throw new Error("Stripe payment amount mismatch. Possible tampering detected.");
        }
      }

      // VERIFY & CHARGE SQUARE PAYMENT
      if (paymentMethod === "square" && finalPayableAmount > 0) {
        if (!paymentDetails?.paymentIntentId) {
          throw new Error("Missing Square card nonce.");
        }
        
        const squareAppId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || process.env.SQ_APPLICATION_ID || "";
        const isSandbox = squareAppId.startsWith("sandbox-");
        const squareBaseUrl = isSandbox 
          ? "https://connect.squareupsandbox.com" 
          : "https://connect.squareup.com";
          
        const squareAccessToken = process.env.SQUARE_ACCESS_TOKEN || process.env.SQ_APPLICATION_SECRET;
        let squareLocationId = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || process.env.SQ_LOCATION_ID;
        
        if (!squareAccessToken) {
          throw new Error("Square is not configured on the server.");
        }

        if (!squareLocationId) {
          try {
            const locRes = await fetch(`${squareBaseUrl}/v2/locations`, {
              headers: {
                "Authorization": `Bearer ${squareAccessToken}`,
                "Content-Type": "application/json",
                "Square-Version": "2024-05-15"
              }
            });
            if (locRes.ok) {
              const locData = await locRes.json();
              if (locData.locations && locData.locations.length > 0) {
                const activeLoc = locData.locations.find((l: any) => l.status === "ACTIVE") || locData.locations[0];
                squareLocationId = activeLoc.id;
              }
            }
          } catch (e) {
            console.error("Auto-fetch Location ID in backend checkout failed:", e);
          }
        }
        
        const squareAmount = Math.round(finalPayableAmount * 100); // cents
        
        const squareResponse = await fetch(`${squareBaseUrl}/v2/payments`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${squareAccessToken}`,
            "Content-Type": "application/json",
            "Square-Version": "2024-05-15"
          },
          body: JSON.stringify({
            idempotency_key: `ord_${new Date().getTime()}_${Math.random().toString(36).slice(-6)}`,
            amount_money: {
              amount: squareAmount,
              // The store's own currency, not a hardcoded one: `squareAmount`
              // is the order total, and totals are held in the base currency.
              // Square refuses a payment whose currency is not the merchant
              // account's, and a mislabelled one would charge the wrong sum.
              currency: baseCurrencyCode(settingsObj)
            },
            source_id: paymentDetails.paymentIntentId,
            location_id: squareLocationId || undefined
          })
        });
        
        if (!squareResponse.ok) {
          const errBody = await squareResponse.json();
          console.error("[SQUARE_PAYMENT_ERROR]", errBody);
          const errMsg = errBody?.errors?.[0]?.detail || "Square payment failed.";
          throw new Error(errMsg);
        }
        
        const squarePaymentData = await squareResponse.json();
        if (squarePaymentData?.payment?.status !== "COMPLETED") {
          throw new Error(`Square payment status is ${squarePaymentData?.payment?.status || "FAILED"}.`);
        }
        squareTxId = squarePaymentData.payment.id;
      }

      // Create main Order
      const newOrder = await tx.order.create({
        data: {
          userId: user.id,
          totalAmount: finalPayableAmount,
          status: "PENDING",
          paymentStatus: paymentMethod === "cod" ? "PENDING" : "PAID",
          shippingAddress: address,
          shippingPhone: phone,
          shippingCarrier: resolvedShipping.carrier,
          shippingMethod: resolvedShipping.methodName,
          shippingFee: finalShippingFee,
          shippingState: shippingDestination?.state || null,
          shippingCountry: shippingDestination?.countryCode || null,
          taxAmount: tax,
          taxRate: resolvedTax.rate,
          taxLabel: resolvedTax.label,
          pointsRedeemed: pointsToDeduct,
          pointsEarned: pointsEarned,
          currencyCode: typeof currencyCode === "string" ? currencyCode : "USD",
          currencySymbol: typeof currencySymbol === "string" ? currencySymbol : "$",
          exchangeRate: typeof exchangeRate === "number" && exchangeRate > 0 ? exchangeRate : 1.0,
          items: {
            create: orderItemsData,
          },
        },
      })

      // Atomically adjust user's reward points balance
      await tx.user.update({
        where: { id: user.id },
        data: {
          rewardPoints: {
            increment: pointsEarned - pointsToDeduct,
          },
        },
      })

      // If not Cash on Delivery, record Payment transaction details
      if (paymentMethod !== "cod") {
        const transactionId =
          paymentMethod === "bkash"
            ? paymentDetails?.bkashNumber || "BKASH_PAY"
            : paymentMethod === "nagad"
            ? paymentDetails?.nagadNumber || "NAGAD_PAY"
            : paymentMethod === "card"
            ? paymentDetails?.paymentIntentId || "STRIPE_PAY"
            : paymentMethod === "square"
            ? squareTxId
            : "OTHER_PAY"

        await tx.payment.create({
          data: {
            orderId: newOrder.id,
            provider: paymentMethod,
            amount: finalPayableAmount,
            status: "PAID",
            transactionId,
          },
        })
      }

      return newOrder
    })

    // Mirror the sale into the ledger (non-blocking; the order already exists)
    try {
      await postOrderEntry(order.id)
    } catch (e) {
      console.error("[ACCOUNTING_POST_ERROR]", e)
    }

    // Send order confirmation email (non-blocking)
    try {
      const orderItems = items.map((item: any) => ({
        title: item.title || "Product",
        quantity: item.quantity,
        price: item.price || 0,
        color: item.color,
        size: item.size,
      }))
      await sendOrderConfirmationEmail(email, {
        customerName: fullName,
        orderId: order.id,
        items: orderItems,
        totalAmount: order.totalAmount,
        shippingAddress: address,
        paymentMethod,
      })
    } catch (emailErr) {
      console.error("[CHECKOUT_EMAIL_ERROR]", emailErr)
    }

    // Email login credentials for freshly created / upgraded guest accounts (non-blocking)
    if (generatedPassword) {
      try {
        await sendAccountCreatedEmail(email, {
          name: fullName,
          email,
          password: generatedPassword,
        })
      } catch (accEmailErr) {
        console.error("[CHECKOUT_ACCOUNT_EMAIL_ERROR]", accEmailErr)
      }
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      accountCreated: !!generatedPassword,
      // For the GA4 `purchase` event. Sent from here rather than recomputed in
      // the browser because coupons, shipping, tax and redeemed points are all
      // applied server-side — a client-side total would not match what was
      // actually charged.
      analytics: {
        value: order.totalAmount,
        currency: baseCurrencyCode(settingsObj),
        shipping: order.shippingFee,
      },
    })
  } catch (error: any) {
    console.error("[CHECKOUT_POST_ERROR]", error)
    return NextResponse.json(
      { message: error.message || "Failed to process checkout order." },
      { status: 500 }
    )
  }
}
