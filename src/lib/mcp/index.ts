/**
 * CampaignHub MCP server — a thin interface over the existing application
 * layer. Every tool delegates to the same use cases the web UI calls; no
 * business logic, caption generation or model access lives here.
 */

import { auth, defineMcp } from "@lovable.dev/mcp-js";
import campaignStatusTool from "./tools/campaign-status";
import createCampaignTool from "./tools/create-campaign";
import getCampaignTool from "./tools/get-campaign";
import listCampaignsTool from "./tools/list-campaigns";
import publishCampaignTool from "./tools/publish-campaign";
import retryCampaignTool from "./tools/retry-campaign";
import scheduleCampaignTool from "./tools/schedule-campaign";

// The OAuth issuer must be the direct Supabase host; the project ref is the
// only value that survives publish unchanged and is inlined at build time.
const projectRef = import.meta.env['VITE_SUPABASE_PROJECT_ID'] ?? "project-ref-unset";

export default defineMcp({
  name: "campaign-canvas",
  title: "Campaign Canvas",
  version: "0.1.0",
  instructions:
    "Remote control for CampaignHub Studio. Campaigns turn a blog post into platform-native captions and image variants, then publish through a durable, idempotent pipeline. Use `list_campaigns` to browse, `get_campaign` for full detail, `create_campaign` with an existing postId to build a new one, `schedule_campaign` / `publish_campaign` to deliver, `retry_campaign` after a failure, and `campaign_status` to poll delivery. All tools act as the signed-in user and only see that user's data.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  // Cast: the SDK's ToolDefinition declares an optional `outputSchema` that
  // this project's `exactOptionalPropertyTypes` reads as required-or-undefined.
  tools: [
    createCampaignTool,
    listCampaignsTool,
    getCampaignTool,
    campaignStatusTool,
    scheduleCampaignTool,
    publishCampaignTool,
    retryCampaignTool,
  ] as never,
});
