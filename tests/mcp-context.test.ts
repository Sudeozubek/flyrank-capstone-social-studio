import { afterEach, describe, expect, it } from "vitest";
import { jsonResult, errorResult, supabaseProjectUrl, supabasePublishableKey } from "@/mcp/context";

describe("MCP context helpers", () => {
  const envBackup = { ...process.env };

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it("jsonResult serialises payloads", () => {
    const result = jsonResult({ ok: true, count: 2 });
    expect(result.content[0]?.text).toContain('"ok": true');
    expect(result.structuredContent).toEqual({ ok: true, count: 2 });
  });

  it("errorResult wraps Error messages", () => {
    const result = errorResult(new Error("campaign not found"));
    expect(result.isError).toBe(true);
    expect(result.content[0]?.text).toBe("campaign not found");
  });

  it("resolves supabase URL from SUPABASE_URL or VITE_SUPABASE_URL", () => {
    delete process.env["VITE_SUPABASE_URL"];
    process.env["SUPABASE_URL"] = "https://abc.supabase.co";
    expect(supabaseProjectUrl()).toBe("https://abc.supabase.co");

    delete process.env["SUPABASE_URL"];
    process.env["VITE_SUPABASE_URL"] = "https://vite.supabase.co";
    expect(supabaseProjectUrl()).toBe("https://vite.supabase.co");
  });

  it("resolves publishable key from direct env or JSON keyset", () => {
    process.env["SUPABASE_PUBLISHABLE_KEY"] = "sb_publishable_direct";
    delete process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
    expect(supabasePublishableKey()).toBe("sb_publishable_direct");

    delete process.env["SUPABASE_PUBLISHABLE_KEY"];
    delete process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
    delete process.env["SUPABASE_ANON_KEY"];
    delete process.env["VITE_SUPABASE_ANON_KEY"];
    process.env["SUPABASE_PUBLISHABLE_KEYS"] = JSON.stringify({
      default: "sb_publishable_from_json",
    });
    expect(supabasePublishableKey()).toBe("sb_publishable_from_json");
  });

  it("throws when no Supabase URL is configured", () => {
    delete process.env["SUPABASE_URL"];
    delete process.env["VITE_SUPABASE_URL"];
    expect(() => supabaseProjectUrl()).toThrow(/SUPABASE_URL/);
  });
});
