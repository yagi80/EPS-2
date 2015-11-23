<?php

class EffectiveProductsUpdate extends Module
{
    public function __construct()
    {
        $this->name = 'effectiveproductsupdate';
        $this->tab = 'back_office_features';
        $this->version = '0.0.9';
        $this->author = 'Yves-André Giroud';
        $this->need_instance = 0;
        $this->ps_versions_compliancy = array('min' => '1.6', 'max' => _PS_VERSION_);

        parent::__construct();

        $this->displayName = $this->l('Effective products management control');
        $this->description = $this->l('This module add new interface in products management.
        It\'s fast, easy and reliable');
        $this->confirmUninstall = $this->l('Are you sure you want to uninstall?');
        $this->mainLanguage = 1;

        if (!Configuration::get('MYMODULE_NAME')){
            $this->warning = $this->l('No name provided');
        }
    }



    public function getContent()
    {
        $output = '<h2>Effective products management</h2>';
        $output .= $this->l('This module will help you with the long task for
         updating all your products and categories with a single click.').'<br/><br/>';

        return $output;
    }





    public function install()
    {
        if (Shop::isFeatureActive()){
            Shop::setContext(Shop::CONTEXT_ALL);
        }

        return parent::install()
        && $this->installModuleTab('AdminQuickProductsEdition',
            array(1=>'Products management', 2=>'Products management'), 9)
        && Configuration::updateValue('AdminQuickProductsEdition_Title', 'my friend');
    }


    public function uninstall()
    {
        if (!parent::uninstall()
            || !$this->uninstallModuleTab('AdminQuickProductsEdition')
            || !Configuration::deleteByName('AdminQuickProductsEdition_Title')) {
            return false;
        }
        return true;
    }


    private function installModuleTab($tabClass, $tabName, $idTabParent)
    {
        $tab = new Tab();
        $tab->name = $tabName;
        $tab->class_name = $tabClass;
        $tab->module = $this->getName();
        $tab->id_parent = $idTabParent;
        if(!$tab->save())
            return false;
        return true;
    }


    private function uninstallModuleTab($tabClass)
    {
        $idTab = Tab::getIdFromClassName($tabClass);
        if($idTab != 0){
            $tab = new Tab($idTab);
            $tab->delete();
            return true;
        }
        return false;
    }
}
?>