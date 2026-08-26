// src/hooks/useMeshyApi.ts
// All Meshy API mutation hooks.
// Source: CSD §8.3, hook_implementations.md §2.1

import type {
  AnalyzePrintabilityRequest,
  AnimationRequest,
  ConvertRequest,
  ImageTo3DRequest,
  ImageToImageRequest,
  MultiColorPrintRequest,
  MultiImageTo3DRequest,
  RemeshRequest,
  RepairPrintabilityRequest,
  ResizeRequest,
  RetextureRequest,
  RiggingRequest,
  TaskCreateResponse,
  TextTo3DPreviewRequest,
  TextTo3DRefineRequest,
  TextToImageRequest,
  UvUnwrapRequest,
} from '@lib/meshy-types';
import { invoke } from '@lib/tauri';
import { useTaskStore } from '@stores/taskStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface CreateHookConfig {
  command: string;
  label: string;
  endpoint: string;
  taskType: string;
  invalidateCredits?: boolean;
}

function makeCreateHook<TBody>(config: CreateHookConfig) {
  const { command, label, endpoint, taskType, invalidateCredits = true } = config;
  return function useCreateHook() {
    const qc = useQueryClient();
    const addTask = useTaskStore((s) => s.addTask);

    return useMutation({
      mutationFn: async (body: TBody) => {
        return await invoke<TaskCreateResponse>(command, { body });
      },
      onSuccess: (data, variables) => {
        if (invalidateCredits) {
          qc.invalidateQueries({ queryKey: ['credit-balance'] });
        }
        // Add the task to the task store for the TaskMonitor UI
        const body = variables as Record<string, unknown>;
        const prompt = typeof body.prompt === 'string' ? body.prompt : undefined;
        addTask({
          taskId: data.result,
          endpoint,
          taskType,
          status: 'PENDING',
          progress: 0,
          label: prompt ? `${label}: ${prompt.slice(0, 40)}` : label,
          startedAt: Date.now(),
          error: null,
        });
      },
      onError: (error) => {
        console.error(`Failed to create ${label} task:`, error);
      },
      retry: 0,
    });
  };
}

export const useCreateTextTo3D = makeCreateHook<TextTo3DPreviewRequest | TextTo3DRefineRequest>({
  command: 'create_text_to_3d',
  label: 'Text to 3D',
  endpoint: '/v2/text-to-3d',
  taskType: 'text-to-3d-preview',
});

export const useCreateImageTo3D = makeCreateHook<ImageTo3DRequest>({
  command: 'create_image_to_3d',
  label: 'Image to 3D',
  endpoint: '/v1/image-to-3d',
  taskType: 'image-to-3d',
});

export const useCreateMultiImageTo3D = makeCreateHook<MultiImageTo3DRequest>({
  command: 'create_multi_image_to_3d',
  label: 'Multi-Image to 3D',
  endpoint: '/v1/multi-image-to-3d',
  taskType: 'multi-image-to-3d',
});

export const useCreateRemesh = makeCreateHook<RemeshRequest>({
  command: 'create_remesh',
  label: 'Remesh',
  endpoint: '/v1/remesh',
  taskType: 'remesh',
});

export const useCreateRetexture = makeCreateHook<RetextureRequest>({
  command: 'create_retexture',
  label: 'Retexture',
  endpoint: '/v1/retexture',
  taskType: 'retexture',
});

export const useCreateConvert = makeCreateHook<ConvertRequest>({
  command: 'create_convert',
  label: 'Convert',
  endpoint: '/v1/convert',
  taskType: 'convert',
});

export const useCreateResize = makeCreateHook<ResizeRequest>({
  command: 'create_resize',
  label: 'Resize',
  endpoint: '/v1/resize',
  taskType: 'resize',
});

export const useCreateUvUnwrap = makeCreateHook<UvUnwrapRequest>({
  command: 'create_uv_unwrap',
  label: 'UV Unwrap',
  endpoint: '/v1/uv-unwrap',
  taskType: 'uv-unwrap',
});

export const useCreateRigging = makeCreateHook<RiggingRequest>({
  command: 'create_rigging',
  label: 'Rigging',
  endpoint: '/v1/rigging',
  taskType: 'rig',
});

export const useCreateAnimation = makeCreateHook<AnimationRequest>({
  command: 'create_animation',
  label: 'Animation',
  endpoint: '/v1/animations',
  taskType: 'animate',
});

export const useCreateTextToImage = makeCreateHook<TextToImageRequest>({
  command: 'create_text_to_image',
  label: 'Text to Image',
  endpoint: '/v1/text-to-image',
  taskType: 'text-to-image',
});

export const useCreateImageToImage = makeCreateHook<ImageToImageRequest>({
  command: 'create_image_to_image',
  label: 'Image to Image',
  endpoint: '/v1/image-to-image',
  taskType: 'image-to-image',
});

export const useCreateMultiColorPrint = makeCreateHook<MultiColorPrintRequest>({
  command: 'create_multi_color_print',
  label: 'Multi-Color Print',
  endpoint: '/v1/print/multi-color',
  taskType: 'print-multi-color',
});

export const useCreateAnalyzePrintability = makeCreateHook<AnalyzePrintabilityRequest>({
  command: 'create_analyze_printability',
  label: 'Printability Analysis',
  endpoint: '/v1/print/analyze',
  taskType: 'print-analyze',
  invalidateCredits: false,
});

export const useCreateRepairPrintability = makeCreateHook<RepairPrintabilityRequest>({
  command: 'create_repair_printability',
  label: 'Printability Repair',
  endpoint: '/v1/print/repair',
  taskType: 'print-repair',
});

export const useDeleteTask = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { endpoint: string; taskId: string }) => {
      return await invoke<void>('delete_task', args);
    },
    onSuccess: (_data, { taskId }) => {
      qc.invalidateQueries({ queryKey: ['task', taskId] });
    },
    onError: (error) => {
      console.error('Failed to cancel task:', error);
    },
    retry: 0,
  });
};
