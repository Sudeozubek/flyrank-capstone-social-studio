/**
 * Adapter registry — the single seam between app code and platform transports.
 * Application code calls `getPublisher(platform)` and sees only `SocialPublisher`.
 */

import type { Platform } from "@/config/platform-specs";
import type { SocialPublisher } from "./types";
import type { AdapterOptions } from "./adapters/fake-transport";
import { InstagramFakeAdapter } from "./adapters/instagram-fake-adapter";
import { XFakeAdapter } from "./adapters/x-fake-adapter";

export function getPublisher(platform: Platform, options?: AdapterOptions): SocialPublisher {
  switch (platform) {
    case "instagram":
      return new InstagramFakeAdapter(options);
    case "x":
      return new XFakeAdapter(options);
  }
}

export type { SocialPublisher, PublishResult, PublishInput } from "./types";
