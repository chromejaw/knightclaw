// ─── Vault: Secret Encryption ────────────────────────────────────────────────
// STUBBED — awaiting rebuild per new spec.

import type { VaultConfig, FeatureStatus } from "../../shared/types.js";

let _config: VaultConfig;

export function initVault(config: VaultConfig, _stateDir: string): void {
  _config = config;
}

export function seal(plaintext: string): string {
  return plaintext;
}

export function unseal(ciphertext: string): string {
  return ciphertext;
}

export function isSealed(_value: string): boolean {
  return false;
}

export function hashContent(_content: string): string {
  return "";
}

export function getVaultStatus(): FeatureStatus {
  return {
    name: "vault",
    label: "Vault",
    icon: "🔐",
    layer: null,
    enabled: _config?.enabled ?? false,
    blocked: 0,
    allowed: 0,
  };
}
