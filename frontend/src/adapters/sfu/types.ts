/**
 * SFU Adapter Interface
 * 
 * Abstraction layer for SFU providers.
 * Allows swapping LiveKit for any other SFU implementation.
 */

import type { SFUParticipant } from '../../types';

export interface SFUConfig {
  url: string;
  token: string;
  roomId: string;
  participantName: string;
}

export interface SFUCallbacks {
  onConnected?: () => void;
  onDisconnected?: (reason?: string) => void;
  onReconnecting?: () => void;
  onReconnected?: () => void;
  onError?: (error: Error) => void;
  onParticipantJoined?: (participant: SFUParticipant) => void;
  onParticipantLeft?: (participantId: string) => void;
  onParticipantUpdated?: (participant: SFUParticipant) => void;
  onSpeakingChanged?: (participantId: string, isSpeaking: boolean) => void;
}

export type ConnectionState = 'connected' | 'connecting' | 'reconnecting' | 'disconnected';

/**
 * SFU Adapter interface.
 * 
 * Implement this interface to support different SFU providers.
 */
export interface SFUAdapter {
  /**
   * Connect to the SFU server and join a room.
   */
  connect(config: SFUConfig, callbacks: SFUCallbacks): Promise<void>;

  /**
   * Disconnect from the SFU server.
   */
  disconnect(): Promise<void>;

  /**
   * Enable/disable local audio.
   */
  setAudioEnabled(enabled: boolean): Promise<void>;

  /**
   * Enable/disable local video.
   */
  setVideoEnabled(enabled: boolean): Promise<void>;

  /**
   * Get the local participant.
   */
  getLocalParticipant(): SFUParticipant | null;

  /**
   * Get all remote participants.
   */
  getRemoteParticipants(): SFUParticipant[];

  /**
   * Check if connected.
   */
  isConnected(): boolean;

  /**
   * Get current room ID.
   */
  getRoomId(): string | null;

  /**
   * Get current connection state.
   */
  getConnectionState(): ConnectionState;
}

/**
 * Factory function type for creating SFU adapters.
 */
export type SFUAdapterFactory = () => SFUAdapter;
