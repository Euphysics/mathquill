#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import less from 'less';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT, 'src');
const BUILD_DIR = path.join(ROOT, 'build');
const INTRO = path.join(SRC_DIR, 'intro.js');
const OUTRO = path.join(SRC_DIR, 'outro.js');
const CSS_MAIN = path.join(SRC_DIR, 'css', 'main.less');
const UNIT_DIR = path.join(ROOT, 'test', 'unit');

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

const SOURCE_SETS = {
  full: BASE_SOURCES.concat([
    path.join(SRC_DIR, 'commands/math.ts'),
    path.join(SRC_DIR, 'commands/text.ts'),
    path.join(SRC_DIR, 'commands/math/advancedSymbols.ts'),
    path.join(SRC_DIR, 'commands/math/basicSymbols.ts'),
    path.join(SRC_DIR, 'commands/math/commands.ts'),
    path.join(SRC_DIR, 'commands/math/LatexCommandInput.ts')
  ]),
  basic: BASE_SOURCES.concat([
    path.join(SRC_DIR, 'commands/math.ts'),
    path.join(SRC_DIR, 'commands/math/basicSymbols.ts'),
    path.join(SRC_DIR, 'commands/math/commands.ts')
  ])
};

const TEST_SUPPORT = [
  path.join(ROOT, 'test', 'support', 'assert.ts'),
  path.join(ROOT, 'test', 'support', 'trigger-event.ts'),
  path.join(ROOT, 'test', 'support', 'jquery-stub.ts')
];

const MINIFY_FILTERS = {
  main: ['minify-js-main', 'minify-css-main'],
  basic: ['minify-js-basic']
};

const REQUIRED_FOR_MINIFY = {
  main: ['mathquill.js', 'mathquill.css'],
  basic: ['mathquill-basic.js']
};

const COMMAND_ALIASES = {
  uglify: 'minify'
};

const COMMAND_STEPS = {
  all: ['font', 'css', 'js', 'minify'],
  dev: ['font', 'css', 'js'],
  js: ['js'],
  minify: ['minify'],
  css: ['css'],
  font: ['font'],
  basic: ['basic-js', 'minify-basic', 'basic-css'],
  'unminified-basic': ['basic-js', 'basic-css'],
  test: ['test-js'],
  'test-artifacts': ['font', 'css', 'js', 'basic-js', 'basic-css', 'test-js'],
  clean: ['clean']
};

function readVersion() {
  const packageJsonPath = path.join(ROOT, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  return packageJson.version;
}

function escapeNonAscii(source) {
  return source.replace(/[^\x00-\x7F]/g, (char) => {
    return `\\u${`000${char.charCodeAt(0).toString(16)}`.slice(-4)}`;
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
  const tsInput = options.escapeUnicode
    ? escapeNonAscii(concatenated)
    : concatenated;

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

function runTsdownMinify(filters) {
  const filterArgs = filters.flatMap((filterName) => ['--filter', filterName]);
  const result = spawnSync(
    'pnpm',
    ['exec', 'tsdown', '--config', 'tsdown.config.ts', ...filterArgs],
    { cwd: ROOT, encoding: 'utf8' }
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      result.stderr || `tsdown failed with exit code ${result.status}`
    );
  }
  if (result.stdout) process.stdout.write(result.stdout);
}

function minifyArtifacts(mode) {
  const required = REQUIRED_FOR_MINIFY[mode];
  const missing = required.filter(
    (file) => !fs.existsSync(path.join(BUILD_DIR, file))
  );
  if (missing.length > 0) {
    if (mode === 'main') {
      throw new Error(
        'build/mathquill.js or build/mathquill.css is missing. Run "node script/build.js dev" first.'
      );
    }
    throw new Error(
      'build/mathquill-basic.js is missing. Run "node script/build.js unminified-basic" first.'
    );
  }

  runTsdownMinify(MINIFY_FILTERS[mode]);
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
  writeBuildFile(
    options.basic ? 'mathquill-basic.css' : 'mathquill.css',
    withReplacements
  );
}

function copyFonts() {
  ensureBuildDir();
  const sourceDir = path.join(SRC_DIR, 'fonts');
  const targetDir = path.join(BUILD_DIR, 'fonts');

  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.cpSync(sourceDir, targetDir, { recursive: true });
  console.log(
    `copied ${path.relative(ROOT, sourceDir)} -> ${path.relative(ROOT, targetDir)}`
  );
}

function getUnitTests() {
  return fs
    .readdirSync(UNIT_DIR)
    .filter((file) => /\.test\.(js|ts)$/.test(file))
    .sort()
    .map((file) => path.join(UNIT_DIR, file));
}

function buildJs(options, mode = 'full') {
  const outputName = mode === 'basic' ? 'mathquill-basic.js' : 'mathquill.js';

  const output = transpileBundle([INTRO].concat(SOURCE_SETS[mode], [OUTRO]), {
    version: options.version,
    classPrefix: options.classPrefix,
    escapeUnicode: true
  });
  return writeBuildFile(outputName, output);
}

function buildTestJs(options) {
  const inputFiles = [INTRO].concat(
    SOURCE_SETS.full,
    TEST_SUPPORT,
    getUnitTests(),
    [OUTRO]
  );

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

  const resolvedCommand = COMMAND_ALIASES[commandName] || commandName;
  const steps = COMMAND_STEPS[resolvedCommand];

  if (!steps) {
    const allCommands = Object.keys(COMMAND_STEPS)
      .concat(Object.keys(COMMAND_ALIASES))
      .sort();
    throw new Error(
      `Unknown command "${commandName}". Expected one of: ${allCommands.join(', ')}`
    );
  }

  const stepHandlers = {
    font: async () => copyFonts(),
    css: async () => buildCss(options),
    js: async () => buildJs(options, 'full'),
    minify: async () => minifyArtifacts('main'),
    'basic-js': async () => buildJs(options, 'basic'),
    'minify-basic': async () => minifyArtifacts('basic'),
    'basic-css': async () => buildCss({ ...options, basic: true }),
    'test-js': async () => buildTestJs(options),
    clean: async () => {
      fs.rmSync(BUILD_DIR, { recursive: true, force: true });
      console.log('cleaned build directory');
    }
  };

  for (const step of steps) {
    await stepHandlers[step]();
  }
}

const commandName = process.argv.slice(2).find((arg) => arg !== '--') || 'all';
run(commandName).catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
