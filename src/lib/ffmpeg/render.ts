import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import ffmpeg from './client';
import { getSubtitleFilter } from './subtitles';
import type { ClipInfo, RenderOptions, TransitionType } from '@/types';

/**
 * Builds a dynamic xfade filtergraph for N clips with transitions between them.
 * Returns { filterComplex, outputVideoLabel, outputAudioLabel }
 */
function buildXfadeFiltergraph(
  clips: ClipInfo[],
  transition: TransitionType,
  transitionDuration: number,
): { filterComplex: string; hasAudio: boolean } {
  if (clips.length === 1) {
    return { filterComplex: '', hasAudio: true };
  }

  const xfadeTransition = transition === 'zoom' ? 'zoom' : transition === 'wipe' ? 'wipeleft' : 'fade';
  const lines: string[] = [];

  // Label all inputs
  clips.forEach((_, i) => {
    lines.push(`[${i}:v]setpts=PTS-STARTPTS[v${i}]`);
  });
  clips.forEach((_, i) => {
    lines.push(`[${i}:a]asetpts=PTS-STARTPTS[a${i}]`);
  });

  // Chain xfade for video
  let videoOffset = 0;
  let prevVLabel = 'v0';
  for (let i = 1; i < clips.length; i++) {
    videoOffset += clips[i - 1].duration - transitionDuration;
    const outLabel = i === clips.length - 1 ? 'outv' : `xfv${i}`;
    lines.push(
      `[${prevVLabel}][v${i}]xfade=transition=${xfadeTransition}:duration=${transitionDuration}:offset=${videoOffset.toFixed(3)}[${outLabel}]`,
    );
    prevVLabel = outLabel;
  }

  // Chain acrossfade for audio
  let audioOffset = 0;
  let prevALabel = 'a0';
  for (let i = 1; i < clips.length; i++) {
    audioOffset += clips[i - 1].duration - transitionDuration;
    const outLabel = i === clips.length - 1 ? 'outa' : `xfa${i}`;
    lines.push(
      `[${prevALabel}][a${i}]acrossfade=d=${transitionDuration}[${outLabel}]`,
    );
    prevALabel = outLabel;
  }

  return { filterComplex: lines.join(';\n'), hasAudio: true };
}

/**
 * Concatenates clips using a simple concat demuxer (hard cuts, no transition).
 * Faster and more reliable than filter_complex for many clips.
 */
async function concatWithCuts(
  clips: ClipInfo[],
  outputPath: string,
  subtitlePath: string | undefined,
  onProgress?: (pct: number) => void,
): Promise<void> {
  // Write concat list file
  const listPath = path.join(os.tmpdir(), `concat_${Date.now()}.txt`);
  const listContent = clips.map((c) => `file '${c.path}'`).join('\n');
  await fs.writeFile(listPath, listContent, 'utf-8');

  return new Promise((resolve, reject) => {
    const videoFilters = subtitlePath
      ? [getSubtitleFilter(subtitlePath)]
      : ['fps=30'];

    ffmpeg()
      .input(listPath)
      .inputOptions(['-f', 'concat', '-safe', '0'])
      .videoFilter(videoFilters)
      .videoCodec('libx264')
      .addOption('-preset', 'fast')
      .addOption('-crf', '22')
      .addOption('-pix_fmt', 'yuv420p')
      .addOption('-movflags', '+faststart')
      .audioCodec('aac')
      .audioBitrate('128k')
      .audioFrequency(44100)
      .size('1080x1920')
      .output(outputPath)
      .on('progress', (info: { percent?: number }) => {
        if (onProgress && info.percent != null) {
          onProgress(Math.min(99, Math.round(info.percent)));
        }
      })
      .on('error', async (err) => {
        await fs.unlink(listPath).catch(() => undefined);
        reject(err);
      })
      .on('end', async () => {
        await fs.unlink(listPath).catch(() => undefined);
        resolve();
      })
      .run();
  });
}

/**
 * Renders the final montage video from processed clips.
 * Uses xfade transitions when possible, falls back to hard cuts for 'cut' transition type.
 */
export async function renderFinal(opts: RenderOptions): Promise<void> {
  const { clips, subtitlePath, transition, transitionDuration, outputPath, onProgress } = opts;

  await fs.mkdir(path.dirname(outputPath), { recursive: true });

  // For 'cut' transitions or single clip, use the concat demuxer (fast & reliable)
  if (transition === 'cut' || clips.length === 1) {
    return concatWithCuts(clips, outputPath, subtitlePath, onProgress);
  }

  // For fade/zoom/wipe transitions: use xfade filter_complex
  const { filterComplex } = buildXfadeFiltergraph(clips, transition, transitionDuration);

  return new Promise((resolve, reject) => {
    let cmd = ffmpeg();

    clips.forEach((clip) => {
      cmd = cmd.input(clip.path);
    });

    const outputVFilter = subtitlePath
      ? `[outv]${getSubtitleFilter(subtitlePath)}[finalv]`
      : '';

    const fullFilter = outputVFilter
      ? `${filterComplex};\n${outputVFilter}`
      : filterComplex;

    const mapVideo = outputVFilter ? '[finalv]' : '[outv]';

    cmd
      .complexFilter(fullFilter)
      .map(mapVideo)
      .map('[outa]')
      .videoCodec('libx264')
      .addOption('-preset', 'fast')
      .addOption('-crf', '22')
      .addOption('-pix_fmt', 'yuv420p')
      .addOption('-movflags', '+faststart')
      .audioCodec('aac')
      .audioBitrate('128k')
      .audioFrequency(44100)
      .size('1080x1920')
      .output(outputPath)
      .on('progress', (info: { percent?: number }) => {
        if (onProgress && info.percent != null) {
          onProgress(Math.min(99, Math.round(info.percent)));
        }
      })
      .on('error', (err) => {
        // Fallback to concat if xfade fails (e.g. older FFmpeg without xfade support)
        concatWithCuts(clips, outputPath, subtitlePath, onProgress)
          .then(resolve)
          .catch(() => reject(err));
      })
      .on('end', () => resolve())
      .run();
  });
}
