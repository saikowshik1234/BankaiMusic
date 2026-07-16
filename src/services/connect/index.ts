import { appleMusicConnector } from './appleMusicConnect';
import { spotifyConnector } from './spotifyConnect';
import { youtubeMusicConnector } from './youtubeMusicConnect';
import type { ConnectService, ServiceConnector } from './types';

export const connectors: Record<ConnectService, ServiceConnector> = {
  spotify: spotifyConnector,
  appleMusic: appleMusicConnector,
  youtubeMusic: youtubeMusicConnector,
};

export * from './appleMusicConnect';
export * from './matcher';
export * from './spotifyConnect';
export * from './types';
export * from './youtubeMusicConnect';
