import type {
  SupplierBookRequest,
  SupplierBookResponse,
  SupplierBookingDetailsRequest,
  SupplierBookingDetailsResponse,
  SupplierCancelBookingRequest,
  SupplierCancelBookingResponse,
  SupplierPreBookRequest,
  SupplierPreBookResponse,
  SupplierProviderName,
  SupplierSearchHotelsRequest,
  SupplierSearchHotelsResponse,
} from "./types";

const providerLabels: Record<SupplierProviderName, string> = {
  mock: "Hotleno Mock",
  hotelbeds: "Hotelbeds",
  tbo: "TBO",
  travellanda: "Travellanda",
};

function mockRateKey(provider: SupplierProviderName) {
  return `${provider}-rate-refundable`;
}

function mockHotelId(provider: SupplierProviderName) {
  return `${provider}-hotel-001`;
}

export function buildMockSearchHotelsResponse(
  provider: SupplierProviderName,
  request: SupplierSearchHotelsRequest,
): SupplierSearchHotelsResponse {
  const currency = request.currency || "USD";
  const label = providerLabels[provider];

  return {
    supplier: provider,
    hotels: [
      {
        supplier: provider,
        supplierHotelId: mockHotelId(provider),
        hotelName: `${label} Unified Mock Hotel`,
        cityName: request.cityName || request.destinationCode || "Development City",
        countryName: request.countryCode || "DEV",
        address: "Unified supplier mock address",
        stars: 4,
        rates: [
          {
            rateKey: mockRateKey(provider),
            roomName: "Unified Deluxe Room",
            boardName: "Room Only",
            price: provider === "hotelbeds" ? 128 : provider === "tbo" ? 124 : 121,
            currency,
            refundable: true,
            cancellationPolicies: [
              {
                type: "free_cancellation",
                description: "Mock cancellation policy; replace with provider policy later.",
              },
            ],
            metadata: {
              unifiedFormat: true,
              providerMock: provider,
            },
          },
        ],
        metadata: {
          unifiedFormat: true,
          providerMock: provider,
          replaceWithRealApi: true,
        },
      },
    ],
    rawSupplierRequest: request,
    rawSupplierResponse: {
      provider,
      mocked: true,
      normalizedTo: "SupplierSearchHotelsResponse",
    },
  };
}

export function buildMockPreBookResponse(
  provider: SupplierProviderName,
  request: SupplierPreBookRequest,
): SupplierPreBookResponse {
  return {
    supplier: provider,
    supplierHotelId: request.supplierHotelId || mockHotelId(provider),
    supplierRateKey: request.supplierRateKey || mockRateKey(provider),
    price: provider === "hotelbeds" ? 128 : provider === "tbo" ? 124 : 121,
    currency: request.currency || "USD",
    available: true,
    cancellationPolicies: [
      {
        type: "free_cancellation",
        description: "Mock rate check; replace with real provider rate rules later.",
      },
    ],
    rawSupplierRequest: request,
    rawSupplierResponse: {
      provider,
      mocked: true,
      normalizedTo: "SupplierPreBookResponse",
    },
  };
}

export function buildMockBookResponse(
  provider: SupplierProviderName,
  request: SupplierBookRequest,
): SupplierBookResponse {
  return {
    supplier: provider,
    supplierBookingReference: `${provider.toUpperCase()}-${request.idempotencyKey}`,
    status: "confirmed",
    rawSupplierRequest: request,
    rawSupplierResponse: {
      provider,
      mocked: true,
      normalizedTo: "SupplierBookResponse",
    },
  };
}

export function buildMockBookingDetailsResponse(
  provider: SupplierProviderName,
  request: SupplierBookingDetailsRequest,
): SupplierBookingDetailsResponse {
  return {
    supplier: provider,
    supplierBookingReference: request.supplierBookingReference,
    status: "confirmed",
    rawSupplierRequest: request,
    rawSupplierResponse: {
      provider,
      mocked: true,
      normalizedTo: "SupplierBookingDetailsResponse",
    },
  };
}

export function buildMockCancelBookingResponse(
  provider: SupplierProviderName,
  request: SupplierCancelBookingRequest,
): SupplierCancelBookingResponse {
  return {
    supplier: provider,
    supplierBookingReference: request.supplierBookingReference,
    status: "cancelled",
    rawSupplierRequest: request,
    rawSupplierResponse: {
      provider,
      mocked: true,
      normalizedTo: "SupplierCancelBookingResponse",
    },
  };
}
