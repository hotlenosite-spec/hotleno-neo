import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { AuthenticatedRequest } from '@/lib/auth';

export const POST = withAuth(async (_req: AuthenticatedRequest) => {
  // In a stateless JWT system, logout is handled client-side
  // by removing the token from storage
  // This endpoint can be used for server-side logout tracking if needed
  
  return NextResponse.json({
    success: true,
    message: 'Logout successful',
  });
});
