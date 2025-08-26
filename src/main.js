var audio = document.getElementById('audioPlayer')
var window_closeBtn = document.getElementById('window_closeBtn')
var window_closeBtnGlow = document.getElementById('window_closeBtnGlow')
var stateBtn = document.getElementById('stateBtn')
var stateBtnIcon = document.getElementById('stateBtnIcon')

function setVolume(vol) {
    audio.volume = vol;
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
});
window.electronAPI.announcerStopped(() => {
    console.log('Announcer stopped');
    stateBtn.classList.remove("stateBtnClose");
    stateBtnIcon.style.backgroundImage = "url('../data/power.svg')";
    stateBtnIcon.classList.remove("stateBtnIconLoading");
    stateBtn.classList.remove("stateBtnLoading");
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

window.electronAPI.audioPlay((event, params) =>{
    console.log('Playing audio:', params);
    audio.scr = params[0];
    audio.volume = Math.round(params[1]);
    audio.currentTime = 0;
    audio.play();
    audio.addEventListener('ended', () => {
        window.electronAPI.audioEnded();
    });
});