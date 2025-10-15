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
    mainContent.innerHTML=`
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <h2 style="margin:0">Clienți activi</h2>
          <button class="btn" id="add_client">Adaugă client</button>
        </div>
        <div style="margin-top:10px;overflow:auto">
          <table>
            <thead><tr><th>Client</th><th>Țară</th><th>Contact</th><th>Plasări</th><th></th></tr></thead>
            <tbody>${dbClients.map(cl=>`
              <tr>
                <td><strong>${cl.name}</strong></td>
                <td>${cl.country}</td>
                <td>${cl.contact.name} • ${cl.contact.email}</td>
                <td>${cl.placements.length}</td>
                <td><button class="btn" data-open="${cl.id}">Deschide</button></td>
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
  }

  // ---------- Add client ----------
  function createClient(){
    mainContent.innerHTML=`
      <div class="card">
        <h2>Client nou</h2>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(220px,1fr));gap:10px">
          <label>Nume companie<input id="cl_name" class="input"></label>
          <label>Țară<input id="cl_country" class="input" value="România"></label>
          <label>Persoană contact<input id="cl_person" class="input"></label>
          <label>Email contact<input id="cl_email" class="input"></label>
        </div>
        <div style="margin-top:12px"><button class="btn" id="save_client">Salvează</button> <button class="btn" id="back">Înapoi</button></div>
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
  }

  // ---------- Open client ----------
  function openClient(id){
    const cl=dbClients.find(x=>x.id===id);
    if(!cl){renderList();return;}

    mainContent.innerHTML=`
      <div class="card">
        <button class="btn" id="back_list">⟵ Înapoi la listă</button>
      </div>

      <div class="card">
        <h2>${cl.name}</h2>
        <p class="muted">Țară: ${cl.country}</p>
        <p>Contact: <strong>${cl.contact.name}</strong> • ${cl.contact.email}</p>
        <div style="margin-top:10px"><button class="btn" id="add_prop">Propune candidat</button></div>
      </div>

      <div class="card">
        <h3>Candidați propuși</h3>
        <div id="prop_list">${renderProposed(cl)}</div>
      </div>
    `;
    document.getElementById('back_list').addEventListener('click',renderList);
    document.getElementById('add_prop').addEventListener('click',()=>addProposed(cl));
  }

  function renderProposed(cl){
    if(!cl.proposed.length) return `<div class="muted">Niciun candidat propus.</div>`;
    const stages=['Propus','Interviu','Ofertă','Angajat'];
    return cl.proposed.map(p=>{
      const pct=Math.round((stages.indexOf(p.stage)/(stages.length-1))*100);
      return `
        <div style="display:flex;align-items:center;gap:10px;margin:6px 0">
          <div style="min-width:220px"><strong>${p.name}</strong><div class="muted" style="font-size:12px">${p.title}</div></div>
          <div style="flex:1;height:8px;border-radius:999px;background:linear-gradient(90deg,#d946ef,#f59e0b,#22c55e);position:relative">
            <div style="position:absolute;top:0;bottom:0;width:2px;background:#fff;left:${pct}%;box-shadow:0 0 0 2px rgba(255,255,255,.3)"></div>
          </div>
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
        <label>Candidat
          <select id="cand_sel" class="input">${opts}</select>
        </label>
        <label>Etapă
          <select id="cand_stage" class="input">
            <option>Propus</option><option>Interviu</option><option>Ofertă</option><option>Angajat</option>
          </select>
        </label>
        <div style="margin-top:10px"><button class="btn" id="save_prop">Salvează</button> <button class="btn" id="cancel_prop">Renunță</button></div>
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
  }

  // Auto open clients if active
  document.addEventListener('DOMContentLoaded',()=>{
    const active=document.querySelector('.nav button.active');
    if(active && active.dataset.view==='clients'){
      setTimeout(renderList,0);
    }
  });
})();
