const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const voiceSelectBtn = document.getElementById('voiceSelectBtn');
const slider = document.getElementById('volRange');
const volDisplay = document.getElementById('volDisplay');
const audioPlayer = document.getElementById('audioPlayer');

// Button functionality
startBtn.addEventListener('click', async () => {
    await window.electronAPI.startAnnouncer();
}); // Starts the announcer functionality
stopBtn.addEventListener('click', async () => {
    await window.electronAPI.stopAnnouncer();
}); // Stops the announcer functionality
voiceSelectBtn.addEventListener('click', async () => {
    await window.electronAPI.openList();
}); // Opens a voicepack list to choose an announcer from.

// Slider functionality
slider.oninput = function () {
    volDisplay.innerHTML = `Volume: ${this.value}%`;
    window.electronAPI.setVolume(this.value);
};

window.electronAPI.audioPlay((_event, vals)=>{
    let sc = document.createElement('source');
    sc.setAttribute('src', vals[0]);
    sc.setAttribute('type', 'audio/mp3');
    var child = audioPlayer.lastChild;
    while(child){
        audioPlayer.removeChild(child)
        child = audioPlayer.lastElementChild;
    }
    audioPlayer.appendChild(sc)
    audioPlayer.load()
    setVolume(vals[1] / 100)
    console.log(audioPlayer)
    console.log('Playing audio.', vals[0])
    audioPlayer.play()
});

window.electronAPI.setSliderValue((_event, val)=>{
    console.log('setting slider to, value', val)
    slider.value = val;
    volDisplay.innerHTML = `Volume: ${val}%`
});

audioPlayer.addEventListener('ended', (event)=>{
    window.electronAPI.audioEnded();
    console.log('Audio ended.')
});