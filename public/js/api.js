// public/js/api.js - OpusFlow AI REST API Client

const API = {
  baseUrl: '',

  async request(endpoint, options = {}) {
    try {
      const res = await fetch(`${this.baseUrl}/api${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        },
        ...options
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `HTTP Fehler ${res.status}`);
      }
      return data;
    } catch (err) {
      console.error(`API Fehler [${endpoint}]:`, err);
      throw err;
    }
  },

  getStats() {
    return this.request('/stats');
  },

  getProjects() {
    return this.request('/projects');
  },

  getProject(id) {
    return this.request(`/projects/${id}`);
  },

  createProject(payload) {
    return this.request('/projects', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  deleteProject(id) {
    return this.request(`/projects/${id}`, {
      method: 'DELETE'
    });
  },

  analyzeProject(id, options = {}) {
    return this.request(`/projects/${id}/analyze`, {
      method: 'POST',
      body: JSON.stringify(options)
    });
  },

  getProjectStatus(id) {
    return this.request(`/projects/${id}/status`);
  },

  resolveUrl(url) {
    return this.request('/resolve-url', {
      method: 'POST',
      body: JSON.stringify({ url })
    });
  },

  getClip(id) {
    return this.request(`/clips/${id}`);
  },

  updateClip(id, data) {
    return this.request(`/clips/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deleteClip(id) {
    return this.request(`/clips/${id}`, {
      method: 'DELETE'
    });
  },

  getSettings() {
    return this.request('/settings');
  },

  updateSettings(data) {
    return this.request('/settings', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  getSocialCaptions(clipId) {
    return this.request(`/social/captions/${clipId}`);
  },

  getSchedule() {
    return this.request('/schedule');
  },

  createSchedule(data) {
    return this.request('/schedule', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  deleteSchedule(id) {
    return this.request(`/schedule/${id}`, {
      method: 'DELETE'
    });
  },

  getTeam() {
    return this.request('/team');
  },

  addTeamMember(data) {
    return this.request('/team', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  updateTeamMember(id, data) {
    return this.request(`/team/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },

  deleteTeamMember(id) {
    return this.request(`/team/${id}`, {
      method: 'DELETE'
    });
  },

  getBilling() {
    return this.request('/billing');
  },

  getCredits() {
    return this.request('/credits');
  },


  async uploadVideo(file, onProgress) {
    const formData = new FormData();
    formData.append('video', file);

    const xhr = new XMLHttpRequest();
    return new Promise((resolve, reject) => {
      xhr.open('POST', '/api/upload');

      if (xhr.upload && onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const percent = Math.round((e.loaded / e.total) * 100);
            onProgress(percent);
          }
        });
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const json = JSON.parse(xhr.responseText);
            resolve(json);
          } catch (e) {
            resolve({ success: true, url: '/uploads/' + file.name });
          }
        } else {
          reject(new Error(`Upload fehlgeschlagen: HTTP ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Netzwerkfehler beim Upload'));
      xhr.send(formData);
    });
  },

  // Toast Notification helper
  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast-item';

    const icons = {
      success: `<div class="w-7 h-7 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-sm">✓</div>`,
      error: `<div class="w-7 h-7 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold text-sm">✕</div>`,
      info: `<div class="w-7 h-7 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm">ℹ</div>`
    };

    toast.innerHTML = `
      ${icons[type] || icons.info}
      <div class="flex-1 text-sm font-medium text-slate-200">${message}</div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 4000);
  }
};
