import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveFakePlatformBaseUrl } from "@/infrastructure/publishing/fake-platform-transport.server";

describe("resolveFakePlatformBaseUrl", () => {
  const original = process.env["FAKE_PLATFORM_BASE_URL"];

  afterEach(() => {
    if (original === undefined) delete process.env["FAKE_PLATFORM_BASE_URL"];
    else process.env["FAKE_PLATFORM_BASE_URL"] = original;
  });

  it("prefers FAKE_PLATFORM_BASE_URL and strips trailing slash", () => {
    process.env["FAKE_PLATFORM_BASE_URL"] = "http://fake.example.com/";
    expect(resolveFakePlatformBaseUrl()).toBe("http://fake.example.com");
  });

  it("falls back to request origin", () => {
    delete process.env["FAKE_PLATFORM_BASE_URL"];
    expect(resolveFakePlatformBaseUrl("https://app.example.com/auth")).toBe(
      "https://app.example.com",
    );
  });

  it("defaults to localhost:8080", () => {
    delete process.env["FAKE_PLATFORM_BASE_URL"];
    expect(resolveFakePlatformBaseUrl()).toBe("http://localhost:8080");
  });
});

describe("createFakePlatformTransport", () => {
  it("posts to the in-repo fake platform endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      headers: { get: () => null },
      json: async () => ({ id: "post-1" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { createFakePlatformTransport } = await import(
      "@/infrastructure/publishing/fake-platform-transport.server"
    );
    const transport = createFakePlatformTransport("http://localhost:8080");
    const response = await transport.post("x", { text: "hello" }, { authorization: "Bearer t" });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/public/fake-platform/x/posts",
      expect.objectContaining({ method: "POST" }),
    );

    vi.unstubAllGlobals();
  });
});
