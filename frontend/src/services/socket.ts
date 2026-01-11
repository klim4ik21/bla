/**
 * Phoenix Socket Service
 * 
 * Handles WebSocket connection to the Phoenix backend for real-time updates.
 */

import { Socket, Channel } from 'phoenix';
import { debugLogger } from './debugLogger';

const WS_URL = import.meta.env.VITE_WS_URL || '/ws';

class SocketService {
  private socket: Socket | null = null;
  private channels: Map<string, Channel> = new Map();

  /**
   * Connect to the Phoenix socket.
   */
  connect(): Socket {
    if (this.socket?.isConnected()) {
      return this.socket;
    }

    debugLogger.info('frontend', 'Connecting to Phoenix socket', { url: WS_URL });

    this.socket = new Socket(WS_URL, {
      params: {},
      logger: (kind, msg, data) => {
        debugLogger.debug('frontend', `Socket ${kind}: ${msg}`, data as Record<string, unknown> | undefined);
      },
    });

    this.socket.onOpen(() => {
      debugLogger.info('frontend', 'Socket connected');
    });

    this.socket.onClose(() => {
      debugLogger.warn('frontend', 'Socket disconnected');
    });

    this.socket.onError((error) => {
      debugLogger.error('frontend', 'Socket error', { error: String(error) });
    });

    this.socket.connect();
    return this.socket;
  }

  /**
   * Disconnect from the socket.
   */
  disconnect(): void {
    debugLogger.info('frontend', 'Disconnecting socket');
    this.channels.forEach((channel) => channel.leave());
    this.channels.clear();
    this.socket?.disconnect();
    this.socket = null;
  }

  /**
   * Join a Phoenix channel.
   */
  joinChannel(topic: string, params: Record<string, unknown> = {}): Channel {
    if (!this.socket) {
      this.connect();
    }

    // Check if already joined
    const existing = this.channels.get(topic);
    if (existing) {
      return existing;
    }

    debugLogger.info('frontend', `Joining channel: ${topic}`, params);

    const channel = this.socket!.channel(topic, params);

    channel.onError((error) => {
      debugLogger.error('frontend', `Channel error: ${topic}`, { error: String(error) });
    });

    channel.onClose(() => {
      debugLogger.info('frontend', `Channel closed: ${topic}`);
      this.channels.delete(topic);
    });

    channel
      .join()
      .receive('ok', (response) => {
        debugLogger.info('frontend', `Joined channel: ${topic}`, response as Record<string, unknown>);
      })
      .receive('error', (response) => {
        debugLogger.error('frontend', `Failed to join channel: ${topic}`, response as Record<string, unknown>);
      });

    this.channels.set(topic, channel);
    return channel;
  }

  /**
   * Leave a Phoenix channel.
   */
  leaveChannel(topic: string): void {
    const channel = this.channels.get(topic);
    if (channel) {
      debugLogger.info('frontend', `Leaving channel: ${topic}`);
      channel.leave();
      this.channels.delete(topic);
    }
  }

  /**
   * Get the socket instance.
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Check if connected.
   */
  isConnected(): boolean {
    return this.socket?.isConnected() ?? false;
  }
}

// Singleton instance
export const socketService = new SocketService();
