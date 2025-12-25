async function find_video_by_name(name){
    try {
        const response = await fetch('/cinema-check-video', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name })
        });


        const data = await response.json();
        console.log(name, data);

        if (response.ok) {
            return data.video;

        } else {
        }
    } catch (error) {
        console.error('Hata:', error);
    }
}

let inputs = [];
let Videos = [];

document.addEventListener('DOMContentLoaded', () => {


    for(let i = 1; i < 5; i++){
        inputs[i] = document.querySelector(`#input-${i}`);
        Videos[i] = document.querySelector(`#id-${i}`);

        let timeout;
        inputs[i].addEventListener('input', async ()=>{
            console.log(inputs[i].value);
            clearTimeout(timeout); // Eski beklemeyi temizle
            timeout = setTimeout(async () => {

                const video = await find_video_by_name(inputs[i].value);

                console.log(video);
                console.log(Videos[i]);


                Videos[i].src = video.video;
            }, 500);
        })
    }

});

const random_button = document.querySelector('#button-random');

random_button.addEventListener('click', async()=>{
    let videos = [];
    try {
        const response = await fetch("/cinema-random-videos");
        const records = await response.json();
        videos = records;
    } catch (error) {
        console.error("Hata:", error);
    }

    for(let i = 1; i < 5; i++){
        inputs[i] = document.querySelector(`#input-${i}`);
        Videos[i] = document.querySelector(`#id-${i}`);

        inputs[i].value = videos[i-1].video_name;
        Videos[i].src = videos[i-1].video;
    }
})