const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, screen } = require('electron');
const path = require('path');
const { readdir, fstat, readFile, writeFile } = require('fs');
const https = require('https')
const exec = require('child_process').exec;
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

/*
 FIXME: Upon the client launching the match loading screen, LCUPoll will stop and will have to be manually started with the start button.
*/

const iconOff = nativeImage.createFromPath(path.join(__dirname, '../data/iconOff.png'))
const iconOn = nativeImage.createFromPath(path.join(__dirname, '../data/iconOn.png'))

var LCUPort;
var LCUPass;
var tray;
var curPackName; // The name of the current announcer pack.
var curPackData; // TODO: Object containing packData for the current pack.
var active = false; // current status of announcer.
var lastEventLength = 0; // stores the last events list from the liveApi used for comparison
let hand; // stores the interval handler. used for stopping it.
var ready = false; // used to indicate whether the LCU is available.
var volume = 35; // 0-100 range.
let inactiveLoops = 0; // Used to keep track of how many times the LCU has looped without any connection.
var eventQueue = []; // Stores events awaiting firing.
var window;
var ctxMenu;
var audioPlaying = false;
var validEvents = [
  "GameStart", "MinionsSpawningSoon", "MinionsSpawning", "FirstBlood", "PlayerKill", "PlayerSlain", "AllyKill", "AllySlain", "AllyDoubleKill", "EnemyKill",
  "AllyTripleKill", "AllyQuadraKill", "AllyPentaKill", "EnemyDoubleKill", "EnemyTripleKill", "EnemyQuadraKill", "EnemyPentaKill", "AllyAce",
  "EnemyAce", "Executed", "AllyTurretKilled", "EnemyTurretKilled", "AllyInhibKilled", "EnemyInhibKilled", "EnemySlain", "AllyInhibRespawningSoon",
  "EnemyInhibRespawningSoon", "AllyInhibRespawned", "EnemyInhibRespawned", "Victory", "Defeat"
]; // String list containg all valid events. // TODO: Make this auto update itself based on client responses.
// TODO: Make more events.. some could be screen grab based or similar.
// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

class packData {
  name = "Unnamed"
  author = "Red Minion"
  info = "Manufactured proudly by Chet the Red Minion!"
  feat = 0;
  events = new Map()
  constructor(name, author, info, feat) {
    this.name = name;
    this.author = author;
    this.info = info;
    this.feat = feat;
  };
} // TODO: make this a thing. have it automagically scan all packs and check if they have a valid pack data and structure it if false.

function loadConfig(){
  console.log(window)
  readFile(path.join(__dirname, '../data/settings.json'), (err, file)=>{
    if(err){
      console.log(err)
    }else{
      data = JSON.parse(file);
      if(data.currentPack){
        setVoice(data.currentPack)
      }
      if(data.volume){
        setVolume(data.volume)
        console.log('setting slider val', data.volume)
        window.webContents.send('slider:setValue', data.volume);
      }
    }
  }); // Loads config file.
}

function getPackNames() {
  return new Promise(resolve => {
    readdir(path.join(__dirname, '../packs'), (err, files) => {
      var ar = ['EmPtYyYyy o-o'];
      if (err) {
        console.log(err, 'getPackNames ERROR')
        resolve(ar);
      } else {
        if (files.length > 0) {
          ar = [];
          files.forEach((n, i) => {
            console.log(n, i)
            ar.push(n)
            if (i == files.length - 1) { resolve(ar); };
          });
        } else {
          resolve(ar);
        };
      };
    });
  });
};

