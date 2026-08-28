"use client";

import React, { useEffect, useRef, useState } from "react";
import { MapPin, Loader2, X, Building2, Navigation } from "lucide-react";

export interface AddressFeature {
  label: string;
  name?: string;
  postcode?: string;
  citycode?: string;
  city?: string;
  context?: string;
  type?: string;
  street?: string;
  housenumber?: string;
  coordinates?: [number, number];
}

export function getQuarterOrCityFromAddress(item: AddressFeature): string {
  if (item.postcode) {
    const pc = item.postcode.trim();
    // Paris
    if (pc.startsWith("750") && pc.length === 5) {
      const arr = parseInt(pc.slice(3), 10);
      if (arr >= 1 && arr <= 20) {
        return arr === 1 ? "Paris 1er" : `Paris ${arr}e`;
      }
    }
    // Lyon
    if (pc.startsWith("6900") && pc.length === 5) {
      const arr = parseInt(pc.slice(4), 10);
      if (arr >= 1 && arr <= 9) {
        return arr === 1 ? "Lyon 1er" : `Lyon ${arr}e`;
      }
    }
    // Marseille
    if (pc.startsWith("130") && pc.length === 5) {
      const arr = parseInt(pc.slice(3), 10);
      if (arr >= 1 && arr <= 16) {
        return arr === 1 ? "Marseille 1er" : `Marseille ${arr}e`;
      }
    }
  }
  return item.city || item.name || item.label;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelectAddress?: (item: AddressFeature) => void;
  placeholder?: string;
  type?: "housenumber" | "street" | "locality" | "municipality";
  className?: string;
  inputClassName?: string;
  required?: boolean;
  disabled?: boolean;
}

export default function AddressAutocomplete({
  value,
  onChange,
  onSelectAddress,
  placeholder = "Saisissez une adresse ou une ville...",
  type,
  className = "",
  inputClassName = "",
  required = false,
  disabled = false,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState<AddressFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceTimer = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const searchAddress = async (text: string) => {
    if (!text || text.trim().length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      let url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(
        text.trim(),
      )}&limit=5`;
      if (type) {
        url += `&type=${type}`;
      }

      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error("Erreur API Adresse");
      const data = await res.json();

      const results: AddressFeature[] = (data.features || []).map(
        (f: any) => ({
          label: f.properties?.label || "",
          name: f.properties?.name || "",
          postcode: f.properties?.postcode || "",
          citycode: f.properties?.citycode || "",
          city: f.properties?.city || "",
          context: f.properties?.context || "",
          type: f.properties?.type || "",
          street: f.properties?.street || "",
          housenumber: f.properties?.housenumber || "",
          coordinates: f.geometry?.coordinates || undefined,
        }),
      );

      setSuggestions(results);
      setIsOpen(results.length > 0);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.warn("[AddressAutocomplete] Erreur API adresse:", err.message);
        setSuggestions([]);
        setIsOpen(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setQuery(text);
    onChange(text);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      searchAddress(text);
    }, 300);
  };

  const handleSelect = (item: AddressFeature) => {
    setQuery(item.label);
    onChange(item.label);
    setIsOpen(false);
    setSuggestions([]);
    if (onSelectAddress) {
      onSelectAddress(item);
    }
  };

  const handleClear = () => {
    setQuery("");
    onChange("");
    setSuggestions([]);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="relative flex items-center">
        <MapPin
          size={16}
          className="absolute left-3.5 text-[#1D6B45] pointer-events-none"
        />
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            if (suggestions.length > 0 && query.length >= 2) {
              setIsOpen(true);
            }
          }}
          placeholder={placeholder}
          required={required}
          disabled={disabled}
          className={`w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] focus:border-transparent text-sm bg-white transition-all ${inputClassName}`}
          autoComplete="off"
        />
        <div className="absolute right-3 flex items-center">
          {loading ? (
            <Loader2 size={16} className="text-[#1D6B45] animate-spin" />
          ) : query.length > 0 ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>
      </div>

      {/* Floating Suggestions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white rounded-xl border border-gray-100 shadow-xl overflow-hidden divide-y divide-gray-50 max-h-64 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="px-3 py-1.5 bg-gray-50/80 text-[11px] font-semibold text-gray-500 flex items-center justify-between">
            <span>Suggestions officielles (data.gouv.fr)</span>
            <span className="text-[10px] text-gray-400 font-normal">
              {suggestions.length} résultat{suggestions.length > 1 ? "s" : ""}
            </span>
          </div>

          {suggestions.map((item, idx) => (
            <button
              key={`${item.label}-${idx}`}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full px-3.5 py-2.5 flex items-start gap-2.5 hover:bg-[#1D6B45]/5 text-left transition-colors cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-lg bg-[#1D6B45]/10 flex items-center justify-center text-[#1D6B45] shrink-0 mt-0.5 group-hover:bg-[#1D6B45] group-hover:text-white transition-colors">
                {item.type === "municipality" ? (
                  <Building2 size={14} />
                ) : (
                  <Navigation size={14} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-gray-800 truncate group-hover:text-[#1D6B45] transition-colors">
                  {item.label}
                </p>
                {item.context && (
                  <p className="text-[11px] text-gray-500 truncate mt-0.5">
                    {item.context}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
