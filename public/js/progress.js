// public/js/progress.js - Multi-Step AI Analysis Progress Visualizer

const ProgressModal = {
  activeProjectId: null,
  pollTimer: null,

  start(projectId) {
    this.activeProjectId = projectId;
    const modal = document.getElementById('analysis-modal');
    modal.classList.remove('hidden');

    this.resetMilestones();
    this.updateProgress(5, "Initialisiere KI-Pipeline...");

    // Trigger backend analysis
    API.analyzeProject(projectId).catch(err => {
      console.warn("Analysis trigger response:", err);
    });

    // Start polling status
    this.pollStatus();
  },

  resetMilestones() {
    for (let i = 1; i <= 6; i++) {
      const el = document.getElementById(`step-item-${i}`);
      if (el) {
        el.className = "flex items-center gap-3 text-slate-400 transition-colors";
        el.querySelector('.status-icon').innerHTML = "○";
        el.querySelector('.status-icon').className = "status-icon w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border border-slate-600";
      }
    }
  },

  updateProgress(percent, stepText) {
    const bar = document.getElementById('analysis-bar');
    const percentEl = document.getElementById('analysis-percent');
    const stepEl = document.getElementById('analysis-step-name');

    if (bar) bar.style.width = `${percent}%`;
    if (percentEl) percentEl.innerText = `${percent}%`;
    if (stepEl && stepText) stepEl.innerText = stepText;

    // Update milestones based on progress
    this.setMilestone(1, percent >= 15, percent < 30);
    this.setMilestone(2, percent >= 32, percent >= 30 && percent < 50);
    this.setMilestone(3, percent >= 54, percent >= 50 && percent < 70);
    this.setMilestone(4, percent >= 72, percent >= 70 && percent < 85);
    this.setMilestone(5, percent >= 88, percent >= 85 && percent < 95);
    this.setMilestone(6, percent >= 98, percent >= 95 && percent < 100);
  },

  setMilestone(stepIndex, isCompleted, isInProgress) {
    const el = document.getElementById(`step-item-${stepIndex}`);
    if (!el) return;

    const icon = el.querySelector('.status-icon');
    if (isCompleted) {
      el.className = "flex items-center gap-3 text-emerald-400 font-medium transition-colors";
      icon.className = "status-icon w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40";
      icon.innerHTML = "✓";
    } else if (isInProgress) {
      el.className = "flex items-center gap-3 text-purple-300 font-semibold transition-colors";
      icon.className = "status-icon w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/40 animate-pulse";
      icon.innerHTML = "●";
    } else {
      el.className = "flex items-center gap-3 text-slate-500 transition-colors";
      icon.className = "status-icon w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold border border-slate-700";
      icon.innerHTML = "○";
    }
  },

  async pollStatus() {
    if (this.pollTimer) clearTimeout(this.pollTimer);

    try {
      const data = await API.getProjectStatus(this.activeProjectId);
      const progress = data.progress || 0;
      const step = data.current_step || "Verarbeitung...";

      this.updateProgress(progress, step);

      if (data.status === 'completed' || progress >= 100) {
        this.updateProgress(100, "Fertiggestellt!");
        setTimeout(() => {
          this.close();
          window.location.hash = `#project/${this.activeProjectId}`;
          API.showToast("Highlights erfolgreich generiert!", "success");
        }, 800);
        return;
      }

      if (data.status === 'error') {
        this.close();
        API.showToast("Fehler bei der Analyse: " + (data.current_step || "Unbekannter Fehler"), "error");
        return;
      }

      // Continue polling
      this.pollTimer = setTimeout(() => this.pollStatus(), 700);

    } catch (err) {
      console.warn("Poll error, retrying...", err);
      this.pollTimer = setTimeout(() => this.pollStatus(), 1200);
    }
  },

  close() {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    const modal = document.getElementById('analysis-modal');
    if (modal) modal.classList.add('hidden');
    this.activeProjectId = null;
  }
};

window.ProgressModal = ProgressModal;
