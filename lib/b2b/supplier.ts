import { createSupplierProvider, type SupplierProviderName } from "@/lib/suppliers";

const B2B_SUPPLIER_NAMES: SupplierProviderName[] = [
  "hotelbeds",
  "tbo",
  "travellanda",
  "mock",
];

export function getB2BMockSupplierProvider() {
  const providerName =
    (process.env.B2B_SUPPLIER_PROVIDER as SupplierProviderName | undefined) ||
    "hotelbeds";

  if (!B2B_SUPPLIER_NAMES.includes(providerName)) {
    throw new Error(`Unsupported B2B supplier provider: ${providerName}`);
  }

  if (providerName === "mock" && process.env.NODE_ENV === "production") {
    throw new Error("B2B mock provider cannot be used in production");
  }

  return createSupplierProvider(providerName);
}
