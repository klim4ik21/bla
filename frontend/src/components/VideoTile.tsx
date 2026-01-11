/**
 * VideoTile Component
 * 
 * Displays a participant's video/audio with controls for volume, local mute.
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import type { SFUParticipant } from '../types';

interface VideoTileProps {
  participant: SFUParticipant;
  isLocal?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function VideoTile({
  participant,
  isLocal = false,
  size = 'medium',
}: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Local controls state (persisted per participant)
  const [volume, setVolume] = useState(() => {
    const saved = localStorage.getItem(`volume_${participant.id}`);
    return saved ? parseFloat(saved) : 1;
  });
  const [isLocallyMuted, setIsLocallyMuted] = useState(() => {
    return localStorage.getItem(`muted_${participant.id}`) === 'true';
  });
  const [showControls, setShowControls] = useState(false);

  // Attach video track to video element
  useEffect(() => {
    if (videoRef.current && participant.videoTrack) {
      const stream = new MediaStream([participant.videoTrack]);
      videoRef.current.srcObject = stream;
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [participant.videoTrack]);

  // Attach audio track and manage volume (only for remote participants)
  useEffect(() => {
    if (!isLocal && audioRef.current && participant.audioTrack) {
      const stream = new MediaStream([participant.audioTrack]);
      audioRef.current.srcObject = stream;
      audioRef.current.volume = isLocallyMuted ? 0 : volume;
      audioRef.current.play().catch((err) => {
        console.warn('Audio autoplay blocked:', err);
      });
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.srcObject = null;
      }
    };
  }, [participant.audioTrack, isLocal]);

  // Update audio volume when controls change
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isLocallyMuted ? 0 : volume;
    }
  }, [volume, isLocallyMuted]);

  // Handle volume change
  const handleVolumeChange = useCallback((newVolume: number) => {
    setVolume(newVolume);
    localStorage.setItem(`volume_${participant.id}`, newVolume.toString());
  }, [participant.id]);

  // Handle local mute toggle
  const handleLocalMuteToggle = useCallback(() => {
    const newMuted = !isLocallyMuted;
    setIsLocallyMuted(newMuted);
    localStorage.setItem(`muted_${participant.id}`, newMuted.toString());
  }, [isLocallyMuted, participant.id]);

  const sizeClasses = {
    small: 'w-32 h-24',
    medium: 'w-64 h-48',
    large: 'w-full h-full min-h-64',
  };

  const speakingClass = participant.isSpeaking && !participant.isMuted 
    ? 'ring-2 ring-green-500 ring-offset-2 ring-offset-surface-900' 
    : '';

  return (
    <div
      className={`relative ${sizeClasses[size]} rounded-xl overflow-hidden border-2 border-surface-600 ${speakingClass} transition-all duration-300 group`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Video or placeholder */}
      {participant.isVideoEnabled && participant.videoTrack ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-surface-700 to-surface-800 flex items-center justify-center">
          {/* Avatar placeholder */}
          <div className={`rounded-full bg-primary-600 flex items-center justify-center font-display font-bold text-white ${size === 'large' ? 'w-24 h-24 text-4xl' : 'w-16 h-16 text-2xl'}`}>
            {participant.name.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* Speaking animation overlay */}
      {participant.isSpeaking && !participant.isMuted && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 border-2 border-green-400 rounded-xl animate-pulse" />
        </div>
      )}

      {/* Audio controls for remote participants */}
      {!isLocal && (
        <div 
          className={`absolute top-2 right-2 flex items-center gap-2 transition-opacity duration-200 ${showControls ? 'opacity-100' : 'opacity-0'}`}
        >
          {/* Local mute button */}
          <button
            onClick={handleLocalMuteToggle}
            className={`p-2 rounded-full backdrop-blur-md transition-colors ${isLocallyMuted ? 'bg-red-500/80 hover:bg-red-500' : 'bg-surface-800/80 hover:bg-surface-700/80'}`}
            title={isLocallyMuted ? 'Unmute this participant' : 'Mute this participant'}
          >
            {isLocallyMuted ? <VolumeXIcon /> : <VolumeIcon />}
          </button>
        </div>
      )}

      {/* Volume slider for remote participants */}
      {!isLocal && showControls && (
        <div className="absolute top-14 right-2 w-8 h-32 flex flex-col items-center justify-center bg-surface-800/90 backdrop-blur-md rounded-lg p-2">
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="volume-slider h-24 appearance-none cursor-pointer"
            style={{
              writingMode: 'vertical-lr',
              direction: 'rtl',
            }}
            title={`Volume: ${Math.round(volume * 100)}%`}
          />
          <span className="text-xs text-surface-300 mt-1">{Math.round(volume * 100)}%</span>
        </div>
      )}

      {/* Name overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white truncate">
            {participant.name}
            {isLocal && ' (You)'}
          </span>
          
          {/* Status indicators */}
          <div className="flex items-center gap-1 ml-auto">
            {/* Locally muted indicator */}
            {!isLocal && isLocallyMuted && (
              <div className="p-1 rounded bg-orange-500/80" title="You muted this participant">
                <VolumeXIcon className="w-3 h-3" />
              </div>
            )}
            
            {/* Remote muted indicator */}
            {participant.isMuted && (
              <div className="p-1 rounded bg-error/80" title="Microphone off">
                <MicOffIcon />
              </div>
            )}
            
            {/* Video off indicator */}
            {!participant.isVideoEnabled && (
              <div className="p-1 rounded bg-surface-600/80" title="Camera off">
                <VideoOffIcon />
              </div>
            )}
            
            {/* Speaking indicator */}
            {participant.isSpeaking && !participant.isMuted && (
              <div className="p-1 rounded bg-success/80 animate-pulse" title="Speaking">
                <SpeakingIcon />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Local indicator badge */}
      {isLocal && (
        <div className="absolute top-2 left-2 px-2 py-1 rounded bg-primary-600/80 text-xs text-white font-medium">
          You
        </div>
      )}

      {/* Connection quality indicator */}
      <div className="absolute top-2 left-2 flex items-center gap-1">
        {!isLocal && <ConnectionQualityIndicator />}
      </div>

      {/* Hidden audio element for remote participants */}
      {!isLocal && <audio ref={audioRef} autoPlay playsInline />}
    </div>
  );
}

// Connection quality indicator (placeholder - can be enhanced with actual metrics)
function ConnectionQualityIndicator() {
  return (
    <div className="flex gap-0.5 items-end h-3" title="Connection quality">
      <div className="w-1 h-1 bg-green-400 rounded-full" />
      <div className="w-1 h-2 bg-green-400 rounded-full" />
      <div className="w-1 h-3 bg-green-400 rounded-full" />
    </div>
  );
}

// Icons
function MicOffIcon() {
  return (
    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
    </svg>
  );
}

function VideoOffIcon() {
  return (
    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
    </svg>
  );
}

function SpeakingIcon() {
  return (
    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  );
}

function VolumeIcon({ className = "w-4 h-4 text-white" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M15.536 8.464a5 5 0 010 7.072M12 6l-4 4H4v4h4l4 4V6z" />
    </svg>
  );
}

function VolumeXIcon({ className = "w-4 h-4 text-white" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
    </svg>
  );
}
