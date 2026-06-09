import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ request }) => {
  const urlObj = new URL(request.url);
  const videoUrl = urlObj.searchParams.get('url');
  const type = urlObj.searchParams.get('type') || 'mp4'; // mp4 or mp3
  const res = urlObj.searchParams.get('res') || '1080';

  if (!videoUrl) {
    return new Response('URL is required', { status: 400 });
  }

  try {
    // We use the excellent free Cobalt API which bypasses IP blocks.
    const cobaltRes = await fetch('https://api.cobalt.tools/', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        // Optional: Cobalt suggests identifying the client
        'User-Agent': 'YouTubeDL-Web/1.0'
      },
      body: JSON.stringify({
        url: videoUrl,
        vQuality: res,
        isAudioOnly: type === 'mp3',
        aFormat: type === 'mp3' ? 'mp3' : 'best',
        filenamePattern: 'classic',
        disableMetadata: false
      })
    });

    const data = await cobaltRes.json();

    if (!cobaltRes.ok || data.status === 'error') {
      console.error('Cobalt error:', data);
      
      // Fallback/Legacy Cobalt Endpoint if the main one has changed format
      const fallbackRes = await fetch('https://api.cobalt.tools/api/json', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          url: videoUrl,
          vQuality: res,
          isAudioOnly: type === 'mp3'
        })
      });
      const fallbackData = await fallbackRes.json();
      
      if (fallbackData.url) {
         return new Response(null, { status: 302, headers: { 'Location': fallbackData.url } });
      }

      throw new Error(data.text || data.error?.message || 'Failed to process download through backend proxy.');
    }

    if (data.url) {
      // Redirect the user's browser directly to the Cobalt stream/download URL
      return new Response(null, {
        status: 302,
        headers: {
          'Location': data.url
        }
      });
    }

    return new Response('Download URL not found', { status: 500 });
  } catch (error: any) {
    console.error('Error downloading:', error);
    return new Response(`Failed to process video: ${error.message}. Please try again later.`, { status: 500 });
  }
};
