"use client";

import { useEffect, useId, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AirportMatch } from "@/lib/types";

type AirportFieldProps = {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
};

export function AirportField({
  label,
  name,
  value,
  onChange,
  placeholder,
}: AirportFieldProps) {
  const id = useId();
  const listId = `${id}-suggestions`;
  const [suggestions, setSuggestions] = useState<AirportMatch[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = value.trim();
    if (q.length < 1) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/airports?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        const data = (await res.json()) as { airports: AirportMatch[] };
        setSuggestions(data.airports);
      } catch (error) {
        if ((error as { name?: string }).name !== "AbortError") {
          setSuggestions([]);
        }
      } finally {
        setLoading(false);
      }
    }, 160);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  return (
    <div className="relative flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        name={name}
        value={value}
        autoComplete="off"
        placeholder={placeholder}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded={open && suggestions.length > 0}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={(event) => {
          const next = event.relatedTarget as Node | null;
          if (!event.currentTarget.parentElement?.contains(next)) {
            setOpen(false);
          }
        }}
      />
      {open && (suggestions.length > 0 || loading) ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border bg-popover p-1 text-sm shadow-md"
        >
          {loading && suggestions.length === 0 ? (
            <li className="px-2 py-2 text-muted-foreground">Searching airports…</li>
          ) : (
            suggestions.map((airport) => (
              <li key={airport.id}>
                <button
                  type="button"
                  className="w-full rounded-md px-2 py-2 text-left hover:bg-muted"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onChange(airport.iata ?? airport.icao ?? airport.name);
                    setOpen(false);
                  }}
                >
                  <span className="font-medium">
                    {airport.iata ?? airport.icao}
                  </span>
                  <span className="block text-muted-foreground">
                    {airport.name} · {airport.city}, {airport.country}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
