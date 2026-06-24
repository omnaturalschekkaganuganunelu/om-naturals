'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface CustomCalendarProps {
  value: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  placeholder?: string;
}

export default function CustomCalendar({ value, onChange, placeholder = "Select Date" }: CustomCalendarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) return new Date(value);
    return new Date();
  });
  
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();

  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleDateClick = (day: number) => {
    const m = currentMonth.getMonth() + 1;
    const d = day;
    const y = currentMonth.getFullYear();
    const formatted = `${y}-${m.toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
    onChange(formatted);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-white border border-amber-100 px-4 py-2 rounded-2xl shadow-sm text-xs font-bold text-amber-900 focus:outline-none hover:border-amber-400 transition-colors w-full sm:w-40 justify-between"
      >
        <span className="truncate">{value || placeholder}</span>
        <CalendarIcon size={14} className="text-amber-600 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 z-50 bg-white border border-amber-100 rounded-3xl shadow-xl p-4 w-64">
          <div className="flex items-center justify-between mb-4">
            <button onClick={handlePrevMonth} className="p-1 hover:bg-amber-50 rounded-full text-amber-800 transition-colors">
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-black text-amber-950">
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </span>
            <button onClick={handleNextMonth} className="p-1 hover:bg-amber-50 rounded-full text-amber-800 transition-colors">
              <ChevronRight size={16} />
            </button>
          </div>
          
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
              <div key={d} className="text-[10px] font-bold text-gray-400">{d}</div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} />;
              
              const m = currentMonth.getMonth() + 1;
              const y = currentMonth.getFullYear();
              const dateStr = `${y}-${m.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
              const isSelected = value === dateStr;
              const isToday = new Date().toISOString().split('T')[0] === dateStr;

              return (
                <button
                  key={idx}
                  onClick={() => handleDateClick(day)}
                  className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-amber-800 text-white shadow-md font-bold'
                      : isToday
                      ? 'bg-amber-100 text-amber-900 font-bold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
          
          {value && (
            <button
              onClick={() => { onChange(''); setIsOpen(false); }}
              className="mt-4 w-full text-center text-xs font-bold text-red-500 hover:bg-red-50 py-2 rounded-xl transition-colors"
            >
              Clear Date
            </button>
          )}
        </div>
      )}
    </div>
  );
}
