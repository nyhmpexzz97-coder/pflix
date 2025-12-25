// Geçerli sayfanın URL'sini al
const currentUrl = window.location.href;

// URL'yi '/' ile ayırarak bir dizi elde et
const urlParts = currentUrl.split('/');

// URL'nin sonundaki kelimeyi al
const lastPart = urlParts[urlParts.length - 1];

let current_model = lastPart;
console.log(current_model);

if(current_model !== "live"){
    newdirect();
}

async function newdirect() {
    const response = await fetch(`/get-m3u8/${lastPart}`);
    const data = await response.json();

    if (data) {
        playStream(data);
        getInfo();
    } else {
        alert("M3U8 dosyası bulunamadı!");
    }
}


async function getM3U8() {
    current_model = document.getElementById("video-model-name").value;
    window.location.href = "/live/" + current_model;
}

function playStream(m3u8Url) {
    const video = document.getElementById("video");
    if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(m3u8Url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log("Bulunan çözünürlük seviyeleri:", hls.levels.map(l => l.height + "p"));

        video.addEventListener("playing", () => {
            const currentLevel = hls.levels[hls.currentLevel];
            console.log("Şu an oynatılan çözünürlük:", currentLevel.height + "p");
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

async function getInfo() {
    try {
        const response = await fetch(`/proxy-request/chaturbate-info/${current_model}`);
        const data = await response.json();
        const performer_info = document.querySelector('.performer-info');
        performer_info.innerHTML = "";
        if('real_name' in data){
            performer_info.innerHTML += `<div><span>Name:</span> ${data.real_name}</div>`;
        }
        if('display_age' in data){
            if(data.display_age <= 70 && data.display_age != null){
                performer_info.innerHTML += `<div><span>Age:</span> ${data.display_age}</div>`;
                if('display_birthday' in data){
                    performer_info.innerHTML += `<div><span>Birthday:</span> ${data.display_birthday}</div>`;
                }
            }
        }
        if('follower_count' in data){
            performer_info.innerHTML += `<div><span>Followers:</span> ${data.follower_count}</div>`;
        }
        if('location' in data){
            performer_info.innerHTML += `<div><span>Location:</span> ${data.location}</div>`;
        }
        if('time_since_last_broadcast' in data){
            performer_info.innerHTML += `<div><span>Last Broadcast:</span> ${data.time_since_last_broadcast}</div>`;
        }
    } catch (error) {
        console.error('Veri alınamadı:', error);
    }
}

async function getOtherRooms() {
    try {
        const response = await fetch("/get-m3u8-multi");
        const data = await response.json();

        const other_rooms_div = document.querySelector('.other-rooms');
        other_rooms_div.innerHTML = "";

        data.forEach(item => {
            let age;
            if(item.age == null || item.age >= 70) age = "";
            else age = item.age;
            if(item.username !== lastPart){
                other_rooms_div.innerHTML += `<a href="/live/${item.username}" class="room">
                    <img src="${item.image}" alt="">
                    <div class="performer-name-age">
                        <div class="performer-name">${item.username}</div>
                        <div class="performer-age">${age}</div>
                    </div>
                </a>`;
            }
        });

    } catch (error) {

    }
}

getOtherRooms();
setInterval(getOtherRooms, 60000);