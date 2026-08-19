export type AuthTab = 'credentials';

export interface CyberModule {
  id: string;
  name: string;
  description: string;
  tag: string;
  version: string;
  enabled: boolean;
}

export interface UserProfile {
  username: string;
  codename: string;
  clearanceLevel: number;
  role: string;
  terminalId: string;
  ipAddress: string;
  nodeRegion: string;
  avatarSeed: string;
  sessionToken: string;
  loginTime: string;
}

export interface TelemetryLog {
  id: string;
  timestamp: string;
  type: 'INFO' | 'SUCCESS' | 'WARN' | 'SEC_ALERT' | 'HANDSHAKE';
  source: string;
  message: string;
  payloadHash?: string;
}

export interface ServerNode {
  id: string;
  name: string;
  region: string;
  latencyMs: number;
  status: 'optimal' | 'congested' | 'maintenance';
  encryption: string;
}

export interface ThreatItem {
  id: string;
  threatType: string;
  originIp: string;
  country: string;
  mitigation: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timeAgo: string;
}
