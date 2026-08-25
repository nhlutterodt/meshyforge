// src/components/gallery/SearchBar.tsx
// Source: FRD FR-GAL-03, CSD §5

import { Input } from '@components/ui/input';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';

interface SearchBarProps {
  readonly onSearch: (query: string) => void;
  readonly debounceMs?: number;
  readonly placeholder?: string;
}

export function SearchBar({
  onSearch,
  debounceMs = 300,
  placeholder = 'Search assets...',
}: SearchBarProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(value);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [value, debounceMs, onSearch]);

  return (
    <div className="relative w-full max-w-md">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9"
        aria-label="Search assets"
      />
    </div>
  );
}
