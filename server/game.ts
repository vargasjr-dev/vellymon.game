import {
  BatterySpace,
  Map,
  NULL_VEC,
  QueueSpace,
  Space,
} from "./map";
import { WebSocket } from "ws";
import { QUEUE_SPACE_ID, BATTERY_SPACE_ID } from "../src/enums/spaces";

type Position = {
  x: number;
  y: number;
};

export type VellymonStats = {
  priority: number;
  health: number;
  attack: number;
  name: string;
  uuid: string;
};

export type Vellymon = {
  id: number;
  position: Position;
  startingHealth: number;
} & VellymonStats;

type Player = {
  joined: boolean;
  ws: WebSocket;
  name: string;
  ready: boolean;
  team: Vellymon[];
  battery: number;
};

const SPAWN_COMMAND_ID = 0;
const MOVE_COMMAND_ID = 1;
const ATTACK_COMMAND_ID = 2;
const SPECIAL_COMMAND_ID = 3;

const DEFAULT_SPAWN_POWER = 2;
const DEFAULT_MOVE_POWER = 2;
const DEFAULT_ATTACK_POWER = 2;
const DEFAULT_DEATH_MULTIPLIER = 16;
const MAX_PRIORITY = 8;
const DEFAULT_BATTERY_MULTIPLIER = 8;

export type Command = {
  vellymonId: number;
  commandId: number;
  direction: number;
};

const SPAWN_EVENT_ID = 1;
const MOVE_EVENT_ID = 2;
const ATTACK_EVENT_ID = 3;
const DEATH_EVENT_ID = 9;
const RESOLVE_EVENT_ID = 12;
const END_EVENT_ID = 13;

type GameEventBase = {
  priority: number;
  primaryBatteryCost: number;
  secondaryBatteryCost: number;
};

type SpawnEvent = GameEventBase & {
  type: typeof SPAWN_EVENT_ID;
  destinationPos: Position;
  vellymonId: number;
};

type MoveEvent = GameEventBase & {
  type: typeof MOVE_EVENT_ID;
  sourcePos: Position;
  destinationPos: Position;
  vellymonId: number;
};

type AttackEvent = GameEventBase & {
  type: typeof ATTACK_EVENT_ID;
  locs: ReadonlyArray<Position>;
  vellymonId: number;
};

type ResolveEvent = GameEventBase & {
  type: typeof RESOLVE_EVENT_ID;
  vellymonIdToSpawn: number[];
  vellymonIdToMove: number[];
  vellymonIdToHealth: number[];
  missedAttacks: number[];
  vellymonIdsBlocked: number[];
  myBatteryHit: boolean;
  opponentBatteryHit: boolean;
};

type DeathEvent = GameEventBase & {
  type: typeof DEATH_EVENT_ID;
  vellymonId: number;
  returnHealth: number;
};

type EndEvent = GameEventBase & {
  type: typeof END_EVENT_ID;
  primaryLost: boolean;
  secondaryLost: boolean;
  turnCount: number;
};

type GameEvent =
  | SpawnEvent
  | MoveEvent
  | AttackEvent
  | DeathEvent
  | ResolveEvent
  | EndEvent;

export type Game = {
  healthChecks: number;
  gameSessionId: string;
  board: Map;
  nextVellymonId: 0;
  primary?: Player;
  secondary?: Player;
  turn: number;
  history: { [turn: number]: { [name: string]: Command[] } };
};

type LiveGame = Required<Game>;

export const storeCommands = (
  g: Game,
  p: Player,
  commands: Omit<Command, "owner">[]
): void => {
  g.history[g.turn] = {
    ...(g.history[g.turn] || {}),
    [p.name]: (commands || []).map((c) => ({ ...c, owner: p.name })),
  };
  p.ready = true;
};

const UP = 0;
const LEFT = 1;
const DOWN = 2;
const RIGHT = 3;
const directionToVector = (dir: number) => {
  switch (dir) {
    case UP:
      return { x: 0, y: 1 };
    case DOWN:
      return { x: 0, y: -1 };
    case LEFT:
      return { x: -1, y: 0 };
    case RIGHT:
      return { x: 1, y: 0 };
    default:
      return { x: 0, y: 0 };
  }
};
const posEquals = (l: Position, r: Position) => l.x === r.x && l.y === r.y;
const posPlus = (l: Position, r: Position) => ({ x: l.x + r.x, y: l.y + r.y });

