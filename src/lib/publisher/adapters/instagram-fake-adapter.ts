import { FakePlatformAdapter, type AdapterOptions } from "./fake-transport";
import type { PublishInput } from "../types";

/** Instagram adapter — square asset, caption carries the hashtag block. */
export class InstagramFakeAdapter extends FakePlatformAdapter {
  constructor(options?: AdapterOptions) {
    super("instagram", options);
  }

  protected override buildPayload(post: PublishInput, caption: string) {
    return { caption, image_url: post.imageUrl, media_type: "IMAGE", container: "feed" };
  }
}
