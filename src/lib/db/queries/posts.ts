import { eq, desc, inArray } from "drizzle-orm";
import { db } from "../index.js";
import { posts, feedFollows } from "../schema.js";

export async function createPost(
  title: string,
  url: string,
  description: string | null,
  publishedAt: Date | null,
  feedId: string
) {
  const [result] = await db
    .insert(posts)
    .values({ title, url, description, publishedAt, feedId })
    .onConflictDoNothing()
    .returning();
  return result;
}

export async function getPostsForUser(userId: string, limit: number) {
  const followedFeeds = await db
    .select({ feedId: feedFollows.feedId })
    .from(feedFollows)
    .where(eq(feedFollows.userId, userId));

  const feedIds = followedFeeds.map((f) => f.feedId);
  if (feedIds.length === 0) {
    return [];
  }

  const results = await db
    .select()
    .from(posts)
    .where(inArray(posts.feedId, feedIds))
    .orderBy(desc(posts.publishedAt))
    .limit(limit);

  return results;
}
