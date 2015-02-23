var express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    noble = require('noble');

app.use(function (req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', "http://"+req.headers.host+':8000');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
});

var server = http.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('\nApp listening at http://%s:%s. \n', host, port);
});

var rhynoConnectionUuid = '6e400001b5a3f393e0a9e50e24dcca9e',
    rhynoPeripheralUuid = '60339882cd844530b82dadc3a303a196',
    rhynoActionCharacteristicUuid = '6e400003b5a3f393e0a9e50e24dcca9e';

var ioClientConnected = false;
var socket;
io.on('connection', function(socket){
  console.log('Connected to 2048 Client via Socket.io. \n');
  ioClientConnected = true;
  socket = socket;
  socket.on('disconnect', function(){
    console.log('2048 Client disconnected. \n');
    ioClientConnected = false;
  });
});

noble.on('stateChange', function(state) {
  if (state === 'poweredOn') {
    console.log('Started scanning for peripheral... \n');
    noble.startScanning([rhynoConnectionUuid], false);
  } else {
    console.log('Not scanning for peripheral... \n');
    noble.stopScanning();
  }
});

noble.on('discover', function(peripheral) {
  console.log('Discovered peripheral: ' + peripheral.advertisement + '\n');
  if (peripheral.uuid === rhynoPeripheralUuid) {
    noble.stopScanning();

    peripheral.on('disconnect', function() {
      process.exit(0);
      noble.startScanning([rhynoConnectionUuid], false);
    });

    peripheral.connect(function(err) {
      console.log('Connected to peripheral with uuid: ', peripheral.uuid, '\n');
      peripheral.discoverAllServicesAndCharacteristics(function(err, services, characteristics) {
        characteristics.forEach(function(characteristic) {
          if (characteristic.uuid == rhynoActionCharacteristicUuid) {
            console.log('Found Action Characteristic. \n');
            characteristic.on('read', function(data, isNotification) {
              if (data.length === 1 && ioClientConnected) {
                var result = data.readUInt8(0);
                switch (result) {
                  case 1:
                    console.log('Received Action from Rhyno: UP. \n');
                    io.emit('action', 'up');
                    break;
                  case 2: 
                    console.log('Received Action from Rhyno: DOWN. \n');
                    io.emit('action', 'down');
                    break;
                  case 3: 
                    console.log('Received Action from Rhyno: LEFT. \n');
                    io.emit('action', 'left');
                    break; 
                  case 4:
                    console.log('Received Action from Rhyno: RIGHT. \n');
                    io.emit('action', 'right');
                    break;
                  case 5:
                    console.log('Received Action from Rhyno: ZOOM IN. \n');
                    io.emit('action', 'zoom in');
                    break;
                  case 6:
                    console.log('Received Action from Rhyno: ZOOM OUT. \n');
                    io.emit('action', 'zoom out');
                    break;
                  default:
                    console.log('Data received from Rhyno is not a valid action. \n');
                }
              }
              else {
                console.log('Data received from Rhyno has an incorrect length. \n');
              }
            });
            characteristic.notify(true, function(error) {
              console.log('Action Characteristic notification is on. \n');
            });
          }
        });
      });
    });
  }
});
