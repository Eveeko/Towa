var audio = document.getElementById('audioPlayer')
var window_closeBtn = document.getElementById('window_closeBtn')
var window_closeBtnGlow = document.getElementById('window_closeBtnGlow')
var stateBtn = document.getElementById('stateBtn')
var stateBtnIcon = document.getElementById('stateBtnIcon')
var consoleH1 = document.getElementById('consoleh1');
const slider = document.getElementById('volRange');

var consoleText = "";

function setVolume(vol) {
    audio.volume = vol;
    consoleText += `Volume set to: ${Math.round(vol * 100)}%.\n`;
    updateConsole();
}

// Functionality for the close window button topright corner.
window_closeBtn.addEventListener('mouseover', function() {
    window_closeBtnGlow.classList.add('show');
    window_closeBtn.style.filter = 'brightness(0) saturate(100%) invert(98%) sepia(44%) saturate(1362%) hue-rotate(24deg) brightness(98%) contrast(89%)';
});
window_closeBtn.addEventListener('mouseleave', function() {
    window_closeBtnGlow.classList.remove('show');
    window_closeBtn.style.filter = 'brightness(0) saturate(100%) invert(74%) sepia(24%) saturate(5944%) hue-rotate(291deg) brightness(89%) contrast(75%)';
});
window_closeBtn.addEventListener('click', function() {
    window.electronAPI.closeWindow();
});
// ----------------------------------------------------------

stateBtn.addEventListener('click', function() {
    stateBtn.classList.add("stateBtnLoading");
    stateBtnIcon.classList.add("stateBtnIconLoading");
    stateBtnIcon.style.backgroundImage = "url('../data/loading.svg')";
    window.electronAPI.startAnnouncer();
});
window.electronAPI.announcerStarted(() =>{
    console.log('Announcer started');
    stateBtn.classList.remove("stateBtnLoading");
    stateBtnIcon.classList.remove("stateBtnIconLoading");
    stateBtn.classList.add("stateBtnClose");
    stateBtnIcon.style.backgroundImage = "url('../data/off.svg')";
    consoleText += "Announcer has started.\n";
    updateConsole();
});
window.electronAPI.announcerStopped(() => {
    console.log('Announcer stopped');
    stateBtn.classList.remove("stateBtnClose");
    stateBtnIcon.style.backgroundImage = "url('../data/power.svg')";
    stateBtnIcon.classList.remove("stateBtnIconLoading");
    stateBtn.classList.remove("stateBtnLoading");
    consoleText += "Announcer has stopped.\n";
    updateConsole();
});
window.electronAPI.announcerNotRunning(() => {
    console.log('League client is not running');
    stateBtn.classList.remove("stateBtnClose");
    stateBtnIcon.style.backgroundImage = "url('../data/power.svg')";
    stateBtnIcon.classList.remove("stateBtnIconLoading");
    stateBtn.classList.remove("stateBtnLoading");
    consoleText += "Unable to start, League is not running.\n";
    updateConsole();
});

let isScrolledRight = false; // Add this at the top with other variables

function scrollText() {
    const text = document.querySelector('.packSelectCurnameH1');
    const container = document.querySelector('.packSelectCurnameDiv');
    const textWidth = text.offsetWidth;
    const containerWidth = container.offsetWidth;
    
    if (textWidth > containerWidth) {
        // Calculate how far we need to scroll
        const scrollDistance = textWidth - containerWidth;
        
        if (!isScrolledRight) {
            // Scroll to the left
            text.style.transform = `translateX(-${scrollDistance}px)`;
            isScrolledRight = true;
        } else {
            // Scroll back to the start
            text.style.transform = 'translateX(0)';
            isScrolledRight = false;
        }
    }
}

// Update the interval to a reasonable time for reading
setInterval(scrollText, 3000); // Scroll every 3 seconds

function updateConsole() {
    consoleH1.innerText = consoleText;
    consoleH1.scrollTop = consoleH1.scrollHeight;
};

window.electronAPI.audioPlay(params =>{
    console.log('Playing audio:', params);
    if (!params || !params[0]) {
        console.warn('audioPlay: missing src parameter');
        return;
    }
    // set source (fix typo: scr -> src)
    audio.src = params[0];

    // parse volume percent (accept strings like '50' or '50%') and convert to 0..1
    let volPercent = 50; // default to 100%
    if (params.length > 1 && params[1] != null) {
        // remove trailing % if present and coerce to Number
        const raw = String(params[1]).trim().replace('%', '');
        const n = Number(raw);
        if (!Number.isNaN(n)) volPercent = n;
        else console.warn('audioPlay: invalid volume, defaulting to 50%', params[1]);
    }
    // clamp to [0,100] then convert to [0,1]
    volPercent = Math.min(100, Math.max(0, volPercent));
    audio.volume = volPercent / 100;

    audio.currentTime = 0;
    audio.play();
    // Add the ended listener only once for this play call (prevents accumulating listeners)
    audio.addEventListener('ended', () => {
        window.electronAPI.audioEnded();
    }, { once: true });
});

window.electronAPI.setSliderValue((val) => {
    slider.value = val;
});

slider.addEventListener('change', (event) => {
    let percent = event.target.value;
    percent = Math.min(100, Math.max(0, percent));
    percent = percent / 100;
    setVolume(percent);
    window.electronAPI.setVolume(Number(event.target.value));
});