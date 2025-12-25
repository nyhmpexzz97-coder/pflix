const currentUrl = window.location.href;
const lastSegment = currentUrl.substring(currentUrl.lastIndexOf('/') + 1);
let updatedString = lastSegment.replace(/%20/g, ' ');
let modelName = updatedString.replace(/\+/g, ' ');
console.log(modelName);

const model_img = document.getElementById('model-img');
const model_name = document.getElementById('model-name');
const model_type = document.getElementById('model-type');
const model_video_count = document.getElementById('model-video-count');

const container_video = document.querySelector('.container-video');
const container_image = document.querySelector('.container-image');

const selectionVideos = document.getElementById('media-video');
const selectionImages = document.getElementById('media-image');

const list = document.getElementById('collections-list');

let lastModel = "";
let imagesLoaded = false;

async function getInfo(modelName) {
    try {
        const response = await fetch("/get-model-info", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },

            body: JSON.stringify({
                modelName
            }),
        });

        const data = await response.json();
        if (response.ok) {
            document.title = `PornFlix | ${data[0].name}`;
            model_img.src = data[0].image;
            model_name.innerText = data[0].name;
            model_type.innerText = data[0].type;
            model_video_count.innerText = `${data[0].movie_count} Videos`;
        } else {
            alert("Hata: " + data.message);
        }
    } catch (error) {
        console.error("Sunucuyla iletişimde hata:", error);
    }
}

async function displayVideos() {
    try {
        const response = await fetch("/get-model-videos", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },

            body: JSON.stringify({
                modelName
            }),
        });

        const data = await response.json();
        const videos = data.videos;  // Film verileri

        console.log(videos);
        const video_list = document.querySelector('#video-list');

        lastModel = modelName;
                count = 1;
                const li = document.createElement('li');
                li.classList.add('list-item')
                li.classList.add('open');
                li.style.height = "unset";
                const div = document.createElement('div');
                div.classList.add('videos');
                li.appendChild(div);

                li.addEventListener("click", ()=>{
                    if(li.classList.contains('close')){
                        li.classList.remove('close');
                        li.classList.add('open');
                        li.style.height = 'unset';
                    }
                    else{
                        li.classList.remove('open');
                        li.classList.add('close');
                        li.style.height = '57px';
                    }
                })
                video_list.appendChild(li);
                lastLi = li;
                lastDiv = div;

        videos.forEach(video => {

            let videoItem = document.createElement('div');
            videoItem.classList.add("video");
            videoItem.innerHTML = `<a href="${video.video}">
                                        <div class="preview">
                                            <video preload="none" muted loop src="${video.preview}"></video>
                                        </div>
                                        <div class="title">
                                            ${video.video_name}
                                        </div>
                                    </a>`;

            videoItem.addEventListener("mouseenter", function() {

                zamanlayici = setTimeout(function() {
                    preview.src = video.video;
                    preview_container.style.display = "flex";
                }, 1500);
            });

            videoItem.addEventListener("mouseleave", function() {
                clearTimeout(zamanlayici);
            });

            let startX, endX;

            // Dokunma başladığında
            videoItem.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX; // İlk dokunma X pozisyonu
            });

            // Dokunma bittiğinde
            videoItem.addEventListener('touchend', (e) => {
                endX = e.changedTouches[0].clientX; // Bitiş X pozisyonu
                handleSwipe();
            });

            function handleSwipe() {
                const threshold = 100; // Minimum kaydırma mesafesi (pixel)
                const difference = endX - startX;

                if (difference > threshold) { // Sağa kaydırma
                    preview.src = video.video;
                    preview_container.style.display = "flex";
                }
            }

            lastDiv.appendChild(videoItem);
        });

    } catch (error) {
        console.error('Veri alınamadı:', error);
    }
}

async function loadImages() {
 try {
        
        const response = await fetch('/get-model-collections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modelName })
        });
        const data = await response.json();
        
        data.forEach(image => {
            
            if(image.collection != "Main"){
                
                const li = document.createElement('li');
                li.classList.add('collection');
                
                li.innerHTML = `<a href="/images/${lastSegment}/${image.collection}" class="thumbnail">
                        <img src="${image.URL}" alt="${image.collection}">
                    </a>
                    <div class="name">${image.collection}</div>`;
                    
                list.appendChild(li);
            }
        });
        imagesLoaded = true;
    } catch (error) {
        
    }   
}

selectionImages.addEventListener("click", async ()=>{
    selectionVideos.classList.remove('active');
    selectionImages.classList.add('active');
    
    if(imagesLoaded == false) await loadImages(); 
    container_video.style.display = "none";
    container_image.style.display = "flex";
})

selectionVideos.addEventListener("click", async ()=>{
    selectionVideos.classList.add('active');
    selectionImages.classList.remove('active');
    container_video.style.display = "flex";
    container_image.style.display = "none";
})

async function start() {
    await getInfo(modelName);
    await displayVideos();

    const videos = document.querySelectorAll('video');

    // Intersection Observer oluştur
    const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        const video = entry.target;

        if (entry.isIntersecting) {
        // Video görünür alandaysa oynat
        video.play().catch(e => console.log("Oynatma hatası:", e));
        } else {
        // Video görünür alanda değilse durdur ve sıfırla
        video.pause();
        video.currentTime = 0;
        }
    });
    }, {
    threshold: 0.5 // Video'nun en az %50'si görünür olmalı
    });

    // Her video için observer'ı başlat
    videos.forEach(video => {
    observer.observe(video);

    // Kullanıcı etkileşimi için event listener'lar
    video.addEventListener('click', () => {
        if (video.paused) {
        video.play();
        } else {
        video.pause();
        }
    });
    });
}

start();
