export interface VellymonStats {
  speed: number;
  health: number;
  attack: number;
  energy: number;
  name: string;
  uuid: string;
  attacks: Attack[];
}

export interface Attack {
  name: string;
  damage: number;
  energyCost: number;
}

export interface Space {
  type: number;
  x: number;
  y: number;
  isPrimary?: boolean;
  index?: number;
}

export interface Board {
  width: number;
  height: number;
  spaces: Space[];
  primaryDock: Set<number>;
  secondaryDock: Set<number>;
  id: string;
}
