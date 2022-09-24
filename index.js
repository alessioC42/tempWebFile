const http = require('http');
const auth = require("http-auth");
const formidable = require('formidable');
const fs = require("fs");
const jsonfile = require("jsonfile");
const os = require("os");
const { exec } = require("child_process");


const MAINPORT = 80;
const ADMINPORT = 8080;

const basic = auth.basic({
  realm: "ADMIN AREA",
  file: __dirname + "/htpasswd",
});

var settings = JSON.parse(fs.readFileSync("config.json"))

var current_data = {};

var STORAGEDIR;
if (settings["storagedir"].endsWith("/")){
  STORAGEDIR = settings["storagedir"];
} else {
  STORAGEDIR = settings["storagedir"] + "/";
}



var mainServer = http.createServer(function (req, res) {
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
      var oldfilepath = (files.filetoupload.filepath);
      var newfilepath = STORAGEDIR + String(fileCode) + "/" + files.filetoupload.originalFilename;

      current_data[String(fileCode)] = {
        "filename": files.filetoupload.originalFilename,
        "filesize": files.filetoupload.size,
        "originaltime": fields.deleteduration,
        "timeremain": fields.deleteduration,
        "remoteIP": req.socket.remoteAddress

      }

      fs.mkdir(STORAGEDIR+fileCode, (err) => {
        if (err) {
          throw err;
        }

        moveFileAcrossDrives(oldfilepath, newfilepath, (_newpath)=> {

          fs.readFile("./res/fileuploaded.html", (_err, data)=>{
            data = String(data).replace("######", fileCode)
            res.write(data);
            return res.end();
          });
        });
      });
    });

  } else if (req.url.startsWith("/getfile/")){
    code = req.url.split("/")[2];
    
    if(current_data[code]) {

      filepath = STORAGEDIR + code + "/" + current_data[code]["filename"];
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
          res.setHeader("Content-Length", current_data[code]["filesize"]);
          res.write(data);
          return res.end();
        }
      });

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
      fs.readFile("./res/error.html", (err, data)=>{
        if (err) {
          throw err;
        }
        return res.end(data);
      });
    }

  } else if (req.url.startsWith("/admin")) {
    fs.readFile("./res/redirecttoadmin.html", (err, data)=>{
      if (err) {
        throw err;
      }
      return res.end(data);
    })
  } else {
    res.writeHead(200, {'Content-Type': 'text/html'});
    fs.readFile("./res/index.html", (err, data)=>{
      if (err) {
        throw err;
      }
      d = String(data)
        .replace('"???filesize???"', settings["max_file_size"])
        .replace("filedurationmin", settings["filedurationmin"])
        .replace("filedurationmax", settings["filedurationmax"]);

      return res.end(d);
    });
  }
});


var adminServer = http.createServer(
  basic.check((req, res) => {
    if (req.url == "/") {
      fs.readFile("res/adminindex.html", (err, data)=>{
        if (err) {
          throw err;
        }
        return res.end(data);
      });

    } else if (req.url.toLowerCase().startsWith("/getsysteminformation")) {
      getSystemStatusInformation((data)=>{
        res.setHeader("Content-Type", "application/json");
        return res.end(JSON.stringify(data));
      })
    } else if (req.url.toLowerCase().startsWith("/getcodesinformation")) {
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify(current_data));
    } else if (req.url.toLowerCase().startsWith("/rebootsystem")) {
      setTimeout(()=>{
        exec("reboot");
      }, 200);
      return res.end("system reboot.");
    } else if (req.url.toLowerCase().startsWith("/setmaxfilesize")) {
      bytes = Number(req.url.split("/").pop());
      settings["max_file_size"] = bytes;
      fs.writeFile("config.json", JSON.stringify(settings), {}, ()=>{
        return res.end(String(settings["max_file_size"]));
      })
    }
  })
);


function main() {
  startMainServer();
  runAdminServer();
  setInterval(()=>{processFiles()}, 60000)
}


function startMainServer(){
  mainServer.listen(MAINPORT, ()=>{
    console.info("main running on port "+MAINPORT);
  });
}


function runAdminServer() {
  adminServer.listen(ADMINPORT, ()=>{
    console.info("admin running on port "+ADMINPORT);
  });
}


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
    fs.rm(STORAGEDIR+todelete[i], { recursive: true }, err => {if(err){throw (err);}});
    delete current_data[todelete[i]];
  }

  jsonfile.writeFile("./current_data.json", current_data);
}


function getSystemStatusInformation(callback) {
  var info = {
    "cpuload" : os.loadavg(),
    "memory" : os.totalmem(),
    "freememory" : os.freemem(),
    "uptime" : os.uptime(),
  }

  exec("df -h -H /", (err, stdout, _stderr)=>{
    if (err){
      throw err;
    }
    var line2words = stdout.split("\n")[1].split(" ");
    let newarr = line2words.filter(a => a !== '')
    let e = {
      "space" : newarr[1],
      "used" : newarr[2],
      "unused" : newarr[3],
      "load" : newarr[4],
      "directory" : newarr[5]
    }

    info["disk"] = e;
    callback(info);
  });
}


function moveFileAcrossDrives(oldpath, newpath, callback) {
  fs.readFile(oldpath, (err, data) =>{
    if(err) throw err; 

    fs.writeFile(newpath, data, (err) => {
      if (err) throw err;

      fs.rm(oldpath, (err) => {
        if (err) throw err;

        callback(newpath)
      });
    });
  });
}


main();
