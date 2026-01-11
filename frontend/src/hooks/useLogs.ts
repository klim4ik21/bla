/**
 * useLogs Hook
 * 
 * Subscribes to debug logs and provides filtering capabilities.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import type { LogEntry, LogLevel, LogService } from '../types';
import { debugLogger } from '../services/debugLogger';

interface UseLogsOptions {
  maxLogs?: number;
  levelFilter?: LogLevel[];
  serviceFilter?: LogService[];
}

interface UseLogsReturn {
  logs: LogEntry[];
  filteredLogs: LogEntry[];
  levelFilter: LogLevel[];
  serviceFilter: LogService[];
  setLevelFilter: (levels: LogLevel[]) => void;
  setServiceFilter: (services: LogService[]) => void;
  clearLogs: () => void;
  isAutoScroll: boolean;
  setAutoScroll: (value: boolean) => void;
}

export function useLogs(options: UseLogsOptions = {}): UseLogsReturn {
  const { maxLogs = 500 } = options;
  
  const [logs, setLogs] = useState<LogEntry[]>(() => debugLogger.getLogs());
  const [levelFilter, setLevelFilter] = useState<LogLevel[]>(
    options.levelFilter ?? ['debug', 'info', 'warn', 'error']
  );
  const [serviceFilter, setServiceFilter] = useState<LogService[]>(
    options.serviceFilter ?? ['frontend', 'backend', 'sfu', 'debug']
  );
  const [isAutoScroll, setAutoScroll] = useState(true);

  // Subscribe to new logs
  useEffect(() => {
    const unsubscribe = debugLogger.subscribe((entry) => {
      setLogs((prev) => {
        const newLogs = [...prev, entry];
        if (newLogs.length > maxLogs) {
          return newLogs.slice(-maxLogs);
        }
        return newLogs;
      });
    });

    return unsubscribe;
  }, [maxLogs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    return logs.filter(
      (log) =>
        levelFilter.includes(log.level) && serviceFilter.includes(log.service)
    );
  }, [logs, levelFilter, serviceFilter]);

  const clearLogs = useCallback(() => {
    setLogs([]);
    debugLogger.clear();
  }, []);

  return {
    logs,
    filteredLogs,
    levelFilter,
    serviceFilter,
    setLevelFilter,
    setServiceFilter,
    clearLogs,
    isAutoScroll,
    setAutoScroll,
  };
}
