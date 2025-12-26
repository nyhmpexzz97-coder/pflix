const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const axios = require('axios');
const cheerio = require("cheerio");
const B2 = require('backblaze-b2');
const { MongoClient, Int32 } = require('mongodb');
const { env } = require('process');
const M3u8Downloader = require('m3u8-downloader');
const util = require('util');
const execPromise = util.promisify(exec);
const app = express();
const WebSocket = require('ws');
const Fuse = require('fuse.js');
const crypto = require('crypto');
const useragent = require('useragent');
const { log } = require('console');
require('dotenv').config();

app.use((req, res, next) => {
    // 1. IP Adresini Alma (Doğrudan bağlantı için güvenilir yöntem)
    const clientIP = req.connection.remoteAddress;

    // 2. Diğer Bilgileri Alma
    const accessDate = new Date().toISOString();
    const userAgentString = req.get('user-agent');

    // User-Agent'ı ayrıştırma
    const agent = useragent.parse(userAgentString);
    const os = agent.os.toString();
    const device = agent.device.toString();
    const browser = agent.toAgent();

    // 3. Loglama
    const logEntry = `[${accessDate}] IP: ${clientIP} | Cihaz: ${device} | OS: ${os} | Tarayıcı: ${browser} | URL: ${req.url}\n`;

    // access.log dosyasına kaydet
    fs.appendFile('access.log', logEntry, (err) => {
        if (err) {
            console.error('Loglama hatası:', err);
        }
    });

    next(); // İstek işlemeye devam et
});

// Statik dosyalar
app.use(express.static(path.join(__dirname, 'public')));

app.use('/uploads', express.static('uploads'));

// Middleware'ler
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Yükleme dizini
// Dosyaların kaydedileceği klasör: /uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, "uploads/");
    },
    filename: (req, file, cb) => {
      console.log(req.body);
      
        const customName = req.body.filename || "default-name";
        const ext = path.extname(file.originalname);
        cb(null, customName + ext); 
    }
});


const upload = multer({ storage: storage });

app.post("/upload", upload.single("image"), (req, res) => {
    res.json({
        status: "success",
        filePath: "/uploads/" + req.file.filename
    });
});

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => console.log('MongoDB bağlantısı başarılı!'))
    .catch((err) => console.error('MongoDB bağlantı hatası:', err));

const modelsSchema = new mongoose.Schema({
    name: String,
    type: String,
    image: String,
    movie_count: Int32,
});

const Models = mongoose.model('model', modelsSchema);

const videoSchema = new mongoose.Schema({
    model_name: String,
    video_name: String,
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "model",
    },
    preview: String,
    video: String,
    type: String,
    additionals: [String],
});

videoSchema.index({ video_name: 'text', 'owner.name': 'text' });

const Videos = mongoose.model('pflixlite', videoSchema);

const imageSchema = new mongoose.Schema({
    model_name: String,
    collection: String,
    URL: String,
    index: Int32,
});

const Images = mongoose.model('image', imageSchema);

const aiSchema = new mongoose.Schema({
    name: String,
    URL: String,
});

const AIs = mongoose.model('ai', aiSchema);

function formatString(str) {
  // Türkçe karakterleri de düzgün işlemek için küçültme
  str = str.toLowerCase()
    .replace(/[ı]/g, 'i')
    .replace(/[ğ]/g, 'g')
    .replace(/[ü]/g, 'u')
    .replace(/[ş]/g, 's')
    .replace(/[ö]/g, 'o')
    .replace(/[ç]/g, 'c');

  // Noktalama işaretlerini ve özel karakterleri kaldır
  str = str.replace(/[^\w\sğüşıöçĞÜŞİÖÇ]/g, '');

  // Boşlukları alt çizgiyle değiştir
  str = str.replace(/\s+/g, '_');

  // Birden fazla alt çizgiyi tekilleştir
  str = str.replace(/_+/g, '_');

  // Başta ve sonda kalan alt çizgileri kaldır
  str = str.replace(/^_+|_+$/g, '');

  return str;
}



async function controlOwner(model_name) {
  const model = await Models.find({name: model_name});
  if(model[0] != null) return model[0]._id;
  else {
    let imageName = model_name.replace(/ /g, '+');
    try {
        const newModel = new Models({ name: model_name, type: "Professional", movie_count: 0, image: `https://f003.backblazeb2.com/file/pflixbucket/model+images/${imageName}.jpg`  });
        const result = await newModel.save();
        console.log("Model saved to database!");
        return result._id;
    } catch (error) {
        console.error("Model eklenirken hata:", error);
    }
  }
}

