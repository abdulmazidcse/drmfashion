import { Prisma } from "@prisma/client"

// Shared Prisma include for admin return-request reads (list + detail).
export const returnRequestInclude = {
  user: { select: { name: true, email: true } },
  order: {
    select: {
      id: true,
      totalAmount: true,
      status: true,
      paymentStatus: true,
      currencyCode: true,
      currencySymbol: true,
      exchangeRate: true,
      payment: {
        select: { provider: true, transactionId: true, amount: true, status: true },
      },
      items: {
        include: {
          variant: { include: { product: { select: { title: true, thumbnail: true } } } },
        },
      },
    },
  },
} satisfies Prisma.ReturnRequestInclude
