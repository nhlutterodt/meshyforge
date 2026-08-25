// src/components/settings/PreferencesPanel.tsx
// Source: FRD FR-SET-03, CSD §5

import { Label } from '@components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@components/ui/select';
import { Separator } from '@components/ui/separator';
import { Switch } from '@components/ui/switch';
import type { AiModel } from '@lib/meshy-types';
import { useSettingsStore } from '@stores/settingsStore';

export function PreferencesPanel() {
  const defaultAiModel = useSettingsStore((s) => s.defaultAiModel);
  const setDefaultAiModel = useSettingsStore((s) => s.setDefaultAiModel);
  const pollIntervalMs = useSettingsStore((s) => s.pollIntervalMs);
  const setPollIntervalMs = useSettingsStore((s) => s.setPollIntervalMs);
  const useSseStreaming = useSettingsStore((s) => s.useSseStreaming);
  const setUseSseStreaming = useSettingsStore((s) => s.setUseSseStreaming);
  const autoDownloadOnSuccess = useSettingsStore((s) => s.autoDownloadOnSuccess);
  const setAutoDownloadOnSuccess = useSettingsStore((s) => s.setAutoDownloadOnSuccess);
  const notifyOnTaskComplete = useSettingsStore((s) => s.notifyOnTaskComplete);
  const setNotifyOnTaskComplete = useSettingsStore((s) => s.setNotifyOnTaskComplete);
  const resetToDefaults = useSettingsStore((s) => s.resetToDefaults);

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-semibold">Preferences</h3>

      <Separator />

      {/* Default AI Model */}
      <div className="space-y-2">
        <Label htmlFor="default-ai-model">Default AI Model</Label>
        <Select value={defaultAiModel} onValueChange={(v) => setDefaultAiModel(v as AiModel)}>
          <SelectTrigger id="default-ai-model" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="latest">Latest</SelectItem>
            <SelectItem value="meshy-7">Meshy 7</SelectItem>
            <SelectItem value="meshy-6">Meshy 6</SelectItem>
            <SelectItem value="meshy-5">Meshy 5</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Poll Interval */}
      <div className="space-y-2">
        <Label htmlFor="poll-interval">Poll Interval (seconds)</Label>
        <Select
          value={String(pollIntervalMs / 1000)}
          onValueChange={(v) => setPollIntervalMs(Number(v) * 1000)}
        >
          <SelectTrigger id="poll-interval" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1 second</SelectItem>
            <SelectItem value="3">3 seconds</SelectItem>
            <SelectItem value="5">5 seconds</SelectItem>
            <SelectItem value="10">10 seconds</SelectItem>
            <SelectItem value="30">30 seconds</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator />

      {/* SSE Streaming */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="sse-streaming">SSE Streaming</Label>
          <p className="text-xs text-text-muted">
            Use server-sent events instead of polling for task updates
          </p>
        </div>
        <Switch id="sse-streaming" checked={useSseStreaming} onCheckedChange={setUseSseStreaming} />
      </div>

      {/* Auto-download */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="auto-download">Auto-download on success</Label>
          <p className="text-xs text-text-muted">
            Automatically download assets when tasks complete
          </p>
        </div>
        <Switch
          id="auto-download"
          checked={autoDownloadOnSuccess}
          onCheckedChange={setAutoDownloadOnSuccess}
        />
      </div>

      {/* Notifications */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="notify-complete">Notify on task complete</Label>
          <p className="text-xs text-text-muted">Show OS notification when a task finishes</p>
        </div>
        <Switch
          id="notify-complete"
          checked={notifyOnTaskComplete}
          onCheckedChange={setNotifyOnTaskComplete}
        />
      </div>

      <Separator />

      {/* Reset */}
      <button
        type="button"
        onClick={resetToDefaults}
        className="text-sm text-text-muted underline hover:text-text-primary"
      >
        Reset to defaults
      </button>
    </div>
  );
}
