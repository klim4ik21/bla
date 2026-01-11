/**
 * Core type definitions for VideoRooms
 */

// =============================================================================
// Room Types
// =============================================================================

export interface Room {
  id: string;
  created_at: string;
  participant_count: number;
  participants: Participant[];
}

export interface Participant {
  id: string;
  name: string;
  joined_at: string;
}

// =============================================================================
// API Response Types
// =============================================================================

export interface CreateRoomResponse {
  room_id: string;
  participant_id: string;
  token: string;
  livekit_url: string;
}

export interface JoinRoomResponse {
  participant_id: string;
  token: string;
  livekit_url: string;
}

export interface RoomListResponse {
  rooms: Room[];
  count: number;
}

export interface RoomDetailsResponse {
  room: Room;
}

// =============================================================================
// Service Status Types
// =============================================================================

export interface ServiceStatus {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unconfigured' | 'unknown';
  latency_ms: number;
  message?: string;
  details?: Record<string, unknown>;
}

export interface OverallStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    backend: ServiceStatus;
    sfu: ServiceStatus;
    debug: ServiceStatus;
  };
}

// =============================================================================
// Log Types
// =============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type LogService = 'frontend' | 'backend' | 'sfu' | 'debug';

export interface LogEntry {
  id?: string;
  timestamp: string;
  service: LogService;
  level: LogLevel;
  message: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// SFU Adapter Types
// =============================================================================

export interface SFUConnectionConfig {
  url: string;
  token: string;
  roomId: string;
  participantName: string;
}

export interface SFUParticipant {
  id: string;
  name: string;
  isSpeaking: boolean;
  isMuted: boolean;
  isVideoEnabled: boolean;
  audioTrack?: MediaStreamTrack;
  videoTrack?: MediaStreamTrack;
}

export interface SFURoomState {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  localParticipant: SFUParticipant | null;
  participants: SFUParticipant[];
}

// =============================================================================
// Component Props Types
// =============================================================================

export interface VideoTileProps {
  participant: SFUParticipant;
  isLocal?: boolean;
  isSpeaking?: boolean;
}

export interface ControlBarProps {
  isMuted: boolean;
  isVideoEnabled: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onLeave: () => void;
}