function setVoice(menuItem) {
  console.log(menuItem.label);
  curPackName = menuItem.label;
  readFile(path.join(__dirname, `../packs/${menuItem.label}/meta.json`), (err, file) => {
    let author = "Unknown"
    let info = ""
    let feat = 29; // Used to indicate the event capabilities of the pack, 29 = full base events, 29XX would indicate full base + vision coverage 
    if (err) {

    }
    else {
      let meta = JSON.parse(file); // Parses meta file into JSON format
      author = meta.author;
      info = meta.info;
      feat = meta.features
    }
    var packObj = new packData(menuItem.label, author, info, feat)
    readdir(path.join(__dirname, `../packs/${menuItem.label}/`), { withFileTypes: true }, (err, files) => {
      if (err) {

      } // TODO: Write out error logic.
      else {
        let ftmp = new Map();
        files.forEach((file, i) => {
          let d = file.name.split('.')
          let ext = d[1]; // Extension of file.
          let id = d[0]; // Name of file.

          if (ext == 'mp3') {
            id = id.slice(0, id.length - 1);
            console.log('id', id)
            if (validEvents.includes(id)) {
              let res = ftmp.get(id)
              if (res) {
                console.log(ftmp.get(id))
                ftmp.set(id, res + 1)
              } else { ftmp.set(id, 1) };
            };
          }; // Validating its a mp3 file as thats only supported atm. + Counting event varieties
          if (i == files.length - 1) {
            packObj.events = ftmp; // Sets the events map to the ftmp map
            curPackData = packObj;
            console.log(curPackData);
            reloadAnnouncer();
            updateConfig();
          }; // Setting events in packObj
        });
      }; // Ties file names to events in pack object.
    });
  })
}; // Sets the selected voice pack to active. THIS ASSUMES THE PASSED TEXT IS VALID.

function updateConfig(){
  readFile(path.join(__dirname, '../data/settings.json'), (err, file)=>{
    if(err){
      console.log(err);
    }else{
      data = JSON.parse(file);
      data['currentPack'] = curPackName;
      data['volume'] = volume;

      writeFile(path.join(__dirname, '../data/settings.json'), JSON.stringify(data), ()=>{
        console.log('Config file')
      });
    };
  });
};

function openList() {
  getPackNames().then(packs => {
    let mappin = packs.map((name) => {
      return {
        label: name,
        click: setVoice
      }
    });
    const voiceList = Menu.buildFromTemplate(mappin)
    voiceList.popup();
  })
};

function refreshLCU() {
  return new Promise(resolve => {
    exec(`wmic PROCESS WHERE name='LeagueClientUx.exe' GET commandline`, function (err, stdout, stderr) {
      if (err) {
        console.log(`An error occured while trying to refresh the LCU, Unknown :(\n ${err}`)
        ready = false
        resolve(false)
      }
      else if (stdout.trim() == 'No Instance(s) Available.' || stdout.trim() == '') {
        console.log(`An error occured while trying to refresh the LCU, No Instance(s) available :(\n ${stdout}`)
        ready = false
        resolve(false)
      } else {
        LCUPort = stdout.match(/--app-port=([0-9]*)/)[1];
        LCUPass = stdout.match(/--remoting-auth-token=([\w-_]*)/)[1];
        console.log(`LCU Successfully refreshed. LCU Port: ${LCUPort}, LCU Pass: ${LCUPass}`);
        ready = true;
        resolve(true);
      }
    })
  });
};

function pollEventQueue() {
  if (active) {
    console.log('Event queue polling..')
    console.log(eventQueue)
    if (eventQueue.length > 0) {
      mainl();
      function mainl() {
        if (!audioPlaying) {
          let id = eventQueue.shift();
          let ct = curPackData.events.get(id);
          audioPlaying = true;
          if (ct == 1) {
            window.webContents.send('audioPlay', [path.join(__dirname, `../packs/${curPackName}/${id}0.mp3`), volume]);
          } else {
            let select = getRandomInt(1, ct + 1);
            window.webContents.send('audioPlay', [path.join(__dirname, `../packs/${curPackName}/${id}${select - 1}.mp3`), volume]);
          };
          setTimeout(() => {
            if (eventQueue.length > 0) {
              if (active) {
                setTimeout(() => { mainl() }, 3000);
              };
            } else { console.log('Event queue is empty.', eventQueue); setTimeout(() => { pollEventQueue() }, 500) };
          }, 2000)
        } else { console.log('Audio is currently playing.. Waiting.'); setTimeout(() => { pollEventQueue() }, 500) };
      }    // main loop;
    } { console.log('Event queue empty.') }
  } else { console.log('Announcer disabled.') }
}; // Brushes the event queue repeatedly.

