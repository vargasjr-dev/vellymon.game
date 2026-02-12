import type { VellymonStats } from "../types/game";

const PlatinumVellymon: VellymonStats = {
  speed: 8,
  health: 8,
  attack: 3,
  energy: 100,
  name: "Platinum Vellymon",
  uuid: "05da83b5-f7c7-4478-b426-e4a2b69ab2b7",
  attacks: [
    { name: "Swift Strike", damage: 5, energyCost: 10 },
    { name: "Power Slam", damage: 8, energyCost: 20 },
    { name: "Mega Blast", damage: 12, energyCost: 35 },
    { name: "Ultimate Fury", damage: 15, energyCost: 50 },
  ],
};

const GoldenVellymon: VellymonStats = {
  speed: 7,
  health: 8,
  attack: 3,
  energy: 100,
  name: "Golden Vellymon",
  uuid: "f9564a8b-836e-4259-81bb-cdafadba0ed2",
  attacks: [
    { name: "Swift Strike", damage: 5, energyCost: 10 },
    { name: "Power Slam", damage: 8, energyCost: 20 },
    { name: "Mega Blast", damage: 11, energyCost: 35 },
    { name: "Ultimate Fury", damage: 14, energyCost: 50 },
  ],
};

const SilverVellymon: VellymonStats = {
  speed: 6,
  health: 8,
  attack: 3,
  energy: 100,
  name: "Silver Vellymon",
  uuid: "06ea4e02-0697-48f4-9296-d72153b5a58d",
  attacks: [
    { name: "Swift Strike", damage: 4, energyCost: 10 },
    { name: "Power Slam", damage: 7, energyCost: 20 },
    { name: "Mega Blast", damage: 10, energyCost: 35 },
    { name: "Ultimate Fury", damage: 13, energyCost: 50 },
  ],
};

const BronzeVellymon: VellymonStats = {
  speed: 5,
  health: 8,
  attack: 3,
  energy: 100,
  name: "Bronze Vellymon",
  uuid: "df38d5f0-2023-47ba-b614-67b86be047ba",
  attacks: [
    { name: "Swift Strike", damage: 4, energyCost: 10 },
    { name: "Power Slam", damage: 6, energyCost: 20 },
    { name: "Mega Blast", damage: 9, energyCost: 35 },
    { name: "Ultimate Fury", damage: 12, energyCost: 50 },
  ],
};

const all = [PlatinumVellymon, GoldenVellymon, SilverVellymon, BronzeVellymon];

export default all;
