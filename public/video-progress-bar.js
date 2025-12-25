const playPause = document.querySelector('.play-pause');
const playIcon = document.querySelector('.fa-play');
const pauseIcon = document.querySelector('.fa-pause');
const volumeHighIcon = document.querySelector('.fa-volume-high');
const volumeOffIcon = document.querySelector('.fa-volume-x-mark');
const expandMinimize = document.querySelector('.expand-minimize');
const expandIcon = document.querySelector('.fa-expand');
const minimizeIcon = document.querySelector('.fa-compress');
const videoTimer = document.querySelector('.video-timer');
const progressBar = document.querySelector('.default-bar');
const progress = document.querySelector('.progress');
const currentTimeSpan = document.querySelector('.current');
const totalTimeSpan = document.querySelector('.total');
const videoDIV = document.querySelector('.video-div');
const videoControls = document.querySelector('.video-controls');

const previewBox = document.querySelector('.preview-box');
const previewTimeText = document.querySelector('.preview-time');

let isPreview = true;

videoDOM.addEventListener('loadedmetadata', function() {
    totalTimeSpan.innerText = formatTime(videoDOM.duration);
});

let isVideoPlaying = false; 
playPause.addEventListener('click', ()=>{
    if(isVideoPlaying == true){
        videoDOM.pause();
        isVideoPlaying = false;
        pauseIcon.style.display = 'none';
        playIcon.style.display = 'block';
    }
    else{
        videoDOM.play();
        isVideoPlaying = true;
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
    }
})

videoDOM.addEventListener('click', ()=>{
    if(isPreview == true){
        videoDOM.src = originalVideo;
        isPreview = false;
        videoDOM.muted = false;
        videoDOM.loop = false;
        videoControls.style.display = "flex";
    }
    if(isVideoPlaying == true){
        videoDOM.pause();
        isVideoPlaying = false;
        pauseIcon.style.display = 'none';
        playIcon.style.display = 'block';
    }
    else{
        videoDOM.play();
        isVideoPlaying = true;
        playIcon.style.display = 'none';
        pauseIcon.style.display = 'block';
    }
})

let isVideoExpanded = false; 
expandMinimize.addEventListener('click', ()=>{
    if(isVideoExpanded == true){
        document.exitFullscreen();
        isVideoExpanded = false;
        minimizeIcon.style.display = 'none';
        expandIcon.style.display = 'block';
    }
    else{
        videoDIV.requestFullscreen();
        isVideoExpanded = true;
        expandIcon.style.display = 'none';
        minimizeIcon.style.display = 'block';
        videoDIV.classList.add('fullscreen');
    }
})

videoDOM.addEventListener('dblclick', ()=>{
    if(isVideoExpanded == true){
        document.exitFullscreen();
        isVideoExpanded = false;
        minimizeIcon.style.display = 'none';
        expandIcon.style.display = 'block';
    }
    else{
        videoDIV.requestFullscreen();
        isVideoExpanded = true;
        expandIcon.style.display = 'none';
        minimizeIcon.style.display = 'block';
        videoDIV.classList.add('fullscreen');
    }
})

videoDOM.addEventListener('timeupdate', function() {
    const percent = (videoDOM.currentTime / videoDOM.duration) * 100;
    progress.style.width = percent + '%';
    currentTimeSpan.innerText = formatTime(videoDOM.currentTime);
});

progressBar.addEventListener('click', function(event) {
    const clickX = event.offsetX;
    const width = progressBar.offsetWidth;
    const percent = (clickX / width) * 100;
    progress.style.width = percent + '%';
    videoDOM.currentTime = (percent / 100) * videoDOM.duration;
});

let isDragging = false;

progressBar.addEventListener('mousedown', (e) => {
    isDragging = true;
    scrub(e);
    videoDOM.pause(); 
});

document.addEventListener('mousemove', (e) => {
    if (isDragging) {
        scrub(e);
    }
});

document.addEventListener('mouseup', () => {
    if (isDragging) {
        isDragging = false;
        videoDOM.play();
    }
});

// --- MOBİL İÇİN DOKUNMA OLAYLARI ---

// 1. Dokunma Başladı (Touchstart) -> Mousedown karşılığı
progressBar.addEventListener('touchstart', (e) => {
    e.preventDefault();
    isDragging = true;
    scrub(e);
}, { passive: false });

