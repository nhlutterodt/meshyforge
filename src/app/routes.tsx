// src/app/routes.tsx
// Source: UI/UX §12.4, FRD FR-SET-02

import { AssetDetail } from '@components/gallery/AssetDetail';
import { AssetGrid } from '@components/gallery/AssetGrid';
import { SearchBar } from '@components/gallery/SearchBar';
import { TagFilter } from '@components/gallery/TagFilter';
import { AnimationPanel } from '@components/generate/AnimationPanel';
import { CreativeLabPanel } from '@components/generate/CreativeLabPanel';
import { ImageGenPanel } from '@components/generate/ImageGenPanel';
import { ImageTo3DPanel } from '@components/generate/ImageTo3DPanel';
import { MultiImagePanel } from '@components/generate/MultiImagePanel';
import { PostProcessPanel } from '@components/generate/PostProcessPanel';
import { PrintPanel } from '@components/generate/PrintPanel';
import { RiggingPanel } from '@components/generate/RiggingPanel';
import { TextTo3DPanel } from '@components/generate/TextTo3DPanel';
import { AboutPanel } from '@components/settings/AboutPanel';
import { ApiKeyManager } from '@components/settings/ApiKeyManager';
import { PreferencesPanel } from '@components/settings/PreferencesPanel';
import { TaskMonitor } from '@components/tasks/TaskMonitor';
import { Separator } from '@components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@components/ui/tabs';
import { useActiveTaskPolling } from '@hooks/useActiveTaskPolling';
import { useAllTags } from '@hooks/useAllTags';
import { useKeyboardShortcuts } from '@hooks/useKeyboardShortcuts';
import { useNotifications } from '@hooks/useNotifications';
import { useAppStore } from '@stores/appStore';
import { useState } from 'react';

export function Routes() {
  const activeView = useAppStore((s) => s.activeView);
  const activeGenerateTab = useAppStore((s) => s.activeGenerateTab);
  const setActiveGenerateTab = useAppStore((s) => s.setActiveGenerateTab);
  const selectedAssetId = useAppStore((s) => s.selectedAssetId);
  const setSelectedAsset = useAppStore((s) => s.setSelectedAsset);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const allTags = useAllTags();

  // Mount notification listener
  useNotifications();
  // Mount keyboard shortcuts
  useKeyboardShortcuts();
  // Poll all active tasks globally (works on any view)
  useActiveTaskPolling();

  switch (activeView) {
    case 'generate':
      return (
        <Tabs
          value={activeGenerateTab}
          onValueChange={(v) => setActiveGenerateTab(v as typeof activeGenerateTab)}
          className="w-full"
        >
          <TabsList className="grid grid-cols-9">
            <TabsTrigger value="text-to-3d">Text→3D</TabsTrigger>
            <TabsTrigger value="image-to-3d">Image→3D</TabsTrigger>
            <TabsTrigger value="multi-image">Multi</TabsTrigger>
            <TabsTrigger value="post-process">Post</TabsTrigger>
            <TabsTrigger value="rigging">Rig</TabsTrigger>
            <TabsTrigger value="animation">Animate</TabsTrigger>
            <TabsTrigger value="image-gen">Image</TabsTrigger>
            <TabsTrigger value="print">Print</TabsTrigger>
            <TabsTrigger value="creative-lab">Lab</TabsTrigger>
          </TabsList>
          <TabsContent value="text-to-3d">
            <TextTo3DPanel />
          </TabsContent>
          <TabsContent value="image-to-3d">
            <ImageTo3DPanel />
          </TabsContent>
          <TabsContent value="multi-image">
            <MultiImagePanel />
          </TabsContent>
          <TabsContent value="post-process">
            <PostProcessPanel />
          </TabsContent>
          <TabsContent value="rigging">
            <RiggingPanel />
          </TabsContent>
          <TabsContent value="animation">
            <AnimationPanel />
          </TabsContent>
          <TabsContent value="image-gen">
            <ImageGenPanel />
          </TabsContent>
          <TabsContent value="print">
            <PrintPanel />
          </TabsContent>
          <TabsContent value="creative-lab">
            <CreativeLabPanel />
          </TabsContent>
        </Tabs>
      );

    case 'gallery':
      return selectedAssetId ? (
        <AssetDetail assetId={selectedAssetId} onBack={() => setSelectedAsset(null)} />
      ) : (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Gallery</h2>
          <div className="flex items-center justify-between gap-4">
            <SearchBar onSearch={setSearchQuery} />
            <TagFilter
              tags={allTags.data ?? []}
              selectedTag={activeTag}
              onTagChange={setActiveTag}
            />
          </div>
          <AssetGrid
            searchQuery={searchQuery}
            activeTag={activeTag}
            onSelectAsset={(id) => setSelectedAsset(id)}
          />
        </div>
      );

    case 'tasks':
      return <TaskMonitor />;

    case 'settings':
      return (
        <div className="mx-auto max-w-2xl space-y-8">
          <h2 className="text-lg font-semibold">Settings</h2>
          <ApiKeyManager />
          <Separator />
          <PreferencesPanel />
          <Separator />
          <AboutPanel />
        </div>
      );

    default:
      return null;
  }
}
