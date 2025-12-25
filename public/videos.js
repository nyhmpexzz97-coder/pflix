const currentUrl = window.location.href;
const parts = currentUrl.split('/');
let isSearch = true;
let searchTerm = "";
if(parts[3] == "videos") isSearch = false;
else searchTerm = decodeURIComponent(parts[4]);


const pageNumber = currentUrl.substring(currentUrl.lastIndexOf('/') + 1);
let videoCount = 0;

const videoList = document.querySelector('.video-list');
const grid4 = document.querySelector('.grid-4');
const grid3 = document.querySelector('.grid-3');
const grid2 = document.querySelector('.grid-2');

const prevPage = document.querySelector('.prev');
const nextPage = document.querySelector('.next');

grid4.addEventListener('click', ()=>{
    if(grid3.classList.contains('active-grid')){
        grid3.classList.remove('active-grid');
        grid4.classList.add('active-grid');
        videoList.classList.remove('video-list2');
    }
    if(grid2.classList.contains('active-grid')){
        grid2.classList.remove('active-grid');
        grid4.classList.add('active-grid');
        videoList.classList.remove('video-list3');
    }
})

grid3.addEventListener('click', ()=>{
    if(grid4.classList.contains('active-grid')){
        grid4.classList.remove('active-grid');
        grid3.classList.add('active-grid');
        videoList.classList.add('video-list2');
    }
    if(grid2.classList.contains('active-grid')){
        grid2.classList.remove('active-grid');
        grid3.classList.add('active-grid');
        videoList.classList.remove('video-list3');
        videoList.classList.add('video-list2');
    }
})

grid2.addEventListener('click', ()=>{
    if(grid3.classList.contains('active-grid')){
        grid3.classList.remove('active-grid');
        grid2.classList.add('active-grid');
        videoList.classList.remove('video-list2');
        videoList.classList.add('video-list3');
    }
    if(grid4.classList.contains('active-grid')){
        grid4.classList.remove('active-grid');
        grid2.classList.add('active-grid');
        videoList.classList.add('video-list3');
    }
})

// Intersection Observer'ı kullanarak, video öğesinin görünür olup olmadığını kontrol et
const observerOptions = {
  root: null, // viewport (görünür alan)
  rootMargin: '0px',
  threshold: 0.5 // öğenin %50'si görünür olduğunda tetiklenir
};

let debounceTimer; // Zamanlayıcıyı tutacak değişken
const searchBox = document.getElementById("tb_search");
const searchIcon2 = document.getElementById("search-icon2");
const searchIcon1 = document.getElementById("responsive_search");
const searchBox2 = document.getElementById("tb_search2");

const results_list = document.querySelector('.results_list');
const results_list2 = document.querySelector('.results_list2');
const cancel = document.querySelector('.cancel');

const mobileSearchContainer = document.querySelector('.mobile-search-container');

searchIcon1.addEventListener("click", ()=>{
    searchIcon1.style.display = "none";
    mobileSearchContainer.style.display = "flex";
});

cancel.addEventListener("click", ()=>{
    mobileSearchContainer.style.display = "none";
    searchIcon1.style.display = "flex";
});


searchBox.addEventListener('keydown', async function (e) {
    if (e.key === "Enter") {
        clearTimeout(debounceTimer);
        const searchTerm = e.target.value.trim();
        results_list.innerHTML = "";
        await performSearch(searchTerm); 
        return;
    }
    const searchTerm = e.target.value.trim();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
        if(e.target.value == "") return;
        await showSearchItems(searchTerm, results_list);
    }, 300);
});

searchBox2.addEventListener('input', function (e) {
    const searchTerm = e.target.value.trim();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
        await showSearchItems(searchTerm, results_list2);
    }, 500);
});


searchIcon2.addEventListener('click', async function () {
    const searchTerm = searchBox2.value;
    await performSearch(searchTerm); 
    searchBox2.value = "";
    results_list2.innerHTML = "";
    mobileSearchContainer.style.display = "none";
    searchIcon1.style.display = "flex";

});

async function showSearchItems(term, list) {
    list.innerHTML = "";
    try {
        const response = await fetch(`/search?q=${term}`); // Node.js rotan
        const data = await response.json();
        const newSerie = data.slice(0, 5);
        newSerie.forEach(video => {
            const a = document.createElement('a');
            a.href = `/video/${video._id}`;
            a.classList.add('results_item');
            a.innerHTML = `<div class="results_left">
                                <div class="results_left_left">
                                    <img src="${video.owner.image}" alt="" onerror="this.onerror=null; this.src='https://svgsilh.com/svg/296989.svg';">
                                </div>
                                <div class="results_left_right">
                                    <h1 class="model_name">${video.owner.name}</h1>
                                    <h2 class="title">${video.video_name}</h2>
                                </div>
                            </div>
                            <div class="results_right">
                                <video class="preview" muted autoplay loop src="${video.preview}"></video>
                            </div>`;
            list.appendChild(a);
        });
    } catch (error) {
        console.error('Arama hatası:', error);
    }
}


