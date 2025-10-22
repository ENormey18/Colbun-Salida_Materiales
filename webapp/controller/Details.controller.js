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
    "sap/ui/core/util/File",
    "../model/formatter",
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
    File,
    formatter
  ) => {
    "use strict";
    return Controller.extend("salidademateriales.controller.Details", {
      formatter: formatter,
      __oMessagePopover: null,
      __caracteristicasMaterialesDialog: null,
      __signatureHandler: null,
      _pdfViewer: null,
      onInit() {
        const oRouter = this.getOwnerComponent().getRouter();
        Device.resize.attachHandler(this.changeCanvasSize, this);
        this.__signatureHandler = new SignatureHandler();
        this.__signatureHandler.init(this.getView(), "detalleReserva");
        this._pdfViewer = new PDFViewer({
          isTrustedSource: true,
        });
        this.getView().addDependent(this._pdfViewer);
        oRouter
          .getRoute("RouteDetails")
          .attachPatternMatched(this.__onRouteMatched, this);
      },
      __onRouteMatched(oEvent) {
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
          this.__cleanDetailsState();
        } else {
          // --- CASO 2: No hay estado guardado (primera visita o reserva diferente) ---
          const oODataModel = this.getOwnerComponent().getModel();
          oODataModel.early;
          const sPath = this.getOwnerComponent()
            .getModel()
            .createKey("/ReservaSet", {
              Id: sReservaId,
            });
          this.__setModel(null);
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
              this.__setModel(reserva).then(() => {
                this.__setItemsEnhancement();
                this.__checkUTs();
                this.getView().setBusy(false);
              });
            }.bind(this),
            error: function (oError) {
              console.log("Error al traer datos con $expand: ", oError);
              this.__setModel(null).then(() => {
                this.getView().setBusy(false);
              });
            }.bind(this),
          });
        }
      },
      __cleanDetailsState: function () {
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

      __setModel: async function (reservaOData) {
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
            aClasses = await this.__loadCharactItems(oModel, aItems);
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
      __loadCharactItems(oModel, aItems) {
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

      __setItemsEnhancement: function () {
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
      __checkUTs() {
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
        const aOldMessag = oDetalleModel.getProperty("/Messages");
        let aNewMessag = aOldMessag.filter(
          (oMess) => oMess.title !== "Ubicacion Técnica"
        );
        aNewMessag = aNewMessag.concat(aMessages);
        oDetalleModel.setProperty("/Messages", aNewMessag);
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
      async onPressMaterial(oEvent) {
        if (!this.__caracteristicasMaterialesDialog) {
          this.__caracteristicasMaterialesDialog = await Fragment.load({
            name: "salidademateriales.view.fragments.details.dialogs.CaracteristicasMaterialesDialog",
            controller: this,
            id: "caracteristicasMaterialesDialog",
          }).then((oCharactMatDialog) => {
            this.getView().addDependent(oCharactMatDialog);
            return oCharactMatDialog;
          });
          this.__caracteristicasMaterialesDialog.open();
        }
        const oBindingContext =
          oEvent.oSource?.getBindingContext("detalleReserva");
        const sBindingPath = oBindingContext?.sPath;
        if (!sBindingPath) {
          return MessageToast.show(
            "Error al mostrar caracteristicas del material"
          );
        } else {
          const oDetalleModel = this.getView().getModel("detalleReserva");
          this.__caracteristicasMaterialesDialog.bindElement({
            path: sBindingPath,
            model: "detalleReserva",
          });
          this.__caracteristicasMaterialesDialog.open();
          this.__updateCharTableBinding("Tecnica");
        }
      },
      onClassTypeSelect: function (oEvent) {
        const sSelectedKey = oEvent.getSource().getSelectedKey();
        this.__updateCharTableBinding(sSelectedKey);
      },
      __updateCharTableBinding: function (sClassTypeKey) {
        const oItemContext =
          this.__caracteristicasMaterialesDialog.getBindingContext(
            "detalleReserva"
          );
        const oItemData = oItemContext.getObject();

        let iClassIndex = -1;
        if (sClassTypeKey === "General") {
          iClassIndex = oItemData.Clases.findIndex((c) =>
            c.Clase.toUpperCase().includes("CG_01")
          );
        } else {
          iClassIndex = oItemData.Clases.findIndex(
            (c) => !c.Clase.toUpperCase().includes("CG_01")
          );
        }
        const oVBox = Fragment.byId(
          "caracteristicasMaterialesDialog",
          "charContentVBox"
        );

        if (iClassIndex > -1) {
          const sClassPath = `${oItemContext.getPath()}/Clases/${iClassIndex}`;
          oVBox.bindElement({
            path: sClassPath,
            model: "detalleReserva",
          });
        } else {
          console.error("No se encontró la clase ", sClassTypeKey);
          oVBox.unbindElement("detalleReserva");
        }

        const oSelectBtn = Fragment.byId(
          "caracteristicasMaterialesDialog",
          "select-class-mat"
        );
        oSelectBtn.setSelectedKey(sClassTypeKey);
      },
      async onAceptarCaracteristicas() {
        this.getView().setBusy(true);
        this.__caracteristicasMaterialesDialog.setBusy(true);

        const oODataModel = this.getOwnerComponent().getModel();
        const oDetalleModel = this.getView().getModel("detalleReserva");
        const oTable = Fragment.byId(
          "caracteristicasMaterialesDialog",
          "caracteristicasTable"
        );
        const sClassBindingPath =
          oTable.getBindingContext("detalleReserva")?.sPath;
        if (!sClassBindingPath) {
          return MessageToast.show(
            "Error al modificar caracteristicas del material"
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
              await this.__updateCaracteristicaAsync(oODataModel, sPath, {
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
              const sErrorMessage = this.__processErrorResponse(oError);
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
                title: "Modificación Característica",
                subtitle:
                  "No se pudo modificar el valor de la característica " +
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
            const sMaterial = aCaractUpd[0].Material;
            const oMessage = {
              type: "Success",
              title: "Modificación Característica",
              subtitle: "Características modificadas con éxito",
              active: true,
              description:
                "Se han modificado las características: " +
                aCaractUpd.join(", "),
            };
            aNewMessages.push(oMessage);
            oDetalleModel.setProperty("/Messages", aNewMessages);
          }
        } else {
          this.__caracteristicasMaterialesDialog.setBusy(false);
          this.getView().setBusy(false);
          return MessageToast.show(
            "No hay nuevos valores de características a modificar."
          );
        }
        this.__setItemsEnhancement();
        this.__caracteristicasMaterialesDialog.setBusy(false);
        this.getView().setBusy(false);
        this.__caracteristicasMaterialesDialog.close();
        return MessageToast.show("Se han modificado las caraterísticas.");
      },

      __updateCaracteristicaAsync(oODataModel, sPath, oData) {
        return new Promise((resolve, reject) => {
          oODataModel.update(sPath, oData, {
            merge: false,
            success: function (oResult) {
              resolve(oResult);
            },
            error: function (oError) {
              reject(oError);
            },
          });
        });
      },
      onCancelarCaracteristicas(oEvent) {
        const oDetalleModel = this.getView().getModel("detalleReserva");
        const oTable = Fragment.byId(
          "caracteristicasMaterialesDialog",
          "caracteristicasTable"
        );
        const sClassBindingPath =
          oTable.getBindingContext("detalleReserva")?.sPath;
        if (!sClassBindingPath) {
          return MessageToast.show(
            "Error al modificar caracteristicas del material"
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
        this.__caracteristicasMaterialesDialog.close();
      },
      __initMessagepopover() {
        const oMessageTemplate = new MessageItem({
          type: "{detalleReserva>type}",
          title: "{detalleReserva>title}",
          subtitle: "{detalleReserva>subtitle}",
          activeTitle: "{detalleReserva>active}",
          description: "{detalleReserva>description}",
          counter: "{detalleReserva>counter}",
        });

        this.__oMessagePopover = new MessagePopover({
          items: {
            path: "detalleReserva>/Messages",
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
      onShowItems(oEvent) {
        const sSelectedKey = oEvent.getSource().getSelectedKey();
        this.__updateFilteredItems(sSelectedKey);
      },
      __updateFilteredItems(sSelectedKey) {
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

        this.__cleanSalidaMatModel();
      },
      __cleanSalidaMatModel() {
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
            const sPdfMD = await this.__getValeAcomp(
              oDocument.Numero,
              oDocument.Año
            );
            oDocument.Pdf = sPdfMD || "";
          } catch (oError) {
            const sErrorMessage = this.__processErrorResponse(oError);
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
        await this.__signatureHandler.onOpenSignatureCanvas();
      },
      __getValeAcomp: async function (sNumber, sYear) {
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
              const sErrorMessage = this.__processErrorResponse(oError);
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
      __getValeAcompFirmado: async function (sNumber, sYear) {},
      onShowPDF: async function (oEvent) {
        const oDetalleModel = this.getView().getModel("detalleReserva");
        const oContext = oEvent.getSource().getBindingContext("detalleReserva");
        const oDocument = oContext.getObject();

        if (oDocument.Pdf && oDocument.Pdf != "") {
          this.__openPDF(oDocument.Pdf, oDocument.Numero);
        } else {
          if (oDocument.Firmado) {
            try {
              const sPdfMD = await this.__getValeAcompFirmado(
                oDocument.Numero,
                oDocument.Año
              );
              oDocument.Pdf = sPdfMD || "";
            } catch (oError) {
              const sErrorMessage = this.__processErrorResponse(oError);
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
          } else {
            try {
              const sPdfMD = await this.__getValeAcomp(
                oDocument.Numero,
                oDocument.Año
              );
              oDocument.Pdf = sPdfMD || "";
            } catch (oError) {
              const sErrorMessage = this.__processErrorResponse(oError);
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
          this.__openPDF(oDocument.Pdf, oDocument.Numero);
        }
      },
      __openPDF: async function (sPDFBase64, sNumber) {
        const oView = this.getView();

        let sCleanBase64 = sPDFBase64;
        if (sPDFBase64.startsWith("data:application/pdf;base64,")) {
          sCleanBase64 = sPDFBase64.substring(
            "data:application/pdf;base64,".length
          );
        }

        const decodedPdfContent = atob(sCleanBase64); // Usamos la cadena limpia
        const byteArray = new Uint8Array(decodedPdfContent.length);
        for (var i = 0; i < decodedPdfContent.length; i++) {
          byteArray[i] = decodedPdfContent.charCodeAt(i);
        }
        const blob = new Blob([byteArray.buffer], { type: "application/pdf" });
        const pdfurl = URL.createObjectURL(blob);

        jQuery.sap.addUrlWhitelist("blob");
        this._pdfViewer.setShowDownloadButton(false);
        this._pdfViewer.downloadPDF = function () {
          //Lograr redefinir esta funcion pues se queda con los datos del primer vez que se le hace visualizar
          File.save(
            byteArray.buffer,
            `Vale_Acompañamiento-${sNumber}`,
            "pdf",
            "application/pdf",
            "UTF-8"
          );
        };

        this._pdfViewer.setSource(pdfurl);
        this._pdfViewer.setTitle("Visualizador de Documentos");
        this._pdfViewer.open();
      },
    });
  }
);
