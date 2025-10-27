const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  getList: () => ipcRenderer.invoke('pack:getList'),
  openList: () => ipcRenderer.invoke('pack:openList'),
  startAnnouncer: () => ipcRenderer.invoke('pack:startAnnouncer'),
  announcerStarted: (callback) => ipcRenderer.on('announcer:started', (_event, value) => callback(value)),
  announcerNotRunning: (callback) => ipcRenderer.on('announcer:notRunning', (_event, value) => callback(value)),
  stopAnnouncer: () => ipcRenderer.invoke('pack:stopAnnouncer'),
  announcerStopped: (callback) => ipcRenderer.on('announcer:stopped', (_event, value) => callback(value)),
  setVolume: (val) => ipcRenderer.invoke('pack:setVolume', val),
  setSliderValue: (callback) => ipcRenderer.on('slider:setValue', (_event, value) => callback(value)),
  audioPlay: (callback) => ipcRenderer.on('audioPlay', (_event, values) => callback(values)),
  audioEnded: () => ipcRenderer.invoke('audio:ended'),
  closeWindow: () => ipcRenderer.send('close-window')
})