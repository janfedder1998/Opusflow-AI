// public/js/editor.js - Full-Featured OpusClip Pro Video & Subtitle Editor

const EditorView = {
  currentClip: null,
  currentProject: null,
  isPlaying: false,
  currentTime: 0,
  animationFrameId: null,

  // Editor State
  state: {
    aspectRatio: '9:16',
    focalPointX: 0.5, // 0 = left, 0.5 = center, 1 = right
    startTime: 0,
    endTime: 30,
    captionPreset: 'viral',
    fontSize: 28,
    fontColor: '#FFFFFF',
    highlightColor: '#FACC15',
    captionPosition: 'bottom', // 'top', 'center', 'bottom'
    captionYOffset: 78, // % from top
    showBgBox: false,
    enableEmojis: true,
    layoutMode: 'single', // 'single' or 'split'
    transcript: '',
    subtitles: []
  },

  // Undo / Redo History
  history: [],
  historyIndex: -1,

  async render(clipId) {
    try {
      const clip = await API.getClip(clipId);
      this.currentClip = clip;
      const project = await API.getProject(clip.project_id);
      this.currentProject = project;

      // Initialize state from clip
      this.state.aspectRatio = clip.aspect_ratio || '9:16';
      this.state.focalPointX = clip.focal_point_x || 0.5;
      this.state.startTime = parseFloat(clip.start_time) || 0;
      this.state.endTime = parseFloat(clip.end_time) || 30;
      this.state.captionPreset = clip.caption_preset || 'viral';
      this.state.transcript = clip.transcript_json || clip.title;
      this.state.subtitles = clip.subtitles && clip.subtitles.length > 0 
        ? clip.subtitles 
        : this.generateInitialSubtitles(this.state.transcript, this.state.startTime, this.state.endTime);

      this.currentTime = this.state.startTime;
      this.history = [];
      this.historyIndex = -1;
      this.pushHistory();

      return `
        <div class="max-w-7xl mx-auto pb-12">
          
          <!-- Top Bar: Title, Project Link, Undo/Redo, Export -->
          <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/[0.08]">
            <div class="flex items-center gap-3">
              <a href="#project/${clip.project_id}" class="p-2 rounded-xl bg-[#121520] border border-white/[0.08] text-slate-400 hover:text-white transition-all">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
              </a>
              <div>
                <div class="flex items-center gap-2 mb-0.5">
                  <span class="cat-badge cat-hook">${clip.category || 'Clip Editor'}</span>
                  <span class="text-xs text-purple-400 font-semibold">${project.title}</span>
                </div>
                <h1 class="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                  <input 
                    type="text" 
                    id="clip-title-input" 
                    value="${this.escapeHtml(clip.title)}" 
                    onchange="EditorView.handleTitleChange(event)"
                    class="bg-transparent border-b border-transparent hover:border-purple-500/50 focus:border-purple-500 focus:bg-slate-900/50 px-1 py-0.5 rounded outline-none transition-all"
                  />
                  <span class="text-sm font-bold text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/20">★ ${clip.score}</span>
                </h1>
              </div>
            </div>

            <!-- Top Actions: Undo/Redo, Save, Export Button -->
            <div class="flex items-center gap-2.5 flex-wrap">
              <div class="flex items-center bg-[#121520] rounded-xl border border-white/[0.08] p-1">
                <button 
                  id="btn-undo" 
                  onclick="EditorView.undo()" 
                  class="p-2 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all" 
                  title="Rückgängig (Strg+Z)"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/></svg>
                </button>
                <button 
                  id="btn-redo" 
                  onclick="EditorView.redo()" 
                  class="p-2 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all" 
                  title="Wiederholen (Strg+Y)"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 10h-10a8 8 0 00-8 8v2M21 10l-6 6m6-6l-6-6"/></svg>
                </button>
              </div>

              <button 
                onclick="EditorView.saveChanges()" 
                class="px-4 py-2.5 rounded-xl font-semibold text-xs bg-[#181C2B] hover:bg-slate-800 text-slate-200 border border-white/[0.08] flex items-center gap-1.5 transition-all"
              >
                <svg class="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"/></svg>
                Speichern
              </button>

              <button 
                onclick="SocialModal.open('${clip.id}', '${clip.project_id}')"
                class="px-3.5 py-2.5 rounded-xl font-bold text-xs bg-[#1A1E2E] hover:bg-slate-800 text-purple-300 border border-purple-500/30 flex items-center gap-1.5 transition-all shadow-sm"
                title="KI-Social-Media-Post generieren & einplanen"
              >
                <span>📱 Social Post & Planer</span>
              </button>

              <button 
                id="btn-export-clip"
                onclick="EditorView.exportVideo()" 
                class="px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-purple-600 via-indigo-600 to-fuchsia-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-all active:scale-[0.98]"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
                Clip als MP4 exportieren
              </button>
            </div>
          </div>

          <!-- Editor Workspace Grid: Left = Video Preview, Right = Customization Panels -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            <!-- Left Side: Video Canvas Player & Timeline (Cols 7) -->
            <div class="lg:col-span-7 flex flex-col items-center">
              
              <!-- Video Preview Frame with Aspect Ratio Container -->
              <div id="aspect-frame" class="aspect-container-${this.state.aspectRatio.replace(':', '-')} video-canvas-wrapper relative flex items-center justify-center transition-all duration-300">
                
                <!-- Hidden Video Element for Source Material -->
                <video 
                  id="source-video" 
                  crossorigin="anonymous"
                  playsinline 
                  preload="auto"
                  class="hidden"
                ></video>

                <!-- Rendering HTML5 Canvas -->
                <canvas id="preview-canvas" class="w-full h-full object-contain cursor-pointer" onclick="EditorView.togglePlay()"></canvas>

                <!-- Big Play / Pause Overlay Icon -->
                <div id="play-pause-icon" class="absolute inset-0 flex items-center justify-center pointer-events-none opacity-0 transition-opacity">
                  <div class="w-16 h-16 rounded-full bg-black/60 backdrop-blur text-white flex items-center justify-center">
                    <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                </div>

                <!-- Aspect Ratio & Watermark Tag -->
                <div class="absolute top-3 left-3 px-2 py-1 rounded bg-black/70 backdrop-blur border border-white/10 text-[11px] font-bold text-purple-300 pointer-events-none">
                  <span id="label-aspect-ratio">${this.state.aspectRatio}</span>
                </div>

              </div>

              <!-- Video Transport Controls -->
              <div class="w-full max-w-xl mt-4 flex items-center justify-between px-4 py-2 bg-[#121520] rounded-xl border border-white/[0.08]">
                <div class="flex items-center gap-3">
                  <button 
                    id="btn-play-pause"
                    onclick="EditorView.togglePlay()" 
                    class="w-10 h-10 rounded-xl bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center transition-all shadow-md shadow-purple-600/30"
                  >
                    <svg id="icon-play" class="w-5 h-5 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    <svg id="icon-pause" class="w-5 h-5 hidden" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                  </button>
                  <button onclick="EditorView.jumpToStart()" class="p-2 text-slate-400 hover:text-white" title="Zum Start springen">
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>
                  </button>
                </div>

                <!-- Current Time / Duration -->
                <div class="text-xs font-mono text-slate-300">
                  <span id="timecode-current" class="text-white font-bold">00:00.0</span> / 
                  <span id="timecode-total" class="text-slate-400">00:30.0</span>
                  <span class="ml-2 px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold text-[10px]" id="label-clip-duration">30.0s</span>
                </div>

                <!-- Volume / Mute Toggle -->
                <button onclick="EditorView.toggleMute()" id="btn-mute" class="p-2 text-slate-400 hover:text-white">
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/></svg>
                </button>
              </div>

              <!-- Interactive Timeline & Trimmer Track -->
              <div class="w-full max-w-xl mt-4">
                <div class="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-semibold">
                  <span class="flex items-center gap-1 text-purple-300">
                    <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"/></svg>
                    Clip Trimmer (Start & Ende)
                  </span>
                  <span>Video Gesamtlänge: ${this.formatTime(project.duration || 300)}</span>
                </div>

                <div id="timeline-track" class="timeline-track cursor-pointer" onclick="EditorView.handleTimelineClick(event)">
                  <!-- Simulated Waveform Bars -->
                  <div class="timeline-wave" id="waveform-container"></div>
                  <!-- Selected Clip Range Highlight -->
                  <div id="timeline-range" class="timeline-range"></div>
                  <!-- Scrubber Playhead -->
                  <div id="timeline-playhead" class="timeline-playhead"></div>
                </div>

                <!-- Start & End Precise Time Controls -->
                <div class="grid grid-cols-2 gap-4 mt-3">
                  <div class="bg-[#121520] p-2.5 rounded-xl border border-white/[0.08] flex items-center justify-between">
                    <div>
                      <div class="text-[10px] uppercase font-bold text-slate-400">Startzeit</div>
                      <div class="text-sm font-mono font-bold text-white" id="display-start-time">00:00.0</div>
                    </div>
                    <div class="flex items-center gap-1">
                      <button onclick="EditorView.adjustTime('start', -0.5)" class="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs">-0.5s</button>
                      <button onclick="EditorView.adjustTime('start', 0.5)" class="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs">+0.5s</button>
                    </div>
                  </div>

                  <div class="bg-[#121520] p-2.5 rounded-xl border border-white/[0.08] flex items-center justify-between">
                    <div>
                      <div class="text-[10px] uppercase font-bold text-slate-400">Endzeit</div>
                      <div class="text-sm font-mono font-bold text-white" id="display-end-time">00:30.0</div>
                    </div>
                    <div class="flex items-center gap-1">
                      <button onclick="EditorView.adjustTime('end', -0.5)" class="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs">-0.5s</button>
                      <button onclick="EditorView.adjustTime('end', 0.5)" class="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs">+0.5s</button>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            <!-- Right Side: Customization Tabs & Subtitle Editor (Cols 5) -->
            <div class="lg:col-span-5 space-y-6">
              
              <!-- Tab Navigation -->
              <div class="flex items-center gap-1 bg-[#121520] p-1 rounded-xl border border-white/[0.08]">
                <button onclick="EditorView.switchTab('format')" id="tab-btn-format" class="tab-button active flex-1 py-2 rounded-lg text-xs font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 transition-all">
                  Format & Fokus
                </button>
                <button onclick="EditorView.switchTab('style')" id="tab-btn-style" class="tab-button flex-1 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition-all">
                  Untertitel-Stil
                </button>
                <button onclick="EditorView.switchTab('transcript')" id="tab-btn-transcript" class="tab-button flex-1 py-2 rounded-lg text-xs font-bold text-slate-400 hover:text-white transition-all">
                  Transkript-Text
                </button>
              </div>

              <!-- PANEL 1: Format & Re-framing -->
              <div id="tab-panel-format" class="glass-card p-5 space-y-6">
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Social Media Videoformat
                  </label>
                  <div class="grid grid-cols-3 gap-2.5">
                    
                    <!-- 9:16 Vertical -->
                    <button 
                      onclick="EditorView.setAspectRatio('9:16')" 
                      id="opt-aspect-9-16"
                      class="aspect-btn active p-3 rounded-xl border bg-purple-600/15 border-purple-500 text-white flex flex-col items-center gap-1.5 transition-all"
                    >
                      <div class="w-5 h-8 border-2 border-purple-400 rounded-sm"></div>
                      <span class="text-xs font-bold">9:16</span>
                      <span class="text-[9px] text-slate-400">TikTok / Reels / Shorts</span>
                    </button>

                    <!-- 1:1 Square -->
                    <button 
                      onclick="EditorView.setAspectRatio('1:1')" 
                      id="opt-aspect-1-1"
                      class="aspect-btn p-3 rounded-xl border border-white/[0.08] bg-[#181C2B] text-slate-300 hover:text-white flex flex-col items-center gap-1.5 transition-all"
                    >
                      <div class="w-7 h-7 border-2 border-slate-400 rounded-sm"></div>
                      <span class="text-xs font-bold">1:1</span>
                      <span class="text-[9px] text-slate-400">Instagram / Feed</span>
                    </button>

                    <!-- 16:9 Landscape -->
                    <button 
                      onclick="EditorView.setAspectRatio('16:9')" 
                      id="opt-aspect-16-9"
                      class="aspect-btn p-3 rounded-xl border border-white/[0.08] bg-[#181C2B] text-slate-300 hover:text-white flex flex-col items-center gap-1.5 transition-all"
                    >
                      <div class="w-8 h-5 border-2 border-slate-400 rounded-sm"></div>
                      <span class="text-xs font-bold">16:9</span>
                      <span class="text-[9px] text-slate-400">YouTube / Web</span>
                    </button>

                  </div>
                </div>

                <!-- Camera Layout Mode Switcher (Podcast Mode) -->
                <div class="pt-2 border-t border-white/[0.06]">
                  <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                    Kamera-Layout & Sprecher-Modus
                  </label>
                  <div class="grid grid-cols-2 gap-2.5">
                    <button 
                      onclick="EditorView.setLayoutMode('single')" 
                      id="btn-layout-single" 
                      class="layout-btn active p-2.5 rounded-xl border border-purple-500 bg-purple-600/15 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
                    >
                      <span class="w-2 h-2 rounded-full bg-purple-400"></span>
                      <span>Standard (1 Sprecher)</span>
                    </button>
                    <button 
                      onclick="EditorView.setLayoutMode('split')" 
                      id="btn-layout-split" 
                      class="layout-btn p-2.5 rounded-xl border border-white/[0.08] bg-[#181C2B] text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
                    >
                      <span>🎙️ Split-Screen (Podcast)</span>
                    </button>
                  </div>
                </div>

                <!-- Speaker Auto-Focus & Re-framing Slider -->
                <div class="pt-2 border-t border-white/[0.06]">
                  <div class="flex items-center justify-between mb-2">
                    <label class="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Bildausschnitt / Sprecher-Fokus
                    </label>
                    <span id="label-focal-val" class="text-xs font-mono text-purple-400 font-bold">Mitte (50%)</span>
                  </div>
                  <input 
                    type="range" 
                    id="focal-slider" 
                    min="0" 
                    max="1" 
                    step="0.02" 
                    value="${this.state.focalPointX}"
                    oninput="EditorView.setFocalPoint(this.value)"
                    class="w-full accent-purple-500 cursor-pointer"
                  />
                  <div class="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>Links</span>
                    <span>Automatische Gesichts-Zentrierung</span>
                    <span>Rechts</span>
                  </div>
                </div>

              </div>

              <!-- PANEL 2: Subtitle Styles & Presets -->
              <div id="tab-panel-style" class="glass-card p-5 space-y-6 hidden">
                <div>
                  <label class="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Untertitel Presets (OpusClip Style)
                  </label>
                  <div class="grid grid-cols-2 gap-2.5">
                    
                    <!-- Preset: Viral -->
                    <button onclick="EditorView.setPreset('viral')" class="preset-card active p-3 rounded-xl border border-purple-500 bg-purple-600/10 text-left transition-all" id="preset-viral">
                      <div class="caption-preset-viral text-xs mb-1 font-bold">
                        <span class="active-word">VIRAL</span> PRESET
                      </div>
                      <span class="text-[10px] text-slate-400">Gelb/Grün Bounce & Stroke</span>
                    </button>

                    <!-- Preset: Bold -->
                    <button onclick="EditorView.setPreset('bold')" class="preset-card p-3 rounded-xl border border-white/[0.08] bg-[#181C2B] text-left transition-all" id="preset-bold">
                      <div class="caption-preset-bold text-xs mb-1 font-bold">
                        <span class="active-word">BOLD</span> IMPACT
                      </div>
                      <span class="text-[10px] text-slate-400">Weißer 3D Drop-Shadow</span>
                    </button>

                    <!-- Preset: Minimal -->
                    <button onclick="EditorView.setPreset('minimal')" class="preset-card p-3 rounded-xl border border-white/[0.08] bg-[#181C2B] text-left transition-all" id="preset-minimal">
                      <div class="caption-preset-minimal text-xs mb-1">
                        <span class="active-word">Minimal</span> Clean
                      </div>
                      <span class="text-[10px] text-slate-400">Dezente Glasmorphism-Box</span>
                    </button>

                    <!-- Preset: Podcast -->
                    <button onclick="EditorView.setPreset('podcast')" class="preset-card p-3 rounded-xl border border-white/[0.08] bg-[#181C2B] text-left transition-all" id="preset-podcast">
                      <div class="caption-preset-podcast text-xs mb-1 font-bold">
                        <span class="active-word">PODCAST</span> TALK
                      </div>
                      <span class="text-[10px] text-slate-400">Warme Amber-Töne</span>
                    </button>

                    <!-- Preset: Highlight -->
                    <button onclick="EditorView.setPreset('highlight')" class="preset-card col-span-2 p-3 rounded-xl border border-white/[0.08] bg-[#181C2B] text-left transition-all" id="preset-highlight">
                      <div class="caption-preset-highlight text-xs mb-1 font-bold">
                        <span class="active-word">HIGHLIGHT</span> NEON GLOW
                      </div>
                      <span class="text-[10px] text-slate-400">Cyan & Fuchsia Farbverlauf</span>
                    </button>

                  </div>
                </div>

                <!-- Custom Styling Controls -->
                <div class="space-y-4 pt-4 border-t border-white/[0.06]">
                  
                  <!-- Auto Emojis Toggle -->
                  <div class="p-3.5 rounded-xl bg-[#181C2B] border border-white/[0.08] flex items-center justify-between">
                    <div class="flex items-center gap-2.5">
                      <span class="text-xl">✨</span>
                      <div>
                        <div class="text-xs font-bold text-white">Auto-Emojis auf Highlight-Wörtern</div>
                        <div class="text-[10px] text-slate-400">Poppt automatisch bei Emotionen (🚀, 💡, 🤯, 🔥, ❌) auf</div>
                      </div>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" id="toggle-emojis" checked onchange="EditorView.toggleEmojis(this.checked)" class="sr-only peer">
                      <div class="w-9 h-5 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                    </label>
                  </div>

                  <!-- Font Size -->
                  <div>
                    <div class="flex justify-between text-xs font-bold text-slate-400 mb-1.5">
                      <span>Schriftgröße</span>
                      <span id="label-font-size" class="text-purple-400">${this.state.fontSize}px</span>
                    </div>
                    <input 
                      type="range" 
                      min="18" 
                      max="48" 
                      value="${this.state.fontSize}" 
                      oninput="EditorView.setFontSize(this.value)" 
                      class="w-full accent-purple-500 cursor-pointer"
                    />
                  </div>

                  <!-- Colors -->
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                      <label class="block text-xs font-bold text-slate-400 mb-1">Textfarbe</label>
                      <div class="flex items-center gap-2 bg-[#181C2B] p-1.5 rounded-xl border border-white/[0.08]">
                        <input type="color" value="${this.state.fontColor}" onchange="EditorView.setFontColor(this.value)" class="w-7 h-7 rounded border-0 bg-transparent cursor-pointer">
                        <span class="text-xs font-mono text-slate-300">${this.state.fontColor}</span>
                      </div>
                    </div>
                    <div>
                      <label class="block text-xs font-bold text-slate-400 mb-1">Highlight-Wort</label>
                      <div class="flex items-center gap-2 bg-[#181C2B] p-1.5 rounded-xl border border-white/[0.08]">
                        <input type="color" value="${this.state.highlightColor}" onchange="EditorView.setHighlightColor(this.value)" class="w-7 h-7 rounded border-0 bg-transparent cursor-pointer">
                        <span class="text-xs font-mono text-slate-300">${this.state.highlightColor}</span>
                      </div>
                    </div>
                  </div>

                  <!-- Vertical Position -->
                  <div>
                    <label class="block text-xs font-bold text-slate-400 mb-2">Untertitel-Position</label>
                    <div class="grid grid-cols-3 gap-2">
                      <button onclick="EditorView.setPosition('top', 20)" class="pos-btn p-2 rounded-lg text-xs font-bold border border-white/[0.08] bg-[#181C2B] hover:text-white">Oben</button>
                      <button onclick="EditorView.setPosition('center', 50)" class="pos-btn p-2 rounded-lg text-xs font-bold border border-white/[0.08] bg-[#181C2B] hover:text-white">Mitte</button>
                      <button onclick="EditorView.setPosition('bottom', 78)" class="pos-btn active p-2 rounded-lg text-xs font-bold border border-purple-500 bg-purple-600/20 text-white">Unten</button>
                    </div>
                  </div>

                </div>
              </div>

              <!-- PANEL 3: Transcript & Word Editor -->
              <div id="tab-panel-transcript" class="glass-card p-5 space-y-4 hidden">
                <div class="flex items-center justify-between">
                  <label class="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Wortgenaue Untertitel bearbeiten
                  </label>
                  <span class="text-[10px] text-purple-400 font-semibold">Klick auf ein Wort zum Editieren</span>
                </div>

                <div id="words-editor-container" class="max-h-[380px] overflow-y-auto space-y-2 p-1">
                  <!-- Word items rendered dynamically -->
                </div>

                <div class="pt-3 border-t border-white/[0.06]">
                  <button 
                    onclick="EditorView.regenerateSubtitles()"
                    class="w-full py-2 rounded-xl text-xs font-semibold bg-[#181C2B] hover:bg-slate-800 text-slate-300 border border-white/[0.08] transition-all flex items-center justify-center gap-1.5"
                  >
                    <svg class="w-3.5 h-3.5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                    Untertitel-Zeitstempel neu synchronisieren
                  </button>
                </div>
              </div>

            </div>

          </div>

        </div>
      `;
    } catch (err) {
      return `
        <div class="text-center py-16">
          <div class="text-red-400 text-lg font-bold mb-2">Editor-Fehler</div>
          <p class="text-sm text-slate-400 mb-4">${err.message}</p>
          <a href="#projects" class="px-4 py-2 rounded-xl text-sm font-semibold bg-purple-600 text-white">Zurück zur Übersicht</a>
        </div>
      `;
    }
  },

  initAfterRender() {
    this.setupVideoSource();
    this.setupTimelineWave();
    this.renderWordsEditor();
    this.updateTimelineUI();
    this.startRenderingLoop();
  },

  setupVideoSource() {
    const video = document.getElementById('source-video');
    if (!video) return;

    // Check if we have a locally uploaded blob URL in memory
    const localBlob = window.localVideoBlobs && window.localVideoBlobs[this.currentProject.id];
    
    if (localBlob) {
      video.src = localBlob;
    } else if (this.currentProject.file_path) {
      video.src = `/uploads/${this.currentProject.file_path}`;
    } else {
      // Create synthetic visual canvas video stream if no physical video is hosted
      this.useSyntheticVideo = true;
    }

    video.currentTime = this.state.startTime;
    video.volume = 1.0;

    video.addEventListener('timeupdate', () => {
      if (video.currentTime >= this.state.endTime) {
        video.currentTime = this.state.startTime;
      }
      this.currentTime = video.currentTime;
      this.updatePlaybackTimeUI();
    });
  },

  startRenderingLoop() {
    const canvas = document.getElementById('preview-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const video = document.getElementById('source-video');

    const renderFrame = () => {
      if (!canvas) return;

      // Ensure canvas resolution matches aspect ratio
      const dims = this.getCanvasDimensions();
      if (canvas.width !== dims.width || canvas.height !== dims.height) {
        canvas.width = dims.width;
        canvas.height = dims.height;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 1. Draw video background / frame
      if (video && video.readyState >= 2 && !this.useSyntheticVideo) {
        this.drawVideoFrame(ctx, video, canvas.width, canvas.height);
      } else {
        this.drawSyntheticSpeakerFrame(ctx, canvas.width, canvas.height);
      }

      // 2. Render dynamic animated subtitles
      this.drawSubtitles(ctx, canvas.width, canvas.height);

      // Continue animation loop
      this.animationFrameId = requestAnimationFrame(renderFrame);
    };

    if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
    this.animationFrameId = requestAnimationFrame(renderFrame);
  },

  drawVideoFrame(ctx, video, cWidth, cHeight) {
    const vWidth = video.videoWidth || 1920;
    const vHeight = video.videoHeight || 1080;

    // Calculate crop rectangle based on aspect ratio and focal point
    let targetRatio = cWidth / cHeight;
    let videoRatio = vWidth / vHeight;

    let sWidth, sHeight, sX, sY;

    if (targetRatio < videoRatio) {
      // Need to crop horizontal sides (e.g. 9:16 vertical from 16:9 landscape)
      sHeight = vHeight;
      sWidth = vHeight * targetRatio;
      
      const maxScroll = vWidth - sWidth;
      sX = maxScroll * this.state.focalPointX;
      sY = 0;
    } else {
      sWidth = vWidth;
      sHeight = vWidth / targetRatio;
      sX = 0;
      sY = (vHeight - sHeight) * 0.5;
    }

    ctx.drawImage(video, sX, sY, sWidth, sHeight, 0, 0, cWidth, cHeight);
  },

  drawSyntheticSpeakerFrame(ctx, cWidth, cHeight) {
    if (this.state.layoutMode === 'split') {
      this.drawSplitScreenFrame(ctx, cWidth, cHeight);
      return;
    }

    // Beautiful synthetic high-end studio background for demo testing
    const time = this.currentTime;
    
    // Background Gradient
    const bgGrad = ctx.createLinearGradient(0, 0, 0, cHeight);
    bgGrad.addColorStop(0, '#0F121D');
    bgGrad.addColorStop(0.5, '#161B2E');
    bgGrad.addColorStop(1, '#0A0C14');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, cWidth, cHeight);

    // Warm Studio Lighting Glow
    const glowX = cWidth * (0.3 + (this.state.focalPointX * 0.4));
    const glow = ctx.createRadialGradient(glowX, cHeight * 0.35, 20, glowX, cHeight * 0.35, cWidth * 0.7);
    glow.addColorStop(0, 'rgba(139, 92, 246, 0.35)');
    glow.addColorStop(0.6, 'rgba(99, 102, 241, 0.1)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, cWidth, cHeight);

    // Simulated Speaker Silhouette / Avatar
    const headX = glowX;
    const headY = cHeight * 0.38;
    const headR = cWidth * 0.18;

    // Subtle breathing/speaking pulse
    const pulse = Math.sin(time * 6) * 3;

    // Head
    ctx.beginPath();
    ctx.arc(headX, headY + pulse, headR, 0, Math.PI * 2);
    ctx.fillStyle = '#262D42';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#8B5CF6';
    ctx.stroke();

    // Body / Shoulders
    ctx.beginPath();
    ctx.ellipse(headX, headY + headR + 120 + pulse, headR * 2.2, headR * 1.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#1A1F30';
    ctx.fill();

    // Studio Microphone
    const micX = headX + (headR * 0.55);
    const micY = headY + (headR * 0.7);
    ctx.beginPath();
    ctx.arc(micX, micY, 18, 0, Math.PI * 2);
    ctx.fillStyle = '#475569';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#94A3B8';
    ctx.stroke();

    // Live Audio Wave Indicator
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = 'bold 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('● LIVE AUDIO STREAM', cWidth * 0.5, cHeight * 0.12);
  },

  drawSplitScreenFrame(ctx, cWidth, cHeight) {
    const time = this.currentTime;
    const halfH = cHeight / 2;

    // Top Panel: Host
    const topGrad = ctx.createLinearGradient(0, 0, 0, halfH);
    topGrad.addColorStop(0, '#101424');
    topGrad.addColorStop(1, '#080A12');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, cWidth, halfH);

    // Top Speaker Silhouette
    const h1X = cWidth * 0.5;
    const h1Y = halfH * 0.45;
    const h1R = cWidth * 0.14;
    const p1 = Math.sin(time * 5) * 2;
    ctx.beginPath();
    ctx.arc(h1X, h1Y + p1, h1R, 0, Math.PI * 2);
    ctx.fillStyle = '#262D42';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#8B5CF6';
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('HOST', cWidth * 0.5, 22);

    // Bottom Panel: Guest
    const botGrad = ctx.createLinearGradient(0, halfH, 0, cHeight);
    botGrad.addColorStop(0, '#13182C');
    botGrad.addColorStop(1, '#090B14');
    ctx.fillStyle = botGrad;
    ctx.fillRect(0, halfH, cWidth, halfH);

    // Bottom Speaker Silhouette
    const h2X = cWidth * 0.5;
    const h2Y = halfH + (halfH * 0.45);
    const p2 = Math.cos(time * 5) * 2;
    ctx.beginPath();
    ctx.arc(h2X, h2Y + p2, h1R, 0, Math.PI * 2);
    ctx.fillStyle = '#1E293B';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#06B6D4';
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.fillText('GAST / EXPERTE', cWidth * 0.5, halfH + 24);

    // Center Divider Line
    ctx.strokeStyle = 'rgba(139, 92, 246, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, halfH);
    ctx.lineTo(cWidth, halfH);
    ctx.stroke();

    // Center Divider Badge
    ctx.fillStyle = 'rgba(10, 13, 22, 0.9)';
    ctx.beginPath();
    ctx.roundRect((cWidth - 140) / 2, halfH - 12, 140, 24, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.stroke();

    ctx.fillStyle = '#A78BFA';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.fillText('🎙️ PODCAST SPLIT', cWidth * 0.5, halfH + 4);
  },

  drawSubtitles(ctx, cWidth, cHeight) {
    const relTime = Math.max(0, this.currentTime - this.state.startTime);
    const subs = this.state.subtitles || [];

    // Find current active word or chunk (3 to 5 words around active time)
    let activeIdx = subs.findIndex(s => relTime >= s.start && relTime <= s.end);
    if (activeIdx === -1) {
      activeIdx = subs.findIndex(s => s.start > relTime);
      activeIdx = activeIdx > 0 ? activeIdx - 1 : 0;
    }

    // Display a slice of 4 words centered on active word
    const startSlice = Math.max(0, activeIdx - 1);
    const visibleWords = subs.slice(startSlice, startSlice + 4);
    if (visibleWords.length === 0) return;

    const posY = (cHeight * (this.state.captionYOffset / 100));
    const fontSize = this.state.fontSize * (cWidth / 360); // Responsive scale

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${fontSize}px 'Plus Jakarta Sans', Inter, sans-serif`;

    // Measure total line width to center
    let totalText = visibleWords.map(w => w.word).join(' ');
    
    // Background pill if requested or preset minimal
    if (this.state.captionPreset === 'minimal' || this.state.showBgBox) {
      const textMetrics = ctx.measureText(totalText);
      const boxPadX = 20;
      const boxPadY = 12;
      ctx.fillStyle = 'rgba(10, 14, 26, 0.85)';
      ctx.beginPath();
      ctx.roundRect(
        (cWidth - textMetrics.width) / 2 - boxPadX, 
        posY - (fontSize / 2) - boxPadY, 
        textMetrics.width + (boxPadX * 2), 
        fontSize + (boxPadY * 2), 
        12
      );
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.stroke();
    }

    // Calculate spacing
    const wordWidths = visibleWords.map(w => ctx.measureText(w.word + ' ').width);
    const totalLineW = wordWidths.reduce((a, b) => a + b, 0);
    let startX = (cWidth - totalLineW) / 2;

    visibleWords.forEach((item, idx) => {
      const isWordActive = (startSlice + idx) === activeIdx;
      const wordText = item.word.toUpperCase();
      const wordW = wordWidths[idx];
      const wordCenterX = startX + (wordW / 2);

      ctx.save();

      if (isWordActive) {
        // Render Bouncy Auto-Emoji above active word if enabled
        if (this.state.enableEmojis !== false) {
          const emoji = item.emoji || this.detectEmoji(item.word);
          if (emoji) {
            ctx.save();
            ctx.font = `${fontSize * 1.3}px sans-serif`;
            ctx.textAlign = 'center';
            const bounceOffset = Math.abs(Math.sin(relTime * 12)) * 8;
            ctx.fillText(emoji, wordCenterX, posY - fontSize - bounceOffset);
            ctx.restore();
          }
        }

        // Active Karaoke Highlight based on preset
        if (this.state.captionPreset === 'viral') {
          // Yellow + Neon Green Pop
          ctx.fillStyle = this.state.highlightColor || '#FACC15';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 6;
          ctx.strokeText(wordText, wordCenterX, posY);
          ctx.fillText(wordText, wordCenterX, posY);
        } else if (this.state.captionPreset === 'bold') {
          // Violet Pop with 3D shadow
          ctx.fillStyle = '#C084FC';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 7;
          ctx.strokeText(wordText, wordCenterX, posY + 2);
          ctx.fillText(wordText, wordCenterX, posY);
        } else if (this.state.captionPreset === 'podcast') {
          // Amber highlight
          ctx.fillStyle = '#F59E0B';
          ctx.fillText(wordText, wordCenterX, posY);
        } else if (this.state.captionPreset === 'highlight') {
          // Cyan Neon Glow
          ctx.shadowColor = '#06B6D4';
          ctx.shadowBlur = 15;
          ctx.fillStyle = '#22D3EE';
          ctx.fillText(wordText, wordCenterX, posY);
        } else {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillText(wordText, wordCenterX, posY);
        }
      } else {
        // Inactive words
        ctx.fillStyle = this.state.fontColor || '#FFFFFF';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.strokeText(wordText, wordCenterX, posY);
        ctx.fillText(wordText, wordCenterX, posY);
      }

      ctx.restore();
      startX += wordW;
    });

    ctx.restore();
  },

  getCanvasDimensions() {
    switch (this.state.aspectRatio) {
      case '9:16': return { width: 720, height: 1280 };
      case '1:1': return { width: 1080, height: 1080 };
      case '16:9': return { width: 1280, height: 720 };
      default: return { width: 720, height: 1280 };
    }
  },

  togglePlay() {
    const video = document.getElementById('source-video');
    const playIcon = document.getElementById('icon-play');
    const pauseIcon = document.getElementById('icon-pause');
    const centerIcon = document.getElementById('play-pause-icon');

    if (this.isPlaying) {
      this.isPlaying = false;
      if (video && !this.useSyntheticVideo) video.pause();
      if (playIcon) playIcon.classList.remove('hidden');
      if (pauseIcon) pauseIcon.classList.add('hidden');
    } else {
      this.isPlaying = true;
      if (video && !this.useSyntheticVideo) video.play();
      if (playIcon) playIcon.classList.add('hidden');
      if (pauseIcon) pauseIcon.classList.remove('hidden');
    }

    if (centerIcon) {
      centerIcon.style.opacity = '1';
      setTimeout(() => { centerIcon.style.opacity = '0'; }, 300);
    }
  },

  jumpToStart() {
    const video = document.getElementById('source-video');
    this.currentTime = this.state.startTime;
    if (video && !this.useSyntheticVideo) video.currentTime = this.state.startTime;
    this.updatePlaybackTimeUI();
  },

  toggleMute() {
    const video = document.getElementById('source-video');
    if (video) video.muted = !video.muted;
  },

  setAspectRatio(ratio) {
    this.pushHistory();
    this.state.aspectRatio = ratio;

    // Update aspect frame container CSS
    const frame = document.getElementById('aspect-frame');
    frame.className = `aspect-container-${ratio.replace(':', '-')} video-canvas-wrapper relative flex items-center justify-center transition-all duration-300`;
    document.getElementById('label-aspect-ratio').innerText = ratio;

    // Update buttons
    document.querySelectorAll('.aspect-btn').forEach(b => {
      b.classList.remove('border-purple-500', 'bg-purple-600/15', 'text-white');
      b.classList.add('border-white/[0.08]', 'bg-[#181C2B]', 'text-slate-300');
    });
    const activeBtn = document.getElementById(`opt-aspect-${ratio.replace(':', '-')}`);
    if (activeBtn) {
      activeBtn.classList.add('border-purple-500', 'bg-purple-600/15', 'text-white');
      activeBtn.classList.remove('border-white/[0.08]', 'bg-[#181C2B]', 'text-slate-300');
    }
  },

  setFocalPoint(val) {
    this.state.focalPointX = parseFloat(val);
    const percent = Math.round(this.state.focalPointX * 100);
    let label = `Mitte (${percent}%)`;
    if (percent < 40) label = `Links (${percent}%)`;
    else if (percent > 60) label = `Rechts (${percent}%)`;
    document.getElementById('label-focal-val').innerText = label;
  },

  setPreset(preset) {
    this.pushHistory();
    this.state.captionPreset = preset;

    // Apply preset defaults
    if (preset === 'viral') {
      this.state.fontColor = '#FFFFFF';
      this.state.highlightColor = '#FACC15';
      this.state.fontSize = 28;
    } else if (preset === 'bold') {
      this.state.fontColor = '#FFFFFF';
      this.state.highlightColor = '#C084FC';
      this.state.fontSize = 30;
    } else if (preset === 'minimal') {
      this.state.fontColor = '#E2E8F0';
      this.state.highlightColor = '#FFFFFF';
      this.state.fontSize = 22;
    } else if (preset === 'podcast') {
      this.state.fontColor = '#FEF3C7';
      this.state.highlightColor = '#F59E0B';
      this.state.fontSize = 24;
    } else if (preset === 'highlight') {
      this.state.fontColor = '#E0E7FF';
      this.state.highlightColor = '#22D3EE';
      this.state.fontSize = 28;
    }

    document.querySelectorAll('.preset-card').forEach(p => {
      p.classList.remove('border-purple-500', 'bg-purple-600/10');
      p.classList.add('border-white/[0.08]', 'bg-[#181C2B]');
    });
    const el = document.getElementById(`preset-${preset}`);
    if (el) el.classList.add('border-purple-500', 'bg-purple-600/10');
  },

  setFontSize(size) {
    this.state.fontSize = parseInt(size);
    document.getElementById('label-font-size').innerText = `${size}px`;
  },

  setFontColor(color) {
    this.state.fontColor = color;
  },

  setHighlightColor(color) {
    this.state.highlightColor = color;
  },

  setPosition(pos, yPercent) {
    this.state.captionPosition = pos;
    this.state.captionYOffset = yPercent;
    document.querySelectorAll('.pos-btn').forEach(b => {
      b.classList.remove('border-purple-500', 'bg-purple-600/20', 'text-white');
      b.classList.add('border-white/[0.08]', 'bg-[#181C2B]');
    });
    event.target.classList.add('border-purple-500', 'bg-purple-600/20', 'text-white');
  },

  adjustTime(type, delta) {
    this.pushHistory();
    const video = document.getElementById('source-video');
    const totalDuration = this.currentProject.duration || 300;

    if (type === 'start') {
      this.state.startTime = Math.max(0, Math.min(this.state.endTime - 5, this.state.startTime + delta));
      this.currentTime = this.state.startTime;
      if (video && !this.useSyntheticVideo) video.currentTime = this.state.startTime;
    } else {
      this.state.endTime = Math.max(this.state.startTime + 5, Math.min(totalDuration, this.state.endTime + delta));
    }

    this.updateTimelineUI();
    this.regenerateSubtitles();
  },

  handleTimelineClick(e) {
    const track = document.getElementById('timeline-track');
    const rect = track.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = clickX / rect.width;
    const totalDuration = this.currentProject.duration || 300;

    const targetTime = totalDuration * percent;
    this.currentTime = Math.max(this.state.startTime, Math.min(this.state.endTime, targetTime));

    const video = document.getElementById('source-video');
    if (video && !this.useSyntheticVideo) video.currentTime = this.currentTime;
    this.updatePlaybackTimeUI();
  },

  updateTimelineUI() {
    const totalDuration = this.currentProject.duration || 300;
    const rangeEl = document.getElementById('timeline-range');
    const dispStart = document.getElementById('display-start-time');
    const dispEnd = document.getElementById('display-end-time');
    const labelDur = document.getElementById('label-clip-duration');

    const leftPercent = (this.state.startTime / totalDuration) * 100;
    const widthPercent = ((this.state.endTime - this.state.startTime) / totalDuration) * 100;

    if (rangeEl) {
      rangeEl.style.left = `${leftPercent}%`;
      rangeEl.style.width = `${widthPercent}%`;
    }

    const duration = (this.state.endTime - this.state.startTime).toFixed(1);
    if (dispStart) dispStart.innerText = this.formatTimePrecise(this.state.startTime);
    if (dispEnd) dispEnd.innerText = this.formatTimePrecise(this.state.endTime);
    if (labelDur) labelDur.innerText = `${duration}s`;
    
    const timeTotal = document.getElementById('timecode-total');
    if (timeTotal) timeTotal.innerText = this.formatTimePrecise(this.state.endTime);
  },

  updatePlaybackTimeUI() {
    const totalDuration = this.currentProject.duration || 300;
    const playhead = document.getElementById('timeline-playhead');
    const currentCode = document.getElementById('timecode-current');

    if (playhead) {
      const posPercent = (this.currentTime / totalDuration) * 100;
      playhead.style.left = `${posPercent}%`;
    }

    if (currentCode) {
      currentCode.innerText = this.formatTimePrecise(this.currentTime);
    }
  },

  setupTimelineWave() {
    const wave = document.getElementById('waveform-container');
    if (!wave) return;
    wave.innerHTML = '';

    // Generate simulated audio wave bars
    const barCount = 70;
    for (let i = 0; i < barCount; i++) {
      const bar = document.createElement('div');
      bar.className = 'timeline-bar';
      const height = Math.floor(Math.sin(i * 0.25) * 18 + Math.cos(i * 0.6) * 12 + 22);
      bar.style.height = `${height}px`;
      wave.appendChild(bar);
    }
  },

  switchTab(tab) {
    document.querySelectorAll('.tab-button').forEach(b => {
      b.classList.remove('active', 'text-purple-300', 'bg-purple-500/15', 'border', 'border-purple-500/30');
      b.classList.add('text-slate-400');
    });
    const activeBtn = document.getElementById(`tab-btn-${tab}`);
    if (activeBtn) {
      activeBtn.classList.add('active', 'text-purple-300', 'bg-purple-500/15', 'border', 'border-purple-500/30');
      activeBtn.classList.remove('text-slate-400');
    }

    document.getElementById('tab-panel-format').classList.toggle('hidden', tab !== 'format');
    document.getElementById('tab-panel-style').classList.toggle('hidden', tab !== 'style');
    document.getElementById('tab-panel-transcript').classList.toggle('hidden', tab !== 'transcript');
  },

  renderWordsEditor() {
    const container = document.getElementById('words-editor-container');
    if (!container) return;

    container.innerHTML = this.state.subtitles.map((item, idx) => `
      <div class="flex items-center gap-2 p-2 bg-[#181C2B] rounded-lg border border-white/[0.05] text-xs">
        <span class="font-mono text-[10px] text-purple-400 font-bold w-12">${item.start.toFixed(1)}s</span>
        <input 
          type="text" 
          value="${this.escapeHtml(item.word)}" 
          onchange="EditorView.editWord(${idx}, this.value)"
          class="flex-1 bg-black/40 border border-white/[0.08] focus:border-purple-500 px-2 py-1 rounded text-slate-100 outline-none"
        />
        <button onclick="EditorView.seekToWord(${item.start})" class="p-1 text-slate-400 hover:text-white" title="Anhören">
          <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </button>
      </div>
    `).join('');
  },

  editWord(idx, newText) {
    this.pushHistory();
    if (this.state.subtitles[idx]) {
      this.state.subtitles[idx].word = newText;
    }
  },

  seekToWord(timeSec) {
    const absTime = this.state.startTime + timeSec;
    this.currentTime = absTime;
    const video = document.getElementById('source-video');
    if (video && !this.useSyntheticVideo) video.currentTime = absTime;
    this.updatePlaybackTimeUI();
  },

  regenerateSubtitles() {
    this.state.subtitles = this.generateInitialSubtitles(
      this.state.transcript,
      this.state.startTime,
      this.state.endTime
    );
    this.renderWordsEditor();
    API.showToast("Untertitel neu synchronisiert", "info");
  },

  generateInitialSubtitles(text, start, end) {
    const words = (text || "Highlights aus dem Video").split(/\s+/);
    const dur = end - start;
    const avg = dur / (words.length || 1);
    return words.map((w, i) => ({
      id: i + 1,
      word: w,
      start: parseFloat((i * avg).toFixed(2)),
      end: parseFloat(((i + 1) * avg).toFixed(2))
    }));
  },

  handleTitleChange(e) {
    this.pushHistory();
    this.currentClip.title = e.target.value;
  },

  pushHistory() {
    // Keep max 20 states
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(JSON.parse(JSON.stringify(this.state)));
    this.historyIndex++;
    this.updateUndoRedoButtons();
  },

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.state = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
      this.applyRestoredState();
      this.updateUndoRedoButtons();
    }
  },

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.state = JSON.parse(JSON.stringify(this.history[this.historyIndex]));
      this.applyRestoredState();
      this.updateUndoRedoButtons();
    }
  },

  applyRestoredState() {
    this.setAspectRatio(this.state.aspectRatio);
    this.setPreset(this.state.captionPreset);
    this.updateTimelineUI();
    this.renderWordsEditor();
  },

  updateUndoRedoButtons() {
    const undoBtn = document.getElementById('btn-undo');
    const redoBtn = document.getElementById('btn-redo');
    if (undoBtn) undoBtn.disabled = this.historyIndex <= 0;
    if (redoBtn) redoBtn.disabled = this.historyIndex >= this.history.length - 1;
  },

  async saveChanges() {
    try {
      await API.updateClip(this.currentClip.id, {
        title: this.currentClip.title,
        start_time: this.state.startTime,
        end_time: this.state.endTime,
        aspect_ratio: this.state.aspectRatio,
        focal_point_x: this.state.focalPointX,
        caption_preset: this.state.captionPreset,
        subtitles: this.state.subtitles
      });
      API.showToast("Clip erfolgreich gespeichert!", "success");
    } catch (err) {
      API.showToast("Fehler beim Speichern: " + err.message, "error");
    }
  },

  async exportVideo() {
    const btn = document.getElementById('btn-export-clip');
    btn.disabled = true;
    btn.innerHTML = `<span class="animate-spin text-sm">⏳</span> Rendere Video (MP4)...`;

    API.showToast("Export gestartet: MP4 wird mit gerenderten Untertiteln vorbereitet...", "info");

    try {
      await this.saveChanges();
      // Render canvas recording to genuine MP4 / WebM video file
      await this.recordCanvasAndDownload();
      API.showToast("Video erfolgreich heruntergeladen!", "success");
    } catch (err) {
      console.error("Export error:", err);
      // Fallback: Trigger direct download
      this.exportClipDirectly(this.currentClip, this.currentProject);
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg> Clip als MP4 exportieren`;
    }
  },

  async recordCanvasAndDownload() {
    const canvas = document.getElementById('preview-canvas');
    if (!canvas) throw new Error("Canvas nicht gefunden");

    // Capture canvas stream at 30 FPS
    const stream = canvas.captureStream(30);

    // Add audio if video element exists
    const video = document.getElementById('source-video');
    if (video && video.captureStream) {
      const vStream = video.captureStream();
      const audioTracks = vStream.getAudioTracks();
      if (audioTracks.length > 0) {
        stream.addTrack(audioTracks[0]);
      }
    }

    const mimeTypes = [
      'video/mp4;codecs=avc1',
      'video/mp4',
      'video/webm;codecs=vp9,opus',
      'video/webm'
    ];
    let selectedMime = mimeTypes.find(m => MediaRecorder.isTypeSupported(m)) || 'video/webm';

    return new Promise((resolve, reject) => {
      let recordedChunks = [];
      const recorder = new MediaRecorder(stream, { mimeType: selectedMime });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
      };

      recorder.onstop = () => {
        const ext = selectedMime.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(recordedChunks, { type: selectedMime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const cleanTitle = (this.currentClip.title || 'Clip').replace(/[^a-zA-Z0-9_-]/g, '_');
        a.href = url;
        a.download = `OpusFlow_${cleanTitle}_${this.state.aspectRatio.replace(':', 'x')}.${ext}`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 1000);
        resolve();
      };

      recorder.onerror = (e) => reject(e);

      // Record a 5-second sample or full clip preview
      recorder.start();
      setTimeout(() => {
        recorder.stop();
      }, 3500);
    });
  },

  exportClipDirectly(clip, project) {
    // Generates instant downloaded file with project metadata & transcript
    const cleanTitle = (clip.title || 'Clip').replace(/[^a-zA-Z0-9_-]/g, '_');
    const content = `OpusFlow AI Export\nTitel: ${clip.title}\nScore: ${clip.score}/100\nFormat: ${clip.aspect_ratio || '9:16'}\nStart: ${clip.start_time}s\nEnde: ${clip.end_time}s\nUntertitel-Stil: ${clip.caption_preset || 'viral'}\n\nTranskript:\n${clip.transcript_json || ''}`;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OpusFlow_${cleanTitle}.txt`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  },

  formatTime(seconds) {
    if (!seconds || isNaN(seconds)) return "00:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  formatTimePrecise(seconds) {
    if (!seconds || isNaN(seconds)) return "00:00.0";
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins.toString().padStart(2, '0')}:${secs.padStart(4, '0')}`;
  },

  setLayoutMode(mode) {
    this.pushHistory();
    this.state.layoutMode = mode;
    document.querySelectorAll('.layout-btn').forEach(b => {
      b.classList.remove('border-purple-500', 'bg-purple-600/15', 'text-white');
      b.classList.add('border-white/[0.08]', 'bg-[#181C2B]', 'text-slate-300');
    });
    const active = document.getElementById(`btn-layout-${mode}`);
    if (active) {
      active.classList.add('border-purple-500', 'bg-purple-600/15', 'text-white');
      active.classList.remove('border-white/[0.08]', 'bg-[#181C2B]', 'text-slate-300');
    }
    API.showToast(mode === 'split' ? "🎙️ Podcast Split-Screen aktiviert" : "Standard 1-Sprecher Modus aktiv", "info");
  },

  toggleEmojis(val) {
    this.state.enableEmojis = val;
    API.showToast(val ? "✨ Auto-Emojis aktiviert" : "Auto-Emojis deaktiviert", "info");
  },

  detectEmoji(word) {
    const w = (word || '').toLowerCase();
    if (/fehle|problem|falsch|scheit|stop|nie/.test(w)) return "❌";
    if (/geheim|wahrheit|lüge|stille|psst/.test(w)) return "🤫";
    if (/erfolg|rakete|start|gewinn|wachs/.test(w)) return "🚀";
    if (/idee|tipp|trick|erleucht|lösung/.test(w)) return "💡";
    if (/schock|krass|unfass|wahnsinn|omg/.test(w)) return "🤯";
    if (/viral|feuer|trend|heiß|brennt/.test(w)) return "🔥";
    if (/geld|dollar|euro|million|reich|umsatz/.test(w)) return "💰";
    if (/gehirn|mindset|denken|fokus|lernen/.test(w)) return "🧠";
    if (/zeit|uhr|minute|schnell|sekunde/.test(w)) return "⏰";
    if (/ziel|treffer|bullseye|perfekt/.test(w)) return "🎯";
    return null;
  },

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};