const spawn = (
  v: Vellymon,
  pos: Position,
  isPrimary: boolean,
  priority: number
): GameEvent[] => {
  if (!posEquals(v.position, NULL_VEC)) return [];
  const evt = {
    destinationPos: pos,
    vellymonId: v.id,
    type: SPAWN_EVENT_ID,
    primaryBatteryCost: isPrimary ? DEFAULT_SPAWN_POWER : 0,
    secondaryBatteryCost: isPrimary ? 0 : DEFAULT_SPAWN_POWER,
    priority,
  } as const;
  return [evt];
};
const move = (
  v: Vellymon,
  dir: number,
  isPrimary: boolean,
  priority: number
): GameEvent[] => {
  if (posEquals(v.position, NULL_VEC)) return [];
  const evt = {
    sourcePos: v.position,
    destinationPos: posPlus(v.position, directionToVector(dir)),
    vellymonId: v.id,
    type: MOVE_EVENT_ID,
    primaryBatteryCost: isPrimary ? DEFAULT_MOVE_POWER : 0,
    secondaryBatteryCost: isPrimary ? 0 : DEFAULT_MOVE_POWER,
    priority,
  } as const;
  return [evt];
};
const attack = (
  v: Vellymon,
  dir: number,
  isPrimary: boolean,
  priority: number
): GameEvent[] => {
  if (posEquals(v.position, NULL_VEC)) return [];
  const evt = {
    locs: [posPlus(v.position, directionToVector(dir))],
    vellymonId: v.id,
    type: ATTACK_EVENT_ID,
    primaryBatteryCost: isPrimary ? DEFAULT_ATTACK_POWER : 0,
    secondaryBatteryCost: isPrimary ? 0 : DEFAULT_ATTACK_POWER,
    priority,
  } as const;
  return [evt];
};
const damage = (attacker: Vellymon /*victim: Vellymon*/) => attacker.attack;
const spaceToId = (board: Map, p: Position) => p.y * board.width + p.x;
const vecToSpace = (board: Map, p: Position) => {
  if (p.y < 0 || p.y >= board.height || p.x < 0 || p.x >= board.width)
    return null;
  return board.spaces[spaceToId(board, p)];
};

const getQueuePosition = (
  board: Map,
  i: number,
  isPrimary: boolean
): Position => {
  const queueSpaces: QueueSpace[] = board.spaces.filter(
    (s): s is QueueSpace => s.type == QUEUE_SPACE_ID
  );
  const queueSpace = queueSpaces.find(
    (s) => s.index === i && s.isPrimary === isPrimary
  );
  return {
    x: typeof queueSpace?.x === "number" ? queueSpace.x : -1,
    y: typeof queueSpace?.y === "number" ? queueSpace.y : -1,
  };
};

