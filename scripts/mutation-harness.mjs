#!/usr/bin/env node
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = root;

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { cwd: repoRoot, stdio: 'pipe', encoding: 'utf8', ...opts });
  } catch (e) {
    if (opts.allowFail) return e.stdout || e.stderr || '';
    throw e;
  }
}

function isClean() {
  const out = run('git status --short');
  if (out.trim() === '') return true;
  const lines = out.trim().split(/\r?\n/);
  const relevantes = lines.filter(l => {
    const path = l.replace(/^\?\?\s+/, '').replace(/^[AMDRCU?]\s+/, '');
    // tolerar el propio harness sin commitear
    if (path === 'scripts/mutation-harness.mjs') return false;
    return true;
  });
  return relevantes.length === 0;
}

function preserveLineEndings(content, original) {
  if (original.includes('\r\n')) {
    return content.replace(/\r?\n/g, '\r\n');
  }
  if (original.includes('\n') && !original.includes('\r\n')) {
    return content.replace(/\r\n/g, '\n');
  }
  return content;
}

// Helper for mutation 17
function reglaDeRange(css, selector) {
  const texto = css.replace(/\/\*[\s\S]*?\*\//g, c => ' '.repeat(c.length));
  let desde = 0;
  let nivel = 0;
  for (let i = 0; i < texto.length; i++) {
    if (texto[i] === '}') { nivel -= 1; desde = i + 1; continue; }
    if (texto[i] !== '{') continue;
    const partes = texto.slice(desde, i).split(',').map(p => p.trim());
    if (nivel === 0 && partes.includes(selector)) {
      let prof = 0;
      let j = i;
      for (; j < texto.length; j++) {
        if (texto[j] === '{') prof++;
        else if (texto[j] === '}' && --prof === 0) break;
      }
      return { start: desde, end: j + 1 };
    }
    nivel += 1;
    desde = i + 1;
  }
  return null;
}

const mutations = [
  {
    id: 1,
    name: 'remove .js-reveal gate from item selector',
    file: 'src/styles/global.css',
    apply: (s) => s.replace(/\.js-reveal\s+(\[data-reveal="item"\])/g, '$1'),
  },
  {
    id: 2,
    name: 'remove TOPE_MS cap in stagger calculation',
    file: 'src/scripts/motion.ts',
    apply: (s) => s.replace(/Math\.min\([^,]+,\s*TOPE_MS\)/g, (m) => {
      const inner = m.match(/Math\.min\(([^,]+),/);
      return inner ? inner[1].trim() : m;
    }),
  },
  {
    id: 3,
    name: 'add opacity: 0 to .glock-hero-title',
    file: 'src/styles/global.css',
    apply: (s) => s.replace(/(\.glock-hero-title\s*\{[^}]*?)animation:/g, '$1opacity: 0; animation:'),
  },
  {
    id: 4,
    // el nombre viene del brief, que estaba escrito contra una version del
    // modulo que tenia un conjunto `sueltos`. Hoy todos los `[data-reveal]` se
    // observan en el mismo bucle, asi que "quitar los sueltos de los
    // observados" es directamente filtrar el bucle por scope.
    name: 'el observer deja de observar los reveals sin scope',
    file: 'src/scripts/motion.ts',
    apply: (s) =>
      s.replace(
        /for \(const el of reveals\) observer\.observe\(el\);/,
        "for (const el of reveals) if (el.closest('[data-reveal-scope]')) observer.observe(el);",
      ),
  },
  {
    id: 5,
    name: 'delete safety network block',
    file: 'src/scripts/motion.ts',
    apply: (s) => {
      const marker = '// Red de seguridad propia';
      const idx = s.indexOf(marker);
      if (idx === -1) return s;
      const end = s.indexOf('// Sin IntersectionObserver', idx);
      if (end > idx) return s.slice(0, idx) + s.slice(end);
      const lines = s.split(/\r?\n/);
      const startLine = lines.findIndex(l => l.includes(marker));
      if (startLine === -1) return s;
      lines.splice(startLine, Math.min(20, lines.length - startLine));
      return lines.join(s.includes('\r\n') ? '\r\n' : '\n');
    },
  },
  {
    id: 6,
    name: 'remove data-reveal-scope from one component section',
    file: 'src/components/Sessions.astro',
    apply: (s) => s.replace(/data-reveal-scope/g, ''),
  },
  {
    id: 7,
    // el patron anterior buscaba `<p class="mt-3"` con comilla de cierre, pero
    // el elemento real es `<p class="mt-3 flex flex-wrap ...">`, asi que la
    // sustitucion noenia nada y la mutacion pasaba sin tocar el archivo.
    name: 'anidar un reveal dentro de otro en Sessions.astro',
    file: 'src/components/Sessions.astro',
    apply: (s) => s.replace(/<p class="mt-3 /g, '<p data-reveal="item" class="mt-3 '),
  },
  {
    id: 8,
    name: 'change one component data-reveal="item" to data-reveal="items"',
    file: 'src/components/Artistas.astro',
    apply: (s) => s.replace(/data-reveal="item"/, 'data-reveal="items"'),
  },
  {
    id: 9,
    name: 'make a section scope bare data-reveal',
    file: 'src/components/Manifiesto.astro',
    apply: (s) => s.replace(/data-reveal-scope/g, 'data-reveal'),
  },
  {
    id: 10,
    name: 'remove both from .glock-hero-rise declaration',
    file: 'src/styles/global.css',
    apply: (s) => s.replace(/(\.glock-hero-rise\s*\{[^}]*animation:[^;}]*?)\bboth\b/g, '$1'),
  },
  {
    id: 11,
    name: 'add clip-path inset(0 0 100% 0) to keyframes glock-hero-title-in from',
    file: 'src/styles/global.css',
    apply: (s) => s.replace(/(@keyframes glock-hero-title-in\s*\{[^}]*?from\s*\{)/g, '$1 clip-path: inset(0 0 100% 0);'),
  },
  {
    id: 12,
    name: 'add opacity: 0 to same from block',
    file: 'src/styles/global.css',
    apply: (s) => s.replace(/(@keyframes glock-hero-title-in\s*\{[^}]*?from\s*\{[^}]*?)(transform:)/g, '$1opacity: 0; $2'),
  },
  {
    id: 13,
    name: 'renumber [data-hero-step] 1..4 to 0..3',
    file: 'src/styles/global.css',
    apply: (s) => {
      let t = s.replace(/data-hero-step='1'/g, "data-hero-step='0'");
      t = t.replace(/data-hero-step='2'/g, "data-hero-step='1'");
      t = t.replace(/data-hero-step='3'/g, "data-hero-step='2'");
      t = t.replace(/data-hero-step='4'/g, "data-hero-step='3'");
      return t;
    },
  },
  {
    id: 14,
    name: 'move [data-hero-step] rules above .glock-hero-rise',
    file: 'src/styles/global.css',
    apply: (s) => {
      const regex = /\[data-hero-step='[0-9]'\]\s*\{[^}]*\}/g;
      const stepRules = [];
      let match;
      while ((match = regex.exec(s)) !== null) stepRules.push(match[0]);
      if (stepRules.length === 0) return s;
      let out = s;
      for (const r of stepRules) out = out.replace(r, '');
      const riseIdx = out.indexOf('.glock-hero-rise');
      if (riseIdx === -1) return s;
      const before = out.lastIndexOf('\n', riseIdx);
      const insertPos = before === -1 ? riseIdx : before + 1;
      return out.slice(0, insertPos) + stepRules.join('\n') + '\n' + out.slice(insertPos);
    },
  },
  {
    id: 15,
    name: 'move .glock-hero-rise from Hero.astro:9 onto parent (line 7)',
    file: 'src/components/Hero.astro',
    apply: (s) => s.replace(/class="glock-hero-rise[^"]*"/g, '').replace(/(<div class="grid[^"]*)"/, '$1 glock-hero-rise"'),
  },
  {
    id: 16,
    name: 'delete opacity: 1 !important from reduced-motion item rule',
    file: 'src/styles/global.css',
    apply: (s) => s.replace(/(\.js-reveal\s*\[data-reveal="item"\]\s*\{[^}]*?)opacity:\s*1\s*!important\s*;?/g, '$1'),
  },
  {
    id: 17,
    name: 'delete .glock-hero-title rule entirely',
    file: 'src/styles/global.css',
    apply: (s) => {
      const rule = reglaDeRange(s, '.glock-hero-title');
      if (!rule) return s;
      return s.slice(0, rule.start) + s.slice(rule.end);
    },
  },
];

async function main() {
  if (!isClean()) {
    console.error('error: git status no esta limpio (guardar o commitear cambios)');
    process.exit(1);
  }

  // base
  try {
    run('cd ' + repoRoot + ' && node --test "tests/content.test.mjs"');
  } catch (e) {
    console.error('error: los tests de base fallaron antes de mutar');
    process.exit(1);
  }

  const results = [];
  const backups = new Map();

  function restoreAll(){ for(const [pp,orig] of backups){ try{ writeFileSync(pp,orig); }catch(e){} } }
  process.on("SIGINT", ()=>{ restoreAll(); process.exit(130); });
  process.on("uncaughtException", (e)=>{ console.error(e); restoreAll(); process.exit(1); });
  process.on("unhandledRejection", (e)=>{ console.error(e); restoreAll(); process.exit(1); });

  try{
  for (let i = 0; i < mutations.length; i++) {
    const mut = mutations[i];
    const fullPath = join(repoRoot, mut.file);
    if (!existsSync(fullPath)) {
      results.push({ ...mut, caught: false, fired: 'NOT CAUGHT (file missing)' });
      continue;
    }
    const original = readFileSync(fullPath, 'utf8');
    backups.set(fullPath, original);
    const mutated = preserveLineEndings(mut.apply(original), original);

    // Una mutacion que no cambia el archivo no prueba nada: la suite sigue
    // verde porque no toco nada, y reportarla como NOT CAUGHT la confunde con
    // un guard que falta. Dos de las diecisiete estaban rotas justo asi y se
    // leian como cobertura faltante. Si el patron dejo de existir, el harness
    // se frena y obliga a rehacer la mutacion.
    if (mutated === original) {
      results.push({ ...mut, caught: false, inert: true, fired: 'INERTA (no modifico el archivo)' });
      continue;
    }
    writeFileSync(fullPath, mutated);

    // Some mutations need build if touching src that affects dist? Tests read dist for some checks but also src
    // The instruction says build before mutations that touch src or state why. Many touch src files.
    let built = false;
    if (mut.file.startsWith('src/')) {
      try {
        run('cd ' + repoRoot + ' && npx --no-install astro build 2>&1', { allowFail: true });
        built = true;
      } catch (e) {
        built = false;
      }
    }

    let caught = false;
    let fired = 'NOT CAUGHT';
    try {
      run('cd ' + repoRoot + ' && node --test "tests/content.test.mjs" 2>&1');
      caught = false;
      fired = 'NOT CAUGHT';
    } catch (e) {
      caught = true;
      const out = e.stdout || e.stderr || '';
      // Try to extract test name that failed
      const failMatch = out.match(/FAIL\s+([^\n]+)/);
      const testNameMatch = out.match(/✖\s+([^\n]+)/);
      fired = failMatch ? failMatch[1].trim() : (testNameMatch ? testNameMatch[1].trim() : 'FAILED');
    }

    results.push({ ...mut, caught, fired, built });

    // Restore
    writeFileSync(fullPath, original);
  }

  restoreAll();
  }
  catch (e) {
    restoreAll();
    console.error(e);
    process.exit(1);
  }
  finally {
    restoreAll();
  }

  console.error('DEBUG: printing results');
  process.stdout.write('\n=== MUTATION RESULTS ===\n');
  for (const r of results) {
    process.stdout.write(`${r.id.toString().padStart(2)}. ${r.name}\n`);
    process.stdout.write(`    fired: ${r.fired}\n`);
    process.stdout.write(`    built: ${r.built}\n`);
    process.stdout.write('\n');
  }
  const inertes = results.filter((r) => r.inert);
  const caught = results.filter((r) => r.caught).length;
  const notCaught = results.filter((r) => !r.caught && !r.inert).length;
  process.stdout.write(
    `Summary: ${caught} caught / ${notCaught} NOT CAUGHT / ${inertes.length} inertes / ${results.length} total\n`,
  );
  // Una inerta no es un guard faltante sino una mutacion que hay que rehacer,
  // asi que sale por su cuenta y no se disimula como cobertura.
  if (inertes.length > 0) {
    process.stdout.write(`\nINERTES: ${inertes.map((r) => r.id).join(', ')}\n`);
    process.exit(1);
  }
  if (notCaught > 0) process.exit(1);
  process.exit(0);
}

// `file://${process.argv[1]}` no sirve en windows: argv[1] viene con
// backslashes y sin el slash inicial, asi que la comparacion nunca era cierta y
// main() no corria nunca. El harness salia con 0 sin hacer nada, que es
// justamente el resultado que hace pasar por verde una suite sin ejecutar.
// `pathToFileURL` normaliza el path a la misma forma que da `import.meta.url`.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

export { mutations, isClean, run };
