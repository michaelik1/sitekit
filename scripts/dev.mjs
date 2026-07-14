import { spawn, spawnSync } from 'node:child_process';
import { existsSync, watch } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';

const root = resolve(import.meta.dirname, '..');
const nuxtCli = resolve(root, 'node_modules', '@nuxt', 'cli', 'bin', 'nuxi.mjs');

let building = false;
let queued = false;
let debounce;
let watcher;
let shuttingDown = false;

function runNodeScript(script, args = [], options = {}) {
  return spawn(process.execPath, [resolve(root, script), ...args], {
    cwd: root,
    stdio: 'inherit',
    ...options,
  });
}

const initial = spawnSync(
  process.execPath,
  [resolve(root, 'scripts', 'prepare-content.mjs')],
  { cwd: root, stdio: 'inherit' },
);

if (initial.error) {
  console.error('[dev] Не удалось запустить сборку контента:', initial.error.message);
  process.exit(1);
}

if (initial.status !== 0) {
  process.exit(initial.status ?? 1);
}

if (!existsSync(nuxtCli)) {
  console.error('[dev] Nuxt CLI не найден. Выполните npm install и повторите npm run dev.');
  process.exit(1);
}

function runContentBuild() {
  if (building) {
    queued = true;
    return;
  }

  building = true;
  const child = runNodeScript('scripts/prepare-content.mjs');

  child.on('error', (error) => {
    building = false;
    console.error('[content] Не удалось запустить сборку:', error.message);
  });

  child.on('exit', (code) => {
    building = false;

    if (code !== 0) {
      console.error('[content] Исправьте ошибку; Nuxt продолжает работать с последней успешной сборкой.');
    }

    if (queued && !shuttingDown) {
      queued = false;
      runContentBuild();
    }
  });
}

// Запускаем JavaScript-файл Nuxt CLI напрямую через текущий Node.js.
// Это одинаково работает на Windows, macOS и Linux и не зависит от
// платформенных обёрток npx.cmd / node_modules/.bin/*.cmd.
const nuxt = spawn(
  process.execPath,
  [nuxtCli, 'dev', ...process.argv.slice(2)],
  {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  },
);

nuxt.on('error', (error) => {
  console.error('[dev] Не удалось запустить Nuxt:', error.message);
  process.exitCode = 1;
  shutdown();
});

watcher = watch(resolve(root, 'content'), { recursive: true }, () => {
  clearTimeout(debounce);
  debounce = setTimeout(runContentBuild, 180);
});

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  clearTimeout(debounce);
  watcher?.close();

  if (nuxt.exitCode === null && !nuxt.killed) {
    // На Windows поддерживается завершение дочернего Node-процесса без
    // POSIX-сигнала; на Unix сохраняем полученный сигнал.
    nuxt.kill(process.platform === 'win32' ? undefined : signal);
  }
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

nuxt.on('exit', (code, signal) => {
  if (!shuttingDown) {
    clearTimeout(debounce);
    watcher?.close();
  }

  if (signal && !shuttingDown) {
    console.error(`[dev] Nuxt завершён сигналом ${signal}.`);
  }

  process.exit(code ?? (signal ? 1 : 0));
});