export const commandsToEvents = (game: LiveGame): GameEvent[] => {
  const { primary, secondary, history, board, turn } = game;
  const commands = [
    ...history[game.turn][game.primary.name],
    ...history[game.turn][game.secondary.name],
  ];
  const allVellymons = [...primary.team, ...secondary.team];
  const getVellymon = Object.fromEntries(allVellymons.map((v) => [v.id, v]));
  const vellymonIdToTurnObject = Object.fromEntries(
    allVellymons.map((v) => [
      v.id,
      {
        vellymonId: v.id,
        priority: v.priority,
        num: {
          [SPAWN_COMMAND_ID]: 0,
          [MOVE_COMMAND_ID]: 0,
          [ATTACK_COMMAND_ID]: 0,
          [SPECIAL_COMMAND_ID]: 0,
        },
        isActive: true,
      },
    ])
  );
  const events: GameEvent[] = [];
  for (let p = MAX_PRIORITY; p > 0; p--) {
    const currentCmds = new Set<Command>(
      Object.values(vellymonIdToTurnObject)
        .filter(
          (vto) =>
            vto.priority === p && commands.some((c) => c.vellymonId == vto.vellymonId)
        )
        .map((vto) => {
          vto.priority--;
          const commandIndex = commands.findIndex(
            (c) => c.vellymonId === vto.vellymonId
          );
          return commands.splice(commandIndex, 1)[0];
        })
    );
    const priorityEvents: GameEvent[] = [];
    currentCmds.forEach((c) => {
      if (
        !vellymonIdToTurnObject[c.vellymonId].isActive &&
        !(c.commandId === SPAWN_COMMAND_ID)
      ) {
        currentCmds.delete(c);
      }
    });
    currentCmds.forEach((c) => {
      const primaryVellymon = getVellymon[c.vellymonId];
      const isPrimary = primary.team.includes(primaryVellymon);
      if (c.commandId === SPAWN_COMMAND_ID) {
        priorityEvents.push(
          ...spawn(
            primaryVellymon,
            getQueuePosition(board, c.direction, isPrimary),
            isPrimary,
            p
          )
        );
      } else if (c.commandId === MOVE_COMMAND_ID) {
        priorityEvents.push(...move(primaryVellymon, c.direction, isPrimary, p));
      } else if (c.commandId === ATTACK_COMMAND_ID) {
        priorityEvents.push(...attack(primaryVellymon, c.direction, isPrimary, p));
      }
    });

    if (priorityEvents.length > 0) {
      const resolveEvent = {
        vellymonIdToSpawn: Object.fromEntries(
          priorityEvents
            .filter((e): e is SpawnEvent => e.type === SPAWN_EVENT_ID)
            .map((e) => [e.vellymonId, e.destinationPos])
        ),
        vellymonIdToMove: Object.fromEntries(
          priorityEvents
            .filter((e): e is MoveEvent => e.type === MOVE_EVENT_ID)
            .map((e) => [e.vellymonId, e.destinationPos])
        ),
        vellymonIdToHealth: {} as Record<number, number>,
        vellymonIdsBlocked: new Set<number>(),
        missedAttacks: new Set<Position>(),
        primaryBatteryCost: 0,
        secondaryBatteryCost: 0,
        priority: p,
        myBatteryHit: false,
        opponentBatteryHit: false,
      };

      priorityEvents
        .filter((e): e is AttackEvent => e.type === ATTACK_EVENT_ID)
        .forEach((e) => {
          const attacker = getVellymon[e.vellymonId];
          allVellymons
            .filter((vellymon) => e.locs.some((l) => posEquals(l, vellymon.position)))
            .forEach((v) => {
              const dmg = damage(attacker /*v*/);
              resolveEvent.vellymonIdToHealth[v.id] =
                (resolveEvent.vellymonIdToHealth[v.id] || v.health) - dmg;
            });
          const locSpaces = e.locs.map((p) => vecToSpace(board, p));
          locSpaces
            .filter((p): p is BatterySpace => p?.type === BATTERY_SPACE_ID)
            .forEach((v) => {
              const drain = DEFAULT_BATTERY_MULTIPLIER * attacker.attack;
              resolveEvent.primaryBatteryCost += v.isPrimary ? drain : 0;
              resolveEvent.secondaryBatteryCost += v.isPrimary ? 0 : drain;
              resolveEvent.myBatteryHit =
                resolveEvent.myBatteryHit || v.isPrimary;
              resolveEvent.opponentBatteryHit =
                resolveEvent.opponentBatteryHit || !v.isPrimary;
            });
          locSpaces
            .filter(
              (v): v is Space =>
                !!v &&
                v?.type !== BATTERY_SPACE_ID &&
                !allVellymons.some((vel) => posEquals(vel.position, v))
            )
            .forEach((v) => {
              resolveEvent.missedAttacks.add(v);
            });
          if (locSpaces.some((v) => v === null))
            resolveEvent.vellymonIdsBlocked.add(attacker.id);
        });

      let valid = false;
      while (!valid) {
        valid = true;

        // Move x Move
        const spacesToVellymonIds: {
          [space: number]: { id: number; isSpawn: boolean }[];
        } = {};
        Object.entries(resolveEvent.vellymonIdToSpawn).forEach(
          ([vellymonId, space]) => {
            const id = Number(vellymonId);
            spacesToVellymonIds[spaceToId(board, space)] = [
              ...(spacesToVellymonIds[spaceToId(board, space)] || []),
              { id, isSpawn: true },
            ];
          }
        );
        Object.entries(resolveEvent.vellymonIdToMove).forEach(
          ([vellymonId, space]) => {
            const id = Number(vellymonId);
            spacesToVellymonIds[spaceToId(board, space)] = [
              ...(spacesToVellymonIds[spaceToId(board, space)] || []),
              { id, isSpawn: true },
            ];
          }
        );
        Object.values(spacesToVellymonIds)
          .filter((vellymonIds) => vellymonIds.length > 1)
          .forEach((vellymonIds) =>
            vellymonIds.forEach((v) => {
              if (v.isSpawn) delete resolveEvent.vellymonIdToSpawn[v.id];
              else delete resolveEvent.vellymonIdToMove[v.id];
              resolveEvent.vellymonIdsBlocked.add(v.id);
              valid = false;
            })
          );

        // Spawn x Still
        const spawnsToBlock = Object.entries(
          resolveEvent.vellymonIdToSpawn
        ).filter(([, space]) => {
          const other = allVellymons.find((v) => posEquals(v.position, space));
          if (other == null) return false;
          return !Object.keys(resolveEvent.vellymonIdToMove).some(
            (m) => other.id === Number(m)
          );
        });
        spawnsToBlock.forEach(([vellymonId]) => {
          const id = Number(vellymonId);
          delete resolveEvent.vellymonIdToSpawn[id];
          resolveEvent.vellymonIdsBlocked.add(id);
          valid = false;
        });

        // Move x Still/Swap
        const movesToBlock = Object.entries(resolveEvent.vellymonIdToMove).filter(
          ([vellymonId, pos]) => {
            const space = vecToSpace(board, pos);
            if (!space || space.type === BATTERY_SPACE_ID) return true;
            const self = getVellymon[vellymonId];
            const other = allVellymons.find((v) => posEquals(v.position, pos));
            if (other == null) return false;
            return !Object.entries(resolveEvent.vellymonIdToMove).some(
              (m) =>
                other.id === Number(m[0]) && !posEquals(self.position, m[1])
            );
          }
        );
        movesToBlock.forEach(([vellymonId]) => {
          const id = Number(vellymonId);
          delete resolveEvent.vellymonIdToMove[id];
          resolveEvent.vellymonIdsBlocked.add(id);
          valid = false;
        });
      }
      priorityEvents.push({
        ...resolveEvent,
        type: RESOLVE_EVENT_ID,
        vellymonIdToSpawn: Object.entries(resolveEvent.vellymonIdToSpawn).flatMap(
          ([k, p]) => [Number(k), p.x, p.y]
        ),
        vellymonIdToMove: Object.entries(resolveEvent.vellymonIdToMove).flatMap(
          ([k, p]) => [Number(k), p.x, p.y]
        ),
        vellymonIdToHealth: Object.entries(resolveEvent.vellymonIdToHealth).flatMap(
          ([k, v]) => [Number(k), v]
        ),
        vellymonIdsBlocked: Array.from(resolveEvent.vellymonIdsBlocked),
        missedAttacks: Array.from(resolveEvent.missedAttacks).flatMap((p) => [
          p.x,
          p.y,
        ]),
      });

      const delayResolved = Object.keys(resolveEvent.vellymonIdToHealth).filter(
        (h) =>
          Object.keys(resolveEvent.vellymonIdToMove).some((m) => m === h) ||
          Object.keys(resolveEvent.vellymonIdsBlocked).some((b) => b === h)
      );
      if (delayResolved.length > 0) {
        const delayedVellymonIdToHealth = Object.fromEntries(
          delayResolved.map((vellymonId) => {
            const id = Number(vellymonId);
            const health = resolveEvent.vellymonIdToHealth[id];
            delete resolveEvent.vellymonIdToHealth[id];
            return [id, health];
          })
        );
        const delayResolveEvent: ResolveEvent = {
          type: RESOLVE_EVENT_ID,
          vellymonIdToSpawn: [],
          vellymonIdToMove: [],
          vellymonIdToHealth: Object.entries(delayedVellymonIdToHealth).flatMap(
            ([k, p]) => [Number(k), p]
          ),
          vellymonIdsBlocked: [],
          missedAttacks: [],
          primaryBatteryCost: 0,
          secondaryBatteryCost: 0,
          priority: p,
          myBatteryHit: false,
          opponentBatteryHit: false,
        };
        priorityEvents.push(delayResolveEvent);
      }
      Object.entries(resolveEvent.vellymonIdToSpawn).forEach(([id, pos]) => {
        getVellymon[id].position = pos;
      });
      Object.entries(resolveEvent.vellymonIdToMove).forEach(([id, pos]) => {
        getVellymon[id].position = pos;
      });
      Object.entries(resolveEvent.vellymonIdToHealth).forEach(([id, health]) => {
        getVellymon[id].health = health;
      });
    }
    Object.entries(vellymonIdToTurnObject).forEach(
      ([id, obj]) =>
        (obj.isActive = !posEquals(getVellymon[id].position, NULL_VEC))
    );

    const processPriorityFinish = (team: Vellymon[], isPrimary: boolean) => {
      const evts: GameEvent[] = [];
      team.forEach((v) => {
        if (v.health <= 0) {
          (isPrimary ? board.primaryDock : board.secondaryDock).add(v.id);
          v.health = v.startingHealth;
          v.position = NULL_VEC;
          evts.push({
            type: DEATH_EVENT_ID,
            returnHealth: v.startingHealth,
            vellymonId: v.id,
            primaryBatteryCost: isPrimary ? DEFAULT_DEATH_MULTIPLIER : 0,
            secondaryBatteryCost: isPrimary ? 0 : DEFAULT_DEATH_MULTIPLIER,
            priority: p,
          });
        }
      });
      return evts;
    };
    priorityEvents.push(...processPriorityFinish(primary.team, true));
    priorityEvents.push(...processPriorityFinish(secondary.team, false));

    priorityEvents.forEach((e) => {
      primary.battery -= e.primaryBatteryCost;
      secondary.battery -= e.secondaryBatteryCost;
    });
    events.push(...priorityEvents);
    if (primary.battery <= 0 || secondary.battery <= 0) {
      events.push({
        type: END_EVENT_ID,
        primaryLost: primary.battery <= 0,
        secondaryLost: secondary.battery <= 0,
        primaryBatteryCost: Math.max(primary.battery, 0),
        secondaryBatteryCost: Math.max(secondary.battery, 0),
        priority: p,
        turnCount: turn,
      });
      break;
    }
  }

  game.primary.ready = false;
  game.secondary.ready = false;
  return events;
};
