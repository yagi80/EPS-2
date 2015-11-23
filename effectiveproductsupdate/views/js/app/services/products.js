/**
 * Created by yves-andre on 09.11.2015.
 */
angular.module('wlp')
    .factory('products', function (webService, $q) {
        var service = {};
        service.productsList = null;
        service.featuresList = null;
        service.taxesList = null;

        service.getProductsList = function (idLang, forceAjax) {
            if (!forceAjax && service.productsList) {
                var defered = $q.defer();
                defered.resolve(service.productsList);
                return defered.promise;
            }
            return webService.invoke('getList', {id_lang: idLang}).then(function (data) {
                if (typeof data == 'object') {
                    service.productsList = data;
                    for (var i = 0; i < service.productsList.length; i++) {
                        service.productsList[i].quantity = parseInt(service.productsList[i].quantity);
                        service.productsList[i].active = parseInt(service.productsList[i].active);
                    }
                } else {
                    service.productsList = [];
                }
                return service.productsList;
            });

        };


        service.updateProductField = function (field, productId, idShop, idLang, value) {
            return webService.invoke('updateProductField', {field: field, productId: productId, idShop: idShop, idLang: idLang, value: value }).then(function (data) {
                return data;
            });
        };


        service.getCategories = function () {
            return webService.invoke('getCategories').then(function (data) {
                return data;
            });
        };

        service.getTaxesRules = function (forceAjax) {
            if (!forceAjax && service.taxesList) {
                var defered = $q.defer();
                defered.resolve(service.taxesList);
                return defered.promise;
            }
            return webService.invoke('getTaxesRules').then(function (data) {
                service.taxesList = data;
                return data;
            });
        };


        service.getLanguages = function () {
            return webService.invoke('getLanguages').then(function (data) {
                return data;
            });
        };

        service.getFeatures = function (idProduct) {
            if (service.featuresList) {
                var defered = $q.defer();
                defered.resolve(service.featuresList);
                return defered.promise;
            }

            return webService.invoke('getFeatures', {productId: idProduct}).then(function (data) {
                service.featuresList = data;
                return data;
            });
        };


        service.getProduct = function (idProduct) {
            return webService.invoke('getProduct', {productId: idProduct}).then(function (data) {
                return data;
            });
        };
        service.getProductAttributes = function (idProduct) {
            return webService.invoke('getProductAttributes', {productId: idProduct}).then(function (data) {
                return data;
            });
        };

        service.getProductFeatures = function (idProduct) {
            return webService.invoke('getProductFeatures', {productId: idProduct}).then(function (data) {
                return data;
            });
        };


        service.saveQuickEdit = function (product) {
            var values = {
                name: product.name,
                reference: product.reference,
                ean13: product.ean13,
                upc: product.upc,
                description_short: product.description_short,
                description: product.description
            };

            return webService.invoke('saveQuickEdit', {values: values, productId: product.id_product, idShop: product.id_shop, idLang: product.id_lang}).then(function (data) {
                return data;
            });

        };
        service.saveSEO = function (seo, product) {
            return webService.invoke('saveSEO', {values: seo, productId: product.id_product, idShop: product.id_shop}).then(function (data) {
                return data;
            });
        };

        service.saveFeatures = function (features, product) {
            features = JSON.stringify(features);
            return webService.invoke('saveFeatures', {features: features, productId: product.id_product, idShop: product.id_shop, idLang: product.id_lang}).then(function (data) {
                return data;
            });

        };
        service.saveAttributes = function (attributes) {
            attributes = JSON.stringify(attributes);
            return webService.invoke('saveAttributes', {attributes: attributes}).then(function (data) {
                return data;
            });

        };

        return service;

    });


angular.module('wlp').factory('TaxCalculator', function (products) {
    var service = {};
    var taxesArray;

    products.getTaxesRules().then(function (result) {
        taxesArray = result;
    });

    service.getTaxes = function (selectedTax) {
        return taxesArray[selectedTax];
    };


    service.removeTaxes = function (price, taxId) {

        var taxes = service.getTaxes(taxId);
        var price_without_taxes = price;

        if (taxes.computation_method == 0) {
            for (i in taxes.rates) {
                price_without_taxes /= (1 + taxes.rates[i] / 100);
                break;
            }
        }
        else if (taxes.computation_method == 1) {
            var rate = 0;
            for (i in taxes.rates) {
                rate += taxes.rates[i];
            }
            price_without_taxes /= (1 + rate / 100);
        }
        else if (taxes.computation_method == 2) {
            for (i in taxes.rates) {
                price_without_taxes /= (1 + taxes.rates[i] / 100);
            }
        }

        return price_without_taxes;
    };


    service.addTaxes = function (price, taxId) {
        var taxes = service.getTaxes(taxId);

        var price_with_taxes = price;
        if (taxes.computation_method == 0) {
            for (var i in taxes.rates) {
                price_with_taxes *= (1 + taxes.rates[i] / 100);
                break;
            }
        }
        else if (taxes.computation_method == 1) {
            var rate = 0;
            for (var i in taxes.rates) {
                rate += taxes.rates[i];
            }
            price_with_taxes *= (1 + rate / 100);
        }
        else if (taxes.computation_method == 2) {
            for (var i in taxes.rates) {
                price_with_taxes *= (1 + taxes.rates[i] / 100);
            }
        }

        return price_with_taxes;
    };

    return service;
});


