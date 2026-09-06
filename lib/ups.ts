import axios from "axios";
import { isWarehouseComplete, type WarehouseAddress } from "@/lib/warehouse";
import type { UpsConfig } from "@/lib/upsConfig";

function baseUrlFor(config: UpsConfig): string {
  return config.environment === "production"
    ? "https://onlinetools.ups.com"
    : "https://www.sandbox.ups.com";
}

/**
 * UPS service codes, domestic and international.
 *
 * The Rating API answers `RequestOption: "Shop"` with whatever services serve
 * the destination, so the map has to cover both: a US -> Canada order comes
 * back as 11 (Standard) or 07/08, never as 03 (Ground).
 */
export const UPS_SERVICE_NAMES: Record<string, string> = {
  // US domestic
  "01": "UPS Next Day Air",
  "02": "UPS 2nd Day Air",
  "03": "UPS Ground",
  "12": "UPS 3 Day Select",
  "13": "UPS Next Day Air Saver",
  "14": "UPS Next Day Air Early",
  "59": "UPS 2nd Day Air AM",
  // International / cross-border
  "07": "UPS Worldwide Express",
  "08": "UPS Worldwide Expedited",
  "11": "UPS Standard",
  "54": "UPS Worldwide Express Plus",
  "65": "UPS Worldwide Saver",
  // Canada domestic
  "02CA": "UPS Expedited",
  "13CA": "UPS Express Saver",
};

export function upsServiceName(code: string): string {
  return UPS_SERVICE_NAMES[code] || `UPS Service (${code})`;
}

export interface ShippingDestination {
  city: string;
  postalCode: string;
  countryCode: string;
  addressLine?: string;
}

export interface UPSRateOption {
  serviceName: string;
  serviceCode: string;
  rate: number;
  currency: string;
  daysToDelivery?: string;
}

/**
 * Gets OAuth2 access token from UPS
 */
async function getUpsAccessToken(config: UpsConfig): Promise<string> {
  if (!config.isConfigured) {
    throw new Error("UPS credentials are not configured");
  }

  const tokenUrl = `${baseUrlFor(config)}/security/v1/oauth/token`;
  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString("base64");

  const response = await axios.post(
    tokenUrl,
    "grant_type=client_credentials",
    {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
    }
  );

  return response.data.access_token;
}

/**
 * Fetch shipping rates from UPS Rating API.
 * If credentials are placeholders, it falls back to mock rates for testing.
 */
