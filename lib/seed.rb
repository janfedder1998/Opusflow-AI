# lib/seed.rb
require_relative 'db'
require_relative 'ai_service'
require 'json'
require 'securerandom'

module OpusFlow
  class Seed
    def self.run!
      db = Database.instance.db
      count = db.get_first_value("SELECT COUNT(*) FROM projects")
      return if count.to_i > 0

      puts "Seeding demo projects and clips..."

      projects = [
        {
          id: "proj_demo_1",
          title: "Joe Rogan & Lex Fridman: The Future of AI & Superintelligence",
          source_type: "youtube",
          source_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          thumbnail_url: "https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=800&q=80",
          duration: 372.0,
          status: "completed",
          progress: 100,
          current_step: "Abgeschlossen",
          metadata_json: {
            author: "PowerfulJRE",
            views: "2.4M",
            upload_date: "2026-08-15"
          }.to_json,
          clips: [
            {
              id: "clip_1_1",
              title: "Warum niemand über dieses KI-Risiko spricht",
              score: 98,
              category: "Controversy",
              reason: "Extrem starker Kontrast-Hook in Sekunde 1. Hohe Verweildauer (Retention) auf TikTok & Shorts.",
              start_time: 24.0,
              end_time: 58.0,
              aspect_ratio: "9:16",
              caption_preset: "viral",
              transcript: "Wir unterschätzen die exponentielle Geschwindigkeit komplett. Es geht nicht darum, was heute funktioniert, sondern wo diese Modelle in 24 Monaten stehen werden."
            },
            {
              id: "clip_1_2",
              title: "Der größte Denkfehler der Experten",
              score: 94,
              category: "Key Insight",
              reason: "Informativer Storytelling-Moment mit hoher Teilungsrate (Shares & Saves).",
              start_time: 85.0,
              end_time: 122.0,
              aspect_ratio: "9:16",
              caption_preset: "bold",
              transcript: "Alle vergleichen künstliche Intelligenz mit Werkzeugen aus der Vergangenheit. Aber ein Hammer denkt nicht selbst. Das ist der fundamentale Unterschied."
            },
            {
              id: "clip_1_3",
              title: "Was passiert, wenn die Grenze fällt?",
              score: 89,
              category: "Hook",
              reason: "Fesselnde Neugier-Lücke. Emotionaler Höhepunkt mit direktem Zuschauerbezug.",
              start_time: 145.0,
              end_time: 180.0,
              aspect_ratio: "1:1",
              caption_preset: "highlight",
              transcript: "In dem Moment, in dem ein System sich selbst optimieren kann, bricht jede klassische Vorhersage zusammen. Darauf ist unsere Gesellschaft nicht vorbereitet."
            },
            {
              id: "clip_1_4",
              title: "Die 3 Berufe, die überleben werden",
              score: 87,
              category: "Key Insight",
              reason: "Hohe Relevanz für Berufsstarter und Tech-Interessierte mit hoher Kommentar-Frequenz.",
              start_time: 210.0,
              end_time: 252.0,
              aspect_ratio: "9:16",
              caption_preset: "podcast",
              transcript: "Echte menschliche Empathie, hochgradig physische Adaptivität und kreative Synthese. Das sind die Pfeiler, die Maschinen nicht replizieren können."
            },
            {
              id: "clip_1_5",
              title: "Das Gespräch hinter verschlossenen Türen",
              score: 84,
              category: "Story",
              reason: "Spannendes persönliches Geständnis aus dem Silicon Valley.",
              start_time: 290.0,
              end_time: 335.0,
              aspect_ratio: "9:16",
              caption_preset: "minimal",
              transcript: "Ich saß mit den Gründern am Tisch. Niemand hat gelächelt. Sie wissen genau, welche Tür sie da gerade aufgestoßen haben."
            }
          ]
        },
        {
          id: "proj_demo_2",
          title: "Alex Hormozi: The $100M Hook Strategy for Organic Reach",
          source_type: "youtube",
          source_url: "https://www.youtube.com/watch?v=abcdefghijk",
          thumbnail_url: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=800&q=80",
          duration: 290.0,
          status: "completed",
          progress: 100,
          current_step: "Abgeschlossen",
          metadata_json: {
            author: "Alex Hormozi",
            views: "890K",
            upload_date: "2026-08-20"
          }.to_json,
          clips: [
            {
              id: "clip_2_1",
              title: "Hör auf, Content wie alle anderen zu posten",
              score: 96,
              category: "Controversy",
              reason: "Direkte Ansprache, bricht Muster in den ersten 1,5 Sekunden.",
              start_time: 12.0,
              end_time: 44.0,
              aspect_ratio: "9:16",
              caption_preset: "viral",
              transcript: "Wenn dein Hook wie eine Einleitung klingt, bist du tot. Niemand schuldet dir seine Aufmerksamkeit. Du musst sie dir im ersten Frame stehlen."
            },
            {
              id: "clip_2_2",
              title: "Die 3-Sekunden-Regel für Millionen Aufrufe",
              score: 92,
              category: "Hook",
              reason: "Praktischer Leitfaden mit hoher Bookmark-/Save-Rate.",
              start_time: 60.0,
              end_time: 98.0,
              aspect_ratio: "9:16",
              caption_preset: "highlight",
              transcript: "Visueller Reiz, ungelöste Frage und sofortige Bewegung. Wenn diese drei Dinge nicht in den ersten drei Sekunden passieren, wischen 85 Prozent weiter."
            },
            {
              id: "clip_2_3",
              title: "Warum gute Produkte ohne Marketing sterben",
              score: 88,
              category: "Key Insight",
              reason: "Starke Business-Erkenntnis mit hohem Diskussionswert.",
              start_time: 130.0,
              end_time: 172.0,
              aspect_ratio: "1:1",
              caption_preset: "bold",
              transcript: "Das beste Produkt verliert immer gegen das bekannteste Produkt. Sei nicht der beste Bäcker der Stadt, von dem niemand weiß, dass er existiert."
            }
          ]
        }
      ]

      projects.each do |p|
        db.execute <<-SQL, [p[:id], p[:title], p[:source_type], p[:source_url], p[:thumbnail_url], p[:duration], p[:status], p[:progress], p[:current_step], p[:metadata_json]]
          INSERT INTO projects (id, title, source_type, source_url, thumbnail_url, duration, status, progress, current_step, metadata_json)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        SQL

        p[:clips].each do |c|
          subtitles = AiService.generate_subtitles_for_clip(c[:transcript], c[:start_time], c[:end_time])
          db.execute <<-SQL, [c[:id], p[:id], c[:title], c[:score], c[:reason], c[:category], c[:start_time], c[:end_time], c[:aspect_ratio], c[:caption_preset], c[:transcript], subtitles.to_json]
            INSERT INTO clips (id, project_id, title, score, reason, category, start_time, end_time, aspect_ratio, caption_preset, transcript_json, caption_style_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          SQL
        end
      end

      puts "Demo data seeded successfully!"
    end
  end
end
