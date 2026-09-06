// public/js/importer.js - Video Import, URL Validation & Upload Flow

const ImporterView = {
  currentResolvedData: null,
  uploadedFile: null,

  render() {
    return `
      <div class="max-w-4xl mx-auto">
        
        <!-- Hero Section -->
        <div class="text-center mb-10 pt-4">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-500/20 text-purple-300 mb-5">
            <span class="w-2 h-2 rounded-full bg-purple-400 animate-pulse"></span>
            Neu: Multi-Plattform KI-Highlight-Erkennung 2.0
          </div>
          <h1 class="text-4xl sm:text-5xl font-extrabold tracking-tight text-white mb-4 leading-tight">
            Turn long videos into <span class="bg-gradient-to-r from-purple-400 via-pink-400 to-indigo-400 bg-clip-text text-transparent">viral clips</span> with AI.
          </h1>
          <p class="text-lg text-slate-400 max-w-2xl mx-auto">
            Paste a video link. Let AI find the best moments. Erstelle automatisch vertikale 9:16 Shorts mit animierten Untertiteln und viralem Hook-Score.
          </p>
        </div>

        <!-- Main Input Card -->
        <div class="glass-card p-6 sm:p-8 mb-8 border border-white/[0.1] shadow-2xl relative overflow-hidden">
          
          <!-- URL Input Bar -->
          <div class="mb-6">
            <label class="block text-sm font-semibold text-slate-300 mb-2.5">
              YouTube- oder Video-Link einfügen
            </label>
            <div class="relative flex flex-col sm:flex-row gap-3">
              <div class="relative flex-1">
                <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <svg class="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <input 
                  type="text" 
                  id="video-url-input" 
                  placeholder="https://www.youtube.com/watch?v=... oder direkter Videolink"
                  class="w-full pl-12 pr-4 py-3.5 bg-[#0A0D15] border border-white/[0.1] focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 rounded-xl text-slate-100 placeholder-slate-500 text-sm sm:text-base outline-none transition-all"
                />
              </div>
              <button 
                id="btn-analyze-url"
                onclick="ImporterView.handleUrlSubmit()"
                class="px-6 py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-purple-600 via-indigo-600 to-fuchsia-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center gap-2 whitespace-nowrap active:scale-[0.98]"
              >
                <svg class="w-4 h-4 text-purple-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                Video analysieren
              </button>
            </div>
            <div class="flex items-center gap-4 mt-2 text-xs text-slate-400">
              <span class="flex items-center gap-1">✓ YouTube Shorts & Langformate</span>
              <span class="flex items-center gap-1">✓ Direkte MP4/WebM-URLs</span>
              <span class="flex items-center gap-1">✓ Twitch / Vimeo / Podcasts</span>
            </div>
          </div>

          <!-- Video Metadata Preview (Hidden until URL resolved) -->
          <div id="metadata-preview-card" class="hidden mb-6 p-4 rounded-xl bg-[#0B0E17] border border-purple-500/30 flex flex-col sm:flex-row items-center gap-4">
            <div class="relative w-full sm:w-44 h-28 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0">
              <img id="meta-thumb" src="" alt="Thumbnail" class="w-full h-full object-cover">
              <span id="meta-duration" class="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">05:45</span>
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-400 border border-red-500/30">YouTube</span>
                <span id="meta-author" class="text-xs text-slate-400">Creator Name</span>
              </div>
              <h4 id="meta-title" class="text-base font-semibold text-white truncate mb-2">Video Title</h4>
              <button 
                id="btn-confirm-start"
                onclick="ImporterView.startProjectAnalysis()"
                class="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-black shadow-md transition-all flex items-center gap-1.5"
              >
                <span>Highlights jetzt extrahieren</span>
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
              </button>
            </div>
          </div>

          <!-- Divider -->
          <div class="relative my-8 text-center">
            <div class="absolute inset-0 flex items-center"><div class="w-full border-t border-white/[0.08]"></div></div>
            <span class="relative px-4 text-xs font-bold uppercase tracking-widest bg-[#121520] text-slate-400">ODER EIGENES VIDEO HOCHLADEN</span>
          </div>

          <!-- Drag and Drop Upload Box (MVP Fallback / Direct File) -->
          <div 
            id="dropzone"
            ondragover="ImporterView.handleDragOver(event)"
            ondragleave="ImporterView.handleDragLeave(event)"
            ondrop="ImporterView.handleDrop(event)"
            onclick="document.getElementById('file-input').click()"
            class="border-2 border-dashed border-white/[0.12] hover:border-purple-500/50 hover:bg-purple-500/[0.03] rounded-2xl p-8 text-center cursor-pointer transition-all duration-200 group"
          >
            <input type="file" id="file-input" accept="video/mp4,video/webm,video/quicktime,video/x-m4v" class="hidden" onchange="ImporterView.handleFileSelect(event)">
            <div class="w-14 h-14 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center mx-auto mb-3 group-hover:scale-110 transition-transform">
              <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h3 class="text-base font-semibold text-slate-200 mb-1">
              Videodatei hier hineinziehen oder <span class="text-purple-400 underline decoration-purple-400/50">durchsuchen</span>
            </h3>
            <p class="text-xs text-slate-400 mb-3">
              Unterstützt MP4, MOV, WebM (bis zu 500 MB). Lokale Videoverarbeitung ohne Upload-Wartezeit möglich.
            </p>
            <div id="upload-status-box" class="hidden max-w-sm mx-auto mt-4 text-left">
              <div class="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span id="upload-filename">Video.mp4</span>
                <span id="upload-percent">0%</span>
              </div>
              <div class="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div id="upload-progress-bar" class="h-full bg-purple-500 w-0 transition-all"></div>
              </div>
            </div>
          </div>

        </div>

        <!-- 1-Click Interactive Demo Showcase -->
        <div class="mb-12">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h3 class="text-lg font-bold text-white tracking-tight">Oder sofort mit einem Beispielvideo testen</h3>
              <p class="text-xs text-slate-400">Klicke auf ein vorbereitetes Video, um die KI-Clipping-Engine direkt auszuprobieren:</p>
            </div>
            <span class="text-xs text-purple-400 font-semibold">1-Klick Vorschau</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            
            <!-- Demo Card 1 -->
            <div onclick="window.location.hash = '#project/proj_demo_1'" class="glass-card p-4 cursor-pointer hover:-translate-y-1 transition-all group">
              <div class="relative h-32 rounded-lg overflow-hidden bg-slate-800 mb-3">
                <img src="https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=600&q=80" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="Podcast">
                <span class="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/90 text-black">98 Score</span>
                <span class="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">06:12</span>
              </div>
              <span class="cat-badge cat-hook mb-1 inline-block">Podcast Talk</span>
              <h4 class="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors line-clamp-2 mb-1">
                Joe Rogan & Lex Fridman: The Future of AI & Superintelligence
              </h4>
              <p class="text-xs text-slate-400">5 Highlight-Clips bereit zur Bearbeitung</p>
            </div>

            <!-- Demo Card 2 -->
            <div onclick="window.location.hash = '#project/proj_demo_2'" class="glass-card p-4 cursor-pointer hover:-translate-y-1 transition-all group">
              <div class="relative h-32 rounded-lg overflow-hidden bg-slate-800 mb-3">
                <img src="https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=600&q=80" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" alt="Business">
                <span class="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/90 text-black">96 Score</span>
                <span class="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">04:50</span>
              </div>
              <span class="cat-badge cat-controversy mb-1 inline-block">Marketing Hook</span>
              <h4 class="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors line-clamp-2 mb-1">
                Alex Hormozi: The $100M Hook Strategy for Organic Reach
              </h4>
              <p class="text-xs text-slate-400">3 Highlight-Clips bereit zur Bearbeitung</p>
            </div>

            <!-- Demo Card 3: Interactive Synthetic Generator -->
            <div onclick="ImporterView.startSyntheticDemo()" class="glass-card p-4 cursor-pointer hover:-translate-y-1 transition-all group border-purple-500/30">
              <div class="relative h-32 rounded-lg overflow-hidden bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center mb-3">
                <div class="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-purple-300 group-hover:scale-110 transition-transform">
                  <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"/></svg>
                </div>
                <span class="absolute bottom-2 left-2 px-1.5 py-0.5 rounded bg-black/80 text-[10px] font-mono text-white">Live Test</span>
              </div>
              <span class="cat-badge cat-insight mb-1 inline-block">Tech Keynote</span>
              <h4 class="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors line-clamp-2 mb-1">
                Steve Jobs: Connecting the Dots & Finding Your Passion
              </h4>
              <p class="text-xs text-slate-400">Live Analyse starten und KI zusehen</p>
            </div>

          </div>
        </div>

      </div>
    `;
  },

  async handleUrlSubmit() {
    const input = document.getElementById('video-url-input');
    const url = input.value.trim();

    if (!url) {
      API.showToast('Bitte gib einen YouTube- oder Video-Link ein', 'error');
      input.focus();
      return;
    }

    const btn = document.getElementById('btn-analyze-url');
    btn.disabled = true;
    btn.innerHTML = `<span class="animate-spin text-sm">⏳</span> Validierung...`;

    try {
      const data = await API.resolveUrl(url);
      this.currentResolvedData = data;

      // Show metadata preview card
      const card = document.getElementById('metadata-preview-card');
      const thumb = document.getElementById('meta-thumb');
      const title = document.getElementById('meta-title');
      const author = document.getElementById('meta-author');
      const dur = document.getElementById('meta-duration');

      card.classList.remove('hidden');
      thumb.src = data.thumbnail_url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80';
      title.innerText = data.title;
      author.innerText = data.author || 'Video-Quelle';
      
      const mins = Math.floor((data.duration || 180) / 60);
      const secs = Math.floor((data.duration || 180) % 60);
      dur.innerText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

      API.showToast('Video erkannt! Starte die KI-Analyse.', 'success');
    } catch (err) {
      API.showToast(err.message || 'URL konnte nicht aufgelöst werden', 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg class="w-4 h-4 text-purple-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg> Video analysieren`;
    }
  },

  async startProjectAnalysis() {
    if (!this.currentResolvedData) return;

    try {
      const res = await API.createProject({
        title: this.currentResolvedData.title,
        source_type: this.currentResolvedData.source_type,
        source_url: this.currentResolvedData.source_url,
        thumbnail_url: this.currentResolvedData.thumbnail_url,
        duration: this.currentResolvedData.duration || 240.0
      });

      const projectId = res.id;
      // Launch analysis modal
      ProgressModal.start(projectId);
    } catch (err) {
      API.showToast('Projekt konnte nicht erstellt werden: ' + err.message, 'error');
    }
  },

  handleDragOver(e) {
    e.preventDefault();
    document.getElementById('dropzone').classList.add('border-purple-500', 'bg-purple-500/10');
  },

  handleDragLeave(e) {
    e.preventDefault();
    document.getElementById('dropzone').classList.remove('border-purple-500', 'bg-purple-500/10');
  },

  handleDrop(e) {
    e.preventDefault();
    document.getElementById('dropzone').classList.remove('border-purple-500', 'bg-purple-500/10');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      this.processFile(e.dataTransfer.files[0]);
    }
  },

  handleFileSelect(e) {
    if (e.target.files && e.target.files[0]) {
      this.processFile(e.target.files[0]);
    }
  },

  async processFile(file) {
    this.uploadedFile = file;
    const statusBox = document.getElementById('upload-status-box');
    const nameEl = document.getElementById('upload-filename');
    const percentEl = document.getElementById('upload-percent');
    const barEl = document.getElementById('upload-progress-bar');

    statusBox.classList.remove('hidden');
    nameEl.innerText = file.name;
    percentEl.innerText = '0%';
    barEl.style.width = '0%';

    try {
      // Actually upload the file to the server so it persists and can be
      // streamed/exported later (a blob: URL only lives in this browser tab).
      const uploadResult = await API.uploadVideo(file, (percent) => {
        percentEl.innerText = `${percent}%`;
        barEl.style.width = `${percent}%`;
      });

      if (!uploadResult || !uploadResult.url) {
        throw new Error('Server hat keine gültige Datei-URL zurückgegeben');
      }

      const cleanTitle = file.name.replace(/\.[^/.]+$/, "");
      const res = await API.createProject({
        title: cleanTitle,
        source_type: 'upload',
        source_url: uploadResult.url,
        file_path: uploadResult.filename,
        thumbnail_url: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=600&q=80',
        duration: 210.0
      });

      percentEl.innerText = '100%';
      barEl.style.width = '100%';
      API.showToast('Video erfolgreich hochgeladen und bereit zur Analyse!', 'success');

      setTimeout(() => {
        ProgressModal.start(res.id);
      }, 500);

    } catch (err) {
      API.showToast('Fehler bei der Videoverarbeitung: ' + err.message, 'error');
    }
  },

  async startSyntheticDemo() {
    try {
      const res = await API.createProject({
        title: "Steve Jobs: Connecting the Dots & Finding Your Passion",
        source_type: "demo",
        source_url: "https://www.youtube.com/watch?v=UF8uR6Z6KLc",
        thumbnail_url: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=800&q=80",
        duration: 310.0,
        metadata: {
          transcript: "You can't connect the dots looking forward; you can only connect them looking backwards. So you have to trust that the dots will somehow connect in your future. Your work is going to fill a large part of your life, and the only way to be truly satisfied is to do what you believe is great work. And the only way to do great work is to love what you do. If you haven't found it yet, keep looking. Don't settle. As with all matters of the heart, you'll know when you find it."
        }
      });

      ProgressModal.start(res.id);
    } catch (err) {
      API.showToast('Demo konnte nicht gestartet werden: ' + err.message, 'error');
    }
  }
};
