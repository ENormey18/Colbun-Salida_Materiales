sap.ui.define([
    "sap/ui/base/Object",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (BaseObject, Fragment, Filter, FilterOperator) {
    "use strict";

    return BaseObject.extend("salidademateriales.controller.fragments.ValueHelpReceptores", {

        _oDialog: null,
        _oController: null,
        _oView: null,
        _oConfig: null,

        /**
         * Constructor para el ValueHelpHandler.
         * @param {sap.ui.core.mvc.Controller} oController El controlador principal.
         * @param {object} oConfig Objeto de configuración.
         * @param {string} oConfig.modelName Nombre del modelo que contiene los datos.
         * @param {string} oConfig.listPath Path al array de la lista completa (ej: "/Receptores").
         * @param {string} oConfig.keyField Nombre del campo clave en el objeto de la lista (ej: "Usuario").
         * @param {string} oConfig.descriptionField Nombre del campo de descripción (ej: "Nombre").
         * @param {string} oConfig.keyModelPath Path a la propiedad del modelo donde se guarda la clave (ej: "/DestinatarioUser").
         * @param {string} oConfig.descriptionModelPath Path a la propiedad del modelo donde se guarda la descripción (ej: "/DestinatarioName").
         * @param {string} oConfig.fragmentName Nombre completo del fragmento del diálogo (ej: "salidademateriales.view.fragments.dialogs.ReceptoresSelectDialog").
         */
        constructor: function (oController, oConfig) {
            this._oController = oController;
            this._oView = oController.getView();
            this._oConfig = oConfig;
        },

        /**
         * Abre el diálogo de Value Help.
         */
        open: function () {
            if (!this._oDialog) {
                const sFragmentId = this._oView.createId("valueHelpDialog_" + this._oConfig.keyField);
                this._oDialog = Fragment.load({
                    id: sFragmentId,
                    name: this._oConfig.fragmentName,
                    controller: this 
                }).then((oDialog) => {
                    this._oView.addDependent(oDialog);
                    return oDialog;
                });
            }
            this._oDialog.then((oDialog) => oDialog.open());
        },

        /**
         * Maneja el evento de búsqueda dentro del SelectDialog.
         * @param {sap.ui.base.Event} oEvent El evento 'search'.
         */
        onSearch: function (oEvent) {
            const sValue = oEvent.getParameter("value");
            const oFilter = new Filter({
                filters: [
                    new Filter(this._oConfig.descriptionField, FilterOperator.Contains, sValue),
                    new Filter(this._oConfig.keyField, FilterOperator.Contains, sValue)
                ],
                and: false
            });
            oEvent.getSource().getBinding("items").filter([oFilter]);
        },

        /**
         * Maneja el evento de confirmación (OK) del SelectDialog.
         * @param {sap.ui.base.Event} oEvent El evento 'confirm'.
         */
        onClose: function (oEvent) {
            const oSelectedItem = oEvent.getParameter("selectedItem");
            const oViewModel = this._oView.getModel(this._oConfig.modelName);

            if (oSelectedItem) {
                const oSelectedData = oSelectedItem.getBindingContext(this._oConfig.modelName).getObject();
                oViewModel.setProperty(this._oConfig.descriptionModelPath, oSelectedData[this._oConfig.descriptionField]);
                oViewModel.setProperty(this._oConfig.keyModelPath, oSelectedData[this._oConfig.keyField]);
            }
            oEvent.getSource().getBinding("items").filter([]);
        },

        /**
         * Maneja el evento 'change' del Input principal para validar la entrada manual.
         * @param {sap.ui.base.Event} oEvent El evento 'change' del Input.
         */
        onChange: function (oEvent) {
            const sValue = oEvent.getParameter("value");
            const oViewModel = this._oView.getModel(this._oConfig.modelName);
            const aFullList = oViewModel.getProperty(this._oConfig.listPath) || [];

            if (!sValue) {
                oViewModel.setProperty(this._oConfig.descriptionModelPath, "");
                oViewModel.setProperty(this._oConfig.keyModelPath, "");
                return;
            }

            // Buscar si el valor introducido coincide con una clave (Usuario)
            const oFoundItem = aFullList.find(
                item => item[this._oConfig.keyField].toUpperCase() === sValue.toUpperCase()
            );

            if (oFoundItem) {
                // Si se encuentra, autocompletar la descripción
                oViewModel.setProperty(this._oConfig.descriptionModelPath, oFoundItem[this._oConfig.descriptionField]);
                oViewModel.setProperty(this._oConfig.keyModelPath, oFoundItem[this._oConfig.keyField].toUpperCase());
            } else {
                // Si no se encuentra, aceptar la entrada manual como la clave
                oViewModel.setProperty(this._oConfig.descriptionModelPath, sValue);
                oViewModel.setProperty(this._oConfig.keyModelPath, sValue.toUpperCase());
            }
        },
        
        /**
         * Limpia los recursos (el diálogo) para evitar memory leaks.
         */
        destroy: function() {
            if (this._oDialog) {
                this._oDialog.then(oDialog => oDialog.destroy());
                this._oDialog = null;
            }
        }
    });
});