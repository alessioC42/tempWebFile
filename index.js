const express = require('express');
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const config = JSON.parse(fs.readFileSync("config.json"))


const app = express();
const uploadPath = path.join(__dirname, 'uploads');

// Spezifiziere den Speicherort und den Dateinamen für die hochgeladenen Dateien
const storage = multer.diskStorage({
  destination: uploadPath,
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(6).toString('hex');
    cb(null, `${Date.now()}-${uniqueSuffix}-${file.originalname}`);
  }
});

// Konfiguriere Multer für den Datei-Upload
const upload = multer({ storage });

app.use(express.static(uploadPath));
app.use('/bootstrap/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
app.use('/bootstrap/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));
app.use('/qr', express.static(__dirname + '/node_modules/qrcode-generator'));



// Startseite anzeigen
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Datei hochladen
app.post('/upload', upload.single('file'), (req, res) => {
  const { file } = req;
  const { minutes } = req.body;

  // Prüfe, ob eine Datei ausgewählt wurde
  if (!file) {
    return res.status(400).send('Es wurde keine Datei ausgewählt.');
  }

  // Prüfe, ob eine gültige Zeit angegeben wurde
  if (!Number.isInteger(Number(minutes)) || minutes < config.time.min || minutes > config.time.max) {
    return res.status(400).send('Ungültige Zeitdauer.');
  }

  // Berechne das Ablaufdatum der Datei
  const expirationDate = new Date(Date.now() + minutes * 60000);

  // Generiere den Download-Code
  const downloadCode = String(crypto.randomBytes(3).toString('hex')).toUpperCase();

  // Speichere Metadaten zur Datei (Ablaufdatum, Download-Code und ursprünglicher Dateiname)
  const metadata = {
    expirationDate,
    downloadCode,
    originalName: file.originalname,
    fileName: file.filename
  };

  // Speichere die Metadaten in einer Datei
  const metadataPath = path.join(uploadPath, file.filename + '.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata));

  res.send(`${downloadCode}`);

  // Setze den Timer zum Löschen der Datei nach Ablauf der Zeitdauer
  const timeDiff = expirationDate - Date.now();
  setTimeout(() => {
    fs.unlinkSync(metadataPath);
    fs.unlinkSync(path.join(uploadPath, metadata.fileName));
    console.log(`Document ${metadata.fileName} deleted.`);
  }, timeDiff);
});

// Datei herunterladen
app.get('/download/:code', (req, res) => {
  const { code } = req.params;
  const files = fs.readdirSync(uploadPath);

  // Durchsuche die Metadatendateien nach dem angegebenen Code
  for (const file of files) {
    if (file.endsWith('.json')) {
      const metadataPath = path.join(uploadPath, file);
      const metadata = JSON.parse(fs.readFileSync(metadataPath));

      if (metadata.downloadCode === code) {
        // Prüfe, ob die Datei noch gültig ist
        if (new Date() > new Date(metadata.expirationDate)) {
          // Lösche abgelaufene Datei und Metadaten
          fs.unlinkSync(metadataPath);
          fs.unlinkSync(path.join(uploadPath, metadata.fileName));
          return res.status(400).send('Der Download-Code ist abgelaufen.');
        }

        // Sende die Datei an den Benutzer und benenne sie um
        const downloadPath = path.join(uploadPath, metadata.fileName);
        res.download(downloadPath, metadata.originalName);
        return;
      }
    }
  }

  // Falls kein passender Code gefunden wurde
  res.status(404).send('Datei nicht gefunden.');
});

// Server starten
app.listen(3000, () => {
  console.log('Server läuft auf Port 3000');
});
