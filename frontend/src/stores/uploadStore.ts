import { create } from "zustand";
import type { MappingConfig, PreviewResponse } from "../types/upload";

type UploadStep = "idle" | "previewing" | "mapping" | "uploading" | "importing" | "done" | "error";

interface UploadState {
  step: UploadStep;
  file: File | null;
  preview: PreviewResponse | null;
  mapping: MappingConfig;
  uploadId: string | null;
  progress: number;
  error: string | null;

  setFile: (file: File) => void;
  setPreview: (preview: PreviewResponse) => void;
  setStep: (step: UploadStep) => void;
  setMapping: (mapping: MappingConfig) => void;
  updateMapping: (excelCol: string, systemField: string) => void;
  setUploadId: (id: string) => void;
  setProgress: (pct: number) => void;
  setError: (error: string) => void;
  reset: () => void;
}

export const useUploadStore = create<UploadState>((set) => ({
  step: "idle",
  file: null,
  preview: null,
  mapping: {},
  uploadId: null,
  progress: 0,
  error: null,

  setFile: (file) => set({ file, step: "previewing" }),
  setPreview: (preview) =>
    set({
      preview,
      mapping: preview.suggested_mappings || {},
      step: "mapping",
    }),
  setStep: (step) => set({ step }),
  setMapping: (mapping) => set({ mapping }),
  updateMapping: (excelCol, systemField) =>
    set((state) => ({
      mapping: { ...state.mapping, [excelCol]: systemField },
    })),
  setUploadId: (id) => set({ uploadId: id }),
  setProgress: (progress) => set({ progress }),
  setError: (error) => set({ error, step: "error" }),
  reset: () =>
    set({
      step: "idle",
      file: null,
      preview: null,
      mapping: {},
      uploadId: null,
      progress: 0,
      error: null,
    }),
}));
