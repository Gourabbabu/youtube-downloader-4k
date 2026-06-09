import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const urlObj = new URL(request.url);
  const videoUrl = urlObj.searchParams.get('url');
  const type = urlObj.searchParams.get('type') || 'mp4';

  if (!videoUrl) {
    return new Response('URL is required', { status: 400 });
  }

  try {
    // 1. Request video info from yt1s (battletested downloader API)
    const searchBody = new URLSearchParams();
    searchBody.append('q', videoUrl);
    searchBody.append('vt', 'home');

    const searchRes = await fetch('https://yt1s.com/api/ajaxSearch/index', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      body: searchBody.toString()
    });

    const searchData = await searchRes.json();
    if (searchData.status !== 'ok') {
      throw new Error(searchData.mess || 'Failed to fetch video info');
    }

    const vid = searchData.vid;
    // Find highest quality key for requested type
    let k = '';
    if (type === 'mp3') {
      const mp3Links = searchData.links?.mp3;
      if (!mp3Links) throw new Error('MP3 format not available');
      // Get highest bitrate
      const keys = Object.keys(mp3Links);
      k = mp3Links[keys[0]].k;
    } else {
      const mp4Links = searchData.links?.mp4;
      if (!mp4Links) throw new Error('MP4 format not available');
      // Try 1080p (137), 720p (22), 360p (18)
      k = (mp4Links['137'] || mp4Links['22'] || mp4Links['18'] || mp4Links[Object.keys(mp4Links)[0]]).k;
    }

    if (!k) {
      throw new Error('Could not find video stream key');
    }

    // 2. Request conversion / direct link
    const convertBody = new URLSearchParams();
    convertBody.append('vid', vid);
    convertBody.append('k', k);

    const convertRes = await fetch('https://yt1s.com/api/ajaxConvert/convert', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      body: convertBody.toString()
    });

    const convertData = await convertRes.json();
    if (convertData.status !== 'ok' || !convertData.dlink) {
      throw new Error(convertData.mess || 'Failed to convert video');
    }

    // Redirect user to the direct download link
    return new Response(null, {
      status: 302,
      headers: {
        'Location': convertData.dlink
      }
    });

  } catch (error: any) {
    console.error('Error downloading:', error);
    // Fallback to yewtu.be Invidious proxy if yt1s fails
    try {
      let videoId = '';
      const vUrl = new URL(videoUrl);
      if (vUrl.hostname.includes('youtu.be')) videoId = vUrl.pathname.slice(1);
      else videoId = vUrl.searchParams.get('v') || '';
      if (videoId.includes('?')) videoId = videoId.split('?')[0];

      if (videoId) {
        const itag = type === 'mp3' ? '140' : '22';
        return new Response(null, {
          status: 302,
          headers: { 'Location': `https://yewtu.be/latest_version?id=${videoId}&itag=${itag}&local=true` }
        });
      }
    } catch (e) {}

    return new Response(`Failed to process video: ${error.message}. Please try again later.`, { status: 500 });
  }
};