angular.module('wlp').factory('ProductListItem', function (products, TaxCalculator) {

    /**
     * Constructor, with class name
     */
    function ProductListItem(product) {
        angular.extend(this, product);
        this.priceDisplayPrecision = this.priceDisplayPrecision ? this.priceDisplayPrecision : 2;
        this.priceTE = this.price = parseFloat(this.price);
        this.id_product = parseInt(this.id_product);
        this.default_on = parseInt(this.default_on) ? 1 : 0;
        this.calcPriceTI();
    }

    /**
     * Public method, assigned to prototype
     */
    ProductListItem.prototype.getName = function () {
        return this.name;
    };

    /**
     * Public method, assigned to prototype
     */
    ProductListItem.prototype.hasAttributes = function () {
        return this.attributes.length;
    };

    /**
     * Private property
     */
    var possibleRoles = ['admin', 'editor', 'guest'];



    /**
     * Private function
     */
    function checkRole(role) {
        return possibleRoles.indexOf(role) !== -1;
    }

    /**
     * Static property
     * Using copy to prevent modifications to private property
     */
    ProductListItem.possibleRoles = angular.copy(possibleRoles);

    /**
     * Static method, assigned to class
     * Instance ('this') is not available in static context
     */
    ProductListItem.build = function (data) {
        var listItems = [];
        angular.forEach(data, function (item) {
            listItems.push(new ProductListItem(
                item
            ));
        });
        return listItems;
    };



    ProductListItem.prototype.calcPriceTE = function () {
        if (typeof this.priceTI == 'undefined')
            this.calcPriceTI();

        var priceTI = parseFloat(this.priceTI);
        var newPrice = TaxCalculator.removeTaxes(ps_round(priceTI - this.getEcotaxTaxTI(), this.priceDisplayPrecision), this.id_tax_rules_group);
        newPrice = (isNaN(newPrice) == true || newPrice < 0) ? '' : ps_round(newPrice, 6).toFixed(6);
        this.priceTE = newPrice;
    };



    ProductListItem.prototype.calcPriceTI = function () {
        var priceTE = parseFloat(this.priceTE);
        var newPrice = TaxCalculator.addTaxes(priceTE, this.id_tax_rules_group);
        newPrice = (isNaN(newPrice) == true || newPrice < 0) ? '' : ps_round(newPrice, this.priceDisplayPrecision);
        this.priceTI = newPrice + this.getEcotaxTaxTI();
    };



    ProductListItem.prototype.getEcotaxTaxTI = function () {
        if (typeof this.ecotaxTI == 'undefined') {
            this.ecotaxTI = 0;
            if (parseInt(this.use_ecotax)) {
                var ecoTax = TaxCalculator.addTaxes(this.ecotax, this.ecotax_tax_rules_group_id);
                this.ecotaxTI = ps_round(ecoTax, this.priceDisplayPrecision);
            }
        }
        return this.ecotaxTI;
    };




    /**
     * Return the constructor function
     */
    return ProductListItem;
});