async function bulkProcessVideo() {
  fs.readFile('bulkJSON.json', 'utf8', async (err, data) => {
    if (err) {
        console.error("Dosya okunurken hata oluştu:", err);
        return;
    }

    const veri = JSON.parse(data);
    const length = veri.videos.length;
    let count = 0;
    for(const video of veri.videos){
      count++;
      let pieces = video.split(">>>");
      console.log(`Video Uploading: ${pieces[1]} (${count}/${length})`);
      const ownerID = await controlOwner(pieces[2]);
      await processVideo(pieces[0], pieces[1], pieces[2], ownerID, "porn");
      console.log(`Video Upload Finished: ${pieces[1]} (${count}/${length})`);
    }
  });
}

async function processVideo(URL, videoName, model_name, owner, type) {

  const videoFileName = formatString(videoName);

  // Downloading Video
  if(type == "camshow") await downloadFromMega(URL, videoFileName);
  if(URL.includes(".m3u8")) await downloadM3U8(URL, videoFileName);
  else await downloadNormal(URL, videoFileName);

  await uploadToB2(videoFileName, model_name);

  const b2ModelName = model_name.replace(/ /g, "+");
  const videoB2Url = `https://f003.backblazeb2.com/file/pflixbucket/videos/${b2ModelName}/${videoFileName}.mp4`;

  //Save To Database
  await saveToDatabase(videoB2Url, owner, videoName, type);

  //Delete Video
  await deleteFile(videoFileName);

  await createPreviewsBulk(videoB2Url, model_name);
}

// Save to MongoDB
async function saveToDatabase(videoUrl, owner, video_name, type) {
  console.log('Saving to database...');
  let preview_url = videoUrl;
    if(type != "Reels") {
      preview_url = videoUrl.replace('/videos/', '/previews/');
    }
  try {
        const newVideo = new Videos({ owner, video_name, video: videoUrl, type, preview: preview_url, additionals: []  });
        const res = await newVideo.save();
        console.log("Video saved to database!");

    } catch (error) {
        console.error("Video eklenirken hata:", error);
    }
}

async function downloadFromMega(url, outputFilename) {
  try {
    console.log(`İndirme başlıyor: ${url}`);

    // N_m3u8DL-RE ile indirme komutu
    const command = `mega-get '${url}' '${outputFilename}.mp4' --ignore-quota-warn`;


    const { stdout, stderr } = await execPromise(command);

    if (stderr) {
      console.error('Hata oluştu:', stderr);
      return false;
    }

    console.log('İndirme tamamlandı:', stdout);
    return true;

  } catch (error) {
    console.error('İndirme hatası:', error);
    return false;
  }
}

async function downloadM3U8(url, outputFilename) {
  try {
    console.log(`İndirme başlıyor: ${url}`);

    // N_m3u8DL-RE ile indirme komutu
    const command = `N_m3u8DL-RE '${url}' --save-name '${outputFilename}' --auto-select > downloads.log`;


    const { stdout, stderr } = await execPromise(command);

    if (stderr) {
      console.error('Hata oluştu:', stderr);
      return false;
    }

    console.log('İndirme tamamlandı:', stdout);
    return true;

  } catch (error) {
    console.error('İndirme hatası:', error);
    return false;
  }
}

async function downloadNormal(url, outputFilename) {
  try {
    console.log(`İndirme başlıyor: ${url}`);

    // Normal indirme komutu
    const command = `curl --globoff -o '${outputFilename}.mp4' '${url}'`;


    const { stdout, stderr } = await execPromise(command);

    if (stderr) {
      console.error('Hata oluştu:', stderr);
      return false;
    }

    console.log('İndirme tamamlandı:', stdout);
    return true;

  } catch (error) {
    console.error('İndirme hatası:', error);
    return false;
  }
}

// Upload to Backblaze
async function uploadToB2(outputFilename, model_name) {
  try {
    console.log(`Yükleme başlıyor: ${outputFilename}`);

    // N_m3u8DL-RE ile indirme komutu
    let command = `rclone copy '${outputFilename}.mp4' 'B2:pflixbucket/videos/${model_name}' -P`;
        if(model_name == "Instagram Reels") {
          command = `rclone copy 'uploads/${outputFilename}.mp4' 'B2:pflixbucket/videos/Instagram Reels' -P`;
        }

    const { stdout, stderr } = await execPromise(command);

    if (stderr) {
      console.error('Hata oluştu:', stderr);
      return false;
    }

    console.log('Yükleme tamamlandı:', stdout);
    return true;

  } catch (error) {
    console.error('Yükleme hatası:', error);
    return false;
  }
}

async function deleteFile(outputFilename) {
  try {

    // Normal indirme komutu
    const command = `rm '${outputFilename}.mp4'`;


    const { stdout, stderr } = await execPromise(command);

    if (stderr) {
      console.error('Hata oluştu:', stderr);
      return false;
    }

    return true;

  } catch (error) {
    console.error('Silme hatası:', error);
    return false;
  }
}



