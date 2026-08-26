var selectedRow;
var selectedStatus = 0;
var backendStatus = 0;

$(document).ready(function () {
  $("#filterdoc").click(function () {
    $("#filterModal").modal("hide");
    waitingDialog.show("Please wait...");

    var col = [];
    var number_column = [];
    selectedStatus = $("#status").val();

    var backendStatus = selectedStatus;
    if (backendStatus == 10 || backendStatus == 11) {
      backendStatus = 9;
    }


    $("#div-report-doc").css("display", "block");

    col = [
      {
        data: "Date",
        render: function (data, type, row) {
          if (!data) {
            return "-";
          } else {
            const [year, month, day] = data.split("-");
            let date = moment([day, month, year].join("-"), "DD-MM-YYYY");
            return type === "sort"
              ? date.format("YYYY-MM-DD")
              : date.format("DD-MM-YYYY");
          }
        },
      },
      {
        data: "SPPLN_Date",
        render: function (data, type, row) {
          if (!data) {
            return "-";
          } else {
            const [year, month, day] = data.split("-");
            let date = moment([day, month, year].join("-"), "DD-MM-YYYY");
            return type === "sort"
              ? date.format("YYYY-MM-DD")
              : date.format("DD-MM-YYYY");
          }
        },
      },
      {
        data: "SPPLN_Number",
        render: function (data, type, row) {
          return data ? data : "-";
        },
      },
      {
        data: "Vendor",
        render: function (data, type, row) {
          return data ? data : "-";
        },
      },
      {
        data: "ItemCode_SPPLN",
        render: function (data, type, row) {
          return data ? data : "-";
        },
      },
      {
        data: "ItemDesc",
        render: function (data, type, row) {
          return data ? data : "-";
        },
      },
      {
        data: "Color",
        render: function (data, type, row) {
          return data ? data : "-";
        },
      },
      {
        data: "Qty",
        render: function (data, type, row, meta) {
          return addDecimal(parseFloat(data));
        },
      },
      {
        data: "Price",
        render: function (data, type, row, meta) {
          if (!data) return "-";
          return addDecimal(parseFloat(data).toFixed(2));
        },
      },
      {
        data: "SPBLK_Date",
        render: function (data, type, row) {
          if (!data) {
            return "-";
          } else {
            const [year, month, day] = data.split("-");
            let date = moment([day, month, year].join("-"), "DD-MM-YYYY");
            return type === "sort"
              ? date.format("YYYY-MM-DD")
              : date.format("DD-MM-YYYY");
          }
        },
      },
      {
        data: "SPBLK_Number",
        render: function (data, type, row) {
          return data ? data : "-";
        },
      },
      {
        data: "PI_BLK",
        render: function (data, type, row) {
          return data ? data : "-";
        },
      },
      {
        data: "Vendor_BLK",
        render: function (data, type, row) {
          return data ? data : "-";
        },
      },
      {
        data: "ItemCode_BLK",
        render: function (data, type, row) {
          return data ? data : "-";
        },
      },
      {
        data: "ItemDesc_BLK",
        render: function (data, type, row) {
          return data ? data : "-";
        },
      },
      {
        data: "Color_BLK",
        render: function (data, type, row, meta) {
          return data ? data : "-";
        },
      },
      {
        data: "ItemQty",
        render: function (data, type, row, meta) {
          return addDecimal(parseFloat(data));
        },
      },
      {
        data: "ItemPrice",
        render: function (data, type, row, meta) {
          if (!data) return "-";
          return addDecimal(parseFloat(data).toFixed(2));
        },
      },
      {
        data: "PO_Date",
        render: function (data, type, row) {
          if (!data) {
            return "-";
          } else {
            const [year, month, day] = data.split("-");
            let date = moment([day, month, year].join("-"), "DD-MM-YYYY");
            return type === "sort"
              ? date.format("YYYY-MM-DD")
              : date.format("DD-MM-YYYY");
          }
        },
      },
      {
        data: "PO_Number",
        render: function (data, type, row) {
          return data ? data : "-";
        },
      },
      {
        data: "PI_PO",
        render: function (data, type, row) {
          return data ? data : "-";
        },
      },
      {
        data: "ItemCode_PO",
        render: function (data, type, row) {
          return data ? data : "-";
        },
      },
      {
        data: "ItemDesc_PO",
        render: function (data, type, row) {
          return data ? data : "-";
        },
      },
      {
        data: "Color_PO",
        render: function (data, type, row) {
          return data ? data : "-";
        },
      },
      {
        data: "ItemQty_PO",
        render: function (data, type, row) {
          return data ? addDecimal(parseFloat(data)) : "-";
        },
      },
      {
        data: "ItemPrice_PO",
        render: function (data, type, row) {
          if (!data) return "-";
          return addDecimal(parseFloat(data).toFixed(2));
        },
      },

      {
        data: "SITIF_Date",
        render: function (data, type, row) {
          if (!data) {
            return "-";
          } else {
            const [year, month, day] = data.split("-");
            let date = moment([day, month, year].join("-"), "DD-MM-YYYY");
            return type === "sort"
              ? date.format("YYYY-MM-DD")
              : date.format("DD-MM-YYYY");
          }
        },
      },
      {
        data: "AWB",
        render: function (data, type, row) {
          return data ? data : "-";
        },
      },
      {
        data: "ETD",
        render: function (data, type, row) {
          if (!data) {
            return "-";
          } else {
            const [year, month, day] = data.split("-");
            let date = moment([day, month, year].join("-"), "DD-MM-YYYY");
            return type === "sort"
              ? date.format("YYYY-MM-DD")
              : date.format("DD-MM-YYYY");
          }
        },
      },
      {
        data: "Forwarder",
        render: function (data, type, row) {
          return data ? data : "-";
        },
      },
      {
        data: "Received_Date",
        render: function (data, type, row) {
          if (!data) {
            return "-";
          } else {
            const [year, month, day] = data.split("-");
            let date = moment([day, month, year].join("-"), "DD-MM-YYYY");
            return type === "sort"
              ? date.format("YYYY-MM-DD")
              : date.format("DD-MM-YYYY");
          }
        },
      },
      {
        data: "Received_Number",
        render: function (data, type, row) {
          return data ? data : "-";
        },
      },
      {
        data: "Received_Qty",
        render: function (data, type, row) {
          return data ? addDecimal(parseFloat(data)) : "-";
        },
      },
      {
        data: "SPINV_Date",
        render: function (data, type, row) {
          if (!data) {
            return "-";
          } else {
            const [year, month, day] = data.split("-");
            let date = moment([day, month, year].join("-"), "DD-MM-YYYY");
            return type === "sort"
              ? date.format("YYYY-MM-DD")
              : date.format("DD-MM-YYYY");
          }
        },
      },
      {
        data: "SPINV_Number",
        render: function (data, type, row) {
          return data ? data : "-";
        },
      },
      {
        data: "Status",
        render: function (data, type, row) {
          return data ? data : "-";
        },
      },
      {
        data: "Vendor",
        render: function (data, type, row) {
          return data ? data : "-";
        },
        createdCell: function (td, cellData, rowData, row, col) {
          $(td).addClass("hide-col");
        },
      },
      {
        data: "PlanID",
        render: function (data, type, row) {
          return data ? data : "-";
        },
        createdCell: function (td, cellData, rowData, row, col) {
          $(td).addClass("hide-col");
        },
      },
      {
        data: "PlanItemID",
        render: function (data, type, row) {
          return data ? data : "-";
        },
        createdCell: function (td, cellData, rowData, row, col) {
          $(td).addClass("hide-col");
        },
      },
    ];
    number_column = [7, 8, 16, 17, 24, 25, 32];

    $.fn.dataTable.ext.search = [];

    $.fn.dataTable.ext.search.push(function (settings, data, dataIndex) {
      var table = $("#report-doc").DataTable();
      var rowData = table.row(dataIndex).data();

      if (selectedStatus == 0) return true;

      const statusMap = {
        1: "Planning",
        2: "Blanket",
        3: "Ordered",
        4: "Shipping",
        5: "Received",
        6: "Invoice",
      };

      return rowData.Status === statusMap[selectedStatus];
    });

    try {
      if ($("#report-doc").length === 0) {
        throw new Error("Table #report-doc tidak ditemukan di DOM");
      }

      init_datatable(col, number_column);
    } catch (e) {
      console.error("Error in init_datatable:", e);
      waitingDialog.hide();
    }
  });

  $("#btn-filter").click(function () {
    $("#filterModal").modal("show");
  });

  $("#filterModal").modal("show");

  $("#startDate").val(get_date(false));
  $("#startDate").fdatepicker({
    format: "dd/mm/yyyy",
    disableDblClickSelection: true,
    pickTime: false,
    endDate: new Date(),
    closeButton: true,
  });

  $("#endDate").val(get_date(false));
  $("#endDate").fdatepicker({
    format: "dd/mm/yyyy",
    disableDblClickSelection: true,
    pickTime: false,
    endDate: new Date(),
    closeButton: true,
  });

  $("#range").on("changed.bs.select", function () {
    $("#startDate").attr("disabled", true);
    $("#endDate").attr("disabled", true);
    $("#endDate").val(get_date(false));

    if ($(this).val() == "Today") $("#startDate").val(get_date(false));
    else if ($(this).val() == "Yesterday")
      $("#startDate").val(get_date(false, -1));
    else if ($(this).val() == "Last 3 Days")
      $("#startDate").val(get_date(false, -3));
    else if ($(this).val() == "Last Week")
      $("#startDate").val(get_date(false, -7));
    else if ($(this).val() == "Last 2 Weeks")
      $("#startDate").val(get_date(false, -14));
    else if ($(this).val() == "Custom Date") {
      $("#startDate").attr("disabled", false);
      $("#endDate").attr("disabled", false);
    }
  });
});

