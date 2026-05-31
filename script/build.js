#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const ts = require('typescript');
const less = require('less');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const BUILD_DIR = path.join(ROOT, 'build');
const INTRO = path.join(SRC_DIR, 'intro.js');
const OUTRO = path.join(SRC_DIR, 'outro.js');
const CSS_MAIN = path.join(SRC_DIR, 'css', 'main.less');

const BASE_SOURCES = [
  'utils.ts',
  'dom.ts',
  'unicode.ts',
  'browser.ts',
  'animate.ts',
  'services/aria.ts',
  'domFragment.ts',
  'tree.ts',
  'cursor.ts',
  'controller.ts',
  'publicapi.ts',
  'services/parser.util.ts',
  'services/saneKeyboardEvents.util.ts',
  'services/exportText.ts',
  'services/focusBlur.ts',
  'services/keystroke.ts',
  'services/latex.ts',
  'services/mouse.ts',
  'services/scrollHoriz.ts',
  'services/textarea.ts'
].map((file) => path.join(SRC_DIR, file));

const SOURCES_FULL = BASE_SOURCES.concat([
  path.join(SRC_DIR, 'commands/math.ts'),
  path.join(SRC_DIR, 'commands/text.ts'),
  path.join(SRC_DIR, 'commands/math/advancedSymbols.ts'),
  path.join(SRC_DIR, 'commands/math/basicSymbols.ts'),
  path.join(SRC_DIR, 'commands/math/commands.ts'),
  path.join(SRC_DIR, 'commands/math/LatexCommandInput.ts')
]);

const SOURCES_BASIC = BASE_SOURCES.concat([
  path.join(SRC_DIR, 'commands/math.ts'),
  path.join(SRC_DIR, 'commands/math/basicSymbols.ts'),
  path.join(SRC_DIR, 'commands/math/commands.ts')
]);

