# OpusFlow AI – Deployment auf Render.com

## Warum nicht Netlify?

OpusFlow AI ist eine klassische Server-App (Ruby/WEBrick), keine statische Website.
Sie braucht:
- einen dauerhaft laufenden Prozess (inkl. Hintergrund-Thread für Auto-Cleanup)
- eine persistente SQLite-Datenbankdatei
- persistenten Speicher für Video-Uploads & -Exports

Netlify bietet nur zustandslose Serverless Functions (max. ~10–15 Min. Laufzeit,
kein dauerhafter Prozess, kein Ruby-Runtime-Support) und keinen persistenten
Datei-Speicher. Das passt architektonisch nicht zusammen – unabhängig von der
Codequalität. Render.com (oder alternativ Railway.app / Fly.io) unterstützt
genau das, was diese App braucht: einen laufenden Docker-Container mit
persistentem Volume.

## Voraussetzung: Code auf GitHub

Render deployt aus einem Git-Repository. Falls der Code noch nicht auf GitHub liegt:

```bash
cd opusflow
git init
git add .
git commit -m "Initial commit"
```
Dann ein neues, leeres Repository auf github.com anlegen und pushen:
```bash
git remote add origin https://github.com/DEIN-USERNAME/opusflow-ai.git
git branch -M main
git push -u origin main
```

## Deployment auf Render (empfohlener Weg: Blueprint)

1. Gehe auf [render.com](https://render.com) und erstelle einen kostenlosen Account.
2. Klicke auf **New +** → **Blueprint**.
3. Verbinde dein GitHub-Repo mit dem OpusFlow-Code.
4. Render erkennt automatisch die `render.yaml` in diesem Ordner und schlägt
   einen Web Service mit Docker-Runtime und einem 1 GB persistenten Volume
   (gemountet unter `/app/storage`) vor.
5. Klicke auf **Apply** – Render baut das Docker-Image und startet den Server.
6. Nach ein paar Minuten ist die App unter einer URL wie
   `https://opusflow-ai.onrender.com` erreichbar.

## Manuelles Deployment (ohne Blueprint)

Falls du lieber manuell konfigurierst:
1. **New +** → **Web Service** → GitHub-Repo auswählen.
2. **Runtime:** Docker (Render erkennt das `Dockerfile` automatisch).
3. **Instance Type:** Starter reicht zum Testen.
4. Unter **Disks** → **Add Disk**:
   - Name: `opusflow-storage`
   - Mount Path: `/app/storage`
   - Size: 1 GB (später erweiterbar)
5. Unter **Environment** → Variable hinzufügen:
   - `STORAGE_DIR` = `/app/storage`
6. Deploy starten.

## Nach dem Deployment

- Öffne die App-URL und gehe zu **Einstellungen**, um deinen
  Google Gemini API-Key einzutragen (wird in der SQLite-DB gespeichert,
  nicht als Umgebungsvariable – daher direkt in der App eintragen, nicht
  in Render selbst).
- Die SQLite-Datenbank und alle Uploads/Exports liegen auf dem persistenten
  Volume unter `/app/storage` und überleben Neustarts und Deployments.
- **Wichtig:** Der kostenlose Render-Plan "schläft" die App nach Inaktivität
  ein (Cold Start beim nächsten Aufruf dauert ein paar Sekunden). Für
  dauerhaft "wache" Verfügbarkeit ist ein bezahlter Plan nötig.

## Alternative: Railway.app oder Fly.io

Beide unterstützen dasselbe `Dockerfile` 1:1:
- **Railway:** Neues Projekt → "Deploy from GitHub repo" → Railway erkennt
  das Dockerfile automatisch. Volume für `/app/storage` unter "Settings → Volumes" anlegen.
- **Fly.io:** `fly launch` im Projektordner ausführen (erkennt das Dockerfile),
  danach `fly volumes create opusflow_storage --size 1` und in `fly.toml`
  unter `[mounts]` auf `/app/storage` mounten.

## Lokal testen (vor dem Deployment)

```bash
bundle install
ruby server.rb
```
Dann im Browser: http://localhost:4000
