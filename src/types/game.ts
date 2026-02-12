export interface VellymonStats {
  priority: number;
  health: number;
  attack: number;
  name: string;
  uuid: string;
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
