var exports = module.exports = {};
var sqlite3 = require('sqlite3').verbose();
var logDB = new sqlite3.Database('logs.db');
var configDB = new sqlite3.Database('config.db');
var schedule = require('node-schedule');
var fs = require('fs');

/*** Check if there are temperature sensors available in the system ***/
var owfsSensorsAvailable = false;
var busSensorsAvailable = false;
var owfsDir = '/mnt/1wire/';
var busDir = '/sys/bus/w1/devices/';
var onewireSensors = new Array();
var validSensors = new Array();
var readDir;
// Check for OWFS standard
if (fs.existsSync(owfsDir)) {
    onewireSensors = fs.readdirSync(owfsDir);
    owfsSensorsAvailable = (onewireSensors.length > 0);
    readDir = owfsDir;
} else if (fs.existsSync(busDir)) { // Check for devices on bus
    onewireSensors = fs.readdirSync(busDir);
    busSensorsAvailable = (onewireSensors.length > 0);
    readDir = busDir;
}
// Only use valid temperature sensors
for (var i=0; i < onewireSensors.length; i++ ) {
    if(onewireSensors[i].length > 1 ) {
        if(onewireSensors[i].substring(0, 2) === "28" ) {
            validSensors.push(onewireSensors[i]);
            //console.log("valid sensor found");
        }
    }
}
// Set the right path depending on source
if(owfsSensorsAvailable) {
    var readPathEnd = '/fasttemp';
} else
    var readPathEnd = '/w1_slave';



// Function for reading an array of owfs sensors asyncronously
exports.readOwfsSensors = function (callback) {
    console.log("Starting reading temperatures now...");
    var nrReadSensors = 0;
    var output = '[';

    // Read each valid sensor
    for (var i=0; i < validSensors.length; i++ ) {
        (function(i) {
            fs.readFile(readDir + validSensors[i] + readPathEnd, 'utf8', function(err, data) {
                if (err) {
                    console.log("Read error in onewire: " + err);
                } else {
                    // Check if there is a custom name set
                    var name;
                    configDB.each("SELECT name FROM onewire_names WHERE deviceId=?", validSensors[i], function(err,row) {
                        if(err) {
                            console.log("Error reading onewire_names: " + err);   
                        }
                        else {
                            name = row.name;
                        }
                    }, function() {
                            if(name !== undefined) {
                                console.log("Custom name set for onewire: " + name);
                            } else {
                                console.log("No custom name set for onewire. Use deviceId");
                                name = validSensors[i];
                            }
                        
                            // Interprete data differently depending on source
                            if(owfsSensorsAvailable) {
                                output += '{ "deviceId": "' + validSensors[i] + '", "name": "' + name + '", "temp": "' + data + '" }, ';
                            } else {
                                var matches = data.match(/t=([0-9]+)/);
                                var temp = parseInt(matches[1]) / 1000;
                                output += '{ "deviceId": "' + validSensors[i] + '", "name": "' + name + '", "temp": "' + temp + '" }, ';
                            }
                        
                            // If last read, slice, sort and callback.
                            if (++nrReadSensors == validSensors.length) {
                                output = output.slice(0, -2) + ']';

                                var onewireOrder;
                                configDB.each("SELECT sortOrder FROM onewire_order", function(err,row) {
                                    onewireOrder = row.sortOrder;
                                }, function() {
                                    console.log("Onewire order from db: " + onewireOrder);
                                    if(onewireOrder == undefined) {
                                        console.log("No onewire sort order in db. Send as is");
                                        callback(output);
                                    } else {
                                        console.log("Custom sort for onewire. Call order function");
                                        orderArray(onewireOrder, JSON.parse(output), function(sortedOnewires) {
                                            callback(JSON.stringify(sortedOnewires));
                                        });
                                    }
                                });
                            }
                    });   
                }
            });
        })(i);
    }
}

// Function for sorting arrays according to attribute id
function orderArray(arrayWithOrder, arrayToOrder, callback) {
    var orderedArray = [],
        additionalItems = [],
        finalResult,
        len = arrayToOrder.length,
        lenCopy = len,
        index, current;

    for (; len--;) {
        current = arrayToOrder[len];
        index = arrayWithOrder.indexOf(current.id);
        // If not found. Put in new array to add later.
        if (index === -1) {
            additionalItems.push(current);
        }
        orderedArray[index] = current;
    }

    orderedArray = orderedArray.filter(function(n){ return n != undefined });
    finalResult = orderedArray.concat(additionalItems);
    callback(finalResult);
}

// Function for starting logging
exports.startTemperatureLogging = function() {
    // Set the scheduler
    var rule = new schedule.RecurrenceRule();
    rule.minute = [new schedule.Range(0, 59)];

    // Fired according to properties above
    var j = schedule.scheduleJob(rule, function(){
        console.log('Scheduler fired!');

        // Read the sensors
        exports.readOwfsSensors(function(sensors) {
		sensors = JSON.parse(sensors);
            for(var i = 0; i < sensors.length; i++) {
                logDB.serialize(function() {
                    logDB.run("CREATE TABLE if not exists onewire_temperature_log (deviceId TEXT, timestamp INTEGER, value REAL)");
                    logDB.run("INSERT INTO onewire_temperature_log VALUES (?, ?, ?)", [sensors[i].deviceId, new Date().getTime(), parseFloat(sensors[i].temp)]);
          //       exports.getLatestTemperature(sensors[i]);
		});
            }
        });

	//DEV
	//exports.getLatestTemperature();
    });
}
/*
// DEV
exports.getLatestTemperature = function(sensor) {
console.log("Start logging for sensor: " + sensor.deviceId);
    logDB.serialize(function() {
        var timestamp = '[';
        var temperature = '[';
        logDB.each("SELECT timestamp, value FROM onewire_temperature_log WHERE deviceId=? ORDER BY timestamp DESC LIMIT 100", sensor.deviceId, function(err,row) {
            //console.log(row.timestamp);
            //console.log(row.value);
            timestamp += row.timestamp + ', ';
            temperature += row.value + ', ';
        }, function() {
            timestamp = timestamp.slice(0, -2) + ']';
            temperature = temperature.slice(0, -2) + ']';

            console.log("Timestamp for sensor: " + sensor.deviceId);
            console.log(timestamp);

            console.log("Temperature for sensor: " + sensor.deviceId);
            console.log(temperature);
        });
    });
}
*/

exports.getLatestTemperature = function(sensor, callback) {
console.log("Start getting temperatures for sensor: " + sensor.deviceId);
    logDB.serialize(function() {
        var output = '[ { "timestamps": [ ';
        logDB.each("SELECT timestamp FROM onewire_temperature_log WHERE deviceId=? ORDER BY timestamp DESC LIMIT 100", sensor.deviceId, function(err,row) {
            output += row.timestamp  + ', ';
        }, function() {
		
		output = output.slice(0, -2) + ' ] }, { "sensors": { "sensorId": "' + sensor.deviceId + '", "values": [ ';
            	logDB.each("SELECT value FROM onewire_temperature_log WHERE deviceId=? ORDER BY timestamp DESC LIMIT 100", sensor.deviceId, function(err,row) {
            		output += row.value + ', ';
        	}, function() {
			output = output.slice(0, -2) + ' ] } } ]';
			console.log("*************************************************************************************************");
			console.log(output);
			callback(output);
		});
	});
	});
}
