sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    'sap/m/MessagePopover',
    'sap/m/MessageItem',
    "sap/ui/model/json/JSONModel",
    'sap/ui/Device',
], (Controller, Fragment, MessageToast, MessagePopover, MessageItem,JSONModel, Device) => {
    "use strict";

    return Controller.extend("salidademateriales.controller.Details", {
        onInit() {
            const oRouter = this.getOwnerComponent().getRouter();
            Device.resize.attachHandler(this.changeCanvasSize, this);
            oRouter.getRoute("RouteDetails").attachPatternMatched(this.onRouteMatched, this);
        },
        onRouteMatched(oEvent){
             const sReservaId = oEvent.getParameter("arguments").reservaId;
            const oODataModel = this.getOwnerComponent().getModel();  
            const sPath = this.getOwnerComponent().getModel().createKey("/ReservasSet", {
                Id: sReservaId,
            });

            this.getView().setBusy(true);
            oODataModel.read(sPath, {
                urlParameters: {
                    "$expand": "ToItems"
                },
                success: function (oData) {
                    this._setModel(oData);
                    /*this.__cargarFirmasDeDMS();*/
                    this.getView().setBusy(false);
                }.bind(this),
                error: function (oError) {
                    console.log("Error al traer datos con $expand: ", oError);
                    this._setModel();
                    this.getView().setBusy(false);
                }.bind(this)
            });
        },

        _setModel: function(reservaOData) {
            const detalleObj = {
                Reserva : {
                    Id: (reservaOData) ? reservaOData.Id : 0,
                    User: (reservaOData) ? reservaOData.User: null,
                    BaseDate: (reservaOData) ? reservaOData.BaseDate : null,
                    MovCode: (reservaOData) ? reservaOData.MovCode : null ,
                    CostCenter: (reservaOData) ? reservaOData.CostCenter: null,
                    Customer: (reservaOData) ? reservaOData.Customer: null,
                    Order: (reservaOData) ? reservaOData.Order: null,
                    Status: (reservaOData) ? reservaOData.Status: null,
                },
                Items: (reservaOData) ? reservaOData.ToItems.results : [],
                FilteredItems: (reservaOData) ? reservaOData.ToItems.results.filter((item) => {return item.Status !== 'Cerrada'}) : [],
                Firmas: {},
                ShowingItems: "pending"
            }
            const oDetalleModel = new JSONModel(detalleObj);
            this.getView().setModel(oDetalleModel, "detalleReserva");
        },

        _cargarFirmasDeDMS: function(sReservaId) {
            const oDetalleModel = this.getView().getModel("detalleReserva");
            
            // La API de DMS te permite buscar documentos por propiedades personalizadas.
            // Asumimos que al guardar un documento le pusiste una propiedad "reservaId".
            // La URL exacta dependerá de la especificación de la API de DMS.
            const sDmsUrl = `/api-dms/browser/root/objects?cmisselector=properties&objectId=cmis:document&propertyId[0]=reservaId&propertyValue[0]=${sReservaId}`;
            
            // Usamos la API fetch
            fetch(sDmsUrl)
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Error en la respuesta de la red de DMS');
                    }
                    return response.json();
                })
                .then(data => {
                    // Procesar data de la api
                    let firmasObj = procesar(data);
                    oDetalleModel.setProperty("Firmas", firmasObj);
                    this.getView().setBusy(false); // Detenemos el indicador de carga al final
                })
                .catch(error => {
                    console.error('Hubo un problema con la llamada a DMS:', error);
                    this.getView().setBusy(false);
                });
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
                    id: "signatureDialog"
                });
                this.getView().addDependent(this.signatureDialog);
                const deviceModel = this.getView().getModel("device");
                const {width} = deviceModel.getProperty("/resize");
                const canvasWidth = width > 600 ? 500 : 300;
                const canvasHeight = width > 600 ? 300 : 180;
                Fragment.byId("signatureDialog", "signatureCanvas")?.setContent(`<div><canvas id='signatureCanvas' width='${canvasWidth}' height='${canvasHeight}'></canvas><div id='canvasLine' style='width: ${canvasWidth-30}px; height: 1px; position: relative;left: 15px; bottom: 20px;background-color: black;'></div></div>`);
            }
            this.signatureDialog.data("tipoSujeto", tipoSujeto);
            this.signatureDialog.open();
        },
        changeCanvasSize(oEvent){
            const deviceModel = this.getView().getModel("device");
            const {width} = deviceModel.getProperty("/resize");
            const canvasWidth = width > 600 ? 500 : 300;
            const canvasHeight = width > 600 ? 300 : 180;
            const canvas = document.getElementById("signatureCanvas");
            const line = document.getElementById("canvasLine");
            canvas.style.height = canvasHeight + "px";
            canvas.style.width = canvasWidth + "px";
            canvas.height = canvasHeight;
            canvas.width = canvasWidth;
            line.style.width = (canvasWidth - 30) + "px";
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
            const nombreFirmante =  oDetalleModel.getProperty("/nombreFirmanteAux");
            if(!nombreFirmante){
                console.log("nombre firma vacío")
                return;
            }

            const sujeto = {
                nombre: nombreFirmante,
                firma: base64
            };
            const sPath = `/Firmas/${tipoSujeto}`;
            oDetalleModel.setProperty(sPath, sujeto);
            const sPathNombre = `/Firmas/${tipoSujeto}/nombre`;
            oDetalleModel.setProperty(sPathNombre, nombreFirmante);//sino no se actualiza el componente text


            oDetalleModel.setProperty("/nombreFirmanteAux","");
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
            return new Promise((resolve, reject)=>{
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result);
                reader.onerror = reject;
            })
        },
        async onPressMaterial(oEvent){
            if (!this.caracteristicasMaterialesDialog) {
                this.caracteristicasMaterialesDialog = await Fragment.load({
                    name: "salidademateriales.view.fragments.details.dialogs.CaracteristicasMaterialesDialog",
                    controller: this,
                    id: "caracteristicasMaterialesDialog"
                });
                this.getView().addDependent(this.caracteristicasMaterialesDialog);
            }
            const oBindingContext = oEvent.oSource?.getBindingContext("LocalModel");
            const oBindingPath = oBindingContext?.getPath();
            if(!oBindingPath) return MessageToast.show("Error al mostrar caracteristicas del material");
            this.caracteristicasMaterialesDialog.bindElement(`LocalModel>${oBindingPath}`);
            this.caracteristicasMaterialesDialog.open();
        },
        onAceptarCaracteristicas(oEvent){
            const localModel = this.getView().getModel("LocalModel");
            const bindingPath = oEvent.getSource()?.getBindingContext("LocalModel")?.sPath;
            if(!bindingPath) return MessageToast.show("Error al modificar caracteristicas del material");
            const caracteristicas = localModel.getProperty(`${bindingPath}/caracteristicas`);
            const newCaracteristicas = structuredClone(caracteristicas)
            const caracteristicasModificadas = newCaracteristicas?.filter(c => c.newValorCAT);
            if(caracteristicasModificadas && caracteristicasModificadas.length > 0){
                caracteristicasModificadas.forEach(c => {
                    c.valorCAT = c.newValorCAT;
                    delete(c.newValorCAT);
                })
                localModel.setProperty(`${bindingPath}/caracteristicas`, newCaracteristicas);
            }
            this.caracteristicasMaterialesDialog.close();
        },
        onCancelarCaracteristicas(){
            this.caracteristicasMaterialesDialog.close();
        },
        initMessagepopover(){
            const oMessageTemplate = new MessageItem({
				type: '{LocalModel>type}',
				title: '{LocalModel>title}',
				description: '{LocalModel>description}',
				subtitle: '{LocalModel>subtitle}',
			});

            this.oMessagePopover = new MessagePopover({
				items: {
					path: 'LocalModel>/popoverMessages',
					template: oMessageTemplate
				}
			});
        },
        onShowMessagePopover(oEvent){
            if(!this.oMessagePopover){
                this.initMessagepopover();
                const oButton = oEvent.getSource();
                oButton.addDependent(this.oMessagePopover);
            }
            this.oMessagePopover.toggle(oEvent.getSource());
        },
        caracteristicasPorcentageFormatter(caracteristicas){
            if(!caracteristicas) return 0;
            const cantidadCaracteristicasCompletas = caracteristicas.filter(c => c.valorCAT !== '').length;
            const cantidadCaracteristicas = caracteristicas.length;
            return (cantidadCaracteristicasCompletas/cantidadCaracteristicas)*100
        },

        showCompleted(){
            const oDetalleModel = this.getView().getModel("detalleReserva");
            const aux = oDetalleModel.getProperty("/ShowingItems");
            if (aux !== 'completed'){
                const items = oDetalleModel.getProperty("/Items");
                const filteredItems = items.filter((item) => {return item.Status === 'Cerrada'});
                console.log(filteredItems);
                oDetalleModel.setProperty('/FilteredItems',filteredItems);
                oDetalleModel.setProperty("/ShowingItems", 'completed');
            }
        },
        showPending(){
            const oDetalleModel = this.getView().getModel("detalleReserva");
            const aux = oDetalleModel.getProperty("/ShowingItems");
            if (aux !== 'pending'){
                const items = oDetalleModel.getProperty("/Items");
                const filteredItems = items.filter((item) => {return item.Status !== 'Cerrada'});
                console.log(filteredItems);
                oDetalleModel.setProperty('/FilteredItems',filteredItems);
                oDetalleModel.setProperty("/ShowingItems", 'pending');
            }
        },

        onSearchMaterial: function(oEvent) {
            const sQuery = oEvent.getParameter("query").trim().toLowerCase();
            const oDetalleModel = this.getView().getModel("detalleReserva");
            if (!oDetalleModel) { return; }

            const aAllItems = oDetalleModel.getProperty("/Items");
            const sCurrentStatusFilter = oDetalleModel.getProperty("/ShowingItems"); 

            let aFilteredItems = aAllItems;
            // --- PRIMER FILTRO: Por estado (SegmentedButton) ---
            if (sCurrentStatusFilter === "completed") {
                aFilteredItems = aFilteredItems.filter( (oItem) => { return oItem.Status === "Cerrada";});
            } else if (sCurrentStatusFilter === "pending") {
                aFilteredItems = aFilteredItems.filter( (oItem) => {return oItem.Status !== "Cerrada";});
            }
            // --- SEGUNDO FILTRO: Por texto de búsqueda (SearchField) ---
            if (sQuery && sQuery.length > 0) {
                aFilteredItems = aFilteredItems.filter(function(oItem) {
                    // Comprobamos si el texto de búsqueda está en la Descripción O en el ID del Material.
                    // .toLowerCase() hace que la búsqueda no sea sensible a mayúsculas/minúsculas.
                    const sDescription = oItem.Description ? oItem.Description.toLowerCase() : "";
                    const sMaterialId = oItem.Material ? oItem.Material.toLowerCase() : "";
                    return sDescription.includes(sQuery) || sMaterialId.includes(sQuery);
                });
            }
            oDetalleModel.setProperty("/FilteredItems", aFilteredItems);
        },

    });
});