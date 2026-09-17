"use client";

import { Search, X } from "lucide-react";

export default function SearchBar({
  value,
  onChange,
  placeholder = "Buscar procedimento ou material…",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative w-full">
      <Search
        size={18}
        strokeWidth={2}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-subink"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border border-hairline bg-surface py-3.5 pl-11 pr-11 text-[15px] text-ink placeholder:text-subink shadow-card outline-none transition-all duration-300 ease-apple focus:border-accent focus:shadow-cardHover"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="Limpar busca"
          className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-subink transition-colors hover:bg-canvas hover:text-ink"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
