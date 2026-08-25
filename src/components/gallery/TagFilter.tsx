// src/components/gallery/TagFilter.tsx
// Source: FRD FR-GAL-04, CSD §5

import { Label } from '@components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select';

interface TagFilterProps {
  readonly tags: string[];
  readonly selectedTag: string | null;
  readonly onTagChange: (tag: string | null) => void;
}

export function TagFilter({ tags, selectedTag, onTagChange }: TagFilterProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="tag-filter">Filter by Tag</Label>
      <Select
        value={selectedTag ?? 'all'}
        onValueChange={(v) => onTagChange(v === 'all' ? null : (v ?? null))}
      >
        <SelectTrigger id="tag-filter" className="w-48">
          <SelectValue placeholder="All tags" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All tags</SelectItem>
          {tags.map((tag) => (
            <SelectItem key={tag} value={tag}>
              {tag}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