function init_datatable(columns, number_column) {
  var $table = $("#report-doc");

  if ($table.length === 0) {
    console.error("Table #report-doc tidak ditemukan di DOM");
    alert("ERROR: Table element #report-doc tidak ditemukan di DOM!");
    return false;
  }

  try {
    if ($.fn.dataTable.isDataTable("#report-doc")) {
      $("#report-doc").DataTable().destroy();
    }
  } catch (e) {
    console.warn("Warning saat destroy existing DataTable:", e.message);
  }

  try {
    $("#report-doc").DataTable({
      ajax: {
        url: `${base_path}scm/purchasing/purchase_report/getPrReport`,
        type: "POST",
        dataSrc: "",
        data: {
          start: $("#startDate").val(),
          end: $("#endDate").val(),
          void: $("#void").val(),
          status: backendStatus,
          docnostart: $("#startDocNo").val(),
          docnoend: $("#endDocNo").val(),
        },
        error: function (xhr, status, error) {
          console.error("AJAX Error:", status, error);
        },
        dataFilter: function (data) {
          try {
            var json = JSON.parse(data);
            return JSON.stringify(json);
          } catch (e) {
            console.error("Error parsing JSON:", e);
            return JSON.stringify([]);
          }
        },
      },
      columns: columns,
      columnDefs: [{ className: "numeric", targets: number_column }],
      scrollX: true,
      initComplete: function () {
        waitingDialog.hide();
      },
      error: function (message) {
        console.error("DataTable Error:", message);
      },
      dom: "Bfrtip",
      buttons: [
        {
          text: "Export to Excel",
          extend: "excelHtml5",
          customize: function (xlsx) {
            var sheet = xlsx.xl.worksheets["sheet1.xml"];
            var styleDate = excelHtml5_format(xlsx, "dd/mm/yyyy");
            var styleDatetime = excelHtml5_format(xlsx, "dd/mm/yyyy HH:mm:ss");
            $("col:eq(0)", sheet).attr("style", styleDate);
          },
          exportOptions: {
            orthogonal: "export",
          },
        },
        {
          text: "View Attachments",
          attr: { title: "View", id: "btnView" },
          action: function (e, dt, node, config) {
            if (!selectedRow) {
              alert("Please select data first!");
            } else {
              var data = $("#report-doc").DataTable().row(selectedRow).data();
              let url = `${base_path}scm/purchasing/purchase_report/view_attachments/${data.PlanID}`;
              if (data.PO_Number) {
                url += `/${data.PO_Number}`;

                if (data.SPINV_Number) {
                  url += `/${data.SPINV_Number}`;
                }
              }
              window.open(url);
            }
          },
        },
      ],
      select: {
        style: "single", // Use 'single' for single row selection or 'multi' for multiple rows
      },
      createdRow: function (row, data, dataIndex) {
        $(row).mousedown(function (e) {
          if ($(row).hasClass("selected")) {
            selectedRow = "";
          } else {
            selectedRow = row;
          }
        });
      },
    });
  } catch (e) {
    console.error("Error initializing DataTable:", e.message);
    waitingDialog.hide();
    alert("Error initializing DataTable:\n" + e.message);
  }
}

