/**
 * Necronolib — Release-Build (npm run build).
 * Packt die Foundry-Moduldateien nach dist/necronolib.zip (module.json im Zip-Root)
 * und kopiert module.json nach dist/. Prüft vorher:
 *  - alle in module.json referenzierten Dateien existieren
 *  - alle relativen ES-Imports der ausgelieferten Module zeigen auf mitgelieferte Dateien
 *  - alle url(...)-Verweise der Stylesheets (z. B. Fonts) zeigen auf mitgelieferte Dateien
 *  - optional: Tag (argv[2], z. B. "v0.2.0") passt zu module.json.version
 */
import { readFileSync, existsSync, mkdirSync, rmSync, copyFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { execFileSync } from 'node:child_process';

const INCLUDE = ['module.json', 'README.md', 'scripts', 'src', 'templates', 'styles', 'lang', 'fonts'];
const manifest = JSON.parse(readFileSync('module.json', 'utf8'));

const tag = process.argv[2];
if (tag && tag !== `v${manifest.version}`) {
  console.error(`Tag ${tag} passt nicht zu module.json version ${manifest.version}`);
  process.exit(1);
}
if (!manifest.download?.includes(`/v${manifest.version}/`)) {
  console.error(`module.json download-URL zeigt nicht auf v${manifest.version}: ${manifest.download}`);
  process.exit(1);
}

const walk = (p) => (statSync(p).isDirectory() ? readdirSync(p).flatMap(f => walk(join(p, f))) : [normalize(p)]);
const files = INCLUDE.filter(existsSync).flatMap(walk);
const shipped = new Set(files);

const referenced = [...manifest.esmodules, ...manifest.styles, ...manifest.languages.map(l => l.path)];
const errors = referenced.filter(f => !shipped.has(normalize(f))).map(f => `module.json referenziert fehlende Datei: ${f}`);
for (const f of files.filter(f => f.endsWith('.mjs') || f.endsWith('.js'))) {
  for (const m of readFileSync(f, 'utf8').matchAll(/(?:import|export)[^'"]*?from\s*['"](\.{1,2}\/[^'"]+)['"]/g)) {
    const target = normalize(join(dirname(f), m[1]));
    if (!shipped.has(target)) errors.push(`${f}: Import ${m[1]} → ${target} nicht im Paket`);
  }
}
for (const f of files.filter(f => f.endsWith('.css'))) {
  for (const m of readFileSync(f, 'utf8').matchAll(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g)) {
    if (/^(data:|https?:|#)/.test(m[1])) continue;
    const target = normalize(join(dirname(f), m[1]));
    if (!shipped.has(target)) errors.push(`${f}: url(${m[1]}) → ${target} nicht im Paket`);
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

rmSync('dist', { recursive: true, force: true });
mkdirSync('dist');
execFileSync('zip', ['-q', '-X', '-r', 'dist/necronolib.zip', ...files], { stdio: 'inherit' });
copyFileSync('module.json', 'dist/module.json');
console.log(`dist/necronolib.zip (${files.length} Dateien) + dist/module.json für v${manifest.version}`);
