import ffmpeg from 'fluent-ffmpeg';

try {
  // Dynamic require for optional bundled binaries
  const ffmpegPath = (require('@ffmpeg-installer/ffmpeg') as { path: string }).path;
  const ffprobePath = (require('@ffprobe-installer/ffprobe') as { path: string }).path;
  ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH || ffmpegPath);
  ffmpeg.setFfprobePath(process.env.FFPROBE_PATH || ffprobePath);
} catch {
  if (process.env.FFMPEG_PATH) ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
  if (process.env.FFPROBE_PATH) ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
}

export default ffmpeg;
