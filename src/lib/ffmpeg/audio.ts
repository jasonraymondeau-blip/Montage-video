import path from 'path';
import fs from 'fs/promises';
import ffmpeg from './client';

/**
 * Extracts audio from a video file as a 16kHz mono WAV — optimal for Whisper.
 */
export function extractAudio(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioChannels(1)
      .audioFrequency(16000)
      .audioCodec('pcm_s16le')
      .output(outputPath)
      .on('error', reject)
      .on('end', () => resolve())
      .run();
  });
}

/**
 * Ensures the output directory exists, then extracts audio.
 */
export async function extractAudioSafe(
  inputPath: string,
  outputPath: string,
): Promise<string> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await extractAudio(inputPath, outputPath);
  return outputPath;
}
