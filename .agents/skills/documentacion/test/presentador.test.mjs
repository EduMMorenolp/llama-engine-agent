import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = join(HERE, '..');
const CLI = join(SKILL_ROOT, 'bin', 'presentador.mjs');
const EXAMPLE = join(SKILL_ROOT, 'examples', 'reserva-admin.feature.json');
const SIMPLE_TEMPLATE = join(SKILL_ROOT, 'assets', 'template-simple.html');

function run(args) {
  const res = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8' });
  let payload = null;
  try {
    payload = JSON.parse(res.stdout);
  } catch {
    payload = null;
  }
  return { status: res.status, payload, stderr: res.stderr };
}

function tmp() {
  return mkdtempSync(join(tmpdir(), 'docskill-'));
}

const STAMP = '20261014';

function dated(path) {
  const dir = dirname(path);
  const base = basename(path).replace(/^\d{8}-/, '');
  return join(dir, `${STAMP}-${base}`);
}

function simplePath(technicalPath) {
  return technicalPath.replace(/\.html$/i, '') + '-simple.html';
}

function exampleCandidate() {
  return JSON.parse(readFileSync(EXAMPLE, 'utf8'));
}

test('doctor reports ready with both templates', () => {
  const { status, payload } = run(['doctor']);
  assert.equal(status, 0);
  assert.equal(payload.ok, true);
  assert.equal(payload.doctor, 'ready');
  assert.equal(payload.templates.length, 2);
  assert.ok(existsSync(SIMPLE_TEMPLATE));
});

test('guide returns sections and questions', () => {
  const { status, payload } = run(['guide', 'presentar reserva para administración', '--json']);
  assert.equal(status, 0);
  assert.ok(payload.sections.length >= 5);
  assert.ok(payload.askUser.length >= 5);
  assert.match(payload.outputConvention, /<slug>-simple\.html/);
});

