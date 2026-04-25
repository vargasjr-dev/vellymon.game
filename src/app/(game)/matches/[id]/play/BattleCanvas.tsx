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
  commandedUuids: Set<string>;
};

// Colors — team colors are FIXED per team ID, never swap with perspective
const COLORS = {
  bg: 0x0a0f1a,
  tile: 0x111b2e,
  tileBorder: 0x1e2d4a,
  occupation: 0x3d2800,
  occupationBorder: 0xb8860b,
  occupationStar: 0xffd700,
  // Dimmed harvestable
  harvestable: 0x0a1a10,
  harvestableBorder: 0x142e1a,
  spawn: 0x0f1628,
  spawnBorder: 0x2a3a5c,
  // Fixed team colors (team 1 = blue, team 2 = red — always)
  team1: 0x2563eb,
  team1Glow: 0x3b82f6,
  team1Light: 0x1e3a5f,
  team1Dark: 0x2563eb,
  team2: 0xdc2626,
  team2Glow: 0xef4444,
  team2Light: 0x5f1e1e,
  team2Dark: 0xdc2626,
  hpBarBg: 0x1f2937,
  hpBarGreen: 0x22c55e,
  hpBarYellow: 0xeab308,
  hpBarRed: 0xef4444,
  selected: 0xfbbf24,
  commanded: 0x22c55e,
};

function teamColor(teamId: 1 | 2) {
  return teamId === 1 ? COLORS.team1 : COLORS.team2;
}
function teamGlow(teamId: 1 | 2) {
  return teamId === 1 ? COLORS.team1Glow : COLORS.team2Glow;
}

// Track which URLs we've started loading (prevents duplicate loads)
const loadingUrls = new Set<string>();

