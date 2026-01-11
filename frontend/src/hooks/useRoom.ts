/**
 * useRoom Hook
 * 
 * Manages room connection lifecycle using the SFU adapter.
 * Includes connection state tracking and keyboard shortcuts.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { SFUParticipant } from '../types';
import type { SFUAdapter, SFUConfig, ConnectionState } from '../adapters/sfu';
import { createSFUAdapter } from '../adapters/sfu';
import { debugLogger } from '../services/debugLogger';

interface UseRoomState {
  isConnected: boolean;
  isConnecting: boolean;
  connectionState: ConnectionState;
  error: Error | null;
  localParticipant: SFUParticipant | null;
  participants: SFUParticipant[];
}

interface UseRoomActions {
  connect: (config: SFUConfig) => Promise<void>;
  disconnect: () => Promise<void>;
  toggleAudio: () => Promise<void>;
  toggleVideo: () => Promise<void>;
}

type UseRoomReturn = UseRoomState & UseRoomActions;

export function useRoom(): UseRoomReturn {
  const adapterRef = useRef<SFUAdapter | null>(null);
  
  const [state, setState] = useState<UseRoomState>({
    isConnected: false,
    isConnecting: false,
    connectionState: 'disconnected',
    error: null,
    localParticipant: null,
    participants: [],
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (adapterRef.current?.isConnected()) {
        adapterRef.current.disconnect().catch(console.error);
      }
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'm':
          // Toggle mute
          if (adapterRef.current?.isConnected()) {
            toggleAudio();
          }
          break;
        case 'v':
          // Toggle video
          if (adapterRef.current?.isConnected()) {
            toggleVideo();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const connect = useCallback(async (config: SFUConfig) => {
    debugLogger.info('frontend', 'useRoom: Connecting...', {
      roomId: config.roomId,
      participantName: config.participantName,
    });

    setState((prev) => ({ 
      ...prev, 
      isConnecting: true, 
      connectionState: 'connecting',
      error: null 
    }));

    try {
      // Create new adapter instance
      adapterRef.current = createSFUAdapter();

      await adapterRef.current.connect(config, {
        onConnected: () => {
          debugLogger.info('frontend', 'useRoom: Connected');
          setState((prev) => ({
            ...prev,
            isConnected: true,
            isConnecting: false,
            connectionState: 'connected',
            localParticipant: adapterRef.current?.getLocalParticipant() ?? null,
            participants: adapterRef.current?.getRemoteParticipants() ?? [],
          }));
        },
        onDisconnected: (reason) => {
          debugLogger.warn('frontend', 'useRoom: Disconnected', { reason });
          setState((prev) => ({
            ...prev,
            isConnected: false,
            connectionState: 'disconnected',
            localParticipant: null,
            participants: [],
          }));
        },
        onReconnecting: () => {
          debugLogger.info('frontend', 'useRoom: Reconnecting...');
          setState((prev) => ({
            ...prev,
            connectionState: 'reconnecting',
          }));
        },
        onReconnected: () => {
          debugLogger.info('frontend', 'useRoom: Reconnected');
          setState((prev) => ({
            ...prev,
            isConnected: true,
            connectionState: 'connected',
            localParticipant: adapterRef.current?.getLocalParticipant() ?? null,
            participants: adapterRef.current?.getRemoteParticipants() ?? [],
          }));
        },
        onError: (error) => {
          debugLogger.error('frontend', 'useRoom: Error', { error: error.message });
          setState((prev) => ({ ...prev, error }));
        },
        onParticipantJoined: (participant) => {
          debugLogger.info('frontend', 'useRoom: Participant joined', {
            id: participant.id,
            name: participant.name,
          });
          setState((prev) => ({
            ...prev,
            participants: [...prev.participants.filter(p => p.id !== participant.id), participant],
          }));
        },
        onParticipantLeft: (participantId) => {
          debugLogger.info('frontend', 'useRoom: Participant left', { id: participantId });
          setState((prev) => ({
            ...prev,
            participants: prev.participants.filter((p) => p.id !== participantId),
          }));
        },
        onParticipantUpdated: (participant) => {
          setState((prev) => {
            // Update local participant
            if (prev.localParticipant?.id === participant.id) {
              return {
                ...prev,
                localParticipant: participant,
              };
            }
            // Update remote participant
            return {
              ...prev,
              participants: prev.participants.map((p) =>
                p.id === participant.id ? participant : p
              ),
            };
          });
        },
        onSpeakingChanged: (participantId, isSpeaking) => {
          debugLogger.debug('frontend', 'useRoom: Speaking changed', {
            participantId,
            isSpeaking,
          });
        },
      });
    } catch (error) {
      debugLogger.error('frontend', 'useRoom: Connection failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        connectionState: 'disconnected',
        error: error instanceof Error ? error : new Error(String(error)),
      }));
      throw error;
    }
  }, []);

  const disconnect = useCallback(async () => {
    debugLogger.info('frontend', 'useRoom: Disconnecting...');

    if (adapterRef.current) {
      await adapterRef.current.disconnect();
      adapterRef.current = null;
    }

    setState({
      isConnected: false,
      isConnecting: false,
      connectionState: 'disconnected',
      error: null,
      localParticipant: null,
      participants: [],
    });
  }, []);

  const toggleAudio = useCallback(async () => {
    if (!adapterRef.current || !state.localParticipant) return;

    const newState = state.localParticipant.isMuted;
    debugLogger.debug('frontend', `useRoom: Toggle audio -> ${newState ? 'on' : 'off'}`);
    
    await adapterRef.current.setAudioEnabled(newState);
    
    setState((prev) => ({
      ...prev,
      localParticipant: prev.localParticipant
        ? { ...prev.localParticipant, isMuted: !newState }
        : null,
    }));
  }, [state.localParticipant]);

  const toggleVideo = useCallback(async () => {
    if (!adapterRef.current || !state.localParticipant) return;

    const newState = !state.localParticipant.isVideoEnabled;
    debugLogger.debug('frontend', `useRoom: Toggle video -> ${newState ? 'on' : 'off'}`);
    
    await adapterRef.current.setVideoEnabled(newState);
    
    setState((prev) => ({
      ...prev,
      localParticipant: prev.localParticipant
        ? { ...prev.localParticipant, isVideoEnabled: newState }
        : null,
    }));
  }, [state.localParticipant]);

  return {
    ...state,
    connect,
    disconnect,
    toggleAudio,
    toggleVideo,
  };
}
