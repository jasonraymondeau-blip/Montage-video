import type { SubtitleLine, SubtitleStyle } from '@/types';

/** Converts seconds to ASS timestamp format: H:MM:SS.cc */
function toAssTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const cs = Math.floor((seconds % 1) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

/** Escapes text for ASS format (no newlines, no special chars) */
function escapeAss(text: string): string {
  return text.replace(/\{/g, '\\{').replace(/\}/g, '\\}').replace(/\n/g, '\\N');
}

/**
 * Generates an ASS subtitle file content with TikTok/Reels-style captions.
 * Highlighted words are shown in a contrasting color (yellow by default).
 */
export function generateAssContent(
  lines: SubtitleLine[],
  style: SubtitleStyle,
): string {
  const alignmentCode = style.alignment === 'center' ? 5 : 2; // 2=bottom-center, 5=center
  const marginV = style.alignment === 'center' ? 960 : 120;
  const boldFlag = style.bold ? 1 : 0;

  // ASS color format: &HAABBGGRR (alpha, blue, green, red)
  const primaryColor = style.primaryColor || '&H00FFFFFF';
  const outlineColor = style.outlineColor || '&H00000000';
  const highlightColor = '&H0000FFFF'; // Yellow
  const hookColor = '&H000080FF';      // Orange

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial Black,${style.fontSize},${primaryColor},${primaryColor},${outlineColor},&H80000000,${boldFlag},0,0,0,100,100,0,0,1,4,2,${alignmentCode},60,60,${marginV},1
Style: Hook,Arial Black,${Math.round(style.fontSize * 1.2)},${hookColor},${hookColor},${outlineColor},&H00000000,1,0,0,0,100,100,0,0,1,5,3,${alignmentCode},60,60,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text`;

  const events = lines.map((line) => {
    const startTime = toAssTime(line.start);
    const endTime = toAssTime(line.end);
    const styleName = line.style === 'hook' ? 'Hook' : 'Default';

    let text = escapeAss(line.text);

    // Highlight specific words with color override tags
    if (line.highlightWords.length > 0) {
      line.highlightWords.forEach((word) => {
        const regex = new RegExp(`\\b(${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi');
        text = text.replace(regex, `{\\c${highlightColor}}$1{\\c${primaryColor}}`);
      });
    }

    return `Dialogue: 0,${startTime},${endTime},${styleName},,0,0,0,,${text}`;
  });

  return `${header}\n${events.join('\n')}\n`;
}

/**
 * Burns ASS subtitles into a video using FFmpeg's ass filter.
 * Returns a shell-safe FFmpeg video filter string.
 */
export function getSubtitleFilter(subtitlePath: string): string {
  // Escape colons and backslashes for FFmpeg filter syntax
  const escapedPath = subtitlePath
    .replace(/\\/g, '/')
    .replace(/:/g, '\\:');
  return `ass='${escapedPath}'`;
}
