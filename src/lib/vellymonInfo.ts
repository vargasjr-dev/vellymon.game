/**
 * Static vellymon metadata for client-side display.
 * Generated from server/vellymonLibrary + server/powers registry.
 * Regenerate: bun scripts/gen-vellymon-info.ts
 */

export type VellymonInfo = {
  archetype: string;
  flavor: string;
  powerName: string;
  powerDesc: string;
};

export const VELLYMON_INFO: Record<string, VellymonInfo> = {
  "Aerobolt": { archetype: "speedster", flavor: "Rides its own shockwave like a surfboard.", powerName: "Shockwave Surfer", powerDesc: "After attacking, drains 1 energy from the opposing team. Speed creates pressure." },
  "Aquaplex": { archetype: "balanced", flavor: "Water creature that adapts to any situation.", powerName: "Adaptive Flow", powerDesc: "When harvesting energy, also heals 3 HP. Water nourishes." },
  "Barrikade": { archetype: "tank", flavor: "Literally a walking barricade. Blocks everything.", powerName: "Iron Curtain", powerDesc: "When attacked, the attacker loses 2 SPD next turn. Hit the wall, slow down." },
  "Blastova": { archetype: "glass_cannon", flavor: "A living supernova. Bright, hot, and short-lived.", powerName: "Supernova Burst", powerDesc: "First turn's attack deals +5 bonus damage. Bright, hot, short-lived." },
  "Blinkatt": { archetype: "speedster", flavor: "Blinks in and out of existence between attacks.", powerName: "Phase Shift", powerDesc: "After attacking, gains +5 SPD next turn. Blink in, strike, blink out." },
  "Breezekin": { archetype: "balanced", flavor: "Kin of the wind. Light on its feet, steady aim.", powerName: "Tailwind", powerDesc: "After moving, gains +2 SPD. Wind at your back." },
  "Buldrok": { archetype: "tank", flavor: "An ancient stone golem. Slow but nearly indestructible.", powerName: "Stone Skin", powerDesc: "Heals 2 HP whenever hit. Ancient stone armor absorbs impact." },
  "Cloudpuff": { archetype: "support", flavor: "A tiny cloud that floats just above the ground.", powerName: "Rain Dance", powerDesc: "At the start of each turn, all allies heal 1 HP. Gentle rain from a tiny cloud." },
  "Coppercog": { archetype: "balanced", flavor: "Mechanical vellymon made of spinning copper gears.", powerName: "Overclock", powerDesc: "Attacks deal +4 bonus damage. Gears add force to every strike." },
  "Coralord": { archetype: "tank", flavor: "Coral reef creature. Slow on land, king of the shallows.", powerName: "Reef Armor", powerDesc: "Heals 2 HP at the end of each turn. Coral slowly regenerates." },
  "Cosmog": { archetype: "balanced", flavor: "Cosmic origins. The most mysterious vellymon of all.", powerName: "Warp Strike", powerDesc: "Before attacking, gains +3 SPD. Cosmic teleportation strikes from unexpected angles." },
  "Cragthorn": { archetype: "tank", flavor: "Covered in thorny rock formations. Touch at your peril.", powerName: "Thorns", powerDesc: "Attackers take 3 damage when they hit Cragthorn. Touch at your peril." },
  "Crimshard": { archetype: "glass_cannon", flavor: "Red crystal shards orbit it like tiny daggers.", powerName: "Crystal Barrage", powerDesc: "After attacking, deals 4 splash damage to another enemy. Orbiting shards lash out." },
  "Dashpaw": { archetype: "speedster", flavor: "Paw prints everywhere but you never see it pass.", powerName: "Phantom Sprint", powerDesc: "After attacking, gains +3 SPD. Hit and run." },
  "Dewdrop": { archetype: "support", flavor: "A sentient dewdrop. Surprisingly hard to squish.", powerName: "Cleansing Mist", powerDesc: "Each turn, heals the lowest-HP ally for 3 HP." },
  "Doomsprout": { archetype: "glass_cannon", flavor: "An innocent sprout that unleashes devastating blooms.", powerName: "Bloom Burst", powerDesc: "When below 50% HP, attacks deal +8 bonus damage. Desperate bloom." },
  "Duraclod": { archetype: "tank", flavor: "A clod of super-dense earth. Surprisingly determined.", powerName: "Fortify", powerDesc: "At end of turn, heals 4 HP. Standing ground hardens the clod." },
  "Duskfin": { archetype: "balanced", flavor: "Emerges at dusk. Thrives in twilight conditions.", powerName: "Twilight Veil", powerDesc: "After turn 5, gains +2 SPD each turn. Dusk sharpens the fin." },
  "Embercub": { archetype: "balanced", flavor: "A warm little cub with surprising grit.", powerName: "Inner Fire", powerDesc: "Below 50% HP, Embercub's attacks deal +3 bonus damage. Grit unleashed." },
  "Ferridon": { archetype: "tank", flavor: "Iron-plated beast that rusts its enemies on contact.", powerName: "Rust Aura", powerDesc: "When hit, the attacker loses 1 SPD. Iron rusts everything it touches." },
  "Flashfin": { archetype: "speedster", flavor: "Glows bright when it accelerates. Blinding.", powerName: "Blinding Dash", powerDesc: "After attacking, the target loses 2 SPD next turn. Dazzling speed." },
  "Flicktail": { archetype: "speedster", flavor: "Flicks its tail to redirect mid-dash. Uncatchable.", powerName: "Evasive Flick", powerDesc: "After moving, blocks the next attack targeting this space. Keep moving, stay alive." },
  "Frostfawn": { archetype: "balanced", flavor: "A frost-touched fawn. Graceful and deceptively tough.", powerName: "Frost Grace", powerDesc: "At end of turn, heals 4 HP. Grace over aggression." },
  "Fungipal": { archetype: "support", flavor: "A friendly fungus. Absorbs energy from the ground.", powerName: "Spore Harvest", powerDesc: "On turn start, generates +1 bonus energy for the team. A living economy engine." },
  "Gleamoss": { archetype: "support", flavor: "Glowing moss creature. Harvests energy from sunlight.", powerName: "Photosynthesis", powerDesc: "Harvests grant +2 bonus energy. Sunlight supercharges collection." },
  "Glintpaw": { archetype: "balanced", flavor: "Shiny paws that glint when it attacks. Flashy.", powerName: "Flash Strike", powerDesc: "Every 3rd attack deals +4 bonus damage. Charge up and unleash." },
  "Grumblix": { archetype: "tank", flavor: "Always grumbling. The grumpiest vellymon alive.", powerName: "Grudge", powerDesc: "Taking damage adds +2 to next attack (max +6). The grumpier, the harder." },
  "Gustling": { archetype: "speedster", flavor: "A tiny wind spirit. Leaves a breeze trail everywhere.", powerName: "Breeze Trail", powerDesc: "After moving, leaves a breeze on the departed space (2 turns). Slows enemies." },
  "Hexaflare": { archetype: "glass_cannon", flavor: "Six-pointed flare pattern. Mesmerizing and deadly.", powerName: "Flare Burst", powerDesc: "After attacking, the target burns for 3 damage next turn." },
  "Humbloom": { archetype: "support", flavor: "Hums a gentle tune while harvesting. Very zen.", powerName: "Zen Harvest", powerDesc: "Harvesting also heals the lowest-HP ally for 3 HP. Economy + sustain." },
  "Ironpup": { archetype: "balanced", flavor: "An iron-coated pup. Loyal, tough, decent in a fight.", powerName: "Loyal Guard", powerDesc: "When hit, bites back for 2 damage and heals 1 HP. Scrappy and loyal." },
  "Joltmink": { archetype: "speedster", flavor: "Fuzzy and electrified. Don't pet it.", powerName: "Static Charge", powerDesc: "Moving builds static. After 2 moves, next attack deals +5 bonus damage." },
  "Lumisprout": { archetype: "support", flavor: "Bioluminescent sprout. Lights up the whole board.", powerName: "Bioluminescence", powerDesc: "At turn start, heals all active allies for 1 HP. Gentle sustain glow." },
  "Magmorus": { archetype: "glass_cannon", flavor: "Molten core barely contained by a thin rocky shell.", powerName: "Meltdown", powerDesc: "Attacking deals 3 self-damage. The molten core destabilizes with every strike." },
  "Mosswall": { archetype: "tank", flavor: "A living wall of moss and stone. Regenerates slowly.", powerName: "Regrowth", powerDesc: "Regenerates 3 HP at end of turn. The moss always grows back." },
  "Nectarb": { archetype: "support", flavor: "Drips sweet nectar that converts to pure energy.", powerName: "Sweet Nectar", powerDesc: "Passively generates +1 energy per turn. Nectar converts to pure energy." },
  "Pebblink": { archetype: "balanced", flavor: "A blinking pebble. Don't underestimate small things.", powerName: "Stone Blink", powerDesc: "When damaged, gains +2 SPD this turn. Harder to catch the more you hit it." },
  "Phantoboom": { archetype: "glass_cannon", flavor: "A phantom that materializes only to detonate.", powerName: "Detonation", powerDesc: "On knockout, deals 8 damage to the first active enemy vellymon." },
  "Plateor": { archetype: "tank", flavor: "Tectonic plates shift when this one charges.", powerName: "Tectonic Charge", powerDesc: "Moving reduces attack cost by 1 energy. Momentum builds with each step." },
  "Pollyx": { archetype: "support", flavor: "Spreads pollen everywhere. Annoyingly persistent.", powerName: "Pollen Cloud", powerDesc: "At turn end, all active enemies lose 1 SPD. Pollen gets everywhere." },
  "Prismite": { archetype: "balanced", flavor: "Refracts light into rainbow patterns. Beautiful fighter.", powerName: "Prismatic Shield", powerDesc: "When damaged, heals self for 2 HP. Light refracts into healing energy." },
  "Pyroburst": { archetype: "glass_cannon", flavor: "Explodes on impact. Reassembles slowly.", powerName: "Volatile Core", powerDesc: "Attacks cost 1 less energy but deal 2 self-damage. Efficient explosions." },
  "Quicksilk": { archetype: "speedster", flavor: "Spins silk webs at impossible speed.", powerName: "Web Trap", powerDesc: "Moving leaves a sticky web on departed space. Enemies lose 2 SPD on webs." },
  "Razorush": { archetype: "speedster", flavor: "Razor-edged fins that slice the air at top speed.", powerName: "Razor Slipstream", powerDesc: "Moving makes attacks 1 energy cheaper this turn. Speed becomes efficiency." },
  "Rustleclaw": { archetype: "balanced", flavor: "Rustling claws that sound like wind through leaves.", powerName: "Ambush Claws", powerDesc: "Gains +1 SPD at the start of each turn. Builds speed toward the pounce." },
  "Sandscout": { archetype: "balanced", flavor: "Desert scout. Sees everything, reports nothing.", powerName: "Desert Sight", powerDesc: "Scout's vision reduces energy costs by 1 each turn. Sees the best paths." },
  "Scoopuff": { archetype: "support", flavor: "Scoops up energy pellets with its fluffy cheeks.", powerName: "Cheek Pouch", powerDesc: "Harvesting gives +2 bonus energy. Fluffy cheeks hold more than expected." },
  "Shellmaw": { archetype: "tank", flavor: "A massive jaw hidden inside an impenetrable shell.", powerName: "Iron Shell", powerDesc: "Takes 2 less damage from every hit. The shell absorbs punishment." },
  "Shrednova": { archetype: "glass_cannon", flavor: "Shreds reality with its claws. Terrifying but brittle.", powerName: "Reality Shred", powerDesc: "Attacks drain 1 energy from the opponent. Shreds health and economy." },
  "Skidmark": { archetype: "speedster", flavor: "Leaves scorch marks from sheer friction.", powerName: "Friction Burn", powerDesc: "Moving leaves a scorch mark for 2 turns. Enemies on scorches take damage." },
  "Sproutail": { archetype: "support", flavor: "Its tail grows a new sprout after each harvest.", powerName: "Regrowth Tail", powerDesc: "Harvesting heals Sproutail for 3 HP. Economy play keeps it alive." },
  "Starveil": { archetype: "balanced", flavor: "Veiled in starlight. Hard to read, harder to predict.", powerName: "Starlight Veil", powerDesc: "Each turn, Starveil's next action costs 1 less energy. Unpredictably efficient." },
  "Terravex": { archetype: "balanced", flavor: "Earth-aspected all-rounder. Reliable as bedrock.", powerName: "Bedrock Stance", powerDesc: "Taking damage: -1 SPD but +2 ATK. Digs in deeper with every hit." },
  "Thornlash": { archetype: "glass_cannon", flavor: "Whip-like thorns with devastating reach.", powerName: "Thorn Reach", powerDesc: "Attacking creates a block on Thornlash's position. Strikes then fortifies." },
  "Tidalmini": { archetype: "support", flavor: "Miniature tidal wave. Splashes harmlessly but fast.", powerName: "Tidal Splash", powerDesc: "Each turn end, splashes all allies for 2 HP healing. Harmlessly restorative." },
  "Titanog": { archetype: "tank", flavor: "Titanium-boned creature from deep underground.", powerName: "Titanium Bones", powerDesc: "Taking damage reduces next action cost by 1. Absorbs hits into efficiency." },
  "Toxiblast": { archetype: "glass_cannon", flavor: "Toxic goo with surprisingly good aim.", powerName: "Toxic Residue", powerDesc: "Attacking leaves poison on your space for 3 turns. Contaminates the battlefield." },
  "Tundrak": { archetype: "tank", flavor: "Frost-covered mammoth that freezes the ground it walks on.", powerName: "Permafrost", powerDesc: "Moving freezes the departed space for 2 turns. Reshapes the battlefield." },
  "Verdantix": { archetype: "balanced", flavor: "Green crystal entity. Grows stronger near nature.", powerName: "Crystal Growth", powerDesc: "Each turn, Verdantix grows +1 ATK. Becomes more dangerous over time." },
  "Voidclaw": { archetype: "glass_cannon", flavor: "Reaches through tiny void portals to strike.", powerName: "Void Rend", powerDesc: "Attacks drain 2 energy from the opponent. Tears through dimensions." },
  "Voltwing": { archetype: "speedster", flavor: "Electric wings that crackle with each flap.", powerName: "Thunderclap", powerDesc: "Moving deals 3 damage to the first active enemy. Lightning on the wing." },
  "Whispurr": { archetype: "support", flavor: "Purrs at a frequency that calms allies.", powerName: "Calming Purr", powerDesc: "Each turn, reduces one ally's next action cost by 1. Team efficiency buffer." },
  "Wrecktor": { archetype: "glass_cannon", flavor: "Built to wreck. Nothing else. Just wreck.", powerName: "Wrecking Ball", powerDesc: "Attacking creates a block on your space. Pure wrecking force." },
  "Zipfang": { archetype: "speedster", flavor: "So fast it bites before you see it move.", powerName: "First Strike", powerDesc: "Each turn, Zipfang gains +2 ATK. So fast it bites before you see it move." }
};

export function getVellymonInfo(name: string): VellymonInfo | undefined {
  return VELLYMON_INFO[name];
}

