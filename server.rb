# server.rb
$stdout.sync = true
$stderr.sync = true

require 'webrick'
require 'open3'
require 'timeout'
require 'json'
require 'fileutils'
require 'securerandom'
require 'uri'
require 'time'

require_relative 'lib/db'
require_relative 'lib/url_resolver'
require_relative 'lib/ai_service'
require_relative 'lib/seed'

# Ensure directories exist
STORAGE_ROOT = ENV['STORAGE_DIR'] || File.expand_path('..', __FILE__)
PUBLIC_DIR = File.expand_path('../public', __FILE__)
UPLOADS_DIR = File.join(STORAGE_ROOT, 'uploads')
EXPORTS_DIR = File.join(STORAGE_ROOT, 'exports')
FileUtils.mkdir_p(PUBLIC_DIR)
FileUtils.mkdir_p(UPLOADS_DIR)
FileUtils.mkdir_p(EXPORTS_DIR)

# Initialize DB and Seed data
OpusFlow::Database.instance
OpusFlow::Seed.run!

# Monkey-patch WEBrick to stream via socket.write instead of kernel sendfile (which macOS sandbox denies with EPERM)
class WEBrick::HTTPResponse
  def send_body_io(socket)
    while (chunk = @body.read(65536))
      socket.write(chunk)
    end
  end
end


PORT = (ENV['PORT'] || 4000).to_i

# Custom File Servlet supporting HTTP Range Requests (206 Partial Content) for Video Streaming
class VideoFileServlet < WEBrick::HTTPServlet::DefaultFileHandler
  def do_GET(req, res)
    file_path = @root + WEBrick::HTTPUtils.unescape(req.path_info)
    
    unless File.exist?(file_path) && !File.directory?(file_path)
      res.status = 404
      res.body = "File not found"
      return
    end

    file_size = File.size(file_path)
    ext = File.extname(file_path).downcase
    content_type = case ext
                   when '.mp4' then 'video/mp4'
                   when '.webm' then 'video/webm'
                   when '.mov' then 'video/quicktime'
                   when '.m4v' then 'video/x-m4v'
                   when '.jpg', '.jpeg' then 'image/jpeg'
                   when '.png' then 'image/png'
                   when '.json' then 'application/json'
                   when '.css' then 'text/css'
                   when '.js' then 'application/javascript'
                   else 'application/octet-stream'
                   end

    res['Accept-Ranges'] = 'bytes'
    res['Content-Type'] = content_type

    range_header = req['range']
    if range_header && range_header =~ /bytes=(\d+)-(\d*)/
      start_byte = $1.to_i
      end_byte = $2.empty? ? file_size - 1 : $2.to_i
      end_byte = [end_byte, file_size - 1].min

      if start_byte >= file_size || start_byte > end_byte
        res.status = 416
        res['Content-Range'] = "bytes */#{file_size}"
        return
      end

      length = end_byte - start_byte + 1
      res.status = 206
      res['Content-Range'] = "bytes #{start_byte}-#{end_byte}/#{file_size}"
      res['Content-Length'] = length.to_s

      File.open(file_path, 'rb') do |file|
        file.seek(start_byte)
        res.body = file.read(length)
      end
    else
      super
    end
  end
end

