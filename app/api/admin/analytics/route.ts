import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // 1. Fetch aggregate metrics
    const totalUsers = await prisma.user.count({ where: { role: "USER" } });
    
    // We'll consider active carts as any cart that has items
    const activeCartsCount = await prisma.cart.count({
      where: { items: { some: {} } }
    });

    const totalOrdersCount = await prisma.order.count();
    
    const paidOrders = await prisma.order.findMany({
      where: { paymentStatus: "PAID" },
      select: { totalAmount: true, userId: true }
    });

    const totalRevenue = paidOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const paidOrdersCount = paidOrders.length;
    
    // Unique customers who have paid orders
    const uniqueCustomers = new Set(paidOrders.map(o => o.userId).filter(Boolean)).size;

    // 2. Calculations
    const averageOrderValue = paidOrdersCount > 0 ? (totalRevenue / paidOrdersCount) : 0;
    const customerLifetimeValue = uniqueCustomers > 0 ? (totalRevenue / uniqueCustomers) : 0;
    
    // Cart Abandonment Rate: 
    // Simplified: (Active Carts without paid orders) / Total Active Carts
    // Alternatively: (Total Orders (Pending/Failed) + Active Carts) vs (Paid Orders)
    // Let's use: (Active Carts) / (Active Carts + Paid Orders) as a proxy if no orders exist, 
    // or (Total Orders - Paid Orders) / Total Orders if orders exist.
    let cartAbandonmentRate = 0;
    if (totalOrdersCount > 0) {
      cartAbandonmentRate = ((totalOrdersCount - paidOrdersCount) / totalOrdersCount) * 100;
    } else if (activeCartsCount > 0) {
      cartAbandonmentRate = 100;
    }

    // Conversion Index: Paid Orders / Total Users
    const conversionIndex = totalUsers > 0 ? (paidOrdersCount / totalUsers) * 100 : 0;

    // 3. Sales Funnel
    // Step 1: Registered Users (100% baseline)
    // Step 2: Users with active carts
    // Step 3: Checkout Initiations (Total Orders)
    // Step 4: Completed Orders (Paid Orders)
    const funnelBaseline = Math.max(totalUsers, activeCartsCount, totalOrdersCount, paidOrdersCount, 1);
    
    const funnelSteps = [
      {
        label: "Registered Users",
        count: totalUsers,
        percent: ((totalUsers / funnelBaseline) * 100).toFixed(1),
        color: "bg-indigo-500"
      },
      {
        label: "Active Cart Additions",
        count: activeCartsCount,
        percent: ((activeCartsCount / funnelBaseline) * 100).toFixed(1),
        color: "bg-fuchsia-500"
      },
      {
        label: "Checkout Initiations",
        count: totalOrdersCount,
        percent: ((totalOrdersCount / funnelBaseline) * 100).toFixed(1),
        color: "bg-pink-500"
      },
      {
        label: "Completed Orders",
        count: paidOrdersCount,
        percent: ((paidOrdersCount / funnelBaseline) * 100).toFixed(1),
        color: "bg-emerald-500"
      }
    ];

    // 4. Market Share (Brand Sales)
    // Fetch all paid order items to calculate revenue per brand
    const paidOrderItems = await prisma.orderItem.findMany({
      where: {
        order: { paymentStatus: "PAID" }
      },
      include: {
        variant: {
          include: {
            product: {
              include: {
                brand: true
              }
            }
          }
        }
      }
    });

    const brandSales: Record<string, { name: string; sales: number; color: string }> = {};
    const brandColors = ["bg-zinc-950", "bg-indigo-600", "bg-rose-500", "bg-emerald-500", "bg-amber-500", "bg-sky-500", "bg-fuchsia-500", "bg-teal-500"];
    
    paidOrderItems.forEach(item => {
      const brandName = item.variant.product.brand?.name || "Unbranded / Others";
      const itemRevenue = item.price * item.quantity;
      
      if (!brandSales[brandName]) {
        brandSales[brandName] = {
          name: brandName,
          sales: 0,
          color: brandColors[Object.keys(brandSales).length % brandColors.length]
        };
      }
      brandSales[brandName].sales += itemRevenue;
    });

    const marketShareList = Object.values(brandSales)
      .sort((a, b) => b.sales - a.sales)
      .map(brand => ({
        ...brand,
        share: totalRevenue > 0 ? ((brand.sales / totalRevenue) * 100).toFixed(1) : 0
      }));

    return NextResponse.json({
      metrics: {
        averageOrderValue,
        customerLifetimeValue,
        cartAbandonmentRate,
        conversionIndex
      },
      funnelSteps,
      marketShare: marketShareList
    });

  } catch (error) {
    console.error("Analytics Error:", error);
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
}
