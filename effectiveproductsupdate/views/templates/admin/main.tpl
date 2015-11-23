<script type="text/javascript">
    baseUrl = '{$url|escape:'UTF-8'}';

    angular.module('wlp').factory('webService', function ($http) {
        return {
            invoke: function (method, arguments) {

                if(!arguments) {
                    arguments = new Object();
                }

                arguments.ajax = true;
                arguments.fn = method;

                var req = {
                    method: 'GET',
                    url: '{$ajax_CustomModuleController_path|escape:'UTF-8'}&ajax=true',
                    headers: {
                        'Content-Type': undefined
                    },
                    params: arguments
                };
                return $http(req).then(function (res) {
                    return res.data;
                });
            }
        }
    });

    angular.module('wlp').config(['$routeProvider', function ($routeProvider) {
        $routeProvider.when('/', {
            templateUrl: baseUrl + '/views/js/app/templates/list.html',
            controller: 'applicationController'
        }).when('/product/:productId', {
            templateUrl: baseUrl + '/views/js/app/templates/product.html',
            controller: 'productController'
        }).otherwise({
            redirectTo: '/'
        });
    }]);


</script>
<div ng-app="wlp">
    <div ng-view>


    </div>
</div>
