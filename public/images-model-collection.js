const list = document.getElementById('list');
const h1 = document.getElementById('h1');
const slideshow = document.querySelector('.slideshow-inner');

const url = window.location.pathname;
const parts = url.split('/');
const modelNameRaw = parts[parts.length - 2];
const collection = parts[parts.length - 1];
const modelName = modelNameRaw.replace("+", " ");

h1.innerHTML = `${modelName}'s Collection ${collection}`;
slideshow.href = url + "/slideshow";

async function getImages() {
    try {
        const response = await fetch('/get-model-collection-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modelName, collection })
        });
        const data = await response.json();

        data.images.forEach(image => {
            const li = document.createElement('li');
            li.innerHTML = `<img src="${image.URL}" alt="${image.URL}">`;
            list.appendChild(li);
        });

    } catch (error) {
        
    }
}

getImages();