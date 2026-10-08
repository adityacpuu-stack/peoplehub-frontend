import { t, useLocale } from '@/i18n';
import { useState, useRef, useEffect, useMemo, useId, type KeyboardEvent } from 'react';
import { ChevronDown, X, Check, Loader2 } from 'lucide-react';

interface Option {
  value: string | number;
  label: string;
  sublabel?: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
  'aria-label'?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  searchPlaceholder = 'Search...',
  disabled = false,
  loading = false,
  emptyMessage = 'No results found',
  className = '',
  'aria-label': ariaLabel,
}: SearchableSelectProps) {
  useLocale();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const [activeIndex, setActiveIndex] = useState(0);

  // Filter options based on search
  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const searchLower = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(searchLower) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(searchLower))
    );
  }, [options, search]);

  // Get selected option (use loose equality to handle number/string mismatch)
  const selectedOption = options.find((opt) => String(opt.value) === String(value));

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => { if (isOpen) inputRef.current?.focus(); }, [isOpen]);
  useEffect(() => {
    if (isOpen) document.getElementById(`${listId}-${activeIndex}`)?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, isOpen, listId]);

  const close = () => { setIsOpen(false); setSearch(''); };
  const open = () => {
    setSearch('');
    setActiveIndex(Math.max(0, options.findIndex(opt => String(opt.value) === String(value))));
    setIsOpen(true);
  };
  const handleSelect = (optionValue: string | number) => {
    onChange(optionValue); close(); triggerRef.current?.focus();
  };
  const handleClear = () => {
    onChange(''); close(); triggerRef.current?.focus();
  };
  const navigate = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation(); close(); triggerRef.current?.focus();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex(index => Math.max(0, Math.min(filteredOptions.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1))));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (filteredOptions[activeIndex]) handleSelect(filteredOptions[activeIndex].value);
    }
  };

  return (
    <div ref={containerRef} className={`ph-select ${className}`} onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close();
    }}>
      <div className="ph-select-trigger" data-disabled={disabled}>
        <button ref={triggerRef} type="button" disabled={disabled} aria-label={ariaLabel}
          aria-haspopup="listbox" aria-expanded={isOpen} aria-controls={isOpen ? listId : undefined}
          onClick={() => isOpen ? close() : open()}
          onKeyDown={event => { if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); open(); } }}>
          <span className="ph-select-value">
            {loading ? <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />{t("Loading...")}</span>
              : selectedOption ? <><span>{selectedOption.label}</span>{selectedOption.sublabel && <small>{selectedOption.sublabel}</small>}</>
                : <span className="text-[var(--ph-muted)]">{t(placeholder)}</span>}
          </span>
          <ChevronDown className="w-4 h-4 shrink-0" aria-hidden="true" />
        </button>
        {selectedOption && !disabled && <button type="button" className="ph-select-clear" onClick={handleClear} aria-label={t('Clear {label}', { label: selectedOption.label })}><X className="w-4 h-4" /></button>}
      </div>
      {isOpen && <div className="ph-select-popover">
        <div className="ph-select-search">
          <input ref={inputRef} type="text" value={search} role="combobox" aria-label={searchPlaceholder}
            aria-autocomplete="list" aria-expanded="true" aria-controls={listId}
            aria-activedescendant={filteredOptions[activeIndex] ? `${listId}-${activeIndex}` : undefined}
            onChange={event => { setSearch(event.target.value); setActiveIndex(0); }} onKeyDown={navigate}
            placeholder={t(searchPlaceholder)} className="ph-control" />
        </div>
        <div className="ph-select-options" id={listId} role="listbox" aria-label={ariaLabel || placeholder}>
          {filteredOptions.map((option, index) => <button key={option.value} id={`${listId}-${index}`}
            type="button" role="option" tabIndex={-1} aria-selected={String(option.value) === String(value)}
            data-highlighted={index === activeIndex} onMouseMove={() => setActiveIndex(index)}
            onMouseDown={event => event.preventDefault()} onClick={() => handleSelect(option.value)}>
            <span className="min-w-0"><span>{option.label}</span>{option.sublabel && <small>{option.sublabel}</small>}</span>
            {String(option.value) === String(value) && <Check className="w-4 h-4 shrink-0 ml-2" aria-hidden="true" />}
          </button>)}
        </div>
        {filteredOptions.length === 0 && <div className="ph-select-empty" role="status">{t(emptyMessage)}</div>}
      </div>}
    </div>
  );
}
