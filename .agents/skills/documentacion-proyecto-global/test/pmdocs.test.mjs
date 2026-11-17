import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = join(HERE, "..");
const CLI = join(SKILL_ROOT, "bin", "pmdocs.mjs");
const EXAMPLE = join(SKILL_ROOT, "examples", "gestor-pedidos.proyecto.json");

function run(args) {
  const res = spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
  let payload = null;
  try {
    payload = JSON.parse(res.stdout);
  } catch {
    payload = null;
  }
  return { status: res.status, payload, stderr: res.stderr };
}
function tmp() {
  return mkdtempSync(join(tmpdir(), "pmdocs-"));
}
function exampleCandidate() {
  return JSON.parse(readFileSync(EXAMPLE, "utf8"));
}
function gateNamed(payload, name) {
  return (payload.gates || []).find((g) => g.name === name);
}

test("doctor reports ready with schema and templates", () => {
  const { status, payload } = run(["doctor"]);
  assert.equal(status, 0);
  assert.equal(payload.ok, true);
  assert.equal(payload.doctor, "ready");
  assert.equal(payload.templates, 29);
  assert.equal(payload.phases, 7);
});

test("guide returns phases, sections and questions", () => {
  const { status, payload } = run(["guide", "arrancar un proyecto nuevo", "--json"]);
  assert.equal(status, 0);
  assert.ok(payload.phases.length >= 6);
  assert.ok(payload.sections.length >= 8);
  assert.ok(payload.askUser.length >= 5);
  assert.match(payload.outputConvention, /README\.md/);
});

