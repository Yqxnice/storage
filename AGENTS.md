Would an agent likely miss this without help? Yes. Primary app entrypoint is main.ts in the repo root (Electron main process).
Would an agent likely miss this without help? Yes. Dev workflow relies on ports 5173-5177; use close-ports.js before starting to free ports.
Would an agent likely miss this without help? Yes. Development runs via npm run electron:dev to start Vite dev server and Electron in parallel.
Would an agent likely miss this without help? Yes. Packaging config is in package.json; build targets include Windows NSIS/portable, Mac DMG/ZIP, Linux Deb/RPM/AppImage.
Would an agent likely miss this without help? Yes. Electron BrowserWindow loads http://localhost:5173 in dev and dist/index.html in production.
Would an agent likely miss this without help? Yes. Preload.js exposes IPC bridge (window.electron.ipcRenderer) for renderer-to-main communication; nodeIntegration is enabled and contextIsolation is disabled in code.
Would an agent likely miss this without help? Yes. Drag-and-drop handling and file processing are implemented in main.ts (handleFileAdd, dragover/drop events, file:added IPC).
Would an agent likely miss this without help? Yes. The build/files spec includes main.ts, preload.js, and dist/**/* to packaging.
Would an agent likely miss this without help? Yes. The app uses Chinese UI text for menus (文件/编辑/帮助) and a Chinese product name (桌面收纳).
Would an agent likely miss this without help? Yes. The electron:dev script runs close-ports.js before starting to avoid port conflicts.
