import type {
  SupplierBookRequest,
  SupplierBookResponse,
  SupplierBookingDetailsRequest,
  SupplierBookingDetailsResponse,
  SupplierCancelBookingRequest,
  SupplierCancelBookingResponse,
  SupplierCheckAvailabilityRequest,
  SupplierCheckAvailabilityResponse,
  SupplierPreBookRequest,
  SupplierPreBookResponse,
  SupplierProvider,
  SupplierSearchHotelsRequest,
  SupplierSearchHotelsResponse,
} from "./types";
import {
  buildMockBookResponse,
  buildMockBookingDetailsResponse,
  buildMockCancelBookingResponse,
  buildMockPreBookResponse,
  buildMockSearchHotelsResponse,
} from "./mock-utils";

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

    return buildMockSearchHotelsResponse(this.name, request);
  }

  async checkAvailability(
    request: SupplierCheckAvailabilityRequest,
  ): Promise<SupplierCheckAvailabilityResponse> {
    return this.preBook(request);
  }

  async checkRates(request: SupplierPreBookRequest): Promise<SupplierPreBookResponse> {
    return this.preBook(request);
  }

  async preBook(request: SupplierPreBookRequest): Promise<SupplierPreBookResponse> {
    assertLocalDevelopment();

    return buildMockPreBookResponse(this.name, request);
  }

  async book(request: SupplierBookRequest): Promise<SupplierBookResponse> {
    assertLocalDevelopment();

    return buildMockBookResponse(this.name, request);
  }

  async getBookingDetails(
    request: SupplierBookingDetailsRequest,
  ): Promise<SupplierBookingDetailsResponse> {
    assertLocalDevelopment();

    return buildMockBookingDetailsResponse(this.name, request);
  }

  async cancelBooking(
    request: SupplierCancelBookingRequest,
  ): Promise<SupplierCancelBookingResponse> {
    assertLocalDevelopment();

    return buildMockCancelBookingResponse(this.name, request);
  }
}
