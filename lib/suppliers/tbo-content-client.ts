type TboContentStatus = {
  code?: string;
  description?: string;
};

export type TboDestinationCity = {
  cityCode: string;
  cityName: string;
  countryCode: string;
  countryName: string;
};

export type TboHotelCodeSummary = {
  hotelCode: string;
  hotelName?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  starRating?: string;
  countryName?: string;
  cityName?: string;
  description?: string;
  facilities?: string[];
};

export type TboHotelContent = {
  hotelCode: string;
  hotelName: string;
  description?: string;
  address?: string;
  cityName?: string;
  countryName?: string;
  images: Array<{ url: string; description?: string }>;
  facilities: string[];
  rating?: string;
  latitude?: number;
  longitude?: number;
};

const SOAP_NAMESPACE = "http://TekTravel/HotelBookingApi";
const DEFAULT_CONTENT_SERVICE_PATH = "/hotelapi_v7/hotelservice.svc";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function decodeXml(value: string) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

function getTagText(xml: string, tagName: string) {
  const match = xml.match(new RegExp(`<[^:>]*:?${tagName}\\b[^>]*>([\\s\\S]*?)<\\/[^:>]*:?${tagName}>`, "i"));
  return match ? decodeXml(match[1].replace(/<[^>]+>/g, " ")) : "";
}

function getTagTexts(xml: string, tagName: string) {
  const matches = xml.matchAll(new RegExp(`<[^:>]*:?${tagName}\\b[^>]*>([\\s\\S]*?)<\\/[^:>]*:?${tagName}>`, "gi"));
  return Array.from(matches)
    .map((match) => decodeXml(match[1].replace(/<[^>]+>/g, " ")))
    .filter(Boolean);
}