// Upload to Backblaze
async function createPreviewsBulk(video_url, model_name) {
  try {
    console.log(`Önizlemeler Oluşturuluyor!`);

    const command = `./preview_maker.sh ${video_url} '${model_name}'`;


    const { stdout, stderr } = await execPromise(command);

    if (stderr) {
      console.error('Hata oluştu:', stderr);
      return false;
    }

    console.log('İşlem tamamlandı:', stdout);
    return true;

  } catch (error) {
    console.error('Yükleme hatası:', error);
    return false;
  }
}

async function downloadImage(url, index) {
  try {
    console.log(`İndirme başlıyor: ${url}`);

    // Normal indirme komutu
    const command = `curl -o "${index}.jpg" "${url}"`;
    

    const { stdout, stderr } = await execPromise(command);

    if (stderr) {
      console.error('Hata oluştu:', stderr);
      return false;
    }

    console.log('İndirme tamamlandı:', stdout);
    return true;

  } catch (error) {
    console.error('İndirme hatası:', error);
    return false;
  }
}

async function uploadImageToB2(model_name, collection, index) {
  try {
    console.log(`Yükleme başlıyor: ${index}.jpg`);

    const b2ModelName = model_name.replace(/ /g, "+");
    const b2Collection = collection.replace(/ /g, "+");

    // N_m3u8DL-RE ile indirme komutu
    let command = `rclone copy '${index}.jpg' 'B2:pflixbucket/images/${b2ModelName}/${b2Collection}' -P`;
    console.log(command);
    
    const { stdout, stderr } = await execPromise(command);

    if (stderr) {
      console.error('Hata oluştu:', stderr);
      return false;
    }

    console.log('Yükleme tamamlandı:', stdout);
    return true;

  } catch (error) {
    console.error('Yükleme hatası:', error);
    return false;
  }
}

async function processImage(model_name, collection, url, index) {
  console.log("dsadsa");
  
  // Downloading Image
  await downloadImage(url, index);

  await uploadImageToB2(model_name, collection, index);

  const b2ModelName = model_name.replace(/ /g, "+");
  const b2Collection = collection.replace(/ /g, "+");
  const imageB2Url = `https://f003.backblazeb2.com/file/pflixbucket/images/${b2ModelName}/${b2Collection}/${index}.jpg`;

  //Save To Database
  await saveImageToDatabase(model_name, collection, imageB2Url, index);

  //Delete Video
  await deleteImage(index);
}

async function saveImageToDatabase(model_name, collection, imageB2Url, index) {
  console.log('Saving to database...');
  try {
        const newImage = new Images({ model_name, collection, URL: imageB2Url, index  });
        const res = await newImage.save();
        console.log("Video saved to database!");

    } catch (error) {
        console.error("Video eklenirken hata:", error);
    }
}

async function deleteImage(index) {
  try {

    // Normal indirme komutu
    const command = `rm '${index}.jpg'`;


    const { stdout, stderr } = await execPromise(command);

    if (stderr) {
      console.error('Hata oluştu:', stderr);
      return false;
    }

    return true;

  } catch (error) {
    console.error('Silme hatası:', error);
    return false;
  }
}

let login = false;

app.get('/', (req, res) => {
    console.log("Mevcut Login Durumu:", login); // Terminalden burayı izleyin
    
    if (login === true) {
        console.log("Yönlendiriliyor: /videos/1");
        return res.redirect('/videos/1');
    } else {
        console.log("Login sayfası gönderiliyor...");
        return res.sendFile(path.join(__dirname, 'public', 'login.html'));
    }
});

app.get('/videos', (req, res) => {
    res.redirect('/videos/1');
});

app.get('/videos/:page', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'videos.html'));
});

app.get('/search/:parameter/:page', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'videos.html'));
});

app.get('/images', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'images.html'));
});

app.get('/uploadImages', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'uploadImages.html'));
});

app.get('/video/:videoId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'video-page.html'));
});

app.get('/model/:modelName', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'model-page.html'));
});

app.get('/images/:modelName', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'images-model.html'));
});

app.get('/images/:modelName/:collection', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'images-model-collection.html'));
});

app.get('/images/:modelName/:collection/:slideshow', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'images-slideshow.html'));
});

app.get('/slideshow/:modelName', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'images-slideshow-plus.html'));
});

app.get('/slideshow-general', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'slideshow-general.html'));
});

app.get('/ai', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'ai-general.html'));
});

app.get('/ai/:modelName', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'ai.html'));
});

app.get('/upload', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'upload_video.html'));
});

app.get('/uploadReels', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'uploadReels.html'));
});

app.get('/bulk-list', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'bulk_list.html'));
});

app.get('/cinema', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cinema.html'));
});

