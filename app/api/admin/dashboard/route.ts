import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminPayload } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await getAdminPayload(req);
  } catch (err: any) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    // Current date calculations
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Run aggregations directly in the DB
    // 1. Total Revenue (all time paid/delivered)
    const totalRevenueAgg = await prisma.order.aggregate({
      where: {
        OR: [{ paymentStatus: "PAID" }, { status: "DELIVERED" }],
      },
      _sum: { totalAmount: true },
    });
    const totalRevenue = totalRevenueAgg._sum.totalAmount || 0;

    // 2. Active Orders
    const activeOrdersCount = await prisma.order.count({
      where: {
        status: { notIn: ["CANCELLED", "DELIVERED"] }
      }
    });

    // 3. Unique Clients
    const uniqueClientsAgg = await prisma.order.findMany({
      select: { userId: true },
      distinct: ['userId']
    });
    const totalClients = uniqueClientsAgg.length;

    // 4. Recent Revenue (Last 7 days)
    const recentRevenueAgg = await prisma.order.aggregate({
      where: {
        OR: [{ paymentStatus: "PAID" }, { status: "DELIVERED" }],
        createdAt: { gte: sevenDaysAgo }
      },
      _sum: { totalAmount: true }
    });
    const recentRevenue = recentRevenueAgg._sum.totalAmount || 0;

    // 5. Previous Revenue (Previous 7 days)
    const previousRevenueAgg = await prisma.order.aggregate({
      where: {
        OR: [{ paymentStatus: "PAID" }, { status: "DELIVERED" }],
        createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo }
      },
      _sum: { totalAmount: true }
    });
    const previousRevenue = previousRevenueAgg._sum.totalAmount || 0;

    // 6. Recent Orders Count
    const recentOrders = await prisma.order.count({
      where: { createdAt: { gte: sevenDaysAgo } }
    });
    const previousOrders = await prisma.order.count({
      where: { createdAt: { gte: fourteenDaysAgo, lt: sevenDaysAgo } }
    });

    // 7. Recent Transactions for display
    const recentTransactions = await prisma.order.findMany({
      orderBy: { createdAt: 'desc' },
      take: 4,
      include: { 
        user: { select: { name: true, email: true } },
        items: { include: { variant: { include: { product: { select: { title: true } } } } } }
      }
    });

    // We can fetch all paid orders for the chart to keep it simple, 
    // or aggregate by day. For this fix, fetching the date and amount is much faster than full orders.
    const chartOrders = await prisma.order.findMany({
      where: {
        OR: [{ paymentStatus: "PAID" }, { status: "DELIVERED" }]
      },
      select: {
        createdAt: true,
        totalAmount: true
      }
    });

    return NextResponse.json({
      totalRevenue,
      activeOrdersCount,
      totalClients,
      recentRevenue,
      previousRevenue,
      recentOrders,
      previousOrders,
      recentTransactions,
      chartOrders
    });
  } catch (err) {
    console.error("Failed to load dashboard statistics:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
