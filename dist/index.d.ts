export interface ActivityProject {
  schemaVersion: 1;
  version: string;
  project: {
    id: string;
    name: string;
    activityType: 'image-labeling' | 'matching' | 'categorization' | 'sequencing';
  };
  stage: {
    width: number;
    height: number;
    backgroundColor?: string;
    backgroundImage?: string | null;
  };
  objects: Array<{
    id: string;
    type: string;
    role: 'draggable' | 'target' | 'category' | 'sequence_slot' | 'decorative';
    x: number;
    y: number;
    width: number;
    height: number;
    text?: string;
    src?: string | null;
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    zIndex?: number;
  }>;
  answerKey: Record<string, string>;
  settings?: {
    soundEnabled?: boolean;
    shuffleDraggables?: boolean;
    evaluationMode?: 'instant' | 'submit';
    correctAnswerBehavior?: 'lock' | 'stay';
    wrongAnswerBehavior?: 'return' | 'stay';
    completionMessage?: string;
  };
}

export interface ActivityStats {
  score: number;
  attempts: number;
  correctCount: number;
}

export interface ActivityState {
  isCompleted: boolean;
  score: number;
  attempts: number;
  correctCount: number;
  totalDraggables: number;
  placedMap: Record<string, string>;
}

export interface DropInfo {
  dragId: string;
  targetId: string;
  isCorrect?: boolean;
  isPending?: boolean;
}

export interface ActivityPlayerOptions {
  target?: HTMLElement | string;
  data?: ActivityProject;
  src?: string;
  file?: File | Blob;
  jsonString?: string;
  sound?: boolean;
  stagePadding?: number | null;
  initialState?: ActivityState;
  onComplete?: (stats: ActivityStats) => void;
  onStep?: (state: ActivityState) => void;
  onDrop?: (dropInfo: DropInfo) => void;
  onReset?: (state: ActivityState) => void;
  onReady?: (player: ActivityPlayer) => void;
}

export declare class ActivityPlayer {
  constructor(options?: ActivityPlayerOptions);
  mount(projectData: ActivityProject): void;
  loadFromUrl(url: string): Promise<void>;
  loadFromFile(file: File | Blob): Promise<void>;
  loadFromJsonString(jsonString: string): void;
  on(event: 'complete' | 'step' | 'drop' | 'reset' | 'destroy', callback: (data: any) => void): () => void;
  off(event: string, callback: (data: any) => void): void;
  getState(): ActivityState | null;
  setState(state: ActivityState): ActivityState;
  setSound(enabled: boolean): void;
  reset(): void;
  destroy(): void;
}

export declare class DNDPlayerElement extends HTMLElement {
  data: ActivityProject | null;
  readonly player: ActivityPlayer | null;
  loadFile(file: File | Blob): void;
  loadJsonString(jsonString: string): void;
  reset(): void;
  getState(): ActivityState | null;
}
