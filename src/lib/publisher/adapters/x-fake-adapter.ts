import { FakePlatformAdapter, type AdapterOptions } from "./fake-transport";
import type { PublishInput } from "../types";

/** X adapter — wide asset, caption posted as tweet text with attached media. */
export class XFakeAdapter extends FakePlatformAdapter {
  constructor(options?: AdapterOptions) {
    super("x", options);
  }

  protected override buildPayload(post: PublishInput, caption: string) {
    return { text: caption, caption, image_url: post.imageUrl, media_category: "tweet_image" };
  }
}
