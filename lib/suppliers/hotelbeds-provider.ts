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

function notImplemented(): never {
  throw new Error("Hotelbeds supplier provider is not implemented yet");
}

export class HotelbedsSupplierProvider implements SupplierProvider {
  readonly name = "hotelbeds" as const;

  async searchHotels(
    _request: SupplierSearchHotelsRequest,
  ): Promise<SupplierSearchHotelsResponse> {
    notImplemented();
  }

  async preBook(_request: SupplierPreBookRequest): Promise<SupplierPreBookResponse> {
    notImplemented();
  }

  async book(_request: SupplierBookRequest): Promise<SupplierBookResponse> {
    notImplemented();
  }

  async getBookingDetails(
    _request: SupplierBookingDetailsRequest,
  ): Promise<SupplierBookingDetailsResponse> {
    notImplemented();
  }

  async cancelBooking(
    _request: SupplierCancelBookingRequest,
  ): Promise<SupplierCancelBookingResponse> {
    notImplemented();
  }
}
