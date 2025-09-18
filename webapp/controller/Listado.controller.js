sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
     "sap/ui/model/Sorter",
    "../model/formatter"
], (Controller, Filter, FilterOperator, MessageToast, Fragment, JSONModel,Sorter, formatter) => {
    "use strict";

    return Controller.extend("salidademateriales.controller.Listado", {
        formatter: formatter,
        onInit() {
            const oView = this.getView();
            const oModelR = new JSONModel({
                ReservaSet: [],
                filters: {
                    reserva: "",
                    fechaFrom: "",
                    fechaTo: "",
                    materialFrom: "",
                    materialTo: "",
                    centro: "",
                },
                centros: [ {
                            "id" : "0001",
                            "name" : "Werk 0001"
                            },
                            {
                            "id" : "0003",
                            "name" : "Plant 0003 (is-ht-sw)"
                            },
                            {
                            "id" : "CD00",
                            "name" : "Colbun Desarrollo"
                            },
                            {
                            "id" : "CL00",
                            "name" : "Casa Matríz Santiago"
                            },
                            {
                            "id" : "CL01",
                            "name" : "Central Colbun"
                            },
                            {
                            "id" : "CL02",
                            "name" : "Central San Clemente"
                            },
                            {
                            "id" : "CL03",
                            "name" : "Central La Mina"
                            },
                            {
                            "id" : "CL04",
                            "name" : "Central Machicura"
                            },
                            {
                            "id" : "CL05",
                            "name" : "Central Chiburgo"
                            },
                            {
                            "id" : "CL06",
                            "name" : "Central San Ignacio"
                            },
                            {
                            "id" : "CL07",
                            "name" : "Central Los Quilos"
                            },
                            {
                            "id" : "CL08",
                            "name" : "Central Hornitos"
                            },
                            {
                            "id" : "CL09",
                            "name" : "Central Juncalito"
                            },
                            {
                            "id" : "CL10",
                            "name" : "Central Juncal"
                            },
                            {
                            "id" : "CL11",
                            "name" : "Central Blanco"
                            },
                            {
                            "id" : "CL12",
                            "name" : "Central Chacabuquito"
                            },
                            {
                            "id" : "CL13",
                            "name" : "Central Carena"
                            },
                            {
                            "id" : "CL14",
                            "name" : "Central Canutillar"
                            },
                            {
                            "id" : "CL15",
                            "name" : "Central Angostura"
                            },
                            {
                            "id" : "CL16",
                            "name" : "Central Rucue"
                            },
                            {
                            "id" : "CL17",
                            "name" : "Central Quilleco"
                            },
                            {
                            "id" : "CL18",
                            "name" : "Central Nehuenco I"
                            },
                            {
                            "id" : "CL19",
                            "name" : "Central Nehuenco II"
                            },
                            {
                            "id" : "CL20",
                            "name" : "Central Nehuenco III"
                            },
                            {
                            "id" : "CL21",
                            "name" : "Central Candelaria"
                            },
                            {
                            "id" : "CL22",
                            "name" : "Central Los Pinos"
                            },
                            {
                            "id" : "CL23",
                            "name" : "Central Santa María"
                            },
                            {
                            "id" : "CL24",
                            "name" : "Central Ovejería"
                            },
                            {
                            "id" : "CL25",
                            "name" : "Central Machicura Solar"
                            },
                            {
                            "id" : "CL26",
                            "name" : "Central Diego de Almagro"
                            },
                            {
                            "id" : "CL27",
                            "name" : "Central Horizonte"
                            },
                            {
                            "id" : "CL28",
                            "name" : "BESS Celda Solar"
                            },
                            {
                            "id" : "CL90",
                            "name" : "Proyectos General"
                            },
                            {
                            "id" : "CLUT",
                            "name" : "Santiago"
                            },
                            {
                            "id" : "CM00",
                            "name" : "Complejo Marítimo Taltal"
                            },
                            {
                            "id" : "CP00",
                            "name" : "Colbun Perú"
                            },
                            {
                            "id" : "CS00",
                            "name" : "Colbun Soluciones Santiago"
                            },
                            {
                            "id" : "CT00",
                            "name" : "Transmisión Santiago"
                            },
                            {
                            "id" : "CT10",
                            "name" : "Transmisión Centro Norte"
                            },
                            {
                            "id" : "CT20",
                            "name" : "Transmisión Centro Sur"
                            },
                            {
                            "id" : "CT30",
                            "name" : "Transmisión Zona Sur"
                            },
                            {
                            "id" : "CTUT",
                            "name" : "Santiago"
                            },
                            {
                            "id" : "DP00",
                            "name" : "Desala Petorca"
                            },
                            {
                            "id" : "FC00",
                            "name" : "Fundación Colbun"
                            },
                            {
                            "id" : "FP00",
                            "name" : "Casa Matríz Lima"
                            },
                            {
                            "id" : "FP01",
                            "name" : "Central Fénix"
                            },
                            {
                            "id" : "FR00",
                            "name" : "Faraday"
                            },
                            {
                            "id" : "IC00",
                            "name" : "Inversiones de las Canteras SA"
                            },
                            {
                            "id" : "IL00",
                            "name" : "Inversiones Latin America"
                            },
                            {
                            "id" : "NO01",
                            "name" : "Parque Eólico Totoral"
                            },
                            {
                            "id" : "SJ01",
                            "name" : "Parque Eólico San Juan"
                            },
                            {
                            "id" : "SS00",
                            "name" : "Santa Sofía"
                            },
                            {"id" : "TQ00",
                            "name" : "Transquillota"
                            },
                            {"id" : "TRUT",
                            "name" : "Transmisora Eléctrica Quillota"
                            }
                        ],
            });

            oView.setModel(oModelR, "Reservas");

            this.openInitialFilters();

        },
        async openInitialFilters(){
            if (!this.initialFiltersDialog) {
                this.initialFiltersDialog = await Fragment.load({
                    name: "salidademateriales.view.fragments.listado.dialogs.InitialFilters",
                    controller: this,
                    id: "initialFilters"
                });
                this.getView().addDependent(this.initialFiltersDialog);
            }
            this.initialFiltersDialog.open();
        },
        onSearch(){
            const oDataModel = this.getOwnerComponent().getModel();
            
            const oView = this.getView();
            const reservasModel =oView.getModel("Reservas");
            const filters = reservasModel.getProperty("/filters");
        
            this.byId('reservasTable').setBusy(true);
            const aFilters = this.getReservasFilters(filters);
             oDataModel.read("/ReservaSet", {
                filters: aFilters, 

                success: function (oData) {
                    oData.results.forEach((reserva) => {
                        let aux = reserva.BaseDate;
                        if (aux){
                            reserva.BaseDate = aux.toISOString().slice(0,10);
                        }
                        aux = reserva.ReqDate;
                        if (aux){
                            reserva.ReqDate = aux.toISOString().slice(0,10);
                        }
                        
                    })
                    reservasModel.setProperty("/ReservaSet", oData.results)
                    this.byId('reservasTable').setBusy(false);
                }.bind(this), // .bind(this) es crucial para poder usar "this.getView()" dentro del callback

                // 6. MANEJAR ERRORES
                error: function (oError) {
                    console.error("Error en la llamada OData:", oError);
                    MessageToast.show("Ocurrió un error al buscar los datos.");
                    this.byId('reservasTable').setBusy(false);
                }.bind(this)
            });

            this.initialFiltersDialog.close();
        },
        onCloseInitialFilters(){
            this.initialFiltersDialog.close();
        },
        isMaterialInRange(material, materialFrom, materialTo){
            const materialId = parseInt(material?.id);
            if(!material || isNaN(materialId)) throw "Invalid or missing material";
            const isMaterialFromNaN = isNaN(materialFrom);
            const isMaterialToNaN = isNaN(materialTo);
            if(isMaterialFromNaN && isMaterialToNaN) return true;
            if(isMaterialFromNaN && !isMaterialToNaN) return materialId <= materialTo;
            if(!isMaterialFromNaN && isMaterialToNaN) return materialId >= materialFrom;
            return materialId >= materialFrom && materialId <= materialTo;
        },
        getReservasFilters(filters){
            const aFilter = [];

            if (filters.reserva) aFilter.push( new Filter({path: 'Id', operator: FilterOperator.EQ, value1: String(parseInt(filters.reserva.trim()))}));
            if (filters.orden) aFilter.push( new Filter({path: 'Orden', operator: FilterOperator.EQ, value1: String(parseInt(filters.orden.trim()))}));
            if (filters.fechaFrom && filters.fechaTo) aFilter.push(new Filter({path: 'ReqDate', operator: FilterOperator.BT, value1: filters.fechaFrom, value2: filters.fechaTo}))
            else if (filters.fechaFrom) aFilter.push(new Filter({path: 'ReqDate', operator: FilterOperator.GE, value1: filters.fechaFrom}))
            else if (filters.fechaTo) aFilter.push(new Filter ({path: 'ReqDate', operator: FilterOperator.LE, value1: filters.fechaTo}));
            
            if (filters.materialFrom && filters.materialTo) {
                aFilter.push(new Filter({path: 'Material', operator: FilterOperator.BT, value1: filters.materialFrom.trim(), value2: filters.materialTo.trim()}));
            }else if (filters.materialFrom) {
                aFilter.push(new Filter({path: 'Material', operator: FilterOperator.GE, value1: filters.materialFrom.trim()}));
            }else if (filters.materialTo){
                aFilter.push(new Filter({path: 'Material', operator: FilterOperator.LE, value1: filters.materialTo.trim()}));
            }
            if (filters.centro){
                aFilter.push(new Filter({path: 'Centro', operator: FilterOperator.EQ, value1: filters.centro}));
            }
            console.log(aFilter)
            return aFilter;
        },
        onFiltrarTable() {

        },

        _bDescendingSort: false,

        onSort: function (oEvent) {
            // 1. Obtener la propiedad por la que se debe ordenar desde los datos personalizados
            const sSortProperty = oEvent.getSource().data("sortProperty");
            
            // 2. Invertir la dirección del ordenamiento
            //    Si la última vez fue descendente, ahora será ascendente, y viceversa.
            this._bDescendingSort = !this._bDescendingSort;

            // 3. Crear el objeto Sorter
            const oSorter = new Sorter(sSortProperty, this._bDescendingSort);

            // 4. Obtener el binding de la tabla y aplicar el ordenamiento
            const oTable = this.byId("reservasTable");
            const oBinding = oTable.getBinding("items");
            
            oBinding.sort(oSorter);

            // 5. (Opcional pero recomendado) Actualizar el ícono para dar feedback visual
            this._updateSortIndicator(oEvent.getSource());
        },

        // Función auxiliar para actualizar los íconos
        _updateSortIndicator: function (oPressedButton) {
            const oTable = this.byId("reservasTable");
            
            // Primero, reseteamos todos los íconos al ícono por defecto
            oTable.getColumns().forEach(function (oColumn) {
                const oHeader = oColumn.getHeader();
                if (oHeader instanceof sap.m.Button) {
                    oHeader.setIcon("sap-icon://sort");
                }
            });

            // Luego, establecemos el ícono correcto (arriba o abajo) solo para el botón presionado
            const sNewIcon = this._bDescendingSort ? "sap-icon://sort-descending" : "sap-icon://sort-ascending";
            oPressedButton.setIcon(sNewIcon);
        },

        onClear() {
            const oReservasModel = this.getView().getModel("Reservas");
            oReservasModel.setProperty('/filters',  {
                    reserva: "",
                    fechaFrom: "",
                    fechaTo: "",
                    materialFrom: "",
                    materialTo: "",
                    centro: "",
            });
            this.onSearch();
        },
        onItemPress(oEvent) {
            const oBindingContext = oEvent.getSource().getBindingContext("Reservas");
            const oSelectedReserva = oBindingContext.getObject();
            if (!oSelectedReserva) {
                sap.m.MessageToast.show("Error al obtener los datos de la reserva.");
                return;
            }
            this.getOwnerComponent().getRouter().navTo("RouteDetails", {
                reservaId: oSelectedReserva.ReservaId 
            });
        },
    });
});