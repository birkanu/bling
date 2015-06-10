var express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    noble = require('noble');

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

app.use(express.static(__dirname + '/public'));

var server = http.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('\nApp listening at http://%s:%s. \n', host, port);
});

// var blingConnectionUuid = '713d0000503e4c75ba943148f18d941e',
//     blingPeripheralUuid = '1810ed4ffa5e4c509e51705390a4217d',
//     blingActionCharacteristicUuid = '713d0002503e4c75ba943148f18d941e';

// var ioClientConnected = false;
// io.on('connection', function(socket){
//   console.log('Connected to 2048 Client via Socket.io. \n');
//   ioClientConnected = true;
//   socket.on('disconnect', function(){
//     console.log('2048 Client disconnected. \n');
//     ioClientConnected = false;
//   });
// });

// noble.on('stateChange', function(state) {
//   if (state === 'poweredOn') {
//     console.log('Started scanning for peripheral... \n');
//     //noble.startScanning([], true);
//     noble.startScanning([blingConnectionUuid], false);
//   } else {
//     console.log('Not scanning for peripheral... \n');
//     noble.stopScanning();
//   }
// });

// noble.on('discover', function(peripheral) {
//   console.log('Discovered peripheral: ', peripheral.advertisement, '\n');
//   // if (peripheral.uuid === blingPeripheralUuid) {
//     noble.stopScanning();

//     peripheral.on('disconnect', function() {
//       process.exit(0);
//       //noble.startScanning([], true);
//       noble.startScanning([blingConnectionUuid], false);
//     });

//     peripheral.connect(function(err) {
//       console.log('Connected to peripheral with uuid: ', peripheral.uuid, '\n');
//       peripheral.discoverAllServicesAndCharacteristics(function(err, services, characteristics) {
//         characteristics.forEach(function(characteristic) {
//           if (characteristic.uuid == blingActionCharacteristicUuid) {
//             console.log('Found Action Characteristic. \n');
//             characteristic.on('read', function(data, isNotification) {
//               // if (data && ioClientConnected) {
//               if (data) {
//                 var resultAccX = data.readInt16BE(0);
//                 var resultAccY = data.readInt16BE(2);
//                 var resultAccZ = data.readInt16BE(4);
//                 var resultTemp = data.readInt16BE(6);
//                 var resultGyrX = data.readInt16BE(8);
//                 var resultGyrY = data.readInt16BE(10);
//                 var resultGyrZ = data.readInt16BE(12);
//                 console.log("Acc_X Received: " + resultAccX/16324.0 + " G");
//                 console.log("Acc_Y Received: " + resultAccY/16324.0 + " G");
//                 console.log("Acc_Z Received: " + resultAccZ/16324.0 + " G");
//                 console.log("Temp Received: " + resultTemp/340.0+36.53 + " Celcius");
//                 console.log("Gyr_X Received: " + resultGyrX/131.0 + " DPS");
//                 console.log("Gyr_Y Received: " + resultGyrY/131.0 + " DPS");
//                 console.log("Gyr_Z Received: " + resultGyrZ/131.0 + " DPS");
//                 console.log("----------------------------------------------");
//                 console.log("----------------------------------------------");
//               }
//               else {
//                 console.log('Data received from Bling has an incorrect length \n');
//               }
//             });
//             characteristic.notify(true, function(error) {
//               console.log('Action Characteristic notification is on. Listening for action commands...\n');
//             });
//           }
//         });
//       });
//     });
//   // }
// });