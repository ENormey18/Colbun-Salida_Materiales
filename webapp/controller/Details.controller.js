sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessagePopover",
    "sap/m/MessageItem",
    "sap/ui/model/json/JSONModel",
    "sap/ui/Device",
    "../model/formatter",
  ],
  (
    Controller,
    Fragment,
    Filter,
    FilterOperator,
    MessageToast,
    MessagePopover,
    MessageItem,
    JSONModel,
    Device,
    formatter
  ) => {
    "use strict";
    return Controller.extend("salidademateriales.controller.Details", {
      formatter: formatter,
      __oMessagePopover: null,
      __caracteristicasMaterialesDialog: null,
      __receptoresDialog: null,
      __signatureDialog: null,
      __signaturePad: null,
      __confirmarSalidaMatDialog: null,
      onInit() {
        const oRouter = this.getOwnerComponent().getRouter();
        Device.resize.attachHandler(this.changeCanvasSize, this);
        oRouter
          .getRoute("RouteDetails")
          .attachPatternMatched(this.__onRouteMatched, this);
      },
      __onRouteMatched(oEvent) {
        const sReservaId = oEvent.getParameter("arguments").reservaId;
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
          //filters: [oFilter],
          urlParameters: {
            $expand: "ToItems",
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
          MaterialDocuments: [],
          MaterialDocumentSeleccionado: null,
          Receptores: [{ Usnam: "Test", Nombre: "Tester" }],
          Receptor: "",
          FirmaReceptor: "",
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
      onReceptoresValueHelp: function () {
        const oView = this.getView();
        if (!this.__receptoresDialog) {
          this.__receptoresDialog = Fragment.load({
            id: oView.getId(),
            name: "salidademateriales.view.fragments.details.dialogs.ReceptoresSelectDialog",
            controller: this,
          }).then(function (oDialog) {
            oView.addDependent(oDialog);
            return oDialog;
          });
        }
        this.__receptoresDialog.then(function (oDialog) {
          oDialog.open();
        });
      },
      // Función para manejar la búsqueda dentro del diálogo de Select Receptores
      onReceptoresValueHelpSearch: function (oEvent) {
        const sValue = oEvent.getParameter("value");
        const oFilter = new Filter("Nombre", FilterOperator.Contains, sValue);
        const oBinding = oEvent.getSource().getBinding("items");
        oBinding.filter([oFilter]);
      },
      // Función para manejar el cierre del diálogo de Select Receptores
      onReceptoresValueHelpClose: function (oEvent) {
        const oSelectedItem = oEvent.getParameter("selectedItem");
        oEvent.getSource().getBinding("items").filter([]);
        if (oSelectedItem) {
          const sNombreReceptor = oSelectedItem.getTitle();
          const oInputR = this.byId("input-nombreReceptor");
          const oInputD = Fragment.byId(
            "confirmarSalidaMatDialog",
            "input-nombreDestinatario"
          );
          oInputR.setValue(sNombreReceptor);
          oInputD.setValue(sNombreReceptor);
          this.getView()
            .getModel("detalleReserva")
            .setProperty("/Receptor", sNombreReceptor);
          this.getView()
            .getModel("detalleReserva")
            .setProperty("/SalidaMat/Destinatario", sNombreReceptor);
        }
      },
      onAfterRenderingCanvas() {
        if (!this.__signaturePad) {
          const canvas = document.getElementById("signatureCanvas");
          if (!canvas) return console.log("Couldn't find canvas");
          this.__signaturePad = new window.SignaturePad(canvas);
        }
      },
      async onOpenSignatureCanvas() {
        if (!this.__signatureDialog) {
          this.__signatureDialog = await Fragment.load({
            name: "salidademateriales.view.fragments.details.dialogs.SignDialog",
            controller: this,
            id: "signatureDialog",
          }).then((oSignaturetDialog) => {
            this.getView().addDependent(oSignaturetDialog);
            return oSignaturetDialog;
          });
          const deviceModel = this.getView().getModel("device");
          const { width } = deviceModel.getProperty("/resize");
          const canvasWidth = width > 600 ? 500 : 300;
          const canvasHeight = width > 600 ? 300 : 180;
          Fragment.byId("signatureDialog", "signatureCanvas")?.setContent(
            `<div><canvas id='signatureCanvas' width='${canvasWidth}' height='${canvasHeight}'></canvas><div id='canvasLine' style='width: ${
              canvasWidth - 30
            }px; height: 1px; position: relative;left: 15px; bottom: 20px;background-color: black;'></div></div>`
          );
        }
        this.__signatureDialog.open();
      },
      changeCanvasSize(oEvent) {
        const deviceModel = this.getView().getModel("device");
        const { width } = deviceModel.getProperty("/resize");
        const canvasWidth = width > 600 ? 500 : 300;
        const canvasHeight = width > 600 ? 300 : 180;
        const canvas = document.getElementById("signatureCanvas");
        const line = document.getElementById("canvasLine");
        canvas.style.height = canvasHeight + "px";
        canvas.style.width = canvasWidth + "px";
        canvas.height = canvasHeight;
        canvas.width = canvasWidth;
        line.style.width = canvasWidth - 30 + "px";
      },
      onCloseSignatureDialog() {
        this.__signaturePad.clear();
        this.__signatureDialog.close();
      },
      onClearSignature() {
        this.__signaturePad.clear();
      },
      onSaveSignature() {
        const oDetalleModel = this.getView().getModel("detalleReserva");
        const base64 = this.__signaturePad.toDataURL();
        oDetalleModel.setProperty("/FirmaReceptor", base64);
        const oMatDocSelec = (oDetalleModel.getProperty("/MaterialDocumentSeleccionado"));
        if (oMatDocSelec && !oMatDocSelec.Firmado){
          this.__addSignatureToDocument();
        }
        this.__signaturePad.clear();
        this.__signatureDialog.close();
        // this.downloadBase64File(base64);
      },
      downloadBase64File(base64Data, filename) {
        // Split off metadata (e.g., data:image/png;base64,...)
        const arr = base64Data.split(",");
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        const len = bstr.length;
        const u8arr = new Uint8Array(len);

        for (let i = 0; i < len; i++) {
          u8arr[i] = bstr.charCodeAt(i);
        }

        // Create Blob from binary data
        const blob = new Blob([u8arr], { type: mime });

        // Trigger download
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      },
      async onChangeFile(oEvent, tipoSujeto) {
        const file = await this.toBase64(oEvent.mParameters.files[0]);
        const oDetalleModel = this.getView().getModel("detalleReserva");
        oDetalleModel.setProperty(`Firmas/${tipoSujeto}/firma`, file);
        oDetalleModel.setProperty(`Firmas/${tipoSujeto}/nombre`, "default");
      },
      toBase64(file) {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
        });
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
              console.error(
                "No se pudo parsear el responseText del error:",
                oError.responseText
              );
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
                aCaractUpd.join(", ") +
                " del material " +
                this.formatter.removeLeadingZeros(sMaterial),
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
        const sReceptor = oDetalleReserva.getProperty("/Receptor");

        const oSalidaMat = oDetalleReserva.getProperty("/SalidaMat");
        oSalidaMat.Materiales = aItems;
        oSalidaMat.Destinatario = sReceptor;
        oDetalleReserva.setProperty("/SalidaMat", oSalidaMat);

        if (!this.__confirmarSalidaMatDialog) {
          this.__confirmarSalidaMatDialog = await Fragment.load({
            name: "salidademateriales.view.fragments.details.dialogs.ConfirmarSalidaMatDialog",
            controller: this,
            id: "confirmarSalidaMatDialog",
          }).then((oConfirmarSalidaDialog) => {
            this.getView().addDependent(oConfirmarSalidaDialog);
            return oConfirmarSalidaDialog;
          });
        }

        this.__confirmarSalidaMatDialog.bindElement({
          path: "/SalidaMat",
          model: "detalleReserva",
        });
        this.__confirmarSalidaMatDialog.open();
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
      onPostSalidaMat: async function (oEvent) {
        const oView = this.getView();
        const oDetalleReserva = oView.getModel("detalleReserva");
        const oSalidaMat = oDetalleReserva.getProperty("/SalidaMat");

        if (!this.__validateFieldsSalida(oSalidaMat)) {
          return;
        }

        const oDialog = this.__confirmarSalidaMatDialog;

        oDialog.attachEventOnce("afterClose", async () => {
          oView.setBusy(true);
          try {
            const oODataModel = this.getOwnerComponent().getModel();
            //Datos más recientes (luego del close)
            const oDetalleActual = oView.getModel("detalleReserva");
            const oSalidaMatActual = oDetalleActual.getProperty("/SalidaMat");

            const oPostPayload = {
              Fecha: oSalidaMatActual.Fecha,
              FechaContabilizacion: oSalidaMatActual.FechaContabilizacion,
              Texto: oSalidaMatActual.Destinatario,
              ToItems: oSalidaMatActual.Materiales.map((oMaterial) => ({
                ReservaId: oMaterial.ReservaId,
                ReservaPos: oMaterial.Pos,
                Cantidad: formatter.numberDecimals(oMaterial.Retira),
                Texto: "",
                Customer: oSalidaMatActual.Destinatario,
              })),
            };

            const sPath = "/MDHeaderSet";
            const { oCreatedEntity, oResponse } =
              await this.__postSalidaMatAsync(oODataModel, sPath, oPostPayload);
            this.__processSuccessSalida(oCreatedEntity);
            MessageToast.show("Salida de materiales ejecutada");
          } catch (oError) {
            const sErrorMessage = this.__processErrorResponse(oError);
            const oDetalleModel = this.getView().getModel("detalleReserva");
            const aCurrentMessages =
              oDetalleModel.getProperty("/Messages") || [];
            const aNewMessages = [...aCurrentMessages];
            const oMessage = {
              type: "Error",
              title: "Salida de Materiales",
              subtitle: "Hubo un error al procesar la Salida de Materiales",
              active: true,
              description: sErrorMessage,
            };
            aNewMessages.push(oMessage);
            oDetalleModel.setProperty("/Messages", aNewMessages);
            MessageToast.show("Hubo un error con la salida de materiales");
          } finally {
            oView.setBusy(false);
          }
        }),
          this.__confirmarSalidaMatDialog.close();
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
            "Error al obtener los materiales para el post. Cierre y abra el dialog nuevamente"
          );
          return false;
        }
        return true;
      },
      __processSuccessSalida: function (oCreatedEntity) {
        const oDetalleModel = this.getView().getModel("detalleReserva");
        const aPostedItems =
          (oCreatedEntity.ToItems && oCreatedEntity.ToItems.results) || [];
        this.__updateItemsPosted(aPostedItems);
        const aCurrentMessages = oDetalleModel.getProperty("/Messages") || [];
        const aNewMessages = [...aCurrentMessages];
        const oMessage = {
          type: "Success",
          title: "Salida de Materiales",
          subtitle: "Salida de Materiales ejecutada con éxito",
          active: true,
          description:
            "Se ha generado el documento contable " +
            oCreatedEntity.Numero +
            "con fecha de contabilizacion " +
            oCreatedEntity.FechaContabilizacion,
        };
        aNewMessages.push(oMessage);
        oDetalleModel.setProperty("/Messages", aNewMessages);

        this.onOpenSignatureCanvas();
      },
      __updateItemsPosted: function (aPostedItems) {
        const oDetalleModel = this.getView().getModel("detalleReserva");
        const aCurrentItems = oDetalleModel.getProperty("/Items");
        const aNewItems = [...aCurrentItems];
        const aCurrentMaterialDocuments =
          oDetalleModel.getProperty("/MaterialDocuments") || [];
        const aNewMaterialDocuments = [...aCurrentMaterialDocuments];
        aPostedItems.forEach((oPostedItem) => {
          const oItem = aNewItems.find(
            (oItem) => parseInt(oItem.Pos) === parseInt(oPostedItem.ReservaPos)
          );
          if (oItem) {
            oItem.CantPendiente = formatter.numberDecimals(
              String(
                parseFloat(oItem.CantPendiente) -
                  parseFloat(oPostedItem.Cantidad)
              )
            );
            oItem.CantRetirada = formatter.numberDecimals(
              String(
                parseFloat(oItem.CantRetirada) +
                  parseFloat(oPostedItem.Cantidad)
              )
            );
          }
          const bExists = aNewMaterialDocuments.some(
            (doc) =>
              parseInt(doc.Number) === parseInt(oPostedItem.MatDocNum) &&
              parseInt(doc.Year) === parseInt(new Date.getFullYear().toString())
          );

          if (!bExists) {
            aNewMaterialDocuments.push({
              Number: oPostedItem.MatDocNum,
              Year: new Date().getFullYear().toString(),
              Dest: oPostedItem.Customer,
              Firmado: false,
              Pdf:""
            });

          }
        });
        oDetalleModel.setProperty("/Items", aNewItems);
        oDetalleModel.setProperty("/MaterialDocuments", aNewMaterialDocuments);
        oDetalleModel.setProperty("/MaterialDocumentSeleccionado", aNewMaterialDocuments[aNewMaterialDocuments.length-1])

        this.__updateFilteredItems("P");
        this.onLimpiarTabla();
      },
      onCancelarSalidaMat: function () {
        this.__cleanSalidaMatModel();
        this.__confirmarSalidaMatDialog.close();
      },
    });
  }
);
