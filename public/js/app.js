// public/js/app.js - Global App Initialization & Keyboard Shortcuts

document.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 OpusFlow AI Web-App initialisiert');
  Router.init();
  loadHeaderCredits();

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    // Check if user is typing in an input or textarea
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      return;
    }

    // Spacebar to Play/Pause in Editor
    if (e.code === 'Space' && window.location.hash.startsWith('#editor/')) {
      e.preventDefault();
      if (window.EditorView) EditorView.togglePlay();
    }

    // Ctrl+Z / Cmd+Z to Undo in Editor
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      if (window.location.hash.startsWith('#editor/') && window.EditorView) {
        e.preventDefault();
        EditorView.undo();
      }
    }

    // Ctrl+Y or Cmd+Shift+Z to Redo in Editor
    if (((e.ctrlKey || e.metaKey) && e.key === 'y') || ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'z')) {
      if (window.location.hash.startsWith('#editor/') && window.EditorView) {
        e.preventDefault();
        EditorView.redo();
      }
    }
  });
});

async function loadHeaderCredits() {
  const label = document.getElementById('header-credits-label');
  if (!label) return;
  try {
    const data = await API.getCredits();
    label.innerText = `${data.plan} • ${data.minutes_remaining} / ${data.minutes_total} Min.`;
  } catch (err) {
    label.innerText = 'Pro Plan';
  }
}

// Refresh header credits whenever the Billing modal closes (e.g. after a top-up)
window.addEventListener('hashchange', () => {
  if (window.BillingModal) loadHeaderCredits();
});
