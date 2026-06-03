import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";
import type { HotelbedsSearchSuggestion } from "@/types/hotelbeds-content";

const HOTEL_COLLECTIONS = [
  "hotelbeds_hotels",
  "hotelbedsHotels",
  "hotelbeds_contents",
  "hotelbedsContents",
];

const DESTINATION_COLLECTIONS = [
  "hotelbeds_destinations",
  "hotelbedsDestinations",
];

const COUNTRY_COLLECTIONS = ["hotelbeds_countries", "hotelbedsCountries"];
const ZONE_COLLECTIONS = ["hotelbeds_zones", "hotelbedsZones"];
const HOTEL_CODE_LIMIT = 200;

type StoredHotelbedsDocument = Record<string, unknown>;

function asString(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function getContentText(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (
    value &&
    typeof value === "object" &&
    "content" in value &&
    typeof value.content === "string"
  ) {
    return value.content.trim();
  }

  return "";
}

function getHotelName(document: StoredHotelbedsDocument) {
  return (
    getContentText(document.name) ||
    asString(document.hotelName) ||
    asString(document.HotelName)
  );
}

function getDestinationName(document: StoredHotelbedsDocument) {
  return (
    getContentText(document.name) ||
    asString(document.destinationName) ||
    asString(document.name) ||
    asString(document.Name)
  );
}

function getCountryName(document: StoredHotelbedsDocument) {
  return (
    getContentText(document.name) ||
    asString(document.countryName) ||
    asString(document.name) ||
    asString(document.Name)
  );
}

function getZoneName(document: StoredHotelbedsDocument) {
  return (
    getContentText(document.name) ||
    asString(document.zoneName) ||
    asString(document.name) ||
    asString(document.Name)
  );
}

function getHotelCode(document: StoredHotelbedsDocument) {
  return asString(document.code ?? document.hotelCode ?? document.HotelCode);
}

function getDestinationCode(document: StoredHotelbedsDocument) {
  return asString(
    document.destinationCode ??
      document.code ??
      document.DestinationCode ??
      document.destination,
  );
}

function getCountryCode(document: StoredHotelbedsDocument) {
  return asString(
    document.countryCode ?? document.isoCode ?? document.code ?? document.CountryCode,
  );
}

function getZoneCode(document: StoredHotelbedsDocument) {
  return asString(document.zoneCode ?? document.code ?? document.ZoneCode);
}

function createSuggestionId(suggestion: HotelbedsSearchSuggestion) {
  return [
    suggestion.type,
    suggestion.hotelCode,
    suggestion.destinationCode,
    suggestion.countryCode,
    suggestion.zoneCode,
    suggestion.label,
  ]
    .filter(Boolean)
    .join(":");
}

function dedupeSuggestions(suggestions: HotelbedsSearchSuggestion[]) {
  const seen = new Set<string>();

  return suggestions.filter((suggestion) => {
    const id = createSuggestionId(suggestion);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function isHotelbedsSearchSuggestion(
  suggestion: HotelbedsSearchSuggestion | null,
): suggestion is HotelbedsSearchSuggestion {
  return Boolean(suggestion);
}

function buildSearchFilter(fields: string[], query: string) {
  const expression = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");

  return {
    $or: fields.map((field) => ({
      [field]: expression,
    })),
  };
}

async function findAcrossCollections(
  collectionNames: string[],
  filter: Record<string, unknown>,
  limit: number,
) {
  await dbConnect();
  const db = mongoose.connection.db;
  if (!db) return [];

  const documents: StoredHotelbedsDocument[] = [];

  for (const collectionName of collectionNames) {
    try {
      const collection = db.collection(collectionName);
      const results = await collection.find(filter).limit(limit).toArray();
      documents.push(...(results as StoredHotelbedsDocument[]));
    } catch {
      // Missing optional collections should not break autocomplete.
    }
  }

  return documents.slice(0, limit);
}

function hotelToSuggestion(document: StoredHotelbedsDocument) {
  const label = getHotelName(document);
  const hotelCode = getHotelCode(document);
  if (!label || !hotelCode) return null;

  return {
    label,
    value: hotelCode,
    type: "hotel",
    hotelCode,
    destinationCode: getDestinationCode(document) || undefined,
    countryCode: getCountryCode(document) || undefined,
    zoneCode: getZoneCode(document) || undefined,
  } satisfies HotelbedsSearchSuggestion;
}

function destinationToSuggestion(document: StoredHotelbedsDocument) {
  const label = getDestinationName(document);
  const destinationCode = getDestinationCode(document);
  if (!label || !destinationCode) return null;

  return {
    label,
    value: destinationCode,
    type: "destination",
    destinationCode,
    countryCode: getCountryCode(document) || undefined,
  } satisfies HotelbedsSearchSuggestion;
}

function countryToSuggestion(document: StoredHotelbedsDocument) {
  const label = getCountryName(document);
  const countryCode = getCountryCode(document);
  if (!label || !countryCode) return null;

  return {
    label,
    value: countryCode,
    type: "country",
    countryCode,
  } satisfies HotelbedsSearchSuggestion;
}

function zoneToSuggestion(document: StoredHotelbedsDocument) {
  const label = getZoneName(document);
  const zoneCode = getZoneCode(document);
  if (!label || !zoneCode) return null;

  return {
    label,
    value: zoneCode,
    type: "zone",
    zoneCode,
    destinationCode: getDestinationCode(document) || undefined,
    countryCode: getCountryCode(document) || undefined,
  } satisfies HotelbedsSearchSuggestion;
}

export async function searchStoredHotelbedsContent(query: string, limit = 12) {
  const term = query.trim();
  if (term.length < 2) return [];

  const perTypeLimit = Math.max(5, limit);
  const [hotels, destinations, countries, zones] = await Promise.all([
    findAcrossCollections(
      HOTEL_COLLECTIONS,
      buildSearchFilter(["name.content", "name", "hotelName", "HotelName"], term),
      perTypeLimit,
    ),
    findAcrossCollections(
      DESTINATION_COLLECTIONS,
      buildSearchFilter(["name.content", "name", "destinationName"], term),
      perTypeLimit,
    ),
    findAcrossCollections(
      COUNTRY_COLLECTIONS,
      buildSearchFilter(["name.content", "name", "countryName"], term),
      perTypeLimit,
    ),
    findAcrossCollections(
      ZONE_COLLECTIONS,
      buildSearchFilter(["name.content", "name", "zoneName"], term),
      perTypeLimit,
    ),
  ]);

  const suggestions: Array<HotelbedsSearchSuggestion | null> = [
      ...hotels.map(hotelToSuggestion),
      ...destinations.map(destinationToSuggestion),
      ...countries.map(countryToSuggestion),
      ...zones.map(zoneToSuggestion),
    ];

  return dedupeSuggestions(suggestions.filter(isHotelbedsSearchSuggestion)).slice(
    0,
    limit,
  );
}

async function findHotelCodesByFilter(filter: Record<string, unknown>) {
  const hotels = await findAcrossCollections(
    HOTEL_COLLECTIONS,
    filter,
    HOTEL_CODE_LIMIT,
  );

  return hotels.map(getHotelCode).filter(Boolean).slice(0, HOTEL_CODE_LIMIT);
}

export function getStoredHotelCodesForCountry(countryCode: string) {
  return findHotelCodesByFilter({
    $or: [{ countryCode }, { isoCode: countryCode }, { CountryCode: countryCode }],
  });
}

export function getStoredHotelCodesForZone(zoneCode: string) {
  return findHotelCodesByFilter({
    $or: [{ zoneCode }, { ZoneCode: zoneCode }, { "zone.code": zoneCode }],
  });
}
