import { IpcRenderer } from "electron";


global {
  interface Window {
    IPC: Electron.IpcRenderer;
  }
}

