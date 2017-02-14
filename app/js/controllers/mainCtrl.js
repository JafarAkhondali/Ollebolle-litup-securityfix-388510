angular.module('hemauto.controllers')

.controller('mainCtrl', function($rootScope, $scope, $location, socketService) {

  $scope.switchLamp = function(id, state, index) {
    var command = null;

    if (state == 'OFF') {
      $rootScope.lampUnits.onOffs[index].status.name = 'ON';
      command = "TURNON";
    } else {
      $rootScope.lampUnits.onOffs[index].status.name = 'OFF';
      command = "TURNOFF";
    }
    socketService.emit('deviceChange', {
      id: id,
      command: command
    });

  };

  // Change status of lamp dimmer
  $scope.changeDimmer = function(id, value) {

    var command = value;
    console.log(id);
    console.log(value);
    socketService.emit('deviceChange', {
      id: id,
      command: command
    });

  };

  // Activate a light theme
  $scope.activateTheme = function(id) {
    navigator.vibrate(200);
    socketService.emit('activateTheme', {
      id: id
    });
  };

})