export default function BattleCanvas({
  boardWidth,
  boardHeight,
  spaces,
  vellymons,
  yourTeamId,
  selectedVellymon,
  onSelectVellymon,
  commandedUuids,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const stateRef = useRef({
    boardWidth, boardHeight, spaces, vellymons, yourTeamId,
    selectedVellymon, commandedUuids,
  });
  const drawRef = useRef<() => void>();

  stateRef.current = {
    boardWidth, boardHeight, spaces, vellymons, yourTeamId,
    selectedVellymon, commandedUuids,
  };

  const draw = useCallback(() => {
    const app = appRef.current;
    if (!app) return;

    const {
      boardWidth: bw, boardHeight: bh, spaces: sp, vellymons: vms,
      yourTeamId: myTeam, selectedVellymon: selVm, commandedUuids: cmdSet,
    } = stateRef.current;

    app.stage.removeChildren();

    const screenW = app.screen.width;
    const screenH = app.screen.height;
    const isPortrait = window.innerHeight > window.innerWidth;

    const cols = isPortrait ? bh : bw;
    const rows = isPortrait ? bw : bh;

    const padding = 12;
    const gap = 3;
    const availW = screenW - padding * 2;
    const availH = screenH - padding * 2;
    const tileW = Math.floor((availW - gap * (cols - 1)) / cols);
    const tileH = Math.floor((availH - gap * (rows - 1)) / rows);
    const tileSize = Math.min(tileW, tileH, 72);
    const cornerRadius = 6;

    const gridW = cols * tileSize + (cols - 1) * gap;
    const gridH = rows * tileSize + (rows - 1) * gap;
    const offsetX = (screenW - gridW) / 2;
    const offsetY = (screenH - gridH) / 2;

    const boardContainer = new Container();
    boardContainer.x = offsetX;
    boardContainer.y = offsetY;
    app.stage.addChild(boardContainer);

    const spaceMap = new Map<string, BoardSpace>();
    for (const s of sp) spaceMap.set(`${s.x},${s.y}`, s);

    const vmMap = new Map<string, VellymonDisplay>();
    for (const v of vms) {
      if (!v.isKO) vmMap.set(`${v.x},${v.y}`, v);
    }

    // Pre-load any uncached textures, then trigger redraw
    let needsRedraw = false;
    for (const v of vms) {
      if (v.imageUrl && !Assets.cache.has(v.imageUrl) && !loadingUrls.has(v.imageUrl)) {
        loadingUrls.add(v.imageUrl);
        needsRedraw = true;
        Assets.load(v.imageUrl).then(() => {
          // Texture now cached — trigger a redraw
          drawRef.current?.();
        }).catch(() => {
          // Failed — remove from loading so fallback renders cleanly
          loadingUrls.delete(v.imageUrl!);
        });
      }
    }

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        let gx: number, gy: number;
        if (isPortrait) {
          if (myTeam === 1) {
            gx = rows - 1 - row;
            gy = col;
          } else {
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
        const isSelected = vm?.uuid === selVm;
        const isYours = vm ? vm.teamId === myTeam : false;
        const isCommanded = vm ? cmdSet.has(vm.uuid) : false;

        const tile = new Graphics();

        // Selection glow
        if (isSelected) {
          tile.roundRect(px - 2, py - 2, tileSize + 4, tileSize + 4, cornerRadius + 2);
          tile.fill({ color: COLORS.selected, alpha: 0.6 });
        }
        // Commanded indicator (green border glow)
        else if (isCommanded && isYours) {
          tile.roundRect(px - 1, py - 1, tileSize + 2, tileSize + 2, cornerRadius + 1);
          tile.fill({ color: COLORS.commanded, alpha: 0.3 });
        }

        let fillColor = COLORS.tile;
        let borderColor = COLORS.tileBorder;
        const occCounter = space?.occupationCounter ?? 0;
        if (isOccupation) {
          // Color occupation tiles by controlling team
          if (occCounter < 0) {
            // Team 1 capturing (negative = team 1)
            fillColor = COLORS.team1Light;
            borderColor = COLORS.team1Dark;
          } else if (occCounter > 0) {
            // Team 2 capturing (positive = team 2)
            fillColor = COLORS.team2Light;
            borderColor = COLORS.team2Dark;
          } else {
            // Neutral
            fillColor = COLORS.occupation;
            borderColor = COLORS.occupationBorder;
          }
        } else if (isHarvestable) {
          fillColor = COLORS.harvestable;
          borderColor = COLORS.harvestableBorder;
        } else if (isSpawn) {
          fillColor = COLORS.spawn;
          borderColor = COLORS.spawnBorder;
        }

        if (vm) {
          borderColor = teamColor(vm.teamId);
        }

        tile.roundRect(px, py, tileSize, tileSize, cornerRadius);
        tile.fill(fillColor);
        tile.stroke({ color: borderColor, width: vm ? 2 : 1 });
        boardContainer.addChild(tile);

        // Interactive — your vellymons are selectable
        if (vm && isYours) {
          tile.eventMode = "static";
          tile.cursor = "pointer";
          const vuuid = vm.uuid;
          tile.on("pointertap", () => {
            onSelectVellymon(selVm === vuuid ? null : vuuid);
          });
        }

        // Vellymon sprite or fallback
        if (vm) {
          const centerX = px + tileSize / 2;
          const centerY = py + tileSize / 2;
          const avatarSize = tileSize * 0.6;

          // Try synchronous cache hit first (fixes the async race condition)
          if (vm.imageUrl && Assets.cache.has(vm.imageUrl)) {
            const texture = Assets.get(vm.imageUrl);
            const sprite = new Sprite(texture);
            sprite.width = avatarSize;
            sprite.height = avatarSize;
            sprite.anchor.set(0.5);
            sprite.x = centerX;
            sprite.y = centerY - 2;
            boardContainer.addChild(sprite);
          } else {
            // Fallback circle (either no imageUrl, or texture still loading)
            const circle = new Graphics();
            circle.circle(centerX, centerY - 2, avatarSize / 2);
            circle.fill(teamGlow(vm.teamId));
            boardContainer.addChild(circle);
          }

          // HP bar
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

        // Occupation star (color shifts with team control)
        if (!vm && isOccupation) {
          const starColor = occCounter < 0 ? COLORS.team1Glow
            : occCounter > 0 ? COLORS.team2Glow
            : COLORS.occupationStar;
          const starStyle = new TextStyle({
            fontSize: Math.min(tileSize * 0.35, 20),
            fill: starColor,
            align: "center",
          });
          const star = new Text({ text: "⭐", style: starStyle });
          star.anchor.set(0.5);
          star.x = px + tileSize / 2;
          star.y = py + tileSize / 2;
          boardContainer.addChild(star);
        }

        // Harvestable leaf (dimmed)
        if (!vm && isHarvestable) {
          const leafStyle = new TextStyle({
            fontSize: Math.min(tileSize * 0.22, 12),
            fill: 0x1a5c2a,
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

  // Store draw ref so async texture loads can trigger redraws
  drawRef.current = draw;

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
      if (destroyed) { app.destroy(true); return; }
      container.appendChild(app.canvas as HTMLCanvasElement);
      appRef.current = app;
      draw();
    })();

    return () => {
      destroyed = true;
      if (appRef.current) { appRef.current.destroy(true); appRef.current = null; }
    };
  }, [draw]);

  useEffect(() => { draw(); }, [boardWidth, boardHeight, spaces, vellymons, yourTeamId, selectedVellymon, commandedUuids, draw]);

  useEffect(() => {
    const onResize = () => { appRef.current?.resize(); draw(); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [draw]);

  return (
    <div ref={containerRef} className="absolute inset-0" style={{ touchAction: "none" }} />
  );
}