function startAnnouncer() {
  if (!active) {
    active = true
    pollEventQueue();
    pollLive()
    reloadCtx().then(() => {
      tray.setImage(iconOn);
      tray.setContextMenu(ctxMenu);
    });
  }; // Check if announcer is active.
};
function reloadAnnouncer() {
  return new Promise(resolve => {

  });
}; // Reloads all caches to be accurate with the new announcer.
function stopAnnouncer() {
  active = false;
  eventQueue = [];
  reloadCtx().then(() => {
    tray.setImage(iconOff);
    tray.setContextMenu(ctxMenu);
  });
}; // Stops the announcer from activating.

let firstStart = true;
let allyTeamName = '';
let enemyTeamName = '';
let player = '';
let allyTeam = []; // contains names of all ally players.
let enemyTeam = []; // I hate that i even need this, but otherwise to implement the execute function would be so spaghetti i would cry. thanks rito :)
function pollLive() {
  if (active) {
    let enc = `${Buffer.from(`riot:${LCUPass}`).toString('base64')}`
    https.get(`https://127.0.0.1:2999/liveclientdata/allgamedata`, { headers: { Authorization: `Basic ${enc}` } }, (res => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk;
      });
      // Ending the response 
      res.on('end', () => {
        data = JSON.parse(data);
        console.log(data);
        if (data.httpStatus) {

        } if (data.events.Events.length == 0) { // FIXME: errors bc .Events doesnt exist at the time, change to if doesnt exist then detect loading screen and move the lower half to a function so it can still be invoked with the logic tree

        }// Player in loading screen.
        else if (data.events) {
          
         }
        function siftTree() {
          if (firstStart) {
            if (data.events.Events.length > 1) { lastEventLength = data.events.Events.length; }
            firstStart = false;
            let teamA = [];
            let teamB = [];
            data.allPlayers.forEach((p, i) => {
              if (!teamA.length) {
                teamA.push(p.team, p.summonerName);
                if (p.team == 'ORDER') {
                  teamB.push('CHAOS')
                } else { teamB.push('ORDER') }
              } else {
                if (teamA[0] == p.team) { teamA.push(p.summonerName) }
                else { teamB[0] = p.team; teamB.push(p.summonerName) }
              };
              if (i == data.allPlayers.length - 1) {
                if (teamA.indexOf(data.activePlayer.summonerName)) { player = data.activePlayer.summonerName; allyTeam = teamA; allyTeamName = teamA[0]; enemyTeam = teamB; enemyTeamName = teamB[0] }
                else { allyTeam = teamB; allyTeamName = teamB[0]; enemyTeam = teamB; enemyTeamName = teamA[0] };
                console.log(allyTeam, enemyTeam, allyTeamName, enemyTeamName)
              };
            })
          };
          if (lastEventLength == data.events.Events.length) {
            setTimeout(() => { pollLive() }, 500); // polls roughly every 3s
          } else {
            let ar = [];
            //console.log(data.events.Events);
            if (data.events.Events.length == 1) {
              ar = data.events.Events;
            } else { ar = data.events.Events.slice(lastEventLength); }
            ar.forEach((e, i) => {
              console.log('New event', e)
              //case 'ChampionKill':
              //case 'FirstBlood':
              //  case 'Multikill':
              if (e.EventName == "ChampionKill" && i < data.events.Events.length - 1 && data.events.Events[i + 1].EventName == "FirstBlood") { eventQueue.push('FirstBlood') }
              else if (e.EventName == "ChampionKill" && i < data.events.Events.length - 1 && data.events.Events[i + 1].EventName == "Multikill") {
                let multikill = data.events.Events[i, + 1].KillStreak
                let alt = "Enemy"; // Defaults to enemy multikill
                console.log('Mult killct', multiKill)
                if (allyTeam.includes(e.KillerName)) {
                  alt = "Ally"
                } // Ally got a multikill
                switch (multikill) {
                  case 2:
                    eventQueue.push(`${alt}DoubleKill`)
                    break;
                  case 3:
                    eventQueue.push(`${alt}TripleKill`)
                    break;
                  case 4:
                    eventQueue.push(`${alt}QuadraKill`)
                    break;
                  case 5:
                    eventQueue.push(`${alt}PentaKill`)
                    break;
                }; // Handles multikill type.
              }
              else if (e.EventName == "ChampionKill") {
                if (e.KillerName == player) {
                  eventQueue.push('PlayerKill');
                } // Our player kill
                else if (e.VictimName == player) {
                  eventQueue.push('PlayerSlain');
                } // Our player death
                else if (enemyTeam.includes(e.VictimName)) {
                  eventQueue.push('EnemySlain');
                } // Ally death
                else if (allyTeam.includes(e.VictimName)) {
                  eventQueue.push('AllySlain');
                } // Enemy death
                else {
                  eventQueue.push('Execute');
                }; // Someone got executed.
              } // Handles if a player got a kill and whether it was the active player or otherwise.
              else if (e.EventName == "Ace") {
                if (e.AcingTeam == allyTeamName) {
                  eventQueue.push('AllyAce'); // Ally ace
                } else { eventQueue.push('EnemyAce'); }; // Enemy ace
              }
              else {
                let dummy;
                switch (e.EventName) {
                  case 'GameStart':
                    eventQueue.push("GameStart");
                    countMinions(data.gameData.gameTime);
                    break;
                  case 'TurretKilled':
                  case 'InhibKilled':
                  case 'InhibRespawned':
                  case 'InhibRespawningSoon':
                    dummy = (e[e.EventName].includes("T1")) ? "T1" : "T2";
                    if (dummy == "T1" && allyTeamName == "CHAOS" || dummy == "T2" && allyTeamName == "ORDER") { eventQueue.push(`Enemy${e.EventName}`) } // Enemy
                    else { eventQueue.push(`Ally${e.EventName}`) }; // Ally
                    break;
                  case 'GameEnd':
                    // TODO: Deprecate this, unreliable 9/10 times does not fire.
                    if (e.Result == "Win") { eventQueue.push('Victory'); resetTeams(); }
                    else { eventQueue.push('Defeat'); resetTeams(); };
                    break;
                  default:
                    console.log("event not valid.", e.EventName);
                    break;

                }
              }
            });
            lastEventLength = data.events.Events.length;
            pollEventQueue();
            setTimeout(() => { pollLive() }, 500); // polls roughly every .25s
          };
        }

      });

    })).on("error", (err) => {
      if (err.code == "ECONNREFUSED") {
        if (inactiveLoops >= 12) {
          console.log("Client potentially reset, refreshing LCU..");
          inactiveLoops = 0;
          refreshLCU().then(() => {
            setTimeout(() => { pollLive() }, 5000); // The user is not currently in a game, wait 5s check again.
          })
        } else {
          inactiveLoops += 1;
          console.log("Client not in-game, waiting..");
          setTimeout(() => { pollLive() }, 5000); // The user is not currently in a game, wait 5s check again.
        }
      } else {
        console.log("Client has exited the game, waiting 30s..");
        resetTeams();
        setTimeout(() => { pollLive() }, 30000); // This would be from ECONNRESET which seems to only be when the client is closed, ie. game ended. so this can be a long time before rechecking.
      };
    });
  };
}; // constantly polls the liveApi to check for events and if so handles them accordingly.

