# lib/db.rb
require 'pg'
require 'fileutils'
require 'json'
require 'securerandom'
require 'thread'

module OpusFlow
  # Compatibility shim so the rest of the app (written against the sqlite3
  # gem's API: execute / get_first_row / get_first_value, "?" placeholders,
  # hash rows) does not need to change at all. Internally this talks to a
  # real PostgreSQL database instead of a SQLite file on a mounted disk.
  # We moved off SQLite because writes made by one connection were not
  # reliably visible to reads from another connection/thread on Render's
  # persistent disk, even after trying every SQLite-level fix (WAL mode,
  # forced checkpoints, single shared connection). PostgreSQL is a real
  # client/server database built for exactly this kind of concurrent
  # access, so it does not have that failure mode.
  class PgCompat
    def initialize(conn)
      @conn = conn
      @mutex = Mutex.new
    end

    def execute(sql, params = [])
      pg_sql = translate(sql)
      rows = @mutex.synchronize do
        @conn.exec_params(pg_sql, Array(params)).to_a
      end
      rows.each { |r| yield r } if block_given?
      rows
    end

    def get_first_row(sql, params = [])
      execute(sql, params).first
    end

    def get_first_value(sql, params = [])
      row = get_first_row(sql, params)
      row ? row.values.first : nil
    end

    private

    # Translates SQLite-style "?" positional placeholders into PostgreSQL's
    # "$1", "$2", ... placeholders so every existing query string still works
    # unchanged.
    def translate(sql)
      i = 0
      sql.gsub('?') { i += 1; "$#{i}" }
    end
  end

  class Database
    def self.instance
      @instance ||= new
    end

    def initialize
      url = ENV['DATABASE_URL']
      raise "DATABASE_URL is not set" unless url && !url.empty?

      raw = PG.connect(url)
      raw.type_map_for_results = PG::BasicTypeMapForResults.new(raw)
      @db = PgCompat.new(raw)
      init_schema
    end

    def db
      @db
    end

    private

    def init_schema
      c = db
      c.execute <<-SQL
        CREATE TABLE IF NOT EXISTS projects (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          source_type TEXT NOT NULL,
          source_url TEXT,
          file_path TEXT,
          thumbnail_url TEXT,
          duration REAL DEFAULT 0.0,
          status TEXT DEFAULT 'pending',
          progress INTEGER DEFAULT 0,
          current_step TEXT DEFAULT '',
          metadata_json TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      SQL

      c.execute <<-SQL
        CREATE TABLE IF NOT EXISTS clips (
          id TEXT PRIMARY KEY,
          project_id TEXT NOT NULL,
          title TEXT NOT NULL,
          score INTEGER NOT NULL DEFAULT 85,
          reason TEXT,
          category TEXT DEFAULT 'Hook',
          start_time REAL NOT NULL,
          end_time REAL NOT NULL,
          aspect_ratio TEXT DEFAULT '9:16',
          focal_point_x REAL DEFAULT 0.5,
          caption_preset TEXT DEFAULT 'viral',
          caption_style_json TEXT,
          transcript_json TEXT,
          video_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(project_id) REFERENCES projects(id) ON DELETE CASCADE
        );
      SQL

      c.execute <<-SQL
        CREATE TABLE IF NOT EXISTS settings (
          key TEXT PRIMARY KEY,
          value TEXT,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      SQL

      c.execute <<-SQL
        CREATE TABLE IF NOT EXISTS scheduled_posts (
          id TEXT PRIMARY KEY,
          clip_id TEXT NOT NULL,
          project_id TEXT NOT NULL,
          platform TEXT NOT NULL,
          caption TEXT NOT NULL,
          scheduled_time TIMESTAMP NOT NULL,
          status TEXT DEFAULT 'scheduled',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY(clip_id) REFERENCES clips(id) ON DELETE CASCADE
        );
      SQL

      c.execute <<-SQL
        CREATE TABLE IF NOT EXISTS team_members (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL,
          name TEXT NOT NULL,
          role TEXT DEFAULT 'Editor',
          avatar_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      SQL

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
        c.execute("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO NOTHING", [k, v])
      end
    end
  end
end
