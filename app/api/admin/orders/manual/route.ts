import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { postOrderEntry } from "@/lib/accounting"
import { baseCurrencyCode, getSettings } from "@/lib/settings"
import { generatePassword } from "@/lib/orderCreation"
import { isOrderSource } from "@/lib/orderSources"

/**
 * POST /api/admin/orders/manual — an order taken by staff over Facebook,
 * Messenger, WhatsApp, a phone call… (Admin → Orders → Create Order).
 *
 * Unlike the POS endpoint (an over-the-counter sale, delivered and paid on the
 * spot) this creates a normal *delivery* order: PENDING, with an address, a
 * delivery charge and cash on delivery by default — so it flows through
 * Orders, Deliveries / Steadfast and the invoice exactly like a website order.
 *
 * Every amount is recomputed here; the browser's totals are only a preview.
 */

type Body = {
  userId?: string | null
  fullName?: string
  phone?: string
  email?: string
  address?: string
  source?: string
  items?: Array<{ variantId: string; quantity: number; price?: number }>
  shippingMethod?: string
  shippingFee?: number
  discount?: number
  /** "cod" | "advance" | "paid" */
  paymentType?: string
  /** bkash | nagad | rocket | bank | cash */
  paymentMethod?: string
  advanceAmount?: number
  transactionId?: string
  status?: "PENDING" | "PROCESSING"
  adminNote?: string
}

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""))
  return Number.isFinite(n) ? n : 0
}
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

/** 01XXXXXXXXX, accepting +880 / 880 prefixes and spaces/dashes. */
function normalizeBdPhone(raw: string): string | null {
  const digits = raw.replace(/[^\d]/g, "").replace(/^880/, "0")
  return /^01[3-9]\d{8}$/.test(digits) ? digits : null
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body

    const fullName = (body.fullName || "").trim()
    const address = (body.address || "").trim()
    const phone = normalizeBdPhone(body.phone || "")
    const email = (body.email || "").trim().toLowerCase()
    const items = Array.isArray(body.items) ? body.items.filter((i) => i?.variantId && num(i.quantity) > 0) : []

    if (!fullName) return NextResponse.json({ message: "Customer name is required." }, { status: 400 })
    if (!phone) return NextResponse.json({ message: "Enter a valid Bangladeshi mobile number (01XXXXXXXXX)." }, { status: 400 })
    if (!address) return NextResponse.json({ message: "Delivery address is required." }, { status: 400 })
    if (items.length === 0) return NextResponse.json({ message: "Add at least one product." }, { status: 400 })
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ message: "That email address doesn't look right." }, { status: 400 })
    }

    const source = isOrderSource(body.source) ? body.source : "other"
    const paymentType = body.paymentType === "paid" || body.paymentType === "advance" ? body.paymentType : "cod"
    const paymentMethod = (body.paymentMethod || "").trim().toLowerCase() || "bkash"
    const shippingFee = Math.max(0, round2(num(body.shippingFee)))
    const discountReq = Math.max(0, round2(num(body.discount)))
    const status = body.status === "PROCESSING" ? "PROCESSING" : "PENDING"
    const adminNote = (body.adminNote || "").trim().slice(0, 2000) || null

    const settings = await getSettings()

    // ── Customer: picked account → same phone → same email → new account ─────
    let user = body.userId ? await prisma.user.findUnique({ where: { id: body.userId } }) : null
    if (!user) user = await prisma.user.findFirst({ where: { phone, role: "USER" }, orderBy: { createdAt: "asc" } })
    if (!user && email) user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          // Email is the login key and is unique; a customer who ordered by
          // phone often has none, so a stable placeholder is derived from the
          // number (the same customer ordering again is found by phone above).
          email: email || `${phone}@phone-order.local`,
          name: fullName,
          phone,
          password: await bcrypt.hash(generatePassword(16), 12),
          role: "USER",
        },
      })
    } else if (!user.phone || !user.name) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { phone: user.phone || phone, name: user.name || fullName },
      })
    }

    const order = await prisma.$transaction(async (tx) => {
      const orderItems: Array<{ variantId: string; quantity: number; price: number }> = []
      let subtotal = 0

      for (const item of items) {
        const quantity = Math.floor(num(item.quantity))
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          include: { product: { select: { title: true, basePrice: true, discountPrice: true, deletedAt: true } } },
        })
        if (!variant || variant.deletedAt || variant.product.deletedAt) {
          throw new Error("One of the products is no longer available. Remove it and add it again.")
        }
        if (variant.stock < quantity) {
          throw new Error(
            `Not enough stock for "${variant.product.title}" (${[variant.color, variant.size, variant.length].filter(Boolean).join(" / ")}). Available: ${variant.stock}.`
          )
        }
        const listPrice = variant.price ?? variant.product.discountPrice ?? variant.product.basePrice
        // Staff may agree a different price with the customer (a deal on Messenger).
        const price = item.price !== undefined && num(item.price) >= 0 ? round2(num(item.price)) : listPrice

        const updated = await tx.productVariant.update({
          where: { id: variant.id },
          data: { stock: { decrement: quantity } },
          select: { stock: true },
        })
        await tx.inventoryLog.create({
          data: {
            variantId: variant.id,
            previousStock: updated.stock + quantity,
            newStock: updated.stock,
            note: `Stock reduced by a ${source} order created in admin.`,
          },
        })

        orderItems.push({ variantId: variant.id, quantity, price })
        subtotal += price * quantity
      }

      subtotal = round2(subtotal)
      const discount = Math.min(discountReq, subtotal)
      const totalAmount = round2(subtotal - discount + shippingFee)
      const advancePaid =
        paymentType === "paid" ? totalAmount : paymentType === "advance" ? Math.min(Math.max(0, round2(num(body.advanceAmount))), totalAmount) : 0
      const fullyPaid = advancePaid >= totalAmount && totalAmount > 0

      const created = await tx.order.create({
        data: {
          userId: user!.id,
          totalAmount,
          status,
          paymentStatus: fullyPaid ? "PAID" : "PENDING",
          shippingAddress: address,
          shippingPhone: phone,
          shippingMethod: (body.shippingMethod || "").trim() || null,
          shippingFee,
          shippingCountry: "BD",
          currencyCode: baseCurrencyCode(settings),
          currencySymbol: "৳",
          exchangeRate: 1,
          source,
          adminNote,
          discountAmount: discount,
          advancePaid: fullyPaid ? totalAmount : advancePaid,
          items: { create: orderItems },
        },
      })

      // The money actually received. Pure COD has none yet — the courier's
      // collection is recorded when the order is marked paid.
      if (advancePaid > 0) {
        await tx.payment.create({
          data: {
            orderId: created.id,
            provider: paymentMethod,
            amount: advancePaid,
            status: "PAID",
            transactionId: (body.transactionId || "").trim() || `MANUAL_${Date.now()}`,
          },
        })
      }

      return created
    })

    try {
      await postOrderEntry(order.id)
    } catch (e) {
      console.error("[MANUAL_ORDER_ACCOUNTING]", e)
    }

    return NextResponse.json({ success: true, orderId: order.id, totalAmount: order.totalAmount })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not create the order."
    console.error("[MANUAL_ORDER]", error)
    return NextResponse.json({ message }, { status: 400 })
  }
}
