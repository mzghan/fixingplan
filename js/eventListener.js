let currentItemDescriptionFilter = "";
let currentQuarterFilter = "Q1"; // Ini akan di-override nanti
let selectedRowData = null;
let currentShipmentDateStart = "";
let currentShipmentDateEnd = "";
let currentDocNumberFilter = "";
let currentVendorID = "";
let currentVendorFilter = "";
let currentYearFilter = "";
let currentPlanGroupFilter = "";
let availableYears = [];
let selectedPlanIDs = [];
let currentGroupedData = [];
let activeWeeks = [];
let isNew = false;
let selectedYear = "all";
let weekRangeData = []; // Menyimpan 52 minggu dari backend
let currentLatestYear = null;
let currentLatestWeek = null;
let currentHolidayYear = new Date().getFullYear();
let currentHolidayYearID = null;
let minHolidayYear = null;
let maxHolidayYear = null;

var purchasePlanDT;
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

function getISOWeekYear(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  yearStart.setUTCDate(
    yearStart.getUTCDate() + 4 - (yearStart.getUTCDay() || 7),
  );
  yearStart.setUTCDate(yearStart.getUTCDate() - yearStart.getUTCDay() + 1);

  const prevYearStart = new Date(Date.UTC(d.getUTCFullYear() - 1, 0, 1));
  prevYearStart.setUTCDate(
    prevYearStart.getUTCDate() + 4 - (prevYearStart.getUTCDay() || 7),
  );
  prevYearStart.setUTCDate(
    prevYearStart.getUTCDate() - prevYearStart.getUTCDay() + 1,
  );

  const nextYearStart = new Date(Date.UTC(d.getUTCFullYear() + 1, 0, 1));
  nextYearStart.setUTCDate(
    nextYearStart.getUTCDate() + 4 - (nextYearStart.getUTCDay() || 7),
  );
  nextYearStart.setUTCDate(
    nextYearStart.getUTCDate() - nextYearStart.getUTCDay() + 1,
  );

  if (d < yearStart) {
    return d.getUTCFullYear() - 1;
  }

  if (d >= nextYearStart) {
    return d.getUTCFullYear() + 1;
  }
  return d.getUTCFullYear();
}

function getWeekOfYear(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");

  const year = getISOWeekYear(dateStr);
  const yearStart = new Date(Date.UTC(year, 0, 1));
  yearStart.setUTCDate(
    yearStart.getUTCDate() + 4 - (yearStart.getUTCDay() || 7),
  );
  yearStart.setUTCDate(yearStart.getUTCDate() - yearStart.getUTCDay() + 1);

  // Hitung jarak dalam hari dari Monday of week 1
  const daysDiff = Math.floor((d - yearStart) / (24 * 60 * 60 * 1000));
  const week = Math.floor(daysDiff / 7) + 1;

  return Math.max(1, Math.min(53, week));
}

function getPeriodInfo(date) {
  return $.ajax({
    url: BASE_URL + "scm/purchasing/purchase_plan_report/get_period",
    type: "POST",
    dataType: "json",
    data: { date: date },
  });
}