function getAttribute(block: string, attributeName: string) {
  const match = block.match(new RegExp(`${attributeName}="([^"]*)"`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function toNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseMapCoordinates(value: string) {
  const [latitude, longitude] = value.split(/[|,]/).map((part) => Number(part.trim()));
  return {
    latitude: Number.isFinite(latitude) ? latitude : undefined,
    longitude: Number.isFinite(longitude) ? longitude : undefined,
  };
}

function getConfig() {
  const missing = ["TBO_BASE_URL", "TBO_USERNAME", "TBO_PASSWORD"].filter(
    (key) => !process.env[key],
  );
  if (missing.length > 0) {
    throw new Error(`TBO content is not configured: ${missing.join(", ")}`);
  }

  const baseUrl = String(process.env.TBO_BASE_URL).replace(/\/+$/, "");
  const serviceUrl =
    process.env.TBO_CONTENT_SERVICE_URL ||
    `${new URL(baseUrl).origin}${DEFAULT_CONTENT_SERVICE_PATH}`;

  return {
    serviceUrl,
    username: String(process.env.TBO_USERNAME),
    password: String(process.env.TBO_PASSWORD),
  };
}

function soapEnvelope(action: string, body: string) {
  const config = getConfig();
  return {
    serviceUrl: config.serviceUrl,
    body: `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope" xmlns:hot="${SOAP_NAMESPACE}">
  <soap:Header xmlns:wsa="http://www.w3.org/2005/08/addressing">
    <hot:Credentials UserName="${escapeXml(config.username)}" Password="${escapeXml(config.password)}" />
    <wsa:Action>${SOAP_NAMESPACE}/${action}</wsa:Action>
    <wsa:To>${escapeXml(config.serviceUrl)}</wsa:To>
  </soap:Header>
  <soap:Body>
    ${body}
  </soap:Body>
</soap:Envelope>`,
  };
}

function compactText(value: string) {
  return value.replace(/\s+/g, " ").slice(0, 700);
}

function logContentSync(params: {
  action: string;
  endpoint: string;
  status?: number;
  count?: number;
  error?: string;
}) {
  console.info(
    "[TBO Content Sync]",
    JSON.stringify({
      action: params.action,
      endpoint: params.endpoint,
      status: params.status ?? null,
      count: params.count ?? 0,
      error: params.error ?? null,
    }),
  );
}

function parseStatus(xml: string): TboContentStatus {
  return {
    code: getTagText(xml, "StatusCode") || getTagText(xml, "Code"),
    description: getTagText(xml, "Description"),
  };
}

function assertSuccess(xml: string, action: string) {
  const status = parseStatus(xml);
  const normalizedCode = String(status.code || "").trim();
  if (normalizedCode && !["01", "200"].includes(normalizedCode)) {
    throw new Error(status.description || `${action} failed`);
  }
}

async function requestSoap(action: string, body: string) {
  const envelope = soapEnvelope(action, body);
  let response: Response;
  let text = "";
  try {
    response = await fetch(envelope.serviceUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/soap+xml; charset=utf-8",
        Accept: "application/xml,text/xml",
      },
      body: envelope.body,
    });
    text = await response.text();
  } catch (error) {
    const message = error instanceof Error ? error.message : "TBO content request failed";
    logContentSync({ action, endpoint: envelope.serviceUrl, error: message });
    throw error;
  }

  logContentSync({
    action,
    endpoint: envelope.serviceUrl,
    status: response.status,
    error: response.ok ? undefined : compactText(text),
  });

  if (!response.ok) {
    throw new Error(`TBO content ${action} failed with HTTP ${response.status}`);
  }
  assertSuccess(text, action);
  return text;
}

export class TboContentClient {
  async getDestinationCities(countryCode: string): Promise<TboDestinationCity[]> {
    const xml = await requestSoap(
      "DestinationCityList",
      `<hot:DestinationCityListRequest>
        <hot:CountryCode>${escapeXml(countryCode.toUpperCase())}</hot:CountryCode>
        <hot:ReturnNewCityCodes>true</hot:ReturnNewCityCodes>
      </hot:DestinationCityListRequest>`,
    );

    return Array.from(xml.matchAll(/<[^:>]*:?City\b[^>]*\/?>/gi)).map((match) => ({
      cityCode: getAttribute(match[0], "CityCode"),
      cityName: getAttribute(match[0], "CityName"),
      countryCode: getAttribute(match[0], "CountryCode"),
      countryName: getAttribute(match[0], "CountryName"),
    })).filter((city) => city.cityCode && city.cityName);
  }

  async getGiataHotelCodeList(
    cityCode: string,
    isDetailedResponse = false,
  ): Promise<TboHotelCodeSummary[]> {
    const xml = await requestSoap(
      "GiataHotelCodes",
      `<hot:GiataHotelCodesRequest>
        <hot:CityCode>${escapeXml(cityCode)}</hot:CityCode>
        <hot:IsDetailedResponse>${isDetailedResponse ? "true" : "false"}</hot:IsDetailedResponse>
      </hot:GiataHotelCodesRequest>`,
    );

    return Array.from(xml.matchAll(/<[^:>]*:?Hotel\b[^>]*\/?>/gi))
      .map((match) => ({
        hotelCode: getAttribute(match[0], "HotelCode"),
        hotelName: getAttribute(match[0], "HotelName"),
        address: getAttribute(match[0], "HotelAddress") || getAttribute(match[0], "Address"),
        latitude: toNumber(getAttribute(match[0], "Latitude")),
        longitude: toNumber(getAttribute(match[0], "Longitude")),
        starRating: getAttribute(match[0], "StarRating") || getAttribute(match[0], "HotelRating"),
        countryName: getAttribute(match[0], "CountryName"),
        cityName: getAttribute(match[0], "CityName"),
      }))
      .filter((hotel) => hotel.hotelCode);
  }

  async getHotelDetails(hotelCode: string): Promise<TboHotelContent> {
    const xml = await requestSoap(
      "HotelDetails",
      `<hot:HotelDetailsRequest>
        <hot:HotelCode>${escapeXml(hotelCode)}</hot:HotelCode>
      </hot:HotelDetailsRequest>`,
    );

    const hotelBlock =
      xml.match(/<[^:>]*:?HotelDetails\b[^>]*>[\s\S]*?<\/[^:>]*:?HotelDetails>/i)?.[0] ||
      xml;
    const map = getTagText(hotelBlock, "Map");
    const coordinates = parseMapCoordinates(map);
    const images = [
      getTagText(hotelBlock, "Image"),
      ...getTagTexts(hotelBlock, "ImageUrl"),
    ]
      .filter(Boolean)
      .map((url) => ({ url }));
    const facilities = [
      ...getTagTexts(hotelBlock, "HotelFacility"),
      ...getTagTexts(hotelBlock, "HotelFacilites"),
      ...getTagTexts(hotelBlock, "HotelFacilities"),
    ].filter(Boolean);
    const hotelName =
      getAttribute(hotelBlock, "HotelName") ||
      getTagText(hotelBlock, "HotelName") ||
      `TBO Hotel ${hotelCode}`;

    return {
      hotelCode,
      hotelName,
      description: getTagText(hotelBlock, "Description"),
      address: getTagText(hotelBlock, "Address") || getTagText(hotelBlock, "AddressLine1"),
      cityName: getTagText(hotelBlock, "CityName"),
      countryName: getTagText(hotelBlock, "CountryName"),
      images,
      facilities,
      rating: getAttribute(hotelBlock, "HotelRating") || getTagText(hotelBlock, "HotelRating"),
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    };
  }
}
