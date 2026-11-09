// Sincroniza a versão do aplicativo em todos os lugares usados pelos builds.
//
// Uso:
//   node scripts/set-version.mjs 1.0.7
//
// O workflow de publicação chama este script antes de compilar, usando o
// número da execução do GitHub Actions (ex.: v1.0.7). Assim, o instalador do
// Windows (electron-builder), o APK Android e a interface exibem a MESMA
// versão publicada no GitHub Releases.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const version = process.argv[2];

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error(`Versão inválida: "${version ?? ''}". Use o formato MAJOR.MINOR.PATCH (ex.: 1.0.7).`);
  process.exit(1);
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));
const writeJson = (file, data) => writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

const updatePackageJson = (relativePath) => {
  const file = resolve(root, relativePath);
  if (!existsSync(file)) return;
  const pkg = readJson(file);
  pkg.version = version;
  writeJson(file, pkg);
  console.log(`  atualizado ${relativePath}`);
};

const updatePackageLock = (relativePath) => {
  const file = resolve(root, relativePath);
  if (!existsSync(file)) return;
  const lock = readJson(file);
  lock.version = version;
  if (lock.packages && lock.packages['']) {
    lock.packages[''].version = version;
  }
  writeJson(file, lock);
  console.log(`  atualizado ${relativePath}`);
};

console.log(`Sincronizando versão do app para ${version}...`);

// Projeto web / Vite
updatePackageJson('package.json');
updatePackageLock('package-lock.json');

// Empacotamento desktop (electron-builder usa esta versão no instalador)
updatePackageJson('electron/package.json');
updatePackageLock('electron/package-lock.json');

// Android (nome e código de versão exibidos/instalados)
const gradleFile = resolve(root, 'android', 'app', 'build.gradle');
if (existsSync(gradleFile)) {
  const [major, minor, patch] = version.split('.').map(Number);
  const versionCode = major * 10000 + minor * 100 + patch;
  let gradle = readFileSync(gradleFile, 'utf8');
  gradle = gradle.replace(/versionCode\s+\d+/, `versionCode ${versionCode}`);
  gradle = gradle.replace(/versionName\s+"[^"]*"/, `versionName "${version}"`);
  writeFileSync(gradleFile, gradle, 'utf8');
  console.log(`  atualizado android/app/build.gradle (versionCode ${versionCode}, versionName "${version}")`);
}

console.log('Versão sincronizada com sucesso.');
