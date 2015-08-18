var app = require('http').createServer(),
    io = require('socket.io')(app),
    noble = require('noble'),
    HashMap = require('hashmap'),
    CommandTable = require('./src/CommandTable');

var BLING_UART_SERVICE_UUID = '713d0000503e4c75ba943148f18d941e'; // Custom Bling UART Service UUID
var BLING_ACTION_CHAR_UUID = '713d0002503e4c75ba943148f18d941e'; // Custom Bling Action Characteristic UUID (Properties: Read, Notify)
var BLING_COMMAND_CHAR_UUID = '713d0003503e4c75ba943148f18d941e'; // Custom Bling Command Characteristic UUID (Properties: Write)

var peripheralMap = new HashMap(); // HashMap to store peripherals that are connected

var blingClient;
var blingCount = 0;
var disconnectedBlingsMap = new HashMap(); // HashMap to store the ids of the peripherals that are disconnected

// Represents a peripheral in JSON format
var peripheralToJson = function (peripheral) {
  return {
    "state": peripheral.state,
    "id": peripheral.id,
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
      "x": data.readInt16BE(6) / 61.50,
      "y": data.readInt16BE(8) / 61.50,
      "z": data.readInt16BE(10) / 61.50   
    },
   	"yawpitchroll": {
   	  "yaw": data.readInt8(12)*data.readUInt8(13),
   	  "pitch": data.readInt8(14)*data.readUInt8(15),
   	  "roll": data.readInt8(16)*data.readUInt8(17)
   	},
    "timestamp": Date.now()
  };
};

// Handles the incoming commands from the Bling Client
var handleMessage = function(msg) {
  var data = JSON.parse(msg);
  if (data.command == "connect") {
    blingCount = data.bling_count;
    noble.startScanning([BLING_UART_SERVICE_UUID], false);
    // TODO: Make sure Bluetooth is on 
    console.log('Scanning for blings... \n');
  } else {
    if (peripheralMap.get(data.bling)) {
      if (CommandTable[data.command]){
        CommandTable[data.command](peripheralMap.get(data.bling), data);
      }
    }
  }
};

// Starts connecting to a peripheral once it is discovered
var discover = function (peripheral) {
  if (disconnectedBlingsMap.get(peripheral.uuid)) {
    peripheral.id = disconnectedBlingsMap.get(peripheral.uuid);
    disconnectedBlingsMap.remove(peripheral.uuid);
  } else {
    peripheral.id = blingCount - 1;
  }
  console.log('Discovered bling:\n', peripheralToJson(peripheral), '\n');
  if (!peripheralMap.has(peripheral.id)) {
    peripheral.connect(connect.bind(peripheral));
  }
};

// Starts discovering a peripheral's services and characteristics once it is connected
var connect = function (error) {
  if (error) {
    throw error;
  } else {
    console.log('Connected to bling with id: ', this.id, '. \n');
    peripheralMap.set(this.id, this);
    blingClient.emit('message', JSON.stringify({
      "type": "connected",
      "bling": this.id,
      "timestamp": Date.now()
    }));
    // If the maximum peripheral count to be connected is exceeded, stop scanning
    if (peripheralMap.count() >= blingCount) {
      console.log("Stopped scanning: Already connected to the requested amount of blings.");
      noble.stopScanning();
    }
    // If the peripheral disconnects, remove it from the peripheral HashMap, and restart scanning
    this.on('disconnect', function() {
      console.log('Bling with id, ', this.id, ', disconnected. \n');
      peripheralMap.remove(this.id);
      disconnectedBlingsMap.set(this.uuid, this.id);
      blingClient.emit('message', JSON.stringify({
        "type": "disconnected",
        "bling": this.id,
        "timestamp": Date.now()
      }));
      if (peripheralMap.count() < blingClientCount) {
        console.log('Started scanning for blings... \n');
        noble.startScanning([BLING_UART_SERVICE_UUID], false);
      }
    });
    this.discoverSomeServicesAndCharacteristics(
      [BLING_UART_SERVICE_UUID], 
      [BLING_ACTION_CHAR_UUID, BLING_COMMAND_CHAR_UUID], 
      discoverSomeServicesAndCharacteristics.bind(this)
    );
  }
};

var discoverSomeServicesAndCharacteristics = function (error, services, characteristics) {
  var peripheral = this;
  if (error) {
    throw error;
  } else {
    var blingActionChar;
    var blingCommandChar;
    characteristics.forEach(function(characteristic) {
      if (characteristic.uuid == BLING_ACTION_CHAR_UUID) {
        console.log('Found Action Characteristic for bling with id: ', peripheral.id ,'. \n');
        blingActionChar = characteristic;
      } else if (characteristic.uuid == BLING_COMMAND_CHAR_UUID) {
        console.log('Found Command Characteristic for bling with id: ', peripheral.id ,'. \n');
        peripheral.commandChar = characteristic;
        blingCommandChar = peripheral.commandChar;
        peripheralMap.set(peripheral.id, peripheral);
      }     
      blingActionChar.notify(true, function(error) {
        console.log('Action Characteristic notifications for bling (id: ', peripheral.id ,') are on.\n');
      });
      blingActionChar.on('read', function(data, isNotification) {
        if (data) {
          var actionData = actionDataToJson(data);
          console.log("Data received from ", peripheral.id, ":\n", actionData, "\n");
          actionData.type = "imu";
          actionData.bling = peripheral.id;
          blingClient.emit('message', JSON.stringify(actionData));
        }
      });
    });
  }
};

app.listen(3000);
var wss = io.of('/bling');

wss.on('connection', function(ws) {
  console.log('Successfully connected to Bling Client. \n');
  blingClient = ws;
  blingClient.on('message', handleMessage);
  blingClient.on('close', function() {
    // TODO: Decide what to do when Bling Client disconnects
    console.log('Bling Client disconnected. \n');
  });
});

noble.on('discover', discover);