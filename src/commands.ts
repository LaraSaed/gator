import { scrapeFeeds, parseDuration } from "./lib/aggregator.js";
import { readConfig, setUser } from "./config.js";
import { createFeed, getFeeds, getFeedByUrl } from "./lib/db/queries/feeds.js";
import { createFeedFollow, getFeedFollowsForUser, deleteFeedFollow } from "./lib/db/queries/feed_follows.js";
import { User, Feed } from "./lib/db/schema.js";
import { createUser, getUserByName, deleteAllUsers, getUsers } from "./lib/db/queries/users.js";

export type CommandHandler = (cmdName: string, ...args: string[]) => Promise<void>;

export type UserCommandHandler = (
  cmdName: string,
  user: User,
  ...args: string[]
) => Promise<void>;

export type CommandsRegistry = Record<string, CommandHandler>;

export function middlewareLoggedIn(handler: UserCommandHandler): CommandHandler {
  return async (cmdName: string, ...args: string[]) => {
    const cfg = readConfig();
    const currentUserName = cfg.currentUserName;
    if (!currentUserName) {
      throw new Error("No user is currently logged in");
    }

    const user = await getUserByName(currentUserName);
    if (!user) {
      throw new Error(`User ${currentUserName} does not exist`);
    }

    await handler(cmdName, user, ...args);
  };
}

export async function handlerLogin(cmdName: string, ...args: string[]) {
  if (args.length === 0) {
    throw new Error(`Usage: ${cmdName} <username>`);
  }
  const username = args[0];

  const user = await getUserByName(username);
  if (!user) {
    throw new Error(`User ${username} does not exist`);
  }

  const cfg = readConfig();
  setUser(cfg, username);

  console.log(`User has been set to: ${username}`);
}

export async function handlerRegister(cmdName: string, ...args: string[]) {
  if (args.length === 0) {
    throw new Error(`Usage: ${cmdName} <name>`);
  }
  const name = args[0];

  const existingUser = await getUserByName(name);
  if (existingUser) {
    throw new Error(`User ${name} already exists`);
  }

  const user = await createUser(name);

  const cfg = readConfig();
  setUser(cfg, name);

  console.log(`User ${name} was created`);
  console.log(user);
}

export function registerCommand(
  registry: CommandsRegistry,
  cmdName: string,
  handler: CommandHandler
) {
  registry[cmdName] = handler;
}

export async function runCommand(
  registry: CommandsRegistry,
  cmdName: string,
  ...args: string[]
) {
  const handler = registry[cmdName];
  if (!handler) {
    throw new Error(`Unknown command: ${cmdName}`);
  }
  await handler(cmdName, ...args);
}

export async function handlerReset(cmdName: string, ...args: string[]) {
  try {
    await deleteAllUsers();
    console.log("Database reset successfully");
  } catch (err) {
    throw new Error(`Failed to reset database: ${err}`);
  }
}

export async function handlerUsers(cmdName: string, ...args: string[]) {
  const allUsers = await getUsers();
  const cfg = readConfig();

  for (const user of allUsers) {
    if (user.name === cfg.currentUserName) {
      console.log(`* ${user.name} (current)`);
    } else {
      console.log(`* ${user.name}`);
    }
  }
}


function printFeed(feed: Feed, user: User) {
  console.log(`* ID:      ${feed.id}`);
  console.log(`* Created: ${feed.createdAt}`);
  console.log(`* Updated: ${feed.updatedAt}`);
  console.log(`* Name:    ${feed.name}`);
  console.log(`* URL:     ${feed.url}`);
  console.log(`* User:    ${user.name}`);
}

export async function handlerAddFeed(cmdName: string, user: User, ...args: string[]) {
  if (args.length < 2) {
    throw new Error(`Usage: ${cmdName} <name> <url>`);
  }
  const [name, url] = args;

  const feed = await createFeed(name, url, user.id);

  console.log("Feed created successfully:");
  printFeed(feed, user);

  const feedFollow = await createFeedFollow(user.id, feed.id);
  console.log(`${feedFollow.userName} is now following ${feedFollow.feedName}`);
}

export async function handlerFeeds(cmdName: string, ...args: string[]) {
  const feeds = await getFeeds();

  for (const feed of feeds) {
    console.log(`* Name: ${feed.name}`);
    console.log(`* URL:  ${feed.url}`);
    console.log(`* User: ${feed.userName}`);
    console.log("---");
  }
}

export async function handlerFollow(cmdName: string, user: User, ...args: string[]) {
  if (args.length < 1) {
    throw new Error(`Usage: ${cmdName} <url>`);
  }
  const url = args[0];

  const feed = await getFeedByUrl(url);
  if (!feed) {
    throw new Error(`Feed with URL ${url} does not exist`);
  }

  const feedFollow = await createFeedFollow(user.id, feed.id);

  console.log(`${feedFollow.userName} is now following ${feedFollow.feedName}`);
}

export async function handlerFollowing(cmdName: string, user: User, ...args: string[]) {
  const feedFollows = await getFeedFollowsForUser(user.id);

  for (const ff of feedFollows) {
    console.log(`* ${ff.feedName}`);
  }
}

export async function handlerUnfollow(cmdName: string, user: User, ...args: string[]) {
  if (args.length < 1) {
    throw new Error(`Usage: ${cmdName} <url>`);
  }
  const url = args[0];

  const feed = await getFeedByUrl(url);
  if (!feed) {
    throw new Error(`Feed with URL ${url} does not exist`);
  }

  await deleteFeedFollow(user.id, feed.id);

  console.log(`${user.name} has unfollowed ${feed.name}`);
}

export async function handlerAgg(cmdName: string, ...args: string[]) {
  if (args.length < 1) {
    throw new Error(`Usage: ${cmdName} <time_between_reqs>`);
  }
  const timeBetweenRequests = parseDuration(args[0]);
  console.log(`Collecting feeds every ${args[0]}`);

  const handleError = (err: unknown) => {
    if (err instanceof Error) {
      console.error(err.message);
    } else {
      console.error(err);
    }
  };

  scrapeFeeds().catch(handleError);

  const interval = setInterval(() => {
    scrapeFeeds().catch(handleError);
  }, timeBetweenRequests);

  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      console.log("Shutting down feed aggregator...");
      clearInterval(interval);
      resolve();
    });
  });
}
