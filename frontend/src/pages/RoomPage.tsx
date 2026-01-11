/**
 * RoomPage Component
 * 
 * Main video call room with participants and controls.
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRoom } from '../hooks/useRoom';
import { VideoTile } from '../components/VideoTile';
import { ControlBar } from '../components/ControlBar';
import { api } from '../services/api';
import { debugLogger } from '../services/debugLogger';

interface RoomConnection {
  roomId: string;
  participantId: string;
  participantName: string;
  token: string;
  livekitUrl: string;
}

export function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const room = useRoom();
  
  const [joinName, setJoinName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [connectionInfo, setConnectionInfo] = useState<RoomConnection | null>(null);

  // Check for existing connection on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('roomConnection');
    if (stored) {
      try {
        const conn = JSON.parse(stored) as RoomConnection;
        if (conn.roomId === roomId) {
          setConnectionInfo(conn);
        }
      } catch {
        // Invalid stored data
      }
    }
  }, [roomId]);

  // Connect to room when we have connection info
  useEffect(() => {
    if (connectionInfo && !room.isConnected && !room.isConnecting) {
      debugLogger.info('frontend', 'Connecting to room with stored credentials', {
        roomId: connectionInfo.roomId,
        participantName: connectionInfo.participantName,
      });

      room.connect({
        url: connectionInfo.livekitUrl,
        token: connectionInfo.token,
        roomId: connectionInfo.roomId,
        participantName: connectionInfo.participantName,
      }).catch((err) => {
        debugLogger.error('frontend', 'Failed to connect', { error: err.message });
      });
    }
  }, [connectionInfo, room]);

  // Handle join for new participants
  const handleJoin = useCallback(async () => {
    if (!joinName.trim() || !roomId) return;

    setIsJoining(true);
    setJoinError(null);

    debugLogger.info('frontend', 'Joining room...', { roomId, name: joinName });

    try {
      const response = await api.joinRoom(roomId, joinName.trim());

      const conn: RoomConnection = {
        roomId,
        participantId: response.participant_id,
        participantName: joinName.trim(),
        token: response.token,
        livekitUrl: response.livekit_url,
      };

      sessionStorage.setItem('roomConnection', JSON.stringify(conn));
      setConnectionInfo(conn);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to join room';
      setJoinError(message);
      debugLogger.error('frontend', 'Failed to join room', { error: message });
    } finally {
      setIsJoining(false);
    }
  }, [joinName, roomId]);

  // Handle leave
  const handleLeave = useCallback(async () => {
    debugLogger.info('frontend', 'Leaving room');
    
    await room.disconnect();
    sessionStorage.removeItem('roomConnection');
    navigate('/');
  }, [room, navigate]);

  // Copy room link
  const copyRoomLink = useCallback(() => {
    navigator.clipboard.writeText(window.location.href);
    debugLogger.info('frontend', 'Room link copied to clipboard');
  }, []);

  // Show join form if not connected and no connection info
  if (!connectionInfo && !room.isConnected) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="font-display text-3xl font-bold text-surface-100 mb-2">
              Join Room
            </h1>
            <p className="text-surface-400 text-sm">
              Room ID: <code className="text-primary-400">{roomId}</code>
            </p>
          </div>

          <div className="glass rounded-2xl p-8 border border-surface-600">
            <div className="mb-6">
              <label className="block text-sm font-medium text-surface-300 mb-2">
                Your Name
              </label>
              <input
                type="text"
                value={joinName}
                onChange={(e) => setJoinName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-xl bg-surface-800 border border-surface-600 text-surface-100 placeholder-surface-500 focus:outline-none focus:border-primary-500"
                autoFocus
              />
            </div>

            {joinError && (
              <div className="mb-4 p-3 rounded-lg bg-error/20 border border-error/30 text-error text-sm">
                {joinError}
              </div>
            )}

            <button
              onClick={handleJoin}
              disabled={isJoining || !joinName.trim()}
              className="w-full py-3 px-6 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isJoining ? 'Joining...' : 'Join Room'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (room.isConnecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-surface-300">Connecting to room...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (room.error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-error text-6xl mb-4">⚠️</div>
          <h2 className="font-display text-2xl font-bold text-surface-100 mb-2">
            Connection Error
          </h2>
          <p className="text-surface-400 mb-6">{room.error.message}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-2 rounded-xl bg-surface-700 text-surface-100 hover:bg-surface-600 transition-colors"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // Main room view
  const allParticipants = [
    ...(room.localParticipant ? [{ ...room.localParticipant, isLocal: true }] : []),
    ...room.participants.map((p) => ({ ...p, isLocal: false })),
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-surface-700">
        <div className="flex items-center gap-4">
          <h1 className="font-display text-lg font-semibold text-surface-100">
            Video<span className="text-primary-400">Rooms</span>
          </h1>
          <div className="px-3 py-1 rounded-full bg-surface-700 text-surface-300 text-sm">
            Room: {roomId}
          </div>
        </div>
        
        <button
          onClick={copyRoomLink}
          className="px-4 py-2 rounded-lg bg-surface-700 text-surface-200 text-sm hover:bg-surface-600 transition-colors flex items-center gap-2"
        >
          <CopyIcon />
          Copy Link
        </button>
      </header>

      {/* Main content - Video grid */}
      <main className="flex-1 p-4 overflow-auto">
        <div className={`h-full grid gap-4 ${getGridClass(allParticipants.length)}`}>
          {allParticipants.map((participant) => (
            <VideoTile
              key={participant.id}
              participant={participant}
              isLocal={participant.isLocal}
              size={allParticipants.length <= 2 ? 'large' : 'medium'}
            />
          ))}
          
          {/* Empty state */}
          {allParticipants.length <= 1 && (
            <div className="flex items-center justify-center glass rounded-xl border border-dashed border-surface-600">
              <div className="text-center p-8">
                <p className="text-surface-400 mb-2">Waiting for others to join...</p>
                <p className="text-surface-500 text-sm">
                  Share the room link to invite participants
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Controls */}
      <footer className="p-4 flex justify-center">
        <ControlBar
          isMuted={room.localParticipant?.isMuted ?? true}
          isVideoEnabled={room.localParticipant?.isVideoEnabled ?? false}
          connectionState={room.connectionState}
          onToggleMute={room.toggleAudio}
          onToggleVideo={room.toggleVideo}
          onLeave={handleLeave}
        />
      </footer>

      {/* Keyboard shortcuts hint */}
      <div className="fixed bottom-20 left-4 text-xs text-surface-500 hidden sm:block">
        <div className="flex items-center gap-4">
          <span><kbd className="px-1.5 py-0.5 rounded bg-surface-700 text-surface-300">M</kbd> Mute</span>
          <span><kbd className="px-1.5 py-0.5 rounded bg-surface-700 text-surface-300">V</kbd> Video</span>
        </div>
      </div>
    </div>
  );
}

// Helpers
function getGridClass(count: number): string {
  if (count <= 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-2';
  if (count <= 4) return 'grid-cols-2';
  if (count <= 6) return 'grid-cols-3';
  return 'grid-cols-4';
}

function CopyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}
