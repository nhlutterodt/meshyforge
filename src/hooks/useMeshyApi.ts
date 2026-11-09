// src/hooks/useMeshyApi.ts
// All Meshy API mutation hooks.
// Source: CSD §8.3, hook_implementations.md §2.1

import type {
  AnalyzePrintabilityRequest,
  AnimationRequest,
  ConvertRequest,
  CreativeLabBuildRequest,
  CreativeLabPrototypeRequest,
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
  TextToMotionRequest,
  UvUnwrapRequest,
} from '@lib/meshy-types';
import { type CommandName, invoke } from '@lib/tauri';
import { useTaskStore } from '@stores/taskStore';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// ADR-0015 TPC-05: the frontend no longer carries endpoint paths — tasks are
// dispatched by their `taskType` serde wire value, and
// `provider::meshy::ENDPOINT_MAP` is the only endpoint table.
interface CreateHookConfig {
  command: CommandName;
  label: string;
  taskType: string;
  invalidateCredits?: boolean;
}

function makeCreateHook<TBody>(config: CreateHookConfig) {
  const { command, label, taskType, invalidateCredits = true } = config;
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
  taskType: 'text-to-3d-preview',
});

export const useCreateImageTo3D = makeCreateHook<ImageTo3DRequest>({
  command: 'create_image_to_3d',
  label: 'Image to 3D',
  taskType: 'image-to-3d',
});

export const useCreateMultiImageTo3D = makeCreateHook<MultiImageTo3DRequest>({
  command: 'create_multi_image_to_3d',
  label: 'Multi-Image to 3D',
  taskType: 'multi-image-to-3d',
});

export const useCreateRemesh = makeCreateHook<RemeshRequest>({
  command: 'create_remesh',
  label: 'Remesh',
  taskType: 'remesh',
});

export const useCreateRetexture = makeCreateHook<RetextureRequest>({
  command: 'create_retexture',
  label: 'Retexture',
  taskType: 'retexture',
});

export const useCreateConvert = makeCreateHook<ConvertRequest>({
  command: 'create_convert',
  label: 'Convert',
  taskType: 'convert',
});

export const useCreateResize = makeCreateHook<ResizeRequest>({
  command: 'create_resize',
  label: 'Resize',
  taskType: 'resize',
});

export const useCreateUvUnwrap = makeCreateHook<UvUnwrapRequest>({
  command: 'create_uv_unwrap',
  label: 'UV Unwrap',
  taskType: 'uv-unwrap',
});

export const useCreateRigging = makeCreateHook<RiggingRequest>({
  command: 'create_rigging',
  label: 'Rigging',
  taskType: 'rig',
});

export const useCreateAnimation = makeCreateHook<AnimationRequest>({
  command: 'create_animation',
  label: 'Animation',
  taskType: 'animate',
});

export const useCreateTextToMotion = makeCreateHook<TextToMotionRequest>({
  command: 'create_text_to_motion',
  label: 'Text to Motion',
  taskType: 'text-to-motion',
});

export const useCreateTextToImage = makeCreateHook<TextToImageRequest>({
  command: 'create_text_to_image',
  label: 'Text to Image',
  taskType: 'text-to-image',
});

export const useCreateImageToImage = makeCreateHook<ImageToImageRequest>({
  command: 'create_image_to_image',
  label: 'Image to Image',
  taskType: 'image-to-image',
});

export const useCreateMultiColorPrint = makeCreateHook<MultiColorPrintRequest>({
  command: 'create_multi_color_print',
  label: 'Multi-Color Print',
  taskType: 'print-multi-color',
});

export const useCreateAnalyzePrintability = makeCreateHook<AnalyzePrintabilityRequest>({
  command: 'create_analyze_printability',
  label: 'Printability Analysis',
  taskType: 'print-analyze',
  invalidateCredits: false,
});

export const useCreateRepairPrintability = makeCreateHook<RepairPrintabilityRequest>({
  command: 'create_repair_printability',
  label: 'Printability Repair',
  taskType: 'print-repair',
});

// ─── Creative Lab (TASK-0017) ───────────────────────────────────
// One command (`create_creative_lab`) and one hook cover all 7 products x
// 2 stages: the frontend discriminates via the request body's `type` field
// (a real `creative-lab-*` TaskType wire value), which the Rust command
// layer reads to pick the right TaskType/endpoint — see
// src-tauri/src/commands/api.rs's `creative_lab_task_type`. This mirrors
// `makeCreateHook`'s bookkeeping (task-store label/taskType) but must derive
// it per-call from `variables.type` rather than from a fixed config, since a
// single hook now spans 14 distinct TaskTypes.
/** TaskMonitor UI `label`, keyed by the wire `type` value. The endpoint is
 * no longer mirrored here (ADR-0015 TPC-05): `poll_task` dispatches on the
 * `taskType` wire value itself. */
const CREATIVE_LAB_TASK_META: Record<string, { label: string }> = {
  'creative-lab-keychain-prototype': {
    label: 'Creative Lab: Keychain Prototype',
  },
  'creative-lab-keychain-build': {
    label: 'Creative Lab: Keychain Build',
  },
  'creative-lab-fridge-magnet-prototype': {
    label: 'Creative Lab: Fridge Magnet Prototype',
  },
  'creative-lab-fridge-magnet-build': {
    label: 'Creative Lab: Fridge Magnet Build',
  },
  'creative-lab-figure-prototype': {
    label: 'Creative Lab: Figure Prototype',
  },
  'creative-lab-figure-build': {
    label: 'Creative Lab: Figure Build',
  },
  'creative-lab-vinyl-figure-prototype': {
    label: 'Creative Lab: Vinyl Figure Prototype',
  },
  'creative-lab-vinyl-figure-build': {
    label: 'Creative Lab: Vinyl Figure Build',
  },
  'creative-lab-brick-figure-prototype': {
    label: 'Creative Lab: Brick Figure Prototype',
  },
  'creative-lab-brick-figure-build': {
    label: 'Creative Lab: Brick Figure Build',
  },
  'creative-lab-lamp-prototype': {
    label: 'Creative Lab: Lamp Prototype',
  },
  'creative-lab-lamp-build': {
    label: 'Creative Lab: Lamp Build',
  },
  'creative-lab-keycap-prototype': {
    label: 'Creative Lab: Keycap Prototype',
  },
  'creative-lab-keycap-build': {
    label: 'Creative Lab: Keycap Build',
  },
};

export function useCreateCreativeLab() {
  const qc = useQueryClient();
  const addTask = useTaskStore((s) => s.addTask);

  return useMutation({
    mutationFn: async (body: CreativeLabPrototypeRequest | CreativeLabBuildRequest) => {
      return await invoke<TaskCreateResponse>('create_creative_lab', { body });
    },
    onSuccess: (data, variables) => {
      qc.invalidateQueries({ queryKey: ['credit-balance'] });
      const meta = CREATIVE_LAB_TASK_META[variables.type];
      addTask({
        taskId: data.result,
        taskType: variables.type,
        status: 'PENDING',
        progress: 0,
        label: meta?.label ?? 'Creative Lab',
        startedAt: Date.now(),
        error: null,
      });
    },
    onError: (error) => {
      console.error('Failed to create Creative Lab task:', error);
    },
    retry: 0,
  });
}

export const useDeleteTask = () => {
  const qc = useQueryClient();
  return useMutation({
    // ADR-0015 TPC-05: delete_task dispatches on the taskType wire value.
    mutationFn: async (args: { taskType: string; taskId: string }) => {
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
