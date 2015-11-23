<?php

class AdminQuickProductsEditionController extends ModuleAdminController
{

    public $bootstrap = true;


    public function __construct()
    {
        $this->table = 'product';
        parent::__construct();
    }


    public function initContent($token = null)
    {

        $this->getLanguages();
        $this->initToolbar();
        $this->initTabModuleList();
        $this->initPageHeaderToolbar();
        $this->display = 'view';

        $this->context->smarty->assign('ajax_CustomModuleController_path', $this->context->link->getAdminLink('AdminQuickProductsEdition'));
        $this->context->smarty->assign('url', _MODULE_DIR_ . $this->module->name);

        $this->context->smarty->assign(array(
            'url_post' => self::$currentIndex . '&token=' . $this->token,
            'show_page_header_toolbar' => 0,
            'page_header_toolbar_title' => 'Quick products manager',
            'page_header_toolbar_btn' => $this->page_header_toolbar_btn
        ));

        $content = $this->context->smarty->fetch($this->getTemplatePath() . 'main.tpl');
        $this->context->smarty->assign(array(
            'content' => $content,
        ));
    }

    public function setMedia()
    {
        $this->addJS(_MODULE_DIR_ . $this->module->name . "/views/js/lib/ckeditor/ckeditor.js");
        $this->addJS(_MODULE_DIR_ . $this->module->name . "/views/js/lib/angular.min.js");
        $this->addJS(_MODULE_DIR_ . $this->module->name . "/views/js/lib/angular-route.min.js");
        $this->addJS(_MODULE_DIR_ . $this->module->name . "/views/js/lib/angular-table.js");
        $this->addJS(_MODULE_DIR_ . $this->module->name . "/views/js/app/app.js");
        $this->addJS(_MODULE_DIR_ . $this->module->name . "/views/js/app/controllers/application.js");
        $this->addJS(_MODULE_DIR_ . $this->module->name . "/views/js/app/services/products.js");
        parent::setMedia();
    }


    public function displayAjax()
    {
        $data = null;

        switch (Tools::getValue('fn')) {
            case 'getLanguages':
                $data = Language::getLanguages();
                break;

            case 'getCategories':
                $data = Category::getCategories();
                break;

            case 'getTaxesRules':
                $data = $this->getTaxesRules();
                break;

            case 'getList':
                $data = $this->getProductsList();
                break;

            case 'updateProductField':
                $field = Tools::getValue('field');
                $lang_id = Tools::getValue('idLang');
                $shop_id = Tools::getValue('idShop');
                $id_product = Tools::getValue('productId');
                $value = Tools::getValue('value');
                if ($field && $lang_id && $shop_id && $id_product && $value) {
                    $data = $this->updateProductField($field, $lang_id, $shop_id, $id_product, $value);
                } else {
                    $this->errors = Tools::displayError('Wrong params given.');
                }
                break;

            case 'getProduct':
                $data = new Product(Tools::getValue('productId'));
                $data->price_final = Product::getPriceStatic(Tools::getValue('productId'));
                break;

            case 'getFeatures':
                $lang_id = 1;
                $data = $this->getFeaturesList($lang_id);
                break;

            case 'getProductFeatures':
                $product_id = (int)Tools::getValue('productId');
                $data = $this->getProductFeatures($product_id);
                break;

            case 'getProductAttributes':
                $lang_id = 1;
                $product_id = (int)Tools::getValue('productId');
                $data = $this->getProductAttributes($product_id, $lang_id);
                break;

            case 'saveFeatures':
                $this->processFeatures();
                break;

            case 'saveSEO':
                $this->saveProductSEO();
                break;

            case 'saveAttributes':
                $data = $this->saveAttributes();
                break;

            case 'saveQuickEdit':
                $lang_id = Tools::getValue('idLang');
                $shop_id = Tools::getValue('idShop');
                $id_product = Tools::getValue('productId');
                $values = Tools::getValue('values');
                if ($values && $lang_id && $shop_id && $id_product) {
                    $data = ($this->saveQuickProduct($values, $lang_id, $shop_id, $id_product));
                }
                break;
            default:
                break;
        }

        print_r(Tools::jsonEncode($data));
        die();
    }



