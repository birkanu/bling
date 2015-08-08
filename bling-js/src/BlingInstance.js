var EventEmitter = require('events').EventEmitter,
    _ = require('underscore');

var BlingInstance = module.exports = function(id, socket, options) {
    this.id = id;
    this.socket = socket,
    this.options = options,
    this.isLocked = false,
    this.isConnected = false,
    this.orientationOffset = { x : 0, y : 0 , z : 0 },
    this.lastIMU = undefined,
    this.events = []
};

/**
 * Lock the given Bling immediately.
 * Can be called when a Bling is paired.
 */
BlingInstance.prototype.lock = function() {
    if (this.isLocked) return this;
    this.socket.send(JSON.stringify({
        "command": "lock",
        "bling": this.id
    }));
    this.isLocked = true;
    return this;
};

/**
 * Unlock the given Bling.
 * Can be called when a Bling is paired.
 */
BlingInstance.prototype.unlock = function(timeout) {
    var self = this;
    clearTimeout(this.lockTimeout);
    if (timeout) {    
        this.socket.send(JSON.stringify({
            "command": "unlock",
            "bling": this.id,
            "type": "hold"
        }));

        this.lockTimeout = setTimeout(function(){
            self.lock();
        }, timeout);
    } else {
        this.socket.send(JSON.stringify({
            "command": "unlock",
            "bling": this.id,
            "type": "timed"
        }));
    }
    if(!this.isLocked) return this;
    this.isLocked = false;
    return this;
};

/**
 * Engage the Bling's built in vibration motor.
 */
BlingInstance.prototype.vibrate = function(intensity) {
    intensity = intensity || 'medium';
    this.socket.send(JSON.stringify({
        "command": "vibrate",
        "bling": this.id,
        "type": intensity
    }));
    return this;
};

/**
 * Request the RSSI of the Bling.
 */
BlingInstance.prototype.getRssi = function() {
    this.socket.send(JSON.stringify({
        "command": "get_rssi",
        "bling": this.id
    }));
    return this;
};

_.extend(BlingInstance.prototype, EventEmitter.prototype);
