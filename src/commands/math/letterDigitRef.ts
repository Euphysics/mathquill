/**
 * Shared reference object to break circular dependency between
 * commands/math.ts (chToCmd) and commands/math/basicSymbols.ts (Letter, Digit).
 * basicSymbols.ts sets these refs after defining the classes.
 */
export const letterDigitRef: {
  Letter: (new (ch: string) => any) | undefined;
  Digit: (new (ch: string) => any) | undefined;
} = { Letter: undefined, Digit: undefined };
