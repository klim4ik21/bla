/**
 * SFU Adapter exports
 * 
 * This module provides the abstraction layer for SFU providers.
 * To swap LiveKit for another provider, implement the SFUAdapter interface
 * and update the default factory.
 */

export type { SFUAdapter, SFUConfig, SFUCallbacks, SFUAdapterFactory, ConnectionState } from './types';
export { LiveKitAdapter, createLiveKitAdapter } from './livekitAdapter';

// Default adapter factory - change this to use a different SFU
export { createLiveKitAdapter as createSFUAdapter } from './livekitAdapter';
