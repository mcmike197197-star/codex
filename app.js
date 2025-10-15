// ===========================
// IWF CRM v9 - Logica principală
// ===========================

// Elemente
const login = document.getElementById('login');
const app = document.getElementById('app');
const btn = document.getElementById('btn-enter');
const spinner = document.getElementById('spinner');
const nav = document.querySelector('.nav');
const mainContent = document.getElementById('main-content');

// ===========================
// Login și tranziție
// ===========================
btn.addEventListener('click', () => {
  spinner.style.display = 'block';
  setTimeout(() => {
    spinner.style.display = 'none';
    login.style.display = 'none';
    app.style.display = 'flex';
    showView('dashboard');
  }, 1000);
});

// ===========================
// Navigare
// ===========================
nav.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const view = btn.dataset.view;
  document.querySelectorAll('.nav button').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  showView(view);
});

// ===========================
// Funcții principale
// ===========================
function showView(view) {
  if (view === 'dashboard') {
    mainContent.innerHTML = `
      <div class="card">
        <h2>Panou principal</h2>
        <p>Bine ai venit în platforma de recrutare IWF CRM v9!</p>
        <p>Aici vei vedea statistici și rapoarte generale despre candidați, clienți și comenzi.</p>
      </div>
    `;
  }

  if (view === 'candidates') {
    mainContent.innerHTML = `
      <div class="card">
        <h2>Candidați</h2>
        <p>Gestionare candidați externi și interni. (Funcționalități extinse urmează)</p>
      </div>
    `;
  }

  if (view === 'clients') {
    mainContent.innerHTML = `
      <div class="card">
        <h2>Clienți</h2>
        <p>Listă companii partenere, contacte și plasamente asociate.</p>
      </div>
    `;
  }

  if (view === 'orders') {
    mainContent.innerHTML = `
      <div class="card">
        <h2>Comenzi</h2>
        <p>Monitorizare comenzi de recrutare și status plasări.</p>
      </div>
    `;
  }

  if (view === 'requests') {
    mainContent.innerHTML = `
      <div class="card">
        <h2>Cereri interne</h2>
        <p>Solicitări din cadrul echipei și aprobare.</p>
      </div>
    `;
  }

  if (view === 'reports') {
    mainContent.innerHTML = `
      <div class="card">
        <h2>Rapoarte</h2>
        <p>Analize, grafice și performanță globală. (Integrare ulterioară API)</p>
      </div>
    `;
  }

  if (view === 'settings') {
    mainContent.innerHTML = `
      <div class="card">
        <h2>Setări</h2>
        <p>Configurare aplicație, culori și pregătire conexiune backend.</p>
        <button class="btn" onclick="resetDemo()">Resetare demo</button>
      </div>
    `;
  }
}

// ===========================
// Resetare demo (șterge localStorage)
// ===========================
function resetDemo() {
  localStorage.clear();
  alert('Datele demo au fost resetate.');
  location.reload();
}
