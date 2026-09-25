import { XMLParser } from "fast-xml-parser";

export type RSSFeed = {
  channel: {
    title: string;
    link: string;
    description: string;
    item: RSSItem[];
  };
};

export type RSSItem = {
  title: string;
  link: string;
  description: string;
  pubDate: string;
};

export async function fetchFeed(feedURL: string): Promise<RSSFeed> {
  const res = await fetch(feedURL, {
    headers: {
      "User-Agent": "gator",
    },
  });

  const xml = await res.text();

  const parser = new XMLParser({ processEntities: false });
  const parsed = parser.parse(xml);

  const channel = parsed?.rss?.channel;
  if (!channel) {
    throw new Error("RSS feed is missing a channel field");
  }

  const title = channel.title;
  const link = channel.link;
  const description = channel.description;

  if (
    typeof title !== "string" ||
    typeof link !== "string" ||
    typeof description !== "string"
  ) {
    throw new Error("RSS feed channel is missing required metadata");
  }

  const rawItems = channel.item
    ? Array.isArray(channel.item)
      ? channel.item
      : [channel.item]
    : [];

  const items: RSSItem[] = [];
  for (const rawItem of rawItems) {
    if (
      typeof rawItem?.title !== "string" ||
      typeof rawItem?.link !== "string" ||
      typeof rawItem?.description !== "string" ||
      typeof rawItem?.pubDate !== "string"
    ) {
      continue;
    }
    items.push({
      title: rawItem.title,
      link: rawItem.link,
      description: rawItem.description,
      pubDate: rawItem.pubDate,
    });
  }

  return {
    channel: {
      title,
      link,
      description,
      item: items,
    },
  };
}
