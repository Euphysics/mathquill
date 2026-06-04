import { pray } from './utils';
import type { APIClasses } from './publicapi';
import type { Controller } from './services/textarea';

export type AutoDict = {
  _maxLength?: number;
  [id: string]: any;
};

export type SubstituteKeyboardEvents = (
  el: $,
  controller: Controller
) => {
  select: (text: string) => void;
};

export class Options {
  constructor(public version: 1 | 2 | 3) {}

  ignoreNextMousedown: (_el: MouseEvent) => boolean;
  askIfShouldIgnoreMousemove: (
    evt: MouseEvent,
    rootDOM: HTMLElement
  ) => boolean;

  substituteTextarea: () => HTMLElement;
  /** Only used in interface versions 1 and 2. */
  substituteKeyboardEvents: SubstituteKeyboardEvents;

  restrictMismatchedBrackets?: boolean | 'none';
  typingSlashCreatesNewFraction?: boolean;
  charsThatBreakOutOfSupSub: string;
  sumStartsWithNEquals?: boolean;
  autoSubscriptNumerals?: boolean;
  supSubsRequireOperand?: boolean;
  spaceBehavesLikeTab?: boolean;
  typingAsteriskWritesTimesSymbol?: boolean;
  typingSlashWritesDivisionSymbol: boolean;
  typingPercentWritesPercentOf?: boolean;
  resetCursorOnBlur?: boolean | undefined;
  leftRightIntoCmdGoes?: 'up' | 'down';
  enableDigitGrouping?: boolean;
  tripleDotsAreEllipsis?: boolean;
  tabindex?: number;
  mouseEvents?: boolean;
  maxDepth?: number;
  disableCopyPaste?: boolean;
  statelessClipboard?: boolean;
  logAriaAlerts?: boolean;
  overridePaste?: (event?: ClipboardEvent) => boolean;
  overrideCopy?: (event?: ClipboardEvent) => boolean;
  overrideCut?: (event?: ClipboardEvent) => boolean;
  onPaste?: () => void;
  onCut?: () => void;
  overrideTypedText?: (text: string) => void;
  overrideKeystroke: (key: string, event: KeyboardEvent) => void;
  autoOperatorNames: AutoDict;
  infixOperatorNames: { [name in string]?: true };
  prefixOperatorNames: { [name in string]?: true };
  autoCommands: AutoDict;
  autoParenthesizedFunctions: AutoDict;
  quietEmptyDelimiters: { [id: string]: any };
  disableAutoSubstitutionInSubscripts?:
    | boolean
    | { except: { [name in string]?: true } };
  interpretTildeAsSim: boolean;
  handlers?: {
    fns: HandlerOptions;
    APIClasses: APIClasses;
  };
  scrollAnimationDuration?: number;

  jQuery: $ | undefined;
  assertJquery() {
    pray('Interface versions > 2 do not depend on JQuery', this.version <= 2);
    pray('JQuery is set for interface v < 3', this.jQuery);
    return this.jQuery;
  }
}
