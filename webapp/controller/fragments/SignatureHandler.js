sap.ui.define(
  ["sap/ui/core/mvc/Controller", "sap/ui/core/Fragment", "../../utils/DMSHandler","sap/m/MessageToast","salidademateriales/utils/Utils"],
  function (Controller, Fragment, DMSHandler,MessageToast, Utils) {
    "use strict";

    return Controller.extend(
      "salidademateriales.controller.fragments.SignatureHandler",
      {
        
        init: function (oView, sModelName) {
          this._oView = oView;
          this._sModelName = sModelName;
          this._signaturePad = null;
          this._signatureDialog = null;
          this._dmsHandler = DMSHandler;
        },

        onAfterRenderingCanvas() {
          if (!this._signaturePad) {
            const canvas = document.getElementById("signatureCanvas");
            if (!canvas) {
              console.log("No se pudo encontrar el canvas de la firma");
              return;
            }
            this._signaturePad = new window.SignaturePad(canvas);
          }
        },

        async onOpenSignatureCanvas() {
          const sFragmentId = this._oView.createId("signatureDialog");

          if (!this._signatureDialog) {
            this._signatureDialog = await Fragment.load({
              id: sFragmentId,
              name: "salidademateriales.view.fragments.dialogs.SignDialog",
              controller: this,
            }).then((oSignatureDialog) => {
              this._oView.addDependent(oSignatureDialog);
              return oSignatureDialog;
            });
            const deviceModel = this._oView.getModel("device");
            const { width } = deviceModel.getProperty("/resize");
            const canvasWidth = width > 600 ? 500 : 300;
            const canvasHeight = width > 600 ? 300 : 180;

            const oHtmlContainer = Fragment.byId(
              sFragmentId,
              "signatureCanvasContainer"
            );

            oHtmlContainer?.setContent(
              `<div style="border: 1px solid #ccc;"><canvas id='signatureCanvas' width='${canvasWidth}' height='${canvasHeight}'></canvas><div id='canvasLine' style='width: ${
                canvasWidth - 30
              }px; height: 1px; position: relative;left: 15px; bottom: 30px;background-color: black;'></div></div>`
            );
          }
          this._signatureDialog.open();
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
          if (this._signaturePad) {
            this._signaturePad.clear();
          }
          this._signatureDialog.close();
        },

        onClearSignature() {
          if (this._signaturePad) {
            this._signaturePad.clear();
          }
        },

        async onSaveSignature() {
          this._signatureDialog.setBusy(true);

          if (!this._signaturePad || this._signaturePad.isEmpty()) {
            MessageToast.show("La firma no puede estar vacía.");
            this._signatureDialog.setBusy(false);
            return;
          }

          const oTargetModel = this._oView.getModel(this._sModelName);
          const base64 = this._signaturePad.toDataURL();

          oTargetModel.setProperty("/Firma", base64);

          const oMatDocSelec = oTargetModel.getProperty(
            "/DocumentoSeleccionado"
          );
          if (oMatDocSelec && !oMatDocSelec.Firmado && oMatDocSelec.Pdf) {
            oMatDocSelec.Pdf = await this._addSignatureToDocument(
              oMatDocSelec,
              base64
            );
            if (oMatDocSelec.Pdf != null) {
              //Logica para guardar en DMS
              const blob = Utils.base64ToBlob(oMatDocSelec.Pdf, "application/pdf");
              const sReservaId = oTargetModel.getProperty("/Reserva/Id") || oTargetModel.getProperty("/Reserva");
              const oResult = await this._dmsHandler.uploadObject(`root/Vale_Acomp_Reservas/${sReservaId}`, oMatDocSelec.Numero, `${oMatDocSelec.Numero}.pdf`, blob);
              if (oResult.error){
                switch (oResult.error.status){
                  case 409:
                    MessageToast.show("Ya existe un archivo con el nombre del documento en DMS");
                    this._signatureDialog.setBusy(false);
                    throw new Error(oResult.error);
                  case 401:
                    MessageToast.show("Error Acceso: Token de acceso a DMS Inválido");
                    this._signatureDialog.setBusy(false);
                    throw new Error(oResult.error);
                  default:
                     MessageToast.show("Error Interno: No se pudo cargar el documento en DMS");
                     this._signatureDialog.setBusy(false);
                    throw new Error(oResult.error);
                }
              }

              oMatDocSelec.Firmado = true;
              oMatDocSelec.DMSId = oResult.objId;
              oTargetModel.setProperty(
                "/DocumentoSeleccionado",
                oMatDocSelec
              );

              //Logica para actualizar modelo en detalles reserva
              const aDocumentos = oTargetModel.getProperty("/Documentos");
              if (aDocumentos && aDocumentos.length > 0) {
                const index = aDocumentos.findIndex(
                  (oDocumento) =>
                    parseInt(oDocumento.Numero) ===
                    parseInt(oMatDocSelec.Numero)
                );
                if (index > -1) {
                  oTargetModel.setProperty(
                    `/Documentos/${index}`,
                    oMatDocSelec
                  );
                }
              }
            }
          }
          
          this._signatureDialog.setBusy(false);
          this._signaturePad.clear();
          this._signatureDialog.close();
        },
        async _addSignatureToDocument(oMatDocSelec, sFirmaBase64) {
          const sPdfBase64 = oMatDocSelec.Pdf;
          let imgBase64Clean = sFirmaBase64;

          if (sFirmaBase64.indexOf("base64,") > -1) {
            imgBase64Clean = sFirmaBase64.split("base64,")[1];
          }
          const isPng =
            sPdfBase64.startsWith("data:image/png") ||
            imgBase64Clean.startsWith("iVBOR");

          try {
            const pdfBytes = Uint8Array.from(atob(sPdfBase64), (c) =>
              c.charCodeAt(0)
            );

            const { PDFDocument } = window.PDFLib;
            const pdfDoc = await PDFDocument.load(pdfBytes);

            let imageEmbed;
            if (isPng) {
              imageEmbed = await pdfDoc.embedPng(imgBase64Clean);
            } else {
              imageEmbed = await pdfDoc.embedJpg(imgBase64Clean);
            }

            const pages = pdfDoc.getPages();
            const lastPage = pages[pages.length - 1];

            const imgDims = imageEmbed.scale(0.2);
            lastPage.drawImage(imageEmbed, {
              x: 65,
              y: 30,
              width: imgDims.width,
              height: imgDims.height,
            });

            const modifiedPdfBase64 = await pdfDoc.saveAsBase64();
            return modifiedPdfBase64;
          } catch (err) {
            console.error("Error al modificar pdf: ", err);
            return null;
          }
        },
      }
    );
  }
);
