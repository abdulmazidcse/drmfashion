import axios from "axios";

const UPS_CLIENT_ID = process.env.UPS_CLIENT_ID || "";
const UPS_CLIENT_SECRET = process.env.UPS_CLIENT_SECRET || "";
const UPS_ACCOUNT_NUMBER = process.env.UPS_ACCOUNT_NUMBER || "";
const UPS_ENVIRONMENT = process.env.UPS_ENVIRONMENT || "sandbox";

const isPlaceholder = 
  !UPS_CLIENT_ID || 
  !UPS_CLIENT_SECRET || 
  UPS_CLIENT_ID.startsWith("placeholder_") || 
  UPS_CLIENT_SECRET.startsWith("placeholder_");

const BASE_URL = UPS_ENVIRONMENT === "production"
  ? "https://onlinetools.ups.com"
  : "https://www.sandbox.ups.com";

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
async function getUpsAccessToken(): Promise<string> {
  if (isPlaceholder) {
    throw new Error("Using placeholder credentials");
  }

  const tokenUrl = `${BASE_URL}/security/v1/oauth/token`;
  const credentials = Buffer.from(`${UPS_CLIENT_ID}:${UPS_CLIENT_SECRET}`).toString("base64");

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
  packageWeightLbs: number = 2.0
): Promise<UPSRateOption[]> {
  // If placeholder or empty credentials, return mock UPS rates for developer convenience
  if (isPlaceholder) {
    console.warn("[UPS helper] UPS credentials not set. Returning sandbox mock rates.");
    return [
      {
        serviceName: "UPS Ground",
        serviceCode: "03",
        rate: 12.50,
        currency: "USD",
        daysToDelivery: "3-5 Business Days"
      },
      {
        serviceName: "UPS 3 Day Select",
        serviceCode: "12",
        rate: 18.75,
        currency: "USD",
        daysToDelivery: "3 Business Days"
      },
      {
        serviceName: "UPS 2nd Day Air",
        serviceCode: "02",
        rate: 26.20,
        currency: "USD",
        daysToDelivery: "2 Business Days"
      },
      {
        serviceName: "UPS Next Day Air",
        serviceCode: "01",
        rate: 45.10,
        currency: "USD",
        daysToDelivery: "1 Business Day"
      }
    ];
  }

  try {
    const token = await getUpsAccessToken();
    const rateUrl = `${BASE_URL}/api/rating/v1/shop`;

    const requestBody = {
      RateRequest: {
        Request: {
          RequestOption: "Shop",
        },
        Shipment: {
          Shipper: {
            Name: "Fashion Store",
            ShipperNumber: UPS_ACCOUNT_NUMBER,
            Address: {
              AddressLine: ["100 Fashion Way"],
              City: "New York",
              StateProvinceCode: "NY",
              PostalCode: "10001",
              CountryCode: "US",
            },
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
            Name: "Fashion Store Fulfillment",
            Address: {
              AddressLine: ["100 Fashion Way"],
              City: "New York",
              StateProvinceCode: "NY",
              PostalCode: "10001",
              CountryCode: "US",
            },
          },
          Service: {
            Code: "03",
            Description: "Ground"
          },
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

    const ratedShipments = response.data?.RateResponse?.RatedShipment;
    if (!ratedShipments || !Array.isArray(ratedShipments)) {
      throw new Error("No rated shipments found in UPS response");
    }

    // Mapping service codes to user-friendly names
    const serviceNameMap: Record<string, string> = {
      "01": "UPS Next Day Air",
      "02": "UPS 2nd Day Air",
      "03": "UPS Ground",
      "12": "UPS 3 Day Select",
      "13": "UPS Next Day Air Saver",
      "14": "UPS Next Day Air Early",
      "59": "UPS 2nd Day Air AM",
      "65": "UPS Saver",
    };

    return ratedShipments.map((shipment: any) => {
      const code = shipment.Service?.Code || "";
      const charge = shipment.TotalCharges?.MonetaryValue || "0";
      const currency = shipment.TotalCharges?.CurrencyCode || "USD";
      const deliveryDays = shipment.GuaranteedDelivery?.BusinessDaysInTransit || "";

      return {
        serviceName: serviceNameMap[code] || `UPS Service (${code})`,
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
