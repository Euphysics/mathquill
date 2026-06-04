import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    name: 'js-main',
    platform: 'browser',
    target: 'esnext',
    format: 'iife',
    globalName: 'MathQuill',
    sourcemap: false,
    clean: false,
    dts: false,
    entry: {
      mathquill: 'src/index.ts'
    },
    outDir: 'build',
    outExtensions: () => ({ js: '.js' })
  },
  {
    name: 'js-basic',
    target: 'esnext',
    format: 'iife',
    globalName: 'MathQuill',
    sourcemap: false,
    clean: false,
    dts: false,
    entry: {
      'mathquill-basic': 'src/index.ts'
    },
    outDir: 'build',
    outExtensions: () => ({ js: '.js' })
  },
  {
    name: 'minify-js-main',
    platform: 'browser',
    target: 'esnext',
    minify: {
      compress: {
        dropConsole: true
      }
    },
    sourcemap: false,
    clean: false,
    dts: false,
    entry: {
      mathquill: 'build/mathquill.iife.js'
    },
    outDir: 'build',
    outExtensions: () => ({
      js: '.min.js'
    })
  },
  {
    name: 'minify-js-basic',
    platform: 'browser',
    target: 'esnext',
    minify: {
      compress: {
        dropConsole: true
      }
    },
    sourcemap: false,
    clean: false,
    dts: false,
    entry: {
      'mathquill-basic': 'build/mathquill-basic.iife.js'
    },
    outDir: 'build',
    outExtensions: () => ({
      js: '.min.js'
    })
  },
  {
    name: 'minify-css-main',
    clean: false,
    css: {
      minify: true,
      fileName: 'mathquill.min.css'
    },
    entry: {
      'mathquill.min': 'build/mathquill.css'
    },
    outDir: 'build'
  }
]);

