import { NextRequest, NextResponse } from "next/server";

interface TravellandaError {
  Message?: string;
}

interface Country {
  CountryCode: string;
  CountryName: string;
}

interface City {
  CityId: number;
  CityName: string;
}

interface HotelOption {
  Price: number;
  Taxes: number;
}

interface Hotel {
  HotelName: string;
  Options?: HotelOption[];
}

interface CountriesResult {
  Countries?: Country[];
  Error?: TravellandaError;
}

interface CitiesResult {
  Countries?: Array<{
    Cities?: City[];
  }>;
  Error?: TravellandaError;
}

interface SearchResult {
  Hotels?: Hotel[];
  Error?: TravellandaError;
}

async function travellandaRequest<T>(body: Record<string, unknown>): Promise<T> {
  const apiBaseUrl =
    process.env.NEXT_PUBLIC_TRAVELLANDA_API_URL ||
    "http://xmldemo.travellanda.com/apiv2";
  const username = process.env.TRAVELLANDA_USERNAME;
  const password = process.env.TRAVELLANDA_PASSWORD;

  if (!username || !password) {
    throw new Error("Travellanda credentials not configured");
  }

  const response = await fetch(apiBaseUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Username: username,
      Password: password,
      "Accept-Encoding": "gzip",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function GET(_req: NextRequest) {
  try {
    console.log("Testing Travellanda API connection...");

    // Test 1: Get Countries
    console.log("Testing GetCountries...");
    const countriesResult = await travellandaRequest<CountriesResult>({
      RequestType: "GetCountries",
    });
    console.log("Countries result:", countriesResult);

    // Test 2: Get Cities for a sample country (e.g., GB - United Kingdom)
    console.log("Testing GetCities for GB...");
    const citiesResult = await travellandaRequest<CitiesResult>({
      RequestType: "GetCities",
      CountryCode: "GB",
    });
    console.log("Cities result:", citiesResult);

    // Test 3: Hotel Search for London
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);

    console.log("Testing HotelSearch for London...");
    const searchResult = await travellandaRequest<SearchResult>({
      RequestType: "HotelSearch",
      CheckInDate: tomorrow.toISOString().split("T")[0],
      CheckOutDate: dayAfter.toISOString().split("T")[0],
      CityIds: [23316], // London
      Rooms: [{ NumAdults: 2, Children: [] }],
      Nationality: "GB",
      Currency: "USD",
      AvailableOnly: 1,
    });
    console.log("Hotel search result:", searchResult);

    // Check for errors
    if (searchResult.Error) {
      const errorMessage = searchResult.Error.Message || JSON.stringify(searchResult.Error);
      throw new Error(`API Error: ${errorMessage}`);
    }

    // Check hotel data structure
    const sampleHotel = searchResult.Hotels?.[0];
    const priceInfo = sampleHotel?.Options?.[0];

    return NextResponse.json({
      success: true,
      tests: {
        countries: {
          success: !!countriesResult.Countries,
          count: countriesResult.Countries?.length || 0,
        },
        cities: {
          success: !!citiesResult.Countries?.[0]?.Cities,
          count: citiesResult.Countries?.[0]?.Cities?.length || 0,
        },
        hotelSearch: {
          success: !!searchResult.Hotels,
          hotelCount: searchResult.Hotels?.length || 0,
          sampleHotel: sampleHotel
            ? {
                name: sampleHotel.HotelName,
                hasOptions: !!sampleHotel.Options?.length,
                optionsCount: sampleHotel.Options?.length || 0,
                sampleOption: priceInfo
                  ? {
                      price: priceInfo.Price,
                      taxes: priceInfo.Taxes,
                      priceType: typeof priceInfo.Price,
                      taxesType: typeof priceInfo.Taxes,
                    }
                  : null,
              }
            : null,
        },
      },
      message: "Travellanda API test completed",
    });
  } catch (error) {
    console.error("Travellanda API test error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 },
    );
  }
}