# Main API Dispatcher Servlet
class ApiServlet < WEBrick::HTTPServlet::AbstractServlet
  def do_GET(req, res)
    handle_cors(req, res)
    path = req.path.sub(%r{^/api/}, '')
    db = OpusFlow::Database.instance.db

    case path
    when 'stats'
      # Aggregate dashboard analytics
      proj_count = db.get_first_value("SELECT COUNT(*) FROM projects") || 0
      clip_count = db.get_first_value("SELECT COUNT(*) FROM clips") || 0
      avg_score = db.get_first_value("SELECT ROUND(AVG(score), 1) FROM clips") || 91.5
      
      # Calculate storage in MB
      storage_bytes = 0
      [UPLOADS_DIR, EXPORTS_DIR].each do |dir|
        Dir.glob("#{dir}/**/*").each { |f| storage_bytes += File.size(f) if File.file?(f) }
      end
      storage_mb = (storage_bytes / (1024.0 * 1024.0)).round(2)

      json_response(res, {
        projects_count: proj_count.to_i,
        clips_count: clip_count.to_i,
        avg_score: avg_score.to_f,
        storage_mb: storage_mb,
        storage_limit_mb: 500.0
      })

    when 'projects'
      rows = db.execute("SELECT * FROM projects ORDER BY created_at DESC")
      projects = rows.map do |row|
        clip_cnt = db.get_first_value("SELECT COUNT(*) FROM clips WHERE project_id = ?", [row['id']])
        row.merge('clips_count' => clip_cnt.to_i)
      end
      json_response(res, projects)

    when %r{^projects/([^/]+)/status$}
      proj_id = $1
      row = db.get_first_row("SELECT id, status, progress, current_step FROM projects WHERE id = ?", [proj_id])
      total_count = db.get_first_value("SELECT COUNT(*) FROM projects")
      puts "[STATUS] Lookup for id=#{proj_id.inspect} pid=#{Process.pid} total_projects=#{total_count} -> #{row.inspect}"
      if row
        json_response(res, row)
      else
        error_response(res, 404, "Projekt nicht gefunden")
      end

    when %r{^projects/([^/]+)$}
      proj_id = $1
      row = db.get_first_row("SELECT * FROM projects WHERE id = ?", [proj_id])
      if row
        clips = db.execute("SELECT * FROM clips WHERE project_id = ? ORDER BY score DESC", [proj_id])
        clips.map! do |c|
          c['subtitles'] = JSON.parse(c['caption_style_json']) rescue []
          c
        end
        json_response(res, row.merge('clips' => clips))
      else
        error_response(res, 404, "Projekt nicht gefunden")
      end

    when %r{^clips/([^/]+)$}
      clip_id = $1
      clip = db.get_first_row("SELECT * FROM clips WHERE id = ?", [clip_id])
      if clip
        clip['subtitles'] = JSON.parse(clip['caption_style_json']) rescue []
        json_response(res, clip)
      else
        error_response(res, 404, "Clip nicht gefunden")
      end

    when 'settings'
      rows = db.execute("SELECT key, value FROM settings")
      settings_hash = {}
      rows.each { |r| settings_hash[r['key']] = r['value'] }
      # Mask API keys for safety if present
      settings_hash['gemini_api_key_masked'] = settings_hash['gemini_api_key'].to_s.empty? ? "" : "••••••••#{settings_hash['gemini_api_key'][-4..-1]}"
      settings_hash['openai_api_key_masked'] = settings_hash['openai_api_key'].to_s.empty? ? "" : "••••••••#{settings_hash['openai_api_key'][-4..-1]}"
      json_response(res, settings_hash)

    when %r{^social/captions/([^/]+)$}
      clip_id = $1
      clip = db.get_first_row("SELECT * FROM clips WHERE id = ?", [clip_id])
      return error_response(res, 404, "Clip nicht gefunden") unless clip
      project = db.get_first_row("SELECT * FROM projects WHERE id = ?", [clip['project_id']]) || {}
      captions = OpusFlow::AiService.generate_social_captions(clip, project)
      json_response(res, captions)

    when 'schedule'
      # Ensure demo scheduled post exists
      count = db.get_first_value("SELECT COUNT(*) FROM scheduled_posts").to_i
      if count == 0
        first_clip = db.get_first_row("SELECT id, project_id, title FROM clips LIMIT 1")
        if first_clip
          db.execute <<-SQL, ["sched_1", first_clip['id'], first_clip['project_id'], "tiktok", "🤯 Das musst du wissen: #{first_clip['title']}! #fyp #viral", (Time.now + 86400).strftime("%Y-%m-%d %H:%M:00"), "scheduled"]
            INSERT INTO scheduled_posts (id, clip_id, project_id, platform, caption, scheduled_time, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          SQL
        end
      end

      rows = db.execute <<-SQL
        SELECT s.*, c.title as clip_title, c.score as clip_score, c.aspect_ratio, p.thumbnail_url, p.title as project_title
        FROM scheduled_posts s
        JOIN clips c ON s.clip_id = c.id
        JOIN projects p ON s.project_id = p.id
        ORDER BY s.scheduled_time ASC
      SQL
      json_response(res, rows)

    when 'team'
      count = db.get_first_value("SELECT COUNT(*) FROM team_members").to_i
      if count == 0
        db.execute("INSERT INTO team_members (id, email, name, role, avatar_url) VALUES ('tm_1', 'jan-niklas@opusflow.ai', 'Jan-Niklas', 'Admin / Owner', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80')")
        db.execute("INSERT INTO team_members (id, email, name, role, avatar_url) VALUES ('tm_2', 'sarah@creator.io', 'Sarah L.', 'Video Editor', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80')")
      end
      rows = db.execute("SELECT * FROM team_members ORDER BY created_at ASC")
      json_response(res, rows)

    when 'credits'
      total = 120
      used = db.get_first_value("SELECT COALESCE(SUM(GREATEST(end_time - start_time, 0)), 0) / 60.0 FROM clips").to_f
      remaining = [total - used, 0].max.round(1)
      json_response(res, {
        plan: 'Creator Pro',
        minutes_remaining: remaining,
        minutes_total: total
      })

    when 'billing'
      total_minutes = 120
      used_minutes = db.get_first_value("SELECT COALESCE(SUM(GREATEST(end_time - start_time, 0)), 0) / 60.0 FROM clips").to_f
      remaining_minutes = [total_minutes - used_minutes, 0].max.round(1)

      json_response(res, {
        plan: 'Creator Pro',
        minutes_remaining: remaining_minutes,
        minutes_total: total_minutes,
        renewal_date: (Time.now + (30 * 86400)).strftime('%d.%m.%Y'),
        plan_monthly: {
          id: 'plan_monthly',
          name: 'Vollzugang (Monatlich)',
          price: 15.0,
          currency: '€',
          interval: 'Monat',
          formatted_price: '15 €',
          billing_text: 'monatlich abgerechnet, jederzeit kündbar',
          badge: 'Flexibel'
        },
        plan_yearly: {
          id: 'plan_yearly',
          name: 'Vollzugang (Jährlich)',
          price: 80.0,
          currency: '€',
          interval: 'Jahr',
          formatted_price: '80 €',
          monthly_equivalent: '6,66 € / Monat',
          billing_text: 'einmalig 80 € / Jahr (spare über 55%!)',
          badge: 'Bestseller – 55% Rabatt'
        },
        current_plan: 'Vollzugang (Jährlich)',
        status: 'active',
        features: [
          'Unbegrenzte Videos importieren (YouTube & Datei-Upload)',
          'Alle Social-Media-Formate: 9:16 Shorts, 1:1 Square, 16:9 Landscape',
          '🎙️ Multi-Speaker Split-Screen (Podcast-Modus)',
          'Wortgenaue Untertitel mit allen 5 Designer-Presets',
          '✨ Animierte Auto-Emojis auf Highlight-Wörtern (🚀, 💡, 🤯, 🔥)',
          'High-Speed MP4-Download in 1080p 60fps & gesammelter ZIP-Export',
          'Multi-Plattform Social Media Planer (TikTok, Reels, Shorts)',
          'KI-Social-Media-Post- & Hashtag-Generator',
          'Prioritäts-Support & automatische Cloud-Bereinigung'
        ]
      })


    else
      error_response(res, 404, "Endpunkt nicht gefunden: #{path}")
    end
  end

  def do_POST(req, res)
    handle_cors(req, res)
    path = req.path.sub(%r{^/api/}, '')
    db = OpusFlow::Database.instance.db
    data = parse_json_body(req)

    case path
    when 'resolve-url'
      url = data['url'].to_s.strip
      result = OpusFlow::UrlResolver.resolve(url)
      if result[:error]
        error_response(res, 400, result[:error])
      else
        json_response(res, result)
      end

    when 'projects'
      # Create new project
      title = data['title'].to_s.strip
      title = "Neues Projekt #{Time.now.strftime('%d.%m.%Y %H:%M')}" if title.empty?
      source_type = data['source_type'] || 'url'
      source_url = data['source_url'] || ''
      thumbnail_url = data['thumbnail_url'] || ''
      duration = (data['duration'] || 180.0).to_f
      file_path = data['file_path'] || ''

      proj_id = "proj_#{SecureRandom.hex(6)}"
      puts "[CREATE] Creating project with id=#{proj_id} pid=#{Process.pid}"
      db.execute <<-SQL, [proj_id, title, source_type, source_url, file_path, thumbnail_url, duration, 'pending', 0, 'Bereit zur Analyse', (data['metadata'] || {}).to_json]
        INSERT INTO projects (id, title, source_type, source_url, file_path, thumbnail_url, duration, status, progress, current_step, metadata_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      SQL
      verify = db.get_first_row("SELECT id FROM projects WHERE id = ?", [proj_id])
      puts "[CREATE] Verify read-back: #{verify.inspect}"

      json_response(res, { id: proj_id, success: true, message: 'Projekt erfolgreich erstellt' }, 201)

    when %r{^projects/([^/]+)/analyze$}
      proj_id = $1
      puts "[ANALYZE] Route hit for project #{proj_id}"
      project = db.get_first_row("SELECT * FROM projects WHERE id = ?", [proj_id])
      return error_response(res, 404, "Projekt nicht gefunden") unless project
      puts "[ANALYZE] Project found, starting background thread"

      # Start async pipeline thread
      Thread.new do
        puts "[ANALYZE] Background thread started for #{proj_id}"
        begin
          run_analysis_pipeline(proj_id, data)
        rescue => thread_err
          puts "[ANALYZE] FATAL thread error: #{thread_err.class}: #{thread_err.message}"
          puts thread_err.backtrace.first(10).join("\n")
        end
        puts "[ANALYZE] Background thread finished for #{proj_id}"
      end

      json_response(res, { success: true, message: 'Analyse gestartet' })

    when 'settings'
      data.each do |k, v|
        db.execute("INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP", [k.to_s, v.to_s])
      end
      json_response(res, { success: true, message: 'Einstellungen gespeichert' })

    when %r{^clips/([^/]+)/export$}
      clip_id = $1
      clip = db.get_first_row("SELECT * FROM clips WHERE id = ?", [clip_id])
      return error_response(res, 404, "Clip nicht gefunden") unless clip

      project = db.get_first_row("SELECT * FROM projects WHERE id = ?", [clip['project_id']])
      source_path = project && !project['file_path'].to_s.empty? ? File.join(UPLOADS_DIR, project['file_path']) : nil

      # On-demand retry if video was not downloaded during initial pipeline
      if (!source_path || !File.exist?(source_path)) && project && !project['source_url'].to_s.empty?
        puts "[EXPORT] Source video not on disk for clip #{clip_id}, attempting on-demand download..."
        downloaded = download_source_video(project['id'], project['source_url'])
        if downloaded
          db.execute("UPDATE projects SET file_path = ? WHERE id = ?", [downloaded, project['id']])
          source_path = File.join(UPLOADS_DIR, downloaded)
        end
      end

      unless source_path && File.exist?(source_path)
        return error_response(res, 422, "Kein Quellvideo auf dem Server vorhanden (YouTube-Download blockiert oder noch nicht abgeschlossen). Tipp: Lade das Video direkt per Drag & Drop als MP4 hoch oder hinterlege YouTube-Cookies.")
      end

      export_filename = "opusflow_clip_#{clip_id}.mp4"
      output_path = File.join(EXPORTS_DIR, export_filename)

      dims = case clip['aspect_ratio']
             when '1:1' then [1080, 1080]
             when '16:9' then [1920, 1080]
             else [1080, 1920] # 9:16 default
             end
      w, h = dims
      duration = clip['end_time'].to_f - clip['start_time'].to_f
      vf = "scale=#{w}:#{h}:force_original_aspect_ratio=increase,crop=#{w}:#{h}"

      cmd = [
        'ffmpeg', '-y',
        '-ss', clip['start_time'].to_s,
        '-i', source_path,
        '-t', duration.to_s,
        '-vf', vf,
        '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23',
        '-c:a', 'aac', '-movflags', '+faststart',
        output_path
      ]

      _out, err, status = nil, nil, nil
      begin
        Timeout.timeout(120) { _out, err, status = Open3.capture3(*cmd) }
      rescue Timeout::Error
        return error_response(res, 500, "Export hat zu lange gedauert (Timeout)")
      end

      unless status && status.success?
        warn "[EXPORT] ffmpeg failed for #{clip_id}: #{err.to_s[0, 500]}"
        return error_response(res, 500, "Videoschnitt fehlgeschlagen")
      end

      json_response(res, {
        success: true,
        filename: export_filename,
        url: "/exports/#{export_filename}",
        message: "Clip erfolgreich geschnitten und exportiert"
      })

    when 'schedule'
      clip_id = data['clip_id']
      project_id = data['project_id']
      platform = data['platform'] || 'tiktok'
      caption = data['caption'] || ''
      scheduled_time = data['scheduled_time'] || (Time.now + 86400).strftime("%Y-%m-%d %H:%M:00")

      sched_id = "sched_#{SecureRandom.hex(4)}"
      db.execute <<-SQL, [sched_id, clip_id, project_id, platform, caption, scheduled_time, 'scheduled']
        INSERT INTO scheduled_posts (id, clip_id, project_id, platform, caption, scheduled_time, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      SQL
      json_response(res, { success: true, id: sched_id, message: 'Post erfolgreich eingeplant!' }, 201)

    when 'team'
      name = data['name'].to_s.strip
      email = data['email'].to_s.strip
      role = data['role'] || 'Editor'
      return error_response(res, 400, "Name und E-Mail erforderlich") if name.empty? || email.empty?

      tm_id = "tm_#{SecureRandom.hex(4)}"
      avatar = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80"
      db.execute("INSERT INTO team_members (id, email, name, role, avatar_url) VALUES (?, ?, ?, ?, ?)", [tm_id, email, name, role, avatar])
      json_response(res, { success: true, id: tm_id, message: 'Teammitglied hinzugefügt!' }, 201)


    else
      error_response(res, 404, "POST Endpunkt nicht gefunden: #{path}")
    end
  end

  def do_PUT(req, res)
    handle_cors(req, res)
    path = req.path.sub(%r{^/api/}, '')
    db = OpusFlow::Database.instance.db
    data = parse_json_body(req)

    case path
    when %r{^clips/([^/]+)$}
      clip_id = $1
      clip = db.get_first_row("SELECT * FROM clips WHERE id = ?", [clip_id])
      return error_response(res, 404, "Clip nicht gefunden") unless clip

      # Update clip attributes
      title = data['title'] || clip['title']
      start_time = (data['start_time'] || clip['start_time']).to_f
      end_time = (data['end_time'] || clip['end_time']).to_f
      aspect_ratio = data['aspect_ratio'] || clip['aspect_ratio']
      focal_point_x = (data['focal_point_x'] || clip['focal_point_x']).to_f
      caption_preset = data['caption_preset'] || clip['caption_preset']
      transcript = data['transcript'] || clip['transcript_json']
      subtitles_json = data['subtitles'] ? data['subtitles'].to_json : clip['caption_style_json']

      db.execute <<-SQL, [title, start_time, end_time, aspect_ratio, focal_point_x, caption_preset, transcript, subtitles_json, clip_id]
        UPDATE clips SET
          title = ?, start_time = ?, end_time = ?, aspect_ratio = ?,
          focal_point_x = ?, caption_preset = ?, transcript_json = ?,
          caption_style_json = ?
        WHERE id = ?
      SQL

      json_response(res, { success: true, message: 'Clip aktualisiert' })

    when %r{^team/([^/]+)$}
      tm_id = $1
      member = db.get_first_row("SELECT * FROM team_members WHERE id = ?", [tm_id])
      return error_response(res, 404, "Teammitglied nicht gefunden") unless member

      role = data['role'] || member['role']
      db.execute("UPDATE team_members SET role = ? WHERE id = ?", [role, tm_id])
      json_response(res, { success: true, message: 'Rolle aktualisiert' })

    else
      error_response(res, 404, "PUT Endpunkt nicht gefunden")
    end
  end

  def do_DELETE(req, res)
    handle_cors(req, res)
    path = req.path.sub(%r{^/api/}, '')
    db = OpusFlow::Database.instance.db

    case path
    when %r{^projects/([^/]+)$}
      proj_id = $1
      db.execute("DELETE FROM clips WHERE project_id = ?", [proj_id])
      db.execute("DELETE FROM projects WHERE id = ?", [proj_id])
      json_response(res, { success: true, message: 'Projekt gelöscht' })

    when %r{^clips/([^/]+)$}
      clip_id = $1
      db.execute("DELETE FROM clips WHERE id = ?", [clip_id])
      json_response(res, { success: true, message: 'Clip gelöscht' })

    when %r{^schedule/([^/]+)$}
      sched_id = $1
      db.execute("DELETE FROM scheduled_posts WHERE id = ?", [sched_id])
      json_response(res, { success: true, message: 'Geplanter Post gelöscht' })

    when %r{^team/([^/]+)$}
      tm_id = $1
      db.execute("DELETE FROM team_members WHERE id = ?", [tm_id])
      json_response(res, { success: true, message: 'Teammitglied entfernt' })


    else
      error_response(res, 404, "DELETE Endpunkt nicht gefunden")
    end
  end

  def do_OPTIONS(req, res)
    handle_cors(req, res)
    res.status = 200
  end

  private

  # Downloads the actual source video with yt-dlp (works for YouTube and many
  # other sites) into UPLOADS_DIR so the rest of the app can treat it exactly
  # like an uploaded file. Returns the saved filename, or nil if nothing could
  # be downloaded (e.g. an unsupported/demo URL) - callers treat that as
  # non-fatal and fall back to the synthetic preview.
  def download_source_video(proj_id, source_url)
    return nil if source_url.to_s.strip.empty?

    out_template = File.join(UPLOADS_DIR, "#{proj_id}.%(ext)s")
    
    # Check for cookies (from env var or file) to bypass YouTube bot/429 blocks
    cookie_path = nil
    if ENV['YTDLP_COOKIES'] && !ENV['YTDLP_COOKIES'].to_s.strip.empty?
      cookie_path = File.join(STORAGE_ROOT, 'yt_cookies.txt')
      File.write(cookie_path, ENV['YTDLP_COOKIES'])
    elsif File.exist?(File.join(STORAGE_ROOT, 'cookies.txt'))
      cookie_path = File.join(STORAGE_ROOT, 'cookies.txt')
    elsif File.exist?('cookies.txt')
      cookie_path = 'cookies.txt'
    end

    cmd = [
      'yt-dlp',
      '--no-playlist',
      '--max-filesize', '500M',
      '--socket-timeout', '30',
      '--js-runtimes', 'node',
      '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      '--extractor-args', 'youtube:player_client=ios,tv_embedded,mweb;player_skip=webpage,configs',
      '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4/bestvideo+bestaudio/best',
      '--merge-output-format', 'mp4'
    ]

    cmd += ['--cookies', cookie_path] if cookie_path
    cmd += ['-o', out_template, source_url]

    stdout_str, stderr_str, status = nil, nil, nil
    Timeout.timeout(180) do
      stdout_str, stderr_str, status = Open3.capture3(*cmd)
    end

    unless status && status.success?
      warn "[DOWNLOAD] yt-dlp primary attempt failed for #{proj_id}: #{stderr_str.to_s[0, 500]}"
      
      # Secondary attempt with generic fallback if android client had issues
      fallback_cmd = [
        'yt-dlp',
        '--no-playlist',
        '--max-filesize', '500M',
        '--socket-timeout', '30',
        '--js-runtimes', 'node',
        '-f', 'best',
        '--merge-output-format', 'mp4'
      ]
      fallback_cmd += ['--cookies', cookie_path] if cookie_path
      fallback_cmd += ['-o', out_template, source_url]

      begin
        Timeout.timeout(120) do
          stdout_str, stderr_str, status = Open3.capture3(*fallback_cmd)
        end
      rescue => fb_err
        warn "[DOWNLOAD] yt-dlp fallback timeout/error: #{fb_err.message}"
      end
    end

    downloaded = Dir.glob(File.join(UPLOADS_DIR, "#{proj_id}.*")).first
    unless downloaded
      warn "[DOWNLOAD] yt-dlp finished but no file found for #{proj_id}"
      return nil
    end

    File.basename(downloaded)
  end

  def run_analysis_pipeline(proj_id, options)
    puts "[PIPELINE] run_analysis_pipeline entered for #{proj_id}"
    db = OpusFlow::Database.instance.db
    
    # 6-Step pipeline as requested:
    # 1. Video erkannt
    # 2. Audio analysiert
    # 3. Transkript erstellt
    # 4. Highlights werden erkannt
    # 5. Clips werden erstellt
    # 6. Untertitel werden generiert
    
    steps = [
      { step: "Video erkannt & Metadaten geladen", progress: 15, delay: 0.8 },
      { step: "Audio analysiert & Lautstärke-Peaks erkannt", progress: 32, delay: 0.9 },
      { step: "Transkript mit Zeitstempeln erstellt", progress: 54, delay: 1.0 },
      { step: "KI analysiert Highlights & virale Hooks", progress: 72, delay: 1.1 },
      { step: "Clips werden optimiert & zugeschnitten", progress: 88, delay: 0.8 },
      { step: "Wortgenaue Untertitel werden gerendert", progress: 98, delay: 0.7 }
    ]

    db.execute("UPDATE projects SET status = 'analyzing', progress = 5, current_step = 'Analyse gestartet' WHERE id = ?", [proj_id])
    puts "[PIPELINE] Initial status update done for #{proj_id}"

    project = db.get_first_row("SELECT * FROM projects WHERE id = ?", [proj_id])

    # Real video download: for YouTube/URL-sourced projects with no local file
    # yet, actually fetch the source video with yt-dlp so playback and export
    # work on the real footage instead of a synthetic placeholder animation.
    if project['file_path'].to_s.empty? && ['youtube', 'url', 'vimeo', 'web'].include?(project['source_type'])
      db.execute("UPDATE projects SET progress = 10, current_step = 'Video wird heruntergeladen...' WHERE id = ?", [proj_id])
      begin
        downloaded_name = download_source_video(proj_id, project['source_url'])
        if downloaded_name
          db.execute("UPDATE projects SET file_path = ? WHERE id = ?", [downloaded_name, proj_id])
          project = db.get_first_row("SELECT * FROM projects WHERE id = ?", [proj_id])
          puts "[PIPELINE] Downloaded source video for #{proj_id} -> #{downloaded_name}"
        else
          puts "[PIPELINE] No video downloaded for #{proj_id}, continuing with synthetic preview"
        end
      rescue => dl_err
        warn "[PIPELINE] Video download failed for #{proj_id}: #{dl_err.message}"
        # Non-fatal: analysis continues; editor falls back to the synthetic preview.
      end
    end

    steps.each do |st|
      sleep(st[:delay])
      db.execute("UPDATE projects SET progress = ?, current_step = ? WHERE id = ?", [st[:progress], st[:step], proj_id])
    end

    project = db.get_first_row("SELECT * FROM projects WHERE id = ?", [proj_id])
    generated_clips = OpusFlow::AiService.analyze_video(project, options)

    # Delete any previous clips for this project
    db.execute("DELETE FROM clips WHERE project_id = ?", [proj_id])

    generated_clips.each_with_index do |c, idx|
      clip_id = "clip_#{proj_id}_#{idx + 1}"
      subtitles = c[:subtitles] || []
      db.execute <<-SQL, [clip_id, proj_id, c[:title], c[:score], c[:reason], c[:category] || 'Hook', c[:start_time], c[:end_time], '9:16', 'viral', c[:transcript], subtitles.to_json]
        INSERT INTO clips (id, project_id, title, score, reason, category, start_time, end_time, aspect_ratio, caption_preset, transcript_json, caption_style_json)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      SQL
    end

    sleep(0.4)
    db.execute("UPDATE projects SET status = 'completed', progress = 100, current_step = 'Abgeschlossen' WHERE id = ?", [proj_id])
  rescue => e
    warn "Error in analysis pipeline: #{e.message}\n#{e.backtrace.first(5).join("\n")}"
    db.execute("UPDATE projects SET status = 'error', current_step = ? WHERE id = ?", ["Fehler: #{e.message}", proj_id])
  end

  def handle_cors(req, res)
    res['Access-Control-Allow-Origin'] = '*'
    res['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    res['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
  end

  def parse_json_body(req)
    return {} unless req.body && !req.body.empty?
    JSON.parse(req.body)
  rescue
    {}
  end

  def json_response(res, data, status = 200)
    res.status = status
    res['Content-Type'] = 'application/json; charset=utf-8'
    res.body = data.to_json
  end

  def error_response(res, status, message)
    res.status = status
    res['Content-Type'] = 'application/json; charset=utf-8'
    res.body = { error: message }.to_json
  end
end

# File Upload Servlet
class UploadServlet < WEBrick::HTTPServlet::AbstractServlet
  def do_POST(req, res)
    res['Access-Control-Allow-Origin'] = '*'
    res['Access-Control-Allow-Methods'] = 'POST, OPTIONS'

    # Check content-type for multipart
    content_type = req['content-type'].to_s
    
    if content_type =~ /multipart\/form-data;\s*boundary=(.+)/i
      boundary = $1.strip
      body = req.body

      # Simple multipart parser
      parts = body.split("--#{boundary}")
      file_data = nil
      filename = "video_#{SecureRandom.hex(4)}.mp4"

      parts.each do |part|
        if part =~ /Content-Disposition:.*filename="([^"]+)"/i
          filename = $1
          # Extract body after headers
          if idx = part.index("\r\n\r\n")
            file_data = part[(idx + 4)..-3] # strip trailing \r\n
          elsif idx = part.index("\n\n")
            file_data = part[(idx + 2)..-2]
          end
        end
      end

      if file_data && !file_data.empty?
        # Sanitize filename
        safe_name = "#{SecureRandom.hex(4)}_#{filename.gsub(/[^a-zA-Z0-9._-]/, '_')}"
        save_path = File.join(UPLOADS_DIR, safe_name)
        File.open(save_path, 'wb') { |f| f.write(file_data) }

        res.status = 201
        res['Content-Type'] = 'application/json'
        res.body = {
          success: true,
          filename: safe_name,
          url: "/uploads/#{safe_name}",
          size: file_data.bytesize
        }.to_json
        return
      end
    end

    res.status = 400
    res['Content-Type'] = 'application/json'
    res.body = { error: "Ungültiger Upload oder keine Datei empfangen" }.to_json
  end

  def do_OPTIONS(req, res)
    res['Access-Control-Allow-Origin'] = '*'
    res['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    res['Access-Control-Allow-Headers'] = 'Content-Type'
    res.status = 200
  end
end

# Background file cleanup worker
Thread.new do
  loop do
    sleep(3600) # Every hour
    begin
      db = OpusFlow::Database.instance.db
      hours_str = db.get_first_value("SELECT value FROM settings WHERE key = 'auto_cleanup_hours'") || "24"
      max_age_seconds = hours_str.to_i * 3600

      now = Time.now
      [UPLOADS_DIR, EXPORTS_DIR].each do |dir|
        Dir.glob("#{dir}/*").each do |file|
          if File.file?(file) && (now - File.mtime(file)) > max_age_seconds
            File.delete(file)
            puts "Cleaned up expired file: #{file}"
          end
        end
      end
    rescue => e
      warn "Cleanup thread error: #{e.message}"
    end
  end
end

server = WEBrick::HTTPServer.new(
  Port: PORT,
  BindAddress: '0.0.0.0',
  DocumentRoot: PUBLIC_DIR,
  Logger: WEBrick::Log.new($stderr, WEBrick::Log::INFO),
  AccessLog: []
)

server.mount('/api', ApiServlet)
server.mount('/api/upload', UploadServlet)
server.mount('/uploads', VideoFileServlet, UPLOADS_DIR)
server.mount('/exports', VideoFileServlet, EXPORTS_DIR)

trap('INT') { server.shutdown }
trap('TERM') { server.shutdown }

puts "======================================================="
puts "🚀 OpusFlow AI Server running at http://localhost:#{PORT}"
puts "✨ Dark Mode AI Video Clipping Studio ready"
puts "======================================================="

server.start
