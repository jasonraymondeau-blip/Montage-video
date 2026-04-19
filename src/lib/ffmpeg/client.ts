import ffmpeg from 'fluent-ffmpeg';

// Auto-resolve FFmpeg binaries from npm packages when system binaries are absent
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const ffprobeInstaller = require('@ffprobe-installer/ffprobe');

  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH || ffmpegInstaller.path);
  ffmpeg.setFfprobePath(process.env.FFPROBE_PATH || ffprobeInstaller.path);
} catch {
  // Fallback: assume system binaries are on PATH
  if (process.env.FFMPEG_PATH) ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
  if (process.env.FFPROBE_PATH) ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
}

export default ffmpeg;
