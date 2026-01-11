/**
 * LogsPage Component
 * 
 * Real-time debug logs viewer with filtering.
 */

import { useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useLogs } from '../hooks/useLogs';
import type { LogLevel, LogService, LogEntry } from '../types';

const LEVEL_COLORS: Record<LogLevel, string> = {
  debug: 'text-surface-400',
  info: 'text-primary-400',
  warn: 'text-warning',
  error: 'text-error',
};

const SERVICE_COLORS: Record<LogService, string> = {
  frontend: 'bg-success/20 text-success',
  backend: 'bg-purple-500/20 text-purple-400',
  sfu: 'bg-warning/20 text-warning',
  debug: 'bg-surface-600 text-surface-300',
};

export function LogsPage() {
  const {
    filteredLogs,
    levelFilter,
    serviceFilter,
    setLevelFilter,
    setServiceFilter,
    clearLogs,
    isAutoScroll,
    setAutoScroll,
  } = useLogs();

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isAutoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, isAutoScroll]);

  // Toggle level filter
  const toggleLevel = useCallback((level: LogLevel) => {
    setLevelFilter(
      levelFilter.includes(level)
        ? levelFilter.filter((l) => l !== level)
        : [...levelFilter, level]
    );
  }, [levelFilter, setLevelFilter]);

  // Toggle service filter
  const toggleService = useCallback((service: LogService) => {
    setServiceFilter(
      serviceFilter.includes(service)
        ? serviceFilter.filter((s) => s !== service)
        : [...serviceFilter, service]
    );
  }, [serviceFilter, setServiceFilter]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-surface-700 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/" className="font-display text-lg font-semibold text-surface-100">
            Video<span className="text-primary-400">Rooms</span>
          </Link>
          <span className="text-surface-500">/</span>
          <span className="text-surface-300">Debug Logs</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Auto-scroll toggle */}
          <label className="flex items-center gap-2 text-sm text-surface-300 cursor-pointer">
            <input
              type="checkbox"
              checked={isAutoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="w-4 h-4 rounded bg-surface-700 border-surface-600 text-primary-500 focus:ring-primary-500"
            />
            Auto-scroll
          </label>

          {/* Clear button */}
          <button
            onClick={clearLogs}
            className="px-3 py-1 rounded-lg bg-surface-700 text-surface-300 text-sm hover:bg-surface-600 transition-colors"
          >
            Clear
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="p-4 border-b border-surface-700 flex flex-wrap items-center gap-4">
        {/* Level filters */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-surface-400">Level:</span>
          {(['debug', 'info', 'warn', 'error'] as LogLevel[]).map((level) => (
            <FilterButton
              key={level}
              active={levelFilter.includes(level)}
              onClick={() => toggleLevel(level)}
              color={LEVEL_COLORS[level]}
            >
              {level}
            </FilterButton>
          ))}
        </div>

        {/* Service filters */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-surface-400">Service:</span>
          {(['frontend', 'backend', 'sfu', 'debug'] as LogService[]).map((service) => (
            <FilterButton
              key={service}
              active={serviceFilter.includes(service)}
              onClick={() => toggleService(service)}
              color="text-surface-100"
            >
              {service}
            </FilterButton>
          ))}
        </div>

        {/* Log count */}
        <div className="ml-auto text-sm text-surface-500">
          {filteredLogs.length} logs
        </div>
      </div>

      {/* Logs list */}
      <main className="flex-1 overflow-auto p-4 font-mono text-sm">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-surface-500">
            No logs to display
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log, index) => (
              <LogRow key={log.id || index} log={log} />
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </main>
    </div>
  );
}

// Filter button component
function FilterButton({
  active,
  onClick,
  color,
  children,
}: {
  active: boolean;
  onClick: () => void;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded text-xs transition-all ${
        active
          ? `${color} bg-surface-700`
          : 'text-surface-500 bg-surface-800 opacity-50'
      }`}
    >
      {children}
    </button>
  );
}

// Log row component
function LogRow({ log }: { log: LogEntry }) {
  const time = log.timestamp.split('T')[1]?.split('.')[0] || '';
  
  return (
    <div className="flex items-start gap-3 py-1 px-2 rounded hover:bg-surface-800/50 group">
      {/* Timestamp */}
      <span className="text-surface-500 whitespace-nowrap">{time}</span>
      
      {/* Service badge */}
      <span className={`px-2 py-0.5 rounded text-xs ${SERVICE_COLORS[log.service]}`}>
        {log.service.toUpperCase().padEnd(8)}
      </span>
      
      {/* Level */}
      <span className={`w-12 ${LEVEL_COLORS[log.level]}`}>
        [{log.level.toUpperCase()}]
      </span>
      
      {/* Message */}
      <span className="text-surface-200 flex-1">{log.message}</span>
      
      {/* Metadata (collapsed by default) */}
      {log.metadata && Object.keys(log.metadata).length > 0 && (
        <span className="text-surface-500 opacity-0 group-hover:opacity-100 transition-opacity text-xs">
          {JSON.stringify(log.metadata)}
        </span>
      )}
    </div>
  );
}
