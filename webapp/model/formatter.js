sap.ui.define(["sap/ui/core/library"], (coreLibrary) => {
  "use strict";
  const ValueState = coreLibrary.ValueState;

  function __buttonTypeFormatter(aMessages) {
    var sHighestSeverityIcon;
    aMessages.forEach(function (sMessage) {
      switch (sMessage.type) {
        case "Error":
          sHighestSeverityIcon = "Negative";
          break;
        case "Warning":
          sHighestSeverityIcon =
            sHighestSeverityIcon !== "Negative"
              ? "Critical"
              : sHighestSeverityIcon;
          break;
        case "Success":
          sHighestSeverityIcon =
            sHighestSeverityIcon !== "Negative" &&
            sHighestSeverityIcon !== "Critical"
              ? "Success"
              : sHighestSeverityIcon;
          break;
        default:
          sHighestSeverityIcon = !sHighestSeverityIcon
            ? "Neutral"
            : sHighestSeverityIcon;
          break;
      }
    });

    return sHighestSeverityIcon;
  }

  return {
    removeLeadingZeros: function (sValue) {
      if (!sValue) {
        return "";
      }

      // Si viene como string con ceros: "000123"
      if (typeof sValue === "string") {
        // quitar ceros a la izquierda
        return sValue.replace(/^0+/, "") || "0";
      }

      // Si viene como número ya no necesita cambios
      return String(sValue);
    },
    numberDecimals: function (sValue) {
      if (sValue === null || sValue === undefined || sValue === "") {
        return "0.000";
      }
      const nValue = Number(sValue);
      if (isNaN(nValue)) {
        return "0.000"; // o podrías devolver vacío según tu caso
      }
      return nValue.toFixed(3);
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
      if (fValue) {
        const fPercentage = parseFloat(fValue.toFixed(2)) * 100;
        return fPercentage;
      } else {
        return 0;
      }
    },
    // Display the button type according to the message with the highest severity
    // The priority of the message types are as follows: Error > Warning > Success > Info
    buttonTypeFormatter: function (aMessages) {
      var sHighestSeverityIcon = __buttonTypeFormatter(aMessages);

      return sHighestSeverityIcon;
    },
    // Display the number of messages with the highest severity
    highestSeverityMessages: function (aMessages) {
      var sHighestSeverityIconType = __buttonTypeFormatter(aMessages);
      var sHighestSeverityMessageType;

      switch (sHighestSeverityIconType) {
        case "Negative":
          sHighestSeverityMessageType = "Error";
          break;
        case "Critical":
          sHighestSeverityMessageType = "Warning";
          break;
        case "Success":
          sHighestSeverityMessageType = "Success";
          break;
        default:
          sHighestSeverityMessageType = !sHighestSeverityMessageType
            ? "Information"
            : sHighestSeverityMessageType;
          break;
      }

      return aMessages.reduce(function (iNumberOfMessages, oMessageItem) {
        return oMessageItem.type === sHighestSeverityMessageType
          ? ++iNumberOfMessages
          : iNumberOfMessages;
      }, 0);
    },
    // Set the button icon according to the message with the highest severity
    buttonIconFormatter: function (aMessages) {
      var sIcon;

      aMessages.forEach(function (sMessage) {
        switch (sMessage.type) {
          case "Error":
            sIcon = "sap-icon://error";
            break;
          case "Warning":
            sIcon = sIcon !== "sap-icon://error" ? "sap-icon://alert" : sIcon;
            break;
          case "Success":
            sIcon =
              sIcon !== "sap-icon://error" && sIcon !== "sap-icon://alert"
                ? "sap-icon://sys-enter-2"
                : sIcon;
            break;
          default:
            sIcon = !sIcon ? "sap-icon://information" : sIcon;
            break;
        }
      });
      return sIcon;
    },
  };
});
