# vellymon.game

A multiplayer RPG game built with Next.js, deployed on Vercel.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Deployment:** Vercel (with Sandbox support for game servers)
- **Database:** Neon (PostgreSQL)
- **Auth:** better-auth with Google OAuth
- **ORM:** Drizzle

## Development

```bash
npm install
npm run dev
```

## Deployment

Deployed via Vercel. Push to `main` branch triggers automatic deployment.

Game servers run in Vercel Sandboxes, with sessions tracked in Postgres.

## Environment Variables

Required environment variables:

- `DATABASE_URL` - Neon PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Secret for better-auth sessions
- `BETTER_AUTH_URL` - Base URL for auth callbacks
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `VERCEL_TOKEN` - Vercel API token for creating sandboxes

## Game Architecture

### Vellymons
Each player can collect and battle with vellymons. Vellymons have stats:
- Health
- Attack
- Speed
- Energy (collected by eating or sleeping, consumed for movement and attacks)

### Game Sessions
Game sessions are created as Vercel Sandboxes and tracked in Postgres with:
- Deployment ID
- Player list
- Session status
- Metadata

### Matchmaking
Players can create new games or join existing ones. The system tracks:
- Current player count
- Max players per game
- Player join/leave status
