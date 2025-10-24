sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "./fragments/SignatureHandler",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessagePopover",
    "sap/m/MessageItem",
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device",
    "sap/m/PDFViewer",
    "../model/formatter",
    "./fragments/Characteristics",
    "../utils/DMSHandler",
    "../utils/Utils",
    "salidademateriales/utils/MessagePopoverHandler"
  ],
  (
    Controller,
    Fragment,
    SignatureHandler,
    Filter,
    FilterOperator,
    MessageToast,
    MessagePopover,
    MessageItem,
    JSONModel,
    Device,
    PDFViewer,
    formatter,
    CharacteristicsHandler,
    DMSHandler,
    Utils,
    MessagePopoverHandler
  ) => {
    "use strict";
    return Controller.extend("salidademateriales.controller.Details", {
      formatter: formatter,
      _oMessagePopover: null,
      _caracteristicasMaterialesDialog: null,
      _signatureHandler: null,
      _pdfViewer: null,
      onInit() {
        const oRouter = this.getOwnerComponent().getRouter();
        Device.resize.attachHandler(this.changeCanvasSize, this);

        this._signatureHandler = new SignatureHandler();
        this._signatureHandler.init(this.getView(), "detalleReserva");

        this._pdfViewer = new PDFViewer({
          isTrustedSource: true,
        });
        this.getView().addDependent(this._pdfViewer);

        this._messagePopoverHandler = new MessagePopoverHandler(this.getView(), "detalleReserva", "/Messages");

        CharacteristicsHandler.init(this);

        DMSHandler.init(this.getOwnerComponent());
        this._dmsHandler = DMSHandler;

        oRouter
          .getRoute("RouteDetails")
          .attachPatternMatched(this._onRouteMatched, this);
      },
      _onRouteMatched(oEvent) {
        const sReservaId = oEvent.getParameter("arguments").reservaId;
        const oDetailsStateModel =
          this.getOwnerComponent().getModel("detailsStateModel");

        if (
          oDetailsStateModel.getProperty("/hasData") &&
          oDetailsStateModel.getProperty("/reservaId") === sReservaId
        ) {
          // --- CASO 1: Hay estado guardado (estamos volviendo) ---
          const oStateData = oDetailsStateModel.getProperty("/data");
          const aSelectedPaths =
            oDetailsStateModel.getProperty("/selectedPaths");

          // Restauramos el modelo con los datos que tenía (incluyendo cantidades en "Retira")
          this.getView().getModel("detalleReserva").setData(oStateData);

          const oItemsTable = this.byId("materialsTable");
          oItemsTable.attachEventOnce("updateFinished", () => {
            aSelectedPaths.forEach((sPath) => {
              const oItemToSelect = oItemsTable
                .getItems()
                .find(
                  (oItem) =>
                    oItem.getBindingContext("detalleReserva").getPath() ===
                    sPath
                );
              if (oItemToSelect) {
                oItemsTable.setSelectedItem(oItemToSelect, true);
              }
            });
          });
          this._cleanDetailsState();
        } else {
          // --- CASO 2: No hay estado guardado (primera visita o reserva diferente) ---
          const oODataModel = this.getOwnerComponent().getModel();
          oODataModel.early;
          const sPath = this.getOwnerComponent()
            .getModel()
            .createKey("/ReservaSet", {
              Id: sReservaId,
            });
          this._setModel(null);
          this.getView().setBusy(true);
          oODataModel.read(sPath, {
            urlParameters: {
              $expand: "ToItems,ToMatDoc",
            },
            success: function (oData) {
              const reserva = oData;
              let aux = reserva.BaseDate;
              if (aux) {
                reserva.BaseDate = aux.toISOString().slice(0, 10);
              }
              aux = reserva.ReqDate;
              if (aux) {
                reserva.ReqDate = aux.toISOString().slice(0, 10);
              }
              reserva.ToItems.results.forEach((item) => {
                let aux = item.FechaNecesidad;
                if (aux) {
                  item.FechaNecesidad = aux.toISOString().slice(0, 10);
                }
                item.Clases = [];
                item.Enhancement = 0;
              });
              this._setModel(reserva).then(async () => {
                this._setItemsEnhancement();
                this._checkUTs();
                await this._checkValesFirmados();
                this.getView().setBusy(false);
              });
            }.bind(this),
            error: function (oError) {
              console.log("Error al traer datos con $expand: ", oError);
              this._setModel(null).then(() => {
                this.getView().setBusy(false);
              });
            }.bind(this),
          });
        }
      },
      _cleanDetailsState: function () {
        this.getOwnerComponent().getModel("detailsStateModel").setData({
          hasData: false,
          reservaId: null,
          data: {},
          selectedPaths: [],
        });
      },

      onNavBack: function () {
        const oRouter = this.getOwnerComponent().getRouter();
        oRouter.navTo("RouteListado");
      },

      _setModel: async function (reservaOData) {
        const detalleObj = {
          Reserva: {
            Id: reservaOData && reservaOData.Id ? reservaOData.Id : "-",
            Usuario:
              reservaOData && reservaOData.Usuario ? reservaOData.Usuario : "-",
            BaseDate:
              reservaOData && reservaOData.BaseDate
                ? reservaOData.BaseDate
                : "-",
            ReqDate:
              reservaOData && reservaOData.ReqDate ? reservaOData.ReqDate : "-",
            MovCode:
              reservaOData && reservaOData.MovCode ? reservaOData.MovCode : "-",
            Orden:
              reservaOData && reservaOData.Orden ? reservaOData.Orden : "-",
            Status:
              reservaOData && reservaOData.Status ? reservaOData.Status : "-",
            Dest: reservaOData && reservaOData.Dest ? reservaOData.Dest : "-",
            Centro:
              reservaOData && reservaOData.Centro ? reservaOData.Centro : "",
            CentroD:
              reservaOData && reservaOData.CentroD ? reservaOData.CentroD : "",
            CostCenter:
              reservaOData && reservaOData.CostCenter
                ? reservaOData.CostCenter
                : "",
            CostCenterD:
              reservaOData && reservaOData.CostCenterD
                ? reservaOData.CostCenterD
                : "",
            CantItems: reservaOData ? reservaOData.ToItems.results.length : 0,
            CantItemsP: reservaOData
              ? reservaOData.ToItems.results.filter(
                  (item) => item.CantPendiente != 0
                ).length
              : 0,
            CantItemsC: reservaOData
              ? reservaOData.ToItems.results.filter(
                  (item) => item.CantPendiente == 0
                ).length
              : 0,
          },
          Items: reservaOData ? reservaOData.ToItems.results : [],
          FilteredItems:
            reservaOData && reservaOData.ToItems
              ? reservaOData.ToItems.results.filter((item) => {
                  if (reservaOData.Status && reservaOData.Status !== "C") {
                    return item.CantPendiente != 0;
                  } else {
                    return item.CantPendiente == 0;
                  }
                })
              : [],
          ShowingItems:
            reservaOData && reservaOData.Status && reservaOData.Status !== "C"
              ? "P"
              : "C",
          Documentos: reservaOData
            ? reservaOData.ToMatDoc.results.map((oDocumento) => {
                oDocumento.Firmado = false;
                oDocumento.Pdf = "";
                return oDocumento;
              })
            : [],
          DocumentoSeleccionado: null,
          Firma: "",
          Messages: [],
          SalidaMat: {
            Fecha: new Date().toISOString().slice(0, 10),
            FechaContabilizacion: new Date().toISOString().slice(0, 10),
            Reserva: reservaOData && reservaOData.Id ? reservaOData.Id : "-",
            Destinatario: "",
            Materiales: [],
          },
        };
        //Load Classes and Characteristics for items in Reservation
        if (detalleObj.Items.length !== 0) {
          const aItems = detalleObj.Items;
          let aClasses = [];
          try {
            const oModel = this.getOwnerComponent().getModel();
            aClasses = await this._loadCharactItems(oModel, aItems);
          } catch (err) {
            console.error("Error en la llamada OData:", err);
            MessageToast.show(
              "Ocurrió un error al buscar los datos de clases de material."
            );
          }
          aClasses.forEach((oClass) => {
            const aItemsMat = aItems.filter(
              (oItem) => oItem.Material === oClass.Material
            );
            aItemsMat.forEach((oItem) => {
              if (oItem["Clases"]) oItem["Clases"].push(oClass);
              else oItem["Clases"] = [oClass];
            });
          });
        }
        const oDetalleModel = new JSONModel(detalleObj);
        this.getView().setModel(oDetalleModel, "detalleReserva");
      },
      _loadCharactItems(oModel, aItems) {
        const aMaterials = [];
        aItems.forEach((item) => {
          if (!aMaterials.includes(item.Material))
            aMaterials.push(item.Material);
        });
        const aFilters = aMaterials.map(
          (m) => new Filter("Material", FilterOperator.EQ, m)
        );
        const oFilter = new Filter({
          filters: aFilters,
          and: false,
        });
        return new Promise(function (resolve, reject) {
          oModel.read("/ClaseMatSet", {
            filters: [oFilter],
            urlParameters: {
              $expand: "ToCaracteristicas",
            },
            success: function (oData) {
              resolve(oData.results);
            },
            error: function (oError) {
              reject(oError);
            },
          });
        });
      },

      _setItemsEnhancement: function () {
        const oDetalleModel = this.getView().getModel("detalleReserva");
        if (!oDetalleModel) {
          console.error("Modelo no cargado aún.");
        }
        const aItems = oDetalleModel.getProperty("/Items")
          ? oDetalleModel.getProperty("/Items")
          : [];
        if (aItems.length > 0) {
          aItems.forEach((oItem, i) => {
            const oClass = oItem.Clases.find(
              (oClass) => oClass.Clase !== "CG_01"
            );
            if (oClass) {
              const aCharact = oClass.ToCaracteristicas.results;
              const iCantChar = aCharact.length;
              let iCantCharFalt = 0;
              aCharact.forEach((oCharact) => {
                if (oCharact.Valor === "" || oCharact.Valor === 0.0) {
                  iCantCharFalt++;
                }
              });
              const fResult = (iCantChar - iCantCharFalt) / iCantChar;
              oDetalleModel.setProperty(`/Items/${i}/Enhancement`, fResult);
            }
          });
        }
      },
      _checkUTs() {
        const oDetalleModel = this.getView().getModel("detalleReserva");
        const aItems = oDetalleModel.getProperty("/Items");
        const aItemsWithoutUTs = aItems.filter((oItem) => oItem.CantUT === 0);
        
        const aMessages = [];
        aItemsWithoutUTs.forEach((oItem, index) => {
          const sDescription =
            "El material " +
            this.formatter.removeLeadingZeros(oItem.Material) +
            " no tiene ubicacion técnica en el centro " +
            oItem.Centro;
          const oMessage = {
            type: "Warning",
            title: "Ubicacion Técnica",
            active: true,
            description: sDescription,
            counter: index + 1,
          };
          aMessages.push(oMessage);
        });
        this._messagePopoverHandler.setMessagesByTitle("Ubicacion Técnica", aMessages);
        // const aOldMessag = oDetalleModel.getProperty("/Messages");
        // let aNewMessag = aOldMessag.filter(
        //   (oMess) => oMess.title !== "Ubicacion Técnica"
        // );
        // aNewMessag = aNewMessag.concat(aMessages);
        // oDetalleModel.setProperty("/Messages", aNewMessag);
      },
      async _checkValesFirmados() {
        const oDetalleModel = this.getView().getModel("detalleReserva");
        const sReservaId = oDetalleModel.getProperty("/Reserva/Id");
        try {
          const aObjects = await this._dmsHandler.getFolderContent(
            `root/Vale_Acomp_Reservas/${sReservaId}`
          );
          const aOldDocs = oDetalleModel.getProperty("/Documentos");
          const aMergedDocs = aOldDocs.map((oDoc) => {
            const oObj = aObjects.find((o) => o.Name === oDoc.Numero);
            if (oObj) {
              oDoc.DMSId = oObj.Id;
              oDoc.Firmado = true;
            }
            return oDoc;
          });
          oDetalleModel.setProperty("/Documentos", aMergedDocs);
        } catch (oError) {
          const aCurrentMessages = oDetalleModel.getProperty("/Messages") || [];
          const aNewMessages = [...aCurrentMessages];
          let sDescription;
          switch (oError.status) {
            case 401:
              sDescription = "Error Acceso: Token de acceso a DMS Inválido";
              break;
            case 404:
              return;
            default:
              sDescription = "Error Interno: No se pudo comprobar la carpeta en DMS";
              break;
          }
          const oMessage = {
            type: "Error",
            title: "Vale de Acompañamiento",
            subtitle: "Ocurrió un error verificar los documentos en DMS",
            active: true,
            description: sDescription,
          };
          aNewMessages.push(oMessage);
          oDetalleModel.setProperty("/Messages", aNewMessages);
          MessageToast.show(
            "Ocurrió un error al verificar los documentos en dms"
          );
        }
      },
      onOpenCharacteristicsDialog: function (oEvent) {
        CharacteristicsHandler.open(oEvent);
      },
      _initMessagepopover() {
        const oMessageTemplate = new MessageItem({
          type: "{detalleReserva>type}",
          title: "{detalleReserva>title}",
          subtitle: "{detalleReserva>subtitle}",
          activeTitle: "{detalleReserva>active}",
          description: "{detalleReserva>description}",
          counter: "{detalleReserva>counter}",
        });

        this._oMessagePopover = new MessagePopover({
          items: {
            path: "detalleReserva>/Messages",
            template: oMessageTemplate,
          },
        });
      },
      // onShowMessagePopover(oEvent) {
      //   if (!this._oMessagePopover) {
      //     this._initMessagepopover();
      //     const oButton = oEvent.getSource();
      //     oButton.addDependent(this._oMessagePopover);
      //   }
      //   this._oMessagePopover.toggle(oEvent.getSource());
      // },
      onShowMessagePopover: function (oEvent) {
            this._messagePopoverHandler.toggleSource(oEvent);
      },
      onShowItems(oEvent) {
        const sSelectedKey = oEvent.getSource().getSelectedKey();
        this._updateFilteredItems(sSelectedKey);
      },
      _updateFilteredItems(sSelectedKey) {
        const oDetalleModel = this.getView().getModel("detalleReserva");
        const aItems = oDetalleModel.getProperty("/Items");
        let aFilteredItems = aItems;
        if (sSelectedKey === "C") {
          aFilteredItems = aItems.filter((item) => {
            return item.CantPendiente == 0;
          });
        } else {
          aFilteredItems = aItems.filter((item) => {
            return item.CantPendiente != 0;
          });
        }
        oDetalleModel.setProperty("/FilteredItems", aFilteredItems);
        oDetalleModel.setProperty("/ShowingItems", sSelectedKey);
      },
      onSearchMaterial: function (oEvent) {
        const sQuery = oEvent.getParameter("query").trim().toLowerCase();
        const oDetalleModel = this.getView().getModel("detalleReserva");
        if (!oDetalleModel) {
          return;
        }

        const aItems = oDetalleModel.getProperty("/Items");
        const aShowingItems = oDetalleModel.getProperty("/FilteredItems");
        const sCurrentStatusFilter = oDetalleModel.getProperty("/ShowingItems");

        let aFilteredItems = aItems;
        if (sCurrentStatusFilter === "C") {
          aFilteredItems = aItems.filter((item) => {
            return item.CantPendiente == 0;
          });
        } else {
          aFilteredItems = aItems.filter((item) => {
            return item.CantPendiente != 0;
          });
        }

        let aItemResults = aFilteredItems;
        if (sQuery && sQuery.length > 0) {
          aItemResults = aFilteredItems.filter(function (oItem) {
            const sDescripcion = oItem.Descripcion
              ? oItem.Descripcion.toLowerCase()
              : "";
            const sMaterialId = oItem.Material
              ? oItem.Material.toLowerCase()
              : "";
            return (
              sDescripcion.includes(sQuery) || sMaterialId.includes(sQuery)
            );
          });
        }
        oDetalleModel.setProperty("/FilteredItems", aItemResults);
      },
      onConfirmarSalida: async function (oEvent) {
        const oItemsTable = this.byId("materialsTable");
        const aSelectedItems = oItemsTable.getSelectedItems();
        const aItems = aSelectedItems.map((oSelectedItem) => {
          const oContext = oSelectedItem.getBindingContext("detalleReserva");
          return oContext.getObject();
        });

        if (aItems.length == 0) {
          return MessageToast.show("No ha seleccionado ningun item");
        }

        if (
          aItems.find(
            (oItem) =>
              !oItem.Retira ||
              isNaN(parseFloat(oItem.Retira)) ||
              parseFloat(oItem.Retira) <= 0
          )
        ) {
          return MessageToast.show(
            "Debe especificar una cantidad a retirar positiva para todos los items seleccionados"
          );
        }

        if (
          aItems.find(
            (oItem) =>
              !oItem.Retira ||
              parseFloat(oItem.Retira) > parseFloat(oItem.CantPendiente)
          )
        ) {
          return MessageToast.show(
            "No puede ingresar una cantidad a retirar mayor a la cantidad pendiente del item"
          );
        }

        const oDetalleReserva = this.getView().getModel("detalleReserva");

        const oSalidaMat = oDetalleReserva.getProperty("/SalidaMat");
        oSalidaMat.Materiales = aItems;
        oDetalleReserva.setProperty("/SalidaMat", oSalidaMat);

        const oDetailsStateModel =
          this.getOwnerComponent().getModel("detailsStateModel");
        const oCurrentData = this.getView()
          .getModel("detalleReserva")
          .getData();

        // Guardamos los "paths" de los items seleccionados, que es una forma robusta de re-seleccionarlos
        const aSelectedPaths = oItemsTable.getSelectedItems().map((oItem) => {
          return oItem.getBindingContext("detalleReserva").getPath();
        });

        oDetailsStateModel.setData({
          hasData: true,
          reservaId: oCurrentData.Reserva.Id,
          data: oCurrentData,
          selectedPaths: aSelectedPaths,
        });

        const oSalidaMatModel =
          this.getOwnerComponent().getModel("salidaMatModel");
        oSalidaMatModel.setData(oSalidaMat);
        this.getOwnerComponent().getRouter().navTo("RoutePostGoodsIssue", {
          reservaId: oSalidaMat.Reserva,
        });
      },
      onLimpiarTabla: function () {
        const oItemsTable = this.byId("materialsTable");
        oItemsTable.removeSelections(true);

        const oDetalleModel = this.getView().getModel("detalleReserva");
        const aItems = oDetalleModel.getProperty("/FilteredItems");
        aItems.forEach((oItem) => delete oItem.Retira);
        oDetalleModel.setProperty("/FilteredItems", aItems);

        this._cleanSalidaMatModel();
      },
      _cleanSalidaMatModel() {
        const oDetalleModel = this.getView().getModel("detalleReserva");
        const sReservaId = oDetalleModel.getProperty("/Reserva/Id");
        oDetalleModel.setProperty("/SalidaMat", {
          Fecha: new Date().toISOString().slice(0, 10),
          FechaContabilizacion: new Date().toISOString().slice(0, 10),
          Reserva: sReservaId,
          Destinatario: "",
          Materiales: [],
        });
      },
      onSearchDocument: function (oEvent) {
        const sQuery = oEvent.getParameter("query");
        const aFilters = [];
        if (sQuery && sQuery.length > 0) {
          const oFilter = new Filter("Numero", FilterOperator.Contains, sQuery);
          aFilters.push(oFilter);
        }

        const oTable = this.byId("documentsTable");
        const oBinding = oTable.getBinding("items");
        oBinding.filter(aFilters);
      },
      onFirmarDocumento: async function (oEvent) {
        const oDetalleModel = this.getView().getModel("detalleReserva");
        const oContext = oEvent.getSource().getBindingContext("detalleReserva");
        const oDocument = oContext.getObject();

        if (!oDocument.Pdf || oDocument.Pdf === "") {
          try {
            const sPdfMD = await this._getValeAcomp(
              oDocument.Numero,
              oDocument.Año
            );
            oDocument.Pdf = sPdfMD || "";
          } catch (oError) {
            const sErrorMessage = Utils.processErrorResponse(oError);
            const aCurrentMessages =
              oDetalleModel.getProperty("/Messages") || [];
            const aNewMessages = [...aCurrentMessages];
            const oMessage = {
              type: "Error",
              title: "Vale de Acompañamiento",
              subtitle:
                "Ocurrió un error al intentar buscar el vale de acompañamiento del documento",
              active: true,
              description: sErrorMessage,
            };
            aNewMessages.push(oMessage);
            oDetalleModel.setProperty("/Messages", aNewMessages);
            MessageToast.show(
              "Ocurrió un error al buscar el vale de acompañamiento"
            );
            return;
          }
        }
        oDetalleModel.setProperty("/DocumentoSeleccionado", oDocument);
        await this._signatureHandler.onOpenSignatureCanvas();
      },
      _getValeAcomp: async function (sNumber, sYear) {
        const oODataModel = this.getOwnerComponent().getModel();
        const oDetalleModel = this.getView().getModel();

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
              const aCurrentMessages =
                oDetalleModel.getProperty("/Messages") || [];
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
              oDetalleModel.setProperty("/Messages", aNewMessages);
              MessageToast.show(
                "Ocurrió un error al buscar el vale de acompañamiento"
              );
              reject(oError);
            },
          });
        });
      },
      _getValeAcompFirmado: async function (sObjId) {
        const oDetalleModel = this.getView().getModel("detalleReserva");
        const sReservaId = oDetalleModel.getProperty("/Reserva/Id");
        try {
          const blob = await this._dmsHandler.getObjectContent(
            `root/Vale_Acomp_Reservas/${sReservaId}`,
            sObjId
          );
          if (blob) {
            return await Utils.blobToBase64(blob);
          } else {
            return null;
          }
        } catch (oError) {
          console.error("Error en la llamada DMS:", oError);
          const sErrorMessage = Utils.processErrorResponse(oError);
          const aCurrentMessages = oDetalleModel.getProperty("/Messages") || [];
          const aNewMessages = [...aCurrentMessages];
          const oMessage = {
            type: "Error",
            title: "GET Servicio DMS",
            subtitle:
              "Ocurrió un error al buscar el vale de acompañamiento firmado en DMS",
            active: true,
            description: sErrorMessage,
          };
          aNewMessages.push(oMessage);
          oDetalleModel.setProperty("/Messages", aNewMessages);
          MessageToast.show(
            "Ocurrió un error al buscar el vale de acompañamiento"
          );
        }
      },
      onShowPDF: async function (oEvent) {
        const oDetalleModel = this.getView().getModel("detalleReserva");
        const oContext = oEvent.getSource().getBindingContext("detalleReserva");
        const oDocument = oContext.getObject();

        if (oDocument.Pdf && oDocument.Pdf != "") {
          this._openPDF(oDocument.Pdf, oDocument.Numero);
        } else {
          if (oDocument.Firmado) {
            try {
              const sPdfMD = await this._getValeAcompFirmado(oDocument.DMSId);
              oDocument.Pdf = sPdfMD || "";
            } catch (oError) {
              const sErrorMessage = Utils.processErrorResponse(oError);
              const aCurrentMessages =
                oDetalleModel.getProperty("/Messages") || [];
              const aNewMessages = [...aCurrentMessages];
              const oMessage = {
                type: "Error",
                title: "Vale de Acompañamiento",
                subtitle:
                  "Ocurrió un error al intentar buscar el vale de acompañamiento firmado",
                active: true,
                description: sErrorMessage,
              };
              aNewMessages.push(oMessage);
              oDetalleModel.setProperty("/Messages", aNewMessages);
              MessageToast.show(
                "Ocurrió un error al buscar el vale de acompañamiento"
              );
              return;
            }
          } else {
            try {
              const sPdfMD = await this._getValeAcomp(
                oDocument.Numero,
                oDocument.Año
              );
              oDocument.Pdf = sPdfMD || "";
            } catch (oError) {
              const sErrorMessage = Utils.processErrorResponse(oError);
              const aCurrentMessages =
                oDetalleModel.getProperty("/Messages") || [];
              const aNewMessages = [...aCurrentMessages];
              const oMessage = {
                type: "Error",
                title: "Vale de Acompañamiento",
                subtitle:
                  "Ocurrió un error al intentar buscar el vale de acompañamiento del documento",
                active: true,
                description: sErrorMessage,
              };
              aNewMessages.push(oMessage);
              oDetalleModel.setProperty("/Messages", aNewMessages);
              MessageToast.show(
                "Ocurrió un error al buscar el vale de acompañamiento"
              );
              return;
            }
          }
          const sPath = oContext.getPath();
          oDetalleModel.setProperty(sPath, oDocument);
          this._openPDF(oDocument.Pdf, oDocument.Numero);
        }
      },
      _openPDF: async function (sPDFBase64, sNumber) {
        const oView = this.getView();

        let sCleanBase64 = sPDFBase64;
        if (sPDFBase64.startsWith("data:application/pdf;base64,")) {
          sCleanBase64 = sPDFBase64.substring(
            "data:application/pdf;base64,".length
          );
        }

        const blob = Utils.base64ToBlob(sCleanBase64, "application/pdf");
        const pdfurl = URL.createObjectURL(blob);

        jQuery.sap.addUrlWhitelist("blob");
        this._pdfViewer.setShowDownloadButton(false);

        this._pdfViewer.setSource(pdfurl);
        this._pdfViewer.setTitle("Visualizador de Documentos");
        this._pdfViewer.open();
      },
    });
  }
);