export async function getShippingRates(
  destination: ShippingDestination,
  packageWeightLbs: number = 2.0,
  origin?: WarehouseAddress,
  config?: UpsConfig
): Promise<UPSRateOption[]> {
  if (!config?.enabled) {
    throw new Error("UPS shipping is turned off for this store.");
  }

  // If placeholder or empty credentials, return mock UPS rates for developer
  // convenience. These are invented numbers — anything that charges money must
  // check `isUpsConfigured` before treating them as real.
  if (!config.isConfigured) {
    console.warn("[UPS helper] UPS credentials not set. Returning sandbox mock rates.");
    return mockRatesFor(destination.countryCode || "US");
  }

  if (!origin || !isWarehouseComplete(origin)) {
    throw new Error(
      "The store's ship-from address is not set. Add it in Admin → Settings → Shipping before using UPS rates."
    );
  }

  try {
    const token = await getUpsAccessToken(config);
    const rateUrl = `${baseUrlFor(config)}/api/rating/v1/shop`;

    const originAddress = {
      AddressLine: [origin.addressLine],
      City: origin.city,
      StateProvinceCode: origin.state,
      PostalCode: origin.postalCode,
      CountryCode: origin.country,
    };

    const requestBody = {
      RateRequest: {
        Request: {
          RequestOption: "Shop",
        },
        Shipment: {
          Shipper: {
            Name: origin.name || "Store",
            ShipperNumber: config.accountNumber,
            Address: originAddress,
          },
          ShipTo: {
            Name: "Valued Customer",
            Address: {
              AddressLine: destination.addressLine ? [destination.addressLine] : [],
              City: destination.city,
              PostalCode: destination.postalCode,
              CountryCode: destination.countryCode,
            },
          },
          ShipFrom: {
            Name: origin.name || "Store",
            Address: originAddress,
          },
          // No `Service` node: with RequestOption "Shop" UPS returns every
          // service that serves the destination. Pinning it to 03 (Ground) is
          // what limited the response to a single domestic option.
          Package: {
            PackagingType: {
              Code: "02",
              Description: "Customer Packaging"
            },
            PackageWeight: {
              UnitOfMeasurement: {
                Code: "LBS",
                Description: "Pounds"
              },
              Weight: Math.max(0.1, packageWeightLbs).toFixed(1)
            }
          }
        }
      }
    };

    const response = await axios.post(rateUrl, requestBody, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    // UPS returns a bare object when only one service serves the destination,
    // and an array when several do.
    const raw = response.data?.RateResponse?.RatedShipment;
    const ratedShipments = Array.isArray(raw) ? raw : raw ? [raw] : [];
    if (ratedShipments.length === 0) {
      throw new Error("No rated shipments found in UPS response");
    }

    return ratedShipments.map((shipment: any) => {
      const code = shipment.Service?.Code || "";
      const charge = shipment.TotalCharges?.MonetaryValue || "0";
      const currency = shipment.TotalCharges?.CurrencyCode || "USD";
      const deliveryDays = shipment.GuaranteedDelivery?.BusinessDaysInTransit || "";

      return {
        serviceName: upsServiceName(code),
        serviceCode: code,
        rate: parseFloat(charge),
        currency: currency,
        daysToDelivery: deliveryDays ? `${deliveryDays} Business Days` : undefined,
      };
    });
  } catch (error: any) {
    console.error("[UPS API Error]:", error.response?.data || error.message);
    throw new Error(
      error.response?.data?.response?.errors?.[0]?.message || 
      "Failed to fetch shipping rates from UPS"
    );
  }
}


// ─── Sandbox mocks ───────────────────────────────────────────────────────────
// Mirrors what a real "Shop" response looks like for each lane, so the checkout
// UI can be built and reviewed before UPS credentials exist. The domestic and
// cross-border lanes differ because UPS genuinely offers different services for
// each — a Canadian address never gets quoted UPS Ground.
const MOCK_DOMESTIC: Array<[string, number, string]> = [
  ["03", 12.5, "1-5 Business Days"],
  ["12", 18.75, "3 Business Days"],
  ["02", 26.2, "2 Business Days"],
  ["59", 31.4, "2 Business Days"],
  ["13", 41.0, "1 Business Day"],
  ["01", 45.1, "1 Business Day"],
  ["14", 58.9, "1 Business Day"],
];

const MOCK_INTERNATIONAL: Array<[string, number, string]> = [
  ["11", 16.4, "5-10 Business Days"],
  ["08", 28.6, "2-5 Business Days"],
  ["65", 39.2, "1-3 Business Days"],
  ["07", 47.8, "1-3 Business Days"],
  ["54", 62.5, "1-3 Business Days"],
];

function mockRatesFor(countryCode: string): UPSRateOption[] {
  const lane = countryCode.toUpperCase() === "US" ? MOCK_DOMESTIC : MOCK_INTERNATIONAL;
  return lane.map(([code, rate, daysToDelivery]) => ({
    serviceName: upsServiceName(code),
    serviceCode: code,
    rate,
    currency: "USD",
    daysToDelivery,
  }));
}

/**
 * Re-quotes one service at order time.
 *
 * The browser is trusted to say *which* UPS service the shopper picked, never
 * what it costs — so every path that takes payment calls this and uses the
 * price UPS returns. Throws if the service is no longer offered for the
 * destination, which is the honest outcome: we cannot bill a rate we cannot
 * confirm.
 */
export async function verifyUpsRate(
  destination: ShippingDestination,
  serviceCode: string,
  packageWeightLbs: number = 2.0,
  origin?: WarehouseAddress,
  config?: UpsConfig
): Promise<UPSRateOption> {
  const rates = await getShippingRates(destination, packageWeightLbs, origin, config);
  const match = rates.find((r) => r.serviceCode === serviceCode);
  if (!match) {
    throw new Error(
      `UPS no longer offers ${upsServiceName(serviceCode)} to this address. Please choose another shipping method.`
    );
  }
  return match;
}
