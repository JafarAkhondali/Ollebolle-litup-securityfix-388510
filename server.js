var http = require('http');
var io = require('socket.io');
var fs = require('fs');
var telldus = require('telldus');
var sqlite3 = require('sqlite3').verbose();
var receiverDB = new sqlite3.Database('receivers.db');
var configDB = new sqlite3.Database('config.db');
var temperature = require('./temperature');

var server = http.createServer(function (req, res) {
    "use strict";
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('Alive');
});
server.listen(6556);



/************ Initiate GLOBAL variables ************/
var socket = io.listen(server);
var devicesBasics;

// Start temperature logging
temperature.startTemperatureLogging();

// Function for reading devices and adding attributes needed
function getDevices(callback) {
    var devices = telldus.getDevicesSync();
    devicesBasics = devices;

    // Add level to dimmers if it does not exist, for example when the device if OFF.
    for (var i = 0; i < devices.length; i++ ) {
        if(devices[i].methods[2] === "DIM" && !devices[i].status.hasOwnProperty("level")) {
            devices[i].status.level = "0";
        }
    }

    // Sort according to user defined sort and emit
    configDB.serialize(function() {
            var output;
            configDB.each("SELECT sortOrder FROM telldus_device_order", function(err,row) {
                output = row.sortOrder;
            }, function() {
                console.log("Device order from db: " + output);
                if(output == null) {
                    console.log("No sort order in db. Send devices as is");
                    callback(devices);
                } else {
                    console.log("Custom sort. Call order function");
                    orderArray(output, devices, function(sortedDevices) {
                        console.log(sortedDevices);
                        callback(sortedDevices);
                    });
                }
            });
    });
}

