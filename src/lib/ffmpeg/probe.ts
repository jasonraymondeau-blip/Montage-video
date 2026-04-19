import ffmpeg from './client';
import type { VideoMetadata } from '@/types';

export function probeVideo(filePath: string): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, data) => {
      if (err) return reject(err);

      const videoStream = data.streams.find((s) => s.codec_type === 'video');
      const audioStream = data.streams.find((s) => s.codec_type === 'audio');

      if (!videoStream) return reject(new Error('No video stream found'));

      const fpsRaw = videoStream.r_frame_rate || '25/1';
      const [num, den] = fpsRaw.split('/').map(Number);
      const fps = den ? num / den : num;

      resolve({
        duration: data.format.duration ?? 0,
        width: videoStream.width ?? 0,
        height: videoStream.height ?? 0,
        fps: Math.round(fps * 100) / 100,
        hasAudio: !!audioStream,
        bitrate: data.format.bit_rate ? parseInt(String(data.format.bit_rate)) : undefined,
        codec: videoStream.codec_name,
      });
    });
  });
}
