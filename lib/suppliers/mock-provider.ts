import type {
  SupplierBookRequest,
  SupplierBookResponse,
  SupplierBookingDetailsRequest,
  SupplierBookingDetailsResponse,
  SupplierCancelBookingRequest,
  SupplierCancelBookingResponse,
  SupplierPreBookRequest,
  SupplierPreBookResponse,
  SupplierProvider,
  SupplierSearchHotelsRequest,
  SupplierSearchHotelsResponse,
} from "./types";

function assertLocalDevelopment() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Mock supplier provider cannot be used in production");
  }
}

export class MockSupplierProvider implements SupplierProvider {
  readonly name = "mock" as const;

  async searchHotels(
    request: SupplierSearchHotelsRequest,
  ): Promise<SupplierSearchHotelsResponse> {
    assertLocalDevelopment();

    const currency = request.currency || "USD";

    return {
      supplier: this.name,
      hotels: [
        {
          supplier: this.name,
          supplierHotelId: "mock-hotel-001",
          hotelName: "Hotleno Mock Hotel",
          cityName: request.cityName || "Development City",
          countryName: request.countryCode || "DEV",
          address: "123 Local Development Street",
          stars: 4,
          rates: [
            {
              rateKey: "mock-rate-refundable",
              roomName: "Deluxe Mock Room",
              boardName: "Room Only",
              price: 120,
              currency,
              refundable: true,
              cancellationPolicies: [],
              metadata: { safeForLocalDevelopment: true },
            },
          ],
          metadata: { safeForLocalDevelopment: true },
        },
      ],
      rawSupplierRequest: request,
      rawSupplierResponse: { provider: this.name, mocked: true },
    };
  }

  async preBook(request: SupplierPreBookRequest): Promise<SupplierPreBookResponse> {
    assertLocalDevelopment();

    return {
      supplier: this.name,
      supplierHotelId: request.supplierHotelId,
      supplierRateKey: request.supplierRateKey,
      price: 120,
      currency: request.currency || "USD",
      available: true,
      cancellationPolicies: [],
      rawSupplierRequest: request,
      rawSupplierResponse: { provider: this.name, mocked: true },
    };
  }

  async book(request: SupplierBookRequest): Promise<SupplierBookResponse> {
    assertLocalDevelopment();

    return {
      supplier: this.name,
      supplierBookingReference: `MOCK-${request.idempotencyKey}`,
      status: "confirmed",
      rawSupplierRequest: request,
      rawSupplierResponse: { provider: this.name, mocked: true },
    };
  }

  async getBookingDetails(
    request: SupplierBookingDetailsRequest,
  ): Promise<SupplierBookingDetailsResponse> {
    assertLocalDevelopment();

    return {
      supplier: this.name,
      supplierBookingReference: request.supplierBookingReference,
      status: "confirmed",
      rawSupplierRequest: request,
      rawSupplierResponse: { provider: this.name, mocked: true },
    };
  }

  async cancelBooking(
    request: SupplierCancelBookingRequest,
  ): Promise<SupplierCancelBookingResponse> {
    assertLocalDevelopment();

    return {
      supplier: this.name,
      supplierBookingReference: request.supplierBookingReference,
      status: "cancelled",
      rawSupplierRequest: request,
      rawSupplierResponse: { provider: this.name, mocked: true },
    };
  }
}
