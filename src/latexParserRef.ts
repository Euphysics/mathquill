/**
 * Shared mutable reference to latexMathParser.
 *
 * Breaks the circular dependency chain:
 *   commands/math.ts → services/latex.ts → commands/math/basicSymbols.ts → commands/math.ts
 *
 * latex.ts sets this reference after defining latexMathParser.
 * commands/math.ts reads it lazily inside MathCommand.parser().
 */
export const latexParserRef: { parser: any } = { parser: undefined };
