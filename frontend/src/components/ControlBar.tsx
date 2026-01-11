/**
 * ControlBar Component
 * 
 * Video call controls: mute, video, screen share, settings, leave.
 */

import { useState } from 'react';

interface ControlBarProps {
  isMuted: boolean;
  isVideoEnabled: boolean;
  connectionState?: 'connected' | 'connecting' | 'reconnecting' | 'disconnected';
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onLeave: () => void;
}

export function ControlBar({
  isMuted,
  isVideoEnabled,
  connectionState = 'connected',
  onToggleMute,
  onToggleVideo,
  onLeave,
}: ControlBarProps) {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const isReconnecting = connectionState === 'reconnecting';
  const isDisconnected = connectionState === 'disconnected';

  return (
    <div className="glass rounded-2xl p-4 flex items-center justify-center gap-3">
      {/* Connection status indicator */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-800/50 mr-2">
        <div className={`w-2 h-2 rounded-full ${getConnectionColor(connectionState)}`} />
        <span className="text-xs text-surface-300 capitalize">
          {connectionState === 'connected' ? 'Live' : connectionState}
        </span>
      </div>

      {/* Mute button */}
      <div className="relative">
        <ControlButton
          onClick={onToggleMute}
          active={!isMuted}
          activeColor="bg-surface-600 hover:bg-surface-500"
          inactiveColor="bg-red-600 hover:bg-red-500"
          disabled={isDisconnected}
          onMouseEnter={() => setShowTooltip('mic')}
          onMouseLeave={() => setShowTooltip(null)}
        >
          {isMuted ? <MicOffIcon /> : <MicOnIcon />}
        </ControlButton>
        {showTooltip === 'mic' && (
          <Tooltip text={isMuted ? 'Unmute (M)' : 'Mute (M)'} />
        )}
      </div>

      {/* Video button */}
      <div className="relative">
        <ControlButton
          onClick={onToggleVideo}
          active={isVideoEnabled}
          activeColor="bg-surface-600 hover:bg-surface-500"
          inactiveColor="bg-red-600 hover:bg-red-500"
          disabled={isDisconnected}
          onMouseEnter={() => setShowTooltip('video')}
          onMouseLeave={() => setShowTooltip(null)}
        >
          {isVideoEnabled ? <VideoOnIcon /> : <VideoOffIcon />}
        </ControlButton>
        {showTooltip === 'video' && (
          <Tooltip text={isVideoEnabled ? 'Stop Video (V)' : 'Start Video (V)'} />
        )}
      </div>

      {/* Divider */}
      <div className="w-px h-8 bg-surface-600 mx-2" />

      {/* Leave button */}
      <div className="relative">
        <ControlButton
          onClick={onLeave}
          active={false}
          activeColor="bg-red-600"
          inactiveColor="bg-red-600 hover:bg-red-500"
          danger
          onMouseEnter={() => setShowTooltip('leave')}
          onMouseLeave={() => setShowTooltip(null)}
        >
          <LeaveIcon />
        </ControlButton>
        {showTooltip === 'leave' && (
          <Tooltip text="Leave Room" />
        )}
      </div>

      {/* Reconnecting overlay */}
      {isReconnecting && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-900/50 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center gap-2 text-yellow-400">
            <LoadingSpinner />
            <span className="text-sm font-medium">Reconnecting...</span>
          </div>
        </div>
      )}
    </div>
  );
}

function getConnectionColor(state: string): string {
  switch (state) {
    case 'connected':
      return 'bg-green-500 animate-pulse';
    case 'connecting':
      return 'bg-yellow-500 animate-pulse';
    case 'reconnecting':
      return 'bg-orange-500 animate-pulse';
    case 'disconnected':
      return 'bg-red-500';
    default:
      return 'bg-surface-500';
  }
}

// Tooltip component
function Tooltip({ text }: { text: string }) {
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 text-xs font-medium text-white bg-surface-800 rounded-lg shadow-lg whitespace-nowrap z-50">
      {text}
      <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-surface-800" />
    </div>
  );
}

// Loading spinner
function LoadingSpinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

// Control button wrapper
interface ControlButtonProps {
  onClick: () => void;
  active: boolean;
  activeColor: string;
  inactiveColor: string;
  danger?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

function ControlButton({
  onClick,
  active,
  activeColor,
  inactiveColor,
  danger,
  disabled,
  children,
  onMouseEnter,
  onMouseLeave,
}: ControlButtonProps) {
  const bgClass = danger 
    ? 'bg-red-600 hover:bg-red-500' 
    : active 
    ? activeColor 
    : inactiveColor;
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`p-4 rounded-full ${bgClass} text-white transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
    >
      {children}
    </button>
  );
}

// Icons
function MicOnIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M3 3l18 18" />
    </svg>
  );
}

function VideoOnIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function VideoOffIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
    </svg>
  );
}

function LeaveIcon() {
  return (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}
