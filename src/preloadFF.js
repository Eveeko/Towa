const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  FF: () => ipcRenderer.invoke('main:FF'),
  noFF: () => ipcRenderer.invoke('main:noFF')
})