const http    = require("http");
const fs      = require("fs");
const path    = require("path");
const cron    = require("node-cron");
const Anthropic = require("@anthropic-ai/sdk");

const TASKS_FILE = path.join(__dirname, "tasks.json");
const LOG_FILE   = path.join(__dirname, "tasks.log");
const PORT       = 4000;

// ── Storage ──────────────────────────────────────────────────────────────────

function readTasks() {
  try { return JSON.parse(fs.readFileSync(TASKS_FILE, "utf8")); }
  catch { return []; }
}

function writeTasks(tasks) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2));
}

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.log(line.trim());
}

// ── Autonomous worker ─────────────────────────────────────────────────────────

async function workOnTasks() {
  const tasks = readTasks().filter(t => t.status === "pending");
  if (tasks.length === 0) { log("Cron: nenhuma tarefa pendente."); return; }

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  tasks.sort((a, b) => (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1));
  const task = tasks[0];

  log(`Cron: a trabalhar na tarefa [${task.priority.toUpperCase()}] "${task.title}"`);

  try {
    const client = new Anthropic.default({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [{
        role: "user",
        content: `És o assistente de desenvolvimento do projecto Dineo — uma SaaS de gestão de restaurantes em Cabo Verde.

Tarefa: ${task.title}
Descrição: ${task.description || "(sem descrição adicional)"}
Prioridade: ${task.priority}

Analisa esta tarefa e descreve de forma concisa o que foi feito ou o plano de acção para a completar. Responde em português.`
      }]
    });

    const result = response.content[0].text;
    log(`Cron: resultado — ${result.substring(0, 300)}...`);

    const all = readTasks();
    const idx = all.findIndex(t => t.id === task.id);
    if (idx !== -1) {
      all[idx].status      = "done";
      all[idx].completedAt = new Date().toISOString();
      all[idx].result      = result;
      writeTasks(all);
    }
    log(`Cron: tarefa "${task.title}" marcada como concluída.`);

  } catch (err) {
    log(`Cron: erro ao processar tarefa — ${err.message}`);
  }
}

// ── Cron — de hora em hora ────────────────────────────────────────────────────

cron.schedule("0 * * * *", () => {
  log("Cron: a verificar tarefas...");
  workOnTasks();
});

log("Cron configurado: executa de hora em hora.");

// ── HTTP API + UI ─────────────────────────────────────────────────────────────

function sendJSON(res, data, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(data));
}

