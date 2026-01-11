/**
 * API Service - Handles all HTTP communication with the backend.
 * 
 * Uses fetch API with consistent error handling and logging.
 */

import type {
  CreateRoomResponse,
  JoinRoomResponse,
  RoomListResponse,
  RoomDetailsResponse,
  OverallStatus,
} from '../types';
import { debugLogger } from './debugLogger';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// =============================================================================
// HTTP Client
// =============================================================================

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;
  
  const url = `${API_BASE}${endpoint}`;
  
  debugLogger.debug('frontend', `API Request: ${method} ${endpoint}`, { body });
  
  const startTime = performance.now();
  
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    const duration = Math.round(performance.now() - startTime);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      debugLogger.error('frontend', `API Error: ${method} ${endpoint} -> ${response.status}`, {
        status: response.status,
        duration_ms: duration,
        error: errorData,
      });
      
      throw new ApiError(
        errorData.error || `HTTP ${response.status}`,
        response.status,
        errorData
      );
    }
    
    const data = await response.json();
    
    debugLogger.debug('frontend', `API Response: ${method} ${endpoint} -> ${response.status}`, {
      duration_ms: duration,
    });
    
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    const duration = Math.round(performance.now() - startTime);
    debugLogger.error('frontend', `API Network Error: ${method} ${endpoint}`, {
      duration_ms: duration,
      error: error instanceof Error ? error.message : String(error),
    });
    
    throw new ApiError(
      error instanceof Error ? error.message : 'Network error',
      0
    );
  }
}

// =============================================================================
// API Methods
// =============================================================================

export const api = {
  /**
   * Creates a new room and joins as the first participant.
   */
  async createRoom(participantName: string): Promise<CreateRoomResponse> {
    debugLogger.info('frontend', 'Creating room', { participant_name: participantName });
    
    const response = await request<CreateRoomResponse>('/rooms', {
      method: 'POST',
      body: { participant_name: participantName },
    });
    
    debugLogger.info('frontend', 'Room created', { room_id: response.room_id });
    
    return response;
  },

  /**
   * Joins an existing room.
   */
  async joinRoom(roomId: string, participantName: string): Promise<JoinRoomResponse> {
    debugLogger.info('frontend', 'Joining room', { room_id: roomId, participant_name: participantName });
    
    const response = await request<JoinRoomResponse>(`/rooms/${roomId}/join`, {
      method: 'POST',
      body: { participant_name: participantName },
    });
    
    debugLogger.info('frontend', 'Joined room', { room_id: roomId });
    
    return response;
  },

  /**
   * Gets list of all active rooms.
   */
  async listRooms(): Promise<RoomListResponse> {
    return request<RoomListResponse>('/rooms');
  },

  /**
   * Gets details of a specific room.
   */
  async getRoom(roomId: string): Promise<RoomDetailsResponse> {
    return request<RoomDetailsResponse>(`/rooms/${roomId}`);
  },

  /**
   * Leaves a room.
   */
  async leaveRoom(roomId: string, participantId: string): Promise<void> {
    debugLogger.info('frontend', 'Leaving room', { room_id: roomId, participant_id: participantId });
    
    await request(`/rooms/${roomId}/leave?participant_id=${participantId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Gets health status of all services.
   */
  async getStatus(): Promise<OverallStatus> {
    return request<OverallStatus>('/status');
  },

  /**
   * Simple health check.
   */
  async healthCheck(): Promise<{ status: string }> {
    return request<{ status: string }>('/health');
  },
};

export { ApiError };
