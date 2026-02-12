import { Space } from "../types/game";
import {
  BLANK_SPACE_ID,
  BATTERY_SPACE_ID,
  QUEUE_SPACE_ID,
  VOID_SPACE_ID,
} from "../enums/spaces";

const createSpace = (char: string, x: number, y: number): Space => {
  const isUpper = char === char.toUpperCase();
  switch (char) {
    case "W":
      return { type: BLANK_SPACE_ID, x, y };
    case "P":
    case "p":
      return { type: BATTERY_SPACE_ID, isPrimary: isUpper, x, y };
    case "A":
    case "a":
    case "B":
    case "b":
    case "C":
    case "c":
    case "D":
    case "d":
      return {
        type: QUEUE_SPACE_ID,
        isPrimary: isUpper,
        index: char.charCodeAt(0) - (isUpper ? "A" : "a").charCodeAt(0),
        x,
        y,
      };
    default:
      return { type: VOID_SPACE_ID, x, y };
  }
};

const getBoardById = async (id: string) => {
  const boardFile =
    "8 5\nA W W W W W W a\nB W W W W W W b\nW P W W W W p W\nC W W W W W W c\nD W W W W W W d";
  const lines = boardFile.split("\n");
  const [width, height] = lines[0]
    .trim()
    .split(" ")
    .map((s) => Number(s));
  const spaces = lines.slice(1).flatMap((line, y) => {
    const cells = line.trim().split(" ");
    return cells.map((cell, x) => createSpace(cell, x, y));
  });
  return {
    width,
    height,
    spaces,
    primaryDock: new Set<number>(),
    secondaryDock: new Set<number>(),
    id,
  };
};

export default getBoardById;
