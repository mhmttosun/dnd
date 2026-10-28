import type { ActivityProject } from './index.d.ts';

export interface DndEditorOptions {
  container: HTMLElement | string;
  activity?: ActivityProject;
  uploadImage?: (file: File, options?: { signal?: AbortSignal }) => Promise<{ url: string; assetId?: string }>;
  signal?: AbortSignal;
  ui?: { fileActions?: boolean };
}

export interface DndEditor {
  flush(): Promise<void>;
  getActivity(): ActivityProject;
  setActivity(activity: ActivityProject): void;
  getMode(): 'design' | 'answer-key' | 'preview';
  setMode(mode: 'design' | 'answer-key' | 'preview'): void;
  exportPreview(): Promise<Blob>;
  destroy(): void;
}

export declare function initializeDndEditor(options: DndEditorOptions): DndEditor;
export declare function createDefaultActivity(activityType?: ActivityProject['project']['activityType'], name?: string): ActivityProject;
export declare function renderActivityPreview(activity: ActivityProject): string;
