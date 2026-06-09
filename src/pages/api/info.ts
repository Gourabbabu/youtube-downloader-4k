import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  try {
    const { url } = await request.json();

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), { status: 400 });
    }

    // Use a public oembed service which doesn't get blocked to get title and thumbnail
    const oembedRes = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
    const info = await oembedRes.json();

    if (info.error) {
      throw new Error(info.error);
    }

    // We don't get formats from oembed, so we'll construct mock formats up to 4K
    // so the UI can still show all resolution options. Cobalt will handle the best available.
    const mockFormats = [
      { height: 2160 },
      { height: 1440 },
      { height: 1080 },
      { height: 720 },
      { height: 480 },
      { height: 360 }
    ];

    return new Response(JSON.stringify({
      title: info.title || 'YouTube Video',
      thumbnail: info.thumbnail_url || '',
      duration: 'HD', // Oembed doesn't give duration, but we can display HD
      formats: mockFormats
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error: any) {
    console.error('Error fetching info:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch video info. Please check the URL.' }), { status: 500 });
  }
};
