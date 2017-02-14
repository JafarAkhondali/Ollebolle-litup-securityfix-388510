angular.module('hemauto.controllers')

.controller('addUnitCtrl', function($rootScope, $scope, $timeout, $location, socketService, popup) {

  $scope.newUnit = {};
  $scope.pickedBrand = null;
  $scope.pickedModel = null;

  $scope.$watch('pickedBrand', function() {
    console.log('test');
    var protocol = JSON.parse($scope.pickedBrand).protocol;
    $scope.newUnit.protocol = protocol;
    socketService.emit('getModels', protocol);
  });

  $scope.$watch('pickedModel', function() {
    console.log($scope.pickedModel);
    var model = JSON.parse($scope.pickedModel).model;
    var protocol = JSON.parse($scope.pickedModel).protocol;
    $scope.newUnit.model = model;
    socketService.emit('getConfigType', {
      protocol: protocol,
      model: model
    });
  });


  // Get available device brands from server 
  socketService.emit('getBrands');

  socketService.on('availableBrands', function(data) {
    $scope.brands = JSON.parse(data);
  });

  // Choosing brand triggers request to server for models in that brand
  $scope.pickBrand = function(index, protocol) {
    $scope.activeBrand = index;
    $scope.newUnit.protocol = protocol;
    socketService.emit('getModels', protocol);
  };

  // Returns the models into app from server and goes to next slide
  socketService.on('availableModels', function(data) {
    $scope.models = JSON.parse(data);
  });

  // Choose which type of device and request config type from server
  $scope.pickModel = function(protocol, model, index) {
    $scope.newUnit.model = model;
    $scope.activeModel = index;
    socketService.emit('getConfigType', {
      protocol: protocol,
      model: model
    });
  };

  // Recieve config type of device from server
  socketService.on('availableConfigType', function(data) {
    $scope.newUnit.type = JSON.parse(data).configType;
    if ($scope.newUnit.type === 'codeswitch') {
      $scope.newUnit.codeSwitch = [];
      for (var i = 0; i < 10; i++) {
        $scope.newUnit.codeSwitch.push({ state: false });
      }
    } else if ($scope.newUnit.codeSwitch) {
      delete $scope.newUnit.codeSwitch;
    }
  });

  // When all switches for code switch are finished collect them and send to server to save new switch
  $scope.finishAddCodeSwitch = function(data) {
    var output = '';
    for (var i = 0; i < data.length; i++) {
      if (data[i].state)
        output += '1';
      else
        output += '0';
    }
    socketService.emit('addDevice', {
      protocol: $scope.protocol,
      model: $scope.model,
      configType: 'codeswitch',
      parameters: output,
      name: $scope.codeSwitchName
    });
    $state.go('main');
  };

  // Add device with learning functionality
  $scope.addDevice = function() {
    if (!$scope.newUnit.name || $scope.newUnit.name.length < 1) {
      return;
    }
    var data = {
      protocol: $scope.newUnit.protocol,
      model: $scope.newUnit.model,
      configType: $scope.newUnit.type,
      name: $scope.newUnit.name
    };
    if ($scope.newUnit.type === 'codeswitch') {
      var output = '';
      $scope.newUnit.codeSwitch.forEach(function(d, i) {
        if (d.state) {
          output += '1';
        }
        else {
          output += '0';
        }
      });
      data.parameters = output;
    }
    console.log(data);
    socketService.emit('addDevice', data);
  };

  // Get ID of added device
  socketService.on('deviceAdded', function(data) {
    console.log(data);
    $scope.deviceAddedID = JSON.parse(data).id;
    if ($scope.newUnit.type === 'learn') {
      popup.open({
        url: 'pages/popup_learn.html', 
        scope: $scope
      });
    }
    $scope.newUnit = {};
    delete $scope.activeBrand;
    delete $scope.activeModel;
  });

  $scope.learning = false;

  $scope.sendLearn = function() {
    console.log('teaching');
    socketService.emit('learnDevice', {
      id: $scope.deviceAddedID
    });
    $scope.learning = true;
  };

  socketService.on('learnStop', function(data) {
    console.log('teaching end');
    $scope.learning = false;
  });


  // Event when learning is finished
  // Finish adding and learning device
  $scope.finishLearn = function() {
    $rootScope.$broadcast('FINISHED_ADDING');
  };

})