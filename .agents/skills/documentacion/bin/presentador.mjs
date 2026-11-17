#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { basename, dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SKILL_ROOT = resolve(HERE, '..');
const TEMPLATE_PATH = join(SKILL_ROOT, 'assets', 'template.html');
const TEMPLATE_SIMPLE_PATH = join(SKILL_ROOT, 'assets', 'template-simple.html');
const SCHEMA_PATH = join(SKILL_ROOT, 'schemas', 'feature.schema.json');

const PLACEHOLDERS = /(___+|TODO|FIXME|TBD|\bXXX\b|\{\{|\}\})/;
const DEFAULT_BRAND = '#2c3e50';

function fail(message, extra = {}) {
  process.stdout.write(JSON.stringify({ ok: false, error: message, ...extra }, null, 2) + '\n');
  process.exit(1);
}

function ok(payload) {
  process.stdout.write(JSON.stringify({ ok: true, ...payload }, null, 2) + '\n');
}

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtHours(h) {
  const n = Math.round(h * 10) / 10;
  const text = Number.isInteger(n) ? String(n) : String(n).replace('.', ',');
  return `${text} h`;
}

function fmtWeeks(h) {
  const n = Math.round((h / 40) * 10) / 10;
  return Number.isInteger(n) ? String(n) : String(n).replace('.', ',');
}

function loadSchema() {
  if (!existsSync(SCHEMA_PATH)) fail(`schema not found: ${SCHEMA_PATH}`);
  try {
    return JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
  } catch (err) {
    fail(`schema is not valid JSON: ${err.message}`);
  }
}

function loadTemplate(path) {
  if (!existsSync(path)) fail(`template not found: ${path}`);
  return readFileSync(path, 'utf8');
}

function walkStrings(node, path, out) {
  if (typeof node === 'string') out.push({ path, value: node });
  else if (Array.isArray(node)) node.forEach((item, i) => walkStrings(item, `${path}[${i}]`, out));
  else if (node && typeof node === 'object')
    for (const [key, value] of Object.entries(node)) walkStrings(value, `${path}.${key}`, out);
}

