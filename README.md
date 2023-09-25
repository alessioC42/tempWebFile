# tempWebFile
This code allows you to setup a http file sharing website in your local network
## features
- [x] QR code generation
- [x] limit the time a file is saved on the server
- [ ] file size upload limit
## install instructions

clone repo
```console
git clone https://github.com/alessioC42/tempWebFile.git
cd tempWebFile/
```
install modules
```console
npm install
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
