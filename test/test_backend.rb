# test/test_backend.rb
require_relative '../lib/db'
require_relative '../lib/url_resolver'
require_relative '../lib/ai_service'
require_relative '../lib/seed'

puts "=================================================="
puts "🧪 Running OpusFlow AI Backend Test Suite"
puts "=================================================="

# 1. Test Database
db = OpusFlow::Database.instance.db
raise "Database not initialized" unless db

projects_count = db.get_first_value("SELECT COUNT(*) FROM projects").to_i
clips_count = db.get_first_value("SELECT COUNT(*) FROM clips").to_i

puts "✓ Database loaded successfully"
puts "  Projects in DB: #{projects_count}"
puts "  Clips in DB:    #{clips_count}"

# 2. Test UrlResolver
yt_url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
res = OpusFlow::UrlResolver.resolve(yt_url)

raise "UrlResolver failed" unless res[:success]
raise "Wrong video ID" unless res[:video_id] == "dQw4w9WgXcQ"
raise "Missing thumbnail" unless res[:thumbnail_url]

puts "✓ UrlResolver validated successfully"
puts "  YouTube ID:     #{res[:video_id]}"
puts "  Title:          #{res[:title]}"
puts "  Thumbnail:      #{res[:thumbnail_url]}"

# 3. Test Direct Video URL
direct_url = "https://example.com/videos/presentation.mp4"
d_res = OpusFlow::UrlResolver.resolve(direct_url)
raise "Direct URL failed" unless d_res[:source_type] == "url"

puts "✓ Direct Video URL resolved: #{d_res[:title]}"

# 4. Test AiService Highlight Generation
project = db.get_first_row("SELECT * FROM projects LIMIT 1")
clips = OpusFlow::AiService.analyze_video(project, { clip_count: 5, min_duration: 15, max_duration: 45 })

raise "No clips generated" if clips.empty?
raise "Clips score missing" unless clips.first[:score] > 0
raise "Subtitles missing" if clips.first[:subtitles].empty?

puts "✓ AiService NLP Engine validated successfully"
puts "  Generated clips: #{clips.length}"
puts "  Top clip title:  #{clips.first[:title]}"
puts "  Viral score:     #{clips.first[:score]}/100"
puts "  Category:        #{clips.first[:category]}"
puts "  Subtitles count: #{clips.first[:subtitles].length}"
puts "  Sample subtitle: #{clips.first[:subtitles].first[:word]} (#{clips.first[:subtitles].first[:start]}s - #{clips.first[:subtitles].first[:end]}s)"

# 5. Test Settings
db.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('test_key', 'test_val')")
val = db.get_first_value("SELECT value FROM settings WHERE key = 'test_key'")
raise "Settings failed" unless val == 'test_val'

puts "✓ Settings persistence verified"

puts "\n🎉 ALL BACKEND CHECKS PASSED PERFECTLY!"
