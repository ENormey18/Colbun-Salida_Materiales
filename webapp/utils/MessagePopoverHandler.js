sap.ui.define([
    "sap/ui/base/Object",
    "sap/m/MessagePopover",
    "sap/m/MessageItem"
], function (BaseObject, MessagePopover, MessageItem) {
    "use strict";

    /**
     * @name tu.namespace.controller.handlers.MessagePopoverHandler
     */
    return BaseObject.extend("salidademateriales.utils.MessagePopoverHandler", {

        _oMessagePopover: null,
        _oView: null,
        _sModelName: "",
        _sMessagesPath: "",

        /**
         * Constructor para el MessagePopoverHandler.
         * @param {sap.ui.core.mvc.View} oView La vista que posee el MessagePopover.
         * @param {string} sModelName El nombre del modelo JSON que contiene los mensajes.
         * @param {string} sMessagesPath El path al array de mensajes dentro del modelo (ej: "/Messages").
         */
        constructor: function (oView, sModelName, sMessagesPath) {
            this._oView = oView;
            this._sModelName = sModelName;
            this._sMessagesPath = sModelName + ">" + sMessagesPath; // Construye el path completo, ej: "detalleReserva>/Messages"
        },

        /**
         * Inicializa el control MessagePopover de forma perezosa (lazy).
         * @private
         */
        _initMessagePopover: function () {
            const oMessageTemplate = new MessageItem({
                type: `{${this._sModelName}>type}`,
                title: `{${this._sModelName}>title}`,
                subtitle: `{${this._sModelName}>subtitle}`,
                activeTitle: `{${this._sModelName}>active}`,
                description: `{${this._sModelName}>description}`,
                counter: `{${this._sModelName}>counter}`
            });

            this._oMessagePopover = new MessagePopover({
                items: {
                    path: this._sMessagesPath,
                    template: oMessageTemplate
                }
            });

            this._oView.addDependent(this._oMessagePopover);
        },

        /**
         * Muestra u oculta el MessagePopover junto al botón que fue presionado.
         * @param  oEvent El evento del botón de mensajes.
         */
        toggleSource: function (oEvent) {
            if (!this._oMessagePopover) {
                this._initMessagePopover();
            }
            this._oMessagePopover.toggle(oEvent.getSource());
        },
        
        /**
         * Añade un nuevo mensaje al modelo.
         * @param {object} oMessage El objeto del mensaje a añadir.
         */
        addMessage: function(oMessage) {
            const oModel = this._oView.getModel(this._sModelName);
            const aMessages = oModel.getProperty(this._sMessagesPath.split(">")[1]) || [];
            aMessages.push(oMessage);
            oModel.setProperty(this._sMessagesPath.split(">")[1], aMessages);
        },

        /**
         * Reemplaza todos los mensajes de un tipo/título específico con una nueva lista.
         * Primero elimina todos los mensajes existentes que coincidan con el título,
         * y luego añade los nuevos.
         * @param {string} sTitle El título de los mensajes a reemplazar (ej: "Ubicacion Técnica").
         * @param {object[]} aNewMessages El array de nuevos objetos de mensaje a añadir.
         */
        setMessagesByTitle: function(sTitle, aNewMessages) {
            const oModel = this._oView.getModel(this._sModelName);
            const sMessagesPath = this._sMessagesPath.split(">")[1]; // ej: "/Messages"
            const aCurrentMessages = oModel.getProperty(sMessagesPath) || [];

            // 1. Filtrar los mensajes existentes para quitar los del tipo especificado
            const aFilteredMessages = aCurrentMessages.filter(
                (oMsg) => oMsg.title !== sTitle
            );

            // 2. Concatenar la lista filtrada con los nuevos mensajes
            const aFinalMessages = aFilteredMessages.concat(aNewMessages);
            
            // 3. Actualizar el modelo
            oModel.setProperty(sMessagesPath, aFinalMessages);
        },

        /**
         * Limpia todos los mensajes del modelo.
         */
        clearMessages: function() {
            const oModel = this._oView.getModel(this._sModelName);
            oModel.setProperty(this._sMessagesPath.split(">")[1], []);
        }
    });
});