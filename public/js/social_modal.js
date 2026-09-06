// public/js/social_modal.js - AI Social Media Caption Generator & Scheduling Modal

const SocialModal = {
  currentClipId: null,
  currentProjectId: null,
  currentCaptions: null,
  selectedPlatform: 'tiktok',

  async open(clipId, projectId) {
    this.currentClipId = clipId;
    this.currentProjectId = projectId;
    this.selectedPlatform = 'tiktok';

    let modal = document.getElementById('social-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'social-modal';
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-all';
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="bg-[#121520] border border-white/[0.1] rounded-2xl max-w-xl w-full p-6 shadow-2xl relative overflow-hidden text-left">
        <!-- Glow -->
        <div class="absolute -top-20 -right-20 w-40 h-40 bg-purple-600/20 rounded-full blur-3xl pointer-events-none"></div>

        <div class="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-5">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
              📱
            </div>
            <div>
              <h3 class="text-base font-bold text-white">KI-Social-Media-Post Generator</h3>
              <p class="text-xs text-slate-400">Generiere virale Beschreibungen und Hashtags für deine Plattform.</p>
            </div>
          </div>
          <button onclick="SocialModal.close()" class="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.05]">
            <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <!-- Platform Tabs -->
        <div class="grid grid-cols-3 gap-2 mb-5">
          <button onclick="SocialModal.setPlatform('tiktok')" id="soc-tab-tiktok" class="soc-tab active py-2.5 px-3 rounded-xl border border-purple-500 bg-purple-600/20 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all">
            <span>🎵 TikTok</span>
          </button>
          <button onclick="SocialModal.setPlatform('instagram')" id="soc-tab-instagram" class="soc-tab py-2.5 px-3 rounded-xl border border-white/[0.08] bg-[#181C2B] text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all">
            <span>📸 Reels</span>
          </button>
          <button onclick="SocialModal.setPlatform('youtube')" id="soc-tab-youtube" class="soc-tab py-2.5 px-3 rounded-xl border border-white/[0.08] bg-[#181C2B] text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all">
            <span>🔴 Shorts</span>
          </button>
        </div>

        <!-- Content Box -->
        <div class="mb-5">
          <div class="flex items-center justify-between text-xs font-bold text-slate-400 mb-2">
            <span>Generierter Beitragstext & Hashtags</span>
            <span id="char-count" class="text-purple-400">Lade...</span>
          </div>
          <textarea 
            id="social-caption-textarea" 
            rows="6" 
            class="w-full p-3 bg-[#0A0D15] border border-white/[0.1] focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl text-xs sm:text-sm text-slate-100 outline-none leading-relaxed resize-none font-sans"
          >Generiere Post...</textarea>
        </div>

        <!-- Schedule Section -->
        <div class="p-4 rounded-xl bg-[#0A0D15] border border-white/[0.06] mb-5">
          <div class="flex items-center gap-2 mb-3">
            <svg class="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            <span class="text-xs font-bold uppercase tracking-wider text-slate-300">Im Social-Media-Planer einplanen</span>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[10px] text-slate-400 mb-1">Datum & Uhrzeit</label>
              <input 
                type="datetime-local" 
                id="schedule-datetime" 
                class="w-full px-3 py-2 bg-[#121520] border border-white/[0.1] rounded-lg text-xs text-white outline-none"
              />
            </div>
            <div class="flex items-end">
              <button 
                onclick="SocialModal.schedulePost()"
                class="w-full py-2 px-3 rounded-lg font-bold text-xs bg-[#1A1E2E] hover:bg-slate-800 text-purple-300 border border-purple-500/30 transition-all flex items-center justify-center gap-1.5"
              >
                <span>📅 Zu Planer hinzufügen</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Modal Actions -->
        <div class="flex items-center justify-end gap-3 pt-2">
          <button 
            onclick="SocialModal.close()" 
            class="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
          >
            Schließen
          </button>
          <button 
            onclick="SocialModal.copyCaption()" 
            class="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 transition-all flex items-center gap-1.5 active:scale-[0.98]"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/></svg>
            Text & Hashtags kopieren
          </button>
        </div>

      </div>
    `;

    modal.classList.remove('hidden');

    // Default datetime to tomorrow at 18:00
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(18, 0, 0, 0);
    const dateInput = document.getElementById('schedule-datetime');
    if (dateInput) {
      dateInput.value = tomorrow.toISOString().slice(0, 16);
    }

    // Load AI captions from backend
    try {
      const data = await API.getSocialCaptions(clipId);
      this.currentCaptions = data;
      this.updateCaptionDisplay();
    } catch (err) {
      document.getElementById('social-caption-textarea').value = "Fehler beim Laden der Captions: " + err.message;
    }
  },

  setPlatform(platform) {
    this.selectedPlatform = platform;
    document.querySelectorAll('.soc-tab').forEach(t => {
      t.classList.remove('border-purple-500', 'bg-purple-600/20', 'text-white');
      t.classList.add('border-white/[0.08]', 'bg-[#181C2B]', 'text-slate-300');
    });
    const active = document.getElementById(`soc-tab-${platform}`);
    if (active) {
      active.classList.add('border-purple-500', 'bg-purple-600/20', 'text-white');
      active.classList.remove('border-white/[0.08]', 'bg-[#181C2B]', 'text-slate-300');
    }
    this.updateCaptionDisplay();
  },

  updateCaptionDisplay() {
    if (!this.currentCaptions) return;
    const item = this.currentCaptions[this.selectedPlatform];
    if (item) {
      const ta = document.getElementById('social-caption-textarea');
      const cc = document.getElementById('char-count');
      if (ta) ta.value = item.caption;
      if (cc) cc.innerText = `${item.caption.length} Zeichen`;
    }
  },

  copyCaption() {
    const ta = document.getElementById('social-caption-textarea');
    if (!ta) return;
    ta.select();
    navigator.clipboard.writeText(ta.value);
    API.showToast("Social-Media-Text & Hashtags in die Zwischenablage kopiert! 📋", "success");
  },

  async schedulePost() {
    const datetime = document.getElementById('schedule-datetime').value;
    const caption = document.getElementById('social-caption-textarea').value;

    if (!datetime) {
      API.showToast("Bitte wähle ein Datum und eine Uhrzeit", "error");
      return;
    }

    try {
      await API.createSchedule({
        clip_id: this.currentClipId,
        project_id: this.currentProjectId,
        platform: this.selectedPlatform,
        caption: caption,
        scheduled_time: datetime
      });

      API.showToast(`Post für ${this.selectedPlatform.toUpperCase()} erfolgreich im Planer gespeichert! 📅`, "success");
      this.close();
      window.location.hash = "#schedule";
    } catch (err) {
      API.showToast("Fehler beim Einplanen: " + err.message, "error");
    }
  },

  close() {
    const modal = document.getElementById('social-modal');
    if (modal) modal.classList.add('hidden');
  }
};

window.SocialModal = SocialModal;
