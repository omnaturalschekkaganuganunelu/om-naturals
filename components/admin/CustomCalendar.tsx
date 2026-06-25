'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface CustomCalendarProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  placeholder?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function CustomCalendar({ value, onChange, placeholder = 'Select Date' }: CustomCalendarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => (value ? new Date(value) : new Date()));
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const [mounted, setMounted] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // SSR safety
  useEffect(() => { setMounted(true); }, []);

  // Position the portal dropdown relative to the trigger button
  const positionDropdown = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const calendarHeight = 310; // approx height of the calendar popup
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;

    // Prefer below, fall back to above if not enough space
    const openUpward = spaceBelow < calendarHeight && spaceAbove > calendarHeight;

    setDropdownStyle({
      position: 'fixed',
      left: `${rect.left}px`,
      top: openUpward ? `${rect.top - calendarHeight - 8}px` : `${rect.bottom + 8}px`,
      width: '256px',
      zIndex: 9999,
    });
  }, []);

  // Reposition on scroll / resize
  useEffect(() => {
    if (!isOpen) return;
    positionDropdown();
    window.addEventListener('scroll', positionDropdown, true);
    window.addEventListener('resize', positionDropdown);
    return () => {
      window.removeEventListener('scroll', positionDropdown, true);
      window.removeEventListener('resize', positionDropdown);
    };
  }, [isOpen, positionDropdown]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const handleDateClick = (day: number) => {
    const m = (currentMonth.getMonth() + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    const y = currentMonth.getFullYear();
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (!isOpen) positionDropdown();
    setIsOpen((prev) => !prev);
  };

  const calendarDropdown = (
    <div
      ref={dropdownRef}
      style={dropdownStyle}
      className="bg-white border border-amber-100 rounded-3xl shadow-2xl p-4 animate-fade-in-up"
    >
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
          className="p-1.5 hover:bg-amber-50 rounded-full text-amber-800 transition-colors"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-black text-amber-950">
          {MONTH_NAMES[currentMonth.getMonth()]} {currentMonth.getFullYear()}
        </span>
        <button
          type="button"
          onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
          className="p-1.5 hover:bg-amber-50 rounded-full text-amber-800 transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="text-[10px] font-bold text-gray-400">{d}</div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          if (day === null) return <div key={`e-${idx}`} />;
          const m = (currentMonth.getMonth() + 1).toString().padStart(2, '0');
          const d = day.toString().padStart(2, '0');
          const dateStr = `${currentMonth.getFullYear()}-${m}-${d}`;
          const isSelected = value === dateStr;
          const isToday = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }) === dateStr;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleDateClick(day)}
              className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium transition-all ${
                isSelected
                  ? 'bg-amber-800 text-white shadow-md font-bold'
                  : isToday
                  ? 'bg-amber-100 text-amber-900 font-bold'
                  : 'text-gray-700 hover:bg-amber-50'
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Clear button */}
      {value && (
        <button
          type="button"
          onClick={() => { onChange(''); setIsOpen(false); }}
          className="mt-4 w-full text-center text-xs font-bold text-red-500 hover:bg-red-50 py-2 rounded-xl transition-colors"
        >
          Clear Date
        </button>
      )}
    </div>
  );

  return (
    <div className="relative">
      <button
        type="button"
        ref={triggerRef}
        onClick={handleToggle}
        className="flex items-center space-x-2 bg-white border border-amber-100 px-4 py-2.5 rounded-2xl shadow-sm text-xs font-bold text-amber-900 focus:outline-none hover:border-amber-400 focus:ring-2 focus:ring-amber-400 transition-all w-full justify-between"
      >
        <span className={`truncate ${value ? 'text-amber-900' : 'text-gray-400 font-normal'}`}>
          {value ? value : placeholder}
        </span>
        <CalendarIcon size={14} className="text-amber-600 shrink-0" />
      </button>

      {/* Portal: renders outside all parent stacking contexts */}
      {mounted && isOpen && createPortal(calendarDropdown, document.body)}
    </div>
  );
}