app.get('/live', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'live.html'));
});

app.get('/multilive', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'live_multi.html'));
});

app.get('/multilive2', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'live_multi2.html'));
});

app.get('/live/:modelName', async (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'live.html'));
});

app.post('/check-password', async (req, res) => {
    const { password } = req.body;
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    if(hash == process.env.PASSWORD){
      login = true;
      return res.json({ success: true, redirectUrl: '/videos/1' });
    } else {
        return res.status(401).json({ success: false, message: "Hatalı Şifre" });
    }
});

app.post("/fetch-image", async (req, res) => {
    try {
        const imageUrl = req.body.url;

        const response = await axios.get(imageUrl, {
            responseType: "arraybuffer"
        });

        const fileName = "temp_" + Date.now() + ".jpg";
        const filePath = path.join(__dirname, "uploads", fileName);

        fs.writeFileSync(filePath, response.data);

        res.json({ localPath: "/uploads/" + fileName });
    } catch (err) {
        console.error(err);
        res.status(400).json({ error: "Resim indirilemedi" });
    }
});

// kırpılmış dosyanın kaydedileceği alan
const croppedStorage = multer.diskStorage({
    destination: "./uploads",
    filename: (req, file, cb) => {
        cb(null, "cropped_" + Date.now() + ".png");
    }
});

const uploadCropped = multer({ storage: croppedStorage });

app.post("/upload-cropped", uploadCropped.single("file"), (req, res) => {
    res.json({
        success: true,
        path: "/uploads/" + req.file.filename
    });
});

app.post('/add-new-model', async (req, res) => {
    const { modelName } = req.body;
    let imageName = modelName.replace(/ /g, '+');
    if (!modelName) {
        return res.status(400).json({ message: 'Parameter missing!' });
    }
    try {
        const newModel = new Models({ name: modelName, type: "Professional", movie_count: 0, image: `https://f003.backblazeb2.com/file/pflixbucket/model+images/${imageName}.jpg`  });
        const result = await newModel.save();
        console.log("Model saved to database!");
        return res.json(result);

    } catch (error) {
        console.error("Model eklenirken hata:", error);
    }
});

app.post('/get-model-info', async (req, res) => {
    const { modelName } = req.body;

    if (!modelName) {
        return res.status(400).json({ message: 'Parameter missing!' });
    }
    
    try {
        const model = await Models.find({
          "name": modelName
        });
        
        res.json(model);
    } catch (error) {
        res.status(500).json({ message: 'Bir hata oluştu.', error });
    }
});

app.post('/get-model-videos', async (req, res) => {
    const { modelName } = req.body;

    if (!modelName) {
        return res.status(400).json({ message: 'Parameter missing!' });
    }
    
    try {
        const videos = await Videos.find({"model_name": modelName}).sort({ "video_name": 1 });
        res.status(200).json({ videos});
    } catch (error) {
        console.error('API Hatası:', error);
        res.status(500).json({ error: 'Kullanıcıları getirirken bir hata oluştu.' });
    }
});

app.post('/get-model-collection-images', async (req, res) => {
    const { modelName, collection } = req.body;

    if (!modelName || !collection) {
        return res.status(400).json({ message: 'Parameter missing!' });
    }
    
    try {
        const image = await Images.find({
          "model_name": modelName,
          "collection": collection
        }).sort({index: 1});
        
        res.json({ exists: !!image, images: image});
    } catch (error) {
        res.status(500).json({ message: 'Bir hata oluştu.', error });
    }
});

app.post('/get-model-all-images', async (req, res) => {
    const { modelName } = req.body;

    if (!modelName) {
        return res.status(400).json({ message: 'Parameter missing!' });
    }
    
    try {
        const image = await Images.aggregate([
          { 
            $match: { "model_name": modelName } // Belirtilen model_name'a göre filtreleme
          },
          {
            $sort: { "collection": 1 }  // Koleksiyonlar sıralanacak
          },
          {
            $group: {
              _id: "$collection", // Koleksiyona göre gruplama
              images: { $push: "$$ROOT" } // Her koleksiyon içindeki belgeleri 'images' dizisine alıyoruz
            }
          },
          {
            $project: {
              _id: 1,
              images: {
                $sortArray: {
                  input: "$images", 
                  sortBy: { "index": 1 } // Her koleksiyon içindeki index'leri küçükten büyüğe sıralıyoruz
                }
              }
            }
          },
          {
            $unwind: "$images" // Her koleksiyonun içerisindeki resimleri açıyoruz
          },
          {
            $replaceRoot: { newRoot: "$images" } // Resimleri düzleştiriyoruz
          },
          {
            $sort: { "collection": 1, "index": 1 } // Son olarak, koleksiyonlar ve index'lere göre sıralama
          }
        ]);
        
        
        res.json({ exists: !!image, images: image});
    } catch (error) {
        res.status(500).json({ message: 'Bir hata oluştu.', error });
    }
});

