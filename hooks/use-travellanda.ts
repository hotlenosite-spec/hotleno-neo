import { useState, useCallback } from 'react';
import { travellandaClient } from '@/lib/providers/travellanda';

interface UseTravellandaReturn {
  loading: boolean;
  error: string | null;
  data: unknown | null;
  execute: (requestType: string, params?: Record<string, unknown>) => Promise<unknown>;
  reset: () => void;
}

export function useTravellanda(): UseTravellandaReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<unknown | null>(null);

  const execute = useCallback(async (requestType: string, params: Record<string, unknown> = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const requestBody = { RequestType: requestType, ...params };
      const result = await travellandaClient.request(requestBody);
      
      setData(result);
      return result;
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown API error';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    loading,
    error,
    data,
    execute,
    reset,
  };
}