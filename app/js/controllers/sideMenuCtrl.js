angular.module('hemauto.controllers')

.controller('sideMenuCtrl', function($scope, $location) {

  $scope.menuItems = [
    {
      icon: 'ion-ios-home-outline',
      text: 'Home',
      url: '/'
    },
    {
      icon: 'ion-ios-plus-outline',
      text: 'Add unit',
      url: '/addUnit'
    },
    {
      icon: 'ion-ios-gear-outline',
      text: 'Configure',
      url: '/config'
    },
    {
      icon: 'ion-ios-plus-outline',
      text: 'Add theme',
      url: ''
    }
  ];

  $scope.clickItem = function(url, device) {
    if (device && device === 'mobile') {
      $scope.showMobileMenu = false;
    }
    $location.url(url);
  };

  $scope.toggleMobileMenu = function() {
    $scope.showMobileMenu = !$scope.showMobileMenu;
  };


})
