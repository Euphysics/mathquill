// Side-effect imports: register all commands/symbols into LatexCmds/CharCmds
import './commands/math';
import './commands/math/basicSymbols';
import './commands/math/commands';
import './commands/math/advancedSymbols';
import './commands/math/LatexCommandInput';
import './commands/text';
// Register API classes after all commands are loaded
import './commands/mathApiSetup';

export { MathQuill, getInterface } from './publicapi';
