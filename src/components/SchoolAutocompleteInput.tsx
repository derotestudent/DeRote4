import React, { useState, useEffect, useRef } from 'react';
import { Building2, MapPin, Check, ChevronDown, X, School } from 'lucide-react';
import { searchSchools, SchoolEntry, POPULAR_SCHOOLS } from '../data/schoolsBank';

interface SchoolAutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
  error?: string;
  id?: string;
}

export const SchoolAutocompleteInput: React.FC<SchoolAutocompleteInputProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = 'Start typing school name (e.g. Delhi Public School, National Public School...)',
  error,
  id = 'school-autocomplete-input',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = searchSchools(value, 8);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectSchool = (school: SchoolEntry) => {
    onChange(school.name);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
      setIsOpen(true);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0 && suggestions[activeIndex]) {
      e.preventDefault();
      handleSelectSchool(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // Check if current text exactly matches one of the known schools
  const exactMatch = POPULAR_SCHOOLS.find(
    (s) => s.name.toLowerCase() === value.trim().toLowerCase()
  );

  return (
    <div ref={containerRef} className="relative w-full text-left">
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#64778C]">
          <School className="w-4 h-4 text-[#0866C6]" />
        </div>

        <input
          ref={inputRef}
          id={id}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
            setActiveIndex(-1);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          className={`w-full min-h-[48px] pl-10 pr-10 rounded-xl border text-sm sm:text-base text-[#102C46] placeholder-[#64778C]/60 outline-none transition-all ${
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
              : 'border-[#062B50]/15 focus:border-[#0866C6] focus:ring-2 focus:ring-[#0866C6]/20 bg-white'
          }`}
        />

        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-md text-[#64778C] hover:text-[#062B50] hover:bg-slate-100 transition-colors cursor-pointer"
              aria-label="Clear school name"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="p-1 rounded-md text-[#64778C] hover:text-[#062B50] transition-colors cursor-pointer"
            aria-label="Toggle school suggestions"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {exactMatch && (
        <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
          <span>Verified Partner School ({exactMatch.city}, {exactMatch.state})</span>
        </div>
      )}

      {error && !exactMatch && (
        <p className="mt-1 text-xs text-red-500 font-medium">{error}</p>
      )}

      {/* Autocomplete Dropdown */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 bg-white rounded-2xl shadow-xl border border-[#D5E9FF] z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-72 overflow-y-auto">
          <div className="p-2 border-b border-[#F0F5FA] bg-[#F8FAFD] flex items-center justify-between text-[11px] font-bold text-[#64778C]">
            <span className="flex items-center gap-1 text-[#0866C6]">
              <Building2 className="w-3 h-3" />
              <span>Suggested Schools ({suggestions.length})</span>
            </span>
            <span className="text-[10px] text-[#64778C]">Click to auto-select</span>
          </div>

          <div className="p-1.5 space-y-1">
            {suggestions.map((school, index) => {
              const isSelected = value.trim().toLowerCase() === school.name.toLowerCase();
              const isHighlighted = activeIndex === index;

              return (
                <button
                  key={school.id}
                  type="button"
                  onClick={() => handleSelectSchool(school)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-all flex items-start justify-between gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-[#EAF1FF] text-[#0866C6] font-semibold'
                      : isHighlighted
                      ? 'bg-[#F4F8FD] text-[#062B50]'
                      : 'hover:bg-[#F8FAFD] text-[#062B50]'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs sm:text-sm break-words line-clamp-2">
                        {school.name}
                      </span>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-[#0866C6] shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-[#64778C] mt-0.5">
                      <MapPin className="w-3 h-3 text-[#0866C6] shrink-0" />
                      <span>
                        {school.city}, {school.state}
                      </span>
                    </div>
                  </div>

                  {school.board && (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-[#0866C6] bg-[#E8F3FF] px-2 py-0.5 rounded-md self-center">
                      {school.board}
                    </span>
                  )}
                </button>
              );
            })}

            {suggestions.length === 0 && (
              <div className="p-3 text-center text-xs text-[#64778C]">
                No predefined match. You can still use "<strong>{value}</strong>" as your school.
              </div>
            )}
          </div>

          {value.trim() && (
            <div className="p-2 border-t border-[#F0F5FA] bg-[#FAFDFE] text-center">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-[11px] font-semibold text-[#0866C6] hover:underline cursor-pointer"
              >
                Use custom school name: "{value}"
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
