import type { APIRoute } from 'astro';
import youtubedl from 'youtube-dl-exec';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { Readable } from 'node:stream';

export const GET: APIRoute = async ({ request }) => {
  const urlObj = new URL(request.url);
  const videoUrl = urlObj.searchParams.get('url');
  const type = urlObj.searchParams.get('type') || 'mp4'; // mp4 or mp3
  const res = urlObj.searchParams.get('res') || '1080'; // 360, 720, 1080, 2160(4k)
  const title = urlObj.searchParams.get('title') || 'download';

  if (!videoUrl) {
    return new Response('URL is required', { status: 400 });
  }

  const fileId = Math.random().toString(36).substring(7);
  const ext = type === 'mp3' ? 'mp3' : 'mp4';
  const tempFilename = `ydl_${fileId}.${ext}`;
  const tempPath = path.join(os.tmpdir(), tempFilename);

  try {
    let options: any = {
      output: tempPath,
      noWarnings: true,
      noCallHome: true,
      noCheckCertificate: true,
      ffmpegLocation: 'C:\\Users\\ASUS\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1.1-full_build\\bin\\ffmpeg.exe'
    };

    if (type === 'mp3') {
      options.extractAudio = true;
      options.audioFormat = 'mp3';
      options.format = 'bestaudio/best';
    } else {
      options.format = `bestvideo[height<=${res}][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best`;
      options.mergeOutputFormat = 'mp4';
    }

    // Download the file locally (this will block until download is complete and ffmpeg merged it)
    // For large 4K files this can take some time.
    await youtubedl(videoUrl, options);

    // Stream the file back to the client
    const stat = fs.statSync(tempPath);
    const nodeStream = fs.createReadStream(tempPath);
    
    // Convert Node stream to Web stream
    const webStream = Readable.toWeb(nodeStream);

    // Clean up file after streaming ends (we can hook into the stream or just fire a timeout, 
    // but better to clean up when stream is closed. A simple approach is deleting after 1 hour, 
    // or attaching a 'close' event to nodeStream)
    nodeStream.on('close', () => {
      fs.unlink(tempPath, (err) => {
        if (err) console.error(`Failed to delete temp file ${tempPath}`, err);
      });
    });

    const safeTitle = title.replace(/[^a-zA-Z0-9 ]/g, "").trim().replace(/\s+/g, "_");

    return new Response(webStream as any, {
      status: 200,
      headers: {
        'Content-Type': type === 'mp3' ? 'audio/mpeg' : 'video/mp4',
        'Content-Disposition': `attachment; filename="${safeTitle}.${ext}"`,
        'Content-Length': stat.size.toString(),
      }
    });

  } catch (error: any) {
    console.error('Error downloading:', error);
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
    return new Response('Failed to process video', { status: 500 });
  }
};
