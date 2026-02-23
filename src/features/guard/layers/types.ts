export interface GuardLayerResult {
  blocked: boolean;
  score: number;
  reason?: string;
  metadata?: Record<string, unknown>;
}

export interface GuardLayerConfig {
  enabled: boolean;
  threshold?: number;
}
