angular.module('hemauto.directives')

.directive('sideMenu', [
  function() {
    return {
      replace: true,
      templateUrl: 'pages/sideMenu.html',
      controller: 'sideMenuCtrl'
    };
  }
])
