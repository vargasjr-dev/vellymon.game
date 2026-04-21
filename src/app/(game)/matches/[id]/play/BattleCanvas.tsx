"use client";

import { useRef, useEffect, useCallback } from "react";
import { Application, Container, Graphics, Sprite, Text, TextStyle, Assets } from "pixi.js";

type VellymonDisplay = {
  uuid: string;
  name: string;
  hp: number;
  maxHp: number;
  speed: number;
  attack: number;
  x: number;
  y: number;
  isKO: boolean;
  teamId: 1 | 2;
  imageUrl?: string;
};

type BoardSpace = {
  x: number;
  y: number;
  type: string;
  occupationCounter?: number;
};

type Props = {
  boardWidth: number;
  boardHeight: number;
  spaces: BoardSpace[];
  vellymons: VellymonDisplay[];
  yourTeamId: 1 | 2;
  selectedVellymon: string | null;
  onSelectVellymon: (uuid: string | null) => void;
};

// Colors
const COLORS = {
  bg: 0x0a0f1a,
  tile: 0x111b2e,
  tileBorder: 0x1e2d4a,
  occupation: 0x3d2800,
  occupationBorder: 0xb8860b,
  occupationStar: 0xffd700,
  harvestable: 0x0a2810,
  harvestableBorder: 0x1a5c2a,
  spawn: 0x0f1628,
  spawnBorder: 0x2a3a5c,
  yourTeam: 0x2563eb,
  yourTeamGlow: 0x3b82f6,
  opponent: 0xdc2626,
  opponentGlow: 0xef4444,
  hpBarBg: 0x1f2937,
  hpBarGreen: 0x22c55e,
  hpBarYellow: 0xeab308,
  hpBarRed: 0xef4444,
  selected: 0xfbbf24,
};

// Cache loaded textures
const textureCache = new Map<string, Promise<unknown>>();

