import fs from 'fs/promises';
import path from 'path';
import ffmpeg from './client';
import type { CropOptions } from '@/types';

/**
 * Trims a video segment, crops to 9:16 vertical format (1080x1920),
 * and re-encodes to ensure consistent output across clips.
 */
export function cropAndTrimToVertical(opts: CropOptions): Promise<void> {
  const { inputPath, outputPath, start, end, targetWidth = 1080, targetHeight = 1920 } = opts;
  const duration = end - start;

  // Strategy: scale height to target, center-crop width
  // If source is already portrait, scale width to target and center-crop height
  const cropFilter = [
    // Scale so that the longest relevant dimension fills the target
    `scale='if(gt(iw/ih,${targetWidth}/${targetHeight}),${targetHeight}*iw/ih,${targetWidth})':'if(gt(iw/ih,${targetWidth}/${targetHeight}),${targetHeight},${targetWidth}*ih/iw)'`,
    // Center crop to exact target size
    `crop=${targetWidth}:${targetHeight}:(iw-${targetWidth})/2:(ih-${targetHeight})/2`,
    // Ensure 30fps
    'fps=30',
  ].join(',');

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(start)
      .setDuration(duration)
      .videoFilter(cropFilter)
      .videoCodec('libx264')
      .addOption('-preset', 'fast')
      .addOption('-crf', '23')
      .addOption('-pix_fmt', 'yuv420p')
      .audioCodec('aac')
      .audioBitrate('128k')
      .audioFrequency(44100)
      .output(outputPath)
      .on('error', reject)
      .on('end', () => resolve())
      .run();
  });
}

export async function cropAndTrimSafe(opts: CropOptions): Promise<void> {
  await fs.mkdir(path.dirname(opts.outputPath), { recursive: true });
  await cropAndTrimToVertical(opts);
}
