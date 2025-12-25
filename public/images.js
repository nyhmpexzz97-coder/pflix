const list = document.getElementById('models-list');

async function getImages() {
    try {
        const response = await fetch('/get-models-names');
        const data = await response.json();
        console.log(data);
        
        data.images.forEach(image => {
            const li = document.createElement('li');
            li.classList.add('model');
            const model_name = image.name.replace(/ /g, "+");
            li.innerHTML = `<a href="/images/${model_name}" class="thumbnail">
                    <img src="https://pflixbucket.s3.eu-central-003.backblazeb2.com/images/${model_name}/${model_name}.jpg" alt="${image.name}">
                </a>
                <div class="name">${image.name}</div>`;
            list.appendChild(li);
        });

    } catch (error) {
        
    }
}

getImages();
