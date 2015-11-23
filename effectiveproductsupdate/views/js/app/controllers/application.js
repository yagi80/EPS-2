angular.module('wlp').controller('applicationController', function ($scope, $rootScope, products, $location, $filter, ProductListItem) {

    $scope.selectedLanguage = 1;
    $scope.languages = [];
    $scope.products = [];
    $scope.query = {keywords: '', category: ''};
    $scope.categories = {};
    $scope.taxesRules = [];
    $scope.filteredList = $scope.products;
    $scope.baseUrl = baseUrl;

    products.getLanguages().then(function(result) {
        for(var i = 0; i < result.length; i++){
            result[i].id_lang = parseInt(result[i].id_lang);
        }
        $scope.languages = result;
    });

    products.getTaxesRules().then(function(result) {
        console.log(result);
        $scope.taxesRules = result;
    });

    $scope.config = {
        itemsPerPage: 50,
        fillLastPage: false
    };

    $scope.open = function(productId) {
        $location.path('/product/'+productId);
    };


    $scope.updateProductField = function (field, product) {
        product.disabled = true;
        var value;
        switch(field){
            case 'name':
                value = product.name;
                break;
            case 'reference':
                value = product.reference;
                break;
            case 'category':
                value = product.id_category_default;
                break;
            case 'price':
                value = product.priceTE;
                break;
            case 'quantity':
                value = product.quantity;
                break;
            case 'active':
                value = product.active ? 1 : 0;
                break;
        }

        products.updateProductField(field, product.id_product, product.id_shop, product.id_lang, value).then(function(result){
            product.disabled = false;
            if(result){
                switch(field) {
                    case 'name':
                        product.showNameEditor = false;
                        break;
                    case 'reference':
                        product.showRefEditor = false;
                        break;
                    case 'price':
                        product.showPriceEditor = false;
                        product.showPriceTIEditor = false;
                        break;
                    case 'category':
                        product.showCategoryEditor = false;
                        break;
                    case 'quantity':
                        product.showQuantityEditor = false;
                        break;
                }
            }
        });
    };



    $scope.update = function(forceAjax) {
        $scope.loading = true;
        $scope.products = [];
        $scope.updateFilteredList();
        products.getProductsList($scope.selectedLanguage, forceAjax).then(function(result){
            $scope.products = ProductListItem.build(result);
            console.log($scope.products);
            $scope.updateFilteredList();
            $scope.loading = false;
        });
    };

    $scope.updateFilteredList = function() {
        var keywords = $scope.query.keywords.split(' ');
        var filteredList = $scope.products;
        for(var i in  keywords){
            filteredList = $filter("filter")(filteredList, keywords[i]);
        }
        $scope.filteredList = $filter("filter")(filteredList, function(value, index, array){
            if(!$scope.query.category)
                return 1;
            return value.categories.indexOf($scope.query.category) != -1;
        });
    };

    $scope.resetFilters = function() {
        $scope.query = {keywords: '', category: ''};
        $scope.updateFilteredList();
    };

    $scope.update();

    products.getCategories().then(function(result){
        $scope.categories = _parseCategories(result, '');
        for(var i in $scope.categories) {
            $scope.categories[i].fullName = $scope.getCategoryName($scope.categories[i].id_category, 1);
        }
    });

    $scope.getCategoryName = function(catId, fullPath) {
        if(!$scope.categories[catId])
            return catId;
        var name = '';
        if(fullPath) {
            if($scope.categories[catId].id_parent != 1 && $scope.categories[catId].id_parent != 0){
                name =  $scope.getCategoryName($scope.categories[catId].id_parent, true) + ' > ' + name;
            }
        }
        return name + $scope.categories[catId].name;
    };

    var _objConcat = function(o1, o2) {
        for (var key in o2) {
            o1[key] = o2[key];
        }
        return o1;
    };


    var _parseCategories = function(category, parentName) {
        var categories = {};
        for(var i in category){
            if(typeof category[i].infos != 'undefined'){
                if(category[i].infos.id_category)
                    categories[category[i].infos.id_category] = category[i].infos;
            } else {
                categories = _objConcat(categories, _parseCategories(category[i]));
            }
        }
        return categories;
    };



    $scope.priceTEUpdated = function(item) {
        item.calcPriceTI();
    };


    $scope.priceTIUpdated = function(item) {
        item.calcPriceTE();
    };

});



