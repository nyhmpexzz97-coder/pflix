const model_nameInput = document.getElementById('model_name');
const model_image = document.getElementById('model_image');
const model_found = document.querySelector('.model_found');

let timer;
model_nameInput.addEventListener('input', ()=>{
    clearTimeout(timer);
    let modelName = model_nameInput.value;
    timer = setTimeout(async () => {
        const response = await fetch('/get-model-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ modelName })
        });
        const data = await response.json();
        
        if(data[0]){
            model_found.classList.add('found');
            model_image.src = data[0].image;
        }
        else{
            if(model_found.classList.contains('found')) model_found.classList.remove('found');
            model_image.src = "https://svgsilh.com/svg/296989.svg";
        }
        
    }, 700);
});

document.getElementById("file").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const customName = model_nameInput.value; // burada istediğin dinamik isim olabilir

    const formData = new FormData();
    formData.append("image", file);
    formData.append("filename", customName); // istediğin isim sunucuya gönderiliyor

    const res = await fetch("/upload", {
        method: "POST",
        body: formData
    });

    const result = await res.json();
    console.log(result);
});


