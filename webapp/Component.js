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

        fetch(
          jQuery.sap.getModulePath("salidademateriales") +
            "/user-api/currentUser",
          { headers: { Accept: "application/json" } }
        )
          .then((response) => {
            if (!response.ok) {
              throw new Error("Network response was not ok");
            }
            return response.json();
          })
          .then((oData) => {
            const oUserModel = new JSONModel({
              Nombre: oData.firstname,
              Apellido: oData.lastname,
              Name: oData.name,
              Email: oData.email,
            });
            this.setModel(oUserModel, "Usuario");
          })
          .catch((error) => {
            console.error(
              "Error al obtener la información del usuario:",
              error
            );
            const oUserModel = new JSONModel({
              Nombre: "Usuario Desconocido",
              Email: "",
            });
            this.setModel(oUserModel, "Usuario");
          });

        const oDetailsStateModel = new JSONModel({
          hasData: false,
          reservaId: null,
          data: {},
          selectedPaths: [],
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

        this.getRouter().initialize();
      },
    });
  }
);
