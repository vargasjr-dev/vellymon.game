import { sandbox } from '@vercel/sandbox';
import { db } from "../../data/db";
import { gameSession } from "../../data/schema";

const PROJECT_ID = 'prj_bAckE5PGlllJHSE2kGL74Bq3MjPV';

/**
 * Creates a new game session using Vercel Sandbox
 * Tracks the session in Postgres
 */
const createGame = async (userId: string) => {
  try {
    // Create a Vercel Sandbox deployment for the game server
    const sbx = await sandbox.create({
      projectId: PROJECT_ID,
      token: process.env.VERCEL_TOKEN!,
      name: 'vellymon-game-server',
      gitSource: {
        type: 'github',
        ref: 'main',
      },
    });
    
    // Track game session in Postgres
    const [session] = await db.insert(gameSession).values({
      deploymentId: sbx.id,
      status: 'active',
      createdBy: userId,
      maxPlayers: 4,
      currentPlayers: 1,
      metadata: {
        deploymentUrl: sbx.url,
      },
    }).returning();

    return {
      sessionId: session.uuid,
      deploymentId: sbx.id,
      url: sbx.url,
    };
  } catch (error) {
    console.error('Failed to create game:', error);
    throw new Error('Failed to create game session');
  }
};

export default createGame;