function readVersion() {
  const packageJsonPath = path.join(ROOT, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  return packageJson.version;
}

function escapeNonAscii(source) {
  return source.replace(/[^\x00-\x7F]/g, (char) => {
    return `\\u${(`000${char.charCodeAt(0).toString(16)}`).slice(-4)}`;
  });
}

function applyBuildReplacements(source, options) {
  const classPrefix = options.classPrefix || '';
  return source
    .replace(/mq-/g, `${classPrefix}mq-`)
    .replace(/\{VERSION\}/g, `v${options.version}`);
}

function transpileBundle(filePaths, options) {
  const concatenated = filePaths
    .map((filePath) => fs.readFileSync(filePath, 'utf8'))
    .join('\n');
  const tsInput = options.escapeUnicode ? escapeNonAscii(concatenated) : concatenated;

  const transpiled = ts.transpileModule(tsInput, {
    compilerOptions: {
      target: 'es5'
    }
  }).outputText;

  return applyBuildReplacements(transpiled, options);
}

function ensureBuildDir() {
  fs.mkdirSync(BUILD_DIR, { recursive: true });
}

function writeBuildFile(relativePath, contents) {
  ensureBuildDir();
  const outputPath = path.join(BUILD_DIR, relativePath);
  fs.writeFileSync(outputPath, contents, 'utf8');
  console.log(`built ${path.relative(ROOT, outputPath)}`);
  return outputPath;
}

function minify(inputPath, outputName) {
  const uglifyBin = path.join(ROOT, 'node_modules', '.bin', 'uglifyjs');
  const outputPath = path.join(BUILD_DIR, outputName);

  const result = spawnSync(
    uglifyBin,
    ['--mangle', '--compress', 'hoist_vars=true', '--comments', '/maintainers@mathquill.com/'],
    {
      cwd: ROOT,
      input: fs.readFileSync(inputPath, 'utf8'),
      encoding: 'utf8'
    }
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(result.stderr || `uglify failed with exit code ${result.status}`);
  }

  fs.writeFileSync(outputPath, result.stdout, 'utf8');
  console.log(`built ${path.relative(ROOT, outputPath)}`);
}

async function buildCss(options) {
  const mainLess = fs.readFileSync(CSS_MAIN, 'utf8');
  const globalVars = {};

  if (options.basic) globalVars.basic = 'true';
  if (options.omitFontFace) globalVars['omit-font-face'] = 'true';

  const rendered = await less.render(mainLess, {
    filename: CSS_MAIN,
    globalVars
  });

  const withReplacements = applyBuildReplacements(rendered.css, options);
  writeBuildFile(options.basic ? 'mathquill-basic.css' : 'mathquill.css', withReplacements);
}

function copyFonts() {
  ensureBuildDir();
  const sourceDir = path.join(SRC_DIR, 'fonts');
  const targetDir = path.join(BUILD_DIR, 'fonts');

  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.cpSync(sourceDir, targetDir, { recursive: true });
  console.log(`copied ${path.relative(ROOT, sourceDir)} -> ${path.relative(ROOT, targetDir)}`);
}

function getUnitTests() {
  const unitDir = path.join(ROOT, 'test', 'unit');
  return fs
    .readdirSync(unitDir)
    .filter((file) => /\.test\.(js|ts)$/.test(file))
    .sort()
    .map((file) => path.join(unitDir, file));
}

function buildJs(options) {
  const sources = options.basic ? SOURCES_BASIC : SOURCES_FULL;
  const outputName = options.basic ? 'mathquill-basic.js' : 'mathquill.js';

  const output = transpileBundle([INTRO].concat(sources, [OUTRO]), {
    version: options.version,
    classPrefix: options.classPrefix,
    escapeUnicode: true
  });
  return writeBuildFile(outputName, output);
}

function buildTestJs(options) {
  const testSupport = [
    path.join(ROOT, 'test', 'support', 'assert.ts'),
    path.join(ROOT, 'test', 'support', 'trigger-event.ts'),
    path.join(ROOT, 'test', 'support', 'jquery-stub.ts')
  ];
  const inputFiles = [INTRO].concat(SOURCES_FULL, testSupport, getUnitTests(), [OUTRO]);

  const output = transpileBundle(inputFiles, {
    version: options.version,
    classPrefix: '',
    escapeUnicode: false
  });

  writeBuildFile('mathquill.test.js', output);
}

async function run(commandName) {
  const version = readVersion();
  const classPrefix = process.env.MQ_CLASS_PREFIX || '';
  const omitFontFace = process.env.OMIT_FONT_FACE === 'true';

  const options = { version, classPrefix, omitFontFace };

  switch (commandName) {
    case 'all': {
      copyFonts();
      await buildCss(options);
      const mainJs = buildJs({ ...options, basic: false });
      minify(mainJs, 'mathquill.min.js');
      break;
    }
    case 'dev': {
      copyFonts();
      await buildCss(options);
      buildJs({ ...options, basic: false });
      break;
    }
    case 'js': {
      buildJs({ ...options, basic: false });
      break;
    }
    case 'uglify': {
      const mainJs = path.join(BUILD_DIR, 'mathquill.js');
      if (!fs.existsSync(mainJs)) {
        throw new Error('build/mathquill.js is missing. Run "node script/build.js js" first.');
      }
      minify(mainJs, 'mathquill.min.js');
      break;
    }
    case 'css': {
      await buildCss(options);
      break;
    }
    case 'font': {
      copyFonts();
      break;
    }
    case 'basic': {
      const basicJs = buildJs({ ...options, basic: true });
      minify(basicJs, 'mathquill-basic.min.js');
      await buildCss({ ...options, basic: true });
      break;
    }
    case 'unminified-basic': {
      buildJs({ ...options, basic: true });
      await buildCss({ ...options, basic: true });
      break;
    }
    case 'test': {
      buildTestJs(options);
      break;
    }
    case 'test-artifacts': {
      copyFonts();
      await buildCss(options);
      buildJs({ ...options, basic: false });
      buildJs({ ...options, basic: true });
      await buildCss({ ...options, basic: true });
      buildTestJs(options);
      break;
    }
    case 'clean': {
      fs.rmSync(BUILD_DIR, { recursive: true, force: true });
      console.log('cleaned build directory');
      break;
    }
    default: {
      throw new Error(
        `Unknown command "${commandName}". Expected one of: all, dev, js, uglify, css, font, basic, unminified-basic, test, test-artifacts, clean`
      );
    }
  }
}

const commandName = process.argv[2] || 'all';
run(commandName).catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
