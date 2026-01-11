/**
 * Debug Logger Service
 * 
 * Provides centralized logging with:
 * - Console output in development
 * - Log buffering for the logs page
 * - Optional sending to debug service
 */

import type { LogEntry, LogLevel, LogService } from '../types';

const MAX_BUFFER_SIZE = 500;
const DEBUG_API = import.meta.env.VITE_DEBUG_URL || '/debug';

type LogCallback = (entry: LogEntry) => void;

class DebugLogger {
  private buffer: LogEntry[] = [];
  private listeners: Set<LogCallback> = new Set();
  private sendToServer = true;

  constructor() {
    // Log initialization
    console.log('[DebugLogger] Initialized');
  }

  /**
   * Subscribe to new log entries.
   */
  subscribe(callback: LogCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Get all buffered logs.
   */
  getLogs(): LogEntry[] {
    return [...this.buffer];
  }

  /**
   * Clear log buffer.
   */
  clear(): void {
    this.buffer = [];
    this.notifyListeners({
      timestamp: new Date().toISOString(),
      service: 'frontend',
      level: 'info',
      message: 'Logs cleared',
    });
  }

  /**
   * Log a debug message.
   */
  debug(service: LogService, message: string, metadata?: Record<string, unknown>): void {
    this.log('debug', service, message, metadata);
  }

  /**
   * Log an info message.
   */
  info(service: LogService, message: string, metadata?: Record<string, unknown>): void {
    this.log('info', service, message, metadata);
  }

  /**
   * Log a warning message.
   */
  warn(service: LogService, message: string, metadata?: Record<string, unknown>): void {
    this.log('warn', service, message, metadata);
  }

  /**
   * Log an error message.
   */
  error(service: LogService, message: string, metadata?: Record<string, unknown>): void {
    this.log('error', service, message, metadata);
  }

  private log(
    level: LogLevel,
    service: LogService,
    message: string,
    metadata?: Record<string, unknown>
  ): void {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      service,
      level,
      message,
      metadata,
    };

    // Add to buffer
    this.buffer.push(entry);
    if (this.buffer.length > MAX_BUFFER_SIZE) {
      this.buffer.shift();
    }

    // Console output with styling
    this.consoleLog(entry);

    // Notify subscribers
    this.notifyListeners(entry);

    // Send to server (async, non-blocking)
    if (this.sendToServer) {
      this.sendLogToServer(entry).catch(() => {
        // Silently fail - don't want logging errors to cause more logs
      });
    }
  }

  private consoleLog(entry: LogEntry): void {
    const styles: Record<LogLevel, string> = {
      debug: 'color: #71718f',
      info: 'color: #0099e6',
      warn: 'color: #f59e0b',
      error: 'color: #ef4444; font-weight: bold',
    };

    const serviceColors: Record<LogService, string> = {
      frontend: '#10b981',
      backend: '#8b5cf6',
      sfu: '#f59e0b',
      debug: '#71718f',
    };

    const time = entry.timestamp.split('T')[1].split('.')[0];
    const prefix = `[${time}] [${entry.service.toUpperCase()}]`;

    console.log(
      `%c${prefix}%c ${entry.message}`,
      `color: ${serviceColors[entry.service]}; font-weight: bold`,
      styles[entry.level],
      entry.metadata || ''
    );
  }

  private notifyListeners(entry: LogEntry): void {
    this.listeners.forEach((callback) => {
      try {
        callback(entry);
      } catch {
        // Don't let listener errors break logging
      }
    });
  }

  private async sendLogToServer(entry: LogEntry): Promise<void> {
    try {
      await fetch(`${DEBUG_API}/api/logs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs: [entry] }),
      });
    } catch {
      // Silently fail
    }
  }
}

// Singleton instance
export const debugLogger = new DebugLogger();
