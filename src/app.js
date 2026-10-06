import { lessons, modules, sources, glossary } from './content.js';
import { searchLessons, buildSkill, normalize } from './search.js';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escape = (value) => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const icons = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/>',
  book: '<path d="M12 5v16m0-16C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2Z"/>',
  spark: '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/><path d="m20 2 .6 1.4L22 4l-1.4.6L20 6l-.6-1.4L18 4l1.4-.6Z"/>',
  folder: '<path d="M3 7V5a1 1 0 0 1 1-1h5l2 3h9a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1Z"/><path d="M3 10h18"/>',
  terminal: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m7 9 3 3-3 3m6 0h4"/>',
  layers: '<path d="m12 3 10 5-10 5L2 8Zm-9 10 9 5 9-5M3 18l9 5 9-5"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-12h-7Z"/>',
  plug: '<path d="M8 3v5m8-5v5M6 8h12v4a6 6 0 0 1-12 0Zm6 10v4"/>',
  box: '<path d="m12 3 9 5v10l-9 5-9-5V8Zm0 10L3 8m9 5 9-5m-9 5v10M7 5.5l9 5"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 6-6 4 4 3-3 5 5"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  bookmark: '<path d="M6 3h12v18l-6-4-6 4Z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  mic: '<rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-3 0h6"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  external: '<path d="M14 3h7v7m0-7L10 14M10 3H3v18h18v-7"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  lab: '<path d="M9 3h6m-5 0v7L4 20a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1l-6-10V3M7 16h10"/>',
  chart: '<path d="M4 20h17M7 16v-5m6 5V4m6 12V8"/>',
  volume: '<path d="m11 4-6 5H2v6h3l6 5Zm4 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6m0-10v.1"/>',
};
const icon = (name, cls = '') => `<svg class="icon ${cls}" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.spark}</svg>`;
const storageKey = 'claude-na-pratica-v1';
let storageAvailable = true;
function loadState() {
  const clean = { completed: [], bookmarks: [], quizzes: {}, exercises: {}, notes: {}, lastLesson: null };
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
    if (!saved || typeof saved !== 'object') return clean;
    const ids = new Set(lessons.map(l => l.id));
    for (const key of ['completed', 'bookmarks']) clean[key] = Array.isArray(saved[key]) ? [...new Set(saved[key].filter(id => ids.has(id)))] : [];
    for (const lesson of lessons) {
      if (Number.isInteger(saved.quizzes?.[lesson.id]) && saved.quizzes[lesson.id] >= 0 && saved.quizzes[lesson.id] < lesson.quiz.options.length) clean.quizzes[lesson.id] = saved.quizzes[lesson.id];
      if (typeof saved.notes?.[lesson.id] === 'string') clean.notes[lesson.id] = saved.notes[lesson.id].slice(0, 10000);
      if (Array.isArray(saved.exercises?.[lesson.id])) clean.exercises[lesson.id] = lesson.checks.map((_, i) => saved.exercises[lesson.id][i] === true);
    }
    clean.lastLesson = ids.has(saved.lastLesson) ? saved.lastLesson : null;
  } catch { storageAvailable = false; }
  return clean;
}
let state = loadState();
function save() {
  try { localStorage.setItem(storageKey, JSON.stringify(state)); }
  catch { if (storageAvailable) toast('Não foi possível salvar neste navegador. Exporte seu progresso na página Meu progresso.'); storageAvailable = false; }
}
const progress = () => Math.round(state.completed.length / lessons.length * 100);
const moduleLessons = id => lessons.filter(l => l.module === id);
const moduleDone = id => moduleLessons(id).filter(l => state.completed.includes(l.id)).length;
const nextLesson = () => (state.lastLesson && !state.completed.includes(state.lastLesson) ? lessons.find(l => l.id === state.lastLesson) : lessons.find(l => !state.completed.includes(l.id))) || lessons[0];
let activeFilter = 'todos';
let toastTimeout;
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('visible'); clearTimeout(toastTimeout); toastTimeout = setTimeout(() => $('#toast').classList.remove('visible'), 4000); }
const route = () => location.hash.slice(1) || '/';
function download(name, content, type = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function copyText(text) {
  try { await navigator.clipboard.writeText(text); toast('Copiado! Agora é só adaptar ao seu contexto.'); }
  catch { toast('A cópia automática não está disponível. Selecione o texto do exemplo e copie manualmente.'); }
}

function shell(content, page = 'home') {
  const current = route();
  const nav = [ ['/', 'home', 'Visão geral'], ['/trilhas', 'book', 'Todas as aulas'], ['/laboratorio', 'lab', 'Laboratório'], ['/salvos', 'bookmark', 'Meus favoritos'], ['/progresso', 'chart', 'Meu progresso'] ];
  return `<div class="layout">
    <aside class="sidebar" id="sidebar" aria-label="Navegação principal">
      <a class="brand" href="#/" aria-label="Claude na prática, início"><img src="/src/favicon.svg" alt="" width="35" height="35"><span>Claude<span class="brand-sub">na prática<span class="brand-dot">.</span></span></span></a>
      <span class="sidebar-label">SEU ESPAÇO DE APRENDIZADO</span>
      <nav class="primary-nav">${nav.map(([path, i, label]) => `<a href="#${path}" class="nav-link ${current === path ? 'active' : ''}" ${current === path ? 'aria-current="page"' : ''}>${icon(i)}<span>${label}</span>${path === '/salvos' && state.bookmarks.length ? `<span class="nav-count">${state.bookmarks.length}</span>` : ''}</a>`).join('')}</nav>
      <div class="sidebar-divider"></div><span class="sidebar-label">EXPLORE OS MÓDULOS</span>
      <nav class="module-nav">${modules.map(m => `<a href="#/modulo/${m.id}" class="module-link ${current.includes('/' + m.id) ? 'selected' : ''}"><span class="module-dot ${m.color}"></span><span>${m.short}</span>${moduleDone(m.id) === moduleLessons(m.id).length ? icon('check') : ''}</a>`).join('')}</nav>
      <div class="sidebar-bottom"><div class="sidebar-progress"><div><span>Sua jornada</span><strong>${progress()}%</strong></div><div class="progress-track" role="progressbar" aria-label="Progresso total" aria-valuenow="${progress()}" aria-valuemin="0" aria-valuemax="100"><span style="width:${progress()}%"></span></div><small>${state.completed.length} de ${lessons.length} aulas concluídas</small></div><a href="#/sobre" class="help-link">${icon('info')} Sobre a apostila</a><div class="sidebar-foot">Um passo de cada vez. Você consegue.</div></div>
    </aside>
    <div class="page-shell"><header class="topbar"><div class="breadcrumb"><button class="icon-button mobile-menu" data-action="menu" aria-label="Abrir navegação" aria-expanded="false" aria-controls="sidebar">${icon('menu')}</button><span>Apostila interativa</span>${icon('chevron')}<strong>${({ home: 'Visão geral', trilhas: 'Todas as aulas', modulo: 'Trilha de aprendizado', aula: 'Hora de aprender', laboratorio: 'Laboratório', salvos: 'Meus favoritos', progresso: 'Meu progresso', sobre: 'Sobre a apostila', glossario: 'Glossário' })[page] || 'Explorar'}</strong></div><div class="header-actions"><button class="search-trigger" data-action="guide">${icon('search')}<span>Buscar na apostila</span><kbd>/</kbd></button><div class="avatar" title="Seu espaço pessoal">EU</div></div></header>
      <main id="main" tabindex="-1">${content}</main>
      <footer class="footer"><span>Feito para aprender. Pensado para praticar.</span><div><a href="#/glossario">Glossário</a><a href="#/sobre">Fontes e informações</a><span>Material independente</span></div></footer>
    </div>
  </div><button class="guide-fab" data-action="guide">${icon('spark')}<span>Pergunte ao guia</span><span class="fab-mic">${icon('mic')}</span></button>`;
}

function card(m) {
  const list = moduleLessons(m.id);
  const done = moduleDone(m.id);
  return `<a class="module-card" href="#/modulo/${m.id}"><div class="card-top"><span class="card-icon ${m.color}">${icon(m.icon)}</span><span class="module-number">MÓDULO ${m.number}</span>${done === list.length ? `<span class="completed-dot" title="Módulo concluído">${icon('check')}</span>` : ''}</div><h3>${m.short}</h3><p>${m.description}</p><div class="card-tags"><span>${m.audience}</span></div><div class="card-footer"><span>${icon('book')}${list.length} aulas <span class="meta-separator">·</span> ${list.reduce((n, l) => n + l.minutes, 0)} min</span>${icon('arrow')}</div>${done ? `<div class="card-progress"><span style="width:${done / list.length * 100}%"></span></div>` : ''}</a>`;
}
function heroArt() {
  const rays = Array.from({length:12},(_,i)=>`<rect x="-8" y="-82" width="16" height="83" rx="3" transform="rotate(${i*30})"/>`).join('');
  return `<div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="orbit orbit-three"></div><div class="art-dot art-dot-one"></div><div class="art-dot art-dot-two"></div><div class="floating-label label-skills">${icon('layers')} Skills</div><div class="floating-label label-code">${icon('terminal')} Claude Code</div><div class="floating-label label-cowork">${icon('folder')} Cowork</div><div class="floating-label label-auto">${icon('bolt')} Automações</div><svg class="hero-star" viewBox="-90 -90 180 180" fill="currentColor">${rays}</svg><div class="art-spark spark-one">✧</div><div class="art-spark spark-two">✧</div></div>`;
}
const productCases = [
  { task: 'Resumir atas e entregar um relatório', product: 'Cowork', reason: 'Você quer uma entrega baseada nos documentos fornecidos. Dê acesso às atas e peça o relatório com referências.', deliverable: 'Relatório pronto para revisar.', route: 'cowork-primeira-tarefa' },
  { task: 'Organizar uma pasta com PDFs e documentos', product: 'Cowork', reason: 'O trabalho é analisar e organizar seus materiais. Comece por um inventário, revise os destinos e depois peça as cópias organizadas.', deliverable: 'Pasta organizada e índice dos arquivos.', route: 'cowork-arquivos' },
  { task: 'Analisar uma planilha e montar um briefing', product: 'Cowork', reason: 'Você precisa interpretar dados fornecidos e preparar um documento. Informe o objetivo, os critérios e o formato da entrega.', deliverable: 'Análise e briefing para decisão.', route: 'cowork-projeto' },
  { task: 'Criar um site ou aplicativo', product: 'Claude Code', reason: 'A entrega é um software. O Code trabalha nos arquivos do projeto, implementa o comportamento e pode executar a validação disponível.', deliverable: 'Código do site ou aplicativo, com comportamento verificado.', route: 'code-primeira-mudanca' },
  { task: 'Corrigir um bug ou um teste que falha', product: 'Claude Code', reason: 'Você precisa investigar e modificar um projeto existente. Forneça o erro e como reproduzi-lo; depois confira o diff e os testes.', deliverable: 'Correção no código e evidência de validação.', route: 'code-primeira-mudanca' },
  { task: 'Criar um script que importe dados de uma API', product: 'Claude Code', reason: 'A automação exige implementação e manutenção de código. Defina autenticação, entradas, falhas e o comportamento esperado.', deliverable: 'Script ou integração testada no projeto.', route: 'automacao-cli' },
  { task: 'Usar dados de um aplicativo já conectado em um relatório', product: 'Cowork', reason: 'Você quer usar uma integração disponível para uma tarefa de trabalho. Confira o acesso e a leitura dos dados antes de gerar o relatório.', deliverable: 'Relatório com referências ao aplicativo consultado.', route: 'conectores-intro' },
  { task: 'Criar uma skill ou usar um plugin', product: 'Os dois, conforme a tarefa', reason: 'Skills ensinam procedimentos e plugins reúnem recursos. Para documentos e rotinas de trabalho, comece pelo Cowork. Para desenvolver dentro de um projeto, use Code. A instalação depende do produto.', deliverable: 'Um procedimento reutilizável no ambiente escolhido.', route: 'skills-conceito' },
];
function productScope(l) {
  if (l.module === 'cowork') return { label: 'Prática no Cowork', detail: 'Abra uma tarefa no Cowork e forneça os materiais pelo aplicativo. Confira a entrega nos arquivos produzidos.' };
  if (l.module === 'code' || ['skills-criar','automacao-cli','automacao-hooks','mcp-code','plugins-criar','plugins-instalar'].includes(l.id)) return { label: 'Prática no Claude Code', detail: 'Siga o exemplo no projeto aberto no Claude Code. Comandos que começam com claude são executados no terminal. Para recursos equivalentes no Cowork, siga o fluxo do aplicativo.' };
  return { label: 'Conceito para Cowork e Code', detail: 'Escolha Cowork para entregas com documentos e rotinas de trabalho; Code para desenvolver software. Ferramentas, instalação e acessos variam entre os produtos.' };
}
function decisionHtml(value) {
  const c = productCases[Number(value)];
  if (value === '' || !c) return '<p>Escolha uma tarefa para ver a ferramenta indicada, o motivo e a entrega esperada.</p>';
  return `<strong>Comece por: ${c.product}</strong><p>${c.reason}</p><p><b>O que você vai revisar:</b> ${c.deliverable}</p><a class="subtle-link" href="#/aula/${c.route}">Aprender esse caminho ${icon('arrow')}</a>`;
}
function productComparison() {
  return `<section class="product-comparison" aria-label="Quando usar Cowork ou Claude Code"><div class="section-heading"><div><span class="eyebrow small">PRIMEIRO, ESCOLHA A FERRAMENTA</span><h2>Cowork ou Code? Olhe para a entrega.</h2><p>O assunto pode ser o mesmo. O resultado que você quer é que orienta a escolha.</p></div></div><div class="product-grid"><article class="product-card product-cowork"><span class="product-label">${icon('folder')} CLAUDE COWORK</span><h3>Trabalhar com seus materiais.</h3><p>Para delegar tarefas com documentos, planilhas, pastas e aplicativos conectados.</p><dl><dt>Onde você trabalha</dt><dd>No espaço Cowork do aplicativo compatível.</dd><dt>O que você fornece</dt><dd>Arquivos, contexto, objetivo e acessos.</dd><dt>O que você recebe</dt><dd>Relatórios, tabelas, documentos e materiais organizados.</dd></dl><blockquote>“Leia estas atas e prepare o relatório da semana.”</blockquote><a class="subtle-link" href="#/modulo/cowork">Aprender Cowork ${icon('arrow')}</a></article><article class="product-card product-code"><span class="product-label">${icon('terminal')} CLAUDE CODE</span><h3>Construir e cuidar de software.</h3><p>Para criar sites, editar projetos, corrigir bugs, escrever scripts e rodar testes.</p><dl><dt>Onde você trabalha</dt><dd>No projeto, pelo terminal ou interface de desenvolvimento compatível.</dd><dt>O que você fornece</dt><dd>Código do projeto, objetivo, regras e ferramentas de desenvolvimento.</dd><dt>O que você recebe</dt><dd>Arquivos de código alterados e resultados de validação.</dd></dl><blockquote>“Crie um site para consultar essas atas e teste a busca.”</blockquote><a class="subtle-link" href="#/modulo/code">Aprender Claude Code ${icon('arrow')}</a></article></div><div class="product-decision"><label for="workflow-choice">O que você quer fazer agora?</label><select id="workflow-choice"><option value="">Escolha uma tarefa do dia a dia…</option>${productCases.map((c,i)=>`<option value="${i}">${c.task}</option>`).join('')}</select><div id="workflow-result" aria-live="polite">${decisionHtml('')}</div></div><figure class="product-reference"><img src="/src/cowork-code-reference.png" alt="Comparação ilustrada: no Cowork, documentos e planilhas viram um relatório; no Claude Code, arquivos de um projeto viram um site com testes." loading="lazy"><figcaption>Ilustração didática dos fluxos de trabalho. As telas desenhadas são esquemáticas.</figcaption></figure><p class="product-overlap"><strong>E skills, plugins, conectores e automações?</strong> Podem fazer parte dos dois fluxos, conforme os recursos disponíveis. Cowork favorece a execução do trabalho com seus materiais; Code favorece a implementação dentro de um projeto. Nesta apostila, cada aula indica onde praticar.</p></section>`;
}
function home() {
  const next = nextLesson();
  return `<section class="hero"><div class="hero-copy"><div class="eyebrow"><span class="live-dot"></span> DO PRIMEIRO PASSO À SUA PRÓXIMA IDEIA</div><h1>Menos teoria.<br>Mais <em>“eu consegui”.</em></h1><p>Descubra o que você pode fazer com Claude.<br>Aprenda, experimente e transforme ideias em realidade.</p><div class="hero-actions"><a class="button primary" href="#/aula/${next.id}">${state.completed.length || state.lastLesson ? 'Continuar aprendendo' : 'Começar minha jornada'}${icon('arrow')}</a><button class="button text-button" data-action="guide">${icon('mic')} Me guie por voz</button></div><div class="hero-note"><span class="tiny-check">${icon('check')}</span>No seu ritmo <span>·</span> Do básico à prática <span>·</span> Sem complicação</div></div>${heroArt()}</section>
    <section class="stats-strip" aria-label="Resumo da apostila"><div><span class="stat-icon">${icon('layers')}</span><strong>8<span>módulos para explorar</span></strong></div><div><span class="stat-icon">${icon('book')}</span><strong>24<span>aulas com prática</span></strong></div><div><span class="stat-icon">${icon('lab')}</span><strong>Aprenda fazendo<span>exemplos, desafios e modelos</span></strong></div><div><span class="stat-icon">${icon('mic')}</span><strong>Um guia com você<span>encontre aulas por voz ou texto</span></strong></div></section>
    ${productComparison()}
    <section class="journey-section"><div class="section-heading"><div><div class="eyebrow small">SEU CAMINHO, SEU RITMO</div><h2>O que vamos aprender?</h2><p>Comece do início ou vá direto ao que desperta sua curiosidade.</p></div><a class="subtle-link" href="#/trilhas">Ver todas as aulas ${icon('arrow')}</a></div><div class="filter-bar" role="group" aria-label="Filtrar módulos">${[['todos','Todos os módulos'],['inicio','Estou começando'],['pratica','Quero criar'],['dev','Sou dev']].map(([key,label]) => `<button class="filter-chip ${activeFilter === key ? 'selected' : ''}" data-filter="${key}" aria-pressed="${activeFilter === key}">${label}</button>`).join('')}</div><div class="module-grid" id="module-grid">${filteredModules().map(card).join('')}</div></section>
    <section class="bottom-banner"><div class="banner-mark">${icon('lab')}</div><div><span class="eyebrow small">DA IDEIA PARA A PRÁTICA</span><h2>Seu primeiro “eu fiz” está logo ali.</h2><p>Monte um prompt ou crie o rascunho da sua primeira skill no laboratório.</p></div><a class="button secondary" href="#/laboratorio">Experimentar ${icon('arrow')}</a></section>`;
}
function filteredModules() {
  const selections = { inicio: ['fundamentos', 'cowork', 'code'], pratica: ['skills', 'automacoes', 'plugins', 'imagens'], dev: ['code', 'skills', 'automacoes', 'conectores', 'plugins'] };
  return activeFilter === 'todos' ? modules : modules.filter(m => selections[activeFilter].includes(m.id));
}
function pageHeading(label, title, description, extra = '') { return `<div class="page-heading"><div class="eyebrow small">${label}</div><h1>${title}</h1><p>${description}</p>${extra}</div>`; }
function lessonRow(l, index) {
  const done = state.completed.includes(l.id);
  return `<a class="lesson-row" href="#/aula/${l.id}"><span class="lesson-index ${done ? 'done' : ''}">${done ? icon('check') : String(index + 1).padStart(2, '0')}</span><div class="lesson-row-copy"><h3>${l.title}</h3><span>${productScope(l).label}<span class="meta-separator">·</span>${l.level}<span class="meta-separator">·</span>${l.minutes} min${done ? '<span class="meta-separator">·</span>Concluída' : ''}</span></div>${state.bookmarks.includes(l.id) ? icon('bookmark', 'saved') : ''}${icon('arrow')}</a>`;
}
function allLessons() {
  return pageHeading('UM UNIVERSO DE POSSIBILIDADES', 'Escolha seu próximo passo.', '24 aulas para quem está começando, para quem já desenvolve e para quem quer ir além.') + `<div class="lesson-filters"><label for="level-filter">Seu momento</label><select id="level-filter"><option value="todos">Todos os níveis</option><option>Iniciante</option><option>Intermediário</option><option>Avançado</option></select><label class="input-search">${icon('search')}<input id="lesson-search" type="search" placeholder="Buscar assunto ou aula…" aria-label="Buscar aulas"></label></div><div id="lesson-list">${renderLessonGroups()}</div>`;
}
function renderLessonGroups(level = 'todos', query = '') {
  const ids = query.trim() ? new Set(searchLessons(query, 24).map(r => r.lesson.id)) : null;
  const groups = modules.map(m => {
    const list = moduleLessons(m.id).filter(l => (level === 'todos' || l.level === level) && (!ids || ids.has(l.id)));
    return list.length ? `<section class="lesson-group"><div class="group-heading"><span class="card-icon small-icon ${m.color}">${icon(m.icon)}</span><h2>${m.short}</h2><span>${list.length} aulas</span></div>${list.map((l) => lessonRow(l, lessons.indexOf(l))).join('')}</section>` : '';
  }).join('');
  return groups || emptyState('Nenhuma aula por aqui… ainda.', 'Experimente outro termo ou selecione todos os níveis.', 'search');
}
function modulePage(id) {
  const m = modules.find(m => m.id === id);
  if (!m) return notFound();
  const list = moduleLessons(id);
  return `<a class="back-link" href="#/trilhas">← Todas as aulas</a><div class="module-page-header ${m.color}"><span class="card-icon">${icon(m.icon)}</span>${pageHeading(`MÓDULO ${m.number} · ${list.length} AULAS`, m.short, m.description)}<span class="module-progress-label">${moduleDone(id)} de ${list.length} concluídas</span></div><div class="module-lessons">${list.map(lessonRow).join('')}</div><div class="tip-box">${icon('spark')}<p><strong>Uma sugestão para começar</strong> Siga a ordem das aulas para construir uma base. Você também pode abrir qualquer aula e consultar os pré-requisitos.</p></div>`;
}
function readyToComplete(l) { return state.quizzes[l.id] === l.quiz.answer && l.checks.every((_, i) => state.exercises[l.id]?.[i]); }
function quizHtml(l) {
  const selected = state.quizzes[l.id];
  const answered = Number.isInteger(selected);
  const correct = selected === l.quiz.answer;
  return `<div class="exercise-heading"><span class="card-icon small-icon lavender">${icon('spark')}</span><div><span class="eyebrow small">CONFIRA O QUE APRENDEU</span><h2>Uma pausa para pensar</h2></div></div><fieldset class="quiz-fieldset"><legend>${l.quiz.question}</legend><div class="quiz-options">${l.quiz.options.map((option, i) => `<button class="quiz-option ${selected === i ? (correct ? 'correct' : 'incorrect') : ''}" data-quiz="${i}" data-lesson="${l.id}" aria-pressed="${selected === i}"><span class="option-letter">${String.fromCharCode(65 + i)}</span>${option}${selected === i ? icon(correct ? 'check' : 'close') : ''}</button>`).join('')}</div></fieldset><div class="quiz-feedback ${answered ? (correct ? 'correct-feedback' : 'incorrect-feedback') : ''}" role="status">${answered ? `<strong>${correct ? 'Isso mesmo!' : 'Quase! Vale tentar de novo.'}</strong> ${correct ? l.quiz.explanation : 'Releia os pontos da aula e escolha a opção que corresponde ao procedimento ensinado.'}` : ''}</div>`;
}
function completionHtml(l) {
  const done = state.completed.includes(l.id);
  return `<button class="button ${done ? 'completed-button' : 'primary'}" data-action="complete" data-id="${l.id}" ${!done && !readyToComplete(l) ? 'disabled' : ''}>${icon(done ? 'check' : 'arrow')}${done ? 'Aula concluída' : 'Concluir esta aula'}</button><p>${done ? 'Seu progresso foi registrado neste navegador.' : 'Marque os passos da prática e acerte a revisão para concluir.'}</p>`;
}
function lessonPage(id) {
  const l = lessons.find(l => l.id === id);
  if (!l) return notFound();
  const m = modules.find(m => m.id === l.module);
  state.lastLesson = l.id; save();
  const index = lessons.indexOf(l);
  const next = lessons[index + 1];
  const bookmarked = state.bookmarks.includes(id);
  document.title = `${l.title} — Claude na prática`;
  return `<div class="lesson-topline"><a class="back-link" href="#/modulo/${m.id}">← ${m.short}</a><button class="button bookmark-button ${bookmarked ? 'is-saved' : ''}" data-action="bookmark" data-id="${id}" aria-pressed="${bookmarked}">${icon('bookmark')} ${bookmarked ? 'Aula salva' : 'Salvar aula'}</button></div><div class="reading-layout"><article class="lesson-article"><header class="lesson-header"><div class="eyebrow small">MÓDULO ${m.number} <span> / </span> AULA ${String(index + 1).padStart(2,'0')}</div><h1>${l.title}</h1><div class="lesson-meta"><span class="level-badge">${l.level}</span><span>${icon('clock')} ${l.minutes} min de aprendizado</span></div><div class="product-scope"><strong>${productScope(l).label}</strong><p>${productScope(l).detail}</p></div><p class="lesson-intro">${l.intro}</p>${l.prerequisite ? `<p class="prerequisite">${icon('info')} Antes de começar: ${l.prerequisite}.</p>` : ''}</header>
      <section id="conceito" class="reading-section">${id === 'qual-claude' ? productComparison() : ''}<span class="eyebrow small">ENTENDA A IDEIA</span>${l.blocks.map(([title, text]) => `<h2>${title}</h2><p>${text}</p>`).join('')}</section>
      <section id="passos" class="reading-section"><div class="section-label">${icon('layers')} PASSO A PASSO</div><h2>Vamos colocar em prática</h2><ol class="steps">${l.steps.map((step, i) => `<li><span>${i + 1}</span><p>${step}</p></li>`).join('')}</ol></section>
      <section id="exemplo" class="reading-section"><div class="section-label">${icon('terminal')} EXEMPLO PARA ADAPTAR</div><h2>Um ponto de partida para você</h2><div class="code-block"><div class="code-toolbar"><span>Exemplo da aula · revise antes de usar</span><button class="copy-button" data-action="copy-lesson" data-id="${id}">${icon('copy')} Copiar</button></div><pre><code>${escape(l.prompt)}</code></pre></div><p class="caption">Adapte nomes, caminhos e entradas ao seu ambiente. Copiar o exemplo não executa comandos.</p></section>
      <section id="pratica" class="reading-section practice-box"><div class="section-label">${icon('lab')} AGORA É COM VOCÊ</div><h2>Seu pequeno desafio</h2><p>${l.exercise}</p><div class="exercise-checks">${l.checks.map((text, i) => `<label><input type="checkbox" data-exercise="${i}" data-lesson="${id}" ${state.exercises[id]?.[i] ? 'checked' : ''}><span>${text}</span></label>`).join('')}</div><a class="subtle-link" href="#/laboratorio">Abrir o laboratório ${icon('arrow')}</a></section>
      <section id="revisao" class="reading-section quiz-box">${quizHtml(l)}</section>
      <section id="anotacoes" class="reading-section"><label class="notes-label" for="lesson-notes">${icon('book')} Minhas anotações</label><p class="caption">Escreva suas ideias. Elas ficam salvas apenas neste navegador.</p><textarea id="lesson-notes" data-lesson="${id}" maxlength="10000" rows="5" placeholder="O que eu aprendi? O que quero experimentar?">${escape(state.notes[id] || '')}</textarea><div id="notes-status" class="save-status" role="status"></div></section>
      <section class="lesson-sources"><h2>Continue nas fontes oficiais</h2>${l.sources.map(key => `<a href="${sources[key].url}" target="_blank" rel="noopener noreferrer">${sources[key].name}${icon('external')}</a>`).join('')}<p>Recursos e disponibilidade podem variar por plano, sistema e versão.</p></section>
      <div class="lesson-completion" id="lesson-completion">${completionHtml(l)}</div><nav class="lesson-pagination" aria-label="Aulas anterior e próxima">${index > 0 ? `<a href="#/aula/${lessons[index - 1].id}"><small>← AULA ANTERIOR</small><span>${lessons[index - 1].title}</span></a>` : '<span></span>'}${next ? `<a href="#/aula/${next.id}"><small>PRÓXIMA AULA →</small><span>${next.title}</span></a>` : '<a href="#/progresso"><small>SUA JORNADA →</small><span>Veja o que você conquistou</span></a>'}</nav></article>
      <aside class="reading-aside"><div class="reading-toc"><span class="eyebrow small">NESTA AULA</span>${[['conceito','Entenda a ideia'],['passos','Passo a passo'],['exemplo','Exemplo para adaptar'],['pratica','Seu desafio'],['revisao','Revisão rápida'],['anotacoes','Anotações']].map(([section,text],i)=>`<button data-scroll="${section}"><span>0${i + 1}</span>${text}</button>`).join('')}<div class="aside-help"><span class="card-icon small-icon sand">${icon('spark')}</span><h3>Não sabe por onde ir?</h3><p>Conte o que quer aprender e o guia encontra uma aula para você.</p><button class="subtle-link" data-action="guide">Perguntar ao guia ${icon('arrow')}</button></div></div></aside></div>`;
}
function emptyState(title, description, name = 'bookmark') { return `<div class="empty-state"><span class="card-icon sage">${icon(name)}</span><h2>${title}</h2><p>${description}</p><a class="button secondary" href="#/trilhas">Explorar as aulas ${icon('arrow')}</a></div>`; }
function favorites() {
  const saved = lessons.filter(l => state.bookmarks.includes(l.id));
  return pageHeading('PARA VOLTAR SEMPRE', 'Suas boas descobertas.', 'Salve as aulas que você quer consultar de novo. Seus favoritos ficam neste navegador.') + (saved.length ? `<div class="lesson-group">${saved.map(lessonRow).join('')}</div>` : emptyState('Seu cantinho de referências.', 'Abra uma aula e toque em “Salvar aula” para encontrá-la aqui.'));
}
function progressPage() {
  const minutes = lessons.filter(l => state.completed.includes(l.id)).reduce((n, l) => n + l.minutes, 0);
  return pageHeading('CADA PASSO CONTA', 'Olha só o seu caminho.', 'O aprendizado se constrói na prática. Continue de onde parou e celebre suas pequenas conquistas.') + `<div class="progress-summary"><div class="progress-ring" style="--progress:${progress()}%"><span>${progress()}<small>% concluído</small></span></div><div><h2>${state.completed.length ? 'Você já começou a transformar conhecimento em prática.' : 'Sua próxima descoberta começa com uma aula.'}</h2><p>${state.completed.length} aulas concluídas <span class="meta-separator">·</span> ${minutes} min estimados de conteúdo concluído</p><a class="button primary" href="#/aula/${nextLesson().id}">Continuar minha jornada ${icon('arrow')}</a></div></div><div class="progress-module-list">${modules.map(m => `<a href="#/modulo/${m.id}" class="progress-module"><span class="card-icon small-icon ${m.color}">${icon(m.icon)}</span><div><strong>${m.short}</strong><div class="progress-track"><span style="width:${moduleDone(m.id) / moduleLessons(m.id).length * 100}%"></span></div></div><span>${moduleDone(m.id)} / ${moduleLessons(m.id).length}</span>${icon('chevron')}</a>`).join('')}</div><div class="tip-box">${icon('download')}<div><strong>Leve uma cópia com você</strong><p>Progresso, respostas, favoritos e anotações são locais a este navegador. Exporte uma cópia para guardar seus registros.</p><button class="subtle-link" data-action="export-progress">Exportar meus registros ${icon('download')}</button></div></div>`;
}
function labPage() {
  return pageHeading('É EXPERIMENTANDO QUE SE APRENDE', 'Seu laboratório de ideias.', 'Transforme uma tarefa em um pedido claro ou dê forma à sua primeira skill.') + `<div class="lab-tabs" role="tablist" aria-label="Ferramentas do laboratório"><button role="tab" id="prompt-tab" aria-controls="prompt-panel" aria-selected="true" data-lab-tab="prompt">${icon('terminal')} Montador de prompts</button><button role="tab" id="skill-tab" aria-controls="skill-panel" aria-selected="false" tabindex="-1" data-lab-tab="skill">${icon('layers')} Criador de skills</button></div>
    <section class="lab-panel" role="tabpanel" id="prompt-panel" aria-labelledby="prompt-tab"><div class="lab-form"><span class="eyebrow small">DE UMA IDEIA A UM BOM PEDIDO</span><h2>O que vamos fazer?</h2><p>Preencha os campos e acompanhe o pedido ganhando forma.</p><label for="prompt-goal">1. Qual é o objetivo?</label><input id="prompt-goal" placeholder="Ex.: transformar atas em um relatório semanal" maxlength="500"><label for="prompt-context">2. Qual contexto o Claude precisa?</label><textarea id="prompt-context" rows="3" placeholder="Ex.: três atas de reuniões da equipe de produto" maxlength="2000"></textarea><label for="prompt-format">3. Como deve ser a entrega?</label><select id="prompt-format"><option>Tabela com referências às fontes</option>Relatório em Markdown</option>Lista de próximos passos</option>Plano de implementação com testes</option>Briefing visual</option></select><label for="prompt-limit">4. Algum limite importante?</label><input id="prompt-limit" placeholder="Ex.: preservar os originais e sinalizar dados ausentes" maxlength="500"></div><div class="lab-preview"><div class="preview-top"><span class="status-dot"></span> SEU PROMPT, EM TEMPO REAL</div><pre id="prompt-preview" tabindex="0" aria-label="Prévia do prompt"></pre><button class="button primary" data-action="copy-prompt">${icon('copy')} Copiar meu prompt</button><p class="caption">Este laboratório monta texto localmente. Cole o pedido no Claude para executá-lo.</p></div></section>
    <section class="lab-panel" role="tabpanel" id="skill-panel" aria-labelledby="skill-tab" hidden><div class="lab-form"><span class="eyebrow small">ENSINE SEU JEITO DE FAZER</span><h2>Dê forma à sua skill.</h2><p>Gere um rascunho de SKILL.md e revise antes de instalar.</p><label for="skill-name">Nome da skill</label><input id="skill-name" placeholder="Ex.: Resumo de reunião" maxlength="64"><label for="skill-description">O que faz e quando usar?</label><textarea id="skill-description" rows="3" placeholder="Ex.: resume atas em decisões e próximos passos; use ao consolidar reuniões." maxlength="2000"></textarea><label for="skill-input">Quais são as entradas?</label><input id="skill-input" placeholder="Ex.: atas em Markdown com data e participantes" maxlength="1000"><label for="skill-output">Qual é a saída esperada?</label><input id="skill-output" placeholder="Ex.: tabela com decisão, responsável, prazo e fonte" maxlength="1000"><a class="subtle-link" href="#/aula/skills-criar">Ver a aula de criação de skills ${icon('arrow')}</a></div><div class="lab-preview"><div class="preview-top"><span class="status-dot"></span> SKILL.md · RASCUNHO EDITORIAL</div><pre id="skill-preview" tabindex="0" aria-label="Prévia do SKILL.md"></pre><div class="preview-buttons"><button class="button primary" data-action="download-skill">${icon('download')} Baixar SKILL.md</button><button class="button secondary" data-action="copy-skill" aria-label="Copiar SKILL.md">${icon('copy')}</button></div><p class="caption">Salve em uma pasta própria, complete o procedimento e teste com entradas reais. O arquivo não instala a skill automaticamente.</p></div></section>`;
}
function glossaryPage() { return pageHeading('SEM COMPLICAÇÃO', 'Um dicionário para a jornada.', 'Os termos que aparecem nas aulas, explicados em poucas palavras.') + `<div class="glossary-grid">${glossary.map(([term, def]) => `<article><h2>${term}</h2><p>${def}</p></article>`).join('')}</div>`; }
function about() {
  return pageHeading('CLAREZA TAMBÉM FAZ PARTE DO APRENDIZADO', 'Sobre esta apostila.', 'Um material educacional independente, em português, para aprender Claude fazendo.') + `<div class="about-content"><section><h2>Feita para diferentes pontos de partida</h2><p>As 24 aulas combinam conceitos, passos práticos, exemplos, desafios e revisão. Iniciantes podem seguir a ordem dos módulos. Desenvolvedores podem ir direto às aulas de Code, MCP, automações e plugins.</p><p>Este material não é um produto oficial da Anthropic e não fornece acesso ou assinatura do Claude. Nomes de produtos pertencem aos respectivos titulares.</p></section><section><h2>Como o guia funciona</h2><p>O guia faz uma busca local nos textos e assuntos da apostila. Ele indica aulas e mostra trechos editoriais; não é uma conversa conectada à API do Claude e não executa tarefas nos seus aplicativos.</p><p>A entrada por voz usa o reconhecimento de fala oferecido pelo navegador, quando compatível, e requer permissão de microfone e um contexto seguro. Dependendo do navegador, o áudio pode ser processado pelo serviço de reconhecimento dele. Esta aplicação não grava nem armazena áudio. Perguntas digitadas continuam disponíveis.</p><p>A leitura em voz alta é opcional e usa a síntese de voz do navegador. Vozes e pronúncia variam conforme o dispositivo.</p></section><section><h2>Seus dados ficam com você</h2><p>Progresso, respostas, anotações e favoritos são salvos no armazenamento local deste navegador. Não há conta, sincronização, analytics ou backend de IA nesta versão. Limpar os dados do navegador apaga esses registros. Exporte uma cópia na página Meu progresso.</p></section><section><h2>Fontes e atualização</h2><p>Revisão editorial: 6 de outubro de 2026. Os repositórios oficiais marcados abaixo foram consultados durante a criação. Os demais links são referências para consultar os requisitos atuais; seus conteúdos não foram verificados nesta sessão. Planos, menus, comandos e disponibilidade podem mudar.</p><div class="source-list">${Object.values(sources).map(s => `<a href="${s.url}" target="_blank" rel="noopener noreferrer"><span><strong>${s.name}</strong><small>${s.verified ? 'Repositório oficial consultado' : 'Referência para consulta atual'}</small></span>${icon('external')}</a>`).join('')}</div></section><section><h2>Uma referência para levar</h2><p>Baixe um resumo em Markdown com os módulos, os termos e as fontes desta apostila.</p><button class="button secondary" data-action="download-reference">${icon('download')} Baixar guia de referência</button></section></div>`;
}
function notFound() { return emptyState('Essa página não foi encontrada.', 'Explore o índice para encontrar o conteúdo que você procura.', 'search'); }

function render({ focus = false } = {}) {
  const path = route();
  let content, page;
  document.title = 'Claude na prática — Seu espaço de aprendizado';
  if (path === '/') { content = home(); page = 'home'; }
  else if (path === '/trilhas') { content = allLessons(); page = 'trilhas'; }
  else if (path.startsWith('/modulo/')) { content = modulePage(path.split('/')[2]); page = 'modulo'; }
  else if (path.startsWith('/aula/')) { content = lessonPage(path.split('/')[2]); page = 'aula'; }
  else if (path === '/laboratorio') { content = labPage(); page = 'laboratorio'; }
  else if (path === '/salvos') { content = favorites(); page = 'salvos'; }
  else if (path === '/progresso') { content = progressPage(); page = 'progresso'; }
  else if (path === '/sobre') { content = about(); page = 'sobre'; }
  else if (path === '/glossario') { content = glossaryPage(); page = 'glossario'; }
  else { content = notFound(); page = 'trilhas'; }
  $('#app').innerHTML = shell(content, page);
  if (page === 'laboratorio') updateLab();
  if (focus) $('#main').focus({ preventScroll: true });
  document.body.classList.remove('menu-open');
  syncMobileNav();
}
const mobileQuery = window.matchMedia('(max-width: 700px)');
function syncMobileNav() {
  const hidden = mobileQuery.matches && !document.body.classList.contains('menu-open');
  const sidebar = $('#sidebar');
  if (sidebar) { sidebar.inert = hidden; sidebar.setAttribute('aria-hidden', String(hidden)); }
}
mobileQuery.addEventListener('change', syncMobileNav);
function updateLab() {
  if (!$('#prompt-preview')) return;
  const goal = $('#prompt-goal').value.trim() || '[descreva seu objetivo]';
  const context = $('#prompt-context').value.trim() || '[forneça o contexto e os materiais]';
  const limit = $('#prompt-limit').value.trim() || 'Sinalize informações ausentes e diferencie fatos de suposições.';
  $('#prompt-preview').textContent = `Objetivo: ${goal}.\n\nContexto e entradas: ${context}.\n\nFormato da entrega: ${$('#prompt-format').value}.\n\nLimites: ${limit}\n\nAntes de começar, confira se as entradas e ferramentas necessárias estão disponíveis.\n\nAo terminar, explique como verificar a entrega e indique o que não pôde ser concluído.`;
  $('#skill-preview').textContent = buildSkill({ name: $('#skill-name').value, description: $('#skill-description').value, input: $('#skill-input').value, output: $('#skill-output').value });
}

// The guide retrieves authored lessons. It does not claim to call a remote model.
let guideMessages = [];
let listening = false;
let recognition = null;
let voiceRead = false;
let focusBeforeGuide;
const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const voiceSupported = Boolean(Recognition && window.isSecureContext);
function initGuide() {
  $('#guide-root').innerHTML = `<dialog id="guide-dialog" class="guide-dialog" aria-labelledby="guide-title"><div class="guide-header"><span class="card-icon small-icon sage">${icon('spark')}</span><div><h2 id="guide-title">Seu guia de aprendizado</h2><span><span class="status-dot"></span> Busca na apostila · sem IA conectada</span></div><button class="icon-button" data-action="close-guide" aria-label="Fechar guia">${icon('close')}</button></div><div class="guide-messages" id="guide-messages" role="log" aria-label="Perguntas e indicações de aulas" aria-live="polite"></div><div class="guide-composer"><label class="read-toggle"><input type="checkbox" id="read-aloud" ${!('speechSynthesis' in window) ? 'disabled' : ''}>${icon('volume')} Ler indicações em voz alta</label><form id="guide-form"><label for="guide-input" class="sr-only">O que você quer aprender?</label><input id="guide-input" placeholder="O que você quer aprender?" maxlength="500" autocomplete="off"><button type="button" class="icon-button mic-button" id="mic-button" data-action="mic" aria-label="Fazer pergunta por voz" ${!voiceSupported ? 'disabled' : ''}>${icon('mic')}</button><button class="guide-send" type="submit" aria-label="Buscar conteúdo">${icon('arrow')}</button></form><p class="voice-status" id="voice-status" role="status">${voiceSupported ? 'Toque no microfone para falar. Seu navegador pedirá permissão.' : 'Voz indisponível neste navegador. Digite sua pergunta ou use um navegador compatível, como Chrome, em HTTPS.'}</p><p class="voice-privacy">O reconhecimento pode usar o serviço de voz do navegador. A apostila não grava áudio.</p></div></dialog>`;
  $('#guide-dialog').addEventListener('close', cleanupVoice);
  $('#guide-dialog').addEventListener('click', e => { if (e.target === $('#guide-dialog')) { const r = e.target.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) closeGuide(); } });
  renderGuideMessages();
}
function renderGuideMessages() {
  const box = $('#guide-messages');
  box.innerHTML = `<div class="guide-welcome"><span class="guide-wave">✳</span><h3>Uma pergunta.<br>Um próximo passo.</h3><p>Me conte o que quer aprender. Eu encontro o caminho dentro da apostila.</p><div class="suggested-questions">${['Como criar minha primeira skill?', 'Qual a diferença entre Cowork e Code?', 'Quero automatizar uma tarefa', 'Como trabalhar com imagens?'].map(q => `<button data-question="${q}">${q}${icon('arrow')}</button>`).join('')}</div></div>${guideMessages.map(msg => msg.type === 'user' ? `<div class="user-message">${escape(msg.text)}</div>` : `<div class="guide-answer"><div class="answer-label">${icon('spark')} SEU PRÓXIMO PASSO</div><p>${escape(msg.text)}</p>${msg.results.map(({lesson:l}, i) => `<a class="guide-result" href="#/aula/${l.id}"><span class="result-number">${i + 1}</span><span><strong>${l.title}</strong><small>${modules.find(m=>m.id===l.module).short} · ${l.minutes} min · ${l.level}</small></span>${icon('arrow')}</a>`).join('')}${msg.results.length ? '<p class="guide-footnote">Indicação baseada no conteúdo da apostila. Abra a aula para ver o passo a passo.</p>' : '<a class="subtle-link" href="#/trilhas">Explorar todas as aulas →</a>'}</div>`).join('')}`;
  box.scrollTop = box.scrollHeight;
}
function openGuide() {
  const d = $('#guide-dialog');
  focusBeforeGuide = document.activeElement;
  if (!d.open) d.showModal();
  $('#guide-input').focus();
}
function cleanupVoice() {
  if (recognition) { recognition.abort(); recognition = null; }
  listening = false;
  $('#mic-button')?.classList.remove('listening');
  $('#mic-button')?.setAttribute('aria-label', 'Fazer pergunta por voz');
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}
function closeGuide() { cleanupVoice(); $('#guide-dialog').close(); if (focusBeforeGuide?.isConnected) focusBeforeGuide.focus(); }
function askGuide(query) {
  query = query.trim().slice(0, 500);
  if (!query) { $('#guide-input').focus(); return; }
  const results = searchLessons(query, 3);
  const difference = /diferenc|qual.*(usar|escolher|claude)|quando.*(cowork|code)|cowork.*code|code.*cowork/.test(normalize(query));
  if (difference) { const l = lessons.find(l => l.id === 'qual-claude'); results.splice(0, results.length, {lesson:l,score:100}, ...results.filter(r=>r.lesson.id!==l.id).slice(0,2)); }
  const text = results.length ? `Comece por “${results[0].lesson.title}”. ${results[0].lesson.intro}` : 'Não encontrei uma aula correspondente. Tente um assunto como “criar skill”, “instalar Code”, “conectar ferramentas” ou “imagens”.';
  guideMessages.push({type:'user',text:query}, {type:'answer',text,results});
  guideMessages = guideMessages.slice(-20);
  renderGuideMessages();
  $('#guide-input').value = '';
  if (voiceRead && 'speechSynthesis' in window) {
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text); utterance.lang = 'pt-BR'; utterance.rate = 1;
    const voice = speechSynthesis.getVoices().find(v => v.lang === 'pt-BR'); if (voice) utterance.voice = voice;
    speechSynthesis.speak(utterance);
  }
}
function toggleMic() {
  if (!voiceSupported) { toast('Use a pergunta por texto neste navegador.'); return; }
  if (listening && recognition) { recognition.stop(); return; }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  let transcript = '';
  let failed = false;
  const instance = new Recognition();
  recognition = instance;
  instance.lang = 'pt-BR'; instance.interimResults = true; instance.continuous = false;
  instance.onstart = () => { listening = true; $('#mic-button').classList.add('listening'); $('#mic-button').setAttribute('aria-label', 'Parar gravação da pergunta'); $('#voice-status').textContent = 'Estou ouvindo… Faça sua pergunta. Toque novamente para parar.'; };
  instance.onresult = e => { let partial = ''; for(let i=0;i<e.results.length;i++) partial += e.results[i][0].transcript; $('#guide-input').value = partial.slice(0,500); if(e.results[e.results.length-1].isFinal) transcript = partial; };
  instance.onerror = e => { failed = true; const errors = { 'not-allowed': 'O microfone não foi autorizado. Permita o acesso nas configurações do navegador ou digite sua pergunta.', 'service-not-allowed': 'O serviço de voz não está disponível. Digite sua pergunta.', 'audio-capture': 'Não foi possível acessar o microfone. Confira o dispositivo ou digite sua pergunta.', 'no-speech': 'Não ouvi uma pergunta. Tente novamente ou digite.', 'network': 'O serviço de reconhecimento está sem conexão. Use a busca por texto.', 'aborted': 'Escuta encerrada. Você pode digitar sua pergunta.' }; $('#voice-status').textContent = errors[e.error] || 'Não foi possível reconhecer a fala. Tente digitar sua pergunta.'; };
  instance.onend = () => { listening = false; recognition = null; $('#mic-button').classList.remove('listening'); $('#mic-button').setAttribute('aria-label','Fazer pergunta por voz'); if (!failed) { $('#voice-status').textContent = transcript ? 'Pergunta reconhecida. Veja as aulas indicadas acima.' : 'Nenhuma pergunta reconhecida. Você pode tentar novamente ou digitar.'; if (transcript && $('#guide-dialog').open) askGuide(transcript); } };
  try { instance.start(); } catch { recognition = null; $('#voice-status').textContent = 'Não foi possível iniciar o microfone. Use a pergunta por texto.'; }
}

