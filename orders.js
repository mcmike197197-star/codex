// ==================================
// IWF CRM v9 — Orders module
// ==================================
(function(){
  const STORAGE_KEY = 'iwf_crm_v9_orders';
  const CLIENT_KEY = 'iwf_crm_v9_clients';
  const CAND_KEY = 'iwf_crm_v9_candidates';
  const mainContent = document.getElementById('main-content');
  const nav = document.querySelector('.nav');

  let dbOrders = load(STORAGE_KEY) || seedOrders();
  let dbClients = load(CLIENT_KEY) || [];
  let dbCandidates = load(CAND_KEY)?.candidates || [];

  function load(k){ try{return JSON.parse(localStorage.getItem(k)||'null');}catch(e){return null;} }
  function save(k,v){ localStorage.setItem(k,JSON.stringify(v)); }

  function seedOrders(){
    return [
      {id:'ORD-001',clientId:'client-1',title:'Operator depozit',location:'București',targetHires:4,filledCount:2,status:'Interviu',priority:'Ridicată',candidates:[]},
      {id:'ORD-002',clientId:'client-2',title:'Asistent medical',location:'Cluj-Napoca',targetHires:3,filledCount:1,status:'Deschisă',priority:'Medie',candidates:[]},
      {id:'ORD-003',clientId:'client-3',title:'Inginer software',location:'Iași',targetHires:2,filledCount:0,status:'Ofertă transmisă',priority:'Ridicată',candidates:[]}
    ];
  }

  function fmtDate(d){ const dd=new Date(d); return dd.toLocaleDateString('ro-RO'); }
  function shortId(){ return Math.random().toString(36).substring(2,8); }

  // Attach nav click
  nav.addEventListener('click', e=>{
    const btn=e.target.closest('button[data-view="orders"]');
    if(!btn) return;
    setTimeout(renderList,0);
  });

  // ---------- Main list ----------
  function renderList(){
    mainContent.innerHTML=`
      <div class="card">
        <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
          <h2 style="margin:0">Comenzi de recrutare</h2>
          <button class="btn" id="add_order">Adaugă comandă</button>
        </div>
        <div style="margin-top:10px;overflow:auto">
          <table>
            <thead>
              <tr><th>ID</th><th>Client</th><th>Titlu</th><th>Locație</th><th>Posturi</th><th>Status</th><th>Progres</th><th></th></tr>
            </thead>
            <tbody>
              ${dbOrders.map(o=>{
                const client=dbClients.find(c=>c.id===o.clientId)?.name || '—';
                const pct=Math.round((o.filledCount/o.targetHires)*100);
                return `
                  <tr>
                    <td><strong>${o.id}</strong></td>
                    <td>${client}</td>
                    <td>${o.title}</td>
                    <td>${o.location}</td>
                    <td>${o.filledCount}/${o.targetHires}</td>
                    <td>${o.status}</td>
                    <td>
                      <div style="height:8px;border-radius:999px;background:#eee;overflow:hidden">
                        <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#a62091,#f59e0b,#22c55e)"></div>
                      </div>
                    </td>
                    <td><button class="btn" data-open="${o.id}">Deschide</button></td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    mainContent.querySelectorAll('[data-open]').forEach(b=>{
      b.addEventListener('click',()=>openOrder(b.dataset.open));
    });
    document.getElementById('add_order').addEventListener('click',createOrder);
  }

  // ---------- Create order ----------
  function createOrder(){
    const opts=dbClients.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
    mainContent.innerHTML=`
      <div class="card">
        <h2>Comandă nouă</h2>
        <div style="display:grid;grid-template-columns:repeat(2,minmax(220px,1fr));gap:10px">
          <label>Client<select id="ord_client" class="input">${opts}</select></label>
          <label>Titlu poziție<input id="ord_title" class="input"></label>
          <label>Locație<input id="ord_loc" class="input" value="România"></label>
          <label>Număr posturi<input id="ord_targets" type="number" class="input" value="1"></label>
          <label>Prioritate<select id="ord_prio" class="input"><option>Ridicată</option><option>Medie</option><option>Scăzută</option></select></label>
          <label>Status<select id="ord_status" class="input"><option>Deschisă</option><option>Interviu</option><option>Ofertă transmisă</option><option>Completă</option></select></label>
        </div>
        <div style="margin-top:12px"><button class="btn" id="save_order">Salvează</button> <button class="btn" id="back">Înapoi</button></div>
      </div>
    `;
    document.getElementById('back').addEventListener('click',renderList);
    document.getElementById('save_order').addEventListener('click',()=>{
      const o={
        id:'ORD-'+shortId(),
        clientId:document.getElementById('ord_client').value,
        title:document.getElementById('ord_title').value||'Poziție nouă',
        location:document.getElementById('ord_loc').value||'România',
        targetHires:parseInt(document.getElementById('ord_targets').value)||1,
        filledCount:0,
        status:document.getElementById('ord_status').value,
        priority:document.getElementById('ord_prio').value,
        candidates:[]
      };
      dbOrders.unshift(o);
      save(STORAGE_KEY,dbOrders);
      alert('Comandă creată');
      renderList();
    });
  }

  // ---------- Open order ----------
  function openOrder(id){
    const o=dbOrders.find(x=>x.id===id);
    if(!o){renderList();return;}
    const client=dbClients.find(c=>c.id===o.clientId);
    mainContent.innerHTML=`
      <div class="card">
        <button class="btn" id="back_list">⟵ Înapoi la comenzi</button>
      </div>

      <div class="card">
        <h2>${o.title}</h2>
        <p class="muted">${client?.name || '—'} • ${o.location}</p>
        <p>Status: <strong>${o.status}</strong> • Prioritate: <strong>${o.priority}</strong></p>
        <p>Posturi: ${o.filledCount}/${o.targetHires}</p>
        <div style="height:8px;border-radius:999px;background:#eee;overflow:hidden">
          <div style="height:100%;width:${Math.round((o.filledCount/o.targetHires)*100)}%;background:linear-gradient(90deg,#a62091,#f59e0b,#22c55e)"></div>
        </div>
        <div style="margin-top:12px"><button class="btn" id="add_cand">Asociază candidat</button></div>
      </div>

      <div class="card">
        <h3>Candidați asociați</h3>
        <div id="assoc_list">${renderAssoc(o)}</div>
      </div>
    `;
    document.getElementById('back_list').addEventListener('click',renderList);
    document.getElementById('add_cand').addEventListener('click',()=>associateCandidate(o));
  }

  function renderAssoc(o){
    if(!o.candidates.length) return `<div class="muted">Niciun candidat asociat.</div>`;
    return o.candidates.map(cid=>{
      const c=dbCandidates.find(x=>x.id===cid);
      if(!c) return '';
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee">
          <div><strong>${c.firstName} ${c.lastName}</strong><div class="muted" style="font-size:12px">${c.title}</div></div>
          <span class="badge success">Asociat</span>
        </div>
      `;
    }).join('');
  }

  // ---------- Associate candidate ----------
  function associateCandidate(o){
    const opts=dbCandidates.map(c=>`<option value="${c.id}">${c.firstName} ${c.lastName} — ${c.title}</option>`).join('');
    mainContent.innerHTML=`
      <div class="card">
        <h2>Asociază candidat la ${o.title}</h2>
        <label>Candidat<select id="cand_sel" class="input">${opts}</select></label>
        <div style="margin-top:10px"><button class="btn" id="save_assoc">Salvează</button> <button class="btn" id="cancel_assoc">Renunță</button></div>
      </div>
    `;
    document.getElementById('cancel_assoc').addEventListener('click',()=>openOrder(o.id));
    document.getElementById('save_assoc').addEventListener('click',()=>{
      const candId=document.getElementById('cand_sel').value;
      if(!candId){alert('Selectează un candidat');return;}
      if(!o.candidates.includes(candId)){
        o.candidates.push(candId);
        o.filledCount=Math.min(o.targetHires,o.filledCount+1);
      }
      save(STORAGE_KEY,dbOrders);
      const cand=dbCandidates.find(c=>c.id===candId);
      if(cand){
        cand.history.push({when:new Date().toISOString(),who:'Manager demo',action:`Asociat la ${o.title}`});
        const cdb=load(CAND_KEY);
        cdb.candidates=dbCandidates;
        save(CAND_KEY,cdb);
      }
      alert('Candidat asociat');
      openOrder(o.id);
    });
  }

  document.addEventListener('DOMContentLoaded',()=>{
    const active=document.querySelector('.nav button.active');
    if(active && active.dataset.view==='orders'){
      setTimeout(renderList,0);
    }
  });
})();