angular.module('wlp').factory('AttributeListItem', function (products, TaxCalculator) {

    /**
     * Constructor, with class name
     */
    function AttributeListItem(product, attribute) {
        angular.extend(this, attribute);
        this.product = product;
        this.priceDisplayPrecision = this.priceDisplayPrecision ? this.priceDisplayPrecision : 2;
        this.priceTE = this.price = parseFloat(this.price);
        this.ecotax = parseFloat(this.ecotax);
        this.calcPriceTI();
    }


    /**
     * Static method, assigned to class
     * Instance ('this') is not available in static context
     */
    AttributeListItem.build = function (product, data) {
        var listItems = [];
        angular.forEach(data, function (item) {
            listItems.push(new AttributeListItem( product, item ));
        });
        return listItems;
    };



    AttributeListItem.prototype.calcPriceTE = function () {
        if (typeof this.priceTI == 'undefined')
            this.calcPriceTI();
        var priceTI = parseFloat(this.priceTI);
        var newPrice = TaxCalculator.removeTaxes(ps_round(priceTI, this.priceDisplayPrecision), this.product.id_tax_rules_group);
        newPrice = (isNaN(newPrice) == true) ? '' : ps_round(newPrice, 6).toFixed(6);
        this.priceTE = parseFloat(newPrice);
        this.updateFinalPrice();
    };



    AttributeListItem.prototype.calcPriceTI = function () {
        var priceTE = parseFloat(this.priceTE);
        var newPrice = TaxCalculator.addTaxes(priceTE, this.product.id_tax_rules_group);
        newPrice = (isNaN(newPrice) == true) ? '' : ps_round(newPrice, this.priceDisplayPrecision);
        this.priceTI = ps_round(parseFloat(newPrice), this.priceDisplayPrecision);
        this.updateFinalPrice();
    };


    AttributeListItem.prototype.calcFromFinalPriceTE = function () {
        var finalPriceTE = parseFloat(this.finalPriceTE);
        var newFinalPriceTI = TaxCalculator.addTaxes(finalPriceTE , this.product.id_tax_rules_group);
        this.finalPriceTI = newFinalPriceTI + this.getEcotaxTaxTI();
        this.updatePrices();

    };


    AttributeListItem.prototype.calcFromFinalPriceTI = function () {
        var finalPriceTI = parseFloat(this.finalPriceTI);
        var newFinalPriceTE = TaxCalculator.removeTaxes(ps_round(finalPriceTI - this.getEcotaxTaxTI(), this.priceDisplayPrecision), this.product.id_tax_rules_group);
        this.finalPriceTE = newFinalPriceTE;
        this.updatePrices();
    };



    AttributeListItem.prototype.updatePrices = function(){
        this.priceTE = this.finalPriceTE - this.product.priceTE;
        this.priceTI = ps_round(this.finalPriceTI - this.product.priceTI, this.priceDisplayPrecision);
    };



    AttributeListItem.prototype.updateFinalPrice = function(){
        this.finalPriceTE = parseFloat(this.product.priceTE) + parseFloat(this.priceTE);
        this.finalPriceTI = parseFloat(this.product.priceTI) + parseFloat(this.priceTI);
    };



    AttributeListItem.prototype.calcImpactPriceTI = function()
    {
        var priceTE = parseFloat(document.getElementById('attribute_priceTEReal').value.replace(/,/g, '.'));
        var newPrice = addTaxes(priceTE);
        $('#attribute_priceTI').val((isNaN(newPrice) == true || newPrice < 0) ? '' : ps_round(newPrice, priceDisplayPrecision).toFixed(priceDisplayPrecision));
        var total = ps_round((parseFloat($('#attribute_priceTI').val()) * parseInt($('#attribute_price_impact').val()) + parseFloat($('#finalPrice').html())), priceDisplayPrecision);
        if (isNaN(total) || total < 0)
            $('#attribute_new_total_price').html('0.00');
        else
            $('#attribute_new_total_price').html(total);
    };


    AttributeListItem.prototype.calcImpactPriceTE = function()
    {
        var priceTI = parseFloat(document.getElementById('attribute_priceTI').value.replace(/,/g, '.'));
        priceTI = (isNaN(priceTI)) ? 0 : ps_round(priceTI);
        var newPrice = removeTaxes(ps_round(priceTI, priceDisplayPrecision));
        $('#attribute_price').val((isNaN(newPrice) == true || newPrice < 0) ? '' : ps_round(newPrice, 6).toFixed(6));
        $('#attribute_priceTEReal').val((isNaN(newPrice) == true || newPrice < 0) ? 0 : ps_round(newPrice, 9));
        var total = ps_round((parseFloat($('#attribute_priceTI').val()) * parseInt($('#attribute_price_impact').val()) + parseFloat($('#finalPrice').html())), priceDisplayPrecision);
        if (isNaN(total) || total < 0)
            $('#attribute_new_total_price').html('0.00');
        else
            $('#attribute_new_total_price').html(total);
    };


    AttributeListItem.prototype.getEcotaxTaxTI = function () {
        if(this.ecotax == 0){
            // get the parent ecotax
            this.ecotaxTI = this.product.getEcotaxTaxTI();
        } else {
            if (typeof this.ecotaxTI == 'undefined') {
                this.ecotaxTI = 0;
                if (parseInt(this.product.use_ecotax)) {
                    var ecoTax = TaxCalculator.addTaxes(this.ecotax, this.product.ecotax_tax_rules_group_id);
                    this.ecotaxTI = ps_round(ecoTax, this.priceDisplayPrecision);
                }
            }
        }
        return this.ecotaxTI;
    };


    AttributeListItem.prototype.getValue = function () {


        var value = {
            id_product : this.product.id_product,
            id_product_attribute : this.id_product_attribute,
            id_shop : this.id_shop,
            price : ps_round(this.priceTE, 6),
            quantity : this.quantity,
            reference : this.reference,
            ean13 : this.ean13,
            upc : this.upc,
            default_on : this.default_on ? 1 : 0
        };
        return value;
    };



    /**
     * Return the constructor function
     */
    return AttributeListItem;
});