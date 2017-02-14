angular.module('hemauto.controllers')

.controller('configCtrl', function($rootScope, $scope, $location, socketService) {

  $scope.saveServerURL = function(url) {
    localStorage.setItem('server_url', url);
    $rootScope.serverURL = url;
    socketService.init(function() {
      console.log('Socket initiated');
    });
  };

  $scope.configDevices = {
    onOffs: [],
    dimmers: $rootScope.lampUnits.dimmers
  };

  $rootScope.lampUnits.onOffs.forEach(function(d) {
    d.delete = false;
    $scope.configDevices.onOffs.push(d);
  });

  $scope.toggleDelete = function(type, index) {
    $rootScope.lampUnits[type][index].delete = !$rootScope.lampUnits[type][index].delete;
  };

  $scope.delete = function(id) {
    console.log(id);
    socketService.emit('removeDevice', {
      id: id
    });
  };

})