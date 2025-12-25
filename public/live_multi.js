let currentStreams = [];
let selectedStreams = [];
let links = [];
let offset = 5;

async function getActiveRooms() {
    try {
        const response = await fetch("/get-m3u8-multi");
        const data = await response.json();
        currentStreams = [];

        const streamers_list = document.querySelector(".streamers-list");

        data.forEach(item => {
            currentStreams.push(item.username);
            const streamer = document.createElement('div');
            streamer.classList.add('streamer');
            streamer.innerHTML = `<div class="streamer-img">
                    <img src="${item.image}" alt="">
                </div>
                <div class="side">
                    <div class="streamer-name">${item.username}</div>
                    <div class="checkbox-wrapper">
                        <div class="checkbox exclude">Add Streamer</div>
                    </div>
                </div>`;

            const checkbox = streamer.querySelector(".checkbox");
            checkbox.addEventListener('click', ()=>{
                if(checkbox.classList.contains('exclude')){
                    checkbox.classList.remove('exclude');
                    checkbox.classList.add('include');
                    checkbox.style.backgroundColor = "#505050";
                    checkbox.style.color = "white";
                    checkbox.textContent = "Remove Streamer";
                    selectedStreams.push(item.username);
                }
                else{
                    checkbox.classList.remove('include');
                    checkbox.classList.add('exclude');
                    checkbox.style.backgroundColor = "red";
                    checkbox.style.color = "#202020";
                    checkbox.textContent = "Add Streamer";

                    let index = selectedStreams.indexOf(item.username);
                    if (index !== -1) {
                        selectedStreams.splice(index, 1);
                    }
                }

            });
            streamers_list.appendChild(streamer);
        });
        //getM3U8Links();

    } catch (error) {

    }
}


async function getM3U8Links() {
    try {
        const offset_input = document.getElementById('offset');
        if(offset_input.value !== null) offset = offset_input.value;
        links = [];
        for (const element of selectedStreams) {
            const response = await fetch(`/get-m3u8/${element}`);
            const data = await response.json();

            links.push(data);
        }
        // İlk videoyu başlat
        playNextVideo();
    } catch (error) {
        console.error("Hata oluştu:", error.message);
    }
}

const videoElement = document.getElementById('videoPlayer');

let currentIndex = 0;

// Videoyu oynatmak için fonksiyon
function playNextVideo() {
    // Geçerli URL'yi video kaynağına atama
    playStream(links[currentIndex]);

    // Sonraki URL'ye geç
    currentIndex++;

    // Eğer dizinin sonuna gelindiyse, başa dön
    if (currentIndex >= links.length) {
        currentIndex = 0;
    }
}

// 5 saniye sonra sıradaki videoya geç
videoElement.addEventListener('timeupdate', function () {
    if (videoElement.currentTime >= offset) {

        // Videonun süresi 5 saniyeyi geçtiğinde bir sonraki videoya geç
        playNextVideo();
    }
});

function playStream(m3u8Url) {
    const video = document.getElementById("videoPlayer");
    if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(m3u8Url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {

        video.addEventListener("playing", () => {
            const currentLevel = hls.levels[hls.currentLevel];
        });
    });
        video.play();
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = m3u8Url;
        video.play();
    } else {
        alert("Tarayıcınız bu video formatını desteklemiyor.");
    }
}

videoElement.addEventListener('error', function (e) {
    // Eğer hata oluşursa, sonraki URL'ye geç
    console.error('Video oynatılırken hata oluştu: ', e);

    // Hata aldığınızda bir sonraki URL'ye geçiş yapıyoruz
    playNextVideo();
});


getActiveRooms();