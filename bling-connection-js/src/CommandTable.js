if (typeof module !== 'undefined') module.exports = {
	'lock' : function(peripheral, data){

	},
	'unlock' : function(peripheral, data) {

	},
	'vibrate' : function(peripheral, data) {
		var vibrateCommand = new Buffer(1);
		vibrateCommand.writeUInt8(1, 0);
		peripheral.commandChar.write(vibrateCommand, false, function(err) {
			if (!err) {
				console.log("message sent");
			} else {
				console.log("couldn't vibrate");
			}
		});
	},
	'get_rssi' : function(peripheral, data) {

	}
};
