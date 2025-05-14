sap.ui.define([
    "sap/ui/core/mvc/Controller",
], (BaseController) => {
    "use strict";

    return BaseController.extend("salidademateriales.controller.App", {
        onInit() {},
        onBuscar(){
            const oView = this.getView();
            const materialFrom = oView.byId("materialFromInput")?.getValue();
            const materialTo = oView.byId("materialToInput")?.getValue();
            const centro = oView.byId("centroInput")?.getValue();
            const queryParams = {
                ...(materialFrom ? { materialFrom } : {}),
                ...(materialTo ? { materialTo } : {}),
                ...(centro ? {centro} : {})
            }
            const navToConfig = Object.entries(queryParams).length > 0 ? {"?query": queryParams} : {}
            this.getOwnerComponent().getRouter().navTo("RouteListado", navToConfig);
        },
    });
});