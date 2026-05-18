'use client';

import { Calendar, Play, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { useState } from 'react';

import {
  type CreateRuleInput,
  type Rule,
  type RuleFrequency,
  useCreateRule,
  useDeleteRule,
  useRules,
  useTriggerRule,
  useUpdateRule,
} from '@/lib/graphql/queries';
import { formatTRY } from '@/lib/utils';

const FREQUENCY_LABEL: Record<RuleFrequency, string> = {
  WEEKLY: 'Haftalık',
  MONTHLY: 'Aylık',
  PAYDAY: 'Maaş günü',
  ONE_TIME: 'Tek seferlik',
};

export function RulesWidget() {
  const { data: rules, isLoading } = useRules();
  const [creating, setCreating] = useState(false);

  return (
    <div className="ny-card">
      <div className="mb-3 flex items-center justify-between">
        <div className="ny-eyebrow">Otomatik katkı kuralları</div>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="ny-chip flex items-center gap-1 text-xs"
          >
            <Plus size={14} /> Yeni
          </button>
        )}
      </div>

      {creating && <CreateRuleForm onClose={() => setCreating(false)} />}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2].map((i) => (
            <div key={i} className="ny-card h-16 animate-pulse" />
          ))}
        </div>
      ) : !rules || rules.length === 0 ? (
        !creating && (
          <p className="text-sm opacity-60">
            Henüz kural yok. Maaş günü otomatik birikim için bir kural ekle.
          </p>
        )
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <RuleRow key={rule.id} rule={rule} />
          ))}
        </div>
      )}
    </div>
  );
}

function CreateRuleForm({ onClose }: { onClose: () => void }) {
  const createRule = useCreateRule();
  const [label, setLabel] = useState('Maaş günü katkısı');
  const [amount, setAmount] = useState<number>(500);
  const [frequency, setFrequency] = useState<RuleFrequency>('PAYDAY');
  const [payday, setPayday] = useState<number>(15);

  const handleSubmit = async () => {
    if (!label.trim() || amount <= 0) return;
    const input: CreateRuleInput = { label, amount, frequency };
    if (frequency === 'PAYDAY') {
      input.payday = payday;
    }
    await createRule.mutateAsync(input);
    onClose();
  };

  return (
    <div className="ny-card mb-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="ny-eyebrow">Yeni kural</div>
        <button
          type="button"
          onClick={onClose}
          className="opacity-60 hover:opacity-100"
          aria-label="Kapat"
        >
          <X size={18} />
        </button>
      </div>

      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Kural adı (örn. Maaş günü katkısı)"
        className="w-full rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--canvas-parchment))] p-3 text-sm"
      />

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-xs opacity-60">Tutar (₺)</span>
          <input
            type="number"
            value={amount}
            min={1}
            onChange={(e) => setAmount(+e.target.value)}
            className="w-full rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--canvas-parchment))] p-3 text-sm"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs opacity-60">Sıklık</span>
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as RuleFrequency)}
            className="w-full appearance-none rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--canvas-parchment))] p-3 text-sm"
          >
            <option value="PAYDAY">Maaş günü</option>
            <option value="WEEKLY">Haftalık</option>
            <option value="MONTHLY">Aylık</option>
            <option value="ONE_TIME">Tek seferlik</option>
          </select>
        </label>
      </div>

      {frequency === 'PAYDAY' && (
        <label className="block">
          <span className="mb-1 block text-xs opacity-60">Ayın hangi günü maaş alıyorsun?</span>
          <input
            type="number"
            min={1}
            max={31}
            value={payday}
            onChange={(e) => setPayday(Math.max(1, Math.min(31, +e.target.value)))}
            className="w-full rounded-xl border border-[hsl(var(--hairline))] bg-[hsl(var(--canvas-parchment))] p-3 text-sm"
          />
        </label>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={createRule.isPending || !label.trim() || amount <= 0}
        className="ny-pill w-full disabled:opacity-50"
      >
        {createRule.isPending ? 'Oluşturuluyor…' : 'Kural oluştur'}
      </button>
    </div>
  );
}

function RuleRow({ rule }: { rule: Rule }) {
  const triggerRule = useTriggerRule();
  const deleteRule = useDeleteRule();
  const updateRule = useUpdateRule();

  const toggleActive = () =>
    updateRule.mutate({ ruleId: rule.id, input: { active: !rule.active } });

  return (
    <div
      className={`flex items-center justify-between gap-2 rounded-xl border p-3 ${
        rule.active ? 'border-[hsl(var(--hairline))]' : 'border-[hsl(var(--hairline))] opacity-50'
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">{rule.label}</span>
          {rule.frequency === 'PAYDAY' && (
            <Calendar size={12} className="shrink-0 opacity-60" aria-label="Maaş günü" />
          )}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs opacity-70">
          <span>{formatTRY(rule.amount)}</span>
          <span>•</span>
          <span>{FREQUENCY_LABEL[rule.frequency]}</span>
          {!rule.active && (
            <>
              <span>•</span>
              <span>Pasif</span>
            </>
          )}
        </div>
      </div>

      <div className="flex shrink-0 gap-1">
        <button
          type="button"
          onClick={() => triggerRule.mutate(rule.id)}
          disabled={!rule.active || triggerRule.isPending}
          className="ny-chip flex items-center gap-1 text-xs disabled:opacity-40"
          aria-label="Şimdi tetikle"
          title="Şimdi tetikle"
        >
          <Play size={12} />
        </button>
        <button
          type="button"
          onClick={toggleActive}
          className="ny-chip flex items-center gap-1 text-xs"
          aria-label={rule.active ? 'Pasifleştir' : 'Aktifleştir'}
          title={rule.active ? 'Pasifleştir' : 'Aktifleştir'}
        >
          <Sparkles size={12} />
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm(`"${rule.label}" kuralı silinsin mi?`)) {
              deleteRule.mutate(rule.id);
            }
          }}
          className="ny-chip flex items-center gap-1 text-xs text-red-600"
          aria-label="Sil"
          title="Sil"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}
