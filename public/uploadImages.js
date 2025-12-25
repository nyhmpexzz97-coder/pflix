const model_nameInput = document.getElementById('model-name');
const collection_Input = document.getElementById('collection');
const urlInput = document.getElementById('url');
const indexInput = document.getElementById('index');
const bulkInput = document.getElementById('bulk');


document.querySelector('form').addEventListener('submit', function(event) {event.preventDefault();});

let timeout;
collection_Input.addEventListener("input", ()=>{
    clearTimeout(timeout);

    timeout = setTimeout(async function() {
        modelName = model_nameInput.value;
        collection = collection_Input.value;

        try {
        const response = await fetch("/get-collection-index", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },

            body: JSON.stringify({
                modelName,
                collection
            }),
        });

        const data = await response.json();
        indexInput.value = Number(data) + 1;
        
    } catch (error) {
        console.error("Sunucuyla iletişimde hata:", error);
    }
    }, 500);
})

async function uploadImage() {
    const model_name = model_nameInput.value;
    const collection = collection_Input.value;
    const url = urlInput.value;
    const index = indexInput.value;

    try {
        const response = await fetch("/api/upload-image", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },

            body: JSON.stringify({
                model_name,
                collection,
                url,
                index
            }),
        });

        const data = await response.json();
        if (response.ok) {
            alert("Image uploaded successfully!");
            urlInput.value = "";
            indexInput.value = Number(indexInput.value) + 1;
        } else {
            alert("Hata: " + data.message);
        }
    } catch (error) {
        console.error("Sunucuyla iletişimde hata:", error);
    }
}

async function bulk() {
    const model_name = model_nameInput.value;
    const collection = collection_Input.value;
    const url = urlInput.value;
    try {
        const response = await fetch("/bulk-image-links", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },

            body: JSON.stringify({
                model_name,
                collection,
                url
            }),
        });

        const data = await response.json();
        if (response.ok) {
            console.log(data);
            await uploadBulk(data);
            
        } else {
            alert("Hata: " + data.message);
        }
    } catch (error) {
        console.error("Sunucuyla iletişimde hata:", error);
    }
}

async function uploadBulk(data) {
    const model_name = model_nameInput.value;
    const collection = collection_Input.value;
    try {
        const response = await fetch("/bulk-image-upload", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },

            body: JSON.stringify({
                model_name,
                collection,
                data
            }),
        });

        const data2 = await response.json();
        if (response.ok) {
            alert(response.message);
            
        } else {
            alert("Hata: " + data.message);
        }
    } catch (error) {
        console.error("Sunucuyla iletişimde hata:", error);
    }
}

async function upload() {
    if(bulkInput.checked){
        bulk();
    }
    else{
        uploadImage();
    }
}