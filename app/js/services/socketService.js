angular.module('hemauto.services')

.factory('socketService', function($rootScope, $http) {

  // localStorage.removeItem("noID");
  var socket = null;

  if (!localStorage.getItem("noID")) {
    var passID = Math.round(Math.random() * 10000000000000000);
    localStorage.setItem("clientID", passID);
    console.log('ID saved: ' + passID);
    localStorage.setItem("noID", true);
  }

  return {
    init: function(callback) {
      var clientID = localStorage.getItem("clientID");
      var token = 7437521079555154;
      console.log($rootScope.serverURL);
      socket = io.connect($rootScope.serverURL, {'forceNew': true});
      callback();
    },
    destroy: function(callback) {
      console.log('disconnecting socket');
      socket.disconnect();
      callback();
    },
    on: function(eventName, callback) {
      socket.on(eventName, function() {
        var args = arguments;
        $rootScope.$apply(function() {
          callback.apply(socket, args);
        });
      });
    },
    emit: function(eventName, data, callback) {
      socket.emit(eventName, data, function() {
        var args = arguments;
        $rootScope.$apply(function() {
          if (callback) {
            callback.apply(socket, args);
          }
        });
      });
    }
  };

});