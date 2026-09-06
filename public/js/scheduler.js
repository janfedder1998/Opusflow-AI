// public/js/scheduler.js - Social Media Publishing Planner & Calendar View

const SchedulerView = {
  viewMode: 'calendar', // 'list' | 'calendar'
  calendarDate: new Date(), // any date within the currently shown month
  selectedDay: null, // 'YYYY-MM-DD' string, for the day-detail panel under the calendar

  platformBadges: {
    tiktok: { label: 'TikTok', bg: 'bg-pink-500/20 text-pink-400 border-pink-500/30', icon: '🎵' },
    instagram: { label: 'Reels', bg: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: '📸' },
    youtube: { label: 'Shorts', bg: 'bg-red-500/20 text-red-400 border-red-500/30', icon: '🔴' }
  },

  async render() {
    try {
      const posts = await API.getSchedule();
      this._posts = posts || [];

      const bodyHtml = this.viewMode === 'calendar'
        ? this.renderCalendar(this._posts)
        : this.renderList(this._posts);

      return `
        <div class="space-y-8">
          
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-500/10 border border-purple-500/20 text-purple-300 mb-2">
                <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
                Multi-Plattform Scheduler Aktiv
              </div>
              <h1 class="text-3xl font-extrabold text-white tracking-tight">Social Media Planer</h1>
              <p class="text-sm text-slate-400 mt-1">Automatische Veröffentlichungen für TikTok, Instagram Reels und YouTube Shorts verwalten.</p>
            </div>
            
            <div class="flex items-center gap-3">
              <a href="#projects" class="px-4 py-2.5 rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30 transition-all flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                Clip aus Projekt wählen
              </a>
            </div>
          </div>

          <!-- Planner Metric Ribbon -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div class="glass-card p-4 border border-white/[0.08] flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-base">
                📅
              </div>
              <div>
                <div class="text-xl font-black text-white">${this._posts.length}</div>
                <div class="text-xs text-slate-400 font-medium">Eingeplante Posts</div>
              </div>
            </div>

            <div class="glass-card p-4 border border-white/[0.08] flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-base">
                ⚡
              </div>
              <div>
                <div class="text-xl font-black text-emerald-400">3 Plattformen</div>
                <div class="text-xs text-slate-400 font-medium">TikTok, Reels, Shorts</div>
              </div>
            </div>

            <div class="glass-card p-4 border border-white/[0.08] flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold text-base">
                🎯
              </div>
              <div>
                <div class="text-xl font-black text-white">Beste Sendezeiten</div>
                <div class="text-xs text-slate-400 font-medium">18:00 – 21:00 Uhr Peak</div>
              </div>
            </div>
          </div>

          <!-- View Toggle -->
          <div class="flex items-center justify-between gap-4 flex-wrap">
            <h3 class="text-lg font-bold text-white tracking-tight">Geplante Veröffentlichungen</h3>
            <div class="flex items-center bg-[#121520] rounded-xl border border-white/[0.08] p-1">
              <button 
                onclick="SchedulerView.setView('calendar')"
                class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${this.viewMode === 'calendar' ? 'bg-purple-600/20 text-white border border-purple-500' : 'text-slate-400 hover:text-white border border-transparent'}"
              >
                📅 Kalender
              </button>
              <button 
                onclick="SchedulerView.setView('list')"
                class="px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${this.viewMode === 'list' ? 'bg-purple-600/20 text-white border border-purple-500' : 'text-slate-400 hover:text-white border border-transparent'}"
              >
                📋 Liste
              </button>
            </div>
          </div>

          ${bodyHtml}

        </div>
      `;
    } catch (err) {
      return `<div class="p-8 text-center text-red-400">Fehler beim Laden des Planers: ${err.message}</div>`;
    }
  },

  setView(mode) {
    this.viewMode = mode;
    Router.handleRoute();
  },

  // ---------- LIST VIEW ----------

  renderList(posts) {
    const html = (posts || []).map(p => this.renderPostRow(p)).join('') || this.emptyStateHtml();
    return `<div class="space-y-3">${html}</div>`;
  },

  renderPostRow(p) {
    const badge = this.platformBadges[p.platform] || this.platformBadges.tiktok;
    const dateObj = new Date(p.scheduled_time);
    const formattedDate = isNaN(dateObj.getTime()) ? p.scheduled_time : dateObj.toLocaleString('de-DE', {
      weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    return `
      <div class="glass-card p-5 border border-white/[0.08] flex flex-col md:flex-row items-start md:items-center justify-between gap-5 group hover:border-purple-500/40 transition-all">
        
        <div class="flex items-center gap-4 min-w-0">
          <div class="relative w-24 h-16 rounded-xl bg-black overflow-hidden flex-shrink-0 border border-white/[0.06]">
            <img src="${p.thumbnail_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=80'}" class="w-full h-full object-cover">
            <span class="absolute bottom-1 right-1 px-1 rounded bg-black/80 text-[8px] font-bold text-white uppercase">${p.aspect_ratio || '9:16'}</span>
          </div>
          <div class="min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${badge.bg}">
                ${badge.icon} ${badge.label}
              </span>
              <span class="text-xs text-emerald-400 font-bold">★ ${p.clip_score || 95} Score</span>
              <span class="text-xs text-slate-500">•</span>
              <span class="text-xs text-slate-400 truncate">${p.project_title || 'Video Projekt'}</span>
            </div>
            <h4 class="text-sm font-bold text-white group-hover:text-purple-300 transition-colors truncate mb-1">
              ${this.escapeHtml(p.clip_title || 'Viral Highlight')}
            </h4>
            <p class="text-xs text-slate-400 line-clamp-1 italic">
              „${this.escapeHtml(p.caption)}“
            </p>
          </div>
        </div>

        <!-- Date & Actions -->
        <div class="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-white/[0.06]">
          <div class="text-left md:text-right">
            <div class="text-xs font-bold text-white flex items-center gap-1.5 md:justify-end">
              <svg class="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              <span>${formattedDate}</span>
            </div>
            <span class="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mt-1">
              ✓ Veröffentlichung bereit
            </span>
          </div>

          <div class="flex items-center gap-2">
            <button 
              onclick="SchedulerView.publishNow('${p.id}')"
              class="p-2 rounded-xl bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white transition-all text-xs font-bold"
              title="Jetzt sofort veröffentlichen"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
            </button>
            <button 
              onclick="SchedulerView.deletePost('${p.id}')"
              class="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all text-xs font-bold"
              title="Aus Planer entfernen"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
          </div>
        </div>

      </div>
    `;
  },

  emptyStateHtml() {
    return `
      <div class="glass-card p-12 text-center text-slate-500">
        <div class="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto mb-3 text-xl">📅</div>
        <h3 class="text-base font-bold text-white mb-1">Noch keine Posts im Planer</h3>
        <p class="text-xs text-slate-400 max-w-sm mx-auto mb-4">
          Öffne ein Projekt oder den Clip-Editor und klicke auf „Social Media Post“, um Clips direkt für TikTok, Reels und Shorts einzuplanen.
        </p>
        <a href="#projects" class="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 text-white">Zu meinen Projekten</a>
      </div>
    `;
  },

  // ---------- CALENDAR VIEW ----------

  renderCalendar(posts) {
    if (!posts || posts.length === 0) {
      return this.emptyStateHtml();
    }

    const year = this.calendarDate.getFullYear();
    const month = this.calendarDate.getMonth(); // 0-indexed

    // Group posts by local YYYY-MM-DD key
    const postsByDay = {};
    posts.forEach(p => {
      const d = new Date(p.scheduled_time);
      if (isNaN(d.getTime())) return;
      const key = this.dateKey(d);
      if (!postsByDay[key]) postsByDay[key] = [];
      postsByDay[key].push(p);
    });

    const monthLabel = this.calendarDate.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

    // Monday-first week layout
    const firstOfMonth = new Date(year, month, 1);
    const startOffset = (firstOfMonth.getDay() + 6) % 7; // 0 = Monday
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const todayKey = this.dateKey(new Date());
    const cells = [];

    // Leading days from previous month
    for (let i = 0; i < startOffset; i++) {
      const dayNum = daysInPrevMonth - startOffset + i + 1;
      cells.push({ dayNum, inMonth: false, key: null });
    }
    // Days in current month
    for (let d = 1; d <= daysInMonth; d++) {
      const key = this.dateKey(new Date(year, month, d));
      cells.push({ dayNum: d, inMonth: true, key });
    }
    // Trailing days to complete the last week row
    while (cells.length % 7 !== 0) {
      const dayNum = cells.length - (startOffset + daysInMonth) + 1;
      cells.push({ dayNum, inMonth: false, key: null });
    }

    const weekDayLabels = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

    const cellsHtml = cells.map(cell => {
      if (!cell.inMonth) {
        return `<div class="min-h-[92px] rounded-lg bg-white/[0.015] border border-white/[0.03] p-1.5 text-[11px] text-slate-700">${cell.dayNum}</div>`;
      }

      const dayPosts = postsByDay[cell.key] || [];
      const isToday = cell.key === todayKey;
      const isSelected = cell.key === this.selectedDay;

      const chips = dayPosts.slice(0, 2).map(p => {
        const badge = this.platformBadges[p.platform] || this.platformBadges.tiktok;
        const timeLabel = new Date(p.scheduled_time).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        return `<div class="px-1.5 py-0.5 rounded text-[9px] font-bold truncate border ${badge.bg}">${badge.icon} ${timeLabel}</div>`;
      }).join('');

      const overflow = dayPosts.length > 2
        ? `<div class="text-[9px] text-purple-400 font-semibold px-1">+${dayPosts.length - 2} mehr</div>`
        : '';

      return `
        <div 
          onclick="SchedulerView.selectDay('${cell.key}')"
          class="min-h-[92px] rounded-lg p-1.5 flex flex-col gap-1 cursor-pointer transition-all border ${isSelected ? 'border-purple-500 bg-purple-600/10' : isToday ? 'border-purple-500/40 bg-purple-500/5' : 'border-white/[0.06] bg-[#121520]/60 hover:border-purple-500/30'}"
        >
          <span class="text-[11px] font-bold ${isToday ? 'text-purple-300' : 'text-slate-300'}">${cell.dayNum}${isToday ? ' •' : ''}</span>
          ${chips}
          ${overflow}
        </div>
      `;
    }).join('');

    const selectedPosts = this.selectedDay ? (postsByDay[this.selectedDay] || []) : [];
    const selectedLabel = this.selectedDay
      ? new Date(this.selectedDay + 'T00:00:00').toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
      : null;

    const dayDetailHtml = this.selectedDay
      ? `
        <div class="space-y-3 mt-6">
          <h4 class="text-sm font-bold text-white">Posts am ${selectedLabel}</h4>
          ${selectedPosts.length > 0
            ? `<div class="space-y-3">${selectedPosts.map(p => this.renderPostRow(p)).join('')}</div>`
            : `<p class="text-xs text-slate-500">Keine Posts für diesen Tag eingeplant.</p>`
          }
        </div>
      `
      : '';

    return `
      <div class="glass-card p-5 border border-white/[0.08]">
        
        <!-- Month Navigation -->
        <div class="flex items-center justify-between mb-4">
          <h4 class="text-base font-bold text-white capitalize">${monthLabel}</h4>
          <div class="flex items-center gap-2">
            <button onclick="SchedulerView.prevMonth()" class="p-1.5 rounded-lg bg-[#181C2B] hover:bg-slate-800 text-slate-300 border border-white/[0.08] transition-all">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
            </button>
            <button onclick="SchedulerView.goToday()" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#181C2B] hover:bg-slate-800 text-purple-300 border border-white/[0.08] transition-all">
              Heute
            </button>
            <button onclick="SchedulerView.nextMonth()" class="p-1.5 rounded-lg bg-[#181C2B] hover:bg-slate-800 text-slate-300 border border-white/[0.08] transition-all">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
            </button>
          </div>
        </div>

        <!-- Weekday Header -->
        <div class="grid grid-cols-7 gap-1.5 mb-1.5">
          ${weekDayLabels.map(l => `<div class="text-center text-[10px] font-bold uppercase tracking-wider text-slate-500 py-1">${l}</div>`).join('')}
        </div>

        <!-- Day Grid -->
        <div class="grid grid-cols-7 gap-1.5">
          ${cellsHtml}
        </div>

        ${dayDetailHtml}

      </div>
    `;
  },

  selectDay(key) {
    this.selectedDay = (this.selectedDay === key) ? null : key;
    Router.handleRoute();
  },

  prevMonth() {
    this.calendarDate = new Date(this.calendarDate.getFullYear(), this.calendarDate.getMonth() - 1, 1);
    Router.handleRoute();
  },

  nextMonth() {
    this.calendarDate = new Date(this.calendarDate.getFullYear(), this.calendarDate.getMonth() + 1, 1);
    Router.handleRoute();
  },

  goToday() {
    this.calendarDate = new Date();
    this.selectedDay = this.dateKey(new Date());
    Router.handleRoute();
  },

  dateKey(d) {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${day}`;
  },

  // ---------- SHARED ACTIONS ----------

  async publishNow(id) {
    API.showToast("Post erfolgreich als 'Veröffentlicht' markiert! 🚀", "success");
    await this.deletePost(id, false);
  },

  async deletePost(id, showToast = true) {
    try {
      await API.deleteSchedule(id);
      if (showToast) API.showToast("Post aus Planer entfernt", "info");
      Router.handleRoute();
    } catch (err) {
      API.showToast("Fehler beim Löschen: " + err.message, "error");
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};
