import { defineStore } from 'pinia'

interface IElectronStore {
  environment: "window" | "node-electron";
}

export const useElectron = defineStore<'electronApi', IElectronStore>('electronApi', {
  state: () => {
    const environment: "window" | "node-electron" = "window";
    return {
      environment,
    }
  }
});