/**
 * The complete 64-vellymon library.
 *
 * Each vellymon has a unique name, archetype, stat spread, and two attacks.
 * Stats respect the archetype ranges and budget constraint (HP + Atk×5 + Spd×8 ≈ 160).
 * Attacks are drawn from the archetype's attack pool.
 *
 * Distribution: 12 Tank, 12 Speedster, 12 Glass Cannon, 12 Support, 16 Balanced = 64
 */

import {
  type ArchetypeId,
  type AttackTemplate,
  ATTACK_TEMPLATES,
  validateStatBudget,
  fitsArchetype,
  ARCHETYPES,
} from "./archetypes";

const T = ATTACK_TEMPLATES;

// ─── Vellymon Template ───────────────────────────────────────────────────────

export type VellymonTemplate = {
  id: number;
  name: string;
  archetype: ArchetypeId;
  hp: number;
  attack: number;
  speed: number;
  attacks: [AttackTemplate, AttackTemplate];
  /** Short flavor text */
  flavor: string;
};

// ─── 🛡️ TANKS (12) — High HP, low speed, moderate attack ────────────────────

const TANKS: VellymonTemplate[] = [
  { id: 1,  name: "Buldrok",    archetype: "tank", hp: 120, attack: 8,  speed: 1, attacks: [T.poke, T.slam],   flavor: "An ancient stone golem. Slow but nearly indestructible." },
  { id: 2,  name: "Ferridon",   archetype: "tank", hp: 115, attack: 9,  speed: 1, attacks: [T.poke, T.strike], flavor: "Iron-plated beast that rusts its enemies on contact." },
  { id: 3,  name: "Cragthorn",  archetype: "tank", hp: 110, attack: 10, speed: 1, attacks: [T.strike, T.slam], flavor: "Covered in thorny rock formations. Touch at your peril." },
  { id: 4,  name: "Shellmaw",   archetype: "tank", hp: 108, attack: 10, speed: 2, attacks: [T.poke, T.slam],   flavor: "A massive jaw hidden inside an impenetrable shell." },
  { id: 5,  name: "Tundrak",    archetype: "tank", hp: 105, attack: 9,  speed: 2, attacks: [T.strike, T.slam], flavor: "Frost-covered mammoth that freezes the ground it walks on." },
  { id: 6,  name: "Barrikade",  archetype: "tank", hp: 102, attack: 11, speed: 2, attacks: [T.poke, T.strike], flavor: "Literally a walking barricade. Blocks everything." },
  { id: 7,  name: "Mosswall",   archetype: "tank", hp: 100, attack: 10, speed: 3, attacks: [T.poke, T.slam],   flavor: "A living wall of moss and stone. Regenerates slowly." },
  { id: 8,  name: "Titanog",    archetype: "tank", hp: 98,  attack: 11, speed: 1, attacks: [T.strike, T.slam], flavor: "Titanium-boned creature from deep underground." },
  { id: 9,  name: "Grumblix",   archetype: "tank", hp: 100, attack: 12, speed: 1, attacks: [T.poke, T.slam],   flavor: "Always grumbling. The grumpiest vellymon alive." },
  { id: 10, name: "Coralord",   archetype: "tank", hp: 95,  attack: 11, speed: 3, attacks: [T.strike, T.slam], flavor: "Coral reef creature. Slow on land, king of the shallows." },
  { id: 11, name: "Duraclod",   archetype: "tank", hp: 92,  attack: 12, speed: 2, attacks: [T.poke, T.strike], flavor: "A clod of super-dense earth. Surprisingly determined." },
  { id: 12, name: "Plateor",    archetype: "tank", hp: 90,  attack: 12, speed: 3, attacks: [T.strike, T.slam], flavor: "Tectonic plates shift when this one charges." },
];

// ─── ⚡ SPEEDSTERS (12) — Blazing speed, low HP, moderate attack ─────────────

