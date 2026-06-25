'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface CustomSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  openUpward?: boolean;
}

export default function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  disabled = false,
  openUpward = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Find active option label
  const selectedOption = options.find((opt) => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full text-xs font-semibold ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white border border-amber-200 rounded-xl px-4 py-2.5 text-left text-amber-950 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all smooth-shadow hover:border-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className="truncate">{displayLabel}</span>
        <ChevronDown size={14} className={`text-amber-700 transition-transform duration-200 shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className={`absolute left-0 right-0 bg-white border border-amber-100 rounded-2xl smooth-shadow-lg py-1.5 z-[999] max-h-60 overflow-y-auto no-scrollbar animate-fade-in-up ${
          openUpward ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
        }`}>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              className={`w-full text-left px-4 py-2 text-xs font-medium transition-colors ${
                opt.value === value
                  ? 'bg-amber-50 text-amber-900 font-extrabold'
                  : 'text-amber-950 hover:bg-amber-50/50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
