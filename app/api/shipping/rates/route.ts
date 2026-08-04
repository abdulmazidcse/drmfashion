import { NextRequest, NextResponse } from "next/server";
import { getShippingRates } from "@/lib/ups";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { city, postalCode, countryCode, totalWeight, addressLine } = body;

    if (!city || !postalCode) {
      return NextResponse.json(
        { message: "City and Postal Code are required to fetch shipping rates." },
        { status: 400 }
      );
    }

    const rates = await getShippingRates(
      {
        city,
        postalCode,
        countryCode: countryCode || "US",
        addressLine: addressLine || undefined,
      },
      totalWeight || 2.0
    );

    return NextResponse.json({ success: true, rates });
  } catch (error: any) {
    console.error("[SHIPPING_RATES_POST_ERROR]", error);
    return NextResponse.json(
      { message: error.message || "Failed to calculate shipping rates." },
      { status: 500 }
    );
  }
}
