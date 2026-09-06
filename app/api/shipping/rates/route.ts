import { NextRequest, NextResponse } from "next/server";
import { getShippingRates } from "@/lib/ups";
import { getSettings } from "@/lib/settings";
import { warehouseFromSettings } from "@/lib/warehouse";
import { upsConfigFromSettings } from "@/lib/upsConfig";

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

    const settings = await getSettings();
    const config = upsConfigFromSettings(settings);

    // Switched off in Admin: answer plainly rather than as an error, so the
    // checkout simply omits the UPS section.
    if (!config.enabled) {
      return NextResponse.json({ success: true, rates: [], isMock: false, disabled: true });
    }

    const rates = await getShippingRates(
      {
        city,
        postalCode,
        countryCode: countryCode || "US",
        addressLine: addressLine || undefined,
      },
      totalWeight || 2.0,
      warehouseFromSettings(settings),
      config
    );

    // `isMock` is false only when real UPS credentials answered. The checkout UI
    // labels mock rates rather than passing them off as live quotes.
    return NextResponse.json({ success: true, rates, isMock: !config.isConfigured });
  } catch (error: any) {
    console.error("[SHIPPING_RATES_POST_ERROR]", error);
    return NextResponse.json(
      { message: error.message || "Failed to calculate shipping rates." },
      { status: 500 }
    );
  }
}