const server = http.createServer((req, res) => {
  const url    = new URL(req.url, `http://localhost:${PORT}`);
  const method = req.method;

  // CORS preflight
  if (method === "OPTIONS") {
    res.writeHead(204, { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE", "Access-Control-Allow-Headers": "Content-Type" });
    return res.end();
  }

  // GET /tasks
  if (method === "GET" && url.pathname === "/tasks") {
    return sendJSON(res, readTasks());
  }

  // POST /tasks
  if (method === "POST" && url.pathname === "/tasks") {
    let body = "";
    req.on("data", d => body += d);
    req.on("end", () => {
      const { title, description, priority } = JSON.parse(body);
      if (!title) return sendJSON(res, { error: "title obrigatório" }, 400);
      const tasks = readTasks();
      const task = { id: Date.now().toString(), title, description: description || "", priority: priority || "medium", status: "pending", createdAt: new Date().toISOString() };
      tasks.push(task);
      writeTasks(tasks);
      log(`Nova tarefa criada: [${task.priority.toUpperCase()}] "${task.title}"`);
      sendJSON(res, task, 201);
    });
    return;
  }

  // PUT /tasks/:id
  if (method === "PUT" && url.pathname.startsWith("/tasks/")) {
    const id = url.pathname.split("/")[2];
    let body = "";
    req.on("data", d => body += d);
    req.on("end", () => {
      const updates = JSON.parse(body);
      const tasks = readTasks();
      const idx = tasks.findIndex(t => t.id === id);
      if (idx === -1) return sendJSON(res, { error: "não encontrada" }, 404);
      tasks[idx] = { ...tasks[idx], ...updates };
      writeTasks(tasks);
      log(`Tarefa actualizada: "${tasks[idx].title}"`);
      sendJSON(res, tasks[idx]);
    });
    return;
  }

  // DELETE /tasks/:id
  if (method === "DELETE" && url.pathname.startsWith("/tasks/")) {
    const id = url.pathname.split("/")[2];
    const tasks = readTasks();
    const idx = tasks.findIndex(t => t.id === id);
    if (idx === -1) return sendJSON(res, { error: "não encontrada" }, 404);
    const [removed] = tasks.splice(idx, 1);
    writeTasks(tasks);
    log(`Tarefa removida: "${removed.title}"`);
    return sendJSON(res, { ok: true });
  }

  // POST /tasks/:id/run — forçar execução imediata
  if (method === "POST" && url.pathname.endsWith("/run")) {
    log("Execução manual forçada...");
    workOnTasks().catch(err => log(`Erro: ${err.message}`));
    return sendJSON(res, { ok: true, message: "A processar tarefa..." });
  }

  // GET /log
  if (method === "GET" && url.pathname === "/log") {
    try {
      const content = fs.readFileSync(LOG_FILE, "utf8");
      res.writeHead(200, { "Content-Type": "text/plain" });
      return res.end(content);
    } catch {
      return sendJSON(res, { log: "" });
    }
  }

  // GET / — UI
  if (method === "GET" && url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(UI_HTML);
  }

  sendJSON(res, { error: "not found" }, 404);
});

server.listen(PORT, () => log(`Dashboard disponível em http://localhost:${PORT}`));

// ── UI HTML ───────────────────────────────────────────────────────────────────

const UI_HTML = `<!DOCTYPE html>
<html lang="pt">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Dineo — Task Manager</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a;min-height:100vh}
  header{background:#0f172a;color:#fff;padding:20px 32px;display:flex;align-items:center;gap:12px}
  header h1{font-size:18px;font-weight:900;letter-spacing:-.5px}
  header span{font-size:13px;color:#94a3b8}
  .container{max-width:900px;margin:0 auto;padding:32px 16px}
  .card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:24px;margin-bottom:24px}
  h2{font-size:15px;font-weight:700;margin-bottom:16px;color:#334155}
  .form-row{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px}
  input,textarea,select{width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;color:#0f172a;background:#f8fafc;outline:none}
  input:focus,textarea:focus,select:focus{border-color:#16a34a;background:#fff}
  textarea{resize:vertical;min-height:72px}
  .btn{padding:10px 20px;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;transition:.15s}
  .btn-green{background:#16a34a;color:#fff}.btn-green:hover{background:#15803d}
  .btn-red{background:#ef4444;color:#fff}.btn-red:hover{background:#dc2626}
  .btn-blue{background:#3b82f6;color:#fff}.btn-blue:hover{background:#2563eb}
  .btn-ghost{background:#f1f5f9;color:#334155}.btn-ghost:hover{background:#e2e8f0}
  .btn-sm{padding:6px 12px;font-size:12px}
  .task-list{display:flex;flex-direction:column;gap:10px}
  .task{border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;display:flex;align-items:flex-start;gap:12px;transition:.15s}
  .task:hover{border-color:#cbd5e1}
  .task.done{opacity:.5}
  .task-body{flex:1}
  .task-title{font-weight:700;font-size:14px;margin-bottom:4px}
  .task-desc{font-size:13px;color:#64748b;margin-bottom:8px}
  .task-result{font-size:12px;color:#166534;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:8px;margin-top:8px;white-space:pre-wrap;line-height:1.5}
  .badge{display:inline-block;padding:3px 8px;border-radius:20px;font-size:11px;font-weight:700;margin-right:6px}
  .badge-high{background:#fef2f2;color:#dc2626}
  .badge-medium{background:#fffbeb;color:#b45309}
  .badge-low{background:#f0fdf4;color:#16a34a}
  .badge-done{background:#f1f5f9;color:#64748b}
  .badge-pending{background:#eff6ff;color:#1d4ed8}
  .actions{display:flex;gap:6px;flex-shrink:0}
  .log-box{background:#0f172a;color:#86efac;font-family:monospace;font-size:12px;padding:16px;border-radius:10px;max-height:240px;overflow-y:auto;white-space:pre-wrap;line-height:1.6}
  .toolbar{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}
  .filter-btn{padding:6px 14px;border-radius:20px;border:1px solid #e2e8f0;background:#fff;font-size:13px;cursor:pointer;transition:.15s}
  .filter-btn.active,.filter-btn:hover{background:#0f172a;color:#fff;border-color:#0f172a}
  .empty{text-align:center;color:#94a3b8;padding:32px;font-size:14px}
  .run-btn{margin-left:auto}
</style>
</head>
<body>
<header>
  <div>
    <h1>Dineo — Task Manager</h1>
    <span>Tarefas prioritárias do projecto</span>
  </div>
</header>
<div class="container">

  <!-- Formulário -->
  <div class="card">
    <h2>Nova Tarefa</h2>
    <div class="form-row">
      <input id="title" placeholder="Título da tarefa" />
      <select id="priority">
        <option value="high">🔴 Alta prioridade</option>
        <option value="medium" selected>🟡 Média prioridade</option>
        <option value="low">🟢 Baixa prioridade</option>
      </select>
    </div>
    <textarea id="description" placeholder="Descrição (opcional)"></textarea>
    <div style="margin-top:12px;display:flex;gap:8px">
      <button class="btn btn-green" onclick="createTask()">Adicionar tarefa</button>
    </div>
  </div>

  <!-- Lista -->
  <div class="card">
    <div style="display:flex;align-items:center;margin-bottom:16px">
      <h2 style="margin:0">Tarefas</h2>
      <button class="btn btn-blue btn-sm run-btn" onclick="runNow()">▶ Executar agora</button>
    </div>
    <div class="toolbar">
      <button class="filter-btn active" onclick="setFilter('all',this)">Todas</button>
      <button class="filter-btn" onclick="setFilter('pending',this)">Pendentes</button>
      <button class="filter-btn" onclick="setFilter('done',this)">Concluídas</button>
      <button class="filter-btn" onclick="setFilter('high',this)">🔴 Alta</button>
      <button class="filter-btn" onclick="setFilter('medium',this)">🟡 Média</button>
      <button class="filter-btn" onclick="setFilter('low',this)">🟢 Baixa</button>
    </div>
    <div class="task-list" id="taskList"></div>
  </div>

  <!-- Log -->
  <div class="card">
    <div style="display:flex;align-items:center;margin-bottom:12px">
      <h2 style="margin:0">Activity Log</h2>
      <button class="btn btn-ghost btn-sm" style="margin-left:auto" onclick="loadLog()">↻ Actualizar</button>
    </div>
    <div class="log-box" id="logBox">A carregar...</div>
  </div>

</div>

<script>
let allTasks = [];
let currentFilter = 'all';

async function load() {
  const res = await fetch('/tasks');
  allTasks = await res.json();
  render();
}

function setFilter(f, btn) {
  currentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  render();
}

function render() {
  const list = document.getElementById('taskList');
  let tasks = [...allTasks];

  const priorityOrder = { high: 0, medium: 1, low: 2 };
  tasks.sort((a,b) => {
    if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
    return (priorityOrder[a.priority]??1) - (priorityOrder[b.priority]??1);
  });

  if (currentFilter === 'pending') tasks = tasks.filter(t => t.status === 'pending');
  else if (currentFilter === 'done') tasks = tasks.filter(t => t.status === 'done');
  else if (['high','medium','low'].includes(currentFilter)) tasks = tasks.filter(t => t.priority === currentFilter);

  if (tasks.length === 0) {
    list.innerHTML = '<div class="empty">Nenhuma tarefa aqui.</div>';
    return;
  }

  list.innerHTML = tasks.map(t => \`
    <div class="task \${t.status === 'done' ? 'done' : ''}">
      <div class="task-body">
        <div class="task-title">\${t.title}</div>
        \${t.description ? \`<div class="task-desc">\${t.description}</div>\` : ''}
        <div>
          <span class="badge badge-\${t.priority}">\${t.priority === 'high' ? '🔴 Alta' : t.priority === 'medium' ? '🟡 Média' : '🟢 Baixa'}</span>
          <span class="badge badge-\${t.status}">\${t.status === 'done' ? '✓ Concluída' : '⏳ Pendente'}</span>
          \${t.completedAt ? \`<span style="font-size:11px;color:#94a3b8">\${new Date(t.completedAt).toLocaleString('pt-PT')}</span>\` : ''}
        </div>
        \${t.result ? \`<div class="task-result">\${t.result}</div>\` : ''}
      </div>
      <div class="actions">
        \${t.status === 'pending' ? \`<button class="btn btn-ghost btn-sm" onclick="toggleEdit('\${t.id}')">✏️</button>\` : ''}
        \${t.status === 'done' ? \`<button class="btn btn-ghost btn-sm" onclick="reopen('\${t.id}')">↩</button>\` : ''}
        <button class="btn btn-red btn-sm" onclick="deleteTask('\${t.id}')">✕</button>
      </div>
    </div>
    <div id="edit-\${t.id}" style="display:none;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:14px;gap:10px;flex-direction:column" class="task">
      <input id="et-\${t.id}" value="\${t.title}" />
      <textarea id="ed-\${t.id}">\${t.description}</textarea>
      <select id="ep-\${t.id}">
        <option value="high" \${t.priority==='high'?'selected':''}>🔴 Alta</option>
        <option value="medium" \${t.priority==='medium'?'selected':''}>🟡 Média</option>
        <option value="low" \${t.priority==='low'?'selected':''}>🟢 Baixa</option>
      </select>
      <div style="display:flex;gap:8px">
        <button class="btn btn-green btn-sm" onclick="saveEdit('\${t.id}')">Guardar</button>
        <button class="btn btn-ghost btn-sm" onclick="toggleEdit('\${t.id}')">Cancelar</button>
      </div>
    </div>
  \`).join('');
}

function toggleEdit(id) {
  const el = document.getElementById('edit-' + id);
  el.style.display = el.style.display === 'none' ? 'flex' : 'none';
}

async function saveEdit(id) {
  await fetch('/tasks/' + id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: document.getElementById('et-'+id).value,
      description: document.getElementById('ed-'+id).value,
      priority: document.getElementById('ep-'+id).value,
    })
  });
  load();
}

async function createTask() {
  const title = document.getElementById('title').value.trim();
  if (!title) return alert('Escreve o título da tarefa.');
  await fetch('/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title,
      description: document.getElementById('description').value,
      priority: document.getElementById('priority').value,
    })
  });
  document.getElementById('title').value = '';
  document.getElementById('description').value = '';
  load(); loadLog();
}

async function deleteTask(id) {
  if (!confirm('Remover esta tarefa?')) return;
  await fetch('/tasks/' + id, { method: 'DELETE' });
  load(); loadLog();
}

async function reopen(id) {
  await fetch('/tasks/' + id, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'pending', result: null, completedAt: null })
  });
  load();
}

async function runNow() {
  const btn = event.target;
  btn.disabled = true; btn.textContent = '⏳ A processar...';
  await fetch('/run', { method: 'POST' });
  setTimeout(() => { load(); loadLog(); btn.disabled=false; btn.textContent='▶ Executar agora'; }, 3000);
}

async function loadLog() {
  const res = await fetch('/log');
  const text = await res.text();
  const box = document.getElementById('logBox');
  box.textContent = text || '(sem actividade ainda)';
  box.scrollTop = box.scrollHeight;
}

load();
loadLog();
setInterval(() => { load(); loadLog(); }, 30000);
</script>
</body>
</html>`;
