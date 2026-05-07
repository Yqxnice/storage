export interface WindowPosition {
  x: number;
  y: number;
  width: number;
  height: number;
  isMaximized: boolean;
  isMinimized: boolean;
  isAlwaysOnTop: boolean;
}

export interface FloatWindowLayout extends WindowPosition {
  boxId: string;
  visible: boolean;
}

export interface WindowLayout {
  mainWindow: WindowPosition;
  floatWindows: Record<string, FloatWindowLayout>;
  version: number;
}