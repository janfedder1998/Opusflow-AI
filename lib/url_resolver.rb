# lib/url_resolver.rb
require 'net/http'
require 'uri'
require 'json'

module OpusFlow
  class UrlResolver
    YOUTUBE_REGEX = %r{(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})}i

    def self.resolve(url)
      url = url.to_s.strip
      return { error: 'Keine URL angegeben' } if url.empty?

      if yt_match = url.match(YOUTUBE_REGEX)
        video_id = yt_match[1]
        resolve_youtube(url, video_id)
      elsif url =~ %r{\.(mp4|webm|mov|m4v)(\?.*)?$}i
        resolve_direct_video(url)
      elsif url =~ %r{vimeo\.com\/(\d+)}i
        resolve_vimeo(url, $1)
      else
        # Try generic URL inspection
        resolve_generic(url)
      end
    end

    private

    def self.resolve_youtube(url, video_id)
      title = "YouTube Video (#{video_id})"
      author = "YouTube Creator"
      thumbnail_url = "https://img.youtube.com/vi/#{video_id}/maxresdefault.jpg"

      # Try oEmbed API for real title & author
      begin
        oembed_url = URI("https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=#{video_id}&format=json")
        res = Net::HTTP.get_response(oembed_url)
        if res.is_a?(Net::HTTPSuccess)
          data = JSON.parse(res.body)
          title = data['title'] || title
          author = data['author_name'] || author
          thumbnail_url = data['thumbnail_url'] || thumbnail_url
        end
      rescue => e
        # Fallback to defaults
      end

      {
        success: true,
        source_type: 'youtube',
        source_url: url,
        video_id: video_id,
        title: title,
        author: author,
        thumbnail_url: thumbnail_url,
        embed_url: "https://www.youtube.com/embed/#{video_id}",
        # Estimated / default duration until video loaded in browser
        duration: 345.0
      }
    end

    def self.resolve_direct_video(url)
      filename = File.basename(URI.parse(url).path) rescue 'Direct Video'
      {
        success: true,
        source_type: 'url',
        source_url: url,
        title: filename,
        author: 'Direct Video Stream',
        thumbnail_url: '',
        duration: 180.0
      }
    end

    def self.resolve_vimeo(url, vimeo_id)
      {
        success: true,
        source_type: 'vimeo',
        source_url: url,
        video_id: vimeo_id,
        title: "Vimeo Video (#{vimeo_id})",
        author: 'Vimeo Creator',
        thumbnail_url: '',
        duration: 240.0
      }
    end

    def self.resolve_generic(url)
      # Validate basic URL format
      uri = URI.parse(url) rescue nil
      if uri && (uri.scheme == 'http' || uri.scheme == 'https')
        {
          success: true,
          source_type: 'web',
          source_url: url,
          title: "Web Video (#{uri.host})",
          author: uri.host,
          thumbnail_url: '',
          duration: 200.0
        }
      else
        { error: 'Ungültige Video-URL. Bitte gib einen gültigen YouTube-Link oder direkten Videolink an.' }
      end
    end
  end
end
