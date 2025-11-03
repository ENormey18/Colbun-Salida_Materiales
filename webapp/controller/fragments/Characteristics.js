sap.ui.define(
  [
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    "salidademateriales/utils/Utils",
  ],
  function (Fragment, MessageToast, Utils) {
    "use strict";
    return {
      _oResourceBundle: null,
      _oDialog: null,
      _oView: null,
      _oComponent: null,
      _sFragmentId: null,

      /**
       * Inicializa el handler con el contexto del controlador principal.
       * @param {sap.ui.core.mvc.Controller} oController El controlador que posee el diálogo.
       */
      init: function (oController) {
        this._oController = oController;
        this._oView = oController.getView();
        this._oComponent = oController.getOwnerComponent();
        this._sFragmentId = this._oView.createId(
          "caracteristicasMaterialesDialog"
        );
        this._oResourceBundle = this._oComponent.getModel("i18n").getResourceBundle();
      },

      /**
       * Abre el diálogo de características.
       * @param {sap.ui.base.Event} oEvent El evento del botón que lo abre.
       */
      open: async function (oEvent) {
        const oItemContext = oEvent
          .getSource()
          .getBindingContext("detalleReserva");
        const sFragmentId = this._oView.createId(
          "caracteristicasMaterialesDialog"
        );

        if (!this._oDialog) {
          this._oDialog = await Fragment.load({
            id: this._sFragmentId,
            name: "salidademateriales.view.fragments.details.dialogs.CaracteristicasMaterialesDialog",
            controller: this,
          }).then((oDialog) => {
            this._oView.addDependent(oDialog);
            return oDialog;
          });
        }

        const sBindingPath = oItemContext?.sPath;
        if (!sBindingPath) {
          return MessageToast.show(
            this._oResourceBundle.getText("messageToastErrorShowCharact")
          );
        } else {
          this._oDialog.bindElement({
            path: sBindingPath,
            model: "detalleReserva",
          });
          this._oDialog.open();
          this._updateCharTableBinding("Tecnica");
        }
      },

      onClassTypeSelect: function (oEvent) {
        const sSelectedKey = oEvent.getSource().getSelectedKey();
        this._updateCharTableBinding(sSelectedKey);
      },

      _updateCharTableBinding: function (sClassTypeKey) {
        const oItemContext = this._oDialog.getBindingContext("detalleReserva");
        const oItemData = oItemContext.getObject();

        let iClassIndex = oItemData.Clases.findIndex((c) =>
          sClassTypeKey === "General"
            ? c.Clase.toUpperCase().includes("CG_01")
            : !c.Clase.toUpperCase().includes("CG_01")
        );

        const oVBox = Fragment.byId(this._sFragmentId, "charContentVBox");
        if (iClassIndex > -1) {
          oVBox.bindElement({
            path: `${oItemContext.getPath()}/Clases/${iClassIndex}`,
            model: "detalleReserva",
          });
        } else {
          oVBox.unbindElement("detalleReserva");
        }

        const oSelectBtn = Fragment.byId(
          this._sFragmentId,
          "select-class-mat"
        );
        oSelectBtn.setSelectedKey(sClassTypeKey);
      },

      onAceptarCaracteristicas: async function () {
        this._oView.setBusy(true);
        this._oDialog.setBusy(true);

        // Cambiar this.getOwnerComponent() por this._oComponent
        const oODataModel = this._oComponent.getModel();
        const oDetalleModel = this._oView.getModel("detalleReserva");

        const oTable = Fragment.byId(
          this._sFragmentId,
          "caracteristicasTable"
        );
        const sClassBindingPath =
          oTable.getBindingContext("detalleReserva")?.sPath;

        if (!sClassBindingPath) {
          return MessageToast.show(
            this._oResourceBundle.getText("messageToastErrorChangeCharact")
          );
        }
        const aCaracteristicas = oDetalleModel.getProperty(
          `${sClassBindingPath}/ToCaracteristicas/results`
        );
        const aCaracteristicasModificadas = aCaracteristicas?.filter(
          (c) => c.NuevoValor
        );
        if (
          aCaracteristicasModificadas &&
          aCaracteristicasModificadas.length > 0
        ) {
          const oCaractUpdatedMap = new Map();
          const oErrorMap = new Map();

          for (const oCaracteristica of aCaracteristicasModificadas) {
            const sKey = oODataModel.createKey("CaractMatSet", {
              Material: oCaracteristica.Material,
              Clase: oCaracteristica.Clase,
              Caracteristica: oCaracteristica.Caracteristica,
            });
            const sPath = "/" + sKey;
            try {
              await this._updateCaracteristicaAsync(oODataModel, sPath, {
                Valor: oCaracteristica.NuevoValor.trim(),
              });
              oCaracteristica.Valor =
                oCaracteristica.NuevoValor.trim().toUpperCase();
              delete oCaracteristica.NuevoValor;
              oCaractUpdatedMap.set(
                oCaracteristica.Caracteristica,
                oCaracteristica
              );
            } catch (oError) {
              const sErrorMessage = Utils.processErrorResponse(oError);
              oErrorMap.set(oCaracteristica.Caracteristica, sErrorMessage);
            }
          }

          const oNewCaracteristicasMap = new Map();
          aCaracteristicas.forEach((oCaract) => {
            oNewCaracteristicasMap.set(oCaract.Caracteristica, oCaract);
          });
          oCaractUpdatedMap.forEach((oCaractUpd, sCaracteristica) => {
            oNewCaracteristicasMap.set(sCaracteristica, oCaractUpd);
          });
          oDetalleModel.setProperty(
            `${sClassBindingPath}/ToCaracteristicas/results`,
            Array.from(oNewCaracteristicasMap.values())
          );

          if (oErrorMap.size > 0) {
            const aMessages = [];
            oErrorMap.forEach((oErrorMessage, sCaracteristica) => {
              const oMessage = {
                type: "Error",
                title: this._oResourceBundle.getText("characteristicUpdate"),
                subtitle:
                  this._oResourceBundle.getText("popoverMessageDescriptionErrorUpdateCharact") +
                  sCaracteristica,
                active: true,
                description: oErrorMessage,
              };
              aMessages.push(oMessage);
            });
            const aOldMessag = oDetalleModel.getProperty("/Messages");
            const aNewMessag = aOldMessag.concat(aMessages);
            oDetalleModel.setProperty("/Messages", aNewMessag);
          } else {
            const aCurrentMessages = oDetalleModel.getProperty("/Messages");
            const aNewMessages = [...aCurrentMessages];
            const aCaractUpd = Array.from(oCaractUpdatedMap.keys());
            const oMessage = {
              type: "Success",
              title: this._oResourceBundle.getText("characteristicUpdate"),
              subtitle: this._oResourceBundle.getText("popoverMessageSubtitleSuccessUpdateCharact"),
              active: true,
              description:
                this._oResourceBundle.getText("popoverMessageDescriptionSuccessUpdateCharact") +
                aCaractUpd.join(", "),
            };
            aNewMessages.push(oMessage);
            oDetalleModel.setProperty("/Messages", aNewMessages);
          }
        } else {
          this._oDialog.setBusy(false);
          this._oView.setBusy(false);
          return MessageToast.show(
            this._oResourceBundle.getText("messageToastMissingNewCharact")
          );
        }

        this._oController._setItemsEnhancement(); //Controlador Details
        this._oDialog.setBusy(false);
        this._oView.setBusy(false);
        this._oDialog.close();
        return MessageToast.show(this._oResourceBundle.getText("messageToastCharactUpdated"));
      },

      _updateCaracteristicaAsync: function (oODataModel, sPath, oData) {
        return new Promise((resolve, reject) => {
          oODataModel.update(sPath, oData, {
            merge: false,
            success: (oResult) => resolve(oResult),
            error: (oError) => reject(oError),
          });
        });
      },

      onCancelarCaracteristicas: function () {
        const oDetalleModel = this._oView.getModel("detalleReserva");
        const oTable = Fragment.byId(
          this._sFragmentId,
          "caracteristicasTable"
        );
        const sClassBindingPath =
          oTable.getBindingContext("detalleReserva")?.sPath;
        if (!sClassBindingPath) {
          return MessageToast.show(
            this._oResourceBundle.getText("messageToastErrorChangeCharact")
          );
        }
        const aCaracteristicas = oDetalleModel.getProperty(
          `${sClassBindingPath}/ToCaracteristicas/results`
        );
        if (aCaracteristicas) {
          aCaracteristicas.forEach((oCaract) => {
            if (oCaract.NuevoValor) {
              delete oCaract.NuevoValor;
            }
          });
          oDetalleModel.setProperty(
            `${sClassBindingPath}/ToCaracteristicas/results`,
            aCaracteristicas
          );
        }
        this._oDialog.close();
      },
    };
  }
);
