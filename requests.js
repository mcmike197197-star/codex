// ===============================================
// IWF CRM v9 — Cereri de recrutare internă (FULL)
// Înlocuiește complet panoul de Requests
// ===============================================
(function(){
  const STORAGE_KEY = 'iwf_crm_v9_internal_requests';
  const CAND_KEY    = 'iwf_crm_v9_candidates'; // reutilizăm candidații existenți
  const mainContent = document.getElementById('main-content');
  const nav         = document.querySelector('.nav');

  // Companiile din grup (fix)
  const GROUP_COMPANIES = [
    'International Work Finder',
    'Stratospark',
    'Fextate',
    'Sasu EcoSynergy',
    'Stratos Management'
  ];

  // Stadii progres cerere/candidat
  const REQ_STATUSES = ['Deschisă','În selecție','Ofertă transmisă','Completată'];
  const PL_STAGES    = ['Propus','Interviu','Ofertă','Angajat'];

  // UI state (filtre + paginare)
  const UI_KEY = 'iwf_crm_v9_internal_requests_ui';
  const ui = load(UI_KEY) || { page: 1, perPage: 10, company: 'Toate', status: 'Toate', query: '' };

  // DB
  let db = load(STORAGE_KEY);
  let candDB = load(CAND_KEY) || { candidates: [] };
  if (!db) { db = seed(); save(STORAGE_KEY, db); }

  // NAV hook
  nav.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-view="requests"]');
    if (!btn) return;
    setTimeout(renderList, 0);
  });

  // ------------- Helpers -------------
  function load(k){ try { return JSON.parse(localStorage.getItem(k)||'null'); } catch(e){ return null; } }
  function save(k,v){ localStorage.setItem(k, JSON.stringify(v)); }
  function fmtDate(d){ const dd = new Date(d); return isNaN(dd)?(d||''):dd.toLocaleDateString('ro-RO'); }
  function shortId(){ return Math.random().toString(36).substring(2,8).toUpperCase(); }
  function bar(pct){
    return `<div style="height:8px;border-radius:999px;background:#eee;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#a62091,#f59e0b,#22c55e)"></div>
            </div>`;
  }
  function downloadCSV(name, rows){
    const a=document.createElement('a');
    a.href=URL.createObjectURL(new Blob([rows.join('\n')],{type:'text/csv;charset=utf-8;'}));
    a.download=name; a.click(); URL.revokeObjectURL(a.href);
  }

  // ------------- Seed -------------
  function seed(){
    const now = new Date().toISOString();
    const demo = [
      { id:'INTREQ-001', company:'Stratospark', dept:'Logistică', title:'Coordonator depozit',
        jd:'Coordonare echipă depozit; program în ture; raportare KPI.',
        minExp:2, location:'Cluj-Napoca', priority:'Ridicată', status:'În selecție',
        createdAt:now, proposed:[], history:[{when:now, who:'Manager demo', action:'Cerere creată'}] },
      { id:'INTREQ-002', company:'International Work Finder', dept:'HR', title:'Specialist recrutare',
        jd:'End-to-end recruiting; ATS; interviuri și pipeline management.',
        minExp:1, location:'București', priority:'Medie', status:'Deschisă',
        createdAt:now, proposed:[], history:[{when:now, who:'Manager demo', action:'Cerere creată'}] },
      { id:'INTREQ-003', company:'Sasu EcoSynergy', dept:'Operațional', title:'Tehnician mentenanță',
        jd:'Mentenanță preventivă și corectivă; evidență piese; ture.',
        minExp:3, location:'Iași', priority:'Ridicată', status:'Ofertă transmisă',
        createdAt:now, proposed:[], history:[{when:now, who:'Manager demo', action:'Cerere creată'}] },
    ];
    return { requests: demo };
  }

  // ------------- Listă + filtre + paginare -------------
  function filtered(){
    const all = db.requests.slice();
    return all.filter(r=>{
      const okCompany = ui.company==='Toate' || r.company===ui.company;
      const okStatus  = ui.status==='Toate'  || r.status===ui.status;
      const q = (ui.query||'').trim().toLowerCase();
      const okQuery = !q || (
        r.title.toLowerCase().includes(q) ||
        r.dept.toLowerCase().includes(q) ||
        r.location.toLowerCase().includes(q)
      );
      return okCompany && okStatus && okQuery;
    });
  }
  function paginate(list){
    const total=list.length;
    const pages=Math.max(1, Math.ceil(total/ui.perPage));
    if (ui.page>pages) ui.page=pages;
    const start=(ui.page-1)*ui.perPage;
    return { total, pages, slice:list.slice(start, start+ui.perPage) };
  }
  function saveUI(){ save(UI_KEY, ui); }

  function renderList(){
    const list = filtered();
    const { total, pages, slice } = paginate(list);

    const rows = slice.map(r=>{
      const pct = Math.round(((PL_STAGES.indexOf(r.proposed.find(p=>p.stage)!==undefined ? r.proposed[r.proposed.length-1]?.stage : 'Propus'))/(PL_STAGES.length-1))*100) || 0;
      return `
        <tr>
          <td><strong>${r.id}</strong></td>
          <td>${r.company}</td>
          <td>${r.dept}</td>
          <td>${r.title}</td>
          <td>${r.location}</td>
          <td><span class="badge ${r.status==='Completată'?'success':r.status==='Ofertă transmisă'?'warn':''
        }">${r.status}</span></td>
          <td>${r.proposed.length}</td>
          <td>${bar(pct)}</td>
          <td><button class="btn" data-open="${r.id}">Deschide</button></td>
        </tr>
      `;
    }).join('');

    mainContent.innerHTML = `
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
          <h2 style="margin:0">Cereri de recrutare internă</h2>
          <div style="display:flex;gap:8px;align-items:center">
            <select id="f_company" class="input">
              <option>Toate</option>
              ${GROUP_COMPANIES.map(c=>`<option ${ui.company===c?'selected':''}>${c}</option>`).join('')}
            </select>
            <select id="f_status" class="input">
              <option>Toate</option>
              ${REQ_STATUSES.map(s=>`<option ${ui.status===s?'selected':''}>${s}</option>`).join('')}
            </select>
            <input id="f_q" class="input" placeholder="Căutare: titlu, departament, locație" style="padding:8px 12px" value="${ui.query||''}">
            <button class="btn" id="btn_new">Adaugă cerere</button>
          </div>
        </div>
        <div style="margin-top:10px;overflow:auto">
          <table>
            <thead>
              <tr><th>ID</th><th>Companie</th><th>Departament</th><th>Titlu</th><th>Locație</th><th>Status</th><th>Cand.</th><th>Progres</th><th></th></tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="9" class="muted">Nu există cereri.</td></tr>'}</tbody>
          </table>
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:12px">
          <div class="muted" style="font-size:13px">Total: <strong>${total}</strong> • Pagina <strong>${ui.page}</strong> / ${pages}</div>
          <div style="display:flex;gap:8px">
            <button class="btn" id="pg_prev" ${ui.page<=1?'disabled':''}>◀️ Anterioară</button>
            <button class="btn" id="pg_next" ${ui.page>=pages?'disabled':''}>Următoare ▶️</button>
          </div>
        </div>
      </div>
    `;

    // bind filtre
    document.getElementById('f_company').addEventListener('change', (e)=>{ ui.company=e.target.value; ui.page=1; saveUI(); renderList(); });
    document.getElementById('f_status').addEventListener('change',  (e)=>{ ui.status=e.target.value;  ui.page=1; saveUI(); renderList(); });
    document.getElementById('f_q').addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ ui.query=e.target.value; ui.page=1; saveUI(); renderList(); }});
    // paginare
    document.getElementById('pg_prev').addEventListener('click', ()=>{ if(ui.page>1){ ui.page--; saveUI(); renderList(); }});
    document.getElementById('pg_next').addEventListener('click', ()=>{ const p=Math.max(1,Math.ceil(filtered().length/ui.perPage)); if(ui.page<p){ ui.page++; saveUI(); renderList(); }});
    // open & new
    mainContent.querySelectorAll('[data-open]').forEach(b=> b.addEventListener('click', ()=>openReq(b.dataset.open)));
    document.getElementById('btn_new').addEventListener('click', createReq);
  }

  // ------------- Create -------------
  function createReq(){
    mainContent.innerHTML = `
      <div class="card">
        <h2>Adaugă cerere internă</h2>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(240px,1fr));gap:12px">
          <label>Companie
            <select id="rq_company" class="input">
              ${GROUP_COMPANIES.map(c=>`<option>${c}</option>`).join('')}
            </select>
          </label>
          <label>Departament <input id="rq_dept" class="input" placeholder="Ex: IT / Logistică"></label>
          <label>Titlu poziție <input id="rq_title" class="input" placeholder="Ex: Specialist recrutare"></label>
          <label>Experiență minimă (ani) <input id="rq_exp" class="input" type="number" value="1"></label>
          <label>Locație <input id="rq_loc" class="input" placeholder="Ex: București"></label>
          <label>Prioritate
            <select id="rq_prio" class="input"><option>Scăzută</option><option>Medie</option><option>Ridicată</option></select>
          </label>
          <label style="grid-column:1/-1">Descriere job (JD)
            <textarea id="rq_jd" class="input" style="min-height:120px" placeholder="Responsabilități, cerințe, beneficii…"></textarea>
          </label>
        </div>
        <div style="margin-top:12px">
          <button class="btn" id="rq_save">Salvează</button>
          <button class="btn" id="rq_cancel">Înapoi</button>
        </div>
      </div>
    `;
    document.getElementById('rq_cancel').addEventListener('click', renderList);
    document.getElementById('rq_save').addEventListener('click', ()=>{
      const now = new Date().toISOString();
      const r = {
        id: 'INTREQ-'+shortId(),
        company: document.getElementById('rq_company').value,
        dept:    document.getElementById('rq_dept').value || 'N/A',
        title:   document.getElementById('rq_title').value || 'Poziție',
        jd:      document.getElementById('rq_jd').value || '',
        minExp:  parseInt(document.getElementById('rq_exp').value||'0',10)||0,
        location:document.getElementById('rq_loc').value || 'România',
        priority:document.getElementById('rq_prio').value,
        status:  'Deschisă',
        createdAt: now,
        proposed: [],
        history: [{ when: now, who:'Manager demo', action:'Cerere creată' }]
      };
      db.requests.unshift(r);
      save(STORAGE_KEY, db);
      alert('Cerere creată');
      renderList();
    });
  }

  // ------------- Open -------------
  function openReq(id){
    const r = db.requests.find(x=>x.id===id);
    if(!r){ renderList(); return; }

    const proposedHTML = r.proposed.length ? r.proposed.map(p=>{
      const pct = Math.round((PL_STAGES.indexOf(p.stage)/(PL_STAGES.length-1))*100);
      return `
        <div style="display:flex;align-items:center;gap:10px;margin:8px 0">
          <div style="min-width:260px"><strong>${p.name}</strong><div class="muted" style="font-size:12px">${p.title||''}</div></div>
          <div style="flex:1;height:8px;border-radius:999px;background:linear-gradient(90deg,#d946ef,#f59e0b,#22c55e);position:relative">
            <div style="position:absolute;top:0;bottom:0;width:2px;background:#fff;left:${pct}%;box-shadow:0 0 0 2px rgba(255,255,255,.3)"></div>
          </div>
          <div class="muted" style="min-width:120px;text-align:right;font-size:12px">${p.stage}</div>
        </div>
      `;
    }).join('') : `<div class="muted">Niciun candidat propus încă.</div>`;

    const histHTML = r.history.map(h=>`
      <div style="display:flex;justify-content:space-between;border-bottom:1px solid #eee;padding:6px 0">
        <div><strong>${h.who}</strong> — ${h.action}</div>
        <div class="muted" style="font-size:12px">${fmtDate(h.when)}</div>
      </div>
    `).join('');

    mainContent.innerHTML = `
      <div class="card"><button class="btn" id="back">⟵ Înapoi la cereri</button></div>

      <div class="card">
        <h2>${r.title}</h2>
        <p class="muted">${r.company} • ${r.dept} • ${r.location}</p>
        <p>Status: <strong>${r.status}</strong> • Prioritate: <strong>${r.priority}</strong></p>
        <p><strong>Experiență minimă:</strong> ${r.minExp} ani</p>
        <div style="margin-top:10px"><strong>Descriere job (JD)</strong><div class="muted" style="white-space:pre-wrap;margin-top:6px">${r.jd || '—'}</div></div>

        <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap;align-items:center">
          <label>Status cerere
            <select id="rq_status" class="input">${REQ_STATUSES.map(s=>`<option ${r.status===s?'selected':''}>${s}</option>`).join('')}</select>
          </label>
          <button class="btn" id="rq_update">Actualizează</button>
          <button class="btn" id="rq_csv">Export istoric CSV</button>
        </div>
      </div>

      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap">
          <h3 style="margin:0">Candidați propuși</h3>
          <button class="btn" id="btn_propose">Propune candidat</button>
        </div>
        <div style="margin-top:10px" id="prop_list">${proposedHTML}</div>
      </div>

      <div class="card">
        <h3>Istoric</h3>
        ${histHTML || '<div class="muted">Fără evenimente.</div>'}
      </div>
    `;

    document.getElementById('back').addEventListener('click', renderList);
    document.getElementById('rq_update').addEventListener('click', ()=>{
      const newStatus = document.getElementById('rq_status').value;
      if (newStatus!==r.status){
        r.status = newStatus;
        r.history.push({ when:new Date().toISOString(), who:'Manager demo', action:`Status modificat la "${newStatus}"` });
        save(STORAGE_KEY, db);
        openReq(r.id);
        alert('Status actualizat');
      }
    });
    document.getElementById('rq_csv').addEventListener('click', ()=>{
      const rows = ['when,who,action'].concat(r.history.map(h=>`${h.when},${h.who},${(h.action||'').replaceAll(',',';')}`));
      downloadCSV(`istoric_${r.id}.csv`, rows);
    });

    document.getElementById('btn_propose').addEventListener('click', ()=> proposeCandidate(r));
  }

  // ------------- Propunere candidat -------------
  function proposeCandidate(req){
    const candidates = (candDB.candidates||[]).filter(c=>c.external);
    const opts = candidates.map(c=>`<option value="${c.id}">${c.firstName} ${c.lastName} — ${c.title||''}</option>`).join('');
    mainContent.innerHTML = `
      <div class="card">
        <h2>Propune candidat pentru ${req.title} (${req.company})</h2>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(220px,1fr));gap:10px">
          <label>Candidat<select id="pc_cand" class="input">${opts}</select></label>
          <label>Etapă<select id="pc_stage" class="input">
            ${PL_STAGES.map(s=>`<option>${s}</option>`).join('')}
          </select></label>
        </div>
        <div style="margin-top:12px"><button class="btn" id="pc_save">Salvează</button> <button class="btn" id="pc_cancel">Înapoi</button></div>
      </div>
    `;
    document.getElementById('pc_cancel').addEventListener('click', ()=>openReq(req.id));
    document.getElementById('pc_save').addEventListener('click', ()=>{
      const id = document.getElementById('pc_cand').value;
      const stage = document.getElementById('pc_stage').value;
      const c = (candDB.candidates||[]).find(x=>x.id===id);
      if(!c){ alert('Selectează un candidat.'); return; }

      req.proposed.push({ id:'p-'+shortId(), candId:id, name:`${c.firstName} ${c.lastName}`, title:c.title||'', stage });
      req.history.push({ when:new Date().toISOString(), who:'Manager demo', action:`Candidat propus: ${c.firstName} ${c.lastName} (${stage})` });
      save(STORAGE_KEY, db);

      // actualizăm istoricul candidatului
      c.history = c.history || [];
      c.history.push({ when:new Date().toISOString(), who:'Manager demo', action:`Propus la cererea internă ${req.id} (${req.company})` });
      save(CAND_KEY, candDB);

      alert('Candidat propus');
      openReq(req.id);
    });
  }

  // ------------- Auto-open dacă tab-ul Requests e activ -------------
  document.addEventListener('DOMContentLoaded', ()=>{
    const active = document.querySelector('.nav button.active');
    if (active && active.dataset.view==='requests'){
      setTimeout(renderList, 0);
    }
  });
})();
