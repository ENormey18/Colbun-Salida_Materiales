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
      onInit() {
        const oRouter = this.getOwnerComponent().getRouter();
        Device.resize.attachHandler(this.changeCanvasSize, this);
        oRouter
          .getRoute("RouteDetails")
          .attachPatternMatched(this.onRouteMatched, this);
      },
      onRouteMatched(oEvent) {
        const sReservaId = oEvent.getParameter("arguments").reservaId;
        const oODataModel = this.getOwnerComponent().getModel();
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
            Id: reservaOData && reservaOData.Id ? reservaOData.Id : 0,
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
          Firmas: {},
          ShowingItems:
            reservaOData && reservaOData.Status && reservaOData.Status !== "C"
              ? "P"
              : "C",
          Messages: [],
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
            oItem.Clases.forEach((oClass) => {
              if (oClass.Clase != "CG_01") {
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
          const message = {
            type: "Warning",
            title: "Ubicacion Técnica",
            active: true,
            description: sDescription,
            counter: index + 1,
          };
          aMessages.push(message);
        });
        const aOldMessag = oDetalleModel.getProperty("/Messages");
        let aNewMessag = aOldMessag.filter(
          (oMess) => oMess.tiltle !== "Ubicacion Técnica"
        );
        aNewMessag = aNewMessag.concat(aMessages);
        oDetalleModel.setProperty("/Messages", aNewMessag);
      },
      onAfterRenderingCanvas() {
        if (!this.signaturePad) {
          const canvas = document.getElementById("signatureCanvas");
          if (!canvas) return console.log("Couldn't find canvas");
          this.signaturePad = new window.SignaturePad(canvas);
        }
      },
      async onOpenSignatureCanvas(oEvent, tipoSujeto) {
        if (!this.signatureDialog) {
          this.signatureDialog = await Fragment.load({
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
        this.signatureDialog.data("tipoSujeto", tipoSujeto);
        this.signatureDialog.open();
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
        this.signaturePad.clear();
        this.signatureDialog.close();
      },
      onClearSignature() {
        this.signaturePad.clear();
      },
      onSaveSignature() {
        const oDetalleModel = this.getView().getModel("detalleReserva");
        const tipoSujeto = this.signatureDialog.data("tipoSujeto");

        const base64 = this.signaturePad.toDataURL();
        const nombreFirmante = oDetalleModel.getProperty("/nombreFirmanteAux");
        if (!nombreFirmante) {
          console.log("nombre firma vacío");
          return;
        }

        const sujeto = {
          nombre: nombreFirmante,
          firma: base64,
        };
        const sPath = `/Firmas/${tipoSujeto}`;
        oDetalleModel.setProperty(sPath, sujeto);
        const sPathNombre = `/Firmas/${tipoSujeto}/nombre`;
        oDetalleModel.setProperty(sPathNombre, nombreFirmante); //sino no se actualiza el componente text

        oDetalleModel.setProperty("/nombreFirmanteAux", "");
        this.signatureDialog.data("tipoSujeto", undefined);
        this.signaturePad.clear();
        this.signatureDialog.close();
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
      async onPressMaterial(oEvent) {
        if (!this.caracteristicasMaterialesDialog) {
          this.caracteristicasMaterialesDialog = await Fragment.load({
            name: "salidademateriales.view.fragments.details.dialogs.CaracteristicasMaterialesDialog",
            controller: this,
            id: "caracteristicasMaterialesDialog",
          }).then((oCharactMatDialog) => {
            this.getView().addDependent(oCharactMatDialog);
            return oCharactMatDialog;
          });
          this.caracteristicasMaterialesDialog.open();
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
          this.caracteristicasMaterialesDialog.bindElement({
            path: sBindingPath,
            model: "detalleReserva",
          });
          this.caracteristicasMaterialesDialog.open();
          this.updateCharTableBinding("Tecnica");
        }
      },
      onClassTypeSelect: function (oEvent) {
        const sSelectedKey = oEvent.getSource().getSelectedKey();
        this.updateCharTableBinding(sSelectedKey);
      },
      updateCharTableBinding: function (sClassTypeKey) {
        const oItemContext =
          this.caracteristicasMaterialesDialog.getBindingContext(
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
      onAceptarCaracteristicas(oEvent) {
        const oDetalleModel = this.getView().getModel("detalleReserva");
        const oTable = Fragment.byId(
          "caracteristicasMaterialesDialog",
          "caracteristicasTable"
        );
        const sClassBindingPath =
          oTable.getBindingContext("detalleReserva")?.sPath;
        if (!sClassBindingPath)
          return MessageToast.show(
            "Error al modificar caracteristicas del material"
          );

        const caracteristicas = oDetalleModel.getProperty(
          `${sClassBindingPath}/ToCaracteristicas/results`
        );
        const caracteristicasModificadas = caracteristicas?.filter(
          (c) => c.NuevoValor
        );
        if (
          caracteristicasModificadas &&
          caracteristicasModificadas.length > 0
        ) {
          //Armar post/create
        } else {
          return MessageToast.show("No se han modificado caracterísitcas.");
        }
        this.caracteristicasMaterialesDialog.close();
      },
      onCancelarCaracteristicas() {
        this.caracteristicasMaterialesDialog.close();
      },
      __initMessagepopover() {
        const oMessageTemplate = new MessageItem({
          type: "{detalleReserva>type}",
          title: "{detalleReserva>title}",
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
      showCompleted() {
        const oDetalleModel = this.getView().getModel("detalleReserva");
        const items = oDetalleModel.getProperty("/Items");
        const filteredItems = items.filter((item) => {
          return item.CantPendiente == 0;
        });
        oDetalleModel.setProperty("/FilteredItems", filteredItems);
        oDetalleModel.setProperty("/ShowingItems", "C");
      },
      showPending() {
        const oDetalleModel = this.getView().getModel("detalleReserva");
        const items = oDetalleModel.getProperty("/Items");
        const filteredItems = items.filter((item) => {
          return item.CantPendiente != 0;
        });
        oDetalleModel.setProperty("/FilteredItems", filteredItems);
      },

      onShowItems(oEvent) {
        const sSelectedKey = oEvent.getSource().getSelectedKey();
        if (sSelectedKey === "P") {
          this.showPending();
        } else {
          this.showCompleted();
        }
      },

      onSearchMaterial: function (oEvent) {
        const sQuery = oEvent.getParameter("query").trim().toLowerCase();
        const oDetalleModel = this.getView().getModel("detalleReserva");
        if (!oDetalleModel) {
          return;
        }

        const aAllItems = oDetalleModel.getProperty("/Items");
        const sCurrentStatusFilter = oDetalleModel.getProperty("/ShowingItems");

        let aFilteredItems = aAllItems;
        if (sCurrentStatusFilter === "completed") {
          aFilteredItems = aFilteredItems.filter((oItem) => {
            return oItem.Status === "Cerrada";
          });
        } else if (sCurrentStatusFilter === "pending") {
          aFilteredItems = aFilteredItems.filter((oItem) => {
            return oItem.Status !== "Cerrada";
          });
        }
        if (sQuery && sQuery.length > 0) {
          aFilteredItems = aFilteredItems.filter(function (oItem) {
            const sDescription = oItem.Description
              ? oItem.Description.toLowerCase()
              : "";
            const sMaterialId = oItem.Material
              ? oItem.Material.toLowerCase()
              : "";
            return (
              sDescription.includes(sQuery) || sMaterialId.includes(sQuery)
            );
          });
        }
        oDetalleModel.setProperty("/FilteredItems", aFilteredItems);
      },
    });
  }
);
