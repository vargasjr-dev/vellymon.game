import WebSocket, { WebSocketServer } from "ws";
import GameLiftServerAPI, {
  LogParameters,
  ProcessParameters,
} from "@dplusic/gamelift-nodejs-serversdk";
import { OnStartGameSessionDelegate } from "@dplusic/gamelift-nodejs-serversdk/dist/types/Server/ProcessParameters";
import { NULL_VEC } from "./map";
import { commandsToEvents, Command, Game, storeCommands } from "./game";
import getVellymon from "~/data/getVellymon.server";
import getBoardById from "~/data/getBoardById.server";

const port = Number(process.argv[2]) || 12345;
const MAX_BATTERY = 256;
const game: Game = {
  healthChecks: 0,
  gameSessionId: "",
  nextVellymonId: 0,
  turn: 0,
  history: {},
  board: {
    spaces: [],
    height: 0,
    width: 0,
    primaryDock: new Set(),
    secondaryDock: new Set(),
  },
};

const onGameSession: OnStartGameSessionDelegate = (gameSession) => {
  game.gameSessionId = gameSession.GameSessionId || "";
  getBoardById(
    gameSession.GameProperties.find((p) => p.Key === "board")?.Value || ""
  ).then((board) => {
    game.board = board;
    GameLiftServerAPI.ActivateGameSession();
  });
};

const onUpdateGameSession = () => {
  console.log("Updating");
};

const EndGame = () => {
  GameLiftServerAPI.TerminateGameSession();
};

const onHealthCheck = (): boolean => {
  GameLiftServerAPI.DescribePlayerSessions({
    GameSessionId: game.gameSessionId,
    Limit: 2,
  }).then((result) => {
    const sessions = result.Result?.PlayerSessions || [];
    let timedOut = sessions.length > 0;
    sessions.forEach((ps) => {
      timedOut = timedOut && ps.Status === 4; // PlayerSessionStatus.TIMEDOUT;
    });
    if (timedOut) EndGame();
    if (game.healthChecks == 10 && sessions.length == 0) EndGame();
  });
  return true;
};

const onProcessTerminate = () => {
  console.log("IM THE TERMINATOR");
  GameLiftServerAPI.ProcessEnding();
  GameLiftServerAPI.Destroy();
  process.exit(0);
};

const onStartGame = (
  {
    myVellymons,
    myName,
  }: {
    myVellymons: string[];
    myName: string;
  },
  ws: WebSocket,
  game: Game
) => {
  console.log(
    "Client",
    myName,
    "Starting Game With Team",
    JSON.stringify(myVellymons, null, 4)
  );

  const isPrimary = !game.primary?.joined;
  return Promise.all(myVellymons.map(getVellymon))
    .then((myVellymons) => {
      const vellymons = myVellymons.map((v) => {
        const vellymon = {
          ...v,
          id: game.nextVellymonId++,
          position: NULL_VEC,
          startingHealth: v.health,
          currentEnergy: v.energy,
        };
        // game.board add to dock
        return vellymon;
      });
      const player = {
        name: myName,
        joined: true,
        ready: false,
        ws,
        team: vellymons,
        battery: MAX_BATTERY,
      };
      if (isPrimary) {
        game.primary = player;
      } else {
        game.secondary = player;
      }
      if (game.primary?.joined && game.secondary?.joined) {
        game.primary.ws.send(
          JSON.stringify({
            name: "GAME_READY",
            isPrimary: true,
            opponentName: game.secondary.name,
            myTeam: game.primary.team,
            opponentTeam: game.secondary.team,
          })
        );
        game.secondary.ws.send(
          JSON.stringify({
            name: "GAME_READY",
            isPrimary: false,
            opponentName: game.primary.name,
            myTeam: game.secondary.team,
            opponentTeam: game.primary.team,
          })
        );
      }
    })
    .catch((e) =>
      ws.send(JSON.stringify({ name: "ERROR", message: e.message }))
    );
};