app.get('/get-all-images', async (req, res) => {
    try {
      const image = await Images.find();
      const shuffledImages = image.sort(() => Math.random() - 0.5); // Rastgele sıralama
      res.json({ exists: !!image, images: shuffledImages });
    } catch (error) {
      res.status(500).json({ message: "Bir hata oluştu.", error });
    }
});

app.post('/get-model-collections', async (req, res) => {
    const { modelName } = req.body;

    if (!modelName) {
        return res.status(400).json({ message: 'Parameter missing!' });
    }

    try {
      const result = await Images.aggregate([
        { $match: { model_name: modelName } },
        { $group: { _id: "$collection", colors: { $addToSet: "$URL" } } },
        { $project: {
          collection: "$_id",
          URL: {
            $arrayElemAt: [
              "$colors",
              { $floor: { $multiply: [{ $rand: {} }, { $size: "$colors" }] } }
            ]
          }
        }}
      ]);
      res.json(result)

    } catch (error) {
      res.status(500).json({ message: "Bir hata oluştu.", error });
    }

});

app.get('/get-models-names', async (req, res) => {
    try {
      const images = await Images.aggregate([
        // 1. Adım: Marka adlarını benzersiz şekilde grupla
        {
          $group: {
            _id: "$model_name" // model_name (marka) ile grupla
          }
        },
        // 2. Adım: Markaları A'dan Z'ye sırala
        {
          $sort: {
            _id: 1 // _id (marka adı) ile artan sıraya göre (A'dan Z'ye) sıralama
          }
        },
        // 3. Adım: Sadece marka adını döndür
        {
          $project: {
            _id: 0, // _id'yi çıkar
            name: "$_id" // Marka adını 'brand' olarak döndür
          }
        }
      ]);

      res.json({ images });
    } catch (error) {
      res.status(500).json({ message: "Bir hata oluştu.", error });
    }
});

app.get('/get-ai-models', async (req, res) => {
    try {
      const ais = await AIs.distinct('name');

      res.json({ ais });
    } catch (error) {
      res.status(500).json({ message: "Bir hata oluştu.", error });
    }
});

app.post('/get-ai-content', async (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'Parameter missing!' });
    }
    
    try {
        const ai = await AIs.find({
          "name": name
        }).sort({index: 1});
        
        res.json({ exists: !!name, content: ai});
    } catch (error) {
        res.status(500).json({ message: 'Bir hata oluştu.', error });
    }
});

app.post('/api/upload-image', async (req, res) =>{
  const { model_name, collection, url, index} = req.body;
  console.log("weeeeee");
  
  try {
        await processImage(model_name, collection, url, index);
        res.status(201).json({ message: "Resim başarıyla eklendi" });
    } catch (error) {
        console.error("Resim eklenirken hata:", error);
        res.status(500).json({ message: "Bir hata oluştu", error });
    }
});

app.post('/get-collection-index', async (req, res) =>{
  const { modelName, collection} = req.body;
  try {
    const result = await Images.find({ model_name: modelName, collection: collection })
      .sort({ index: -1 })
      .limit(1);

    if (result.length > 0) {
      res.json(result[0].index);
    } else {
      res.json(0);
    }
  } catch (error) {
    console.error("Sorgu sırasında hata oluştu:", error);
  }
});

app.post('/bulk-image-links', async (req, res) =>{
  const { url} = req.body;
  try {
    let links = [];
    const { data } = await axios.get(url);
    const $ = cheerio.load(data);
    const elements = $('.thumbwook'); 
    elements.each((index, element) => {
      const link = $(element).find('a').attr('href'); // <a> etiketinin href değerini al
      links.push(link);
    });
    
    res.json(links);
  } catch (error) {
    console.error('Hata:', error);
  }
});

app.post('/bulk-image-upload', async (req, res) =>{
  const { model_name, collection, data } = req.body;
  for (let index = 0; index < data.length; index++) {
    const url = data[index];  // URL'yi al
    try {
      await processImage(model_name, collection, url, (index+1));  // Asenkron işlemi bekle
      if (index === data.length - 1) {
        res.status(201).json({ message: "Resimler başarıyla eklendi" });
      }
    } catch (error) {
      console.error("Resim eklenirken hata:", error);
      res.status(500).json({ message: "Bir hata oluştu", error });
      break; // Hata durumunda döngüyü sonlandırabilirsin
    }
  }
});

app.get('/bulk', async (req, res) => {
    await bulkProcessVideo();
});

app.get('/previewBulk', async (req, res) => {
    await createPreviewsBulk();
});

