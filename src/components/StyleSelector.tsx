'use client';

import type { TemplateId } from '@/types';
import { TEMPLATES } from '@/lib/montage/templates';

interface StyleSelectorProps {
  selected: TemplateId;
  onChange: (id: TemplateId) => void;
  disabled?: boolean;
  hasReferences?: boolean;
}

const TEMPLATE_ICONS: Record<TemplateId, string> = {
  'alex-hormozi': '💰',
  mrbeast: '🎬',
  tiktok: '📱',
  custom: '🎯',
};

const TEMPLATE_COLORS: Record<TemplateId, string> = {
  'alex-hormozi': 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30',
  mrbeast: 'from-red-500/20 to-pink-500/20 border-red-500/30',
  tiktok: 'from-cyan-500/20 to-blue-500/20 border-cyan-500/30',
  custom: 'from-brand/20 to-purple-500/20 border-brand/30',
};

const TEMPLATE_SELECTED_COLORS: Record<TemplateId, string> = {
  'alex-hormozi': 'border-yellow-400 ring-2 ring-yellow-400/30',
  mrbeast: 'border-red-400 ring-2 ring-red-400/30',
  tiktok: 'border-cyan-400 ring-2 ring-cyan-400/30',
  custom: 'border-brand ring-2 ring-brand/30',
};

export default function StyleSelector({
  selected,
  onChange,
  disabled = false,
  hasReferences = false,
}: StyleSelectorProps) {
  const templates = Object.values(TEMPLATES);

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-medium text-white">Style de montage</h3>
        <p className="text-xs text-gray-400 mt-0.5">Choisit le style qui guidera les coupes et effets</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {templates.map((template) => {
          const isSelected = selected === template.id;
          const isCustom = template.id === 'custom';

          return (
            <button
              key={template.id}
              type="button"
              onClick={() => !disabled && onChange(template.id)}
              disabled={disabled}
              className={`relative text-left rounded-xl border p-4 transition-all duration-200 bg-gradient-to-br
                ${TEMPLATE_COLORS[template.id]}
                ${isSelected ? TEMPLATE_SELECTED_COLORS[template.id] : 'hover:opacity-90'}
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                  <div className="w-2 h-2 rounded-full bg-white" />
                </div>
              )}

              <div className="text-2xl mb-2">{TEMPLATE_ICONS[template.id]}</div>
              <div className="font-semibold text-white text-sm">{template.name}</div>
              <div className="text-xs text-gray-400 mt-1 leading-relaxed line-clamp-2">
                {template.description}
              </div>

              {isCustom && !hasReferences && (
                <div className="mt-2 text-xs text-yellow-400/80">
                  ⚠ Nécessite des références
                </div>
              )}

              <div className="mt-2 flex gap-1 flex-wrap">
                <span className="text-xs bg-black/30 text-gray-300 rounded-full px-2 py-0.5">
                  {template.cutInterval}s/coupe
                </span>
                {template.addHook && (
                  <span className="text-xs bg-black/30 text-gray-300 rounded-full px-2 py-0.5">
                    Hook
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
