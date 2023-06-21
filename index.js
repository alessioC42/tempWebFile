const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const config = JSON.parse(fs.readFileSync("config.json"))


const app = express();
const uploadPath = path.join(__dirname, 'uploads');

// Specify the location and filename for the uploaded files
const storage = multer.diskStorage({
  destination: uploadPath,
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(6).toString('hex');
    cb(null, `${Date.now()}-${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({ storage });

app.use(express.static(uploadPath));
app.use('/bootstrap/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
app.use('/bootstrap/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));
app.use('/qr', express.static(__dirname + '/node_modules/qrcode-generator'));



app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/upload', upload.single('file'), (req, res) => {
  const { file } = req;
  const { minutes } = req.body;

  // Check if a file is selected
  if (!file) {
    return res.status(400).send('Es wurde keine Datei ausgewählt.');
  }

  // Check if a valid time was specified
  if (!Number.isInteger(Number(minutes)) || minutes < config.time.min || minutes > config.time.max) {
    return res.status(400).send('Ungültige Zeitdauer.');
  }

  // Calculate the expiration date of the file
  const expirationDate = new Date(Date.now() + minutes * 60000);

  const downloadCode = String(crypto.randomBytes(3).toString('hex')).toUpperCase();

  // Save metadata about the file (expiration date, download code and original filename)
  const metadata = {
    expirationDate,
    downloadCode,
    originalName: file.originalname,
    fileName: file.filename
  };
  const metadataPath = path.join(uploadPath, file.filename + '.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata));

  res.send(`${downloadCode}`);

  // Set the timer to delete the file after the time period has elapsed
  const timeDiff = expirationDate - Date.now();
  setTimeout(() => {
    fs.unlinkSync(metadataPath);
    fs.unlinkSync(path.join(uploadPath, metadata.fileName));
    console.log(`Document ${metadata.fileName} deleted.`);
  }, timeDiff);
});

app.get('/download/:code', (req, res) => {
  const { code } = req.params;
  const files = fs.readdirSync(uploadPath);

  for (const file of files) {
    if (file.endsWith('.json')) {
      const metadataPath = path.join(uploadPath, file);
      const metadata = JSON.parse(fs.readFileSync(metadataPath));

      if (metadata.downloadCode === code) {
        if (new Date() > new Date(metadata.expirationDate)) {
          fs.unlinkSync(metadataPath);
          fs.unlinkSync(path.join(uploadPath, metadata.fileName));
          return res.status(400).send('Der Download-Code ist abgelaufen.');
        }

        const downloadPath = path.join(uploadPath, metadata.fileName);
        res.download(downloadPath, metadata.originalName);
        return;
      }
    }
  }

  res.status(404).send('File not found.');
});

app.listen(config.port, () => {
  console.log(`server running on port ${config.port}`);
});
