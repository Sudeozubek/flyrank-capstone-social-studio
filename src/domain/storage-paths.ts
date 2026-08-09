/** Pure storage path helper — no I/O, safe for application layer. */
export function campaignImagePath(userId: string, campaignId: string, platform: string): string {
  return `${userId}/${campaignId}/${platform}.png`;
}
