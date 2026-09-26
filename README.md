# Gator

Gator is a command-line RSS feed aggregator. It lets multiple users on the same machine register accounts, add and follow RSS feeds, and run a background service that continuously fetches new posts and saves them to a database — all viewable from the terminal.

## Requirements

Before running Gator, make sure you have the following installed:

- **Node.js** (v22.15.0 or later) — [nvm](https://github.com/nvm-sh/nvm) is recommended for managing Node versions. Run `nvm use` in the project root to activate the correct version.
- **PostgreSQL** (v16 or later) — Gator needs a running Postgres server and a database created for it.

## Installation

Clone the repo and install dependencies:

```bash
git clone https://github.com/LaraSaed/gator.git
cd gator
npm install
```

## Configuration

Gator reads its settings from a JSON config file located at `~/.gatorconfig.json` in your home directory. Create it manually with the following structure:

```json
{
  "db_url": "postgres://username:password@localhost:5432/gator?sslmode=disable"
}
```

Replace the connection string with your own Postgres credentials and database name. The `current_user_name` field will be added automatically once you register or log in — you don't need to set it yourself.

Once your config is in place, run the database migrations:

```bash
npm run migrate
```

## Usage

Run any command with:

```bash
npm run start <command> [args...]
```

### Available commands

| Command | Description |
|---|---|
| `register <name>` | Create a new user and log in as them |
| `login <name>` | Switch the current logged-in user |
| `users` | List all registered users |
| `reset` | Delete all data (useful for local testing) |
| `addfeed <name> <url>` | Add a new RSS feed and automatically follow it |
| `feeds` | List all feeds added by any user |
| `follow <url>` | Follow a feed that already exists |
| `unfollow <url>` | Unfollow a feed |
| `following` | List feeds the current user follows |
| `agg <interval>` | Start the background aggregator (e.g. `agg 1m` checks feeds every minute). Runs until stopped with `Ctrl+C`. |
| `browse [limit]` | Show your most recent saved posts (default: 2) |

### Example workflow

```bash
npm run start register lane
npm run start addfeed "Hacker News" "https://news.ycombinator.com/rss"

# In one terminal, start the aggregator:
npm run start agg 1m

# In another terminal, browse saved posts:
npm run start browse 5
```

## Tech stack

- TypeScript (via [tsx](https://github.com/privatenumber/tsx))
- PostgreSQL
- [Drizzle ORM](https://orm.drizzle.team/)
- [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser) for RSS parsing
