let lastModel = "";
let lastLi = "";
let lastDiv = "";
let count = 0;
let counter = 0;

const preview = document.querySelector('.preview');
const preview_container = document.querySelector('.preview-container');
const video_count = document.querySelector('.video-count');

async function displayVideos() {
    try {
        const response = await fetch(`/api/videos`);
        const data = await response.json();
        const videos = data.videos;  // Film verileri

        console.log(videos);
        video_count.innerText = videos.length;
        const video_list = document.querySelector('#video-list');

        videos.forEach(video => {
            count++;
            if(lastModel != video.model_name){
                lastModel = video.model_name;
                count = 1;
                const li = document.createElement('li');
                li.classList.add('list-item')
                li.classList.add('close');
                li.innerHTML = `<h2>${counter} - ${lastModel}</h2>`;
                const div = document.createElement('div');
                div.classList.add('videos');
                if(video.model_name == "Instagram Reels") div.classList.add('reels');
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
            }

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
            let formatted = lastModel.replace(' ', '+');
            if(count == 1){
                counter++;
                lastLi.getElementsByTagName('h2')[0].innerHTML = `<a href="/model/${formatted}"><i class="fa-solid fa-address-card"></i></a> ${counter + " - " + lastModel}  <h3>${count} Video</h3>`;
            }
            else lastLi.getElementsByTagName('h2')[0].innerHTML = `<a href="/model/${formatted}"><i class="fa-solid fa-address-card"></i></a> ${counter + " - " + lastModel}  <h3>${count} Videos</h3>`;
        });

    } catch (error) {
        console.error('Veri alınamadı:', error);
    }
}

document.querySelector('.fa-xmark').addEventListener('click', ()=>{
    preview.src = "";
    preview_container.style.display = "none";
})

document.addEventListener('DOMContentLoaded', async () => {

await displayVideos();
  // Tüm videoları seç
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
});