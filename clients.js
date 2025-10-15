// ==================================
// IWF CRM v9 — Clients module
// ==================================
(function(){
  const STORAGE_KEY = 'iwf_crm_v9_clients';
  const CAND_KEY = 'iwf_crm_v9_candidates';
  const mainContent = document.getElementById('main-content');
  const nav = document.querySelector('.nav');

  // Load data
  let dbClients = load(STORAGE_KEY) || seedClients();
  let dbCandidates = load(CAND_KEY)?.candidates || [];

  function load(k){ try{return JSON.parse(localStorage.getItem(k)||'null');}catch(e){return null;} }
  function save(k,v){ localStorage.setItem(k,JSON.stringify(v)); }

  function seedClients(){
    const names = ['TransLogistic SRL','Hotel Continental','TechWorks România','EuroFoods SRL','Construct Plus','Green Energy RO','MedicaLine','RetailPro','AutoDrive','BlueTech','FreshMarket','AgroFarm','UrbanWorks','NovaPrint','ClujSoft'];
    return names.map((n,i)=>({
      id:'client-'+(i+1),
      name:n,
      country:'România',
      contact:{name:'Contact '+(i+1),email:'contact'+(i+1)+'@exemplu.ro'},
      placements:[],
      proposed:[]
    }));
  }

  // Attach nav click
  nav.addEventListener('click', e=>{
    const btn=e.target.closest('button[data-view="clients"]');
    if(!btn) return;
    setTimeout(renderList,0);
  });

  // ---------- Helpers ----------
  function fmtDate(d){
    const dd=new Date(d);
    if(isNaN(dd))return d||'';
    return dd.toLocaleDateString('ro-RO');
  }
  function shortId(){ return Math.random().toString(36).substring(2,8); }

  // ---------- Main list ----------
  function renderList(){
    const totalClients = dbClients.length;
    const activePlacements = dbClients.reduce((acc, cl) => acc + (cl.placements?.length||0), 0);
    const proposed = dbClients.reduce((acc, cl) => acc + (cl.proposed?.length||0), 0);

    mainContent.innerHTML=`
      <div class="card">
        <div class="flex-between" style="flex-wrap:wrap;gap:14px;">
          <div>
            <h2 style="margin:0;">Clienți activi</h2>
            <p class="muted" style="margin:6px 0 0;">Portofoliu global & pipeline de plasări</p>
          </div>
          <button class="btn" id="add_client"><i data-lucide="plus"></i> Client nou</button>
        </div>
        <div class="stats-grid" style="margin-top:18px;">
          <div class="stat-card">
            <span>Total clienți</span>
            <strong>${totalClients}</strong>
            <small class="muted">${activePlacements} plasări totale</small>
          </div>
          <div class="stat-card">
            <span>Propuneri active</span>
            <strong>${proposed}</strong>
            <small class="muted">Generat din pool candidați</small>
          </div>
          <div class="stat-card">
            <span>Satisfacție estimată</span>
            <strong>92%</strong>
            <small class="muted">Ultimele feedback-uri</small>
          </div>
        </div>
        <div class="table-responsive" style="margin-top:22px;">
          <table>
            <thead><tr><th>Client</th><th>Țară</th><th>Contact</th><th>Plasări</th><th></th></tr></thead>
            <tbody>${dbClients.map(cl=>`
              <tr>
                <td><strong>${cl.name}</strong></td>
                <td>${cl.country}</td>
                <td>${cl.contact.name} • ${cl.contact.email}</td>
                <td>${cl.placements.length}</td>
                <td><button class="btn ghost" data-open="${cl.id}">Deschide</button></td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    mainContent.querySelectorAll('[data-open]').forEach(b=>{
      b.addEventListener('click',()=>openClient(b.dataset.open));
    });
    document.getElementById('add_client').addEventListener('click',createClient);
    if (window.lucide) { lucide.createIcons(); }
  }

  // ---------- Add client ----------
  function createClient(){
    mainContent.innerHTML=`
      <div class="card">
        <h2>Client nou</h2>
        <p class="muted">Completează detaliile principale pentru a adăuga un nou partener în ecosistem.</p>
        <div class="grid-two" style="margin-top:18px;">
          <label>Nume companie<input id="cl_name" class="input"></label>
          <label>Țară<input id="cl_country" class="input" value="România"></label>
          <label>Persoană contact<input id="cl_person" class="input"></label>
          <label>Email contact<input id="cl_email" class="input"></label>
        </div>
        <div style="margin-top:18px;display:flex;gap:12px;">
          <button class="btn" id="save_client">Salvează</button>
          <button class="btn ghost" id="back">Înapoi</button>
        </div>
      </div>
    `;
    document.getElementById('back').addEventListener('click',renderList);
    document.getElementById('save_client').addEventListener('click',()=>{
      const cl={
        id:'client-'+shortId(),
        name:document.getElementById('cl_name').value||'Client nou',
        country:document.getElementById('cl_country').value||'România',
        contact:{name:document.getElementById('cl_person').value||'',email:document.getElementById('cl_email').value||''},
        placements:[],
        proposed:[]
      };
      dbClients.unshift(cl);
      save(STORAGE_KEY,dbClients);
      renderList();
      alert('Client adăugat');
    });
    if (window.lucide) { lucide.createIcons(); }
  }

  // ---------- Open client ----------
  function openClient(id){
    const cl=dbClients.find(x=>x.id===id);
    if(!cl){renderList();return;}

    mainContent.innerHTML=`
      <div class="card">
        <button class="btn ghost" id="back_list">⟵ Înapoi la listă</button>
      </div>

      <div class="card" style="display:grid;grid-template-columns:2fr 1fr;gap:24px;">
        <div>
          <h2 style="margin-top:0;">${cl.name}</h2>
          <p class="muted">${cl.country} • Contact: <strong>${cl.contact.name}</strong> • ${cl.contact.email}</p>
          <div class="glass-card" style="margin-top:18px;display:flex;gap:18px;flex-wrap:wrap;">
            <div>
              <div class="muted" style="font-size:12px;text-transform:uppercase;">Propuneri active</div>
              <strong style="font-size:24px;">${cl.proposed.length}</strong>
            </div>
            <div>
              <div class="muted" style="font-size:12px;text-transform:uppercase;">Plasări</div>
              <strong style="font-size:24px;">${cl.placements.length}</strong>
            </div>
            <div class="progress-line" style="flex:1;align-self:center;"><span style="width:${Math.min(100, cl.placements.length*20)}%"></span></div>
          </div>
          <div style="margin-top:18px;display:flex;gap:12px;flex-wrap:wrap;">
            <button class="btn" id="add_prop"><i data-lucide="user-check"></i> Propune candidat</button>
            <button class="btn ghost" id="export_client"><i data-lucide="download"></i> Exportă raport</button>
          </div>
        </div>
        <div class="glass-card">
          <h3 style="margin-top:0;">Notițe rapide</h3>
          <p class="muted" style="margin:0;">Parteneriat activ pe logistică și retail. SLA de răspuns: 24h. Recomandare: trimite update săptămânal cu status pipeline.</p>
        </div>
      </div>

      <div class="card">
        <h3>Candidați propuși</h3>
        <div id="prop_list">${renderProposed(cl)}</div>
      </div>
    `;
    document.getElementById('back_list').addEventListener('click',renderList);
    document.getElementById('add_prop').addEventListener('click',()=>addProposed(cl));
    document.getElementById('export_client').addEventListener('click',()=>{
      const rows = ['client,contact_email,propuneri,plasari'];
      rows.push(`${cl.name},${cl.contact.email},${cl.proposed.length},${cl.placements.length}`);
      const txt = rows.join('\n');
      const a=document.createElement('a');
      a.href=URL.createObjectURL(new Blob([txt],{type:'text/csv;charset=utf-8;'}));
      a.download=`client_${cl.id}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    });
    if (window.lucide) { lucide.createIcons(); }
  }

  function renderProposed(cl){
    if(!cl.proposed.length) return `<div class="muted">Niciun candidat propus.</div>`;
    const stages=['Propus','Interviu','Ofertă','Angajat'];
    return cl.proposed.map(p=>{
      const pct=Math.round((stages.indexOf(p.stage)/(stages.length-1))*100);
      return `
        <div class="glass-card" style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
          <div style="min-width:220px"><strong>${p.name}</strong><div class="muted" style="font-size:12px">${p.title}</div></div>
          <div class="progress-line" style="flex:1;"><span style="width:${pct}%"></span></div>
          <div style="min-width:100px;text-align:right;font-size:12px" class="muted">${p.stage}</div>
        </div>
      `;
    }).join('');
  }

  // ---------- Add proposed candidate ----------
  function addProposed(cl){
    const opts=dbCandidates.map(c=>`<option value="${c.id}">${c.firstName} ${c.lastName} — ${c.title}</option>`).join('');
    mainContent.innerHTML=`
      <div class="card">
        <h2>Propune candidat către ${cl.name}</h2>
        <p class="muted">Selectează candidatul și etapa curentă pentru a-l trimite către client.</p>
        <div class="grid-two" style="margin-top:16px;">
          <label>Candidat
            <select id="cand_sel" class="input">${opts}</select>
          </label>
          <label>Etapă
            <select id="cand_stage" class="input">
              <option>Propus</option><option>Interviu</option><option>Ofertă</option><option>Angajat</option>
            </select>
          </label>
        </div>
        <div style="margin-top:18px;display:flex;gap:12px;">
          <button class="btn" id="save_prop">Salvează</button>
          <button class="btn ghost" id="cancel_prop">Renunță</button>
        </div>
      </div>
    `;
    document.getElementById('cancel_prop').addEventListener('click',()=>openClient(cl.id));
    document.getElementById('save_prop').addEventListener('click',()=>{
      const candId=document.getElementById('cand_sel').value;
      const stage=document.getElementById('cand_stage').value;
      const cand=dbCandidates.find(x=>x.id===candId);
      if(!cand){alert('Alege un candidat');return;}

      const p={id:'p-'+shortId(),candId,name:`${cand.firstName} ${cand.lastName}`,title:cand.title,stage};
      cl.proposed.push(p);
      cl.placements.push(p);
      save(STORAGE_KEY,dbClients);

      // adăugăm în istoric candidat
      cand.history.push({when:new Date().toISOString(),who:'Manager demo',action:`Propus către ${cl.name}`});
      const candDB=load(CAND_KEY);
      candDB.candidates=dbCandidates;
      save(CAND_KEY,candDB);

      openClient(cl.id);
      alert('Candidat propus către client');
    });
    if (window.lucide) { lucide.createIcons(); }
  }

  // Auto open clients if active
  document.addEventListener('DOMContentLoaded',()=>{
    const active=document.querySelector('.nav button.active');
    if(active && active.dataset.view==='clients'){
      setTimeout(renderList,0);
    }
  });
})();
