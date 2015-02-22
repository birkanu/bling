var express = require('express');
var noble = require('noble');

var rhynoConnectionUuid = '6e400001b5a3f393e0a9e50e24dcca9e';
var rhynoPeripheralUuid = '60339882cd844530b82dadc3a303a196';
var rhynoActionCharacteristicUuid = '6e400003b5a3f393e0a9e50e24dcca9e';

var app = express();

var server = app.listen(3000, function () {

  var host = server.address().address;
  var port = server.address().port;

  console.log('App listening at http://%s:%s. \n', host, port);

});

noble.on('stateChange', function(state) {
  if (state === 'poweredOn') {
    console.log('Started scanning for peripheral... \n');
    noble.startScanning([rhynoConnectionUuid], false);
  } else {
    console.log('Stopped scanning for peripheral. \n');
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
      console.log('Connected to peripheral with uuid: ', peripheral.uuid);
      peripheral.discoverAllServicesAndCharacteristics(function(err, services, characteristics) {
        characteristics.forEach(function(characteristic) {
          if (characteristic.uuid == rhynoActionCharacteristicUuid) {
            console.log('Found Action Characteristic.');
            characteristic.on('read', function(data, isNotification) {
              if (data.length === 1) {
                var result = data.readUInt8(0);
                console.log("Received message from peripheral: ", result);
              }
              else {
                console.log('Received data length is incorrect.');
              }
            });
            characteristic.notify(true, function(error) {
              console.log('Action Characteristic notification is on.');
            });
          }
        });
      });
    });
  }
});