angular.module('wlp').controller('productController', function ($scope, products) {
    $scope.product = {};
    $scope.disabled = false;
    $scope.init = function(product)
    {
        //This function is sort of private constructor for controller
        $scope.product = product;
    };


    $scope.save = function() {
        $scope.disabled = true;
        products.saveQuickEdit($scope.product).then(function(){
            $scope.disabled = false;
            $scope.product.showModal = $scope.product.showQuickEdit = false;
        });
    }




});

angular.module('wlp').controller('productFeaturesController', function ($scope, products) {
    $scope.product = {};

    $scope.languages = $scope.$parent.languages;
    $scope.selectedLanguage = 1;

    $scope.featuresLoading = true;
    $scope.productLoading = true;
    // The features list
    $scope.features = [];

    // The unsaved product features
    $scope.featuresField = {};

    // the selected features options for the product
    $scope.selectedOption = {};
    // The custom features options
    $scope.customValues = {};

    // the product features recieved by the backend
    $scope.productFeatures = {};

    $scope.init = function(product, languageId)
    {
        //This function is sort of private constructor for controller
        $scope.product = product;
        $scope.selectedLanguage = languageId;
        products.getFeatures($scope.product.id_product).then(function(result){
            $scope.features = result;
            $scope.featuresLoading = false;
        });
        products.getProductFeatures($scope.product.id_product).then(function(result){
            _parseProductFeatures(result);
            $scope.productFeatures = result;
            $scope.productLoading = false;
        });
    };

    $scope.setLanguage = function(langItem) {
        $scope.selectedLanguage = langItem;
    };

    $scope.langClass = function(langItem) {
        if(langItem.id_lang == $scope.selectedLanguage)
            return 'active';
        return '';
    };

    var _parseProductFeatures = function(productFeatures) {
        var featuresField = {};
        for(var i = 0; i < productFeatures.length; i++){

            var feat = productFeatures[i];

            featuresField[feat.id_feature] = {featureId : feat.id_feature, featureValueId : feat.id_feature_value, value : feat.value, custom: feat.custom};
            $scope.selectedOption[feat.id_feature] = feat.id_feature_value;

            if(parseInt(feat.custom)){
                $scope.customValues[feat.id_feature] = {};
                for(var j in feat.lang){
                    var lang = feat.lang[j];
                    $scope.customValues[feat.id_feature][lang.id_lang] = lang.value;
                }
            }
        }


        $scope.featuresField = featuresField;
    };


    $scope.setProductFeature = function (featureId, featureValueId, value, custom) {
        if(typeof $scope.featuresField[featureId] == 'undefined'){
            $scope.featuresField[featureId] = {featureId : featureId, featureValueId : featureValueId, value : '', custom: custom};
        }
        $scope.featuresField[featureId].featureValueId = featureValueId;
        $scope.featuresField[featureId].value = value;
        if (!custom) {
            $scope.featuresField[featureId].value = $scope.getFeatureValueText(featureId, featureValueId);
        }
        $scope.featuresField[featureId].custom = custom;
    };


    $scope.isLoading = function() {
       return $scope.featuresLoading || $scope.productLoading;
    };


    $scope.save = function() {
        $scope.disabled = true;
        var features = [];
        for(var i = 0; i < $scope.features.length; i++){
            var feat = $scope.features[i];
            features.push( $scope.getFeatureFieldValue(feat.id_feature) );
        }
        products.saveFeatures(features, $scope.product).then(function(){
            $scope.disabled = false;
            $scope.product.showModal = $scope.product.showFeatureModal = false;
        });
    };


    $scope.getFeatureValueText = function(featureId, featureValueId)
    {
        for(var i = 0; i < $scope.features.length; i++){
            var feat = $scope.features[i];
            if(feat.id_feature == featureId) {
                for (var j = 0; j < feat.options.length; j++) {
                    if (feat.options[j].id_feature_value == featureValueId)
                        return feat.options[j].value;
                }
            }
        }
        return '';
    };


    $scope.getFeatureFieldValue = function(featureId) {
        if($scope.customValues[featureId]){
            return {featureId : featureId, featureValueId: 0, value: $scope.customValues[featureId], custom : 1};
        }

        return $scope.featuresField[featureId];
    };


});



