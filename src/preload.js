const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getList: () => ipcRenderer.invoke('pack:getList'),
  openList: () => ipcRenderer.invoke('pack:openList'),
  startAnnouncer: () => ipcRenderer.invoke('pack:startAnnouncer'),
  stopAnnouncer: () => ipcRenderer.invoke('pack:stopAnnouncer'),
  setVolume: (val) => ipcRenderer.invoke('pack:setVolume', val),
  setSliderValue: (val) => ipcRenderer.on('slider:setValue', val),
  audioPlay: (vals) => ipcRenderer.on('audioPlay', vals),
  audioEnded: () => ipcRenderer.invoke('audio:end')
})