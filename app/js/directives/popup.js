angular.module('hemauto.directives')

.provider("popup", function() {
  this.$get = function($rootScope, $templateRequest, $compile, $document, $timeout) {
    var isolatedScope;
    var popup_open = false;
    var popup = {
      open: function(config) {
        var popup_element = angular.element(document.getElementById('popup'));
        console.log(popup_element);
        if (popup_open) {
          return;
        }
        popup_open = true;
        var url;
        if (config.url) url = config.url;
        else url = 'popups/popup.html';
        isolatedScope = config.scope;
        $templateRequest(url).then(function(template) {
          var templateObj = $compile(template)(isolatedScope);
          var bodyElem = angular.element($document[0].body);
          bodyElem.append(templateObj);
          var box = angular.element(document.getElementById('popup-box'));
          box.addClass('box-animation-out');
          var backdrop = angular.element(document.getElementById('backdrop'));
          backdrop.on('click', function() {
            popup.close();
          });
          backdrop.addClass('backdrop-animation-out');
          var close = angular.element(document.getElementById('close'));
          close.on('click', function() {
            popup.close();
          });
          $timeout(function() {
            backdrop.removeClass('backdrop-animation-out');
            backdrop.addClass('backdrop-animation-in');
          },100);
          $timeout(function() {
            box.removeClass('box-animation-out');
            box.addClass('box-animation-in');
          },400);
        });
      },
      close: function() {
        popup_open = false;
        var popup = angular.element(document.getElementById('popup'));
        var box = angular.element(document.getElementById('popup-box'));
        var backdrop = angular.element(document.getElementById('backdrop'));
        box.removeClass('box-animation-in');
        box.addClass('box-animation-out');
        $timeout(function() {
          backdrop.removeClass('backdrop-animation-in');
          backdrop.addClass('backdrop-animation-out');
        },200);
        $timeout(function() {
          popup.remove();
        }, 50);
      }
    };

    return popup;

  };
})