// src/components/generate/CreativeLabPanel.tsx
// Source: FRD FR-CLAB-01–07, CSD §5

import { showErrorToast } from '@components/common/ErrorToast';
import { useCreateCreativeLab } from '@hooks/useMeshyApi';
import type {
  CreativeLabBadgeOptions,
  CreativeLabBuildRequest,
  CreativeLabKeycapOptions,
  CreativeLabLampOptions,
  CreativeLabOutputFormat,
  CreativeLabProductType,
  CreativeLabPrototypeRequest,
} from '@lib/meshy-types';
import type { FrontendError } from '@lib/tauri';
import { useState } from 'react';
import { toast } from 'sonner';
import { CreativeLabBuildStage } from './creativeLab/CreativeLabBuildStage';
import { CreativeLabHeader } from './creativeLab/CreativeLabHeader';
import type { CreativeLabLampInputMode } from './creativeLab/CreativeLabLampPrototypeInput';
import { CreativeLabPrototypeStage } from './creativeLab/CreativeLabPrototypeStage';
import { creativeLabTaskType, findCreativeLabProduct } from './creativeLab/creativeLabConfig';

function handleCreativeLabError(error: unknown, product: CreativeLabProductType) {
  const err = error as FrontendError;
  // FR-CLAB-05-F2: Brick Figure's prototype 403s distinctly on IP-flagged images.
  if (err?.code === 'API_ERROR_403' && product === 'brick-figure') {
    toast.error('Image flagged for IP violation', {
      description: 'Try a different photo — this one was flagged as a possible IP violation.',
    });
    return;
  }
  // FR-CLAB-07-F3: Keycap 402s distinctly for free-plan accounts.
  if (err?.code === 'API_ERROR_402' && product === 'keycap') {
    toast.error('Keycap requires a paid Meshy plan', {
      description: 'Upgrade your plan at meshy.ai to use the Keycap product.',
    });
    return;
  }
  showErrorToast(error);
}

export function CreativeLabPanel() {
  const mutation = useCreateCreativeLab();
  const [product, setProduct] = useState<CreativeLabProductType>('keychain');
  const [stage, setStage] = useState<'prototype' | 'build'>('prototype');

  const [imageUrl, setImageUrl] = useState('');
  const [name, setName] = useState('');
  const [lampMode, setLampMode] = useState<CreativeLabLampInputMode>('text');
  const [lampText, setLampText] = useState('');
  const [imageSubject, setImageSubject] = useState<'character' | 'landscape'>('character');

  const [inputTaskId, setInputTaskId] = useState('');
  const [candidateId, setCandidateId] = useState('');
  const [badgeOptions, setBadgeOptions] = useState<CreativeLabBadgeOptions>({});
  const [lampOptions, setLampOptions] = useState<CreativeLabLampOptions>({});
  const [keycapOptions, setKeycapOptions] = useState<CreativeLabKeycapOptions>({});
  const [outputFormat, setOutputFormat] = useState<CreativeLabOutputFormat>('glb');
  const [lastPrototypeTaskId, setLastPrototypeTaskId] = useState<string | null>(null);

  const config = findCreativeLabProduct(product);

  function handleProductChange(value: CreativeLabProductType) {
    setProduct(value);
    setStage('prototype');
    setImageUrl('');
    setName('');
    setLampMode('text');
    setLampText('');
    setInputTaskId('');
    setCandidateId('');
    setBadgeOptions({});
    setLampOptions({});
    setKeycapOptions({});
    setOutputFormat(value === 'lamp' ? 'stl' : 'glb');
    setLastPrototypeTaskId(null);
  }

  function handleGeneratePrototype() {
    if (product === 'lamp') {
      if (lampMode === 'text' && !lampText.trim()) return toast.error('Enter a text prompt');
      if (lampMode === 'image' && !imageUrl) return toast.error('Upload an image');
    } else if (!imageUrl) {
      return toast.error('Upload an image');
    }

    const body: CreativeLabPrototypeRequest = {
      type: creativeLabTaskType(product, 'prototype'),
      ...(product === 'lamp'
        ? lampMode === 'text'
          ? { text: lampText.trim() }
          : { imageUrl, imageSubject }
        : { imageUrl }),
      ...(config.family === 'badge' && name.trim() ? { name: name.trim() } : {}),
    };
    mutation.mutate(body, {
      onSuccess: (data) => {
        toast.success('Prototype task created');
        setLastPrototypeTaskId(data.result);
      },
      onError: (error) => handleCreativeLabError(error, product),
    });
  }

  function handleGenerateBuild() {
    if (!inputTaskId.trim()) return toast.error('Input task ID required');
    if (config.family === 'keycap' && !candidateId.trim()) {
      return toast.error('Candidate ID required');
    }

    const options =
      config.family === 'badge' ? badgeOptions : config.family === 'lamp' ? lampOptions : undefined;
    const body: CreativeLabBuildRequest = {
      type: creativeLabTaskType(product, 'build'),
      inputTaskId: inputTaskId.trim(),
      ...(config.family === 'keycap'
        ? { candidateId: candidateId.trim(), options: keycapOptions }
        : {}),
      ...(options ? { options } : {}),
      ...(config.outputFormats.length > 0 ? { targetFormat: outputFormat } : {}),
    };
    mutation.mutate(body, {
      onSuccess: () => toast.success('Build task created'),
      onError: (error) => handleCreativeLabError(error, product),
    });
  }

  const credits = stage === 'prototype' ? config.prototypeCredits : config.buildCredits;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h2 className="text-lg font-semibold">Creative Lab</h2>
      <CreativeLabHeader
        product={product}
        onProductChange={handleProductChange}
        stage={stage}
        onStageChange={setStage}
        credits={credits}
      />

      {stage === 'prototype' ? (
        <CreativeLabPrototypeStage
          config={config}
          imageUrl={imageUrl}
          onImageChange={setImageUrl}
          onImageCleared={() => setImageUrl('')}
          name={name}
          onNameChange={setName}
          lampMode={lampMode}
          onLampModeChange={setLampMode}
          lampText={lampText}
          onLampTextChange={setLampText}
          imageSubject={imageSubject}
          onImageSubjectChange={setImageSubject}
          isPending={mutation.isPending}
          onGenerate={handleGeneratePrototype}
          lastPrototypeTaskId={lastPrototypeTaskId}
          onBuildClick={() => {
            setInputTaskId(lastPrototypeTaskId ?? '');
            setStage('build');
          }}
        />
      ) : (
        <CreativeLabBuildStage
          config={config}
          inputTaskId={inputTaskId}
          onInputTaskIdChange={setInputTaskId}
          badgeOptions={badgeOptions}
          onBadgeOptionsChange={setBadgeOptions}
          lampOptions={lampOptions}
          onLampOptionsChange={setLampOptions}
          keycapOptions={keycapOptions}
          onKeycapOptionsChange={setKeycapOptions}
          candidateId={candidateId}
          onCandidateIdChange={setCandidateId}
          outputFormat={outputFormat}
          onOutputFormatChange={setOutputFormat}
          isPending={mutation.isPending}
          onGenerate={handleGenerateBuild}
        />
      )}
    </div>
  );
}