// Function for getting id and names of available themes
function getThemes(callback) {
    configDB.serialize(function() {
        var themes = new Array();
        configDB.each("SELECT rowId as id, themeName as name, icon FROM themes", function(err, row) {
            console.log("Read a theme from db");
            themes.push(row);
        },  function() {
                var themeOrder;
                configDB.each("SELECT sortOrder FROM theme_order", function(err,row) {
                    themeOrder = row.sortOrder;
                }, function() {
                    console.log("Theme order from db: " + themeOrder);
                    if(themeOrder == null) {
                        console.log("No sort order in db. Send themes as is");
                        callback(themes);
                    } else {
                        console.log("Custom sort. Call order function");
                        orderArray(themeOrder, themes, function(sortedThemes) {
                            console.log(sortedThemes);
                            callback(sortedThemes);
                        });
                    }
                });
            });
    });
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

socket.on('connection', function (client) {
    console.log('Client connected. Serve devices');
	
    // Call for devices and send to client
    getDevices(function(devices) {
        client.emit('tellstick_devices', JSON.stringify(devices));
    });
    
    // Get themes and send to client
    getThemes(function(themes) {
        client.emit('availableThemes', JSON.stringify(themes));
        console.log("Available themes:");
        console.log(JSON.stringify(themes));
    });
	
    // Handle button click in client
	client.on('deviceChange', function (action) {
        console.log("Telldus actions requested from client");
        console.log(action);
        if (action.command === "TURNON") {
            telldus.turnOn(Number(action.id), function (err) {
                if (err) {
                    console.log("Error: " + err);
                } else {
                    console.log("Turn ON: " + action.id);
                }
            });
        } else if (action.command === "TURNOFF" || Number(action.command) === 0) {
            telldus.turnOff(Number(action.id), function (err) {
                if (err) {
                    console.log("Error: " + err);
                } else {
                    console.log("Turn OFF: " + action.id);
                }
            });

        } else {
            telldus.dim(Number(action.id), Number(action.command), function (err) {
                if (err) {
                    console.log("Error: " + err);
                } else {
                    console.log("Dim device " + action.id + " to level " + action.command);
                }
            });
        }
	
	});
	
	// Not currently used.
    client.on('disconnect', function () {
        console.log('Connection closed. Do nothing.');
    });
    
    // Client refresh request of devices
    client.on('refreshRequest', function () {
        getDevices(function(devices) {
            client.emit('tellstick_devices', JSON.stringify(devices));
        });
    });

    // Client temperature request
    client.on('getTemperature', function () {
        temperature.readOwfsSensors(function(sensorValues) {
            console.log(sensorValues);
            client.emit('currentTemperature', sensorValues);
        });
    });

	// Chart data
	client.on('getChart', function() {
		temperature.readOwfsSensors(function(sensorValues) {
			console.log(sensorValues);
			var sensors = JSON.parse(sensorValues);
			console.log(sensors[0].deviceId);
			temperature.getLatestTemperature(sensors[0], function(graphData) {
				client.emit('chartData', graphData);
			});		

		});
	});
	    

    /*** Flow for adding device ***/
    // Client brand/make request
    client.on('getBrands', function () {
        var output = '[';
        receiverDB.serialize(function() {
            receiverDB.each("SELECT brand, protocol FROM receiver_brand_protocol", function(err,row) {
                output += '{ "brand" : "' + row.brand + '", "protocol": "' + row.protocol + '" }, ';
            }, function() {
                output = output.slice(0, -2) + ']';
                //console.log(output);
                client.emit('availableBrands', output);
            });
        });
    });
    
    
    // Client model request
    client.on('getModels', function (selectedProtocol) {
        var output = '[';
        receiverDB.serialize(function() {
            receiverDB.each("SELECT protocol, model, modelPretty FROM receiver_protocol_model WHERE protocol='"+selectedProtocol+"'", function(err,row) {
                output += '{ "protocol" : "' + row.protocol + '", "model": "' + row.model + '", "modelPretty": "' + row.modelPretty + '" }, ';
            }, function() {
                output = output.slice(0, -2) + ']';
                console.log(output);
                client.emit('availableModels', output);
            });
        });
    });

    // Client config type request
    client.on('getConfigType', function (input) {
        var output;
        receiverDB.serialize(function() {
            receiverDB.each("SELECT protocol, model, configType FROM receiver_protocol_model WHERE protocol='"+input.protocol+"' AND model='"+input.model+"'", function(err,row) {
                output = '{ "protocol" : "' + row.protocol + '", "model": "' + row.model + '", "configType": "' + row.configType + '" } ';
            }, function() {
                console.log(output);
                client.emit('availableConfigType', output);
            });
        });
    });
    
    // Add the device. // TODO: Async
    client.on('addDevice', function (input) {
        console.log("Add device")
        console.log(input);
        var newId = telldus.addDeviceSync();
        console.log("Added device: " + newId);
        telldus.setNameSync(newId, input.name);
        console.log("Named it: " + input.name);
        telldus.setProtocolSync(newId, input.protocol);
        console.log("Set protocol to: " + input.protocol);
       // if (!input.model === "All") { // Exclude generic model
            telldus.setModelSync(newId, input.model);
            console.log("Set model to: " + input.model);
        //}
        
        // Codeswitch
        if (input.configType === "codeswitch") {
            telldus.setDeviceParameterSync(newId, 'code', input.parameters);
            console.log("Set a parameter: " + input.parameters);
        }
        
        // Self-learning
        if (input.configType === "learn") {
            // For now, limit houses to support all protocols
            var houseArray = [258, 266, 426, 430, 434, 438, 442, 446, 450, 454, 458, 514, 530, 542, 610, 634, 638, 866, 870, 878, 894, 1282, 1286, 1290, 1362, 1366, 1374, 1406, 1814, 1822, 1878] //4095
            var randomHouse = houseArray[Math.floor(Math.random() * houseArray.length)];
            // For now, limit to unit 1, 2, 3, 4 to support all protocols
            var unitArray = [1, 2, 3, 4];
            var randomUnit = unitArray[Math.floor(Math.random() * unitArray.length)];
            
            telldus.setDeviceParameterSync(newId, 'house', '' + randomHouse);
            telldus.setDeviceParameterSync(newId, 'unit', '' + randomUnit);
            
        }
        // Send the new id back to the client that requested the add
        client.emit('deviceAdded', '{ "id": ' + newId + ' }');
        
        // Updates. Send all devices to everyone
        getDevices(function(devices) {
            socket.sockets.emit('tellstick_devices', JSON.stringify(devices));
        });
    });
    
    // Learn the new device
    client.on('learnDevice', function (input) {
        // Notify client that learning will now start
        client.emit('learnStart');
        console.log("Sent learnStart");
        telldus.learn(input.id, function (err) {
            if (err) {
                console.log("Error: " + err);
            } else {
                console.log("Sent learn command to device: " + input.id);
                // Notify client that learn finished
                client.emit('learnStop');
                console.log("Sent learnStop");
            }
        });
    });
    
    // Remove a device
    client.on('removeDevice', function (input) {
        console.log(input);
        telldus.removeDevice(input.id, function (err) {
            if (err) {
                console.log("Error: " + err);
            } else {
                console.log("Removing device : " + input.id);
                
                // Updates. Send all devices to everyone
                getDevices(function(devices) {
                    socket.sockets.emit('tellstick_devices', JSON.stringify(devices));
                });
            }
        });
    });
    
    // Get a device for editing
    client.on('getEditDevice', function (input) {
        console.log("Requested edit info for device: " + input.id);
        var id = Number(input.id);
        var deviceName = telldus.getNameSync(id);
        var deviceModel = telldus.getModelSync(id);
        if(deviceModel === '') deviceModel = 'all';
        var deviceProtocol = telldus.getProtocolSync(id);
        console.log("Name: " + deviceName);
        console.log("Model: " + deviceModel);
        console.log("Protocol: " + deviceProtocol);
        var configType;
        var deviceParameters = '';
        receiverDB.serialize(function() {
            receiverDB.each("SELECT configType FROM receiver_protocol_model WHERE protocol='"+deviceProtocol+"' AND model='"+deviceModel+"'", function(err,row) {
                configType = row.configType;
            }, function() {
                // If codeswitch, get parameters
                if(configType === "codeswitch") {
                    deviceParameters = telldus.getDeviceParameterSync(id, 'code', '');
                }
                
                // Reply to client with avaible config
                var msg = '{ "id": ' + id + ', "name": "' + deviceName + '", "configType": "' + configType + '", "parameters": "' + deviceParameters + '" }';
                console.log("Sending available config:");
                console.log(msg);
                client.emit('availableEditDevice', msg);
            });
        });
    });
    
    // Edit a device
    client.on('editDevice', function (input) {
        console.log(input);
        console.log("Edit device")
        telldus.setNameSync(Number(input.id), input.name);
        console.log("Named it: " + input.name);
        
        // Codeswitch
        if (input.configType === "codeswitch") {
            telldus.setDeviceParameterSync(Number(input.id), 'code', input.parameters);
            console.log("Set a parameter: " + input.parameters);
        }
        
        // Updates. Send all devices to everyone
        getDevices(function(devices) {
            socket.sockets.emit('tellstick_devices', JSON.stringify(devices));
        });
    });
    
    // New sort order for devices from client
    client.on('newTelldusOrder', function (input) {
        configDB.serialize(function() {
            var transformed = [];
            for(var i = 0; i < input.length; i++) {
                transformed.push(input[i].id);
            }
            console.log("New sort order recieved: " + transformed);
            
            configDB.run("CREATE TABLE if not exists telldus_device_order (deviceType TEXT, sortOrder TEXT)");
            configDB.run("DELETE FROM telldus_device_order");
            
            configDB.run("INSERT INTO telldus_device_order VALUES (?, ?)", ["default", JSON.stringify(transformed)], function(err) {
                if(err) {
                    console.log("Error when inserting sort order: " + err);
                } else {
                    // Updates. Send all devices and themes to everyone
                    getDevices(function(devices) {
                        socket.sockets.emit('tellstick_devices', JSON.stringify(devices));
                    });
                }
            });
        });
    });
    
    // Add a new theme
    client.on('addTheme', function(input) {
        configDB.serialize(function() {
            configDB.run("CREATE TABLE if not exists themes (themeName TEXT, icon TEXT, devicePresets TEXT)");
            configDB.run("INSERT INTO themes VALUES (?, ?, ?)", [input.theme.name, input.theme.icon, JSON.stringify(input.devices)] , function(err) {
                if(err) {
                    console.log("Error when inserting theme: " + err);
                } else {
                    // Updates. Send all themes to everyone
                    getThemes(function(themes) {
                        socket.sockets.emit('availableThemes', JSON.stringify(themes));
                    }); 
                }
            });            
        });
    });
    
    // New sort order for themes from client
    client.on('newThemeOrder', function (input) {
        configDB.serialize(function() {
            var transformed = [];
            for(var i = 0; i < input.length; i++) {
                transformed.push(input[i].id);
            }
            console.log("New sort order recieved: " + transformed);
            
            configDB.run("CREATE TABLE if not exists theme_order (deviceType TEXT, sortOrder TEXT)");
            configDB.run("DELETE FROM theme_order");
            
            configDB.run("INSERT INTO theme_order VALUES (?, ?)", ["default", JSON.stringify(transformed)], function(err) {
                if(err) {
                    console.log("Error when inserting theme sort order: " + err);
                } else {
                    // Updates. Send all devices and themes to everyone
                    getThemes(function(themes) {
                        console.log("Send new theme sort order to devices");
                        socket.sockets.emit('availableThemes', JSON.stringify(themes));
                    });
                }
            });
        });
    });
    
    // Remove a theme
    client.on('removeTheme', function(input) {
        configDB.serialize(function() {
            configDB.run("CREATE TABLE if not exists themes (themeName TEXT, icon TEXT, devicePresets TEXT)");
            configDB.run("DELETE FROM themes WHERE rowId=?", input.id , function(err) {
                if(err) {
                    console.log("Error when deleting theme: " + err);
                } else {
                    // Updates. Send all themes to everyone
                    getThemes(function(themes) {
                        socket.sockets.emit('availableThemes', JSON.stringify(themes));
                    }); 
                }
            });            
        });
    });
    
    
    // Activate theme
    client.on('activateTheme', function(input) {
        /* [ { id: 4, name: 'Spotlights', type: 'dimmer', level: '196' },
            { id: 2, name: 'Hallway', type: 'switch', level: true } ] */
        console.log("activateTheme");
        configDB.serialize(function() {
            var output;
            configDB.each("SELECT devicePresets FROM themes WHERE rowId=" + input.id, function(err, row) {
                output = JSON.parse(row.devicePresets);
                console.log(output);
            },  function() {
                    // Loop devices and make approprite actions
                    for(var i = 0; i < output.length; i++) {
                        (function(i) {
                            console.log("In loop:");
                            console.log("Type: " + output[i].type);
                            console.log("Level: " + output[i].level);
                            if(output[i].type === "switch") {
                                if(output[i].level) {
                                    telldus.turnOn(Number(output[i].id), function (err) {
                                        if (err) {
                                            console.log("Error: " + err);
                                        } else {
                                            console.log("Turn ON: " + output[i].id);
                                        }
                                    });
                                } else {
                                    telldus.turnOff(Number(output[i].id), function (err) {
                                        if (err) {
                                            console.log("Error: " + err);
                                        } else {
                                            console.log("Turn OFF: " + output[i].id);
                                        }
                                    });
                                }
                            } else if(output[i].type === "dimmer") {
                                if(!output[i].level || Number(output[i].level) === 0) {
                                    telldus.turnOff(Number(output[i].id), function (err) {
                                        if (err) {
                                            console.log("Error: " + err);
                                        } else {
                                            console.log("Turn OFF: " + output[i].id);
                                        }
                                    });
                                } else {
                                    telldus.dim(Number(output[i].id), Number(output[i].level), function (err) {
                                        if (err) {
                                            console.log("Error: " + err);
                                        } else {
                                            console.log("Dim device " + output[i].id + " to level " + output[i].level);
                                        }
                                    });
                                }
                            }
                        })(i);
                    }
                });
        });     
    });
    
    // Add a name for 1wire sensor
    client.on('addOnewireName', function(input) {
        console.log("Add onewire name");
        console.log(input);
        configDB.serialize(function() {
            configDB.run("CREATE TABLE if not exists onewire_names (deviceId TEXT, name TEXT)");
            // Delete old name if exists
            configDB.run("DELETE FROM onewire_names WHERE deviceId=?", input.deviceId, function(err, row) {
                if(err) {
                    console.log("Error when deleting from onewire_names " + err);
                } else {
                    configDB.run("INSERT INTO onewire_names VALUES (?, ?)", [input.deviceId, input.name] , function(err) {
                            if(err) {
                                console.log("Error when inserting onewire name: " + err);
                            } else {
                                console.log("Inserted something!");
                                // Updates. Send to clients
                                temperature.readOwfsSensors(function(sensorValues) {
                                    socket.sockets.emit('currentTemperature', sensorValues);
                                }); 
                            }
                    });
                }
            });
        });
    });

    // New sort order 1wire sensors
    client.on('newOnewireOrder', function (input) {
        console.log("newOnewireOrder");
        console.log(input);
        configDB.serialize(function() {
            var transformed = [];
            for(var i = 0; i < input.length; i++) {
                transformed.push(input[i].deviceId);
            }
            console.log("New onewire sort order recieved: " + transformed);
            
            configDB.run("CREATE TABLE if not exists onewire_order (deviceType TEXT, sortOrder TEXT)");
            configDB.run("DELETE FROM onewire_order");
            
            configDB.run("INSERT INTO onewire_order VALUES (?, ?)", ["default", JSON.stringify(transformed)], function(err) {
                if(err) {
                    console.log("Error when inserting onewire sort order: " + err);
                } else {
                    // Updates. Send to clients
                    temperature.readOwfsSensors(function(sensorValues) {
                        socket.sockets.emit('currentTemperature', sensorValues);
                    }); 
                }
            });
        });
    });
});

// Listen for telldus device events and send to all connected clients
telldus.addDeviceEventListener(function (deviceId, status) {
    "use strict";
    
    // Flag if dimmable...
    var dimDev = false;
    for (var i = 0; i < devicesBasics.length; i++ ) {
        if(devicesBasics[i].id == deviceId && devicesBasics[i].methods[2] != null) {
            dimDev = (devicesBasics[i].methods[2] === "DIM");
            // If dim level is unset, it is 0. Fix this:
            if(!status.hasOwnProperty("level")) {
                status.level = "0";
            }
        }
    }
    
    // If level is undefined (and this has not been fixed above), make it blank instead of null
    if(!status.hasOwnProperty("level")) {
        status.level = "";
    }
    
    console.log("Sending device update to all clients:");
	var msg = '{ "id": ' + deviceId + ', "status": "' + status.name + '", "level": "' + status.level + '", "dimmer": ' + dimDev + ' }';
    console.log(msg);
	socket.sockets.emit('tellstick_device_update', msg);
});

telldus.addSensorEventListener(function(deviceId,protocol,model,type,value,timestamp) {
  console.log('New sensor event received: ',deviceId,protocol,model,type,value,timestamp);
  var data = {
    device: deviceId,
    type: type,
    value: value
  };
  socket.sockets.emit('sensor_update', JSON.stringify(data));
});

