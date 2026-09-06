// public/js/project.js - Project Overview, Clip Cards & Batch Export

const ProjectView = {
  currentProject: null,
  activeFilter: 'all',

  async render(projectId) {
    try {
      const project = await API.getProject(projectId);
      this.currentProject = project;

      const durationStr = this.formatTime(project.duration);
      const clips = project.clips || [];

      // Sort clips by score descending
      clips.sort((a, b) => b.score - a.score);

      const clipsHtml = clips.length > 0
        ? clips.map(clip => this.renderClipCard(clip)).join('')
        : `<div class="col-span-full py-12 text-center text-slate-500">Keine Clips gefunden. Starte die Analyse erneut.</div>`;

      return `
        <div class="max-w-7xl mx-auto space-y-8">
          
          <!-- Back Link & Header -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <a href="#projects" class="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-400 hover:text-purple-300 mb-2">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
                Zurück zu allen Projekten
              </a>
              <h1 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
                ${this.escapeHtml(project.title)}
                <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ${project.clips_count || clips.length} Clips generiert
                </span>
              </h1>
              <div class="flex items-center gap-3 text-xs text-slate-400 mt-1">
                <span>Dauer: <strong class="text-slate-200">${durationStr}</strong></span>
                <span>•</span>
                <span>Quelle: <strong class="text-slate-200 uppercase">${project.source_type}</strong></span>
                <span>•</span>
                <span>Erstellt: <strong class="text-slate-200">${new Date(project.created_at).toLocaleDateString('de-DE')}</strong></span>
              </div>
            </div>

            <!-- Header Action Buttons -->
            <div class="flex items-center gap-3 flex-wrap">
              <button 
                onclick="ProjectView.downloadAllZip()" 
                class="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all active:scale-[0.98]"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                Alle Clips herunterladen (.ZIP)
              </button>
              <button 
                onclick="ProjectView.reAnalyze('${project.id}')"
                class="px-3.5 py-2.5 rounded-xl font-medium text-xs bg-[#181C2B] hover:bg-slate-800 text-slate-300 border border-white/[0.08] transition-all flex items-center gap-1.5"
                title="Erneut analysieren"
              >
                <svg class="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                Neu analysieren
              </button>
              <button 
                onclick="ProjectView.deleteCurrentProject('${project.id}')"
                class="p-2.5 rounded-xl text-slate-400 hover:text-red-400 hover:bg-red-500/10 border border-white/[0.08] transition-all"
                title="Projekt löschen"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>

          <!-- Original Video Banner & Stats -->
          <div class="glass-card p-4 sm:p-6 border border-white/[0.08] grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
            <div class="relative rounded-xl overflow-hidden bg-black/60 aspect-video flex items-center justify-center border border-white/[0.05] group">
              <img src="${project.thumbnail_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80'}" class="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity">
              <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex items-end p-4">
                <span class="px-2.5 py-1 rounded bg-black/80 backdrop-blur text-xs font-mono font-bold text-white border border-white/10">
                  Original: ${durationStr}
                </span>
              </div>
            </div>
            
            <div class="lg:col-span-2 space-y-3">
              <div class="flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span class="text-xs font-bold uppercase tracking-wider text-emerald-400">Analyse Abgeschlossen</span>
              </div>
              <h3 class="text-xl font-bold text-white">KI-Highlight-Auswertung</h3>
              <p class="text-sm text-slate-300 leading-relaxed">
                OpusFlow hat das Videomaterial ausgewertet. Die besten Momente wurden mit viralem Score bewertet und automatisch in 9:16 vertikale Shorts mit synchronisierten Untertiteln konvertiert.
              </p>
              <div class="flex items-center gap-4 pt-2 text-xs text-slate-400">
                <div class="flex items-center gap-1.5">
                  <span class="text-purple-400 font-bold">Top Score:</span>
                  <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">${clips[0] ? clips[0].score : 95}/100</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="text-purple-400 font-bold">Durchschnitt:</span>
                  <span class="text-slate-200 font-semibold">${(clips.reduce((acc, c) => acc + c.score, 0) / (clips.length || 1)).toFixed(1)}/100</span>
                </div>
                <div class="flex items-center gap-1.5">
                  <span class="text-purple-400 font-bold">Untertitel:</span>
                  <span class="text-slate-200">Wortgenau (Karaoke)</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Section Title & Filter Tabs -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <div>
              <h2 class="text-xl font-bold text-white tracking-tight">Generierte Clips (${clips.length})</h2>
              <p class="text-xs text-slate-400">Sortiert nach berechnetem Viral-Potenzial für TikTok, Instagram Reels & YouTube Shorts</p>
            </div>
            <div class="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button onclick="ProjectView.filterClips('all', event)" class="filter-btn active px-3 py-1.5 rounded-lg text-xs font-semibold bg-purple-600 text-white transition-all">Alle</button>
              <button onclick="ProjectView.filterClips('Controversy', event)" class="filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#181C2B] text-slate-300 hover:text-white transition-all">Kontroverse</button>
              <button onclick="ProjectView.filterClips('Hook', event)" class="filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#181C2B] text-slate-300 hover:text-white transition-all">Starker Hook</button>
              <button onclick="ProjectView.filterClips('Key Insight', event)" class="filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#181C2B] text-slate-300 hover:text-white transition-all">Insight</button>
              <button onclick="ProjectView.filterClips('Story', event)" class="filter-btn px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#181C2B] text-slate-300 hover:text-white transition-all">Story</button>
            </div>
          </div>

          <!-- Clips Grid (Cards) -->
          <div id="clips-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${clipsHtml}
          </div>

        </div>
      `;
    } catch (err) {
      return `
        <div class="text-center py-16">
          <div class="text-red-400 text-lg font-bold mb-2">Projekt konnte nicht geladen werden</div>
          <p class="text-sm text-slate-400 mb-4">${err.message}</p>
          <a href="#projects" class="px-4 py-2 rounded-xl text-sm font-semibold bg-purple-600 text-white">Zurück zur Übersicht</a>
        </div>
      `;
    }
  },

  renderClipCard(clip) {
    const startFmt = this.formatTime(clip.start_time);
    const endFmt = this.formatTime(clip.end_time);
    const durationSec = Math.round(clip.end_time - clip.start_time);

    let scoreClass = 'score-badge-high';
    if (clip.score >= 90) scoreClass = 'score-badge-viral';
    else if (clip.score < 80) scoreClass = 'score-badge-medium';

    const catBadgeClass = this.getCategoryClass(clip.category);

    return `
      <div class="glass-card flex flex-col justify-between overflow-hidden group hover:-translate-y-1 transition-all duration-300 border border-white/[0.08]" data-category="${clip.category || 'Hook'}">
        
        <!-- Video Preview Container -->
        <div class="relative bg-black aspect-[9/14] sm:aspect-[9/13] overflow-hidden flex items-center justify-center">
          
          <!-- Background Visual Thumbnail -->
          <img 
            src="${this.currentProject.thumbnail_url || 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80'}" 
            class="w-full h-full object-cover opacity-75 group-hover:scale-105 transition-transform duration-500"
          />

          <!-- Live Caption Overlay Preview (OpusClip Style) -->
          <div class="absolute inset-x-4 bottom-14 text-center pointer-events-none">
            <div class="caption-preset-${clip.caption_preset || 'viral'} inline-block text-sm px-3 py-1.5 rounded-lg">
              <span class="active-word">„${this.escapeHtml(clip.title)}“</span>
            </div>
          </div>

          <!-- Top Overlay: Viral Score & Category -->
          <div class="absolute top-3 inset-x-3 flex items-center justify-between z-10">
            <span class="cat-badge ${catBadgeClass}">${clip.category || 'Hook'}</span>
            <div class="px-2.5 py-1 rounded-full text-xs font-black tracking-tight ${scoreClass}">
              ★ ${clip.score}/100
            </div>
          </div>

          <!-- Bottom Time Range Overlay -->
          <div class="absolute bottom-3 inset-x-3 flex items-center justify-between z-10">
            <span class="px-2 py-0.5 rounded bg-black/80 backdrop-blur text-[11px] font-mono text-slate-200 border border-white/10">
              ${startFmt} – ${endFmt} (${durationSec}s)
            </span>
            <span class="px-2 py-0.5 rounded bg-purple-900/80 backdrop-blur text-[11px] font-bold text-purple-200 uppercase border border-purple-500/30">
              ${clip.aspect_ratio || '9:16'}
            </span>
          </div>

          <!-- Hover Play Overlay Button -->
          <div 
            onclick="window.location.hash = '#editor/${clip.id}'"
            class="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer backdrop-blur-[2px]"
          >
            <div class="w-14 h-14 rounded-full bg-purple-600/90 text-white flex items-center justify-center shadow-xl shadow-purple-600/50 hover:scale-110 transition-transform">
              <svg class="w-7 h-7 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
          </div>

        </div>

        <!-- Card Content Body -->
        <div class="p-5 flex-1 flex flex-col justify-between bg-[#121520]/95">
          <div>
            <h3 class="text-base font-bold text-white tracking-tight mb-2 line-clamp-2 group-hover:text-purple-300 transition-colors">
              ${this.escapeHtml(clip.title)}
            </h3>
            <p class="text-xs text-slate-400 mb-4 line-clamp-2 leading-relaxed">
              ${this.escapeHtml(clip.reason || 'Optimaler Clip-Ausschnitt mit hoher Zuschauerbindung in den ersten Sekunden.')}
            </p>
          </div>

          <!-- Card Action Buttons -->
          <div class="grid grid-cols-3 gap-1.5 pt-2 border-t border-white/[0.06]">
            <a 
              href="#editor/${clip.id}"
              class="py-2.5 px-2 rounded-xl text-[11px] font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all flex items-center justify-center gap-1 shadow-sm shadow-purple-600/30 text-center"
            >
              <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
              Editor
            </a>
            <button 
              onclick="SocialModal.open('${clip.id}', '${this.currentProject.id}')"
              class="py-2.5 px-2 rounded-xl text-[11px] font-bold bg-[#1A1E2E] hover:bg-slate-800 text-purple-300 border border-purple-500/30 transition-all flex items-center justify-center gap-1"
              title="Social Media Post & Hashtags"
            >
              <span>📱 Post</span>
            </button>
            <button 
              onclick="ProjectView.downloadSingleClip('${clip.id}')"
              class="py-2.5 px-2 rounded-xl text-[11px] font-bold bg-[#1A1E2E] hover:bg-slate-800 text-slate-200 border border-white/[0.08] transition-all flex items-center justify-center gap-1"
            >
              <svg class="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              MP4
            </button>
          </div>

        </div>

      </div>
    `;
  },

  filterClips(category, evt) {
    this.activeFilter = category;
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('bg-purple-600', 'text-white');
      btn.classList.add('bg-[#181C2B]', 'text-slate-300');
    });
    const target = (evt && evt.target) || event.target;
    target.classList.add('bg-purple-600', 'text-white');
    target.classList.remove('bg-[#181C2B]', 'text-slate-300');

    const cards = document.querySelectorAll('#clips-grid > div');
    cards.forEach(card => {
      if (category === 'all' || card.dataset.category === category) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  },

  async downloadSingleClip(clipId) {
    const clip = (this.currentProject.clips || []).find(c => c.id === clipId);
    if (!clip) return;

    API.showToast(`Erstelle MP4-Download für "${clip.title}"...`, 'info');

    // Trigger video synthesis or download
    EditorView.exportClipDirectly(clip, this.currentProject);
  },

  async downloadAllZip() {
    if (!this.currentProject || !this.currentProject.clips || this.currentProject.clips.length === 0) {
      API.showToast('Keine Clips zum Herunterladen vorhanden', 'error');
      return;
    }

    API.showToast('Erstelle ZIP-Archiv für alle Clips...', 'info');

    const zip = new MiniZip();

    // Add metadata summary
    const summaryText = `OpusFlow AI - Clip Export\nProjekt: ${this.currentProject.title}\nGeneriert am: ${new Date().toLocaleString('de-DE')}\nAnzahl Clips: ${this.currentProject.clips.length}\n\n` +
      this.currentProject.clips.map((c, i) => 
        `Clip #${i+1}: ${c.title}\nScore: ${c.score}/100\nKategorie: ${c.category}\nZeit: ${this.formatTime(c.start_time)} - ${this.formatTime(c.end_time)}\nTranskript: ${c.transcript_json || ''}\n----------------------------------`
      ).join('\n\n');

    zip.addFile("README_Export_Info.txt", summaryText);

    // Add each clip transcript & subtitle track
    this.currentProject.clips.forEach((c, idx) => {
      const cleanName = c.title.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
      const filename = `Clip_${idx + 1}_Score_${c.score}_${cleanName}.txt`;
      zip.addFile(filename, `Titel: ${c.title}\nScore: ${c.score}/100\nStart: ${c.start_time}s\nEnde: ${c.end_time}s\nFormat: ${c.aspect_ratio}\nTranskript:\n${c.transcript_json || ''}`);
    });

    const safeTitle = this.currentProject.title.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 25);
    zip.download(`OpusFlow_${safeTitle}_Clips.zip`);
    API.showToast('ZIP-Archiv erfolgreich heruntergeladen!', 'success');
  },

  async reAnalyze(projectId) {
    if (confirm("Möchtest du dieses Video wirklich neu analysieren lassen? Bisherige Clips werden aktualisiert.")) {
      ProgressModal.start(projectId);
    }
  },

  async deleteCurrentProject(projectId) {
    if (confirm("Möchtest du dieses Projekt und alle zugehörigen Clips unwiderruflich löschen?")) {
      try {
        await API.deleteProject(projectId);
        API.showToast("Projekt gelöscht", "success");
        window.location.hash = "#projects";
      } catch (err) {
        API.showToast("Fehler beim Löschen: " + err.message, "error");
      }
    }
  },

  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  getCategoryClass(cat) {
    switch (cat) {
      case 'Hook': return 'cat-hook';
      case 'Story': return 'cat-story';
      case 'Controversy': return 'cat-controversy';
      case 'Key Insight': return 'cat-insight';
      case 'Emotional': return 'cat-emotional';
      default: return 'cat-hook';
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};

const ProjectsListView = {
  async render() {
    try {
      const projects = await API.getProjects();

      const projectsGrid = (projects || []).map(p => `
        <div onclick="window.location.hash = '#project/${p.id}'" class="glass-card flex flex-col justify-between overflow-hidden cursor-pointer group hover:-translate-y-1 transition-all duration-300 border border-white/[0.08]">
          <div class="relative aspect-video bg-slate-900 overflow-hidden">
            <img src="${p.thumbnail_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80'}" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
            <span class="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/80 text-xs font-mono text-white">
              ${ProjectView.formatTime(p.duration)}
            </span>
            <span class="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-600/80 text-white backdrop-blur">
              ${p.source_type}
            </span>
          </div>
          <div class="p-5 flex-1 flex flex-col justify-between">
            <div>
              <h3 class="text-base font-bold text-white group-hover:text-purple-300 transition-colors line-clamp-2 mb-2">
                ${ProjectView.escapeHtml(p.title)}
              </h3>
              <p class="text-xs text-slate-400 mb-4">
                Erstellt am ${new Date(p.created_at).toLocaleDateString('de-DE')}
              </p>
            </div>
            <div class="flex items-center justify-between pt-3 border-t border-white/[0.06] text-xs">
              <span class="font-bold text-purple-400">${p.clips_count || 0} Clips generiert</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold ${p.status === 'completed' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-purple-500/20 text-purple-300'}">
                ${p.status === 'completed' ? 'Bereit' : 'In Bearbeitung'}
              </span>
            </div>
          </div>
        </div>
      `).join('') || `<div class="col-span-full py-16 text-center text-slate-500">Noch keine Projekte angelegt.</div>`;

      return `
        <div class="space-y-6">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 class="text-3xl font-extrabold text-white tracking-tight">Meine Video-Projekte</h1>
              <p class="text-sm text-slate-400 mt-1">Alle importierten Videos und deren generierte Social Media Highlight-Clips.</p>
            </div>
            <a href="#home" class="px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 flex items-center gap-2">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Neues Video importieren
            </a>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            ${projectsGrid}
          </div>
        </div>
      `;
    } catch (err) {
      return `<div class="p-8 text-center text-red-400">Fehler beim Laden der Projekte: ${err.message}</div>`;
    }
  }
};

