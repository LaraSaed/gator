import { fetchFeed } from "./rss/index.js";
import { getNextFeedToFetch, markFeedFetched } from "./db/queries/feeds.js";

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
    console.log(`* ${item.title}`);
  }
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
