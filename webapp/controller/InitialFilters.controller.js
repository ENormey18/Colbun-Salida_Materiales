sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "salidademateriales/libs/signature_pad.umd.min"
], (BaseController, JSONModel) => {
    "use strict";

    return BaseController.extend("salidademateriales.controller.App", {
        onInit() {
            this.loadLocalModel();
        },
        async loadLocalModel() {
            const localModel = new JSONModel();
            await localModel.loadData("../model/mockdata/localmodel.json");
            this.getOwnerComponent().setModel(localModel, "LocalModel");
        },
        onBuscar(){
            const oView = this.getView();
            const materialFrom = oView.byId("materialFromInput")?.getValue();
            const materialTo = oView.byId("materialToInput")?.getValue();
            const centro = oView.byId("centroInput")?.getValue();
            this.getOwnerComponent().getRouter().navTo("RouteListado", {
                "?query": {
                    materialFrom,
                    materialTo,
                    centro
                }
            });
        },
    });
});