document.addEventListener('click', e => {
  if (e.target.closest('.sidebar a') && mobileQuery.matches) {
    document.body.classList.remove('menu-open');
    $('.mobile-menu')?.setAttribute('aria-expanded', 'false');
    syncMobileNav();
    $('#main')?.focus({preventScroll:true});
  }
  const action = e.target.closest('[data-action]');
  if (action) {
    const id = action.dataset.id;
    switch (action.dataset.action) {
      case 'menu': { const open = document.body.classList.toggle('menu-open'); action.setAttribute('aria-expanded', String(open)); syncMobileNav(); if(open) $('.sidebar .primary-nav a').focus(); break; }
      case 'guide': openGuide(); break;
      case 'close-guide': closeGuide(); break;
      case 'mic': toggleMic(); break;
      case 'copy-lesson': copyText(lessons.find(l => l.id === id).prompt); break;
      case 'bookmark': {
        const isSaved = state.bookmarks.includes(id);
        state.bookmarks = isSaved ? state.bookmarks.filter(x=>x!==id) : [...state.bookmarks, id]; save();
        const scroll = window.scrollY; render(); window.scrollTo(0,scroll); $('[data-action="bookmark"]')?.focus({preventScroll:true});
        toast(isSaved ? 'Aula removida dos favoritos.' : 'Aula salva nos seus favoritos.'); break;
      }
      case 'complete': {
        const l = lessons.find(l=>l.id===id);
        if (state.completed.includes(id)) { toast('Essa conquista já é sua. Você pode revisar a aula quando quiser.'); break; }
        if (readyToComplete(l)) { state.completed.push(id); save(); const scroll=window.scrollY; render(); window.scrollTo(0,scroll); $('[data-action="complete"]')?.focus({preventScroll:true}); toast('Mais um passo dado! Aula concluída.'); } break;
      }
      case 'copy-prompt': copyText($('#prompt-preview').textContent); break;
      case 'copy-skill': copyText($('#skill-preview').textContent); break;
      case 'download-skill': download('SKILL.md', $('#skill-preview').textContent, 'text/markdown;charset=utf-8'); toast('Seu rascunho de SKILL.md foi preparado para download.'); break;
      case 'export-progress': download('meu-progresso-claude.json', JSON.stringify({version:1,exportedAt:new Date().toISOString(),...state},null,2),'application/json'); break;
      case 'download-reference': download('claude-na-pratica-referencia.md', '# Claude na prática\n\nMaterial educacional independente.\n\n' + modules.map(m=>`## ${m.number}. ${m.short}\n${m.description}\n${moduleLessons(m.id).map(l=>`- ${l.title} (${l.level}, ${l.minutes} min)`).join('\n')}`).join('\n\n') + '\n\n## Glossário\n' + glossary.map(([a,b])=>`- **${a}**: ${b}`).join('\n') + '\n\n## Fontes oficiais\n' + Object.values(sources).map(s=>`- [${s.name}](${s.url})`).join('\n'), 'text/markdown;charset=utf-8'); break;
    }
  }
  const filter = e.target.closest('[data-filter]');
  if (filter) { activeFilter = filter.dataset.filter; $$('.filter-chip').forEach(b=>{b.classList.toggle('selected',b.dataset.filter===activeFilter);b.setAttribute('aria-pressed',String(b.dataset.filter===activeFilter));}); $('#module-grid').innerHTML = filteredModules().map(card).join(''); }
  const scroll = e.target.closest('[data-scroll]');
  if (scroll) { const section=$('#'+scroll.dataset.scroll); section.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'}); const heading=$('h2, label',section); if(heading){heading.setAttribute('tabindex','-1');heading.focus({preventScroll:true});} }
  const quiz = e.target.closest('[data-quiz]');
  if (quiz) { const l=lessons.find(l=>l.id===quiz.dataset.lesson); state.quizzes[l.id]=Number(quiz.dataset.quiz); save(); $('#revisao').innerHTML=quizHtml(l); $('#lesson-completion').innerHTML=completionHtml(l); $(`[data-quiz="${quiz.dataset.quiz}"]`).focus({preventScroll:true}); }
  const tab = e.target.closest('[data-lab-tab]');
  if (tab) { $$('[data-lab-tab]').forEach(t=>{const selected=t===tab;t.setAttribute('aria-selected',String(selected));t.tabIndex=selected?0:-1;$('#'+t.dataset.labTab+'-panel').hidden=!selected;}); }
  const q = e.target.closest('[data-question]'); if (q) askGuide(q.dataset.question);
  const guideLink = e.target.closest('#guide-dialog a[href^="#/"]'); if (guideLink) closeGuide();
});
document.addEventListener('input', e => {
  if (e.target.id === 'lesson-notes') { state.notes[e.target.dataset.lesson]=e.target.value; save(); $('#notes-status').textContent=storageAvailable?'Anotações salvas neste navegador.':'Armazenamento indisponível: exporte seus registros antes de sair.'; }
  if (e.target.closest('.lab-panel')) updateLab();
  if (e.target.id === 'lesson-search') $('#lesson-list').innerHTML=renderLessonGroups($('#level-filter').value,e.target.value);
});
document.addEventListener('change', e => {
  if (e.target.id === 'workflow-choice') $('#workflow-result').innerHTML = decisionHtml(e.target.value);
  if (e.target.matches('[data-exercise]')) { const l=lessons.find(l=>l.id===e.target.dataset.lesson); state.exercises[l.id] ||= []; state.exercises[l.id][Number(e.target.dataset.exercise)]=e.target.checked; save(); $('#lesson-completion').innerHTML=completionHtml(l); }
  if (e.target.id==='level-filter') $('#lesson-list').innerHTML=renderLessonGroups(e.target.value,$('#lesson-search').value);
  if (e.target.id==='read-aloud') { voiceRead=e.target.checked; if (!voiceRead && 'speechSynthesis' in window) speechSynthesis.cancel(); }
});
document.addEventListener('submit', e => { if (e.target.id==='guide-form') { e.preventDefault(); if(listening) cleanupVoice(); askGuide($('#guide-input').value); } });
document.addEventListener('keydown', e => {
  if (e.key==='/' && !e.ctrlKey && !e.metaKey && !e.altKey && !/INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) { e.preventDefault(); openGuide(); }
  if(e.key==='Escape' && document.body.classList.contains('menu-open')) { document.body.classList.remove('menu-open'); $('.mobile-menu')?.setAttribute('aria-expanded','false'); syncMobileNav(); $('.mobile-menu')?.focus(); }
  if(e.target.matches('[data-lab-tab]') && ['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) { e.preventDefault(); const tabs=$$('[data-lab-tab]'); const next=e.key==='Home'?tabs[0]:e.key==='End'?tabs.at(-1):tabs.find(t=>t!==e.target); next.click(); next.focus(); }
});
window.addEventListener('hashchange',()=>{ if($('#guide-dialog').open) closeGuide(); render({focus:true}); window.scrollTo(0,0); });
render();
initGuide();
if(!storageAvailable) toast('Armazenamento local indisponível. Seus registros ficarão apenas nesta sessão.');
