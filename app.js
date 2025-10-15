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

    const stats = data.kpis.map((kpi) => `
      <div class="stat-card">
        <span>${kpi.label}</span>
        <strong>${kpi.value}</strong>
        <small class="muted">${kpi.delta}</small>
      </div>
    `).join('');

    const pipeline = data.pipeline.map((stage) => `
      <div class="glass-card">
        <div class="flex-between" style="align-items:flex-start;">
          <div>
            <h4 style="margin:0;color:#1d2033;">${stage.name}</h4>
            <p style="margin:6px 0 0;" class="muted">${stage.subtitle}</p>
          </div>
          <span class="badge">${stage.count} cand.</span>
        </div>
        <div class="progress-line" style="margin-top:14px;"><span style="width:${stage.progress}%"></span></div>
      </div>
    `).join('');

    const timeline = data.timeline.map((item) => `
      <div class="timeline-item">
        <strong>${item.time}</strong>
        <div>${item.title}</div>
        <div class="muted" style="font-size:12px;">${item.context}</div>
      </div>
    `).join('');

    const alerts = data.alerts.map((alert) => `
      <div class="glass-card" style="display:flex;align-items:flex-start;gap:12px;">
        <span class="badge ${alert.type}"><i data-lucide="zap"></i>${alert.typeLabel}</span>
        <div>
          <strong>${alert.title}</strong>
          <p class="muted" style="margin-top:6px;">${alert.description}</p>
        </div>
      </div>
    `).join('');

    const missions = data.missions.map((mission) => `
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

    const highlights = data.highlights.map((item) => `
      <div>
        <strong>${item.title}</strong>
        <p class="muted" style="margin:6px 0 0;">${item.detail}</p>
      </div>
    `).join('');

    return `
      <div class="card" style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px,1fr));gap:22px;align-items:center;">
        <div>
          <h2 style="margin-bottom:8px;">Bun venit în cockpit-ul de recrutare 2030</h2>
          <p class="muted" style="margin:0;">Monitorizează candidații, clienții și cererile interne într-un singur panou augmentat de AI.</p>
          <div class="chip-set">
            <span class="chip active">Flux LIVE</span>
            <span class="chip">Hărți talent</span>
            <span class="chip">Indicatori AI</span>
          </div>
        </div>
        <div class="glass-card" style="text-align:center;">
          <p class="muted" style="margin:0;">Angajări săptămâna aceasta</p>
          <h1 style="font-size:42px;margin:10px 0 0;color:#1d2033;">${data.weeklyHires}</h1>
          <p class="muted" style="margin:6px 0 0;font-size:13px;">${data.weeklyTrend}</p>
        </div>
      </div>

      <div class="stats-grid">${stats}</div>

      <div class="card" style="display:grid;grid-template-columns:2fr 1fr;gap:24px;">
        <div>
          <h3 style="margin-top:0;">Pipeline candidați</h3>
          <div class="grid-two">${pipeline}</div>
        </div>
        <div>
          <h3 style="margin-top:0;">Agenda inteligentă</h3>
          <div class="timeline">${timeline}</div>
        </div>
      </div>

      <div class="card" style="display:grid;grid-template-columns:2fr 1fr;gap:24px;">
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

  function dashboardInsights() {
    return {
      weeklyHires: 12,
      weeklyTrend: '+3 față de săptămâna trecută',
      kpis: [
        { label: 'Candidați activi', value: '128', delta: '+12% vs. luna trecută' },
        { label: 'Clienți cu comenzi', value: '17', delta: '5 în faza de ofertă' },
        { label: 'Timp mediu de plasare', value: '21 zile', delta: '-4 zile față de Q2' },
        { label: 'Fee estimat (Q3)', value: '€242K', delta: '+€36K pipeline probabil' }
      ],
      pipeline: [
        { name: 'Propus', count: 42, subtitle: 'În shortlist pentru clienți', progress: 38 },
        { name: 'Interviu', count: 31, subtitle: 'Interviuri planificate & live', progress: 62 },
        { name: 'Ofertă', count: 14, subtitle: 'Pachete salariale în negociere', progress: 78 },
        { name: 'Angajat', count: 9, subtitle: 'Contracte semnate', progress: 92 }
      ],
      timeline: [
        { time: '08:30', title: 'Stand-up echipă recrutare', context: 'Zoom • Moderator: Larisa' },
        { time: '11:00', title: 'Interviu final — TechWorks', context: 'Cand.: Ioana Marin • Client: Vlad Popescu' },
        { time: '14:00', title: 'Ofertă financiară — Green Energy', context: 'Cand.: Mihai Stan • Pending aprobări' },
        { time: '16:30', title: 'Sync săptămânal clienți retail', context: 'RetailPro, FreshMarket, AgroFarm' }
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
    if (event.detail?.view === 'settings') {
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
