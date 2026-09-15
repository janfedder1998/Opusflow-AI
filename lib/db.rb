# lib/db.rb
require 'sqlite3'
require 'fileutils'
require 'json'
require 'securerandom'
require 'thread'

module OpusFlow
  # The sqlite3 gem is explicitly NOT thread-safe when a single connection
  # object is shared across multiple Ruby threads. This app does exactly
  # that (WEBrick handles each HTTP request in its own thread, and the
  # background analysis pipeline runs in its own Thread), which can cause
  # a silent, unrecoverable low-level deadlock with no Ruby exception and
  # no log output. This wrapper serializes every call through a Mutex so
  # only one thread ever touches the underlying connection at a time.
  class SafeDatabase
    def initialize(raw_db)
      @raw_db = raw_db
      @mutex = Mutex.new
    end

    def method_missing(name, *args, **kwargs, &block)
      @mutex.synchronize { @raw_db.send(name, *args, **kwargs, &block) }
    end

    def respond_to_missing?(name, include_private = false)
      @raw_db.respond_to?(name, include_private) || super
    end
  end

  class Database
    STORAGE_ROOT = ENV['STORAGE_DIR'] || File.expand_path('../..', __FILE__)
    DB_PATH = File.join(STORAGE_ROOT, 'data', 'opusflow.sqlite')

    def self.instance
      @instance ||= new
    end

    def initialize
      FileUtils.mkdir_p(File.dirname(DB_PATH))
      raw_db = SQLite3::Database.new(DB_PATH)
      raw_db.results_as_hash = true
      raw_db.busy_timeout = 5000
      @db = SafeDatabase.new(raw_db)
      init_schema
    end

    def db
      @db
    end

    private

    def init_schema
      @db.execute <<-SQL
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

      @db.execute <<-SQL
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

      @db.execute <<-SQL
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      SQL

      @db.execute <<-SQL
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

      @db.execute <<-SQL
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
        @db.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", [k, v])
      end
    end
  end
end
