"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import CountryFlag from "@/components/ui/CountryFlag";
import { COUNTRY_DIAL_CODES, CountryDialCode } from "@/lib/constants/dialCodes";

interface CountryDialPickerProps {
  value: string;
  onChange: (code: string) => void;
  className?: string;
}

export default function CountryDialPicker({
  value,
  onChange,
  className = "",
}: CountryDialPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedItem: CountryDialCode =
    COUNTRY_DIAL_CODES.find((c) => c.code === value) || COUNTRY_DIAL_CODES[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative shrink-0 ${className}`}>
      {/* Bouton déclencheur avec vrai drapeau SVG */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-10 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#1D6B45] cursor-pointer"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <CountryFlag country={selectedItem.country} size={18} />
        <span className="text-xs font-bold text-slate-800">
          {selectedItem.code}
        </span>
        <ChevronDown
          size={14}
          className={`text-slate-400 transition-transform duration-150 ${
            isOpen ? "rotate-180 text-[#1D6B45]" : ""
          }`}
        />
      </button>

      {/* Menu déroulant avec vrais drapeaux SVG (aucun emoji Windows tronqué) */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-60 max-h-64 overflow-y-auto bg-white rounded-2xl shadow-xl border border-slate-100 z-[100] py-1.5 animate-in fade-in zoom-in-95 duration-100">
          {COUNTRY_DIAL_CODES.map((item) => {
            const isSelected = item.code === value;
            return (
              <button
                key={`${item.iso}-${item.code}`}
                type="button"
                onClick={() => {
                  onChange(item.code);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                  isSelected
                    ? "bg-emerald-50/70 text-[#1D6B45]"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                <CountryFlag country={item.country} size={20} />
                <span className="flex-1 text-xs font-semibold truncate">
                  {item.country}
                </span>
                <span className="text-xs font-bold text-slate-900 shrink-0">
                  {item.code}
                </span>
                {isSelected && (
                  <Check size={14} className="text-[#1D6B45] shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
