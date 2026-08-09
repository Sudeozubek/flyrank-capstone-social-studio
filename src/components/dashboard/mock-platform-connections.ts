import type { Platform } from "@/domain/entities";
import { PLATFORMS } from "@/domain/entities";

const STORAGE_KEY = "campaignhub-mock-connections";

export type MockPlatformConnections = Record<Platform, boolean>;

function defaultConnections(): MockPlatformConnections {
  return Object.fromEntries(PLATFORMS.map((p) => [p, false])) as MockPlatformConnections;
}

export function readMockPlatformConnections(): MockPlatformConnections {
  if (typeof window === "undefined") return defaultConnections();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultConnections();
    const parsed = JSON.parse(raw) as Partial<MockPlatformConnections>;
    return { ...defaultConnections(), ...parsed };
  } catch {
    return defaultConnections();
  }
}

export function writeMockPlatformConnection(platform: Platform, connected: boolean): void {
  const next = { ...readMockPlatformConnections(), [platform]: connected };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