function resetTeams() {
  firstStart = true;
  allyTeamName = '';
  enemyTeamName = '';
  player = '';
  allyTeam = [];
  enemyTeam = [];
  lastEventLength = 0;
  audioPlaying = false;
}; // Resets event handling data to default in prep for next match.

function countMinions(gmTime) {
  if (gmTime < 75) {
    setTimeout(() => { eventQueue.push('MinionsSpawningSoon'); pollEventQueue() }, (75000 - (gmTime * 1000)));
  }
  if (gmTime < 105) {
    setTimeout(() => { eventQueue.push('MinionsSpawning'); pollEventQueue() }, (105000 - (gmTime * 1000)));
  }
}; // does a simple countdown for minions spawning, since the events are super useless. ty rito

async function setVolume(event, val) {
  volume = val;
}; // Sets the announcer volume.

const createWindow = () => {
  // Create the browser window.
  var mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },

  });
  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  // Open the DevTools.
  mainWindow.webContents.openDevTools();
  window = mainWindow;
  mainWindow.webContents.on('did-finish-load', function () {
    loadConfig();
});
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
  ipcMain.handle('pack:getList', getPackNames); // creates a pack:getList named ipc channel.
  ipcMain.handle('pack:openList', openList); // creates a pack:getList named ipc channel.
  ipcMain.handle('pack:startAnnouncer', startAnnouncer);
  ipcMain.handle('pack:stopAnnouncer', stopAnnouncer);
  ipcMain.handle('pack:setVolume', setVolume);
  ipcMain.handle('main:FF', FF);
  ipcMain.handle('main:noFF', noFF);
  ipcMain.handle('audio:end', audioEnded);
  console.log(path.join(__dirname, '/data/iconOff.png'))
  reloadCtx().then(() => {
    tray = new Tray(iconOff);
    tray.setContextMenu(ctxMenu);
    tray.setToolTip('Quick actions for Tora!');
    tray.setTitle('Tora o-o');
    refreshLCU().then(() => { pollLive() })
    tray.on('click', () => {
      console.log('activated')
      // open main window if no windows are open
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else {
        window.show()
      }
    });
  })
  createWindow();
  var isAppQuitting = false;
  app.on('before-quit', function (evt) {
    isAppQuitting = true;
  });

  window.on('close', function (evt) {
    if (!isAppQuitting) {
      evt.preventDefault();
      window.hide();
    }
  });
});

