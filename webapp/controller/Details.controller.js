sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/m/MessageToast",
    'sap/m/MessagePopover',
    'sap/m/MessageItem',
], (Controller, Fragment, MessageToast, MessagePopover, MessageItem) => {
    "use strict";

    return Controller.extend("salidademateriales.controller.Details", {
        onInit() {
            const oRouter = this.getOwnerComponent().getRouter();
            oRouter.getRoute("RouteDetails").attachPatternMatched(this.onRouteMatched, this);
        },
        onRouteMatched(oEvent){
            const reservaId = oEvent.mParameters?.arguments?.reservaId;
            const localModel = this.getView().getModel("LocalModel");
            const reservas = localModel.getProperty("/reservas");
            const reservaIndex = reservas.findIndex(r => r.id === reservaId);
            this.getView().bindElement(`LocalModel>/reservas/${reservaIndex}`);
        },
        onAfterRenderingCanvas() {
            if (!this.signaturePad) {
                const canvas = document.getElementById("signatureCanvas");
                if (!canvas) return console.log("Couldn't find canvas");
                this.signaturePad = new window.SignaturePad(canvas);
            }
        },
        async onOpenSignatureCanvas(oEvent, belongsTo) {
            if (!this.signatureDialog) {
                this.signatureDialog = await Fragment.load({
                    name: "salidademateriales.view.fragments.details.dialogs.SignDialog",
                    controller: this,
                    id: "signatureDialog"
                });
                this.getView().addDependent(this.signatureDialog);
                Fragment.byId("signatureDialog", "signatureCanvas")?.setContent("<div><canvas id='signatureCanvas' width='500' height='300'></canvas><div style='width: 470px; height: 1px; position: relative;left: 15px; bottom: 20px;background-color: black;'></div></div>");
            }
            this.signatureDialog.data("belongsTo", belongsTo);
            this.signatureDialog.open();
        },
        onCloseSignatureDialog() {
            this.signaturePad.clear();
            this.signatureDialog.close();
        },
        onClearSignature() {
            this.signaturePad.clear();
        },
        onSaveSignature(oEvent) {
            const belongsTo = this.signatureDialog.data("belongsTo");
            const base64 = this.signaturePad.toDataURL();
            const localModel = this.getView().getModel("LocalModel");
            localModel.setProperty(`/firmas/${belongsTo}`, base64);
            this.signatureDialog.data("belongsTo", undefined);
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
        async onChangeFile(oEvent, belongsTo) {
            const file = await this.toBase64(oEvent.mParameters.files[0]);
            const localModel = this.getView().getModel("LocalModel");
            localModel.setProperty(`/firmas/${belongsTo}`, file);
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
        onAceptarCaracteristicas(){
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
    });
});