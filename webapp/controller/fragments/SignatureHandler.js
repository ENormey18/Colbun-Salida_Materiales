sap.ui.define(
  ["sap/ui/core/mvc/Controller", "sap/ui/core/Fragment"],
  function (Controller, Fragment) {
    "use strict";

    return Controller.extend(
      "salidademateriales.controller.fragments.SignatureHandler",
      {
        /**
         * @param {sap.ui.core.mvc.View} oView La vista que posee el fragmento.
         * @param {string} sModelName El nombre del modelo en la vista que contiene los datos (ej: "detalleReserva").
         */
        init: function (oView, sModelName) {
          this.oView = oView;
          this.sModelName = sModelName;
          this.__signaturePad = null;
          this.__signatureDialog = null;
        },

        onAfterRenderingCanvas() {
          if (!this.__signaturePad) {
            const canvas = document.getElementById("signatureCanvas");
            if (!canvas) {
              console.log("No se pudo encontrar el canvas de la firma");
              return;
            }
            this.__signaturePad = new window.SignaturePad(canvas);
          }
        },

        async onOpenSignatureCanvas() {
          const sFragmentId = this.oView.createId("signatureDialog");

          if (!this.__signatureDialog) {
            this.__signatureDialog = await Fragment.load({
              id: sFragmentId,
              name: "salidademateriales.view.fragments.dialogs.SignDialog",
              controller: this,
            }).then((oSignatureDialog) => {
              this.oView.addDependent(oSignatureDialog);
              return oSignatureDialog;
            });
            const deviceModel = this.oView.getModel("device");
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
          if (this.__signaturePad) {
            this.__signaturePad.clear();
          }
          this.__signatureDialog.close();
        },

        onClearSignature() {
          if (this.__signaturePad) {
            this.__signaturePad.clear();
          }
        },

        async onSaveSignature() {
          if (!this.__signaturePad || this.__signaturePad.isEmpty()) {
            sap.m.MessageToast.show("La firma no puede estar vacía.");
            return;
          }

          const oTargetModel = this.oView.getModel(this.sModelName);
          const base64 = this.__signaturePad.toDataURL();

          oTargetModel.setProperty("/Firma", base64);

          const oMatDocSelec = oTargetModel.getProperty(
            "/DocumentoSeleccionado"
          );
          if (oMatDocSelec && !oMatDocSelec.Firmado && oMatDocSelec.Pdf) {
            oMatDocSelec.Pdf = await this.__addSignatureToDocument(
              oMatDocSelec,
              base64
            );
            if (oMatDocSelec.Pdf != null) {
              oMatDocSelec.Firmado = true;
              oTargetModel.setProperty(
                "/DocumentoSeleccionado",
                oMatDocSelec
              );
              //Logica para guardar en DMS

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
          this.__signaturePad.clear();
          this.__signatureDialog.close();
        },
        async __addSignatureToDocument(oMatDocSelec, sFirmaBase64) {
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
