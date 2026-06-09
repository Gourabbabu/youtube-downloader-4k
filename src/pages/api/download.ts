import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const urlObj = new URL(request.url);
  const videoUrl = urlObj.searchParams.get('url');
  const type = urlObj.searchParams.get('type') || 'mp4';

  if (!videoUrl) {
    return new Response('URL is required', { status: 400 });
  }

  try {
    // Extract video ID from youtube URL
    let videoId = '';
    const vUrl = new URL(videoUrl);
    if (vUrl.hostname.includes('youtu.be')) {
      videoId = vUrl.pathname.slice(1);
    } else {
      videoId = vUrl.searchParams.get('v') || '';
    }

    // Strip out any query params if present in youtu.be links
    if (videoId.includes('?')) {
      videoId = videoId.split('?')[0];
    }

    if (!videoId) {
      throw new Error('Invalid YouTube URL');
    }

    // Use an Invidious instance to proxy the video stream directly. 
    // This perfectly bypasses YouTube IP blocks and Cloudflare Turnstile blocks!
    // itag 22 = 720p MP4 (highest quality that includes audio track by default)
    // itag 140 = 128kbps M4A Audio
    const itag = type === 'mp3' ? '140' : '22'; 
    const invidiousUrl = `https://vid.puffyan.us/latest_version?id=${videoId}&itag=${itag}&local=true`;

    return new Response(null, {
      status: 302,
      headers: {
        'Location': invidiousUrl
      }
    });

  } catch (error: any) {
    console.error('Error downloading:', error);
    return new Response(`Failed to process video: ${error.message}. Please try again later.`, { status: 500 });
  }
};