export default function BattleCanvas({
  boardWidth,
  boardHeight,
  spaces,
  vellymons,
  yourTeamId,
  selectedVellymon,
  onSelectVellymon,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const stateRef = useRef({ boardWidth, boardHeight, spaces, vellymons, yourTeamId, selectedVellymon });

  // Keep stateRef current
  stateRef.current = { boardWidth, boardHeight, spaces, vellymons, yourTeamId, selectedVellymon };

  const draw = useCallback(() => {
    const app = appRef.current;
    if (!app) return;

    const { boardWidth: bw, boardHeight: bh, spaces: sp, vellymons: vms, yourTeamId: myTeam, selectedVellymon: selVm } = stateRef.current;

    // Clear
    app.stage.removeChildren();

    const screenW = app.screen.width;
    const screenH = app.screen.height;

    // Use window dimensions for orientation — container may be squished by margins
    const isPortrait = window.innerHeight > window.innerWidth;

    // Grid dimensions — if portrait, swap axes so board is tall
    // In portrait: x-axis (team1→team2) becomes vertical, y-axis becomes horizontal
    // Player's team (team 1 or 2) should be at the BOTTOM
    const cols = isPortrait ? bh : bw;
    const rows = isPortrait ? bw : bh;

    // Calculate tile size to fit the screen with padding
    const padding = 12;
    const gap = 3;
    const availW = screenW - padding * 2;
    const availH = screenH - padding * 2;
    const tileW = Math.floor((availW - gap * (cols - 1)) / cols);
    const tileH = Math.floor((availH - gap * (rows - 1)) / rows);
    const tileSize = Math.min(tileW, tileH, 72);
    const cornerRadius = 6;

    // Center the grid
    const gridW = cols * tileSize + (cols - 1) * gap;
    const gridH = rows * tileSize + (rows - 1) * gap;
    const offsetX = (screenW - gridW) / 2;
    const offsetY = (screenH - gridH) / 2;

    const boardContainer = new Container();
    boardContainer.x = offsetX;
    boardContainer.y = offsetY;
    app.stage.addChild(boardContainer);

    // Space lookup
    const spaceMap = new Map<string, BoardSpace>();
    for (const s of sp) {
      spaceMap.set(`${s.x},${s.y}`, s);
    }

    // Vellymon lookup by position
    const vmMap = new Map<string, VellymonDisplay>();
    for (const v of vms) {
      if (!v.isKO) {
        vmMap.set(`${v.x},${v.y}`, v);
      }
    }

    // Draw each cell
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        // Map display coords back to game coords
        let gx: number, gy: number;
        if (isPortrait) {
          // Rotated: vertical board
          // Your team should be at BOTTOM
          if (myTeam === 1) {
            // Team 1 spawns at x=0 (low x) → put at bottom (high row)
            gx = rows - 1 - row;
            gy = col;
          } else {
            // Team 2 spawns at x=7 (high x) → put at bottom (high row)
            gx = row;
            gy = col;
          }
        } else {
          gx = col;
          gy = row;
        }

        const px = col * (tileSize + gap);
        const py = row * (tileSize + gap);

        const space = spaceMap.get(`${gx},${gy}`);
        const vm = vmMap.get(`${gx},${gy}`);
        const isOccupation = space?.type === "occupation";
        const isHarvestable = space?.type === "harvestable";
        const isSpawn = space?.type === "spawn";
        const isSelected = vm && vm.uuid === selVm;
        const isYours = vm && vm.teamId === myTeam;

        // Tile background
        const tile = new Graphics();

        // Selection glow
        if (isSelected) {
          tile.roundRect(px - 2, py - 2, tileSize + 4, tileSize + 4, cornerRadius + 2);
          tile.fill({ color: COLORS.selected, alpha: 0.6 });
        }

        // Tile fill
        let fillColor = COLORS.tile;
        let borderColor = COLORS.tileBorder;
        if (isOccupation) {
          fillColor = COLORS.occupation;
          borderColor = COLORS.occupationBorder;
        } else if (isHarvestable) {
          fillColor = COLORS.harvestable;
          borderColor = COLORS.harvestableBorder;
        } else if (isSpawn) {
          fillColor = COLORS.spawn;
          borderColor = COLORS.spawnBorder;
        }

        // Override border for vellymon-occupied tiles
        if (vm) {
          borderColor = isYours ? COLORS.yourTeam : COLORS.opponent;
        }

        tile.roundRect(px, py, tileSize, tileSize, cornerRadius);
        tile.fill(fillColor);
        tile.stroke({ color: borderColor, width: vm ? 2 : 1 });
        boardContainer.addChild(tile);

        // Make tiles interactive for vellymon selection
        if (vm && isYours) {
          tile.eventMode = "static";
          tile.cursor = "pointer";
          const vuuid = vm.uuid;
          tile.on("pointertap", () => {
            onSelectVellymon(selVm === vuuid ? null : vuuid);
          });
        }

        // Vellymon rendering
        if (vm) {
          const centerX = px + tileSize / 2;
          const centerY = py + tileSize / 2;
          const avatarSize = tileSize * 0.6;

          if (vm.imageUrl) {
            // Load and display avatar sprite
            const url = vm.imageUrl;
            if (!textureCache.has(url)) {
              textureCache.set(url, Assets.load(url));
            }
            textureCache.get(url)!.then((texture) => {
              // Only add if app still exists and this draw cycle is current
              if (!appRef.current || !boardContainer.parent) return;
              const sprite = new Sprite(texture as never);
              sprite.width = avatarSize;
              sprite.height = avatarSize;
              sprite.anchor.set(0.5);
              sprite.x = centerX;
              sprite.y = centerY - 4;
              boardContainer.addChild(sprite);
            }).catch(() => {
              // Fallback: draw colored circle
              drawFallbackAvatar(boardContainer, centerX, centerY - 4, avatarSize / 2, isYours ? COLORS.yourTeamGlow : COLORS.opponentGlow);
            });
          } else {
            // No imageUrl — fallback circle
            drawFallbackAvatar(boardContainer, centerX, centerY - 4, avatarSize / 2, isYours ? COLORS.yourTeamGlow : COLORS.opponentGlow);
          }

          // HP bar at bottom of tile
          const hpBarW = tileSize * 0.75;
          const hpBarH = 4;
          const hpBarX = centerX - hpBarW / 2;
          const hpBarY = py + tileSize - 8;
          const hpPercent = vm.maxHp > 0 ? vm.hp / vm.maxHp : 0;

          const hpBg = new Graphics();
          hpBg.roundRect(hpBarX, hpBarY, hpBarW, hpBarH, 2);
          hpBg.fill(COLORS.hpBarBg);
          boardContainer.addChild(hpBg);

          const hpColor = hpPercent > 0.5 ? COLORS.hpBarGreen : hpPercent > 0.25 ? COLORS.hpBarYellow : COLORS.hpBarRed;
          if (hpPercent > 0) {
            const hpFill = new Graphics();
            hpFill.roundRect(hpBarX, hpBarY, hpBarW * hpPercent, hpBarH, 2);
            hpFill.fill(hpColor);
            boardContainer.addChild(hpFill);
          }
        }

        // Occupation star (only when no vellymon on the space)
        if (!vm && isOccupation) {
          const starStyle = new TextStyle({
            fontSize: Math.min(tileSize * 0.35, 20),
            fill: COLORS.occupationStar,
            align: "center",
          });
          const star = new Text({ text: "⭐", style: starStyle });
          star.anchor.set(0.5);
          star.x = px + tileSize / 2;
          star.y = py + tileSize / 2;
          boardContainer.addChild(star);

          // Counter
          if (space?.occupationCounter && space.occupationCounter !== 0) {
            const counterStyle = new TextStyle({
              fontSize: 9,
              fill: COLORS.occupationStar,
              fontFamily: "system-ui, sans-serif",
              fontWeight: "bold",
            });
            const counter = new Text({ text: `${space.occupationCounter}`, style: counterStyle });
            counter.anchor.set(0.5);
            counter.x = px + tileSize / 2;
            counter.y = py + tileSize - 8;
            boardContainer.addChild(counter);
          }
        }

        // Harvestable indicator
        if (!vm && isHarvestable) {
          const leafStyle = new TextStyle({
            fontSize: Math.min(tileSize * 0.3, 16),
            fill: 0x22c55e,
            align: "center",
          });
          const leaf = new Text({ text: "🌿", style: leafStyle });
          leaf.anchor.set(0.5);
          leaf.x = px + tileSize / 2;
          leaf.y = py + tileSize / 2;
          boardContainer.addChild(leaf);
        }
      }
    }
  }, [onSelectVellymon]);

  // Init PixiJS
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    let destroyed = false;

    (async () => {
      const app = new Application();
      await app.init({
        background: COLORS.bg,
        resizeTo: container,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (destroyed) {
        app.destroy(true);
        return;
      }

      container.appendChild(app.canvas as HTMLCanvasElement);
      appRef.current = app;
      draw();
    })();

    return () => {
      destroyed = true;
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
    };
  }, [draw]);

  // Redraw on state changes
  useEffect(() => {
    draw();
  }, [boardWidth, boardHeight, spaces, vellymons, yourTeamId, selectedVellymon, draw]);

  // Handle resize
  useEffect(() => {
    const onResize = () => {
      if (appRef.current) {
        appRef.current.resize();
        draw();
      }
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [draw]);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0"
      style={{ touchAction: "none" }}
    />
  );
}

// Fallback when no avatar image is available
function drawFallbackAvatar(
  container: Container,
  x: number,
  y: number,
  radius: number,
  color: number,
) {
  const circle = new Graphics();
  circle.circle(x, y, radius);
  circle.fill(color);
  container.addChild(circle);
}