const SPEEDSTERS: VellymonTemplate[] = [
  { id: 13, name: "Zipfang",    archetype: "speedster", hp: 40,  attack: 12, speed: 10, attacks: [T.poke, T.strike], flavor: "So fast it bites before you see it move." },
  { id: 14, name: "Blinkatt",   archetype: "speedster", hp: 42,  attack: 11, speed: 10, attacks: [T.snipe, T.strike], flavor: "Blinks in and out of existence between attacks." },
  { id: 15, name: "Dashpaw",    archetype: "speedster", hp: 45,  attack: 12, speed: 9,  attacks: [T.poke, T.snipe],  flavor: "Paw prints everywhere but you never see it pass." },
  { id: 16, name: "Voltwing",   archetype: "speedster", hp: 48,  attack: 11, speed: 8,  attacks: [T.poke, T.strike], flavor: "Electric wings that crackle with each flap." },
  { id: 17, name: "Flicktail",  archetype: "speedster", hp: 50,  attack: 10, speed: 10, attacks: [T.snipe, T.poke],  flavor: "Flicks its tail to redirect mid-dash. Uncatchable." },
  { id: 18, name: "Razorush",   archetype: "speedster", hp: 52,  attack: 11, speed: 9,  attacks: [T.poke, T.strike], flavor: "Razor-edged fins that slice the air at top speed." },
  { id: 19, name: "Gustling",   archetype: "speedster", hp: 55,  attack: 10, speed: 9,  attacks: [T.snipe, T.strike], flavor: "A tiny wind spirit. Leaves a breeze trail everywhere." },
  { id: 20, name: "Joltmink",   archetype: "speedster", hp: 55,  attack: 8,  speed: 10, attacks: [T.poke, T.snipe],  flavor: "Fuzzy and electrified. Don't pet it." },
  { id: 21, name: "Skidmark",   archetype: "speedster", hp: 58,  attack: 10, speed: 8,  attacks: [T.poke, T.strike], flavor: "Leaves scorch marks from sheer friction." },
  { id: 22, name: "Quicksilk",  archetype: "speedster", hp: 60,  attack: 9,  speed: 9,  attacks: [T.snipe, T.poke],  flavor: "Spins silk webs at impossible speed." },
  { id: 23, name: "Flashfin",   archetype: "speedster", hp: 62,  attack: 8,  speed: 9,  attacks: [T.poke, T.snipe],  flavor: "Glows bright when it accelerates. Blinding." },
  { id: 24, name: "Aerobolt",   archetype: "speedster", hp: 65,  attack: 8,  speed: 8,  attacks: [T.snipe, T.strike], flavor: "Rides its own shockwave like a surfboard." },
];

// ─── 💥 GLASS CANNONS (12) — Huge attack, low HP, moderate speed ─────────────

const GLASS_CANNONS: VellymonTemplate[] = [
  { id: 25, name: "Blastova",   archetype: "glass_cannon", hp: 45,  attack: 20, speed: 4, attacks: [T.poke, T.nuke],  flavor: "A living supernova. Bright, hot, and short-lived." },
  { id: 26, name: "Magmorus",   archetype: "glass_cannon", hp: 48,  attack: 19, speed: 4, attacks: [T.slam, T.nuke],  flavor: "Molten core barely contained by a thin rocky shell." },
  { id: 27, name: "Shrednova",  archetype: "glass_cannon", hp: 50,  attack: 18, speed: 5, attacks: [T.poke, T.nuke],  flavor: "Shreds reality with its claws. Terrifying but brittle." },
  { id: 28, name: "Voidclaw",   archetype: "glass_cannon", hp: 45,  attack: 19, speed: 5, attacks: [T.slam, T.lob],   flavor: "Reaches through tiny void portals to strike." },
  { id: 29, name: "Pyroburst",  archetype: "glass_cannon", hp: 52,  attack: 18, speed: 4, attacks: [T.poke, T.slam],  flavor: "Explodes on impact. Reassembles slowly." },
  { id: 30, name: "Thornlash",  archetype: "glass_cannon", hp: 55,  attack: 17, speed: 5, attacks: [T.lob, T.slam],   flavor: "Whip-like thorns with devastating reach." },
  { id: 31, name: "Crimshard",  archetype: "glass_cannon", hp: 47,  attack: 17, speed: 6, attacks: [T.poke, T.nuke],  flavor: "Red crystal shards orbit it like tiny daggers." },
  { id: 32, name: "Doomsprout", archetype: "glass_cannon", hp: 58,  attack: 17, speed: 4, attacks: [T.slam, T.lob],   flavor: "An innocent sprout that unleashes devastating blooms." },
  { id: 33, name: "Wrecktor",   archetype: "glass_cannon", hp: 58,  attack: 16, speed: 4, attacks: [T.poke, T.slam],  flavor: "Built to wreck. Nothing else. Just wreck." },
  { id: 34, name: "Hexaflare",  archetype: "glass_cannon", hp: 60,  attack: 16, speed: 5, attacks: [T.lob, T.nuke],   flavor: "Six-pointed flare pattern. Mesmerizing and deadly." },
  { id: 35, name: "Phantoboom", archetype: "glass_cannon", hp: 65,  attack: 15, speed: 5, attacks: [T.poke, T.slam],  flavor: "A phantom that materializes only to detonate." },
  { id: 36, name: "Toxiblast",  archetype: "glass_cannon", hp: 70,  attack: 15, speed: 4, attacks: [T.lob, T.slam],   flavor: "Toxic goo with surprisingly good aim." },
];

