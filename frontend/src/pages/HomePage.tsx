/**
 * HomePage Component
 * 
 * Landing page with name input and create room functionality.
 */

import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { debugLogger } from '../services/debugLogger';

export function HomePage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateRoom = useCallback(async () => {
    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsLoading(true);
    setError(null);

    debugLogger.info('frontend', 'Creating room...', { name });

    try {
      const response = await api.createRoom(name.trim());
      
      debugLogger.info('frontend', 'Room created, navigating...', {
        roomId: response.room_id,
      });

      // Store connection info in sessionStorage for the room page
      sessionStorage.setItem('roomConnection', JSON.stringify({
        roomId: response.room_id,
        participantId: response.participant_id,
        participantName: name.trim(),
        token: response.token,
        livekitUrl: response.livekit_url,
      }));

      // Navigate to room
      navigate(`/r/${response.room_id}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create room';
      setError(message);
      debugLogger.error('frontend', 'Failed to create room', { error: message });
    } finally {
      setIsLoading(false);
    }
  }, [name, navigate]);

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !isLoading) {
        handleCreateRoom();
      }
    },
    [handleCreateRoom, isLoading]
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-md">
        {/* Logo / Title */}
        <div className="text-center mb-12">
          <h1 className="font-display text-5xl font-bold text-surface-100 mb-3">
            Video<span className="text-primary-400">Rooms</span>
          </h1>
          <p className="text-surface-400">
            Simple video conferencing. No signup required.
          </p>
        </div>

        {/* Form */}
        <div className="glass rounded-2xl p-8 border border-surface-600">
          <div className="mb-6">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-surface-300 mb-2"
            >
              Your Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter your name"
              className="w-full px-4 py-3 rounded-xl bg-surface-800 border border-surface-600 text-surface-100 placeholder-surface-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-colors"
              disabled={isLoading}
              autoFocus
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-error/20 border border-error/30 text-error text-sm">
              {error}
            </div>
          )}

          {/* Create button */}
          <button
            onClick={handleCreateRoom}
            disabled={isLoading || !name.trim()}
            className="w-full py-3 px-6 rounded-xl bg-primary-600 text-white font-medium hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-glow-md"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner />
                Creating...
              </span>
            ) : (
              'Create Room'
            )}
          </button>
        </div>

        {/* Footer info */}
        <div className="text-center mt-8 text-surface-500 text-sm">
          <p>Share the room link with others to invite them.</p>
        </div>
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-5 w-5"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}
