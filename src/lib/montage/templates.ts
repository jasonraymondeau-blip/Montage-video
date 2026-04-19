import type { MontageTemplate, TemplateId } from '@/types';

export const TEMPLATES: Record<TemplateId, MontageTemplate> = {
  'alex-hormozi': {
    id: 'alex-hormozi',
    name: 'Alex Hormozi',
    description: 'Coupes toutes les 3s, zoom modéré, sous-titres jaunes en gras, hook percutant',
    cutInterval: 3.0,
    transitions: ['cut', 'zoom'],
    subtitleStyle: {
      primaryColor: '&H00FFFFFF',
      outlineColor: '&H00000000',
      bold: true,
      fontSize: 72,
      alignment: 'center',
      wordByWord: true,
    },
    zoomIntensity: 1.25,
    speedFactor: 1.0,
    addHook: true,
    hookDuration: 3,
  },
  mrbeast: {
    id: 'mrbeast',
    name: 'MrBeast',
    description: 'Cuts ultra-rapides 1.5s, zoom intense, sous-titres géants, énergie maximale',
    cutInterval: 1.5,
    transitions: ['cut', 'zoom', 'fade'],
    subtitleStyle: {
      primaryColor: '&H00FFFFFF',
      outlineColor: '&H00000000',
      bold: true,
      fontSize: 88,
      alignment: 'bottom',
      wordByWord: true,
    },
    zoomIntensity: 1.5,
    speedFactor: 1.15,
    addHook: true,
    hookDuration: 2,
  },
  tiktok: {
    id: 'tiktok',
    name: 'TikTok Default',
    description: 'Coupes toutes les 2s, transitions douces, sous-titres centrés, style moderne',
    cutInterval: 2.0,
    transitions: ['cut', 'fade'],
    subtitleStyle: {
      primaryColor: '&H00FFFFFF',
      outlineColor: '&H00000000',
      bold: false,
      fontSize: 64,
      alignment: 'bottom',
      wordByWord: false,
    },
    zoomIntensity: 1.1,
    speedFactor: 1.0,
    addHook: false,
    hookDuration: 0,
  },
  custom: {
    id: 'custom',
    name: 'Depuis les références',
    description: 'Style appris automatiquement depuis tes vidéos de référence uploadées',
    cutInterval: 2.5,
    transitions: ['cut'],
    subtitleStyle: {
      primaryColor: '&H00FFFFFF',
      outlineColor: '&H00000000',
      bold: true,
      fontSize: 68,
      alignment: 'bottom',
      wordByWord: false,
    },
    zoomIntensity: 1.2,
    speedFactor: 1.0,
    addHook: false,
    hookDuration: 0,
  },
};

export function getTemplate(id: TemplateId): MontageTemplate {
  return TEMPLATES[id] ?? TEMPLATES.tiktok;
}

export function applyStyleProfileToTemplate(
  template: MontageTemplate,
  style: import('@/types').StyleProfile,
): MontageTemplate {
  if (template.id !== 'custom') return template;

  return {
    ...template,
    cutInterval: style.avgCutInterval,
    transitions: [style.dominantTransition],
    zoomIntensity: Math.max(1.05, Math.min(1.8, style.zoomIntensity * 1.5 + 1.0)),
    subtitleStyle: {
      ...template.subtitleStyle,
      wordByWord: style.pace === 'fast' || style.pace === 'very-fast',
    },
  };
}