// ─── 🌿 SUPPORTS (12) — Balanced HP, low attack, high speed ─────────────────

const SUPPORTS: VellymonTemplate[] = [
  { id: 37, name: "Gleamoss",   archetype: "support", hp: 65,  attack: 5,  speed: 8, attacks: [T.chip, T.snipe],  flavor: "Glowing moss creature. Harvests energy from sunlight." },
  { id: 38, name: "Pollyx",     archetype: "support", hp: 68,  attack: 6,  speed: 8, attacks: [T.chip, T.poke],   flavor: "Spreads pollen everywhere. Annoyingly persistent." },
  { id: 39, name: "Dewdrop",    archetype: "support", hp: 70,  attack: 5,  speed: 7, attacks: [T.chip, T.snipe],  flavor: "A sentient dewdrop. Surprisingly hard to squish." },
  { id: 40, name: "Humbloom",   archetype: "support", hp: 72,  attack: 7,  speed: 7, attacks: [T.poke, T.snipe],  flavor: "Hums a gentle tune while harvesting. Very zen." },
  { id: 41, name: "Scoopuff",   archetype: "support", hp: 73,  attack: 8,  speed: 8, attacks: [T.chip, T.poke],   flavor: "Scoops up energy pellets with its fluffy cheeks." },
  { id: 42, name: "Nectarb",    archetype: "support", hp: 75,  attack: 9,  speed: 7, attacks: [T.chip, T.snipe],  flavor: "Drips sweet nectar that converts to pure energy." },
  { id: 43, name: "Whispurr",   archetype: "support", hp: 75,  attack: 6,  speed: 7, attacks: [T.poke, T.snipe],  flavor: "Purrs at a frequency that calms allies." },
  { id: 44, name: "Sproutail",  archetype: "support", hp: 78,  attack: 7,  speed: 6, attacks: [T.chip, T.snipe],  flavor: "Its tail grows a new sprout after each harvest." },
  { id: 45, name: "Cloudpuff",  archetype: "support", hp: 78,  attack: 8,  speed: 7, attacks: [T.poke, T.chip],   flavor: "A tiny cloud that floats just above the ground." },
  { id: 46, name: "Tidalmini",  archetype: "support", hp: 80,  attack: 5,  speed: 6, attacks: [T.snipe, T.poke],  flavor: "Miniature tidal wave. Splashes harmlessly but fast." },
  { id: 47, name: "Fungipal",   archetype: "support", hp: 82,  attack: 8,  speed: 6, attacks: [T.chip, T.poke],   flavor: "A friendly fungus. Absorbs energy from the ground." },
  { id: 48, name: "Lumisprout", archetype: "support", hp: 85,  attack: 9,  speed: 6, attacks: [T.snipe, T.poke],  flavor: "Bioluminescent sprout. Lights up the whole board." },
];

// ─── ⚔️ BALANCED (16) — No weakness, no standout strength ───────────────────

const BALANCED: VellymonTemplate[] = [
  { id: 49, name: "Terravex",   archetype: "balanced", hp: 70,  attack: 14, speed: 4, attacks: [T.strike, T.lob],    flavor: "Earth-aspected all-rounder. Reliable as bedrock." },
  { id: 50, name: "Embercub",   archetype: "balanced", hp: 72,  attack: 13, speed: 4, attacks: [T.poke, T.strike],   flavor: "A warm little cub with surprising grit." },
  { id: 51, name: "Aquaplex",   archetype: "balanced", hp: 73,  attack: 12, speed: 5, attacks: [T.snipe, T.strike],  flavor: "Water creature that adapts to any situation." },
  { id: 52, name: "Breezekin",  archetype: "balanced", hp: 75,  attack: 13, speed: 5, attacks: [T.poke, T.lob],      flavor: "Kin of the wind. Light on its feet, steady aim." },
  { id: 53, name: "Ironpup",    archetype: "balanced", hp: 70,  attack: 14, speed: 5, attacks: [T.strike, T.snipe],  flavor: "An iron-coated pup. Loyal, tough, decent in a fight." },
  { id: 54, name: "Verdantix",  archetype: "balanced", hp: 78,  attack: 11, speed: 5, attacks: [T.poke, T.strike],   flavor: "Green crystal entity. Grows stronger near nature." },
  { id: 55, name: "Frostfawn",  archetype: "balanced", hp: 72,  attack: 12, speed: 6, attacks: [T.snipe, T.lob],     flavor: "A frost-touched fawn. Graceful and deceptively tough." },
  { id: 56, name: "Coppercog",  archetype: "balanced", hp: 80,  attack: 12, speed: 4, attacks: [T.strike, T.lob],    flavor: "Mechanical vellymon made of spinning copper gears." },
  { id: 57, name: "Starveil",   archetype: "balanced", hp: 77,  attack: 11, speed: 6, attacks: [T.poke, T.snipe],    flavor: "Veiled in starlight. Hard to read, harder to predict." },
  { id: 58, name: "Sandscout",  archetype: "balanced", hp: 80,  attack: 10, speed: 6, attacks: [T.snipe, T.strike],  flavor: "Desert scout. Sees everything, reports nothing." },
  { id: 59, name: "Pebblink",   archetype: "balanced", hp: 82,  attack: 10, speed: 5, attacks: [T.poke, T.lob],      flavor: "A blinking pebble. Don't underestimate small things." },
  { id: 60, name: "Duskfin",    archetype: "balanced", hp: 83,  attack: 13, speed: 4, attacks: [T.strike, T.snipe],  flavor: "Emerges at dusk. Thrives in twilight conditions." },
  { id: 61, name: "Glintpaw",   archetype: "balanced", hp: 85,  attack: 10, speed: 5, attacks: [T.poke, T.strike],   flavor: "Shiny paws that glint when it attacks. Flashy." },
  { id: 62, name: "Rustleclaw", archetype: "balanced", hp: 85,  attack: 11, speed: 4, attacks: [T.strike, T.lob],    flavor: "Rustling claws that sound like wind through leaves." },
  { id: 63, name: "Prismite",   archetype: "balanced", hp: 88,  attack: 12, speed: 4, attacks: [T.snipe, T.lob],     flavor: "Refracts light into rainbow patterns. Beautiful fighter." },
  { id: 64, name: "Cosmog",     archetype: "balanced", hp: 90,  attack: 10, speed: 4, attacks: [T.poke, T.strike],   flavor: "Cosmic origins. The most mysterious vellymon of all." },
];

