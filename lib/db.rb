# lib/db.rb
require 'sqlite3'
require 'fileutils'
require 'json'
require 'securerandom'
require 'thread'

module OpusFlow
  class Database
    STORAGE_ROOT = ENV['STORAGE_DIR'] || File.expand_path('../..', __FILE__)
    DB_PATH = File.join(STORAGE_ROOT, 'data', 'opusflow.sqlite')

    def self.instance
      @instance ||= new
    end

    def initialize
      FileUtils.mkdir_p(File.dirname(DB_PATH))
      init_schema
    end

    # The sqlite3 gem is explicitly NOT thread-safe when a single connection
    # object is shared across multiple Ruby threads (WEBrick handles each
    # HTTP request in its own thread, and the background analysis pipeline
    # runs in its own Thread). Sharing one connection caused a real bug here:
    # a write made on one thread's connection was not visible to a read on
    # another thread's connection ("read-after-write" not propagating).
    # The fix is the pattern SQLite itself recommends: each thread gets its
    # own connection to the same file. Autocommit writes to the file are
    # then immediately visible to any other connection that reads it.
    def db
      conn = Thread.current[:opusflow_db_connection]
      return conn if conn

      conn = SQLite3::Database.new(DB_PATH)
      conn.results_as_hash = true
      conn.busy_timeout = 5000
      conn.journal_mode = "WAL"
      conn.synchronous = "NORMAL"
      Thread.current[:opusflow_db_connection] = conn
      conn
    end

    private

    def init_schema
      c = db
      c.execute <<-SQL
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          source_type TEXT NOT NULL, -- 'youtube', 'url', 'upload', 'demo'
          source_url TEXT,
          file_path TEXT,
          thumbnail_url TEXT,
          duration REAL DEFAULT 0.0,
          status TEXT DEFAULT 'pending', -- 'pending', 'analyzing', 'completed', 'error'
          progress INTEGER DEFAULT 0,
          current_step TEXT DEFAULT '',
          metadata_json TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      SQL

      c.execute <<-SQL
        CREATE TABLE IF NOT EXISTS clips (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          title TEXT NOT NULL,
          score INTEGER NOT NULL DEFAULT 85,
          reason TEXT,
          category TEXT DEFAULT 'Hook', -- 'Hook', 'Story', 'Controversy', 'Key Insight', 'Emotional'
          start_time REAL NOT NULL,
          end_time REAL NOT NULL,
          aspect_ratio TEXT DEFAULT '9:16', -- '9:16', '1:1', '16:9'
          focal_point_x REAL DEFAULT 0.5,
          caption_preset TEXT DEFAULT 'viral', -- 'viral', 'bold', 'minimal', 'podcast', 'highlight'
          caption_style_json TEXT,
          transcript_json TEXT,
          video_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
      SQL

      c.execute <<-SQL
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      SQL

      c.execute <<-SQL
        CREATE TABLE IF NOT EXISTS scheduled_posts (
          id TEXT PRIMARY KEY,
          clip_id TEXT NOT NULL,
          project_id TEXT NOT NULL,
          platform TEXT NOT NULL, -- 'tiktok', 'instagram', 'youtube'
          caption TEXT NOT NULL,
          scheduled_time DATETIME NOT NULL,
          status TEXT DEFAULT 'scheduled', -- 'scheduled', 'published', 'failed'
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(clip_id) REFERENCES clips(id) ON DELETE CASCADE
        );
      SQL

      c.execute <<-SQL
        CREATE TABLE IF NOT EXISTS team_members (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT DEFAULT 'Editor', -- 'Admin', 'Editor', 'Viewer'
          avatar_url TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      SQL


      # Seed default settings if empty
      default_settings = {
        'gemini_api_key' => '',
        'openai_api_key' => '',
        'default_clip_min_duration' => '20',
        'default_clip_max_duration' => '60',
        'default_clip_count' => '6',
        'auto_cleanup_hours' => '24',
        'default_caption_style' => 'viral'
      }

      default_settings.each do |k, v|
        c.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", [k, v])
      end
    end
  end
end