function get_max_styleid(elements, attr) {
  var values = elements
    .map(function () {
      return this.getAttribute(attr) || -Infinity;
    })
    .toArray();

  return Math.max.apply(Math, values);
}

function excelHtml5_format(xlsx, formatCode) {
  var styles = xlsx.xl["styles.xml"];
  var numFmtId = get_max_styleid($("numFmts numFmt", styles), "numFmtId") + 1;
  var nFmt =
    '<numFmt numFmtId="' + numFmtId + '" formatCode="' + formatCode + '"/>';
  el = $("numFmts", styles);
  el.append(nFmt).attr("count", parseInt(el.attr("count")) + 1);
  var style =
    '<xf numFmtId="' +
    numFmtId +
    '" fontId="0" fillId="0" borderId="0" applyFont="1" applyFill="1" applyBorder="1" xfId="0" applyNumberFormat="1"><alignment horizontal="right"/></xf>';
  el = $("cellXfs", styles);
  el.append(style).attr("count", parseInt(el.attr("count")) + 1);
  var styleIdx = $("xf", el).length - 1;
  return styleIdx;
}

function get_date(customDate, addition = 0) {
  var today = new Date();

  today.setDate(today.getDate() + addition);

  var dd = today.getDate();
  var mm = today.getMonth() + 1; //January is 0!
  var yyyy = today.getFullYear();

  if (!customDate) {
    if (dd < 10) dd = "0" + dd;
  } else dd = "01";

  if (mm < 10) mm = "0" + mm;

  return dd + "/" + mm + "/" + yyyy;
}
