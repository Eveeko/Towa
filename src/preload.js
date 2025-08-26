const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getList: () => ipcRenderer.invoke('pack:getList'),
  openList: () => ipcRenderer.invoke('pack:openList'),
  startAnnouncer: () => ipcRenderer.invoke('pack:startAnnouncer'),
  announcerStarted: (callback) => ipcRenderer.on('announcer:started', (_event, value) => callback(value)),
  stopAnnouncer: () => ipcRenderer.invoke('pack:stopAnnouncer'),
  announcerStopped: (callback) => ipcRenderer.on('announcer:stopped', (_event, value) => callback(value)),
  setVolume: (val) => ipcRenderer.invoke('pack:setVolume', val),
  setSliderValue: (val) => ipcRenderer.on('slider:setValue', val),
  audioPlay: (vals) => ipcRenderer.on('audioPlay', vals),
  audioEnded: () => ipcRenderer.invoke('audio:ended'),
  closeWindow: () => ipcRenderer.send('close-window')
})