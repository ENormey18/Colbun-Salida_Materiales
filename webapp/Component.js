sap.ui.define(
  [
    "sap/ui/core/UIComponent",
    "salidademateriales/model/models",
    "sap/ui/model/json/JSONModel",
  ],
  (UIComponent, models, JSONModel) => {
    "use strict";

    return UIComponent.extend("salidademateriales.Component", {
      metadata: {
        manifest: "json",
        interfaces: ["sap.ui.core.IAsyncContentCreation"],
      },

      init() {
        // call the base component's init function
        UIComponent.prototype.init.apply(this, arguments);

        // set the device model
        this.setModel(models.createDeviceModel(), "device");

        const oDetailsStateModel = new JSONModel({
                hasData: false,
                reservaId: null,
                data: {},
                selectedPaths: []
            });
        this.setModel(oDetailsStateModel, "detailsStateModel");

        const oSalidaMatModel = new JSONModel({
          Fecha: new Date().toISOString().slice(0, 10),
          FechaContabilizacion: new Date().toISOString().slice(0, 10),
          Reserva: "",
          Destinatario: "",
          Materiales: [],
        });
        this.setModel(oSalidaMatModel, "salidaMatModel");

        // enable routing
        this.getRouter().initialize();
      },
    });
  }
);