    /**
     * Process features
     */
    public function processFeatures()
    {

        if (!Feature::isFeatureActive()) {
            return;
        }
        $id_product = (int)Tools::getValue('productId');

        if (Validate::isLoadedObject($product = new Product($id_product))) {
            // delete all objects
            $product->deleteFeatures();
            // add new objects
            $languages = Language::getLanguages(false);
            $features = Tools::jsonDecode(Tools::getValue('features'));
            foreach ($features as $val) {
                if ($val->featureValueId) {
                    $product->addFeaturesToDB($val->featureId, $val->featureValueId);
                } else {
                    $id_value = $product->addFeaturesToDB($val->featureId, 0, 1);
                    foreach ($languages as $language) {
                        $value = $val->value->$language['id_lang'];
                        $product->addFeaturesCustomToDB($id_value, (int)$language['id_lang'], $value);
                    }
                }
            }
        } else {
            $this->errors[] = Tools::displayError('A product must be created before adding features.');
        }
    }


    /**
     * Return the features list
     *
     * @param $lang_id
     * @return array
     */
    protected function getFeaturesList($lang_id)
    {
        if (!Feature::isFeatureActive()) {
            return array();
        }
        $data = Feature::getFeatures($lang_id);
        foreach ($data as &$feature) {
            $allValues = Db::getInstance()->executeS('
                            SELECT *
                            FROM `' . _DB_PREFIX_ . 'feature_value` v
                            LEFT JOIN `' . _DB_PREFIX_ . 'feature_value_lang` vl
                                ON (v.`id_feature_value` = vl.`id_feature_value` )
                            WHERE v.`id_feature` = ' . (int)$feature['id_feature'] . '
                            AND (v.`custom` IS NULL OR v.`custom` = 0)
                            ORDER BY `id_lang` ASC, vl.`value` ASC
                        ');

            $featuresValues = array();
            foreach ($allValues as $val) {
                if (!array_key_exists($val['id_feature_value'], $featuresValues)) {
                    $featuresValues[$val['id_feature_value']] = $val;
                    $featuresValues[$val['id_feature_value']]['lang'] = array();
                }
                $featuresValues[$val['id_feature_value']]['lang'][] = array('id_lang' => $val['id_lang'], 'value' => $val['value']);
            }
            $feature['options'] = array_values($featuresValues);
        }
        return $data;
    }

    /**
     * Return the taxes rules
     *
     * @return array
     */
    protected function getTaxesRules()
    {
        $address = new Address();
        $address->id_country = (int)$this->context->country->id;
        $tax_rules_groups = TaxRulesGroup::getTaxRulesGroups(true);
        $tax_rates = array(
            0 => array(
                'name_tax_rules_group' => 'No tax',
                'id_tax_rules_group' => 0,
                'rates' => array(0),
                'computation_method' => 0
            )
        );

        foreach ($tax_rules_groups as $tax_rules_group) {
            $id_tax_rules_group = (int)$tax_rules_group['id_tax_rules_group'];
            $name_tax_rules_group = $tax_rules_group['name'];
            $tax_calculator = TaxManagerFactory::getManager($address, $id_tax_rules_group)->getTaxCalculator();
            $tax_rates[$id_tax_rules_group] = array(
                'name_tax_rules_group' => $name_tax_rules_group,
                'id_tax_rules_group' => $id_tax_rules_group,
                'rates' => array(),
                'computation_method' => (int)$tax_calculator->computation_method
            );

            if (isset($tax_calculator->taxes) && count($tax_calculator->taxes)) {
                foreach ($tax_calculator->taxes as $tax) {
                    $tax_rates[$id_tax_rules_group]['rates'][] = (float)$tax->rate;
                }
            } else {
                $tax_rates[$id_tax_rules_group]['rates'][] = 0;
            }
        }
        return $tax_rates;
    }


    /**
     * Return the feature defualt value
     *
     * @param $languages
     * @param $value
     * @return string
     */
    protected function getFeatureDefaultValue($languages, $value)
    {
        $default_lang = Configuration::get('PS_LANG_DEFAULT');
        if ($value->value->$default_lang)
            return $value->value->$default_lang;

        foreach ($languages as $language) {
            if ($value->value->$language['id_lang'])
                return $value->value->$language['id_lang'];
        }

        return '';
    }


    /**
     * Save product main information
     *
     * @param $values
     * @param $lang_id
     * @param $shop_id
     * @param $id_product
     * @return bool|string
     *
     */
    protected function saveQuickProduct($values, $lang_id, $shop_id, $id_product)
    {
        if ($values && $lang_id && $shop_id && $id_product) {
            $values = Tools::jsonDecode($values);
            $result = Db::getInstance()->update('product_lang', array(
                'name' => $values->name,
                'description_short' => trim(preg_replace('/\s+/', ' ', $values->description_short)),
                'description' => preg_replace('/\s+/', ' ', trim($values->description)),
            ), 'id_product = ' . (int)$id_product . ' AND id_shop = ' . (int)$shop_id . ' AND id_lang = ' . (int)$lang_id);

            $result = $result && Db::getInstance()->update('product', array(
                    'reference' => $values->reference,
                    'ean13' => $values->ean13,
                    'upc' => $values->upc,
                ), 'id_product = ' . (int)$id_product);

            return $result;
        }
        return '0';
    }


    /**
     * Save the product SEO values
     *
     *
     */
    protected function saveProductSEO()
    {
        $id_product = Tools::getValue('productId');
        $values = Tools::getValue('values');
        $shop_id = Tools::getValue('idShop');
        $values = Tools::jsonDecode($values);

        foreach ($values->languages as $val) {
            $result = Db::getInstance()->update('product_lang', array(
                'meta_title' => $val->meta_title,
                'meta_description' => trim(preg_replace('/\s+/', ' ', $val->meta_description)),
                'link_rewrite' => preg_replace('/\s+/', ' ', trim($val->link_rewrite)),
            ), 'id_product = ' . (int)$id_product . ' AND id_shop = ' . (int)$shop_id . ' AND id_lang = ' . (int)$val->lang_id);
        }

        return $result;
    }

    /**
     * Save the product combination
     *
     * @return null|Product
     */
    protected function saveAttributes()
    {
        $attributes = Tools::jsonDecode(Tools::getValue('attributes'));

        if(count($attributes)) {
            $id_product = (int)$attributes[0]->id_product;
            $result = ObjectModel::updateMultishopTable('Combination', array(
                'default_on' => null
            ), 'a.`id_product` = '.$id_product);

//            $product = new Product($id_product, true);
            foreach ($attributes as $val) {
                StockAvailable::setQuantity($id_product, (int)$val->id_product_attribute, (int)$val->quantity);
//                Hook::exec('actionProductUpdate', array('id_product' => (int)$id_product, 'product' => $product));

                if((int)$val->default_on == 1) {
                    $result = ObjectModel::updateMultishopTable('Combination', array(
                        'default_on' => 1
                    ), 'a.`id_product` = '.(int)$val->id_product.' AND a.`id_product_attribute` = '.(int)$val->id_product_attribute);
                }

                $result &= ObjectModel::updateMultishopTable('Combination', array(
                    'price' => $val->price,
                    'quantity' => (int)$val->quantity,
                    'reference' => $val->reference,
                    'ean13' => $val->ean13,
                    'upc' => $val->upc
                ), 'a.`id_product` = '.(int)$val->id_product.' AND a.`id_product_attribute` = '.(int)$val->id_product_attribute);
            }
            return new Product($id_product, true);
        }

        return null;
    }


    /**
     * Update product field
     *
     * @param $field
     * @param $lang_id
     * @param $shop_id
     * @param $id_product
     * @param $value
     * @return bool|int|string
     */
    protected function updateProductField($field, $lang_id, $shop_id, $id_product, $value)
    {
        if ($field && $lang_id && $shop_id && $id_product && $value) {
            switch ($field) {
                case 'name':
                    $result = Db::getInstance()->update('product_lang', array(
                        'name' => $value,
                    ), 'id_product = ' . (int)$id_product . ' AND id_shop = ' . (int)$shop_id . ' AND id_lang = ' . (int)$lang_id);
                    return $result;

                case 'reference':
                    $result = Db::getInstance()->update('product', array(
                        'reference' => $value,
                    ), 'id_product = ' . (int)$id_product);
                    return $result;

                case 'price':
                    Db::getInstance()->update('product', array(
                        'price' => $value,
                    ), 'id_product = ' . (int)$id_product);

                    Db::getInstance()->update('product_shop', array(
                        'price' => $value,
                    ), 'id_product = ' . (int)$id_product . ' AND id_shop = ' . (int)$shop_id);
                    return 1;
                case 'category':
                    $result = Db::getInstance()->update('product', array(
                        'id_category_default' => (int)$value,
                    ), 'id_product = ' . (int)$id_product);

                    $result = $result && Db::getInstance()->update('product_shop', array(
                            'id_category_default' => (int)$value,
                        ), 'id_product = ' . (int)$id_product . ' AND id_shop = ' . (int)$shop_id);
                    return $result;

                case 'active':
                    $value = (int)$value ? 1 : 0;

                    Db::getInstance()->update('product', array(
                        'active' => $value,
                    ), 'id_product = ' . (int)$id_product);

                    Db::getInstance()->update('product_shop', array(
                        'active' => $value,
                    ), 'id_product = ' . (int)$id_product . ' AND id_shop = ' . (int)$shop_id);

                    return 1;

                case 'quantity':
                    $productAttribute = Tools::getValue('id_product_attribute') ? Tools::getValue('id_product_attribute') : 0;
                    if ($value === false || (!is_numeric(trim($value)))) {
                        die(Tools::jsonEncode(array('error' => $this->l('Undefined value'))));
                    }
                    if ($productAttribute === false) {
                        die(Tools::jsonEncode(array('error' => $this->l('Undefined id product attribute'))));
                    }
                    StockAvailable::setQuantity($id_product, (int)$productAttribute, (int)$value);
                    return 1;
            }
        }
        return '0';
    }


    /**
     * Return the products list
     *
     * @return array
     */
    protected function getProductsList()
    {
        $id_lang = Tools::getValue('id_lang') ? Tools::getValue('id_lang') : Context::getContext()->language->id;

        $sql = 'SELECT p.*, `im`.`id_image`, product_shop.*, pl.* , m.`name` AS manufacturer_name,  s.`name` AS supplier_name
                FROM `' . _DB_PREFIX_ . 'product` p
                ' . Shop::addSqlAssociation('product', 'p') . '
                LEFT JOIN `' . _DB_PREFIX_ . 'product_lang` pl ON (p.`id_product` = pl.`id_product` ' . Shop::addSqlRestrictionOnLang('pl') . ')
                LEFT JOIN `' . _DB_PREFIX_ . 'manufacturer` m ON (m.`id_manufacturer` = p.`id_manufacturer`)
                LEFT JOIN `' . _DB_PREFIX_ . 'image` im ON (im.`id_product` = p.`id_product` AND `position` = 1)
                LEFT JOIN `' . _DB_PREFIX_ . 'supplier` s ON (s.`id_supplier` = p.`id_supplier`) order by p.`id_product`, pl.`id_lang`';

        $rq = Db::getInstance(_PS_USE_SQL_SLAVE_)->executeS($sql, true, false);
        $result = [];
        $ps_use_ecotax = Configuration::get('PS_USE_ECOTAX');
        $ps_ecotax_tax_rules_group_id = Configuration::get('PS_ECOTAX_TAX_RULES_GROUP_ID');

        $params = array('token' => Tools::getAdminTokenLite('AdminProducts'));
        // merge the translations in one product object
        foreach ($rq as $row) {
            if (!array_key_exists($row['id_product'], $result)) {
                $link = Dispatcher::getInstance()->createUrl('AdminProducts', $id_lang, array_merge($params, array('id_product' => $row['id_product'], 'updateproduct' => '1')), false);
                $row['descriptions'] = array();
                $row['descriptions_short'] = array();
                $row['names'] = array();
                $row['link'] = $link;
                $row['categories'] = Product::getProductCategories($row['id_product']);
                $row['use_ecotax'] = $ps_use_ecotax;
                $row['ecotax_tax_rules_group_id'] = $ps_ecotax_tax_rules_group_id;
                $row['price_final'] = Product::getPriceStatic($row['id_product']);
                $row['quantity'] = Product::getQuantity(
                    (int)$row['id_product'],
                    0,
                    isset($row['cache_is_pack']) ? $row['cache_is_pack'] : null
                );


                $row['attributes'] = Product::getAttributesInformationsByProduct($row['id_product']);
                // generate the thumbnails
                $idImage = $row['id_image'];
                if ($idImage) {
                    $imgPath = 'p/';
                    for ($i = 0; $i < Tools::strlen($idImage); $i++) {
                        $imgPath .= $idImage[$i] . '/';
                    }
                    $imgPath .= $idImage . '.jpg';
                    $thumbnail = ImageManager::thumbnail(_PS_IMG_DIR_ . $imgPath, $this->table . '_mini_' . $row['id_product'] . '_1.' . $this->imageType, 45, $this->imageType);
                    $row['thumbnail'] = $thumbnail;
                }
                $result[$row['id_product']] = $row;
            }

            $product = & $result[$row['id_product']];
            $product['names'][$row['id_lang']] = $row['name'];
            $product['descriptions'][$row['id_lang']] = $row['description'];
            $product['descriptions_short'][$row['id_lang']] = $row['description_short'];
        }

        return $result;
    }


    /**
     * Return the product attributes
     *
     * @param $product_id
     * @param $lang_id
     * @return array
     */
    protected function getProductAttributes($product_id, $lang_id)
    {
        $product = new Product($product_id);
        return $product->getAttributesResume($lang_id);
    }


    /**
     * Return the product Features
     *
     * @param $product_id
     * @return array
     */
    protected function getProductFeatures($product_id)
    {
        $features = Db::getInstance(_PS_USE_SQL_SLAVE_)->executeS('SELECT fp.id_feature, fp.id_product, fp.id_feature_value, custom, fvl.value, fvl.id_lang
                            FROM `' . _DB_PREFIX_ . 'feature_product` fp
                            LEFT JOIN `' . _DB_PREFIX_ . 'feature_value` fv ON (fp.id_feature_value = fv.id_feature_value)
                            LEFT JOIN `' . _DB_PREFIX_ . 'feature_value_lang` fvl ON (fv.id_feature_value = fvl.id_feature_value)
                            WHERE `id_product` = ' . $product_id);

        $data = array();
        foreach ($features as $feature) {
            if (!array_key_exists($feature['id_feature'], $data)) {
                $data[$feature['id_feature']] = $feature;
                $data[$feature['id_feature']]['lang'] = array();
            }
            $data[$feature['id_feature']]['lang'][] = array('id_lang' => $feature['id_lang'], 'value' => $feature['value']);
        }

        return array_values($data);
    }


}

?>