/**
 * HTTP transport to the in-repo fake platform. No real social network is ever
 * contacted; the base URL always points back at this app's own
 * /api/public/fake-platform surface.
 */

/** The fields adapters read off a fake-platform reply; extras are ignored. */
export interface FakePlatformBody {
  id?: string;
  duplicate?: boolean;
  error?: string;
}

export interface FakePlatformResponse {
  status: number;
  retryAfterSec?: number;
  body: FakePlatformBody | null;
}

export interface FakePlatformTransport {
  post(
    platform: string,
    payload: unknown,
    headers: Record<string, string>,
  ): Promise<FakePlatformResponse>;
}

export function resolveFakePlatformBaseUrl(requestUrl?: string): string {
  const configured = process.env["FAKE_PLATFORM_BASE_URL"];
  if (configured) return configured.replace(/\/$/, "");
  if (requestUrl) return new URL(requestUrl).origin;
  return "http://localhost:8080";
}

export function createFakePlatformTransport(baseUrl: string): FakePlatformTransport {
  return {
    async post(platform, payload, headers) {
      const response = await fetch(`${baseUrl}/api/public/fake-platform/${platform}/posts`, {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify(payload),
      });
      const retryAfter = response.headers.get("retry-after");
      let body: FakePlatformBody | null = null;
      try {
        body = await response.json();
      } catch {
        body = null;
      }
      return {
        status: response.status,
        ...(retryAfter ? { retryAfterSec: Number(retryAfter) } : {}),
        body,
      };
    },
  };
}
