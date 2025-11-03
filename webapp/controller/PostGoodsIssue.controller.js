sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "./fragments/SignatureHandler",
    "sap/ui/Device",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",
    "salidademateriales/utils/Utils",
    "salidademateriales/utils/MessagePopoverHandler",
    "salidademateriales/controller/fragments/ValueHelpReceptores",
  ],
  function (
    Controller,
    SignatureHandler,
    Device,
    MessageToast,
    JSONModel,
    formatter,
    Utils,
    MessagePopoverHandler,
    ValueHelpReceptores
  ) {
    "use strict";

    return Controller.extend("salidademateriales.controller.PostGoodsIssue", {
      formatter: formatter,
      _oResourceBundle: null,
      _signatureHandler: null,
      _destinatarioValueHelp: null,

      onInit: function () {
        const oRouter = this.getOwnerComponent().getRouter();
        Device.resize.attachHandler(this.changeCanvasSize, this);

        this._oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();

        this._destinatarioValueHelp = new ValueHelpReceptores(this, {
          modelName: "salidaMateriales",
          listPath: "/Receptores",
          keyField: "Usuario",
          descriptionField: "Nombre",
          keyModelPath: "/DestinatarioUser",
          descriptionModelPath: "/DestinatarioName",
          fragmentName:
            "salidademateriales.view.fragments.dialogs.ReceptoresSelectDialog",
        });

        this._signatureHandler = new SignatureHandler();
        this._signatureHandler.init(this.getView(), "salidaMateriales");

        this._messagePopoverHandler = new MessagePopoverHandler(
          this.getView(),
          "salidaMateriales",
          "/Messages"
        );

        oRouter
          .getRoute("RoutePostGoodsIssue")
          .attachPatternMatched(this.__onRouteMatched, this);
      },

      __onRouteMatched: function (oEvent) {
        const oSalidaModel =
          this.getOwnerComponent().getModel("salidaMatModel");
        const oSalidaMatData = oSalidaModel.getData();
        oSalidaMatData.Messages = [];
        oSalidaMatData.Ejecutada = false;
        const oSalidaMatModel = new JSONModel(oSalidaMatData);

        const oView = this.getView();
        oView.setModel(oSalidaMatModel, "salidaMateriales");

        oView.setBusy(true);
        const oODataModel = this.getOwnerComponent().getModel();

        oSalidaMatModel.setProperty("/Receptores", []);
        this.__loadReceptores(oODataModel)
          .then((aReceptores) => {
            oSalidaMatModel.setProperty("/Receptores", aReceptores);
          })
          .catch((err) => {
            console.error("Error en la llamada OData:", err);
            const sErrorMessage = Utils.processErrorResponse(err);
            const oMessage = {
              type: "Error",
              title: "GET OData Service",
              subtitle: this._oResourceBundle.getText("popoverMessageSubtitleErrorGetRecipient"),
              active: true,
              description: sErrorMessage,
            };
            this._messagePopoverHandler.addMessage(oMessage);
            MessageToast.show(this._oResourceBundle.getText("messageToastErrorGetRecipient"));
          })
          .finally(() => {
            oView.setBusy(false);
          });
      },
      __loadReceptores: function (oModel) {
        return new Promise(function (resolve, reject) {
          oModel.read("/ReceptorSet", {
            success: function (oData) {
              resolve(oData.results);
            },
            error: function (oError) {
              reject(oError);
            },
          });
        });
      },
      onNavBack: function () {
        this.__cleanSalidaMatModel();
        // Lógica para volver a la página anterior
        const oHistory = sap.ui.core.routing.History.getInstance();
        const sPreviousHash = oHistory.getPreviousHash();

        if (sPreviousHash !== undefined) {
          window.history.go(-1);
        } else {
          const oRouter = this.getOwnerComponent().getRouter();
          oRouter.navTo("RouteListado", {}, {}, true);
        }
      },
      __cleanSalidaMatModel() {
        const oSalidaMatModel =
          this.getOwnerComponent().getModel("salidaMatModel");
        const oInitialData = {
          Fecha: new Date().toISOString().slice(0, 10),
          FechaContabilizacion: new Date().toISOString().slice(0, 10),
          Reserva: "",
          DestinatarioUser: "",
          DestinatarioName: "",
          Materiales: [],
        };
        oSalidaMatModel.setData(oInitialData);
      },
      onDestinatarioValueHelp: function () {
        this._destinatarioValueHelp.open();
      },

      onDestinatarioChange: function (oEvent) {
        this._destinatarioValueHelp.onChange(oEvent);
      },
      onPostSalidaMat: async function (oEvent) {
        const oView = this.getView();
        const oSalidaModel = oView.getModel("salidaMateriales");
        const oSalidaData = oSalidaModel.getData();

        if (!this.__validateFieldsSalida(oSalidaData)) {
          return;
        }

        oView.setBusy(true);
        MessageToast.show(this._oResourceBundle.getText("messageToastProcessingPostGoodsIssue"));
        try {
          const oODataModel = this.getOwnerComponent().getModel();

          const oPostPayload = {
            Fecha: oSalidaData.Fecha,
            FechaContabilizacion: oSalidaData.FechaContabilizacion,
            Texto: oSalidaData.DestinatarioUser.toUpperCase(),
            ToItems: oSalidaData.Materiales.map((oMaterial) => ({
              ReservaId: oMaterial.ReservaId,
              ReservaPos: oMaterial.Pos,
              Cantidad: formatter.numberDecimals(oMaterial.Retira),
              Texto: "",
              Customer: oSalidaData.DestinatarioUser.toUpperCase(),
            })),
          };

          const sPath = "/MDHeaderSet";
          const { oCreatedEntity, oResponse } = await this.__postSalidaMatAsync(
            oODataModel,
            sPath,
            oPostPayload
          );
          MessageToast.show(this._oResourceBundle.getText("successMessagePostGoodsIssue"));
          await this.__processSuccessSalida(oCreatedEntity);
        } catch (oError) {
          MessageToast.show(this._oResourceBundle.getText("messageToastErrorPostGoodIssue"));
          const sErrorMessage = Utils.processErrorResponse(oError);
          const oMessage = {
            type: "Error",
            title: this._oResourceBundle.getText("goodsIssue"),
            subtitle: this._oResourceBundle.getText("popoverMessageSubtitleErrorPostGoodIssue"),
            active: true,
            description: sErrorMessage,
          };
          this._messagePopoverHandler.addMessage(oMessage);
        } finally {
          oView.setBusy(false);
        }
      },
      __postSalidaMatAsync: function (oODataModel, sPath, oData) {
        return new Promise((resolve, reject) => {
          oODataModel.create(sPath, oData, {
            success: (oCreatedEntity, oResponse) =>
              resolve({ oCreatedEntity, oResponse }),
            error: (oError) => reject(oError),
          });
        });
      },
      __validateFieldsSalida: function (oSalidaMat) {
        if (
          !oSalidaMat.FechaContabilizacion ||
          oSalidaMat.FechaContabilizacion === ""
        ) {
          MessageToast.show(this._oResourceBundle.getText("messageToastMissingAccountingDate"));
          return false;
        }
        if (
          !oSalidaMat.DestinatarioUser ||
          oSalidaMat.DestinatarioUser === ""
        ) {
          MessageToast.show(this._oResourceBundle.getText("messageToastMissingRecipient"));
          return false;
        }
        if (!oSalidaMat.Materiales || oSalidaMat.Materiales.length === 0) {
          MessageToast.show(
            this._oResourceBundle.getText("messageToastMissingMaterialsPost")
           );
          return false;
        }
        return true;
      },
      __processSuccessSalida: async function (oCreatedEntity) {
        const oSalidaModel = this.getView().getModel("salidaMateriales");
        const oMessage = {
          type: "Success",
          title: this._oResourceBundle.getText("goodsIssue"),
          subtitle: this._oResourceBundle.getText("successMessagePostGoodsIssue"),
          active: true,
          description:
            this._oResourceBundle.getText("popoverMessageDescriptionSuccessPostGoodIssue1") +
            oCreatedEntity.Numero +
            this._oResourceBundle.getText("popoverMessageDescriptionSuccessPostGoodIssue2") +
            oCreatedEntity.FechaContabilizacion,
        };
        this._messagePopoverHandler.addMessage(oMessage);
        oSalidaModel.setProperty("/Ejecutada", true);

        const sAñoDoc = oCreatedEntity.FechaContabilizacion.slice(0, 4);
        const sPdfMD = await this.__getValeAcomp(
          oCreatedEntity.Numero,
          sAñoDoc
        );
        const oValeAcomp = {
          Numero: oCreatedEntity.Numero,
          Año: sAñoDoc,
          Dest: oCreatedEntity.Texto,
          Firmado: false,
          Pdf: sPdfMD || "",
        };
        oSalidaModel.setProperty("/DocumentoSeleccionado", oValeAcomp);

        await this._signatureHandler.onOpenSignatureCanvas();
      },
      onFinished: function () {
        this.getOwnerComponent().getModel("detailsStateModel").setData({
          hasData: false,
          reservaId: null,
          data: {},
          selectedPaths: [],
        });
        const oSalidaModel = this.getView().getModel("salidaMateriales");
        const sReservaId = oSalidaModel.getProperty("/Reserva/Id");

        if (sReservaId) {
          const oRouter = this.getOwnerComponent().getRouter();
          oRouter.navTo(
            "RouteDetails",
            {
              reservaId: sReservaId,
            },
            {},
            true
          );
        } else {
          const oRouter = this.getOwnerComponent().getRouter();
          oRouter.navTo("RouteListado", {}, {}, true);
        }
      },
      __getValeAcomp: async function (sNumber, sYear) {
        const oODataModel = this.getOwnerComponent().getModel();

        return new Promise((resolve, reject) => {
          const sKey = oODataModel.createKey("PrintedDocumentSet", {
            DocNumber: sNumber,
            DocType: "M",
            DocYear: sYear,
          });
          const sPath = "/" + sKey;
          oODataModel.read(sPath, {
            success: function (oData) {
              resolve(oData.xString);
            },
            error: function (oError) {
              console.error("Error en la llamada OData:", oError);
              const sErrorMessage = Utils.processErrorResponse(oError);
              const oMessage = {
                type: "Error",
                title: "GET OData Service",
                subtitle:
                  this._oResourceBundle.getText("popoverMessageSubtitleErrorGetNewDoc"),
                active: true,
                description: sErrorMessage,
              };
              this._messagePopoverHandler.addMessage(oMessage);
              MessageToast.show(
                this._oResourceBundle.getText("messageToastErrorGetNewDoc")
              );
              reject(oError);
            },
          });
        });
      },
      onShowMessagePopover: function (oEvent) {
        this._messagePopoverHandler.toggleSource(oEvent);
      },
    });
  }
);
