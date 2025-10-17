// Lightweight helper for the Settings view (UI 2030)
(function(){
  document.addEventListener('iwf:view-change', (event) => {
    if (event.detail?.view === 'settings') {
      console.debug('Settings view initialized (demo).');
    }
  });
})();
