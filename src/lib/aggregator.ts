import { fetchFeed } from "./rss/index.js";
import { getNextFeedToFetch, markFeedFetched } from "./db/queries/feeds.js";
import { createPost } from "./db/queries/posts.js";

function parsePubDate(pubDate: string): Date | null {
  const date = new Date(pubDate);
  if (isNaN(date.getTime())) {
    return null;
  }
  return date;
}

export async function scrapeFeeds() {
  const feed = await getNextFeedToFetch();
  if (!feed) {
    console.log("No feeds to fetch");
    return;
  }

  console.log(`Fetching feed: ${feed.name}`);

  await markFeedFetched(feed.id);

  const rssFeed = await fetchFeed(feed.url);

  for (const item of rssFeed.channel.item) {
    const publishedAt = parsePubDate(item.pubDate);
    await createPost(
      item.title,
      item.link,
      item.description ?? null,
      publishedAt,
      feed.id
    );
  }

  console.log(`Saved ${rssFeed.channel.item.length} posts from ${feed.name}`);
}

export function parseDuration(durationStr: string): number {
  const regex = /^(\d+)(ms|s|m|h)$/;
  const match = durationStr.match(regex);

  if (!match) {
    throw new Error(`Invalid duration: ${durationStr}`);
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "ms":
      return value;
    case "s":
      return value * 1000;
    case "m":
      return value * 1000 * 60;
    case "h":
      return value * 1000 * 60 * 60;
    default:
      throw new Error(`Invalid duration unit: ${unit}`);
  }
}
