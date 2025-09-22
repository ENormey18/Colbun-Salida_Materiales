sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Sorter",
    "../model/formatter",
  ],
  (
    Controller,
    Filter,
    FilterOperator,
    MessageToast,
    Fragment,
    JSONModel,
    Sorter,
    formatter
  ) => {
    "use strict";

    return Controller.extend("salidademateriales.controller.Listado", {
      formatter: formatter,
      onInit() {
        const oView = this.getView();

        let aCentros = [];
        const oModel = this.getOwnerComponent().getModel();
        this.__loadWerks(oModel)
          .then((aCentros)=>{
            const oModelR = new JSONModel({
              ReservaSet: [],
              filters: {
                reserva: "",
                fechaFrom: "",
                fechaTo: "",
                materialFrom: "",
                materialTo: "",
                centro: "",
                status: "O",
              },
              centros: aCentros,
            });
            oView.setModel(oModelR, "Reservas");
            this.openInitialFilters();
          })
          .catch((err) => {
            console.error("Error en la llamada OData:", err);
            MessageToast.show(
              "Ocurrió un error al buscar los datos de centros."
            );
          });
      },
      async openInitialFilters() {
        if (!this.initialFiltersDialog) {
          this.initialFiltersDialog = await Fragment.load({
            name: "salidademateriales.view.fragments.listado.dialogs.InitialFilters",
            controller: this,
            id: "initialFilters",
          })
            .then((oInitialFiltersDialog)=>{
              this.getView().addDependent(oInitialFiltersDialog);
              return oInitialFiltersDialog;
          });
        }
        this.initialFiltersDialog.open();
      },

      __loadWerks(oModel) {
        return new Promise(function (resolve, reject) {
          oModel.read("/CentroSet", {
            success: function (oData) {
              resolve(oData.results);
            },
            error: function (oError) {
              reject(oError)
            },
          });
        });
      },
      onSearch() {
        const oDataModel = this.getOwnerComponent().getModel();

        const oView = this.getView();
        const reservasModel = oView.getModel("Reservas");
        const filters = reservasModel.getProperty("/filters");

        this.byId("reservasTable").setBusy(true);
        const aFilters = this.getReservasFilters(filters);
        oDataModel.read("/ReservaSet", {
          filters: aFilters,

          success: function (oData) {
            oData.results.forEach((reserva) => {
              let aux = reserva.BaseDate;
              if (aux) {
                reserva.BaseDate = aux.toISOString().slice(0, 10);
              }
              aux = reserva.ReqDate;
              if (aux) {
                reserva.ReqDate = aux.toISOString().slice(0, 10);
              }
            });
            reservasModel.setProperty("/ReservaSet", oData.results);
            this.byId("reservasTable").setBusy(false);
          }.bind(this), // .bind(this) es crucial para poder usar "this.getView()" dentro del callback

          // 6. MANEJAR ERRORES
          error: function (oError) {
            console.error("Error en la llamada OData:", oError);
            MessageToast.show("Ocurrió un error al buscar los datos.");
            this.byId("reservasTable").setBusy(false);
          }.bind(this),
        });

        this.initialFiltersDialog.close();
      },
      onCloseInitialFilters() {
        this.initialFiltersDialog.close();
      },
      isMaterialInRange(material, materialFrom, materialTo) {
        const materialId = parseInt(material?.id);
        if (!material || isNaN(materialId)) throw "Invalid or missing material";
        const isMaterialFromNaN = isNaN(materialFrom);
        const isMaterialToNaN = isNaN(materialTo);
        if (isMaterialFromNaN && isMaterialToNaN) return true;
        if (isMaterialFromNaN && !isMaterialToNaN)
          return materialId <= materialTo;
        if (!isMaterialFromNaN && isMaterialToNaN)
          return materialId >= materialFrom;
        return materialId >= materialFrom && materialId <= materialTo;
      },
      getReservasFilters(filters) {
        const aFilter = [];

        if (filters.reserva)
          aFilter.push(
            new Filter({
              path: "Id",
              operator: FilterOperator.EQ,
              value1: String(parseInt(filters.reserva.trim())),
            })
          );
        if (filters.orden)
          aFilter.push(
            new Filter({
              path: "Orden",
              operator: FilterOperator.EQ,
              value1: String(parseInt(filters.orden.trim())),
            })
          );
        if (filters.fechaFrom && filters.fechaTo)
          aFilter.push(
            new Filter({
              path: "ReqDate",
              operator: FilterOperator.BT,
              value1: filters.fechaFrom,
              value2: filters.fechaTo,
            })
          );
        else if (filters.fechaFrom)
          aFilter.push(
            new Filter({
              path: "ReqDate",
              operator: FilterOperator.GE,
              value1: filters.fechaFrom,
            })
          );
        else if (filters.fechaTo)
          aFilter.push(
            new Filter({
              path: "ReqDate",
              operator: FilterOperator.LE,
              value1: filters.fechaTo,
            })
          );

        if (filters.materialFrom && filters.materialTo) {
          aFilter.push(
            new Filter({
              path: "Material",
              operator: FilterOperator.BT,
              value1: filters.materialFrom.trim(),
              value2: filters.materialTo.trim(),
            })
          );
        } else if (filters.materialFrom) {
          aFilter.push(
            new Filter({
              path: "Material",
              operator: FilterOperator.GE,
              value1: filters.materialFrom.trim(),
            })
          );
        } else if (filters.materialTo) {
          aFilter.push(
            new Filter({
              path: "Material",
              operator: FilterOperator.LE,
              value1: filters.materialTo.trim(),
            })
          );
        }
        if (filters.centro) {
          aFilter.push(
            new Filter({
              path: "Centro",
              operator: FilterOperator.EQ,
              value1: filters.centro,
            })
          );
        }
        if (filters.status) {
          if (filters.status === "O") {
            aFilter.push(
              new Filter({
                path: "Status",
                operator: FilterOperator.NE,
                value1: "C",
              })
            );
          } else {
            aFilter.push(
              new Filter({
                path: "Status",
                operator: FilterOperator.EQ,
                value1: filters.status,
              })
            );
          }
        }
        return aFilter;
      },
      onClear() {
        const oReservasModel = this.getView().getModel("Reservas");
        oReservasModel.setProperty("/filters", {
          reserva: "",
          fechaFrom: "",
          fechaTo: "",
          materialFrom: "",
          materialTo: "",
          centro: "",
          status: "O",
        });
        this.onSearch();
      },

      onFiltrarTable: function (oEvent) {
        const sQuery = oEvent.getParameter("query");
        const aFilters = [];

        if (sQuery && sQuery.length > 0) {
          // Crear un filtro compuesto con OR.
          // Este filtro buscará la cadena sQuery en CUALQUIERA de los campos especificados.
          const oGlobalFilter = new Filter({
            filters: [
              new Filter("Id", FilterOperator.Contains, sQuery),
              new Filter("Orden", FilterOperator.Contains, sQuery),
              new Filter("Usuario", FilterOperator.Contains, sQuery),
              new Filter("Dest", FilterOperator.Contains, sQuery),
              new Filter("Centro", FilterOperator.Contains, sQuery),
              new Filter("ReqDate", FilterOperator.Contains, sQuery),
            ],
            and: false,
          });
          aFilters.push(oGlobalFilter);
        }

        const oTable = this.byId("reservasTable");
        const oBinding = oTable.getBinding("items");
        oBinding.filter(aFilters);
      },
      _bDescendingSort: false,
      _sCurrentSortProperty: "Id",
      onSort: function (oEvent) {
        // 1. Obtener la propiedad por la que se debe ordenar desde los datos personalizados
        const sSortProperty = oEvent.getSource().data("sortProperty");

        // Comprobamos si se está ordenando por la misma columna
        // Si es así, invertimos la dirección. Si no, reseteamos a ascendente.
        if (this._sCurrentSortProperty === sSortProperty) {
          this._bDescendingSort = !this._bDescendingSort;
        } else {
          this._bDescendingSort = false;
        }
        this._sCurrentSortProperty = sSortProperty;

        let oSorter;

        if (sSortProperty === "Id" || sSortProperty === "Orden") {
          oSorter = new Sorter(
            sSortProperty,
            this._bDescendingSort,
            false,
            function (a, b) {
              // Función de comparación para ordenar numéricamente
              const numA = parseInt(a, 10);
              const numB = parseInt(b, 10);

              if (isNaN(numA) || isNaN(numB)) {
                // Manejar casos donde el valor no es un número
                if (a < b) return -1;
                if (a > b) return 1;
                return 0;
              }

              if (numA < numB) return -1;
              if (numA > numB) return 1;
              return 0;
            }
          );
        } else {
          oSorter = new Sorter(sSortProperty, this._bDescendingSort);
        }

        //Obtener el binding de la tabla y aplicar el ordenamiento
        const oTable = this.byId("reservasTable");
        const oBinding = oTable.getBinding("items");

        oBinding.sort(oSorter);

        //Actualizar el ícono para dar feedback visual
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

        // Establecemos el ícono correcto
        const sNewIcon = this._bDescendingSort
          ? "sap-icon://sort-descending"
          : "sap-icon://sort-ascending";
        oPressedButton.setIcon(sNewIcon);
      },
      onItemPress(oEvent) {
        const oBindingContext = oEvent
          .getSource()
          .getBindingContext("Reservas");
        const oSelectedReserva = oBindingContext.getObject();
        if (!oSelectedReserva) {
          sap.m.MessageToast.show("Error al obtener los datos de la reserva.");
          return;
        }
        this.getOwnerComponent().getRouter().navTo("RouteDetails", {
          reservaId: oSelectedReserva.Id,
        });
      },
    });
  }
);
