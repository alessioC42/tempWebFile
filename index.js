var http = require('http');
var formidable = require('formidable');
var fs = require("fs");
var jsonfile = require("jsonfile");

var current_data = {}

const DIR = __dirname;

var PORT = 8080;
if (process.argv.length >= 3) {
  PORT = process.argv[2];
}

var server = http.createServer(function (req, res) {
  if (req.url == '/fileupload') {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
      if(files.filetoupload  == undefined || files.filetoupload.size == 0) {
        fs.readFile("./res/error.html", (_err, data)=>{
          res.write(data);
          return res.end();
        });
      }

      var fileCode = getRandomCode(100000, 999999);
      var filepath = (files.filetoupload.filepath);
      var newfilepath = DIR + "/storage/" + String(fileCode) + "/" + files.filetoupload.originalFilename;

      current_data[String(fileCode)] = {
        "filename": files.filetoupload.originalFilename,
        "filesize": files.filetoupload.size,
        "originaltime": files.filetoupload.size,
        "timeremain": fields.deleteduration,
        "remoteIP": req.socket.remoteAddress

      }

      fs.mkdirSync(DIR + "/storage/"+fileCode, (err) => {
        if (err) {
          throw err;
        }
      });

      fs.rename(filepath, newfilepath, function (err) {
        if (err) throw err;
          fs.readFile("./res/fileuploaded.html", (_err, data)=>{
            data = String(data).replace("######", fileCode)
            res.write(data);
            return res.end();
          });
      });
    });

  } else if (req.url.startsWith("/getfile/")){
    code = req.url.split("/")[2];
    
    if(current_data[code]) {

      filepath = DIR + "/storage/" + code + "/" + current_data[code]["filename"];
      fs.readFile(filepath, (err, data)=> {
        if (err) {
          fs.readFile("./res/error.html", (_err, data)=>{
            res.write(data);
            return res.end();
          });
        } else {
          res.setHeader(
            "Content-Disposition", 'attachment; filename="'+current_data[code]["filename"]+'"',
            );
          res.write(data);
          return res.end();
        }
      })

    } else  {
      fs.readFile("./res/error.html", (_err, data)=>{
        res.write(data);
        return res.end();
      });
    }

  } else if (req.url.startsWith("/download/")) {
    code = req.url.split("/")[2];
    if(current_data[code]) {
      fs.readFile("./res/fileinformation.html", (_err, data)=>{
        data = String(data)
        .replace("######", code)
        .replace("??????b", current_data[code]["filesize"]+"b")
        .replace("file.name", current_data[code]["filename"])

        res.write(data);
        return res.end();
      });
    } else {
      fs.readFile("./res/error.html", (_err, data)=>{
        res.write(data);
        return res.end();
      });
    }

  } else {
    res.writeHead(200, {'Content-Type': 'text/html'});
    fs.readFile("./res/index.html", (err, data)=>{
      res.write(data);
      return res.end();
    });
    
  }
});

server.listen(PORT);

console.info("running on port "+PORT);

setInterval(()=>{processFiles()}, 60000)


function getRandomCode() {
    var existing_numbers = Object.keys(current_data);
    do {
      var randomnumber = random(100000, 999999);
      if (false ==(String(randomnumber) in existing_numbers)) {
        return randomnumber;
      } 
    } while (true);
}


function random(min, max) {  
  return Math.floor(
    Math.random() * (max - min + 1) + min
  )
}

function processFiles(){
  var todelete = [];

  Object.entries(current_data).forEach(([key, value]) => {
    if (value["timeremain"] >1) {
      value["timeremain"] -=1;
    } else if (value["timeremain"] == 1) {
      todelete.push(key);
    }
  });

  for (let i = 0; i < todelete.length; i++) {
    fs.rm("./storage/"+todelete[i], { recursive: true });
    delete current_data[i];
  }

  jsonfile.writeFile("./current_data.json", current_data);
}

