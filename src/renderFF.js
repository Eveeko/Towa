const ffYesBtn = document.getElementById('YES');
const ffNoBtn = document.getElementById('NO');

// Close application functionality
ffYesBtn.addEventListener('click', async () => {
    await window.electronAPI.FF();
});
ffNoBtn.addEventListener('click', async ()=>{
    await window.electronAPI.noFF();
});