// public/js/dashboard.js - SaaS Dashboard View (Stats, Recent Projects & Storage Meter)

const DashboardView = {
  async render() {
    try {
      const [stats, projects] = await Promise.all([
        API.getStats(),
        API.getProjects()
      ]);

      const storagePercent = Math.min(100, Math.round((stats.storage_mb / (stats.storage_limit_mb || 500)) * 100));

      const recentProjectsHtml = (projects || []).slice(0, 4).map(p => `
        <div onclick="window.location.hash = '#project/${p.id}'" class="glass-card p-4 flex items-center justify-between gap-4 cursor-pointer hover:border-purple-500/40 transition-all group">
          <div class="flex items-center gap-3.5 min-w-0">
            <div class="relative w-16 h-12 rounded-lg bg-slate-800 overflow-hidden flex-shrink-0">
              <img src="${p.thumbnail_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80'}" class="w-full h-full object-cover group-hover:scale-105 transition-transform">
              <span class="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/80 text-[8px] font-mono text-white">
                ${this.formatTime(p.duration)}
              </span>
            </div>
            <div class="min-w-0">
              <h4 class="text-sm font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                ${this.escapeHtml(p.title)}
              </h4>
              <div class="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span class="text-purple-400 font-semibold">${p.clips_count || 0} Clips</span>
                <span>•</span>
                <span class="capitalize">${p.source_type}</span>
                <span>•</span>
                <span>${new Date(p.created_at).toLocaleDateString('de-DE')}</span>
              </div>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 rounded-full text-xs font-semibold ${p.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'}">
              ${p.status === 'completed' ? 'Bereit' : 'In Arbeit'}
            </span>
            <svg class="w-4 h-4 text-slate-500 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
          </div>
        </div>
      `).join('') || `<div class="p-8 text-center text-slate-500 text-sm">Noch keine Projekte vorhanden. Starte mit deinem ersten Video!</div>`;

      return `
        <div class="space-y-8">
          
          <!-- Welcome Banner -->
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 class="text-3xl font-extrabold text-white tracking-tight">Studio Dashboard</h1>
              <p class="text-sm text-slate-400 mt-1">Übersicht über deine KI-Generierungen, Clips und Speichernutzung.</p>
            </div>
            <a href="#home" class="px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2 self-start sm:self-auto">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Neues Video importieren
            </a>
          </div>

          <!-- Key Metrics Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            
            <!-- Metric 1: Generated Clips -->
            <div class="glass-card p-5 border border-white/[0.08]">
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Generierte Clips</span>
                <div class="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
                </div>
              </div>
              <div class="text-3xl font-black text-white mb-1">${stats.clips_count}</div>
              <div class="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                <span>↑ Aktiv bereit</span>
                <span class="text-slate-400">• Alle Social Formate</span>
              </div>
            </div>

            <!-- Metric 2: Projects Count -->
            <div class="glass-card p-5 border border-white/[0.08]">
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Meine Projekte</span>
                <div class="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/></svg>
                </div>
              </div>
              <div class="text-3xl font-black text-white mb-1">${stats.projects_count}</div>
              <div class="text-xs text-slate-400">
                <span>YouTube & Datei-Uploads</span>
              </div>
            </div>

            <!-- Metric 3: Avg Viral Score -->
            <div class="glass-card p-5 border border-white/[0.08]">
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Ø Viral-Score</span>
                <div class="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                  ★
                </div>
              </div>
              <div class="text-3xl font-black text-emerald-400 mb-1">${stats.avg_score}<span class="text-base text-slate-400 font-normal">/100</span></div>
              <div class="text-xs text-slate-400">
                <span>Hohes Engagement-Potenzial</span>
              </div>
            </div>

            <!-- Metric 4: Storage Meter -->
            <div class="glass-card p-5 border border-white/[0.08]">
              <div class="flex items-center justify-between mb-3">
                <span class="text-xs font-bold uppercase tracking-wider text-slate-400">Speicherverbrauch</span>
                <div class="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7v10c0 2 1.5 3 3.5 3h9c2 0 3.5-1 3.5-3V7c0-2-1.5-3-3.5-3h-9C5.5 4 4 5 4 7z"/></svg>
                </div>
              </div>
              <div class="text-xl font-bold text-white mb-2">
                ${stats.storage_mb} MB <span class="text-xs text-slate-400 font-normal">/ ${stats.storage_limit_mb || 500} MB</span>
              </div>
              <div class="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div class="h-full bg-gradient-to-r from-purple-500 to-indigo-500" style="width: ${storagePercent}%"></div>
              </div>
            </div>

          </div>

          <!-- Section: Recent Projects & Quick Creation -->
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            <!-- Left: Recent Projects List (Cols 2) -->
            <div class="lg:col-span-2 space-y-4">
              <div class="flex items-center justify-between">
                <h3 class="text-lg font-bold text-white tracking-tight">Zuletzt erstellte Projekte</h3>
                <a href="#projects" class="text-xs font-semibold text-purple-400 hover:text-purple-300">Alle anzeigen →</a>
              </div>
              <div class="space-y-3">
                ${recentProjectsHtml}
              </div>
            </div>

            <!-- Right: Quick Start Guide / Pro Tips (Cols 1) -->
            <div class="glass-card p-6 border border-white/[0.08] space-y-4">
              <div class="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
              </div>
              <h3 class="text-base font-bold text-white">Schnellstart mit OpusFlow</h3>
              <ul class="space-y-3 text-xs text-slate-400">
                <li class="flex items-start gap-2">
                  <span class="w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-[10px] mt-0.5">1</span>
                  <span>Füge einen YouTube-Link oder ein hochgeladenes Video ein.</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-[10px] mt-0.5">2</span>
                  <span>Die KI analysiert Sprache, Lautstärke-Peaks und virale Hooks.</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-[10px] mt-0.5">3</span>
                  <span>Wähle im Editor deinen Untertitel-Stil (Viral, Bold, Minimal).</span>
                </li>
                <li class="flex items-start gap-2">
                  <span class="w-4 h-4 rounded-full bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-[10px] mt-0.5">4</span>
                  <span>Lade fertige MP4-Clips einzeln oder gesammelt als ZIP herunter.</span>
                </li>
              </ul>
              <div class="pt-4 border-t border-white/[0.08]">
                <a href="#settings" class="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1">
                  <span>Gemini API-Key hinterlegen</span>
                  <span>→</span>
                </a>
              </div>
            </div>

          </div>

        </div>
      `;
    } catch (err) {
      return `<div class="p-8 text-center text-red-400">Dashboard konnte nicht geladen werden: ${err.message}</div>`;
    }
  },

  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};
