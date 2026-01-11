/**
 * DebugPanel Component
 * 
 * Floating debug panel showing service status indicators.
 * Can be expanded to show more details.
 */

import { useState } from 'react';
import { useServiceStatus } from '../hooks/useServiceStatus';
import type { ServiceStatus } from '../types';

const StatusDot = ({ status }: { status: ServiceStatus['status'] }) => {
  const statusClasses: Record<string, string> = {
    healthy: 'status-healthy',
    degraded: 'status-degraded',
    unhealthy: 'status-unhealthy',
    unconfigured: 'status-unknown',
    unknown: 'status-unknown',
  };

  return <span className={`status-dot ${statusClasses[status] || 'status-unknown'}`} />;
};

export function DebugPanel() {
  const { status, isLoading, refresh } = useServiceStatus();
  const [isExpanded, setIsExpanded] = useState(false);

  const overallStatus = status?.overall ?? 'unknown';
  const overallColor =
    overallStatus === 'healthy'
      ? 'border-success'
      : overallStatus === 'degraded'
      ? 'border-warning'
      : 'border-error';

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fadeIn">
      {/* Collapsed view - just status dots */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`glass rounded-xl p-3 border-2 ${overallColor} hover:shadow-glow-sm transition-all duration-300`}
        title="Service Status"
      >
        {isLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary-400 rounded-full animate-pulse" />
            <span className="text-xs text-surface-300">Loading...</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5" title="Backend">
              <StatusDot status={status?.services.backend.status ?? 'unknown'} />
              <span className="text-xs text-surface-300">BE</span>
            </div>
            <div className="flex items-center gap-1.5" title="SFU (LiveKit)">
              <StatusDot status={status?.services.sfu.status ?? 'unknown'} />
              <span className="text-xs text-surface-300">SFU</span>
            </div>
            <div className="flex items-center gap-1.5" title="Debug Service">
              <StatusDot status={status?.services.debug.status ?? 'unknown'} />
              <span className="text-xs text-surface-300">DBG</span>
            </div>
          </div>
        )}
      </button>

      {/* Expanded view */}
      {isExpanded && status && (
        <div className="glass rounded-xl p-4 mt-2 min-w-72 animate-slideIn border border-surface-600">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-display font-semibold text-surface-100">
              Service Status
            </h3>
            <button
              onClick={refresh}
              className="text-xs text-primary-400 hover:text-primary-300"
            >
              Refresh
            </button>
          </div>

          {/* Backend */}
          <ServiceRow
            name="Backend"
            status={status.services.backend}
          />

          {/* SFU */}
          <ServiceRow
            name="SFU (LiveKit)"
            status={status.services.sfu}
          />

          {/* Debug */}
          <ServiceRow
            name="Debug Service"
            status={status.services.debug}
          />

          {/* Logs link */}
          <div className="mt-3 pt-3 border-t border-surface-600">
            <a
              href="/logs"
              className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1"
            >
              <span>View Full Logs</span>
              <span>→</span>
            </a>
          </div>

          {/* Last updated */}
          <div className="mt-2 text-xs text-surface-400">
            Updated: {new Date(status.timestamp).toLocaleTimeString()}
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceRow({ name, status }: { name: string; status: ServiceStatus }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-surface-700 last:border-0">
      <div className="flex items-center gap-2">
        <StatusDot status={status.status} />
        <span className="text-sm text-surface-200">{name}</span>
      </div>
      <div className="text-right">
        <div className="text-xs text-surface-300 capitalize">{status.status}</div>
        {status.latency_ms > 0 && (
          <div className="text-xs text-surface-400">{status.latency_ms}ms</div>
        )}
      </div>
    </div>
  );
}
