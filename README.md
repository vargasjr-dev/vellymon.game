# vellymon.game

A multiplayer RPG game built with Remix, deployed on Vercel.

## Tech Stack

- **Framework:** Remix (React)
- **Deployment:** Vercel
- **Database:** Neon (PostgreSQL)
- **Auth:** better-auth
- **ORM:** Drizzle

## Development

```bash
npm install
npm run dev
```

## Deployment

Deployed via Vercel. Push to `main` branch triggers automatic deployment.

## Environment Variables

Required environment variables:

- `DATABASE_URL` - Neon PostgreSQL connection string
- `BETTER_AUTH_SECRET` - Secret for better-auth sessions
- `BETTER_AUTH_URL` - Base URL for auth callbacks
- `GITHUB_CLIENT_ID` - GitHub OAuth (optional)
- `GITHUB_CLIENT_SECRET` - GitHub OAuth (optional)

## Migration Status

This project was recently migrated from:
- AWS (GameLift, RDS) → Vercel + Neon
- Clerk → better-auth
- CDK Terraform → vercel.json
- Custom fuegojs framework → Standard Remix

### TODO

Game server functionality (matchmaking, game sessions) needs reimplementation after removing AWS GameLift. See TODO comments in `app/data/` files.
