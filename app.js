// =============================================================
// IWF CRM v9 — Experience OS (UI 2030)
// Login orchestration, global navigation & dashboard intelligence
// =============================================================

(() => {
  const login = document.getElementById('login');
  const app = document.getElementById('app');
  const btnEnter = document.getElementById('btn-enter');
  const overlay = document.getElementById('loading-overlay');
  const nav = document.querySelector('.nav');
  const navButtons = () => Array.from(document.querySelectorAll('.nav button'));
  const mainContent = document.getElementById('main-content');
  const crumbLabel = document.querySelector('.crumb-label');
  const crumbSub = document.querySelector('.crumb-sub');
  const globalSearch = document.getElementById('global-search');
  const quickAdd = document.getElementById('btn-quick-add');
  const remindersBtn = document.getElementById('btn-reminders');
  const AGENDA_STORAGE_KEY = 'iwf_crm_v9_agenda';
  let lastDashboardSnapshot = null;

  const VIEW_META = {
    dashboard: {
      title: 'Panou principal',
      tagline: 'Experiență de recrutare augmentată',
      render: () => renderDashboard()
    },
    candidates: {
      title: 'Candidați',
      tagline: 'Talent intelligence, pipeline & matching',
      render: () => renderPlaceholder('Se încarcă pool-ul de talente…')
    },
    clients: {
      title: 'Clienți',
      tagline: 'Parteneri globali și oportunități active',
      render: () => renderPlaceholder('Sincronizare companii partenere…')
    },
    orders: {
      title: 'Comenzi',
      tagline: 'Flux operațional & SLA-uri în timp real',
      render: () => renderPlaceholder('Pregătim hărțile de recrutare…')
    },
    requests: {
      title: 'Cereri interne',
      tagline: 'Workforce planning pentru grupul IWF',
      render: () => renderPlaceholder('Agregăm solicitările interne…')
    },
    reports: {
      title: 'Rapoarte',
      tagline: 'Analitice predictive & insight-uri financiare',
      render: () => renderPlaceholder('Calculăm KPI-urile globale…')
    },
    settings: {
      title: 'Setări',
      tagline: 'Personalizare platformă & preferințe utilizator',
      render: () => renderSettings()
    }
  };

  // --- Login orchestration ---
  btnEnter?.addEventListener('click', () => {
    overlay.classList.remove('hidden');
    setTimeout(() => {
      overlay.classList.add('hidden');
      login.classList.add('hidden');
      document.body.classList.remove('login-open');
      app.classList.remove('hidden');
      initializeApp();
      showView('dashboard');
    }, 1200);
  });

  function initializeApp() {
    lucide.createIcons();

    nav.addEventListener('click', (event) => {
      const button = event.target.closest('button[data-view]');
      if (!button) return;
      const view = button.dataset.view;
      showView(view);
    });

    globalSearch?.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      const query = (event.target.value || '').trim();
      if (!query) return;
      focusCandidates(query);
    });

    quickAdd?.addEventListener('click', () => {
      focusCandidates(null, true);
    });

    remindersBtn?.addEventListener('click', () => {
      const insights = dashboardInsights();
      alert(`Reminder-uri pentru azi:\n• ${insights.reminders.join('\n• ')}`);
    });

    // Auto render if user bypassed login via devtools
    if (!login || login.classList.contains('hidden')) {
      showView('dashboard');
    }
  }

  function focusCandidates(query, quickCreate = false) {
    const btn = document.querySelector('.nav button[data-view="candidates"]');
    if (btn) {
      btn.classList.add('active');
      showView('candidates');
      setTimeout(() => {
        try {
          const stateKey = 'iwf_crm_v9_candidates_ui';
          const stored = JSON.parse(localStorage.getItem(stateKey) || '{}');
          if (query) {
            const newState = Object.assign({ page: 1, perPage: 25 }, stored, { query, lastView: 'list' });
            localStorage.setItem(stateKey, JSON.stringify(newState));
          }
        } catch (err) {
          console.warn('Nu pot seta starea candidaților:', err);
        }
        if (typeof window.IWF_CANDIDATES?.openList === 'function') {
          window.IWF_CANDIDATES.openList();
          if (quickCreate) {
            setTimeout(() => {
              document.getElementById('cand_add')?.click();
            }, 120);
          }
        }
      }, 160);
    }
  }

  function showView(view) {
    const meta = VIEW_META[view] || VIEW_META.dashboard;
    navButtons().forEach((btn) => btn.classList.toggle('active', btn.dataset.view === view));

    crumbLabel.textContent = meta.title;
    crumbSub.textContent = meta.tagline;

    mainContent.classList.add('fade-in');
    mainContent.innerHTML = meta.render();
    requestAnimationFrame(() => mainContent.classList.remove('fade-in'));

    lucide.createIcons();
    document.dispatchEvent(new CustomEvent('iwf:view-change', { detail: { view } }));
  }

  function renderPlaceholder(message) {
    return `
      <div class="card glass-card">
        <h2>${message}</h2>
        <p class="muted">Modulele specializate se inițializează și vor popula datele live în câteva momente.</p>
      </div>
    `;
  }

  function renderDashboard() {
    const data = dashboardInsights();
    lastDashboardSnapshot = data;

    const stats = (data.kpis || []).map((kpi) => {
      const deltaClass = kpi.delta.trim().startsWith('-')
        ? 'negative'
        : kpi.delta.trim().startsWith('+')
          ? 'positive'
          : 'neutral';
      return `
        <div class="stat-card">
          <span class="stat-label">${kpi.label}</span>
          <strong>${kpi.value}</strong>
          <small class="stat-delta ${deltaClass}">${kpi.delta}</small>
        </div>
      `;
    }).join('');

    const summary = (data.weeklySnapshot || []).map((item) => {
      const accent = item.accent ? ` summary-icon--${item.accent}` : '';
      const icon = item.icon ? `<div class="summary-icon${accent}"><i data-lucide="${item.icon}"></i></div>` : '';
      return `
        <div class="summary-metric">
          ${icon || '<div class="summary-icon"></div>'}
          <div class="summary-body">
            <span class="summary-label">${item.label}</span>
            <strong class="summary-value">${item.value}</strong>
            ${item.context ? `<span class="summary-context">${item.context}</span>` : ''}
          </div>
        </div>
      `;
    }).join('');

    const pipeline = (data.pipelineStages || []).map((stage) => {
      const accent = stage.accent ? ` pipeline-card--${stage.accent}` : '';
      return `
        <div class="pipeline-card${accent}">
          <div class="pipeline-header">
            <span class="pipeline-chip">${stage.label}</span>
            <span class="pipeline-total">${stage.count}</span>
          </div>
          <p class="pipeline-description">${stage.description}</p>
        </div>
      `;
    }).join('');

    const alerts = (data.alerts || []).map((alert) => `
      <div class="glass-card" style="display:flex;align-items:flex-start;gap:12px;">
        <span class="badge ${alert.type}"><i data-lucide="zap"></i>${alert.typeLabel}</span>
        <div>
          <strong>${alert.title}</strong>
          <p class="muted" style="margin-top:6px;">${alert.description}</p>
        </div>
      </div>
    `).join('');

    const missions = (data.missions || []).map((mission) => `
      <div class="glass-card" style="display:flex;flex-direction:column;gap:12px;">
        <div class="flex-between">
          <strong>${mission.title}</strong>
          <span class="badge">ETA ${mission.eta}</span>
        </div>
        <p class="muted" style="margin:0;">${mission.description}</p>
        <div class="progress-line"><span style="width:${mission.progress}%"></span></div>
        <div class="flex-between" style="font-size:12px;color:#63677a;">
          <span>Lead: ${mission.owner}</span>
          <span>${mission.progress}% complet</span>
        </div>
      </div>
    `).join('');

    const highlights = (data.highlights || []).map((item) => `
      <div>
        <strong>${item.title}</strong>
        <p class="muted" style="margin:6px 0 0;">${item.detail}</p>
      </div>
    `).join('');

    const trendClass = (data.weeklyTrend || '').trim().startsWith('-') ? 'negative' : 'positive';

    return `
      <div class="card hero-card">
        <div class="hero-intro">
          <h2>Bun venit în cockpit-ul de recrutare 2030</h2>
          <p class="muted">Monitorizează candidații, clienții și cererile interne într-un singur panou augmentat de AI.</p>
          <div class="chip-set">
            <span class="chip active">Flux LIVE</span>
            <span class="chip">Hărți talent</span>
            <span class="chip">Indicatori AI</span>
          </div>
        </div>
        <div class="glass-card summary-panel">
          <div class="summary-header">
            <p class="muted">Angajări săptămâna aceasta</p>
            <div class="summary-highlight">
              <span class="summary-number">${data.weeklyHires}</span>
              <span class="summary-trend ${trendClass}">${data.weeklyTrend}</span>
            </div>
          </div>
          <div class="summary-grid">${summary}</div>
        </div>
      </div>

      <div class="stats-grid">${stats}</div>

      <div class="card dashboard-duo">
        <div>
          <h3 style="margin-top:0;">Pipeline candidați</h3>
          <p class="muted small">Monitorizează fiecare etapă și prioritizează acțiunile urgente.</p>
          <div class="pipeline-grid">${pipeline}</div>
        </div>
        <div class="agenda-panel">
          <h3 style="margin-top:0;">Agenda inteligentă</h3>
          <p class="muted small">Setează-ți reminder-ele și urmărește activitățile personale.</p>
          <form id="agenda-form" class="agenda-form">
            <input type="text" id="agenda-title" class="input" placeholder="Ex: Urmărire ofertă Stratos" required />
            <div class="agenda-form-row">
              <input type="date" id="agenda-date" class="input" required />
              <input type="time" id="agenda-time" class="input" required />
            </div>
            <textarea id="agenda-note" class="input agenda-note" rows="2" placeholder="Detalii (opțional)"></textarea>
            <button type="submit" class="btn small">Adaugă task</button>
          </form>
          <div class="agenda-list" data-agenda-list></div>
          <div class="agenda-empty" data-agenda-empty>
            <i data-lucide="check-circle"></i>
            <span>Nu ai task-uri programate. Adaugă primul reminder!</span>
          </div>
        </div>
      </div>

      <div class="card dashboard-duo">
        <div>
          <h3 style="margin-top:0;">Misiuni în derulare</h3>
          <div class="grid-two">${missions}</div>
        </div>
        <div>
          <h3 style="margin-top:0;">Alertări AI</h3>
          <div class="grid-two">${alerts}</div>
        </div>
      </div>

      <div class="card" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:22px;">
        <div class="glass-card">
          <h4 style="margin-top:0;">Highlights zilnice</h4>
          ${highlights}
        </div>
        <div class="glass-card">
          <h4 style="margin-top:0;">Clienți activi</h4>
          <p class="muted" style="margin:0;">${data.clientsActive} companii • ${data.openOrders} comenzi deschise</p>
          <div class="progress-line" style="margin-top:12px;"><span style="width:${data.clientSatisfaction}%"></span></div>
          <p class="muted" style="margin-top:8px;font-size:13px;">Satisfacție clienți ${data.clientSatisfaction}%</p>
        </div>
        <div class="glass-card">
          <h4 style="margin-top:0;">Cereri interne</h4>
          <p class="muted" style="margin:0;">${data.internalRequests} active • ${data.internalFulfilled} finalizate</p>
          <div class="progress-line" style="margin-top:12px;"><span style="width:${data.internalProgress}%"></span></div>
          <p class="muted" style="margin-top:8px;font-size:13px;">Progres global ${data.internalProgress}%</p>
        </div>
      </div>
    `;
  }

  function initDashboardView() {
    const data = lastDashboardSnapshot || dashboardInsights();
    setupAgenda(data.timeline || []);
  }

  function setupAgenda(defaultTasks = []) {
    const list = document.querySelector('[data-agenda-list]');
    const emptyState = document.querySelector('[data-agenda-empty]');
    const form = document.getElementById('agenda-form');
    const titleInput = document.getElementById('agenda-title');
    const dateInput = document.getElementById('agenda-date');
    const timeInput = document.getElementById('agenda-time');
    const noteInput = document.getElementById('agenda-note');

    if (!list || !form || !titleInput || !dateInput || !timeInput || !noteInput) {
      return;
    }

    let tasks = getAgendaTasks(defaultTasks);

    const setDefaultInputs = () => {
      try {
        if (!dateInput.value) {
          dateInput.value = new Date().toISOString().slice(0, 10);
        }
        if (!timeInput.value) {
          const now = new Date();
          const hours = String(now.getHours()).padStart(2, '0');
          const minutes = String(now.getMinutes()).padStart(2, '0');
          timeInput.value = `${hours}:${minutes}`;
        }
      } catch (err) {
        // ignore formatting errors
      }
    };

    function renderAgenda() {
      const sorted = tasks.slice().sort((a, b) => {
        const aDate = parseAgendaDate(a.date, a.time);
        const bDate = parseAgendaDate(b.date, b.time);
        return aDate - bDate;
      });

      list.innerHTML = renderAgendaItems(sorted);
      if (emptyState) {
        emptyState.style.display = sorted.length ? 'none' : 'flex';
      }
      lucide.createIcons();
    }

    setDefaultInputs();
    renderAgenda();

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const title = titleInput.value.trim();
      if (!title) return;

      const task = {
        id: `task-${Date.now()}`,
        title,
        date: dateInput.value,
        time: timeInput.value,
        details: noteInput.value.trim()
      };

      tasks.push(task);
      tasks = saveAgendaTasks(tasks);
      form.reset();
      setDefaultInputs();
      renderAgenda();
    });

    list.addEventListener('click', (event) => {
      const button = event.target.closest('[data-agenda-remove]');
      if (!button) return;
      const { agendaRemove } = button.dataset;
      tasks = tasks.filter((task) => task.id !== agendaRemove);
      tasks = saveAgendaTasks(tasks);
      renderAgenda();
    });
  }

  function getAgendaTasks(defaultTasks = []) {
    try {
      const stored = JSON.parse(localStorage.getItem(AGENDA_STORAGE_KEY) || '[]');
      const normalized = normalizeAgendaTasks(stored);
      if (normalized.length) {
        return normalized;
      }
    } catch (err) {
      console.warn('Nu pot încărca agenda:', err);
    }

    const seeded = normalizeAgendaTasks(defaultTasks);
    if (seeded.length) {
      saveAgendaTasks(seeded);
    }
    return seeded;
  }

  function saveAgendaTasks(tasks) {
    const sanitized = normalizeAgendaTasks(tasks);
    try {
      localStorage.setItem(AGENDA_STORAGE_KEY, JSON.stringify(sanitized));
    } catch (err) {
      console.warn('Nu pot salva agenda:', err);
    }
    return sanitized;
  }

  function normalizeAgendaTasks(tasks = []) {
    return tasks
      .map((task, index) => {
        if (!task || !task.title) return null;
        const title = String(task.title).trim();
        if (!title) return null;
        return {
          id: task.id || `seed-${index}`,
          title,
          date: task.date || '',
          time: task.time || '',
          details: task.details || task.note || task.context || ''
        };
      })
      .filter(Boolean);
  }

  function renderAgendaItems(tasks = []) {
    if (!tasks.length) return '';
    return tasks.map((task) => `
      <div class="agenda-task" data-agenda-id="${task.id}">
        <div>
          <h4>${task.title}</h4>
          ${task.date || task.time ? `<div class="agenda-meta">${formatAgendaDate(task.date, task.time)}</div>` : ''}
          ${task.details ? `<div class="agenda-details">${task.details}</div>` : ''}
        </div>
        <button type="button" class="agenda-remove" data-agenda-remove="${task.id}">
          <i data-lucide="x"></i>
        </button>
      </div>
    `).join('');
  }

  function formatAgendaDate(date, time) {
    if (!date && !time) return '';
    try {
      if (!date) {
        return time;
      }
      const composed = time ? `${date}T${time}` : `${date}T09:00`;
      const dt = new Date(composed);
      if (Number.isNaN(dt.getTime())) {
        return `${date}${time ? ` • ${time}` : ''}`;
      }
      const formatter = new Intl.DateTimeFormat('ro-RO', { day: '2-digit', month: 'short' });
      const formattedDate = formatter.format(dt).replace('.', '');
      return time ? `${formattedDate} • ${time}` : formattedDate;
    } catch (err) {
      return `${date}${time ? ` • ${time}` : ''}`;
    }
  }

  function parseAgendaDate(date, time) {
    if (!date && !time) return new Date().getTime();
    const fallback = new Date().getTime();
    try {
      if (!date) {
        const now = new Date();
        const [hours = '00', minutes = '00'] = (time || '00:00').split(':');
        now.setHours(Number(hours), Number(minutes), 0, 0);
        return now.getTime();
      }
      const composed = time ? `${date}T${time}` : `${date}T00:00`;
      const dt = new Date(composed);
      return Number.isNaN(dt.getTime()) ? fallback : dt.getTime();
    } catch (err) {
      return fallback;
    }
  }

  function dashboardInsights() {
    const today = new Date();
    const formatDate = (offset = 0) => {
      const dt = new Date(today);
      dt.setDate(dt.getDate() + offset);
      return dt.toISOString().slice(0, 10);
    };

    const totals = {
      candidatesIntroducedToday: 26,
      candidatesAddedThisWeek: 18,
      clientsNewThisWeek: 4,
      clientsActive: 54,
      candidatesActive: 128
    };

    return {
      weeklyHires: 12,
      weeklyTrend: '+3 față de săptămâna trecută',
      totals,
      weeklySnapshot: [
        { label: 'Candidați introduși azi', value: `${totals.candidatesIntroducedToday}`, context: 'în ultimele 24h • +8 vs. ieri', icon: 'user-plus', accent: 'magenta' },
        { label: 'Candidați adăugați', value: `${totals.candidatesAddedThisWeek}`, context: 'în această săptămână • țintă 20', icon: 'user-check', accent: 'teal' },
        { label: 'Clienți noi', value: `${totals.clientsNewThisWeek}`, context: 'parteneri recent activați • obiectiv 6/săpt.', icon: 'building-2', accent: 'amber' },
        { label: 'Clienți activi', value: `${totals.clientsActive}`, context: 'cu proiecte în lucru • 14 oferte deschise', icon: 'users', accent: 'indigo' },
        { label: 'Candidați activi', value: `${totals.candidatesActive}`, context: 'pipeline curent • 31 în interviu', icon: 'target', accent: 'violet' }
      ],
      kpis: [
        { label: 'Candidați activi', value: `${totals.candidatesActive}`, delta: '+12% vs. luna trecută' },
        { label: 'Clienți activi', value: `${totals.clientsActive}`, delta: '5 în faza de ofertă' },
        { label: 'Timp mediu de plasare', value: '21 zile', delta: '-4 zile față de Q2' },
        { label: 'Fee estimat (Q3)', value: '€242K', delta: '+€36K pipeline probabil' }
      ],
      clientsActive: totals.clientsActive,
      pipelineStages: [
        { label: 'Propuși', count: 42, description: 'Shortlist trimis către clienți', accent: 'proposed' },
        { label: 'Interviu', count: 31, description: 'Programări confirmate și live', accent: 'interview' },
        { label: 'Ofertare', count: 14, description: 'Pachete salariale în negociere', accent: 'offer' },
        { label: 'Angajați', count: 9, description: 'Contracte semnate & onboarding', accent: 'hired' },
        { label: 'Respinsi', count: 23, description: 'Feedback transmis candidaților', accent: 'rejected' }
      ],
      timeline: [
        { id: 'default-1', title: 'Stand-up echipă recrutare', date: formatDate(0), time: '08:30', details: 'Zoom • Moderator: Larisa' },
        { id: 'default-2', title: 'Interviu final — TechWorks', date: formatDate(0), time: '11:00', details: 'Cand.: Ioana Marin • Client: Vlad Popescu' },
        { id: 'default-3', title: 'Ofertă financiară — Green Energy', date: formatDate(0), time: '14:00', details: 'Cand.: Mihai Stan • Pending aprobări' },
        { id: 'default-4', title: 'Sync săptămânal clienți retail', date: formatDate(1), time: '16:30', details: 'RetailPro, FreshMarket, AgroFarm' }
      ],
      alerts: [
        { type: 'warn', typeLabel: 'ALERTĂ', title: '5 candidați fără feedback 48h', description: 'Oferă un răspuns rapid pentru a menține NPS > 80.' },
        { type: 'success', typeLabel: 'INSIGHT', title: 'Clienți top — rata acceptare 92%', description: 'Hotel Continental & Stratos Management au crescut conversia.' }
      ],
      missions: [
        { title: 'Program logistic Germania', description: 'Plasează 8 operatori depozit până pe 30 septembrie.', progress: 64, owner: 'Ioana D.', eta: '30 sept' },
        { title: 'HUB medical Scandinavia', description: 'Asigură 5 asistenți medicali cu certificare Nordic.', progress: 48, owner: 'Andrei R.', eta: '15 oct' },
        { title: 'Accelerator IT UK', description: 'Livrare shortlist 6 ingineri software senior.', progress: 72, owner: 'Alexandra M.', eta: '24 sept' }
      ],
      highlights: [
        { title: 'AI Talent Match', detail: '3 candidați potriviți automat pentru NovaPrint.' },
        { title: 'Nou client strategic', detail: 'Stratos Management extinde contract pe 2 ani.' },
        { title: 'CSAT candidați', detail: 'Scor 4.7 / 5 pe ultimele 20 feedback-uri.' }
      ],
      clientsActive: 17,
      openOrders: 24,
      clientSatisfaction: 91,
      internalRequests: 9,
      internalFulfilled: 3,
      internalProgress: 54,
      reminders: [
        'Confirmați disponibilitatea pentru interviul TechWorks (11:00)',
        'Reverificați documentele medicale pentru programul Scandinavia',
        'Trimiteți follow-up către candidații fără feedback (5 cazuri)'
      ]
    };
  }

  function renderSettings() {
    const prefs = getPreferences();
    return `
      <div class="card">
        <h2>Preferințe utilizator</h2>
        <p class="muted">Personalizează notificările, modul de lucru și componenta AI pentru contul tău demo.</p>
        <div class="grid-two" style="margin-top:18px;">
          <label>Mod întunecat
            <select id="pref_theme" class="input">
              <option value="light" ${prefs.theme === 'light' ? 'selected' : ''}>Luminos (implicit)</option>
              <option value="dark" ${prefs.theme === 'dark' ? 'selected' : ''}>Întunecat (beta)</option>
            </select>
          </label>
          <label>Notificări smart AI
            <select id="pref_ai" class="input">
              <option value="standard" ${prefs.ai === 'standard' ? 'selected' : ''}>Standard</option>
              <option value="aggressive" ${prefs.ai === 'aggressive' ? 'selected' : ''}>Proactive (mai multe insight-uri)</option>
              <option value="minimal" ${prefs.ai === 'minimal' ? 'selected' : ''}>Minimal</option>
            </select>
          </label>
          <label>Interval rapoarte email
            <select id="pref_reports" class="input">
              <option value="weekly" ${prefs.reports === 'weekly' ? 'selected' : ''}>Săptămânal</option>
              <option value="biweekly" ${prefs.reports === 'biweekly' ? 'selected' : ''}>La 2 săptămâni</option>
              <option value="monthly" ${prefs.reports === 'monthly' ? 'selected' : ''}>Lunar</option>
            </select>
          </label>
          <label>Fus orar preferat
            <select id="pref_tz" class="input">
              <option value="Europe/Bucharest" ${prefs.tz === 'Europe/Bucharest' ? 'selected' : ''}>Europe/Bucharest</option>
              <option value="Europe/London" ${prefs.tz === 'Europe/London' ? 'selected' : ''}>Europe/London</option>
              <option value="Asia/Dubai" ${prefs.tz === 'Asia/Dubai' ? 'selected' : ''}>Asia/Dubai</option>
            </select>
          </label>
        </div>
        <div style="margin-top:18px;display:flex;gap:12px;">
          <button class="btn" id="pref_save">Salvează preferințe</button>
          <button class="btn ghost" id="pref_reset">Reset demo</button>
        </div>
      </div>

      <div class="card">
        <h3>Log audit & transparență AI</h3>
        <p class="muted">Vizualizează modul în care recomandările AI influențează pipeline-ul candidaților.</p>
        <div class="table-responsive" style="margin-top:14px;">
          <table>
            <thead><tr><th>Timp</th><th>Acțiune</th><th>Detalii</th></tr></thead>
            <tbody>
              <tr><td>07:45</td><td>Recomandare AI</td><td>Ioana Marin prioritară pentru TechWorks (scor 8.9)</td></tr>
              <tr><td>08:10</td><td>Alertă NPS</td><td>5 candidați fără feedback 48h</td></tr>
              <tr><td>09:20</td><td>Predicție recrutare</td><td>Estimator: 92% șanse ofertă acceptată — Stratospark</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  function getPreferences() {
    try {
      return JSON.parse(localStorage.getItem('iwf_prefs') || '{}');
    } catch (err) {
      return {};
    }
  }

  function savePreferences(prefs) {
    localStorage.setItem('iwf_prefs', JSON.stringify(prefs));
  }

  document.addEventListener('iwf:view-change', (event) => {
    const view = event.detail?.view;
    if (view === 'dashboard') {
      initDashboardView();
    }

    if (view === 'settings') {
      const prefs = Object.assign({ theme: 'light', ai: 'standard', reports: 'weekly', tz: 'Europe/Bucharest' }, getPreferences());
      const $ = (id) => document.getElementById(id);
      $('pref_save')?.addEventListener('click', () => {
        const updated = {
          theme: $('pref_theme').value,
          ai: $('pref_ai').value,
          reports: $('pref_reports').value,
          tz: $('pref_tz').value
        };
        savePreferences(updated);
        alert('Preferințe salvate. (Demo)');
      });
      $('pref_reset')?.addEventListener('click', () => {
        localStorage.removeItem('iwf_prefs');
        alert('Preferințe resetate.');
        showView('settings');
      });
    }
  });
})();
