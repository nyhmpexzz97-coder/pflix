const model_nameInput = document.getElementById('model-name');
const video_nameInput = document.getElementById('video-name');
const urlInput = document.getElementById('url');
const typeInput = document.getElementById('type');

document.querySelector('form').addEventListener('submit', function(event) {event.preventDefault();});

async function uploadVideo() {
    const model_name = model_nameInput.value;
    const video_name = video_nameInput.value;
    const url = urlInput.value;
    const type = typeInput.value;

    try {
        const response = await fetch("/get-model-info", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },

            body: JSON.stringify({
                modelName: model_name
            }),
        });
        const data = await response.json();
        let model_nameTemp = "";
        let ownerID;
        if(data[0]){
            model_nameTemp = data[0].name;
            ownerID = data[0]._id;
        }
        if(!data[0]){
            const modelResponse = await fetch("/add-new-model", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },

                body: JSON.stringify({
                    modelName: model_name
                }),
            });
            const data = await modelResponse.json();
            console.log(data);
            
            model_nameTemp = data.name;
            ownerID = data._id;
        }
        const response2 = await fetch("/api/upload-video", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model_name: model_nameTemp,
                owner: ownerID,
                video_name,
                url,
                type,
                additionals: []
            }),
        });

        const data2 = await response2.json();
        if (response2.ok) {
            alert("Video uploaded successfully!");
            model_nameInput.value = "";
            video_nameInput.value = "";
            urlInput.value = "";
        } else {
            alert("Hata: " + data2.message);
        }
        
    } catch (error) {
        console.error("Sunucuyla iletişimde hata:", error);
    }
}