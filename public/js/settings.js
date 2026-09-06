// public/js/settings.js - Settings & API Keys Configuration View

const SettingsView = {
  currentSettings: {},

  async render() {
    try {
      const settings = await API.getSettings();
      this.currentSettings = settings;

      return `
        <div class="max-w-3xl mx-auto space-y-8">
          
          <div>
            <h1 class="text-3xl font-extrabold text-white tracking-tight">Einstellungen</h1>
            <p class="text-sm text-slate-400 mt-1">Konfiguriere API-Keys, Standard-Cliplängen und automatische Speicherbereinigung.</p>
          </div>

          <!-- Section 1: AI Provider Keys -->
          <div class="glass-card p-6 border border-white/[0.08] space-y-5">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
              </div>
              <div>
                <h3 class="text-base font-bold text-white">KI-Schnittstellen (API-Keys)</h3>
                <p class="text-xs text-slate-400">Verbinde deinen eigenen Google Gemini oder OpenAI Account für maximale Genauigkeit.</p>
              </div>
            </div>

            <!-- Gemini Key -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Google Gemini API-Key (Empfohlen: Gemini 2.0 Flash)
                </label>
                <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1">
                  <span>Kostenlosen Key holen</span>
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                </a>
              </div>
              <input 
                type="password" 
                id="set-gemini-key"
                placeholder="${settings.gemini_api_key_masked || 'AIzaSy...'}" 
                value="${settings.gemini_api_key || ''}"
                class="w-full px-4 py-3 bg-[#0B0E17] border border-white/[0.1] focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl text-sm text-white placeholder-slate-600 outline-none"
              />
              <p class="text-[11px] text-slate-500 mt-1">
                Wird zur automatischen Transkription, Erkennung viraler Hooks und Titelerstellung verwendet.
              </p>
            </div>

            <!-- OpenAI Key (Optional) -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <label class="text-xs font-bold uppercase tracking-wider text-slate-300">
                  OpenAI API-Key (Optional für Whisper STT)
                </label>
              </div>
              <input 
                type="password" 
                id="set-openai-key"
                placeholder="${settings.openai_api_key_masked || 'sk-...'}" 
                value="${settings.openai_api_key || ''}"
                class="w-full px-4 py-3 bg-[#0B0E17] border border-white/[0.1] focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl text-sm text-white placeholder-slate-600 outline-none"
              />
            </div>
          </div>

          <!-- Section 2: Clip Generation Defaults -->
          <div class="glass-card p-6 border border-white/[0.08] space-y-5">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/></svg>
              </div>
              <div>
                <h3 class="text-base font-bold text-white">Clip-Erstellung & Präferenzen</h3>
                <p class="text-xs text-slate-400">Passe die Ziellänge und Clip-Anzahl pro analysiertem Video an.</p>
              </div>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1.5">Clips pro Video</label>
                <select id="set-clip-count" class="w-full px-3 py-2.5 bg-[#0B0E17] border border-white/[0.1] rounded-xl text-sm text-white outline-none">
                  <option value="4" ${settings.default_clip_count == '4' ? 'selected' : ''}>4 Clips</option>
                  <option value="6" ${settings.default_clip_count == '6' ? 'selected' : ''}>6 Clips (Standard)</option>
                  <option value="8" ${settings.default_clip_count == '8' ? 'selected' : ''}>8 Clips</option>
                  <option value="10" ${settings.default_clip_count == '10' ? 'selected' : ''}>10 Clips</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1.5">Min. Clip-Dauer</label>
                <select id="set-min-duration" class="w-full px-3 py-2.5 bg-[#0B0E17] border border-white/[0.1] rounded-xl text-sm text-white outline-none">
                  <option value="15" ${settings.default_clip_min_duration == '15' ? 'selected' : ''}>15 Sekunden</option>
                  <option value="20" ${settings.default_clip_min_duration == '20' ? 'selected' : ''}>20 Sekunden (Standard)</option>
                  <option value="30" ${settings.default_clip_min_duration == '30' ? 'selected' : ''}>30 Sekunden</option>
                </select>
              </div>

              <div>
                <label class="block text-xs font-bold text-slate-400 mb-1.5">Max. Clip-Dauer</label>
                <select id="set-max-duration" class="w-full px-3 py-2.5 bg-[#0B0E17] border border-white/[0.1] rounded-xl text-sm text-white outline-none">
                  <option value="45" ${settings.default_clip_max_duration == '45' ? 'selected' : ''}>45 Sekunden</option>
                  <option value="60" ${settings.default_clip_max_duration == '60' ? 'selected' : ''}>60 Sekunden (Standard)</option>
                  <option value="90" ${settings.default_clip_max_duration == '90' ? 'selected' : ''}>90 Sekunden</option>
                </select>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-400 mb-1.5">Standard Untertitel-Preset</label>
              <select id="set-caption-preset" class="w-full px-3 py-2.5 bg-[#0B0E17] border border-white/[0.1] rounded-xl text-sm text-white outline-none">
                <option value="viral" ${settings.default_caption_style == 'viral' ? 'selected' : ''}>Viral (Gelb/Grün Bounce)</option>
                <option value="bold" ${settings.default_caption_style == 'bold' ? 'selected' : ''}>Bold Impact (Weiß mit 3D-Schatten)</option>
                <option value="minimal" ${settings.default_caption_style == 'minimal' ? 'selected' : ''}>Minimal Clean (Glasmorphism-Box)</option>
                <option value="podcast" ${settings.default_caption_style == 'podcast' ? 'selected' : ''}>Podcast (Amber Warm)</option>
                <option value="highlight" ${settings.default_caption_style == 'highlight' ? 'selected' : ''}>Highlight (Cyber Neon)</option>
              </select>
            </div>
          </div>

          <!-- Section 3: Storage & Privacy -->
          <div class="glass-card p-6 border border-white/[0.08] space-y-5">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </div>
              <div>
                <h3 class="text-base font-bold text-white">Speicher & Automatische Bereinigung</h3>
                <p class="text-xs text-slate-400">Automatische Löschung temporärer Videodateien nach definierter Zeit.</p>
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-400 mb-1.5">Temporäre Videodateien löschen nach:</label>
              <select id="set-cleanup-hours" class="w-full px-3 py-2.5 bg-[#0B0E17] border border-white/[0.1] rounded-xl text-sm text-white outline-none">
                <option value="12" ${settings.auto_cleanup_hours == '12' ? 'selected' : ''}>12 Stunden</option>
                <option value="24" ${settings.auto_cleanup_hours == '24' ? 'selected' : ''}>24 Stunden (Empfohlen)</option>
                <option value="48" ${settings.auto_cleanup_hours == '48' ? 'selected' : ''}>48 Stunden</option>
                <option value="168" ${settings.auto_cleanup_hours == '168' ? 'selected' : ''}>7 Tage</option>
              </select>
            </div>
          </div>

          <!-- Save Button -->
          <div class="flex justify-end pt-2">
            <button 
              onclick="SettingsView.save()"
              class="px-6 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 via-indigo-600 to-fuchsia-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 transition-all active:scale-[0.98] flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              Einstellungen speichern
            </button>
          </div>

        </div>
      `;
    } catch (err) {
      return `<div class="p-8 text-center text-red-400">Einstellungen konnten nicht geladen werden: ${err.message}</div>`;
    }
  },

  async save() {
    const geminiKey = document.getElementById('set-gemini-key').value.trim();
    const openaiKey = document.getElementById('set-openai-key').value.trim();
    const clipCount = document.getElementById('set-clip-count').value;
    const minDur = document.getElementById('set-min-duration').value;
    const maxDur = document.getElementById('set-max-duration').value;
    const captionStyle = document.getElementById('set-caption-preset').value;
    const cleanupHours = document.getElementById('set-cleanup-hours').value;

    const payload = {
      default_clip_count: clipCount,
      default_clip_min_duration: minDur,
      default_clip_max_duration: maxDur,
      default_caption_style: captionStyle,
      auto_cleanup_hours: cleanupHours
    };

    if (geminiKey && !geminiKey.startsWith('••••')) payload.gemini_api_key = geminiKey;
    if (openaiKey && !openaiKey.startsWith('••••')) payload.openai_api_key = openaiKey;

    try {
      await API.updateSettings(payload);
      API.showToast("Einstellungen erfolgreich gespeichert!", "success");
    } catch (err) {
      API.showToast("Fehler beim Speichern: " + err.message, "error");
    }
  }
};