angular.module('wlp').controller('productSEOController', function ($scope, products) {
    $scope.disabled = true;
    $scope.product = {};
    $scope.languages = $scope.$parent.languages;
    $scope.selectedLanguage = 1;
    $scope.productLoading = true;

    $scope.setLanguage = function(langItem) {
        $scope.selectedLanguage = langItem;
    };

    $scope.langClass = function(langItem) {
        if(langItem.id_lang == $scope.selectedLanguage)
            return 'active';
        return '';
    };

    $scope.init = function(product, languageId)
    {
        //This function is sort of private constructor for controller
        $scope.originalProduct = product;
        $scope.selectedLanguage = languageId;

        products.getProduct(product.id_product).then(function(result){
            $scope.product = result;
            $scope.disabled = false;
            $scope.productLoading = false;
        });
    };



    $scope.convertToSlug = function(text)
    {
        return text
            .toLowerCase()
            .replace(/ /g,'-')
            .replace(/[^\w-]+/g,'');
    };

    $scope.isLoading = function() {
       return $scope.featuresLoading || $scope.productLoading;
    };

    $scope.copyFromProductName = function(lang_id){
        if(!lang_id)
            lang_id = $scope.selectedLanguage;
       $scope.product.meta_title[lang_id] = $scope.product.name[lang_id];
       $scope.product.link_rewrite[lang_id] = $scope.convertToSlug(product.meta_title[lang_id])
    };

    $scope.save = function() {
        $scope.disabled = true;
        var seo = {languages : []};

        angular.forEach($scope.languages, function(ln, key){
             var seoLanguage = {
                 lang_id : ln.id_lang,
                 meta_title : $scope.product.meta_title[ln.id_lang],
                 meta_description : $scope.product.meta_description[ln.id_lang],
                 link_rewrite : $scope.product.link_rewrite[ln.id_lang]
             };
            seo.languages.push(seoLanguage);
        });

        products.saveSEO(seo, $scope.originalProduct).then(function(){
            $scope.disabled = false;
            $scope.originalProduct.showModal = $scope.originalProduct.showSeoModal = false;
        });
    };
});



angular.module('wlp').controller('productAttributesController', function ($scope, products, AttributeListItem) {
    $scope.disabled = true;
    $scope.product = {};
    $scope.languages = $scope.$parent.languages;
    $scope.selectedLanguage = 1;
    $scope.productLoading = true;

    $scope.setLanguage = function(langItem) {
        $scope.selectedLanguage = langItem;
    };

    $scope.langClass = function(langItem) {
        if(langItem.id_lang == $scope.selectedLanguage)
            return 'active';
        return '';
    };

    $scope.init = function(product)
    {
        $scope.productLoading = true;
        //This function is sort of private constructor for controller
        $scope.product = product;
        products.getProductAttributes(product.id_product).then(function(result){
            $scope.attributes = AttributeListItem.build(product, result);
            $scope.productLoading = false;
            $scope.disabled = false;
        });
    };

    $scope.setDefault = function(item){
        angular.forEach($scope.attributes, function(attr){
            attr.default_on = 0;
            if(attr == item) {
                attr.default_on = 1;
            }
        });
    };


    $scope.isLoading = function() {
       return  $scope.productLoading;
    };

    var getTotalQuantity = function() {
        var total = 0;
        angular.forEach($scope.attributes, function(at) {
              total += parseInt(at.quantity);
            }
        )
        return total;
    };

    $scope.save = function() {
        $scope.disabled = true;

        var values = [];
        angular.forEach($scope.attributes, function(attr){
            values.push(attr.getValue());
        });

        products.saveAttributes(values, $scope.originalProduct).then(function(result){
            if(result){
                $scope.product.quantity = getTotalQuantity();
            }
            $scope.disabled = false;
            $scope.product.showModal = $scope.product.showAttributesModal = false;
        });

        return values;
    };
});