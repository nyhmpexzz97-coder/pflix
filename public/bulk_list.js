const model_nameInput = document.getElementById('model-name');
const video_nameInput = document.getElementById('video-name');
const urlInput = document.getElementById('url');
const string_areaInput = document.getElementById('string-area');
const countDiv = document.querySelector('.count');

let count = 0;

document.querySelector('form').addEventListener('submit', function(event) {event.preventDefault();});

async function addToList() {
    const model_name = model_nameInput.value;
    const video_name = video_nameInput.value;
    const url = urlInput.value;

    count++;
    countDiv.innerHTML = count + " Videos";

    if(count != 1) string_areaInput.value += ",\n";

    string_areaInput.value += `"${url}>>>${video_name}>>>${model_name}"`;

    video_nameInput.value = "";
    urlInput.value = "";
}