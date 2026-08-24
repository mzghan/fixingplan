// Simpan hasil summary global supaya bisa dipakai event handler
let aggregatedSummary = {};
var kumpulanDataTableKiriKanan = [];
let rowCounter = 0; // global
let lastSelectedVendorId = null;
let lastSelectedRowId = 0;
const lastSelectedBatchByVendor = {};
let jumlahRowTableKiri = 0;
let rowCounterKiri = 0;
let currentActiveRowId = null;
let currentDisplayedShipmentDate = "";
let activeRows = 0;
let globalPaymentCalcData = [];
let wwDataByYear = {}; // cache: { 2025: [...] }
let wwOptionsHTMLByYear = {};
let globalCalcCache = [];
let isCalculatePaymentClicked = false; // Flag untuk track apakah calculatePayment sudah diklik

$(function () {
  $("#tableKanan").html("");

  $("#deldocreff").css("pointer-events", "none");
  $("#deldocreff").attr("disabled", "disabled");
  let vendorMap = {}; // id -> nama vendor, diisi bertahap saat vendor dipilih di dropdown
  let allTableTengahData = [];
  let allTableKiriData = [];
  let kumpulanDataTableKiriKanan = [];
  let docDate = $("#DocDate").val();
  let itemDesc = $("#ItemDesc").val();

  $("#DocDate").on("change", function () {
    docDate = $("#DocDate").val();
    itemDesc = $("#ItemDesc").val();
    loadCurrency();
  });
  $("#ItemDesc").on("change", function () {
    itemDesc = $("#ItemDesc").val();
  });
  function addDecimal(value) {
    if (value === null || value === undefined) return "0";

    // Convert ke number
    let num = parseFloat(value);
    if (isNaN(num)) num = 0;

    // Format: 1,234.00 atau sesuai jumlah decimal
    return num.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  $(".input-numeric").focusout(function () {
    var val = parseFloat($(this).val().replace(/,/g, ""));
    val = isNaN(val) ? 0 : val;

    var rate = parseFloat($("#rate").val().replace(/,/g, ""));
    rate = isNaN(rate) ? 1 : rate;

    if ($(this).attr("id") == "rate") {
      $.each(curr, function (index, value) {
        if (value.id == $("#currency").val()) {
          if (
            value.originalrate - value.ratespread > rate ||
            value.originalrate + value.ratespread < rate
          ) {
            curr[index].currentrate = value.originalrate;
            alert(
              value.code +
                " only " +
                (value.originalrate - value.ratespread) +
                " - " +
                (value.originalrate + value.ratespread),
            );
            $("#rate").val(addDecimal(value.originalrate));
          } else {
            curr[index].currentrate = rate;
            $("#rate").val(addDecimal(rate));
          }
        }
      });
    } else {
      $(this).val(addDecimal(val));
    }
  });
  // kalau currency berubah, ambil kurs
  $("#currency").on("change", function () {
    let currID = $(this).val();
    let docDate = $("#DocDate").val();

    if (currID && docDate) {
      getDataKurs(currID, docDate);
    } else {
      console.warn("Currency change ignored (currID/docDate empty)");
    }
  });

  $(document).on("change", ".shipment-year-field", function () {
    const year = $(this).val(); // ex: "2025"
    const $row = $(this).closest("tr");
    const $wwSelect = $row.find(".ww-field");
    const rowId = $row.attr("data-rowid");

    // Update data model dengan shipment year baru
    if (rowId) {
      const rowData = allTableTengahData.find((item) => item.rowId === rowId);
      if (rowData) {
        rowData.shipmentYear = year || "";
        // Clear WW dan shipmentDate saat year berubah
        if (!year) {
          rowData.ww = "";
          rowData.shipmentDate = "";
        }
      }
    }

    if (!year) {
      $wwSelect.html('<option value="">-- Pilih WW --</option>');
      $row.find(".shipment-date-field").val("");
      if ($wwSelect.hasClass("selectpicker")) {
        $wwSelect.selectpicker("refresh");
      }
      updateDuplicateButtonVisibility();
      return;
    }

    loadWWByYear(year).then(function () {
      renderWWDropdown($wwSelect, year);
      // Update visibility button duplicate setelah shipment year berubah
      updateDuplicateButtonVisibility();
    });
  });

  function getDataKurs(currID, docDate) {
    $.ajax({
      url:
        base_url +
        "purchasing/purchase_order_plan/getDataKursByDate/" +
        currID +
        "/" +
        docDate,
      type: "GET",
      success: function (res) {
        $("#rate").val(addDecimal(res));
      },
    });
  }
  function loadCurrency() {
    let docDate = $("#DocDate").val() || new Date().toISOString().split("T")[0];
    $.ajax({
      url:
        base_url + "purchasing/purchase_order_plan/getCurrencyList/" + docDate,
      type: "GET",
      dataType: "json",
      success: function (res) {
        let $currency = $("#currency");
        $currency.empty();

        $.each(res, function (i, item) {
          $currency.append(
            `<option value="${item.id}">${item.code}-${item.desc}</option>`,
          );
        });

        $currency.select2();

        // Set default ke IDR atau currency pertama
        let defaultCurr = res.find((c) => c.code === "IDR") || res[0];
        if (defaultCurr) {
          $currency.val(defaultCurr.id).trigger("change");

          // langsung ambil kurs untuk default currency
          getDataKurs(defaultCurr.id, docDate);
        }
      },
    });
  }

  $(document).ready(function () {
    loadCurrency();
    loadShipmentYears();
  });

  class dataClassTableKiriKanan {
    constructor() {
      this.namaVendor = "";
      this.paymentDate = [];
      this.notes = [];
      this.percent = [];
      this.formValue = [];
      this.alert = [];
      this.termDays = [];
      this.OACredit = [];
      this.vendorId = null;
      this.batch = null;
      this.totalAmount = 0;
    }
  }
  const vendorBatchToKiriKananIndexMap = new Map();

  // Vendor dropdown: select2 remote search. Server return max 5 vendor saat
  // dropdown dibuka pertama kali tanpa keyword, lalu search ke server saat user ngetik.
  // Endpoint (dibuat di langkah controller/model): GET .../get_vendor_search?q=&page=
  // Response: { results: [{ id, text }], pagination: { more: bool } }
  function initVendorSelect2($select, defaultVendorId) {
    $select.html("<option></option>").select2({
      placeholder: "-- Pilih Vendor --",
      minimumInputLength: 0,
      ajax: {
        url: BASE_URL + "scm/purchasing/purchase_order_plan/get_vendor_search",
        dataType: "json",
        delay: 300,
        data: function (params) {
          return { q: params.term || "", page: params.page || 1 };
        },
        processResults: function (data, params) {
          params.page = params.page || 1;
          (data.results || []).forEach(function (vendor) {
            vendorMap[vendor.id] = vendor.text;
          });
          return {
            results: data.results || [],
            pagination: { more: !!(data.pagination && data.pagination.more) },
          };
        },
        cache: true,
      },
    });

    if (defaultVendorId) {
      const defaultVendorName =
        vendorMap[defaultVendorId] || String(defaultVendorId);
      const preselected = new Option(
        defaultVendorName,
        defaultVendorId,
        true,
        true,
      );
      $select.append(preselected).trigger("change");
    }
  }

  function formatToIdr(number) {
    const num = Number(number);
    if (isNaN(num)) return "0.00";

    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2, // selalu ada .00
      maximumFractionDigits: 2,
    }).format(num);
  }
  // Fungsi untuk mengubah format Indonesia ke angka murni
  function parseIndonesianNumber(formattedNumber) {
    if (!formattedNumber) return 0;

    // Hapus pemisah ribuan (titik) dan ganti koma desimal dengan titik
    return (
      parseFloat(
        formattedNumber.replace(/,/g, ""), // Ganti koma dengan titik (desimal)
      ) || 0
    );
  }

  // Fungsi untuk memformat angka ke format Indonesia
  function formatIndonesianNumber(number) {
    const num = Number(number);
    if (isNaN(num)) return "0.00";

    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  }

  // Item dropdown: select2 remote search, sama pola dengan vendor.
  // Endpoint (dibuat di langkah controller/model): GET .../get_item_search?q=&page=
  // Response: { results: [{ id, text, code, itemunitid, unitname }], pagination: { more } }
  function initItemSelect2($select, defaultItem) {
    $select.html("<option></option>").select2({
      placeholder: "-- Pilih Item --",
      minimumInputLength: 0,
      ajax: {
        url: BASE_URL + "scm/purchasing/purchase_order_plan/get_item_search",
        dataType: "json",
        delay: 300,
        data: function (params) {
          return { q: params.term || "", page: params.page || 1 };
        },
        processResults: function (data, params) {
          params.page = params.page || 1;
          return {
            results: data.results || [],
            pagination: { more: !!(data.pagination && data.pagination.more) },
          };
        },
        cache: true,
      },
    });

    // select2:select selalu ter-trigger sebelum event "change" milik <select> asli,
    // jadi data-code/itemunitid/unitname sudah tersedia saat handler "change" lain baca .data()
    $select.on("select2:select", function (e) {
      const data = e.params.data || {};
      $(this)
        .find("option:selected")
        .attr("data-code", data.code || "")
        .attr("data-itemunitid", data.itemunitid || "")
        .attr("data-unitname", data.unitname || "");
    });

    if (defaultItem && defaultItem.id) {
      const opt = new Option(defaultItem.text, defaultItem.id, true, true);
      $(opt)
        .attr("data-code", defaultItem.code || "")
        .attr("data-itemunitid", defaultItem.itemunitid || "")
        .attr("data-unitname", defaultItem.unitname || "");
      $select.append(opt).trigger("change");
    }
  }
  function loadColorOptions() {
    return $.ajax({
      url: BASE_URL + "scm/purchasing/purchase_order_plan/get_color_list",
      type: "GET",
      dataType: "json",
    })
      .done(function (data) {
        colorData = Array.isArray(data) ? data : [];

        // Build HTML-nya sekali
        colorOptionsHTML = '<option value="">-- Pilih Warna --</option>';
        colorData.forEach(function (color) {
          colorOptionsHTML += `
          <option value="${color.AttributeValue}" data-colorid="${color.AttributeID}">
            ${color.AttributeValue}
          </option>`;
        });
      })
      .fail(function (jqXHR, textStatus, errorThrown) {
        console.error("Error when load data colour:", textStatus, errorThrown);
      });
  }

  // fungsi untuk render dropdown dari array colorData
  function renderColorDropdown($select) {
    let html = '<option value="">-- Pilih Warna --</option>';
    colorData.forEach((color) => {
      html += `
      <option value="${color.AttributeValue}" data-colorid="${color.AttributeID}">
        ${color.AttributeValue}
      </option>`;
    });
    $select.html(html);
  }
  function loadShipmentYears() {
    return $.ajax({
      url: base_url + "purchasing/purchase_order_plan/get_calendar_years",
      type: "GET",
      dataType: "json",
    })
      .done(function (res) {
        yearData = Array.isArray(res) ? res : [];

        yearData.sort((a, b) => {
          if (!a.CY || !b.CY) return 0;

          const yearA = parseInt(a.CY.slice(-4), 10);
          const yearB = parseInt(b.CY.slice(-4), 10);

          return yearB - yearA; // DESC
        });

        yearOptionsHTML = '<option value="">-- Pilih Tahun --</option>';

        yearData.forEach((r, idx) => {
          if (!r.CY) return;

          // ambil 4 digit terakhir → 2025
          const yearNum = r.CY.slice(-4);

          yearOptionsHTML += `
    <option value="${yearNum}">
      ${yearNum}
    </option>`;
        });
      })
      .fail(function (xhr, status, error) {
        console.error("AJAX get_calendar_years FAILED", {
          status,
          error,
          response: xhr.responseText,
        });
      });
  }

  function renderYearDropdown($select) {
    if (!yearOptionsHTML) {
      return;
    }

    $select.html(yearOptionsHTML);

    if ($select.hasClass("selectpicker")) {
      $select.selectpicker("refresh");
    }
  }
  function loadWWByYear(year) {
    // kalau sudah pernah load, jangan AJAX lagi
    if (wwOptionsHTMLByYear[year]) {
      return $.Deferred().resolve().promise();
    }

    return $.ajax({
      url: base_url + "purchasing/purchase_order_plan/get_ww_by_year",
      type: "GET",
      dataType: "json",
      data: {
        cy: "CY" + year, // sesuai controller
      },
    })
      .done(function (res) {
        const wwData = Array.isArray(res) ? res : [];
        wwDataByYear[year] = wwData;

        // build HTML SEKALI per year
        let html = '<option value="">-- Pilih WW --</option>';

        wwData.forEach((r, idx) => {
          if (!r.WW) return;

          html += `
          <option value="${r.WW}">
            ${r.WW}
          </option>`;
        });

        wwOptionsHTMLByYear[year] = html;
      })
      .fail(function (xhr, status, error) {
        console.error("AJAX get_ww_by_year FAILED", {
          year,
          status,
          error,
          response: xhr.responseText,
        });
      });
  }

  function renderWWDropdown($select, year) {
    if (!year || !wwOptionsHTMLByYear[year]) {
      $select.html('<option value="">-- Pilih WW --</option>');

      if ($select.hasClass("selectpicker")) {
        $select.selectpicker("refresh");
      }
      return;
    }

    $select.html(wwOptionsHTMLByYear[year]);

    if ($select.hasClass("selectpicker")) {
      $select.selectpicker("refresh");
    }
  }

  $(document).on("change", ".blanket-est-input", function () {
    const newVal = $(this).val();
    const tr = $(this).closest("tr");
    const rowId = tr.data("rowid");

    const [vendorId, ...rest] = rowId.split("-");
    const secondPart = rest.join("-"); // Handle shipmentDate yang mengandung "-"

    // Deteksi apakah batch atau shipmentDate
    let groupKey;
    let batch = 0;
    let shipmentDateKey = "";

    // Cek apakah secondPart adalah angka (batch) atau tanggal (shipmentDate)
    if (/^\d+$/.test(secondPart)) {
      // secondPart adalah angka murni = batch
      groupKey = `batch-${secondPart}`;
      batch = parseInt(secondPart);
    } else {
      // secondPart adalah tanggal = shipmentDate
      groupKey = `date-${secondPart}`;
      shipmentDateKey = secondPart;
    }

    if (aggregatedSummary[vendorId] && aggregatedSummary[vendorId][groupKey]) {
      aggregatedSummary[vendorId][groupKey].blanketEst = newVal;
    }

    // === VALIDASI: Cari PO Date Est paling awal untuk vendor ini ===
    let earliestPoDateEst = null;
    let matchedRows = [];

    $("#tableTengah tr").each(function () {
      const $row = $(this);
      const rVendor = parseInt($row.find(".vendorSelector").val()) || 0;
      const rBatch = parseInt($row.find(".batch-field").val()) || 0;
      const rShipmentDate = $row.find(".shipment-date-field").val() || "";
      const rPoDateEst = $row.find(".po-date-est-field").val();

      let isMatch = false;

      if (rVendor === parseInt(vendorId)) {
        if (batch > 0) {
          // Kita punya batch, cari yang batch-nya sama
          isMatch = rBatch === batch;
        } else if (shipmentDateKey) {
          // Kita punya shipmentDate, cari yang shipmentDate-nya sama
          isMatch = rShipmentDate === shipmentDateKey;
        } else {
          // Tidak ada batch/shipmentDate, match semua row vendor ini
          isMatch = true;
        }
      }

      if (isMatch && rPoDateEst) {
        matchedRows.push({ rVendor, rBatch, rShipmentDate, rPoDateEst });
        const poDate = new Date(rPoDateEst);
        if (!earliestPoDateEst || poDate < earliestPoDateEst) {
          earliestPoDateEst = poDate;
        }
      }
    });

    // === VALIDASI: Blanket Est tidak boleh lebih dari PO Date Est ===
    if (earliestPoDateEst && newVal) {
      const selectedDate = new Date(newVal);

      if (selectedDate > earliestPoDateEst) {
        const earliestDateStr = earliestPoDateEst.toISOString().split("T")[0];
        alert(
          `Blanket Estimated Date cannot be later than PO Date Est!\n\n` +
            `Select Date: ${newVal}\n` +
            `PO Date Est Earlier: ${earliestDateStr}\n\n` +
            `Date will be returned to ${earliestDateStr}`,
        );

        // Kembalikan ke tanggal PO Date Est paling awal
        $(this).val(earliestDateStr);

        // PENTING: Update aggregatedSummary dengan nilai yang BENAR (dari earliest)
        if (
          aggregatedSummary[vendorId] &&
          aggregatedSummary[vendorId][groupKey]
        ) {
          aggregatedSummary[vendorId][groupKey].blanketEst = earliestDateStr;
        }

        // Update kumpulanDataTableKiriKanan berdasarkan vendorId + batch/shipmentDate match
        const targetObj = kumpulanDataTableKiriKanan.find((d) => {
          if (parseInt(d.vendorId) !== parseInt(vendorId)) return false;

          if (batch > 0) {
            // Match berdasarkan batch
            return d.batch === batch;
          } else if (shipmentDateKey) {
            // Match berdasarkan shipmentDate
            return d.shipmentDate === shipmentDateKey;
          }
          return false;
        });
        if (targetObj) {
          targetObj.blanketEst = earliestDateStr;
        } else {
          console.warn(
            `targetObj not found in kumpulanDataTableKiriKanan for vendorId:${vendorId}, batch:${batch}, shipmentDate:${shipmentDateKey}`,
          );
        }

        // Update data button
        tr.find(".view-summary-details-btn").attr(
          "data-blanketestdate",
          earliestDateStr,
        );
        return;
      }
    }

    const targetObj = kumpulanDataTableKiriKanan.find((d) => {
      if (parseInt(d.vendorId) !== parseInt(vendorId)) return false;

      if (batch > 0) {
        // Match berdasarkan batch
        return d.batch === batch;
      } else if (shipmentDateKey) {
        // Match berdasarkan shipmentDate
        return d.shipmentDate === shipmentDateKey;
      }
      return false;
    });
    if (targetObj) {
      targetObj.blanketEst = newVal;
    } else {
      console.warn(
        `targetObj not found in kumpulanDataTableKiriKanan for vendorId:${vendorId}, batch:${batch}, shipmentDate:${shipmentDateKey}`,
      );
    }

    // Update data button (opsional)
    tr.find(".view-summary-details-btn").attr("data-blanketestdate", newVal);
  });

  function updateTableKiriSummary() {
    const $tableBody = $(".tableKiri");
    const $totalDisplay = $(".tbodyTotal");

    // **PENTING: Simpan aggregatedSummary LAMA sebelum di-rebuild**
    // Agar blanketEst yang sudah diinput tidak hilang saat key berubah
    const oldAggregatedSummary = JSON.parse(JSON.stringify(aggregatedSummary));

    aggregatedSummary = {};
    let totalOverallSum = 0;

    //Agregasi data per vendor dan batch/shipmentDate
    allTableTengahData.forEach((rowData) => {
      const vendorId = parseInt(rowData.vendor) || 0;
      const batch = parseInt(rowData.batch) || 0;
      const shipmentDate = rowData.shipmentDate || "";
      const qty = parseFloat(rowData.qty) || 0;
      const price = parseFloat(rowData.price) || 0;
      const subtotal = qty * price;

      //Tentukan key berdasarkan batch atau shipmentDate
      let groupKey;
      if (batch > 0) {
        groupKey = `batch-${batch}`;
      } else if (shipmentDate) {
        groupKey = `date-${shipmentDate}`;
      } else {
        return; // Skip jika keduanya kosong
      }

      if (!aggregatedSummary[vendorId]) {
        aggregatedSummary[vendorId] = {};
      }

      if (!aggregatedSummary[vendorId][groupKey]) {
        // **STEP 1: Coba ambil blanketEst dari oldAggregatedSummary (preserved)**
        let preservedBlanketEst = "";
        if (
          oldAggregatedSummary[vendorId] &&
          oldAggregatedSummary[vendorId][groupKey]
        ) {
          preservedBlanketEst =
            oldAggregatedSummary[vendorId][groupKey].blanketEst || "";
        }

        // **STEP 2: Jika tidak ada di oldAggregatedSummary, cari dari kumpulanDataTableKiriKanan**
        let blanketEstFromData = "";
        if (!preservedBlanketEst) {
          const existing = kumpulanDataTableKiriKanan.find(
            (item) =>
              String(item.vendorId) === String(vendorId) &&
              ((item.batch && `batch-${item.batch}` === groupKey) ||
                (!item.batch && `date-${item.shipmentDate}` === groupKey)),
          );
          blanketEstFromData = existing ? existing.blanketEst : "";
        }

        // **STEP 3: Gunakan preserved value, fallback ke data yang dicari**
        const finalBlanketEst = preservedBlanketEst || blanketEstFromData || "";

        aggregatedSummary[vendorId][groupKey] = {
          batch: batch,
          shipmentDate: shipmentDate,
          total: 0,
          blanketEst: finalBlanketEst,
        };

        if (preservedBlanketEst) {
        } else if (blanketEstFromData) {
        } else {
        }
      }

      aggregatedSummary[vendorId][groupKey].total += subtotal;
      totalOverallSum += subtotal;
    });

    //Update kumpulanDataTableKiriKanan dengan data terpilih
    updateKumpulanDataTableKiriKanan();

    //Render table kiri dengan multiple rows
    $tableBody.empty();

    if (Object.keys(aggregatedSummary).length > 0) {
      let rowsHtml = "";
      let rowCount = 0;

      // Loop semua vendor
      Object.keys(aggregatedSummary).forEach((vendorId) => {
        const vendorName = vendorMap[vendorId] || "N/A";

        // Loop semua groupKey untuk vendor ini
        Object.keys(aggregatedSummary[vendorId]).forEach((groupKey) => {
          const groupData = aggregatedSummary[vendorId][groupKey];
          const batch = groupData.batch;
          const shipmentDate = groupData.shipmentDate;
          const total = groupData.total;
          const blanketEst = groupData.blanketEst || "";

          const formattedShipmentDate = shipmentDate
            ? formatDateToDisplay(shipmentDate)
            : "";

          //Buat rowId berdasarkan batch atau shipmentDate
          const rowId =
            batch > 0 ? `${vendorId}-${batch}` : `${vendorId}-${shipmentDate}`;

          // Label untuk kolom kedua
          const labelText =
            batch > 0 ? `Batch ${batch}` : formattedShipmentDate;

          // Buat baris baru untuk setiap kombinasi vendor-batch/shipmentDate
          rowsHtml += `
        <tr data-rowid="${rowId}">
          <td style="width: 30%">${vendorName}</td>
          <td style="width: 10%">${labelText}</td>
          <td style="width: 10%">
              <input type="date" value="${blanketEst}" class="blanket-est-input" style="width:125px!important;">
          </td>
          <td class="totalAmountCell" style="width: 10%">${formatToIdr(total)}</td>
          <td style="width: 10%">
            <button class="btn btn-info btn-xs view-summary-details-btn"
              data-rowid="${rowId}"
              data-vendorid="${vendorId}"
              data-vendorname="${vendorName}"
              data-blanketestdate="${blanketEst}"
              data-batch="${batch}"
              data-shipmentdate="${shipmentDate}">View Details</button>
          </td>
        </tr>`;

          rowCount++;
        });
      });

      $tableBody.html(rowsHtml);
      jumlahRowTableKiri = rowCount;
    } else {
      $tableBody.html(
        '<tr><td colspan="4" class="text-center">Tidak ada data ditemukan.</td></tr>',
      );
      jumlahRowTableKiri = 0;
      kumpulanDataTableKiriKanan = [];
    }

    // Update total semua (footer)
    $totalDisplay.text(formatToIdr(totalOverallSum));
  }
  function formatDateToDisplay(dateString) {
    if (!dateString) return ""; // kalau null/undefined, balikin string kosong
    const parts = dateString.split("-");
    if (parts.length !== 3) return dateString; // kalau formatnya bukan yyyy-mm-dd
    return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
  }
  //Fungsi untuk update kumpulanDataTableKiriKanan
  function updateKumpulanDataTableKiriKanan() {
    const updated = [];
    const tempMap = new Map();
    const processedKeys = new Set(); // Track keys yang sudah diproses

    // **STEP 1: Simpan semua existing data ke tempMap dengan key yang konsisten**
    kumpulanDataTableKiriKanan.forEach((item) => {
      // Buat key berdasarkan batch atau shipmentDate (SAMA SEPERTI BUAT ROWID)
      const key =
        item.batch > 0
          ? `${item.vendorId}-${item.batch}`
          : `${item.vendorId}-${item.shipmentDate}`;

      if (tempMap.has(key)) {
        const existing = tempMap.get(key);
        existing.totalAmount =
          (existing.totalAmount || 0) + (item.totalAmount || 0);

        // FIX BUG: Jika existing kosong payment-nya, TAKE dari yang baru
        if (
          (!existing.paymentDate || existing.paymentDate.length === 0) &&
          item.paymentDate &&
          item.paymentDate.length > 0
        ) {
          existing.paymentDate = item.paymentDate;
          existing.notes = item.notes;
          existing.percent = item.percent;
          existing.formValue = item.formValue;
          existing.alert = item.alert;
          existing.termDays = item.termDays;
          existing.OACredit = item.OACredit;
        }
      } else {
        tempMap.set(key, item);
      }
    });

    // **STEP 2: Loop aggregatedSummary dan update/create objects**
    Object.keys(aggregatedSummary).forEach((vendorId) => {
      Object.keys(aggregatedSummary[vendorId]).forEach((groupKey) => {
        const groupData = aggregatedSummary[vendorId][groupKey];
        const batch = groupData.batch || 0;
        const shipmentDate = groupData.shipmentDate || null;

        // **BUAT KEY YANG SAMA UNTUK LOOKUP**
        const key =
          batch > 0 ? `${vendorId}-${batch}` : `${vendorId}-${shipmentDate}`;

        // **SKIP jika key ini sudah diproses (mencegah duplikat)**
        if (processedKeys.has(key)) {
          return;
        }
        processedKeys.add(key);

        // **COBA CARI EXISTING OBJECT DARI tempMap**
        let obj = tempMap.get(key);

        // **AMBIL blanketEst DARI tempMap (existing data) SEBELUM digunakan**
        const existingBlanketEst = obj ? obj.blanketEst : "";

        if (!obj) {
          // **JIKA TIDAK ADA, BUAT OBJECT BARU**
          obj = new dataClassTableKiriKanan();
          obj.vendorId = parseInt(vendorId);
          obj.batch = batch;
          obj.namaVendor = vendorMap[vendorId] || "N/A";
          obj.rowId =
            batch > 0 ? `${vendorId}-${batch}` : `${vendorId}-${shipmentDate}`;

          // Inisialisasi array fields untuk object baru
          obj.paymentDate = [""];
          obj.notes = [""];
          obj.percent = [""];
          obj.formValue = [];
          obj.alert = [];
          obj.termDays = [""];
          obj.OACredit = [""];
          // **PENTING: Ambil blanketEst dari aggregatedSummary ATAU dari existingBlanketEst jika ada**
          // Prioritas: groupData.blanketEst > existingBlanketEst > ""
          obj.blanketEst = groupData.blanketEst || existingBlanketEst || "";
        } else {
          // **JIKA ADA EXISTING OBJECT, PRESERVE SEMUA FIELD YANG SUDAH ADA**
          // Update hanya vendorId, batch, namaVendor, rowId (jika ada perubahan key)
          obj.vendorId = parseInt(vendorId);
          obj.batch = batch;
          obj.namaVendor = vendorMap[vendorId] || "N/A";
          obj.rowId =
            batch > 0 ? `${vendorId}-${batch}` : `${vendorId}-${shipmentDate}`;

          if (!obj.paymentDate) obj.paymentDate = [""];
          if (!obj.notes) obj.notes = [""];
          if (!obj.percent) obj.percent = [""];
          if (!obj.formValue) obj.formValue = [""];
          if (!obj.alert) obj.alert = [""];
          if (!obj.termDays) obj.termDays = [""];
          if (!obj.OACredit) obj.OACredit = [""];

          if (groupData.blanketEst) {
            obj.blanketEst = groupData.blanketEst;
          }
        }

        if (shipmentDate) {
          obj.shipmentDate = shipmentDate;
        } else if (!obj.shipmentDate) {
          obj.shipmentDate = "";
        }

        obj.totalAmount = groupData.total || 0;

        updated.push(obj);
      });
    });

    kumpulanDataTableKiriKanan = updated;
  }

  // simpan batch terakhir per vendor
  if (!window.lastSelectedBatchByVendor) window.lastSelectedBatchByVendor = {};

  //Fungsi untuk update selection saat ini
  function updateCurrentSelection(
    vendorId,
    batch,
    totalAmount,
    vendorName,
    blanketEstDate,
  ) {
    // Tandai yang sedang dipilih
    const numericVendorId = parseInt(vendorId);
    const numericBatch = parseInt(batch);

    kumpulanDataTableKiriKanan.forEach((item) => {
      item.isCurrentlySelected =
        parseInt(item.vendorId) === numericVendorId &&
        parseInt(item.batch) === numericBatch;
    });
  }
  var focusIndexClass = 0;

  $(document).on("click", ".view-summary-details-btn", function () {
    // reset active marker
    $(".view-summary-details-btn").removeAttr("data-active");
    $(this).attr("data-active", "true");

    const rowIdAttr = $(this).attr("data-rowid");
    const vendorIdAttr = $(this).attr("data-vendorid");
    const vendorName =
      $(this).attr("data-vendorname") || $(this).data("vendorname");
    const batchAttr = $(this).attr("data-batch");
    const shipmentDateAttr = $(this).attr("data-shipmentdate");
    const blanketEstDateAttr = $(this).attr("data-blanketestdate");

    // normalisasi
    const vendorId = vendorIdAttr != null ? String(vendorIdAttr) : null;
    const batch = batchAttr != null ? String(batchAttr) : null;
    const shipmentDate =
      shipmentDateAttr != null ? String(shipmentDateAttr) : null;
    const blanketEstDate =
      blanketEstDateAttr != null ? String(blanketEstDateAttr) : null;

    if (
      !blanketEstDate ||
      blanketEstDate.trim() === "" ||
      blanketEstDate === "null"
    ) {
      alert(
        "Please Select Blanket Estimated Date first before viewing details.",
      );
      console.warn("BLOCKED CLICK: BlanketEstDate not filled.");
      return;
    }

    let computedRowId = null;
    if (vendorId) {
      if (batch && batch !== "0") {
        computedRowId = `${vendorId}-${batch}`;
      } else if (shipmentDate) {
        computedRowId = `${vendorId}-${shipmentDate}`;
      }
    }

    const rowId = rowIdAttr || computedRowId;

    if (rowId) {
      focusedObject = kumpulanDataTableKiriKanan.find(
        (r) => String(r.rowId) === String(rowId),
      );
    }

    if (!focusedObject && vendorId) {
      focusedObject = kumpulanDataTableKiriKanan.find((r) => {
        const vendorMatch = String(r.vendorId) === String(vendorId);

        if (batch && batch !== "0") {
          // Cari berdasarkan vendor + batch
          return vendorMatch && String(r.batch) === String(batch);
        } else if (shipmentDate) {
          // Cari berdasarkan vendor + shipmentDate
          return vendorMatch && String(r.shipmentDate) === String(shipmentDate);
        }

        return false;
      });
    }

    if (!focusedObject && vendorId && (batch || shipmentDate)) {
      const newRow = {
        rowId: rowId || computedRowId,
        vendorId: Number(vendorId),
        batch: batch && batch !== "0" ? Number(batch) : 0,
        shipmentDate: shipmentDate || "", //
        blanketEstDate: blanketEstDate || "",
        vendorName: vendorName || (vendorMap ? vendorMap[vendorId] : ""),
        totalAmount: 0,
        paymentDate: [],
        notes: [],
        percent: [],
        formValue: [],
        alert: [],
        termDays: [],
        OACredit: [],
      };
      kumpulanDataTableKiriKanan.push(newRow);
      focusedObject = newRow;
      // Update left-table button attribute
      $(this).attr("data-rowid", focusedObject.rowId);
    }

    if (!focusedObject) {
      console.error("Data not found and could not create focusedObject", {
        rowId,
        vendorId,
        batch,
        shipmentDate,
        blanketEstDate,
      });
      return;
    }

    // Update global state
    lastSelectedRowId = focusedObject.rowId;

    updateCurrentSelection(
      Number(focusedObject.vendorId),
      Number(focusedObject.batch),
      focusedObject.totalAmount || 0,
      vendorName,
      focusedObject.shipmentDate,
      focusedObject.blanketEst,
    );
    if (shipmentDate && shipmentDate !== focusedObject.shipmentDate) {
      console.warn(
        `Syncing shipmentDate mismatch: ${focusedObject.shipmentDate} → ${shipmentDate}`,
      );
      focusedObject.shipmentDate = shipmentDate;
    }
    // Sync blanket date
    if (blanketEstDate && blanketEstDate !== focusedObject.blanketEst) {
      console.warn(
        `Syncing blanketEst mismatch: ${focusedObject.blanketEst} → ${blanketEstDate}`,
      );
      focusedObject.blanketEst = blanketEstDate;
    }

    viewDetailLoad({
      rowId: focusedObject.rowId,
      vendorId: Number(focusedObject.vendorId),
      vendorName: vendorName,
      batch: Number(focusedObject.batch),
      shipmentDate: focusedObject.shipmentDate,
      blanketEstDate: focusedObject.blanketEst || "",
      total: focusedObject.totalAmount || 0,
    });
  });

  function viewDetailLoad(params) {
    $("#tableKanan").html("");

    const {
      rowId,
      vendorId,
      vendorName,
      batch,
      shipmentDate,
      blanketEstDate,
      total,
    } = params;
    const numericVendorId = parseInt(vendorId);
    const numericBatch = parseInt(batch) || 0;
    const shipmentDateStr = shipmentDate || "";
    const blanketEstDateStr = blanketEstDate || "";
    currentDisplayedShipmentDate = shipmentDateStr;

    let titleText = vendorName;
    if (numericBatch > 0) {
      titleText += " - Batch " + numericBatch;
    } else if (shipmentDateStr) {
      titleText += " - " + shipmentDateStr;
    }

    $("#judulTableKanan").text(titleText);
    document.getElementById("judulTableKanan").style.visibility = "visible";
    document.getElementById("tableKananHead").style.visibility = "visible";

    let focusedObject = kumpulanDataTableKiriKanan.find(
      (row) => String(row.rowId) === String(rowId),
    );

    if (!focusedObject) {
      focusedObject = kumpulanDataTableKiriKanan.find((row) => {
        const vendorMatch = parseInt(row.vendorId) === numericVendorId;

        if (numericBatch > 0) {
          // Cari berdasarkan vendor + batch
          return vendorMatch && parseInt(row.batch) === numericBatch;
        } else if (shipmentDateStr) {
          // Cari berdasarkan vendor + shipmentDate
          return vendorMatch && row.shipmentDate === shipmentDateStr;
        }

        return false;
      });
    }

    if (!focusedObject) {
      console.error(
        "focusedObject is null/undefined for VendorID:",
        numericVendorId,
        "Batch:",
        numericBatch,
        "ShipmentDate:",
        shipmentDateStr,
        "BlanketEstDate:",
        blanketEstDateStr,
        "rowId",
        rowId,
      );
      return;
    }

    const hasPaymentData =
      focusedObject.notes &&
      focusedObject.notes.length > 0 &&
      focusedObject.notes.some((val) => val && String(val).trim() !== "");

    if (!hasPaymentData && numericVendorId) {
      // Cari baris vendor lain yang sama, tapi bukan baris ini
      const vendorSibling = kumpulanDataTableKiriKanan.find((row) => {
        // Check if sibling has meaningful payment data via notes
        const siblingHasPaymentData =
          row.notes &&
          row.notes.length > 0 &&
          row.notes.some((val) => val && String(val).trim() !== "");

        return (
          parseInt(row.vendorId) === numericVendorId &&
          row.rowId !== focusedObject.rowId &&
          siblingHasPaymentData
        );
      });

      if (vendorSibling) {
        const preservedShipmentDate = focusedObject.shipmentDate;
        focusedObject.notes = [...vendorSibling.notes];
        focusedObject.percent = [...vendorSibling.percent];
        focusedObject.formValue = [...vendorSibling.formValue];
        focusedObject.alert = [...vendorSibling.alert];
        focusedObject.termDays = [...vendorSibling.termDays];
        focusedObject.OACredit = [...vendorSibling.OACredit];
        focusedObject.shipmentDate = preservedShipmentDate;
        focusedObject.paymentDate = vendorSibling.termDays.map((term) => {
          const baseDate = new Date(preservedShipmentDate);
          baseDate.setDate(baseDate.getDate() + parseInt(term || 0));
          return baseDate.toISOString().split("T")[0];
        });
      } else {
      }
    }
    if (!focusedObject.paymentDate || focusedObject.paymentDate.length === 0) {
      focusedObject.paymentDate = [""];
      focusedObject.notes = [""];
      focusedObject.percent = [""];
      focusedObject.formValue = [""];
      focusedObject.alert = [""];
      focusedObject.termDays = [""];
      focusedObject.OACredit = [""];
    }

    kumpulanDataTableKiriKanan.forEach((obj) => {
      obj.isCurrentlySelected = false;
    });

    focusedObject.isCurrentlySelected = true;

    lastSelectedRowId = rowId;
    currentActiveRowId = rowId;

    $("#tableKanan").off(
      "change input",
      ".paymentDateTableKanan, .notesTableKanan, .percenTableKanan, .formValueTableKanan, .alertTableKanan, .termDaysTableKanan, .OACreditTableKanan",
    );
    $(document).on("change", ".percent-input, .qty-input", function () {
      if (lastSelectedRowId) {
        generateTableCalculasi(lastSelectedRowId);
      }
    });

    let detailRowsHtml = "";
    for (let i = 0; i < focusedObject.notes.length; i++) {
      // const paymentDateVal = focusedObject.paymentDate[i]
      //   ? new Date(focusedObject.paymentDate[i]).toISOString().slice(0, 10)
      //   : "";

      detailRowsHtml += `<tr>

        <td><input type='text' class='form-control form-control-sm notesTableKanan' value="${focusedObject.notes[i] || ""}"></td>
        <td><input type='number' class='form-control form-control-sm percenTableKanan' value="${focusedObject.percent[i] || ""}"></td>
        <td>
            <select class='form-control form-control-sm formValueTableKanan'>
                <option value='1' ${focusedObject.formValue[i] == 1 ? "selected" : ""}>Per Batch</option>
                <option value='2' ${focusedObject.formValue[i] == 2 ? "selected" : ""}>Partial</option>
            </select>
        </td>
        <td>
            <select class='form-control form-control-sm alertTableKanan'>
                <option value='1' ${focusedObject.alert[i] == 1 ? "selected" : ""}>Blanket PO</option>
                <option value='2' ${focusedObject.alert[i] == 2 ? "selected" : ""}>PO</option>
                <option value='3' ${focusedObject.alert[i] == 3 ? "selected" : ""}>Shipment</option>
            </select>
        </td>
        <td><input type='number' class='form-control form-control-sm termDaysTableKanan' value="${focusedObject.termDays[i] || ""}"></td>
        <td><input type='text' class='form-control form-control-sm OACreditTableKanan' value="${focusedObject.OACredit[i] || ""}"></td>
        <td class='column-action-icon'><i class='glyphicon glyphicon-trash remove-row-icon' style='cursor: pointer; color: black;'></i></td>
    </tr>`;
    }
    $("#tableKanan").append(detailRowsHtml);

    // Payment Date
    $("#tableKanan").on("change", ".paymentDateTableKanan", function () {
      const $row = $(this).closest("tr");
      const rowIndex = $row.index();

      if (!lastSelectedRowId) {
        console.warn(" BLOCKED: No active rowId");
        return;
      }
      const targetObject = kumpulanDataTableKiriKanan.find(
        (obj) => String(obj.rowId) === String(lastSelectedRowId),
      );
      if (targetObject) {
        targetObject.paymentDate[rowIndex] = $(this).val();
      }
    });

    // Notes
    $("#tableKanan").on("input", ".notesTableKanan", function () {
      const $row = $(this).closest("tr");
      const rowIndex = $row.index();

      if (!lastSelectedRowId) {
        console.warn(" BLOCKED: No active rowId");
        return;
      }

      const targetObject = kumpulanDataTableKiriKanan.find(
        (obj) => String(obj.rowId) === String(lastSelectedRowId),
      );
      if (targetObject) {
        targetObject.notes[rowIndex] = $(this).val();
      }
    });

    // Percent
    $("#tableKanan").on("input", ".percenTableKanan", function () {
      const $row = $(this).closest("tr");
      const rowIndex = $row.index();

      if (!lastSelectedRowId) {
        console.warn(" BLOCKED: No active rowId");
        return;
      }

      const targetObject = kumpulanDataTableKiriKanan.find(
        (obj) => String(obj.rowId) === String(lastSelectedRowId),
      );
      if (targetObject) {
        targetObject.percent[rowIndex] = $(this).val();
      }
    });

    // Form Value
    $("#tableKanan").on("change", ".formValueTableKanan", function () {
      const $row = $(this).closest("tr");
      const rowIndex = $row.index();

      if (!lastSelectedRowId) {
        console.warn(" BLOCKED: No active rowId");
        return;
      }

      const targetObject = kumpulanDataTableKiriKanan.find(
        (obj) => String(obj.rowId) === String(lastSelectedRowId),
      );
      if (targetObject) {
        targetObject.formValue[rowIndex] = parseInt($(this).val(), 10);
      }
    });

    // Alert
    $("#tableKanan").on("change", ".alertTableKanan", function () {
      const $row = $(this).closest("tr");
      const rowIndex = $row.index();

      if (!lastSelectedRowId) {
        console.warn(" BLOCKED: No active rowId");
        return;
      }

      const targetObject = kumpulanDataTableKiriKanan.find(
        (obj) => String(obj.rowId) === String(lastSelectedRowId),
      );
      if (targetObject) {
        targetObject.alert[rowIndex] = parseInt($(this).val(), 10);
      }
    });

    // Term Days
    $("#tableKanan").on("input", ".termDaysTableKanan", function () {
      const $row = $(this).closest("tr");
      const rowIndex = $row.index();

      if (!lastSelectedRowId) {
        console.warn(" BLOCKED: No active rowId");
        return;
      }

      const targetObject = kumpulanDataTableKiriKanan.find(
        (obj) => String(obj.rowId) === String(lastSelectedRowId),
      );
      if (targetObject) {
        targetObject.termDays[rowIndex] = $(this).val();
      }
    });

    // OA Credit
    $("#tableKanan").on("input", ".OACreditTableKanan", function () {
      const $row = $(this).closest("tr");
      const rowIndex = $row.index();

      if (!lastSelectedRowId) {
        console.warn(" BLOCKED: No active rowId");
        return;
      }

      const targetObject = kumpulanDataTableKiriKanan.find(
        (obj) => String(obj.rowId) === String(lastSelectedRowId),
      );
      if (targetObject) {
        targetObject.OACredit[rowIndex] = $(this).val();
      }
    });
  }
  function renumberRows() {
    const rows = $("#tableTengah tr");

    rows.each(function (index) {
      const rowId = $(this).data("rowid");

      // update text nomor
      $(this)
        .find(".column-no")
        .text(index + 1);

      // update data di array
      const rowData = allTableTengahData.find((item) => item.rowId === rowId);
      if (rowData) {
        rowData.no = index + 1;
      } else {
      }
    });
    activeRows = rows.length; //  simpan ke global
  }

  $(document).on("select2:open", function () {
    setTimeout(function () {
      document
        .querySelector(".select2-container--open .select2-search__field")
        .focus();
    }, 0);
  });

  function addRowTableTengah(idTable) {
    rowCounter++;
    var tempRowId = "temp-" + rowCounter;

    let defaultVendor = 0;
    if (
      allTableTengahData.length > 0 &&
      allTableTengahData[allTableTengahData.length - 1].vendor
    ) {
      defaultVendor = allTableTengahData[allTableTengahData.length - 1].vendor;
    }
    var newRowHtml =
      '<tr data-rowid="' +
      tempRowId +
      '">' +
      "   <td class='column-no' style='width: 5%;'></td>" +
      "   <td><select class='form-control form-control-sm item-code-field'></select></td>" +
      "   <td ><input type='text' class='form-control form-control-sm item-unit-field' readonly></td>" +
      "   <td><select class='form-control form-control-sm vendorSelector' style='width:100%;'></select></td>" +
      "   <td ><select class='form-control form-control-sm color-field' style='width:100%;'></select></td>" +
      "   <td ><select class='form-control form-control-sm shipment-year-field'></select></td>" +
      "   <td ><select class='form-control form-control-sm ww-field'></select></td>" +
      "   <td ><input type='date' class='form-control form-control-sm shipment-date-field' readonly ></td>" +
      "   <td ><input type='text' class='form-control form-control-sm text-right qty-field' placeholder='0' min='0'></td>" +
      "   <td ><input type='text' class='form-control form-control-sm text-right price-field' placeholder='0' min='0'></td>" +
      "   <td ><input type='number' class='form-control form-control-sm term-days-field'></td>" +
      "   <td ><input type='date' class='form-control form-control-sm po-date-est-field'></td>" +
      "   <td ><input type='number' class='form-control form-control-sm batch-field' placeholder='Batch'></td>" +
      "   <td class='column-action-icon'><i class='glyphicon glyphicon-trash remove-row-icon' style='cursor: pointer; color: black;'></i></td>" +
      "</tr>";
    const $tableTengahBody = $("#" + idTable);
    $tableTengahBody.append(newRowHtml);
    const $lastRow = $tableTengahBody.find("tr:last");
    renderColorDropdown($lastRow.find(".color-field"));
    renderYearDropdown($lastRow.find(".shipment-year-field"));
    renderWWDropdown($lastRow.find(".ww-field"));

    // item baru selalu kosong di row baru, tidak ada default seperti vendor
    const itemCodeText = "";

    initItemSelect2($lastRow.find(".item-code-field"));
    initVendorSelect2($lastRow.find(".vendorSelector"), defaultVendor);
    $lastRow.find(".color-field").html(colorOptionsHTML).select2({
      placeholder: "-- Pilih Warna --",
    });
    $lastRow.find(".shipment-year-field").html(yearOptionsHTML).select2({
      placeholder: "-- Pilih Tahun --",
    });
    $lastRow.find(".ww-field").html(wwOptionsHTMLByYear).select2({
      placeholder: "-- Pilih WW --",
    });

    const newRowData = {
      rowId: tempRowId,
      no: allTableTengahData.length + 1,
      itemCode: parseInt($lastRow.find(".item-code-field").val(), 10) || 0,
      itemCodeText: itemCodeText,
      vendor: defaultVendor || 0,
      color: $lastRow.find(".color-field").val(),
      shipmentYear: $lastRow.find(".shipment-year-field").val() || "",
      ww: $lastRow.find(".ww-field").val() || "",
      shipmentDate: formatToDate($lastRow.find(".shipment-date-field").val()),
      qty: parseInt($lastRow.find(".qty-field").val()) || 0,
      price:
        parseFloat($lastRow.find(".price-field").val().replace(/\./g, "")) || 0,
      termDays: $lastRow.find(".term-days-field").val(),
      poDateEst: $lastRow.find(".po-date-est-field").val(),
      batch: parseInt($lastRow.find(".batch-field").val()) || 0,
      paymentDate: null,
      notes: "",
      percent: 0,
      formValue: 0,
      alert: 0,
      termDays: 0,
      OACredit: 0,
    };

    allTableTengahData.push(newRowData);
    $lastRow.find(".column-no").text(allTableTengahData.length);

    renumberRows();
    updateTotalQty();
    updateTableKiriSummary();
  }
  function duplicateLastRowTableTengah(idTable) {
    const $tableBody = $("#" + idTable);
    const $lastRow = $tableBody.find("tr:last");

    if ($lastRow.length === 0) {
      return;
    }

    // ambil data terakhir
    const lastData = allTableTengahData[allTableTengahData.length - 1];

    if (!lastData) {
      return;
    }

    // tambah row kosong baru
    addRowTableTengah(idTable);
    const $newRow = $tableBody.find("tr:last");

    // 1. Item Code - perlu trigger untuk update unit field
    if (lastData.itemCode) {
      $newRow.find(".item-code-field").val(lastData.itemCode).trigger("change");
    }
    // 2. Vendor - perlu trigger untuk update vendor map
    $newRow.find(".vendorSelector").val(lastData.vendor).trigger("change");

    // 3. Color - set value dan trigger change untuk select2
    const $colorField = $newRow.find(".color-field");
    $colorField.val(lastData.color).trigger("change.select2");

    // 4. Shipment Year & WW - OPTIMASI dengan cached data
    const shipmentYear = lastData.shipmentYear;
    const $yearField = $newRow.find(".shipment-year-field");
    const $wwField = $newRow.find(".ww-field");

    // Set Shipment Year terlebih dahulu
    $yearField.val(shipmentYear).trigger("change.select2");

    // Cek apakah WW options sudah ter-cache di wwDataByYear
    if (shipmentYear && wwDataByYear[shipmentYear]) {
      // WW sudah ter-cache, langsung populate dropdown dari cache
      renderWWDropdown($wwField, shipmentYear);
      // Langsung set WW value dengan trigger change
      $wwField.val(lastData.ww).trigger("change.select2");
      // Set shipment date langsung jika WW sudah cache
      $newRow.find(".shipment-date-field").val(lastData.shipmentDate);
    } else if (shipmentYear) {
      // WW belum cache, load terlebih dahulu
      loadWWByYear(shipmentYear).then(function () {
        renderWWDropdown($wwField, shipmentYear);
        $wwField.val(lastData.ww).trigger("change.select2");
        $newRow.find(".shipment-date-field").val(lastData.shipmentDate);
      });
    } else {
      $yearField.val("");
      $wwField.html('<option value="">-- Pilih WW --</option>');
      $wwField.trigger("change.select2");
      $newRow.find(".shipment-date-field").val("");
    }

    // 6. Fields lainnya - set langsung tanpa trigger
    $newRow.find(".qty-field").val(lastData.qty);
    $newRow.find(".price-field").val(lastData.price);
    $newRow.find(".term-days-field").val(lastData.termDays);
    // **FIX BUG: Clear poDateEst saat duplikasi agar tidak membawa nilai lama dari vendor/batch sebelumnya**
    $newRow.find(".po-date-est-field").val(lastData.poDateEst);
    $newRow.find(".batch-field").val(lastData.batch);

    // Clone data object untuk baris yang baru dibuat
    const newIndex = allTableTengahData.length - 1;
    const tempRowId = $newRow.data("rowid");

    allTableTengahData[newIndex] = {
      ...lastData,
      rowId: tempRowId,
      no: allTableTengahData.length,
      // **FIX BUG: Clear poDateEst untuk row duplikasi agar tidak menggunakan nilai lama**
      // poDateEst: null,
    };

    // Batch update fungsi-fungsi update
    // Tapi untuk accuracy, tetap lakukan semuanya
    updateTotalQty();
    updateTableKiriSummary();
    renumberRows();
    updateDuplicateButtonVisibility();
  }

  $(document).on(
    "change",
    ".vendorSelector, .batch-field, .shipment-date-field",
    function () {
      const $row = $(this).closest("tr");
      const rowIndex = $row.index();
      const vendorId = parseInt($row.find(".vendorSelector").val()) || 0;
      let batch = parseInt($row.find(".batch-field").val()) || 0;
      const shipmentDate = $row.find(".shipment-date-field").val() || "";

      // oldVendorId dibaca di awal supaya bisa dipakai di seluruh handler
      const oldVendorId = allTableTengahData[rowIndex]?.vendor || null;

      // Jika vendor berubah, auto-increment batch
      if ($(this).hasClass("vendorSelector")) {
        // Jika vendor benar-benar berubah (bukan pertama kali diisi)
        // oldVendorId > 0 menandakan vendor sudah pernah diisi sebelumnya (bukan input pertama kali)
        // Auto-increment batch hanya jika batch sebelumnya > 0
        if (
          oldVendorId > 0 &&
          oldVendorId !== vendorId &&
          vendorId > 0 &&
          batch > 0
        ) {
          // Cari batch tertinggi dari seluruh table
          const highestBatchOverall = Math.max(
            0,
            ...allTableTengahData.map((row) => row.batch || 0),
          );

          // Auto-increment batch
          batch = highestBatchOverall + 1;
          $row.find(".batch-field").val(batch);
        }
      }

      // **SIMPAN blanketEst LAMA SEBELUM PERUBAHAN**
      const oldRowId = $row.attr("data-rowid");
      let savedBlanketEst = "";

      if (oldRowId) {
        const oldKiriData = kumpulanDataTableKiriKanan.find(
          (d) => d.rowId === oldRowId,
        );
        if (oldKiriData && oldKiriData.blanketEst) {
          savedBlanketEst = oldKiriData.blanketEst;
        }
      }

      let newRowId = "";
      if (vendorId > 0) {
        if (batch > 0) {
          newRowId = vendorId + "-" + batch;
        } else if (shipmentDate) {
          newRowId = vendorId + "-" + shipmentDate;
        }
      }

      if (newRowId) {
        currentActiveRowId = newRowId;
        $row.attr("data-rowid", newRowId);

        // Update tombol
        const $btn = $row.find(".view-summary-details-btn");
        $btn.attr({
          "data-rowid": newRowId,
          "data-vendorid": vendorId,
          "data-batch": batch,
          "data-shipmentdate": shipmentDate,
          "data-vendorname": vendorMap[vendorId] || "",
        });

        // Update allTableTengahData
        if (allTableTengahData[rowIndex]) {
          allTableTengahData[rowIndex].vendor = vendorId;
          allTableTengahData[rowIndex].batch = batch;
          allTableTengahData[rowIndex].shipmentDate = shipmentDate;
          // **FIX BUG: Update rowId agar sinkron dengan DOM data-rowid**
          allTableTengahData[rowIndex].rowId = newRowId;
        }

        // **CARI EXISTING DATA DENGAN LOGIC YANG SAMA SEPERTI DI updateTableKiriSummary**
        let existingKiriIndex = kumpulanDataTableKiriKanan.findIndex(
          (data) => data.rowId === oldRowId,
        );

        if (existingKiriIndex === -1) {
          existingKiriIndex = kumpulanDataTableKiriKanan.findIndex((data) => {
            if (batch > 0) {
              return data.vendorId === vendorId && data.batch == batch;
            } else {
              return (
                data.vendorId === vendorId && data.shipmentDate === shipmentDate
              );
            }
          });
        }

        if (existingKiriIndex !== -1) {
          // **UPDATE EXISTING DATA DAN PERTAHANKAN blanketEst**
          const existingKiriData =
            kumpulanDataTableKiriKanan[existingKiriIndex];
          existingKiriData.rowId = newRowId;
          existingKiriData.vendorId = vendorId;
          existingKiriData.batch = batch;
          existingKiriData.shipmentDate = shipmentDate;

          // **PENTING: Pertahankan blanketEst yang sudah ada**
          if (!existingKiriData.blanketEst && savedBlanketEst) {
            existingKiriData.blanketEst = savedBlanketEst;
          }
        } else {
          // **JIKA TIDAK DITEMUKAN, BUAT DATA BARU TAPI PAKAI SAVED blanketEst**

          // Saat vendor berubah (auto-increment batch), copy blanketEst dari entry vendor lama
          let blanketEstToCopy = savedBlanketEst || "";

          if (
            $(this).hasClass("vendorSelector") &&
            oldVendorId !== null &&
            oldVendorId !== vendorId
          ) {
            // Vendor benar-benar berubah, cari blanketEst dari entry vendor lama
            const oldVendorEntry = kumpulanDataTableKiriKanan.find(
              (row) => parseInt(row.vendorId) === oldVendorId && row.blanketEst,
            );
            if (oldVendorEntry && oldVendorEntry.blanketEst) {
              blanketEstToCopy = oldVendorEntry.blanketEst;
            }
          }

          const newKiriData = {
            rowId: newRowId,
            vendorId: vendorId,
            batch: batch,
            shipmentDate: shipmentDate,
            blanketEst: blanketEstToCopy, // UPDATE: gunakan nama field yang benar
            blanketEstDate: blanketEstToCopy, // KEEP untuk compatibility
            total: 0,
          };
          kumpulanDataTableKiriKanan.push(newKiriData);
        }

        lastSelectedRowId = newRowId;
        setTimeout(() => {
          refreshObjectTableKiri(newRowId);
        }, 10);
        updateTableKiriSummary();
      }
    },
  );

  $(document).on("change", ".item-code-field", function () {
    const $selectElement = $(this);
    const $currentRow = $selectElement.closest("tr");
    const rowId = $currentRow.attr("data-rowid");

    const selectedId = $selectElement.val();
    const $selectedOption = $selectElement.find("option:selected");
    const itemUnitId =
      parseInt($selectElement.find(":selected").data("itemunitid"), 10) || 0;
    const unitName = $selectElement.find(":selected").data("unitname") || "";
    const selectedText = $selectElement.find("option:selected").text();
    const itemCodeText = $selectedOption.data("code") || "";

    // update ke array menggunakan rowId
    let rowData = null;
    if (rowId) {
      rowData = allTableTengahData.find((item) => item.rowId === rowId);
    }

    // fallback ke index jika rowId tidak ada
    if (!rowData) {
      const rowIndex = $currentRow.index();
      rowData = allTableTengahData[rowIndex];
    }

    if (rowData) {
      rowData.itemCode = parseInt(selectedId, 10) || 0;
      rowData.itemUnitId = itemUnitId;
      rowData.itemCodeText = itemCodeText;
      rowData.unitName = unitName;
    }

    // update field readonly di kolom unit
    $currentRow.find(".item-unit-field").val(unitName);

    // Update visibility button duplicate setelah item berubah
    updateDuplicateButtonVisibility();
  });

  function getWeekOfYear(date) {
    const d = new Date(date.getTime());
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
    return weekNo;
  }

  function updateTotalQty() {
    let total = 0;

    $("#tableTengah .qty-field").each(function () {
      const qty = parseInt($(this).val()) || 0;
      total += qty;
    });

    $("#total-qty-main").text(total.toLocaleString("id-ID"));
  }

  // Fungsi untuk validasi SEMUA array di kumpulanDataTableKiriKanan (bukan hanya yang aktif)
  function validateAllTableKananData() {
    const validationResult = {
      isValid: true,
      messages: [],
      vendorValidations: [], // Array untuk hasil validasi per vendor
    };

    // CHECK: Apakah ada payment data yang BENAR-BENAR TERISI (bukan hanya array kosong/undefined)?
    const hasAnyPaymentData = kumpulanDataTableKiriKanan.some((item) => {
      if (!Array.isArray(item.paymentDate) || item.paymentDate.length === 0) {
        return false;
      }

      // Validasi ketat: minimal ada satu field yang benar-benar terisi (bukan undefined/kosong)
      return item.notes.some((n, idx) => {
        const notes = n && String(n).trim() !== "";
        const percent =
          item.percent[idx] !== undefined &&
          item.percent[idx] !== null &&
          String(item.percent[idx]).trim() !== "";
        const formValue =
          item.formValue[idx] !== undefined &&
          String(item.formValue[idx]) !== "undefined";
        const alert =
          item.alert[idx] !== undefined &&
          String(item.alert[idx]) !== "undefined";
        const termDays =
          item.termDays[idx] !== undefined &&
          String(item.termDays[idx]).trim() !== "";

        return notes || percent || formValue || alert || termDays;
      });
    });

    if (!hasAnyPaymentData) {
      return validationResult; // Return valid karena payment optional
    }

    // Jika ada payment data valid, validasi ketat
    if (kumpulanDataTableKiriKanan.length === 0) {
      validationResult.isValid = false;
      validationResult.messages.push("Table right must have 1 row data!");
      return validationResult;
    }

    // Looping semua item di kumpulanDataTableKiriKanan
    kumpulanDataTableKiriKanan.forEach((item, itemIndex) => {
      // SKIP item yang tidak punya payment data (payment is optional)
      if (
        !item.paymentDate ||
        !Array.isArray(item.paymentDate) ||
        item.paymentDate.length === 0
      ) {
        return; // Skip ke vendor berikutnya
      }

      const vendorValidation = {
        vendorId: item.vendorId,
        namaVendor: item.namaVendor,
        rowId: item.rowId,
        isValid: true,
        messages: [],
        totalPercent: 0,
        rowCount: 0,
      };

      // Cek apakah item memiliki array data payment
      if (!item.percent || !Array.isArray(item.percent)) {
        vendorValidation.isValid = false;
        vendorValidation.messages.push(
          "Data percent array is missing or invalid",
        );
        validationResult.vendorValidations.push(vendorValidation);
        validationResult.isValid = false;
        return; // Skip ke vendor berikutnya
      }

      let totalPercent = 0;
      let hasValidRows = false;
      const percentLength = item.percent.length;
      vendorValidation.rowCount = percentLength;

      // Looping setiap baris payment dalam item ini
      item.percent.forEach((percentVal, paymentIndex) => {
        const rowNumber = paymentIndex + 1;
        let isRowValid = true;
        let emptyFields = [];

        // Validasi Notes
        const notes =
          item.notes && item.notes[paymentIndex]
            ? item.notes[paymentIndex]
            : "";
        if (!notes || notes.trim() === "") {
          emptyFields.push("Notes");
          isRowValid = false;
        }

        // Validasi Percent
        const percentValue = percentVal;
        if (
          percentValue === "" ||
          percentValue === null ||
          percentValue === undefined ||
          isNaN(parseFloat(percentValue))
        ) {
          emptyFields.push("Percent");
          isRowValid = false;
        } else {
          const percent = parseFloat(percentValue);
          if (percent < 0) {
            vendorValidation.messages.push(
              `${item.namaVendor} - Line ${rowNumber}: The percentage must not be less than 0.`,
            );
            isRowValid = false;
          } else if (percent > 100) {
            vendorValidation.messages.push(
              `${item.namaVendor} - Line ${rowNumber}: The percentage must not be more than 100.`,
            );
            isRowValid = false;
          } else {
            totalPercent += percent;
          }
        }

        // Validasi Form Value
        const formValue = item.formValue && item.formValue[paymentIndex];
        if (!formValue) {
          emptyFields.push("Form Value");
          isRowValid = false;
        }

        // Validasi Alert
        const alertValue = item.alert && item.alert[paymentIndex];
        if (!alertValue) {
          emptyFields.push("Alert");
          isRowValid = false;
        }

        // Validasi Term Days
        const termDays = item.termDays && item.termDays[paymentIndex];
        if (!termDays || termDays === "" || isNaN(parseInt(termDays))) {
          emptyFields.push("Term Days");
          isRowValid = false;
        }

        // Validasi OA Credit (optional)
        const oaCredit = item.OACredit && item.OACredit[paymentIndex];

        if (oaCredit && oaCredit.trim && oaCredit.trim() !== "") {
          const oaCreditVal = parseFloat(oaCredit);
          if (isNaN(oaCreditVal)) {
            vendorValidation.messages.push(
              `${item.namaVendor} - Line ${rowNumber}: OA Credit must be a number.`,
            );
            isRowValid = false;
          } else if (oaCreditVal < 0) {
            vendorValidation.messages.push(
              `${item.namaVendor} - Line ${rowNumber}: OA Credit must not be less than 0.`,
            );
            isRowValid = false;
          }
        }

        if (emptyFields.length > 0) {
          vendorValidation.messages.push(
            `${item.namaVendor} - Line ${rowNumber}: Field must be filled in: ${emptyFields.join(", ")}.`,
          );
          isRowValid = false;
        }

        if (!isRowValid) {
          vendorValidation.isValid = false;
        } else {
          hasValidRows = true;
        }
      });

      vendorValidation.totalPercent = Math.round(totalPercent * 100) / 100;

      // Validasi total percent harus 100%
      if (hasValidRows) {
        const tolerance = 0.01;
        if (Math.abs(totalPercent - 100) > tolerance) {
          vendorValidation.isValid = false;

          if (totalPercent < 100) {
            const shortage = Math.round((100 - totalPercent) * 100) / 100;
            vendorValidation.messages.push(
              `${item.namaVendor}: total percentage must be 100%!\n` +
                `Now: ${vendorValidation.totalPercent}%\n` +
                `still need: ${shortage}%\n` +
                `Please add a new row or adjust the existing percentage.`,
            );
          } else {
            const excess = Math.round((totalPercent - 100) * 100) / 100;
            vendorValidation.messages.push(
              `${item.namaVendor}: total percentage must not exceed 100%!\n` +
                `Now: ${vendorValidation.totalPercent}%\n` +
                `advantages: ${excess}%\n` +
                `Please reduce the percentage.`,
            );
          }
        } else {
        }
      }

      if (!vendorValidation.isValid) {
        validationResult.isValid = false;
      }

      validationResult.vendorValidations.push(vendorValidation);
    });

    // Compile semua error messages
    validationResult.vendorValidations.forEach((vv) => {
      if (!vv.isValid && vv.messages.length > 0) {
        validationResult.messages.push(...vv.messages);
      }
    });

    return validationResult;
  }


  function getAllTableKananData() {
    var rowData = [];
    $("#tableKanan tr")
      .not(".no-data-row-kanan")
      .each(function () {
        var $row = $(this);

        const paymentDate = $row.find(".paymentDateTableKanan").val();
        if (!paymentDate) {
          return; // Skip empty rows
        }

        const rowObject = {
          paymentDate: formatToDate($row.find(".paymentDateTableKanan").val()),
          notes: String($row.find(".notesTableKanan").val()),
          percent: parseFloat($row.find(".percenTableKanan").val()) || 0,
          formValue: parseInt($row.find(".formValueTableKanan").val()) || 1,
          alert: parseInt($row.find(".alertTableKanan").val()) || 2,
          termDays: parseInt($row.find(".termDaysTableKanan").val()) || 0,
          OACredit: parseFloat($row.find(".OACreditTableKanan").val()) || 0,
        };

        rowData.push(rowObject);
      });

    return rowData;
  }

  function saveTableKanan(purchasePlanID, vendorId, batch) {
    if (!purchasePlanID || purchasePlanID <= 0) {
      alert("Error: Purchase Plan ID is required!");
      return;
    }

    if (!vendorId || vendorId <= 0) {
      alert("Error: Vendor ID is required!");
      return;
    }

    if (batch === undefined || batch < 0) {
      alert("Error: Valid Batch number is required!");
      return;
    }

    // Gunakan validasi ALL DATA, bukan hanya yang aktif di tabel
    const validation = validateAllTableKananData();

    if (!validation.isValid) {
      let errorMessage = "VALIDATE FAIL!\n\n";
      errorMessage += validation.messages.join("\n\n");

      alert(errorMessage);
      return;
    }
    const tableKananData = getAllTableKananData();

    if (tableKananData.length === 0) {
      alert("Warning: No valid data to save!");
      return;
    }

    const saveButton = $(".btn-save, .btn-save-kanan, .save-table-kanan");
    const originalButtonText = saveButton.html();

    if (saveButton.length) {
      saveButton
        .prop("disabled", true)
        .html('<i class="fa fa-spinner fa-spin"></i> Saving Table Kanan...');
    }

    const formattedData = tableKananData.map((row, index) => ({
      purchasePlanID: purchasePlanID,
      vendorId: vendorId,
      batch: batch,
      paymentDate: row.paymentDate,
      purchasePlanDtlID: row.purchasePlanDtlID,
      notes: row.notes,
      percent: row.percent,
      formValue: row.formValue,
      alert: row.alert,
      termDays: row.termDays,
      oaCredit: row.OACredit,
    }));

    $.ajax({
      url: BASE_URL + "scm/purchasing/purchase_order_plan/saveTableKanan",
      type: "POST",
      contentType: "application/json",
      data: JSON.stringify({
        table_data: formattedData,
        summary: {
          totalRecords: formattedData.length,
          totalPercent: validation.totalPercent,
          purchasePlanID: purchasePlanID,
          vendorId: vendorId,
          batch: batch,
        },
      }),
      dataType: "json",
      timeout: 30000,
      beforeSend: function () {},
      success: function (response) {
        if (response.status === "success") {
          const successMessage =
            "SUCCESS!\n\n" +
            "Table Right Data Saved Successfully!\n\n" +
            `• Total Records: ${response.total_records || formattedData.length}\n` +
            `• Total Percent: ${validation.totalPercent}% ✓\n` +
            `• Purchase Plan ID: ${purchasePlanID}\n` +
            `• Vendor ID: ${vendorId}\n` +
            `• Batch: ${batch}`;

          alert(successMessage);
        } else {
          alert(
            "Error: " + (response.message || "Failed to save table right data"),
          );
        }
      },
      error: function (xhr, status, error) {
        console.error("AJAX Error:", {
          status: xhr.status,
          statusText: xhr.statusText,
          responseText: xhr.responseText,
          error: error,
        });

        let errorMessage = "An error occurred while saving table kanan data.";

        if (xhr.status === 0) {
          errorMessage =
            "Network error. Please check your internet connection.";
        } else if (xhr.status === 404) {
          errorMessage =
            "Server endpoint not found. Please check the URL configuration.";
        } else if (xhr.status === 500) {
          errorMessage = "Internal server error. Please check server logs.";
        } else if (xhr.responseJSON && xhr.responseJSON.message) {
          errorMessage = "Server Error: " + xhr.responseJSON.message;
        } else if (xhr.responseText) {
          errorMessage =
            "Server Response: " + xhr.responseText.substring(0, 200);
        }

        alert(errorMessage);
      },
      complete: function () {
        if (saveButton.length) {
          saveButton
            .prop("disabled", false)
            .html(originalButtonText || "Save Data");
        }
      },
    });
  }

  $("#calculatePayment").click(function () {
    document.getElementById("tableKananCalc").style.visibility = "visible";
    generateTableCalculasi(focusedObject.rowId);
    isCalculatePaymentClicked = true; // Set flag bahwa calculate sudah diklik
  });
  $("#addlineTableKanan").click(function () {
    var $tableKanan = $("#tableKanan");
    $tableKanan.find(".no-data-row-kanan").remove();
    isCalculatePaymentClicked = false; // Reset flag karena ada perubahan di table kanan

    var newDetailRowHtml =
      "<tr>" +
      // "    <td style='width: 180px; padding: 4px;'>" +
      // "        <input type='date' class='form-control form-control-sm paymentDateTableKanan' style='width:100%; max-width:100%;'>" +
      // "    </td>" +
      "    <td style='width: 190px; padding: 4px;'>" +
      "         <input type='text' class='form-control form-control-sm notesTableKanan' style='width:100%; max-width:100%;''>" +
      "    </td>" +
      "    <td style='width: 70px; padding: 4px;'>" +
      "        <input type='number' class='form-control form-control-sm no-spinner percenTableKanan' max='100' min='0' step='1' style='width:100%; max-width:100%;'>" +
      "    </td>" +
      "    <td style='width: 120px; padding: 4px;'>" +
      "        <select class='form-control form-control-sm formValueTableKanan' style='width:100%; max-width:110px;'>" +
      "            <option value=''>-- Select --</option>" +
      "            <option value='1'>Per Batch</option>" +
      "            <option value='2'>Partial</option>" +
      "        </select>" +
      "    </td>" +
      "    <td style='width: 60px; padding: 4px;'>" +
      "        <select class='form-control form-control-sm alertTableKanan' style='width:100%; max-width:95px;'>" +
      "            <option value=''>-- Select --</option>" +
      "            <option value='1'>Blanket PO</option>" +
      "            <option value='2'>PO</option>" +
      "            <option value='3'>Shipment</option>" +
      "        </select>" +
      "    </td>" +
      "    <td style='width: 60px; padding: 4px;'>" +
      "        <input type='number' class='form-control form-control-sm no-spinner termDaysTableKanan' style='width:100%; max-width:80px;'>" +
      "    </td>" +
      "    <td style='width: 160px; padding: 4px;'>" +
      "        <input type='text' class='form-control form-control-sm no-spinner OACreditTableKanan' step='0.01' style='width:100%; max-width:116px;'>" +
      "    </td>" +
      "    <td style='width: 60px; padding: 4px; text-align: center;'>" +
      "        <i class='glyphicon glyphicon-trash deleteRowTableKanan' style='cursor: pointer; color: black; font-size: 16px;'></i>" +
      "    </td>" +
      "</tr>";

    $tableKanan.append(newDetailRowHtml);

    const $newRow = $tableKanan.find("tr:last");
    $newRow.find(".formValueTableKanan").val("1");
    $newRow.find(".alertTableKanan").val("2");

    const $prevRow = $newRow.prev();
    if ($prevRow.length) {
      const prevDateVal = $prevRow.find(".paymentDateTableKanan").val();
      if (prevDateVal) {
        $newRow.find(".paymentDateTableKanan").attr("min", prevDateVal);
      }
    }

    setTimeout(updatePercentStatus, 100);

    refreshObjectTableKiri(lastSelectedRowId);

    updateTotalQty();
  });

  $("#tableKanan")
    .off("input change", ".percenTableKanan")
    .on("input change", ".percenTableKanan", function () {
      var $this = $(this);
      var value = parseFloat($this.val());
      isCalculatePaymentClicked = false; // Reset flag karena ada perubahan di table kanan

      // Validasi individual
      if (isNaN(value)) {
        $this.val("");
        alert("Notification : Value not valid!");
        updatePercentStatus();
        return;
      }

      if (value > 100) {
        $this.val("");
        alert("Notification : Maximum value is 100%");
        updatePercentStatus();
        return;
      }

      if (value < 0) {
        $this.val("");
        alert("Notification : Minimum value is 0%");
        updatePercentStatus();
        return;
      }

      // Update real-time status setelah delay
      clearTimeout(window.percentValidationTimeout);
      window.percentValidationTimeout = setTimeout(function () {
        updatePercentStatus();
      }, 300);

      // Call existing function if exists
      refreshObjectTableKiri(currentActiveRowId);
    });

  function updatePercentStatus() {
    let totalPercent = 0;
    let validRows = 0;
    let emptyRows = 0;

    $("#tableKanan tr")
      .not(".no-data-row-kanan")
      .each(function () {
        const percentValue = $(this).find(".percenTableKanan").val();
        if (percentValue && !isNaN(parseFloat(percentValue))) {
          const percent = parseFloat(percentValue);
          if (percent >= 0 && percent <= 100) {
            totalPercent += percent;
            validRows++;
          }
        } else {
          emptyRows++;
        }
      });

    totalPercent = Math.round(totalPercent * 100) / 100;

    let $statusElement = $("#percent-status");
    if ($statusElement.length === 0) {
      $statusElement = $(
        '<div id="percent-status" class="alert alert-sm mt-2 mb-2"></div>',
      );

      $statusElement.css({
        display: "none",
        visibility: "none",
        "align-items": "center",
        "justify-content": "space-between",
        width: "500px",
        "min-height": "50px",
        padding: "12px 20px",
        "border-radius": "8px",
        "font-size": "14px",
        "font-weight": "500",
        margin: "10px 0",
        "box-shadow": "0 2px 4px rgba(0,0,0,0.1)",
        "white-space": "nowrap",
        overflow: "hidden",
      });

      $("#tableKanan").after($statusElement);
    }

    let statusMessage = ` Percent Status: ${totalPercent}%`;
    let statusClass = "info";
    let icon = "ℹ️";
    let detailMessage = "";

    if (totalPercent === 100 && emptyRows === 0) {
      statusMessage = `${totalPercent}%  READY TO SAVE!`;
      detailMessage = `All ${validRows} rows are valid and complete`;
      statusClass = "success";
      icon = "";
    } else if (totalPercent === 100 && emptyRows > 0) {
      statusMessage = `${totalPercent}%  COMPLETE BUT HAS ISSUES`;
      detailMessage = `${emptyRows} rows have empty fields`;
      statusClass = "warning";
      icon = "";
    } else if (totalPercent < 100) {
      const needed = Math.round((100 - totalPercent) * 100) / 100;
      statusMessage = `${totalPercent}%  INCOMPLETE`;
      detailMessage = `Need ${needed}% more | Valid Rows: ${validRows}`;
      statusClass = "warning";
      icon = "";
    } else if (totalPercent > 100) {
      const excess = Math.round((totalPercent - 100) * 100) / 100;
      statusMessage = `${totalPercent}%  EXCEEDS LIMIT`;
      detailMessage = `Reduce by ${excess}% | Valid Rows: ${validRows}`;
      statusClass = "danger";
      icon = "";
    }

    const statusHTML = `
  <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
    <div style="display: flex; align-items: center;">
      <span style="font-size: 12px; margin-right: 10px;">${icon}</span>
      <span style="font-weight: medium; font-size: 12px;">${statusMessage} </span>
    </div>
    <div style="text-align: right; font-size: 12px; opacity: 0.8;">
      ${detailMessage}
    </div>
  </div>
`;

    $statusElement
      .removeClass("alert-info alert-success alert-warning alert-danger")
      .addClass(`alert-${statusClass}`)
      .html(statusHTML);
  }

  $(document)
    .off("click", ".deleteRowTableKanan")
    .on("click", ".deleteRowTableKanan", function () {
      const $rowToRemove = $(this).closest("tr");
      const rowIndex = $rowToRemove.index();
      $rowToRemove.remove();
      isCalculatePaymentClicked = false; // Reset flag karena ada perubahan di table kanan

      setTimeout(updatePercentStatus, 100);

      refreshObjectTableKiri(currentActiveRowId);
    });

  $(document).on("click", ".deleteRowTableKanan", function () {
    const $rowToRemove = $(this).closest("tr");
    const rowIndex = $rowToRemove.index();
    $rowToRemove.remove();
    isCalculatePaymentClicked = false; // Reset flag karena ada perubahan di table kanan
    refreshObjectTableKiri(currentActiveRowId);
  });
  $("#tableKanan").on("change", ".paymentDateTableKanan", function () {
    const $currentRow = $(this).closest("tr");
    const rowIndex = $currentRow.index();
    const newValue = $(this).val() ? new Date($(this).val()) : null;
    refreshObjectTableKiri(currentActiveRowId);
  });

  $("#tableKanan").on("change", ".notesTableKanan", function () {
    const $currentRow = $(this).closest("tr");
    const rowIndex = $currentRow.index();
    const selectedNote = String($(this).val());
    isCalculatePaymentClicked = false; // Reset flag karena ada perubahan di table kanan
    refreshObjectTableKiri(currentActiveRowId);
  });

  $("#tableKanan").on("change", ".percenTableKanan", function () {
    const $currentRow = $(this).closest("tr");
    const rowIndex = $currentRow.index();
    const newValue = parseFloat($(this).val()) || 0;
    isCalculatePaymentClicked = false; // Reset flag karena ada perubahan di table kanan
    refreshObjectTableKiri(currentActiveRowId);
  }); // Event handler untuk kolom 'formValue' (select)

  $("#tableKanan").on("change", ".formValueTableKanan", function () {
    const $currentRow = $(this).closest("tr");
    const rowIndex = $currentRow.index();
    const newValue = parseInt($(this).val()); // int
    isCalculatePaymentClicked = false; // Reset flag karena ada perubahan di table kanan
    refreshObjectTableKiri(currentActiveRowId);
  }); // Event handler untuk kolom 'alert' (select)

  $("#tableKanan").on("change", ".alertTableKanan", function () {
    const $currentRow = $(this).closest("tr");
    const rowIndex = $currentRow.index();
    const newValue = parseInt($(this).val()); // int
    isCalculatePaymentClicked = false; // Reset flag karena ada perubahan di table kanan
    refreshObjectTableKiri(currentActiveRowId);
  });
  function getCurrentBatchFromTitle() {
    const title = $("#judulTableKanan").text() || "";
    const match = title.match(/Batch\s+(\d+)/i);
    return match ? match[1] : null;
  }

  function getCurrentShipmentDateFromTitle() {
    const title = $("#judulTableKanan").text() || "";
    const match = title.match(/Date\s+([\d-]+)/i);
    return match ? match[1] : null;
  }

  $("#tableKanan").on("change", ".termDaysTableKanan", function () {
    const $currentRow = $(this).closest("tr");
    const rowIndex = $currentRow.index();
    const termDays = parseInt($(this).val(), 10) || 0;
    isCalculatePaymentClicked = false; // Reset flag karena ada perubahan di table kanan

    // console.groupCollapsed(` [TermDays Handler] Row ${rowIndex + 1}`);

    // Sinkronkan row aktif dulu
    const $activeButton = $(".view-summary-details-btn[data-active='true']");
    if ($activeButton.length) {
      const activeRowId = $activeButton.attr("data-rowid");
      if (activeRowId && activeRowId !== currentActiveRowId) {
        currentActiveRowId = activeRowId;
      }
    }
    let shipmentDateStr = null;

    if (currentDisplayedShipmentDate) {
      shipmentDateStr = currentDisplayedShipmentDate;
    } else {
      const activeObject = window.kumpulanDataTableKiriKanan?.find(
        (g) =>
          String(g.rowId) === String(currentActiveRowId) ||
          String(g.rowId) === String(lastSelectedRowId),
      );

      if (activeObject && activeObject.shipmentDate) {
        shipmentDateStr = activeObject.shipmentDate;
      } else {
        const currentBatch = getCurrentBatchFromTitle();
        const currentShipmentFromTitle = getCurrentShipmentDateFromTitle();

        const activeGroup = window.kumpulanDataTableKiriKanan?.find((g) => {
          const matchVendor =
            String(g.vendorId) === String(lastSelectedVendorId);
          const matchBatch =
            matchVendor && String(g.batch) === String(currentBatch);
          const matchShipment =
            matchVendor &&
            (!g.batch || g.batch === 0) &&
            g.shipmentDate === currentShipmentFromTitle;
          return matchBatch || matchShipment;
        });

        if (activeGroup) {
          shipmentDateStr = activeGroup.shipmentDate;
        } else if (allTableTengahData?.[focusIndexClass]) {
          shipmentDateStr = allTableTengahData[focusIndexClass].shipmentDate;
        }
      }
    }

    if (shipmentDateStr) {
      let shipmentDate = new Date(shipmentDateStr);
      let paymentDate = new Date(shipmentDate);
      paymentDate.setDate(paymentDate.getDate() + termDays);

      const $prevRow = $currentRow.prev();
      if ($prevRow.length) {
        const prevDateVal = $prevRow.find(".paymentDateTableKanan").val();
        if (prevDateVal) {
          const prevDate = new Date(prevDateVal);
          if (paymentDate < prevDate) {
            alert(
              `Payment Date cannot be earlier than the previous date (${prevDateVal}).`,
            );
            $(this).val("");
            $currentRow.find(".paymentDateTableKanan").val("");
            console.warn(" PaymentDate earlier, canceled");
            // console.groupEnd();
            return;
          }
        }
      }

      const paymentDateStr = paymentDate.toISOString().split("T")[0];
      $currentRow.find(".paymentDateTableKanan").val(paymentDateStr);
    } else {
      console.warn(
        " Not Found shipmentDate valid for another calculate termDays",
      );
    }

    // console.groupEnd();

    refreshObjectTableKiri(currentActiveRowId);
  });

  $("#tableKanan").on(
    "input focus blur change",
    ".OACreditTableKanan",
    handleOACreditEvent,
  );

  function handleOACreditEvent(e) {
    const $input = $(e.target);
    const eventType = e.type;

    if (eventType === "focus") {
      // tampilkan raw value tanpa simbol %
      const numericValue = $input.data("numeric-value") || 0;
      $input.val(numericValue.toString());
      $input.select();
      return;
    }

    if (eventType === "input") {
      let originalValue = $input.val();
      if (!originalValue) {
        $input.data("numeric-value", 0);
        return;
      }

      // Hanya ambil angka
      let cleanValue = originalValue.replace(/[^\d]/g, "");
      let numericValue = parseInt(cleanValue, 10);

      if (isNaN(numericValue)) {
        $input.val("");
        $input.data("numeric-value", 0);
        return;
      }

      // Batasi maksimal 100
      if (numericValue > 100) numericValue = 100;

      $input.data("numeric-value", numericValue);

      // tampilkan raw angka saat mengetik
      $input.val(numericValue);
      return;
    }

    if (eventType === "blur" || eventType === "change") {
      let numericValue = $input.data("numeric-value") || 0;

      // format sebagai persen tanpa desimal
      $input.val(numericValue + "%");
      isCalculatePaymentClicked = false; // Reset flag karena ada perubahan di table kanan

      // update object utama
      refreshObjectTableKiri(currentActiveRowId);

      if (eventType === "change") {
        const $currentRow = $input.closest("tr");
        const rowIndex = $currentRow.index();
      }
      return;
    }
  }

  function refreshObjectTableKiri(targetRowId) {
    const effectiveRowId =
      targetRowId || currentActiveRowId || lastSelectedRowId || "kiri-summary";

    const $activeButton = $(".view-summary-details-btn[data-active='true']");
    if ($activeButton.length) {
      const activeRowId = $activeButton.attr("data-rowid");
      if (activeRowId && activeRowId !== currentActiveRowId) {
        currentActiveRowId = activeRowId;
      }
    }
    let targetObject = kumpulanDataTableKiriKanan.find(
      (r) => String(r.rowId) === String(effectiveRowId),
    );

    if (!targetObject) {
      console.warn(` rowId ${effectiveRowId} not found, try fallback...`);

      const [vendorPart, secondPart] = String(effectiveRowId).split("-");
      const vendorId = parseInt(vendorPart) || 0;

      targetObject = kumpulanDataTableKiriKanan.find(
        (r) =>
          parseInt(r.vendorId) === vendorId &&
          parseInt(r.batch) === parseInt(secondPart),
      );

      if (!targetObject) {
        targetObject = kumpulanDataTableKiriKanan.find(
          (r) =>
            parseInt(r.vendorId) === vendorId &&
            (!r.batch || r.batch === 0) &&
            r.shipmentDate === secondPart,
        );
      }

      if (!targetObject) {
        console.error(
          ` Tidak menemukan object untuk RowID ${effectiveRowId} (vendor ${vendorId}, key ${secondPart})`,
        );
        return;
      }
    }

    const isCurrentlyViewingThisRow =
      lastSelectedRowId === effectiveRowId ||
      currentActiveRowId === effectiveRowId;

    if (isCurrentlyViewingThisRow) {
      targetObject.paymentDate = [];
      targetObject.notes = [];
      targetObject.percent = [];
      targetObject.formValue = [];
      targetObject.alert = [];
      targetObject.termDays = [];
      targetObject.OACredit = [];

      $("#tableKanan tr").each(function () {
        const $row = $(this);

        targetObject.paymentDate.push(
          $row.find(".paymentDateTableKanan").val() || "",
        );
        targetObject.notes.push(
          String($row.find(".notesTableKanan").val() || ""),
        );
        targetObject.percent.push(
          parseFloat($row.find(".percenTableKanan").val()) || 0,
        );
        targetObject.formValue.push(
          parseInt($row.find(".formValueTableKanan").val()) || 0,
        );
        targetObject.alert.push(
          parseInt($row.find(".alertTableKanan").val()) || 0,
        );
        targetObject.termDays.push(
          parseInt($row.find(".termDaysTableKanan").val()) || 0,
        );

        let oaCreditRaw = $row.find(".OACreditTableKanan").val() || "0";
        let oaCreditClean = oaCreditRaw.replace(/[,\s]/g, "");
        targetObject.OACredit.push(parseFloat(oaCreditClean) || 0);
      });
    } else {
    }
  }
  function getPaymentDateFromItem(item, alert) {
    if (alert === 3) return item.shipmentDate; // Shipment
    if (alert === 2) return item.poDateEst; // PO Est
    return item.poDateEst; // Default
  }
  function applyTermDays(baseDate, termDays) {
    if (!baseDate) return null;

    const d = new Date(baseDate);
    d.setDate(d.getDate() + parseInt(termDays)); // + atau - otomatis

    // Format YYYY-MM-DD
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");

    return `${dd}-${mm}-${yyyy}`;
  }

  // Helper function untuk mendapatkan baseDate berdasarkan alert type dan formValue
  function getBaseDateForAlert(target, relatedItems, alert, formValue) {
    // Jika formValue = 1 (Per Batch)
    if (formValue === 1) {
      if (alert === 3) {
        // Alert 3: Shipment - gunakan shipmentDate dari target
        return target.shipmentDate || target.blanketEst;
      } else if (alert === 2) {
        // Alert 2: PO Est - gunakan poDateEst dari item pertama
        const firstItem = relatedItems && relatedItems[0];
        return (firstItem && firstItem.poDateEst) || target.blanketEst;
      } else {
        // Alert 1 atau default: Blanket PO - gunakan blanketEst
        return target.blanketEst;
      }
    }

    // Jika formValue = 2 (Partial) - ini dipegang oleh getPaymentDateFromItem
    // tapi return blanketEst as fallback
    return target.blanketEst;
  }

  function generateTableCalculasi(targetRowId) {
    const target = kumpulanDataTableKiriKanan.find(
      (r) => String(r.rowId) === String(targetRowId),
    );

    if (!target) return console.warn(" Tidak ada data untuk kalkulasi.");

    const vendorId = target.vendorId;
    const batch = target.batch;

    const relatedItems = allTableTengahData.filter((item) => {
      const vendorMatch = parseInt(item.vendor) === parseInt(vendorId);

      if (batch > 0) {
        // Jika batch > 0: match vendor + batch
        return vendorMatch && parseInt(item.batch) === parseInt(batch);
      } else {
        // Jika batch = 0: match vendor + shipmentDate (untuk pisahkan data antar shipment)
        return (
          vendorMatch &&
          (!item.batch || parseInt(item.batch) === 0) &&
          item.shipmentDate === target.shipmentDate
        );
      }
    });

    if (relatedItems.length === 0) {
      console.warn(" Tidak ada item terkait di tabel tengah");
      return;
    }

    const totalQty = relatedItems.reduce((sum, i) => sum + (i.qty || 0), 0);

    const totalValue = relatedItems.reduce(
      (sum, item) => sum + item.qty * item.price,
      0,
    );
    const avgPrice = totalValue / totalQty;
    const resultRows = [];
    // let paymentPlanCounter = 1;

    for (let i = 0; i < target.percent.length; i++) {
      const percent = target.percent[i];
      const notes = target.notes[i];
      const formValue = target.formValue[i]; // 1=Per Batch, 2=Partial
      const alert = target.alert[i];
      const termDays = target.termDays[i];
      const OACredit = target.OACredit[i];

      if (formValue === 1) {
        // Gunakan helper function untuk mendapatkan baseDate sesuai alert
        const baseDate = getBaseDateForAlert(
          target,
          relatedItems,
          alert,
          formValue,
        );
        const paymentDate = applyTermDays(baseDate, termDays);
        const row = {
          // paymentPlanID: paymentPlanCounter,
          paymentDate: paymentDate,
          alert: alert,
          alertName: getAlertName(alert),
          notes: notes,
          fromValue: formValue,
          fromValueName: "Per Batch",
          percent: percent,
          termDays: termDays,
          OACredit: OACredit,
          qty: totalQty,
          payment: parseFloat(
            ((percent / 100) * totalQty * avgPrice).toFixed(2),
          ),
          itemDetail: "All Items", // indicator
        };

        resultRows.push(row);
        // paymentPlanCounter++;
      } else if (formValue === 2) {
        relatedItems.forEach((item, idx) => {
          const baseDate = getPaymentDateFromItem(item, alert);
          const finalPaymentDate = applyTermDays(baseDate, termDays);
          const row = {
            // paymentPlanID: currentPaymentID,
            paymentDate: finalPaymentDate,
            alert: alert,
            alertName: getAlertName(alert),
            notes: notes + ` (Shipment ${idx + 1}, ${item.itemCodeText})`, // tambah indicator
            fromValue: formValue,
            fromValueName: "Partial",
            percent: percent,
            termDays: termDays,
            OACredit: OACredit,
            qty: item.qty,
            payment: parseFloat(
              ((percent / 100) * item.qty * item.price).toFixed(2),
            ),
            itemDetail: `Item Code: ${item.code}, Shipment: ${item.shipmentDate}`,
          };

          resultRows.push(row);
        });
        // paymentPlanCounter++;
      }
    }

    renderTableKananCalc(resultRows);
    const existingIndex = globalCalcCache.findIndex(
      (r) => String(r.rowId) === String(targetRowId),
    );

    if (existingIndex !== -1) {
      // UPDATE result milik row ini
      globalCalcCache[existingIndex].calcResult = resultRows;
    } else {
      // TAMBAH BARU
      globalCalcCache.push({
        rowId: targetRowId,
        purchasePlanDtlID: arrListIDTableKiri[0],
        calcResult: resultRows,
      });
    }
  }

  function savePaymentCalcData(
    resultRows,
    purchasePlanID,
    targetRowId,
    arrListIDTableKiri,
    onDone,
  ) {
    // Payment data is optional - allow saving even if resultRows is empty
    if (!Array.isArray(resultRows) || resultRows.length === 0) {
      if (typeof onDone === "function") onDone();
      return;
    }

    // Cari purchasePlanDtlID dengan cara yang lebih robust (fallback berlapis)
    let purchasePlanDtlID = null;

    // 1. Coba dari globalCalcCache
    const cacheRow = globalCalcCache.find(
      (r) => String(r.rowId) === String(targetRowId),
    );

    if (cacheRow && cacheRow.purchasePlanDtlID) {
      purchasePlanDtlID = cacheRow.purchasePlanDtlID;
    }

    // 2. Jika tidak ada di cache, cari dari kumpulanDataTableKiriKanan
    if (
      !purchasePlanDtlID &&
      kumpulanDataTableKiriKanan &&
      kumpulanDataTableKiriKanan.length > 0
    ) {
      const kiriRow = kumpulanDataTableKiriKanan.find(
        (r) => String(r.rowId) === String(targetRowId),
      );
      if (kiriRow && kiriRow.purchasePlanDtlID) {
        purchasePlanDtlID = kiriRow.purchasePlanDtlID;
      }
    }

    // 3. Jika masih tidak ada, gunakan dari arrListIDTableKiri berdasarkan index
    if (
      !purchasePlanDtlID &&
      Array.isArray(arrListIDTableKiri) &&
      arrListIDTableKiri.length > 0
    ) {
      // Cari index dari targetRowId di kumpulanDataTableKiriKanan atau globalCalcCache
      let rowIndex = -1;

      if (kumpulanDataTableKiriKanan && kumpulanDataTableKiriKanan.length > 0) {
        rowIndex = kumpulanDataTableKiriKanan.findIndex(
          (r) => String(r.rowId) === String(targetRowId),
        );
      }

      if (rowIndex === -1) {
        rowIndex = globalCalcCache.findIndex(
          (r) => String(r.rowId) === String(targetRowId),
        );
      }

      if (rowIndex !== -1 && arrListIDTableKiri[rowIndex]) {
        purchasePlanDtlID = arrListIDTableKiri[rowIndex];
      } else {
        // Fallback ke ID pertama
        purchasePlanDtlID = arrListIDTableKiri[0];
      }
    }

    // 4. Validasi final
    if (!purchasePlanDtlID) {
      console.error("PurchasePlanDtlID tidak ditemukan!", {
        targetRowId,
        arrListIDTableKiri,
        cacheRow,
        kumpulanDataTableKiriKanan,
      });
      if (typeof onDone === "function") onDone();
      return;
    }

    const cleanRows = resultRows.map((r) => ({
      paymentPlanID: Number(purchasePlanDtlID),
      paymentDate: r.paymentDate || null,
      alert: r.alert || 0,
      alertName: r.alertName || "",
      notes: r.notes || "",
      fromValue: Number(r.fromValue || 0),
      fromValueName: r.fromValueName || "",
      percent: Number(r.percent || 0),
      termDays: Number(r.termDays || 0),
      OACredit: Number(r.OACredit || 0),
      qty: Number(r.qty || 0),
      payment: Number(r.payment || 0),
    }));

    const payload = {
      purchasePlanID: Number(purchasePlanID),
      rowId: targetRowId,
      calcResult: cleanRows,
    };

    let jsonString = "";
    try {
      jsonString = JSON.stringify(payload, null, 2);
    } catch (err) {
      console.error("JSON encoding failed:", err);
      alert("JSON encoding failed!");
      if (typeof onDone === "function") onDone();
      return;
    }

    // AJAX SEND
    $.ajax({
      url:
        BASE_URL +
        "scm/purchasing/purchase_order_plan/save_payment_calc_summary",
      method: "POST",
      dataType: "json",
      contentType: "application/json",
      data: jsonString,
      timeout: 30000,

      beforeSend: function () {},

      success: function (res) {
        if (res && res.status === "success") {
          if (typeof onDone === "function") onDone();
        } else {
          alert(
            "Error when save calculate data: " + (res.message || "Unknown"),
          );
        }
      },

      error: function () {
        alert("Failed save payment calculation");
        if (typeof onDone === "function") onDone();
      },
    });
  }

  // Helper function untuk convert alert ID ke nama
  function getAlertName(alertId) {
    const alertMap = {
      2: "PO",
      3: "Shipment",
      1: "Blanket PO",
    };
    return alertMap[alertId] || "Unknown";
  }

  function renderTableKananCalc(data) {
    const tbody = $("#tableKananCalcBody");
    tbody.empty();

    let totalPersen = 0;
    let totalQty = 0;
    let totalPayment = 0;

    let currentAlert = null; // untuk grouping visual

    data.forEach((item, index) => {
      // Tambah visual separator jika alert berubah
      const isNewGroup = currentAlert !== item.alertName;
      currentAlert = item.alertName;

      const row = `
      <tr ${isNewGroup && index > 0 ? 'style="border-top: 2px solid #ddd;"' : ""}>
        <td>
            ${item.paymentDate}
        </td>
        <td>
            ${item.alertName}
        </td>
        <td>${item.notes}</td>
        <td>
          <span style="background:${item.fromValue === 1 ? "#28a745" : "#ffc107"}; color:#fff; padding:2px 8px; border-radius:8px; font-size:11px;">
            ${item.fromValueName}
          </span>
        </td>
        <td style="text-align:right; font-weight:bold;">${item.percent}%</td>
        <td style="text-align:right; font-weight:bold;">${Number(
          item.payment,
        ).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}</td>
      </tr>
    `;

      tbody.append(row);

      // Hitung total (untuk Partial, persen dihitung sekali saja per group)
      if (item.fromValue === 1) {
        totalPersen += Number(item.percent) || 0;
      } else if (item.fromValue === 2) {
        // Cek apakah ini row pertama dari group partial ini
        const prevItem = data[index - 1];
        if (
          !prevItem ||
          prevItem.notes.split(" (Item")[0] !== item.notes.split(" (Item")[0]
        ) {
          totalPersen += Number(item.percent) || 0;
        }
      }

      totalQty += Number(item.qty) || 0;
      totalPayment += Number(item.payment) || 0;
    });

    // Render total ke footer - ensure totalPersen is a number
    totalPersen = Number(totalPersen) || 0;
    totalQty = Number(totalQty) || 0;
    totalPayment = Number(totalPayment) || 0;

    $("#totalPersenCalc").text(totalPersen.toFixed(0) + "%");
    $("#totalPaymentCalc").text(
      totalPayment.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    );

    // Warning jika total persen bukan 100%
    if (Math.abs(totalPersen - 100) > 0.01) {
      $("#totalPersenCalc")
        .css("color", "red")
        .attr("title", " Total harus 100%!");
    } else {
      $("#totalPersenCalc").css("color", "green");
    }
  }
  function loadInitialTableTengah() {
    const $tableBody = $("#tableTengah");
    $tableBody.html(
      '<tr class="no-data-row"><td colspan="11"><div style="text-align: center;">No data found.</div></td></tr>',
    );
  }

  $("#addLineTableTengah").click(function () {
    // Cek baris terakhir hanya jika sudah ada baris aktif
    if (activeRows >= 1) {
      const lastRowData = allTableTengahData[allTableTengahData.length - 1];

      if (!lastRowData) {
        alert("No data found in the current line!");
        return;
      }

      // Check: qty harus diisi, shipmentDate harus diisi
      const hasQty = lastRowData.qty && lastRowData.qty != 0;
      const hasShipmentDate =
        lastRowData.shipmentDate && lastRowData.shipmentDate.trim() !== "";

      if (hasQty && hasShipmentDate) {
        activeRows = 0;
      } else {
        alert("Please fill data in the current line before adding a new one!");
        return;
      }
    }

    // Validasi vendor kosong
    const adaVendorKosong = kumpulanDataTableKiriKanan.some((vendorObj) => {
      return !vendorObj.vendorId || vendorObj.vendorId == 0;
    });

    if (adaVendorKosong) {
      alert("Please select vendor and fill the blank before add new line!");
      return;
    }

    // Validasi baris kosong (jaga-jaga)
    const $rows = $("#tableTengah tr");
    let adaBarisKosong = false;

    $rows.each(function () {
      const shipmentDate = $(this).find(".shipment-date-field").val();
      const qty = $(this).find(".qty-field").val();

      if (!shipmentDate || shipmentDate.trim() === "" || !qty || qty == 0) {
        adaBarisKosong = true;
        return false; // stop loop
      }
    });

    // Payment is now optional, so no validation needed

    const $tableBody = $("#tableTengah");
    $tableBody.find(".no-data-row").remove();

    const tableKananCalc = document.getElementById("tableKananCalc");
    if (tableKananCalc) {
      tableKananCalc.style.visibility = "hidden";
    }

    // Tambah row tengah
    addRowTableTengah("tableTengah");
    renumberRows();
  });

  // Fungsi untuk manage visibility button duplicate
  function updateDuplicateButtonVisibility() {
    const $button = $("#duplicateLineTableTengah");

    // Hanya cek apakah ada data atau tidak
    if (allTableTengahData.length === 0) {
      $button.css("display", "none");
      return;
    }

    // Cek data terakhir dari array
    const lastData = allTableTengahData[allTableTengahData.length - 1];

    // Validasi dari array, tidak perlu cek DOM
    const isComplete =
      lastData &&
      lastData.vendor &&
      lastData.color &&
      lastData.shipmentYear &&
      lastData.ww &&
      lastData.shipmentDate &&
      lastData.shipmentDate.trim() !== "" &&
      lastData.qty &&
      lastData.qty != 0;

    if (isComplete) {
      $button.css("display", "inline-block");
    } else {
      $button.css("display", "none");
    }
  }

  $("#duplicateLineTableTengah").click(function () {
    // Payment is now optional, so no validation needed

    const $lastRow = $("#tableTengah tr").last();

    if ($lastRow.length === 0) {
      alert("No data to duplicate.");
      return;
    }

    // Validasi: baris terakhir harus lengkap
    const itemCode = $lastRow.find(".item-code-field").val();
    const vendor = $lastRow.find(".vendorSelector").val();
    const color = $lastRow.find(".color-field").val();
    const shipmentYear = $lastRow.find(".shipment-year-field").val();
    const ww = $lastRow.find(".ww-field").val();
    const shipmentDate = $lastRow.find(".shipment-date-field").val();
    const qty = $lastRow.find(".qty-field").val();
    const price = $lastRow.find(".price-field").val();

    if (
      !vendor ||
      !color ||
      !shipmentYear ||
      !ww ||
      !shipmentDate ||
      shipmentDate.trim() === "" ||
      !qty ||
      qty == 0
      // !price ||
      // price == 0
    ) {
      alert("Please fill all fields in the current line before duplicating!");
      return;
    }

    duplicateLastRowTableTengah("tableTengah");
  });

  loadInitialTableTengah();

  // Initialize: sembunyikan button duplicate saat pertama kali load
  updateDuplicateButtonVisibility();

  // Delete row di Table Tengah
  $(document).on("click", ".remove-row-icon", function (e) {
    const $rowToRemove = $(this).closest("tr");
    const $table = $rowToRemove.closest("table");
    const tableId = $table.attr("id");

    if (tableId === "tableKanan") {
      return;
    }

    const rowId = $rowToRemove.data("rowid");
    const rowIndex = $rowToRemove.index(); // FALLBACK: gunakan index dari DOM

    let dataIndex = allTableTengahData.findIndex(
      (item) => item.rowId === rowId,
    );

    // FALLBACK: jika rowId tidak match, gunakan rowIndex
    if (dataIndex === -1 && rowIndex >= 0) {
      dataIndex = rowIndex;
    }

    if (dataIndex !== -1 && allTableTengahData[dataIndex]) {
      const deletedRow = allTableTengahData[dataIndex];
      deletedVendorId = parseInt(deletedRow.vendor) || 0;
      deletedBatch = parseInt(deletedRow.batch) || 0;
      deletedShipmentDate = deletedRow.shipmentDate || "";

      kiriRowIdToDelete =
        deletedBatch > 0
          ? `${deletedVendorId}-${deletedBatch}`
          : `${deletedVendorId}-${deletedShipmentDate}`;

      // Hapus dari data source utama
      allTableTengahData.splice(dataIndex, 1);
    } else {
    }

    // Hapus row DOM
    $rowToRemove.remove();

    if (deletedVendorId > 0 && kiriRowIdToDelete) {
      let remainingRowsWithSameBatch = allTableTengahData.filter((row) => {
        const rowVendor = parseInt(row.vendor) || 0;
        const rowBatch = parseInt(row.batch) || 0;
        const rowShipmentDate = row.shipmentDate || "";

        if (deletedBatch > 0) {
          // Jika batch tertentu, match berdasarkan vendor + batch
          return rowVendor === deletedVendorId && rowBatch === deletedBatch;
        } else {
          // Jika batch kosong, match berdasarkan vendor + shipmentDate
          return (
            rowVendor === deletedVendorId &&
            (!rowBatch || rowBatch === 0) &&
            rowShipmentDate === deletedShipmentDate
          );
        }
      });

      if (remainingRowsWithSameBatch.length === 0) {
        // Jika entry yang dihapus sedang aktif (sedang di-view di tabel kanan), clear tabel kanan
        const $activeBtn = $(
          `.view-summary-details-btn[data-rowid='${kiriRowIdToDelete}']`,
        );
        if (
          $activeBtn.length > 0 &&
          $activeBtn.attr("data-active") === "true"
        ) {
          $("#tableKanan").html("");
          $("#judulTableKanan").text("").css("visibility", "hidden");
          $("#tableKananCalc").css("visibility", "hidden");

          // Reset current active row
          currentActiveRowId = null;
          lastSelectedRowId = null;
          focusIndexClass = -1;
        }
      }
    }

    updateTotalQty();
    updateTableKiriSummary();

    // nomor ulang
    renumberRows();

    // Update visibility button duplicate setelah row dihapus
    updateDuplicateButtonVisibility();
  });

  $(document).on("change", ".shipment-date-field", function () {
    var $currentRow = $(this).closest("tr");
    var selectedDateString = $(this).val();

    if (selectedDateString) {
      var selectedDate = new Date(selectedDateString);
      var weekNumber = getWeekOfYear(selectedDate);
      $currentRow.find(".ww-field").val(weekNumber);
    } else {
      $currentRow.find(".ww-field").val("");
    }
    const rowIndex = $currentRow.index();
    if (allTableTengahData[rowIndex]) {
      allTableTengahData[rowIndex].shipmentDate = selectedDateString || null;
    }

    // Update visibility button duplicate setelah shipment date berubah
    updateDuplicateButtonVisibility();
  });
  function getMondayFromISOWeek(year, week) {
    // 4 Jan selalu ada di ISO week 1
    const jan4 = new Date(year, 0, 4);

    // cari hari senin di ISO week 1
    const dayOfWeek = jan4.getDay() || 7; // Minggu = 7
    const mondayWeek1 = new Date(jan4);
    mondayWeek1.setDate(jan4.getDate() - dayOfWeek + 1);

    // geser ke week yang diminta
    const targetMonday = new Date(mondayWeek1);
    targetMonday.setDate(mondayWeek1.getDate() + (week - 1) * 7);

    return targetMonday;
  }
  $(document).on("change", ".ww-field", function () {
    const $currentRow = $(this).closest("tr");
    const wwValue = $(this).val(); // ex: WW202540
    const rowId = $currentRow.attr("data-rowid");

    if (!wwValue || !wwValue.startsWith("WW")) {
      $currentRow.find(".shipment-date-field").val("");
      // Clear WW dari data model jika ada rowId
      if (rowId) {
        const rowData = allTableTengahData.find((item) => item.rowId === rowId);
        if (rowData) {
          rowData.shipmentDate = "";
          rowData.ww = "";
        } else {
          // **FIX BUG: Fallback jika rowId tidak ketemu**
          const rowIndex = $currentRow.index();
          if (allTableTengahData[rowIndex]) {
            allTableTengahData[rowIndex].shipmentDate = "";
            allTableTengahData[rowIndex].ww = "";
          }
        }
      }
      return;
    }

    // parse WW202540 → year=2025, week=40
    const year = parseInt(wwValue.substring(2, 6), 10);
    const week = parseInt(wwValue.substring(6, 8), 10);

    if (isNaN(year) || isNaN(week)) {
      console.warn("Invalid WW format:", wwValue);
      return;
    }

    const mondayDate = getMondayFromISOWeek(year, week);

    // format ke yyyy-mm-dd (input type=date)
    const yyyy = mondayDate.getFullYear();
    const mm = String(mondayDate.getMonth() + 1).padStart(2, "0");
    const dd = String(mondayDate.getDate()).padStart(2, "0");
    const formattedDate = `${yyyy}-${mm}-${dd}`;

    // set ke shipment-date-field
    $currentRow.find(".shipment-date-field").val(formattedDate);

    // sync ke data model menggunakan rowId (lebih reliable daripada index)
    if (rowId) {
      const rowData = allTableTengahData.find((item) => item.rowId === rowId);
      if (rowData) {
        rowData.shipmentDate = formattedDate;
        rowData.ww = wwValue;
      } else {
        console.warn("rowData tidak ditemukan untuk rowId:", rowId);
        const rowIndex = $currentRow.index();
        const vendorId =
          parseInt($currentRow.find(".vendorSelector").val()) || 0;
        const batch = parseInt($currentRow.find(".batch-field").val()) || 0;

        // Fallback: cari berdasarkan vendor+batch
        let foundData = null;
        if (vendorId > 0) {
          if (batch > 0) {
            foundData = allTableTengahData.find(
              (item) => item.vendor === vendorId && item.batch === batch,
            );
          } else {
            // Jika batch 0, gunakan rowIndex sebagai fallback
            foundData = allTableTengahData[rowIndex];
          }
        } else {
          foundData = allTableTengahData[rowIndex];
        }

        if (foundData) {
          foundData.shipmentDate = formattedDate;
          foundData.ww = wwValue;
        } else {
          console.warn("Even fallback failed - could not update rowData");
        }
      }
    } else {
      // Fallback ke index jika data-rowid tidak ada
      const rowIndex = $currentRow.index();
      console.warn("data-rowid tidak ditemukan, fallback ke index:", rowIndex);
      if (allTableTengahData[rowIndex]) {
        allTableTengahData[rowIndex].shipmentDate = formattedDate;
        allTableTengahData[rowIndex].ww = wwValue;
      }
    }

    // Trigger summary update
    updateTableKiriSummary();

    const termDaysField = $currentRow.find(".term-days-field");
    if (termDaysField.val() && termDaysField.val() !== "") {
      termDaysField.trigger("change");
    }
  });

  $(document).on(
    "input change",
    ".shipment-date-field, .qty-field",
    function () {
      const $row = $(this).closest("tr");
      const shipmentDate = $row.find(".shipment-date-field").val();
      const qty = $row.find(".qty-field").val();

      if (shipmentDate && shipmentDate.trim() !== "" && qty && qty != 0) {
        if (activeRows > 0) {
          activeRows = 0;
        }
      }
    },
  );
  $(document).on("input", ".qty-field", function () {
    updateTotalQty();

    const $currentRow = $(this).closest("tr");

    const rowIndex = $currentRow.index();

    if (allTableTengahData[rowIndex]) {
      allTableTengahData[rowIndex].qty = parseInt($(this).val()) || 0;

      updateTableKiriSummary();
    }

    // Update visibility button duplicate setelah qty berubah
    updateDuplicateButtonVisibility();
  });

  $(document).on("blur", ".price-field", function () {
    const $currentRow = $(this).closest("tr");
    const rowIndex = $currentRow.index();
    let inputValue = $(this).val();
    let cleanValue = inputValue.replace(/[^\d.]/g, "");
    const dotCount = (cleanValue.match(/\./g) || []).length;
    if (dotCount > 1) {
      const firstDotIndex = cleanValue.indexOf(".");
      cleanValue =
        cleanValue.substring(0, firstDotIndex + 1) +
        cleanValue.substring(firstDotIndex + 1).replace(/\./g, "");
    }
    const numericValue = parseIndonesianNumber(cleanValue);
    const formattedDisplay = formatIndonesianNumber(numericValue);
    $(this).val(formattedDisplay);

    // Simpan nilai numerik murni ke data
    if (allTableTengahData[rowIndex]) {
      allTableTengahData[rowIndex].price = numericValue; // Simpan sebagai number, bukan string

      updateTableKiriSummary();
    }

    // Update visibility button duplicate setelah price berubah
    updateDuplicateButtonVisibility();
  });

  $(document).on("input", ".color-field", function () {
    const $currentRow = $(this).closest("tr");

    const rowIndex = $currentRow.index();

    if (allTableTengahData[rowIndex]) {
      allTableTengahData[rowIndex].color = $(this).val();
    }

    // Update visibility button duplicate setelah color berubah
    updateDuplicateButtonVisibility();
  });

  $(document).on("change", ".po-date-est-field", function () {
    const $currentRow = $(this).closest("tr");

    const rowIndex = $currentRow.index();

    if (allTableTengahData[rowIndex]) {
      allTableTengahData[rowIndex].poDateEst = $(this).val();
    }
  });
  $(document).on("change", ".term-days-field", function () {
    const $currentRow = $(this).closest("tr");
    const currentRowId = $currentRow.data("rowid");
    const rowIndex = $currentRow.index();

    // **FIX BUG: Coba find rowData menggunakan rowId, jika tidak ketemu gunakan rowIndex**
    let rowData = allTableTengahData.find((r) => r.rowId === currentRowId);
    if (!rowData) {
      // Fallback: gunakan rowIndex
      rowData = allTableTengahData[rowIndex];
      console.warn(
        "rowData not found by rowId, using rowIndex fallback:",
        rowIndex,
      );
    }

    if (!rowData || !rowData.shipmentDate) return;

    let termDaysRaw = $(this).val();
    let termDays = parseInt(termDaysRaw, 10);

    if (isNaN(termDays) || termDays < 0) {
      termDays = 0;
      $(this).val(termDays);
    }

    const shipmentDate = new Date(rowData.shipmentDate);

    const poDateEst = new Date(shipmentDate);
    poDateEst.setDate(poDateEst.getDate() - termDays);

    const poDateEstStr = poDateEst.toISOString().split("T")[0];

    $currentRow.find(".po-date-est-field").val(poDateEstStr);
    rowData.poDateEst = poDateEstStr;
    rowData.termDays = termDays;

    const vendorId =
      parseInt($currentRow.find(".vendorSelector").val()) || rowData.vendor;
    const batch = parseInt($currentRow.find(".batch-field").val()) || 0;

    // Sync ke rowData agar konsisten
    rowData.vendor = vendorId;
    rowData.batch = batch;

    const rowId =
      batch > 0
        ? `${vendorId}-${batch}`
        : `${vendorId}-${rowData.shipmentDate}`;

    const $leftRow = $(`.tableKiri tr[data-rowid='${rowId}']`);
    if ($leftRow.length === 0) return;

    let earliestPoDateEst = new Date(poDateEstStr);
    let poDateEstsFound = [];

    $("#tableTengah tr").each(function (idx) {
      const $row = $(this);

      // Baca vendor dan batch langsung dari DOM (bukan dari array yang mungkin stale)
      const rVendor = parseInt($row.find(".vendorSelector").val()) || 0;
      const rBatch = parseInt($row.find(".batch-field").val()) || 0;
      const rPoDateEst = $row.find(".po-date-est-field").val();
      const rShipmentDate = $row.find(".shipment-date-field").val();

      // Sync ke allTableTengahData agar konsisten
      if (allTableTengahData[idx]) {
        allTableTengahData[idx].vendor = rVendor;
        allTableTengahData[idx].batch = rBatch;
        if (rPoDateEst) allTableTengahData[idx].poDateEst = rPoDateEst;
      }

      // Perbaikan: saat batch=0, harus cocok vendor + shipmentDate juga
      let isMatch = false;
      if (batch > 0) {
        isMatch = rVendor === vendorId && rBatch === batch;
      } else {
        isMatch =
          rVendor === vendorId &&
          (!rBatch || rBatch === 0) &&
          rShipmentDate === rowData.shipmentDate;
      }

      // Cek apakah row ini match dengan group yang sama (vendor + batch)
      if (isMatch && rPoDateEst) {
        poDateEstsFound.push(rPoDateEst);

        const d = new Date(rPoDateEst);
        if (d < earliestPoDateEst) {
          earliestPoDateEst = d;
        }
      }
    });

    const blanketEstStr = earliestPoDateEst.toISOString().split("T")[0];

    $leftRow.find(".blanket-est-input").val(blanketEstStr).trigger("change");

    // update kumpulan
    const t = kumpulanDataTableKiriKanan.find((d) => d.rowId === rowId);
    if (t) t.blanketEst = blanketEstStr;

    // simpan termdays
    rowData.termDays = termDays;
  });

  // GANTI handler .batch-field input ini:
  $(document).on("input", ".batch-field", function () {
    const $currentRow = $(this).closest("tr");
    const rowIndex = $currentRow.index();

    if (!allTableTengahData[rowIndex]) {
      console.warn(
        "   allTableTengahData[rowIndex] is null/undefined, returning",
      );
      return;
    }

    const oldBatch = allTableTengahData[rowIndex].batch;
    const newBatch = parseInt($(this).val()) || 0;
    const currentVendorId = allTableTengahData[rowIndex].vendor;

    if (newBatch > 0) {
      const conflict = allTableTengahData.some((row, idx) => {
        if (idx === rowIndex) return false; // skip row sendiri
        if (!row || !row.vendor || !row.batch) return false;

        return (
          parseInt(row.batch) === newBatch &&
          parseInt(row.vendor) !== parseInt(currentVendorId)
        );
      });

      if (conflict) {
        alert("Invalid Batch!\nSame batch cannot be use for different vendor");

        // rollback ke nilai lama
        $(this).val(oldBatch || "");
        return; // STOP proses
      }
    }

    // Get vendor & shipmentDate SEBELUM update batch
    const vendorId = allTableTengahData[rowIndex].vendor;
    const shipmentDate = allTableTengahData[rowIndex].shipmentDate;

    // Key lama
    const oldKey =
      oldBatch > 0 ? `${vendorId}-${oldBatch}` : `${vendorId}-${shipmentDate}`;

    // Key baru
    const newKey =
      newBatch > 0 ? `${vendorId}-${newBatch}` : `${vendorId}-${shipmentDate}`;

    const otherRowsWithOldBatch = allTableTengahData.some((row, idx) => {
      if (idx === rowIndex) return false; // skip row sendiri
      return (
        parseInt(row.vendor) === parseInt(vendorId) &&
        parseInt(row.batch) === parseInt(oldBatch) // ← Gunakan oldBatch, bukan newBatch!
      );
    });

    allTableTengahData.forEach((row, idx) => {
      if (idx !== rowIndex) {
        const vendorMatch = parseInt(row.vendor) === parseInt(vendorId);
        const batchMatch = parseInt(row.batch) === parseInt(oldBatch);
      }
    });

    allTableTengahData[rowIndex].batch = newBatch;

    // PRESERVE data kiri
    const oldKiriData = kumpulanDataTableKiriKanan.find(
      (d) => d.rowId === oldKey,
    );

    // CEK APAKAH NEW KEY SUDAH EXIST
    const newKeyAlreadyExists = kumpulanDataTableKiriKanan.find(
      (d) => d.rowId === newKey,
    );

    if (oldKiriData) {
      // Cek berapa banyak entries dengan oldKey
      const oldKeyEntriesCount = kumpulanDataTableKiriKanan.filter(
        (d) => d.rowId === oldKey,
      ).length;

      if (otherRowsWithOldBatch || oldKeyEntriesCount > 1) {
        // CEK DULU: apakah newKey sudah ada?
        if (newKeyAlreadyExists) {
          // Kalau sudah ada, jangan CREATE BARU, gunakan existing

          // FIX: PRESERVE blanketEst dari oldKiriData jika newKeyAlreadyExists tidak punya
          if (oldKiriData.blanketEst && !newKeyAlreadyExists.blanketEst) {
            newKeyAlreadyExists.blanketEst = oldKiriData.blanketEst;
          }
        } else {
          const newKiriData = structuredClone(oldKiriData);
          newKiriData.rowId = newKey;
          newKiriData.batch = newBatch;
          newKiriData.blanketEst = null;

          // Payment data di-PRESERVE dari oldKiriData
          // (tidak di-reset, agar payment data tetap aman)

          kumpulanDataTableKiriKanan.push(newKiriData);
        }
      } else {
        // CEK DULU: apakah newKey sudah ada?
        if (newKeyAlreadyExists) {
          if (oldKiriData.blanketEst && !newKeyAlreadyExists.blanketEst) {
            newKeyAlreadyExists.blanketEst = oldKiriData.blanketEst;
          } else if (oldKiriData.blanketEst && newKeyAlreadyExists.blanketEst) {
            // Jika keduanya ada, gunakan yang lebih awal (earliest date)
            const oldDate = new Date(oldKiriData.blanketEst);
            const newDate = new Date(newKeyAlreadyExists.blanketEst);
            if (oldDate < newDate) {
              newKeyAlreadyExists.blanketEst = oldKiriData.blanketEst;
            }
          }

          // FIX BUG: Juga PRESERVE payment data dari oldKiriData jika newKeyAlreadyExists kosong
          if (
            Array.isArray(oldKiriData.paymentDate) &&
            oldKiriData.paymentDate.length > 0 &&
            (!Array.isArray(newKeyAlreadyExists.paymentDate) ||
              newKeyAlreadyExists.paymentDate.length === 0)
          ) {
            newKeyAlreadyExists.paymentDate = structuredClone(
              oldKiriData.paymentDate,
            );
            newKeyAlreadyExists.notes = structuredClone(
              oldKiriData.notes || [],
            );
            newKeyAlreadyExists.percent = structuredClone(
              oldKiriData.percent || [],
            );
            newKeyAlreadyExists.formValue = structuredClone(
              oldKiriData.formValue || [],
            );
            newKeyAlreadyExists.alert = structuredClone(
              oldKiriData.alert || [],
            );
            newKeyAlreadyExists.termDays = structuredClone(
              oldKiriData.termDays || [],
            );
            newKeyAlreadyExists.OACredit = structuredClone(
              oldKiriData.OACredit || [],
            );
          }

          // HAPUS old entry dari array karena sudah merge ke newKey
          const oldKeyIndex = kumpulanDataTableKiriKanan.findIndex(
            (d) => d.rowId === oldKey,
          );
          if (oldKeyIndex !== -1) {
            kumpulanDataTableKiriKanan.splice(oldKeyIndex, 1);
          }
        } else {
          // SAFE: newKey tidak exist, rename oldKey langsung
          oldKiriData.batch = newBatch;
          oldKiriData.rowId = newKey;
        }
      }
    }

    // Update table kiri
    updateTableKiriSummary();
    const $poDateEstField = $currentRow.find(".po-date-est-field");
    if ($poDateEstField.length) {
      $poDateEstField.val("");
    }

    // Sekarang trigger recalculation blanketEst dengan memicu term-days change event
    const $termDaysField = $currentRow.find(".term-days-field");
    if ($termDaysField.length && $termDaysField.val()) {
      setTimeout(() => {
        $termDaysField.trigger("change");
      }, 100);
    }
  });

  //close tabel ketika mengubah vendor
  $(document).on("change", "#tableTengah .vendorSelector", function () {
    const $currentRow = $(this).closest("tr");
    const rowIndex = $currentRow.index();
    const rowId = $currentRow.data("rowid");
    const newVendorId = parseInt($(this).val()) || 0;

    lastSelectedVendorId = String(newVendorId);
    lastSelectedRowId = rowId;

    const oldVendorId = allTableTengahData[rowIndex]?.vendor || null;
    const oldBatch = allTableTengahData[rowIndex]?.batch || null;
    const newBatch = allTableTengahData[rowIndex]?.batch || null; // batch masih sama karena belum diubah

    let mustReset = false;

    if (oldVendorId === null) {
      if (
        lastSelectedVendorId &&
        lastSelectedVendorId !== String(newVendorId)
      ) {
        mustReset = true; // beda → tutup
      }
    } else if (oldVendorId !== newVendorId) {
      mustReset = true;
    } else if (oldVendorId === newVendorId) {
      if (oldBatch !== null && newBatch !== null && oldBatch !== newBatch) {
        mustReset = true;
      }
    }

    if (mustReset) {
      $("#tableKanan").empty();
      $("#judulTableKanan").css("visibility", "hidden");
      $("#tableKananHead").css("visibility", "hidden");
    } else {
    }
    if (allTableTengahData[rowIndex]) {
      const oldVendorIdTemp = allTableTengahData[rowIndex].vendor;

      // Jika vendor berubah, auto-increment batch sebelum vendor diubah
      let newBatchValue = oldBatch;
      if (
        oldVendorIdTemp > 0 &&
        oldVendorIdTemp !== newVendorId &&
        newVendorId > 0 &&
        oldBatch > 0
      ) {
        const highestBatchOverall = Math.max(
          0,
          ...allTableTengahData.map((row) => row.batch || 0),
        );

        // Set batch ke batch tertinggi overall + 1
        newBatchValue = highestBatchOverall + 1;
      }

      // Sekarang update vendor
      allTableTengahData[rowIndex].vendor = newVendorId;

      if (!validateBatchVendorConsistency()) {
        // rollback jika tidak konsisten
        $(this).val(oldVendorIdTemp === null ? "" : oldVendorIdTemp);
        allTableTengahData[rowIndex].vendor = oldVendorIdTemp;
        allTableTengahData[rowIndex].batch = oldBatch;
        $currentRow.find(".batch-field").val(oldBatch);
      } else {
        // Update batch ke nilai yang sudah di-increment
        if (newBatchValue !== oldBatch) {
          $currentRow.find(".batch-field").val(newBatchValue);
          allTableTengahData[rowIndex].batch = newBatchValue;
        }
      }
      updateTableKiriSummary();
    }

    // Update visibility button duplicate setelah vendor berubah
    updateDuplicateButtonVisibility();
  });

  function validateBatchVendorConsistency() {
    const groupMap = {};

    for (let i = 0; i < allTableTengahData.length; i++) {
      const row = allTableTengahData[i];
      const vendorId = row.vendor;
      const batch = row.batch || 0;
      const shipmentDate = row.shipmentDate || "";

      let key;
      if (batch > 0) {
        key = `${vendorId}-${batch}`;
      } else if (shipmentDate) {
        key = `${vendorId}-${shipmentDate}`;
      } else {
        continue; // Skip jika keduanya kosong
      }

      if (!groupMap[key]) {
        groupMap[key] = {
          vendorId: vendorId,
          batch: batch,
          shipmentDate: shipmentDate,
          rows: [],
        };
      }
      groupMap[key].rows.push(i + 1);
    }

    return true; // Atau logika validasi sesuai kebutuhan
  }

  var arrListIDTableKiri = [];

  function refreshFinished() {
    $("#tableTengah").html("");
    $(".tableKiri").html("");
    $("#tableKanan").html("");
    kumpulanDataTableKiriKanan = [];
    allTableKiriData = [];
    allTableTengahData = [];
  }

  function formatToDate(dateValue) {
    if (dateValue) {
      var parts = dateValue.split("-");
      var year = parts[0];
      var month = parts[1];
      var day = parts[2];
      var formattedDate = `${day}/${month}/${year}`;
      return formattedDate;
    }
  }

  $(".btn-exit").click(function () {
    if (!confirm("Do you want to exit?")) return;
    window.location = base_path;
  });
  $(".btn-report").click(function () {
    const reportUrl = BASE_URL + "scm/purchasing/purchase_plan_report";
    window.open(reportUrl, "_blank");
  });

  // fungsi save

  const purchasePlanID = 0;
  $(".btn-save")
    .off("click")
    .on("click", function () {
      let errors = [];
      const saveButton = $(this);
      // set saving flag
      window.isSaving = true;
      saveButton.prop("disabled", true).text("Saving...");

      try {
        // 1. Sinkronkan data kiri dari tengah
        updateTableKiriSummary();
        // 2. Validasi Tabel Kanan (SEMUA DATA) dan tangkap hasilnya
        const tableKananValidation = validateAllTableKananData();

        // Cek apakah validasi tabel kanan berhasil
        if (!tableKananValidation.isValid) {
          // Tambahkan semua pesan error dari validasi tabel kanan
          errors.push(...tableKananValidation.messages);
        }

        let docDate = $("#DocDate").val();
        let itemDesc = $("#ItemDesc").val();
        let currID = $("#currency").val();
        let rate = $("#rate").val();

        if (!docDate) errors.push("Doc Date must be filled in.");
        if (!itemDesc) errors.push("Item Description must be filled in.");
        if (!currID) errors.push("currID must be filled in.");
        if (!rate) errors.push("rate must be filled in.");

        if (
          !Array.isArray(allTableTengahData) ||
          allTableTengahData.length === 0
        ) {
          errors.push("Middle table must be filled in.");
        } else {
          allTableTengahData.forEach((row, idx) => {
            const rowNo = idx + 1;
            if (!row.vendor)
              errors.push(`Middle table Row ${rowNo}: Vendor not selected.`);
            if (!row.qty || isNaN(row.qty) || row.qty <= 0) {
              errors.push(
                `Middle table Row ${rowNo}: Qty must be more than 0.`,
              );
            }
          });
        }
        if (
          !Array.isArray(kumpulanDataTableKiriKanan) ||
          kumpulanDataTableKiriKanan.length === 0
        ) {
          errors.push("Left table not filled (auto filled from middle table).");
        }

        // Payment data is now optional - only validate if payment data exists
        const hasPaymentDataInSave = kumpulanDataTableKiriKanan.some(
          (row) => Array.isArray(row.paymentDate) && row.paymentDate.length > 0,
        );

        if (hasPaymentDataInSave) {
          // Only validate payment date if there is payment data
          kumpulanDataTableKiriKanan.forEach((row, idx) => {
            const rowNo = idx + 1;
            if (
              Array.isArray(row.paymentDate) &&
              row.paymentDate.length > 0 &&
              (!Array.isArray(row.paymentDate) || row.paymentDate.length === 0)
            ) {
              errors.push(`Right table Row ${rowNo}: Payment Date not Filled.`);
            }
          });
        }

        const hasPaymentData = kumpulanDataTableKiriKanan.some(
          (row) => Array.isArray(row.paymentDate) && row.paymentDate.length > 0,
        );

        if (
          !isCalculatePaymentClicked &&
          kumpulanDataTableKiriKanan.length > 0 &&
          hasPaymentData
        ) {
          // Generate untuk semua row di kumpulanDataTableKiriKanan
          kumpulanDataTableKiriKanan.forEach((row) => {
            if (row.rowId) {
              generateTableCalculasi(row.rowId);
            }
          });
          isCalculatePaymentClicked = true;
        } else if (!hasPaymentData && kumpulanDataTableKiriKanan.length > 0) {
        }

        if (errors.length > 0) {
          alert("Validate Fail:\n\n" + errors.map((e) => "- " + e).join("\n"));
          saveButton.prop("disabled", false).text("Save");
          return;
        }

        saveHeaderData(docDate, itemDesc, currID, rate);
      } catch (error) {
        console.error("Error save data:", error);
        alert("Unknown Error when save data: " + error.message);
        saveButton.prop("disabled", false).text("Save");
      }
    });

  function saveHeaderData(DocDate, ItemDesc, currID, rate) {
    const saveButton = $(".btn-save");
    const errors = [];
    if (!DocDate) errors.push("Doc Date must be filled in.");
    if (!ItemDesc) errors.push("Item Description must be filled in.");
    if (!currID) errors.push("Currency must be filled in.");
    if (!rate) errors.push("rate must be filled in.");
    if (!Array.isArray(allTableTengahData) || allTableTengahData.length === 0) {
      errors.push("Middle Table must be filled in.");
    }
    if (
      !Array.isArray(kumpulanDataTableKiriKanan) ||
      kumpulanDataTableKiriKanan.length === 0
    ) {
      errors.push("Payment Detail Table must be filled in.");
    }
    if (errors.length) {
      alert("Validate fail:\n\n" + errors.map((e) => "- " + e).join("\n"));
      saveButton.prop("disabled", false).text("Save");
      return;
    }

    const tableData = allTableTengahData.map((row) => ({
      vendor: parseInt(row.vendor, 10),
      itemCode: parseInt(row.itemCode, 10),
      itemUnitId: parseInt(row.itemUnitId, 10),
      color: row.color,
      shipmentDate: row.shipmentDate, // format yyyy-mm-dd
      qty: parseFloat(row.qty),
      price: parseFloat(row.price),
      poDateEst: row.poDateEst, // format yyyy-mm-dd
      termDays: parseFloat(row.termDays),
      batch: parseInt(row.batch, 10) || null, // Send null if batch is 0
    }));

    const blanketId = $("#BlanketID").val(); // optional, kalau ada

    $.ajax({
      url: BASE_URL + "scm/purchasing/purchase_order_plan/save_header",
      type: "POST",
      dataType: "json",
      timeout: 30000,
      data: {
        doc_date: DocDate,
        item_desc: ItemDesc,
        currency: currID,
        rate: rate,
      },
      success: function (headerRes) {
        if (
          !(
            headerRes &&
            headerRes.status === "success" &&
            headerRes.dbtPurchasePlan_ID
          )
        ) {
          const msg = headerRes?.message || "Gagal membuat header.";
          alert("Error save header: " + msg);
          saveButton.prop("disabled", false).text("Save");
          return;
        }

        const purchasePlanID = headerRes.dbtPurchasePlan_ID;
        const docNumber = headerRes.docNumber;

        // Tampilkan DocNumber (opsional)
        $("#modalDocNumber").text(docNumber || "");

        $.ajax({
          url: BASE_URL + "scm/purchasing/purchase_order_plan/save",
          type: "POST",
          dataType: "json",
          timeout: 60000,
          // Kirim persis nama key yang dibaca controller:
          data: {
            purchasePlanID: purchasePlanID,
            blanket_id: blanketId || "",
            table_data: tableData,
            // payment_data: paymentData,
          },
          success: function (res) {
            if (res && res.status === "success") {
              const maybeDetailIds = Array.isArray(res.detailIds)
                ? res.detailIds
                : null;

              if (maybeDetailIds && maybeDetailIds.length > 0) {
                saveTableKiri(purchasePlanID, maybeDetailIds);
              } else {
                // otherwise: panggil saveTableKiriAjax tanpa ids — dia akan meminta server menyimpan summary dan mengembalikan IDs
                saveTableKiri(purchasePlanID);
              }
            } else {
              alert("Fail save detail: " + (res?.message || "Unknown"));
              window.isSaving = false;
              saveButton.prop("disabled", false).text("Save");
            }
          },
          error: function (xhr, status, error) {
            console.error("AJAX fail save detail/payment!", {
              status,
              error,
              responseText: xhr.responseText,
              code: xhr.status,
            });
            alert(
              "Error when save header data, check your Item code and Vendor",
            );
            window.isSaving = false;
            saveButton.prop("disabled", false).text("Save");
          },
        });
      },
      error: function (xhr, status, error) {
        console.error("AJAX GAGAL save header!", {
          status,
          error,
          responseText: xhr.responseText,
          code: xhr.status,
        });
        alert(buildAjaxError("header", xhr, status, error));
        window.isSaving = false;
        saveButton.prop("disabled", false).text("Save");
      },
    });
  }

  // Helper untuk pesan error AJAX yang rapih
  function buildAjaxError(stage, xhr, status, error) {
    let m = `Error when saving Data,  ${stage}:\n`;
    if (xhr.status === 0) m += "Tidak dapat terhubung ke server.";
    else if (xhr.status === 404) m += "Endpoint tidak ditemukan (404).";
    else if (xhr.status === 500) m += "Error internal server (500).";
    else if (status === "timeout") m += "Request timeout.";
    else if (xhr.responseText && xhr.responseText.includes("<html>"))
      m += "Server mengembalikan HTML error page.";
    else m += `HTTP ${xhr.status}: ${error || "Unknown error"}`;
    return m;
  }
  function saveTableKiri(purchasePlanID, preDetailIds = null) {
    const saveButton = $(".btn-save");

    const tableKiriPayload =
      typeof allTableKiriData !== "undefined" &&
      Array.isArray(allTableKiriData) &&
      allTableKiriData.length > 0
        ? allTableKiriData
        : typeof TableKiriSummary !== "undefined" &&
            Array.isArray(TableKiriSummary) &&
            TableKiriSummary.length > 0
          ? TableKiriSummary
          : kumpulanDataTableKiriKanan && kumpulanDataTableKiriKanan.length > 0
            ? kumpulanDataTableKiriKanan.map((row) => ({
                vendorId: row.vendorId ?? row.vendor ?? row.Vendor,
                batch: row.batch ?? row.Batch,
                blanketEst: row.blanketEstDate ?? row.blanketEst,
                total: row.totalAmount ?? row.total ?? 0,
              }))
            : [];

    if (!purchasePlanID || purchasePlanID <= 0) {
      alert("Error: purchasePlanID invalid");
      window.isSaving = false;
      saveButton.prop("disabled", false).text("Save");
      return;
    }

    if (!Array.isArray(tableKiriPayload) || tableKiriPayload.length === 0) {
      if (!Array.isArray(preDetailIds) || preDetailIds.length === 0) {
        alert(
          "Error: No table kiri data available and no preDetailIds passed.",
        );
        window.isSaving = false;
        saveButton.prop("disabled", false).text("Save");
        return;
      }
    }

    if (Array.isArray(preDetailIds) && preDetailIds.length > 0) {
      if (kumpulanDataTableKiriKanan && kumpulanDataTableKiriKanan.length > 0) {
        kumpulanDataTableKiriKanan.forEach((row, idx) => {
          row.purchasePlanDtlID = preDetailIds[idx] ?? preDetailIds[0];
        });
      }

      savePaymentDetails(preDetailIds, purchasePlanID);
      return;
    }

    const payload = {
      purchasePlanID: purchasePlanID,
      table_data: tableKiriPayload,
    };

    $.ajax({
      url: BASE_URL + "scm/purchasing/purchase_order_plan/saveTableKiri",
      type: "POST",
      contentType: "application/json",
      dataType: "json",
      data: JSON.stringify(payload),
      success: function (res) {
        const detailIds = Array.isArray(res.inserted_summary_ids)
          ? res.inserted_summary_ids
          : Array.isArray(res.saved_records)
            ? res.saved_records
            : Array.isArray(res.inserted_ids)
              ? res.inserted_ids
              : [];

        if (!Array.isArray(detailIds) || detailIds.length === 0) {
          console.error("saveTableKiri did not return detail IDs:", res);
          alert("Error: server Detail IDs from saveTableKiri.");
          window.isSaving = false;
          saveButton.prop("disabled", false).text("Save");
          return;
        }

        if (
          kumpulanDataTableKiriKanan &&
          kumpulanDataTableKiriKanan.length > 0
        ) {
          kumpulanDataTableKiriKanan.forEach((row, idx) => {
            row.purchasePlanDtlID = detailIds[idx] ?? detailIds[0];
          });
        }

        savePaymentDetails(detailIds, purchasePlanID);
      },
      error: function (xhr) {
        console.error("AJAX Gagal saveTableKiri:", xhr.responseText);
        alert("Error saving left table");
        window.isSaving = false;
        saveButton.prop("disabled", false).text("Save");
      },
    });
  }

  // Konversi dataClassTableKiriKanan ke format yang benar
  function convertTableKananDataToPlainObject(dataClassArray) {
    if (!Array.isArray(dataClassArray)) {
      console.error(
        "Expected array but got:",
        typeof dataClassArray,
        dataClassArray,
      );
      return [];
    }

    const result = dataClassArray.map((dataClass, index) => {
      // Buat plain object structure yang bisa di-serialize
      const plainObject = {
        namaVendor: dataClass.namaVendor || "",
        vendorId: dataClass.vendorId || 0,
        batch: dataClass.batch || 0,
        paymentDetails: [],
      };

      // Extract payment details dari arrays dalam dataClass
      if (dataClass.paymentDate && Array.isArray(dataClass.paymentDate)) {
        const paymentCount = dataClass.paymentDate.length;

        for (let i = 0; i < paymentCount; i++) {
          const paymentDetail = {
            paymentDate: dataClass.paymentDate[i] || "",
            notes: (dataClass.notes && dataClass.notes[i]) || "",
            percent: parseFloat(dataClass.percent && dataClass.percent[i]) || 0,
            formValue:
              parseInt(dataClass.formValue && dataClass.formValue[i]) || 0,
            alert: parseInt(dataClass.alert && dataClass.alert[i]) || 0,
            termDays:
              parseInt(dataClass.termDays && dataClass.termDays[i]) || 0,
            oaCredit: parseFloat(
              (dataClass.OACredit && dataClass.OACredit[i]) || 0,
            ),
            // oaCredit: Number(((dataClass.OACredit && dataClass.OACredit[i]) || 0).toString().replace(/,/g, '')),
          };

          plainObject.paymentDetails.push(paymentDetail);
        }
      }
      return plainObject;
    });

    return result;
  }

  function savePaymentDetails(arrListIDTableKiri, purchasePlanID) {
    const saveButton = $(".btn-save");

    // Check apakah ada payment data sama sekali
    const hasAnyPaymentData =
      kumpulanDataTableKiriKanan &&
      kumpulanDataTableKiriKanan.some(
        (row) => Array.isArray(row.paymentDate) && row.paymentDate.length > 0,
      );

    // Jika tidak ada payment data, tidak perlu generate calculation, langsung success
    if (!hasAnyPaymentData) {
      alert(
        "SUCCESS: Payment data empty - document saved without payment calculations",
      );
      window.isSaving = false;
      saveButton.prop("disabled", false).html("Save Data");

      // Reset form dan UI
      $("#successModal").modal("show");
      $("#DocDate").val("");
      $("#ItemDesc").val("");
      refreshFinished();
      updateTotalQty();
      updateTableKiriSummary();
      $("#successModal").on("hidden.bs.modal", function () {
        location.reload(); // Refresh halaman penuh
      });
      return;
    }

    // Jika ada payment data, maka globalCalcCache harus ada
    if (!globalCalcCache || globalCalcCache.length === 0) {
      alert("Not yet generate payment calculation!");
      window.isSaving = false;
      saveButton.prop("disabled", false).html("Save Data");
      return;
    }

    // Validasi arrListIDTableKiri
    if (!arrListIDTableKiri || arrListIDTableKiri.length === 0) {
      console.error(" arrListIDTableKiri kosong atau tidak valid");
      alert("Error: ID left table missing!");
      window.isSaving = false;
      saveButton.prop("disabled", false).html("Save Data");
      return;
    }

    // Konversi dataClass ke plain object
    let allTableKananData = [];

    if (kumpulanDataTableKiriKanan && kumpulanDataTableKiriKanan.length > 0) {
      try {
        allTableKananData = convertTableKananDataToPlainObject(
          kumpulanDataTableKiriKanan,
        );

        // Validasi hasil konversi
        if (!allTableKananData || allTableKananData.length === 0) {
          console.warn(" Conversion resulted in empty data");
          allTableKananData = [];
        } else {
          // Pastikan hasil sudah dalam bentuk plain object
          const firstItem = allTableKananData[0];
          if (
            firstItem &&
            typeof firstItem === "object" &&
            firstItem.constructor.name === "Object"
          ) {
          } else {
            console.error(
              " Data conversion failed - still not plain object:",
              firstItem,
            );
            throw new Error(
              "Data conversion failed - result is not plain object",
            );
          }
        }
      } catch (error) {
        console.error(" Error converting dataClass:", error);
        console.error("Error stack:", error.stack);
        alert("Error: Failed to convert payment data - " + error.message);
        window.isSaving = false;
        saveButton.prop("disabled", false).html("Save Data");
        return;
      }
    } else {
      allTableKananData = [];
    }

    // Update button text
    saveButton.html(
      '<i class="fa fa-spinner fa-spin"></i> Saving Payment Details...',
    );

    // Buat payload yang bersih
    const payload = {
      purchasePlanID: parseInt(purchasePlanID),
      arrListIDTableKiri: arrListIDTableKiri.map((id) => parseInt(id)),
      allTableKananData: allTableKananData,
    };

    // Test JSON serialization sebelum dikirim
    let jsonString;
    try {
      jsonString = JSON.stringify(payload);
    } catch (error) {
      console.error(" JSON serialization failed:", error);
      alert("Error: Failed to serialize data for sending");
      window.isSaving = false;
      saveButton.prop("disabled", false).html("Save Data");
      return;
    }

    $.ajax({
      url: BASE_URL + "scm/purchasing/purchase_order_plan/save_payment_details",
      type: "POST",
      contentType: "application/json",
      dataType: "json",
      data: jsonString,
      timeout: 30000,
      beforeSend: function () {},
      success: function (paymentResponse) {
        if (paymentResponse && paymentResponse.status === "success") {
          const savedCount = paymentResponse.saved_records || 0;
          alert(`SUCCESS: \nPayment records saved: ${savedCount}`);
          let totalCalc = globalCalcCache.length;
          let finishedCalc = 0;

          if (totalCalc === 0) {
            alert("Nothing payment calculation for save!");
            location.reload();
            return;
          }

          globalCalcCache.forEach((cacheItem, idx) => {
            // Cari matching kumpulanDataTableKiriKanan berdasarkan rowId
            let kiriIndex = -1;
            if (
              kumpulanDataTableKiriKanan &&
              kumpulanDataTableKiriKanan.length > 0
            ) {
              kiriIndex = kumpulanDataTableKiriKanan.findIndex(
                (r) => String(r.rowId) === String(cacheItem.rowId),
              );
            }

            // Assign purchasePlanDtlID dari arrListIDTableKiri
            if (kiriIndex !== -1 && arrListIDTableKiri[kiriIndex]) {
              cacheItem.purchasePlanDtlID = arrListIDTableKiri[kiriIndex];
              if (kumpulanDataTableKiriKanan[kiriIndex]) {
                kumpulanDataTableKiriKanan[kiriIndex].purchasePlanDtlID =
                  arrListIDTableKiri[kiriIndex];
              }
            } else if (arrListIDTableKiri[idx]) {
              cacheItem.purchasePlanDtlID = arrListIDTableKiri[idx];
            } else if (arrListIDTableKiri[0]) {
              cacheItem.purchasePlanDtlID = arrListIDTableKiri[0];
            }
          });

          globalCalcCache.forEach((row) => {
            savePaymentCalcData(
              row.calcResult,
              purchasePlanID,
              row.rowId,
              arrListIDTableKiri,
              () => {
                finishedCalc++;

                if (finishedCalc === totalCalc) {
                  // alert("SEMUA PAYMENT CALC BERHASIL DISIMPAN");
                  location.reload();
                }
              },
            );
          });

          // Reset form dan UI
          $("#successModal").modal("show");
          $("#DocDate").val("");
          $("#ItemDesc").val("");
          refreshFinished();
          updateTotalQty();
          updateTableKiriSummary();
          $("#successModal").on("hidden.bs.modal", function () {
            location.reload(); // Refresh halaman penuh
          });
        } else {
          console.error(" Server returned error:", paymentResponse);
          alert(
            "Fail save payment: " +
              (paymentResponse?.message || "Unknown error"),
          );
        }

        // Reset state
        window.isSaving = false;
        saveButton.prop("disabled", false).html("Save Data");
      },
      error: function (jqXHR, textStatus, errorThrown) {
        console.error(" AJAX Payment save error:", {
          status: jqXHR.status,
          statusText: jqXHR.statusText,
          responseText: jqXHR.responseText,
          textStatus: textStatus,
          errorThrown: errorThrown,
        });

        // Detailed error parsing
        let errorMessage = "Error menyimpan payment details";
        let debugInfo = "";

        if (jqXHR.status === 400) {
          errorMessage = "Bad Request - Data yang dikirim tidak valid";
        } else if (jqXHR.status === 500) {
          errorMessage = "Internal Server Error - Terjadi kesalahan di server";
        } else if (jqXHR.status === 0) {
          errorMessage = "Network Error - Tidak dapat terhubung ke server";
        }

        if (jqXHR.responseText) {
          try {
            const errorObj = JSON.parse(jqXHR.responseText);
            if (errorObj.message) {
              errorMessage += ": " + errorObj.message;
            }
            if (errorObj.debug) {
              debugInfo =
                "\nDebug Info: " + JSON.stringify(errorObj.debug, null, 2);
            }
          } catch (e) {
            debugInfo =
              "\nServer Response: " + jqXHR.responseText.substring(0, 300);
          }
        }

        alert(errorMessage + debugInfo);

        // Reset state
        window.isSaving = false;
        saveButton.prop("disabled", false).html("Save Data");
      },
    });
  }

  function getBigDataTableKiri() {
    allTableKiriData = [];

    // Gunakan kumpulanDataTableKiriKanan yang sudah ter-update sebagai sumber utama
    if (kumpulanDataTableKiriKanan && kumpulanDataTableKiriKanan.length > 0) {
      kumpulanDataTableKiriKanan.forEach((row, index) => {
        const rowData = {
          vendorId: parseInt(row.vendorId) || 0,
          vendorName: vendorMap[row.vendorId] || "N/A",
          blanketEst: row.blanketEst || "", // baca dari row.blanketEst, bukan blanketEstDate
          batch: parseInt(row.batch) || 0,
          total: parseFloat(row.totalAmount) || 0,
        };

        if (rowData.vendorId > 0 && rowData.vendorName !== "N/A") {
          allTableKiriData.push(rowData);
        } else {
          console.warn(`Row ${index} skipped - invalid data:`, rowData);
        }
      });

      return;
    }
    const tableRows = $(".tableKiri tbody tr");

    if (tableRows.length === 0) {
      console.warn("No table rows found in .tableKiri tbody tr");
      return;
    }

    tableRows.each(function (index, row) {
      var $row = $(this);
      var rowData = {};

      // Baca dari dropdown selectors (struktur baru)
      const $vendorSelector = $row.find(".vendorSelector");
      const $batchSelector = $row.find(".batchSelector");
      const $totalCell = $row.find(".totalAmountCell");
      const $viewButton = $row.find(".view-summary-details-btn");

      if ($vendorSelector.length > 0 && $batchSelector.length > 0) {
        // Struktur baru dengan dropdowns
        const selectedVendorId = parseInt($vendorSelector.val()) || 0;
        const selectedBatch = parseInt($batchSelector.val()) || 0;

        rowData.vendorId = selectedVendorId;
        rowData.vendorName =
          $vendorSelector.find("option:selected").text() ||
          vendorMap[selectedVendorId] ||
          "N/A";
        rowData.batch = selectedBatch;

        // Parse total dari text (hapus formatting)
        const totalText = $totalCell.text().trim();
        rowData.total = parseFloat(totalText.replace(/[^0-9.-]+/g, "")) || 0;
      } else {
        // Struktur lama (fallback jika masih ada)
        const cell0Text = $row.find("td:eq(0)").text().trim();
        const cell1Text = $row.find("td:eq(1)").text().trim();
        const cell2Text = $row.find("td:eq(2)").text().trim();

        rowData.vendorName = cell0Text;

        const batchMatch = cell1Text.match(/batch\s*(\d+)/i);
        rowData.batch = batchMatch ? parseInt(batchMatch[1]) : 0;

        rowData.total = parseFloat(cell2Text.replace(/[^0-9.-]+/g, "")) || 0;
        rowData.vendorId = parseInt($viewButton.data("vendorid"), 10) || 0;
      }

      // Hanya tambahkan jika data valid
      if (
        rowData.vendorId > 0 &&
        rowData.vendorName &&
        rowData.vendorName !== "N/A"
      ) {
        allTableKiriData.push(rowData);
      } else {
        console.warn(`Row ${index} skipped - invalid data:`, rowData);
      }
    });
  }
  // Tambahkan fungsi untuk memastikan kumpulanDataTableKiriKanan selalu ter-sync
  function ensureTableKiriDataLoaded(callback) {
    if (
      !kumpulanDataTableKiriKanan ||
      kumpulanDataTableKiriKanan.length === 0
    ) {
      const $tableRows = $(".tableKiri tbody tr");

      if ($tableRows.length > 0) {
        kumpulanDataTableKiriKanan = [];

        $tableRows.each(function () {
          const $row = $(this);
          const $button = $row.find(".view-summary-details-btn");
          const $totalCell = $row.find(".totalAmountCell");

          const vendorId = $button.data("vendorid");
          const batch = $button.data("batch") || 0;
          const shipmentDate = $button.data("shipmentdate") || ""; // Tambahkan
          const blanketEstDate = $button.attr("data-blanketestdate") || "";
          const totalText = $totalCell.text().trim();
          const totalAmount =
            parseFloat(totalText.replace(/[^0-9.-]+/g, "")) || 0;

          // Validasi: harus ada batch ATAU shipmentDate
          if (vendorId && (batch > 0 || shipmentDate)) {
            kumpulanDataTableKiriKanan.push({
              vendorId: vendorId,
              batch: batch,
              shipmentDate: shipmentDate,
              blanketEst: blanketEstDate, // field name konsisten: blanketEst, bukan blanketEstDate
              totalAmount: totalAmount,
              namaVendor: vendorMap[vendorId] || "N/A",
              paymentDate: [""],
              notes: [""],
              percent: [""],
              formValue: [],
              alert: [],
              termDays: [""],
              OACredit: [""],
            });
          }
        });
      }
    }

    getBigDataTableKiri();

    if (callback && typeof callback === "function") {
      callback();
    }
  }

  // Event listener untuk button save dengan pre-check
  $(document).on("click", ".btn-save", function () {
    const purchasePlanID =
      $(this).data("purchase-plan-id") ||
      $("#purchasePlanID").val() ||
      window.currentPurchasePlanID;
    // Ensure data loaded before save
    ensureTableKiriDataLoaded(function () {
      saveTableKiri(purchasePlanID);
    });
  });

  updateTotalQty();
  const $addLineButton = $("#addLineTableTengah");
  $addLineButton.prop("disabled", true);

  loadColorOptions()
    .done(function () {
      $addLineButton.prop("disabled", false);
      updateTableKiriSummary();
    })
    .fail(function () {
      console.error(
        "Failed to load required options. Add Line button remains disabled.",
      );
      alert("ERROR when load data. Button 'Add Line' set to non-active.");
    });

  $("#vendor").on("changed.bs.select", function () {
    $("#billing-id").val("");
    $("#billing").val("");
    $("#select-billing").prop("disabled", false);
    $("#shipment-id").val("");
    $("#shipment").val("");
    $("#select-shipment").prop("disabled", false);
    if ($(this).val() == -1) return;
  });
});
