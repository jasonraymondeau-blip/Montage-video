import ffmpeg from './client';

/**
 * Detects silent ranges in a video/audio file using FFmpeg's silencedetect filter.
 * Returns array of [start, end] timestamps in seconds.
 */
export function detectSilence(
  filePath: string,
  noiseTolerance = '-35dB',
  minDuration = 0.5,
): Promise<[number, number][]> {
  return new Promise((resolve, reject) => {
    const silenceRanges: [number, number][] = [];
    let currentStart: number | null = null;
    let stderr = '';

    ffmpeg(filePath)
      .audioFilters(`silencedetect=noise=${noiseTolerance}:duration=${minDuration}`)
      .format('null')
      .output('/dev/null')
      .on('stderr', (line: string) => {
        stderr += line + '\n';

        const startMatch = line.match(/silence_start: ([\d.]+)/);
        if (startMatch) {
          currentStart = parseFloat(startMatch[1]);
        }

        const endMatch = line.match(/silence_end: ([\d.]+)/);
        if (endMatch && currentStart !== null) {
          silenceRanges.push([currentStart, parseFloat(endMatch[1])]);
          currentStart = null;
        }
      })
      .on('error', (err) => {
        // Some FFmpeg versions write to stderr even on success; only reject on real errors
        if (err.message.includes('ENOENT')) {
          reject(err);
        } else {
          resolve(silenceRanges);
        }
      })
      .on('end', () => resolve(silenceRanges))
      .run();
  });
}
