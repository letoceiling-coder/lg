import { useState } from 'react';
import { Palette } from 'lucide-react';

interface TokenGroup {
  label: string;
  tokens: { key: string; label: string; value: string }[];
}

const defaultGroups: TokenGroup[] = [
  {
    label: 'Цвета',
    tokens: [
      { key: 'primaryColor', label: 'Primary', value: '#2563eb' },
      { key: 'secondaryColor', label: 'Secondary', value: '#6b7280' },
      { key: 'accentColor', label: 'Accent', value: '#06b6d4' },
      { key: 'bgColor', label: 'Background', value: '#ffffff' },
      { key: 'fgColor', label: 'Foreground', value: '#1a1a2e' },
    ],
  },
  {
    label: 'Типографика',
    tokens: [
      { key: 'fontHeading', label: 'Heading', value: 'Inter, sans-serif' },
      { key: 'fontBody', label: 'Body', value: 'Inter, sans-serif' },
    ],
  },
  {
    label: 'Spacing & Radius',
    tokens: [
      { key: 'borderRadius', label: 'Border Radius', value: '12px' },
      { key: 'spacingBase', label: 'Spacing Base', value: '16px' },
    ],
  },
];

export default function AdminTokens() {
  const [groups, setGroups] = useState(defaultGroups);

  const updateToken = (groupIdx: number, tokenIdx: number, value: string) => {
    setGroups(prev => prev.map((g, gi) =>
      gi === groupIdx
        ? { ...g, tokens: g.tokens.map((t, ti) => ti === tokenIdx ? { ...t, value } : t) }
        : g
    ));
  };

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Palette className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold">Design Tokens</h1>
      </div>
      <div className="space-y-6">
        {groups.map((g, gi) => (
          <div key={g.label} className="bg-background border rounded-2xl p-5">
            <h2 className="font-semibold mb-4">{g.label}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {g.tokens.map((t, ti) => (
                <div key={t.key}>
                  <label className="text-sm text-muted-foreground mb-1 block">{t.label}</label>
                  <div className="flex items-center gap-2">
                    {t.key.includes('Color') && (
                      <input
                        type="color"
                        value={t.value}
                        onChange={e => updateToken(gi, ti, e.target.value)}
                        className="w-8 h-8 rounded-lg border cursor-pointer"
                      />
                    )}
                    <input
                      value={t.value}
                      onChange={e => updateToken(gi, ti, e.target.value)}
                      className="border rounded-xl px-3 py-2 text-sm flex-1 bg-background font-mono"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        <button className="bg-primary text-primary-foreground px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-primary/90">
          Сохранить токены
        </button>
      </div>
    </div>
  );
}
