# test/test_phase2.rb
require_relative '../lib/db'
require_relative '../lib/ai_service'

puts "=================================================="
puts "🧪 Running OpusFlow AI Phase 2 Test Suite"
puts "=================================================="

db = OpusFlow::Database.instance.db

# 1. Test scheduled_posts table
post_id = "sched_test_#{Time.now.to_i}"
db.execute <<-SQL, [post_id, "clip_1_1", "proj_demo_1", "tiktok", "Super Clip #viral", "2026-09-05 18:00:00", "scheduled"]
  INSERT INTO scheduled_posts (id, clip_id, project_id, platform, caption, scheduled_time, status)
  VALUES (?, ?, ?, ?, ?, ?, ?)
SQL

saved = db.get_first_row("SELECT * FROM scheduled_posts WHERE id = ?", [post_id])
raise "Scheduled post not saved" unless saved && saved['platform'] == 'tiktok'
puts "✓ Scheduled Posts Table working properly"

# Clean up test post
db.execute("DELETE FROM scheduled_posts WHERE id = ?", [post_id])

# 2. Test team_members table
tm_id = "tm_test_#{Time.now.to_i}"
db.execute("INSERT INTO team_members (id, email, name, role) VALUES (?, ?, ?, ?)", [tm_id, "test@test.com", "Test User", "Editor"])
tm = db.get_first_row("SELECT * FROM team_members WHERE id = ?", [tm_id])
raise "Team member not saved" unless tm && tm['role'] == 'Editor'
puts "✓ Team Members Table working properly"
db.execute("DELETE FROM team_members WHERE id = ?", [tm_id])

# 3. Test Emoji Detection
emojis = {
  "fehler" => "❌",
  "erfolg" => "🚀",
  "geheimnis" => "🤫",
  "krass" => "🤯",
  "viral" => "🔥",
  "geld" => "💰"
}

emojis.each do |word, expected_emoji|
  detected = OpusFlow::AiService.detect_emoji_for_word(word)
  raise "Emoji mismatch for '#{word}' (got #{detected})" unless detected == expected_emoji
end
puts "✓ Emoji Keyword Detection working properly (all 6 markers matched)"

# 4. Test Social Caption Generator
clip = db.get_first_row("SELECT * FROM clips LIMIT 1")
project = db.get_first_row("SELECT * FROM projects WHERE id = ?", [clip['project_id']])
captions = OpusFlow::AiService.generate_social_captions(clip, project)

raise "Missing TikTok captions" unless captions[:tiktok] && captions[:tiktok][:caption].include?("#fyp")
raise "Missing Reels captions" unless captions[:instagram] && captions[:instagram][:caption].include?("#reels")
raise "Missing Shorts captions" unless captions[:youtube] && captions[:youtube][:caption].include?("#Shorts")

puts "✓ Social Captions Generator successfully created copy for TikTok, Reels, and Shorts"

puts "\n🎉 ALL PHASE 2 BACKEND CHECKS PASSED PERFECTLY!"
