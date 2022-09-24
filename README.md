# tempWebFile
This code allows you to setup a http file sharing website in your local network
## install instructions
In order to use this script you have to use nodejs version 14 or newer.
```console
git clone https://github.com/alessioC42/tempWebFile.git
cd tempWebFile/
```
install modules
```console
npm install formidable http-auth jsonfile
```
edit settings in config.json
```console
nano config.json
```
## run
to use the port 80 you have to run the script as root

```console
sudo node index.js
```
