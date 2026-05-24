import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';

function isTravellandaAccessError(message: string) {
  return message.toLowerCase().includes('nonexistent ip address');
}

export async function POST(request: NextRequest) {
  try {
    const rateLimitResponse = checkRateLimit(request, {
      keyPrefix: 'supplier:travellanda',
      limit: 30,
      windowMs: 60_000,
    });

    if (rateLimitResponse) return rateLimitResponse;

    const body = await request.json();
    
    const API_BASE_URL = process.env.NEXT_PUBLIC_TRAVELLANDA_API_URL || 'http://xmldemo.travellanda.com/apiv2';
    const USERNAME = process.env.TRAVELLANDA_USERNAME;
    const PASSWORD = process.env.TRAVELLANDA_PASSWORD;

    if (!USERNAME || !PASSWORD) {
      throw new Error('Travellanda credentials not configured');
    }

    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Username': USERNAME,
        'Password': PASSWORD,
        'Accept-Encoding': 'gzip',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Check for API errors
    if (data.Error) {
      throw new Error(`Travellanda API Error: ${data.Error.Message}`);
    }

    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const isAccessError = isTravellandaAccessError(message);

    return NextResponse.json(
      {
        error: message,
        message: isAccessError
          ? 'Travellanda access is not available for the current server IP. Please whitelist this IP in Travellanda before using live supplier data.'
          : message,
        code: isAccessError ? 'TRAVELLANDA_IP_NOT_WHITELISTED' : 'TRAVELLANDA_PROXY_ERROR',
      },
      { status: isAccessError ? 403 : 500 }
    );
  }
}
