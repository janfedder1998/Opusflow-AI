// public/js/team.js - Team Workspaces: Mitglieder einladen & Rollen verwalten

const TeamView = {
  roleBadges: {
    'Admin': 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    'Admin / Owner': 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    'Editor': 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    'Video Editor': 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30',
    'Viewer': 'bg-slate-500/15 text-slate-300 border-slate-500/30'
  },

  async render() {
    try {
      const members = await API.getTeam();

      const rowsHtml = (members || []).map(m => {
        const badgeClass = this.roleBadges[m.role] || this.roleBadges['Viewer'];
        return `
          <div class="glass-card p-4 border border-white/[0.08] flex items-center justify-between gap-4">
            <div class="flex items-center gap-3 min-w-0">
              <img src="${m.avatar_url || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?auto=format&fit=crop&w=150&q=80'}" class="w-10 h-10 rounded-full object-cover border border-white/[0.1] flex-shrink-0" />
              <div class="min-w-0">
                <h4 class="text-sm font-bold text-white truncate">${this.escapeHtml(m.name)}</h4>
                <p class="text-xs text-slate-400 truncate">${this.escapeHtml(m.email)}</p>
              </div>
            </div>

            <div class="flex items-center gap-3 flex-shrink-0">
              <select
                onchange="TeamView.changeRole('${m.id}', this.value)"
                class="px-2.5 py-1.5 rounded-lg text-xs font-semibold border outline-none bg-[#121520] ${badgeClass}"
              >
                <option value="Admin" ${m.role.startsWith('Admin') ? 'selected' : ''}>Admin</option>
                <option value="Editor" ${m.role.includes('Editor') ? 'selected' : ''}>Editor</option>
                <option value="Viewer" ${m.role === 'Viewer' ? 'selected' : ''}>Viewer</option>
              </select>
              <button
                onclick="TeamView.removeMember('${m.id}')"
                class="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all"
                title="Teammitglied entfernen"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
              </button>
            </div>
          </div>
        `;
      }).join('') || `
        <div class="glass-card p-12 text-center text-slate-500">
          <div class="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 flex items-center justify-center mx-auto mb-3 text-xl">👥</div>
          <h3 class="text-base font-bold text-white mb-1">Noch keine Teammitglieder</h3>
          <p class="text-xs text-slate-400 max-w-sm mx-auto">Lade Kollegen per E-Mail ein, um gemeinsam an Projekten zu arbeiten.</p>
        </div>
      `;

      return `
        <div class="max-w-4xl mx-auto space-y-8">

          <div>
            <h1 class="text-3xl font-extrabold text-white tracking-tight">Team-Workspace</h1>
            <p class="text-sm text-slate-400 mt-1">Lade Teammitglieder ein und verwalte ihre Zugriffsrechte (Admin, Editor, Viewer).</p>
          </div>

          <!-- Invite Form -->
          <div class="glass-card p-6 border border-white/[0.08] space-y-4">
            <h3 class="text-base font-bold text-white">Teammitglied einladen</h3>
            <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <input
                type="text"
                id="team-invite-name"
                placeholder="Name"
                class="sm:col-span-1 px-4 py-2.5 bg-[#0B0E17] border border-white/[0.1] focus:border-purple-500 rounded-xl text-sm text-white placeholder-slate-600 outline-none"
              />
              <input
                type="email"
                id="team-invite-email"
                placeholder="E-Mail-Adresse"
                class="sm:col-span-2 px-4 py-2.5 bg-[#0B0E17] border border-white/[0.1] focus:border-purple-500 rounded-xl text-sm text-white placeholder-slate-600 outline-none"
              />
              <select
                id="team-invite-role"
                class="px-3 py-2.5 bg-[#0B0E17] border border-white/[0.1] rounded-xl text-sm text-white outline-none"
              >
                <option value="Editor" selected>Editor</option>
                <option value="Admin">Admin</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>
            <button
              onclick="TeamView.invite()"
              class="px-5 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 transition-all active:scale-[0.98] flex items-center gap-2"
            >
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
              Einladung senden
            </button>
          </div>

          <!-- Member List -->
          <div class="space-y-3">
            <h3 class="text-lg font-bold text-white tracking-tight">Mitglieder (${(members || []).length})</h3>
            <div class="space-y-3">
              ${rowsHtml}
            </div>
          </div>

        </div>
      `;
    } catch (err) {
      return `<div class="p-8 text-center text-red-400">Team konnte nicht geladen werden: ${err.message}</div>`;
    }
  },

  async invite() {
    const name = document.getElementById('team-invite-name').value.trim();
    const email = document.getElementById('team-invite-email').value.trim();
    const role = document.getElementById('team-invite-role').value;

    if (!name || !email) {
      API.showToast("Bitte Name und E-Mail-Adresse angeben", "error");
      return;
    }

    try {
      await API.addTeamMember({ name, email, role });
      API.showToast(`Einladung an ${email} erfolgreich versendet! 📧`, "success");
      Router.handleRoute();
    } catch (err) {
      API.showToast("Fehler beim Einladen: " + err.message, "error");
    }
  },

  async changeRole(id, role) {
    try {
      await API.updateTeamMember(id, { role });
      API.showToast(`Rolle erfolgreich auf "${role}" geändert`, "success");
    } catch (err) {
      API.showToast("Fehler beim Ändern der Rolle: " + err.message, "error");
    }
  },

  async removeMember(id) {
    try {
      await API.deleteTeamMember(id);
      API.showToast("Teammitglied entfernt", "info");
      Router.handleRoute();
    } catch (err) {
      API.showToast("Fehler beim Entfernen: " + err.message, "error");
    }
  },

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};

window.TeamView = TeamView;