function audioEnded() {
  audioPlaying = false;
}; // Signals the current audio track is done.

function reloadCtx() {
  return new Promise(resolve => {
    getPackNames().then(packs => {
      let mappin = packs.map((name) => {
        return {
          id: name,
          label: name,
          click: setVoice
        }
      });
      let mobj;
      if (!active) { mobj = { label: "Enable", type: 'normal', click: startAnnouncer } }
      else { mobj = { label: "Disable?", type: 'normal', click: stopAnnouncer } }
      ctxMenu = Menu.buildFromTemplate([
        mobj,
        { label: 'Change Announcer', type: 'submenu', submenu: mappin },
        { label: 'Settings', type: 'normal', enabled: false },
        { label: 'FF', type: 'normal', click: ff15 }
      ]);
      resolve()
    })
  })
}

function ff15() {
  var disp = screen.getPrimaryDisplay().bounds;
  const wind = new BrowserWindow({
    height: 105,
    width: 274,
    x: disp.width - 274,
    y: Math.round(disp.height / 2),
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, 'preloadFF.js'),
    },
  });
  wind.loadFile(path.join(__dirname, 'ff.html'));
}; // Opens the ff15 window.
function FF() {
  updateConfig();
  tray.destroy();
  app.quit();
}; // Closes the program, used by the ff15 window.
function noFF() {
  BrowserWindow.getFocusedWindow().close();
}; // Closes the ff15 window.

function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); // The maximum is exclusive and the minimum is inclusive
}