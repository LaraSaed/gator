import { fetchFeed } from "./lib/rss/index.js";
import { readConfig, setUser } from "./config.js";
import { createFeed } from "./lib/db/queries/feeds.js";
import { User, Feed } from "./lib/db/schema.js";
import { createUser, getUserByName, deleteAllUsers, getUsers } from "./lib/db/queries/users.js";

export type CommandHandler = (cmdName: string, ...args: string[]) => Promise<void>;

export type CommandsRegistry = Record<string, CommandHandler>;

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

export async function handlerAgg(cmdName: string, ...args: string[]) {
  const feedURL = "https://www.wagslane.dev/index.xml";
  const feed = await fetchFeed(feedURL);
  console.log(JSON.stringify(feed, null, 2));
}

function printFeed(feed: Feed, user: User) {
  console.log(`* ID:      ${feed.id}`);
  console.log(`* Created: ${feed.createdAt}`);
  console.log(`* Updated: ${feed.updatedAt}`);
  console.log(`* Name:    ${feed.name}`);
  console.log(`* URL:     ${feed.url}`);
  console.log(`* User:    ${user.name}`);
}

export async function handlerAddFeed(cmdName: string, ...args: string[]) {
  if (args.length < 2) {
    throw new Error(`Usage: ${cmdName} <name> <url>`);
  }
  const [name, url] = args;

  const cfg = readConfig();
  const currentUserName = cfg.currentUserName;
  if (!currentUserName) {
    throw new Error("No user is currently logged in");
  }

  const user = await getUserByName(currentUserName);
  if (!user) {
    throw new Error(`User ${currentUserName} does not exist`);
  }

  const feed = await createFeed(name, url, user.id);

  console.log("Feed created successfully:");
  printFeed(feed, user);
}
