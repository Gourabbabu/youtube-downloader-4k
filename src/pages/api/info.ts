import type { APIRoute } from 'astro';
import youtubedl from 'youtube-dl-exec';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { url } = await request.json();

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), { status: 400 });
    }

    // Fetch video info
    const info = await youtubedl(url, {
      dumpSingleJson: true,
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      youtubeSkipDashManifest: true,
    });

    // Filter available formats for resolutions up to 4K and audio
    // yt-dlp formats have height (for video), acodec (audio codec), vcodec (video codec), ext
    
    return new Response(JSON.stringify({
      title: info.title,
      thumbnail: info.thumbnail,
      duration: info.duration_string,
      formats: info.formats.map((f: any) => ({
        format_id: f.format_id,
        ext: f.ext,
        resolution: f.resolution,
        height: f.height,
        vcodec: f.vcodec,
        acodec: f.acodec,
        filesize: f.filesize || f.filesize_approx,
      }))
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error fetching info:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch video info. Please check the URL.' }), { status: 500 });
  }
};
