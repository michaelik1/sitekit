import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');

const root = resolve(import.meta.dirname, '..');
const ignoredDirectories = new Set(['.git', '.nuxt', '.output', 'node_modules', 'public', 'content']);
const sourceExtensions = new Set(['.ts', '.mts', '.cts']);
const files = [];

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.env.example') continue;
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name)) await collect(absolute);
      continue;
    }
    const extension = extname(entry.name);
    if (sourceExtensions.has(extension) || extension === '.vue') files.push(absolute);
  }
}

function formatDiagnostic(diagnostic, fileName, source) {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
  if (typeof diagnostic.start !== 'number') return `${fileName}: ${message}`;
  const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const { line, character } = sourceFile.getLineAndCharacterOfPosition(diagnostic.start);
  return `${fileName}:${line + 1}:${character + 1}: ${message}`;
}

function extractVueScripts(source) {
  const blocks = [];
  const pattern = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = pattern.exec(source))) {
    const attributes = match[1] ?? '';
    if (/\bsrc\s*=/.test(attributes)) continue;
    blocks.push(match[2] ?? '');
  }
  return blocks;
}

await collect(root);
const errors = [];
let checkedUnits = 0;

for (const absolute of files.sort()) {
  const displayName = relative(root, absolute).replaceAll('\\', '/');
  const source = await readFile(absolute, 'utf8');
  const units = absolute.endsWith('.vue') ? extractVueScripts(source) : [source];

  for (const [index, unit] of units.entries()) {
    checkedUnits += 1;
    const virtualName = absolute.endsWith('.vue') ? `${displayName}#script-${index + 1}.ts` : displayName;
    const result = ts.transpileModule(unit, {
      fileName: virtualName,
      reportDiagnostics: true,
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        strict: true,
        isolatedModules: true,
        verbatimModuleSyntax: true
      }
    });
    for (const diagnostic of result.diagnostics ?? []) {
      if (diagnostic.category === ts.DiagnosticCategory.Error) {
        errors.push(formatDiagnostic(diagnostic, virtualName, unit));
      }
    }
  }
}

if (errors.length) {
  console.error(`[source] Найдено ошибок: ${errors.length}`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`[source] Синтаксис проверен: ${files.length} файлов, ${checkedUnits} TypeScript-блоков.`);