function typeOf(value) {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function validateSchema(schema, data, path, errors) {
  if (schema.enum && !schema.enum.includes(data)) {
    errors.push(`${path}: must be one of ${schema.enum.join(', ')} (got ${JSON.stringify(data)})`);
    return;
  }
  if (schema.type) {
    const actual = typeOf(data);
    if (actual !== schema.type) {
      errors.push(`${path}: expected ${schema.type}, got ${actual}`);
      return;
    }
  }
  if (schema.type === 'string') {
    if (schema.minLength !== undefined && data.trim().length < schema.minLength)
      errors.push(`${path}: minLength ${schema.minLength} not met`);
    if (schema.pattern && !new RegExp(schema.pattern).test(data))
      errors.push(`${path}: does not match pattern ${schema.pattern}`);
  }
  if (schema.type === 'number') {
    if (schema.minimum !== undefined && data < schema.minimum)
      errors.push(`${path}: minimum ${schema.minimum} not met (got ${data})`);
  }
  if (schema.type === 'array') {
    if (schema.minItems !== undefined && data.length < schema.minItems)
      errors.push(`${path}: minItems ${schema.minItems} not met (got ${data.length})`);
    if (schema.items) data.forEach((item, i) => validateSchema(schema.items, item, `${path}[${i}]`, errors));
  }
  if (schema.type === 'object') {
    for (const key of schema.required || [])
      if (!(key in data)) errors.push(`${path}.${key}: required property missing`);
    for (const [key, value] of Object.entries(data)) {
      const prop = schema.properties?.[key];
      if (prop) validateSchema(prop, value, `${path}.${key}`, errors);
      else if (schema.additionalProperties === false) errors.push(`${path}.${key}: unexpected property`);
    }
  }
}

function gate(name, errors) {
  return { name, pass: errors.length === 0, errors };
}

function stepTotals(step) {
  const dev = step.devTasks.reduce((sum, t) => sum + t.hours, 0);
  const qa = step.qaTasks.reduce((sum, t) => sum + t.hours, 0);
  return { dev, qa, total: dev + qa };
}

function roleTotals(candidate) {
  const members = candidate.plan.team.map((m) => ({ ...m, hours: 0 }));
  const isQa = (role) => /^(qa|calidad|control)/i.test(role);
  for (const step of candidate.plan.steps) {
    for (const task of step.devTasks) {
      const member = members.find((m) => m.role === task.role);
      if (member) member.hours += task.hours;
    }
    const qaHours = step.qaTasks.reduce((sum, t) => sum + t.hours, 0);
    const qaMember = members.find((m) => isQa(m.role));
    if (qaMember) qaMember.hours += qaHours;
  }
  return members;
}

function grandTotal(candidate) {
  return candidate.plan.steps.reduce((sum, step) => sum + stepTotals(step).total, 0);
}

function contentGates(candidate) {
  const strings = [];
  walkStrings(candidate, '$', strings);
  const placeholders = strings
    .filter((s) => PLACEHOLDERS.test(s.value))
    .map((s) => `${s.path}: "${s.value}"`);
  const empties = strings
    .filter((s) => s.value.trim().length === 0)
    .map((s) => `${s.path}: empty string`);
  const storyErrors = [];
  candidate.stories.forEach((story, i) => {
    if (!/^\S+/.test(story.id)) storyErrors.push(`$.stories[${i}].id: blank id`);
  });
  const teamRoles = candidate.plan.team.map((m) => m.role);
  const roleErrors = [];
  candidate.plan.steps.forEach((step, i) => {
    step.devTasks.forEach((task, j) => {
      if (!teamRoles.includes(task.role))
        roleErrors.push(
          `$.plan.steps[${i}].devTasks[${j}].role: "${task.role}" is not in plan.team roles (${teamRoles.join(', ')})`
        );
    });
  });
  return [
    gate('placeholders', [...placeholders, ...empties]),
    gate('stories-shape', storyErrors),
    gate('plan-roles', roleErrors),
  ];
}

function techLeakStrings(candidate) {
  const ti = candidate.techImpact;
  if (!ti) return [];
  const leaks = [];
  for (const e of ti.endpoints || []) leaks.push(e.path);
  leaks.push(...(ti.files || []));
  for (const t of ti.tables || []) if (t.includes('_')) leaks.push(t);
  return leaks;
}

function deliverGatesTech(html, candidate) {
  const external = [];
  if (/rel=["']stylesheet["']/.test(html)) external.push('external <link rel="stylesheet">');
  const cssUrl = html.match(/url\(\s*['"]?https?:\/\/[^)]+\)/g) || [];
  external.push(...cssUrl);
  const cdn = html.match(/<script[^>]+src=["']https?:/g) || [];
  external.push(...cdn);

  const requiredHeadings = [
    'Contexto y objetivo',
    'Alcance',
    'Qué queda fuera',
    'Definiciones pendientes',
    'Flujo paso a paso',
    'Historias de usuario',
    'Plan de implementación',
  ];
  if (candidate.techImpact) requiredHeadings.push('Impacto técnico');
  const missingHeadings = requiredHeadings.filter((h) => !html.includes(h));

  const structural = [];
  if (!html.includes('@page')) structural.push('missing @page print rule');
  if (!html.includes('id="themeToggle"')) structural.push('missing theme toggle');
  if (!html.includes(esc(candidate.meta.title))) structural.push('cover title not rendered');
  if (!html.includes('lang="es"')) structural.push('missing lang attribute');
  const total = fmtHours(grandTotal(candidate));
  if (!html.includes(total)) structural.push(`grand total ${total} not rendered`);

  return [
    gate('tech-self-contained', external),
    gate('tech-headings', missingHeadings.map((h) => `missing heading: ${h}`)),
    gate('tech-structure', structural),
  ];
}

function deliverGatesSimple(html, candidate) {
  const external = [];
  if (/rel=["']stylesheet["']/.test(html)) external.push('external <link rel="stylesheet">');
  const cssUrl = html.match(/url\(\s*['"]?https?:\/\/[^)]+\)/g) || [];
  external.push(...cssUrl);
  const cdn = html.match(/<script[^>]+src=["']https?:/g) || [];
  external.push(...cdn);

  const requiredHeadings = [
    'De qué se trata',
    'Cómo está hoy vs cómo va a quedar',
    'Los pasos del trabajo',
    'Cuánto demora',
    'Nota aclaratoria',
  ];
  const missingHeadings = requiredHeadings.filter((h) => !html.includes(h));

  const structural = [];
  if (!html.includes('@page')) structural.push('missing @page print rule');
  if (!html.includes('id="themeToggle"')) structural.push('missing theme toggle');
  if (!html.includes(esc(candidate.meta.title))) structural.push('cover title not rendered');
  if (!html.includes('lang="es"')) structural.push('missing lang attribute');
  const total = fmtHours(grandTotal(candidate));
  if (!html.includes(total)) structural.push(`grand total ${total} not rendered`);

  const leaks = techLeakStrings(candidate).filter((s) => html.includes(s));

  return [
    gate('simple-self-contained', external),
    gate('simple-headings', missingHeadings.map((h) => `missing heading: ${h}`)),
    gate('simple-structure', structural),
    gate('simple-no-tech-leak', leaks.map((s) => `technical detail leaked into simple doc: ${s}`)),
  ];
}

function renderTech(candidate, template) {
  const m = candidate.meta;
  const brand = m.brandColor || DEFAULT_BRAND;
  const t = (v) => esc(v);
  const li = (items, cls) => `<ul class="${cls}">${items.map((i) => `<li>${t(i)}</li>`).join('\n')}</ul>`;

  const sections = [];
  const tocEntries = [];
  const addSection = (id, title, body) => {
    tocEntries.push(`<li><a href="#${id}">${t(title)}</a></li>`);
    sections.push(
      `<section class="card" id="${id}">\n<h2>${t(title)}</h2>\n${body}\n</section>`
    );
  };

  addSection(
    'contexto',
    'Contexto y objetivo',
    `<p>${t(candidate.context.summary)}</p>\n<p class="objective"><b>Objetivo:</b> ${t(candidate.context.objective)}</p>`
  );

  addSection(
    'alcance',
    'Alcance',
    `<div class="cols">
<div>
<p class="subhead">Qué entra</p>
${li(candidate.scope.in, 'list-in')}
</div>
<div>
<p class="subhead">Qué queda fuera</p>
${li(candidate.scope.out, 'list-out')}
</div>
</div>
<p class="subhead" style="margin-top:20px">Definiciones pendientes</p>
${li(candidate.scope.pending, 'list-pending')}`
  );

  const steps = candidate.flow.steps
    .map((s) => `<li><b>${t(s.title)}</b>${t(s.detail)}</li>`)
    .join('\n');
  addSection('flujo', 'Flujo paso a paso', `<ol class="flow">\n${steps}\n</ol>`);

  const stories = candidate.stories
    .map(
      (s) =>
        `<div class="story">
<span class="sid">${t(s.id)}</span>
<p>Como <b>${t(s.as)}</b>, quiero ${t(s.want)},</p>
<p><em>para</em> ${t(s.so)}.</p>
</div>`
    )
    .join('\n');
  addSection('historias', 'Historias de usuario', stories);

  addSection('plan', 'Plan de implementación', renderPlanTech(candidate));

  if (candidate.techImpact) {
    const ti = candidate.techImpact;
    const parts = [];
    if (ti.services)
      parts.push(
        `<p class="subhead">Servicios</p>\n<div class="chips">${ti.services
          .map((s) => `<span class="chip">${t(s)}</span>`)
          .join('')}</div>`
      );
    if (ti.endpoints)
      parts.push(
        `<p class="subhead">Endpoints</p>
<table class="data">
<thead><tr><th>Método</th><th>Ruta</th></tr></thead>
<tbody>${ti.endpoints
          .map((e) => `<tr><td><code class="method">${t(e.method)}</code></td><td>${t(e.path)}</td></tr>`)
          .join('')}</tbody>
</table>`
      );
    if (ti.tables)
      parts.push(
        `<p class="subhead">Tablas</p>\n<div class="chips">${ti.tables
          .map((s) => `<span class="chip">${t(s)}</span>`)
          .join('')}</div>`
      );
    if (ti.files)
      parts.push(
        `<p class="subhead">Archivos</p>\n<div class="chips">${ti.files
          .map((s) => `<span class="chip">${t(s)}</span>`)
          .join('')}</div>`
      );
    addSection('impacto', 'Impacto técnico', parts.join('\n'));
  }

  if (candidate.notes)
    addSection('notas', 'Notas', `<ul class="notes">${candidate.notes.map((n) => `<li>${t(n)}</li>`).join('')}</ul>`);

  const authorBadge = m.author ? `<span class="badge"><b>Autor:</b> ${t(m.author)}</span>` : '';
  const toc = `<nav class="toc" aria-label="Índice">
<h2>Índice</h2>
<ol>
${tocEntries.join('\n')}
</ol>
</nav>`;

  return template
    .replaceAll('{{BRAND}}', brand)
    .replaceAll('{{TITLE}}', t(m.title))
    .replaceAll('{{SERVICE}}', t(m.service))
    .replaceAll('{{ROLE}}', t(m.role))
    .replaceAll('{{STATUS}}', t(m.status))
    .replaceAll('{{VERSION}}', t(m.version))
    .replaceAll('{{DATE}}', t(m.date))
    .replaceAll('{{AUTHOR_BADGE}}', authorBadge)
    .replaceAll('{{TOC}}', toc)
    .replaceAll('{{SECTIONS}}', sections.join('\n'));
}

function renderPlanTech(candidate) {
  const t = (v) => esc(v);
  const parts = [];
  parts.push(
    `<p class="subhead">Equipo</p>\n<div class="chips">${candidate.plan.team
      .map((m) => `<span class="chip"><b>${t(m.role)}:</b> ${t(m.name)}</span>`)
      .join('')}</div>`
  );
  candidate.plan.steps.forEach((step, i) => {
    const totals = stepTotals(step);
    const devRows = step.devTasks
      .map(
        (task) =>
          `<tr><td>${t(task.task)}${task.flag ? ` <span class="chip">${t(task.flag)}</span>` : ''}</td><td>${t(
            task.role
          )}</td><td class="num">${fmtHours(task.hours)}</td></tr>`
      )
      .join('');
    const qaRows = step.qaTasks
      .map(
        (task) =>
          `<tr><td>${t(task.task)}${task.flag ? ` <span class="chip">${t(task.flag)}</span>` : ''}</td><td>QA</td><td class="num">${fmtHours(
            task.hours
          )}</td></tr>`
      )
      .join('');
    parts.push(
      `<p class="subhead">Paso ${i + 1} — ${t(step.title)} <em>(${t(step.timeEstimate)} · ${fmtHours(
        totals.total
      )})</em></p>
<table class="data">
<thead><tr><th>Tarea</th><th>Equipo</th><th class="num">Horas</th></tr></thead>
<tbody>${devRows}${qaRows}</tbody>
</table>`
    );
  });
  const roleRows = roleTotals(candidate)
    .map((m) => `<tr><td>${t(m.role)}</td><td>${t(m.name)}</td><td class="num">${fmtHours(m.hours)}</td></tr>`)
    .join('');
  parts.push(
    `<p class="subhead">Totales por rol</p>
<table class="data">
<thead><tr><th>Rol</th><th>Responsable</th><th class="num">Horas</th></tr></thead>
<tbody>${roleRows}<tr><td><b>TOTAL</b></td><td></td><td class="num"><b>${fmtHours(grandTotal(candidate))}</b></td></tr></tbody>
</table>
<p><b>Calendario estimado:</b> ${t(candidate.plan.calendar)}${
      candidate.plan.calendarNote ? ` — ${t(candidate.plan.calendarNote)}` : ''
    }.</p>`
  );
  return parts.join('\n');
}

function renderSimple(candidate, template) {
  const m = candidate.meta;
  const brand = m.brandColor || DEFAULT_BRAND;
  const t = (v) => esc(v);

  const sections = [];
  const addSection = (id, title, body) => {
    sections.push(`<h2 class="section" id="${id}">${t(title)}</h2>\n${body}`);
  };

  addSection('tratamos', 'De qué se trata', `<p class="lead">${t(candidate.context.plain)}</p>`);

  const comparisonRows = candidate.comparison
    .map((c) => `<tr><td>${t(c.now)}</td><td>${t(c.next)}</td></tr>`)
    .join('\n');
  addSection(
    'cambio',
    'Cómo está hoy vs cómo va a quedar',
    `<table>
<thead><tr><th>Situación actual</th><th>Situación nueva</th></tr></thead>
<tbody>
${comparisonRows}
</tbody>
</table>`
  );

  const stepBoxes = candidate.plan.steps.map((step, i) => renderSimpleStep(step, i)).join('\n');
  addSection('pasos', 'Los pasos del trabajo', stepBoxes);

  const byStepRows = candidate.plan.steps
    .map((step, i) => `<tr><td>Paso ${i + 1} — ${t(step.title)}</td><td class="hours">${fmtHours(stepTotals(step).total)}</td></tr>`)
    .join('\n');
  const byRoleRows = roleTotals(candidate)
    .map((m2) => `<tr><td>${t(m2.role)}</td><td>${t(m2.name)}</td><td class="hours">${fmtHours(m2.hours)}</td><td class="hours">${fmtWeeks(m2.hours)}</td></tr>`)
    .join('\n');
  const total = fmtHours(grandTotal(candidate));
  addSection(
    'tiempo',
    'Cuánto demora',
    `<p>Estimación en horas de trabajo de cada equipo. Desarrollo y pruebas pueden avanzar <b>en paralelo</b>, así que el calendario real es menor que la suma de horas.</p>
<table>
<thead><tr><th>Paso</th><th class="hours">Horas</th></tr></thead>
<tbody>
${byStepRows}
<tr class="total"><td>TOTAL</td><td class="hours">${total}</td></tr>
</tbody>
</table>
<table>
<thead><tr><th>Rol</th><th>Responsable</th><th class="hours">Horas</th><th class="hours">Semanas (40 h)</th></tr></thead>
<tbody>
${byRoleRows}
<tr class="total"><td>TOTAL</td><td></td><td class="hours">${total}</td><td class="hours">—</td></tr>
</tbody>
</table>
<div class="bigbox">
<p style="margin:0;color:var(--ink-soft)">Estimación total del módulo</p>
<p class="bignum">${total}</p>
<p style="margin:0"><b>En calendario: ${t(candidate.plan.calendar)}</b>${
    candidate.plan.calendarNote ? ` — ${t(candidate.plan.calendarNote)}` : ''
  }.</p>
</div>`
  );

  const pendingItems = candidate.clarification.pending.map((p) => `<li>${t(p)}</li>`).join('\n');
  const outBoxes = candidate.clarification.outOfScope
    .map(
      (g) => `<div class="nowbox">
<h3>${t(g.title)}</h3>
<ul>
${g.items.map((item) => `<li>${t(item)}</li>`).join('\n')}
</ul>
${g.detail ? `<p>${t(g.detail)}</p>` : ''}
</div>`
    )
    .join('\n');
  addSection(
    'nota',
    'Nota aclaratoria — qué no incluye este plan',
    `<div class="nowbox">
<h3>Pendiente (no estimado)</h3>
<ul>
${pendingItems}
</ul>
</div>
${outBoxes}`
  );

  const teamLine = candidate.plan.team.map((m2) => `${t(m2.name)} (${t(m2.role)})`).join(' · ');

  return template
    .replaceAll('{{BRAND}}', brand)
    .replaceAll('{{TITLE}}', t(m.title))
    .replaceAll('{{SUBTITLE}}', m.subtitle ? t(m.subtitle) : 'Qué se va a hacer y cuánto demora')
    .replaceAll('{{TEAM_LINE}}', teamLine)
    .replaceAll('{{DATE}}', t(m.date))
    .replaceAll('{{SECTIONS}}', sections.join('\n'));
}

function renderSimpleStep(step, index) {
  const t = (v) => esc(v);
  const totals = stepTotals(step);
  const devRoles = [...new Set(step.devTasks.map((task) => task.role))];
  const devByRole = devRoles
    .map((role) => {
      const hours = step.devTasks.filter((task) => task.role === role).reduce((sum, task) => sum + task.hours, 0);
      return `${role} ${fmtHours(hours)}`;
    })
    .join(' · ');
  const devRows = step.devTasks
    .map(
      (task) =>
        `<tr><td>${t(task.task)}${task.flag ? ` <span class="pend">${t(task.flag)}</span>` : ''}</td><td>${t(
          task.role
        )}</td><td class="hours">${fmtHours(task.hours)}</td></tr>`
    )
    .join('\n');
  const qaRows = step.qaTasks
    .map(
      (task) =>
        `<tr><td>${t(task.task)}${task.flag ? ` <span class="pend">${t(task.flag)}</span>` : ''}</td><td class="hours">${fmtHours(
          task.hours
        )}</td></tr>`
    )
    .join('\n');
  return `<div class="stepbox">
<div class="top">
<span class="num">${index + 1}</span>
<h3>${t(step.title)}</h3>
<span class="time">${t(step.timeEstimate)} · ${fmtHours(totals.total)}</span>
</div>
${step.intro ? `<p>${t(step.intro)}</p>` : ''}
<p class="tblabel">Desarrollo — ${t(devRoles.join(' y '))}</p>
<table>
<thead><tr><th>Tarea</th><th>Equipo</th><th class="hours">Horas</th></tr></thead>
<tbody>
${devRows}
<tr class="subtotal"><td>Subtotal desarrollo</td><td>${t(devByRole)}</td><td class="hours">${fmtHours(totals.dev)}</td></tr>
</tbody>
</table>
<p class="tblabel">Pruebas — QA</p>
<table>
<thead><tr><th>Tarea</th><th class="hours">Horas</th></tr></thead>
<tbody>
${qaRows}
<tr class="subtotal"><td>Subtotal pruebas</td><td class="hours">${fmtHours(totals.qa)}</td></tr>
</tbody>
</table>
<p class="who">Total paso ${index + 1}: ${fmtHours(totals.total)} (desarrollo ${fmtHours(totals.dev)} + pruebas ${fmtHours(
    totals.qa
  )})</p>
</div>`;
}

function cmdDoctor() {
  const problems = [];
  if (!existsSync(TEMPLATE_PATH)) problems.push(`template missing: ${TEMPLATE_PATH}`);
  if (!existsSync(TEMPLATE_SIMPLE_PATH)) problems.push(`template missing: ${TEMPLATE_SIMPLE_PATH}`);
  if (!existsSync(SCHEMA_PATH)) problems.push(`schema missing: ${SCHEMA_PATH}`);
  if (existsSync(SCHEMA_PATH)) {
    try {
      JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
    } catch (err) {
      problems.push(`schema invalid JSON: ${err.message}`);
    }
  }
  if (existsSync(TEMPLATE_PATH)) {
    const tpl = readFileSync(TEMPLATE_PATH, 'utf8');
    for (const token of ['{{TITLE}}', '{{TOC}}', '{{SECTIONS}}', '{{BRAND}}', 'id="themeToggle"', '@page'])
      if (!tpl.includes(token)) problems.push(`template missing token/marker: ${token}`);
  }
  if (existsSync(TEMPLATE_SIMPLE_PATH)) {
    const tpl = readFileSync(TEMPLATE_SIMPLE_PATH, 'utf8');
    for (const token of ['{{TITLE}}', '{{SUBTITLE}}', '{{TEAM_LINE}}', '{{SECTIONS}}', '{{BRAND}}', 'id="themeToggle"', '@page'])
      if (!tpl.includes(token)) problems.push(`simple template missing token/marker: ${token}`);
  }
  if (problems.length) fail('doctor failed', { problems });
  ok({
    doctor: 'ready',
    node: process.version,
    outputs: ['YYYYMMDD-<slug>.html (técnico)', 'YYYYMMDD-<slug>-simple.html (simple)'],
    templates: [TEMPLATE_PATH, TEMPLATE_SIMPLE_PATH],
    schema: SCHEMA_PATH,
  });
}

function cmdGuide(args) {
  const scenario = args.filter((a) => !a.startsWith('--')).join(' ') || '';
  ok({
    scenario,
    outputConvention:
      'TWO documents at the project root, both auto-prefixed with meta.date as YYYYMMDD: <raiz>/YYYYMMDD-<slug>.html (technical) and <raiz>/YYYYMMDD-<slug>-simple.html (plain language). The CLI adds the prefix (an already-prefixed name is not doubled). Candidate next to them as <slug>.feature.json (sin prefijo)',
    sections: [
      'meta: title, subtitle (opcional, va al documento simple), service, role, status (Propuesta | En implementación | Completada), version, date (YYYY-MM-DD), author, brandColor (opcional, hex #rrggbb)',
      'context: summary (técnico), objective, plain (lenguaje simple, va al documento simple)',
      'scope: in (qué entra), out (qué queda fuera), pending (definiciones pendientes)',
      'flow: steps[] con title + detail (documento técnico)',
      'stories: id, as, want, so (documento técnico)',
      'techImpact (opcional): services, endpoints[], tables, files — SOLO va al documento técnico; el gate simple-no-tech-leak falla si algo de esto se filtra al simple',
      'comparison: [{now, next}] tabla "cómo está hoy vs cómo va a quedar" (documento simple)',
      'plan: team[{role,name}], steps[{title, timeEstimate, intro?, devTasks[{task,role,hours,flag?}], qaTasks[{task,hours,flag?}]}], calendar, calendarNote? — horas numéricas; los totales se calculan solos',
      'clarification: pending[] (qué queda pendiente y no está estimado), outOfScope[{title, items[], detail?}] (qué módulos/quedan fuera)',
      'notes (opcional, documento técnico)',
    ],
    askUser: [
      '¿Cómo se llama la feature exactamente?',
      '¿En qué servicio se implementa y a qué rol va dirigido?',
      '¿Cuál es el objetivo de negocio en una frase (y su versión en lenguaje simple)?',
      '¿Qué queda explícitamente fuera de alcance y qué definiciones siguen pendientes?',
      '¿Cómo está hoy vs cómo va a quedar? (pares now/next)',
      '¿Quiénes son el equipo (rol y nombre)?',
      '¿Cuáles son los pasos del trabajo, con sus tareas y horas por equipo (desarrollo con rol, pruebas aparte)?',
      '¿Alguna tarea queda pendiente o se construye con datos de prueba?',
      '¿Qué calendario estimado se communiquea?',
      '¿Qué queda pendiente/no estimado y qué módulos quedan fuera del alcance?',
    ],
  });
}

function simpleOutputPath(technicalPath) {
  return technicalPath.replace(/\.html$/i, '') + '-simple.html';
}

function datedOutputPath(outputPath, metaDate) {
  const stamp = String(metaDate).replace(/-/g, '');
  const dir = dirname(outputPath);
  const base = basename(outputPath).replace(/^\d{8}-/, '');
  return join(dir, `${stamp}-${base}`);
}

function cmdFinalize(args) {
  const positional = args.filter((a) => !a.startsWith('--'));
  const [candidatePath, outputPath] = positional;
  if (!candidatePath || !outputPath)
    fail('usage: finalize <candidate.json> <output.html> [--json] — el nombre de salida recibe prefijo automático YYYYMMDD- (de meta.date)');

  const schema = loadSchema();
  const templateTech = loadTemplate(TEMPLATE_PATH);
  const templateSimple = loadTemplate(TEMPLATE_SIMPLE_PATH);

  let candidate;
  try {
    candidate = JSON.parse(readFileSync(resolve(candidatePath), 'utf8'));
  } catch (err) {
    fail(`candidate unreadable or invalid JSON: ${err.message}`);
  }

  const schemaErrors = [];
  validateSchema(schema, candidate, '$', schemaErrors);
  const gates = [gate('validate', schemaErrors)];
  if (schemaErrors.length === 0) gates.push(...contentGates(candidate));

  let htmlTech = null;
  let htmlSimple = null;
  if (gates.every((g) => g.pass)) {
    htmlTech = renderTech(candidate, templateTech);
    gates.push(...deliverGatesTech(htmlTech, candidate));
    htmlSimple = renderSimple(candidate, templateSimple);
    gates.push(...deliverGatesSimple(htmlSimple, candidate));
  }

  const allPass = gates.every((g) => g.pass);
  let outputs = null;
  if (allPass) {
    const technicalPath = datedOutputPath(resolve(outputPath), candidate.meta.date);
    const simplePath = simpleOutputPath(technicalPath);
    writeFileSync(technicalPath, htmlTech, 'utf8');
    writeFileSync(simplePath, htmlSimple, 'utf8');
    outputs = { technical: technicalPath, simple: simplePath };
  }
  const payload = {
    ok: allPass,
    command: 'finalize',
    candidate: resolve(candidatePath),
    outputs,
    gates,
    summary: {
      total: gates.length,
      passed: gates.filter((g) => g.pass).length,
      failed: gates.filter((g) => !g.pass).length,
    },
  };
  process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
  if (!allPass) process.exit(1);
}

const [, , command, ...rest] = process.argv;
if (command === 'doctor') cmdDoctor();
else if (command === 'guide') cmdGuide(rest);
else if (command === 'finalize') cmdFinalize(rest);
else {
  fail(`unknown command "${command ?? ''}". Use: doctor | guide "<scenario>" | finalize <candidate.json> <output.html>`);
}
