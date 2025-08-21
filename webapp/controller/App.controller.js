sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",    
    "salidademateriales/libs/signature_pad.umd.min"
], (BaseController,JSONModel) => {
    "use strict";

    return BaseController.extend("salidademateriales.controller.App", {
        onInit() {
            /*this.loadLocalModel();*/
        },
        /*async loadLocalModel() {
            const localModel = new JSONModel();
            const mockModelUrl = sap.ui.require.toUrl('salidademateriales/model/mockdata/localmodel.json')
            await localModel.loadData(mockModelUrl);
            const reservas = localModel.getProperty("/reservas")
            localModel.setProperty("/filteredReservas", reservas);
            this.getOwnerComponent().setModel(localModel, "LocalModel");
        },*/
    });
});