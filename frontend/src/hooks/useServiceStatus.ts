/**
 * useServiceStatus Hook
 * 
 * Polls service status and provides real-time health information.
 */

import { useState, useEffect, useCallback } from 'react';
import type { OverallStatus, ServiceStatus } from '../types';
import { api } from '../services/api';
import { debugLogger } from '../services/debugLogger';

const POLL_INTERVAL = 5000; // 5 seconds

interface UseServiceStatusReturn {
  status: OverallStatus | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

const DEFAULT_STATUS: ServiceStatus = {
  status: 'unknown',
  latency_ms: 0,
  message: 'Checking...',
};

export function useServiceStatus(autoRefresh = true): UseServiceStatusReturn {
  const [status, setStatus] = useState<OverallStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      const newStatus = await api.getStatus();
      setStatus(newStatus);
      setError(null);
      
      debugLogger.debug('frontend', 'Service status updated', {
        overall: newStatus.overall,
        backend: newStatus.services.backend.status,
        sfu: newStatus.services.sfu.status,
        debug: newStatus.services.debug.status,
      });
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      
      // Set degraded status when we can't reach the backend
      setStatus({
        overall: 'unhealthy',
        timestamp: new Date().toISOString(),
        services: {
          backend: { status: 'unhealthy', latency_ms: 0, message: errorObj.message },
          sfu: DEFAULT_STATUS,
          debug: DEFAULT_STATUS,
        },
      });
      
      debugLogger.error('frontend', 'Failed to fetch service status', {
        error: errorObj.message,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    if (autoRefresh) {
      const interval = setInterval(refresh, POLL_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [refresh, autoRefresh]);

  return { status, isLoading, error, refresh };
}
