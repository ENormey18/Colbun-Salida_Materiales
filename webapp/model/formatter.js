sap.ui.define(
  [
    "sap/ui/core/library"
  ], 
  (
    coreLibrary
  ) => {
    "use strict";
    const ValueState = coreLibrary.ValueState;

    return {
      removeLeadingZeros: function (value) {
        if (!value) {
          return "";
        }

        // Si viene como string con ceros: "000123"
        if (typeof value === "string") {
          // quitar ceros a la izquierda
          return value.replace(/^0+/, "") || "0";
        }

        // Si viene como número ya no necesita cambios
        return String(value);
      },
      /**
       * Returns a ValueState based on the status text.
       * @param {string} sStatus The status text to evaluate.
       * @returns {string} The corresponding ValueState.
       */
      statusTextState: function (sStatus) {
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

      statusText: function (sStatus) {
        // Usamos un Resource Bundle (i18n) para los textos. ¡Es una mejor práctica!
        switch (sStatus) {
          case "O":
            return "Abierta";
          case "C":
            return "Cerrada";
          case "F":
            return "Vencida";
          default:
            return sStatus;
        }
      },

      statusIcon: function (sStatus) {
        // Usamos un Resource Bundle (i18n) para los textos. ¡Es una mejor práctica!
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

      enchancementPercentage: function (fValue) {
        if(fValue){
          const fPercentage = parseFloat(fValue.toFixed(2)) * 100;
          return fPercentage;
        }else{
          return 0
        }
      },
    };
  }
);