async function performSearch(term) {
    // 2. ADIM: URL GÜNCELLEME (History API)
    const url = new URL(window.location);
    
    if (term) {
        url.searchParams.set('q', term); // URL'e ?q=term ekler
    } else {
        url.searchParams.delete('q'); // Kutu boşsa parametreyi sil
    }
    
    // pushState(state, title, url): Sayfayı yenilemeden URL'i değiştirir
    window.history.pushState({}, '', url);

    // Eğer arama kutusu boşaldıysa sonuçları temizle ve dur
    if (!term) {
        videoList.innerHTML = '';
        return;
    }

    // 3. ADIM: BACKEND'E İSTEK (FETCH)
    try {
        const response = await fetch(`/search?q=${term}`); // Node.js rotan
        const data = await response.json();
        videoList.innerHTML = "";
        await displayVideos(data); // Gelen veriyi ekrana bas
    } catch (error) {
        console.error('Arama hatası:', error);
    }
}

async function getVideos() {
    let api = "/api/videos/page";
    if (isSearch == true) api = "/api/search/page";
    const response = await fetch( api , {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageNumber, searchTerm })
    });
    const data = await response.json();
    console.log(data);
    
    videoCount = data.videoCount;
    return data.videos;
}

async function displayVideos(data) {
    console.log(data, pageNumber);
    
    if(data == null) videoList.innerHTML = "No Video Found!";
    try {
        if(pageNumber < 1) window.location.href = `/videos/1`;
        if(pageNumber > parseInt(videoCount / 24) + 1) window.location.href = `/videos/${parseInt(videoCount / 24) + 1}`;

        if(pageNumber == 1){
            prevPage.classList.add('disable');
        }

        if(pageNumber == parseInt(videoCount / 24) + 1){
            nextPage.classList.add('disable');
        }
        
        data.forEach(video => {
            const li = document.createElement('li');
            li.classList.add('video');

            let additionals = "";
            if(video.additionals.length != 0){
                video.additionals.forEach(additional => {
                    if(additional != "END"){
                        additionals += `<img src="https://f003.backblazeb2.com/file/pflixbucket/model+images/${additional.replace(' ', '+')}.jpg" alt="" onerror="this.onerror=null; this.src='https://svgsilh.com/svg/296989.svg';">`;
                    }
                });
            }
            
            li.innerHTML = `
                <a href="/video/${video._id}" class="top">
                    <video class="video-player" muted loop preload="metadata"></video>
                </a>
                <div class="bottom">
                    <div class="left">
                        <img src="${video.owner && video.owner.image ? video.owner.image : 'https://svgsilh.com/svg/296989.svg'}" alt="" onerror="this.onerror=null; this.src='https://svgsilh.com/svg/296989.svg';">
                    </div>
                    <div class="right">
                        <div class="right-top">
                            <div class="model-wrapper">
                                <i class="fa-regular fa-bookmark"></i>
                                <i class="fa-solid fa-bookmark"></i>
                                <div class="model-name">${video.owner && video.owner.name ? video.owner.name : video.model_name}</div>
                            </div>
                            <div class="additional_images">${additionals}</div>
                        </div>
                        <div class="line"></div>
                        <div class="title">${video.video_name}</div>
                    </div>
                </div>`;

            videoList.appendChild(li);

            const additionalElement = li.querySelector('.additional_images');

            const images = additionalElement.querySelectorAll('img');

            for(let i = images.length - 1; i >= 0; i--){
                console.log(images[i]);
                images[i].style.marginRight = `-${((images.length - i - 1) * 15)}px`;
                images[i].style.zIndex = (images.length - i - 1) * -5;
            }

            // Video öğesini gözlemlemek için IntersectionObserver'ı ekle
            const videoElement = li.querySelector('video');
            
            // İlk yükleme işlemi için observer
            const loadObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting && !entry.target.hasAttribute('data-loaded')) {
                        // Video görünür olduysa ve daha önce yüklenmediyse
                        entry.target.src = video.preview; // Videonun kaynağını yükle
                        entry.target.play(); // Videoyu oynat
                        entry.target.setAttribute('data-loaded', 'true'); // Yüklendi olarak işaretle
                        observer.unobserve(entry.target); // Yalnızca bir kez gözlemlenmesini sağla
                    }
                });
            }, observerOptions);

            loadObserver.observe(videoElement); // Video öğesini gözlemlemeye başla

            // Görünürlük değişimi için observer
            const visibilityObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        // Video görünür olduysa oynat
                        entry.target.play();
                    } else {
                        // Video görünürlükten çıkarsa durdur
                        entry.target.pause();
                        entry.target.currentTime = 0; // Başlangıç zamanına sıfırla
                    }
                });
            }, observerOptions);

            visibilityObserver.observe(videoElement); // Görünürlük durumunu gözlemle
        });
    } catch (error) {
        console.error('Video verileri yüklenirken hata oluştu:', error);
    }
}

prevPage.addEventListener('click', ()=>{
    if(prevPage.classList.contains('disable')) return;
    window.location.href = `/videos/${Number(pageNumber) - 1}`;
})

nextPage.addEventListener('click', ()=>{
    if(nextPage.classList.contains('disable')) return;
    window.location.href = `/videos/${Number(pageNumber) + 1}`;
})



async function start() {
    let videos = "";
    if (isSearch == false) videos = await getVideos(); 
    await displayVideos(videos);
}

start();