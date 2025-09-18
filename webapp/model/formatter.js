sap.ui.define([
    "sap/ui/core/ValueState"
], function(ValueState) {
    "use strict";

    return {
        /**
         * Returns a ValueState based on the status text.
         * @param {string} sStatus The status text to evaluate.
         * @returns {string} The corresponding ValueState.
         */
        statusTextState: function(sStatus) {
            switch (sStatus) {
                case "O":
                    return ValueState.Success; // Verde
                case "C":
                    return ValueState.Information; // Azul
                case "F":
                    return ValueState.Error; // Rojo
                default:
                    return ValueState.None; // Default color
            }
        },

        statusText: function(sStatus) {
            // Usamos un Resource Bundle (i18n) para los textos. ¡Es una mejor práctica!
            // Pero para un ejemplo rápido, usaremos textos fijos.
            switch (sStatus) {
                case "O":
                    return "Abierta"; // O: this.getResourceBundle().getText("statusOpen");
                case "C":
                    return "Cerrada";
                case "F":
                    return "Vencida";
                default:
                    return sStatus; // Devolver el código si no se reconoce
            }
        },
        
        statusIcon: function(sStatus) {
            // Usamos un Resource Bundle (i18n) para los textos. ¡Es una mejor práctica!
            // Pero para un ejemplo rápido, usaremos textos fijos.
            switch (sStatus) {
                case "O":
                    return "sap-icon://sys-enter-2";
                case "C":
                    return "sap-icon://information";
                case "F":
                    return "sap-icon://error";
                default:
                    return sStatus; 
            }
        },
    
    };
});