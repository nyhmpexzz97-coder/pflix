const currentUrl = window.location.href;
const parts = currentUrl.split('/');
const videoID = parts[parts.length - 1];
let video;

const videoDOM = document.getElementById('video');
const previewVideo = document.getElementById('previewVideo');
const modelImageDOM = document.getElementById('model_image');
const modelNameDOM = document.querySelector('.model-name');
const titleDOM = document.querySelector('.title');

const additionals_list = document.querySelector('.additionals-list');
const related_list = document.querySelector('.related-list');

const update_input = document.querySelector('#additional-name');
const update_button = document.querySelector('.update');
const updateDIV = document.querySelector('.update-wrapper');

async function getVideoInfo() {
    try {
        const response = await fetch(`/api/video-info/${videoID}`);
        const data = await response.json();
        video = data.video;
        originalVideo = video.video;
        videoDOM.src = video.preview;
        previewVideo.src = video.video;
        modelImageDOM.src = video.owner.image;
        modelNameDOM.innerHTML = video.owner.name;
        titleDOM.innerHTML = video.video_name;
        
    } catch (error) {
        console.log(error);
    }
}

async function getAdditionals() {
    for (const element of video.additionals) {
        if(element == "END"){
            updateDIV.style.display = "none";
        }
        else{
            const response = await fetch("/get-model-info", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },

                body: JSON.stringify({
                    modelName: element
                }),
            });

            const data = await response.json();
            let additionalsImage = "https://svgsilh.com/svg/296989.svg";
            
            if(data.length != 0) additionalsImage = data[0].image;
            
            const model_name = element.replace(/ /g, "+");
            const a = document.createElement('a');
            a.classList.add('additional');
            a.href = `/model/${model_name}`;
            a.innerHTML = `<img src="${additionalsImage}" alt="">
                            <h1>${element}</h1>`;
            additionals_list.appendChild(a);
        }
        
    }
}

async function getRelatedVideos() {
    try {
        const response = await fetch(`/api/get-5-vids`);
        const data = await response.json();
        
        data.result.forEach(video => {
            const li = document.createElement('li');
            li.classList.add('related-item');
            li.innerHTML = `
            <a href="/video/${video._id}" class="top">
                <video class="video-player" muted loop preload="metadata" autoplay src="${video.preview}"></video>
            </a>
            <div class="bottom">
                <div class="left">
                    <img src="${video.owner && video.owner.image ? video.owner.image : 'https://svgsilh.com/svg/296989.svg'}" alt="" onerror="this.onerror=null; this.src='https://svgsilh.com/svg/296989.svg';">
                </div>
                <div class="right">
                    <div class="model-name">${video.owner && video.owner.name ? video.owner.name : video.model_name}</div>
                    <div class="line"></div>
                    <div class="title">${video.video_name}</div>
                </div>
            </div>`;
            related_list.appendChild(li);
        });
    } catch (error) {
        console.log(error);
    }
}

async function updateAdditionals() {
    const response = await fetch( "/api/video-update-additionals" , {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: video._id, additional: update_input.value })
    });
    const data = await response.json();
    additionals_list.innerHTML = "";
    video = data.updatedVideo;
    update_input.value = "";
    await getAdditionals();
}

update_button.addEventListener("click", async ()=>{
    if(update_input.value == "") return;
    await updateAdditionals();
});

update_input.addEventListener('keydown', async function (e) {
    if (e.key === "Enter") {
        if(update_input.value == "") return;
        await updateAdditionals();
    }
});

async function start() {
    await getVideoInfo();
    if(video.additionals != null && video.additionals.length != 0) await getAdditionals();
    await getRelatedVideos();
}

start();