// ==================================
// IWF CRM v9 — Reports module (WOW)
// KPI-uri, pipeline, financiar, propuneri, comenzi
// ==================================
(function(){
  const CAND_KEY   = 'iwf_crm_v9_candidates';
  const CLIENT_KEY = 'iwf_crm_v9_clients';
  const ORDER_KEY  = 'iwf_crm_v9_orders';
  const INTREQ_KEY = 'iwf_crm_v9_internal_requests';

  const mainContent = document.getElementById('main-content');
  const nav = document.querySelector('.nav');

  // Stadii pipeline (ca în candidates.js)
  const STAGES = ['Propus','Candidat sunat','Interviu candidat','Pas interviu','Interviu final client','Propunere','Angajat'];

  // Hook pe nav
  nav.addEventListener('click', e=>{
    const b=e.target.closest('button[data-view="reports"]');
    if(!b) return;
    setTimeout(renderReports,0);
  });

  document.addEventListener('DOMContentLoaded', ()=>{
    const active=document.querySelector('.nav button.active');
    if(active && active.dataset.view==='reports'){ setTimeout(renderReports,0); }
  });

  // ---- Utils
  function load(k){ try{return JSON.parse(localStorage.getItem(k)||'null');}catch(e){return null;} }
  function sum(arr){ return arr.reduce((a,b)=>a+(+b||0),0); }
  function fmtRON(n){ n=+n||0; return n.toLocaleString('ro-RO',{style:'currency',currency:'RON',maximumFractionDigits:0}); }
  function monthKey(dt){ const d=new Date(dt); return isNaN(d)?null:(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')); }
  function lastNMonths(n){
    const out=[]; const d=new Date();
    for(let i=n-1;i>=0;i--){ const x=new Date(d.getFullYear(), d.getMonth()-i, 1); out.push(x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')); }
    return out;
  }
  function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }

  // ---- Colectare date brute din module
  function collect(){
    const candDB   = load(CAND_KEY)   || {candidates:[]};
    const clients  = load(CLIENT_KEY) || [];
    const orders   = load(ORDER_KEY)  || [];
    const intreq   = load(INTREQ_KEY) || {requests:[]};

    const candidates = candDB.candidates||[];

    // Pipeline pe baza plasărilor din profilul candidatului
    const pipeCounts = Object.fromEntries(STAGES.map(s=>[s,0]));
    let unassigned = 0; // candidați fără nicio plasare

    // Financiar: sumăm fee pentru cei cu cel puțin o plasare la "Angajat"
    let feeTotal = 0, feeCount = 0, grossTotal=0, netTotal=0;

    // Hires pe luni (din istoric / plasări cu Angajat)
    const hiresByMonth = {};

    candidates.forEach(c=>{
      const pls = c.placements || [];
      if (!pls.length){ unassigned++; }
      // Ultima etapă per candidat (dacă are mai multe plasări, luăm cea mai "sus" în pipeline)
      let bestIdx = -1;
      let bestStage = null;
      pls.forEach(p=>{
        const idx = STAGES.indexOf(p.stage);
        if (idx>bestIdx){ bestIdx=idx; bestStage=p.stage; }
        if (p.stage==='Angajat'){
          // În lipsă de dată pe plasare, încercăm din istoric momentul de "Angajat"
          const whenHist = (c.history||[]).find(h=>(h.action||'').toLowerCase().includes('angajat'));
          const mk = whenHist ? monthKey(whenHist.when) : monthKey(new Date());
          if (mk){ hiresByMonth[mk] = (hiresByMonth[mk]||0) + 1; }
          // Financiar
          const fm = c.financial || {};
          const gross = +(fm.gross || Math.round((fm.net||0)*1.43));
          const fee   = +(fm.fee   || Math.round((fm.feeMultiplier||1.3)*gross));
          feeTotal  += fee;
          grossTotal+= gross;
          netTotal  += (fm.net||0);
          feeCount++;
        }
      });
      if (bestStage){ pipeCounts[bestStage]++; }
    });

    // Propuneri din clienți (extern)
    let proposedClient = 0, stagesClient = Object.fromEntries(['Propus','Interviu','Ofertă','Angajat'].map(s=>[s,0]));
    clients.forEach(cl=>{
      const pp = cl.proposed||[];
      proposedClient += pp.length;
      pp.forEach(p=>{ if(stagesClient[p.stage]!=null) stagesClient[p.stage]++; });
    });

    // Propuneri din cereri interne (internal requests)
    let proposedInt = 0, stagesInt = Object.fromEntries(['Propus','Interviu','Ofertă','Angajat'].map(s=>[s,0]));
    (intreq.requests||[]).forEach(r=>{
      const pp = r.proposed||[];
      proposedInt += pp.length;
      pp.forEach(p=>{ if(stagesInt[p.stage]!=null) stagesInt[p.stage]++; });
    });

    // Comenzi (orders)
    const ordersActive = orders.length;
    const targetTotal  = sum(orders.map(o=>o.targetHires||0));
    const filledTotal  = sum(orders.map(o=>o.filledCount||0));
    const ordersPct    = targetTotal ? Math.round((filledTotal/targetTotal)*100) : 0;

    // Ultimele 6 luni: vector ordonat
    const months = lastNMonths(6);
    const hiresSeries = months.map(m=>hiresByMonth[m]||0);
    const maxH = Math.max(1, ...hiresSeries);

    return {
      counts: {
        totalCandidates: candidates.length,
        unassigned,
        pipeline: pipeCounts,
        proposedClient, stagesClient,
        proposedInt, stagesInt,
        ordersActive, targetTotal, filledTotal, ordersPct
      },
      finance: {
        feeTotal, feeCount, grossTotal, netTotal,
        avgFee: feeCount ? Math.round(feeTotal/feeCount) : 0
      },
      hires: { months, series: hiresSeries, max: maxH }
    };
  }

  // ---- SVG helpers (sparklines / bar mini charts)
  function svgLine(width, height, series, maxVal){
    const w=width, h=height, pad=6;
    const n=series.length;
    if(n===0) return `<svg width="${w}" height="${h}"></svg>`;
    const step=(w-2*pad)/(n-1||1);
    const pts = series.map((v,i)=>{
      const x = pad + i*step;
      const y = h-pad - (clamp(v,0,maxVal)/maxVal)*(h-2*pad);
      return `${x},${y}`;
    }).join(' ');
    return `
      <svg width="${w}" height="${h}">
        <polyline points="${pts}" fill="none" stroke="#a62091" stroke-width="2"/>
        ${series.map((v,i)=>{
          const x = pad + i*step;
          const y = h-pad - (clamp(v,0,maxVal)/maxVal)*(h-2*pad);
          return `<circle cx="${x}" cy="${y}" r="2" fill="#a62091"/>`;
        }).join('')}
      </svg>
    `;
  }

  function progressBar(pct){
    return `
      <div style="height:10px;border-radius:999px;background:#f1f1f6;overflow:hidden">
        <div style="height:100%;width:${clamp(pct,0,100)}%;background:linear-gradient(90deg,#a62091,#f59e0b,#22c55e)"></div>
      </div>
    `;
  }

  // ---- Render
  function renderReports(){
    const { counts, finance, hires } = collect();

    // KPI-uri
    const kpiHTML = `
      <div class="card" style="display:grid;grid-template-columns:repeat(4, minmax(180px,1fr));gap:12px">
        <div>
          <div class="muted">Candidați (total)</div>
          <div style="font-weight:800;font-size:28px">${counts.totalCandidates}</div>
          <div class="muted" style="font-size:12px">Fără plasare: ${counts.unassigned}</div>
        </div>
        <div>
          <div class="muted">Angajați (calcul din pipeline)</div>
          <div style="font-weight:800;font-size:28px">${counts.pipeline['Angajat']||0}</div>
          <div style="margin-top:6px">${progressBar(counts.totalCandidates ? Math.round((counts.pipeline['Angajat']||0)/counts.totalCandidates*100) : 0)}</div>
        </div>
        <div>
          <div class="muted">Fee total estimat</div>
          <div style="font-weight:800;font-size:28px">${fmtRON(finance.feeTotal)}</div>
          <div class="muted" style="font-size:12px">Medie/angajat: ${fmtRON(finance.avgFee)}</div>
        </div>
        <div>
          <div class="muted">Comenzi (progres global)</div>
          <div style="font-weight:800;font-size:28px">${counts.filledTotal}/${counts.targetTotal}</div>
          <div style="margin-top:6px">${progressBar(counts.ordersPct)}</div>
        </div>
      </div>
    `;

    // Pipeline breakdown
    const pipeTable = STAGES.map(s=>{
      const v = counts.pipeline[s]||0;
      const pct = counts.totalCandidates? Math.round(v/counts.totalCandidates*100) : 0;
      return `<tr><td>${s}</td><td>${v}</td><td>${pct}%</td><td>${progressBar(pct)}</td></tr>`;
    }).join('');

    // Propuneri (extern + intern)
    const propTable = `
      <tr><td>Propuneri către clienți</td><td>${counts.proposedClient}</td><td>—</td></tr>
      <tr><td>&nbsp;&nbsp;&nbsp;&nbsp;• Propus</td><td>${counts.stagesClient['Propus']||0}</td><td>—</td></tr>
      <tr><td>&nbsp;&nbsp;&nbsp;&nbsp;• Interviu</td><td>${counts.stagesClient['Interviu']||0}</td><td>—</td></tr>
      <tr><td>&nbsp;&nbsp;&nbsp;&nbsp;• Ofertă</td><td>${counts.stagesClient['Ofertă']||0}</td><td>—</td></tr>
      <tr><td>&nbsp;&nbsp;&nbsp;&nbsp;• Angajat</td><td>${counts.stagesClient['Angajat']||0}</td><td>—</td></tr>
      <tr><td>Propuneri cereri interne</td><td>${counts.proposedInt}</td><td>—</td></tr>
      <tr><td>&nbsp;&nbsp;&nbsp;&nbsp;• Propus</td><td>${counts.stagesInt['Propus']||0}</td><td>—</td></tr>
      <tr><td>&nbsp;&nbsp;&nbsp;&nbsp;• Interviu</td><td>${counts.stagesInt['Interviu']||0}</td><td>—</td></tr>
      <tr><td>&nbsp;&nbsp;&nbsp;&nbsp;• Ofertă</td><td>${counts.stagesInt['Ofertă']||0}</td><td>—</td></tr>
      <tr><td>&nbsp;&nbsp;&nbsp;&nbsp;• Angajat</td><td>${counts.stagesInt['Angajat']||0}</td><td>—</td></tr>
    `;

    // Hires sparkline (ultimele 6 luni)
    const spark = svgLine(320, 80, hires.series, hires.max);
    const monthsLbl = hires.months.map(m=>m.slice(5)).join('  |  ');

    // Export CSV pipeline
    function makeCSV(){
      const rows = [['stage','count','percent']];
      STAGES.forEach(s=>{
        const v=counts.pipeline[s]||0;
        const pct = counts.totalCandidates? Math.round(v/counts.totalCandidates*100) : 0;
        rows.push([s,v,pct+'%']);
      });
      const txt = rows.map(r=>r.join(',')).join('\n');
      const a=document.createElement('a');
      a.href=URL.createObjectURL(new Blob([txt],{type:'text/csv;charset=utf-8;'}));
      a.download='pipeline.csv'; a.click(); URL.revokeObjectURL(a.href);
    }

    mainContent.innerHTML = `
      <div class="card"><h2>Rapoarte & KPI — IWF CRM</h2><p class="muted">Pipeline candidați • Financiar estimat • Propuneri (extern & intern) • Comenzi</p></div>

      ${kpiHTML}

      <div class="card" style="display:grid;grid-template-columns:repeat(12,1fr);gap:16px">
        <div style="grid-column:span 7">
          <h3 style="margin-top:0">Pipeline candidați (toate plasările)</h3>
          <div style="overflow:auto">
            <table>
              <thead><tr><th>Etapă</th><th>Nr.</th><th>%</th><th>Progres</th></tr></thead>
              <tbody>${pipeTable}</tbody>
            </table>
          </div>
          <div style="margin-top:10px"><button class="btn" id="btn_csv">Export pipeline CSV</button></div>
        </div>
        <div style="grid-column:span 5">
          <h3 style="margin-top:0">Angajări (ultimele 6 luni)</h3>
          <div>${spark}</div>
          <div class="muted" style="font-size:12px;margin-top:6px">${monthsLbl}</div>
          <div style="margin-top:12px">
            <div class="muted">Total angajări (6 luni): <strong>${sum(hires.series)}</strong></div>
          </div>

          <h3 style="margin-top:18px">Financiar (estimativ)</h3>
          <div class="muted" style="font-size:14px">Total fee: <strong>${fmtRON(finance.feeTotal)}</strong></div>
          <div class="muted" style="font-size:14px">Brut total: <strong>${fmtRON(finance.grossTotal)}</strong></div>
          <div class="muted" style="font-size:14px">Net total: <strong>${fmtRON(finance.netTotal)}</strong></div>
          <div class="muted" style="font-size:12px;margin-top:6px">* Calcul estimativ: BRUT ≈ NET × 1.43 • Fee = Multiplier × BRUT</div>
        </div>
      </div>

      <div class="card" style="display:grid;grid-template-columns:repeat(12,1fr);gap:16px">
        <div style="grid-column:span 6">
          <h3 style="margin-top:0">Propuneri către clienți & cereri interne</h3>
          <div style="overflow:auto">
            <table>
              <thead><tr><th>Tip</th><th>Nr.</th><th>Detalii</th></tr></thead>
              <tbody>${propTable}</tbody>
            </table>
          </div>
        </div>
        <div style="grid-column:span 6">
          <h3 style="margin-top:0">Comenzi de recrutare — progres global</h3>
          <div class="muted">Comenzi active: <strong>${counts.ordersActive}</strong></div>
          <div class="muted">Posturi ocupate: <strong>${counts.filledTotal}</strong> din <strong>${counts.targetTotal}</strong></div>
          <div style="margin-top:8px">${progressBar(counts.ordersPct)}</div>
        </div>
      </div>
    `;

    document.getElementById('btn_csv').addEventListener('click', makeCSV);
  }
})();
