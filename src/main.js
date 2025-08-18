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
});