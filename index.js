var http = require('http');
var formidable = require('formidable');
var fs = require("fs");
var jsonfile = require("jsonfile");


var current_data = {}

const PORT = 8080;
const DIR = __dirname;

http.createServer(function (req, res) {
  if (req.url == '/fileupload') {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
      if(files.filetoupload  == undefined || files.filetoupload.size == 0) {
        res.write("error, no data providet")
        return res.end();
      }
      var fileCode = getRandomCode(100000, 999999);
      var filepath = (files.filetoupload.filepath);
      var newfilepath = DIR + "/storage/" + String(fileCode) + "/" + files.filetoupload.originalFilename;

      fs.mkdirSync(DIR + "/storage/"+fileCode, (err) => {
        if (err) {
          throw err;
        }
      });

      fs.rename(filepath, newfilepath, function (err) {
        if (err) throw err;
          fs.readFile("./res/fileuploaded.html", (err, data)=>{
            data = String(data).replace("######", fileCode)
            res.write(data);
            return res.end();
          })
      });
    });

  } else if (req.url.startsWith("/download/")){
    code = req.url.split("/")[2];
    if (code.length !=6) {
      res.write("error 404 - file not found");
      return res.end();
    } else {
      fs.readdir(DIR+"/storage/", (err, files)=>{
        if ((String(code) in files) == false) {
          res.write("error 404 - file not found");
          return res.end();
        }
      })
  
      res.write(code);
      return res.end();
  
    }

    
  } else {
    res.writeHead(200, {'Content-Type': 'text/html'});
    fs.readFile("./res/index.html", (err, data)=>{
      res.write(data);
      return res.end();
    });
    
  }
}).listen(PORT); 
console.info("running on port "+PORT);



function getRandomCode() {
  data = jsonfile.readFileSync("./storage.json");
    var existing_numbers = Object.keys(data);
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