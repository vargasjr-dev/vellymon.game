"use client";

import {
  TIMER_OPTIONS,
  MAP_OPTIONS,
  type MatchSettings,
} from "~/lib/matchSettings";

type Props = {
  settings: MatchSettings;
  onChange: (settings: MatchSettings) => void;
};

export default function MatchSettingsPanel({ settings, onChange }: Props) {
  return (
    <div className="space-y-5">
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
        Match Settings
      </h3>

      {/* Timer */}
      <div>
        <p className="text-sm font-semibold text-gray-800 mb-2">⏱ Turn Timer</p>
        <div className="flex gap-2">
          {TIMER_OPTIONS.map((opt) => {
            const active = settings.timerSeconds === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  onChange({ ...settings, timerSeconds: opt.value })
                }
                className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-medium transition border-2 ${
                  active
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-gray-200 bg-white text-gray-600 hover:border-blue-300"
                }`}
              >
                <span className="block font-bold">{opt.label}</span>
                <span className="block text-xs text-gray-500 mt-0.5">
                  {opt.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Map */}
      <div>
        <p className="text-sm font-semibold text-gray-800 mb-2">🗺 Map</p>
        <div className="grid grid-cols-2 gap-3">
          {MAP_OPTIONS.map((map) => {
            const active = settings.mapId === map.id;
            return (
              <button
                key={map.id}
                type="button"
                onClick={() => onChange({ ...settings, mapId: map.id })}
                className={`text-left p-3 rounded-lg transition border-2 ${
                  active
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 bg-white hover:border-blue-300"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm text-gray-900">
                    {map.name}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">
                    {map.dimensions}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{map.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
