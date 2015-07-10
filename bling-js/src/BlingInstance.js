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
    this.events : []
};

/**
 *
 * Lock the given Bling immediately.
 * Can be called when a Bling is paired.
 *
 */
BlingInstance.prototype.lock = function() {
    if (this.isLocked) return this;
    this.socket.send(JSON.stringify(["command", {
        "command": "lock",
        "bling": this.id
    }]));
    this.isLocked = true;
    return this;
};

/**
 *
 * Unlock the given Bling.
 * Can be called when a Bling is paired.
 *
 */
BlingInstance.prototype.unlock = function(timeout) {
    var self = this;
    clearTimeout(this.lockTimeout);
    if (timeout) {    
        this.socket.send(JSON.stringify(["command", {
            "command": "unlock",
            "bling": this.id,
            "type": "hold"
        }]));

        this.lockTimeout = setTimeout(function(){
            self.lock();
        }, timeout);
    } else {
        this.socket.send(JSON.stringify(["command", {
            "command": "unlock",
            "bling": this.id,
            "type": "timed"
        }]));
    }
    if(!this.isLocked) return this;
    this.isLocked = false;
    return this;
};

/**
 *
 * Engage the Bling's built in vibration motor.
 * @param intensity
 *
 */
BlingInstance.prototype.vibrate = function(intensity) {
    intensity = intensity || 'medium';
    this.socket.send(JSON.stringify(['command',{
        "command": "vibrate",
        "bling": this.id,
        "type": intensity
    }]));
    return this;
};

/**
 * Request the RSSI of the Bling.
 */
BlingInstance.prototype.getRssi = function() {
    this.socket.send(JSON.stringify(['command',{
        "command": "request_rssi",
        "bling": this.id
    }]));
    return this;
};

_.extend(BlingInstance.prototype, EventEmitter.prototype);

// var blingInstance = {
//         isLocked : false,
//         isConnected : false,
//         orientationOffset : {x : 0, y : 0 ,z : 0, w : 1},
//         lastIMU : undefined,
//         socket : undefined,
//         arm : undefined,
//         direction : undefined,
//         events : [],

//         trigger : function(eventName){
//             var args = Array.prototype.slice.apply(arguments).slice(1);
//             trigger.call(this, Myo.events, eventName, args);
//             trigger.call(this, this.events, eventName, args);
//             return this;
//         },
//         on : function(eventName, fn){
//             return on(this.events, eventName, fn);
//         },
//         off : function(eventName){
//             this.events = off(this.events, eventName);
//         },

//         timer : function(status, timeout, fn){
//             if(status){
//                 this.timeout = setTimeout(fn.bind(this), timeout);
//             }else{
//                 clearTimeout(this.timeout);
//             }
//         },
//         lock : function(){
//             if(this.isLocked) return this;

//             Myo.socket.send(JSON.stringify(["command", {
//                 "command": "lock",
//                 "myo": this.id
//             }]));

//             this.isLocked = true;
//             this.trigger('lock');
//             return this;
//         },
//         unlock : function(timeout){
//             var self = this;
//             clearTimeout(this.lockTimeout);
//             if(timeout){
//                 Myo.socket.send(JSON.stringify(["command", {
//                     "command": "unlock",
//                     "myo": this.id,
//                     "type": "hold"
//                 }]));

//                 this.lockTimeout = setTimeout(function(){
//                     self.lock();
//                 }, timeout);
//             } else {
//                 Myo.socket.send(JSON.stringify(["command", {
//                     "command": "unlock",
//                     "myo": this.id,
//                     "type": "timed"
//                 }]));
//             }
//             if(!this.isLocked) return this;
//             this.isLocked = false;
//             this.trigger('unlock');
//             return this;
//         },
//         zeroOrientation : function(){
//             this.orientationOffset = quatInverse(this._lastQuant);
//             this.trigger('zero_orientation');
//             return this;
//         },
//         setLockingPolicy: function (policy) {
//             policy = policy || "standard";
//             Myo.socket.send(JSON.stringify(['command',{
//                 "command": "set_locking_policy",
//                 "type": policy
//             }]));
//             return this;
//         },
//         vibrate : function(intensity){
//             intensity = intensity || 'medium';
//             Myo.socket.send(JSON.stringify(['command',{
//                 "command": "vibrate",
//                 "myo": this.id,
//                 "type": intensity
//             }]));
//             return this;
//         },
//         requestBluetoothStrength : function(){
//             Myo.socket.send(JSON.stringify(['command',{
//                 "command": "request_rssi",
//                 "myo": this.id
//             }]));
//             return this;
//         }
//     };
