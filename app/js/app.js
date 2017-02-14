'use strict';

// Declare app level module which depends on views, and components
angular.module('hemauto', [
  'ngRoute',
  'ngAnimate',
  'hemauto.controllers',
  'hemauto.directives',
  'hemauto.services', 
  'ngMaterial',
  'hmTouchEvents'
])

.run(function($rootScope, $timeout, $location, socketService) {

  $rootScope.serverURL = localStorage.getItem('server_url') || '127.0.0.1:6556';

  // Connect
  socketService.init(function() {
    console.log('Socket initiated');
  });

  // On connect
  socketService.on('connect', function() {
    console.log('Socket connected');
  });

  // On disconnect
  socketService.on('disconnect', function() {
    // console.log('closed and reconnecting');
    io.connect('http://' + $rootScope.serverURL);
  });

  // Receiving themes from server
  socketService.on('availableThemes', function(themes) {
    // console.log('Themes received: ' + themes);
    $rootScope.themes = JSON.parse(themes);
  });

  // Initiate devices
  $rootScope.lampUnits = {
    onOffs: [],
    dimmers: []
  };

  // Receiving devices from server
  socketService.on('tellstick_devices', function(devices) {
    // console.log('devices received: ' + devices);
    $rootScope.lampUnits = {
      onOffs: [],
      dimmers: []
    };
    var units = JSON.parse(devices);

    for (var i = 0; i < units.length; i++) {
      if (units[i].methods[2] === 'DIM') {
        $rootScope.lampUnits.dimmers.push(units[i]);
      }
      else {
        $rootScope.lampUnits.onOffs.push(units[i]);
      }
    }

    console.log($rootScope.lampUnits);

  });


  // Will be sent from server when state is changed for a tellstick device
  socketService.on('tellstick_device_update', function(updateDevice) {
    var device = JSON.parse(updateDevice);
    if (device.dimmer) {
      for (var i = 0; i < $rootScope.lampUnits.dimmers.length; i++) {
        if ($rootScope.lampUnits.dimmers[i].id === device.id) {
          console.log(i);
          $rootScope.lampUnits.dimmers[i].status.level = Number(device.level);
        }
      }
    }
    else {
      for (var i = 0; i < $rootScope.lampUnits.onOffs.length; i++) {
        if ($rootScope.lampUnits.onOffs[i].id === device.id) {
          $rootScope.lampUnits.onOffs[i].status.name = device.status;
        }
      }      
    }
  });

  socketService.on('message', function(data) {
    console.log('message');
  });


  // Trigger when loading of app is ready
  angular.element(document).ready(function() {
    console.log('document ready');
    // Get width & height of device window
    $rootScope.windowWidth = window.innerWidth;
    $rootScope.windowHeight = window.innerHeight;

  });
  
})

.config(['$routeProvider',
  function($routeProvider) {

    $routeProvider

    .when('/', {
      templateUrl: 'pages/main.html',
      controller: 'mainCtrl'
    })

    .when('/addUnit', {
      templateUrl: 'pages/addUnit.html',
      controller: 'addUnitCtrl'
    })

    .when('/config', {
      templateUrl: 'pages/config.html',
      controller: 'configCtrl'
    })

    .otherwise({
      redirectTo: '/'
    });

  }
]);