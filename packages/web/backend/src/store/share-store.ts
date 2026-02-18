import type { ScanResult } from 'react-lens';

const shareStore = new Map<string, { createdAt: string; result: ScanResult }>();

export function saveShare(id: string, result: ScanResult): void {
  shareStore.set(id, { createdAt: new Date().toISOString(), result });
}

export function getShare(id: string): { createdAt: string; result: ScanResult } | undefined {
  return shareStore.get(id);
}
