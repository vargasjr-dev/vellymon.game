import { db } from "../../data/db";
import { gameSession } from "../../data/schema";

/**
 * Creates a new game session using Vercel Sandbox
 * Tracks the session in Postgres
 */
const createGame = async (userId: string) => {
  try {
    // Create a Vercel Sandbox deployment for the game server
    const deploymentResponse = await fetch('https://api.vercel.com/v1/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'vellymon-game-server',
        project: process.env.VERCEL_PROJECT_ID,
        target: 'production',
        // Sandbox-specific configuration
        sandbox: true,
        gitSource: {
          type: 'github',
          repo: process.env.GAME_SERVER_REPO || 'vargasjr-dev/vellymon-server',
          ref: 'main',
        },
      }),
    });

    if (!deploymentResponse.ok) {
      throw new Error(`Failed to create deployment: ${deploymentResponse.statusText}`);
    }

    const deployment = await deploymentResponse.json();
    
    // Track game session in Postgres
    const [session] = await db.insert(gameSession).values({
      deploymentId: deployment.id,
      status: 'active',
      createdBy: userId,
      maxPlayers: 4,
      currentPlayers: 1,
      metadata: {
        deploymentUrl: deployment.url,
      },
    }).returning();

    return {
      sessionId: session.uuid,
      deploymentId: deployment.id,
      url: deployment.url,
    };
  } catch (error) {
    console.error('Failed to create game:', error);
    throw new Error('Failed to create game session');
  }
};

export default createGame;