app.post('/api/video-update-additionals', async (req, res) => {
  const { id, additional} = req.body;
  console.log(id, additional);
  
    try {
        const updatedVideo = await Videos.findByIdAndUpdate(
            id, // 1. Belgeyi bulmak için ID
            {
                // 2. Güncelleme Operatörü: additionals dizisine $push ile yeni eleman ekle
                $push: {
                    additionals: additional 
                }
            },
            { 
                new: true, // 3. Seçenek: Güncelleme sonrası belgenin yeni halini döndürür. (Çok önemli!)
            }
        );
        res.status(200).json({ updatedVideo});
    } catch (error) {
        console.error('API Hatası:', error);
        res.status(500).json({ error: 'Kullanıcıları getirirken bir hata oluştu.' });
    }
});

app.get('/api/video-info/:id', async (req, res) => {
  const videoID = req.params.id;
    try {
        const video = await Videos.findOne({ _id: videoID}).populate("owner");
        res.status(200).json({ video});
    } catch (error) {
        console.error('API Hatası:', error);
        res.status(500).json({ error: 'Kullanıcıları getirirken bir hata oluştu.' });
    }
});

app.post('/api/upload-video', async (req, res) =>{
  const { model_name, owner, video_name, url, type} = req.body;
  await downloadM3U8Test(url, video_name)
  /*
  try {
        await processVideo(url, video_name, model_name, owner, type);
        res.status(201).json({ message: "Video başarıyla eklendi" });
    } catch (error) {
        console.error("Video eklenirken hata:", error);
        res.status(500).json({ message: "Bir hata oluştu", error });
    } */
});

app.get('/api/videos', async (req, res) => {
    try {
        const videos = await Videos.find().sort({ "model_name": 1, "video_name": 1 });;
        res.status(200).json({ videos});
    } catch (error) {
        console.error('API Hatası:', error);
        res.status(500).json({ error: 'Kullanıcıları getirirken bir hata oluştu.' });
    }
});

let allVideos = [];

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

app.post('/api/videos/page', async (req, res) => {
  const { pageNumber, searchTerm } = req.body;
    if(allVideos.length == 0){
      try {
          const videos = await Videos.find().populate("owner");
          allVideos = shuffle(videos);
      } catch (error) {
          console.error('API Hatası:', error);
          res.status(500).json({ error: 'Kullanıcıları getirirken bir hata oluştu.' });
      }
    }
    const count = 24;
    const start = (pageNumber - 1) * count;
    const end = start + count;
    
    res.json({videoCount: allVideos.length, videos: allVideos.slice(start, end)});
});

app.post('/api/search/page', async (req, res) => {
  const { pageNumber, searchTerm } = req.body; // Tek bir parametre alıyoruz: searchTerm
  const count = 24;

  try {
    let filter = {};

    // `searchTerm` parametresinin içeriğine göre, $or kullanarak filtreleme yapalım
    if (searchTerm) {
      // RegExp nesnesi oluşturuyoruz ve bu nesneyi kullanıyoruz
      const searchRegex = new RegExp(searchTerm, 'i'); // 'i' seçeneği ile büyük/küçük harf duyarsız arama

      filter = {
        $or: [
          { name: { $regex: searchRegex } },  // video adı üzerinde arama
          { owner: { $in: await Models.find({ name: { $regex: searchRegex } }).distinct('_id') } }  // owner.name üzerinden arama
        ]
      };
    }

    // Videoları filtreliyoruz ve populate ile owner bilgilerini de alıyoruz
    const videos = await Videos.find(filter)
      .populate("owner", "name")  // Sahip bilgilerini sadece name ile getirelim
      .exec();

    // Tüm videoları karıştırıyoruz
    allVideos = shuffle(videos);

    const start = (pageNumber - 1) * count;
    const end = start + count;

    // Sayfalama işlemi ve sonuç döndürme
    res.json({ videoCount: allVideos.length, videos: allVideos.slice(start, end) });

  } catch (error) {
    console.error('API Hatası:', error);
    res.status(500).json({ error: 'Videoları getirirken bir hata oluştu.' });
  }
});

