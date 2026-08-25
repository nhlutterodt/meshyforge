// src/components/settings/ApiKeyManager.tsx
// Source: FRD FR-KEY-01/02, CSD §5

import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { invoke } from '@lib/tauri';
import { Check, Key, Loader2, Trash2, X } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

type KeyState = 'idle' | 'validating' | 'valid' | 'invalid';

export function ApiKeyManager() {
  const [apiKey, setApiKey] = useState('');
  const [keyState, setKeyState] = useState<KeyState>('idle');
  const [hasKey, setHasKey] = useState(false);

  // Check if key exists on mount
  useState(() => {
    invoke<boolean>('get_api_key')
      .then((exists) => setHasKey(exists))
      .catch(() => {
        /* keychain not available */
      });
  });

  async function handleValidate() {
    if (!apiKey.trim()) return;
    setKeyState('validating');
    try {
      const isValid = await invoke<boolean>('validate_api_key', { key: apiKey });
      setKeyState(isValid ? 'valid' : 'invalid');
      if (isValid) {
        toast.success('API key is valid');
      } else {
        toast.error('API key is invalid');
      }
    } catch {
      setKeyState('invalid');
      toast.error('Failed to validate API key');
    }
  }

  async function handleSave() {
    if (!apiKey.trim()) return;
    try {
      await invoke('set_api_key', { key: apiKey });
      setHasKey(true);
      setApiKey('');
      setKeyState('idle');
      toast.success('API key saved to keychain');
    } catch {
      toast.error('Failed to save API key');
    }
  }

  async function handleDelete() {
    try {
      await invoke('delete_api_key');
      setHasKey(false);
      setKeyState('idle');
      toast.success('API key removed');
    } catch {
      toast.error('Failed to delete API key');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Key className="h-4 w-4 text-text-secondary" />
        <h3 className="text-sm font-semibold">Meshy API Key</h3>
        {hasKey && (
          <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs text-success">
            Configured
          </span>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="api-key">Enter your Meshy API key</Label>
        <div className="flex gap-2">
          <Input
            id="api-key"
            type="password"
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setKeyState('idle');
            }}
            placeholder="msy_..."
            className="font-mono"
          />
          <Button
            variant="secondary"
            onClick={handleValidate}
            disabled={!apiKey.trim() || keyState === 'validating'}
          >
            {keyState === 'validating' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : keyState === 'valid' ? (
              <Check className="h-4 w-4 text-success" />
            ) : keyState === 'invalid' ? (
              <X className="h-4 w-4 text-danger" />
            ) : (
              <span>Validate</span>
            )}
          </Button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={keyState !== 'valid'}>
          Save to Keychain
        </Button>
        {hasKey && (
          <Button variant="ghost" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" />
            Remove Key
          </Button>
        )}
      </div>

      {keyState === 'invalid' && (
        <p className="text-sm text-danger">
          API key validation failed. Check your key and try again.
        </p>
      )}
    </div>
  );
}
