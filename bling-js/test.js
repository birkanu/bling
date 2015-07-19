var Bling = require('./Bling');

var myBling = Bling.create();

myBling.on('connected', function() {
	console.log("Bling connected");
});

myBling.on('imu', function(imuData) {
	console.log("IMU DATA: ", imuData);
});