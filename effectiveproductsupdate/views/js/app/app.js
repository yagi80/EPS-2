/*global angular */
Date.prototype.yyyymmdd = function () {
    var yyyy = this.getFullYear().toString();
    var mm = (this.getMonth() + 1).toString(); // getMonth() is zero-based
    var dd = this.getDate().toString();
    return yyyy + '-' + (mm[1] ? mm : "0" + mm[0]) + '-' + (dd[1] ? dd : "0" + dd[0]);
};

// define angular module/app
app = angular.module('wlp', ['ngRoute', "angular-table"]);

app.filter("sanitize", ['$sce', function($sce) {
    return function(htmlCode){
        return $sce.trustAsHtml(htmlCode);
    }
}]);

app.filter('object2Array', function() {
    return function(input) {
        var out = [];
        for(var i in input){
            out.push(input[i]);
        }
        return out;
    }
});




angular.module('wlp').directive('contenteditable', ['$parse', function ($parse) {
    return {
        require: 'ngModel',
        transclude : true,
        link: function(scope, elm, attr, ngModel) {
            var ck = CKEDITOR.replace(elm[0]);

            if (!ngModel) return;

            ck.on('instanceReady', function() {
                ck.setData(ngModel.$viewValue);
                ck.on('change', updateModel);
                ck.on('key', updateModel);
                ck.on('dataReady', updateModel);
            });

            function updateModel() {
                scope.$apply(function() {
                    ngModel.$setViewValue(ck.getData().replace(/(\r\n|\n|\r)/gm,""));
                });
            }


            ngModel.$render = function(value) {
                if(ngModel.$viewValue) {
                    ck.setData(ngModel.$viewValue);
                }
            };
        }
    };
}]);

angular.module('wlp').directive('focusOnShow', function ($timeout) {
    return function (scope, element, attrs) {
        //Watch the showInput model
        scope.$watch(attrs.ngShow, function (value) {
            //If the model changes to true, focus on the element
            if (value) {
                //Assumes that the element has the focus method
                //If not, then you can have your own logic to focus here
                $timeout(function() {
                    element.focus();
                });
            }
        });
    };
});