test('finalize writes both documents and passes all gates on the example', () => {
  const dir = tmp();
  const out = join(dir, 'reserva-admin.html');
  try {
    const { status, payload } = run(['finalize', EXAMPLE, out, '--json']);
    assert.equal(status, 0, JSON.stringify(payload?.gates, null, 2));
    assert.equal(payload.summary.failed, 0);
    assert.equal(payload.outputs.technical, dated(out));
    assert.equal(payload.outputs.simple, simplePath(dated(out)));
    assert.ok(existsSync(dated(out)), 'technical output missing');
    assert.ok(existsSync(simplePath(dated(out))), 'simple output missing');
    assert.equal(basename(dated(out)), '20261014-reserva-admin.html');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('date prefix comes from meta.date and is never doubled', () => {
  const dir = tmp();
  try {
    const alreadyDated = join(dir, '20260101-nombre.html');
    const { status, payload } = run(['finalize', EXAMPLE, alreadyDated, '--json']);
    assert.equal(status, 0);
    assert.equal(basename(payload.outputs.technical), '20261014-nombre.html');
    assert.ok(existsSync(payload.outputs.technical));
    assert.ok(!existsSync(join(dir, '20261014-20260101-nombre.html')), 'prefix doubled');
    assert.equal(basename(payload.outputs.simple), '20261014-nombre-simple.html');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('technical document includes required sections and no template tokens', () => {
  const dir = tmp();
  const out = dated(join(dir, 'doc.html'));
  try {
    const { status } = run(['finalize', EXAMPLE, join(dir, 'doc.html'), '--json']);
    assert.equal(status, 0);
    const html = readFileSync(out, 'utf8');
    for (const heading of [
      'Contexto y objetivo',
      'Alcance',
      'Qué queda fuera',
      'Definiciones pendientes',
      'Flujo paso a paso',
      'Historias de usuario',
      'Plan de implementación',
      'Impacto técnico',
      'Notas',
    ])
      assert.ok(html.includes(heading), `missing ${heading}`);
    assert.ok(html.includes('/webhooks/mercadopago'), 'endpoints missing in technical doc');
    assert.ok(!html.includes('{{'), 'unreplaced template token');
    assert.ok(!/rel="stylesheet"/.test(html));
    assert.ok(!/url\(\s*['"]?https?:\/\//.test(html));
    assert.ok(html.includes('@page'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('simple document includes plain sections, hours and no template tokens', () => {
  const dir = tmp();
  const out = simplePath(dated(join(dir, 'doc.html')));
  try {
    const { status } = run(['finalize', EXAMPLE, join(dir, 'doc.html'), '--json']);
    assert.equal(status, 0);
    const html = readFileSync(out, 'utf8');
    for (const heading of [
      'De qué se trata',
      'Cómo está hoy vs cómo va a quedar',
      'Los pasos del trabajo',
      'Cuánto demora',
      'Nota aclaratoria',
    ])
      assert.ok(html.includes(heading), `missing ${heading}`);
    assert.ok(html.includes('Eduardo') && html.includes('Martín') && html.includes('Daniel'));
    assert.ok(html.includes('44 h'), 'grand total hours not rendered');
    assert.ok(!html.includes('{{'), 'unreplaced template token');
    assert.ok(!/rel="stylesheet"/.test(html));
    assert.ok(html.includes('@page'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('simple document never leaks technical details', () => {
  const dir = tmp();
  const out = join(dir, 'leak.html');
  try {
    const candidate = exampleCandidate();
    candidate.plan.steps[0].devTasks[0].task = 'Exponer POST /webhooks/mercadopago en la ruta';
    const bad = join(dir, 'leak.json');
    writeFileSync(bad, JSON.stringify(candidate));
    const { status, payload } = run(['finalize', bad, out, '--json']);
    assert.equal(status, 1);
    const leakGate = payload.gates.find((g) => g.name === 'simple-no-tech-leak');
    assert.ok(leakGate, 'leak gate missing');
    assert.equal(leakGate.pass, false);
    assert.ok(leakGate.errors[0].includes('/webhooks/mercadopago'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('plan-roles gate rejects tasks assigned to unknown team roles', () => {
  const dir = tmp();
  const out = join(dir, 'roles.html');
  try {
    const candidate = exampleCandidate();
    candidate.plan.steps[0].devTasks[0].role = 'DevOps';
    const bad = join(dir, 'roles.json');
    writeFileSync(bad, JSON.stringify(candidate));
    const { status, payload } = run(['finalize', bad, out, '--json']);
    assert.equal(status, 1);
    const roleGate = payload.gates.find((g) => g.name === 'plan-roles');
    assert.ok(roleGate, 'plan-roles gate missing');
    assert.equal(roleGate.pass, false);
    assert.ok(roleGate.errors[0].includes('DevOps'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('finalize fails on schema violation', () => {
  const dir = tmp();
  try {
    const bad = join(dir, 'bad.json');
    writeFileSync(bad, JSON.stringify({ meta: { title: 'x' } }));
    const { status, payload } = run(['finalize', bad, join(dir, 'bad.html'), '--json']);
    assert.equal(status, 1);
    assert.equal(payload.ok, false);
    assert.equal(payload.summary.failed > 0, true);
    assert.equal(payload.gates[0].name, 'validate');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('finalize fails on placeholder content', () => {
  const dir = tmp();
  try {
    const candidate = exampleCandidate();
    candidate.context.summary = 'Resumen TODO por completar ___';
    const bad = join(dir, 'placeholder.json');
    writeFileSync(bad, JSON.stringify(candidate));
    const { status, payload } = run(['finalize', bad, join(dir, 'ph.html'), '--json']);
    assert.equal(status, 1);
    const gateNames = payload.gates.map((g) => g.name);
    assert.ok(gateNames.includes('placeholders'));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('finalize rejects unexpected properties', () => {
  const dir = tmp();
  try {
    const candidate = exampleCandidate();
    candidate.bogusSection = 'no debería estar';
    const bad = join(dir, 'extra.json');
    writeFileSync(bad, JSON.stringify(candidate));
    const { status, payload } = run(['finalize', bad, join(dir, 'extra.html'), '--json']);
    assert.equal(status, 1);
    assert.ok(payload.gates[0].errors.some((e) => e.includes('unexpected property')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('failed gates write no output files', () => {
  const dir = tmp();
  const out = join(dir, 'fail.html');
  try {
    const bad = join(dir, 'bad.json');
    writeFileSync(bad, JSON.stringify({ meta: { title: 'x' } }));
    run(['finalize', bad, out, '--json']);
    assert.ok(!existsSync(out), 'technical file written despite failing gates');
    assert.ok(!existsSync(simplePath(out)), 'simple file written despite failing gates');
    assert.ok(!existsSync(dated(out)), 'dated technical file written despite failing gates');
    assert.ok(!existsSync(simplePath(dated(out))), 'dated simple file written despite failing gates');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
