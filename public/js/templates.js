// public/js/templates.js - Preset Templates Showcase

const TemplatesView = {
  templates: [
    {
      id: 'tiktok_viral',
      title: 'TikTok Viral Hook',
      category: 'Reels & Shorts',
      aspectRatio: '9:16',
      captionPreset: 'viral',
      description: 'Extrem starker Kontrast mit gelb-grün animierten Wörtern. Perfekt für High-Retention Hooks.',
      tags: ['Viral', 'TikTok', 'High Energy'],
      gradient: 'from-amber-500/20 to-emerald-500/20'
    },
    {
      id: 'podcast_leader',
      title: 'Podcast Thought Leader',
      category: 'Long-Form to Shorts',
      aspectRatio: '9:16',
      captionPreset: 'podcast',
      description: 'Warme Farbtöne mit dezentem Box-Highlight. Ideal für Interviews, Podcasts und Zitate.',
      tags: ['Podcast', 'Interviews', 'Deep Dive'],
      gradient: 'from-amber-600/20 to-orange-500/20'
    },
    {
      id: 'clean_explainer',
      title: 'Shorts Tech Explainer',
      category: 'Education & Tech',
      aspectRatio: '9:16',
      captionPreset: 'minimal',
      description: 'Aufgeräumtes Design mit mattierter Glas-Hintergrundbox. Perfekt für Tutorials und Wissen.',
      tags: ['Tutorial', 'Clean', 'Modern'],
      gradient: 'from-blue-600/20 to-indigo-500/20'
    },
    {
      id: 'linkedin_square',
      title: 'LinkedIn Business Square',
      category: 'B2B & Social Feed',
      aspectRatio: '1:1',
      captionPreset: 'bold',
      description: 'Quadratisches 1:1 Format für maximale Bildschirmfläche im LinkedIn- und Instagram-Feed.',
      tags: ['Square 1:1', 'Business', 'Bold Impact'],
      gradient: 'from-purple-600/20 to-pink-500/20'
    },
    {
      id: 'neon_highlight',
      title: 'Cyber Neon Highlight',
      category: 'Gaming & Future Tech',
      aspectRatio: '9:16',
      captionPreset: 'highlight',
      description: 'Elektrisierender Cyan & Fuchsia Farbverlauf mit leuchtendem Glow für futuristische Themen.',
      tags: ['Neon', 'Glow', 'Eye-Catcher'],
      gradient: 'from-cyan-500/20 to-fuchsia-500/20'
    }
  ],

  render() {
    const cards = this.templates.map(t => `
      <div class="glass-card p-6 border border-white/[0.08] flex flex-col justify-between group hover:border-purple-500/40 transition-all duration-300">
        <div>
          <!-- Visual Header -->
          <div class="h-36 rounded-xl bg-gradient-to-tr ${t.gradient} border border-white/[0.05] flex items-center justify-center relative overflow-hidden mb-4">
            <div class="caption-preset-${t.captionPreset} text-sm font-black px-4 py-2 rounded-lg">
              <span class="active-word">VIRAL</span> PRESET
            </div>
            <span class="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-black/60 backdrop-blur text-purple-300">
              ${t.aspectRatio}
            </span>
          </div>

          <div class="flex items-center gap-2 mb-1.5">
            <span class="cat-badge cat-hook">${t.category}</span>
          </div>
          <h3 class="text-lg font-bold text-white group-hover:text-purple-300 transition-colors mb-2">
            ${t.title}
          </h3>
          <p class="text-xs text-slate-400 mb-4 leading-relaxed">
            ${t.description}
          </p>
        </div>

        <div class="pt-4 border-t border-white/[0.06] flex items-center justify-between">
          <div class="flex items-center gap-1 flex-wrap">
            ${t.tags.map(tag => `<span class="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-slate-400">${tag}</span>`).join('')}
          </div>
          <button 
            onclick="TemplatesView.applyTemplate('${t.id}')"
            class="px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-sm"
          >
            Verwenden
          </button>
        </div>
      </div>
    `).join('');

    return `
      <div class="space-y-6">
        <div>
          <h1 class="text-3xl font-extrabold text-white tracking-tight">Social Media Vorlagen</h1>
          <p class="text-sm text-slate-400 mt-1">Vorkonfigurierte Untertitel- und Format-Presets für virales Wachstum.</p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          ${cards}
        </div>
      </div>
    `;
  },

  applyTemplate(templateId) {
    const t = this.templates.find(x => x.id === templateId);
    if (!t) return;

    API.showToast(`Vorlage "${t.title}" als Standard ausgewählt!`, 'success');
    window.location.hash = '#home';
  }
};
