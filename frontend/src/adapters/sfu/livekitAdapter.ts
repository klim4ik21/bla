/**
 * LiveKit SFU Adapter
 * 
 * Implementation of the SFU adapter for LiveKit with enhanced stability.
 */

import {
  Room,
  RoomEvent,
  Track,
  Participant,
  LocalParticipant,
  RemoteParticipant,
  ConnectionState,
  createLocalTracks,
  DisconnectReason,
  LogLevel,
  setLogLevel,
} from 'livekit-client';
import type { SFUAdapter, SFUConfig, SFUCallbacks } from './types';
import type { SFUParticipant } from '../../types';
import { debugLogger } from '../../services/debugLogger';

// Enable detailed LiveKit logging in development
if (import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true') {
  setLogLevel(LogLevel.debug);
}

export class LiveKitAdapter implements SFUAdapter {
  private room: Room | null = null;
  private config: SFUConfig | null = null;
  private callbacks: SFUCallbacks = {};
  private localParticipant: SFUParticipant | null = null;
  private remoteParticipants: Map<string, SFUParticipant> = new Map();
  private connectionState: 'connected' | 'connecting' | 'reconnecting' | 'disconnected' = 'disconnected';

  async connect(config: SFUConfig, callbacks: SFUCallbacks): Promise<void> {
    this.config = config;
    this.callbacks = callbacks;
    this.connectionState = 'connecting';

    debugLogger.info('sfu', 'Connecting to LiveKit', {
      url: config.url,
      roomId: config.roomId,
      participantName: config.participantName,
    });

    try {
      await this.establishConnection();
    } catch (error) {
      this.connectionState = 'disconnected';
      debugLogger.error('sfu', 'Failed to connect', {
        error: error instanceof Error ? error.message : String(error),
      });
      callbacks.onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  private async establishConnection(): Promise<void> {
    if (!this.config) throw new Error('No config provided');

    // Create room instance with stability options
    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
      // Video capture defaults
      videoCaptureDefaults: {
        resolution: { width: 1280, height: 720, frameRate: 30 },
      },
      audioCaptureDefaults: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    // Set up event listeners before connecting
    this.setupEventListeners();

    // Connect to the room
    debugLogger.debug('sfu', 'Connecting to room...', { url: this.config.url });
    
    await this.room.connect(this.config.url, this.config.token, {
      autoSubscribe: true,
    });

    debugLogger.info('sfu', 'Connected to room', {
      roomId: this.room.name,
      participantId: this.room.localParticipant.identity,
    });

    // Create and publish local tracks
    await this.publishLocalTracks();

    // Update local participant
    this.updateLocalParticipant();

    // Process existing participants
    this.room.remoteParticipants.forEach((participant) => {
      this.handleParticipantJoined(participant);
    });

    this.connectionState = 'connected';
    this.callbacks.onConnected?.();
  }

  private async publishLocalTracks(): Promise<void> {
    if (!this.room) return;

    debugLogger.debug('sfu', 'Creating local tracks...');
    
    try {
      const tracks = await createLocalTracks({
        audio: true,
        video: true,
      });

      // Publish tracks
      for (const track of tracks) {
        debugLogger.debug('sfu', `Publishing ${track.kind} track`);
        await this.room.localParticipant.publishTrack(track);
      }
    } catch (error) {
      debugLogger.warn('sfu', 'Failed to create some local tracks', {
        error: error instanceof Error ? error.message : String(error),
      });
      
      // Try audio only if video fails
      try {
        const audioTrack = await createLocalTracks({ audio: true, video: false });
        for (const track of audioTrack) {
          await this.room.localParticipant.publishTrack(track);
        }
      } catch (audioError) {
        debugLogger.error('sfu', 'Failed to create audio track', {
          error: audioError instanceof Error ? audioError.message : String(audioError),
        });
      }
    }
  }

  async disconnect(): Promise<void> {
    debugLogger.info('sfu', 'Disconnecting from LiveKit');
    
    this.connectionState = 'disconnected';

    if (this.room) {
      await this.room.disconnect();
      this.room = null;
    }

    this.localParticipant = null;
    this.remoteParticipants.clear();
    this.config = null;
  }

  async setAudioEnabled(enabled: boolean): Promise<void> {
    if (!this.room) return;

    debugLogger.debug('sfu', `Setting audio enabled: ${enabled}`);
    await this.room.localParticipant.setMicrophoneEnabled(enabled);
    this.updateLocalParticipant();
  }

  async setVideoEnabled(enabled: boolean): Promise<void> {
    if (!this.room) return;

    debugLogger.debug('sfu', `Setting video enabled: ${enabled}`);
    await this.room.localParticipant.setCameraEnabled(enabled);
    this.updateLocalParticipant();
  }

  getLocalParticipant(): SFUParticipant | null {
    return this.localParticipant;
  }

  getRemoteParticipants(): SFUParticipant[] {
    return Array.from(this.remoteParticipants.values());
  }

  isConnected(): boolean {
    return this.room?.state === ConnectionState.Connected;
  }

  getRoomId(): string | null {
    return this.room?.name ?? null;
  }

  getConnectionState(): 'connected' | 'connecting' | 'reconnecting' | 'disconnected' {
    return this.connectionState;
  }

  // ===========================================================================
  // Private Methods
  // ===========================================================================

  private setupEventListeners(): void {
    if (!this.room) return;

    // =========================================================================
    // Connection Quality & ICE Events (critical for debugging)
    // =========================================================================
    
    this.room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
      debugLogger.info('sfu', 'Connection quality changed', {
        participant: participant.identity,
        quality,
      });
    });

    this.room.on(RoomEvent.SignalConnected, () => {
      debugLogger.info('sfu', '✓ Signal connected to server');
    });

    this.room.on(RoomEvent.SignalReconnecting, () => {
      debugLogger.warn('sfu', '⟳ Signal reconnecting...');
    });

    this.room.on(RoomEvent.DCBufferStatusChanged, (isLow, kind) => {
      debugLogger.debug('sfu', 'DataChannel buffer status', { isLow, kind });
    });

    // =========================================================================
    // Connection state changes
    // =========================================================================
    this.room.on(RoomEvent.ConnectionStateChanged, (state) => {
      const stateEmoji: Record<string, string> = {
        disconnected: '❌',
        connecting: '🔄',
        connected: '✓',
        reconnecting: '⟳',
      };
      debugLogger.info('sfu', `${stateEmoji[state] || '?'} Connection state: ${state}`, { state });

      switch (state) {
        case ConnectionState.Connected:
          this.connectionState = 'connected';
          break;
        case ConnectionState.Reconnecting:
          this.connectionState = 'reconnecting';
          this.callbacks.onReconnecting?.();
          break;
        case ConnectionState.Disconnected:
          if (this.connectionState !== 'disconnected') {
            this.connectionState = 'disconnected';
            this.callbacks.onDisconnected?.('Connection lost');
          }
          break;
      }
    });

    // Reconnected event
    this.room.on(RoomEvent.Reconnected, () => {
      debugLogger.info('sfu', 'Reconnected to room');
      this.connectionState = 'connected';
      this.updateLocalParticipant();
      this.callbacks.onReconnected?.();
    });

    // Participant events
    this.room.on(RoomEvent.ParticipantConnected, (participant) => {
      debugLogger.info('sfu', 'Participant connected', {
        id: participant.identity,
        name: participant.name,
      });
      this.handleParticipantJoined(participant);
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      debugLogger.info('sfu', 'Participant disconnected', {
        id: participant.identity,
      });
      this.handleParticipantLeft(participant);
    });

    // Track events
    this.room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
      debugLogger.debug('sfu', 'Track subscribed', {
        participantId: participant.identity,
        trackKind: track.kind,
      });
      this.updateRemoteParticipant(participant);
    });

    this.room.on(RoomEvent.TrackUnsubscribed, (_track, _publication, participant) => {
      debugLogger.debug('sfu', 'Track unsubscribed', {
        participantId: participant.identity,
      });
      this.updateRemoteParticipant(participant);
    });

    this.room.on(RoomEvent.TrackMuted, (publication, participant) => {
      debugLogger.debug('sfu', 'Track muted', {
        participantId: participant.identity,
        trackKind: publication.kind,
      });
      if (participant === this.room?.localParticipant) {
        this.updateLocalParticipant();
      } else {
        this.updateRemoteParticipant(participant as RemoteParticipant);
      }
    });

    this.room.on(RoomEvent.TrackUnmuted, (publication, participant) => {
      debugLogger.debug('sfu', 'Track unmuted', {
        participantId: participant.identity,
        trackKind: publication.kind,
      });
      if (participant === this.room?.localParticipant) {
        this.updateLocalParticipant();
      } else {
        this.updateRemoteParticipant(participant as RemoteParticipant);
      }
    });

    // Active speakers
    this.room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      const speakerIds = speakers.map((s) => s.identity);
      
      // Update all participants' speaking status
      this.remoteParticipants.forEach((p, id) => {
        const isSpeaking = speakerIds.includes(id);
        if (p.isSpeaking !== isSpeaking) {
          p.isSpeaking = isSpeaking;
          this.callbacks.onSpeakingChanged?.(id, isSpeaking);
          this.callbacks.onParticipantUpdated?.(p);
        }
      });

      // Update local participant speaking status
      if (this.localParticipant && this.room) {
        const localIsSpeaking = speakerIds.includes(this.room.localParticipant.identity);
        if (this.localParticipant.isSpeaking !== localIsSpeaking) {
          this.localParticipant.isSpeaking = localIsSpeaking;
          this.callbacks.onParticipantUpdated?.(this.localParticipant);
        }
      }
    });

    // Disconnect event
    this.room.on(RoomEvent.Disconnected, (reason?: DisconnectReason) => {
      debugLogger.warn('sfu', 'Disconnected from room', { reason });
      this.connectionState = 'disconnected';
      this.callbacks.onDisconnected?.(this.getDisconnectReasonString(reason));
    });

    // Media device errors
    this.room.on(RoomEvent.MediaDevicesError, (error) => {
      debugLogger.error('sfu', 'Media devices error', {
        error: error.message,
      });
      this.callbacks.onError?.(error);
    });

    // Signal reconnecting
    this.room.on(RoomEvent.SignalReconnecting, () => {
      debugLogger.info('sfu', 'Signal reconnecting...');
      this.connectionState = 'reconnecting';
    });

    // Local track published
    this.room.on(RoomEvent.LocalTrackPublished, (publication, participant) => {
      debugLogger.info('sfu', 'Local track published', {
        kind: publication.kind,
        participantId: participant.identity,
      });
      this.updateLocalParticipant();
    });

    // Local track unpublished
    this.room.on(RoomEvent.LocalTrackUnpublished, (publication, participant) => {
      debugLogger.info('sfu', 'Local track unpublished', {
        kind: publication.kind,
        participantId: participant.identity,
      });
      this.updateLocalParticipant();
    });
  }

  private getDisconnectReasonString(reason?: DisconnectReason): string {
    switch (reason) {
      case DisconnectReason.CLIENT_INITIATED:
        return 'You left the room';
      case DisconnectReason.DUPLICATE_IDENTITY:
        return 'Connected from another device';
      case DisconnectReason.SERVER_SHUTDOWN:
        return 'Server shutdown';
      case DisconnectReason.PARTICIPANT_REMOVED:
        return 'Removed from room';
      case DisconnectReason.ROOM_DELETED:
        return 'Room was deleted';
      case DisconnectReason.STATE_MISMATCH:
        return 'Connection error';
      case DisconnectReason.JOIN_FAILURE:
        return 'Failed to join';
      default:
        return 'Connection lost';
    }
  }

  private handleParticipantJoined(participant: RemoteParticipant): void {
    const sfuParticipant = this.participantToSFU(participant);
    this.remoteParticipants.set(participant.identity, sfuParticipant);
    this.callbacks.onParticipantJoined?.(sfuParticipant);
  }

  private handleParticipantLeft(participant: Participant): void {
    this.remoteParticipants.delete(participant.identity);
    this.callbacks.onParticipantLeft?.(participant.identity);
  }

  private updateRemoteParticipant(participant: RemoteParticipant): void {
    const sfuParticipant = this.participantToSFU(participant);
    this.remoteParticipants.set(participant.identity, sfuParticipant);
    this.callbacks.onParticipantUpdated?.(sfuParticipant);
  }

  private updateLocalParticipant(): void {
    if (!this.room) return;

    const local = this.room.localParticipant;
    this.localParticipant = this.localParticipantToSFU(local);
    this.callbacks.onParticipantUpdated?.(this.localParticipant);
  }

  private participantToSFU(participant: RemoteParticipant): SFUParticipant {
    const audioTrack = participant.getTrackPublication(Track.Source.Microphone)
      ?.track?.mediaStreamTrack;
    const videoTrack = participant.getTrackPublication(Track.Source.Camera)
      ?.track?.mediaStreamTrack;

    return {
      id: participant.identity,
      name: participant.name || participant.identity,
      isSpeaking: participant.isSpeaking,
      isMuted: !participant.isMicrophoneEnabled,
      isVideoEnabled: participant.isCameraEnabled,
      audioTrack,
      videoTrack,
    };
  }

  private localParticipantToSFU(participant: LocalParticipant): SFUParticipant {
    const audioTrack = participant.getTrackPublication(Track.Source.Microphone)
      ?.track?.mediaStreamTrack;
    const videoTrack = participant.getTrackPublication(Track.Source.Camera)
      ?.track?.mediaStreamTrack;

    return {
      id: participant.identity,
      name: participant.name || this.config?.participantName || 'You',
      isSpeaking: participant.isSpeaking,
      isMuted: !participant.isMicrophoneEnabled,
      isVideoEnabled: participant.isCameraEnabled,
      audioTrack,
      videoTrack,
    };
  }
}

/**
 * Factory function to create a LiveKit adapter instance.
 */
export function createLiveKitAdapter(): LiveKitAdapter {
  return new LiveKitAdapter();
}
