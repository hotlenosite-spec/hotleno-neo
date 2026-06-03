import {
  buildMockBookResponse,
  buildMockBookingDetailsResponse,
  buildMockCancelBookingResponse,
  buildMockPreBookResponse,
  buildMockSearchHotelsResponse,
} from "./mock-utils";
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

export class TboSupplierProvider implements SupplierProvider {
  readonly name = "tbo" as const;

  async searchHotels(
    request: SupplierSearchHotelsRequest,
  ): Promise<SupplierSearchHotelsResponse> {
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
    return buildMockPreBookResponse(this.name, request);
  }

  async book(request: SupplierBookRequest): Promise<SupplierBookResponse> {
    return buildMockBookResponse(this.name, request);
  }

  async getBookingDetails(
    request: SupplierBookingDetailsRequest,
  ): Promise<SupplierBookingDetailsResponse> {
    return buildMockBookingDetailsResponse(this.name, request);
  }

  async cancelBooking(
    request: SupplierCancelBookingRequest,
  ): Promise<SupplierCancelBookingResponse> {
    return buildMockCancelBookingResponse(this.name, request);
  }
}