// main
$(function () {
  $("body").append(
    '<input type="file" id="importExcelFile" accept=".xls,.xlsx" style="display:none;" />',
  );

  $("#importExcelFile").on("change", function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (event) {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Proses data
        processImportedExcelData(jsonData);
      } catch (error) {
        console.error(" Error reading Excel:", error);
        alert(" Failed to read excel file! " + error.message);
      }
    };
    reader.readAsArrayBuffer(file);

    $(this).val("");
  });

  function updateTableHeaders(year) {
    const thead = $("#purchasePlanTable thead tr");
    thead.empty();

    thead.append(`
        // <th style="width:1%; padding-left:10px">DocDate</th>
        // <th style="width:1%;">DocNumber</th>
        <th style="width:1%;">Vendor</th>
        <th style="width:1%;">ItemDesc</th>
        <th style="width:1%;">Color</th>
        // <th style="width:1%;"Batch</th>        
        
    `);

    $.ajax({
      url: BASE_URL + "scm/purchasing/purchase_plan_report/get_weeks_by_year",
      type: "POST",
      dataType: "json",
      data: { year: year },
      success: function (res) {
        if (res.status === "success") {
          res.weeks.forEach(function (ww) {
            thead.append(`<th style="width:1%;">${ww}</th>`);
          });
        }
      },
    });
  }

  function formatToIDR(value) {
    const number = parseFloat(value);
    if (isNaN(number)) {
      return "0.00";
    }
    const fixedNumber = number.toFixed(2);
    const [integerPart, decimalPart] = fixedNumber.split(".");
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `${formattedInteger}.${decimalPart}`;
  }
  $(function () {
    const year = new Date().getFullYear();
    updateTableHeaders(year);
    loadPurchasePlanData();
  });
  let allPurchasePlanData = [];
  let baselinePurchasePlanData = []; // Menyimpan baseline data saat pertama kali load (untuk validasi import)
  let years = [];
  let currentPage = 1;
  const rowsPerPage = 10;
  let activeTable = null; // Track which table is active for sorting (left/right)

  function loadPurchasePlanData() {
    const tableBody = $("#purchasePlanTable tbody");
    tableBody.empty();

    const numCols = $("#purchasePlanTable thead tr th").length;
    tableBody.append(`<tr><td colspan="${numCols}">Memuat data...</td></tr>`);

    selectedRowData = null;

    showTableLoadingOverlay();

    const filters = {
      itemDesc: currentItemDescriptionFilter || "",
      year:
        currentYearFilter && currentYearFilter !== "all"
          ? currentYearFilter
          : "",
      docDateStart: currentShipmentDateStart || "",
      docDateEnd: currentShipmentDateEnd || "",
      docNumber: currentDocNumberFilter || "",
      vendorId: currentVendorID || "",
      vendor: currentVendorFilter || "",
      planGroupId: currentPlanGroupFilter || "",
    };
    if (currentYearFilter === "latest") {
      filters.year = "";
      currentYearFilter = "";
      currentQuarterFilter = "";
      currentItemDescriptionFilter = "";
      currentShipmentDateStart = "";
      currentShipmentDateEnd = "";
      currentDocNumberFilter = "";
      currentVendorFilter = "";
      currentVendorID = "";
      currentPlanGroupFilter = "";
    }
    $.ajax({
      url:
        BASE_URL + "scm/purchasing/purchase_plan_report/get_purchase_plan_data",
      type: "GET",
      dataType: "json",
      data: filters,
      success: function (response) {
        if (!response.data || response.data.length === 0) {
          alert("Nothing data found at period selected!");
          // return;
        }

        console.log("Sample structure:", response.data[0]);

        if (response.available_years && response.available_years.length > 0) {
          availableYears = response.available_years;
        } else if (availableYears.length === 0) {
          const dataYears = [
            ...new Set(
              response.data
                .filter((d) => d.ShipmentDate)
                .map((d) => new Date(d.ShipmentDate).getFullYear()),
            ),
          ].sort((a, b) => b - a);
          availableYears = dataYears;
        }

        if (response.week_range) {
          weekRangeData = response.week_range;
        }
        if (response.latest_week) {
          currentLatestYear = response.latest_week.year;
          currentLatestWeek = response.latest_week.week;
        }

        //  Destroy tabel lama agar tidak dobel
        if ($.fn.DataTable.isDataTable("#purchasePlanTableLeft")) {
          $("#purchasePlanTableLeft").DataTable().clear().destroy();
          $("#purchasePlanTableLeft tbody").empty();
          $("#purchasePlanTableLeft").off();
        }

        if ($.fn.DataTable.isDataTable("#purchasePlanTableRight")) {
          $("#purchasePlanTableRight").DataTable().clear().destroy();
          $("#purchasePlanTableRight tbody").empty();
          $("#purchasePlanTableRight").off();
        }

        $("#globalLengthContainer").empty();
        $("#globalSearchContainer").empty();
        $("#globalInfoContainer").empty();
        $("#globalPaginationContainer").empty();
        $("#table-controls .dt-buttons").remove();

        const filteredData = response.data.filter(
          (item) =>
            !item.EndDate || item.EndDate === null || item.EndDate === "",
        );

        allPurchasePlanData = filteredData;
        baselinePurchasePlanData = JSON.parse(JSON.stringify(filteredData));
        updateYearDropdown();
        initPurchasePlanDataTable();
      },

      error: function (xhr, status, error) {
        console.error(
          " Terjadi error saat mengambil data purchase plan:",
          error,
        );
        console.error("Status HTTP:", xhr.status, "(", xhr.statusText, ")");
        console.error("Respons Server (raw):", xhr.responseText);

        tableBody.empty();
        tableBody.append(
          `<tr><td colspan="${numCols}">Gagal memuat data.</td></tr>`,
        );
      },
      complete: function () {
        hideTableLoadingOverlay();
      },
    });
  }

  function showTableLoadingOverlay() {
    if ($("#tableLoadingOverlay").length) return; // cegah dobel

    $("body").append(`
      <div id="tableLoadingOverlay" style="
        position:fixed; top:0; left:0; right:0; bottom:0;
        background:rgba(255,255,255,0.6);
        display:flex; align-items:center; justify-content:center;
        z-index:99999;">
        <div style="text-align:center;">
          <div class="spinner-border text-primary" role="status" style="width:3rem;height:3rem;"></div>
          <div style="margin-top:10px;font-weight:500;">Memuat data...</div>
        </div>
      </div>
    `);
  }
  function hideTableLoadingOverlay() {
    $("#tableLoadingOverlay").remove();
  }
  function renderTablePage(page) {
    const tableBody = $("#purchasePlanTable tbody");
    tableBody.empty();
    const startIndex = (page - 1) * rowsPerPage;
    const endIndex = startIndex + rowsPerPage;
    const pageData = allPurchasePlanData.slice(startIndex, endIndex);

    pageData.forEach((rowData) => {
      let newRow = $("<tr>");

      const cellStyle = 'style="padding-right:10px;"'; // jarak kanan 8px di setiap kolom
      const cellStyle1 = `style="padding-right:10px; padding-left:10px"`;

      newRow.append(
        `<td ${cellStyle1} title="${rowData["Vendor"] || "N/A"}">${
          rowData["Vendor"] || "N/A"
        }</td>`,
      );
      newRow.append(
        `<td ${cellStyle} title="${rowData["ItemDesc"] || "N/A"}">${
          rowData["ItemDesc"] || "N/A"
        }</td>`,
      );
      newRow.append(
        `<td ${cellStyle} title="${rowData["Color"] || ""}">${
          rowData["Color"] || ""
        }</td>`,
      );
      // newRow.append(`<td ${cellStyle} title="${rowData['Batch'] || ''}">${rowData['Batch'] || ''}</td>`);

      //  Loop pakai weeks dari DB
      activeWeeks.forEach(function (ww) {
        const weekQty = rowData["weekly_data"][ww] || "-";
        newRow.append(`
        <td class="ww-cell" data-week="${ww}" ${cellStyle}>
          ${weekQty}
        </td>
      `);
      });

      newRow.data("rowData", rowData);
      tableBody.append(newRow);
    });
  }

  function renderPagination() {
    const totalRows = allPurchasePlanData.length;
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    const paginationContainer = $("#paginationContainer");
    paginationContainer.empty();

    // Buat pagination dengan format Previous [halaman aktif] Next
    let paginationHtml = '<div class="pagination">';
    // Tombol Previous (dinonaktifkan jika di halaman pertama)
    paginationHtml += `<button class="page-btn" data-page="${
      currentPage - 1
    }" ${currentPage === 1 ? "disabled" : ""}>Previous</button>`;
    // Halaman aktif
    paginationHtml += `<button class="page-btn active" disabled>${currentPage}</button>`;
    // Tombol Next (dinonaktifkan jika di halaman terakhir)
    paginationHtml += `<button class="page-btn" data-page="${
      currentPage + 1
    }" ${currentPage === totalPages ? "disabled" : ""}>Next</button>`;
    paginationHtml += "</div>";
    paginationContainer.append(paginationHtml);

    // Tambahkan event listener untuk tombol pagination
    $(".page-btn:not(:disabled)").on("click", function () {
      currentPage = parseInt($(this).attr("data-page"));
      renderTablePage(currentPage);
      renderPagination();
    });
  }
  loadPurchasePlanData();

  let btnEdit = $("#btnEdit");
  btnEdit.on("click", function () {
    if (selectedRowData) {
      // console.log("Mengedit item:", selectedRowData);
      const editUrl =
        BASE_URL +
        "scm/purchasing/purchase_plan_report/edit?" +
        "id=" +
        selectedRowData.ID +
        "&docDate=" +
        (selectedRowData.DocDate || "") +
        "&itemDesc=" +
        encodeURIComponent(selectedRowData.ItemDesc);
      window.location.href = editUrl;
    } else {
      alert("Please select a row first before editing.");
    }
  });

  function prepareExportData(allRows, headerRightData) {
    // console.log(" Preparing export data & populating database...");

    // Siapkan data untuk dikirim ke backend
    const exportData = [];
    allRows.forEach((row) => {
      const shipmentWeeks = [];

      if (row.weekly_data && typeof row.weekly_data === "object") {
        Object.keys(row.weekly_data).forEach((weekKey) => {
          const weekData = row.weekly_data[weekKey];

          // Jika ada data untuk minggu ini
          if (Array.isArray(weekData) && weekData.length > 0) {
            // Normalize week key ke WW format untuk backend
            let wwLabel;
            if (weekKey.includes("-")) {
              // Format "ww25-38" atau "WW25-38"
              wwLabel = weekKey.toUpperCase().startsWith("WW")
                ? weekKey.toUpperCase()
                : "WW" + weekKey.substring(2);
            } else {
              // Format "ww40" → perlu cari di weekRangeData untuk dapat format lengkap
              const weekNum = weekKey.replace(/\D/g, "");
              const foundWeek = weekRangeData.find((w) => {
                const wNum = w.label.match(/WW\d{2}-(\d{2})/)?.[1];
                return (
                  wNum === weekNum ||
                  wNum?.padStart(2, "0") === weekNum?.padStart(2, "0")
                );
              });
              wwLabel = foundWeek
                ? foundWeek.label
                : "WW" + weekNum.padStart(2, "0");
            }

            // console.log(
            //   `  Week key: ${weekKey} → normalized: ${wwLabel}, shipments: ${weekData.length}`,
            // );

            // Export SETIAP shipment dalam array
            weekData.forEach((d) => {
              shipmentWeeks.push({
                PurchasePlanDtlShipmentID: d.shipmentId || null,
                Week: wwLabel,
                ShipmentDate: d.shipmentDate || null,
                Qty: d.qty || 0,
              });
            });
          }
        });
      }

      if (shipmentWeeks.length > 0) {
        exportData.push({
          PurchasePlanID: row.ID,
          Vendor: row.Vendor || "",
          ItemDesc: row.ItemDesc || "",
          Color: row.Color || "",
          ShipmentWeeks: shipmentWeeks,
        });
        // console.log(
        //   ` Row ${row.ID}: Exported ${shipmentWeeks.length} shipment weeks`,
        // );
      }
    });

    //  KIRIM KE BACKEND UNTUK POPULATE TABEL
    $.ajax({
      url: BASE_URL + "scm/purchasing/purchase_plan_report/prepare_export_data",
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify({ export_data: exportData }),
      success: function (response) {
        console.log(" Backend response:", response);

        try {
          const res = JSON.parse(response);

          if (res.status === "success") {
            // console.log(
            //   " dbtPurchasePlanDtlShipmentWeek populated successfully",
            // );
            // console.log("   Inserted/Updated:", res.processed_count, "records");

            //  IMPORTANT: Reload purchase plan data AGAR baseline terbaru tersimpan di memory
            // untuk comparison logic saat import nanti
            // console.log(
            //   "🔄 Reloading purchase plan data with fresh baseline...",
            // );
            const filters = {
              itemDesc: currentItemDescriptionFilter || "",
              year:
                currentYearFilter && currentYearFilter !== "all"
                  ? currentYearFilter
                  : "",
              docDateStart: currentShipmentDateStart || "",
              docDateEnd: currentShipmentDateEnd || "",
              docNumber: currentDocNumberFilter || "",
              vendorId: currentVendorID || "",
            };

            $.ajax({
              url:
                BASE_URL +
                "scm/purchasing/purchase_plan_report/get_purchase_plan_data",
              type: "GET",
              dataType: "json",
              data: filters,
              timeout: 30000,
              success: function (freshData) {
                // console.log(
                //   " Fresh data loaded, updating allPurchasePlanData...",
                // );
                if (freshData.success && freshData.data) {
                  allPurchasePlanData = freshData.data;
                  // console.log(
                  //   " allPurchasePlanData refreshed with baseline for import comparison",
                  // );
                }

                // Now proceed with export
                let headerRight = headerRightData;
                exportPurchasePlanToExcel(allRows, [], headerRight);
              },
              error: function (xhr, status, error) {
                console.warn(
                  " Failed to reload data, proceeding with export anyway:",
                  error,
                );
                // Tetap lanjut export
                let headerRight = headerRightData;
                exportPurchasePlanToExcel(allRows, [], headerRight);
              },
            });
          } else {
            alert(" Warning: " + (res.message || "Backend processing issue"));
            // Tetap lanjut export meskipun ada warning
            setTimeout(() => {
              exportPurchasePlanToExcel(allRows, [], headerRightData);
            }, 500);
          }
        } catch (e) {
          console.warn(" Response parse error, tetap lanjut export:", e);
          setTimeout(() => {
            exportPurchasePlanToExcel(allRows, [], headerRightData);
          }, 500);
        }
      },
      error: function (xhr, status, error) {
        console.error(" Backend error:", error);
        console.error(" XHR Status:", xhr.status);
        console.error(" XHR Response Text:", xhr.responseText);

        // Coba parse error response
        let errorMessage = error;
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          errorMessage = errorResponse.message || error;
          console.error(" Error Message:", errorResponse);
        } catch (e) {
          // Jika bukan JSON, gunakan response text
          errorMessage = xhr.responseText || error;
        }

        alert(
          " Database sync failed: " +
            errorMessage +
            "\n\nStill exporting file...",
        );
        // Tetap export meskipun backend error
        setTimeout(() => {
          exportPurchasePlanToExcel(allRows, [], headerRightData);
        }, 500);
      },
    });
  }

  function exportPurchasePlanToExcel(allRows, headerLeftData, headerRightData) {
    // console.log(" Starting export via PHP Spreadsheet...");
    // console.log("  Total rows:", allRows.length);
    // console.log("  Header right data:", headerRightData?.length || 0);
    // console.log("  Sample row structure:", allRows[0]);
    // console.log("  Sample header:", headerRightData[0]);

    // Validasi data
    if (!allRows || allRows.length === 0) {
      alert(" No rows to export!");
      return;
    }

    if (!headerRightData || headerRightData.length === 0) {
      alert(" No headers to export!");
      return;
    }

    // Siapkan data untuk dikirim ke backend
    const exportPayload = {
      rows: allRows,
      headers: headerRightData,
      selectedYear: selectedYear || new Date().getFullYear(),
    };

    // console.log("📦 Payload prepared:", {
    //   rowsCount: exportPayload.rows.length,
    //   headersCount: exportPayload.headers.length,
    //   year: exportPayload.selectedYear,
    // });
    // console.log(
    //   "Full payload:",
    //   JSON.stringify(exportPayload, null, 2).substring(0, 1000),
    // );

    // Debug: show payload size
    const jsonString = JSON.stringify(exportPayload);
    // console.log("📦 JSON string length:", jsonString.length, "bytes");

    // Kirim ke controller via POST untuk di-export menggunakan PHP Spreadsheet
    $.ajax({
      url:
        BASE_URL +
        "scm/purchasing/purchase_plan_report/export_purchase_plan_to_excel",
      type: "POST",
      contentType: "application/json; charset=utf-8",
      data: jsonString,
      timeout: 120000,
      processData: false,
      cache: false,
      xhrFields: {
        responseType: "blob",
      },
      beforeSend: function (xhr) {
        // console.log(" Sending AJAX POST request...");
        // console.log("   URL:", this.url);
        // console.log("   Data length:", this.data.length, "bytes");
        // console.log("   Content-Type:", this.contentType);
        // console.log("   Request method:", this.type);
      },
      statusCode: {
        301: function () {
          console.warn(" 301 Redirect - check routing!");
        },
        302: function () {
          console.warn(" 302 Redirect - check routing!");
        },
        304: function () {
          console.warn(" 304 Not Modified");
        },
      },
      success: function (blob, status, xhr) {
        // console.log(" Export successful from server");
        // console.log("Response size:", blob.size, "bytes");
        // console.log("Response status:", xhr.status);
        // console.log("Content-Type:", xhr.getResponseHeader("content-type"));

        // Extract and display debug logs from response header
        const debugLogsHeader = xhr.getResponseHeader("X-Debug-Logs");
        if (debugLogsHeader) {
          try {
            const debugLogs = JSON.parse(atob(debugLogsHeader));
            console.group(" SERVER DEBUG LOGS");
            debugLogs.forEach((log) => {
              console.log(log);
            });
            console.groupEnd();
          } catch (e) {
            console.warn("Could not decode debug logs:", e);
          }
        }

        // Check if response is actually a JSON error message wrapped in blob
        if (blob.size < 1000) {
          const reader = new FileReader();
          reader.onload = function (e) {
            const text = e.target.result;
            console.log("Response preview:", text);
            if (text.includes('"status":"error')) {
              console.error(" Server returned error wrapped as success!");
            }
          };
          reader.readAsText(blob);
        }

        // Download file
        const filename =
          xhr
            .getResponseHeader("content-disposition")
            ?.split('filename="')[1]
            ?.split('"')[0] ||
          `PurchasePlan_${new Date().toISOString().split("T")[0]}.xlsx`;

        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(link.href);

        // console.log("💾 File downloaded:", filename);
      },
      error: function (xhr, status, error) {
        console.error(" Export failed:", error);
        console.error("Status:", xhr.status);
        console.error("Response:", xhr.responseText);
        console.error(
          "Response size:",
          xhr.responseText ? xhr.responseText.length : 0,
          "bytes",
        );

        // Try parsing error response and show debug logs
        try {
          const errorResponse = JSON.parse(xhr.responseText);

          // Display debug logs if present
          if (
            errorResponse.debug_logs &&
            Array.isArray(errorResponse.debug_logs)
          ) {
            console.group(" SERVER DEBUG LOGS (from error)");
            errorResponse.debug_logs.forEach((log) => {
              console.log(log);
            });
            console.groupEnd();
          }

          alert(" Export failed: " + (errorResponse.message || error));
        } catch (e) {
          alert(" Export failed: " + (xhr.responseText || error));
        }
      },
    });
  }

  function generateRowHash(vendor, itemDesc, color) {
    const key = `${(vendor || "").toUpperCase()}|${(
      itemDesc || ""
    ).toUpperCase()}|${(color || "").toUpperCase()}`;
    return btoa(key).substring(0, 20); // Base64 + potong 20 char
  }

  function countTotalShipmentIds(data) {
    return groupPurchasePlanData(data).length;
  }

  function countShipmentIdsInExcel(jsonData) {
    let count = 0;
    const dataRows = jsonData.slice(3);

    dataRows.forEach((row) => {
      if (!row || row.length < 1) return;

      const shipmentID = parseInt(row[0]) || null;
      if (shipmentID) {
        count++;
      }
    });
    return count;
  }

  var purchasePlanDT = null;

  function groupPurchasePlanData(rawData) {
    const groups = {};

    rawData.forEach((row) => {
      const key = `${row.Vendor}||${row.ItemDesc}||${row.Color}`;

      const taggedWeeklyData = {};
      for (const [wwKey, shipments] of Object.entries(row.weekly_data || {})) {
        taggedWeeklyData[wwKey] = shipments.map((s) => ({
          ...s,
          BlanketID: s.BlanketID ?? row.BlanketID ?? null,
          POID: s.POID ?? row.POID ?? null,
        }));
      }

      if (!groups[key]) {
        groups[key] = {
          ...row,
          _groupedIDs: [row.ID],
          _groupedPlans: [
            {
              ID: row.ID,
              DocNumber: row.DocNumber,
              DocDate: row.DocDate,
              BlanketID: row.BlanketID,
              POID: row.POID,
            },
          ],
          weekly_data: JSON.parse(JSON.stringify(taggedWeeklyData)), // ✅ pakai taggedWeeklyData
        };
      } else {
        const g = groups[key];
        g._groupedIDs.push(row.ID);
        g._groupedPlans.push({
          ID: row.ID,
          DocNumber: row.DocNumber,
          DocDate: row.DocDate,
          BlanketID: row.BlanketID,
          POID: row.POID,
        });

        for (const [wwKey, shipments] of Object.entries(taggedWeeklyData)) {
          // ✅ pakai taggedWeeklyData
          if (!g.weekly_data[wwKey]) {
            g.weekly_data[wwKey] = [];
          }
          g.weekly_data[wwKey] = g.weekly_data[wwKey].concat(shipments);
        }
      }
    });

    return Object.values(groups);
  }
  function initPurchasePlanDataTable() {
    let unique = new Set(allPurchasePlanData.map((r) => r.ShipmentID));

    if ($.fn.DataTable.isDataTable("#purchasePlanTableLeft")) {
      $("#purchasePlanTableLeft").DataTable().destroy();
      $("#purchasePlanTableLeft tbody").empty();
      $("#purchasePlanTableLeft").off();
    }
    if ($.fn.DataTable.isDataTable("#purchasePlanTableRight")) {
      $("#purchasePlanTableRight").DataTable().destroy();
      $("#purchasePlanTableRight tbody").empty();
      $("#purchasePlanTableRight").off();
    }
    $("#purchasePlanTableLeft").off("click", "tbody tr");
    $("#purchasePlanTableRight").off("click", "td.ww-cell");

    let isSyncing = false;

    const groupedData = groupPurchasePlanData(allPurchasePlanData);
    currentGroupedData = groupedData;

    const tableLeft = $("#purchasePlanTableLeft").DataTable({
      data: groupedData,
      rowId: function (row) {
        return "grp_" + row._groupedIDs.join("_");
      },

      columns: getPurchasePlanLeftCols(),
      // scrollY: '500px',
      select: { style: "single" },
      dom: "lBfrtip",
      buttons: [
        {
          text: "Edit",
          className: "btn btn-custom",
          action: function () {
            if (!selectedRowData) {
              alert("Please select a row");
              return;
            }
            if (selectedRowData._groupedPlans.length > 1) {
              openEditPickerModal(selectedRowData._groupedPlans);
            } else {
              const editUrl =
                BASE_URL +
                "scm/purchasing/purchase_plan_report/edit?id=" +
                selectedRowData._groupedIDs[0];
              window.location.href = editUrl;
            }
          },
        },

        {
          text: "Grouping",
          className: "btn btn-custom",
          action: function () {
            if (selectedPlanIDs.length === 0) {
              alert("Please select at least one plan");
              return;
            }
            // render list ke modal
            renderSelectedPlansToModal(selectedPlanIDs);
            // buka modal
            $("#groupingModal").modal("show");
          },
        },

        {
          text: "Delete",
          className: "btn btn-custom",
          action: function () {
            if (selectedPlanIDs.length > 0) {
              voidPurchasePlan(selectedPlanIDs);
            } else if (
              selectedRowData &&
              selectedRowData._groupedIDs?.length > 0
            ) {
              voidPurchasePlan(selectedRowData._groupedIDs);
            } else {
              alert("Please select at least one plan");
            }
          },
        },

        {
          extend: "collection",
          text: "Calendar Legend",
          className: "btn btn-custom",
          buttons: [
            {
              text: "Chinese Holiday",
              className: "btn btn-custom",
              action: function () {
                $("#holidayModal").modal("show");
              },
            },
            {
              text: "Indonesian Holiday",
              className: "btn btn-custom",
              action: function () {
                $("#holidayModalID").modal("show");
                initHolidayID();
              },
            },
          ],
        },
        {
          extend: "collection",
          text: "View",
          className: "btn btn-custom",
          buttons: [
            {
              text: "Info",
              className: "btn btn-custom",
              action: function () {
                $("#legendModal").modal("show");
              },
            },
            {
              text: "Quarter Summary",
              className: "btn btn-custom",
              action: function () {
                showQuarterSummaryWithFilters(tableLeft);
              },
            },
          ],
        },

        {
          extend: "collection",
          text: "Excel",
          className: "btn btn-custom",
          buttons: [
            {
              text: "Export to Excel",
              className: "btn btn-custom",
              action: function () {
                let allHeaders = tableRight
                  .columns({ visible: true })
                  .header()
                  .toArray()
                  .map((h) => {
                    let text = $(h).text().trim().replace(/\s+/g, " ");
                    let match = text.match(
                      /(WW\d{2}-\d{2})\s*[-/]*\s*([0-9]{1,2}-[A-Za-z]{3,})?/i,
                    );
                    return match
                      ? { ww: match[1], date: match[2] || "" }
                      : null;
                  });

                let headerRight = allHeaders.filter((h) => h !== null);
                let allRows = tableLeft.rows().data().toArray();

                if (!allRows.length) {
                  alert("Tidak ada data untuk diexport!");
                  return;
                }

                exportPurchasePlanToExcel(allRows, [], headerRight);
              },
            },
            {
              text: "Import Excel",
              className: "btn btn-custom",
              action: function () {
                $("#importExcelFile").click();
              },
            },
          ],
        },

        {
          extend: "collection",
          text: "Show 25 rows",
          className: "btn btn-custom",
          buttons: [
            {
              text: "Show 25 rows",
              className: "btn btn-custom",
              action: function (e, dt) {
                dt.page.len(25).draw();
              },
            },
            {
              text: "Show 50 rows",
              className: "btn btn-custom",
              action: function (e, dt) {
                dt.page.len(50).draw();
              },
            },
            {
              text: "Show All",
              className: "btn btn-custom",
              action: function (e, dt) {
                dt.page.len(-1).draw();
              },
            },
          ],
        },
      ],
      paging: true,
      pageLength: 25,
      lengthMenu: true,
      searching: true,
      ordering: true,
      order: [],
      pagingType: "full_numbers",
      info: true,
      responsive: false,
      fixedHeader: true,
      autoWidth: false,
      createdRow: function (row, data) {
        // tag row dengan ID unik supaya gampang sinkron
        if (data && data.ID !== undefined) {
          $(row).attr("data-row-id", data.ID);
          $(row).attr("data-item-id", data.ItemID || "");
          $(row).attr("data-color", data.Color || "");
        }
      },
      initComplete: function () {
        $("#globalLengthContainer").append($("#purchasePlanTableLeft_length"));
        $("#globalSearchContainer").append($("#purchasePlanTableLeft_filter"));
        $("#globalInfoContainer").append($("#purchasePlanTableLeft_info"));
        $("#globalPaginationContainer").append(
          $("#purchasePlanTableLeft_paginate"),
        );
        $("#table-controls").prepend($(".dt-buttons"));
      },
    });

    // Event: Select All checkbox
    $(document)
      .off("change", "#selectAllCheckbox")
      .on("change", "#selectAllCheckbox", function () {
        const isChecked = $(this).is(":checked");

        // Check/uncheck semua row checkboxes
        $("#purchasePlanTableLeft")
          .find(".row-checkbox")
          .prop("checked", isChecked);

        if (isChecked) {
          selectedPlanIDs = tableLeft
            .rows()
            .data()
            .toArray()
            .flatMap((row) => row._groupedIDs);
        } else {
          selectedPlanIDs = [];
        }

        updateCheckboxUI();
        console.log("Selected Plan IDs:", selectedPlanIDs);
      });

    $(document)
      .off("change", ".row-checkbox")
      .on("change", ".row-checkbox", function () {
        const groupIDs = $(this)
          .data("plan-id")
          .toString()
          .split(",")
          .map(Number);
        const isChecked = $(this).is(":checked");

        if (isChecked) {
          groupIDs.forEach((id) => {
            if (!selectedPlanIDs.includes(id)) selectedPlanIDs.push(id);
          });
        } else {
          selectedPlanIDs = selectedPlanIDs.filter(
            (id) => !groupIDs.includes(id),
          );
        }

        const totalRows = tableLeft.rows().count();
        const checkedRows = $("#purchasePlanTableLeft").find(
          ".row-checkbox:checked",
        ).length;
        $("#selectAllCheckbox").prop(
          "checked",
          checkedRows === totalRows && totalRows > 0,
        );

        updateCheckboxUI();
      });

    buildRightHeader(selectedYear);

    // Modifikasi inisialisasi tabel kanan
    const tableRight = $("#purchasePlanTableRight").DataTable({
      data: groupedData,
      columns: getPurchasePlanRightCols(selectedYear),
      paging: false,
      rowId: function (row) {
        return "grp_" + row._groupedIDs.join("_");
      },
      pageLength: 10,
      searching: false,
      ordering: true,
      order: [],
      info: false,
      responsive: false,
      fixedHeader: {
        header: false,
        headerOffset: 0,
      },
      scrollY: "520px",
      scrollX: true,
      scrollCollapse: true,
      autoWidth: false,

      headerCallback: function (thead, data, start, end, display) {
        $(thead).find("th").off("click.DT");
      },
      createdRow: function (row, data) {
        if (data && data.ID !== undefined) {
          $(row).attr("data-row-id", data._groupedIDs.join("_"));
          $(row).attr("data-item-id", data.ItemID || "");
          $(row).attr("data-color", data.Color || "");
        }
      },
    });
    tableRight.on("draw.dt init.dt fixedHeader.adjust", function () {
      buildRightHeader(selectedYear);
    });

    function syncTables(source, target) {
      if (isSyncing) return;
      isSyncing = true;
      try {
        const visibleData = source
          .rows({ search: "applied", order: "applied", page: "current" })
          .data()
          .toArray();
        target.clear();
        target.rows.add(visibleData).draw(false);
      } finally {
        isSyncing = false;
      }
    }
    function renderSelectedPlansToModal(selectedIDs) {
      const listContainer = $("#selectedPlanList");
      listContainer.empty();

      const allRows = tableLeft.rows().data().toArray();

      allRows.forEach((rowData) => {
        const matchedPlans = (rowData._groupedPlans || []).filter((p) =>
          selectedIDs.includes(p.ID),
        );

        matchedPlans.forEach((plan) => {
          listContainer.append(`
            <li class="list-group-item d-flex justify-content-between align-items-center">
              <span>
                <strong>${plan.DocNumber || "-"}</strong>
                <span class="text-muted"> — ${rowData.ItemDesc || ""}${rowData.Color ? " (" + rowData.Color + ")" : ""}</span>
              </span>
              <span class="text-muted small">${plan.DocDate || ""}</span>
            </li>
          `);
        });
      });
    }
    function disableSorting(table) {
      $(table.table().header())
        .find("th")
        .css("pointer-events", "none")
        .css("opacity", "1");
    }

    function enableSorting(table) {
      $(table.table().header())
        .find("th")
        .css("pointer-events", "auto")
        .css("opacity", "1");
    }

    // Deteksi klik sorting di tabel kiri
    $("#tableLeft").on("click", "th", function () {
      if (activeTable !== "left") {
        activeTable = "left";
        disableSorting(tableRight);
        enableSorting(tableLeft);
      }
    });

    // Deteksi klik sorting di tabel kanan
    $("#tableRight").on("click", "th", function () {
      if (activeTable !== "right") {
        activeTable = "right";
        disableSorting(tableLeft);
        enableSorting(tableRight);
      }
    });

    // Sinkron kiri → kanan
    tableLeft.on("order.dt page.dt search.dt draw.dt", function () {
      if (activeTable === "left" || activeTable === null) {
        syncTables(tableLeft, tableRight);
      }
    });

    // Sinkron kanan → kiri
    tableRight.on("order.dt page.dt search.dt draw.dt", function () {
      if (activeTable === "right") {
        syncTables(tableRight, tableLeft);
      }
    });

    // Inisialisasi - set tabel kiri sebagai default aktif
    activeTable = "left";
    disableSorting(tableRight);

    buildRightHeader(selectedYear);

    // Attach event listener SEBELUM draw() dipanggil
    tableLeft.on("draw.dt", function () {
      const totals = calculateTotalsFromLeft(tableLeft);
    });
    tableLeft.on("draw.dt", function () {
      renderTotalRows(tableLeft, tableRight);
    });

    tableLeft.draw();
    $("#purchasePlanTableLeft tbody").on("click", "tr", function () {
      // clear selection
      $("#purchasePlanTableLeft tr, #purchasePlanTableRight tr").removeClass(
        "selected",
      );

      // toggle select
      $(this).addClass("selected");

      // ambil row-id buat sync
      const rowData = tableLeft.row(this).data();
      if (rowData) {
        const rowId = rowData.ID;
        const itemId = rowData.ItemID || "";
        const color = rowData.Color || "";
        $(
          `#purchasePlanTableRight tbody tr[data-row-id="${rowId}"][data-item-id="${itemId}"][data-color="${color}"]`,
        ).addClass("selected");
      }

      // simpan data buat tombol Edit
      selectedRowData = rowData;
    });

    // Sinkron scroll vertikal: gunakan wrapper scrollBody DataTables agar tepat
    const leftBody = $("#purchasePlanTableLeft_wrapper .dataTables_scrollBody");
    const rightBody = $(
      "#purchasePlanTableRight_wrapper .dataTables_scrollBody",
    );

    // jika belum ada scrollBody (misal responsive off), fallback ke container langsung
    const $leftScrollEl = leftBody.length ? leftBody : $("#left-container");
    const $rightScrollEl = rightBody.length ? rightBody : $("#right-container");

    // prevent infinite loop using flag
    let syncing = false;
    $leftScrollEl.on("scroll", function () {
      if (syncing) return;
      syncing = true;
      $rightScrollEl.scrollTop($(this).scrollTop());
      setTimeout(() => (syncing = false), 10);
    });
    $rightScrollEl.on("scroll", function () {
      if (syncing) return;
      syncing = true;
      $leftScrollEl.scrollTop($(this).scrollTop());
      setTimeout(() => (syncing = false), 10);
    });

    // Klik row kiri -> highlight kanan
    $("#purchasePlanTableLeft tbody").on("click", "tr", function (e) {
      const d = tableLeft.row(this).data();
      if (!d) return;
      selectedRowData = d;

      $("#purchasePlanTableLeft tbody tr").removeClass("selected-row");
      $("#purchasePlanTableRight tbody tr").removeClass("selected-row");
      $(this).addClass("selected-row");
      $(
        `#purchasePlanTableRight tbody tr[data-row-id="${d._groupedIDs.join("_")}"]`,
      );
    });

    // Klik row kanan -> highlight kiri
    $("#purchasePlanTableRight tbody").on("click", "tr", function (e) {
      const d = tableRight.row(this).data();
      if (!d) return;
      selectedRowData = d;

      $("#purchasePlanTableLeft tbody tr").removeClass("selected-row");
      $("#purchasePlanTableRight tbody tr").removeClass("selected-row");
      $(this).addClass("selected-row");
      $(
        `#purchasePlanTableLeft tbody tr[data-row-id="${d._groupedIDs.join("_")}"]`,
      );
    });

    $("#purchasePlanTableRight tbody").on("click", ".ww-btn", function (e) {
      e.stopPropagation();

      const week = $(this).data("week");
      const rowId = $(this).data("row-id");
      const vendor = $(this).data("vendor");
      const batchId = $(this).data("batch");
      const color = $(this).data("color");
      const itemId = $(this).data("item-id");
      const itemDesc = $(this).data("item-desc");
      const buttonYear = parseInt($(this).data("year"), 10);

      let purchasePlanRow = tableLeft
        .rows()
        .data()
        .toArray()
        .find((r) => r._groupedIDs.join("_") === String(rowId));

      if (!purchasePlanRow) return;

      let weeklyDataForModal = [];

      if (purchasePlanRow) {
        if (!purchasePlanRow.weekly_data) {
          console.log(" Tidak ada weekly_data untuk row ini");
        } else {
          // Iterate semua WW key di weekly_data
          for (const [wwKey, shipments] of Object.entries(
            purchasePlanRow.weekly_data,
          )) {
            if (!Array.isArray(shipments)) continue;

            shipments.forEach((d) => {
              if (!d.shipmentDate) return;
              const isoWeekYear = getISOWeekYear(d.shipmentDate);
              const isoWeekNum = getWeekOfYear(d.shipmentDate);
              const buttonWeekNum = parseInt(week.replace("ww", ""), 10);

              if (
                parseInt(isoWeekYear) === buttonYear &&
                isoWeekNum === buttonWeekNum
              ) {
                weeklyDataForModal.push(d);
              }
            });
          }
        }
      }

      const totalQty = weeklyDataForModal.reduce(
        (sum, item) => sum + (parseInt(item.qty, 10) || 0),
        0,
      );

      let defaultShipmentDate =
        weeklyDataForModal.length > 0
          ? weeklyDataForModal[0].shipmentDate
          : null;

      const weekNumber = parseInt(week.replace("ww", ""), 10);
      let year = !isNaN(buttonYear) ? buttonYear : parseInt(selectedYear);

      if (isNaN(year)) {
        if (defaultShipmentDate) {
          year = new Date(defaultShipmentDate).getFullYear();
        } else if (
          weeklyDataForModal.length > 0 &&
          weeklyDataForModal[0].shipmentDate
        ) {
          year = new Date(weeklyDataForModal[0].shipmentDate).getFullYear();
        } else if (purchasePlanRow.weekly_data) {
          const existingDates = [];
          for (const [ww, shipments] of Object.entries(
            purchasePlanRow.weekly_data,
          )) {
            if (Array.isArray(shipments)) {
              shipments.forEach((s) => {
                if (s.shipmentDate) existingDates.push(s.shipmentDate);
              });
            }
          }

          if (existingDates.length > 0) {
            year = new Date(existingDates[0]).getFullYear();
            console.log(` Auto-detect year from existing data: ${year}`);
          } else {
            year = new Date().getFullYear();
          }
        } else {
          year = new Date().getFullYear();
        }
      }

      if (!defaultShipmentDate) {
        defaultShipmentDate = getWednesdayOfWeek(year, weekNumber);
        // console.log(
        //   ` Generated defaultShipmentDate: ${defaultShipmentDate} (year=${year}, ww=${weekNumber})`,
        // );
      }

      selectedRowData = {
        ...purchasePlanRow,
        week,
        qtyAwal: totalQty,
        shipmentId:
          weeklyDataForModal.length > 0
            ? weeklyDataForModal[0].shipmentId
            : null,
        batch:
          weeklyDataForModal.length > 0 ? weeklyDataForModal[0].batch : null,
        shipmentDate: defaultShipmentDate,
        isNew:
          weeklyDataForModal.length === 0 ||
          weeklyDataForModal.every((d) => !d.shipmentId),
        Closed: purchasePlanRow.Closed,
      };

      $(
        "#purchasePlanTableLeft tbody tr, #purchasePlanTableRight tbody tr",
      ).removeClass("selected-row");
      $(this).closest("tr").addClass("selected-row");
      $(`#purchasePlanTableLeft tbody tr[data-row-id="${rowId}"]`).addClass(
        "selected-row",
      );

      //  Tampilkan modal
      showWeekModal(
        selectedRowData,
        week,
        weeklyDataForModal.map((d) => d.batch).join(" & "),
        totalQty,
        defaultShipmentDate,
        purchasePlanRow.Closed,
        purchasePlanRow.DocNumber,
        weeklyDataForModal,
      );
    });
  }

  $("#holidayModal").on("shown.bs.modal", function () {
    loadHoliday(currentHolidayYear);
  });

  function openEditPickerModal(plans) {
    const $list = $("#editPickerList");
    $list.empty();

    plans.forEach((plan) => {
      $list.append(`
        <li class="list-group-item list-group-item-action edit-picker-item" 
            style="cursor:pointer;" 
            data-id="${plan.ID}">
          <strong>${plan.DocNumber || "-"}</strong>
          <span class="text-muted"> (${plan.DocDate || "-"})</span>
        </li>
      `);
    });

    $("#editPickerModal").modal("show");
  }

  $(document)
    .off("click", ".edit-picker-item")
    .on("click", ".edit-picker-item", function () {
      const id = $(this).data("id");
      const editUrl =
        BASE_URL + "scm/purchasing/purchase_plan_report/edit?id=" + id;
      window.location.href = editUrl;
    });
  function loadHoliday(year) {
    $("#holidayYear").text(year);

    fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/CN`)
      .then((res) => res.json())
      .then((data) => {
        let html = "";

        data.forEach((h) => {
          const dateObj = new Date(h.date);
          const ww = getWeekNumber(dateObj);

          html += `
          <tr>
            <td>${h.date}</td>
            <td>${ww}</td>
            <td>${h.name}</td>
          </tr>
        `;
        });

        $("#holidayTable tbody").html(html);
      });
  }

  $("#prevYear").click(function () {
    currentHolidayYear--;
    loadHoliday(currentHolidayYear);
  });

  $("#nextYear").click(function () {
    currentHolidayYear++;
    loadHoliday(currentHolidayYear);
  });
  $("#holidayModal").on("shown.bs.modal", function () {
    loadHoliday(currentHolidayYear);
  });

  function initHolidayID() {
    fetch(BASE_URL + "scm/purchasing/purchase_plan_report/getHolidayYearRange")
      .then((res) => res.json())
      .then((data) => {
        minHolidayYear = parseInt(data.minYear);
        maxHolidayYear = parseInt(data.maxYear);

        // auto load ke latest
        currentHolidayYearID = maxHolidayYear;

        loadHolidayID(currentHolidayYearID);
        updateYearButtons();
      });
  }

  function loadHolidayID(year) {
    $("#holidayYearID").text(year);

    const url =
      BASE_URL +
      "scm/purchasing/purchase_plan_report/getHolidayIndonesia?year=" +
      year;

    console.log("Request URL:", url);
    console.log("Year requested:", year);

    fetch(url)
      .then((res) => {
        // console.log("Response status:", res.status);
        return res.json();
      })
      .then((data) => {
        // console.log("Data received from server:", data);

        let html = "";

        data.forEach((h, index) => {
          // console.log("Row", index, ":", h);

          const dateObj = new Date(h.Date);
          const ww = getWeekNumber(dateObj);

          // console.log("Parsed date:", h.Date, "WW:", ww);

          html += `
        <tr>
          <td>${h.Date}</td>
          <td>${ww}</td>
          <td>${h.Description}</td>
        </tr>
        `;
        });

        $("#holidayTableID tbody").html(html);
        updateYearButtons();
      })
      .catch((err) => {
        console.error("Fetch error:", err);
      });
  }

  function updateYearButtons() {
    $("#prevYearID").prop("disabled", currentHolidayYearID <= minHolidayYear);
    $("#nextYearID").prop("disabled", currentHolidayYearID >= maxHolidayYear);
  }
  $("#prevYearID").click(function () {
    if (currentHolidayYearID > minHolidayYear) {
      currentHolidayYearID--;
      loadHolidayID(currentHolidayYearID);
    }
  });

  $("#nextYearID").click(function () {
    if (currentHolidayYearID < maxHolidayYear) {
      currentHolidayYearID++;
      loadHolidayID(currentHolidayYearID);
    }
  });
  function calculateTotalsFromLeft(tableLeft) {
    const visibleRows = tableLeft.rows({ search: "applied" }).data().toArray();

    const wwTotals = {};
    const quarterTotals = {};

    // Inisialisasi semua WW jadi 0 dulu
    weekRangeData.forEach((weekInfo) => {
      const weekKey = `ww${weekInfo.week}`;
      wwTotals[weekKey] = 0;

      const weekNumber = weekInfo.week;
      let quarter;
      if (weekNumber <= 13) quarter = "Q1";
      else if (weekNumber <= 26) quarter = "Q2";
      else if (weekNumber <= 39) quarter = "Q3";
      else quarter = "Q4";

      const shortYear = String(weekInfo.year).slice(-2);
      const quarterKey = `Q${shortYear}-${quarter.replace("Q", "")}`; // ← Include short year!
      if (!quarterTotals[quarterKey]) {
        quarterTotals[quarterKey] = 0;
      }
    });

    // Debug: batasi log hanya 5 row pertama
    let debugCount = 0;

    // Loop setiap row yang visible
    visibleRows.forEach((row) => {
      if (!row.weekly_data) return;

      weekRangeData.forEach((weekInfo) => {
        const weekKey = `ww${weekInfo.week}`;
        const weekData = row.weekly_data[weekKey];

        if (!weekData) return;

        let totalQty = 0;

        if (Array.isArray(weekData)) {
          const filtered = weekData.filter((d) => {
            if (!d.shipmentDate) return false;

            const isoYear = getISOWeekYear(d.shipmentDate);
            const yearMatch = parseInt(isoYear) === weekInfo.year;

            // const isClosed = Number(d.closed) === 1 || Number(d.closed) === 2;

            // return yearMatch && isClosed;
            return yearMatch;
          });

          totalQty = filtered.reduce((sum, d) => sum + (Number(d.qty) || 0), 0);
        } else {
          const shipmentYear = weekData.shipmentDate
            ? new Date(weekData.shipmentDate).getFullYear()
            : null;

          const yearMatch = shipmentYear === weekInfo.year;
          // const isClosed =
          //   Number(weekData.closed) === 1 || Number(weekData.closed) === 2;

          // if (yearMatch && isClosed) {
          //   totalQty = Number(weekData.qty) || 0;
          // }
          if (yearMatch) {
            totalQty = Number(weekData.qty) || 0;
          }
        }

        wwTotals[weekKey] += totalQty;

        // Hitung quarter
        const weekNumber = weekInfo.week;
        let quarter;
        if (weekNumber <= 13) quarter = "Q1";
        else if (weekNumber <= 26) quarter = "Q2";
        else if (weekNumber <= 39) quarter = "Q3";
        else quarter = "Q4";

        const shortYear = String(weekInfo.year).slice(-2);
        const quarterKey = `Q${shortYear}-${quarter.replace("Q", "")}`; // ← Include short year!
        quarterTotals[quarterKey] += totalQty;
      });
    });

    return {
      wwTotals,
      quarterTotals,
    };
  }
  function renderTotalRows(tableLeft, tableRight) {
    const totals = calculateTotalsFromLeft(tableLeft);

    // Hapus total row lama kalau ada
    $("#purchasePlanTableLeft tbody .total-row").remove();
    $("#purchasePlanTableRight tbody .total-row").remove();

    // LEFT TABLE
    const leftColCount = getPurchasePlanLeftCols().length;

    const leftTotalWWRow = `
    <tr class="total-row total-ww">
      <td colspan="${leftColCount}" 
          style="font-weight:bold;background:#f1f3f5;text-align:center;">
        Total Qty per WW
      </td>
    </tr>
  `;

    const leftTotalQuarterRow = `
    <tr class="total-row total-quarter">
      <td colspan="${leftColCount}" 
          style="font-weight:bold;background:#e9ecef;text-align:center;">
        Total Qty per Quarter
      </td>
    </tr>
  `;

    $("#purchasePlanTableLeft tbody").append(leftTotalWWRow);
    $("#purchasePlanTableLeft tbody").append(leftTotalQuarterRow);

    // RIGHT TABLE
    let rightWWCells = "";

    weekRangeData.forEach((weekInfo) => {
      const weekKey = `ww${weekInfo.week}`;
      const value = totals.wwTotals[weekKey] || 0;

      rightWWCells += `
      <td style="font-weight:bold;text-align:center;background:#f1f3f5;">
        ${formatQty(value)}
      </td>
    `;
    });

    const rightTotalWWRow = `
    <tr class="total-row total-ww">
      ${rightWWCells}
    </tr>
  `;

    // ========= QUARTER ROW =========
    let quarterCells = "";
    let currentQuarter = null;
    let currentYear = null;
    let spanCount = 0;

    weekRangeData.forEach((weekInfo, index) => {
      const weekNumber = weekInfo.week;

      let quarter;
      if (weekNumber <= 13) quarter = "Q1";
      else if (weekNumber <= 26) quarter = "Q2";
      else if (weekNumber <= 39) quarter = "Q3";
      else quarter = "Q4";

      const shortYear = String(weekInfo.year).slice(-2);
      const quarterKey = `Q${shortYear}-${quarter.replace("Q", "")}`;

      if (currentQuarter === null) {
        currentQuarter = quarter;
        currentYear = weekInfo.year;
        spanCount = 1;
      } else if (currentQuarter === quarter && currentYear === weekInfo.year) {
        spanCount++;
      } else {
        // Tutup quarter sebelumnya
        const shortYearPrev = String(currentYear).slice(-2);
        const prevQuarterKey = `Q${shortYearPrev}-${currentQuarter.replace("Q", "")}`;
        const prevValue = totals.quarterTotals[prevQuarterKey] || 0;

        quarterCells += `
      <td colspan="${spanCount}" 
          style="font-weight:bold;text-align:center;background:#e9ecef;">
        ${prevQuarterKey} : ${formatQty(prevValue)}
      </td>
    `;

        currentQuarter = quarter;
        currentYear = weekInfo.year;
        spanCount = 1;
      }

      // Kalau sudah terakhir
      if (index === weekRangeData.length - 1) {
        const shortYearLast = String(currentYear).slice(-2);
        const lastQuarterKey = `Q${shortYearLast}-${currentQuarter.replace("Q", "")}`;
        const lastValue = totals.quarterTotals[lastQuarterKey] || 0;

        quarterCells += `
      <td colspan="${spanCount}" 
          style="font-weight:bold;text-align:center;background:#e9ecef;">
        ${lastQuarterKey} : ${formatQty(lastValue)}
      </td>
    `;
      }
    });
    const rightQuarterRow = `
    <tr class="total-row total-quarter">
      ${quarterCells}
    </tr>
  `;

    $("#purchasePlanTableRight tbody").append(rightTotalWWRow);
    $("#purchasePlanTableRight tbody").append(rightQuarterRow);
  }

  function calculateQuarterSummaryByClosed(tableLeft) {
    const visibleRows = tableLeft.rows({ search: "applied" }).data().toArray();

    const summary = {};

    visibleRows.forEach((row) => {
      if (!row.weekly_data) return;

      weekRangeData.forEach((weekInfo) => {
        const weekKey = `ww${weekInfo.week}`;
        const weekData = row.weekly_data[weekKey];
        if (!weekData) return;

        const weekNumber = weekInfo.week;
        const year = weekInfo.year;

        let quarter;
        if (weekNumber <= 13) quarter = 1;
        else if (weekNumber <= 26) quarter = 2;
        else if (weekNumber <= 39) quarter = 3;
        else quarter = 4;

        const quarterKey = `Q${year}-${quarter}`;

        // 🔥 kalau belum ada, buat dulu
        if (!summary[quarterKey]) {
          summary[quarterKey] = { 0: 0, 1: 0, 2: 0 };
        }

        const processShipment = (shipment) => {
          if (!shipment.shipmentDate) return;

          const isoYear = getISOWeekYear(shipment.shipmentDate);
          if (parseInt(isoYear) !== year) return;

          const closed = Number(shipment.closed);
          const qty = Number(shipment.qty) || 0;

          if (closed === 0 || closed === 1 || closed === 2) {
            summary[quarterKey][closed] += qty;
          }
        };

        if (Array.isArray(weekData)) {
          weekData.forEach(processShipment);
        } else {
          processShipment(weekData);
        }
      });
    });

    return summary;
  }

  function renderQuarterSummaryModal(tableLeft) {
    const data = calculateQuarterSummaryByClosed(tableLeft);

    // Ambil urutan quarter sesuai weekRangeData
    const orderedQuarterKeys = [];

    weekRangeData.forEach((weekInfo) => {
      const weekNumber = weekInfo.week;
      const year = weekInfo.year;

      let quarter;
      if (weekNumber <= 13) quarter = 1;
      else if (weekNumber <= 26) quarter = 2;
      else if (weekNumber <= 39) quarter = 3;
      else quarter = 4;

      const quarterKey = `Q${year}-${quarter}`;

      if (!orderedQuarterKeys.includes(quarterKey)) {
        orderedQuarterKeys.push(quarterKey);
      }
    });

    let html = `
    <table class="table table-bordered text-center">
      <thead>
        <tr>
          <th>Quarter</th>
          <th>Plan</th>
          <th>Blanket</th>
          <th>PO</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
  `;

    orderedQuarterKeys.forEach((q) => {
      if (!data[q]) return;

      const plan = data[q][0];
      const blanket = data[q][1];
      const po = data[q][2];
      const total = plan + blanket + po;

      html += `
      <tr>
        <td>${q}</td>
        <td>${formatQty(plan)}</td>
        <td>${formatQty(blanket)}</td>
        <td>${formatQty(po)}</td>
        <td><b>${formatQty(total)}</b></td>
      </tr>
    `;
    });

    html += "</tbody></table>";

    $("#quarterSummaryModalBody").html(html);
  }

  // Tambahkan function baru untuk menampilkan Quarter Summary dengan filter
  function showQuarterSummaryWithFilters(tableLeft) {
    // Ambil range tanggal dari data
    const allDates = [];
    tableLeft
      .rows()
      .data()
      .toArray()
      .forEach((row) => {
        if (row.weekly_data) {
          Object.values(row.weekly_data).forEach((weekData) => {
            if (Array.isArray(weekData)) {
              weekData.forEach((shipment) => {
                if (shipment.shipmentDate) {
                  allDates.push(new Date(shipment.shipmentDate));
                }
              });
            } else if (weekData.shipmentDate) {
              allDates.push(new Date(weekData.shipmentDate));
            }
          });
        }
      });

    const minDate =
      allDates.length > 0 ? new Date(Math.min(...allDates)) : new Date();
    const maxDate =
      allDates.length > 0 ? new Date(Math.max(...allDates)) : new Date();

    // Default: 52 minggu terakhir dari tanggal terbaru
    const defaultEndDate = maxDate;
    const defaultStartDate = new Date(defaultEndDate);
    defaultStartDate.setDate(defaultStartDate.getDate() - 365);

    // Format untuk input date
    const formatDateForInput = (date) => {
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };

    // Buat modal filter
    const modalHtml = `
    <div class="modal fade" id="quartersummaryFilterModal" tabindex="-1" role="dialog">
      <div class="modal-dialog" role="document" style="max-width: 680px;">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Quarter Summary - Filter</h5>
            <button type="button" class="close" data-dismiss="modal">&times;</button>
          </div>

          <div class="modal-body">
            <div class="row mb-3 align-items-end">
              <div class="col-md-6">
                <label class="control-label"><strong>Start Date</strong></label>
                <input type="date" 
                       id="summaryStartDate" 
                       class="form-control"
                       min="${formatDateForInput(minDate)}"
                       max="${formatDateForInput(maxDate)}"
                       value="${formatDateForInput(defaultStartDate)}">
              </div>
              <div class="col-md-6">
                <label class="control-label"><strong>End Date</strong></label>
                <input type="date" 
                       id="summaryEndDate" 
                       class="form-control"
                       min="${formatDateForInput(minDate)}"
                       max="${formatDateForInput(maxDate)}"
                       value="${formatDateForInput(defaultEndDate)}">
              </div>
            </div>

            <div class="row mb-3 align-items-end">
              <div class="col-md-12" style="margin-top: 20px;">
                <label class="control-label"><strong>Group By</strong></label>
                <div class="btn-group btn-group-toggle" data-toggle="buttons">
                  <label class="btn btn-outline-primary active">
                    <input type="radio" name="groupByPeriod" id="groupByQuarter" value="quarter" checked> Quarter
                  </label>
                  <label class="btn btn-outline-primary">
                    <input type="radio" name="groupByPeriod" id="groupByMonth" value="month"> Month
                  </label>
                  <label class="btn btn-outline-primary">
                    <input type="radio" name="groupByPeriod" id="groupByWeek" value="week"> Week (ISO)
                  </label>
                </div>
              </div>
            </div>

            <hr>

            <div id="summaryTableContainer" style="max-height: 500px; overflow-y: auto;">
              <!-- Summary table akan dirender di sini -->
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
            <button type="button" class="btn btn-primary" id="applySummaryFilterBtn">Apply Filter</button>
          </div>
        </div>
      </div>
    </div>
  `;

    // Tambah modal ke body
    $("body").append(modalHtml);

    // Event: Validasi end date tidak kurang dari start date
    $("#summaryStartDate").on("change", function () {
      const startDate = $(this).val();
      if (startDate) {
        $("#summaryEndDate").attr("min", startDate);
        const endDate = $("#summaryEndDate").val();
        if (endDate && endDate < startDate) {
          $("#summaryEndDate").val(startDate);
        }
      }
    });

    // Event: Apply filter
    $(document)
      .off("click", "#applySummaryFilterBtn")
      .on("click", "#applySummaryFilterBtn", function () {
        const startDate = $("#summaryStartDate").val();
        const endDate = $("#summaryEndDate").val();
        const groupByPeriod = $("input[name='groupByPeriod']:checked").val();

        if (!startDate || !endDate) {
          alert("Please select both start and end dates");
          return;
        }

        if (new Date(startDate) > new Date(endDate)) {
          alert("Start date cannot be after end date");
          return;
        }

        // Generate summary dengan filter
        generateFilteredSummary(tableLeft, startDate, endDate, groupByPeriod);
      });

    // Tampilkan modal
    $("#quartersummaryFilterModal").modal("show");

    // Cleanup saat modal ditutup
    $("#quartersummaryFilterModal").on("hidden.bs.modal", function () {
      $(this).remove();
    });

    // Trigger apply filter langsung dengan default values
    setTimeout(() => {
      $("#applySummaryFilterBtn").trigger("click");
    }, 300);
  }

  // Function baru untuk generate summary dengan filter
  function generateFilteredSummary(
    tableLeft,
    startDate,
    endDate,
    groupByPeriod,
  ) {
    const visibleRows = tableLeft.rows({ search: "applied" }).data().toArray();
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    const summary = {};

    visibleRows.forEach((row) => {
      if (!row.weekly_data) return;

      Object.entries(row.weekly_data).forEach(([weekKey, shipments]) => {
        if (!Array.isArray(shipments)) {
          shipments = [shipments];
        }

        shipments.forEach((shipment) => {
          if (!shipment.shipmentDate) return;

          const shipmentDate = new Date(shipment.shipmentDate);

          // Filter berdasarkan date range
          if (shipmentDate < startDateObj || shipmentDate > endDateObj) {
            return;
          }

          let periodKey = "";

          if (groupByPeriod === "quarter") {
            // Group by Quarter-Year
            const isoWeek = getWeekOfYear(shipment.shipmentDate);
            const isoYear = getISOWeekYear(shipment.shipmentDate);

            let quarter;
            if (isoWeek <= 13) quarter = 1;
            else if (isoWeek <= 26) quarter = 2;
            else if (isoWeek <= 39) quarter = 3;
            else quarter = 4;

            periodKey = `Q${isoYear}-${quarter}`;
          } else if (groupByPeriod === "month") {
            // Group by Month-Year
            const year = shipmentDate.getFullYear();
            const month = String(shipmentDate.getMonth() + 1).padStart(2, "0");
            const monthName = shipmentDate.toLocaleDateString("en-US", {
              month: "short",
            });
            periodKey = `${monthName} ${year}`;
          } else if (groupByPeriod === "week") {
            // Group by ISO Week
            const isoYear = getISOWeekYear(shipment.shipmentDate);
            const isoWeek = getWeekOfYear(shipment.shipmentDate);
            periodKey = `WW${String(isoWeek).padStart(2, "0")}-${isoYear}`;
          }

          if (!periodKey) return;

          if (!summary[periodKey]) {
            summary[periodKey] = { 0: 0, 1: 0, 2: 0 };
          }

          const closed = Number(shipment.closed) || 0;
          const qty = Number(shipment.qty) || 0;

          if (closed === 0 || closed === 1 || closed === 2) {
            summary[periodKey][closed] += qty;
          }
        });
      });
    });

    // Sort keys berdasarkan periode
    let sortedKeys = Object.keys(summary);

    if (groupByPeriod === "quarter") {
      sortedKeys = sortedKeys.sort((a, b) => {
        const [qAPart, quarterA] = a.split("-"); // "Q2025", "1"
        const [qBPart, quarterB] = b.split("-"); // "Q2026", "2"

        const yearA = parseInt(qAPart.replace("Q", "")); // 2025
        const yearB = parseInt(qBPart.replace("Q", "")); // 2026

        const yearDiff = yearA - yearB;
        if (yearDiff !== 0) return yearDiff;
        return parseInt(quarterA) - parseInt(quarterB); // 1, 2, 3, 4
      });
    } else if (groupByPeriod === "month") {
      const monthOrder = {
        Jan: 1,
        Feb: 2,
        Mar: 3,
        Apr: 4,
        May: 5,
        Jun: 6,
        Jul: 7,
        Aug: 8,
        Sep: 9,
        Oct: 10,
        Nov: 11,
        Dec: 12,
      };
      sortedKeys = sortedKeys.sort((a, b) => {
        const [monthA, yearA] = a.split(" ");
        const [monthB, yearB] = b.split(" ");
        const yearDiff = parseInt(yearA) - parseInt(yearB);
        if (yearDiff !== 0) return yearDiff;
        return monthOrder[monthA] - monthOrder[monthB];
      });
    } else if (groupByPeriod === "week") {
      sortedKeys = sortedKeys.sort((a, b) => {
        const [wwA, yearA] = a.split("-");
        const [wwB, yearB] = b.split("-");
        const yearDiff = parseInt(yearA) - parseInt(yearB);
        if (yearDiff !== 0) return yearDiff;
        return (
          parseInt(wwA.replace("WW", "")) - parseInt(wwB.replace("WW", ""))
        );
      });
    }

    // Generate HTML table
    let html = `
    <table class="table table-bordered table-sm text-center">
      <thead class="table-light">
        <tr>
          <th style="width: 20%;">Period</th>
          <th style="width: 20%;">Plan</th>
          <th style="width: 20%;">Blanket</th>
          <th style="width: 20%;">PO</th>
          <th style="width: 20%;"><strong>Total</strong></th>
        </tr>
      </thead>
      <tbody>
  `;

    let grandTotalPlan = 0,
      grandTotalBlanket = 0,
      grandTotalPO = 0;

    sortedKeys.forEach((period) => {
      const data = summary[period];
      const plan = data[0] || 0;
      const blanket = data[1] || 0;
      const po = data[2] || 0;
      const total = plan + blanket + po;

      grandTotalPlan += plan;
      grandTotalBlanket += blanket;
      grandTotalPO += po;

      html += `
      <tr>
        <td><strong>${period}</strong></td>
        <td>${formatQty(plan)}</td>
        <td>${formatQty(blanket)}</td>
        <td>${formatQty(po)}</td>
        <td><strong>${formatQty(total)}</strong></td>
      </tr>
    `;
    });

    // Grand total row
    const grandTotal = grandTotalPlan + grandTotalBlanket + grandTotalPO;
    html += `
    <tr style="background-color: #f0f0f0; font-weight: bold;">
      <td>GRAND TOTAL</td>
      <td>${formatQty(grandTotalPlan)}</td>
      <td>${formatQty(grandTotalBlanket)}</td>
      <td>${formatQty(grandTotalPO)}</td>
      <td>${formatQty(grandTotal)}</td>
    </tr>
  `;

    html += `</tbody></table>`;

    // Render ke container
    $("#summaryTableContainer").html(html);
  }

  function initSortableForBothTables(tableLeft, tableRight) {
    const leftTbody = document.querySelector("#purchasePlanTableLeft tbody");
    const rightTbody = document.querySelector("#purchasePlanTableRight tbody");

    if (!leftTbody || !rightTbody) {
      console.warn("❌ Table bodies not found!");
      return;
    }

    let isSorting = false;
    let sortableLeft, sortableRight;

    sortableLeft = new Sortable(leftTbody, {
      animation: 150,
      ghostClass: "sortable-ghost",
      chosenClass: "sortable-chosen",
      dragClass: "sortable-drag",
      handle: "tr",
      forceFallback: false,

      onStart: function (evt) {
        // Disable sorting di kanan saat drag kiri
        if (sortableRight) sortableRight.option("disabled", true);
      },

      onEnd: function (evt) {
        if (isSorting) return;
        isSorting = true;

        try {
          const reorderedData = [];

          leftTbody.querySelectorAll("tr").forEach((tr) => {
            const rowId = tr.getAttribute("data-row-id");

            // Cari dari allPurchasePlanData menggunakan ID langsung
            const rowData = allPurchasePlanData.find((r) => r.ID == rowId);

            if (rowData) {
              reorderedData.push(rowData);
            } else {
              console.warn(`⚠️ Row not found for ID: ${rowId}`);
            }
          });

          if (reorderedData.length === 0) {
            console.error("❌ No reordered data found!", {
              domRowCount: leftTbody.querySelectorAll("tr").length,
              globalDataCount: allPurchasePlanData.length,
            });
            return;
          }

          // console.log(
          //   `✓ Reordered ${reorderedData.length} rows from left table`,
          // );

          const visibleRowsSet = new Set(reorderedData.map((r) => r.ID));
          const updatedData = [...reorderedData];
          allPurchasePlanData.forEach((row) => {
            if (!visibleRowsSet.has(row.ID)) {
              updatedData.push(row);
            }
          });
          allPurchasePlanData = updatedData;

          tableRight.off("draw.dt search.dt order.dt page.dt");
          tableRight.off("draw.dt init.dt fixedHeader.adjust");

          tableRight.clear().rows.add(reorderedData).draw(false);

          // PENTING: Force re-render semua cells via invalidate + draw
          // Ini memastikan render function getPurchasePlanRightCols() di-trigger ulang
          tableRight.rows().invalidate().draw(false);

          buildRightHeader(selectedYear);

          // Re-attach event listeners
          tableRight.on("draw.dt init.dt fixedHeader.adjust", function () {
            buildRightHeader(selectedYear);
          });

          // Highlight row yang dipindahkan
          const movedRow = reorderedData[evt.newIndex];
          if (movedRow) {
            highlightMovedRow(movedRow);
          }

          // console.log(
          //   `✓ Left table reordered: moved row ${evt.oldIndex} → ${evt.newIndex}`,
          // );
        } catch (err) {
          console.error("❌ Error during reorder:", err);
        } finally {
          isSorting = false;
          // Re-enable sorting di kanan
          if (sortableRight) sortableRight.option("disabled", false);
        }
      },
    });

    sortableRight = new Sortable(rightTbody, {
      animation: 150,
      ghostClass: "sortable-ghost",
      chosenClass: "sortable-chosen",
      dragClass: "sortable-drag",
      handle: "tr",
      forceFallback: false,

      onStart: function (evt) {
        // Disable sorting di kiri saat drag kanan
        if (sortableLeft) sortableLeft.option("disabled", true);
      },

      onEnd: function (evt) {
        if (isSorting) return;
        isSorting = true;

        try {
          // Ambil urutan baru langsung dari DOM (yang sudah ter-reorder oleh Sortable)
          const reorderedData = [];

          rightTbody.querySelectorAll("tr").forEach((tr) => {
            const rowId = tr.getAttribute("data-row-id");

            // Cari dari allPurchasePlanData menggunakan ID langsung
            const rowData = allPurchasePlanData.find((r) => r.ID == rowId);

            if (rowData) {
              reorderedData.push(rowData);
            } else {
              console.warn(`⚠️ Row not found for ID: ${rowId}`);
            }
          });

          if (reorderedData.length === 0) {
            console.error("❌ No reordered data found!", {
              domRowCount: rightTbody.querySelectorAll("tr").length,
              globalDataCount: allPurchasePlanData.length,
            });
            return;
          }

          // console.log(
          //   `✓ Reordered ${reorderedData.length} rows from right table`,
          // );
          const visibleRowsSet = new Set(reorderedData.map((r) => r.ID));
          const updatedData = [...reorderedData];
          allPurchasePlanData.forEach((row) => {
            if (!visibleRowsSet.has(row.ID)) {
              updatedData.push(row);
            }
          });
          allPurchasePlanData = updatedData;

          // REBUILD tabel kiri
          tableLeft.off("draw.dt search.dt order.dt page.dt");
          tableLeft.off("draw.dt order.dt");

          tableLeft.clear().rows.add(reorderedData).draw(false);

          // PENTING: Force re-render semua cells via invalidate + draw
          tableLeft.rows().invalidate().draw(false);

          // Re-attach event listeners
          tableLeft.on("order.dt page.dt search.dt draw.dt", function () {
            if (activeTable === "left" || activeTable === null) {
              syncTables(tableLeft, tableRight);
            }
          });

          // Highlight
          const movedRow = reorderedData[evt.newIndex];
          if (movedRow) {
            highlightMovedRow(movedRow);
          }

          // console.log(
          //   `✓ Right table reordered: moved row ${evt.oldIndex} → ${evt.newIndex}`,
          // );
        } catch (err) {
          console.error("❌ Error during reorder:", err);
        } finally {
          isSorting = false;
          // Re-enable sorting di kiri
          if (sortableLeft) sortableLeft.option("disabled", false);
        }
      },
    });

    // console.log(" Sortable initialized for both tables");
  }

  function highlightMovedRow(rowData) {
    // Flash highlight pada row yang dipindahkan
    if (!rowData || !rowData.ID) return;

    const selector = `tr[data-row-id="${rowData.ID}"]`;
    const $rows = $(selector);

    $rows.css({
      backgroundColor: "#fff3cd",
      transition: "background-color 0.3s ease",
    });

    setTimeout(() => {
      $rows.css("backgroundColor", "");
    }, 1500);
  }

  function synchronizeScroll() {
    const leftContainer = document.getElementById("scroll-left");
    const rightContainer = document.getElementById("right-container");

    let isScrolling = false;

    // Right container sebagai master scroll
    rightContainer.addEventListener("scroll", function () {
      if (!isScrolling) {
        isScrolling = true;
        leftContainer.scrollTop = rightContainer.scrollTop;
        setTimeout(() => (isScrolling = false), 10);
      }
    });

    // Optional: Left container juga bisa trigger sync
    leftContainer.addEventListener("scroll", function () {
      if (!isScrolling) {
        isScrolling = true;
        rightContainer.scrollTop = leftContainer.scrollTop;
        setTimeout(() => (isScrolling = false), 10);
      }
    });
  }

  // Panggil setelah tabel terisi data
  synchronizeScroll();
  // Event click WW cell
  $(document).on("click", ".ww-cell", function () {
    // Ambil data dari dataTable atau attribute
    selectedRowData = $(this).data("row");

    // Optional: cek kalau ini '-' atau qty
    selectedRowData.isDash = $(this).text().trim() === "-";

    // Set input modal default
    $('#weekModal input[name="qty"]').val(selectedRowData.Qty || "");
    $('#weekModal input[name="shipment_date"]').val(
      selectedRowData.ShipmentDate || "",
    );

    // Buka modal
    $("#weekModal").modal("show");
  });

  function voidPurchasePlan(purchasePlanID) {
    let planIDsToVoid = [];

    if (Array.isArray(purchasePlanID) && purchasePlanID.length > 0) {
      planIDsToVoid = purchasePlanID;
    } else if (typeof purchasePlanID === "number" && purchasePlanID > 0) {
      planIDsToVoid = [purchasePlanID];
    } else {
      alert("Invalid Purchase Plan ID(s)");
      return;
    }

    const $list = $("#voidPlanList");
    $list.empty();

    const allRows = currentGroupedData;
    const blockedPlans = [];

    allRows.forEach((rowData) => {
      const matchedPlans = (rowData._groupedPlans || []).filter((p) =>
        planIDsToVoid.includes(p.ID),
      );
      matchedPlans.forEach((plan) => {
        const hasPoOrBlanket =
          (plan.BlanketID && parseInt(plan.BlanketID) > 0) ||
          (plan.POID && parseInt(plan.POID) > 0);

        if (hasPoOrBlanket) {
          blockedPlans.push(plan.DocNumber);
        }

        $list.append(`
          <li class="list-group-item">
            <label class="d-flex justify-content-between align-items-center mb-0" style="cursor:${hasPoOrBlanket ? "not-allowed" : "pointer"};">
              <span>
                <input type="checkbox" 
                      class="void-plan-checkbox mr-2" 
                      value="${plan.ID}" 
                      ${hasPoOrBlanket ? "disabled" : ""}>
                <strong>${plan.DocNumber || "-"}</strong>
                <span class="text-muted"> — ${rowData.ItemDesc || ""}${rowData.Color ? " (" + rowData.Color + ")" : ""}</span>
                ${hasPoOrBlanket ? '<span class="badge badge-secondary ml-1">Data already PO/Blanket</span>' : ""}
              </span>
              <span class="text-muted small">${plan.DocDate || ""}</span>
            </label>
          </li>
        `);
      });
    });

    $("#voidSelectAllCheckbox").prop("checked", false);

    if (blockedPlans.length > 0) {
      alert(
        `These plan cannot be void because already create blank/po:\n\n${blockedPlans.join("\n")}`,
      );
    }

    $("#voidConfirmModal").modal("show");
  }

  $(document)
    .off("click", "#confirmVoidBtn")
    .on("click", "#confirmVoidBtn", function () {
      const planIDsToVoid = $(".void-plan-checkbox:checked")
        .map(function () {
          return parseInt($(this).val(), 10);
        })
        .get();

      if (planIDsToVoid.length === 0) {
        alert("Pilih minimal 1 plan untuk di-void");
        return;
      }

      const doubleConfirmed = confirm("Are you sure Confirm to Void?");
      if (!doubleConfirmed) {
        return;
      }

      $("#voidConfirmModal").modal("hide");

      const $btn = $(".buttons-collection")
        .parent()
        .find(".btn:contains('Delete')");
      const originalText = $btn.text();
      $btn.prop("disabled", true).text("Voiding...");

      $.ajax({
        url:
          BASE_URL + "scm/purchasing/purchase_plan_report/void_purchase_plan",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({ purchasePlanIDs: planIDsToVoid }),
        dataType: "json",
        success: function (response) {
          if (response.status === "success") {
            if (response.voided_count > 0) {
              const message =
                response.voided_count === 1
                  ? `✓ Purchase Plan marked as VOID!`
                  : `✓ ${response.voided_count} Purchase Plan(s) marked as VOID!`;

              alert(message + `\n\n${response.message}`);

              selectedRowData = null;
              selectedPlanIDs = [];
              updateCheckboxUI();
              loadPurchasePlanData();
            } else {
              alert(`✗ No plan was voided.\n\n${response.message}`);
              $btn.prop("disabled", false).text(originalText);
            }
          } else {
            alert(`✗ Void failed: ${response.message}`);
            $btn.prop("disabled", false).text(originalText);
          }
        },
        error: function (xhr, status, error) {
          console.error("Void error:", error, xhr.responseText);
          alert(`✗ Error voiding plan: ${error}`);
          $btn.prop("disabled", false).text(originalText);
        },
      });
    });
  $(document)
    .off("change", "#voidSelectAllCheckbox")
    .on("change", "#voidSelectAllCheckbox", function () {
      const isChecked = $(this).is(":checked");
      $(".void-plan-checkbox:not(:disabled)").prop("checked", isChecked);
    });

  $("#saveChangesBtn").on("click", function () {
    if (!selectedRowData) {
      alert("Error: Data baris belum dipilih!");
      return;
    }

    const batchRanges = $("#weekModal").data("batchRanges") || [];
    const updatedShipments = [];
    let validationError = null;

    $("#shipmentBatchTable tbody tr").each(function () {
      const $row = $(this);
      const qtyEdit = parseInt($row.find(".qty-input").val(), 10) || 0;
      const shipmentDateEdit = $row.find(".date-input").val();
      let batch = $row.find(".qty-input").data("batch");
      const shipmentId = $row.find(".qty-input").data("shipment-id");

      const $batchSelector = $row.find(".batch-selector");
      if ($batchSelector.length > 0) {
        batch = $batchSelector.val();
        if (!batch) {
          validationError = "Please select batch!";
          return false;
        }
      }

      if (!shipmentDateEdit) {
        validationError = `Shipment Date for batch ${batch} cannot null!`;
        return false;
      }

      if (!qtyEdit) {
        validationError = `Qty for batch ${batch} cannot null!`;
        return false;
      }
      const weeklyData =
        selectedRowData.weekly_data?.[
          $("#weekModal .modal-week-label").text()
        ] || [];
      const existing = Array.isArray(weeklyData)
        ? weeklyData.find(
            (d) => d.batch === batch && d.shipmentId == shipmentId,
          )
        : null;

      const currentShipmentDocNumber = existing
        ? existing.docNumber
        : selectedRowData.DocNumber;

      const dateValidation = validateBatchDateOrder(
        batchRanges,
        batch,
        shipmentDateEdit,
        currentShipmentDocNumber,
      );
      if (!dateValidation.valid) {
        validationError = dateValidation.message;
        return false;
      }
    });

    if (validationError) {
      alert(validationError);
      return;
    }

    $("#shipmentBatchTable tbody tr").each(function () {
      const $row = $(this);
      const qtyEdit = parseInt($row.find(".qty-input").val(), 10) || 0;
      const shipmentDateEdit = $row.find(".date-input").val();
      let batch = $row.find(".qty-input").data("batch");

      const $batchSelector = $row.find(".batch-selector");
      if ($batchSelector.length > 0) {
        batch = $batchSelector.val();
        if (!batch) {
          validationError = " Silakan pilih batch!";
          return false;
        }
      }

      if (!shipmentDateEdit) {
        validationError = ` Shipment Date untuk batch ${batch} tidak boleh kosong!`;
        return false;
      }

      if (!qtyEdit) {
        validationError = ` Qty untuk batch ${batch} tidak boleh kosong!`;
        return false;
      }

      const shipmentId = $row.find(".qty-input").data("shipment-id");
      const weeklyData =
        selectedRowData.weekly_data?.[
          $("#weekModal .modal-week-label").text()
        ] || [];
      const existing = Array.isArray(weeklyData)
        ? weeklyData.find(
            (d) => d.batch === batch && d.shipmentId == shipmentId,
          )
        : null;

      const currentShipmentDocNumber = existing
        ? existing.docNumber
        : selectedRowData.DocNumber;

      const dateValidation = validateBatchDateOrder(
        batchRanges,
        batch,
        shipmentDateEdit,
        currentShipmentDocNumber,
      );
      if (!dateValidation.valid) {
        validationError = dateValidation.message;
        return false;
      }

      const qtyAwal = existing ? parseInt(existing.qty, 10) : 0;
      const shipmentDateAwal = existing ? existing.shipmentDate : "";
      const closed = existing ? existing.closed : 0;
      const docNumber = existing
        ? existing.docNumber
        : selectedRowData.DocNumber;
      const reffDocID = existing ? existing.reffDocID : null;
      const reffShipmentID = existing ? existing.reffShipmentID : null;

      let mode = "";
      if (shipmentDateEdit !== shipmentDateAwal) {
        if (qtyEdit < qtyAwal) {
          mode = "partial_split";
        } else if (qtyEdit === qtyAwal) {
          mode = "full_move";
        } else {
          mode = "override";
        }
      } else {
        mode = "update_same";
      }

      updatedShipments.push({
        PurchasePlanID:
          existing?.purchasePlanID ?? selectedRowData.PurchasePlanID,
        ShipmentID: shipmentId,
        batch: batch,
        qty_awal: qtyAwal,
        shipment_date_awal: shipmentDateAwal,
        qty_edit: qtyEdit,
        BlanketID: existing?.BlanketID ?? selectedRowData.BlanketID ?? null,
        POID: existing?.POID ?? selectedRowData.POID ?? null,
        shipment_date_edit: shipmentDateEdit,
        mode: mode,
        is_new: existing ? 0 : 1,
        itemID: selectedRowData.ItemID || null,
        color: selectedRowData.Color || null,
        closed: closed,
        docNumber: docNumber,
        reffDocID: reffDocID,
        reffShipmentID: reffShipmentID,
      });
    });

    if (validationError) {
      alert(validationError);
      return;
    }

    if (updatedShipments.length === 0) {
      alert("Tidak ada data yang diubah!");
      return;
    }

    $.ajax({
      url: BASE_URL + "scm/purchasing/purchase_plan_report/update_report",
      type: "POST",
      data: { shipments: JSON.stringify(updatedShipments) },
      success: function (response) {
        let res;
        try {
          res = JSON.parse(response);
        } catch (e) {
          alert("Response bukan JSON valid: " + response);
          return;
        }

        if (res.status === "success") {
          alert(res.message);
          $("#weekModal").modal("hide");
          loadPurchasePlanData();
        } else {
          alert(" " + res.message);
        }
      },
      error: function (xhr, status, error) {
        console.error("AJAX Error:", status, error, xhr.responseText);
        alert("Terjadi error AJAX: " + error);
      },
    });
  });
  $("#modal-shipmentdate").on("change", function () {
    const val = $(this).val();
    if (!val) {
      $("#shipmentInfo").text("");
      return;
    }
    $.ajax({
      url: BASE_URL + "scm/purchasing/purchase_plan_report/get_period",
      type: "POST",
      dataType: "json",
      data: { date: val },
      success: function (res) {
        if (res.status === "success") {
          const ww = res.data.WW;
          const qq = res.data.QQ;
          $("#shipmentInfo").text(`${ww}, ${qq}`);
        } else {
          $("#shipmentInfo").text("Data tidak ditemukan");
        }
      },
      error: function (xhr) {
        console.error("Ajax Error:", xhr.responseText);
        $("#shipmentInfo").text("Error load data");
      },
    });
  });

  function moveControlsToCustomContainers() {
    // Pindahkan buttons
    if (
      $(".dt-buttons").length &&
      $("#buttons-container .dt-buttons").length === 0
    ) {
      $(".dt-buttons").appendTo("#buttons-container");
    }

    // Pindahkan search
    if (
      $(".dataTables_filter").length &&
      $("#search-container .dataTables_filter").length === 0
    ) {
      $(".dataTables_filter").appendTo("#search-container");
    }

    // Pindahkan length selector
    if (
      $(".dataTables_length").length &&
      $("#length-container .dataTables_length").length === 0
    ) {
      $(".dataTables_length").appendTo("#length-container");
    }

    // Pindahkan info
    if (
      $(".dataTables_info").length &&
      $("#info-container .dataTables_info").length === 0
    ) {
      $(".dataTables_info").appendTo("#info-container");
    }

    // Pindahkan pagination
    if (
      $(".dataTables_paginate").length &&
      $("#pagination-container .dataTables_paginate").length === 0
    ) {
      $(".dataTables_paginate").appendTo("#pagination-container");
    }
  }

  // Helper function untuk update UI berdasarkan selection
  function updateCheckboxUI() {
    const $badge = $("#selectedCountBadge");

    if (selectedPlanIDs.length > 0) {
      $badge.text(selectedPlanIDs.length).show();
      $("#btnDeleteSelected").prop("disabled", false);
    } else {
      $badge.text(0).hide();
      $("#btnDeleteSelected").prop("disabled", true);
    }
  }

  function getPurchasePlanLeftCols() {
    return [
      {
        data: null,
        title: '#<br><small style="font-size:10px;color:#555">&nbsp;</small>',
        className: "text-center checkbox-col",
        render: function (data, type, row) {
          return `
            <input type="checkbox" 
                  class="row-checkbox" 
                  data-plan-id="${row._groupedIDs.join(",")}" 
                  value="${row._groupedIDs.join(",")}">
          `;
        },
      },
      {
        data: "Vendor",
        title:
          'Vendor<br><small style="font-size:10px;color:#555">&nbsp;</small>',
        className: "main-column vendor-col",
        render: function (data) {
          return `<span>${data || "N/A"}</span>`;
        },
      },
      {
        data: "ItemDesc",
        title:
          'Item Desc<br><small style="font-size:10px;color:#555">&nbsp;</small>',
        className: "main-column itemdesc-col",
        render: function (data) {
          return `<span>${data || "N/A"}</span>`;
        },
      },
      {
        data: "Color",
        title:
          'Color<br><small style="font-size:10px;color:#555">&nbsp;</small>',
        className: "main-column color-col",
        render: function (data) {
          return `<span>${data || ""}</span>`;
        },
      },
      {
        data: "PlanGroupName",
        title:
          'Group<br><small style="font-size:10px;color:#555">&nbsp;</small>',
        className: "main-column color-col",
        render: function (data) {
          return `<span>${data || ""}</span>`;
        },
      },
      // {
      //   data: 'Batch',
      //   title: 'Batch',
      //   className: 'main-column batch-col',
      //   render: function (data) {
      //     return `<span>${data || 'N/A'}</span>`;
      //   },
      // },
    ];
  }
  function getWeekNumber(dateString) {
    if (!dateString) return "";

    const date = new Date(dateString);
    const startDate = new Date(date.getFullYear(), 0, 1);
    const days = Math.floor((date - startDate) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((days + startDate.getDay() + 1) / 7);

    return `WW${weekNumber.toString().padStart(2, "0")}`;
  }

  function setupDateChangeListeners() {
    $("#shipmentBatchTable .date-input")
      .off("change")
      .on("change", function () {
        const newDate = $(this).val();
        const wwInfo = getWeekNumber(newDate);
        $(this).siblings(".ww-info").text(wwInfo);

        const batchRanges = $("#weekModal").data("batchRanges") || [];
        const $row = $(this).closest("tr");
        let batch = $row.find(".qty-input").data("batch");

        let batchSelector = $row.find(".batch-selector");
        if (batchSelector.length > 0) {
          batch = batchSelector.val();
        }

        // Get shipment's docNumber from the row
        const shipmentId = $row.find(".qty-input").data("shipment-id");
        const weeklyData =
          selectedRowData.weekly_data?.[
            $("#weekModal .modal-week-label").text()
          ] || [];
        const existing = Array.isArray(weeklyData)
          ? weeklyData.find((d) => d.shipmentId === shipmentId)
          : null;
        const docNumberToValidate = existing
          ? existing.docNumber
          : selectedRowData.DocNumber;

        const validation = validateBatchDateOrder(
          batchRanges,
          batch,
          newDate,
          docNumberToValidate,
        );
        const $feedback = $row.find(".date-feedback");

        if (!validation.valid) {
          if ($feedback.length === 0) {
            $(this)
              .closest("td")
              .after(
                `<td style="color: red; font-size: 12px;" class="date-feedback">${validation.message}</td>`,
              );
          } else {
            $feedback.text(validation.message);
          }
          $(this).css("border-color", "red");
        } else {
          if ($feedback.length > 0) $feedback.remove();
          $(this).css("border-color", "");
        }
      });
  }
  function hasNoPayments(shipmentData) {
    if (Array.isArray(shipmentData)) {
      return shipmentData.every((s) => !s.payments || s.payments.length === 0);
    } else if (shipmentData) {
      return !shipmentData.payments || shipmentData.payments.length === 0;
    }
    return true;
  }

  function injectPaymentIndicatorCSS() {
    if ($("#payment-indicator-css").length === 0) {
      const css = `
        .ww-btn.no-payment-indicator {
          position: relative;
          overflow: visible !important;
        }
        .ww-btn.no-payment-indicator::after {
          content: '';
          position: absolute;
          top: 3px;
          right: 13px;
          width: 6px;
          height: 6px;
          background-color: #dc3545;
          border-radius: 50%;
          box-shadow: 0 0 3px rgba(220, 53, 69, 1), inset 0 0 1px rgba(0, 0, 0, 0.2);
          opacity: 0.2;
          z-index: 10;
        }
      `;
      $('<style id="payment-indicator-css">' + css + "</style>").appendTo(
        "head",
      );
    }
  }
  injectPaymentIndicatorCSS();

  function getQuarterColor(week) {
    if (week >= 1 && week <= 13) return "rgba(0, 0, 128, 0.1)"; // Navy
    if (week >= 14 && week <= 26) return "rgba(0, 128, 0, 0.1)"; // Green
    if (week >= 27 && week <= 39) return "rgba(255, 165, 0, 0.1)"; // Orange
    return "rgba(128, 128, 128, 0.1)"; // Gray
  }
  function formatQty(num) {
    if (num == null || num === "") return "";
    const n = Number(num);
    if (isNaN(n)) return num;
    return n.toLocaleString("en-US");
  }

  function getPurchasePlanRightCols() {
    const rightCols = [];

    weekRangeData.forEach((weekInfo) => {
      const dateLabel = formatHeaderDate(weekInfo.date);
      const label = `${weekInfo.label}<br><small style="font-size:10px;color:#555">${dateLabel}</small>`;

      rightCols.push({
        data: null,
        title: label,
        className: `week-column ww${weekInfo.week}-col year-${weekInfo.year}`,
        render: function (data, type, row) {
          const weekKey = `ww${weekInfo.week}`;
          const weekData = row.weekly_data?.[weekKey];

          // === Jika belum ada data minggu ini ===
          if (!weekData || (Array.isArray(weekData) && weekData.length === 0)) {
            if (type === "export") return "";

            // tombol untuk input baru
            const hasPaymentIssue1 = false; // No indicator for empty weeks (qty = 0)
            return `
            <button class="ww-btn btn btn-sm${hasPaymentIssue1 ? " no-payment-indicator" : ""}"
                    data-week="${weekKey}"
                    data-year="${weekInfo.year}"
                    data-qty="0"
                    data-row-id="${row._groupedIDs.join("_")}"
                    data-item-id="${row.ItemID || ""}"
                    data-vendor="${row.Vendor}"
                    data-item-desc="${(row.ItemDesc || "").replace(/"/g, "&quot;")}"
                    data-color="${row.Color || ""}"
                    data-shipment-date=""
                    data-batch="${row.Batch || ""}"
                    data-closed="0"
                    style="width:100%;
                          border:none;
                          background-color:${getQuarterColor(
                            weekInfo.week,
                          )} !important;
                          color:#6c757d;
                          font-weight:400;
                          font-size:10px;
                          cursor:pointer;
                          padding:1px 0px;
                          border-radius:2px;">
                -
            </button>
          `;
          }

          // === Jika weekData berupa array ===
          if (Array.isArray(weekData)) {
            //  PENTING: Filter berdasarkan ISO week year, bukan calendar year
            // Karena 2025-12-29 adalah week 1 of 2026, tapi calendar year-nya 2025
            const filtered = weekData.filter((d) => {
              if (!d.shipmentDate) return false;
              // Get ISO week year dari shipment date
              const isoWeekYear = getISOWeekYear(d.shipmentDate);
              return parseInt(isoWeekYear) === weekInfo.year;
            });

            if (filtered.length === 0) {
              // tetap bisa diklik meskipun tidak ada shipment valid tahun ini
              if (type === "export") return "";
              const hasPaymentIssue2 = false; // No indicator for empty filtered results (qty = 0)
              return `
                <button class="ww-btn btn btn-sm${hasPaymentIssue2 ? " no-payment-indicator" : ""}"
                        data-week="${weekKey}"
                        data-year="${weekInfo.year}"
                        data-qty="0"
                        data-row-id="${row._groupedIDs.join("_")}"
                        data-item-id="${row.ItemID || ""}"
                        data-vendor="${row.Vendor}"
                        data-item-desc="${(row.ItemDesc || "").replace(/"/g, "&quot;")}"
                        data-color="${row.Color || ""}"
                        data-shipment-date=""
                        data-batch="${row.Batch || ""}"
                        data-closed="0"
                        style="width:100%;
                              border:none;
                              background:transparent;
                              background-color:${getQuarterColor(
                                weekInfo.week,
                              )} !important;
                              color:#6c757d;
                              font-weight:400;
                              font-size:10px;
                              cursor:pointer;
                              padding:1px 1px;
                              border-radius:2px;">
                    -
                </button>
              `;
            }

            // hitung total qty
            const totalQty = filtered.reduce(
              (sum, d) => sum + (Number(d.qty) || 0),
              0,
            );

            if (type === "export") return totalQty;

            const hasPaymentIssue3 =
              totalQty > 0 &&
              hasNoPayments(filtered) &&
              filtered.every((d) => !d.closed || d.closed == 0);
            return `
           <button class="ww-btn btn btn-sm${hasPaymentIssue3 ? " no-payment-indicator" : ""}"
              data-week="${weekKey}"
              data-year="${weekInfo.year}"
              data-qty="${formatQty(totalQty)}"
              data-row-id="${row._groupedIDs.join("_")}"
              data-item-id="${row.ItemID || ""}"
              data-vendor="${row.Vendor}"
              data-item-desc="${(row.ItemDesc || "").replace(/"/g, "&quot;")}"
              data-color="${row.Color || ""}"
              data-shipment-date="${filtered[0].shipmentDate || ""}"
              data-batch="${row.Batch || filtered[0].batch || ""}"
              data-closed="${
                filtered.some((d) => d.closed == 1)
                  ? 1
                  : filtered.some((d) => d.closed == 2)
                    ? 2
                    : 0
              }"
              style="width:100%;
                    border:none;
                    background:transparent;
                    color:${
                      filtered.some((d) => d.closed == 1)
                        ? "#7e0097ff" // Hitam kalau closed == 1
                        : filtered.some((d) => d.closed == 2)
                          ? "#000" // Ungu kalau closed == 2
                          : filtered.every(
                                (d) =>
                                  d.batch == null ||
                                  d.batch === "" ||
                                  d.batch == 0,
                              )
                            ? "#dc3545" // Merah kalau belum ada batch
                            : "#003dcdff" // Biru untuk normal (sudah batch, belum SPBLK)
                    };
                    background-color:${getQuarterColor(
                      weekInfo.week,
                    )} !important;
                    font-weight:bold;
                    font-size:10px;
                    cursor:pointer;
                    padding:1px 1px;
                    border-radius:2px;">
              ${formatQty(totalQty)}
            </button>

          `;
          }

          // === Format lama (object tunggal) ===
          const shipmentYear = weekData.shipmentDate
            ? new Date(weekData.shipmentDate).getFullYear()
            : null;

          if (shipmentYear !== weekInfo.year) {
            if (type === "export") return "";
            const hasPaymentIssue4 = hasNoPayments([]);
            return `
            <button class="ww-btn btn btn-sm${hasPaymentIssue4 ? " no-payment-indicator" : ""}"
                    data-week="${weekKey}"
                    data-year="${weekInfo.year}"
                    data-qty="0"
                    data-row-id="${row._groupedIDs.join("_")}"
                    data-item-id="${row.ItemID || ""}"
                    data-color="${row.Color || ""}"
                    data-item-desc="${(row.ItemDesc || "").replace(/"/g, "&quot;")}"
                    data-shipment-date=""
                    data-vendor="${row.Vendor}"
                    data-batch="${row.Batch || ""}"
                    data-closed="0"
                    style="width:100%;
                          border:none;
                          background:transparent;
                          background-color:${getQuarterColor(
                            weekInfo.week,
                          )} !important;
                          color:#6c757d;
                          font-weight:400;
                          font-size:10px;
                          cursor:pointer;
                          padding:1px 1px;
                          border-radius:2px;">
                -
            </button>
          `;
          }

          if (type === "export") return weekData.qty || "";

          const hasPaymentIssue5 =
            weekData.qty > 0 &&
            hasNoPayments(weekData) &&
            (!weekData.closed || weekData.closed == 0);
          return `
          <button class="ww-btn btn btn-sm${hasPaymentIssue5 ? " no-payment-indicator" : ""}"
            data-week="${weekKey}"
            data-year="${weekInfo.year}"
            data-qty="${formatQty(weekData.qty)}"
            data-shipment-id="${weekData.shipmentId}"
            data-row-id="${row._groupedIDs.join("_")}"
            data-item-id="${row.ItemID || ""}"
            data-item-desc="${(row.ItemDesc || "").replace(/"/g, "&quot;")}"
            data-color="${row.Color || ""}"
            data-shipment-date="${weekData.shipmentDate}"
            data-vendor="${row.Vendor}"
            data-closed="${weekData.closed || 0}"
            data-batch="${weekData.batch ?? row.Batch ?? ""}"
            style="width:100%;
                  border:none;
                  background:transparent;
                  background-color:${getQuarterColor(weekInfo.week)} !important;
                  color:${
                    weekData.closed == 1
                      ? "#7e0097ff" // hitam: closed == 1
                      : weekData.closed == 2
                        ? "#000" // ungu: closed == 2
                        : weekData.batch == null ||
                            weekData.batch === "" ||
                            weekData.batch == 0
                          ? "#dc3545" // merah: belum ada batch
                          : "#003dcdff" // biru: normal
                  };
                  font-weight:${weekData.qty === "-" ? "bold" : "600"};
                  font-size:10px;
                  cursor:pointer;
                  padding:1px 1px;
                  border-radius:2px;">
            ${formatQty(weekData.qty)}
          </button>

        `;
        },
      });
    });

    return rightCols;
  }

  function buildRightHeader() {
    const $table = $("#purchasePlanTableRight");
    let $thead = $table.find("thead");

    if ($thead.length === 0) {
      $table.prepend("<thead><tr></tr></thead>");
      $thead = $table.find("thead");
    }

    let $headerRow = $thead.find("tr");
    if ($headerRow.length === 0) {
      $thead.append("<tr></tr>");
      $headerRow = $thead.find("tr");
    }

    $headerRow.empty();

    // LANGSUNG PAKAI weekRangeData dari backend
    weekRangeData.forEach((weekInfo) => {
      const dateLabel = formatHeaderDate(weekInfo.date);
      $headerRow.append(`
            <th class="ww-col-${weekInfo.week} year-${weekInfo.year}">
                ${weekInfo.label}<br>
                <small style="font-size:10px;color:#555">${dateLabel}</small>
            </th>
        `);
    });

    if (typeof tableRight !== "undefined") {
      tableRight.columns.adjust().draw(false);
    }
  }

  function formatHeaderDate(dateStr) {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const yy = String(date.getFullYear()).slice(-2);
    const day = String(date.getDate()).padStart(2, "0");
    const month = date.toLocaleDateString("en-GB", { month: "short" });
    return `${day}-${month}`; // Format: 25-08-Jan
  }

  function getWednesdayOfWeek(year, week, format = "input") {
    year = parseInt(year);
    week = parseInt(week);

    if (isNaN(year) || isNaN(week) || week < 1 || week > 53) {
      // console.warn(" getWednesdayOfWeek invalid input:", { year, week });
      return "";
    }

    // ISO week: minggu pertama = minggu yang mengandung Kamis pertama di tahun itu
    const simple = new Date(year, 0, 4); // 4 Jan pasti di minggu pertama
    const dayOfWeek = simple.getDay() || 7; // 1 = Monday, ..., 7 = Sunday
    const isoWeekStart = new Date(simple);
    isoWeekStart.setDate(simple.getDate() - (dayOfWeek - 1)); // Monday of week 1

    // Geser ke minggu ke-n (dikurangi 1 karena minggu pertama sudah dihitung)
    const wednesday = new Date(isoWeekStart);
    wednesday.setDate(isoWeekStart.getDate() + (week - 1) * 7 + 0); // +2 = Rabu

    if (format === "input") {
      const yyyy = wednesday.getFullYear();
      const mm = String(wednesday.getMonth() + 1).padStart(2, "0");
      const dd = String(wednesday.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    } else if (format === "header") {
      return wednesday
        .toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
        .replace(" ", "-");
    }

    return "";
  }
  function getBatchRanges(rowData) {
    // console.log(" getBatchRanges input:", {
    //   Vendor: rowData.Vendor,
    //   Batch: rowData.Batch,
    //   ID: rowData.ID,
    //   weekly_data_keys: Object.keys(rowData.weekly_data || {}),
    // });
    const batchMap = {}; // { batch: { wws: [], dates: [] } }

    // Loop semua weekly_data
    if (!rowData.weekly_data) {
      console.warn(" Tidak ada weekly_data di rowData");
      return [];
    }

    for (const [ww, shipments] of Object.entries(rowData.weekly_data)) {
      if (!Array.isArray(shipments)) continue;

      shipments.forEach((shipment) => {
        const batch = shipment.batch;
        if (!batch) return;

        if (!batchMap[batch]) {
          batchMap[batch] = { wws: [], dates: [] };
        }

        // Extract WW number dari format "ww42"
        const wwNum = parseInt(ww.replace("ww", ""));
        batchMap[batch].wws.push(wwNum);
        batchMap[batch].dates.push(shipment.shipmentDate);
        // console.log(
        //   `    → Batch ${batch} sekarang punya WW: [${batchMap[batch].wws.join(
        //     ", ",
        //   )}]`,
        // );
      });
    }
    // console.log(" Final batchMap:", batchMap);
    // Format output dengan min-max WW
    const result = Object.entries(batchMap)
      .map(([batch, data]) => ({
        batch: parseInt(batch),
        minWW: Math.min(...data.wws),
        maxWW: Math.max(...data.wws),
        dates: data.dates,
      }))
      .sort((a, b) => a.batch - b.batch);
    // console.log(" Final Batch Ranges:", result);
    return result;
  }

  function determineBatchForWW(selectedWW, batchRanges) {
    if (!batchRanges || batchRanges.length === 0) {
      return {
        mode: "new",
        batch: null,
        availableBatches: [],
        message: "Belum ada batch. Silakan input batch secara manual.",
      };
    }

    // Cari apakah WW ada dalam range batch mana
    const exactBatch = batchRanges.find(
      (br) => selectedWW >= br.minWW && selectedWW <= br.maxWW,
    );

    if (exactBatch) {
      //  WW jatuh dalam satu batch → AUTO
      return {
        mode: "auto",
        batch: exactBatch.batch,
        availableBatches: [exactBatch.batch],
        message: `Auto-fill: Batch ${exactBatch.batch}`,
      };
    }

    //  WW tidak dalam range batch manapun → cek gap atau outlier
    const lastBatch = batchRanges[batchRanges.length - 1];
    const firstBatch = batchRanges[0];

    if (selectedWW < firstBatch.minWW) {
      //  WW sebelum batch pertama → tidak bisa
      return {
        mode: "auto",
        batch: firstBatch.batch,
        availableBatches: [firstBatch.batch],
        message: `Auto-fill: Batch ${firstBatch.batch} (WW ${selectedWW} sebelum batch pertama)`,
      };
    }

    if (selectedWW > lastBatch.maxWW) {
      //  WW setelah batch terakhir → SUGGEST batch terakhir
      return {
        mode: "suggest",
        batch: lastBatch.batch,
        availableBatches: [lastBatch.batch],
        message: `WW ${selectedWW} setelah batch terakhir. Auto-suggest: Batch ${lastBatch.batch}`,
      };
    }

    //  WW dalam gap antar batch → MANUAL SELECT
    const batchesBefore = batchRanges.filter((br) => br.maxWW < selectedWW);
    const batchesAfter = batchRanges.filter((br) => br.minWW > selectedWW);

    const availableBatches =
      batchesBefore.length > 0
        ? [
            batchesBefore[batchesBefore.length - 1].batch,
            ...batchesAfter.map((br) => br.batch),
          ]
        : batchesAfter.map((br) => br.batch);

    return {
      mode: "manual",
      batch: null,
      availableBatches: availableBatches,
      message: `WW ${selectedWW} di gap antara batch. Pilih: Batch ${availableBatches.join(
        " atau ",
      )}`,
    };
  }

  function getDocTypeFromDocNumber(docNumber) {
    if (!docNumber) return null;
    if (docNumber.includes("SPORD")) return "SPORD";
    if (docNumber.includes("SPBLK")) return "SPBLK";
    if (docNumber.includes("SPPLN")) return "SPPLN";
    return null;
  }

  function getWeekFromDate(shipmentDate) {
    if (!shipmentDate) return null;
    const date = new Date(shipmentDate + "T00:00:00Z");
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNum = Math.ceil(
      ((date - yearStart) / 86400000 + yearStart.getUTCDay() + 1) / 7,
    );
    return `ww${String(weekNum).padStart(2, "0")}`;
  }

  function validateBatchDateOrder(
    batchRanges,
    newBatch,
    newShipmentDate,
    currentShipmentDocNumber,
  ) {
    const newBatchData = batchRanges.find((br) => br.batch === newBatch);
    if (!newBatchData) return { valid: true, message: "OK" };

    const newDate = new Date(newShipmentDate);

    if (selectedRowData && selectedRowData.weekly_data) {
      const targetWeek = getWeekFromDate(newShipmentDate);
      const targetWeekData = selectedRowData.weekly_data[targetWeek];

      const docNumberToValidate =
        currentShipmentDocNumber || selectedRowData.DocNumber;

      // console.log("Validation context:", {
      //   targetWeek,
      //   currentShipmentDocNumber,
      //   docNumberToValidate,
      //   targetWeekHasData:
      //     Array.isArray(targetWeekData) && targetWeekData.length > 0,
      // });

      // Only check target week data, NOT plan-level
      if (Array.isArray(targetWeekData) && targetWeekData.length > 0) {
        const existingDocTypes = new Set(
          targetWeekData
            .map((item) => {
              if (item.isSpord) return "SPORD";
              return getDocTypeFromDocNumber(item.docNumber);
            })
            .filter((t) => t !== null),
        );

        const currentDocType = getDocTypeFromDocNumber(docNumberToValidate);

        // Only block if target week has DIFFERENT doc type
        if (
          existingDocTypes.size > 0 &&
          currentDocType &&
          !existingDocTypes.has(currentDocType)
        ) {
          const existingTypes = Array.from(existingDocTypes).join(" / ");
          return {
            valid: false,
            message: `${currentDocType} cannot be moved to ${targetWeek}. This week already has ${existingTypes}. Cannot mix SPORD + SPBLK + SPPLN.`,
          };
        }
      }
      // If target week is empty → ALLOW (no blocking)
    }

    // Batch date ordering validation
    const prevBatches = batchRanges.filter((br) => br.batch < newBatch);
    if (prevBatches.length > 0) {
      const latestPrevBatch = prevBatches[prevBatches.length - 1];
      const maxPrevDate = new Date(
        Math.max(...latestPrevBatch.dates.map((d) => new Date(d))),
      );

      if (newDate < maxPrevDate) {
        return {
          valid: false,
          message: `Batch ${newBatch} date (${newShipmentDate}) cannot be before Batch ${latestPrevBatch.batch} (${maxPrevDate.toISOString().split("T")[0]})`,
        };
      }
    }

    const nextBatches = batchRanges.filter((br) => br.batch > newBatch);
    if (nextBatches.length > 0) {
      const earliestNextBatch = nextBatches[0];
      const minNextDate = new Date(
        Math.min(...earliestNextBatch.dates.map((d) => new Date(d))),
      );

      if (newDate > minNextDate) {
        return {
          valid: false,
          message: `Batch ${newBatch} date (${newShipmentDate}) cannot be after Batch ${earliestNextBatch.batch} (${minNextDate.toISOString().split("T")[0]})`,
        };
      }
    }

    return { valid: true, message: "OK" };
  }

  function showWeekModal(
    rowData,
    week,
    batch,
    qty,
    shipmentDate,
    Closed,
    DocNumber,
    passedWeeklyDataForModal,
  ) {
    let normalizedWeek = week;
    const weekMatch = week.match(/ww(\d+)/i);
    if (weekMatch) {
      const weekNum = parseInt(weekMatch[1], 10);
      normalizedWeek = `ww${String(weekNum).padStart(2, "0")}`;
    }
    week = normalizedWeek;

    const normalizedWeeklyData = {};
    if (rowData.weekly_data && typeof rowData.weekly_data === "object") {
      for (const [ww, shipments] of Object.entries(rowData.weekly_data)) {
        const match = ww.match(/ww(\d+)/i);
        if (match) {
          const weekNum = parseInt(match[1], 10);
          const normalizedKey = `ww${String(weekNum).padStart(2, "0")}`;
          normalizedWeeklyData[normalizedKey] = shipments;
        }
      }
    }

    // Update rowData reference to use normalized keys
    if (Object.keys(normalizedWeeklyData).length > 0) {
      rowData.weekly_data = normalizedWeeklyData;
    }

    const planDocTypes = new Set();
    const planClosedStatuses = new Set();

    if (rowData.weekly_data && typeof rowData.weekly_data === "object") {
      for (const [ww, shipments] of Object.entries(rowData.weekly_data)) {
        if (Array.isArray(shipments)) {
          shipments.forEach((shipment) => {
            // Ambil doc type
            if (shipment.isSpord) {
              planDocTypes.add("SPORD");
            } else if (shipment.docNumber) {
              const docType = getDocTypeFromDocNumber(shipment.docNumber);
              if (docType) planDocTypes.add(docType);
            }

            // Ambil closed status
            if (shipment.closed !== undefined && shipment.closed !== null) {
              planClosedStatuses.add(shipment.closed);
            }
          });
        }
      }
    }

    const weeklyData =
      passedWeeklyDataForModal && passedWeeklyDataForModal.length > 0
        ? passedWeeklyDataForModal
        : rowData.weekly_data?.[week] || [];

    const $tbody = $("#shipmentBatchTable tbody");
    $tbody.empty();

    const batchRanges = getBatchRanges(rowData);

    const wwNum = parseInt(week.replace("ww", ""));
    const batchDetermine = determineBatchForWW(wwNum, batchRanges);

    let batchList = [];

    let displayDocNumber = rowData.DocNumber; // default fallback
    if (
      Array.isArray(weeklyData) &&
      weeklyData.length > 0 &&
      weeklyData[0].docNumber
    ) {
      displayDocNumber = weeklyData[0].docNumber;
    }

    if (Array.isArray(weeklyData) && weeklyData.length > 0) {
      weeklyData.forEach((item) => {
        const wwInfo = item.shipmentDate
          ? getWeekNumber(item.shipmentDate)
          : "";
        const rowDocNumber = item.docNumber || displayDocNumber || "-";
        const row = `
        <tr>
          <td class="text-center">${item.batch || "-"}</td>
          <td>
            <input type="number"
                   class="form-control qty-input"
                   name="qty_${item.batch}"
                   value="${item.qty}"
                   data-batch="${item.batch}"
                   data-shipment-id="${item.shipmentId}">
                   <small class="text-muted">(${formatQty(item.qty)})</small>
          </td>
          <td>
            <input type="date"
                   class="form-control date-input"
                   name="shipment_date_${item.batch}"
                   value="${item.shipmentDate}"
                   data-batch="${item.batch}"
                   data-shipment-id="${item.shipmentId}">
            <small class="form-text text-muted ww-info">${wwInfo}</small>
          </td>
          <td class="text-center">${rowDocNumber}</td>
        </tr>`;
        $tbody.append(row);
        batchList.push(item.batch);
      });
    } else {
      let selectedBatch = null;
      let showBatchSelector = false;
      let availableBatches = [];

      if (batchDetermine.mode === "auto" || batchDetermine.mode === "suggest") {
        selectedBatch = batchDetermine.batch;
      } else if (batchDetermine.mode === "manual") {
        showBatchSelector = true;
        availableBatches = batchDetermine.availableBatches;
      } else if (batchDetermine.mode === "new") {
        showBatchSelector = true;
        availableBatches = [1]; // User input manual
      }

      const autoShipmentDate = shipmentDate || "";
      const autoQty = qty || "";
      const wwInfo = autoShipmentDate ? getWeekNumber(autoShipmentDate) : "";

      if (showBatchSelector) {
        const batchOptions = availableBatches
          .map((b) => `<option value="${b}">${b}</option>`)
          .join("");

        const row = `
        <tr>
          <td class="text-center">
            <select class="form-control batch-selector" name="batch_select">
              <option value="">-- Pilih Batch --</option>
              ${batchOptions}
            </select>
          </td>
          <td>
            <input type="number"
                   class="form-control qty-input"
                   name="qty_new"
                   value="${autoQty}"
                   placeholder="Qty"
                   data-batch=""
                   data-shipment-id="">
          </td>
          <td>
            <input type="date"
                   class="form-control date-input"
                   name="shipment_date_new"
                   value="${autoShipmentDate}"
                   data-batch=""
                   data-shipment-id="">
            <small class="form-text text-muted ww-info">${wwInfo}</small>
          </td>
          <td class="text-center">${displayDocNumber}</td>
        </tr>`;

        $tbody.append(row);
        batchList.push("(select)");
      } else {
        const newRow = `
        <tr>
          <td class="text-center">${selectedBatch}</td>
          <td>
            <input type="number"
                   class="form-control qty-input"
                   name="qty_new"
                   value="${autoQty}"
                   placeholder="Qty"
                   data-batch="${selectedBatch}"
                   data-shipment-id="">
          </td>
          <td>
            <input type="date"
                   class="form-control date-input"
                   name="shipment_date_new"
                   value="${autoShipmentDate}"
                   data-batch="${selectedBatch}"
                   data-shipment-id="">
            <small class="form-text text-muted ww-info">${wwInfo}</small>
          </td>
          <td class="text-center">${displayDocNumber}</td>
        </tr>`;

        $tbody.append(newRow);
        batchList.push(selectedBatch);
      }
    }

    $("#weekModal .modal-week-label").text(week);

    $("#weekModal .modal-doc-number").text(displayDocNumber);
    $("#weekModal .modal-item-desc").text(rowData.ItemDesc);
    $("#weekModal .modal-group-plan").text(rowData.PlanGroupName);
    $("#weekModal .modal-batch-info").text(
      `${batchDetermine.message} ${
        batchList.length > 1 ? "| " + batchList.join(" & ") : ""
      }`,
    );

    const noBatch =
      !rowData.Batch || rowData.Batch === null || rowData.Batch === "";
    const readonly = noBatch;

    if (readonly) {
      $("#shipmentBatchTable input, #shipmentBatchTable select").css({
        backgroundColor: "#f8f9fa",
        cursor: "not-allowed",
      });
      if (readonly) {
        $("#weekModal .modal-batch-info").append(
          "<div class='text-danger mt-1'><b> Tidak bisa split karena belum memiliki Batch.</b></div>",
        );

        $("#saveChangesBtn").prop("disabled", true).css({
          opacity: 0.6,
          cursor: "not-allowed",
        });
      } else {
        $("#saveChangesBtn").prop("disabled", false).css({
          opacity: 1,
          cursor: "pointer",
        });
      }
    } else {
      $("#saveChangesBtn").prop("disabled", false).css({
        opacity: 1,
        cursor: "pointer",
      });
    }

    $("#weekModal").data("selectedWeek", week);
    $("#weekModal").data("batchRanges", batchRanges);
    $("#weekModal").data("planDocTypes", planDocTypes);
    $("#weekModal").data("planClosedStatuses", planClosedStatuses);

    //  Setup listeners
    setupDateChangeListeners();
    setupBatchSelectorListener(batchRanges);

    //  Show modal
    $("#weekModal").modal("show");
  }

  function setupBatchSelectorListener(batchRanges) {
    $(document).off("change", ".batch-selector");
    $(document).on("change", ".batch-selector", function () {
      const selectedBatch = $(this).val();
      const $row = $(this).closest("tr");

      if (!selectedBatch) return;

      $row.find(".qty-input").data("batch", selectedBatch);
      $row.find(".date-input").data("batch", selectedBatch);
    });
  }

  $(document).on("click", ".show-rows", function (e) {
    e.preventDefault();
    var val = parseInt($(this).data("val"), 10);

    if (!purchasePlanDT) {
      console.warn("DataTable belum diinisialisasi");
      return;
    }

    purchasePlanDT.page.len(val).draw();

    // Ubah teks tombol sesuai pilihan
    var label = val === -1 ? "All" : val;
    $("#btnShowRows").html(
      "Show Rows: " + label + ' <span class="caret"></span>',
    );
  });

  function getWeeklyColumnTargets() {
    const targets = [];

    // jumlah kolom statis sebelum weekly
    const fixedColumnsCount = getFixedColumnsCount();
    let columnIndex = fixedColumnsCount;

    // langsung loop 1–52 minggu
    for (let i = 1; i <= 52; i++) {
      targets.push(columnIndex);
      columnIndex++;
    }

    return targets;
  }

  function getFixedColumnsCount() {
    return 6;
  }
  // Function untuk update data DataTable
  function updatePurchasePlanDataTable(data) {
    if ($.fn.DataTable.isDataTable("#purchasePlanTable")) {
      const table = $("#purchasePlanTable").DataTable();
      table.clear();
      table.rows.add(data);
      table.draw();
    }
  }

  function updateYearDropdown() {
    let years = [];

    if (availableYears.length > 0) {
      years = availableYears;
    } else {
      // Fallback jika availableYears kosong
      console.warn(" availableYears kosong, extract dari allPurchasePlanData");

      if (
        Array.isArray(allPurchasePlanData) &&
        allPurchasePlanData.length > 0
      ) {
        const withDates = allPurchasePlanData.filter((d) => !!d.ShipmentDate);
        years = [
          ...new Set(
            withDates.map((d) => new Date(d.ShipmentDate).getFullYear()),
          ),
        ].sort((a, b) => b - a);
      } else {
        years = [new Date().getFullYear()];
      }
    }

    let yearOptions = `
    <option value="latest">-- Latest Week --</option>
    `;
    years.forEach((y) => {
      const selected = y == currentYearFilter ? "selected" : "";
      yearOptions += `<option value="${y}" ${selected}>${y}</option>`;
    });

    $("#year").html(yearOptions);
  }

  // Filter Modal Logic
  $("#btn-filter").on("click", function () {
    var modalHtml = `
    <div class="modal fade" id="filterModal" tabindex="-1" role="dialog" aria-labelledby="filterModalLabel">
      <div class="modal-dialog" role="document" style="margin-top: 10%;">
        <div class="modal-content">
          
          <div class="modal-header">
            <p style="font-weight:bold;float:left;font-size:16px;color:blue;">SEARCH</p>
            <button type="button" class="close" data-dismiss="modal">&times;</button>
          </div>

          <div class="modal-body" style="font-size:14px;">
            <div class="row">
              <div class="col-sm-2">
                <label class="control-label" style="font-weight:bold;">Item Desc</label>
              </div>
              <div class="col-sm-10">
                <input type="text" class="form-control" id="itemDesc" placeholder="Enter Item Description">
              </div>
            </div>

            <div class="row">
              <div class="col-sm-2">
                <label class="control-label" style="font-weight:bold;">Year</label>
              </div>
              <div class="col-sm-10">
                <select class="form-control" id="year">
                </select>
              </div>
            </div>

            <div class="row">
              <div class="col-sm-2">
                <label class="control-label" style="font-weight:bold;">Quarter</label>
              </div>
              <div class="col-sm-10">
                <select class="form-control" id="quarter">
                  <option value="">-- Pilih Quarter --</option>
                  <option value="Q1">Quarter 1</option>
                  <option value="Q2">Quarter 2</option>
                  <option value="Q3">Quarter 3</option>
                  <option value="Q4">Quarter 4</option>
                </select>
              </div>
            </div>

            <div class="row">
              <div class="col-sm-2">
                <label class="control-label" style="font-weight:bold;">ShipmentDate</label>
              </div>
              <div class="col-sm-4">
                <div class="input-group">
                  <input type="date" class="form-control dp" id="startDate" placeholder="Start Date">
                  <div class="input-group-addon">
                    <span class="glyphicon glyphicon-calendar"></span>
                  </div>
                </div>
              </div>
              <div class="col-sm-1" style="margin-top:4px;">to</div>
              <div class="col-sm-4">
                <div class="input-group">
                  <input type="date" style="position:relative; left:-13px" class="form-control dp" id="endDate" placeholder="End Date">
                  <div class="input-group-addon">
                    <span class="glyphicon glyphicon-calendar"></span>
                  </div>
                </div>
              </div>
            </div>

            <div class="row">
              <div class="col-sm-2">
                <label class="control-label" style="font-weight:bold;">Doc Number</label>
              </div>
              <div class="col-sm-10">
                <input type="text" class="form-control" id="docNumber" placeholder="Enter Doc Number">
              </div>
            </div>

            <div class="row">
              <div class="col-sm-2">
                <label class="control-label" style="font-weight:bold;">Vendor</label>
              </div>
              <div class="col-sm-10">
                <input type="text" class="form-control" id="vendor" placeholder="Search vendor...">
              </div>
            </div>

            <div class="row">
              <div class="col-sm-2">
                <label class="control-label" style="font-weight:bold;">Plan Group</label>
              </div>
              <div class="col-sm-10">
                <select class="form-control" id="planGroup">
                  <option value="">-- All Groups --</option>
                </select>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-primary" id="applyFilterBtn">Filter</button>
            <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
          </div>

        </div>
      </div>
    </div>
  `;

    // Append modal ke body
    $("body").append(modalHtml);
    //  Update dropdown setelah modal masuk ke DOM
    updateYearDropdown();
    // Event listener untuk perubahan quarter
    $("#quarter").on("change", function () {
      const selectedQuarter = $(this).val();
      const selectedYear = $("#year").val();
      const currentYear = new Date().getFullYear();
      const today = new Date();
      const todayString = today.toISOString().split("T")[0];

      // Reset date inputs
      $("#startDate").val("");
      $("#endDate").val("");

      if (selectedQuarter && selectedYear) {
        const quarterRanges = {
          Q1: { start: `${selectedYear}-01-01`, end: `${selectedYear}-03-31` },
          Q2: { start: `${selectedYear}-04-01`, end: `${selectedYear}-06-30` },
          Q3: { start: `${selectedYear}-07-01`, end: `${selectedYear}-09-30` },
          Q4: { start: `${selectedYear}-10-01`, end: `${selectedYear}-12-31` },
        };

        const range = quarterRanges[selectedQuarter];

        if (range) {
          const today = new Date();
          const todayString = today.toISOString().split("T")[0];
          const rangeStart = new Date(range.start);
          const rangeEnd = new Date(range.end);

          let maxEndDate = range.end;
          if (
            today >= rangeStart &&
            today <= rangeEnd &&
            today.getFullYear() === parseInt(selectedYear)
          ) {
            maxEndDate = todayString;
          }

          // Terapkan batas tanggal
          $("#startDate")
            .attr({ min: range.start, max: maxEndDate })
            .val(range.start);
          $("#endDate")
            .attr({ min: range.start, max: maxEndDate })
            .val(maxEndDate);
        }
      } else {
        $("#startDate, #endDate").removeAttr("min max").val("");
      }
    });

    // Event listener untuk memastikan end date tidak kurang dari start date
    $("#startDate").on("change", function () {
      const startDate = $(this).val();
      if (startDate) {
        $("#endDate").attr("min", startDate);

        // Jika end date sudah terisi dan kurang dari start date, reset end date
        const endDate = $("#endDate").val();
        if (endDate && endDate < startDate) {
          $("#endDate").val("");
        }
      }
    });

    // Optional: Event listener untuk validasi tambahan
    $("#endDate").on("change", function () {
      const endDate = $(this).val();
      const startDate = $("#startDate").val();

      if (startDate && endDate && endDate < startDate) {
        alert("End date tidak boleh kurang dari start date");
        $(this).val("");
      }
    });
    // Setup autocomplete untuk vendor
    function setupAutocomplete(selector, options = {}) {
      const defaultOptions = {
        url: BASE_URL + "scm/purchasing/purchase_plan_report/search_vendor",
        minLength: 2,
        delay: 300,
        dataIdAttribute: "vendor-id",
        labelField: "Description",
        valueField: "Description",
        idField: "ID",
        onSelect: null,
        onError: null,
        debug: false,
      };

      const config = Object.assign({}, defaultOptions, options);

      if ($(selector).hasClass("ui-autocomplete-input")) {
        $(selector).autocomplete("destroy");
      }

      $(selector).autocomplete({
        source: function (request, response) {
          $.ajax({
            url: config.url,
            type: "GET",
            dataType: "json",
            data: { term: request.term },
            success: function (data) {
              const mappedData = $.map(data, function (item) {
                return {
                  label: item[config.labelField],
                  value: item[config.valueField],
                  id: item[config.idField],
                };
              });
              response(mappedData);
            },
            error: function (xhr, status, error) {
              if (config.onError) config.onError(xhr, status, error);
              response([]);
            },
          });
        },
        select: function (event, ui) {
          $(selector).data(config.dataIdAttribute, ui.item.id);
          if (config.onSelect) config.onSelect(event, ui, ui.item);
          return true;
        },
        change: function (event, ui) {
          if (!ui.item) $(selector).removeData(config.dataIdAttribute);
        },
        minLength: config.minLength,
        delay: config.delay,
      });
      $(selector).autocomplete("widget").css("z-index", 2000);
    }

    // Pasang autocomplete pada vendor
    setupAutocomplete("#vendor", {
      debug: true,
      onSelect: function (event, ui) {
        // console.log("Vendor dipilih:", ui.item);
      },
    });

    // Populate PlanGroup dropdown dari data yang ada
    function populatePlanGroupDropdown() {
      const planGroups = new Map(); // Gunakan Map untuk avoid duplicates

      if (
        Array.isArray(allPurchasePlanData) &&
        allPurchasePlanData.length > 0
      ) {
        allPurchasePlanData.forEach((row) => {
          if (row.PlanGroupID && row.PlanGroupName) {
            planGroups.set(row.PlanGroupID, row.PlanGroupName);
          }
        });
      }

      // Sort by group name
      const sortedGroups = Array.from(planGroups.entries()).sort((a, b) =>
        a[1].localeCompare(b[1]),
      );

      let options = '<option value="">-- All Groups --</option>';
      sortedGroups.forEach(([id, name]) => {
        options += `<option value="${id}">${name}</option>`;
      });

      $("#planGroup").html(options);
    }
    populatePlanGroupDropdown();

    $("#itemDesc").val(currentItemDescriptionFilter);
    $("#planGroup").val(currentPlanGroupFilter);
    $("#quarter").val(currentQuarterFilter);
    if (currentQuarterFilter) {
      $("#quarter").trigger("change");
    }
    // Event modal muncul
    $("#filterModal").on("shown.bs.modal", function () {
      $("#itemDesc").trigger("focus");
    });

    // Event modal ditutup
    $("#filterModal").on("hidden.bs.modal", function () {
      $(this).remove();
    });

    // Tampilkan modal
    $("#filterModal")
      .modal({
        backdrop: "static",
        keyboard: true,
      })
      .modal("show");

    // Tombol Apply Filter
    $(document)
      .off("click", "#applyFilterBtn")
      .on("click", "#applyFilterBtn", function () {
        const itemDescription = $("#itemDesc").val();
        const selectedQuarter = $("#quarter").val();
        const selectedYear = $("#year").val();
        const vendorFilter = $("#vendor").val();
        const docNumberFilter = $("#docNumber").val();
        const vendorID = $("#vendor").data("vendor-id") || "";
        const planGroupFilter = $("#planGroup").val();

        // Handling untuk "Latest Week" option
        if (selectedYear === "latest") {
          currentYearFilter = "";
          currentQuarterFilter = "";
          currentShipmentDateStart = "";
          currentShipmentDateEnd = "";
          // PENTING: Assign filter lainnya dari input (jangan reset)
          currentItemDescriptionFilter = itemDescription || "";
          currentDocNumberFilter = docNumberFilter || "";
          currentVendorFilter = vendorFilter || "";
          currentVendorID = vendorID || "";
          currentPlanGroupFilter = planGroupFilter || "";
          alert("Menampilkan 52 minggu terakhir (latest week).");
          loadPurchasePlanData();
          $("#filterModal").modal("hide");
          return;
        }

        // ASSIGN FILTERS - INCLUDING PLAN GROUP
        currentYearFilter = selectedYear || "";
        currentItemDescriptionFilter = itemDescription || "";
        currentQuarterFilter = selectedQuarter || "";
        currentShipmentDateStart = $("#startDate").val() || "";
        currentShipmentDateEnd = $("#endDate").val() || "";
        currentDocNumberFilter = docNumberFilter || "";
        currentVendorFilter = vendorFilter || "";
        currentVendorID = vendorID || "";
        currentPlanGroupFilter = planGroupFilter || "";

        loadPurchasePlanData();
        $("#filterModal").modal("hide");
      });
  });

  // Helper: Cek apakah data stale (ada perubahan dari user lain)
  function validateDataNotStale(shipmentID, totalQtyImported) {
    // Cari di allPurchasePlanData yang SEDANG DITAMPILKAN
    const currentData = allPurchasePlanData.find(
      (r) => r.ShipmentID === shipmentID,
    );

    if (!currentData) {
      // Shipment tidak ada lagi di DB = data sudah dihapus user lain
      console.warn(
        ` ShipmentID ${shipmentID} tidak ada di DB sekarang (sudah dihapus user lain)`,
      );
      return {
        isValid: false,
        reason: `ShipmentID ${shipmentID} sudah dihapus dari database oleh user lain`,
      };
    }

    return { isValid: true };
  }

  function processImportedExcelData(jsonData) {
    if (!jsonData || jsonData.length < 4) {
      alert(" Format Excel tidak valid! Minimal 4 baris diperlukan.");
      return;
    }

    const baselineRecordCount = countTotalShipmentIds(baselinePurchasePlanData);
    const excelRecordCount = countShipmentIdsInExcel(jsonData);

    // Jika Excel punya records yang lebih sedikit dari baseline, berarti file tidak terbaru
    if (excelRecordCount < baselineRecordCount) {
      console.warn("  ALERT: Excel file tidak berisi data terbaru!");
      console.warn(
        `   Baseline has ${baselineRecordCount} records, Excel only has ${excelRecordCount}`,
      );
      alert(
        "  WARNING: This Excel file is NOT the latest export!\n\n" +
          `Database currently has ${baselineRecordCount} records,\n` +
          `but your Excel file only has ${excelRecordCount} records.\n\n` +
          "Please EXPORT the data again to get the latest version before importing.",
      );
      return;
    }

    // Baris 0 = ETD, Baris 1 = WW headers, Baris 2 = Dates
    const headerRow = jsonData[1]; // WW-xx labels
    const dataRows = jsonData.slice(3); // Mulai dari baris ke-4 (index 3)

    const vendorLookup = {};
    if (Array.isArray(allPurchasePlanData) && allPurchasePlanData.length > 0) {
      allPurchasePlanData.forEach((row) => {
        if (row.Vendor && row.VendorID) {
          // Map both exact case dan uppercase untuk case-insensitive lookup
          const vendorKey = row.Vendor.trim().toUpperCase();
          if (!vendorLookup[vendorKey]) {
            vendorLookup[vendorKey] = row.VendorID;
          }
        }
      });
      // console.log(" Vendor lookup created:", vendorLookup);
    }

    const weekColumns = [];
    for (let i = 7; i < headerRow.length; i++) {
      const wwLabel = (headerRow[i] || "").toString().trim();
      if (wwLabel && wwLabel.match(/WW\d{2}-\d{2}/i)) {
        weekColumns.push({
          index: i,
          label: wwLabel.toUpperCase(), // Normalize ke uppercase
          position: weekColumns.length, // Track order
        });
      }
    }

    // console.log(" Week columns found:", weekColumns.length, weekColumns);

    if (weekColumns.length === 0) {
      alert(" Tidak ada kolom WW yang ditemukan di file Excel!");
      return;
    }

    // Kumpulkan shipments yang akan di-update
    const shipmentChanges = [];

    dataRows.forEach((row, rowIdx) => {
      if (!row || row.length < 7) return;

      const shipmentID = parseInt(row[0]) || null; // A: _ShipmentID (hidden)
      const itemCode = (row[1] || "").toString().trim(); // B: _ItemCode (hidden)
      let vendorID = parseInt(row[2]) || 0; // C: _VendorID (hidden) - NEW!
      const rowHash = (row[3] || "").toString().trim(); // D: _RowHash (hidden)
      const vendor = (row[4] || "").toString().trim(); // E: Visible Vendor
      const itemDesc = (row[5] || "").toString().trim(); // F: Visible Item Desc
      const color = (row[6] || "").toString().trim(); // G: Visible Color

      if (vendorID === 0 && vendor) {
        const vendorKey = vendor.trim().toUpperCase();
        const lookedUpID = vendorLookup[vendorKey];
        if (lookedUpID) {
          vendorID = lookedUpID;
          // console.log(` VendorID lookup: "${vendor}" → ID ${vendorID}`);
        } else {
          console.warn(` Vendor "${vendor}" tidak ditemukan di lookup table`);
        }
      }

      if (!shipmentID) {
        // console.log(
        //   `\n Row ${rowIdx}: BARIS BARU TERDETEKSI - Akan membuat Purchase Plan baru (VendorID=${vendorID})`,
        // );

        // Validasi bahwa vendor dan itemDesc minimal ada
        if (!vendor || !itemDesc) {
          console.warn(
            ` Row ${rowIdx}: Vendor atau ItemDesc kosong untuk baris baru, skip`,
          );
          return;
        }

        // console.log(
        //   `\n Row ${rowIdx}: NEW PLAN - ${vendor} - ${itemDesc} (${color})`,
        // );

        const changedWeeks = []; // Array dengan mode detection

        weekColumns.forEach((wc) => {
          const qtyImported = parseInt(row[wc.index]) || 0;

          const fullWeekMatch = wc.label.match(/WW(\d{2})-(\d{2})/);
          const weekYear = fullWeekMatch
            ? 2000 + parseInt(fullWeekMatch[1])
            : selectedYear || new Date().getFullYear();
          const weekNum = fullWeekMatch ? parseInt(fullWeekMatch[2]) : null;

          let excelShipmentDate = null;
          if (weekNum) {
            try {
              const simple = new Date(weekYear, 0, 4); // 4 Jan pasti di minggu 1
              const dayOfWeek = simple.getDay() || 7; // 1 = Mon, 7 = Sun
              const isoWeekStart = new Date(simple);
              isoWeekStart.setDate(simple.getDate() - (dayOfWeek - 1)); // Monday of week 1

              // Calculate Monday of target week
              const monday = new Date(isoWeekStart);
              monday.setDate(isoWeekStart.getDate() + (weekNum - 1) * 7);

              // Format: YYYY-MM-DD
              const yyyy = monday.getFullYear();
              const mm = String(monday.getMonth() + 1).padStart(2, "0");
              const dd = String(monday.getDate()).padStart(2, "0");
              excelShipmentDate = `${yyyy}-${mm}-${dd}`;

              // console.log(` Week ${wc.label} → Monday: ${excelShipmentDate}`);
            } catch (e) {
              console.error(` Error calculating Monday for ${wc.label}:`, e);
            }
          }

          // Jika ada qty, tambahkan sebagai INSERT mode
          if (qtyImported > 0) {
            if (!excelShipmentDate) {
              console.warn(
                ` Warning: ${wc.label} tidak bisa hitung ShipmentDate! Fallback ke hari ini`,
              );
              const today = new Date();
              const yyyy = today.getFullYear();
              const mm = String(today.getMonth() + 1).padStart(2, "0");
              const dd = String(today.getDate()).padStart(2, "0");
              excelShipmentDate = `${yyyy}-${mm}-${dd}`;
            }

            changedWeeks.push({
              week: wc.label,
              qty_existing: 0,
              qty_imported: qtyImported,
              shipment_date_existing: null,
              shipment_date_imported: excelShipmentDate,
              batch_existing: null,
              mode: "insert",
              existingShipments: [],
            });

            // console.log(
            //   `   NEW SHIPMENT [insert]: ${wc.label} - imported: ${qtyImported}@${excelShipmentDate}`,
            // );
          } else {
            changedWeeks.push({
              week: wc.label,
              qty_existing: 0,
              qty_imported: 0,
              shipment_date_existing: null,
              shipment_date_imported: null,
              batch_existing: null,
              mode: "delete",
              existingShipments: [],
            });

            // console.log(`   NEW SHIPMENT [delete]: ${wc.label} - no qty`);
          }
        });

        // Jika tidak ada qty sama sekali, skip baris ini
        if (changedWeeks.length === 0) {
          console.warn(
            ` Row ${rowIdx}: Baris baru tapi tidak ada qty di minggu apapun, skip`,
          );
          return;
        }

        // Build change data untuk dikirim ke backend
        //  PENTING: Setiap week punya sourceShipmentData untuk konsistensi
        const changedWeeksWithSourceData = changedWeeks.map((weekChange) => ({
          ...weekChange,
          sourceShipmentData: {
            batch: 0,
            closed: 0,
            BlanketID: null,
            POID: null,
          },
        }));

        shipmentChanges.push({
          PurchasePlanID: null, // Null untuk indicator baris baru
          ShipmentID: null,
          Vendor: vendor,
          VendorID: vendorID, // NEW: Include vendor ID dari hidden column
          ItemDesc: itemDesc,
          Color: color,
          ItemCode: itemCode || null,
          ItemUnitID: null,
          Price: 0,
          PODateEst: null,
          Term: 90,
          BlanketID: null,
          POID: null,
          sourceShipmentData: {
            batch: 0,
            closed: 0,
          },
          changedWeeks: changedWeeksWithSourceData,
        });

        // console.log(
        //   ` Baris baru ditambahkan ke changes queue (VendorID=${vendorID})`,
        // );
        return; // Skip ke row berikutnya
      }

      // console.log(
      //   `\n Row ${rowIdx}: ShipmentID=${shipmentID}, ${vendor} - ${itemDesc} (${color})`,
      // );

      // Cari matching purchase plan dari tabel menggunakan ShipmentID
      let matchingRow = allPurchasePlanData.find(
        (r) => (r.ShipmentID || 0) === shipmentID,
      );

      //  FIX: If ShipmentID not found (happens after split), try fallback matching
      if (!matchingRow && itemCode && vendor) {
        const fallbackMatches = allPurchasePlanData.filter(
          (r) =>
            (r.ItemCode || "").trim() === itemCode.trim() &&
            (r.Vendor || "").trim() === vendor.trim() &&
            (r.ItemDesc || "").trim() === itemDesc.trim(),
        );

        if (fallbackMatches.length > 0) {
          matchingRow = fallbackMatches[0];
          // console.log(
          //   `✓ Found ${fallbackMatches.length} matches by ItemCode+Vendor`,
          //   fallbackMatches.map((m) => m.ShipmentID),
          // );
        }
      }

      if (!matchingRow) {
        console.warn(
          ` Row ${rowIdx}: Tidak ada match di database untuk ShipmentID=${shipmentID}`,
        );
        return;
      }

      let totalQtyImported = 0;
      weekColumns.forEach((wc) => {
        totalQtyImported += parseInt(row[wc.index]) || 0;
      });

      //  FIX: Skip stale check if we used fallback matching
      const usedFallbackMatch = !allPurchasePlanData.find(
        (r) => r.ShipmentID === shipmentID,
      );

      if (!usedFallbackMatch) {
        const staleCheckResult = validateDataNotStale(
          shipmentID,
          totalQtyImported,
        );
        if (!staleCheckResult.isValid) {
          console.error(`DATA STALE DETECTED: ${staleCheckResult.reason}`);
          alert(
            `❌ DATA HAS CHANGED (Race Condition Detected):\n\n${staleCheckResult.reason}`,
          );
          return;
        }
        // console.log(` ✓ Data masih fresh - lanjut proses`);
      } else {
        // console.log(
        //   ` ✓ Using fallback match - stale check skipped for split scenario`,
        // );
      }

      // console.log(" Found matching row - ShipmentID:", shipmentID);

      const existingByWeek = {}; // { "WW25-38": { totalQty: 400, shipments: [...], firstShipmentDate: "2025-..." }, ... }
      if (
        matchingRow.weekly_data &&
        typeof matchingRow.weekly_data === "object"
      ) {
        Object.keys(matchingRow.weekly_data).forEach((weekKey) => {
          const weekData = matchingRow.weekly_data[weekKey];
          if (Array.isArray(weekData) && weekData.length > 0) {
            //  HITUNG TOTAL QTY dari SEMUA shipments di minggu ini
            const totalQty = weekData.reduce(
              (sum, shipment) => sum + (parseInt(shipment.qty) || 0),
              0,
            );

            // Normalize weekKey ke WW format
            let wwLabel;
            if (weekKey.includes("-")) {
              wwLabel = weekKey.toUpperCase().replace(/^WW/, "WW");
              if (!wwLabel.startsWith("WW")) wwLabel = "WW" + wwLabel;
            } else {
              const weekNum = weekKey.replace(/\D/g, "");
              const matchingWWColumn = weekColumns.find((wc) => {
                const columnWeekNum = wc.label.match(/WW\d{2}-(\d{2})/)[1];
                return (
                  columnWeekNum === weekNum ||
                  columnWeekNum.padStart(2, "0") === weekNum.padStart(2, "0")
                );
              });
              wwLabel = matchingWWColumn
                ? matchingWWColumn.label
                : "WW" + weekNum.padStart(2, "0");
            }

            // SIMPAN: Total qty + semua shipment details + reference date
            existingByWeek[wwLabel] = {
              totalQty: totalQty,
              shipments: weekData,
              firstShipmentDate: weekData[0]?.shipmentDate || null,
              firstBatch: weekData[0]?.batch || null,
            };
          }
        });
      }

      const excelByWeek = {};
      weekColumns.forEach((wc) => {
        const qtyImported = parseInt(row[wc.index]) || 0;

        const weekMatch = wc.label.match(/WW(\d{2})-(\d{2})/);
        const weekYear = weekMatch ? 2000 + parseInt(weekMatch[1]) : null;
        const weekNum = weekMatch ? parseInt(weekMatch[2]) : null;

        let excelShipmentDate = null;
        if (weekNum && weekYear) {
          // Primary: gunakan getWednesdayOfWeek
          excelShipmentDate = getWednesdayOfWeek(weekYear, weekNum, "input");

          if (!excelShipmentDate || excelShipmentDate === "") {
            try {
              const simple = new Date(weekYear, 0, 4); // 4 Jan pasti di minggu 1
              const dayOfWeek = simple.getDay() || 7; // 1 = Mon, 7 = Sun
              const isoWeekStart = new Date(simple);
              isoWeekStart.setDate(simple.getDate() - (dayOfWeek - 1)); // Monday of week 1

              // Calculate Monday of target week
              const monday = new Date(isoWeekStart);
              monday.setDate(isoWeekStart.getDate() + (weekNum - 1) * 7);

              // Format: YYYY-MM-DD
              const yyyy = monday.getFullYear();
              const mm = String(monday.getMonth() + 1).padStart(2, "0");
              const dd = String(monday.getDate()).padStart(2, "0");
              excelShipmentDate = `${yyyy}-${mm}-${dd}`;

              // console.log(
              //   `  Manual calculate: ${wc.label} → ${excelShipmentDate}`,
              // );
            } catch (e) {
              console.error(` Error calculating date for ${wc.label}:`, e);
            }
          }
        }

        excelByWeek[wc.label] = {
          qty: qtyImported,
          shipmentDate: excelShipmentDate,
          weekNum: weekNum,
        };
      });

      // console.log(" Existing by week:", existingByWeek);
      // console.log(" Excel by week:", excelByWeek);

      // 3. Compare per week dan detect mode aksi
      let hasChanges = false;
      const changedWeeks = []; // Array dengan mode detection

      weekColumns.forEach((wc) => {
        const excelData = excelByWeek[wc.label];
        const excelQty = excelData.qty;
        const excelShipmentDate = excelData.shipmentDate;

        const existingData = existingByWeek[wc.label];
        const existingQty = existingData?.totalQty || 0;
        const existingShipmentDate = existingData?.firstShipmentDate || null;

        const hasExistingData =
          existingData !== undefined && existingData !== null;
        const isRealChange =
          excelQty !== existingQty && !(excelQty === 0 && !hasExistingData);

        if (isRealChange) {
          hasChanges = true;

          let mode = "";
          if (!hasExistingData && excelQty > 0) {
            // Excel ada data, database kosong → INSERT BARU
            mode = "insert";
          } else if (hasExistingData && excelQty === 0) {
            // Database ada data, Excel kosong → DELETE/ARCHIVE
            mode = "delete";
          } else if (
            excelShipmentDate === existingShipmentDate ||
            !excelShipmentDate ||
            !existingShipmentDate
          ) {
            // Shipment date sama atau tidak ada info → UPDATE SAME WEEK
            mode = "update_same";
          } else if (
            excelQty === existingQty &&
            excelShipmentDate !== existingShipmentDate
          ) {
            // Qty sama tapi tanggal berbeda → FULL MOVE (geser shipment)
            mode = "full_move";
          } else if (
            excelQty < existingQty &&
            excelShipmentDate !== existingShipmentDate
          ) {
            // Qty lebih kecil + tanggal berbeda → PARTIAL SPLIT
            mode = "partial_split";
          } else if (
            excelQty > existingQty &&
            excelShipmentDate !== existingShipmentDate
          ) {
            // Qty lebih besar + tanggal berbeda → OVERRIDE
            mode = "override";
          } else if (
            excelQty !== existingQty &&
            excelShipmentDate === existingShipmentDate
          ) {
            // Qty berbeda tapi tanggal sama → OVERWRITE QTY
            mode = "overwrite_qty";
          }

          changedWeeks.push({
            week: wc.label,
            qty_existing: existingQty,
            qty_imported: excelQty,
            shipment_date_existing: existingShipmentDate,
            shipment_date_imported: excelShipmentDate,
            batch_existing: existingData?.firstBatch || null,
            mode: mode,
            existingShipments: existingData?.shipments || [],
          });

          // console.log(
          //   `   CHANGE DETECTED [${mode}]: ${wc.label} - existing: ${existingQty}@${existingShipmentDate}, imported: ${excelQty}@${excelShipmentDate}`,
          // );
        }
      });

      // 4. Validation: Jika tidak ada perubahan sama sekali, skip shipment ini
      if (!hasChanges) {
        // console.log(" No changes for this shipment - will skip");
        return; // Skip ke row berikutnya
      }

      if (changedWeeks.length >= 2) {
        const deleteMode = changedWeeks.find((cw) => cw.mode === "delete");
        const insertMode = changedWeeks.find((cw) => cw.mode === "insert");

        // Jika ada delete & insert di week berbeda dengan qty yang sama
        if (
          deleteMode &&
          insertMode &&
          deleteMode.qty_existing === insertMode.qty_imported &&
          deleteMode.week !== insertMode.week
        ) {
          // console.log(
          //   ` DETECTED FULL_MOVE PATTERN (tPOPlan): ${deleteMode.week}(${deleteMode.qty_existing}) → ${insertMode.week}(${insertMode.qty_imported})`,
          // );

          let moveToDate = insertMode.shipment_date_imported;

          if (!moveToDate || moveToDate === "") {
            const insertWeekLabel = insertMode.week;
            const weekMatch = insertWeekLabel.match(/WW(\d{2})-(\d{2})/);

            if (weekMatch) {
              const weekYear = 2000 + parseInt(weekMatch[1]);
              const weekNum = parseInt(weekMatch[2]);

              try {
                const simple = new Date(weekYear, 0, 4);
                const dayOfWeek = simple.getDay() || 7;
                const isoWeekStart = new Date(simple);
                isoWeekStart.setDate(simple.getDate() - (dayOfWeek - 1));

                const monday = new Date(isoWeekStart);
                monday.setDate(isoWeekStart.getDate() + (weekNum - 1) * 7);

                const yyyy = monday.getFullYear();
                const mm = String(monday.getMonth() + 1).padStart(2, "0");
                const dd = String(monday.getDate()).padStart(2, "0");
                moveToDate = `${yyyy}-${mm}-${dd}`;

                // console.log(
                //   `  Calculated moveToDate from week label: ${insertWeekLabel} → ${moveToDate}`,
                // );
              } catch (e) {
                console.error(
                  ` Error calculating date from ${insertWeekLabel}:`,
                  e,
                );
              }
            }
          }

          deleteMode.mode = "full_move";
          deleteMode.week_move_to = insertMode.week;
          deleteMode.shipment_date_move_to = moveToDate;
          deleteMode.shipment_date_imported = null;

          const insertIdx = changedWeeks.indexOf(insertMode);
          changedWeeks.splice(insertIdx, 1);
        }
      }
      const shipmentDataWithWeekDetails = changedWeeks.map((weekChange) => {
        const existingShipmentInWeek = existingByWeek[weekChange.week];
        let sourceShipmentForThisWeek = {
          batch: matchingRow.Batch || 0,
          closed: matchingRow.Closed || 0,
          BlanketID: matchingRow.BlanketID || null,
          POID: matchingRow.POID || null,
          ItemID: matchingRow.ItemID || null,
          ItemUnitID: matchingRow.ItemUnitID || null,
        };
        if (
          existingShipmentInWeek &&
          existingShipmentInWeek.shipments &&
          existingShipmentInWeek.shipments.length > 0
        ) {
          const firstShipment = existingShipmentInWeek.shipments[0];
          sourceShipmentForThisWeek = {
            batch: firstShipment.batch || matchingRow.Batch || 0,
            closed:
              firstShipment.closed !== undefined
                ? firstShipment.closed
                : matchingRow.Closed || 0,
            BlanketID: firstShipment.BlanketID || matchingRow.BlanketID || null,
            POID: firstShipment.POID || matchingRow.POID || null,
            // PENTING: pakai ItemID/ItemUnitID milik shipment minggu ini,
            // bukan milik baris hasil grouping - karena satu baris bisa
            // menggabungkan beberapa ItemID/ItemUnitID berbeda (grouping
            // di frontend hanya berdasarkan Vendor+ItemDesc+Color).
            ItemID: firstShipment.itemID || matchingRow.ItemID || null,
            ItemUnitID:
              firstShipment.itemUnitID || matchingRow.ItemUnitID || null,
          };

          // console.log(
          //   `  Week ${weekChange.week}: Using sourceShipment data from existing shipment - closed=${sourceShipmentForThisWeek.closed}, BlanketID=${sourceShipmentForThisWeek.BlanketID}, POID=${sourceShipmentForThisWeek.POID}`,
          // );
        } else {
          if (matchingRow.BlanketID && !matchingRow.POID) {
            // Hanya Blanket, tanpa PO
            sourceShipmentForThisWeek.closed = 1;
            // console.log(
            //   `  Week ${weekChange.week}: No existing shipment, using BlanketID priority - closed=1 (BLANKET)`,
            // );
          } else if (matchingRow.BlanketID && matchingRow.POID) {
            sourceShipmentForThisWeek.closed = 1;
            // console.log(
            //   `  Week ${weekChange.week}: No existing shipment, found both BlanketID & POID - using closed=1 (BLANKET priority)`,
            // );
          } else if (!matchingRow.BlanketID && matchingRow.POID) {
            // Hanya PO, tanpa Blanket
            sourceShipmentForThisWeek.closed = 2;
            // console.log(
            //   `  Week ${weekChange.week}: No existing shipment, using POID only - closed=2 (PO)`,
            // );
          }
        }

        return {
          ...weekChange,
          sourceShipmentData: sourceShipmentForThisWeek,
        };
      });

      shipmentChanges.push({
        PurchasePlanID: matchingRow.PurchasePlanID,
        ShipmentID: shipmentID,
        Vendor: matchingRow.Vendor || vendor,
        ItemDesc: matchingRow.ItemDesc || itemDesc,
        Color: matchingRow.Color || color,
        ItemCode: matchingRow.ItemCode || itemCode,
        ItemUnitID: matchingRow.ItemUnitID || 1,
        Price: matchingRow.Price || 0,
        PODateEst: matchingRow.PODateEst || null,
        Term: matchingRow.Term || "",
        BlanketID: matchingRow.BlanketID || null,
        POID: matchingRow.POID || null,
        sourceShipmentData: {
          batch: matchingRow.Batch || 0,
          closed: matchingRow.Closed || 0,
        },
        // Changed weeks dengan mode detection - detail lengkap untuk backend logic
        //  PENTING: Setiap week punya sourceShipmentData yang akurat (bukan global)
        changedWeeks: shipmentDataWithWeekDetails,
      });
    });

    // console.log("\n Total shipments with changes:", shipmentChanges.length);
    // console.log(" Shipment changes:", shipmentChanges);

    if (shipmentChanges.length === 0) {
      alert(" No changes detected in Excel - all data matches the database!");
      return;
    }

    // Confirm sebelum update dengan rincian mode aksi
    let totalChangedCells = 0;
    const modeCount = {
      insert: 0,
      update_same: 0,
      full_move: 0,
      partial_split: 0,
      override: 0,
      overwrite_qty: 0,
      delete: 0,
    };

    shipmentChanges.forEach((sc) => {
      totalChangedCells += sc.changedWeeks.length;
      sc.changedWeeks.forEach((cw) => {
        if (modeCount[cw.mode] !== undefined) {
          modeCount[cw.mode]++;
        }
      });
    });

    let modeDetails = "";
    Object.entries(modeCount).forEach(([mode, count]) => {
      if (count > 0) {
        const modeLabel =
          {
            insert: " New Insert",
            update_same: " Overwrite Qty",
            full_move: " Move Shipment",
            partial_split: " Split Qty",
            override: " Override",
            overwrite_qty: " Update Qty",
            delete: " Delete",
          }[mode] || mode;
        modeDetails += `\n${modeLabel}: ${count}`;
      }
    });

    const confirmed = confirm(
      ` Will process ${shipmentChanges.length} shipment(s) with ${totalChangedCells} changes:\n${modeDetails}\n\nContinue?`,
    );
    if (!confirmed) {
      // console.log(" Import canceled by user");
      return;
    }

    // Send ke backend
    sendImportedDataToBackend(shipmentChanges);
  }

  function sendImportedDataToBackend(shipmentChanges) {
    // console.log(
    //   " Sending import changes to backend dengan mode detection...",
    //   shipmentChanges,
    // );

    const sanitizedChanges = shipmentChanges.map((change) => {
      return {
        ...change,
        changedWeeks: change.changedWeeks.map((week) => {
          return {
            ...week,
            shipment_date_imported: week.shipment_date_imported || null,
            shipment_date_existing: week.shipment_date_existing || null,
          };
        }),
      };
    });

    // Validate JSON stringify
    let jsonString;
    try {
      jsonString = JSON.stringify({ changes: sanitizedChanges });
      // console.log(" JSON stringified successfully, length:", jsonString.length);
      // console.log(" JSON preview:", jsonString.substring(0, 500));
    } catch (e) {
      console.error(" JSON stringify failed:", e);
      alert(" Error: Failed to prepare data - " + e.message);
      return;
    }

    $.ajax({
      url: BASE_URL + "scm/purchasing/purchase_plan_report/import_from_excel",
      type: "POST",
      contentType: "application/json",
      dataType: "json",
      processData: false,
      data: jsonString,
      success: function (response) {
        // console.log(" Response dari backend:", response);

        try {
          let res;
          // Handle jika response sudah JSON
          if (typeof response === "object") {
            res = response;
          } else {
            res = JSON.parse(response);
          }

          //  Tampilkan debug logs di console
          if (res.debug_logs && Array.isArray(res.debug_logs)) {
            res.debug_logs.forEach((log) => {
              if (log.includes("[ERROR]") || log.includes("[EXCEPTION]")) {
                console.error(log);
              } else if (log.includes("[WARN]")) {
                console.warn(log);
              } else {
                console.log(log);
              }
            });
          }

          if (res.status === "success") {
            let message = `  Import successful!\n`;

            // Tampilkan rincian hasil per mode
            if (res.results_by_mode) {
              const modes = res.results_by_mode;
              if (modes.insert) message += ` New Insert: ${modes.insert}\n`;
              if (modes.update_same)
                message += ` Overwrite: ${modes.update_same}\n`;
              if (modes.full_move) message += ` Move: ${modes.full_move}\n`;
              if (modes.partial_split)
                message += ` Split: ${modes.partial_split}\n`;
              if (modes.override) message += ` Override: ${modes.override}\n`;
              if (modes.overwrite_qty)
                message += ` Update Qty: ${modes.overwrite_qty}\n`;
              if (modes.delete) message += ` Delete: ${modes.delete}\n`;
            } else {
              // Fallback jika backend tidak return results_by_mode
              message += `\nShipments processed: ${res.created_shipments || res.total_processed || shipmentChanges.length}\n`;
            }

            if (res.skipped_shipments && res.skipped_shipments > 0) {
              message += `\nSkipped (no changes): ${res.skipped_shipments}\n`;
            }

            if (res.errors && res.errors.length > 0) {
              message += `\n Warnings:\n`;
              res.errors.slice(0, 3).forEach((err) => {
                message += `  - ${err}\n`;
              });
              if (res.errors.length > 3) {
                message += `  ... and ${res.errors.length - 3} more errors\n`;
              }
            }

            alert(message);
            // Reload data untuk refresh tampilan
            setTimeout(() => {
              loadPurchasePlanData();
            }, 800);
          } else {
            alert(" " + (res.message || "Import failed"));
            console.error("Backend error details:", res);
          }
        } catch (e) {
          console.error("Error parsing response:", e);
          alert(" Error parsing server response: " + e.message);
        }
      },
      error: function (xhr, status, error) {
        console.error(" AJAX Error:", status, error);
        console.error("Response text:", xhr.responseText);
        console.error("Status code:", xhr.status);

        let errorMsg = "Error: ";
        if (xhr.status === 400) {
          errorMsg += "Bad request - data format invalid";
        } else if (xhr.status === 500) {
          errorMsg += "Server error - check logs";
        } else {
          errorMsg += error || "Unknown error";
        }

        //  Tampilkan debug logs bahkan pada error
        try {
          const res = JSON.parse(xhr.responseText);
          if (res.debug_logs && Array.isArray(res.debug_logs)) {
            res.debug_logs.forEach((log) => {
              console.error(log);
            });
          }
          if (res.message) {
            errorMsg = res.message;
          }
        } catch (e) {
          if (xhr.responseText && xhr.responseText.length < 200) {
            errorMsg = xhr.responseText;
          }
        }

        alert(" " + errorMsg);
      },
    });
  }

  function initializePlanGroupSelect2() {
    const selectElement = $("#groupNameInput");

    if (typeof jQuery.fn.select2 === "undefined") {
      console.error("Select2 library is not loaded!");
      alert("Error: Select2 library is not loaded. Please refresh the page.");
      return;
    }

    if (selectElement.hasClass("select2-hidden-accessible")) {
      selectElement.select2("destroy");
    }

    $.ajax({
      url: BASE_URL + "scm/purchasing/purchase_plan_report/get_plan_groups",
      type: "GET",
      dataType: "json",
      success: function (response) {
        if (response.status === "success") {
          // Initialize select2 dengan data
          selectElement.select2({
            data: response.data,
            placeholder: "Select a group",
            allowClear: true,
            width: "100%",
            dropdownParent: $("#groupingModal"),
            minimumResultsForSearch: 0,
          });

          selectElement.on("select2:open", function () {
            setTimeout(function () {
              const searchField = document.querySelector(
                ".select2-container--open .select2-search__field",
              );
              if (searchField) {
                searchField.focus();
              }
            }, 100);
          });
        } else {
          console.error("Failed to load plan groups:", response.message);
          alert("Failed to load plan groups data");
        }
      },
      error: function (xhr, status, error) {
        console.error("Error loading plan groups:", error);
        alert("Error loading plan groups: " + error);
      },
    });
  }

  $("#groupingModal").on("show.bs.modal", function () {
    // Reset select2 value
    $("#groupNameInput").val(null).trigger("change");

    setTimeout(function () {
      initializePlanGroupSelect2();
    }, 100);
  });

  $(document)
    .off("click", "#saveGroupingBtn")
    .on("click", "#saveGroupingBtn", function () {
      const selectedGroupID = $("#groupNameInput").val();
      const selectedGroupText =
        $("#groupNameInput").select2("data")[0]?.text || "";

      if (!selectedGroupID) {
        alert("Please select a group");
        return;
      }

      if (selectedPlanIDs.length === 0) {
        alert("No plans selected");
        return;
      }

      $.ajax({
        url:
          BASE_URL + "scm/purchasing/purchase_plan_report/save_plan_grouping",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify({
          group_id: selectedGroupID,
          plan_ids: selectedPlanIDs,
        }),
        success: function (response) {
          try {
            const res = JSON.parse(response);
            if (res.status === "success") {
              alert("Grouping saved successfully!");
              $("#groupingModal").modal("hide");
              loadPurchasePlanData(); // Reload data
              selectedPlanIDs = []; // Reset selection
            } else {
              alert("Error: " + (res.message || "Failed to save grouping"));
            }
          } catch (e) {
            alert("Grouping saved but response parsing failed");
            $("#groupingModal").modal("hide");
            loadPurchasePlanData();
            selectedPlanIDs = [];
          }
        },
        error: function (xhr, status, error) {
          alert("Error saving grouping: " + error);
          console.error("Error:", xhr.responseText);
        },
      });
    });
});