test("finalize writes the full set and passes every gate on the example", () => {
  const dir = tmp();
  try {
    const { status, payload } = run(["finalize", EXAMPLE, dir, "--json"]);
    assert.equal(status, 0, JSON.stringify(payload?.gates, null, 2));
    assert.equal(payload.summary.failed, 0);
    assert.equal(payload.summary.total, 12);
    for (const name of [
      "validate",
      "placeholders",
      "minimum-set",
      "smart-check",
      "no-template-tokens",
      "metadata-block",
      "mermaid-required",
      "kebab-case",
      "no-external-links",
      "viewer-self-contained",
      "serve-included",
      "index-complete",
    ])
      assert.ok(gateNamed(payload, name), `falta el gate ${name}`);
    assert.ok(existsSync(join(dir, "README.md")));
    assert.ok(existsSync(join(dir, "index.html")));
    assert.ok(existsSync(join(dir, "serve.mjs")));
    assert.ok(existsSync(join(dir, "docs.cmd")));
    assert.ok(existsSync(join(dir, "00-inicio", "acta-constitucion.md")));
    assert.ok(existsSync(join(dir, "03-tecnico", "adr", "0001-stack-de-una-sola-aplicacion-web.md")));
    assert.ok(payload.outputs.length >= 33);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("index links every generated document", () => {
  const dir = tmp();
  try {
    const { payload } = run(["finalize", EXAMPLE, dir, "--json"]);
    const readme = readFileSync(join(dir, "README.md"), "utf8");
    for (const file of payload.outputs) {
      const rel = file.replace(dir + "\\", "").replace(dir + "/", "").replace(/\\/g, "/");
      if (rel === "README.md") continue;
      if (rel.startsWith("03-tecnico/adr/")) continue; // el indice enlaza la carpeta de ADR
      assert.ok(readme.includes(rel), `el indice no enlaza ${rel}`);
    }
    assert.ok(readme.includes("03-tecnico/adr/"), "el indice no enlaza la carpeta de ADR");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("solo team size keeps the minimum set and omits equipo documents", () => {
  const dir = tmp();
  try {
    const candidate = exampleCandidate();
    candidate.meta.teamSize = "solo";
    const input = join(dir, "solo.json");
    writeFileSync(input, JSON.stringify(candidate));
    const { status, payload } = run(["finalize", input, dir, "--json"]);
    assert.equal(status, 0, JSON.stringify(payload?.gates, null, 2));
    assert.ok(existsSync(join(dir, "00-inicio", "acta-constitucion.md")));
    assert.ok(existsSync(join(dir, "03-tecnico", "arquitectura.md")));
    assert.ok(!existsSync(join(dir, "02-planificacion", "control-cambios.md")), "control de cambios no deberia crearse en solo");
    assert.ok(!existsSync(join(dir, "04-negocio", "gtm-lanzamiento.md")), "gtm no deberia crearse en solo");
    assert.ok(!existsSync(join(dir, "03-tecnico", "adr")), "los ADR no deberian crearse en solo");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("mermaid diagrams are rendered where required", () => {
  const dir = tmp();
  try {
    run(["finalize", EXAMPLE, dir, "--json"]);
    for (const rel of [
      "02-planificacion/cronograma-hitos.md",
      "03-tecnico/modelo-datos.md",
      "03-tecnico/arquitectura.md",
      "02-planificacion/edt-epicas.md",
      "03-tecnico/ux-wireframes.md",
    ]) {
      const text = readFileSync(join(dir, ...rel.split("/")), "utf8");
      assert.ok(text.includes("```mermaid"), `${rel} sin diagrama mermaid`);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("an equipo candidate missing changeControl fails minimum-set", () => {
  const dir = tmp();
  try {
    const candidate = exampleCandidate();
    delete candidate.planificacion.changeControl;
    const input = join(dir, "sin-control.json");
    writeFileSync(input, JSON.stringify(candidate));
    const { status, payload } = run(["finalize", input, dir, "--json"]);
    assert.equal(status, 1);
    const gateMin = gateNamed(payload, "minimum-set");
    assert.equal(gateMin.pass, false);
    assert.ok(gateMin.errors.some((e) => e.includes("control-cambios")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("smart-check rejects objectives with repeated criteria", () => {
  const dir = tmp();
  try {
    const candidate = exampleCandidate();
    const o = candidate.definicion.objectives[0];
    o.specific = o.measurable = o.achievable = o.relevant = o.time = "criterio unico";
    const input = join(dir, "smart.json");
    writeFileSync(input, JSON.stringify(candidate));
    const { status, payload } = run(["finalize", input, dir, "--json"]);
    assert.equal(status, 1);
    assert.equal(gateNamed(payload, "smart-check").pass, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("finalize fails on placeholder content", () => {
  const dir = tmp();
  try {
    const candidate = exampleCandidate();
    candidate.inicio.justification = "Justificacion TODO por completar";
    const input = join(dir, "placeholder.json");
    writeFileSync(input, JSON.stringify(candidate));
    const { status, payload } = run(["finalize", input, dir, "--json"]);
    assert.equal(status, 1);
    assert.ok(gateNamed(payload, "placeholders"));
    assert.equal(gateNamed(payload, "placeholders").pass, false);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("finalize fails on schema violation", () => {
  const dir = tmp();
  try {
    const input = join(dir, "bad.json");
    writeFileSync(input, JSON.stringify({ meta: { projectName: "x" } }));
    const { status, payload } = run(["finalize", input, dir, "--json"]);
    assert.equal(status, 1);
    assert.equal(payload.ok, false);
    assert.equal(payload.gates[0].name, "validate");
    assert.equal(payload.summary.failed > 0, true);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("finalize rejects unexpected properties", () => {
  const dir = tmp();
  try {
    const candidate = exampleCandidate();
    candidate.bogusSection = "no deberia estar";
    const input = join(dir, "extra.json");
    writeFileSync(input, JSON.stringify(candidate));
    const { status, payload } = run(["finalize", input, dir, "--json"]);
    assert.equal(status, 1);
    assert.ok(payload.gates[0].errors.some((e) => e.includes("propiedad inesperada")));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("failed gates write no output files", () => {
  const dir = tmp();
  try {
    const input = join(dir, "bad.json");
    writeFileSync(input, JSON.stringify({ meta: { projectName: "x" } }));
    run(["finalize", input, dir, "--json"]);
    assert.ok(!existsSync(join(dir, "README.md")), "el indice se escribio pese a fallar los gates");
    assert.ok(!existsSync(join(dir, "00-inicio")), "se escribieron carpetas pese a fallar los gates");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("el visor embebe todos los documentos y es autocontenido", () => {
  const dir = tmp();
  try {
    const { payload } = run(["finalize", EXAMPLE, dir, "--json"]);
    const html = readFileSync(join(dir, "index.html"), "utf8");
    const mdCount = payload.outputs.filter((file) => file.endsWith(".md")).length;
    const sections = (html.match(/<section class="doc"/g) || []).length;
    const links = (html.match(/<a href="#doc-/g) || []).length;
    assert.equal(sections, mdCount, "el visor debe embeber todos los documentos");
    assert.equal(links, mdCount, "el sidebar debe enlazar cada documento");
    assert.ok(!/https?:\/\//.test(html), "el visor no debe tener referencias externas");
    assert.ok(!/<link[^>]+stylesheet/i.test(html), "el visor no debe cargar CSS externo");
    assert.ok(!/<script[^>]+src=/i.test(html), "el visor no debe cargar JS externo");
    assert.ok(html.includes("<nav"));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("genera el servidor local y el launcher que lo invoca", () => {
  const dir = tmp();
  try {
    run(["finalize", EXAMPLE, dir, "--json"]);
    const server = readFileSync(join(dir, "serve.mjs"), "utf8");
    const launcher = readFileSync(join(dir, "docs.cmd"), "utf8");
    assert.ok(server.includes("createServer"), "serve.mjs debe traer el servidor");
    assert.ok(launcher.includes("@echo off"), "docs.cmd debe ser un .cmd de Windows");
    assert.ok(launcher.includes("serve.mjs"), "docs.cmd debe invocar serve.mjs");
    assert.ok(launcher.includes("\r\n"), "el .cmd debe usar fin de linea de Windows");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("serve rechaza una carpeta sin visor generado", () => {
  const dir = tmp();
  try {
    const { status, payload } = run(["serve", dir]);
    assert.equal(status, 1);
    assert.match(payload.error, /index\.html/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