const onAcceptPlayerSession = (
  {
    playerSessionId,
  }: {
    playerSessionId: string;
  },
  ws: WebSocket,
  game: Game
) => {
  if (game.primary?.joined && game.secondary?.joined) {
    ws.send(
      JSON.stringify({
        name: "RESUME_GAME",
        // current game state
      })
    );
    return;
  }
  return GameLiftServerAPI.AcceptPlayerSession(playerSessionId).then(
    (outcome) => {
      if (!outcome.Success) {
        console.error(outcome);
        return;
      }
      GameLiftServerAPI.DescribePlayerSessions({
        PlayerSessionId: playerSessionId,
        Limit: 1,
      }).then((p) =>
        onStartGame(
          {
            myName: p.Result?.PlayerSessions[0].PlayerId || "",
            myVellymons: p.Result?.PlayerSessions[0].PlayerData?.split(",") || [],
          },
          ws,
          game
        )
      );
    }
  );
};

const onSubmitCommands = (
  { commands }: { commands: Command[] },
  ws: WebSocket,
  game: Game
) => {
  console.log("Client Submitting Commands");
  try {
    const p =
      game.primary?.ws === ws
        ? game.primary
        : game.secondary?.ws === ws
        ? game.secondary
        : null;
    if (!p) {
      console.warn("Received submit commands from unknown player");
      return;
    }
    if (!game.primary || !game.secondary) {
      throw new Error("Lost reference to a player");
    }
    storeCommands(game, p, commands);
    if (game.primary.ready && game.secondary.ready) {
      const eventJsons = commandsToEvents(game as Required<Game>);
      const events = eventJsons.map((e) => JSON.stringify(e));
      game.primary.ws.send(
        JSON.stringify({
          name: "TURN_EVENTS",
          events,
          turn: game.turn,
        })
      );
      game.secondary.ws.send(
        JSON.stringify({
          name: "TURN_EVENTS",
          events,
          turn: game.turn,
        })
      );
      console.log("events sent: ", JSON.stringify(eventJsons, null, 4));
    } else {
      const otherWs =
        game.primary.ws === ws ? game.secondary.ws : game.primary.ws;
      otherWs.send(JSON.stringify({ name: "WAITING_COMMANDS" }));
    }
  } catch (err) {
    const e = err as Error;
    console.error(e);
    const props = {
      serverMessage:
        "Game server crashed when processing your submitted commands",
      exceptionType: e.name,
      exceptionMessage: e.message,
    };
    game.primary?.ws?.send?.(
      JSON.stringify({
        name: "SERVER_ERROR",
        props,
      })
    );
    game.secondary?.ws?.send?.(
      JSON.stringify({
        name: "SERVER_ERROR",
        props,
      })
    );
    EndGame();
  }
};

console.log(`Starting the server at port: ${port}`);
const outcome = GameLiftServerAPI.InitSDK();
const MESSAGE_HANDLERS = {
  ACCEPT_PLAYER_SESSION: onAcceptPlayerSession,
  SUBMIT_COMMANDS: onSubmitCommands,
} as const;

if (outcome.Success) {
  const paths = new LogParameters(["./logs"]);
  const wss = new WebSocketServer({ port }, () => {
    console.log("server started");
  });
  wss.on("connection", (ws) => {
    ws.on("message", (data) => {
      try {
        const { name, ...props } = JSON.parse(data.toString());
        console.log(name, props);
        MESSAGE_HANDLERS[name as keyof typeof MESSAGE_HANDLERS](
          props,
          ws,
          game
        );
      } catch (e) {
        console.error("Latest message failed:");
        console.error("- data:", data.toString());
        console.error("- error:", e);
      }
    });
  });
  wss.on("listening", () => {
    console.log(`listening on ${port}`);
    GameLiftServerAPI.ProcessReady(
      new ProcessParameters(
        onGameSession,
        onUpdateGameSession,
        onProcessTerminate,
        onHealthCheck,
        port,
        paths
      )
    );
  });
} else {
  console.log(outcome);
}
