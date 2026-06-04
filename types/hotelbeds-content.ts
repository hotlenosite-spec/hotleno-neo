export type HotelbedsSearchSuggestionType =
  | "hotel"
  | "destination"
  | "country"
  | "zone";

export interface HotelbedsSearchSuggestion {
  label: string;
  value: string;
  type: HotelbedsSearchSuggestionType;
  hotelCode?: string;
  destinationCode?: string;
  cityCode?: string;
  countryCode?: string;
  zoneCode?: string;
}
