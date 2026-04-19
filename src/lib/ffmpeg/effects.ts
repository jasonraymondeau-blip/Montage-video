import fs from 'fs/promises';
import path from 'path';
import ffmpeg from './client';
import type { ZoomOptions } from '@/types';

/**
 * Applies a slow Ken Burns zoom-in effect using the zoompan filter.
 * The video is already 9:16 at this point (1080x1920).
 */
export function applyZoomIn(opts: ZoomOptions): Promise<void> {
  const { inputPath, outputPath, intensity = 1.25 } = opts;

  // zoompan: z increments slowly from 1.0 to `intensity`
  // d is duration in frames (30fps assumed)
  const zoomFilter = [
    `zoompan=z='min(zoom+0.002,${intensity})':d=9999:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=30`,
  ].join(',');

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoFilter(zoomFilter)
      .videoCodec('libx264')
      .addOption('-preset', 'fast')
      .addOption('-crf', '23')
      .addOption('-pix_fmt', 'yuv420p')
      .audioCodec('copy')
      .output(outputPath)
      .on('error', reject)
      .on('end', () => resolve())
      .run();
  });
}

/**
 * Applies a speed ramp to a clip (speeds it up by `factor`).
 * factor > 1 = faster, factor < 1 = slower.
 * Supports atempo range 0.5–2.0.
 */
export function applySpeedRamp(
  inputPath: string,
  outputPath: string,
  factor: number,
): Promise<void> {
  const clampedFactor = Math.max(0.5, Math.min(2.0, factor));
  const ptsMultiplier = (1 / clampedFactor).toFixed(4);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoFilter(`setpts=${ptsMultiplier}*PTS`)
      .audioFilter(`atempo=${clampedFactor}`)
      .videoCodec('libx264')
      .addOption('-preset', 'fast')
      .addOption('-crf', '23')
      .addOption('-pix_fmt', 'yuv420p')
      .audioCodec('aac')
      .audioBitrate('128k')
      .output(outputPath)
      .on('error', reject)
      .on('end', () => resolve())
      .run();
  });
}

export async function applyZoomSafe(opts: ZoomOptions): Promise<void> {
  await fs.mkdir(path.dirname(opts.outputPath), { recursive: true });
  await applyZoomIn(opts);
}

export async function applySpeedSafe(
  inputPath: string,
  outputPath: string,
  factor: number,
): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await applySpeedRamp(inputPath, outputPath, factor);
}
