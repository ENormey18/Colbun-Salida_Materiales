sap.ui.define([], function () {
    "use strict";

    /**
     * Módulo de utilidades para la aplicación.
     * @namespace salidademateriales.utils.Utils
     */
    return {

        /**
         * Convierte una cadena Base64 a un objeto Blob.
         * @param {string} sBase64 La cadena Base64 (sin el prefijo 'data:mime/type;base64,').
         * @param {string} sMimeType El tipo MIME del contenido (ej: 'application/pdf').
         * @returns {Blob} El objeto Blob resultante.
         */
        base64ToBlob: function (sBase64, sMimeType) {
            const byteCharacters = atob(sBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            return new Blob([byteArray], { type: sMimeType });
        },

        /**
         * Convierte un objeto Blob a una cadena Base64.
         * @param {Blob} blob El Blob a convertir.
         * @returns {Promise<string>} Una promesa que se resuelve con la cadena Base64 (sin prefijo).
         */
        blobToBase64: async function (blob) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const sResult = reader.result;
                    // Asegurarse de quitar el prefijo 'data:...' si existe
                    if (sResult.indexOf(",") > -1) {
                        resolve(sResult.split(",")[1]);
                    } else {
                        resolve(sResult);
                    }
                };
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        },

        /**
         * Extrae un mensaje de error legible de un objeto de error OData.
         * @param {object} oError El objeto de error de una llamada OData.
         * @returns {string} El mensaje de error procesado.
         */
        processErrorResponse: function (oError) {
            let sErrorMessage = "Ocurrió un error inesperado al procesar la solicitud.";

            if (oError && oError.responseText) {
                try {
                    const oErrorBody = JSON.parse(oError.responseText);
                    if (oErrorBody?.error?.message?.value) {
                        sErrorMessage = oErrorBody.error.message.value;
                    } else {
                        sErrorMessage = oError.responseText;
                    }
                } catch (e) {
                    sErrorMessage = oError.responseText; // Si no es un JSON válido
                }
            } else if (oError && oError.message) {
                sErrorMessage = oError.message; // Para errores que no son de OData
            }
            
            return sErrorMessage;
        }

    };
});