// 2. Sürükleme (Touchmove) -> Mousemove karşılığı
document.addEventListener('touchmove', (e) => {
    if (isDragging) {
        if(e.cancelable) e.preventDefault(); 
        
        scrub(e);
    }
}, { passive: false });

// 3. Dokunma Bitti (Touchend) -> Mouseup karşılığı
document.addEventListener('touchend', () => {
    if (isDragging) {
        isDragging = false;
    }
});

function getClientX(e) {
    // Eğer olay bir "touch" olayı ise ve parmak varsa:
    if (e.touches && e.touches.length > 0) {
        return e.touches[0].clientX;
    }
    // Değilse (mouse ise):
    return e.clientX;
}

function scrub(e) {
    const rect = progressBar.getBoundingClientRect();
    
    let currentX = getClientX(e); 
    let offsetX = currentX - rect.left;
    const width = rect.width;
    
    // Sınırları kontrol et (0'dan küçük veya genişlikten büyük olmasın)
    if (offsetX < 0) offsetX = 0;
    if (offsetX > width) offsetX = width;
    const percent = offsetX / width;
    progress.style.width = `${percent * 100}%`;

    if (videoDOM.duration && Number.isFinite(videoDOM.duration)) {
        videoDOM.currentTime = percent * videoDOM.duration;
    }
}

progressBar.addEventListener('mousemove', (e) => {
    const rect = progressBar.getBoundingClientRect();
    
    // Mouse'un X konumu (önceki sorudaki getClientX'i burada da kullanabilirsin)
    let offsetX = e.clientX - rect.left;
    
    // Sınırları kontrol et
    if (offsetX < 0) offsetX = 0;
    if (offsetX > rect.width) offsetX = rect.width;

    // Zamanı hesapla
    const percent = offsetX / rect.width;
    const previewTime = percent * videoDOM.duration; // Ana videonun süresi üzerinden

    // 1. Kutuyu konumlandır
    // Not: Kutunun barın dışına taşmaması için basit bir 'clamp' yapabiliriz ama
    // şimdilik sadece mouse'un olduğu yere gitmesini sağlıyoruz:
    previewBox.style.left = `${offsetX}px`;

    // 2. Kutuyu göster
    previewBox.style.display = 'block';

    // 3. Önizleme videosunu o saniyeye götür
    // isFinite kontrolü video metadata yüklenmeden hata almamak için
    if (Number.isFinite(previewTime)) {
        previewVideo.currentTime = previewTime;
        
        // 4. Zamanı yazdır (Formatlı yazdırmak için basit bir helper)
        previewTimeText.innerText = formatTime(previewTime);
    }
});

// Mouse bardan ayrılınca kutuyu gizle
progressBar.addEventListener('mouseleave', () => {
    previewBox.style.display = 'none';
});

// Yardımcı Fonksiyon: Saniyeyi Dakika:Saniye formatına çevirir
function formatTime(seconds) {
    if(seconds < 3600){
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    }
    else{
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds - h * 3600) / 60);
        const s = Math.floor(seconds % 60);
        
        return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
}

let lastMouseLeaveTimer;

videoDIV.addEventListener('mouseenter', () => {
    if(isPreview == false){
        clearTimeout(lastMouseLeaveTimer);
        videoControls.style.display = "flex";
    }
});

videoDIV.addEventListener('mouseleave', () => {
    lastMouseLeaveTimer = setTimeout(() => {
        if(isVideoPlaying == true){
            videoControls.style.display = "none";
        }
    }, 2000);
});

let inactivityTimer;
let inactive = false;
videoDIV.addEventListener('mousemove', () => {
    if(inactive == true){
        videoControls.style.display = "flex";
        document.body.style.cursor = 'default';
        inactive = false;
    }
    clearTimeout(inactivityTimer);

    inactivityTimer = setTimeout(() => {
        if(isVideoPlaying == true){
            videoControls.style.display = "none";
            document.body.style.cursor = 'none';
            inactive = true;
        }
    }, 3000);
});

document.addEventListener('keydown', (e)=>{
    if(e.key == "ArrowLeft"){
        videoDOM.currentTime = videoDOM.currentTime - 5;
    }
    if(e.key == "ArrowRight"){
        videoDOM.currentTime = videoDOM.currentTime + 5;
    }
    if(e.key == "q"){
        videoDOM.currentTime = videoDOM.currentTime - 5;
    }
    if(e.key == "e"){
        videoDOM.currentTime = videoDOM.currentTime + 5;
    }
});

