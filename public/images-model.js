const list = document.getElementById('collections-list');
const h1 = document.getElementById('h1');
const slideshow = document.querySelector('.slideshow-inner');

const url = window.location.pathname;
const parts = url.split('/');
const modelNameRaw = parts[parts.length - 1];
const modelName = modelNameRaw.replace("+", " ");
h1.innerHTML = `${modelName}'s Collections`;
slideshow.href = "/slideshow/" + modelNameRaw;

async function getImages() {
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
                li.innerHTML = `<a href="/images/${modelNameRaw}/${image.collection}" class="thumbnail">
                        <img src="${image.URL}" alt="${image.collection}">
                    </a>
                    <div class="name">${image.collection}</div>`;
                list.appendChild(li);
            }
        });

    } catch (error) {
        
    }
}

getImages();