app.get('/search', async (req, res) => {
    try {
        const { q } = req.query; // Arama çubuğundan gelen veri: ?q=videoismi

        if (!q) {
            return res.status(400).json({ message: "Lütfen bir arama terimi girin." });
        }

        // 1. ADIM: Veritabanından verileri çek ve 'owner' alanını doldur.
        // Veri setin küçük olduğu için tümünü çekmek şimdilik sorun olmaz.
        // .lean() kullanmak dönen veriyi saf JSON yapar, performansı artırır.
        const allVideos = await Videos.find()
            .populate('owner') // 'model' tablosundaki veriyi buraya gömer
            .lean(); 

        // 2. ADIM: Fuse.js Ayarları
        const options = {
            includeScore: true, // Sonuçların ne kadar uyumlu olduğunu skorlar
            // Aradığımız alanlar. 'owner.name' diyerek populate ettiğimiz iç içe objeye erişiyoruz.
            keys: [
                // Owner ağırlığını çok yüksek tutuyoruz (0.8)
                { name: 'owner.name', weight: 0.8 }, 
                // Video ismi daha düşük öncelikli (0.2)
                { name: 'video_name', weight: 0.2 }  
            ],
            // Diğer ayarlar...
            threshold: 0.3, // 0.0 = Tam eşleşme, 1.0 = Her şeyi eşleştir. 0.3-0.4 yazım hataları için idealdir.
            ignoreLocation: true, // Kelimenin metnin neresinde olduğu önemli değil.
            minMatchCharLength: 2 // En az 2 karakter eşleşmeli
        };

        // 3. ADIM: Arama işlemini başlat
        const fuse = new Fuse(allVideos, options);
        const result = fuse.search(q);

        // 4. ADIM: Fuse.js veriyi { item: {...}, refIndex: 0 } formatında döndürür.
        // Biz sadece 'item' yani video verisini istiyoruz.
        const finalResults = result.map(r => r.item);

        res.json(finalResults);

    } catch (error) {
        console.error("Arama hatası:", error);
        res.status(500).send("Sunucu hatası");
    }
});

app.get('/api/get-5-vids', async (req, res) => {
    let result = [];
    for (let i = 0; i < 5; i++) {
      const randomIndex = Math.floor(Math.random() * allVideos.length);
      result.push(allVideos[randomIndex]); 
    }
    
    res.json({result});
});


app.get('/forPreviews', async (req, res) => {
    const videos = await Videos.find({"model_name": "Angel (Little Angel)"}).sort({ "video_name": 1 });;
    for (const video of videos) {
      await createPreviewsBulk(video.video);
    }
});

app.get('/createPreviewSection', async (req, res) => {
    const videos = await Videos.find().sort({"model_name": 1, "video_name": 1 });;
    for (const video of videos) {
      const preview_url = video.video.replace('/videos/', '/previews/');
      console.log(preview_url);

      const result = await Videos.updateOne({_id: video._id}, {$set: {preview: preview_url}});
    }
});

app.post('/cinema-check-video', async (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'İsim gerekli.' });
    }

    try {
        // Case insensitive regex arama
        const regex = new RegExp(name, 'i'); // 'i' flag case insensitive yapar

        const video = await Videos.findOne({
          "video_name": { $regex: regex }
        });
        res.json({ exists: !!video, video: video});
    } catch (error) {
        res.status(500).json({ message: 'Bir hata oluştu.', error });
    }
});

app.get('/cinema-random-videos', async (req, res) => {
    try {
        const randomVideos = await Videos.aggregate([
            { $sample: { size: 4 } } // 4 rastgele kayıt getir
        ]);

        res.json(randomVideos);
    } catch (error) {
        console.error("Hata:", error);
        res.status(500).json({ message: "Bir hata oluştu" });
    }
});

//CHATURBATE

async function getM3U8Url(pageUrl) {
    try {
        const { data } = await axios.get(pageUrl); // Sayfanın HTML içeriğini al
        const $ = cheerio.load(data);
        const htmlContent = $.html(); // Tüm HTML içeriğini al

        // .m3u8 içeren URL'yi yakala
        const urlMatch = htmlContent.match(/https.*?playlist\.m3u8/);

        if (urlMatch) {
            const encodedUrl = urlMatch[0];

            // Unicode kaçış karakterlerini çözüp \u002D yerine - koy
            const decodedUrl = encodedUrl.replace(/\\u([\dA-F]{4})/gi, (match, grp) =>
                String.fromCharCode(parseInt(grp, 16))
            ).replace(/\\u002D/g, "-");

            return decodedUrl;
        } else {
            console.log("M3U8 URL bulunamadı.");
            return null;
        }
    } catch (error) {
        console.error("Hata:", error.message);
    }
}

app.get("/get-m3u8/:modelName", async (req, res) => {
    const model_name = req.params.modelName;
    const url = "https://chaturbate.com/" + model_name + "/";


    const m3u8URL = await getM3U8Url(url);


    res.json(m3u8URL);
});

app.get('/proxy-request/chaturbate-info/:modelName', async (req, res) => {
    const model_name = req.params.modelName;
    const url = "https://chaturbate.com/api/biocontext/" + model_name + "/?";
    try {
        const response = await axios.get(url);

        res.json(response.data); // Gelen veriyi yanıt olarak döndür
      } catch (error) {
        res.status(500).json({ error: 'Veri çekme hatası: ' + error.message });
      }
});

let otherRooms = [];

