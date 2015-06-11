var express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    noble = require('noble'),
    HashMap = require('hashmap');

var BLING_UART_SERVICE_UUID = '713d0000503e4c75ba943148f18d941e'; // Custom Bling UART Service UUID
var BLING_ACTION_CHAR_UUID = '713d0002503e4c75ba943148f18d941e'; // Custom Bling Action Characteristic UUID (Properties: Read, Notify)

var peripheralMap = new HashMap(); // HashMap to store peripherals that are connected

var MAX_PERIPHERALS = 6;

// var ioClientConnected = false;
// io.on('connection', function(socket){
//   console.log('Connected to 2048 Client via Socket.io. \n');
//   ioClientConnected = true;
//   socket.on('disconnect', function(){
//     console.log('2048 Client disconnected. \n');
//     ioClientConnected = false;
//   });
// });

// Represents a peripheral in JSON format
var peripheralToJson = function (peripheral) {
  return {
    "state": peripheral.state,
    "uuid": peripheral.uuid,
    "address": peripheral.address,
    "advertisement": peripheral.advertisement,
    "rssi": peripheral.rssi,
    "services": peripheral.services
  };
};

// Represents action data received from a peripheral in JSON format
var actionDataToJson = function (data) {
  return {
    "acceleration": {
      "x": data.readInt16BE(0) / 16324.0,
      "y": data.readInt16BE(2) / 16324.0,
      "z": data.readInt16BE(4) / 16324.0
    }, 
    "gyroscope": {
      "x": data.readInt16BE(8) / 131.0,
      "y": data.readInt16BE(10) / 131.0,
      "z": data.readInt16BE(12) / 131.0   
    },
    "timestamp": Date.now()
  };
};

// Starts connecting to a peripheral once it is discovered
var discover = function (peripheral) {
  console.log('Discovered peripheral:\n', peripheralToJson(peripheral), '\n');
  if (!peripheralMap.has(peripheral.uuid)) {
    peripheral.connect(connect.bind(peripheral));
  }
};

// Starts discovering a peripheral's services and characteristics once it is connected
var connect = function (error) {
  if (error) {
    throw error;
  } else {
    console.log('Connected to peripheral with uuid: ', this.uuid, '\n');
    peripheralMap.set(this.uuid, this);
    // If the maximum peripheral count to be connected is exceeded, stop scanning
    if (peripheralMap.count() >= MAX_PERIPHERALS) {
      console.log("Stopped scanning for peripherals: Reached " + MAX_PERIPHERALS + " peripherals.");
      noble.stopScanning();
    }
    // If the peripheral disconnects, remove it from the peripheral HashMap, and restart scanning
    this.on('disconnect', function() {
      console.log('Peripheral with uuid, ', this.uuid, ', disconnected. \n');
      peripheralMap.remove(this.uuid);
      if (peripheralMap.count() < MAX_PERIPHERALS) {
        console.log('Started scanning for peripherals... \n');
        noble.startScanning([BLING_UART_SERVICE_UUID], false);
      }
    });
    this.discoverSomeServicesAndCharacteristics(
      [BLING_UART_SERVICE_UUID], 
      [BLING_ACTION_CHAR_UUID], 
      discoverSomeServicesAndCharacteristics.bind(this)
    );
  }
};

var discoverSomeServicesAndCharacteristics = function (error, services, characteristics) {
  if (error) {
    throw error;
  } else {
    var blingActionChar;
    characteristics.forEach(function(characteristic) {
      if (characteristic.uuid == BLING_ACTION_CHAR_UUID) {
        console.log('Found Action Characteristic for peripheral. \n');
        blingActionChar = characteristic;
      }
      blingActionChar.notify(true, function(error) {
        console.log('Action Characteristic notifications for peripheral are on.\n');
      });
      blingActionChar.on('read', function(data, isNotification) {
        if (data) {
          var actionData = actionDataToJson(data);
          console.log("Data received from ", this.uuid, ":\n", actionData, "\n");
        }
      });
    });
  }
};

noble.on('stateChange', function(state) {
  if (state === 'poweredOn') {
    // The BLE radio has been powered on. Begin scanning for peripherals
    // that provide the Custom Bling UART Service.
    console.log('Started scanning for peripherals... \n');
    noble.startScanning([BLING_UART_SERVICE_UUID], false);
  } else {
    console.log('BLE radio is not powered on. Not scanning for peripherals... \n');
    noble.stopScanning();
  }
});

noble.on('discover', discover);