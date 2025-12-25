let selectedStreams = [];
let camgirls = [];
async function getNames() {
    try {

        const response = await fetch(`/getNames`);
        camgirls = await response.json();

    } catch (error) {
        console.log(error.message);

    }
}

async function getM3U8Links(name) {
    try {
        const response = await fetch(`/get-m3u8/${name}`);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Hata oluştu:", error.message);
    }
}

function playStream(m3u8Url, video) {
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

const videos = document.getElementsByTagName('video');
const inputs = document.getElementsByTagName('input');


for(let i = 0; i < 4; i++){
    inputs[i].addEventListener("keydown", (e) => {
        if (e.key === "Tab" && inputs[i].value !== "") {
            for (const camgirl of camgirls) {
                    if (camgirl.includes(inputs[i].value)) {
                        inputs[i].value = camgirl;
                        isFirstTab = false;
                        break;
                    }
            }
        }
    });
}

document.getElementById('button-random').addEventListener('click', async ()=>{
    for (let i = 0; i < 4; i++) {
        let url = await getM3U8Links(inputs[i].value);
        console.log(url);

        playStream(url, videos[i]);
    }
})

document.addEventListener("DOMContentLoaded", async ()=>{
    await getNames();
})