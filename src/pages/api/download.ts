import type { APIRoute } from 'astro';
import ytdl from '@distube/ytdl-core';
import { Readable } from 'node:stream';

export const GET: APIRoute = async ({ request }) => {
  const urlObj = new URL(request.url);
  const videoUrl = urlObj.searchParams.get('url');
  const type = urlObj.searchParams.get('type') || 'mp4';
  const title = urlObj.searchParams.get('title') || 'video';

  if (!videoUrl) {
    return new Response('URL is required', { status: 400 });
  }

  try {
    // Basic bot protection bypass trick for ytdl-core
    const nodeStream = ytdl(videoUrl, {
      quality: type === 'mp3' ? 'highestaudio' : 'highest',
      filter: type === 'mp3' ? 'audioonly' : 'audioandvideo',
    });

    const webStream = Readable.toWeb(nodeStream);
    const ext = type === 'mp3' ? 'mp3' : 'mp4';
    const safeTitle = title.replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, "_");

    return new Response(webStream as any, {
      status: 200,
      headers: {
        'Content-Type': type === 'mp3' ? 'audio/mpeg' : 'video/mp4',
        'Content-Disposition': `attachment; filename="${safeTitle}.${ext}"`
      }
    });

  } catch (error: any) {
    console.error('Error downloading:', error);
    return new Response(`Failed to process video: ${error.message}. Please try again later.`, { status: 500 });
  }
};
