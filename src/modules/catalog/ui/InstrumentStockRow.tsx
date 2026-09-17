"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import Spinner from "@/shared/ui/Spinner";
import MaterialImage from "./MaterialImage";
import { isOutOfStock, type Instrument } from "@/modules/catalog/domain";

export default function InstrumentStockRow({
  instrument,
  onUpdate,
}: {
  instrument: Instrument;
  onUpdate: (id: string, data: { stock: number }) => Promise<void> | void;
}) {
  const [stock, setStock] = useState(instrument.stock);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty = stock !== instrument.stock;
  const stockZero = isOutOfStock(instrument);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(instrument.id, { stock });
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl px-3 py-3 transition-colors duration-200 hover:bg-canvas sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <MaterialImage material={instrument} size={40} />
        <div className="min-w-0">
          <p className="text-[14.5px] font-medium text-ink">{instrument.name}</p>
          <div className="mt-0.5 flex items-center gap-2 text-[12.5px] text-subink">
            {instrument.category && <span>{instrument.category}</span>}
            {stockZero && (
              <span className="rounded-full bg-danger-soft px-2 py-0.5 font-medium text-danger">
                Sem estoque
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <label className="flex items-center gap-1.5">
          <span className="text-[12px] text-subink">Estoque</span>
          <input
            type="number"
            min={0}
            step={1}
            value={stock}
            onChange={(e) => setStock(parseFloat(e.target.value) || 0)}
            className="w-20 rounded-lg border border-hairline bg-surface px-2 py-1.5 text-center text-[13.5px] outline-none focus:border-accent"
          />
          <span className="text-[12px] text-subink">un</span>
        </label>

        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:bg-hairline disabled:text-subink"
          aria-label="Salvar estoque"
        >
          {saving ? <Spinner size={15} /> : <Check size={15} />}
        </button>

        {saved && <span className="text-[12px] font-medium text-success">Salvo</span>}
      </div>
    </div>
  );
}
