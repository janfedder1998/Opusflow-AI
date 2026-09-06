// public/js/router.js - Client-Side Hash Router

const Router = {
  routes: {},

  init() {
    window.addEventListener('hashchange', () => this.handleRoute());
    this.handleRoute();
  },

  async handleRoute() {
    const hash = window.location.hash.slice(1) || 'home';
    const container = document.getElementById('app-container');
    if (!container) return;

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Cancel any running animations from previous views
    if (window.EditorView && EditorView.animationFrameId) {
      cancelAnimationFrame(EditorView.animationFrameId);
    }

    // Update active nav links
    const routeBase = hash.split('/')[0];
    document.querySelectorAll('.nav-item').forEach(el => {
      const targetNav = el.dataset.nav;
      if (targetNav === routeBase) {
        el.classList.add('active');
      } else {
        el.classList.remove('active');
      }
    });

    container.style.opacity = '0';
    container.style.transform = 'translateY(6px)';
    container.style.transition = 'all 0.18s ease-out';

    let html = '';
    let afterRenderCallback = null;

    if (hash === 'home' || hash === '') {
      html = ImporterView.render();
    } else if (hash === 'dashboard') {
      html = await DashboardView.render();
    } else if (hash === 'projects') {
      html = await ProjectsListView.render();
    } else if (hash.startsWith('project/')) {
      const projectId = hash.split('/')[1];
      html = await ProjectView.render(projectId);
    } else if (hash.startsWith('editor/')) {
      const clipId = hash.split('/')[1];
      html = await EditorView.render(clipId);
      afterRenderCallback = () => EditorView.initAfterRender();
    } else if (hash === 'templates') {
      html = TemplatesView.render();
    } else if (hash === 'schedule') {
      html = await SchedulerView.render();
    } else if (hash === 'team') {
      html = await TeamView.render();
    } else if (hash === 'settings') {
      html = await SettingsView.render();
    } else {
      html = ImporterView.render();
    }

    container.innerHTML = html;

    // Fade in
    requestAnimationFrame(() => {
      container.style.opacity = '1';
      container.style.transform = 'translateY(0)';
      if (afterRenderCallback) {
        afterRenderCallback();
      }
    });
  }
};
