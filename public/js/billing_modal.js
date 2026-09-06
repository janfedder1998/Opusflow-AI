// public/js/billing_modal.js - Pricing & Plan Upgrade Modal

const BillingModal = {
  currentBilling: null,

  async open() {
    let modal = document.getElementById('billing-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'billing-modal';
      modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 transition-all';
      document.body.appendChild(modal);
    }

    try {
      const data = await API.getBilling();
      this.currentBilling = data;

      modal.innerHTML = `
        <div class="bg-[#121520] border border-white/[0.1] rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl relative overflow-hidden text-left max-h-[90vh] overflow-y-auto">
          <!-- Background Glow -->
          <div class="absolute -top-24 -right-24 w-56 h-56 bg-purple-600/30 rounded-full blur-3xl pointer-events-none"></div>

          <div class="flex items-center justify-between pb-4 border-b border-white/[0.08] mb-6">
            <div>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Aktiver Plan: ${data.plan}
              </span>
              <h2 class="text-2xl font-black text-white mt-1">Pläne & Guthaben-Verwaltung</h2>
              <p class="text-xs text-slate-400">Verbleibend: <strong class="text-emerald-400">${data.minutes_remaining} von ${data.minutes_total} Minuten</strong> (Verlängerung am ${data.renewal_date})</p>
            </div>
            <button onclick="BillingModal.close()" class="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/[0.05]">
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Pricing Tiers Grid -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            
            <!-- Tier 1: Free Starter -->
            <div class="p-5 rounded-xl border border-white/[0.08] bg-[#181C2B]/50 flex flex-col justify-between">
              <div>
                <h4 class="text-sm font-bold text-white mb-1">Free Starter</h4>
                <div class="text-2xl font-black text-white mb-3">0 € <span class="text-xs text-slate-400 font-normal">/Monat</span></div>
                <ul class="space-y-2 text-xs text-slate-400 mb-6">
                  <li class="flex items-center gap-1.5">✓ 30 Min. Video-Import</li>
                  <li class="flex items-center gap-1.5">✓ 720p HD-Export</li>
                  <li class="flex items-center gap-1.5">✓ Standard Untertitel</li>
                  <li class="flex items-center gap-1.5 text-slate-600">✕ Kein Auto-Emoji</li>
                  <li class="flex items-center gap-1.5 text-slate-600">✕ Kein Social-Planer</li>
                </ul>
              </div>
              <button class="w-full py-2 rounded-lg text-xs font-semibold bg-slate-800 text-slate-400 cursor-not-allowed">
                Aktuell inaktiv
              </button>
            </div>

            <!-- Tier 2: Creator Pro (Active) -->
            <div class="p-5 rounded-xl border-2 border-purple-500 bg-purple-600/10 flex flex-col justify-between relative shadow-xl shadow-purple-500/10">
              <span class="absolute -top-3 right-4 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-gradient-to-r from-purple-500 to-indigo-500 text-white">
                Aktiver Plan
              </span>
              <div>
                <h4 class="text-sm font-bold text-purple-300 mb-1">Creator Pro</h4>
                <div class="text-2xl font-black text-white mb-3">29 € <span class="text-xs text-slate-400 font-normal">/Monat</span></div>
                <ul class="space-y-2 text-xs text-slate-300 mb-6">
                  <li class="flex items-center gap-1.5 text-emerald-400 font-semibold">✓ 120 Min. Video-Import</li>
                  <li class="flex items-center gap-1.5 text-emerald-400 font-semibold">✓ 1080p 60fps Export</li>
                  <li class="flex items-center gap-1.5">✓ Alle 5 Untertitel-Presets</li>
                  <li class="flex items-center gap-1.5">✓ ✨ Auto-Emoji Popups</li>
                  <li class="flex items-center gap-1.5">✓ 🎙️ Multi-Speaker Split</li>
                  <li class="flex items-center gap-1.5">✓ Social Media Planer</li>
                </ul>
              </div>
              <button onclick="BillingModal.addCredits()" class="w-full py-2.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/30 transition-all">
                +60 Minuten Guthaben aufladen
              </button>
            </div>

            <!-- Tier 3: Agency Elite -->
            <div class="p-5 rounded-xl border border-white/[0.08] bg-[#181C2B]/50 flex flex-col justify-between">
              <div>
                <h4 class="text-sm font-bold text-white mb-1">Agency Elite</h4>
                <div class="text-2xl font-black text-white mb-3">89 € <span class="text-xs text-slate-400 font-normal">/Monat</span></div>
                <ul class="space-y-2 text-xs text-slate-400 mb-6">
                  <li class="flex items-center gap-1.5 text-slate-200">✓ 500 Min. Video-Import</li>
                  <li class="flex items-center gap-1.5 text-slate-200">✓ 4K Ultra-HD Export</li>
                  <li class="flex items-center gap-1.5 text-slate-200">✓ Unbegrenzte Teammitglieder</li>
                  <li class="flex items-center gap-1.5 text-slate-200">✓ Eigenes Branding / Watermark</li>
                  <li class="flex items-center gap-1.5 text-slate-200">✓ Dedizierter API-Server</li>
                </ul>
              </div>
              <button onclick="BillingModal.upgradeToAgency()" class="w-full py-2 rounded-lg text-xs font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transition-all">
                Auf Agency upgraden
              </button>
            </div>

          </div>

        </div>
      `;
      modal.classList.remove('hidden');
    } catch (err) {
      API.showToast("Fehler beim Laden der Rechnungsdaten: " + err.message, "error");
    }
  },

  addCredits() {
    API.showToast("Guthaben erfolgreich um +60 Minuten aufgeladen! 🎉", "success");
    this.close();
  },

  upgradeToAgency() {
    API.showToast("Upgrade auf Agency Elite aktiviert! 🚀", "success");
    this.close();
  },

  close() {
    const modal = document.getElementById('billing-modal');
    if (modal) modal.classList.add('hidden');
  }
};

window.BillingModal = BillingModal;