async function findOtherRooms(pageUrl) {
    try {
        // JSON dosyasını oku ve names dizisini al
        const jsonData = JSON.parse(fs.readFileSync("camgirls.json", "utf8"));
        const names = jsonData.names; // ["john", "alice", "bob", ...]

        const response = await axios.get(pageUrl);

        const data = response.data.rooms;

        for (const element of data) {
            for (const name of names) {
                if (element.username === name) {
                    const user = { username: name, image: element.img, age: element.display_age };
                    otherRooms.push(user);
                    break;
                }
            }
        }
    } catch (error) {
        console.error("Hata:", error.message);
    }
}

app.get("/get-m3u8-multi", async (req, res) => {
    otherRooms = [];
    await findOtherRooms("https://chaturbate.com/api/ts/roomlist/room-list/?limit=100&offset=0");
    await findOtherRooms("https://chaturbate.com/api/ts/roomlist/room-list/?limit=100&offset=100");
    await findOtherRooms("https://chaturbate.com/api/ts/roomlist/room-list/?limit=100&offset=200");

    res.json(otherRooms);
});

app.get("/add-new-streamer/:modelName", async (req, res) => {
    try {
    const modelName = req.params.modelName;
    const dataPath = path.join(__dirname, 'camgirls.json');
    // 1. JSON dosyasını oku
    const rawData = fs.readFileSync(dataPath);
    const data = JSON.parse(rawData);

    // 2. Yeni ismi sıralı şekilde ekle
    addNameInOrder(data.names, modelName);

    // 3. Güncellenmiş veriyi dosyaya yaz
    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));

    res.status(200).json({ success: true, data: data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function addNameInOrder(namesArray, newName) {
  if (namesArray.some(name => name.toLowerCase() === newName.toLowerCase())) {
    return;
  }
  // Yeni ismi ekle
  namesArray.push(newName);

  // Case-insensitive sıralama yap
  namesArray.sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
}

app.get("/getNames", async (req, res) => {
    const jsonData = JSON.parse(fs.readFileSync("camgirls.json", "utf8"));
    const names = jsonData.names;

    res.json(names);
});

// Video yükleme işlemi
app.post('/uploadReels', upload.single('video'), async (req, res) => {
    if (!req.file) {
        return res.send('Dosya yüklenmedi!');
    }
    const result = await uploadToB2(req.file.filename.replace('.mp4', ''), 'Reddit');
    const result2 = await saveToDatabase(`https://f003.backblazeb2.com/file/pflixbucket/videos/Reddit/${req.file.filename}`, 'Instagram Reels', req.file.originalname, 'Reels');
    res.send('Video başarıyla yüklendi! Dosya: ' + req.file.originalname);
});

async function updateVideoLinks() {
  try {
    console.log("here");
    
    const images = await Images.find();

    for (const image of images) {

      const newPreview = image.URL.replace(
        /^https:\/\/f\d+\.backblazeb2\.com\/file\/[^/]+/,
        'https://pflixbucket.s3.eu-central-003.backblazeb2.com'
      );
      image.URL = newPreview;
      await image.save();
      console.log(newPreview);
      
    }
    console.log('Tüm videolar güncellendi.');
  } catch (error) {
    console.error('Hata oluştu:', error);
  }
}

//updateVideoLinks();

async function updateVideoOwners() {
  try {
    const model_name_Models = "mari__anna";
    const model_name_Videos = "mari__anna";
    
    const model = await Models.findAll({ name: model_name_Models });
    if(!model){
      console.log("Error");
      return;
    }

    const videos = await Videos.find({model_name: model_name_Videos});

    for (const video of videos) {

      if (model) {
        // User bulunduysa, Video sahibini güncelliyoruz
        video.owner = model._id;

        // `ownerName` alanını kaldırıyoruz, çünkü artık `owner` ObjectId'yi tutacak
        video.model_name = undefined;

        // Videoyu kaydediyoruz
        await video.save();
        console.log(`Video: ${video.title} güncellendi, owner ID: ${model._id}`);
      } else {
        console.log(`Kullanıcı bulunamadı: ${ownerName}`);
      }
    }
    console.log('Tüm videolar güncellendi.');
  } catch (error) {
    console.error('Hata oluştu:', error);
  }
}

//updateVideoOwners();

async function updateModelImages() {
  let models = [];
  try {
        const model = await Models.find();
        
        models = model;
        
    } catch (error) {
        res.status(500).json({ message: 'Bir hata oluştu.', error });
    }
  
    for (const element of models) {
      let str = element.image;
      let parts = str.split('.');
      parts[parts.length - 1] = "jpg";
      let newStr = parts.join('.');
      
      console.log(newStr);
      await Models.updateOne(
        { _id: element._id },
        { $set: { image: newStr } }
      );
    }
}
//updateModelImages();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor...`);
    

});