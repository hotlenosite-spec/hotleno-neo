import { HotelbedsSupplierProvider } from "./hotelbeds-provider";
import { MockSupplierProvider } from "./mock-provider";
import { TboSupplierProvider } from "./tbo-provider";
import { TravellandaSupplierProvider } from "./travellanda-provider";
import type { SupplierProvider, SupplierProviderName } from "./types";

export function createSupplierProvider(
  providerName: SupplierProviderName,
): SupplierProvider {
  switch (providerName) {
    case "mock":
      return new MockSupplierProvider();
    case "hotelbeds":
      return new HotelbedsSupplierProvider();
    case "tbo":
      return new TboSupplierProvider();
    case "travellanda":
      return new TravellandaSupplierProvider();
    default:
      providerName satisfies never;
      throw new Error("Unsupported supplier provider");
  }
}

export function getConfiguredSupplierProvider(): SupplierProvider {
  const configuredProvider = process.env.SUPPLIER_PROVIDER as
    | SupplierProviderName
    | undefined;

  if (!configuredProvider) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SUPPLIER_PROVIDER must be configured in production");
    }

    return createSupplierProvider("mock");
  }

  if (configuredProvider === "mock" && process.env.NODE_ENV === "production") {
    throw new Error("Mock supplier provider cannot be configured in production");
  }

  return createSupplierProvider(configuredProvider);
}
