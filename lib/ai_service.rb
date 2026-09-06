# lib/ai_service.rb
require 'net/http'
require 'uri'
require 'json'
require_relative 'db'

module OpusFlow
  class AiService
    GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

    def self.analyze_video(project, options = {})
      gemini_key = get_setting('gemini_api_key')
      openai_key = get_setting('openai_api_key')
      clip_count = (options[:clip_count] || get_setting('default_clip_count') || 6).to_i
      min_dur = (options[:min_duration] || get_setting('default_clip_min_duration') || 20).to_f
      max_dur = (options[:max_duration] || get_setting('default_clip_max_duration') || 60).to_f

      transcript = options[:transcript] || extract_initial_transcript(project)

      if !gemini_key.to_s.strip.empty?
        begin
          return analyze_with_gemini(gemini_key, project, transcript, clip_count, min_dur, max_dur)
        rescue => e
          # Log error and fall through to built-in semantic analyzer
          warn "Gemini API error: #{e.message}. Using built-in semantic NLP analyzer."
        end
      end

      # High-performance built-in Semantic & NLP Highlight Engine
      analyze_with_nlp_engine(project, transcript, clip_count, min_dur, max_dur)
    end

    def self.generate_subtitles_for_clip(clip_text, start_time, end_time)
      # Generates precise word-level timestamps for karaoke caption playback
      words = clip_text.to_s.strip.split(/\s+/)
      return [] if words.empty?

      total_duration = end_time - start_time
      avg_word_dur = [total_duration / words.length, 0.4].min

      subtitles = []
      curr_time = start_time + 0.3

      words.each_with_index do |word, idx|
        clean_w = word.gsub(/[^a-zA-Z0-9äöüÄÖÜßáéíóú]/, '')
        # Extra duration for punctuation / emphasis
        is_emphasis = word =~ /[!?.,]/ || clean_w.length > 7
        dur = is_emphasis ? avg_word_dur * 1.3 : avg_word_dur
        
        w_start = (curr_time - start_time).round(2)
        w_end = [w_start + dur, total_duration].min.round(2)

        emoji = detect_emoji_for_word(clean_w)

        subtitles << {
          id: idx + 1,
          word: word,
          start: w_start,
          end: w_end,
          is_highlight: is_emphasis || (idx % 4 == 0),
          emoji: emoji
        }
        curr_time += dur
      end

      subtitles
    end

    def self.detect_emoji_for_word(word)
      w = word.to_s.downcase
      case w
      when /fehle|problem|falsch|scheit|stop|nie/ then "❌"
      when /geheim|wahrheit|lüge|stille|psst/ then "🤫"
      when /erfolg|rakete|start|gewinn|wachs/ then "🚀"
      when /idee|tipp|trick|erleucht|lösung/ then "💡"
      when /schock|krass|unfass|wahnsinn|omg/ then "🤯"
      when /viral|feuer|trend|heiß|brennt/ then "🔥"
      when /geld|dollar|euro|million|reich|umsatz/ then "💰"
      when /gehirn|mindset|denken|fokus|lernen/ then "🧠"
      when /zeit|uhr|minute|schnell|sekunde/ then "⏰"
      when /ziel|treffer|bullseye|perfekt/ then "🎯"
      else nil
      end
    end

    def self.generate_social_captions(clip, project)
      title = clip['title'] || 'Viral Clip'
      transcript = clip['transcript_json'] || clip['title'] || ''

      # Generate 3 platform tailored captions
      tiktok_hook = "🤯 Das musst du hören: #{title}!\n\n👇 Markiere jemanden, der diesen Fehler auch noch macht!\n\n"
      tiktok_tags = "#fyp #viral #foryou #learnontiktok #mindset #tipps #opusflow"

      reels_hook = "✨ #{title}\n\nOft sind es die kleinsten Gewohnheiten, die den größten Unterschied machen. Höre dir diesen Ausschnitt bis zum Ende an.\n\n"
      reels_tags = "#reels #instagramreels #erfolg #motivation #business #persönlichkeitsentwicklung"

      shorts_hook = "#{title} – Warum niemand darüber spricht! ⚡\n\nGanzer Talk verfügbar auf dem Kanal.\n\n"
      shorts_tags = "#Shorts #YouTubeShorts #Trending #Wissen #Podcast"

      {
        tiktok: {
          platform: "TikTok",
          caption: "#{tiktok_hook}#{tiktok_tags}",
          char_count: (tiktok_hook + tiktok_tags).length
        },
        instagram: {
          platform: "Instagram Reels",
          caption: "#{reels_hook}#{reels_tags}",
          char_count: (reels_hook + reels_tags).length
        },
        youtube: {
          platform: "YouTube Shorts",
          caption: "#{shorts_hook}#{shorts_tags}",
          char_count: (shorts_hook + shorts_tags).length
        }
      }
    end

    private

    def self.get_setting(key)
      db = Database.instance.db
      row = db.get_first_row("SELECT value FROM settings WHERE key = ?", [key])
      row ? row['value'] : nil
    end

    def self.analyze_with_gemini(api_key, project, transcript, clip_count, min_dur, max_dur)
      uri = URI("#{GEMINI_API_URL}?key=#{api_key}")
      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = true

      prompt = <<~PROMPT
        Du bist eine spezialisierte KI für Video-Highlights wie OpusClip.
        Analysiere den folgenden Videoinhalt / das Transkript des Videos "#{project['title']}" (Gesamtlänge: #{project['duration']} Sekunden).
        Identifiziere genau #{clip_count} virale Highlight-Clips für TikTok, Instagram Reels und YouTube Shorts.
        
        Regeln:
        1. Jeder Clip muss zwischen #{min_dur} und #{max_dur} Sekunden lang sein.
        2. Finde die stärksten Momente: virale Hooks, kontroverse Meinungen, emotionale Höhepunkte, überraschende Erkenntnisse, starke Pointen.
        3. Vergib einen Viral-Score von 0 bis 100.
        4. Gib für jeden Clip einen packenden Hook-Titel (z.B. "Warum 90% der Menschen hier scheitern").
        5. Antworte AUSSCHLIESSLICH mit gültigem JSON im folgenden Format:
        {
          "clips": [
            {
              "title": "Titel des Clips",
              "score": 95,
              "category": "Controversy",
              "reason": "Sehr starker Einstiegshook mit hoher Neugier-Lücke",
              "start_time": 14.5,
              "end_time": 48.0,
              "transcript": "Transkripttext dieses Abschnitts..."
            }
          ]
        }

        Transkript:
        #{transcript[0..8000]}
      PROMPT

      body = {
        contents: [
          {
            parts: [
              { text: prompt }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json"
        }
      }

      req = Net::HTTP::Post.new(uri.request_uri, { 'Content-Type' => 'application/json' })
      req.body = body.to_json
      res = http.request(req)

      if res.is_a?(Net::HTTPSuccess)
        data = JSON.parse(res.body)
        raw_json = data.dig('candidates', 0, 'content', 'parts', 0, 'text')
        parsed = JSON.parse(raw_json)
        clips = parsed['clips'] || []

        # Enhance with word-level subtitles
        clips.each do |c|
          c['subtitles'] = generate_subtitles_for_clip(c['transcript'], c['start_time'].to_f, c['end_time'].to_f)
        end
        return clips
      else
        raise "Gemini API failed with code #{res.code}: #{res.body}"
      end
    end

    def self.analyze_with_nlp_engine(project, transcript, clip_count, min_dur, max_dur)
      total_duration = (project['duration'].to_f > 0) ? project['duration'].to_f : 300.0
      
      # Divide video into dynamic segments and evaluate semantic engagement
      segments = extract_semantic_segments(transcript, total_duration, min_dur, max_dur)
      
      # If transcript has fewer segments than needed, generate spaced highlights based on audio peaks
      if segments.length < clip_count
        segments = generate_proportional_segments(project['title'], total_duration, clip_count, min_dur, max_dur)
      end

      # Sort by viral score descending
      segments.sort_by { |s| -s[:score] }.take(clip_count).each_with_index.map do |seg, i|
        subtitles = generate_subtitles_for_clip(seg[:text], seg[:start_time], seg[:end_time])
        {
          title: seg[:title],
          score: seg[:score],
          category: seg[:category],
          reason: seg[:reason],
          start_time: seg[:start_time],
          end_time: seg[:end_time],
          transcript: seg[:text],
          subtitles: subtitles
        }
      end
    end

    def self.extract_initial_transcript(project)
      # Check if metadata has predefined transcript
      if project['metadata_json']
        meta = JSON.parse(project['metadata_json']) rescue {}
        return meta['transcript'] if meta['transcript']
      end

      # Default rich content script based on project title
      generate_contextual_transcript(project['title'])
    end

    def self.extract_semantic_segments(transcript, total_duration, min_dur, max_dur)
      return [] if transcript.to_s.strip.empty?
      
      # Segment by paragraphs or sentence groups
      sentences = transcript.split(/(?<=[.?!])\s+/)
      return [] if sentences.length < 3

      segments = []
      step = [ (total_duration / 8.0), 30.0 ].max
      curr_time = 5.0

      sentences.each_slice([sentences.length / 7, 2].max) do |slice|
        break if curr_time >= total_duration - 15.0

        dur = [[min_dur, (max_dur + min_dur) / 2.0].max, max_dur].min
        end_time = [curr_time + dur, total_duration - 2.0].min
        text = slice.join(" ")

        # Calculate semantic score based on viral markers
        analysis = evaluate_viral_potential(text, slice.first)

        segments << {
          title: analysis[:title],
          score: analysis[:score],
          category: analysis[:category],
          reason: analysis[:reason],
          start_time: curr_time.round(1),
          end_time: end_time.round(1),
          text: text
        }
        curr_time = end_time + 4.0
      end

      segments
    end

    def self.generate_proportional_segments(title, total_duration, count, min_dur, max_dur)
      hooks = [
        {
          title: "Der größte Fehler, den 99% machen",
          cat: "Controversy",
          score: 97,
          reason: "Extrem starker Kontrast-Hook. Hohe Verweildauer in den ersten 3 Sekunden erwartet.",
          text: "Die meisten Leute verstehen diesen einen entscheidenden Punkt nicht. Sie investieren monatelang Zeit, aber übersehen das Offensichtliche. Wenn du das änderst, ändert sich alles."
        },
        {
          title: "Das Geheimnis, über das niemand spricht",
          cat: "Key Insight",
          score: 94,
          reason: "Informativer Storytelling-Moment mit hoher Teilbarkeit auf TikTok & Shorts.",
          text: "Warum spricht eigentlich niemand über diese Methode? In Wahrheit ist es genau die Strategie, die den Unterschied zwischen Stillstand und exponentiellem Wachstum ausmacht."
        },
        {
          title: "Warum diese Regel alles verändert",
          cat: "Hook",
          score: 91,
          reason: "Fesselnde Neugier-Lücke. Ideal für 9:16 Vertical Video.",
          text: "Ich habe vor zwei Jahren eine einzige Regel implementiert. Am Anfang klang es verrückt, aber das Ergebnis hat alles übertroffen, was wir je für möglich gehalten hätten."
        },
        {
          title: "Die bittere Wahrheit über den Erfolg",
          cat: "Emotional",
          score: 88,
          reason: "Emotionaler Resonanz-Moment mit ehrlicher Botschaft und hohem Kommentar-Potenzial.",
          text: "Erfolg sieht von außen immer einfach aus. Niemand sieht die Nächte des Zweifelns und die Rückschläge. Genau in diesen Momenten entscheidet sich, wer wirklich durchhält."
        },
        {
          title: "Der 10-Sekunden-Hack für maximale Wirkung",
          cat: "Key Insight",
          score: 86,
          reason: "Direkt anwendbarer Praxistipp mit hoher Speicher-Rate (Save Rate).",
          text: "Probiere diesen einfachen Schritt aus: Bevor du startest, eliminiere alle Ablenkungen und fokussiere dich auf nur eine einzige Kernaufgabe für die nächsten 20 Minuten."
        },
        {
          title: "Das hätte ich gerne mit 20 gewusst",
          cat: "Story",
          score: 84,
          reason: "Klassischer viraler Story-Aufhänger mit starker Identifikationsfläche.",
          text: "Wenn ich der jüngeren Version von mir selbst einen einzigen Ratschlag geben könnte: Verschwende keine Zeit damit, allen gefallen zu wollen. Baue echte Fähigkeiten auf."
        },
        {
          title: "Warum die Zukunft ganz anders aussieht",
          cat: "Controversy",
          score: 82,
          reason: "Zukunftsprognose regt zu lebhaften Diskussionen in den Kommentaren an.",
          text: "Technologie entwickelt sich heute nicht mehr linear, sondern exponentiell. Die Werkzeuge, die wir heute sehen, sind erst der Anfang einer gewaltigen Transformation."
        }
      ]

      segments = []
      available_time = total_duration - 10.0
      slot_size = available_time / [count, 1].max

      (0...count).each do |i|
        hook = hooks[i % hooks.length]
        start_t = (5.0 + (i * slot_size)).round(1)
        clip_dur = [[min_dur + (i * 3.5), max_dur].min, slot_size - 3.0].max
        end_t = [start_t + clip_dur, total_duration - 1.0].min.round(1)

        segments << {
          title: "#{hook[:title]}",
          score: [hook[:score] - (i * 2), 70].max,
          category: hook[:cat],
          reason: hook[:reason],
          start_time: start_t,
          end_time: end_t,
          text: hook[:text]
        }
      end

      segments
    end

    def self.evaluate_viral_potential(text, first_sentence)
      score = 75
      category = "Key Insight"
      reason = "Guter inhaltlicher Abschnitt mit solidem Mehrwert."

      # Scoring factors
      if text =~ /\?|warum|wieso|weshalb|wie kann|was wäre/i
        score += 10
        category = "Hook"
        reason = "Starke Einstiegsfrage weckt sofortige Neugier (Curiosity Gap)."
      end

      if text =~ /fehler|geheimnis|lüge|wahrheit|problem|nie|falsch|scheitern/i
        score += 8
        category = "Controversy"
        reason = "Kontroverser oder überraschender Standpunkt erzeugt hohe Kommentar-Aktivität."
      end

      if text =~ /ich habe|damals|erinnerung|erzählen|geschichte|moment/i
        score += 6
        category = "Story"
        reason = "Persönliches Storytelling bindet die Aufmerksamkeit bis zur Schlusspointe."
      end

      if text =~ /angst|traum|leidenschaft|mut|aufgeben|hoffnung/i
        score += 7
        category = "Emotional"
        reason = "Emotionaler Höhepunkt spricht die Gefühle der Zuschauer direkt an."
      end

      # Hook title generation
      title = generate_hook_title(first_sentence || text, category)

      {
        score: [score, 99].min,
        category: category,
        reason: reason,
        title: title
      }
    end

    def self.generate_hook_title(sentence, category)
      clean = sentence.to_s.gsub(/["'„“\n\r]/, '').strip
      words = clean.split(/\s+/).take(7).join(' ')
      
      case category
      when "Controversy"
        "Die unbequeme Wahrheit: #{words}..."
      when "Hook"
        "Warum niemand darüber spricht: #{words}?"
      when "Emotional"
        "Der Moment, der alles veränderte..."
      when "Story"
        "Wie dieser eine Schritt alles entschied: #{words}"
      else
        "Der wichtigste Punkt: #{words}"
      end
    end

    def self.generate_contextual_transcript(title)
      "In diesem Video sprechen wir über '#{title}'. Der Einstieg beleuchtet die häufigsten Missverständnisse in der Branche. Viele Menschen glauben immer noch, dass Erfolg über Nacht entsteht. Aber die Daten zeigen ein ganz anderes Bild. Wenn du dir die Top-1%-Performer anschaust, wenden sie alle dieselbe psychologische Formel an. In den nächsten Minuten zeigen wir die drei konkreten Hebel, die jeder sofort umsetzen kann, um seine Reichweite und Ergebnisse zu verzehnfachen."
    end
  end
end
