sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "./fragments/SignatureHandler",
    "sap/ui/Device",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessagePopover",
    "sap/m/MessageItem",
    "sap/ui/model/json/JSONModel",
    "../model/formatter",
  ],
  function (
    Controller,
    Fragment,
    SignatureHandler,
    Device,
    Filter,
    FilterOperator,
    MessageToast,
    MessagePopover,
    MessageItem,
    JSONModel,
    formatter
  ) {
    "use strict";

    return Controller.extend("salidademateriales.controller.PostGoodsIssue", {
      formatter: formatter,
      __signatureHandler: null,
      __oMessagePopover: null,
      onInit: function () {
        const oRouter = this.getOwnerComponent().getRouter();
        Device.resize.attachHandler(this.changeCanvasSize, this);
        this.__signatureHandler = new SignatureHandler();
        this.__signatureHandler.init(this.getView(), "salidaMateriales");
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

        oSalidaMatModel.setProperty("/Receptores", [
          { Nombre: "Tester", Usnam: "Usnam" },
        ]);
        this.__loadReceptores(oODataModel)
          .then((aReceptores) => {
            oSalidaMatModel.setProperty("/Receptores", aReceptores);
          })
          .catch((err) => {
            console.error("Error en la llamada OData:", err);
            const sErrorMessage = this.__processErrorResponse(err);
            const aCurrentMessages =
              oSalidaModel.getProperty("/Messages") || [];
            const aNewMessages = [...aCurrentMessages];
            const oMessage = {
              type: "Error",
              title: "GET Servicio OData",
              subtitle: "Ocurrió un error al buscar los destinatarios",
              active: true,
              description: sErrorMessage,
            };
            aNewMessages.push(oMessage);
            oSalidaModel.setProperty("/Messages", aNewMessages);
            MessageToast.show("Ocurrió un error al buscar los destinatarios");
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
        const sFragmentId = this.getView().createId("receptorSelectDialog");

        if (!this._oReceptorDialog) {
          this._oReceptorDialog = Fragment.load({
            id: sFragmentId,
            name: "salidademateriales.view.fragments.dialogs.ReceptoresSelectDialog", 
            controller: this,
          }).then(
            function (oDialog) {
              this.getView().addDependent(oDialog);
              return oDialog;
            }.bind(this)
          );
        }

        this._oReceptorDialog.then(function (oDialog) {
          oDialog.open();
        });
      },
      onReceptoresValueHelpSearch: function (oEvent) {
        const sValue = oEvent.getParameter("value");

        const oFilter = new Filter({
          filters: [
            new Filter("Nombre", FilterOperator.Contains, sValue),
            new Filter("Usuario", FilterOperator.Contains, sValue),
          ],
          and: false, // OR
        });
        const oBinding = oEvent.getSource().getBinding("items");
        oBinding.filter([oFilter]);
      },

      onReceptoresValueHelpClose: function (oEvent) {
        const oSelectedItem = oEvent.getParameter("selectedItem");
        const oViewModel = this.getView().getModel("salidaMateriales");

        if (oSelectedItem) {
          const oReceptorData = oSelectedItem
            .getBindingContext("salidaMateriales")
            .getObject();

          oViewModel.setProperty("/DestinatarioName", oReceptorData.Nombre);
          oViewModel.setProperty("/DestinatarioUser", oReceptorData.Usuario);
        }
        oEvent.getSource().getBinding("items").filter([]);
      },

      onDestinatarioChange: function (oEvent) {
        const sValue = oEvent.getParameter("value");
        const oViewModel = this.getView().getModel("salidaMateriales");
        const aReceptores = oViewModel.getProperty("/Receptores") || []; 

        if (!sValue) {
          oViewModel.setProperty("/DestinatarioName", "");
          oViewModel.setProperty("/DestinatarioUser", "");
          return;
        }

        const oFoundReceptor = aReceptores.find(
          (receptor) => receptor.Usuario.toUpperCase() === sValue.toUpperCase()
        );
        if (oFoundReceptor) {
          oViewModel.setProperty("/DestinatarioName", oFoundReceptor.Nombre);
          oViewModel.setProperty("/DestinatarioUser", oFoundReceptor.Usuario.toUpperCase());
        } else {
          oViewModel.setProperty("/DestinatarioUser", sValue.toUpperCase());
        }
      },
      onPostSalidaMat: async function (oEvent) {
        const oView = this.getView();
        const oSalidaModel = oView.getModel("salidaMateriales");
        const oSalidaData = oSalidaModel.getData();

        if (!this.__validateFieldsSalida(oSalidaData)) {
          return;
        }

        oView.setBusy(true);
        MessageToast.show("Contabilizando Salida...");
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
          MessageToast.show("Salida de materiales ejecutada exitosamente");
          await this.__processSuccessSalida(oCreatedEntity);
        } catch (oError) {
          MessageToast.show("Hubo un error con la salida de materiales");
          const sErrorMessage = this.__processErrorResponse(oError);
          const aCurrentMessages = oSalidaModel.getProperty("/Messages") || [];
          const aNewMessages = [...aCurrentMessages];
          const oMessage = {
            type: "Error",
            title: "Salida de Materiales",
            subtitle: "Hubo un error al procesar la Salida de Materiales",
            active: true,
            description: sErrorMessage,
          };
          aNewMessages.push(oMessage);
          oSalidaModel.setProperty("/Messages", aNewMessages);
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
          MessageToast.show("Debe establecer una fecha de contabilización");
          return false;
        }
        if (!oSalidaMat.Destinatario || oSalidaMat.Destinatario === "") {
          MessageToast.show("Debe especificar un destinatario");
          return false;
        }
        if (!oSalidaMat.Materiales || oSalidaMat.Materiales.length === 0) {
          MessageToast.show(
            "Error al obtener los materiales para el post. Regrese y seleccione los materiales nuevamente"
          );
          return false;
        }
        return true;
      },
      __processSuccessSalida: async function (oCreatedEntity) {
        const oSalidaModel = this.getView().getModel("salidaMateriales");
        const aCurrentMessages = oSalidaModel.getProperty("/Messages") || [];
        const aNewMessages = [...aCurrentMessages];
        const oMessage = {
          type: "Success",
          title: "Salida de Materiales",
          subtitle: "Salida de Materiales ejecutada con éxito",
          active: true,
          description:
            "Se ha generado el documento contable " +
            oCreatedEntity.Numero +
            " con fecha de contabilizacion " +
            oCreatedEntity.FechaContabilizacion,
        };
        aNewMessages.push(oMessage);
        oSalidaModel.setProperty("/Messages", aNewMessages);
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

        await this.__signatureHandler.onOpenSignatureCanvas();
      },
      onFinished: function () {
        this.getOwnerComponent().getModel("detailsStateModel").setData({
          hasData: false,
          reservaId: null,
          data: {},
          selectedPaths: [],
        });
        const oSalidaModel = this.getView().getModel("salidaMateriales");
        const sReservaId = oSalidaModel.getProperty("/Reserva");

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
      __processErrorResponse(oError) {
        let sErrorMessage =
          "Ocurrió un error inesperado al procesar la solicitud.";

        if (oError) {
          if (oError.responseText) {
            try {
              const oErrorBody = JSON.parse(oError.responseText);
              if (
                oErrorBody &&
                oErrorBody.error &&
                oErrorBody.error.message &&
                oErrorBody.error.message.value
              ) {
                sErrorMessage = oErrorBody.error.message.value;
              } else {
                sErrorMessage = oError.responseText;
              }
            } catch (e) {
              sErrorMessage = oError.responseText;
            }
          } else if (oError.message) {
            sErrorMessage = oError.message;
          }
        }
        return sErrorMessage;
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
              const sErrorMessage = this.__processErrorResponse(oError);
              const aCurrentMessages =
                oSalidaModel.getProperty("/Messages") || [];
              const aNewMessages = [...aCurrentMessages];
              const oMessage = {
                type: "Error",
                title: "GET Servicio OData",
                subtitle:
                  "Ocurrió un error al buscar el vale de acompañamiento del documento generado",
                active: true,
                description: sErrorMessage,
              };
              aNewMessages.push(oMessage);
              oSalidaModel.setProperty("/Messages", aNewMessages);
              MessageToast.show(
                "Ocurrió un error al buscar el vale de acompañamiento"
              );
              reject(oError);
            },
          });
        });
      },
      __initMessagepopover() {
        const oMessageTemplate = new MessageItem({
          type: "{salidaMateriales>type}",
          title: "{salidaMateriales>title}",
          subtitle: "{salidaMateriales>subtitle}",
          activeTitle: "{salidaMateriales>active}",
          description: "{salidaMateriales>description}",
          counter: "{salidaMateriales>counter}",
        });

        this.__oMessagePopover = new MessagePopover({
          items: {
            path: "salidaMateriales>/Messages",
            template: oMessageTemplate,
          },
        });
      },
      onShowMessagePopover(oEvent) {
        if (!this.__oMessagePopover) {
          this.__initMessagepopover();
          const oButton = oEvent.getSource();
          oButton.addDependent(this.__oMessagePopover);
        }
        this.__oMessagePopover.toggle(oEvent.getSource());
      },
    });
  }
);