// ─── Full Library ────────────────────────────────────────────────────────────

export const VELLYMON_LIBRARY: VellymonTemplate[] = [
  ...TANKS,
  ...SPEEDSTERS,
  ...GLASS_CANNONS,
  ...SUPPORTS,
  ...BALANCED,
];

/** Lookup by ID */
export const VELLYMON_BY_ID = new Map<number, VellymonTemplate>(
  VELLYMON_LIBRARY.map((v) => [v.id, v]),
);

/** Lookup by name */
export const VELLYMON_BY_NAME = new Map<string, VellymonTemplate>(
  VELLYMON_LIBRARY.map((v) => [v.name.toLowerCase(), v]),
);

/** Filter by archetype */
export function getByArchetype(archetype: ArchetypeId): VellymonTemplate[] {
  return VELLYMON_LIBRARY.filter((v) => v.archetype === archetype);
}

// ─── Validation ──────────────────────────────────────────────────────────────

/** Validate the entire library at import time */
function validateLibrary(): void {
  const ids = new Set<number>();
  const names = new Set<string>();

  for (const v of VELLYMON_LIBRARY) {
    // Unique IDs
    if (ids.has(v.id)) throw new Error(`Duplicate vellymon ID: ${v.id}`);
    ids.add(v.id);

    // Unique names
    const lower = v.name.toLowerCase();
    if (names.has(lower)) throw new Error(`Duplicate vellymon name: ${v.name}`);
    names.add(lower);

    // Budget check
    const { budget, valid } = validateStatBudget(v.hp, v.attack, v.speed);
    if (!valid) {
      throw new Error(
        `${v.name} (ID ${v.id}) fails budget check: ${budget} (expected 145-175)`,
      );
    }

    // Archetype range check
    const archetype = ARCHETYPES[v.archetype];
    if (!fitsArchetype(archetype, v.hp, v.attack, v.speed)) {
      throw new Error(
        `${v.name} (ID ${v.id}) stats out of ${v.archetype} range: HP=${v.hp} ATK=${v.attack} SPD=${v.speed}`,
      );
    }

    // Attack pool check
    for (const atk of v.attacks) {
      if (!archetype.attackPool.includes(atk)) {
        throw new Error(
          `${v.name} (ID ${v.id}) has attack "${atk.name}" not in ${v.archetype} pool`,
        );
      }
    }
  }

  // Total count check
  if (VELLYMON_LIBRARY.length !== 64) {
    throw new Error(
      `Library has ${VELLYMON_LIBRARY.length} vellymons, expected 64`,
    );
  }

  // Archetype count check
  for (const [id, archetype] of Object.entries(ARCHETYPES)) {
    const count = VELLYMON_LIBRARY.filter((v) => v.archetype === id).length;
    if (count !== archetype.count) {
      throw new Error(
        `${id} has ${count} vellymons, expected ${archetype.count}`,
      );
    }
  }
}

// Run validation on import — catches errors at build time
validateLibrary();
