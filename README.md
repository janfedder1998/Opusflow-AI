# 🎬 OpusFlow AI – Viral Video Clipping Studio

OpusFlow AI ist eine moderne, professionelle SaaS-Web-App (inspiriert von **OpusClip**, **Descript** und **CapCut**), mit der lange Videos (YouTube, direkte Video-URLs oder Video-Uploads) vollautomatisch per KI in reichweitenstarke Highlight-Shorts für TikTok, Instagram Reels und YouTube Shorts transformiert werden.

---

## 🌟 Kernfunktionen

1. **Video Import & Quellenauswahl:**
   - Großes URL-Eingabefeld für YouTube- und Web-Videolinks
   - Automatische Erkennung & Validierung von Titel, Thumbnail, Dauer und Urheber
   - Drag-and-Drop Uploadbereich für eigene Videodateien (MP4, MOV, WebM)
   - 1-Klick-Demo-Bibliothek für sofortige Tests ohne Dateiupload

2. **6-stufige KI-Analyse & Pipeline:**
   - Mehrstufige Echtzeit-Fortschrittsanzeige:
     `✓ Video erkannt` → `✓ Audio analysiert` → `✓ Transkript erstellt` → `● Highlights werden erkannt` → `○ Clips werden erstellt` → `○ Untertitel werden generiert`
   - Erkennt virale Hooks, kontroverse Aussagen, emotionale Momente, Key Insights und Storytelling
   - Vergibt einen aussagekräftigen **Viral-Score (0–100)** mit Begründung

3. **Social-Media-Formate:**
   - **9:16** (Vertikal für TikTok, Reels, YouTube Shorts)
   - **1:1** (Quadratisch für Feed-Posts & LinkedIn)
   - **16:9** (Querformat für Standard-YouTube & Web)
   - Interaktives Speaker Re-Framing (horizontaler Sprecherfokus)

4. **Wortgenaue animierte Untertitel (OpusClip Karaoke-Presets):**
   - Live-Synchronisierung der Untertitel mit dem gesprochenen Wort
   - 5 vorgefertigte Premium-Presets:
     - **Viral:** Gelb/Grün leuchtende Wörter mit markanter schwarzer Umrandung
     - **Bold:** Weißer Text mit 3D Drop-Shadow
     - **Minimal:** Elegante Glasmorphism-Box mit dezentem Indikator
     - **Podcast:** Warme Amber-Töne für tiefgründige Gespräche
     - **Highlight:** Cyber Neon Glow (Cyan/Fuchsia)
   - Voll anpassbare Schriftgröße, Text- und Highlight-Farben sowie Positionierung

5. **Profi Clip-Editor:**
   - Interaktiver HTML5-Canvas-Videoplayer
   - Visuelle Wellenform-Timeline mit Start- und Endzeit-Trimmern
   - Transkript-Editor: Jedes Wort kann per Klick direkt im Text korrigiert werden
   - Undo/Redo Verlauf (Strg+Z / Strg+Y)
   - Integrierte Render-Engine für MP4/WebM-Videoexport

6. **Export & Downloads:**
   - Einzelner MP4-Download für jeden bearbeiteten Clip
   - **„Alle Clips herunterladen (.ZIP)“**: Bündelt alle Clips, Transkripte und Metadaten in ein ZIP-Archiv

7. **SaaS Dashboard & Einstellungen:**
   - Zähler für erstellte Projekte, Gesamtanzahl Clips, Durchschnitts-Score
   - Speicherverbrauch-Messer (Storage Quota)
   - Konfiguration von Google Gemini (`gemini-2.0-flash`) und OpenAI API-Keys
   - Automatische Bereinigung temporärer Dateien (Auto-Cleanup Timer)

---

## 🚀 Schnellstart

### 1. Server starten
Im Terminal folgenden Befehl ausführen:
```bash
./run.sh
```
Oder direkt mit Ruby:
```bash
ruby server.rb
```

### 2. Im Browser öffnen
Öffne im Browser:
```
http://localhost:4000
```

---

## 🔑 Konfiguration & API-Keys

OpusFlow AI funktioniert **out-of-the-box** mit einer integrierten semantischen NLP-Highlight-Engine.
Für maximale KI-Präzision kann ein **Google Gemini API-Key** hinterlegt werden:

1. Öffne im Menü **Einstellungen**
2. Trage deinen [Google AI Studio Key](https://aistudio.google.com/app/apikey) ein
3. Klicke auf **Einstellungen speichern**

Alternativ können Environment-Variablen gesetzt werden:
```bash
export GEMINI_API_KEY="dein-api-key"
export PORT=4000
ruby server.rb
```

---

## 📁 Architekturübersicht

```
├── server.rb                 # WEBrick HTTP-Server, REST-APIs & Range-206 Streaming
├── run.sh                    # Start-Skript für macOS/Linux
├── lib/
│   ├── db.rb                 # SQLite-Datenbankanbindung & Schema
│   ├── url_resolver.rb       # YouTube oEmbed & Video-URL-Validierung
│   ├── ai_service.rb         # Gemini 2.0 API & semantischer NLP-Analyzer
│   └── seed.rb               # Beispieldaten für den Sofortstart
├── data/
│   └── opusflow.sqlite       # SQLite Datenbank
├── uploads/                  # Hochgeladene Videodateien
├── exports/                  # Gerenderte Clips
└── public/                   # Frontend SPA (Dark SaaS UI)
    ├── index.html            # Host-HTML mit Modal & Nav
    ├── css/
    │   └── style.css         # OpusClip Dark Theme, Badges & Presets
    └── js/
        ├── api.js            # REST API Client & Toasts
        ├── zip.js            # Pure JS ZIP-Archiv-Erstellung (PKZip)
        ├── importer.js       # Video-Import & 1-Klick-Demo-Selector
        ├── progress.js       # 6-Stufen Analyse-Fortschrittsanzeige
        ├── dashboard.js      # Dashboard-Statistiken & Speicher
        ├── project.js        # Projektübersicht & sortierte Clip-Karten
        ├── editor.js         # Pro Clip-Editor (Canvas, Formate, Subtitles)
        ├── templates.js      # Vorlagen-Galerie
        ├── settings.js       # Einstellungen & API-Keys
        ├── router.js         # Hash-Router (#home, #editor, #project...)
        └── app.js            # Globaler Initialisierer & Tastenkürzel
```
