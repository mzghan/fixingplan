// Variabel global
let urlParams = new URLSearchParams(window.location.search);
let idFromUrl = urlParams.get("id");
let headID = 0;
let colorOptionsHTML = "";
let yearOptionsHTML = "";
let vendorMap = {};
let vendorMap_reverse = {};
let DocDate = $("#DocDate");
let ItemDescInput = $("#ItemDesc");
let purchasePlanTableBody = $("#purchasePlanTable tbody");
let purchasePlanTableHeader = $("#purchasePlanTable thead tr");
let currentItemDescriptionFilter = "";
let currentQuarterFilter = "Q1";
let selectedRowData = null;
let currentDtlTempRowId = null;
let currentDtlRealId = null;
let allVendors = [];
let allItems = [];
var lastSelectedRowId = null;
var lastSelectedVendorId = null;
var lastSelectedBatchByVendor = {};
var kumpulanDataTableKiriKanan = [];
var ctrNoUrut = 0;
let hasUnsavedChanges = false;
let currentLoadedVendorBatch = null;
var btnSave = $(".btn-save");
var btnAddLineTableTengah = $("#addLineTableTengah");
var isCalculatePaymentClicked = false; // Flag untuk track apakah calculatePayment sudah diklik
var totalQtyTableTengah = $("#total-qty-main");
var tbodyTotalTableKiri = $(".tbodyTotalTableKiri");
let globalDataTableKanan = 0;
let IDRow = 0;
let dbtPurchasePlan_ID = 0;
let currentActiveRowId = null;
let lastValidTableKiriData = [];
let globalDtlMap = {};
let globalPaymentCalcData = [];
let wwDataByYear = {}; // cache: { 2025: [...] }
let wwOptionsHTMLByYear = {};
let globalCalcCache = [];
let savedCalcDataFromDB = {};
let hasCalcChanges = false;
let isInitialLoadComplete = false; // Flag untuk mencegah markCalcAsChanged saat load awal
window.globalFinalDtlIdMap = {};

// Cache flag: peta nama vendor (untuk label) cukup ditarik sekali per sesi edit
let isVendorOptionsCached = false;
let isColorOptionsCached = false;

let quarterWeeksMap = {
  Q1: { start: 1, end: 12 },
  Q2: { start: 13, end: 24 },
  Q3: { start: 25, end: 36 },
  Q4: { start: 37, end: 48 },
};

// DELETION TRACKING - Arrays untuk melacak baris yang dihapus
let deletedShipmentIDs = []; // ShipmentID yang dihapus dari table tengah
let deletedDtlIDs = []; // DtlID yang dihapus dari table kiri

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

function disablePlanClosedElements() {
  // console.log(" disablePlanClosedElements called");
  // console.log("  window.planClosed:", window.planClosed);
  // console.log("  window.hasPartialClosed:", window.hasPartialClosed);

  // Jika SEMUA row closed, disable semuanya seperti sebelumnya
  if (window.planClosed === true) {
    // console.log("   ALL CLOSED - Disabling everything");
    // Disable main
    $("input, select, textarea, button")
      .not(".btn-exit, .btn-history, #calculatePayment, .close")
      .prop("disabled", true)
      .prop("readonly", true);

    $(".BigDataTableTengah")
      .find("input, select, textarea")
      .prop("disabled", true)
      .prop("readonly", true);

    // Select2 special handling
    $(".BigDataTableTengah select").each(function () {
      const $sel = $(this);
      if ($sel.data("select2")) {
        $sel.select2("destroy");
      }
      $sel.prop("disabled", true);
      $sel.select2({ disabled: true });
    });

    // Disable delete action
    $(".remove-row-icon")
      .off("click")
      .css("opacity", "0.5")
      .css("cursor", "not-allowed");

    disableTableKananIfPlanClosed();
  }
  // Jika hanya SEBAGIAN row closed, disable hanya row yang closed
  else if (window.hasPartialClosed === true) {
    // console.log("   PARTIAL CLOSED - Disabling only closed rows");
    disableClosedRowsOnly();
  } else {
    // console.log("   NO CLOSED - Nothing to disable");
  }
}

function disableClosedRowsOnly() {
  // console.log(" Partial Closed - Disabling only closed rows");

  // Loop setiap row di table tengah
  $(".BigDataTableTengah tbody tr").each(function () {
    const $row = $(this);
    const closedVal = $row.attr("data-closed");
    const isClosed = closedVal === "1" || closedVal === "2";

    if (isClosed) {
      // Disable semua input di row ini
      $row
        .find("input, textarea")
        .prop("disabled", true)
        .prop("readonly", true);

      // Disable select2
      $row.find("select").each(function () {
        const $select = $(this);
        if ($select.data("select2")) {
          $select.select2("destroy");
        }
        $select.prop("disabled", true);
        $select.select2({ disabled: true });
      });

      // Disable delete icon
      $row
        .find(".remove-row-icon")
        .off("click")
        .css("opacity", "0.5")
        .css("cursor", "not-allowed")
        .css("pointer-events", "none");

      // Tambahkan visual indicator bahwa row ini locked
      $row.addClass("row-closed").css("background-color", "#f5f5f5");

      // console.log(
      //   `Row shipment-id=${$row.attr("data-shipment-id")} DISABLED (closed)`,
      // );
    } else {
      // console.log(
      //   `Row shipment-id=${$row.attr("data-shipment-id")} ENABLED (open)`,
      // );
    }
  });

  // Juga disable table kiri dan kanan untuk row yang closed
  disableTableKiriKananClosedRows();
}

function disableTableKiriKananClosedRows() {
  // Kumpulkan vendor+batch yang closed dari table tengah
  const closedVendorBatches = new Set();

  $(".BigDataTableTengah tbody tr").each(function () {
    const closedVal = $(this).attr("data-closed");
    if (closedVal === "1" || closedVal === "2") {
      const vendorId = $(this).attr("data-vendor-id");
      const batch = $(this).attr("data-batch");
      if (vendorId && batch) {
        closedVendorBatches.add(`${vendorId}-${batch}`);
        // console.log(` Closed: ${vendorId}-${batch}`);
      }
    }
  });

  // console.log(
  //   "Closed vendor-batch combinations:",
  //   Array.from(closedVendorBatches),
  // );

  // Disable table kiri rows - cek dari data-closed attribute langsung
  $(".BigDataTableKiri tbody tr").each(function () {
    const $row = $(this);
    const closedVal = $row.attr("data-closed");
    const isClosed = closedVal === "1" || closedVal === "2";
    const vendorId = $row.find("td:eq(0)").attr("data-vendor-id");
    const batch = $row.find("td:eq(1)").attr("data-batch");
    const key = `${vendorId}-${batch}`;

    if (isClosed || closedVendorBatches.has(key)) {
      $row.addClass("row-closed").css("background-color", "#f5f5f5");
      $row
        .find("input, select, textarea")
        .prop("disabled", true)
        .prop("readonly", true);
      $row
        .find(".view-summary-details-btn, .go-to-blanket-btn")
        .prop("disabled", true)
        .css("opacity", "0.5")
        .css("cursor", "not-allowed");
      // console.log(`Table Kiri: ${key} DISABLED`);
    }
  });

  const $activeLeftRow = $(".BigDataTableKiri tbody tr.table-active");
  if ($activeLeftRow.length === 0) {
    console.warn(
      " Tidak ada row active di table kiri, skip table kanan disable logic",
    );
    return;
  }

  const currentVendorId = $activeLeftRow
    .find("td:eq(0)")
    .attr("data-vendor-id");
  const currentBatch = $activeLeftRow.find("td:eq(1)").attr("data-batch");
  const currentKey = `${currentVendorId}-${currentBatch}`;

  // console.log(` Currently viewing: ${currentKey}`);
  // console.log(`   Is closed? ${closedVendorBatches.has(currentKey)}`);

  if (!closedVendorBatches.has(currentKey)) {
    // console.log(` Batch ${currentKey} OPEN - enabling all table kanan rows`);

    $("#tableKanan tr").each(function () {
      const $row = $(this);

      // Remove disabled state
      $row.removeClass("row-closed").css("background-color", "");
      $row
        .find("input, select, textarea")
        .prop("disabled", false)
        .prop("readonly", false);

      // Re-enable select2
      $row.find("select").each(function () {
        const $select = $(this);
        $select.prop("disabled", false);
        if ($select.data("select2")) {
          $select.select2("destroy");
        }
        $select.select2({ disabled: false });
      });

      // Enable delete icon
      $row
        .find(".deleteRowTableKanan")
        .css("opacity", "1")
        .css("cursor", "pointer")
        .css("pointer-events", "auto");
    });

    // console.log(` Table Kanan: ALL ROWS ENABLED`);
  }
  // Jika batch yang sekarang ditampilkan CLOSED, disable semua table kanan
  else {
    // console.log(` Batch ${currentKey} CLOSED - disabling all table kanan rows`);

    $("#tableKanan tr").each(function () {
      const $row = $(this);

      $row.addClass("row-closed").css("background-color", "#f5f5f5");
      $row
        .find("input, select, textarea")
        .prop("disabled", true)
        .prop("readonly", true);

      // Disable select2
      $row.find("select").each(function () {
        const $select = $(this);
        if ($select.data("select2")) {
          $select.select2("destroy");
        }
        $select.prop("disabled", true);
        $select.select2({ disabled: true });
      });

      // Disable delete icon
      $row
        .find(".deleteRowTableKanan")
        .off("click")
        .css("opacity", "0.5")
        .css("cursor", "not-allowed")
        .css("pointer-events", "none");
    });

    // console.log(` Table Kanan: ALL ROWS DISABLED`);
  }
}

function disableTableKananIfPlanClosed() {
  // Jika semua plan closed, disable semua
  if (window.planClosed === true && !window.hasPartialClosed) {
    // console.log(" Plan Closed - Disabling ALL Table Kanan");

    // Disable semua input & select di table kanan
    $("#tableKanan")
      .find("input, select, textarea")
      .prop("disabled", true)
      .prop("readonly", true);

    // Khusus select2 jika ada
    $("#tableKanan select").each(function () {
      if ($(this).data("select2")) {
        $(this).select2("destroy");
      }
      $(this).prop("disabled", true);
    });

    // Disable trash icon (delete row)
    $("#tableKanan .deleteRowTableKanan")
      .off("click")
      .css("opacity", "0.5")
      .css("cursor", "not-allowed")
      .css("pointer-events", "none");
  } else {
    // Partial closed - hanya disable row yang data-closed="1"
    // console.log(" Partial closed - disable only closed rows in Table Kanan");

    $("#tableKanan tr").each(function () {
      const $row = $(this);
      const closedVal = $row.attr("data-closed");
      const isClosed = closedVal === "1" || closedVal === "2";

      if (isClosed) {
        $row.addClass("row-closed").css("background-color", "#f5f5f5");
        $row
          .find("input, select, textarea")
          .prop("disabled", true)
          .prop("readonly", true);

        // Disable select2 jika ada
        $row.find("select").each(function () {
          if ($(this).data("select2")) {
            $(this).select2("destroy");
          }
          $(this).prop("disabled", true);
        });

        // Disable trash icon
        $row
          .find(".deleteRowTableKanan")
          .off("click")
          .css("opacity", "0.5")
          .css("cursor", "not-allowed")
          .css("pointer-events", "none");
      }
    });
  }
}
// kalau currency berubah, ambil kurs
$("#currency").on("change", function () {
  let currID = $(this).val();
  let docDate = $("#DocDate").val();

  if (currID && docDate) {
    getDataKurs(currID, docDate);
  }
});
function getDataKurs(currID, docDate) {
  $.ajax({
    url:
      base_url +
      "purchasing/purchase_plan_report/getDataKursByDate/" +
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
      base_url + "purchasing/purchase_plan_report/getCurrencyList/" + docDate,
    type: "GET",
    dataType: "json",
    success: function (res) {
      // console.log(" Currency data loaded:", res);
      let $currency = $("#currency");
      $currency.empty();

      if (!res || res.length === 0) {
        console.warn(" Currency list kosong!");
        return;
      }

      $.each(res, function (i, item) {
        $currency.append(
          `<option value="${item.id}">${item.code}-${item.desc}</option>`,
        );
      });

      $currency.selectpicker("refresh");

      let defaultCurr = res.find((c) => c.code === "IDR") || res[0];
      if (defaultCurr) {
        $currency.val(defaultCurr.id).selectpicker("refresh");
        //  console.log(" Default currency:", defaultCurr);
        getDataKurs(defaultCurr.id, docDate);
      }
    },
    error: function (xhr) {
      console.error(" Error loading currency:", xhr.responseText);
    },
  });
}

function commitPaymentChangesFromRow($row) {
  if (typeof commitPaymentChanges !== "function") {
    console.warn(" commitPaymentChanges() belum didefinisikan.");
    return;
  }

  const paymentId = parseInt($row.attr("data-payment-id")) || 0;
  const tempPaymentId =
    $row.attr("data-temp-payment-id") || $row.data("temp-payment-id") || null;
  let purchasePlanDtlID = null;
  const rowDtlAttr = $row.attr("data-dtl-id");
  if (rowDtlAttr && !isNaN(parseInt(rowDtlAttr))) {
    purchasePlanDtlID = Number(rowDtlAttr);
  } else if (typeof currentDtlRealId !== "undefined" && currentDtlRealId) {
    purchasePlanDtlID = Number(currentDtlRealId);
  } else {
    purchasePlanDtlID = null;
  }
  const tempRowId =
    $row.attr("data-temp-rowid") || $row.data("temp-rowid") || null;

  const vendorId =
    parseInt($row.attr("data-vendor-id")) || parseInt($row.data("vendor-id"));

  const batch =
    parseInt($row.attr("data-batch")) || parseInt($row.data("batch")) || 0;

  const groupKey =
    purchasePlanDtlID && batch
      ? `dtl-${purchasePlanDtlID}-batch-${batch}`
      : purchasePlanDtlID
        ? `dtl-${purchasePlanDtlID}`
        : null;

  const updatedData = {
    groupKey,
    rowId: `${vendorId}-batch-${batch}`,
    vendorId,
    batch,
    PaymentID: paymentId,
    tempPaymentId: tempPaymentId,
    tempRowId: tempRowId,
    PurchasePlanDtlID: purchasePlanDtlID,
    Notes: $row.find(".notesTableKanan").val() || null,
    Percent:
      $row.find(".percenTableKanan").val() !== ""
        ? parseFloat($row.find(".percenTableKanan").val())
        : null,
    FromValue: $row.find(".formValueTableKanan").val() || null,
    Alert: $row.find(".alertTableKanan").val() || null,
    Term:
      $row.find(".termDaysTableKanan").val() !== ""
        ? parseInt($row.find(".termDaysTableKanan").val(), 10)
        : null,
    OACredit:
      $row.find(".OACreditTableKanan").val() !== ""
        ? parseInt($row.find(".OACreditTableKanan").val(), 10)
        : null,
  };

  commitPaymentChanges(updatedData);
}
function generateShipmentGroupKey(shipmentData) {
  const vendorId = shipmentData.vendorId || shipmentData.VendorID;
  const batch = shipmentData.Batch || shipmentData.batch;
  const shipmentDate = shipmentData.ShipmentDate || shipmentData.shipmentDate;
  const purchasePlanDtlId =
    shipmentData.PurchasePlanDtlID || shipmentData.purchasePlanDtlId;

  if (purchasePlanDtlId && purchasePlanDtlId > 0) {
    //  Kalau ada batch, group berdasarkan vendor+batch+dtlId
    if (batch && batch !== "" && batch !== null && batch !== 0) {
      return `vendor-${vendorId}-batch-${batch}-dtl-${purchasePlanDtlId}`;
    }
    //  Kalau tidak ada batch, group berdasarkan vendor+shipmentDate+dtlId
    return `vendor-${vendorId}-date-${shipmentDate}-dtl-${purchasePlanDtlId}`;
  } else {
    if (batch && batch !== "" && batch !== null && batch !== 0) {
      return `vendor-${vendorId}-batch-${batch}`;
    }
    //  Kalau tidak ada batch, group berdasarkan vendor+shipmentDate
    return `vendor-${vendorId}-date-${shipmentDate}`;
  }
}
function updatePaymentDateByGroupKey(groupKey, newShipmentDate) {
  if (
    !window.kumpulanDataTableKiriKanan ||
    window.kumpulanDataTableKiriKanan.length === 0
  ) {
    console.warn(" kumpulanDataTableKiriKanan kosong");
    return;
  }

  console.groupCollapsed(" Update Payment untuk GroupKey:", groupKey);
  // console.log("New ShipmentDate:", newShipmentDate);

  const shipmentDateObj = new Date(newShipmentDate);
  if (isNaN(shipmentDateObj.getTime())) {
    console.warn(" ShipmentDate tidak valid:", newShipmentDate);
    console.groupEnd();
    return;
  }

  let found = false;
  let updatedPayments = [];
  let targetGroup = null;

  targetGroup = window.kumpulanDataTableKiriKanan.find((group) => {
    if (group.groupKey === groupKey) {
      return true;
    }
    if (
      groupKey.includes("temp-") &&
      group.tempRowId &&
      groupKey.includes(group.tempRowId)
    ) {
      return true;
    }
    return false;
  });

  if (!targetGroup) {
    // console.log("Groupkey tidak ditemukan :", groupKey);
    targetGroup = window.kumpulanDataTableKiriKanan.find(
      (group) =>
        group.shipmentDate === newShipmentDate && group.groupKey === groupKey,
    );
    if (!targetGroup) {
      return;
    }
  }
  found = true;

  const termDaysArr = group.termDays || [];
  const paymentDateArr = [];

  // Hitung ulang payment date
  termDaysArr.forEach((termDays, idx) => {
    const newPayDate = new Date(shipmentDateObj);
    const parsedTerm = parseInt(termDays) || 0;
    newPayDate.setDate(newPayDate.getDate() + parsedTerm);

    const formattedDate = newPayDate.toISOString().split("T")[0];
    paymentDateArr[idx] = formattedDate;

    updatedPayments.push({
      ShipmentID: group.shipmentIds?.[0] || null,
      PurchasePlanDtlID: group.purchasePlanDtlId,
      PaymentID: (group.paymentIds && group.paymentIds[idx]) || null,
      // PaymentDate: formattedDate,
      Notes: (group.notes && group.notes[idx]) || "",
      Percent: (group.percent && group.percent[idx]) || "",
      FromValue: (group.formValue && group.formValue[idx]) || "",
      Alert: (group.alert && group.alert[idx]) || "",
      Term: termDays,
      OACredit: (group.OACredit && group.OACredit[idx]) || "",
    });
  });

  targetGroup.paymentDate = paymentDateArr;
  targetGroup.shipmentDate = newShipmentDate;

  renderTableKanan(updatedPayments);

  hasUnsavedChanges = true;

  setTimeout(() => {
    $(".paymentDateTableKanan").trigger("change");
  }, 100);

  console.groupEnd();
}
let kumpulanPaymentChanges = [];
// Simpan perubahan pembayaran sementara ke array global
function commitPaymentChanges(updatedRow) {
  kumpulanPaymentChanges = updatedRow;
  window.kumpulanPaymentChanges = kumpulanPaymentChanges;
  if (!window.kumpulanDataTableKiriKanan)
    window.kumpulanDataTableKiriKanan = [];

  // Normalisasi nama property bagi incoming updatedRow
  if (updatedRow.PurchasePlanDtlID && !updatedRow.purchasePlanDtlID) {
    updatedRow.purchasePlanDtlID = Number(updatedRow.PurchasePlanDtlID);
  }
  updatedRow.PurchasePlanDtlID =
    updatedRow.purchasePlanDtlID || updatedRow.PurchasePlanDtlID || null;
  updatedRow.purchasePlanDtlID = updatedRow.PurchasePlanDtlID
    ? Number(updatedRow.PurchasePlanDtlID)
    : null;

  // normalisasi fields
  updatedRow.PaymentID = Number(updatedRow.PaymentID) || 0;
  updatedRow.PurchasePlanDtlID = updatedRow.PurchasePlanDtlID
    ? Number(updatedRow.PurchasePlanDtlID)
    : null;
  updatedRow.tempRowId = updatedRow.tempRowId || updatedRow.temprowid || null;
  updatedRow.tempPaymentId =
    updatedRow.tempPaymentId || updatedRow.temp_payment_id || null;

  const currentVendor = $("#judulTableKanan").text();

  // temukan existing object berdasarkan purchasePlanDtlID atau tempRowId (fallback)
  let existing = window.kumpulanDataTableKiriKanan.find((x) => {
    try {
      if (!x) return false;
      if (
        x.purchasePlanDtlID &&
        updatedRow.purchasePlanDtlID &&
        Number(x.purchasePlanDtlID) === Number(updatedRow.purchasePlanDtlID)
      )
        return true;
      if (
        x.tempRowId &&
        updatedRow.tempRowId &&
        x.tempRowId === updatedRow.tempRowId &&
        x.shipmentDate === updatedRow.shipmentDate
      )
        return true;
      if (
        x.groupKey &&
        updatedRow.groupKey &&
        x.groupKey === updatedRow.shipmentDate
      )
        return true;
      if (
        x.groupKey &&
        updatedRow.groupKey &&
        x.groupKey === updatedRow.groupKey
      )
        return true;

      return false;
    } catch (err) {
      return false;
    }
  });

  if (!existing) {
    const newGroupKey =
      updatedRow.groupKey ||
      `temp-${updatedRow.tempRowId}-${updatedRow.shipmentDate}`;
    existing = {
      groupKey: newGroupKey,
      vendor: currentVendor,
      purchasePlanDtlID: updatedRow.PurchasePlanDtlID,
      tempRowId: updatedRow.tempRowId,
      shipmentDate: updatedRow.shipmentDate,
      payments: [],
    };
    window.kumpulanDataTableKiriKanan.push(existing);
    // console.log("Groupkey baru adalah: ", newGroupKey);
  }

  if (existing.paymentIds && Array.isArray(existing.paymentIds)) {
    const paymentIdx = existing.paymentIds.indexOf(updatedRow.PaymentID);

    if (paymentIdx !== -1) {
      // Update arrays berdasarkan index
      if (updatedRow.Term !== null && updatedRow.Term !== undefined) {
        if (!Array.isArray(existing.termDays)) existing.termDays = [];
        existing.termDays[paymentIdx] = updatedRow.Term;
      }
      if (updatedRow.Percent !== null && updatedRow.Percent !== undefined) {
        if (!Array.isArray(existing.percent)) existing.percent = [];
        existing.percent[paymentIdx] = updatedRow.Percent;
      }
      if (updatedRow.Notes !== null && updatedRow.Notes !== undefined) {
        if (!Array.isArray(existing.notes)) existing.notes = [];
        existing.notes[paymentIdx] = updatedRow.Notes;
      }
      if (updatedRow.FromValue !== null && updatedRow.FromValue !== undefined) {
        if (!Array.isArray(existing.formValue)) existing.formValue = [];
        existing.formValue[paymentIdx] = parseInt(updatedRow.FromValue);
      }
      if (updatedRow.Alert !== null && updatedRow.Alert !== undefined) {
        if (!Array.isArray(existing.alert)) existing.alert = [];
        existing.alert[paymentIdx] = parseInt(updatedRow.Alert);
      }
      if (updatedRow.OACredit !== null && updatedRow.OACredit !== undefined) {
        if (!Array.isArray(existing.OACredit)) existing.OACredit = [];
        existing.OACredit[paymentIdx] = updatedRow.OACredit;
      }
      // console.log(
      //   ` [COMMIT] Format lama - PaymentID ${updatedRow.PaymentID} (index ${paymentIdx}) updated directly in arrays`,
      // );
    } else if (updatedRow.PaymentID === 0 || updatedRow.PaymentID === "0") {
      // console.log(
      //   ` [COMMIT] Format lama - NEW PAYMENT (PaymentID=0) - appending to arrays`,
      // );

      // Pastikan semua array sudah initialized
      if (!Array.isArray(existing.paymentIds)) existing.paymentIds = [];
      if (!Array.isArray(existing.termDays)) existing.termDays = [];
      if (!Array.isArray(existing.percent)) existing.percent = [];
      if (!Array.isArray(existing.notes)) existing.notes = [];
      if (!Array.isArray(existing.formValue)) existing.formValue = [];
      if (!Array.isArray(existing.alert)) existing.alert = [];
      if (!Array.isArray(existing.OACredit)) existing.OACredit = [];
      if (!Array.isArray(existing.paymentDate)) existing.paymentDate = [];

      // Append ke arrays
      existing.paymentIds.push(updatedRow.PaymentID);
      existing.termDays.push(
        updatedRow.Term !== null && updatedRow.Term !== undefined
          ? updatedRow.Term
          : 0,
      );
      existing.percent.push(
        updatedRow.Percent !== null && updatedRow.Percent !== undefined
          ? updatedRow.Percent
          : 0,
      );
      existing.notes.push(updatedRow.Notes || "");
      existing.formValue.push(
        updatedRow.FromValue !== null && updatedRow.FromValue !== undefined
          ? parseInt(updatedRow.FromValue)
          : 0,
      );
      existing.alert.push(
        updatedRow.Alert !== null && updatedRow.Alert !== undefined
          ? parseInt(updatedRow.Alert)
          : 0,
      );
      existing.OACredit.push(
        updatedRow.OACredit !== null && updatedRow.OACredit !== undefined
          ? updatedRow.OACredit
          : 0,
      );
      existing.paymentDate.push(updatedRow.PaymentDate || "1900-01-01");

      // console.log(
      //   ` [COMMIT] NEW PAYMENT APPENDED - Total payments now: ${existing.paymentIds.length}`,
      // );
    }
  } else {
    existing.payments = (existing.payments || []).filter(
      (p) => p && typeof p === "object",
    );

    // cari index payment yang cocok:
    let idx = -1;
    if (updatedRow.PaymentID && updatedRow.PaymentID > 0) {
      idx = existing.payments.findIndex(
        (p) => p && Number(p.PaymentID) === updatedRow.PaymentID,
      );
    } else if (updatedRow.tempPaymentId) {
      idx = existing.payments.findIndex(
        (p) =>
          p &&
          (p.tempPaymentId === updatedRow.tempPaymentId ||
            p.temp_payment_id === updatedRow.tempPaymentId),
      );
    } else {
      // fallback: cari berdasarkan kombinasi tempRowId + paymentDate + Notes (kurang ideal tapi aman)
      idx = existing.payments.findIndex(
        (p) =>
          p &&
          p.tempRowId === updatedRow.tempRowId &&
          (p.PaymentDate === updatedRow.PaymentDate ||
            p.Notes === updatedRow.Notes),
      );
    }

    if (idx !== -1) {
      existing.payments[idx] = Object.assign(
        {},
        existing.payments[idx],
        updatedRow,
      );
    } else {
      existing.payments.push(updatedRow);
    }
    // console.log(` [COMMIT] Format baru - payments array updated`);
  }

  const dtlId = updatedRow.purchasePlanDtlID || updatedRow.PurchasePlanDtlID;
  const paymentIdToUpdate = updatedRow.PaymentID;

  if (dtlId && paymentIdToUpdate > 0) {
    // Cari object dengan format lama (punya array termDays)
    window.kumpulanDataTableKiriKanan.forEach((obj) => {
      // Cek apakah ini format lama dengan array paymentIds
      if (
        obj.paymentIds &&
        Array.isArray(obj.paymentIds) &&
        obj.purchasePlanDtlId &&
        String(obj.purchasePlanDtlId) === String(dtlId)
      ) {
        // Cari index berdasarkan PaymentID
        const paymentIndex = obj.paymentIds.indexOf(paymentIdToUpdate);

        if (paymentIndex !== -1) {
          // console.log(
          //   ` Updating format lama di index ${paymentIndex} untuk PaymentID ${paymentIdToUpdate}`,
          // );

          // Update nilai di array yang sesuai
          if (updatedRow.Term !== null && updatedRow.Term !== undefined) {
            if (Array.isArray(obj.termDays)) {
              obj.termDays[paymentIndex] = updatedRow.Term;
            }
          }
          if (updatedRow.Percent !== null && updatedRow.Percent !== undefined) {
            if (Array.isArray(obj.percent)) {
              obj.percent[paymentIndex] = updatedRow.Percent;
            }
          }
          if (updatedRow.Notes !== null && updatedRow.Notes !== undefined) {
            if (Array.isArray(obj.notes)) {
              obj.notes[paymentIndex] = updatedRow.Notes;
            }
          }
          if (
            updatedRow.FromValue !== null &&
            updatedRow.FromValue !== undefined
          ) {
            if (Array.isArray(obj.formValue)) {
              obj.formValue[paymentIndex] = parseInt(updatedRow.FromValue);
            }
          }
          if (updatedRow.Alert !== null && updatedRow.Alert !== undefined) {
            if (Array.isArray(obj.alert)) {
              obj.alert[paymentIndex] = parseInt(updatedRow.Alert);
            }
          }
          if (
            updatedRow.OACredit !== null &&
            updatedRow.OACredit !== undefined
          ) {
            if (Array.isArray(obj.OACredit)) {
              obj.OACredit[paymentIndex] = updatedRow.OACredit;
            }
          }
        }
      }
    });
  }

  const dtlIdForSync =
    updatedRow.purchasePlanDtlID || updatedRow.PurchasePlanDtlID;
  if (dtlIdForSync) {
    const formatLamaObj = window.kumpulanDataTableKiriKanan.find(
      (obj) =>
        obj.paymentIds &&
        Array.isArray(obj.paymentIds) &&
        String(obj.purchasePlanDtlId) === String(dtlIdForSync),
    );

    if (formatLamaObj) {
      // Cari object FORMAT BARU dengan payments array untuk dtlId yang sama
      const formatBaruObjs = window.kumpulanDataTableKiriKanan.filter(
        (obj) =>
          obj.payments &&
          Array.isArray(obj.payments) &&
          String(obj.purchasePlanDtlID) === String(dtlIdForSync),
      );

      if (formatBaruObjs.length > 0) {
        // Kumpulkan semua payments dari FORMAT BARU
        let allNewPayments = [];
        formatBaruObjs.forEach((baruObj) => {
          allNewPayments = allNewPayments.concat(
            baruObj.payments.filter((p) => p && p.PaymentID === 0),
          );
        });

        const dbPaymentIndices = formatLamaObj.paymentIds
          .map((pid, idx) => (pid !== 0 ? idx : -1))
          .filter((idx) => idx !== -1);

        // Rebuild arrays dengan hanya DB payments
        if (dbPaymentIndices.length > 0) {
          formatLamaObj.paymentIds = dbPaymentIndices.map(
            (i) => formatLamaObj.paymentIds[i],
          );
          formatLamaObj.termDays = dbPaymentIndices.map(
            (i) => formatLamaObj.termDays[i],
          );
          formatLamaObj.percent = dbPaymentIndices.map(
            (i) => formatLamaObj.percent[i],
          );
          formatLamaObj.notes = dbPaymentIndices.map(
            (i) => formatLamaObj.notes[i],
          );
          formatLamaObj.formValue = dbPaymentIndices.map(
            (i) => formatLamaObj.formValue[i],
          );
          formatLamaObj.alert = dbPaymentIndices.map(
            (i) => formatLamaObj.alert[i],
          );
          formatLamaObj.OACredit = dbPaymentIndices.map(
            (i) => formatLamaObj.OACredit[i],
          );
          formatLamaObj.paymentDate = dbPaymentIndices.map(
            (i) => formatLamaObj.paymentDate[i],
          );
        } else {
          // Tidak ada DB payments, clear semua untuk rebuild fresh
          formatLamaObj.paymentIds = [];
          formatLamaObj.termDays = [];
          formatLamaObj.percent = [];
          formatLamaObj.notes = [];
          formatLamaObj.formValue = [];
          formatLamaObj.alert = [];
          formatLamaObj.OACredit = [];
          formatLamaObj.paymentDate = [];
        }

        // Now append ALL new payments from FORMAT BARU (fresh)
        allNewPayments.forEach((newPayment, idx) => {
          formatLamaObj.paymentIds.push(newPayment.PaymentID);
          formatLamaObj.termDays.push(
            newPayment.Term !== null && newPayment.Term !== undefined
              ? newPayment.Term
              : 0,
          );
          formatLamaObj.percent.push(
            newPayment.Percent !== null && newPayment.Percent !== undefined
              ? newPayment.Percent
              : 0,
          );
          formatLamaObj.notes.push(newPayment.Notes || "");
          formatLamaObj.formValue.push(
            newPayment.FromValue !== null && newPayment.FromValue !== undefined
              ? parseInt(newPayment.FromValue)
              : 0,
          );
          formatLamaObj.alert.push(
            newPayment.Alert !== null && newPayment.Alert !== undefined
              ? parseInt(newPayment.Alert)
              : 0,
          );
          formatLamaObj.OACredit.push(
            newPayment.OACredit !== null && newPayment.OACredit !== undefined
              ? newPayment.OACredit
              : 0,
          );
          formatLamaObj.paymentDate.push(
            newPayment.PaymentDate || "1900-01-01",
          );
        });

        // Update tracking array dengan fresh list of new payment tempIds
        formatLamaObj.tempPaymentIds = allNewPayments.map(
          (p) => p.tempPaymentId,
        );
      }
    }
  }
}

let arrdbtPurchasePlanDtl_ID = [];

// btn view detail
let idPurchaseTableKanan = 0;
// btn view detail (FINAL REVISI)
$(document).on("click", ".viewDetail", function () {
  let $clickedButton = $(this);

  // (cek dulu biar tidak error di klik pertama)
  if ($("#tableKanan tr").length > 0) {
    //console.log(" Menyimpan perubahan sebelum pindah vendor...");
    commitPaymentChanges(); // <== fungsi ini yang kita bahas sebelumnya
  }
  let vendor = $clickedButton.data("vendor");
  let batch = $clickedButton.data("batch");
  let ID = $clickedButton.data("ID");
  idPurchaseTableKanan = ID;

  // judul table kanan
  $("#judulTableKanan").val(vendor + " - " + batch);
  $("#judulTableKanan").text(vendor + " - " + batch);

  var tbody = $("#tableKanan");
  var thead = $("#tableKananHead");
  var judul = $("#judulTableKanan");
  thead.css("visibility", "visible");
  judul.css("visibility", "visible");
  tbody.empty();

  const requestedShipmentID = $clickedButton.attr("data-shipment-id");

  // ambil data dari controller getPurchasePlanDtlPayment
  $.ajax({
    url:
      BASE_URL +
      "scm/purchasing/purchase_plan_report/getPurchasePlanDtlPayment",
    type: "GET",
    data: {
      id: ID,
      shipmentID: requestedShipmentID, // ← Pass shipmentID yang dipilih
    },
    dataType: "json",
    success: function (response) {
      if (response.status === "success" && response.data) {
        const purchasePlanDtlID = parseInt(ID);
        loadTableKanan(purchasePlanDtlID); // pakai loader yang sudah aku revisi sebelumnya
        updateCurrentSelection(vendor, batch, null, vendor);
      } else {
        console.error("Gagal mengambil data pembayaran:", response.message);
      }
    },
    error: function (xhr, status, error) {
      console.error("AJAX Error:", status, error);
      console.error("Response Text:", xhr.responseText);
      // console.log("Terjadi kesalahan saat berkomunikasi dengan server.");
    },
  });
});

function getShipmentInfoForPaymentRow($rowKanan) {
  // ambil shipment-id yang tersimpan di row kanan
  let shipmentId =
    $rowKanan.attr("data-shipment-id") ||
    $rowKanan.attr("data-shipmentid") ||
    $rowKanan.data("shipment-id") ||
    $rowKanan.data("shipmentId");

  // cari di table tengah berdasarkan attribute 'data-shipment-id' (dukungan untuk temp id juga)
  let $shipmentRow = null;
  if (shipmentId) {
    $shipmentRow = $(".BigDataTableTengah tbody tr")
      .filter(function () {
        const sid =
          $(this).attr("data-shipment-id") ||
          $(this).attr("data-shipmentid") ||
          $(this).data("shipment-id") ||
          $(this).data("shipmentId");
        return String(sid) === String(shipmentId);
      })
      .first();
  }

  // fallback: jika tidak ditemukan, gunakan selectedShipmentRow atau baris terakhir
  if (!$shipmentRow || $shipmentRow.length === 0) {
    $shipmentRow =
      typeof selectedShipmentRow !== "undefined" &&
      selectedShipmentRow &&
      selectedShipmentRow.length
        ? selectedShipmentRow
        : $(".BigDataTableTengah tbody tr:last");
  }

  // dapatkan shipmentDate dari kolom (value atau text)
  const shipmentDateStr =
    $shipmentRow && $shipmentRow.length
      ? $shipmentRow.find(".shipmentDateColumn").val() ||
        $shipmentRow.find(".shipmentDateColumn").text().trim()
      : null;

  // pastikan kita juga mengembalikan shipmentId yang dipakai (bisa temp)
  const usedShipmentId =
    shipmentId ||
    ($shipmentRow &&
      ($shipmentRow.attr("data-shipment-id") ||
        $shipmentRow.attr("data-shipmentid")));

  return {
    shipmentDateStr,
    shipmentId: usedShipmentId,
    shipmentRow: $shipmentRow,
  };
}
window.syncTableTengahDataFromDOM = function () {
  const rows = $("#BigDataTableTengah tbody tr");

  rows.each(function () {
    let $row = $(this);

    // Ambil rowId
    let rowId =
      $row.attr("data-rowid") ||
      $row.data("rowid") ||
      $row.attr("data-id") ||
      $row.data("id") ||
      $row.attr("data-dtl-id") ||
      $row.data("dtl-id") ||
      $row.attr("data-shipment-id") ||
      $row.data("shipment-id") ||
      null;

    if (!rowId) return;

    // Ambil semua nilai DOM yang kamu perlukan
    let batch = Number($row.find(".batchColumn").val()) || 0;
    let qty = Number($row.find(".qtyColumn").val()) || 0;
    let price = Number($row.find(".priceColumn").val()) || 0;
    let shipmentDate = $row.find(".shipmentDateColumn").val() || null;
    let vendorId = $row.find(".vendorSelectColumn").val() || null;

    let dbItem = window.tableTengahData.find(
      (r) =>
        String(r.rowId) === String(rowId) || String(r.ID) === String(rowId),
    );

    if (dbItem) {
      dbItem.batch = batch;
      dbItem.qty = qty;
      dbItem.price = price;
      dbItem.shipmentDate = shipmentDate;
      dbItem.vendorId = vendorId;
    }

    if (!Array.isArray(window.tableTengahEditData)) {
      window.tableTengahEditData = [];
    }

    let editItem = window.tableTengahEditData.find(
      (r) => String(r.rowId) === String(rowId),
    );

    if (editItem) {
      editItem.batch = batch;
      editItem.qty = qty;
      editItem.price = price;
      editItem.shipmentDate = shipmentDate;
      editItem.vendorId = vendorId;
    } else {
      // jika belum ada → tambahkan clone ke editData
      window.tableTengahEditData.push({
        rowId,
        batch,
        qty,
        price,
        shipmentDate,
        vendorId,
      });
    }
  });

  // console.log(" syncTableTengahDataFromDOM FINISHED");
  // console.log(" tableTengahData:", window.tableTengahData);
  // console.log("✏ tableTengahEditData:", window.tableTengahEditData);
};

$(document).on("change", ".shipmentDateColumn", function () {
  const $input = $(this);
  const $row = $input.closest("tr");
  const newShipmentDate = $input.val();
  const isNewRow = $row.data("is-new");
  if (isNewRow) {
    const termDays = parseInt($row.find(".TermDaysColumn").val(), 10) || 0;
    if (newShipmentDate && termDays > 0) {
      let shipmentDate = new Date(newShipmentDate);
      let poDateEst = new Date(shipmentDate);
      poDateEst.setDate(poDateEst.getDate() + termDays);
      const poDateEstStr = poDateEst.toISOString().split("T")[0];
      $row.find(".PODateEstColumn").val(poDateEstStr);
    }
    return; // keluar, jangan lanjut ke bagian update groupKey
  }
  const termDays = parseInt($row.find(".TermDaysColumn").val(), 10) || 0;
  if (newShipmentDate && termDays > 0) {
    let shipmentDate = new Date(newShipmentDate);
    let poDateEst = new Date(shipmentDate);
    poDateEst.setDate(poDateEst.getDate() + termDays);
    const poDateEstStr = poDateEst.toISOString().split("T")[0];
    $row.find(".PODateEstColumn").val(poDateEstStr);
  }

  //  Coba berbagai cara untuk ambil data
  const vendorId =
    $row.attr("data-vendor-id") ||
    $row.data("vendor-id") ||
    $row.data("vendorid") ||
    $row.find(".vendorColumn").val() ||
    $row.find("td:first").text().trim(); // Kalau vendor ada di kolom pertama

  const batch =
    $row.attr("data-batch") ||
    $row.data("batch") ||
    $row.find(".batchColumn").val() ||
    $row.find(".batchColumn").text().trim();

  const purchasePlanDtlId =
    $row.attr("data-dtl-id") ||
    $row.attr("data-purchaseplan-dtl-id") ||
    $row.data("dtl-id") ||
    $row.data("purchaseplan-dtl-id");

  console.log(" ShipmentDate diubah:", {
    vendorId: vendorId,
    batch: batch,
    newDate: newShipmentDate,
    dtlId: purchasePlanDtlId,
  });
  const tempRowId = $row.attr("data-temp-row-id") || $row.data("temp-row-id");
  //  Validasi data sebelum lanjut
  if (!vendorId || (!purchasePlanDtlId && !tempRowId)) {
    //  Coba cari dari kumpulanDataTableKiriKanan
    const shipmentId =
      $row.attr("data-shipment-id") || $row.data("shipment-id");
    const matchedGroup = window.kumpulanDataTableKiriKanan.find(
      (g) => g.shipmentIds && g.shipmentIds.includes(Number(shipmentId)),
    );

    if (matchedGroup) {
      // console.log(
      //   " Data ditemukan dari kumpulanDataTableKiriKanan:",
      //   matchedGroup,
      // );
      updatePaymentDateByGroupKey(matchedGroup.groupKey, newShipmentDate);
      return;
    } else {
      alert("Error: Please select Details Payment");
      return;
    }
  }

  //  Generate groupKey untuk cari group yang tepat
  const groupKey = purchasePlanDtlId
    ? `dtl-${purchasePlanDtlId}-date-${newShipmentDate}` // Untuk data existing
    : `temp-${tempRowId}-${newShipmentDate}`;
  //  Update payment berdasarkan groupKey
  updatePaymentDateByGroupKey(groupKey, newShipmentDate);
});
//  Handler untuk perubahan persen/qty di halaman edit
$(document).on("change", ".percent-input, .qty-input", function () {
  let rowIdToCalc = null;

  // Coba pakai row ID terakhir yang aktif
  if (typeof lastSelectedRowId !== "undefined" && lastSelectedRowId) {
    rowIdToCalc = lastSelectedRowId;
  }
  // Kalau nggak ada, fallback ke focusedObject
  else if (typeof focusedObject !== "undefined" && focusedObject?.rowId) {
    rowIdToCalc = focusedObject.rowId;
  }

  if (rowIdToCalc) {
    // console.log(" Trigger calculate (edit) untuk row:", rowIdToCalc);
    generateTableCalculasi(rowIdToCalc);
  } else {
    console.warn(" Tidak ada row aktif untuk kalkulasi (halaman edit).");
  }
});

function renderTableKananCalcFromDB(dbData) {
  const tbody = $("#tableKananCalcBody");
  tbody.empty();

  if (!dbData || dbData.length === 0) {
    tbody.append(
      '<tr><td colspan="6" style="text-align:center; color:#999;">No calculation data</td></tr>',
    );
    $("#totalPersenCalc").text("0%");
    $("#totalPaymentCalc").text("0.00");
    return;
  }

  // Deduplikasi data sebelum render
  const cleanData = deduplicatePaymentCalcData(dbData);

  let totalPersen = 0;
  let totalPayment = 0;
  let currentAlert = null;

  cleanData.forEach((item, index) => {
    const isNewGroup = currentAlert !== item.AlertName;
    currentAlert = item.AlertName;

    // Format payment date
    let paymentDateFormatted = item.PaymentDate || "-";
    if (paymentDateFormatted && paymentDateFormatted !== "-") {
      // Convert dari YYYY-MM-DD ke DD-MM-YYYY jika perlu
      const parts = paymentDateFormatted.split("-");
      if (parts.length === 3 && parts[0].length === 4) {
        paymentDateFormatted = `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }

    const row = `
      <tr ${isNewGroup && index > 0 ? 'style="border-top: 2px solid #007bff;"' : ""}>
        <td>${paymentDateFormatted}</td>
        <td>${item.AlertName || getAlertName(item.Alert) || "-"}</td>
        <td style="padding: 8px;">${item.Notes || "-"}</td>
        <td style="padding: 8px; text-align:left;">
          <span style="background:${item.FromValue == 1 ? "#28a745" : "#ffc107"}; color:#fff; padding:3px 8px; border-radius:8px; font-size:11px;">
            ${item.FromValueName || (item.FromValue == 1 ? "Per Batch" : "Partial")}
          </span>
        </td>
        <td style="text-align:right; font-weight:bold; padding: 8px;">${item.Percent || 0}%</td>
        <td style="text-align:right; font-weight:bold; padding: 8px;">${Number(
          item.Payment || 0,
        ).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}</td>
      </tr>
    `;
    tbody.append(row);

    // Hitung total
    if (item.FromValue == 1) {
      totalPersen += Number(item.Percent) || 0;
    }
    totalPayment += Number(item.Payment) || 0;
  });

  // Render total ke footer
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
      .css("font-weight", "bold")
      .attr("title", " Total harus 100%!");
  } else {
    $("#totalPersenCalc").css("color", "green").css("font-weight", "bold");
  }

  // console.log(" Table kalkulasi dari DB berhasil dirender");
}
//  Handler tombol Calculate di halaman edit
$(document).on(
  "change input",
  ".BigDataTableTengah .qtyColumn, .BigDataTableTengah .priceColumn, .BigDataTableTengah .batchColumn, .BigDataTableTengah .vendorSelectColumn",
  function () {
    // Hanya mark sebagai changed jika initial load sudah selesai
    if (isInitialLoadComplete) {
      markCalcAsChanged();
      // console.log(" Perubahan terdeteksi di table tengah");
    }
  },
);

// Deteksi perubahan di table kanan (payment details)
$(document).on(
  "change input",
  "#tableKanan .percenTableKanan, #tableKanan .termDaysTableKanan, #tableKanan .notesTableKanan, #tableKanan .formValueTableKanan, #tableKanan .alertTableKanan",
  function () {
    // Hanya mark sebagai changed jika initial load sudah selesai
    if (isInitialLoadComplete) {
      markCalcAsChanged();
      isCalculatePaymentClicked = false; // Reset flag karena ada perubahan di table kanan
      // console.log(" Perubahan terdeteksi di table kanan (payment)");
    }
  },
);

$("#calculatePayment")
  .off("click")
  .on("click", function () {
    let rowIdToCalc = null;

    const focusedObjectSafe =
      typeof focusedObject !== "undefined" ? focusedObject : null;
    const lastSelectedRowIdSafe =
      typeof lastSelectedRowId !== "undefined" ? lastSelectedRowId : null;

    if (focusedObjectSafe && focusedObjectSafe.rowId) {
      rowIdToCalc = focusedObjectSafe.rowId;
    }

    if (!rowIdToCalc && lastSelectedRowIdSafe) {
      rowIdToCalc = lastSelectedRowIdSafe;
    }

    if (
      !rowIdToCalc &&
      Array.isArray(window.kumpulanDataTableKiriKanan) &&
      window.kumpulanDataTableKiriKanan.length > 0
    ) {
      const last = window.kumpulanDataTableKiriKanan
        .slice()
        .reverse()
        .find(
          (row) =>
            row?.tempRowId ||
            row?.rowId ||
            (row.payments && row.payments[0]?.tempRowId),
        );

      if (last) {
        rowIdToCalc =
          last.tempRowId ||
          last.rowId ||
          (last.payments ? last.payments[0].tempRowId : null);
      }
    }

    if (!rowIdToCalc) {
      alert(
        "Nothing data can be calculate. Please already select or save line.",
      );
      return;
    }

    console.group(" CALCULATE PAYMENT");
    console.log("Row ID:", rowIdToCalc);
    $("#tableKananCalc").css("visibility", "visible");

    const purchasePlanID =
      dbtPurchasePlan_ID || headID || getPurchasePlanIdFromURL();

    let groupKey = rowIdToCalc;

    if (groupKey.startsWith("temp-")) {
      groupKey = groupKey.replace("temp-", "");
    }

    if (groupKey.startsWith("real-")) {
      const targetRow = kumpulanDataTableKiriKanan.find(
        (r) => r.tempRowId === rowIdToCalc || r.rowId === rowIdToCalc,
      );
      if (targetRow) {
        if (targetRow.batch && targetRow.batch !== "0") {
          groupKey = `${targetRow.vendorId}-batch-${targetRow.batch}`;
        } else if (targetRow.shipmentDate) {
          groupKey = `${targetRow.vendorId}-date-${targetRow.shipmentDate}`;
        }
      }
    }

    console.log("GroupKey:", groupKey);

    // console.log(" Syncing payment data sebelum calculate...");
    // OPTIMIZATION: Only sync the active/focused row, not ALL rows
    const $tableKanan = $("#tableKanan");
    if ($tableKanan.length > 0) {
      // Check if any row has actually changed
      let hasChanges = false;
      $tableKanan.find("tbody tr").each(function () {
        const $row = $(this);
        // Only commit if row has actual data (not empty)
        const hasData =
          $row.find(".percenTableKanan").val() ||
          $row.find(".notesTableKanan").val() ||
          $row.find(".termDaysTableKanan").val();
        if (hasData) {
          hasChanges = true;
          commitPaymentChangesFromRow($row);
        }
      });

      if (!hasChanges) {
        // console.log(" No payment data to sync - skipping sync");
      }
    }

    const isDirty = hasCalcBeenChanged();
    // console.log(
    //   "STATE:",
    //   isDirty ? "DIRTY (ada perubahan)" : "CLEAN (tidak ada perubahan)",
    // );

    // = CLEAN STATE =
    if (!isDirty) {
      if (hasCalcDataInCache(groupKey)) {
        // console.log("SOURCE: DB_CACHE (render tanpa kalkulasi)");
        const cachedData = getCalcDataFromCache(groupKey);
        renderTableKananCalcFromDB(cachedData);
        console.groupEnd();
        return;
      }

      // // console.log("SOURCE: DB_LOAD (fetch dari database)");
      loadCalcDataFromDB(purchasePlanID, groupKey)
        .then(function (dbData) {
          if (dbData && dbData.length > 0) {
            //console.log("SOURCE CONFIRMED: DB (data ditemukan)");
            renderTableKananCalcFromDB(dbData);
          } else {
            //console.log("SOURCE FALLBACK: CALCULATE (DB kosong)");
            generateTableCalculasi(rowIdToCalc);
          }
          //console.groupEnd();
        })
        .catch(function (error) {
          console.error("DB ERROR → FALLBACK TO CALCULATE", error);
          generateTableCalculasi(rowIdToCalc);
          //console.groupEnd();
        });

      return;
    }

    // = DIRTY STATE =
    //console.log("SOURCE: CALCULATE (user trigger & data berubah)");
    generateTableCalculasi(rowIdToCalc);
    isCalculatePaymentClicked = true; // Set flag bahwa calculate sudah diklik
    //console.groupEnd();
  });

$("#addlineTableKanan").click(function () {
  isCalculatePaymentClicked = false; // Reset flag karena ada perubahan di table kanan
  let lastShipmentID =
    $("#tableKanan tr:last").attr("data-shipment-id") ||
    $("#tableKanan tr:last").data("shipment-id");

  if (!lastShipmentID && typeof currentShipmentID !== "undefined") {
    lastShipmentID = currentShipmentID;
  }

  const $activeLeftRow = $(".BigDataTableKiri tbody tr.table-active");
  const activeTempRowId = $activeLeftRow.length
    ? $activeLeftRow.attr("data-temp-rowid") || ""
    : currentDtlTempRowId || "";
  const activeRealId = $activeLeftRow.length
    ? Number($activeLeftRow.attr("data-dtl-id")) || currentDtlRealId || ""
    : currentDtlRealId || "";

  let resolvedDtlId = activeRealId || null;
  let resolvedTempRowId = activeTempRowId || null;
  // unique temp payment id
  const tempPaymentId = `temp-pay-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  const shipmentIdToUse = lastShipmentID || `temp-shipment-${Date.now()}`;

  const newDetailRowHtml = `
     <tr
      data-shipment-id="${shipmentIdToUse}"
      data-payment-id="0"
      data-temp-payment-id="${tempPaymentId}"
      data-temp-rowid="${resolvedTempRowId || ""}"
      data-dtl-id="${resolvedDtlId || ""}"
      data-real-dtl-id="${resolvedDtlId || ""}"
    >

      <td><input type="text" class="form-control form-control-sm notesTableKanan"></td>
      <td><input type="number" class="form-control form-control-sm percenTableKanan"></td>
      <td>
        <select class="form-control form-control-sm formValueTableKanan">
          <option value="1">Per Batch</option>
          <option value="2">Partial</option>
        </select>
      </td>
      <td>
        <select class="form-control form-control-sm alertTableKanan">
          <option value="1">Blanket PO</option>
          <option value="2">PO</option>
          <option value="3">Shipment</option>
        </select>
      </td>
      <td><input type="number" class="form-control form-control-sm termDaysTableKanan"></td>
      <td><input type="number" class="form-control form-control-sm OACreditTableKanan"></td>
      <td class="column-action-icon">
        <i class="glyphicon glyphicon-trash deleteRowTableKanan" style="cursor:pointer;color:black;"></i>
      </td>
    </tr>`;

  const existingRows = $(`#tableKanan tr[data-dtl-id='${activeRealId}']`);
  if (existingRows.length > 0) {
    existingRows.last().after(newDetailRowHtml);
    // console.log(
    //   ` Tambah baris baru di bawah PurchasePlanDtlID ${activeRealId}`,
    // );
  } else {
    $("#tableKanan").append(newDetailRowHtml);
    const $newRow = $("#tableKanan tr").last();
    commitPaymentChangesFromRow($newRow);
    // console.log(
    //   ` Tambah baris baru untuk PurchasePlanDtlID baru: ${activeRealId}`,
    // );
  }

  const $newRow = $("#tableKanan tr").last();
  $newRow.attr("data-temp-payment-id", tempPaymentId); // redundan-safe
  $newRow.attr("data-temp-rowid", activeTempRowId || "");
  $newRow.attr("data-dtl-id", activeRealId || "");
  // lalu commit
  commitPaymentChangesFromRow($newRow);
});

$(document).on("click", ".deleteRowTableKanan", function () {
  isCalculatePaymentClicked = false; // Reset flag karena ada perubahan di table kanan
  const $row = $(this).closest("tr");
  const tempPaymentId = $row.data("temp-payment-id");
  const dtlId = parseInt($row.attr("data-dtl-id"));
  const tempRowId = $row.attr("data-temp-rowid");

  // console.log(` Hapus baris dengan tempPaymentId: ${tempPaymentId}`);

  // Hapus dari tampilan
  $row.remove();

  // Hapus juga dari kumpulanDataTableKiriKanan
  if (
    window.kumpulanDataTableKiriKanan &&
    Array.isArray(window.kumpulanDataTableKiriKanan)
  ) {
    for (const data of window.kumpulanDataTableKiriKanan) {
      if (
        (data.purchasePlanDtlID && data.purchasePlanDtlID === dtlId) ||
        (data.tempRowId && data.tempRowId === tempRowId)
      ) {
        data.payments = data.payments.filter(
          (p) => p.tempPaymentId !== tempPaymentId,
        );
      }
    }
  }
});

// button save besar
$(document).ready(function () {
  // Event listener untuk tombol close modal
  $(document).on("click", "#finish-close, .btn-close", function () {
    $("#successModal").modal("hide");
    window.location.reload();
  });

  // Event listener ketika modal akan ditampilkan
  $("#successModal").on("show.bs.modal", function (e) {
    // console.log("Modal akan ditampilkan");
    // Bisa tambahkan loading animation atau preparation lainnya
  });

  // Event listener ketika modal sudah ditampilkan
  $("#successModal").on("shown.bs.modal", function (e) {
    // console.log("Modal sudah ditampilkan");
    // Focus pada tombol close jika diperlukan
    $("#finish-close").focus();
  });

  // Event listener ketika modal akan disembunyikan
  $("#successModal").on("hide.bs.modal", function (e) {
    // console.log("Modal akan ditutup");
    // Bisa tambahkan konfirmasi jika diperlukan
  });

  // Event listener ketika modal sudah disembunyikan
  $("#successModal").on("hidden.bs.modal", function (e) {
    // console.log("Modal sudah ditutup");
    // Reset form atau action setelah modal ditutup
    $("#modalDocNumber").text("-");
    $("#saved-docid").val("");
  });

  // Event listener untuk escape key
  $(document).keydown(function (e) {
    if (e.keyCode === 27 && $("#successModal").hasClass("show")) {
      // ESC key
      $("#successModal").modal("hide");
    }
  });
  function buildTableKiriFromDOM() {
    let hasil = [];
    $(".BigDataTableKiri tbody tr").each(function () {
      let $row = $(this);
      const batchAttr = $row.find("td:eq(1)").attr("data-batch");
      hasil.push({
        Vendor: $row.find("td:eq(0)").attr("data-vendor-id"),
        Batch: batchAttr ? parseInt(batchAttr) : 0,
        DtlID: parseInt($row.attr("data-dtl-id")) || 0,
      });
    });
    return hasil;
  }

  function buildTableKananFromDOM() {
    let hasil = [];
    $("#tableKanan tr").each(function () {
      let $row = $(this);
      if ($row.find("th").length > 0) return; // skip header
      hasil.push({
        PaymentID: parseInt($row.attr("data-payment-id")) || 0,
        // PaymentDate: $row.find(".paymentDateTableKanan").val(),
        Percent: $row.find(".percenTableKanan").val(),
        Term: $row.find(".termDaysTableKanan").val(),
      });
    });
    return hasil;
  }
  // function validatePaymentCompletenessBefore() {
  //   console.log("Memulai validasi kelengkapan payment...");

  //   let kiriData = buildTableKiriFromDOM();
  //   if (!kiriData || kiriData.length === 0) {
  //     console.warn("Tabel kiri kosong — lewati validasi payment.");
  //     return { valid: true, message: "" };
  //   }

  //   let kananData = buildTableKananFromDOM();
  //   let missingPayments = [];

  //   for (let kiriRow of kiriData) {
  //     const vendor = kiriRow.Vendor;
  //     const batch = kiriRow.Batch;

  //     const hasPayment = kananData.some((kananRow) => {
  //       return kananRow.PaymentDate || kananRow.Percent || kananRow.Term;
  //     });

  //     if (!hasPayment) {
  //       missingPayments.push({ vendor, batch });
  //       console.warn(`Vendor ${vendor}, Batch ${batch} - Tidak ada payment`);
  //     }
  //   }

  //   if (missingPayments.length > 0) {
  //     let msg =
  //       " Unable to save because nothing data update or some data does not have payment details.\n\n" +
  //       "Please add or update payment detail first.";
  //     return { valid: false, message: msg };
  //   }

  //   return { valid: true, message: "" };
  // }
  // function validatePaymentStructure(dataKanan) {
  //   if (!dataKanan || !Array.isArray(dataKanan) || dataKanan.length === 0) {
  //     return { valid: false, message: "Tidak ada data payment untuk disimpan" };
  //   }

  //   for (let i = 0; i < dataKanan.length; i++) {
  //     const row = dataKanan[i];
  //     const hasData =
  //       row.PaymentDate || row.Percent || row.Term || row.Notes || row.Alert;
  //     if (!hasData) {
  //       return {
  //         valid: false,
  //         message: `Payment row ${i + 1} kosong - silakan isi data payment`,
  //       };
  //     }
  //   }

  //   return { valid: true, message: "" };
  // }

  window.executeSaveProcess = function (options = { showModal: true }) {
    return new Promise((resolve, reject) => {
      // const validation1 = validatePaymentCompletenessBefore();
      // if (!validation1.valid) {
      //   alert(validation1.message);
      //   reject({ success: false, message: validation1.message });
      //   return;
      // }

      const kananData = buildTableKananFromDOM();
      // const validation2 = validatePaymentStructure(kananData);
      // if (!validation2.valid) {
      //   alert(validation2.message);
      //   reject({ success: false, message: validation2.message });
      //   return;
      // }

      // Auto generate calc jika belum diklik calculatePayment
      if (
        !isCalculatePaymentClicked &&
        kumpulanDataTableKiriKanan &&
        kumpulanDataTableKiriKanan.length > 0
      ) {
        // console.log("Auto generating payment calculation before save...");
        // OPTIMIZATION: Only generate calc for rows that don't already have cached data
        kumpulanDataTableKiriKanan.forEach((row) => {
          const rowId = row.tempRowId || row.rowId;
          const groupKey = row.groupKey;

          // Skip if already cached (avoid redundant regeneration)
          if (groupKey && hasCalcDataInCache(groupKey)) {
            // console.log(
            //   ` Skipping calc generation for ${rowId} - cached data exists`,
            // );
            return;
          }

          // Skip if calc data already in globalCalcCache
          const cachedInGlobal = globalCalcCache.find(
            (c) =>
              String(c.rowId) === String(rowId) ||
              String(c.rowId) === String(groupKey),
          );
          if (
            cachedInGlobal &&
            Array.isArray(cachedInGlobal.calcResult) &&
            cachedInGlobal.calcResult.length > 0
          ) {
            // console.log(
            //   ` Skipping calc generation for ${rowId} - globalCache exists with ${cachedInGlobal.calcResult.length} items`,
            // );
            return;
          }

          // Only generate if no cache exists
          if (rowId) {
            //console.log(` Generating calc for ${rowId} (no cache found)`);
            generateTableCalculasi(rowId);
          }
        });
        isCalculatePaymentClicked = true;
      }

      //  PERBAIKAN: Deklarasikan purchasePlanID di AWAL function
      const purchasePlanID = dbtPurchasePlan_ID || headID || null;

      // Validasi PurchasePlanID
      if (!purchasePlanID) {
        alert(" Error: Purchase Plan ID Not Found!");
        reject({ success: false, message: "Purchase Plan ID not found" });
        return;
      }

      const progressTracker = {
        header: 0,
        tableTengah: 0,
        tableKiri: 0,
        tableKanan: 0,
        totalSteps: 4,
        currentStep: 0,

        update(step, percentage) {
          this[step] = percentage;
          const totalPercent = Math.round(
            (this.header +
              this.tableTengah +
              this.tableKiri +
              this.tableKanan) /
              this.totalSteps,
          );

          updateProgressBar(totalPercent, step);
        },
      };

      function updateProgressBar(percent, step) {
        const statusMap = {
          header: "Saving header plan...",
          tableTengah: "Saving shipment (middle table)...",
          tableKiri: "Saving detail (left table)...",
          tableKanan: "Saving payment (right table)...",
          calc: "Saving payment calculation...",
        };

        $("#progressBar").css("width", percent + "%");
        $("#progressText").text(percent + "%");
        $("#progressStatus").text(statusMap[step] || "Memproses...");

        // NOTE: Modal sudah ditampilkan dari button click handler
      }

      // console.log(" Purchase Plan ID:", purchasePlanID);
      let saveResults = {
        header: false,
        tableTengah: false,
        tableKiri: false,
        tableKanan: false,
      };

      let completedRequests = 0;
      let totalRequests = 4;

      function showModalSuccess(docNumber, docId) {
        $("#modalDocNumber").text(docNumber);
        $("#saved-docid").val(docId);
        $("#successModal").modal("show");
      }

      function showErrorAlert(message) {
        // Bisa diganti dengan modal error jika diperlukan
        alert(message);
      }

      function checkAllCompleted() {
        if (completedRequests === totalRequests) {
          if (
            saveResults.header &&
            saveResults.tableTengah &&
            saveResults.tableKiri &&
            saveResults.tableKanan
          ) {
            progressTracker.update("calc", 95);

            $.ajax({
              url:
                BASE_URL + "scm/purchasing/purchase_plan_report/getDocNumber",
              type: "POST",
              data: { id: headID },
              dataType: "json",
              success: function (response) {
                if (response.status === "success") {
                  progressTracker.update("calc", 100);

                  setTimeout(() => {
                    $("#progressModal").modal("hide");
                    showModalSuccess(response.docNumber, headID);
                  }, 500);

                  deletedShipmentIDs = [];
                  deletedDtlIDs = [];

                  resolve({
                    success: true,
                    docNumber: response.docNumber,
                    docId: headID,
                  });
                } else {
                  progressTracker.update("calc", 100);
                  setTimeout(() => {
                    $("#progressModal").modal("hide");
                    showErrorAlert(
                      "Data berhasil tersimpan, namun gagal mengambil nomor dokumen: " +
                        response.message,
                    );
                  }, 500);

                  deletedShipmentIDs = [];
                  deletedDtlIDs = [];

                  resolve({
                    success: true,
                    docNumber: null,
                    docId: headID,
                    warning: response.message,
                  });
                }
              },
              error: function (xhr, status, error) {
                progressTracker.update("calc", 100);
                setTimeout(() => {
                  $("#progressModal").modal("hide");
                  showErrorAlert(
                    "Data berhasil tersimpan, namun gagal mengambil nomor dokumen",
                  );
                }, 500);

                deletedShipmentIDs = [];
                deletedDtlIDs = [];

                resolve({
                  success: true,
                  docNumber: null,
                  docId: headID,
                  warning: "Gagal mengambil nomor dokumen",
                });
              },
            });
          } else {
            progressTracker.update("calc", 0);
            setTimeout(() => {
              $("#progressModal").modal("hide");
              let message = "Terdapat kesalahan dalam penyimpanan data:\n\n";
              message += `• Header: ${saveResults.header ? "Berhasil" : "Gagal"}\n`;
              message += `• Table Tengah: ${saveResults.tableTengah ? "Berhasil" : "Gagal"}\n`;
              message += `• Table Kiri: ${saveResults.tableKiri ? "Berhasil" : "Gagal"}\n`;
              message += `• Table Kanan: ${saveResults.tableKanan ? "Berhasil" : "Gagal"}`;
              showErrorAlert(message);
            }, 500);

            reject({
              success: false,
              message: message,
              saveResults: saveResults,
            });
          }
        }
      }

      // NOTE: Button sudah di-disable dari click handler
      let CurrID = $("#currency").val() || 1; // default 1 jika tidak ada
      let CurrRate = $("#rate").val() || 1;
      // Update HEAD - PENTING: Gunakan selector langsung untuk menghindari masalah scope
      let postData = {
        id: headID,
        DocDate: $("#DocDate").val(),
        ItemDesc: $("#ItemDesc").val(),
        CurrID: CurrID,
        CurrRate: CurrRate,
      };

      $.ajax({
        url: BASE_URL + "scm/purchasing/purchase_plan_report/updateHeader",
        type: "POST",
        data: postData,
        dataType: "json",
        xhr: function () {
          const xhr = new window.XMLHttpRequest();
          xhr.upload.addEventListener(
            "progress",
            function (e) {
              if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressTracker.update("header", percentComplete);
              }
            },
            false,
          );
          return xhr;
        },
        success: function (response) {
          if (response.status === "success") {
            // console.log("Data header berhasil diperbarui!");
            // console.log("berhasil simpan header");
            saveResults.header = true;
          } else {
            // console.log("Gagal memperbarui data header: " + response.message);
            saveResults.header = false;
          }
        },
        error: function (xhr, status, error) {
          // console.log(
          //   "Terjadi kesalahan saat berkomunikasi dengan server." + error,
          // );
          saveResults.header = false;
        },
        complete: function () {
          completedRequests++;
          checkAllCompleted();
        },
      });

      // Update table tengah
      let dataBaruTableTengah = [];
      $(".BigDataTableTengah tbody tr").each(function () {
        let $row = $(this);
        let rowData = {};
        rowData.ShipmentID = parseInt($row.attr("data-shipment-id")) || 0;
        rowData.ItemUnitID = $row.find(".itemunitid").val();
        rowData.ItemID = $row.find(".itemSelectColumn").val();
        rowData.Vendor = $row.find(".vendorSelectColumn").val();
        rowData.Color = $row.find(".colorColumn").val();
        rowData.ShipmentDate = $row.find(".shipmentDateColumn").val();
        rowData.Qty = parseInt($row.find(".qtyColumn").val()) || 0;
        rowData.Batch = parseInt($row.find(".batchColumn").val()) || 0;
        let priceValue = $row.find(".priceColumn").val();
        rowData.Price = parseFloat(priceValue.replace(/[^0-9.-]+/g, "")) || 0;
        rowData.PODateEst = $row.find(".PODateEstColumn").val();
        let termVal = $row.find(".TermDaysColumn").val();
        rowData.Term =
          termVal !== ""
            ? parseInt(termVal, 10)
            : tableTengahEditData[$row.data("rowIndex")].termDays;
        rowData.Batch = parseInt($row.find(".batchColumn").val()) || 0;
        //  Gunakan purchasePlanID yang sudah dideklarasikan
        rowData.PurchasePlanID = purchasePlanID;
        rowData.BlanketID =
          $row.attr("data-blanket-id") ||
          $row.find(".blanketIDColumn").val() ||
          null;
        rowData.POID =
          $row.attr("data-po-id") || $row.find(".POIDColumn").val() || null;
        rowData.Closed =
          parseInt($row.attr("data-closed")) ||
          parseInt($row.find(".closedColumn").val()) ||
          0;

        rowData.isNew = rowData.ShipmentID === 0;
        dataBaruTableTengah.push(rowData);
      });

      dataBaruTableTengah.forEach((row) => {
        row.PurchasePlanID = dbtPurchasePlan_ID;
      });
      let inserts = dataBaruTableTengah.filter((r) => r.isNew);
      let updates = dataBaruTableTengah.filter((r) => !r.isNew);
      let payload = [...updates, ...inserts];

      $.ajax({
        url: BASE_URL + "scm/purchasing/purchase_plan_report/updateTableTengah",
        type: "POST",
        data: JSON.stringify({
          shipments: [...updates, ...inserts],
          deletedShipmentIDs: deletedShipmentIDs, // Include deleted shipments
        }),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        xhr: function () {
          const xhr = new window.XMLHttpRequest();
          xhr.upload.addEventListener(
            "progress",
            function (e) {
              if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressTracker.update("tableTengah", percentComplete);
              }
            },
            false,
          );
          return xhr;
        },
        success: function (response) {
          if (response.newShipments) {
            response.newShipments.forEach((s) => {
              const $row = $(".BigDataTableTengah tbody tr").eq(s.tempRowIndex);
              $row.attr("data-shipment-id", s.ShipmentID);
              $row.removeAttr("data-is-new");
            });
          }

          if (response.status === "success") {
            saveResults.tableTengah = true;

            //  Simpan mapping shipment ke global untuk dipakai table kiri & kanan
            window.mappingShipment = response.mappingShipment || {};
          } else {
            saveResults.tableTengah = false;
          }
        },

        error: function (xhr, status, error) {
          console.error("AJAX Error:", status, error);
          console.error("Response Text:", xhr.responseText);
          // console.log(
          //   "Terjadi kesalahan saat menyimpan data tabel. Silakan cek konsol.",
          // );
          saveResults.tableTengah = false;
        },
        complete: function () {
          completedRequests++;
          checkAllCompleted();
        },
      });
      // Update table kiri
      let dataBaruTableKiri = [];

      $(".BigDataTableKiri tbody tr").each(function () {
        let $row = $(this);

        function parseNumberFromCurrency(value) {
          if (!value || value === "") return null;
          let cleanValue = value.toString().replace(/[,]/g, "");
          return parseFloat(cleanValue);
        }

        let rowData = {};

        let dtlId =
          parseInt($row.attr("data-dtl-id")) ||
          parseInt($row.attr("data-real-dtl-id")) ||
          parseInt($row.data("purchasePlanDtlId")) ||
          0;

        const tempRowId = $row.attr("data-temp-rowid") || null;

        const isNew =
          dtlId === 0 || (tempRowId && tempRowId.startsWith("temp-"));
        const isExisting =
          dtlId > 0 && tempRowId && tempRowId.startsWith("real-");

        rowData.DtlID = dtlId;
        rowData.isNew = isNew;
        rowData.isExisting = isExisting;
        rowData.tempRowId = tempRowId;

        //  FIX: Ambil vendor_id dan batch dari <tr> attribute, bukan dari <td> untuk menghindari mismatch
        rowData.Vendor =
          $row.attr("data-vendor-id") ||
          $row.find("td:eq(0)").attr("data-vendor-id");

        let batch =
          $row.attr("data-batch") || $row.find("td:eq(1)").attr("data-batch");
        const shipmentDate = $row.find("td:eq(1)").attr("data-shipment-date");
        rowData.ShipmentDate = shipmentDate || null;

        if (
          (!batch || batch === "0" || batch === null) &&
          window.mappingShipment
        ) {
          const tempRowIdForMap = $row.attr("data-temp-rowid");
          const shipmentMap = window.mappingShipment[tempRowIdForMap];
          if (shipmentMap && shipmentMap.Batch) {
            batch = shipmentMap.Batch;
          }
        }

        rowData.Batch = parseInt(batch) || 0;
        rowData.Total = parseNumberFromCurrency(
          $row.find(".totalAmountCell").text(),
        );

        // Ambil BlanketPODateEst dari input atau attribute
        const blanketInput = $row.find(".blanket-est-input");
        let blanketPODateEst =
          blanketInput.val() ||
          blanketInput.attr("data-blanket-po-date-est") ||
          $row
            .find(".view-summary-details-btn")
            .attr("data-blanket-po-date-est") ||
          null;
        rowData.BlanketPODateEst = blanketPODateEst;

        rowData.PurchasePlanID = parseInt(purchasePlanID);

        dataBaruTableKiri.push(rowData);
      });

      const existingRows = dataBaruTableKiri.filter((d) => d.isExisting);
      const newRows = dataBaruTableKiri.filter((d) => d.isNew);

      if (newRows.length > 0) {
        //console.log(` Ada ${newRows.length} row baru yang akan di-INSERT:`);
        newRows.forEach((r) => {
          //console.log(
          //  `    - Vendor: ${r.Vendor}, Batch: ${r.Batch}, ShipmentDate: ${r.ShipmentDate}`,
          //);
        });
      }

      $.ajax({
        url: BASE_URL + "scm/purchasing/purchase_plan_report/updateTableKiri",
        type: "POST",
        data: JSON.stringify({
          dataKiri: dataBaruTableKiri,
          mappingShipment: window.mappingShipment || {},
        }),
        contentType: "application/json; charset=utf-8",
        dataType: "json",
        xhr: function () {
          const xhr = new window.XMLHttpRequest();
          xhr.upload.addEventListener(
            "progress",
            function (e) {
              if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressTracker.update("tableKiri", percentComplete);
              }
            },
            false,
          );
          return xhr;
        },
        success: function (response) {
          if (response.status === "success") {
            // console.log("Berhasil Simpan Table Kiri");
            saveResults.tableKiri = true;

            const mapping = response.mapping || {};
            //console.log("Mapping diterima dari backend:", mapping);

            // console.log("\nVALIDASI MAPPING:");
            dataBaruTableKiri.forEach((data) => {
              const mappedDtlId = mapping[data.tempRowId];
              // console.log(
              //   `  ${data.tempRowId} (${data.isNew ? "NEW" : "EXISTING"}) → mapped to: ${mappedDtlId || "UNDEFINED"}`,
              // );

              if (data.isNew && !mappedDtlId) {
                console.error(
                  `  ERROR: New row tidak dapat DtlID dari backend!`,
                );
              }

              // Jika EXISTING, harusnya DtlID tetap sama
              if (
                data.isExisting &&
                mappedDtlId &&
                mappedDtlId !== data.DtlID
              ) {
                console.warn(
                  `  WARNING: Existing row DtlID berubah: ${data.DtlID} → ${mappedDtlId}`,
                );
              }
            });

            refreshPurchasePlanDtlIDs(purchasePlanID);

            // Update table kiri & kanan dengan mapping
            $(".BigDataTableKiri tbody tr").each(function () {
              const $rowKiri = $(this);
              const tempRowId = $rowKiri.attr("data-temp-rowid");
              const newDtlID = mapping[tempRowId];

              if (newDtlID) {
                // console.log(`Update: ${tempRowId} → DtlID: ${newDtlID}`);
                // Update table kiri
                $rowKiri.attr("data-dtl-id", newDtlID);
                $rowKiri.attr("data-real-dtl-id", newDtlID);
                $rowKiri.attr("data-temp-rowid", "real-" + newDtlID);

                // Update button attributes
                $rowKiri
                  .find(".view-summary-details-btn")
                  .attr("data-real-dtl-id", newDtlID);
                $rowKiri
                  .find(".view-summary-details-btn")
                  .attr("data-temp-rowid", "real-" + newDtlID);
                $rowKiri
                  .find(".go-to-blanket-btn")
                  .attr("data-real-dtl-id", newDtlID);

                // Update kumpulanDataTableKiriKanan source data
                if (
                  window.kumpulanDataTableKiriKanan &&
                  Array.isArray(window.kumpulanDataTableKiriKanan)
                ) {
                  const sourceGroup = window.kumpulanDataTableKiriKanan.find(
                    (g) => String(g.tempRowId) === String(tempRowId),
                  );
                  if (sourceGroup) {
                    sourceGroup.purchasePlanDtlId = newDtlID;
                    sourceGroup.purchasePlanDtlID = newDtlID;
                    sourceGroup.tempRowId = "real-" + newDtlID;
                    // console.log(
                    //   `✓ Updated kumpulanDataTableKiriKanan: ${tempRowId} → ${newDtlID}`,
                    // );
                  }
                }

                // Update table kanan
                $(`#tableKanan tr[data-temp-rowid="${tempRowId}"]`).each(
                  function () {
                    $(this).attr("data-dtl-id", newDtlID);
                    $(this).attr("data-temp-rowid", "real-" + newDtlID);
                  },
                );
              }
            });

            // Lanjutkan ke Table Kanan
            saveTableKanan(mapping, purchasePlanID);
          } else {
            saveResults.tableKiri = false;
          }
        },
        error: function (xhr, status, error) {
          console.error("AJAX Error (kiri):", status, error);
          console.error("Response:", xhr.responseText);
          saveResults.tableKiri = false;
        },
        complete: function () {
          completedRequests++;
          //console.log(` Progress: ${completedRequests}/${totalRequests}`);
        },
      });

      function saveTableKanan(mapping, purchasePlanID) {
        let dataBaruTableKanan = [];
        const dtlIdByGroupKey = {};
        if (Array.isArray(kumpulanDataTableKiriKanan)) {
          kumpulanDataTableKiriKanan.forEach((group) => {
            if (group.groupKey && group.purchasePlanDtlId) {
              dtlIdByGroupKey[group.groupKey] = group.purchasePlanDtlId;
            }
          });
        }

        $("#tableKanan tr").each(function () {
          let $row = $(this);
          if ($row.find("th").length > 0) return; // skip header

          const parseNumber = (val) =>
            !val || val === ""
              ? null
              : parseFloat(val.toString().replace(/[,]/g, ""));

          const tempRowId = $row.attr("data-temp-rowid") || null;
          const dtlId = parseInt($row.attr("data-dtl-id")) || 0;

          // PERBAIKAN: Gunakan mapping untuk resolve PurchasePlanDtlID
          let purchasePlanDtlID = null;

          // 1) pakai dtlId jika >0
          if (dtlId && Number(dtlId) > 0) {
            purchasePlanDtlID = Number(dtlId);
          }

          // 2) jika belum, coba mapping via tempRowId
          if ((!purchasePlanDtlID || purchasePlanDtlID === 0) && tempRowId) {
            if (mapping[tempRowId]) {
              purchasePlanDtlID = Number(mapping[tempRowId]);
            }
          }

          // 3) fallback: kadang mapping contain values that match old dtlId
          if ((!purchasePlanDtlID || purchasePlanDtlID === 0) && dtlId) {
            for (const [tmp, newId] of Object.entries(mapping || {})) {
              if (
                String(newId) === String(dtlId) ||
                String(tmp) === String(dtlId)
              ) {
                purchasePlanDtlID = Number(newId);
                break;
              }
            }
          }

          let shipmentDate = null;
          let vendorId = null;
          let batch = null;

          if (!purchasePlanDtlID) {
            // Cari di table kiri berdasarkan tempRowId
            const tableKiriRow = $(
              `.BigDataTableKiri tbody tr[data-temp-rowid="${tempRowId}"]`,
            );

            if (tableKiriRow.length > 0) {
              // Ambil dari td attributes (struktur: Vendor, Batch/ShipmentDate, Total, Action)
              const vendorTd = tableKiriRow.find("td:eq(0)");
              const dateTd = tableKiriRow.find("td:eq(1)");

              vendorId = vendorTd.attr("data-vendor-id");
              batch = dateTd.attr("data-batch");
              shipmentDate = dateTd.attr("data-shipment-date");
            } else {
              console.warn(
                ` Could not find shipment info in table kiri for tempRowId: ${tempRowId}`,
              );
            }
          }

          const currentGroupKey = $row.attr("data-current-group-key");
          if (currentGroupKey && dtlIdByGroupKey[currentGroupKey]) {
            const correctDtlId = dtlIdByGroupKey[currentGroupKey];
            if (purchasePlanDtlID && purchasePlanDtlID !== correctDtlId) {
              console.warn(
                `  MISMATCH DTL ID for groupKey ${currentGroupKey}: expected ${correctDtlId}, got ${purchasePlanDtlID}. Using correct one.`,
              );
              purchasePlanDtlID = correctDtlId;
            }
          }

          let rowData = {
            PaymentID: parseInt($row.attr("data-payment-id")) || 0,
            PurchasePlanDtlID: purchasePlanDtlID,
            tempRowId: tempRowId,
            // PaymentDate: $row.find(".paymentDateTableKanan").val() || null,
            Notes: $row.find(".notesTableKanan").val() || null,
            Percent:
              $row.find(".percenTableKanan").val() !== ""
                ? parseFloat($row.find(".percenTableKanan").val())
                : null,
            FromValue: $row.find(".formValueTableKanan").val() || null,
            Alert: $row.find(".alertTableKanan").val() || null,
            Term:
              $row.find(".termDaysTableKanan").val() !== ""
                ? parseInt($row.find(".termDaysTableKanan").val())
                : null,
            OACredit:
              $row.find(".OACreditTableKanan").val() !== ""
                ? parseInt($row.find(".OACreditTableKanan").val())
                : null,
            shipmentDate: shipmentDate,
            vendorId: vendorId,
            batch: batch,
          };

          dataBaruTableKanan.push(rowData);
        });

        // PENTING: sampai sini dataBaruTableKanan cuma berisi batch yang
        // SEDANG TAMPIL di #tableKanan. Kalau user sempat pindah-pindah
        // batch (via view-summary-details-btn) tanpa Save di antaranya,
        // batch-batch lain yang sudah diisi tersimpan di memory
        // (kumpulanDataTableKiriKanan) tapi tidak pernah ikut terkirim.
        // Gabungkan di sini supaya semua batch yang pernah diisi ikut
        // ke-save, bukan cuma yang terakhir dibuka.
        const dtlIdsAlreadySent = new Set(
          dataBaruTableKanan
            .map((r) => r.PurchasePlanDtlID)
            .filter((id) => id !== null && id !== undefined && id !== 0),
        );
        const tempRowIdsAlreadySent = new Set(
          dataBaruTableKanan.map((r) => r.tempRowId).filter(Boolean),
        );

        if (Array.isArray(kumpulanDataTableKiriKanan)) {
          kumpulanDataTableKiriKanan.forEach((group) => {
            const groupDtlId =
              group.purchasePlanDtlID || group.purchasePlanDtlId || null;
            const groupTempRowId = group.tempRowId || null;

            // Lewati kalau grup ini yang sedang tampil di DOM (sudah masuk di atas)
            if (groupDtlId && dtlIdsAlreadySent.has(Number(groupDtlId))) return;
            if (
              !groupDtlId &&
              groupTempRowId &&
              tempRowIdsAlreadySent.has(groupTempRowId)
            )
              return;

            const baseInfo = {
              PurchasePlanDtlID: groupDtlId,
              tempRowId: groupTempRowId,
              shipmentDate: group.shipmentDate || null,
              vendorId: group.vendorId || group.vendor || null,
              batch: group.batch || null,
            };

            if (Array.isArray(group.payments) && group.payments.length > 0) {
              // Format baru: array object payments
              group.payments.forEach((p) => {
                dataBaruTableKanan.push({
                  ...baseInfo,
                  PaymentID: Number(p.PaymentID) || 0,
                  Notes: p.Notes ?? null,
                  Percent: p.Percent ?? null,
                  FromValue: p.FromValue ?? null,
                  Alert: p.Alert ?? null,
                  Term: p.Term ?? null,
                  OACredit: p.OACredit ?? null,
                });
              });
            } else if (
              Array.isArray(group.paymentIds) &&
              group.paymentIds.length > 0
            ) {
              // Format lama: parallel arrays (paymentIds, termDays, percent, dst)
              group.paymentIds.forEach((paymentId, idx) => {
                dataBaruTableKanan.push({
                  ...baseInfo,
                  PaymentID: Number(paymentId) || 0,
                  Notes: group.notes?.[idx] ?? null,
                  Percent: group.percent?.[idx] ?? null,
                  FromValue: group.formValue?.[idx] ?? null,
                  Alert: group.alert?.[idx] ?? null,
                  Term: group.termDays?.[idx] ?? null,
                  OACredit: group.OACredit?.[idx] ?? null,
                });
              });
            }
          });
        }

        $.ajax({
          url:
            BASE_URL + "scm/purchasing/purchase_plan_report/updateTableKanan",
          type: "POST",
          data: JSON.stringify({
            payments: dataBaruTableKanan,
            mapping: mapping,
            mappingShipment: window.mappingShipment || {},
            purchasePlanID: purchasePlanID,
            deletedDtlIDs: deletedDtlIDs, // Include deleted details
          }),
          contentType: "application/json; charset=utf-8",
          dataType: "json",
          xhr: function () {
            const xhr = new window.XMLHttpRequest();
            xhr.upload.addEventListener(
              "progress",
              function (e) {
                if (e.lengthComputable) {
                  const percentComplete = (e.loaded / e.total) * 100;
                  progressTracker.update("tableKanan", percentComplete);
                }
              },
              false,
            );
            return xhr;
          },
          success: function (response) {
            if (response.status === "success") {
              // console.log(" Berhasil Simpan Table Kanan");
              saveResults.tableKanan = true;
            } else {
              // console.log(" Gagal Simpan Table Kanan:", response.message);
              saveResults.tableKanan = false;
            }
            // console.log("Updated globalCalcCache:", globalCalcCache);

            // Untuk mode EDIT: Gunakan mapping untuk mendapatkan arrListIDTableKiri
            const arrListIDTableKiri = Object.values(mapping).map((id) =>
              parseInt(id),
            );

            // Jika tidak ada calc data, langsung selesai (jangan return, biar complete tetap jalan)
            if (globalCalcCache.length === 0) {
              // console.log("Tidak ada calc data untuk disimpan");
              // Tidak perlu return, biarkan complete callback yang handle
            } else {
              // Update globalCalcCache dengan purchasePlanDtlID
              globalCalcCache.forEach((cacheItem) => {
                const cacheRowId = cacheItem.rowId;

                // 1. Coba dari mapping langsung
                if (mapping[cacheRowId]) {
                  cacheItem.purchasePlanDtlID = parseInt(mapping[cacheRowId]);
                  // console.log(
                  //   `Cache ${cacheRowId} → DtlID dari mapping: ${cacheItem.purchasePlanDtlID}`,
                  // );
                  return;
                }

                if (cacheRowId && !cacheItem.purchasePlanDtlID) {
                  const parts = String(cacheRowId).split("-");
                  if (parts.length >= 3 && parts[1] === "batch") {
                    const vendorId = parts[0];
                    const batch = parts[2];

                    $(".BigDataTableKiri tbody tr").each(function () {
                      const $row = $(this);
                      const rowVendorId = $row
                        .find("td:eq(0)")
                        .attr("data-vendor-id");
                      const rowBatch = $row.find("td:eq(1)").attr("data-batch");

                      if (
                        String(rowVendorId) === String(vendorId) &&
                        String(rowBatch) === String(batch)
                      ) {
                        const dtlId =
                          parseInt($row.attr("data-dtl-id")) ||
                          parseInt($row.attr("data-real-dtl-id")) ||
                          0;
                        if (dtlId > 0) {
                          cacheItem.purchasePlanDtlID = dtlId;
                          // console.log(
                          //   `Cache ${cacheRowId} → DtlID dari DOM: ${dtlId}`,
                          // );
                          return false; // break each loop
                        }
                      }
                    });
                  }
                }

                if (
                  !cacheItem.purchasePlanDtlID &&
                  kumpulanDataTableKiriKanan &&
                  kumpulanDataTableKiriKanan.length > 0
                ) {
                  const kiriRow = kumpulanDataTableKiriKanan.find(
                    (r) =>
                      String(r.rowId) === String(cacheRowId) ||
                      String(r.tempRowId) === String(cacheRowId),
                  );
                  if (kiriRow) {
                    cacheItem.purchasePlanDtlID =
                      kiriRow.purchasePlanDtlID ||
                      kiriRow.purchasePlanDtlId ||
                      kiriRow.PurchasePlanDtlID ||
                      null;
                    if (cacheItem.purchasePlanDtlID) {
                      // console.log(
                      //   `Cache ${cacheRowId} → DtlID dari kumpulanData: ${cacheItem.purchasePlanDtlID}`,
                      // );
                    }
                  }
                }
              });

              // DEDUPLICATE: Gabungkan cache items dengan purchasePlanDtlID yang sama
              const mergedCache = {};
              globalCalcCache.forEach((row) => {
                const dtlId = row.purchasePlanDtlID;
                if (!dtlId) {
                  console.warn(
                    " Cache item tanpa purchasePlanDtlID:",
                    row.rowId,
                  );
                  return;
                }

                if (!mergedCache[dtlId]) {
                  mergedCache[dtlId] = {
                    rowId: row.rowId,
                    purchasePlanDtlID: dtlId,
                    calcResult: [],
                  };
                }
                // Gabungkan calcResult
                if (Array.isArray(row.calcResult)) {
                  mergedCache[dtlId].calcResult.push(...row.calcResult);
                }
              });

              // Deduplicate calcResult di dalam setiap merged item
              Object.values(mergedCache).forEach((item) => {
                const seenKeys = new Set();
                item.calcResult = item.calcResult.filter((r) => {
                  const key = `${r.notes || ""}-${r.percent || 0}-${r.alert || 0}-${r.fromValue || 0}`;
                  if (seenKeys.has(key)) return false;
                  seenKeys.add(key);
                  return true;
                });
              });

              const uniqueCalcItems = Object.values(mergedCache);
              // console.log(" Merged cache (deduplicated):", uniqueCalcItems);

              // 🚀 OPTIMIZATION: Bulk save all calc data in ONE request instead of multiple
              if (uniqueCalcItems.length > 0) {
                $.ajax({
                  url:
                    BASE_URL +
                    "scm/purchasing/purchase_plan_report/save_all_payment_calc_summary",
                  type: "POST",
                  data: JSON.stringify({
                    calcItems: uniqueCalcItems,
                    purchasePlanID: purchasePlanID,
                    arrListIDTableKiri: arrListIDTableKiri,
                  }),
                  contentType: "application/json; charset=utf-8",
                  dataType: "json",
                  success: function (res) {
                    if (res.status === "success") {
                      // console.log("✓ All calc data saved in bulk");
                    } else {
                      console.warn("Bulk calc save warning:", res.message);
                    }
                  },
                  error: function (xhr, status, error) {
                    console.error("❌ Bulk calc save error:", error);
                    console.error("Response:", xhr.responseText);
                  },
                });
              }
            }
          },
          error: function (xhr, status, error) {
            console.error(" AJAX Error (kanan):", status, error);
            console.error("Response:", xhr.responseText);
            saveResults.tableKanan = false;
          },
          complete: function () {
            completedRequests++;

            // console.log(`Progress: ${completedRequests}/${totalRequests}`);
            checkAllCompleted();
            if (completedRequests === totalRequests) {
              btnSave.prop("disabled", false).text("Save");
            }
          },
        });
      }
    }); // End of Promise
  };

  btnSave.on("click", function () {
    // ✅ SHOW MODAL LANGSUNG SAAT BUTTON DI-KLIK
    $("#progressModal").modal("show");
    $("#progressBar").css("width", "0%");
    $("#progressText").text("0%");
    $("#progressStatus").text("Initializing...");

    // Disable button untuk cegah double-click
    btnSave.prop("disabled", true).text("Saving...");

    // JALANKAN SAVE SETELAH MODAL MUNCUL
    window
      .executeSaveProcess({ showModal: false }) // ← false, modal sudah di-handle dari sini
      .then((result) => {
        // console.log("Save berhasil:", result);
        btnSave.prop("disabled", false).text("Save");
      })
      .catch((error) => {
        //console.log("Save gagal:", error);
        $("#progressModal").modal("hide");
        btnSave.prop("disabled", false).text("Save");
      });
  });
});

// main production
$(function () {
  $(".btn-exit").on("click", function () {
    window.history.back();
  });

  if (!idFromUrl) {
    return;
  }

  // Vendor & item dropdown sekarang lazy-load lewat AJAX Select2 (lihat
  // renderTableTengahRows), jadi tidak perlu ditarik semua di awal.
  // Yang masih perlu dimuat lebih dulu cuma daftar warna (dipakai langsung
  // sebagai <option> statis) dan peta nama vendor untuk label baris tersimpan.
  Promise.all([loadVendorNameMap(), loadColorOptions()])
    .then(() => {
      loadInitialPurchasePlanData(idFromUrl);
    })
    .catch((error) => {
      console.error("Error loading vendor or item options:", error);
    });
});

// Peta ID -> Nama vendor. Dipakai untuk label pre-selected di baris yang sudah
// tersimpan dan untuk tampilan nama vendor di table kiri/laporan.
// Endpoint ini mengembalikan SEMUA vendor (bukan endpoint search berpaginasi
// get_vendor_search yang dipakai dropdown), jadi hasilnya di-cache.
let arrVendor = {};
function loadVendorNameMap() {
  if (isVendorOptionsCached) {
    return $.Deferred().resolve().promise();
  }

  return $.ajax({
    url:
      BASE_URL +
      "scm/purchasing/purchase_order_plan/get_coaattr_customer_vendor",
    type: "POST",
    dataType: "json",
    data: { type: "20010" },
    success: function (data) {
      vendorMap = {};
      vendorMap_reverse = {};

      if (data && Array.isArray(data)) {
        data.forEach(function (vendor) {
          vendorMap[vendor.ID] = vendor.coName;
          arrVendor[vendor.ID] = vendor.coName;
          vendorMap_reverse[vendor.coName] = vendor.ID;
        });
      }

      isVendorOptionsCached = true;
      console.log(
        "Vendor name map cached:",
        Object.keys(vendorMap).length,
        "vendors",
      );
    },
    error: function (jqXHR, textStatus, errorThrown) {
      console.error("Error loading vendor name map:", textStatus, errorThrown);
    },
  });
}

// fungsi load color options
function loadColorOptions() {
  // Return cached version jika sudah ada
  if (isColorOptionsCached && colorOptionsHTML) {
    console.log("✓ Using cached colorOptionsHTML");
    return $.Deferred().resolve().promise();
  }

  return $.ajax({
    url: BASE_URL + "scm/purchasing/purchase_order_plan/get_color_list",
    type: "GET",
    dataType: "json",
    success: function (data) {
      allItems = [];

      // OPTIMIZATION: Gunakan array + join() untuk performa lebih baik
      const optionsArray = ['<option value="">-- Pilih Warna--</option>'];

      if (data && Array.isArray(data)) {
        allItems = data;
        data.forEach(function (color) {
          optionsArray.push(
            `<option value="${color.AttributeValue}" data-colorid="${color.AttributeID}">
              ${color.AttributeValue}
            </option>`,
          );
        });
        colorOptionsHTML = optionsArray.join("");
        isColorOptionsCached = true; // Set flag cache
        console.log("✓ Color options cached", data.length, "colors");
      } else {
        console.error("Invalid item data format or empty:", data);
        colorOptionsHTML = '<option value="">No items available</option>';
      }
    },
    error: function (jqXHR, textStatus, errorThrown) {
      console.error("Error loading item options:", textStatus, errorThrown);
      console.log("Gagal memuat daftar warna. Silakan coba refresh halaman.");
      colorOptionsHTML = '<option value="">No items available</option>';
    },
  });
}

function saveHeaderData(DocDate, ItemDesc) {
  const saveButton = $(".btn-save");

  $.ajax({
    url: BASE_URL + "scm/purchasing/purchase_plan_report/save_header",
    type: "POST",
    data: {
      doc_date: DocDate,
      item_desc: ItemDesc,
    },
    dataType: "json",
    timeout: 30000, // 30 detik timeout
    success: function (headerResponse) {
      if (headerResponse && headerResponse.status === "success") {
        const dbtPurchasePlan_ID = headerResponse.dbtPurchasePlan_ID;
        const docNumber = headerResponse.docNumber; // ambil dari response

        // Tampilkan di modal
        $("#modalDocNumber").text(docNumber);
        $("#successModal").modal("show");

        // Lanjutkan ke save table tengah
        saveTableTengah(dbtPurchasePlan_ID);
      } else {
        const errorMsg =
          headerResponse && headerResponse.message
            ? headerResponse.message
            : "Response not valid from server";
        alert("Error saving header: " + errorMsg);
        refreshFinished();
        saveButton.prop("disabled", false).text("Save");
      }
    },
    error: function (xhr, status, error) {
      console.error("AJAX GAGAL save header!", {
        status: status,
        error: error,
        responseText: xhr.responseText,
        responseStatus: xhr.status,
      });

      let errorMessage = "Terjadi kesalahan saat menyimpan header:\n";

      if (xhr.status === 0) {
        errorMessage +=
          "Tidak dapat terhubung ke server. Periksa koneksi internet Anda.";
      } else if (xhr.status === 404) {
        errorMessage += "URL endpoint tidak ditemukan (404).";
      } else if (xhr.status === 500) {
        errorMessage += "Error internal server (500). Periksa log server.";
      } else if (status === "timeout") {
        errorMessage += "Request timeout. Server terlalu lama merespons.";
      } else if (xhr.responseText && xhr.responseText.includes("<html>")) {
        errorMessage +=
          "Server mengembalikan halaman error HTML. Periksa konfigurasi server.";
      } else {
        errorMessage += `HTTP ${xhr.status}: ${error}`;
      }

      alert(errorMessage);
      refreshFinished();
      saveButton.prop("disabled", false).text("Save");
    },
  });
}
function getYearFromShipmentDate(shipmentDate) {
  if (!shipmentDate) return "";
  return shipmentDate.substring(0, 4);
}

// fungsi get WW - FIXED dengan ISO week yang benar
function getWeekNumber(dateStr) {
  if (!dateStr) return "-";

  let d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";

  // Gunakan UTC untuk konsistensi ISO week
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);

  return weekNo;
}

function getISOWeekYear(dateStr) {
  if (!dateStr) return "";

  let d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";

  const year = d.getFullYear();

  // Function helper untuk get Monday of week 1
  function getMondayOfWeek1(y) {
    const jan4 = new Date(y, 0, 4);
    const dayOfWeek = jan4.getDay() || 7;
    const mondayWeek1 = new Date(jan4);
    mondayWeek1.setDate(jan4.getDate() - dayOfWeek + 1);
    return mondayWeek1;
  }

  // Cek 3 tahun: year-1, year, year+1
  const mondayYear1Before = getMondayOfWeek1(year - 1);
  const mondayYear = getMondayOfWeek1(year);
  const mondayYear1After = getMondayOfWeek1(year + 1);

  if (d >= mondayYear1After) {
    // Tanggal >= Monday of week 1 of year+1
    return String(year + 1);
  } else if (d >= mondayYear) {
    // Tanggal >= Monday of week 1 of year, tapi < Monday of week 1 of year+1
    return String(year);
  } else if (d >= mondayYear1Before) {
    // Tanggal >= Monday of week 1 of year-1, tapi < Monday of week 1 of year
    return String(year - 1);
  } else {
    // Shouldn't reach here, but fallback
    return String(year);
  }
}

function getWWFromShipmentDate(dateStr) {
  if (!dateStr) return "";

  const year = getISOWeekYear(dateStr);
  const week = getWeekNumber(dateStr);

  if (!year || !week || week === "-") return "";

  // pastikan 2 digit (01–53)
  const weekStr = String(week).padStart(2, "0");

  return `WW${year}${weekStr}`;
}

// tutup fungsi get WW
$(document).on("change", ".shipment-year-field", function () {
  const year = $(this).val(); // ex: "2025"
  const $row = $(this).closest("tr");
  const $wwSelect = $row.find(".wwColumn");

  if (!year) {
    $wwSelect.html('<option value="">-- Pilih WW --</option>');
    if ($wwSelect.hasClass("selectpicker")) {
      $wwSelect.selectpicker("refresh");
    }
    return;
  }

  loadWWByYear(year).then(function () {
    renderWWDropdown($wwSelect, year);
  });
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
$(document).on("change", ".wwColumn", function () {
  const $currentRow = $(this).closest("tr");
  const wwValue = $(this).val(); // ex: WW202540

  if (!wwValue || !wwValue.startsWith("WW")) {
    $currentRow.find(".shipmentDateColumn").val("");
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
  $currentRow.find(".shipmentDateColumn").val(formattedDate);

  // sync ke data model
  const rowIndex = $currentRow.index();
  if (tableTengahEditData[rowIndex]) {
    const oldShipmentDate = tableTengahEditData[rowIndex].shipmentDate;
    tableTengahEditData[rowIndex].shipmentDate = formattedDate;
    tableTengahEditData[rowIndex].ww = wwValue;

    const vendorId =
      parseInt($currentRow.find(".vendorSelectColumn").val(), 10) || 0;
    const batch = parseInt($currentRow.find(".batchColumn").val(), 10) || 0;
    const realDtlId = $currentRow.attr("data-real-dtl-id") || null;

    if (vendorId && (!batch || batch === 0)) {
      if (realDtlId && realDtlId > 0) {
        // dtl-based key doesn't change when shipmentDate changes
        console.log(
          "[WW CHANGE] Row uses dtl-based key, no rowId update needed: dtl-" +
            realDtlId,
        );
      } else {
        // Jika batch kosong, shipmentDate adalah bagian dari key (for new records)
        const oldRowId = `${vendorId}-date-${oldShipmentDate}`;
        const newRowId = `${vendorId}-date-${formattedDate}`;

        if (Array.isArray(window.kumpulanDataTableKiriKanan)) {
          window.kumpulanDataTableKiriKanan.forEach((obj) => {
            if (obj.rowId === oldRowId) {
              obj.rowId = newRowId;
            }
          });
        }

        // Update data-rowid di table kiri DOM
        const $oldRow = $(`.BigDataTableKiri tr[data-rowid='${oldRowId}']`);
        if ($oldRow.length) {
          $oldRow.attr("data-rowid", newRowId);
        }
      }
    }
  }

  const termDaysField = $currentRow.find(".TermDaysColumn");
  if (termDaysField.val() && termDaysField.val() !== "") {
    termDaysField.trigger("change");
  }
});

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

      // console.log("Year options HTML built");
    })
    .fail(function (xhr, status, error) {
      console.error("AJAX get_calendar_years FAILED", {
        status,
        error,
        response: xhr.responseText,
      });
    });
}
function renderYearDropdown($select, shipmentDate) {
  if (!yearOptionsHTML) return;

  //  PENTING: Gunakan ISO week year, bukan calendar year dari tanggal
  const shipmentYear = shipmentDate ? getISOWeekYear(shipmentDate) : "";

  $select.html(yearOptionsHTML);

  if (
    shipmentYear &&
    $select.find(`option[value="${shipmentYear}"]`).length === 0
  ) {
    $select.append(`<option value="${shipmentYear}">${shipmentYear}</option>`);
  }

  if (shipmentYear) {
    $select.val(shipmentYear);
  }
}

function loadWWByYear(year) {
  if (wwOptionsHTMLByYear[year]) {
    // console.log("WW options already cached for year:", year);
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
      // console.log(`Response get_ww_by_year (${year}):`, res);

      const wwData = Array.isArray(res) ? res : [];
      wwDataByYear[year] = wwData;

      // build HTML SEKALI per year
      let html = '<option value="">-- Pilih WW --</option>';

      wwData.forEach((r, idx) => {
        // console.log(`WW row ${idx}:`, r);

        if (!r.WW) return;

        html += `
          <option value="${r.WW}">
            ${r.WW}
          </option>`;
      });

      wwOptionsHTMLByYear[year] = html;
      // console.log("WW options HTML built for year:", year);
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

function renderWWDropdown($select, year, shipmentDate) {
  if (!year) return;

  // Return promise supaya bisa di-chain
  return loadWWByYear(year).done(function () {
    if (!wwOptionsHTMLByYear[year]) return;

    const shipmentWW = getWWFromShipmentDate(shipmentDate);

    $select.html(wwOptionsHTMLByYear[year]);

    // kalau WW dari shipment tidak ada di option → tambahkan
    if (
      shipmentWW &&
      $select.find(`option[value="${shipmentWW}"]`).length === 0
    ) {
      $select.append(`<option value="${shipmentWW}">${shipmentWW}</option>`);
    }

    // Set value SEBELUM init Select2
    if (shipmentWW) {
      $select.val(shipmentWW);
    }

    // Init Select2 SETELAH value di-set
    if ($select.data("select2")) {
      $select.select2("destroy");
    }
    $select.select2({
      placeholder: "-- Pilih WW --",
      minimumResultsForSearch: 1,
      width: "100%",
    });

    // Trigger change untuk sync
    if (shipmentWW) {
      $select.trigger("change");
    }
  });
}

// load all data dari id yang didapatkan dari url
function loadInitialPurchasePlanData(id) {
  if (!id) {
    console.log("ID Purchase Plan tidak valid.");
    return;
  }

  let fullDataApiUrl =
    BASE_URL +
    "scm/purchasing/purchase_plan_report/getDataUrl?id=" +
    encodeURIComponent(id);
  headID = encodeURIComponent(id);
  dbtPurchasePlan_ID = encodeURIComponent(id);
  // console.log("Mengambil data dari:", fullDataApiUrl);

  $.ajax({
    url: fullDataApiUrl,
    type: "GET",
    dataType: "json",
    success: function (response) {
      if (response && response.status === "success") {
        let main = response.main_plan;
        // console.log(" Currency Data from dbtPurchasePlan:", {
        //   CurrID: main.CurrID,
        //   CurrRate: main.CurrRate,
        // });
        // console.log("Nilai Closed dari main_plan:", main.Closed);

        console.log("=== DATA FROM CONTROLLER ===");
        console.log("main_plan:", JSON.stringify(main, null, 2));
        console.log("shipments:", response.shipments);
        console.log("details:", response.details);
        console.log("Shipments count:", response.shipments?.length);
        console.log("Shipments data:", response.shipments);
        console.log("Details count:", response.details?.length);
        console.log("Details data:", response.details);

        // Cek status closed dari shipments
        const shipments = response.shipments || [];
        const allShipmentsClosed =
          shipments.length > 0 &&
          shipments.every(
            (s) =>
              s.Closed == 1 ||
              s.Closed == 2 ||
              s.Closed === "1" ||
              s.Closed === "2",
          );
        const someShipmentsClosed = shipments.some(
          (s) =>
            s.Closed == 1 ||
            s.Closed == 2 ||
            s.Closed === "1" ||
            s.Closed === "2",
        );

        if (allShipmentsClosed) {
          // console.log(
          //   "ALL shipments closed. Nonaktifkan semua tombol & input.",
          // );
          window.planClosed = true;
          window.hasPartialClosed = false;
          //  Sembunyikan tombol Save (opsional)
          $(".btn-save").hide();

          //  Disable semua input, select, textarea
          $("input, select, textarea, button")
            .not(".btn-exit, .btn-history, #calculatePayment, .close")
            .prop("disabled", true)
            .prop("readonly", true);
          $("#tableKanan").off("input change blur", ".formValueTableKanan");
        } else if (someShipmentsClosed) {
          // console.log(
          //   "SOME shipments closed. Partial disable akan diterapkan.",
          // );
          window.planClosed = false;
          window.hasPartialClosed = true;
        } else {
          window.planClosed = false;
          window.hasPartialClosed = false;
        }
        loadCurrencyWithDefault(main.CurrID, main.CurrRate, main.DocDate);

        // Simpan shipments untuk digunakan setelah loadShipmentYears selesai
        const shipmentsData = response.shipments;
        const detailsData = response.details;
        const mainPlanData = response.main_plan;

        const planId = response.main_plan?.ID || idFromUrl;
        if (planId) {
          loadAllCalcDataFromDB(planId)
            .then(function (calcData) {
              console.log(
                " Data kalkulasi dari DB sudah di-cache:",
                Object.keys(calcData).length,
                "groups",
              );
            })
            .catch(function (error) {
              console.warn(" Gagal load data kalkulasi dari DB:", error);
            });
        }

        // Tunggu loadShipmentYears selesai baru render table tengah
        loadShipmentYears()
          .then(function () {
            // load table tengah setelah year options siap
            if (shipmentsData) {
              loadTableTengah(shipmentsData);
            } else {
              console.warn("Tidak ada data shipments.");
              $(".BigDataTableTengah tbody").append(
                '<tr><td colspan="10">No shipment data available</td></tr>',
              );
            }
            // Reset calc changes flag dan set initial load complete setelah semua data di-render
            setTimeout(function () {
              resetCalcChanges();
              isInitialLoadComplete = true;
            }, 100); // Delay kecil untuk memastikan semua rendering selesai
          })
          .catch(function (err) {
            console.error("Error loading shipment years:", err);
            // Tetap render table meski gagal load years
            if (shipmentsData) {
              loadTableTengah(shipmentsData);
              // disablePlanClosedElements() sekarang dipanggil di dalam loadTableTengah dengan delay yang tepat
            }
            // Reset juga di catch untuk consistency
            setTimeout(function () {
              resetCalcChanges();
              isInitialLoadComplete = true;
            }, 100);
          });

        window.tableTengahData = Array.isArray(response.shipments)
          ? response.shipments.map((d) => ({
              ...d,
              rowId: String(d.ShipmentID),
              ID: d.ID,
              batch: d.batch ?? d.Batch ?? null,
              vendor: d.vendor ?? d.Vendor ?? null,
              price: Number(d.price ?? d.Price ?? 0),
              qty: Number(d.qty ?? d.Qty ?? 0),
              shipmentDate: d.shipmentDate ?? d.ShipmentDate ?? null,
              vendorId:
                d.vendorId ?? d.VendorID ?? d.vendor ?? d.Vendor ?? null,
              unit: d.UnitName ?? d.unit ?? null,
              itemUnitId: d.ItemUnitID ?? d.itemUnitId ?? null,
            }))
          : [];

        for (let i = 0; i < window.tableTengahData.length; i++) {
          const row = window.tableTengahData[i];
          row.poDateEst = row.poDateEst || row.PODateEst || null;
          row.shipmentDate = row.shipmentDate || row.ShipmentDate || null;
        }

        const allIDs = response.details.map((item) => item.ID);
        arrdbtPurchasePlanDtl_ID = allIDs;
        //  Bangun window.allTableKananData langsung dari details
        window.allTableKananData = response.details.map((d) => ({
          Vendor: d.Vendor || d.vendor || null,
          Batch: d.Batch || d.batch || null,
          BlanketPODateEst: d.BlanketPODateEst || d.blanketPODateEst || null,
          ShipmentDate: d.ShipmentDate || d.shipmentDate || null,
          PurchasePlanDtlID: d.ID || d.PurchasePlanDtlID || null,
        }));

        //  Tambahkan shipmentDate ke data kiri dengan mencocokkan Vendor + Batch
        if (response.shipments && response.shipments.length > 0) {
          // Kelompokkan shipments berdasarkan vendor
          const shipmentsByVendor = {};
          response.shipments.forEach((s) => {
            const v = s.Vendor || s.vendor;
            if (!shipmentsByVendor[v]) shipmentsByVendor[v] = [];
            shipmentsByVendor[v].push(s);
          });

          // Urutkan shipment per vendor biar sesuai insert order
          Object.keys(shipmentsByVendor).forEach((v) => {
            shipmentsByVendor[v].sort(
              (a, b) => new Date(a.ShipmentDate) - new Date(b.ShipmentDate),
            );
          });

          // Counter posisi shipment per vendor
          const vendorIndex = {};

          window.allTableKananData.forEach((leftRow) => {
            const vendor = leftRow.Vendor;
            if (!shipmentsByVendor[vendor]) return;

            // Ambil shipment berdasarkan urutan kemunculan
            const idx = vendorIndex[vendor] || 0;
            const shipment = shipmentsByVendor[vendor][idx];

            if (shipment) {
              leftRow.ShipmentDate =
                shipment.ShipmentDate || shipment.shipmentDate || null;
            }

            // Geser index untuk vendor itu
            vendorIndex[vendor] = idx + 1;
          });
        }

        if (response.main_plan) {
          DocDate.val(response.main_plan.DocDate.substring(0, 10));
          ItemDescInput.val(response.main_plan.ItemDesc);
          ItemDescInput.text(response.main_plan.ItemDesc);
          loadPurchasePlanData(response.main_plan.ID);
        } else {
          DocDate.val("");
        }
      } else {
        console.error("Gagal memuat data:", response.message || response);
        console.log("Gagal memuat data dari server.");
      }
    },
    error: function (xhr, status, error) {
      console.error("AJAX error:", {
        status,
        error,
        response: xhr.responseText,
      });
      console.log("Terjadi kesalahan saat mengambil data dari server.");
    },
  });
}

function preloadAllPaymentData() {
  // console.log("Starting pre-load all payment data...");

  if (!window.kumpulanDataTableKiriKanan) {
    window.kumpulanDataTableKiriKanan = [];
  }

  // Cari semua rows di TABLE KIRI yang punya DtlID (data-real-dtl-id atau data-dtl-id)
  const dtlIdsToLoad = [];

  $(".BigDataTableKiri tbody tr").each(function () {
    const dtlId =
      $(this).attr("data-real-dtl-id") || $(this).attr("data-dtl-id");
    if (dtlId && dtlId > 0) {
      // Cek apakah sudah ada di dtlIdsToLoad
      if (!dtlIdsToLoad.includes(dtlId)) {
        dtlIdsToLoad.push(dtlId);
      }
    }
  });

  if (dtlIdsToLoad.length === 0) {
    console.log("No DtlIDs found to pre-load.");
    return;
  }

  if (!window.preloadedPaymentGroups) {
    window.preloadedPaymentGroups = [];
  }

  const loadPromises = dtlIdsToLoad.map((dtlId, index) => {
    return new Promise((resolve) => {
      // Ambil vendor, batch, shipmentDate dari row TABLE KIRI yang punya DtlID ini
      let rowInfo = null;
      $(".BigDataTableKiri tbody tr").each(function () {
        const rowDtlId =
          $(this).attr("data-real-dtl-id") || $(this).attr("data-dtl-id");
        if (String(rowDtlId) === String(dtlId) && !rowInfo) {
          const $row = $(this);
          rowInfo = {
            vendorId: $row.attr("data-vendor-id"),
            batch: $row.attr("data-batch"),
            shipmentDate: $row.attr("data-shipment-date"),
            blanketPODateEst: $row.attr("data-blanket-po-date-est") || "",
          };
        }
      });

      if (!rowInfo) {
        console.warn(`Could not find row info for DtlID ${dtlId}`);
        resolve(null);
        return;
      }

      // AJAX untuk ambil payment data
      $.ajax({
        url:
          BASE_URL +
          "scm/purchasing/purchase_plan_report/getPurchasePlanDtlPayment",
        type: "GET",
        data: { id: dtlId },
        dataType: "json",
        timeout: 5000,
        success: function (response) {
          if (
            response.status === "success" &&
            response.data &&
            response.data.length > 0
          ) {
            let groupObject = window.kumpulanDataTableKiriKanan.find(
              (g) => String(g.purchasePlanDtlId) === String(dtlId),
            );

            if (!groupObject) {
              const vendorDisplayName =
                arrVendor?.[rowInfo.vendorId] ||
                vendorMap?.[rowInfo.vendorId] ||
                `Vendor ${rowInfo.vendorId}`;

              let groupKey = generateShipmentGroupKey({
                vendorId: rowInfo.vendorId,
                batch: rowInfo.batch,
                shipmentDate: rowInfo.shipmentDate,
                blanketPODateEst: rowInfo.blanketPODateEst,
                purchasePlanDtlId: dtlId, // lowercase
                purchasePlanDtlID: dtlId,
              });

              // PENTING: rowId harus pakai format yang SAMA dengan uniqueRowId
              // yang dipakai tombol "View Details" (dtl-{vendorId}-{batch}
              // atau dtl-{vendorId}-{shipmentDate}), bukan dtl-{dtlId}.
              // Kalau beda format, refreshObjectTableKiri gagal nemuin row
              // ini pas user ngetik payment (rowId lookup mismatch), jadi
              // update total di tabel kiri gagal walau groupKey-nya sama.
              const preloadRowId =
                rowInfo.batch && rowInfo.batch !== "0"
                  ? `dtl-${rowInfo.vendorId}-${rowInfo.batch}`
                  : `dtl-${rowInfo.vendorId}-${rowInfo.shipmentDate}`;

              groupObject = {
                groupKey: groupKey,
                rowId: preloadRowId,
                tempRowId: `real-${dtlId}`,
                vendorId: Number(rowInfo.vendorId),
                vendorName: vendorDisplayName,
                batch: rowInfo.batch ? Number(rowInfo.batch) : null,
                blanketPODateEst: rowInfo.blanketPODateEst || null,
                shipmentDate: rowInfo.shipmentDate || null,
                purchasePlanDtlId: dtlId, // lowercase
                purchasePlanDtlID: dtlId,
                closed: 0,

                shipmentIds: [
                  ...new Set(
                    response.data.map((r) => r.ShipmentID).filter(Boolean),
                  ),
                ],
                paymentIds: response.data.map((r) => r.PaymentID || null),
                paymentDate: response.data.map((r) => r.PaymentDate || null),
                termDays: response.data.map((r) => r.Term || null),
                percent: response.data.map((r) => r.Percent || null),
                notes: response.data.map((r) => r.Notes || ""),
                formValue: response.data.map((r) => r.FromValue || ""),
                alert: response.data.map((r) => r.Alert || ""),
                OACredit: response.data.map((r) => r.OACredit || ""),
              };

              window.kumpulanDataTableKiriKanan.push(groupObject);
              window.preloadedPaymentGroups.push(groupObject);
            }
          } else {
            console.log(`No payment data for DtlID ${dtlId}`);
          }

          resolve(true);
        },
        error: function (xhr, status, error) {
          console.error(`  ❌ Error loading DtlID ${dtlId}:`, status, error);
          resolve(null);
        },
      });
    });
  });

  // Execute all promises in parallel
  Promise.all(loadPromises).then(() => {
    // console.log(
    //   ` Pre-load complete! Loaded ${window.kumpulanDataTableKiriKanan.length} payment groups`,
    // );
    // console.log(
    //   "kumpulanDataTableKiriKanan:",
    //   window.kumpulanDataTableKiriKanan,
    // );
    // console.log("preloadedPaymentGroups:", window.preloadedPaymentGroups);
  });
}

function refreshPurchasePlanDtlIDs(planId) {
  $.ajax({
    url:
      BASE_URL +
      "scm/purchasing/purchase_plan_report/getDetailIDs?id=" +
      planId,
    type: "GET",
    dataType: "json",
    success: function (response) {
      if (response.status === "success" && Array.isArray(response.details)) {
        arrdbtPurchasePlanDtl_ID = response.details.map((item) => item.ID);
        console.log(" ID diperbarui:", arrdbtPurchasePlanDtl_ID);
      } else {
        console.warn(" Tidak ada detail ditemukan");
      }
    },
  });
}

// tutup load all data dari id yang didapatkan dari url
function loadCurrencyWithDefault(defaultCurrID, defaultRate, docDate) {
  // console.log(
  //   " Memuat daftar currency, default:",
  //   defaultCurrID,
  //   "rate:",
  //   defaultRate,
  // );

  $.ajax({
    url:
      base_url + "purchasing/purchase_plan_report/getCurrencyList/" + docDate,
    type: "GET",
    dataType: "json",
    success: function (res) {
      // console.log(" Currency data loaded:", res);

      let $currency = $("#currency");
      $currency.empty();

      if (!res || res.length === 0) {
        console.warn(" Currency list kosong!");
        return;
      }

      $.each(res, function (i, item) {
        $currency.append(
          `<option value="${item.id}">${item.code}-${item.desc}</option>`,
        );
      });

      $currency.selectpicker("refresh");

      //  Pilih currency sesuai default dari dbtPurchasePlan
      if (defaultCurrID) {
        $currency.val(defaultCurrID).selectpicker("refresh");
        console.log(
          " Default currency set:",
          defaultCurrID,
          "rate:",
          defaultRate,
        );
        $("#rate").val(addDecimal(defaultRate));
      } else {
        console.log(" Tidak ada CurrID di purchase plan, fallback ke IDR.");
        let fallback = res.find((c) => c.code === "IDR") || res[0];
        $currency.val(fallback.id).selectpicker("refresh");
        getDataKurs(fallback.id, docDate);
      }
    },
    error: function (xhr) {
      console.error(" Error loading currency:", xhr.responseText);
    },
  });
}

// fungsi dynamic header table (WW)
function updateTableHeaders(selectedQuarter) {
  purchasePlanTableHeader.find("th[data-week-header]").remove();
  console.log("✓ Header updated - WW columns removed");
}
// tutup fungsi dynamic header table (WW)

// fungsi load table atas - OPTIMIZED
function loadPurchasePlanData(idHead) {
  purchasePlanTableBody.empty();
  let numCols = 6; // DocNumber, Vendor, ItemDesc, Color, Price, TotalQtyBLG

  purchasePlanTableBody.append(
    `<tr><td colspan="${numCols}">Loading data...</td></tr>`,
  );

  $.ajax({
    url:
      BASE_URL +
      "scm/purchasing/purchase_plan_report/get_purchase_plan_data_edit",
    type: "GET",
    dataType: "json",
    data: { purchasePlanID: idHead },
    success: function (response) {
      purchasePlanTableBody.empty();

      if (response.data && response.data.length > 0) {
        // OPTIMIZATION 1: Find min week in single pass
        let minWeekNumber = Infinity;
        response.data.forEach((rowData) => {
          if (rowData.weekly_data) {
            Object.keys(rowData.weekly_data).forEach((weekKey) => {
              const weekNumber = parseInt(weekKey.substring(2)); // faster than replace
              if (weekNumber < minWeekNumber) {
                minWeekNumber = weekNumber;
              }
            });
          }
        });

        // OPTIMIZATION 2: Detect quarter once
        let autoDetectedQuarter = "Q1";
        if (minWeekNumber !== Infinity) {
          for (let quarter in quarterWeeksMap) {
            if (
              minWeekNumber >= quarterWeeksMap[quarter].start &&
              minWeekNumber <= quarterWeeksMap[quarter].end
            ) {
              autoDetectedQuarter = quarter;
              break;
            }
          }
        }
        currentQuarterFilter = autoDetectedQuarter;

        updateTableHeaders(currentQuarterFilter);
        const { start: weekStart, end: weekEnd } =
          quarterWeeksMap[currentQuarterFilter];

        // OPTIMIZATION 3: Build HTML string all at once, then append once
        let htmlBuffer = "";

        response.data.forEach((rowData) => {
          const priceHeader = (parseFloat(rowData.Price) || 0).toLocaleString(
            "en-US",
            {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            },
          );

          // Build entire row as HTML string
          let rowHtml = `<tr data-row-id="${rowData.ID || 0}">`;
          rowHtml += `<td>${rowData.DocNumber || "N/A"}</td>`;
          rowHtml += `<td>${rowData.Vendor || "N/A"}</td>`;
          rowHtml += `<td>${rowData.ItemDesc || "N/A"}</td>`;
          rowHtml += `<td>${rowData.Color || ""}</td>`;
          rowHtml += `<td>${priceHeader}</td>`;
          rowHtml += `<td>${rowData.TotalQtyBLG || 0}</td>`;
          rowHtml += `</tr>`;
          htmlBuffer += rowHtml;
        });

        // OPTIMIZATION 4: Single DOM append instead of 50+ appends
        purchasePlanTableBody.html(htmlBuffer);

        $("#purchasePlanTable tbody")
          .off("click", "tr")
          .on("click", "tr", function () {
            const $clickedRow = $(this);

            // Get row data from response (use ID to match)
            const rowId = $clickedRow.data("row-id");
            const rowData = response.data.find((d) => d.ID == rowId);

            // Update selected styling
            $("#purchasePlanTable tbody tr").removeClass("selected-row");
            $clickedRow.addClass("selected-row");

            // Store selected row data
            selectedRowData = rowData || {};
          });
      } else {
        console.warn("Tidak ada data detail.");
        updateTableHeaders(currentQuarterFilter);
        let updatedNumCols = purchasePlanTableHeader.find("th").length;
        purchasePlanTableBody.append(
          `<tr><td colspan="${updatedNumCols}">Tidak ada data tersedia.</td></tr>`,
        );
      }
    },
    error: function (xhr, status, error) {
      console.error("Error loading detail data:", {
        status,
        error,
        response: xhr.responseText,
      });
      updateTableHeaders("Q1");
      let updatedNumCols = purchasePlanTableHeader.find("th").length;
      purchasePlanTableBody.append(
        `<tr><td colspan="${updatedNumCols}">Gagal memuat data.</td></tr>`,
      );
    },
  });
}
// tutup fungsi load table atas

let tableTengahEditData = [];

// fungsi load table tengah
function loadTableTengah(data) {
  var tbody = $(".BigDataTableTengah tbody");
  tbody.empty();

  tableTengahEditData = [];

  // Pre-load semua WW data untuk tahun-tahun yang ada di data
  const uniqueYears = [
    ...new Set(
      data
        .map((row) =>
          row.ShipmentDate ? getISOWeekYear(row.ShipmentDate) : null,
        )
        .filter((year) => year !== null && year !== ""),
    ),
  ];
  const wwLoadPromises = uniqueYears.map((year) => loadWWByYear(year));

  $.when
    .apply($, wwLoadPromises)
    .then(function () {
      renderTableTengahRows(data, tbody);
      setTimeout(function () {
        if (window.planClosed === true || window.hasPartialClosed === true) {
          disablePlanClosedElements();
        }
      }, 100);
    })
    .fail(function () {
      console.warn("Some WW data failed to load, rendering anyway");
      renderTableTengahRows(data, tbody);
      // Setelah render selesai, disable closed rows
      setTimeout(function () {
        if (window.planClosed === true || window.hasPartialClosed === true) {
          disablePlanClosedElements();
        }
      }, 100);
    });
}

function renderTableTengahRows(data, tbody) {
  // OPTIMIZATION: Konversi jQuery object ke DOM element jika diperlukan
  const tbodyElement = tbody instanceof jQuery ? tbody[0] : tbody;

  console.time("renderTableTengahRows");

  const allClosed =
    data.length > 0 &&
    data.every(
      (row) =>
        row.Closed == 1 ||
        row.Closed == "1" ||
        row.Closed == 2 ||
        row.Closed == "2",
    );
  const hasClosedRows = data.some(
    (row) =>
      row.Closed == 1 ||
      row.Closed == "1" ||
      row.Closed == 2 ||
      row.Closed == "2",
  );

  window.planClosed = allClosed;
  window.hasPartialClosed = hasClosedRows && !allClosed;

  // Sort data
  data.sort((a, b) => {
    const batchA = parseInt(a.Batch || a.batch || 0);
    const batchB = parseInt(b.Batch || b.batch || 0);
    if (batchA !== batchB) {
      return batchA - batchB;
    }
    const dateA = a.ShipmentDate || a.shipmentDate || "";
    const dateB = b.ShipmentDate || b.shipmentDate || "";
    return new Date(dateA) - new Date(dateB);
  });

  let TotalQtyTableTengah = 0;

  // OPTIMIZATION #1: Gunakan DocumentFragment untuk batch DOM insert
  const fragment = document.createDocumentFragment();

  // Array untuk menyimpan referensi select elements untuk batch init
  const selectsToInit = [];
  const wwSelectsToRender = [];

  // OPTIMIZATION #2: Build HTML sebagai string dulu (lebih cepat dari jQuery append loop)
  for (let i = 0; i < data.length; i++) {
    const isRowClosed =
      data[i].Closed == 1 ||
      data[i].Closed == "1" ||
      data[i].Closed == 2 ||
      data[i].Closed == "2";

    const shipmentDate = data[i].ShipmentDate;
    const shipmentYear = shipmentDate ? getISOWeekYear(shipmentDate) : "";

    // Create tr element
    const tr = document.createElement("tr");
    tr.setAttribute("data-shipment-id", data[i].ShipmentID || data[i].ID || 0);
    tr.setAttribute(
      "data-closed",
      isRowClosed
        ? data[i].Closed == 2 || data[i].Closed == "2"
          ? "2"
          : "1"
        : "0",
    );
    tr.setAttribute("data-blanket-id", data[i].BlanketID || null);
    tr.setAttribute("data-po-id", data[i].POID || null);
    tr.setAttribute("data-vendor-id", data[i].Vendor || "");
    tr.setAttribute("data-batch", data[i].Batch || "");

    // Build HTML untuk seluruh row
    tr.innerHTML = `
      <td>
        <input type="text" class="form-control form-control-sm" value="${i + 1}" style="text-align: center;" readonly>
      </td>
      <td class="item-code-col">
        <select class="form-control form-control-sm itemSelectColumn" style="width: 200px;"></select>
      </td>
      <td>
        <input type="text" class="form-control form-control-sm item-unit-field"  readonly>
        <input type="hidden" class="itemunitid" value="${data[i].ItemUnitID || 0}">
      </td>
      <td>
        <select class="form-control form-control-sm vendorSelectColumn"></select>
      </td>
      <td>
        <select class="form-control form-control-sm colorColumn" style="width: 100px;"></select>
      </td>
      <td>
        <select class="form-control form-control-sm shipment-year-field selectpicker" data-live-search="true"></select>
      </td>
      <td>
        <select class="form-control form-control-sm wwColumn"></select>
      </td>
      <td>
        <input type="date" class="form-control form-control-sm shipmentDateColumn" value="${data[i].ShipmentDate}" readonly>
      </td>
      <td>
        <input type="number" class="form-control form-control-sm qtyColumn text-right" value="${data[i].Qty}">
      </td>
      <td>
        <input type="text" class="form-control form-control-sm priceColumn text-right" value="${Number(
          data[i].Price,
        ).toLocaleString("en-EN", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}" data-value="${data[i].Price}">
      </td>
      <td>
        <input type="number" class="form-control form-control-sm TermDaysColumn" value="${data[i].Term}">
      </td>
      <td>
        <input type="date" class="form-control form-control-sm PODateEstColumn" value="${data[i].PODateEst}">
      </td>
      <td>
        <input type="number" class="form-control form-control-sm batchColumn" value="${data[i].Batch}">
      </td>
      <td class="column-action-icon">
        <i class="glyphicon glyphicon-trash remove-row-icon" style="cursor: pointer; color: black;"></i>
      </td>
    `;

    // Query selects di row ini
    const itemSelect = tr.querySelector(".itemSelectColumn");
    if (data[i].ItemID) {
      const text = [
        data[i].ItemCode,
        data[i].ItemDesc + " - " + data[i].ItemCode,
        data[i].UnitName,
      ]
        .filter(Boolean)
        .join(" - ");

      const option = new Option(text, data[i].ItemID, true, true);

      $(option).attr("data-itemunitid", data[i].ItemUnitID || 0);
      $(option).attr("data-unitname", data[i].UnitName || "");
      $(option).attr("data-code", data[i].ItemCode || "");

      $(itemSelect).append(option).trigger("change");

      // MANUAL SET (biar langsung muncul)
      const row = $(itemSelect).closest("tr");
      row.find(".item-unit-field").val(data[i].UnitName);
      row.find(".itemunitid").val(data[i].ItemUnitID);
    }
    $(itemSelect).select2({
      ajax: {
        url: BASE_URL + "scm/purchasing/purchase_plan_report/get_item_list",
        dataType: "json",
        delay: 300,
        data: function (params) {
          return {
            search: params.term,
          };
        },
        processResults: function (data) {
          return {
            results: data.map((item) => ({
              id: item.id,
              text: item.code + " - " + item.description,
              itemunitid: item.itemunitid,
              unitname: item.unitname,
              code: item.code,
            })),
          };
        },
      },
      templateSelection: function (data) {
        if (data.element) {
          $(data.element)
            .attr("data-itemunitid", data.itemunitid)
            .attr("data-unitname", data.unitname)
            .attr("data-code", data.code);
        }
        return data.text;
      },
      placeholder: "-- Pilih Item --",
      minimumInputLength: 1,
    });

    const vendorSelect = tr.querySelector(".vendorSelectColumn");
    const colorSelect = tr.querySelector(".colorColumn");
    const $yearSelect = $(tr.querySelector(".shipment-year-field"));
    const wwSelect = tr.querySelector(".wwColumn");
    const $wwSelect = $(wwSelect);

    colorSelect.innerHTML =
      colorOptionsHTML || '<option value="">No items available</option>';

    if (data[i].Vendor) {
      const vendorLabel = arrVendor[data[i].Vendor] || String(data[i].Vendor);
      const vendorOption = new Option(vendorLabel, data[i].Vendor, true, true);
      $(vendorSelect).append(vendorOption).trigger("change");
    }
    $(vendorSelect).select2({
      ajax: {
        url: BASE_URL + "scm/purchasing/purchase_order_plan/get_vendor_search",
        type: "POST",
        dataType: "json",
        delay: 300,
        data: function (params) {
          return {
            q: params.term || "",
            page: params.page || 1,
          };
        },
        processResults: function (data, params) {
          params.page = params.page || 1;
          return {
            results: data.results || [],
            pagination: data.pagination || { more: false },
          };
        },
      },
      placeholder: "-- Pilih Vendor --",
      minimumInputLength: 0,
    });

    // Set initial values
    itemSelect.value = data[i].ItemID;
    colorSelect.value = data[i].ItemID;

    // Render year dropdown
    renderYearDropdown($yearSelect, shipmentDate);

    // Kumpulkan untuk batch Select2 init (vendor punya select2 sendiri di atas)
    selectsToInit.push(colorSelect);
    selectsToInit.push($yearSelect[0]);

    // Simpan referensi WW untuk lazy render nanti
    wwSelectsToRender.push({
      element: wwSelect,
      $element: $wwSelect,
      year: shipmentYear,
      date: shipmentDate,
    });

    // Event listener untuk trash icon
    const trashIcon = tr.querySelector(".remove-row-icon");
    trashIcon.addEventListener("click", function () {
      tr.remove();
    });

    // Push data
    tableTengahEditData.push({
      rowId: data[i].ShipmentID || data[i].ID || "row-" + i,
      no: i + 1,
      itemCode: data[i].ItemID,
      unit: data[i].UnitName,
      vendor: data[i].Vendor,
      color: data[i].Color,
      shipmentDate: data[i].ShipmentDate,
      qty: data[i].Qty,
      price: data[i].Price,
      poDateEst: data[i].PODateEst,
      termDays: data[i].Term,
      batch: data[i].Batch,
      closed:
        data[i].Closed == 1 ||
        data[i].Closed == "1" ||
        data[i].Closed == 2 ||
        data[i].Closed == "2"
          ? parseInt(data[i].Closed)
          : 0,
    });

    ctrNoUrut = i + 1;
    TotalQtyTableTengah += data[i].Qty;

    fragment.appendChild(tr);
  }

  // OPTIMIZATION #3: Append semua rows SEKALI (bukan loop-by-loop)
  tbodyElement.appendChild(fragment);

  // OPTIMIZATION #4: Initialize Select2 BATCH (bukan per-row)
  console.log(
    "⏱️ Batch initializing Select2 for",
    selectsToInit.length,
    "elements",
  );
  $(selectsToInit).select2({
    placeholder: "-- Pilih --",
    minimumResultsForSearch: 1,
    width: "100%",
  });
  console.log("✓ Batch Select2 initialized");

  // Set initial values untuk selects
  for (let i = 0; i < data.length; i++) {
    const row = tbodyElement.children[i];
    const itemSelect = row.querySelector(".itemSelectColumn");
    const vendorSelect = row.querySelector(".vendorSelectColumn");
    const colorSelect = row.querySelector(".colorColumn");
    const $yearSelect = $(row.querySelector(".shipment-year-field"));

    if (data[i].ItemID) {
      $(itemSelect).val(String(data[i].ItemID)).trigger("change");
    }
    if (data[i].Vendor) {
      $(vendorSelect).val(String(data[i].Vendor)).trigger("change");
    }
    if (data[i].Color) {
      $(colorSelect).val(String(data[i].Color)).trigger("change");
    }

    const shipmentYear = wwSelectsToRender[i].year;
    if (shipmentYear) {
      $yearSelect.val(shipmentYear).trigger("change");
    }
  }

  // OPTIMIZATION #5: Lazy load WW dropdowns dengan batch rendering
  console.log(
    "⏱️ Starting lazy load for",
    wwSelectsToRender.length,
    "WW dropdowns",
  );
  renderWWDropdownsBatch(wwSelectsToRender);
  console.log("✓ WW lazy load initiated (non-blocking)");

  totalQtyTableTengah.val(TotalQtyTableTengah);
  totalQtyTableTengah.text(TotalQtyTableTengah);
  // pengambilanDataTableTengah();

  console.timeEnd("renderTableTengahRows");
  console.log("✓ renderTableTengahRows completed with", data.length, "rows");
}

// Helper function untuk rendering WW dropdowns secara batch + lazy
function renderWWDropdownsBatch(wwSelectsToRender) {
  if (!wwSelectsToRender || wwSelectsToRender.length === 0) return;

  // OPTIMIZATION: Group by year untuk avoid duplicate loadWWByYear calls
  const byYear = {};
  wwSelectsToRender.forEach((item, index) => {
    if (item.year) {
      if (!byYear[item.year]) {
        byYear[item.year] = [];
      }
      byYear[item.year].push({ ...item, index });
    } else {
      // No year, init empty select2
      item.$element.html('<option value="">-- Pilih WW --</option>').select2({
        placeholder: "-- Pilih WW --",
        minimumResultsForSearch: 1,
        width: "100%",
      });
    }
  });

  // Render WW untuk setiap year group
  Object.keys(byYear).forEach((year, groupIndex) => {
    const items = byYear[year];

    // Lazy load dengan stagger untuk avoid UI blocking
    setTimeout(() => {
      loadWWByYear(year).done(function () {
        items.forEach((item) => {
          if (wwOptionsHTMLByYear[year]) {
            const shipmentWW = getWWFromShipmentDate(item.date);

            item.$element.html(wwOptionsHTMLByYear[year]);

            // Add WW jika tidak ada di option
            if (
              shipmentWW &&
              item.$element.find(`option[value="${shipmentWW}"]`).length === 0
            ) {
              item.$element.append(
                `<option value="${shipmentWW}">${shipmentWW}</option>`,
              );
            }

            // Set value SEBELUM init Select2
            if (shipmentWW) {
              item.$element.val(shipmentWW);
            }

            // Init Select2
            if (item.$element.data("select2")) {
              item.$element.select2("destroy");
            }
            item.$element.select2({
              placeholder: "-- Pilih WW --",
              minimumResultsForSearch: 1,
              width: "100%",
            });

            // Trigger change
            if (shipmentWW) {
              item.$element.trigger("change");
            }
          }
        });
      });
    }, groupIndex * 50); // Stagger 50ms untuk setiap year group
  });
}

// tutup fungsi renderTableTengahRows

let totalTableKiri = 0;
let arrIDVendorTableKiri = [];
function parseMoney(value) {
  if (value === null || value === undefined) return 0;
  let s = String(value).trim();
  if (s === "") return 0;

  s = s.replace(/[^0-9,.\-]/g, "");

  const hasDot = s.indexOf(".") !== -1;
  const hasComma = s.indexOf(",") !== -1;

  if (hasDot && hasComma) {
    // Keduanya ada -> asumsikan separator terakhir adalah decimal
    if (s.lastIndexOf(".") > s.lastIndexOf(",")) {
      // dot adalah decimal -> hapus semua koma (thousand sep)
      s = s.replace(/,/g, "");
    } else {
      // comma adalah decimal -> hapus titik ribuan, ubah koma jadi titik
      s = s.replace(/\./g, "").replace(/,/g, ".");
    }
  } else if (hasComma && !hasDot) {
    // hanya koma -> kemungkinan decimal
    s = s.replace(/,/g, ".");
  } else {
    // hanya dot atau tidak sama sekali -> hapus koma (safetynet)
    s = s.replace(/,/g, "");
  }

  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}
// Function untuk menandai ada perubahan
function markAsChanged() {
  hasUnsavedChanges = true;
  // console.log(" Unsaved changes detected");
}
$(document).on("change", ".blanketPODateEstInput", function () {
  const $input = $(this);

  const originalDate = $input.attr("data-original");
  const selectedDate = $input.val();

  if (!originalDate || !selectedDate) return;

  const original = new Date(originalDate);
  const selected = new Date(selectedDate);

  //  TIDAK BOLEH LEBIH BESAR DARI ORIGINAL
  if (selected > original) {
    alert("Date cannot be later than previous date (" + originalDate + ")");

    //  Kembalikan ke tanggal awal
    $input.val(originalDate);
  }
});

// Function untuk reset tracking
function resetChangeTracking() {
  hasUnsavedChanges = false;
  // console.log(" Change tracking reset");
}

// Tambahkan event listener untuk mendeteksi perubahan di table kanan
$(document).on(
  "input change",
  "#tableKanan input, #tableKanan select, #tableKanan textarea",
  function () {
    markAsChanged();
  },
);
function fetchDtlIdFromDB(planId, vendor, batch) {
  // console.log(
  //   ` fetchDtlIdFromDB called: plan=${planId}, vendor=${vendor}, batch=${batch}`,
  // );

  // Return Promise yang properly resolve dengan data, bukan jQuery XHR object
  return new Promise((resolve, reject) => {
    $.ajax({
      url: BASE_URL + "scm/purchasing/purchase_plan_report/get_dtl_id",
      type: "GET",
      data: {
        plan: planId,
        vendor: vendor,
        batch: batch,
      },
      dataType: "json",
      success: function (response) {
        if (response && typeof response === "object") {
          // Jika response adalah { ID: xxx }, langsung resolve
          if (response.ID && response.ID > 0) {
            resolve(response);
          }
          // Jika response adalah { data: { ID: xxx } }, unwrap dulu
          else if (response.data && response.data.ID && response.data.ID > 0) {
            resolve(response.data);
          }
          // Jika kosong, resolve dengan empty object (akan ditangani di fallback)
          else {
            console.warn(` DB response kosong atau tidak valid:`, response);
            resolve({});
          }
        } else {
          resolve({});
        }
      },
      error: function (xhr, status, error) {
        console.error(
          ` fetchDtlIdFromDB error - Status: ${status}, Error: ${error}`,
          xhr,
        );
        // Reject agar bisa ditangani oleh catch, atau resolve dengan empty object agar fallback berjalan
        resolve({}); // ← Biar fallback layer berjalan, jangan reject
      },
    });
  });
}

async function rebuildTableKiri(dataUntukTableKiri) {
  if (typeof window.vendorBatchToIdMap === "object") {
    const keysToDelete = [];
    Object.keys(window.vendorBatchToIdMap).forEach((key) => {
      if (!key.startsWith("dtl-") && !window.vendorBatchToIdMap[key]) {
        keysToDelete.push(key);
      }
    });

    keysToDelete.forEach((key) => {
      delete window.vendorBatchToIdMap[key];
    });
  }

  if (!dataUntukTableKiri || dataUntukTableKiri.length === 0) {
    console.warn(
      "Data kosong, gunakan data terakhir agar tabel kiri tidak hilang.",
    );
    if (lastValidTableKiriData && lastValidTableKiriData.length > 0) {
      dataUntukTableKiri = lastValidTableKiriData;
    } else {
      $(".tbodyTotalTableKiri").text("0.00");
      return;
    }
  } else {
    lastValidTableKiriData = dataUntukTableKiri;
  }

  const $tableKiriBody = $(".BigDataTableKiri tbody").empty();
  totalTableKiri = 0;
  arrIDVendorTableKiri = [];
  aggregatedSummary = {};

  if (typeof vendorBatchToIdMap === "undefined") {
    window.vendorBatchToIdMap = {};
  }

  if (dataUntukTableKiri.length === 0) {
    console.warn("No data to display");
    $(".tbodyTotalTableKiri").text("0.00");
    return;
  }

  let oldDtlIdMapping = {};
  const $oldRows = $(".BigDataTableKiri tbody tr");
  if ($oldRows.length > 0) {
    $oldRows.each(function () {
      const tempRowId = $(this).attr("data-temp-rowid");
      const dtlId = $(this).attr("data-dtl-id");
      const realDtlId = $(this).attr("data-real-dtl-id");

      if (tempRowId && (dtlId || realDtlId)) {
        oldDtlIdMapping[tempRowId] = dtlId || realDtlId;
      }
    });
  }

  let mapDtlIdByVendorBatch = {};
  // console.log(
  //   " window.allTableKananData saat build map:",
  //   window.allTableKananData,
  // );

  if (Array.isArray(window.allTableKananData)) {
    window.allTableKananData.forEach((row) => {
      const vendorId = String(row.Vendor);
      const batch = row.Batch ? String(row.Batch).trim() : null;
      const shipmentDate =
        row.ShipmentDate &&
        row.ShipmentDate !== "null" &&
        row.ShipmentDate !== ""
          ? String(row.ShipmentDate).trim()
          : "null";
      const blanketPODateEst =
        row.BlanketPODateEst && row.BlanketPODateEst !== "null";
      const dtlId = row.PurchasePlanDtlID || null;

      //  FIX: Gunakan PurchasePlanDtlID sebagai primary key untuk data dari DB
      let key;
      if (dtlId && dtlId > 0) {
        // Data dari DB - gunakan DtlID sebagai key utama (tidak berubah saat vendor/batch dirubah)
        key = `dtl-${dtlId}`;
      } else {
        // Data baru - gunakan vendor-batch/vendor-date sebagai key fallback
        key =
          batch && batch !== "0"
            ? `${vendorId}-batch-${batch}`
            : `${vendorId}-date-${shipmentDate}`;
      }

      if (!mapDtlIdByVendorBatch[key]) {
        mapDtlIdByVendorBatch[key] = [];
      }
      mapDtlIdByVendorBatch[key].push(dtlId);
    });
  }

  // console.log("Mapping dari tabel kanan:", mapDtlIdByVendorBatch);

  function getDtlIdWithFallback(vendorId, batch, shipmentDate) {
    let key;
    if (batch && batch !== "0") {
      key = `${vendorId}-batch-${batch}`;
    } else if (shipmentDate) {
      key = `${vendorId}-date-${shipmentDate}`;
    } else {
      key = `${vendorId}-date-null`;
    }

    let found = mapDtlIdByVendorBatch[key];

    if (Array.isArray(found)) {
      found = found[0];
    }

    if (!found && !shipmentDate) {
      const fallbackKey = `${vendorId}-date-null`;
      const fallback = mapDtlIdByVendorBatch[fallbackKey];
      if (Array.isArray(fallback)) {
        found = fallback[0];
      } else if (fallback) {
        found = fallback;
      }
    }

    return found;
  }

  const fragment = document.createDocumentFragment();

  for (const dataRow of dataUntukTableKiri) {
    const vendorId = String(dataRow.Vendor);
    const batch = dataRow.Batch ? String(dataRow.Batch).trim() : null;
    const shipmentDate = dataRow.ShipmentDate
      ? String(dataRow.ShipmentDate).trim()
      : null;
    const blanketPODateEst = dataRow.BlanketPODateEst
      ? String(dataRow.BlanketPODateEst).trim()
      : null;
    const total = dataRow.Total || 0;

    let key;

    if (dataRow._finalKey) {
      key = dataRow._finalKey;
    } else if (dataRow.PurchasePlanDtlID && dataRow.PurchasePlanDtlID > 0) {
      key = `dtl-${dataRow.PurchasePlanDtlID}`;
    } else {
      key =
        batch && batch !== "0"
          ? `${vendorId}-batch-${batch}`
          : `${vendorId}-date-${shipmentDate}`;
    }
    const displayBatch =
      batch && batch !== "0"
        ? batch
        : `${formatDateToDisplay(shipmentDate) || "N/A"}`;

    totalTableKiri += total;
    if (!arrIDVendorTableKiri.includes(vendorId))
      arrIDVendorTableKiri.push(vendorId);

    if (!aggregatedSummary[vendorId]) aggregatedSummary[vendorId] = {};
    const summaryKey = batch && batch !== "0" ? batch : shipmentDate;
    aggregatedSummary[vendorId][summaryKey] = {
      total: total,
      isBatch: !!(batch && batch !== "0"),
      blanketPODateEst: blanketPODateEst,
      shipmentDate: shipmentDate,
    };

    let realDtlId = null;

    if (
      window.kumpulanDataTableKiriKanan &&
      Array.isArray(window.kumpulanDataTableKiriKanan)
    ) {
      const foundInCache = window.kumpulanDataTableKiriKanan.find((g) => {
        const matchVendor = String(g.vendorId) === String(vendorId);
        const matchBatch = String(g.batch) === String(batch);
        const hasDtlId = g.purchasePlanDtlId || g.purchasePlanDtlID;

        return matchVendor && matchBatch && hasDtlId;
      });

      if (
        foundInCache &&
        (foundInCache.purchasePlanDtlId || foundInCache.purchasePlanDtlID)
      ) {
        realDtlId =
          foundInCache.purchasePlanDtlId || foundInCache.purchasePlanDtlID;
      } else {
        // console.log(`  [Layer 0.5] NOT FOUND in cache`);
      }
    } else {
      // console.log(
      //   `  [Layer 0.5] kumpulanDataTableKiriKanan is empty or not array`,
      // );
    }

    //  FALLBACK SEBELUM SKIP LAYER 0: Coba cari di allTableKananData langsung
    if (!realDtlId && vendorId && batch) {
      const foundInDB = window.allTableKananData?.find(
        (d) =>
          String(d.Vendor) === String(vendorId) &&
          String(d.Batch) === String(batch),
      );
      if (foundInDB && foundInDB.PurchasePlanDtlID) {
        realDtlId = foundInDB.PurchasePlanDtlID;
        // console.log(
        //   `  Layer 0.5.5 (allTableKananData direct lookup) - FOUND: vendor=${vendorId}, batch=${batch} → DTL ID = ${realDtlId}`,
        // );
      }
    }

    const planId = dbtPurchasePlan_ID || getPurchasePlanIdFromURL();

    let dtlIdFromDataRow = realDtlId || dataRow.PurchasePlanDtlID;
    const dtlIdExistsInDB =
      dtlIdFromDataRow &&
      dtlIdFromDataRow > 0 &&
      Array.isArray(window.allTableKananData) &&
      window.allTableKananData.some(
        (d) => d.PurchasePlanDtlID == dtlIdFromDataRow,
      );

    const isNewBatch =
      !dtlIdFromDataRow || dtlIdFromDataRow <= 0 || !dtlIdExistsInDB;

    // console.log(` Batch Detection for ${key}:`, {
    //   vendor: vendorId,
    //   batch: batch,
    //   hasDtlId: dataRow.PurchasePlanDtlID,
    //   dtlIdFromCache: realDtlId || null,
    //   dtlIdFromDataRow: dtlIdFromDataRow,
    //   dtlIdExistsInDB: dtlIdExistsInDB,
    //   isNewBatch: isNewBatch,
    // });

    if (!isNewBatch && !realDtlId) {
      try {
        const dbResponse = await fetchDtlIdFromDB(planId, vendorId, batch);

        if (dbResponse && dbResponse.ID && parseInt(dbResponse.ID) > 0) {
          realDtlId = parseInt(dbResponse.ID);
        } else {
          // console.log(
          //   ` Layer 0 (DB) - NOT FOUND: ${key} (status: ${dbResponse?.status || "unknown"})`,
          // );
        }
      } catch (err) {
        console.warn(` Layer 0 (DB) error: ${err.message}`);
      }
    } else if (realDtlId) {
      // console.log(
      //   ` Layer 0 (DB) - SKIPPED: DTL ID sudah ditemukan di cache (${realDtlId})`,
      // );
    } else {
      // console.log(
      //   ` Layer 0 (DB) - SKIPPED: Ini batch BARU, tidak fetch DB untuk ${key}`,
      // );
    }

    //  PERBAIKAN: Layer 1 - Baru cek fallback JIKA DB tidak ada
    if (!realDtlId || realDtlId === 0) {
      if (false && dataRow.PurchasePlanDtlID && dataRow.PurchasePlanDtlID > 0) {
        realDtlId = dataRow.PurchasePlanDtlID;
      }

      // Layer 3: Dari vendorBatchToIdMap - STRICT MATCH KEY
      if (!realDtlId && window.vendorBatchToIdMap && vendorBatchToIdMap[key]) {
        // PENTING: Hanya ambil jika key PERSIS sama, tidak boleh ambil dari key lain
        const exactMatch = vendorBatchToIdMap[key];
        if (exactMatch && exactMatch > 0) {
          realDtlId = exactMatch;
        }
      }

      if (false && !realDtlId && Array.isArray(window.allTableKananData)) {
        const matched = window.allTableKananData.find(
          (d) =>
            String(d.Vendor) === vendorId &&
            (d.Batch ? String(d.Batch).trim() : "0") === (batch || "0") &&
            String(d.ShipmentDate || "").trim() ===
              String(shipmentDate || "").trim(),
        );
        if (matched?.PurchasePlanDtlID) {
          realDtlId = matched.PurchasePlanDtlID;
        }
      }
      if (false && !realDtlId) {
        const possibleOldTempRowIds = Object.keys(oldDtlIdMapping).filter(
          (oldTempId) => {
            return (
              oldTempId.includes(key) ||
              oldTempId === `real-${realDtlId}` ||
              oldTempId === `temp-${key}`
            );
          },
        );

        if (possibleOldTempRowIds.length > 0) {
          realDtlId = oldDtlIdMapping[possibleOldTempRowIds[0]];
        }
      }

      if (false && !realDtlId && Array.isArray(window.lastValidTableKiriData)) {
        // Try to find by vendor + shipmentDate
        const recoveredRow = window.lastValidTableKiriData.find((d) => {
          const dVendor = String(d.Vendor);
          const dShipmentDate = d.ShipmentDate
            ? String(d.ShipmentDate).trim()
            : null;
          return dVendor === vendorId && dShipmentDate === shipmentDate;
        });

        if (
          recoveredRow &&
          recoveredRow.PurchasePlanDtlID &&
          recoveredRow.PurchasePlanDtlID > 0
        ) {
          realDtlId = recoveredRow.PurchasePlanDtlID;
        }
      }
    }

    // Generate tempRowId
    let tempRowId = realDtlId ? "real-" + realDtlId : "temp-" + key;

    if (realDtlId && realDtlId > 0) {
      const dtlKey = `dtl-${realDtlId}`;
      // Only add if not already present
      if (!vendorBatchToIdMap[dtlKey]) {
        vendorBatchToIdMap[dtlKey] = realDtlId;
        // console.log(`Update map (DTL-based): ${dtlKey} = ${realDtlId}`);
      }
    }
    let finalDtlIdForButton = realDtlId || null;
    globalFinalDtlIdMap[key] = finalDtlIdForButton;

    // Tentukan apakah semua item untuk vendor+batch ini closed (1 = Blanket, 2 = PO)
    const isAllClosed =
      dataRow.TotalItems > 0 && dataRow.ClosedCount === dataRow.TotalItems;

    // Cek nilai Closed tertinggi untuk row ini (prioritaskan 2 jika ada)
    const closedValue = isAllClosed ? String(dataRow.MaxClosed || 1) : "0";

    let uniqueRowId;
    if (realDtlId && realDtlId > 0) {
      // Format: dtl-vendor-batch (includes batch context for uniqueness)
      uniqueRowId =
        batch && batch !== "0"
          ? `dtl-${vendorId}-${batch}`
          : `dtl-${vendorId}-${shipmentDate}`;
    } else {
      // For new batch without DtlID, use vendor-batch format
      uniqueRowId =
        batch && batch !== "0"
          ? `new-${vendorId}-${batch}`
          : `new-${vendorId}-${shipmentDate}`;
    }

    // console.log(
    //   `Row ID format: ${uniqueRowId} (key: ${key}, dtlId: ${finalDtlIdForButton})`,
    // );

    const row = $("<tr></tr>")
      .attr("data-rowid", uniqueRowId)
      .attr("data-temp-rowid", tempRowId)
      .attr("data-dtl-id", realDtlId || 0)
      .attr("data-real-dtl-id", finalDtlIdForButton || "")
      .attr("data-closed", closedValue)
      .attr("data-vendor-id", vendorId)
      .attr("data-batch", batch && batch !== "0" ? batch : "");

    const vendorName =
      (typeof arrVendor !== "undefined" && arrVendor[vendorId]) ||
      (typeof vendorMap !== "undefined" && vendorMap[vendorId]) ||
      vendorId;

    row.append(
      $("<td></td>").text(vendorName).attr("data-vendor-id", vendorId),
    );
    row.append(
      $("<td></td>")
        .text(
          batch && batch !== "0" ? `Batch ${displayBatch}` : shipmentDate || "",
        )
        .attr("data-batch", batch && batch !== "0" ? batch : "")
        .attr("data-shipment-date", shipmentDate || "")
        .attr("data-is-batch", batch && batch !== "0" ? "true" : "false"),
    );
    row.append(
      $("<td></td>")
        .css("text-align", "center")
        .append(
          $("<input>", {
            type: "date",
            class: "blanket-est-input",
            value: blanketPODateEst || "",
          })
            .attr("data-original", blanketPODateEst || "")
            .attr("data-blanket-po-date-est", blanketPODateEst || ""),
        ),
    );

    row.append(
      $("<td></td>")
        .addClass("totalAmountCell")
        .css("text-align", "right")
        .text(
          total.toLocaleString("en-EN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          }),
        ),
    );

    const viewButton = $("<button></button>")
      .addClass("btn btn-info btn-xs view-summary-details-btn")
      .text("View Details")
      .attr("data-vendorid", vendorId)
      .attr("data-vendorname", vendorName)
      .attr("data-batch", batch && batch !== "0" ? batch : "")
      .attr("data-shipment-date", shipmentDate || "")
      .attr("data-blanket-po-date-est", blanketPODateEst || "")
      .attr("data-is-batch", batch && batch !== "0" ? "true" : "false")
      .attr("data-rowid", uniqueRowId)
      .attr("data-temp-rowid", tempRowId)
      .attr("data-real-dtl-id", finalDtlIdForButton); //  NOW VALID

    const blanketButton = $("<button></button>")
      .addClass("btn btn-warning btn-xs go-to-blanket-btn")
      .text("Blanket PO")
      .attr("data-vendorid", vendorId)
      .attr("data-batch", batch && batch !== "0" ? batch : "")
      .attr("data-real-dtl-id", finalDtlIdForButton)
      .css("margin-left", "5px")
      .on("click", function () {
        const $btn = $(this);
        const dtlId = $btn.attr("data-real-dtl-id");
        const vId = $btn.attr("data-vendorid");
        const batchNum = $btn.attr("data-batch");

        // Validasi: Cek apakah data table tengah memiliki ItemID
        let hasValidItem = false;
        let dataSource =
          tableTengahEditData && tableTengahEditData.length > 0
            ? tableTengahEditData
            : tableTengahData;

        if (dataSource && dataSource.length > 0) {
          // Filter data berdasarkan vendorId dan batch (handle both lowercase and uppercase property names)
          const relatedRows = dataSource.filter((row) => {
            const rowVendorId = String(
              row.vendor || row.Vendor || row.vendorId || "",
            );
            const rowBatch = String(row.batch || row.Batch || "0").trim();
            const matchVendor = rowVendorId === String(vId);
            const matchBatch = batchNum ? rowBatch === String(batchNum) : true;

            return matchVendor && matchBatch;
          });

          hasValidItem =
            relatedRows.length > 0 &&
            relatedRows.every((row) => {
              const itemId =
                row.itemCode ||
                row.ItemCode ||
                row.ItemID ||
                row.itemId ||
                row.Item ||
                0;
              const itemUnitId =
                row.itemUnitId || row.ItemUnitID || row.ItemUnitId || 0;
              // Konversi ke number dan cek > 0
              const hasItemId = parseInt(itemId) > 0;
              const hasItemUnitId = parseInt(itemUnitId) > 0;

              return hasItemId || hasItemUnitId;
            });
        }

        if (!hasValidItem) {
          alert(
            "Cannot found Blanket PO!\n\nmake sure all data from middle table for this vendor already have itemcode.",
          );
          return;
        }

        // Confirm dialog sebelum save dan redirect
        const confirmResult = confirm(
          "Data will be save before open Blanket PO.\n\nProcceed?",
        );

        if (!confirmResult) {
          return;
        }

        // Disable button selama proses
        $btn.prop("disabled", true).text("Saving...");

        // Auto generate calc jika belum diklik calculatePayment
        if (
          !isCalculatePaymentClicked &&
          kumpulanDataTableKiriKanan &&
          kumpulanDataTableKiriKanan.length > 0
        ) {
          kumpulanDataTableKiriKanan.forEach((row) => {
            const rowId = row.tempRowId || row.rowId;
            if (rowId) {
              generateTableCalculasi(rowId);
            }
          });
          isCalculatePaymentClicked = true;
        }

        // Panggil executeSaveProcess tanpa modal, lalu redirect
        window
          .executeSaveProcess({ showModal: false })
          .then((result) => {
            // Build URL dengan parameter jika diperlukan
            let url = BASE_URL + "scm/purchasing/blanket_purchase_order";

            // Tambahkan parameter jika ada
            const params = [];
            if (dtlId) params.push("dtl_id=" + dtlId);
            if (vId) params.push("vendor_id=" + vId);
            if (batchNum) params.push("batch=" + batchNum);
            // Tambahkan doc_id dari hasil save untuk matching yang lebih spesifik
            if (result.docId) params.push("doc_id=" + result.docId);

            if (params.length > 0) {
              url += "?" + params.join("&");
            }

            // Enable button kembali
            $btn.prop("disabled", false).text("Blanket PO");

            // Redirect ke halaman Blanket PO
            window.open(url, "_blank");
          })
          .catch((error) => {
            $btn.prop("disabled", false).text("Blanket PO");
            // Error sudah ditampilkan di executeSaveProcess
          });
      });

    // Disable Blanket PO button jika row closed
    if (isAllClosed) {
      blanketButton
        .prop("disabled", true)
        .css("opacity", "0.5")
        .css("cursor", "not-allowed")
        .attr("title", "Shipment sudah closed");
      row.addClass("row-closed").css("background-color", "#f5f5f5");
    }

    row.append(
      $("<td></td>").addClass("column-action-button").append(viewButton),
    );
    row.append(
      $("<td></td>").addClass("column-blanket-button").append(blanketButton),
    );
    // OPTIMIZATION: Append to fragment instead of directly to DOM
    fragment.appendChild(row[0]);
  } //

  // OPTIMIZATION: Append all rows at once (single reflow)
  $tableKiriBody[0].appendChild(fragment);

  // console.log("aggregatedSummary built:", aggregatedSummary);
  // console.log("vendorBatchToIdMap built:", vendorBatchToIdMap);
  // console.log("Final oldDtlIdMapping preserved:", oldDtlIdMapping);

  const formattedTotal = totalTableKiri.toLocaleString("en-EN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  $(".tbodyTotalTableKiri").text(formattedTotal);

  if (typeof preloadAllPaymentData === "function") {
    setTimeout(() => {
      preloadAllPaymentData();
    }, 100); // Delay 100ms untuk memastikan DOM sudah update
  }
}
function formatDateToDisplay(dateString) {
  if (!dateString) return ""; // kalau null/undefined, balikin string kosong
  const parts = dateString.split("-");
  if (parts.length !== 3) return dateString; // kalau formatnya bukan yyyy-mm-dd
  return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
}

function populateBatchForVendorFromData($row, vendorId) {
  const $batchSelect = $row.find(".batchSelector");
  $batchSelect.empty();

  if (!aggregatedSummary || !aggregatedSummary[vendorId]) {
    $batchSelect.append($("<option></option>").val("").text("No Batch"));
    $row.find(".totalAmountCell").text("0.00");
    return;
  }

  const batchesForVendor = aggregatedSummary[vendorId];
  const batchList = Object.keys(batchesForVendor);

  batchList.forEach((batch) => {
    $batchSelect.append(
      $("<option></option>").val(batch).text(`Batch ${batch}`),
    );
  });

  //  gunakan batch terakhir jika ada
  let selectedBatch = batchList[0];
  if (lastSelectedBatchByVendor && lastSelectedBatchByVendor[vendorId]) {
    if (batchList.includes(lastSelectedBatchByVendor[vendorId])) {
      selectedBatch = lastSelectedBatchByVendor[vendorId];
    }
  }

  $batchSelect.val(selectedBatch);

  //  simpan batch yg dipilih
  if (!lastSelectedBatchByVendor) lastSelectedBatchByVendor = {};
  lastSelectedBatchByVendor[vendorId] = selectedBatch;

  // Update total & button
  const total = batchesForVendor[selectedBatch] || 0;
  const formattedTotal = total.toLocaleString("en-EN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  $row.find(".totalAmountCell").text(formattedTotal);

  const newRowId = `${vendorId}-${selectedBatch}`;
  const vendorName = arrVendor?.[vendorId] || vendorMap?.[vendorId] || vendorId;

  $row.attr("data-rowid", newRowId);
  $row
    .find(".view-summary-details-btn")
    .attr("data-vendorid", vendorId)
    .attr("data-vendorname", vendorName)
    .attr("data-batch", selectedBatch)
    .attr("data-rowid", newRowId);

  lastSelectedRowId = newRowId;
}

function autoRecalculateTableKiri() {
  if (typeof window.vendorBatchToIdMap === "undefined") {
    window.vendorBatchToIdMap = {};
  }

  const cleanedMap = {};
  Object.keys(window.vendorBatchToIdMap).forEach((key) => {
    if (key.startsWith("dtl-")) {
      // Preserve dtl-based keys saja
      cleanedMap[key] = window.vendorBatchToIdMap[key];
      // console.log(
      //   `  Preserved dtl-key: ${key} = ${window.vendorBatchToIdMap[key]}`,
      // );
    } else {
      // console.log(
      //   `  REMOVED vendor-batch key: ${key} = ${window.vendorBatchToIdMap[key]}`,
      // );
    }
  });
  window.vendorBatchToIdMap = cleanedMap;

  const oldVendorBatchToIdMap = window.vendorBatchToIdMap;

  arrIDVendorTableKiri = [];
  let rawDataTengah = [];

  // Ambil data dari tabel tengah
  $(".BigDataTableTengah tbody tr").each(function (index) {
    let $row = $(this);
    let rowData = {};

    rowData.ItemID = $row.find(".itemSelectColumn").val();
    rowData.Vendor = $row.find(".vendorSelectColumn").val();
    rowData.ShipmentDate = $row.find(".shipmentDateColumn").val();

    let qtyValue = $row.find(".qtyColumn").val();
    rowData.Qty = parseInt(qtyValue) || 0;

    rowData.Batch = $row.find(".batchColumn").val();

    let priceInput = $row.find(".priceColumn");
    let priceRaw =
      (priceInput.is("input,textarea") ? priceInput.val() : "") ||
      priceInput.attr("data-value") ||
      "0";

    rowData.Price = parseMoney(priceRaw);
    rowData.PurchasePlanID =
      typeof dbtPurchasePlan_ID !== "undefined" ? dbtPurchasePlan_ID : null;

    // Ambil PO Date Est
    rowData.PODateEst = $row.find(".PODateEstColumn").val() || null;

    //  FIX: Read DtlID from table row attribute if it exists (CRUCIAL for ID preservation)
    const dtlIdFromAttr =
      $row.attr("data-dtl-id") || $row.attr("data-purchaseplan-dtl-id");
    if (dtlIdFromAttr && dtlIdFromAttr > 0) {
      rowData.PurchasePlanDtlID = parseInt(dtlIdFromAttr);
      // console.log(
      //   `Row ${index}: Found DtlID from attribute: ${rowData.PurchasePlanDtlID}`,
      // );
    } else {
      //  FIX: If not found in attribute, look it up from previous valid data
      const vendor = String(rowData.Vendor);
      const batch = rowData.Batch ? String(rowData.Batch).trim() : null;
      const shipmentDate = rowData.ShipmentDate
        ? String(rowData.ShipmentDate).trim()
        : null;

      // Search in lastValidTableKiriData (previous recalculation state)
      if (Array.isArray(window.lastValidTableKiriData)) {
        let prevRow = window.lastValidTableKiriData.find((d) => {
          const dVendor = String(d.Vendor);
          const dBatch = d.Batch ? String(d.Batch).trim() : null;
          const dShipmentDate = d.ShipmentDate
            ? String(d.ShipmentDate).trim()
            : null;

          // EXACT MATCH: vendor + batch + shipmentDate
          return (
            dVendor === vendor &&
            dBatch === batch &&
            dShipmentDate === shipmentDate
          );
        });

        if (
          prevRow &&
          prevRow.PurchasePlanDtlID &&
          prevRow.PurchasePlanDtlID > 0
        ) {
          rowData.PurchasePlanDtlID = prevRow.PurchasePlanDtlID;
          // console.log(
          //   `Row ${index}: Recovered DtlID from lastValidTableKiriData: ${rowData.PurchasePlanDtlID} (Vendor=${vendor}, Batch=${batch})`,
          // );
        } else {
          // console.log(
          //   `Row ${index}: NO MATCH in lastValidTableKiriData for Vendor=${vendor}, Batch=${batch}`,
          // );
        }
      }
    }

    // Ambil status Closed dari data-closed attribute (1 = Blanket PO, 2 = PO)
    const closedVal = $row.attr("data-closed");
    rowData.Closed =
      closedVal === "1" || closedVal === "2" ? parseInt(closedVal) : 0;

    if (!rowData.Vendor || (rowData.Qty === 0 && rowData.Price === 0)) {
      console.warn(`  Skipping incomplete row at index ${index}:`, rowData);
      return; // Skip row ini
    }

    rawDataTengah.push(rowData);
  });

  // console.log("rawDataTengah collected:", rawDataTengah);

  if (rawDataTengah.length === 0) {
    console.warn(" No valid data found, using last valid snapshot");
    if (
      typeof lastValidTableKiriData !== "undefined" &&
      lastValidTableKiriData.length > 0
    ) {
      rebuildTableKiri(lastValidTableKiriData);
    } else {
      console.warn(" No previous data available, clearing table");
      $(".BigDataTableKiri tbody").empty();
      $(".tbodyTotalTableKiri").text("0.00");
    }
    return;
  }

  const summarizedDataKiri = {};

  const batchLookupCache = {};
  const vendorBatchLookupCache = {};
  if (Array.isArray(window.allTableKananData)) {
    window.allTableKananData.forEach((d) => {
      const dBatch = d.Batch ? String(d.Batch).trim() : null;
      const dShipmentDate = d.ShipmentDate
        ? String(d.ShipmentDate).trim()
        : null;
      const dVendor = String(d.Vendor);

      // Cache by batch+date (for flexible matching)
      const batchDateKey = `${dBatch}|${dShipmentDate}`;
      if (!batchLookupCache[batchDateKey]) {
        batchLookupCache[batchDateKey] = d;
      }

      // Cache by vendor+batch+date (for strict matching)
      const vendorKey = `${dVendor}|${dBatch}|${dShipmentDate}`;
      if (!vendorBatchLookupCache[vendorKey]) {
        vendorBatchLookupCache[vendorKey] = d;
      }
    });
  }

  // Helper function untuk mencari BlanketPODateEst dari berbagai sumber
  function findBlanketPODateEst(vendorId, batch, shipmentDate) {
    // OPTIMIZATION: Use pre-built cache instead of .find() loops
    const vendorKey = `${String(vendorId)}|${batch}|${shipmentDate}`;
    let matchedRow = vendorBatchLookupCache[vendorKey];

    if (matchedRow && matchedRow.BlanketPODateEst) {
      return matchedRow.BlanketPODateEst;
    }

    // Fallback: try batch+date only (ignore vendor)
    const batchDateKey = `${batch}|${shipmentDate}`;
    let flexMatchedRow = batchLookupCache[batchDateKey];

    if (flexMatchedRow && flexMatchedRow.BlanketPODateEst) {
      return flexMatchedRow.BlanketPODateEst;
    }

    const key =
      batch && batch !== "0"
        ? `${vendorId}-batch-${batch}`
        : `${vendorId}-date-${shipmentDate}`;
    const $existingRow = $(`.BigDataTableKiri tbody tr[data-rowid="${key}"]`);
    if ($existingRow.length > 0) {
      const existingBlanketDate = $existingRow
        .find(".blanketPODateEstInput")
        .val();
      if (existingBlanketDate) {
        return existingBlanketDate;
      }
    }

    if (Array.isArray(window.allTableKananData)) {
      const dtlMatchedRow = window.allTableKananData.find((d) => {
        const dBatch = d.Batch ? String(d.Batch).trim() : null;
        const dShipmentDate = d.ShipmentDate
          ? String(d.ShipmentDate).trim()
          : null;
        const dDtlID = d.PurchasePlanDtlID;

        const batchMatch = batch && batch !== "0" ? dBatch === batch : true;
        const dateMatch = shipmentDate ? dShipmentDate === shipmentDate : true;

        return batchMatch && dateMatch && dDtlID && dDtlID > 0;
      });

      if (dtlMatchedRow) {
        const dtlKey = `dtl-${dtlMatchedRow.PurchasePlanDtlID}`;
        const $dtlRow = $(`.BigDataTableKiri tbody tr[data-rowid="${dtlKey}"]`);
        if ($dtlRow.length > 0) {
          const blanketDateFromDtlRow = $dtlRow
            .find(".blanketPODateEstInput")
            .val();
          if (blanketDateFromDtlRow) {
            return blanketDateFromDtlRow;
          }
        }
      }
    }

    if (
      typeof aggregatedSummary !== "undefined" &&
      aggregatedSummary[vendorId]
    ) {
      const summaryKey = batch && batch !== "0" ? batch : shipmentDate;
      if (
        aggregatedSummary[vendorId][summaryKey] &&
        aggregatedSummary[vendorId][summaryKey].blanketPODateEst
      ) {
        return aggregatedSummary[vendorId][summaryKey].blanketPODateEst;
      }
    }

    return null;
  }

  rawDataTengah.forEach((row) => {
    const batchValue = row.Batch ? String(row.Batch).trim() : null;

    if (!row.Vendor || (!batchValue && !row.ShipmentDate)) {
      console.warn("Invalid row data, skipping:", row);
      return;
    }
    const poDateEst = row.PODateEst ? String(row.PODateEst).trim() : null;

    const normalizedShipmentDate = row.ShipmentDate
      ? String(row.ShipmentDate).trim()
      : null;

    const key =
      batchValue && batchValue !== "0"
        ? `${row.Vendor}-batch-${batchValue}`
        : `${row.Vendor}-date-${normalizedShipmentDate}`;

    // console.log(`Creating key: ${key}`, {
    //   blanketPODateEst: poDateEst,
    //   vendor: row.Vendor,
    //   batch: batchValue,
    //   shipmentDate: normalizedShipmentDate,
    // });

    if (!summarizedDataKiri[key]) {
      // Cari BlanketPODateEst dari berbagai sumber
      const blanketPODateEst = findBlanketPODateEst(
        row.Vendor,
        batchValue,
        normalizedShipmentDate,
        poDateEst,
      );

      summarizedDataKiri[key] = {
        Vendor: row.Vendor,
        Batch: batchValue && batchValue !== "0" ? batchValue : null,
        BlanketPODateEst: poDateEst,
        ShipmentDate: normalizedShipmentDate || null,
        PODateEst: poDateEst || null,
        Total: 0,
        ClosedCount: 0, // Track jumlah item yang closed
        TotalItems: 0, // Track total item untuk vendor+batch ini
        MaxClosed: 0, // Track nilai Closed tertinggi (1 = Blanket, 2 = PO)
        PurchasePlanDtlID: null,
      };
    }

    summarizedDataKiri[key].TotalItems += 1;
    // Cek closed (1 = Blanket PO, 2 = PO)
    const closedVal = parseInt(row.Closed) || 0;
    if (closedVal === 1 || closedVal === 2) {
      summarizedDataKiri[key].ClosedCount += 1;
      // Simpan nilai Closed tertinggi
      if (closedVal > summarizedDataKiri[key].MaxClosed) {
        summarizedDataKiri[key].MaxClosed = closedVal;
      }
    }

    let lineTotal = (row.Qty || 0) * (row.Price || 0);
    summarizedDataKiri[key].Total += lineTotal;
  });

  const dataUntukTableKiri = Object.values(summarizedDataKiri);

  // console.log("Summarized data for tablekiri:", dataUntukTableKiri);
  // console.log("vendorBatchToIdMap at mapping time:", window.vendorBatchToIdMap);

  if (dataUntukTableKiri.length === 0) {
    console.warn("Summarized data is empty, using last valid snapshot");
    if (
      typeof lastValidTableKiriData !== "undefined" &&
      lastValidTableKiriData.length > 0
    ) {
      rebuildTableKiri(lastValidTableKiriData);
    } else {
      $(".BigDataTableKiri tbody").empty();
      $(".tbodyTotalTableKiri").text("0.00");
    }
    return;
  }

  dataUntukTableKiri.forEach((row, idx) => {
    const batchValue = row.Batch ? String(row.Batch).trim() : null;
    const normalizedShipmentDate = row.ShipmentDate
      ? String(row.ShipmentDate).trim()
      : null;

    const newKey =
      batchValue && batchValue !== "0"
        ? `${row.Vendor}-batch-${batchValue}`
        : `${row.Vendor}-date-${normalizedShipmentDate}`;

    // console.log(`\n  Row ${idx}:`);
    // console.log(`    Vendor: ${row.Vendor}`);
    // console.log(`    PODateEst: "${row.PODateEst || null}"`);
    // console.log(`    Batch: ${batchValue}`);
    // console.log(`    BlanketPODateEst: ${row.BlanketPODateEst || null}`);
    // console.log(`    ShipmentDate: ${normalizedShipmentDate}`);
    // console.log(`    New Key: "${newKey}"`);
    // console.log(
    //   `    Existing PurchasePlanDtlID: ${row.PurchasePlanDtlID || "NONE"}`,
    // );

    if (row.PurchasePlanDtlID && row.PurchasePlanDtlID > 0) {
      const dtlIdExistsInDB =
        Array.isArray(window.allTableKananData) &&
        window.allTableKananData.some(
          (d) => d.PurchasePlanDtlID == row.PurchasePlanDtlID,
        );

      if (dtlIdExistsInDB) {
        return; // Skip to next row
      } else {
        // console.log(
        //   `   DtlID ${row.PurchasePlanDtlID} INVALID - TIDAK ada di database!`,
        // );
        // console.log(`  Ini batch BARU, reset PurchasePlanDtlID = null`);
        row.PurchasePlanDtlID = null; // Reset untuk batch baru
      }
    }

    let foundDtlID = null;

    const batchExistsInDB =
      Array.isArray(window.allTableKananData) &&
      window.allTableKananData.some(
        (d) =>
          String(d.Vendor) === String(row.Vendor) &&
          String(d.Batch || "0").trim() === String(batchValue || "0"),
      );

    const isNewBatchNoSearch = !batchExistsInDB;

    // console.log(
    //   `   Batch check: vendor=${row.Vendor}, batch=${batchValue}, shipmentDate=${normalizedShipmentDate}, existsInDB=${batchExistsInDB}, isNewBatch=${isNewBatchNoSearch}`,
    // );

    if (Array.isArray(window.allTableKananData)) {
      const matchingInDB = window.allTableKananData.filter(
        (d) => String(d.Vendor) === String(row.Vendor),
      );
      // console.log(
      //   `    Data di allTableKananData untuk vendor ${row.Vendor}:`,
      //   matchingInDB,
      // );
    }

    if (isNewBatchNoSearch) {
      // console.log(
      //   `    BATCH BARU: vendor+batch ini belum ada di database. SKIP semua layer searching!`,
      // );
      foundDtlID = null; // Explicit: tetap null
      row.PurchasePlanDtlID = null; // Double-check: ensure null
    } else if (!foundDtlID) {
      // console.log(
      //   `  ✓ BATCH LAMA: vendor+batch ini SUDAH ada di database. Jalankan layer searching untuk cari DtlID...`,
      // );
      // console.log(
      //   `  Layer 2 - Searching in oldVendorBatchToIdMap for vendor=${row.Vendor}...`,
      // );
      for (const [oldKey, oldDtlID] of Object.entries(oldVendorBatchToIdMap)) {
        // Parse old key
        const isOldBatch = oldKey.includes("-batch-");
        const isOldDtlKey = oldKey.startsWith("dtl-");

        if (
          !oldDtlID ||
          oldDtlID === 0 ||
          oldDtlID === "0" ||
          oldDtlID === null
        ) {
          continue;
        }

        let shouldPreserve = false;

        if (isOldDtlKey) {
          if (Array.isArray(window.allTableKananData)) {
            const dtlIdFromKey = parseInt(oldKey.replace("dtl-", ""));
            const vendorFromData = window.allTableKananData.find(
              (d) => d.PurchasePlanDtlID === dtlIdFromKey,
            );
            if (vendorFromData) {
              const vendor_dari_oldmap = String(vendorFromData.Vendor);
              const vendorMatch = vendor_dari_oldmap === String(row.Vendor);
              if (vendorMatch && oldDtlID && oldDtlID > 0) {
                shouldPreserve = true;
                // console.log(
                //   `    DTL-based key vendor match: Vendor=${vendor_dari_oldmap} === ${row.Vendor}, preserve DtlID=${oldDtlID}`,
                // );
              } else {
                // console.log(
                //   `    DTL-key vendor mismatch: Vendor=${vendor_dari_oldmap} !== ${row.Vendor}`,
                // );
              }
            }
          }
        } else {
          // Old key is vendor-based, extract vendor and match
          const oldVendor = oldKey.split("-")[0];
          const isOldBatchKey = oldKey.includes("-batch-");
          const isOldDateKey = oldKey.includes("-date-");

          const vendorMatch = oldVendor === String(row.Vendor);

          // Extract batch dari oldKey
          let oldBatch = null;
          if (isOldBatchKey) {
            const parts = oldKey.split("-batch-");
            oldBatch = parts[1] ? parts[1].split("-")[0] : null;
          }

          const currentBatch = batchValue;
          const batchMatch = oldBatch === currentBatch;

          // HANYA preserve jika vendor DAN batch COCOK!
          if (vendorMatch && batchMatch && oldDtlID && oldDtlID > 0) {
            shouldPreserve = true;
            // console.log(
            //   `    Vendor+Batch match: "${oldVendor}" === "${row.Vendor}" && "${oldBatch}" === "${currentBatch}", preserve DtlID=${oldDtlID}`,
            // );
          } else {
            // console.log(
            //   `    No match: Vendor=${vendorMatch}, Batch=${batchMatch} (old="${oldBatch}", current="${currentBatch}")`,
            // );
          }
        }

        if (shouldPreserve && oldDtlID && oldDtlID > 0) {
          foundDtlID = oldDtlID;
          // console.log(
          //   ` Layer 2 - PRESERVED from old map: ${oldKey} → ${foundDtlID}`,
          // );
          break;
        }
      }
    }

    if (
      !foundDtlID &&
      Array.isArray(window.allTableKananData) &&
      !isNewBatchNoSearch
    ) {
      // console.log(`  Layer 3 - Searching in allTableKananData...`);
      // // First try: exact match with vendor + batch + date
      const exactMatchedRows = window.allTableKananData.filter((d) => {
        const dVendor = String(d.Vendor);
        const dBatch = d.Batch ? String(d.Batch).trim() : null;
        const dShipmentDate = d.ShipmentDate
          ? String(d.ShipmentDate).trim()
          : null;

        const vendorMatch = dVendor === row.Vendor;
        const batchMatch = dBatch === batchValue;
        const dateMatch = dShipmentDate === normalizedShipmentDate;

        return vendorMatch && batchMatch && dateMatch;
      });

      if (exactMatchedRows.length > 0) {
        foundDtlID = exactMatchedRows[0].PurchasePlanDtlID;
        row.BlanketPODateEst = exactMatchedRows[0].BlanketPODateEst || null;
      }

      //  FIX: If vendor changed but batch+date are the same, it's still the same row!
      if (!foundDtlID) {
        const flexibleMatchedRows = window.allTableKananData.filter((d) => {
          const dVendor = String(d.Vendor);
          const dBatch = d.Batch ? String(d.Batch).trim() : null;
          const dShipmentDate = d.ShipmentDate
            ? String(d.ShipmentDate).trim()
            : null;

          const vendorMatch = dVendor === row.Vendor;
          const batchMatch = dBatch === batchValue;
          const dateMatch = dShipmentDate === normalizedShipmentDate;

          return vendorMatch && batchMatch && dateMatch;
        });

        if (flexibleMatchedRows.length > 0) {
          foundDtlID = flexibleMatchedRows[0].PurchasePlanDtlID;
          row.BlanketPODateEst =
            flexibleMatchedRows[0].BlanketPODateEst || null;
        }
      }
    }

    if (foundDtlID && foundDtlID > 0) {
      row.PurchasePlanDtlID = foundDtlID;
      // console.log(` ASSIGNED PurchasePlanDtlID: ${foundDtlID}`);
    } else {
      // console.log(` No DtlID found, will be treated as NEW`);
    }
  });

  dataUntukTableKiri.forEach((row, idx) => {
    if (
      !row.PurchasePlanDtlID ||
      row.PurchasePlanDtlID === 0 ||
      row.PurchasePlanDtlID === null
    ) {
      const vendor = String(row.Vendor);
      const batch = row.Batch ? String(row.Batch).trim() : null;
      const shipmentDate = row.ShipmentDate
        ? String(row.ShipmentDate).trim()
        : null;

      // console.log(
      //   `   Row ${idx} missing PurchasePlanDtlID: Vendor=${vendor}, Batch=${batch}, ShipmentDate=${shipmentDate}`,
      // );

      if (Array.isArray(window.lastValidTableKiriData)) {
        // ONLY EXACT MATCH: vendor + batch + shipmentDate
        let recovered = window.lastValidTableKiriData.find((d) => {
          const dVendor = String(d.Vendor);
          const dBatch = d.Batch ? String(d.Batch).trim() : null;
          const dShipmentDate = d.ShipmentDate
            ? String(d.ShipmentDate).trim()
            : null;

          return (
            dVendor === vendor &&
            dBatch === batch &&
            dShipmentDate === shipmentDate
          );
        });
        if (
          recovered &&
          recovered.PurchasePlanDtlID &&
          recovered.PurchasePlanDtlID > 0
        ) {
          row.PurchasePlanDtlID = recovered.PurchasePlanDtlID;
          // console.log(
          //   `   RECOVERED from lastValidTableKiriData: Row ${idx} PurchasePlanDtlID=${row.PurchasePlanDtlID} (EXACT MATCH)`,
          // );
          return; // Success, move to next row
        }
      }
    }
  });

  //  FIX: Sekarang build newKey yang final berdasarkan PurchasePlanDtlID jika ada
  const finalDataUntukTableKiri = dataUntukTableKiri.map((row) => {
    if (row.PurchasePlanDtlID && row.PurchasePlanDtlID > 0) {
      row._finalKey = `dtl-${row.PurchasePlanDtlID}`;
    } else {
      const batchVal = row.Batch ? String(row.Batch).trim() : null;
      const shipmentVal = row.ShipmentDate
        ? String(row.ShipmentDate).trim()
        : null;
      row._finalKey =
        batchVal && batchVal !== "0"
          ? `${row.Vendor}-batch-${batchVal}`
          : `${row.Vendor}-date-${shipmentVal}`;
    }
    return row;
  });

  // console.log("\nFinal data BEFORE rebuild:", finalDataUntukTableKiri);

  window.lastValidTableKiriData = JSON.parse(
    JSON.stringify(finalDataUntukTableKiri),
  );
  window.validTableKiriData = finalDataUntukTableKiri;

  // REBUILD dengan delay
  clearTimeout(window.rebuildKiriTimer);

  window.rebuildKiriTimer = setTimeout(() => {
    rebuildTableKiri(finalDataUntukTableKiri);
  }, 100);
}

$(document).off("click", ".view-summary-details-btn");
$(document).on("click", ".view-summary-details-btn", function () {
  let $clickedButton = $(this);
  // console.log("View Details button clicked");
  const purchasePlanID = getPurchasePlanIdFromURL();

  // Ambil data dari button attributes
  const vendorId = $clickedButton.attr("data-vendorid");
  const vendorName =
    $clickedButton.attr("data-vendorname") || $clickedButton.data("vendorname");
  const batch = $clickedButton.attr("data-batch");
  const shipmentDate = $clickedButton.attr("data-shipment-date");

  const blanketPODateEst = $clickedButton.attr("data-blanket-po-date-est");
  const isBatch = $clickedButton.attr("data-is-batch") === "true";
  const rowId = $clickedButton.attr("data-rowid");

  let tempRowId = $clickedButton.attr("data-temp-rowid");
  let realDtlId = $clickedButton.attr("data-real-dtl-id");

  if (!realDtlId || realDtlId === "undefined" || realDtlId === "") {
    // console.log(
    //   "  realDtlId undefined, mencari di kumpulanDataTableKiriKanan...",
    // );

    if (
      window.kumpulanDataTableKiriKanan &&
      Array.isArray(window.kumpulanDataTableKiriKanan)
    ) {
      // Cari berdasarkan vendor + batch
      const foundGroup = window.kumpulanDataTableKiriKanan.find((g) => {
        const matchVendor = String(g.vendorId) === String(vendorId);
        const matchBatch =
          batch && batch !== "0"
            ? String(g.batch) === String(batch)
            : String(g.shipmentDate) === String(shipmentDate);
        return matchVendor && matchBatch && g.purchasePlanDtlId;
      });

      if (foundGroup && foundGroup.purchasePlanDtlId) {
        realDtlId = foundGroup.purchasePlanDtlId;
        tempRowId = foundGroup.tempRowId || `real-${realDtlId}`;
        // console.log(
        //   `✓ Found from cache: realDtlId=${realDtlId}, tempRowId=${tempRowId}`,
        // );

        // Update button attribute untuk referensi selanjutnya
        $clickedButton.attr("data-real-dtl-id", realDtlId);
        $clickedButton.attr("data-temp-rowid", tempRowId);
      }
    }
  }

  window.currentDtlRealID = realDtlId || null;

  // Store current batch info for duplicate payment feature
  window.currentBatch = batch;
  window.currentShipmentDate = shipmentDate;
  window.currentBlanketPODateEst = blanketPODateEst;
  // console.log("Button data:", {
  //   vendorId,
  //   vendorName,
  //   batch,
  //   shipmentDate,
  //   blanketPODateEst,
  //   isBatch,
  //   rowId,
  //   tempRowId,
  //   realDtlId,
  //   currentDtlRealID: window.currentDtlRealID,
  // });
  if (!vendorId || (!batch && !shipmentDate)) {
    console.error("Missing vendorId or batch/shipmentDate");
    alert("Invalid data: Missing vendor or batch/shipment date");
    return;
  }

  const newVendorBatch =
    batch && batch !== "0" && batch !== ""
      ? `${vendorId}-${batch}`
      : `${vendorId}-${shipmentDate}`;

  const isDifferentSelection =
    currentLoadedVendorBatch !== null &&
    currentLoadedVendorBatch !== newVendorBatch;

  // Sebelumnya di sini user diminta konfirmasi "perubahan akan hilang" lalu
  // datanya benar-benar dibuang (resetChangeTracking tanpa commit apapun).
  // Sekarang: sebelum pindah ke vendor/batch lain, commit dulu semua baris
  // payment yang sedang tampil ke kumpulanDataTableKiriKanan (memory), jadi
  // tidak ada yang hilang dan bisa bolak-balik ganti batch. Data ini ikut
  // dikirim saat tombol Save ditekan (lihat saveTableKanan).
  if (isDifferentSelection) {
    $("#tableKanan tr")
      .not(":has(th)")
      .each(function () {
        const $row = $(this);
        const hasData =
          $row.find(".percenTableKanan").val() ||
          $row.find(".notesTableKanan").val() ||
          $row.find(".termDaysTableKanan").val();
        if (hasData) {
          commitPaymentChangesFromRow($row);
        }
      });
    resetChangeTracking();
  }

  //  UPDATE CURRENT SELECTION & tempRowId
  currentLoadedVendorBatch = newVendorBatch;
  currentDtlTempRowId = tempRowId; //  SIMPAN tempRowId AKTIF
  currentDtlRealId = realDtlId || null; //  SIMPAN real ID jika ada

  //  SIMPAN MAPPING KE GLOBAL
  if (typeof window.vendorBatchToIdMap === "undefined") {
    window.vendorBatchToIdMap = {};
  }

  // when oldVendorBatchToIdMap is preserved in autoRecalculateTableKiri Layer 2
  if (realDtlId && realDtlId > 0) {
    const dtlKeyMap = `dtl-${realDtlId}`;
    if (!vendorBatchToIdMap[dtlKeyMap]) {
      vendorBatchToIdMap[dtlKeyMap] = realDtlId;
    }
  }

  let ID = realDtlId || null;
  lastSelectedVendorId = String(vendorId);
  lastSelectedRowId = rowId;

  if (!ID) {
    console.warn(" ID tidak ditemukan, baris baru dengan tempRowId");
    idPurchaseTableKanan = 0; // Belum ada ID asli

    // Buka panel kanan biar user tetap bisa isi manual
    const displayTitle =
      batch && batch !== "0"
        ? `${vendorName} - Batch ${batch}`
        : `${vendorName} - Date ${shipmentDate}`;

    $("#judulTableKanan").val(displayTitle);
    $("#judulTableKanan").text(displayTitle);
    $("#tableKananHead").css("visibility", "visible");
    $("#judulTableKanan").css("visibility", "visible");
    $("#tableKanan").empty();

    return;
  }

  // console.log("Loading payment data for ID:", ID);

  if (currentLoadedVendorBatch && currentLoadedVendorBatch !== newVendorBatch) {
    const oldBatchParts = String(currentLoadedVendorBatch).split("-");
    let oldVendor, oldBatch;

    if (oldBatchParts.length >= 2) {
      oldVendor = oldBatchParts[0];
      oldBatch = oldBatchParts[1];
    }

    if (
      oldVendor &&
      oldBatch &&
      Array.isArray(kumpulanDataTableKiriKanan) &&
      kumpulanDataTableKiriKanan.length > 0
    ) {
      const oldBatchGroup = kumpulanDataTableKiriKanan.find(
        (g) =>
          String(g.vendorId) === String(oldVendor) &&
          String(g.batch) === String(oldBatch),
      );

      // Jika ada payment data di batch lama, auto-save dulu
      if (
        oldBatchGroup &&
        oldBatchGroup.paymentIds &&
        oldBatchGroup.paymentIds.length > 0 &&
        oldBatchGroup.purchasePlanDtlId
      ) {
        // console.log(
        //   ` AUTO-SAVING payment dari batch lama (${oldVendor}-${oldBatch}) sebelum switch...`,
        // );

        // Build payment rows untuk batch lama
        const paymentRowsToSave = [];
        for (let i = 0; i < oldBatchGroup.paymentIds.length; i++) {
          const row = {
            PaymentID: oldBatchGroup.paymentIds[i] || 0,
            PurchasePlanDtlID: oldBatchGroup.purchasePlanDtlId, // PENTING: DTL batch LAMA!
            Notes: oldBatchGroup.notes ? oldBatchGroup.notes[i] : null,
            Percent: oldBatchGroup.percent ? oldBatchGroup.percent[i] : null,
            FromValue: oldBatchGroup.formValue
              ? oldBatchGroup.formValue[i]
              : null,
            Alert: oldBatchGroup.alert ? oldBatchGroup.alert[i] : null,
            Term: oldBatchGroup.termDays ? oldBatchGroup.termDays[i] : null,
            OACredit: oldBatchGroup.OACredit ? oldBatchGroup.OACredit[i] : null,
            PaymentDate: oldBatchGroup.paymentDate
              ? oldBatchGroup.paymentDate[i]
              : null,
          };
          paymentRowsToSave.push(row);
        }

        // Sync save (blocking) untuk batch lama sebelum lanjut
        $.ajax({
          url:
            BASE_URL + "scm/purchasing/purchase_plan_report/updateTableKanan",
          type: "POST",
          data: JSON.stringify({
            payments: paymentRowsToSave,
            mapping: {},
            mappingShipment: {},
            purchasePlanID: dbtPurchasePlan_ID,
            autoSave: true,
            isAutoSaveBeforeBatchSwitch: true, // Flag untuk backend
          }),
          contentType: "application/json; charset=utf-8",
          dataType: "json",
          async: false, // SYNC call untuk memastikan save selesai dulu
          success: function (response) {
            if (response.status === "success") {
              // console.log(
              //   ` ✓ AUTO-SAVED payment dari batch lama dengan DTL ${oldBatchGroup.purchasePlanDtlId}`,
              // );
            } else {
              console.warn(` ⚠ AUTO-SAVE batch lama gagal:`, response.message);
            }
          },
          error: function (xhr, status, error) {
            console.error(` ❌ AUTO-SAVE batch lama error:`, status, error);
          },
        });
      }
    }
  }

  // Update judul table kanan (global state already set before early return)
  const displayTitle =
    batch && batch !== "0"
      ? `${vendorName} - Batch ${batch}`
      : `${vendorName} - Date ${shipmentDate}`;

  $("#judulTableKanan").val(displayTitle);
  $("#judulTableKanan").text(displayTitle);

  var tbody = $("#tableKanan");
  var thead = $("#tableKananHead");
  var judul = $("#judulTableKanan");

  thead.css("visibility", "visible");
  judul.css("visibility", "visible");
  tbody.empty();
  const requestedShipmentID = $clickedButton.attr("data-shipment-id");

  // PERBAIKAN: Jangan load payment jika ID tidak valid (ini batch baru yang belum disave ke database)
  if (!ID || ID === null || ID === undefined || ID === "0" || ID === 0) {
    console.log(
      "  Detail ini BELUM disave ke database (ID tidak valid). Tampilkan tabel kosong saja.",
    );
    // Tampilkan tabel kosong untuk batch baru
    loadTableKanan(ID);
    return;
  }

  // AJAX call untuk ambil data payment - HANYA jika ID valid
  $.ajax({
    url:
      BASE_URL +
      "scm/purchasing/purchase_plan_report/getPurchasePlanDtlPayment",
    type: "GET",
    data: {
      id: ID,
      shipmentID: requestedShipmentID, // ← Pass shipmentID yang dipilih
    },
    dataType: "json",
    success: function (response) {
      if (response.status === "success" && response.data) {
        // console.log("Data Pembayaran Berhasil Diambil (RAW):", response.data);

        const requestedBatch = batch && batch !== "0" ? Number(batch) : null;
        const requestedVendor = Number(vendorId);
        // Filter data: HANYA ambil yang vendor + batch cocok
        const validData = response.data.filter((row) => {
          const rowVendor = Number(row.VendorID || row.Vendor);
          const rowBatch = row.Batch ? Number(row.Batch) : null;
          const rowDtlId = row.PurchasePlanDtlID
            ? Number(row.PurchasePlanDtlID)
            : null;
          const requestedDtlId = ID && ID !== "0" ? Number(ID) : null;

          const vendorMatch = rowVendor === requestedVendor;

          let batchMatch = false;

          if (requestedDtlId && rowDtlId) {
            // Ada DtlID request dan row punya DtlID
            if (requestedDtlId === rowDtlId) {
              // DtlID COCOK: Batch harus cocok ATAU rowBatch null
              batchMatch = rowBatch === requestedBatch || rowBatch === null;
            } else {
              // DtlID BEDA: REJECT!
              batchMatch = false;
            }
          } else if (!requestedDtlId) {
            // Request TANPA DtlID (batch baru): Batch harus cocok
            batchMatch = rowBatch === requestedBatch;
          } else {
            // Request punya DtlID tapi row tidak punya: REJECT
            batchMatch = false;
          }

          if (!vendorMatch || !batchMatch) {
            // console.log("   REJECTED row:", {
            //   rowVendor,
            //   rowBatch,
            //   rowDtlId,
            //   requestedDtlId,
            //   vendorMatch,
            //   batchMatch,
            //   PaymentID: row.PaymentID,
            // });
            return false;
          }
          return true;
        });

        if (validData.length === 0) {
          // Sebelumnya di sini SELURUH kumpulanDataTableKiriKanan
          // dikosongkan (window.kumpulanDataTableKiriKanan.length = 0).
          // Ini bug besar: begitu server tidak punya data payment untuk
          // plan yang SEDANG dibuka (wajar terjadi kalau plan itu belum
          // pernah di-Save), SEMUA plan lain yang sudah diisi user di
          // sesi ini ikut hilang juga. Cache plan lain harus tetap utuh -
          // yang boleh "kosong" hanya tampilan untuk plan ini saja.
          const groupKeyForThis = generateShipmentGroupKey({
            vendorId: vendorId,
            batch: batch,
            shipmentDate: shipmentDate,
            blanketPODateEst: blanketPODateEst,
            purchasePlanDtlId: ID,
          });

          // Cek dulu: mungkin plan ini sendiri sebenarnya SUDAH punya data
          // lokal (hasil edit yang belum di-save) di cache. Server bilang
          // kosong bukan berarti benar-benar tidak ada isinya untuk user.
          const localGroupForThis = Array.isArray(
            window.kumpulanDataTableKiriKanan,
          )
            ? window.kumpulanDataTableKiriKanan.find((g) => {
                const matchDtl =
                  (g.purchasePlanDtlID &&
                    String(g.purchasePlanDtlID) === String(ID)) ||
                  (g.purchasePlanDtlId &&
                    String(g.purchasePlanDtlId) === String(ID));
                const matchVendor =
                  String(g.vendorId) === String(requestedVendor);
                const matchBatch =
                  requestedBatch !== null && requestedBatch !== undefined
                    ? String(g.batch) === String(requestedBatch)
                    : true;
                const hasData =
                  (Array.isArray(g.paymentIds) && g.paymentIds.length > 0) ||
                  (Array.isArray(g.payments) && g.payments.length > 0);
                return matchDtl && matchVendor && matchBatch && hasData;
              })
            : null;

          if (localGroupForThis) {
            // Ada data lokal (belum di-save) untuk plan ini - render dari
            // cache, JANGAN dianggap kosong dan JANGAN sentuh plan lain.
            loadTableKanan(ID, [], localGroupForThis);
            return;
          }

          // Betul-betul belum ada data (di server maupun lokal) untuk
          // plan ini saja - render tabel kosong TANPA menghapus cache
          // plan lain.
          loadTableKanan(null, [], {
            vendorId: requestedVendor,
            batch: requestedBatch,
            groupKey: groupKeyForThis,
          });

          resetChangeTracking();
          return;
        }

        // Ganti dengan data yang sudah divalidasi
        response.data = validData;

        // DEDUPLICATE response.data berdasarkan PaymentID atau kombinasi unik
        const seenPaymentKeys = new Set();
        const dedupedPaymentData = response.data.filter((row) => {
          const key = row.PaymentID
            ? `pid-${row.PaymentID}`
            : `${row.Notes || ""}-${row.Percent || 0}-${row.Alert || 0}-${row.Term || 0}`;
          if (seenPaymentKeys.has(key)) {
            console.log(" Duplikat payment dihapus:", key);
            return false;
          }
          seenPaymentKeys.add(key);
          return true;
        });

        // Ganti response.data dengan yang sudah deduplicate
        response.data = dedupedPaymentData;
        //  Generate groupKey untuk grouping yang tepat
        const groupKey = generateShipmentGroupKey({
          vendorId: vendorId,
          batch: batch,
          shipmentDate: shipmentDate,
          blanketPODateEst: blanketPODateEst,
          purchasePlanDtlId: ID,
        });

        //  Cari focusedObject berdasarkan groupKey
        let focusedObject = kumpulanDataTableKiriKanan.find(
          (r) => r.groupKey === groupKey,
        );

        if (!focusedObject) {
          // PENTING: JANGAN kosongkan seluruh kumpulanDataTableKiriKanan di
          // sini. Ini sama seperti bug yang sudah diperbaiki di cabang
          // "validData.length === 0" di atas - kalau plan yang SEDANG
          // dibuka belum pernah di-cache di sesi ini (baru pertama kali
          // load payment-nya), itu bukan berarti plan-plan LAIN yang sudah
          // diisi user (belum di-Save) boleh ikut hilang. Cukup pastikan
          // array-nya ada, lalu di bawah kita push object baru untuk plan
          // ini tanpa menyentuh entry plan lain.
          if (!Array.isArray(window.kumpulanDataTableKiriKanan)) {
            window.kumpulanDataTableKiriKanan = [];
          }
          //  Dapatkan total dari aggregatedSummary
          const summaryKey = batch && batch !== "0" ? batch : shipmentDate;
          const total =
            aggregatedSummary && aggregatedSummary[vendorId]
              ? aggregatedSummary[vendorId][summaryKey]?.total || 0
              : 0;

          //  Ambil semua ShipmentID yang masuk dalam group ini
          const shipmentIds = response.data
            .map((r) => r.ShipmentID)
            .filter((id, index, self) => id && self.indexOf(id) === index); // unique only

          // Ambil status Closed dari response data (jika ada row yang closed, maka group ini closed)
          const isGroupClosed = response.data.some(
            (r) =>
              r.Closed == 1 ||
              r.Closed === "1" ||
              r.Closed == 2 ||
              r.Closed === "2",
          );

          focusedObject = {
            //  TAMBAHKAN groupKey
            groupKey: groupKey,

            rowId: rowId || newVendorBatch,
            tempRowId: tempRowId,
            vendorId: Number(vendorId),
            batch: batch && batch !== "0" ? Number(batch) : null,
            blanketPODateEst: blanketPODateEst || null,
            shipmentDate: shipmentDate || null,
            vendorName: vendorName,
            totalAmount: total,
            closed: isGroupClosed ? 1 : 0, // Tambahkan status closed

            //  UBAH dari singular jadi array
            shipmentIds: shipmentIds, // Array of shipment IDs in this group
            purchasePlanDtlId: ID, // dari parameter function
            purchasePlanDtlID: ID,

            //  Data payment dari response
            paymentIds: response.data.map((r) => r.PaymentID || null),
            paymentDate: response.data.map((r) => r.PaymentDate || null),
            termDays: response.data.map((r) => r.Term || null),
            percent: response.data.map((r) => r.Percent || null),
            notes: response.data.map((r) => r.Notes || ""),
            formValue: response.data.map((r) => r.FromValue || ""),
            alert: response.data.map((r) => r.Alert || ""),
            OACredit: response.data.map((r) => r.OACredit || ""),
          };

          kumpulanDataTableKiriKanan.push(focusedObject);
        } else {
          //  Update existing group
          focusedObject.purchasePlanDtlId = ID;
          focusedObject.tempRowId = tempRowId;

          if (blanketPODateEst) {
            focusedObject.blanketPODateEst = blanketPODateEst;
          }

          // Update closed status dari response data
          const isGroupClosed = response.data.some(
            (r) =>
              r.Closed == 1 ||
              r.Closed === "1" ||
              r.Closed == 2 ||
              r.Closed === "2",
          );
          focusedObject.closed = isGroupClosed ? 1 : 0;

          // PENTING: focusedObject di sini adalah OBJECT YANG SAMA yang
          // tersimpan di kumpulanDataTableKiriKanan. Kalau plan ini sudah
          // pernah diisi/diubah user sebelumnya (lalu user pindah ke plan
          // lain tanpa Save), array-nya (paymentIds/percent/notes/dst)
          // berisi PERUBAHAN LOKAL yang belum ke-save ke database.
          // response.data di titik ini masih data LAMA dari server (karena
          // memang belum di-save), jadi kalau kita timpa array-nya di sini,
          // perubahan lokal user akan hilang saat balik lagi ke plan ini.
          // Fix: hanya isi dari server kalau cache-nya memang masih kosong
          // (pertama kali plan ini dibuka), supaya data yang sudah diisi
          // user tetap dipertahankan saat bolak-balik pindah plan.
          const cacheSudahAdaData =
            (Array.isArray(focusedObject.paymentIds) &&
              focusedObject.paymentIds.length > 0) ||
            (Array.isArray(focusedObject.payments) &&
              focusedObject.payments.length > 0);

          if (!cacheSudahAdaData) {
            // Update payment data dari server (baru pertama kali dibuka)
            focusedObject.paymentIds = response.data.map(
              (r) => r.PaymentID || null,
            );
            focusedObject.paymentDate = response.data.map(
              (r) => r.PaymentDate || null,
            );
            focusedObject.termDays = response.data.map((r) => r.Term || null);
            focusedObject.percent = response.data.map((r) => r.Percent || null);
            focusedObject.notes = response.data.map((r) => r.Notes || "");
            focusedObject.formValue = response.data.map(
              (r) => r.FromValue || "",
            );
            focusedObject.alert = response.data.map((r) => r.Alert || "");
            focusedObject.OACredit = response.data.map((r) => r.OACredit || "");
          }
        }

        //  CEK: Jika data kosong, otomatis add line baru
        if (!response.data || response.data.length === 0) {
          console.log("No payment data found, adding empty row automatically");
        } else {
          // Load data ke tabel kanan
          if (typeof loadTableKanan === "function") {
            loadTableKanan(ID, response.data, focusedObject);
          } else {
            console.error("loadTableKanan function not found");
            alert("Error: loadTableKanan function not defined");
          }
        }

        resetChangeTracking();
      } else {
        console.error("Failed get data payment:", response.message);
        alert(
          "Failed to load payment data: " +
            (response.message || "Unknown error"),
        );
      }
    },
    error: function (xhr, status, error) {
      console.error("AJAX Error:", status, error);
      console.error("Response Text:", xhr.responseText);
      alert("Error when load server.");
    },
  });
});

$(document).off("click", "#duplicatePayment");
$(document).on("click", "#duplicatePayment", function () {
  //  CARI SOURCE DATA dari preloadedPaymentGroups ATAU fallback ke kumpulanDataTableKiriKanan
  let sourcesData = window.preloadedPaymentGroups || [];

  // console.log(" Cari source dari preloadedPaymentGroups:", sourcesData);

  //  FALLBACK: Jika preloadedPaymentGroups kosong, gunakan kumpulanDataTableKiriKanan
  if (!Array.isArray(sourcesData) || sourcesData.length === 0) {
    sourcesData = window.kumpulanDataTableKiriKanan || [];
    // console.log(
    //   "   preloadedPaymentGroups kosong, fallback ke kumpulanDataTableKiriKanan:",
    //   sourcesData,
    // );
  }

  // Filter: vendor sama + punya payment + bukan batch aktif
  let sourceGroup = null;
  for (let i = 0; i < sourcesData.length; i++) {
    const group = sourcesData[i];
    const isSameVendor =
      String(group.vendorId) === String(lastSelectedVendorId);
    const isCurrentBatch =
      String(group.vendorId) === String(lastSelectedVendorId) &&
      String(group.batch) === String(window.currentBatch);
    const hasPay = group.paymentIds && group.paymentIds.length > 0;

    // console.log(
    //   `  [${i}] vendor=${group.vendorId}, batch=${group.batch}, isSame=${isSameVendor}, hasPay=${hasPay}, isCurrent=${isCurrentBatch}`,
    // );

    // Ambil yang pertama kali cocok (vendor sama, punya payment, bukan batch aktif)
    if (isSameVendor && hasPay && !isCurrentBatch) {
      sourceGroup = group;
      console.log(`  ✓ Source found at index ${i}`);
      break;
    }
  }

  if (!sourceGroup) {
    alert(
      " No payment data available to copy from.\n\nPlease create payment for at least one other batch of the same vendor first.",
    );
    return;
  }

  const targetDtlId = currentDtlRealId;

  let targetGroup = window.kumpulanDataTableKiriKanan.find(
    (g) => String(g.purchasePlanDtlId) === String(targetDtlId),
  );

  if (!targetGroup) {
    const newGroupKey = `vendor-${lastSelectedVendorId}-batch-${currentBatch}-dtl-${targetDtlId}`;

    targetGroup = {
      groupKey: newGroupKey,
      rowId: currentLoadedVendorBatch,
      tempRowId: currentDtlTempRowId,

      vendorId: Number(lastSelectedVendorId),
      vendorName: sourceGroup.vendorName,
      batch: Number(currentBatch),

      purchasePlanDtlId: targetDtlId,
      shipmentDate: currentShipmentDate, // ⬅️ TARGET
      blanketPODateEst: currentBlanketPODateEst, // ⬅️ TARGET

      closed: 0,
      totalAmount: sourceGroup.totalAmount || 0,

      shipmentIds: [],
      paymentIds: [],
      paymentDate: [],
      termDays: [],
      percent: [],
      notes: [],
      formValue: [],
      alert: [],
      OACredit: [],
    };

    window.kumpulanDataTableKiriKanan.push(targetGroup);
  }

  targetGroup.paymentIds = sourceGroup.paymentIds.map(() => null); // 🔑 RESET ID
  targetGroup.paymentDate = [...sourceGroup.paymentDate];
  targetGroup.termDays = [...sourceGroup.termDays];
  targetGroup.percent = [...sourceGroup.percent];
  targetGroup.notes = [...sourceGroup.notes];
  targetGroup.formValue = [...sourceGroup.formValue];
  targetGroup.alert = [...sourceGroup.alert];
  targetGroup.OACredit = [...sourceGroup.OACredit];

  const paymentDataForRender = [];
  if (targetGroup.paymentIds && Array.isArray(targetGroup.paymentIds)) {
    for (let i = 0; i < targetGroup.paymentIds.length; i++) {
      const paymentRow = {
        PaymentID: targetGroup.paymentIds[i] || null,
        PurchasePlanDtlID: targetGroup.purchasePlanDtlId,
        PaymentDate: targetGroup.paymentDate[i] || null,
        Term: targetGroup.termDays[i] || null,
        Percent: targetGroup.percent[i] || null,
        Notes: targetGroup.notes[i] || "",
        FromValue: targetGroup.formValue[i] || "",
        Alert: targetGroup.alert[i] || "",
        OACredit: targetGroup.OACredit[i] || "",
        ShipmentID: targetGroup.shipmentIds[0] || null,
        VendorID: targetGroup.vendorId,
        Vendor: targetGroup.vendorId,
        Batch: targetGroup.batch,
        Closed: targetGroup.closed || 0,
      };
      paymentDataForRender.push(paymentRow);
    }
  }

  loadTableKanan(
    targetGroup.purchasePlanDtlId,
    paymentDataForRender, // ⬅️ PASS DATA YANG SUDAH DI-CLONE
    targetGroup,
  );

  markAsChanged();

  alert(
    ` ${targetGroup.paymentIds.length} payment success to copy\n` +
      `From ${sourceGroup.vendorName} Batch ${sourceGroup.batch}\n` +
      `To Batch ${window.currentBatch}\n\n` +
      ` Don't forget to SAVE`,
  );
});

function updateCurrentSelection(vendorId, batch, totalAmount, vendorName) {
  const numericVendorId = parseInt(vendorId);
  const numericBatch = parseInt(batch);

  kumpulanDataTableKiriKanan.forEach((item) => {
    item.isCurrentlySelected =
      parseInt(item.vendorId) === numericVendorId &&
      parseInt(item.batch) === numericBatch;
  });
}
// Panggil function ini setelah save sukses
function onSaveSuccess() {
  resetChangeTracking();
}

// Update existing event handler untuk percent dengan real-time validation
$("#tableKanan")
  .off("input change", ".percenTableKanan")
  .on("input change", ".percenTableKanan", function () {
    var $this = $(this);
    var value = parseFloat($this.val());

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
    }, 100);

    // Call existing function if exists
    refreshObjectTableKiri(currentActiveRowId);
  });
// Fungsi untuk update status percent secara real-time
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

  // Buat atau update status element
  let $statusElement = $("#percent-status");
  if ($statusElement.length === 0) {
    $statusElement = $(
      '<div id="percent-status" class="alert alert-sm mt-2 mb-2"></div>',
    );

    // Tambahkan CSS untuk membuat horizontal dan memanjang
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
  let icon = "";
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

  // Struktur HTML yang lebih rapi untuk horizontal layout
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
// Event handler untuk kolom OA Credit (%)
function handleOACreditEvent(el) {
  let $input = $(el);
  let val = parseInt($input.val());
  if (isNaN(val)) val = "";
  if (val > 100) val = 100;
  if (val < 0) val = 0;
  $input.val(val);
  //  Tambahkan commit supaya tersimpan di kumpulanDataTableKiriKanan
  const $rowKanan = $input.closest("tr");
  commitPaymentChangesFromRow($rowKanan);
}

//  Payment Date
$("#tableKanan").on("change", ".paymentDateTableKanan", function () {
  const $row = $(this).closest("tr");
  commitPaymentChangesFromRow($row);
});

//  Notes
$("#tableKanan").on("input change blur", ".notesTableKanan", function () {
  const $row = $(this).closest("tr");
  // console.log(" Notes changed on row:", $row.data("payment-id"));
  refreshObjectTableKiri(currentActiveRowId);
  commitPaymentChangesFromRow($row);
});

//  From Value
$("#tableKanan").on("input change blur", ".formValueTableKanan", function () {
  const $row = $(this).closest("tr");
  // console.log(" FromValue changed on row:", $row.data("payment-id"));
  refreshObjectTableKiri(currentActiveRowId);
  commitPaymentChangesFromRow($row);
});

//  Alert
$("#tableKanan").on("input change blur", ".alertTableKanan", function () {
  const $row = $(this).closest("tr");
  // console.log(" Alert changed on row:", $row.data("payment-id"));
  refreshObjectTableKiri(currentActiveRowId);
  commitPaymentChangesFromRow($row);
});

//  Term Days
$("#tableKanan").on("input change blur", ".termDaysTableKanan", function () {
  const $row = $(this).closest("tr");
  // console.log(
  //   " TermDays changed on row:",
  //   $row.data("payment-id"),
  //   "value:",
  //   $(this).val(),
  // );
  refreshObjectTableKiri(currentActiveRowId);
  commitPaymentChangesFromRow($row);
});

$("#tableKanan").on("input change blur", ".OACreditTableKanan", function () {
  refreshObjectTableKiri(currentActiveRowId);
  handleOACreditEvent(this);
});

function refreshObjectTableKiri(targetRowId) {
  const effectiveRowId =
    targetRowId || currentActiveRowId || lastSelectedRowId || "kiri-summary";

  //  VALIDASI: Jika ada targetRowId, HARUS sama dengan yang aktif
  if (targetRowId && targetRowId !== lastSelectedRowId) {
    console.warn(
      ` BLOCKED: Cannot update ${targetRowId}, currently active: ${lastSelectedRowId}`,
    );
    return;
  }

  // Cari object target
  let targetObject = kumpulanDataTableKiriKanan.find(
    (r) => String(r.rowId) === String(effectiveRowId),
  );

  // Fallback: kalau rowId tidak match (mis. beda sumber pembuatan object),
  // coba cocokkan lewat groupKey berdasarkan vendor+batch/shipmentDate yang
  // sedang aktif, supaya update tetap kena row yang benar dan tidak
  // silently gagal.
  if (!targetObject && window.currentBatch !== undefined) {
    const fallbackGroupKey = generateShipmentGroupKey({
      vendorId: lastSelectedVendorId,
      batch: window.currentBatch,
      shipmentDate: window.currentShipmentDate,
      purchasePlanDtlId: window.currentDtlRealID,
    });
    targetObject = kumpulanDataTableKiriKanan.find(
      (r) => r.groupKey === fallbackGroupKey,
    );
  }

  if (!targetObject) {
    console.warn(` rowId ${effectiveRowId} tidak ditemukan`);
    return;
  }

  const isCurrentlyViewingThisRow =
    lastSelectedRowId === effectiveRowId ||
    currentActiveRowId === effectiveRowId;

  if (isCurrentlyViewingThisRow) {
    if (targetObject.paymentIds && Array.isArray(targetObject.paymentIds)) {
      // Format lama dengan paymentIds array
      // Looping setiap payment ID yang tersimpan
      targetObject.paymentIds.forEach((paymentId, idx) => {
        // Cari row di table kanan dengan payment ID ini
        const $row = $(`#tableKanan tr[data-payment-id='${paymentId}']`);

        if ($row.length > 0) {
          // Payment ditemukan di table kanan, UPDATE dengan nilai terbaru dari DOM
          targetObject.notes[idx] = String(
            $row.find(".notesTableKanan").val() || "",
          );
          targetObject.percent[idx] =
            parseFloat($row.find(".percenTableKanan").val()) || 0;
          targetObject.formValue[idx] =
            parseInt($row.find(".formValueTableKanan").val()) || 0;
          targetObject.alert[idx] =
            parseInt($row.find(".alertTableKanan").val()) || 0;
          targetObject.termDays[idx] =
            parseInt($row.find(".termDaysTableKanan").val()) || 0;

          let oaCreditRaw = $row.find(".OACreditTableKanan").val() || "0";
          let oaCreditClean = oaCreditRaw.replace(/[,\s]/g, "");
          targetObject.OACredit[idx] = parseFloat(oaCreditClean) || 0;
        } else {
          // Payment tidak ditemukan di table kanan, KEEP nilai lama
          // console.log(
          //   `  [SYNC] PaymentID ${paymentId} (index ${idx}) PRESERVED from existing data`,
          // );
        }
      });
    } else {
      // Format baru dengan payments array - reset dan populate
      // console.log(` [SYNC] Format baru - reset dan populate dari table kanan`);

      targetObject.paymentDate = [];
      targetObject.notes = [];
      targetObject.percent = [];
      targetObject.formValue = [];
      targetObject.alert = [];
      targetObject.termDays = [];
      targetObject.OACredit = [];

      // Isi ulang dari tabel kanan
      $("#tableKanan tr").each(function () {
        const $row = $(this);

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
    }
  } else {
    // console.log(
    //   ` Skipping payment update for ${effectiveRowId} - not currently active`,
    // );
    // console.log(
    //   `   Currently active: ${lastSelectedRowId || currentActiveRowId}`,
    // );
  }
}
// Fungsi untuk update existing rows (lebih efisien untuk auto recalculate)
function updateExistingTableKiriRows(dataUntukTableKiri) {
  totalTableKiri = 0;
  arrIDVendorTableKiri = [];

  $(".BigDataTableKiri tbody tr").each(function (index) {
    const $row = $(this);
    const dataRow = dataUntukTableKiri[index];

    if (dataRow) {
      // Update vendor name
      $row
        .find(".vendorColumnTableKiri")
        .val(
          typeof arrVendor !== "undefined"
            ? arrVendor[dataRow.Vendor]
            : dataRow.Vendor,
        );

      // Update batch
      $row.find(".batchColumnTableKiri").val(dataRow.Batch);

      // Update total
      let rawTotal = dataRow.Total;
      let formattedTotal = rawTotal.toLocaleString("en-EN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      $row
        .find(".totalColumnTableKiri")
        .val(formattedTotal)
        .attr("data-formatted", formattedTotal);

      arrIDVendorTableKiri.push(dataRow.Vendor);
      totalTableKiri += dataRow.Total;

      // Update button data
      $row
        .find(".viewDetail")
        .data(
          "vendor",
          typeof arrVendor !== "undefined"
            ? arrVendor[dataRow.Vendor]
            : dataRow.Vendor,
        )
        .data("batch", dataRow.Batch);
    }
  });

  $(".tbodyTotalTableKiri").text(totalTableKiri.toLocaleString("en-EN"));
  // console.log(`Total akhir table kiri (updated): ${totalTableKiri}`);
}

// Event listeners untuk auto recalculate
$(document).ready(function () {
  // Event untuk input changes di TableTengah - HANYA pada BLUR
  $(document).on(
    "blur",
    ".BigDataTableTengah .qtyColumn, .BigDataTableTengah .priceColumn",
    function () {
      // console.log("Qty/Price blur detected, triggering auto recalculate...");
      clearTimeout(window.autoRecalcTimer);
      // Tidak perlu debounce pada blur, langsung recalculate
      autoRecalculateTableKiri();
    },
  );

  // NOTE: vendorSelectColumn dan batchColumn sudah masing-masing punya
  // handler recalculate sendiri (lihat handler "change" .vendorSelectColumn
  // dan handler "blur" .batchColumn). Tidak perlu handler tambahan di sini -
  // sebelumnya kedua trigger jalan bersamaan sehingga setiap kali batch/vendor
  // diubah, autoRecalculateTableKiri() (yang berat) jalan dua kali.

  // Event untuk add/delete rows
  $(document).on(
    "click",
    '[onclick*="addRow"], [onclick*="deleteRow"], .add-row, .delete-row',
    function () {
      setTimeout(function () {
        // console.log("Row added/deleted, triggering auto recalculate...");
        autoRecalculateTableKiri();
      }, 100); // Longer delay for row operations
    },
  );

  // Hook ke pengambilanDataTableTengah yang asli jika dipanggil manual
  if (typeof window.pengambilanDataTableTengah === "undefined") {
    window.pengambilanDataTableTengah = function (data = null) {
      if (data && data.length > 0) {
        rebuildTableKiri(data);
      } else {
        // console.log(" Tidak ada data untuk rebuild awal, harus dilewati.");
      }
    };
  }
});

// Expose functions untuk debugging dan manual trigger
window.autoRecalculateTableKiri = autoRecalculateTableKiri;
window.manualRecalculate = autoRecalculateTableKiri;

// Debug function
window.debugAutoRecalc = function () {
  // console.log("=== DEBUG AUTO RECALC ===");
  // console.log("totalTableKiri:", totalTableKiri);
  // console.log("arrIDVendorTableKiri:", arrIDVendorTableKiri);
  // console.log("TableTengah rows:", $(".BigDataTableTengah tbody tr").length);
  // console.log("TableKiri rows:", $(".BigDataTableKiri tbody tr").length);

  $(".BigDataTableTengah tbody tr").each(function (i) {
    const $row = $(this);
    console.log(`TableTengah Row ${i}:`, {
      vendor: $row.find(".vendorSelectColumn").val(),
      qty: $row.find(".qtyColumn").val(),
      price: $row.find(".priceColumn").attr("data-value"),
      batch: $row.find(".batchColumn").val(),
      shipmentDate: $row.find(".shipmentDateColumn").val(),
    });
  });
};

function loadTableKanan(
  purchasePlanDtlID,
  dataFromServer = null,
  focusedObject = null,
) {
  if (!window.kumpulanDataTableKiriKanan)
    window.kumpulanDataTableKiriKanan = [];

  // Ambil vendor dan batch dari focusedObject untuk STRICT MATCHING
  const requestedVendor = focusedObject ? focusedObject.vendorId : null;
  const requestedBatch = focusedObject ? focusedObject.batch : null;
  const requestedGroupKey = focusedObject ? focusedObject.groupKey : null;

  let finalData = null;

  if (purchasePlanDtlID && purchasePlanDtlID > 0) {
    if (!focusedObject) {
      // console.log(
      //   "   focusedObject null (batch baru) - SKIP cache search, return kosong",
      // );
      finalData = null;
    } else {
      // Ada DtlID: HARUS match DtlID + Vendor + Batch (3 kriteria)
      // console.log("  [CACHE] Mencari dengan DtlID + Vendor + Batch...");

      const localData = window.kumpulanDataTableKiriKanan.find((x) => {
        const matchDtlId =
          (x.purchasePlanDtlID &&
            String(x.purchasePlanDtlID) === String(purchasePlanDtlID)) ||
          (x.purchasePlanDtlId &&
            String(x.purchasePlanDtlId) === String(purchasePlanDtlID));
        const matchVendor =
          requestedVendor && String(x.vendorId) === String(requestedVendor);

        const matchBatch =
          requestedBatch !== null && requestedBatch !== undefined
            ? String(x.batch) === String(requestedBatch)
            : true;

        const hasData =
          (Array.isArray(x.termDays) && x.termDays.length > 0) ||
          (Array.isArray(x.payments) && x.payments.length > 0);

        // console.log(
        //   `    Checking cache: dtl=${matchDtlId}, vendor=${matchVendor}, batch=${matchBatch}, hasData=${hasData}`,
        // );

        return matchDtlId && matchVendor && matchBatch && hasData;
      });

      if (localData) {
        if (Array.isArray(localData.termDays)) {
          finalData = [];
          for (let i = 0; i < localData.paymentIds.length; i++) {
            finalData.push({
              PaymentID: localData.paymentIds[i],
              PurchasePlanDtlID: parseInt(purchasePlanDtlID),
              ShipmentID: localData.shipmentIds
                ? localData.shipmentIds[0]
                : null,
              PaymentDate: localData.paymentDate
                ? localData.paymentDate[i]
                : null,
              Notes: localData.notes ? localData.notes[i] : "",
              Percent: localData.percent ? localData.percent[i] : 0,
              FromValue: localData.formValue ? localData.formValue[i] : 1,
              Alert: localData.alert ? localData.alert[i] : 2,
              Term: localData.termDays ? localData.termDays[i] : 0,
              OACredit: localData.OACredit ? localData.OACredit[i] : "",
              VendorID: localData.vendorId,
              Batch: localData.batch || null,
              Closed: localData.closed || 0,
            });
          }
        } else if (Array.isArray(localData.payments)) {
          finalData = localData.payments;
        }
      } else {
        // console.log(
        //   "  [CACHE] ✗ NOT FOUND - tidak ada data yang match 3 kriteria",
        // );
      }
    }
  } else {
    // // Tidak ada DtlID (batch baru): HANYA match Vendor + Batch
    // console.log(
    //   "  [CACHE] Mencari batch BARU (tanpa DtlID) dengan Vendor + Batch...",
    // );

    const localData = window.kumpulanDataTableKiriKanan.find((x) => {
      const noValidDtlId = !x.purchasePlanDtlID && !x.purchasePlanDtlId;

      const matchVendor = requestedVendor
        ? String(x.vendorId) === String(requestedVendor)
        : false;

      const matchBatch =
        requestedBatch !== null && requestedBatch !== undefined
          ? String(x.batch) === String(requestedBatch)
          : false;

      const hasData =
        (Array.isArray(x.termDays) && x.termDays.length > 0) ||
        (Array.isArray(x.payments) && x.payments.length > 0);

      return noValidDtlId && matchVendor && matchBatch && hasData;
    });

    if (localData) {
      // console.log("  [CACHE] ✓ FOUND batch baru! Menggunakan local cache");
      // Konversi sama seperti di atas
      if (Array.isArray(localData.termDays)) {
        finalData = [];
        for (let i = 0; i < localData.paymentIds.length; i++) {
          finalData.push({
            PaymentID: localData.paymentIds[i],
            PurchasePlanDtlID: purchasePlanDtlID || null,
            ShipmentID: localData.shipmentIds ? localData.shipmentIds[0] : null,
            PaymentDate: localData.paymentDate
              ? localData.paymentDate[i]
              : null,
            Notes: localData.notes ? localData.notes[i] : "",
            Percent: localData.percent ? localData.percent[i] : 0,
            FromValue: localData.formValue ? localData.formValue[i] : 1,
            Alert: localData.alert ? localData.alert[i] : 2,
            Term: localData.termDays ? localData.termDays[i] : 0,
            OACredit: localData.OACredit ? localData.OACredit[i] : "",
            VendorID: localData.vendorId,
            Batch: localData.batch || null,
            Closed: localData.closed || 0,
          });
        }
      }
    } else {
      // console.log("  [CACHE] ✗ NOT FOUND batch baru - akan cek SERVER data");
    }
  }

  if (
    !finalData &&
    dataFromServer &&
    Array.isArray(dataFromServer) &&
    dataFromServer.length > 0
  ) {
    finalData = dataFromServer;
  }
  if (!finalData && purchasePlanDtlID && purchasePlanDtlID > 0) {
    // console.log("  [AJAX] Tidak ada cache, fetch dari server...");
    $.ajax({
      url:
        BASE_URL +
        "scm/purchasing/purchase_plan_report/getDataTableKanan/" +
        purchasePlanDtlID,
      type: "GET",
      dataType: "json",
      success: function (response) {
        // console.log("  [AJAX] ✓ Data dari server:", response);
        const cleanedData = deduplicatePaymentData(response);
        window.allTableKananData = cleanedData;
        renderTableKanan(cleanedData, focusedObject);

        // Simpan ke cache dengan groupKey yang tepat
        cleanedData.forEach((row) => {
          commitPaymentChanges(purchasePlanDtlID, row);
        });
      },
      error: function (xhr, status, error) {
        console.error("  [AJAX] ✗ Error:", status, error);
      },
    });
    return;
  }

  if (finalData) {
    const cleanedData = deduplicatePaymentData(finalData);
    // console.log(`  [RENDER] Menampilkan ${cleanedData.length} payment rows`);
    window.allTableKananData = cleanedData;
    renderTableKanan(cleanedData, focusedObject);
  } else {
    // Tidak ada data sama sekali: tampilkan kosong
    // console.log("  [RENDER] Tidak ada data - tampilkan tabel kosong");
    renderTableKanan([], focusedObject);
  }

  // console.log("━━━ loadTableKanan END ━━━\n");
}
function deduplicatePaymentData(dataArray) {
  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    return [];
  }

  // console.log(" Deduplikasi dimulai, data masuk:", dataArray.length);

  //  STRATEGI 1: Pisahkan data yang punya PaymentID valid (> 0)
  const withPaymentID = dataArray.filter(
    (item) => item.PaymentID && item.PaymentID !== 0 && item.PaymentID !== "",
  );

  //  STRATEGI 2: Sisanya dianggap tanpa PaymentID valid (hasil clone/split)
  const withoutPaymentID = dataArray.filter(
    (item) => !item.PaymentID || item.PaymentID === 0 || item.PaymentID === "",
  );

  //  Deduplikasi yang punya PaymentID (langsung by ID)
  const uniqueByPaymentID = [
    ...new Map(withPaymentID.map((item) => [item.PaymentID, item])).values(),
  ];

  //  Deduplikasi data tanpa PaymentID (pakai kombinasi beberapa kolom)
  const uniqueWithoutPaymentID = [
    ...new Map(
      withoutPaymentID.map((item) => [
        // gunakan kombinasi field biar key-nya unik antar clone
        `${item.PurchasePlanDtlID || 0}-${item.PaymentDate || "null"}-${item.Notes || "null"}-${item.Percent || 0}-${item.Term || 0}`,
        item,
      ]),
    ).values(),
  ];

  //  Gabungkan hasil
  const result = [...uniqueByPaymentID, ...uniqueWithoutPaymentID];

  // console.log(` Deduplikasi selesai: ${result.length} data unik`);
  // console.log(" Detail:", {
  //   total_awal: dataArray.length,
  //   dengan_paymentID: withPaymentID.length,
  //   tanpa_paymentID: withoutPaymentID.length,
  //   unik_dengan_ID: uniqueByPaymentID.length,
  //   unik_tanpa_ID: uniqueWithoutPaymentID.length,
  //   total_akhir: result.length,
  // });

  return result;
}

// Deduplikasi khusus untuk data kalkulasi dari DB
function deduplicatePaymentCalcData(dataArray) {
  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    return [];
  }

  // console.log(" Deduplikasi Calc dimulai, data masuk:", dataArray.length);

  // Deduplikasi berdasarkan kombinasi ID unik
  const uniqueData = [
    ...new Map(
      dataArray.map((item) => [
        // Key unik: ID + PaymentDate + Notes + Percent
        `${item.ID || 0}-${item.PaymentDate || "null"}-${item.Notes || "null"}-${item.Percent || 0}`,
        item,
      ]),
    ).values(),
  ];

  // console.log(
  //   ` Deduplikasi Calc selesai: ${uniqueData.length} data unik dari ${dataArray.length}`,
  // );

  return uniqueData;
}

let currentShipmentID = null;
function renderTableKanan(dataArray, focusedObject = null) {
  const tbody = $("#tableKanan");
  tbody.empty();

  if (!Array.isArray(dataArray) || dataArray.length === 0) {
    console.log(" Tidak ada data untuk ditampilkan di tabel kanan");
    currentShipmentID = null;
    return;
  }

  const allRowsClosed =
    dataArray &&
    dataArray.length > 0 &&
    dataArray.every(
      (row) =>
        row.Closed == 1 ||
        row.Closed == 2 ||
        row.Closed === "1" ||
        row.Closed === "2",
    );

  if (allRowsClosed) {
    window.planClosed = true;
    // console.log("All rows closed - setting planClosed = true");
  } else {
    // console.log(
    //   "Not all rows closed, planClosed unchanged:",
    //   window.planClosed,
    // );
  }

  function formatToIdr(value) {
    if (!value || isNaN(value)) return "";
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }

  currentShipmentID = dataArray[0].ShipmentID || null;
  //console.log("currentShipmentID diset:", currentShipmentID);
  // Deduplikasi berdasarkan kombinasi ShipmentID + Term + Notes
  let uniqueData = [
    ...new Map(
      dataArray.map((item) => [
        `${item.ShipmentID}-${item.Term}-${item.Notes}`, //  Composite key
        item,
      ]),
    ).values(),
  ];

  uniqueData.forEach(function (row) {
    const vendorId = row.VendorID || row.Vendor;
    const batch = row.Batch || 0;

    // OPTIMIZATION: Pre-build vendor+batch → isRowClosed map instead of nested loop
    if (!window._tengahClosedCache) {
      window._tengahClosedCache = {};
      $(".BigDataTableTengah tbody tr").each(function () {
        const tengahVendor =
          $(this).attr("data-vendor-id") ||
          $(this).find(".vendorSelectColumn").val();
        const tengahBatch =
          $(this).attr("data-batch") || $(this).find(".batchColumn").val();
        const tengahClosed = $(this).attr("data-closed");
        const cacheKey = `${String(tengahVendor)}-${String(tengahBatch)}`;
        window._tengahClosedCache[cacheKey] =
          tengahClosed === "1" || tengahClosed === "2";
      });
      // console.log(" Built tengah closed cache:", window._tengahClosedCache);
    }

    // Look up from cache instead of looping
    const cacheKey = `${String(vendorId)}-${String(batch)}`;
    const isRowClosed = window._tengahClosedCache[cacheKey] || false;

    if (isRowClosed) {
      // console.log(
      //   `📊 Row Closed Status Check: Vendor=${vendorId}, Batch=${batch} → CLOSED (dari cache)`,
      // );
    }

    const tr = $("<tr>")
      .attr("data-payment-id", row.PaymentID || "")
      .attr("data-shipment-id", row.ShipmentID || "")
      .attr("data-dtl-id", row.PurchasePlanDtlID || 0)
      .attr("data-vendor-id", vendorId || "")
      .attr("data-batch", batch || "")
      .attr("data-closed", isRowClosed ? "1" : "0");

    //   PERBAIKAN: Set tempRowId dari focusedObject untuk saveTableKanan bisa cari shipment info
    if (focusedObject && focusedObject.tempRowId) {
      tr.attr("data-temp-rowid", focusedObject.tempRowId);
    }

    //   PERBAIKAN: Set groupKey attribute untuk validasi saat save
    if (focusedObject && focusedObject.groupKey) {
      tr.attr("data-current-group-key", focusedObject.groupKey);
    }

    // Jika row closed, tambahkan style dan disable inputs
    if (isRowClosed) {
      tr.addClass("row-closed").css("background-color", "#f5f5f5");
    }

    tr.append(
      `<td><input type='text' class='form-control form-control-sm notesTableKanan' value='${row.Notes || ""}' ${isRowClosed ? "disabled readonly" : ""}></td>`,
    );
    tr.append(
      `<td><input type='number' class='form-control form-control-sm percenTableKanan' value='${row.Percent ?? ""}' ${isRowClosed ? "disabled readonly" : ""}></td>`,
    );
    tr.append(`<td><select class='form-control form-control-sm formValueTableKanan' ${isRowClosed ? "disabled" : ""}>
                <option value='1' ${row.FromValue == 1 ? "selected" : ""}>Per Batch</option>
                <option value='2' ${row.FromValue == 2 ? "selected" : ""}>Partial</option>
              </select></td>`);
    tr.append(`<td><select class='form-control form-control-sm alertTableKanan' ${isRowClosed ? "disabled" : ""}>
                <option value='1' ${row.Alert == 1 ? "selected" : ""}>Blanket PO</option>
                <option value='2' ${row.Alert == 2 ? "selected" : ""}>PO</option>
                <option value='3' ${row.Alert == 3 ? "selected" : ""}>Shipment</option>
              </select></td>`);
    tr.append(
      `<td><input type='number' class='form-control form-control-sm termDaysTableKanan' value='${row.Term ?? ""}' ${isRowClosed ? "disabled readonly" : ""}></td>`,
    );
    tr.append(
      `<td><input type='number' min='0' max='100' class='form-control form-control-sm OACreditTableKanan' value='${row.OACredit ?? ""}' placeholder='%' ${isRowClosed ? "disabled readonly" : ""}></td>`,
    );
    tr.append(
      `<td class='text-center'><i class='glyphicon glyphicon-trash deleteRowTableKanan' style='cursor:pointer;color:${isRowClosed ? "#ccc" : "black"};${isRowClosed ? "pointer-events:none;opacity:0.5;" : ""}'></i></td>`,
    );

    tbody.append(tr);
  });

  disableTableKananIfPlanClosed();
}

let selectedShipmentRow = null;

function syncPaymentChangesFromDOM() {
  const paymentChanges =
    (Array.isArray(window.kumpulanPaymentChanges) &&
      window.kumpulanPaymentChanges) ||
    (Array.isArray(window.kumpulanDataTableKiriKanan) &&
      window.kumpulanDataTableKiriKanan) ||
    (typeof kumpulanPaymentChanges !== "undefined" &&
      Array.isArray(kumpulanPaymentChanges) &&
      kumpulanPaymentChanges) ||
    [];

  if (!paymentChanges || !paymentChanges.length) {
    console.warn("Tidak ada kumpulanPaymentChanges yang valid, skip sync.");
    return;
  }

  document
    .querySelectorAll(".BigDataTableKiri .blanket-est-input")
    .forEach((inputEl) => {
      const tr = inputEl.closest("tr");
      if (!tr) return;

      const rowId = tr.dataset.rowid;
      const dtlId = tr.getAttribute("data-dtl-id");
      const finalKey = dtlId ? `dtl-${dtlId}` : null;
      const blanketValue = inputEl.value;

      if (!blanketValue) return; // skip jika kosong

      // Cari target di paymentChanges
      const targetPayment = paymentChanges.find((r) => {
        // Match 1: rowId/tempRowId
        if (String(r.rowId || r.tempRowId) === String(rowId)) {
          return true;
        }

        if (
          finalKey &&
          (r._finalKey === finalKey ||
            r.groupKey === finalKey ||
            (r.groupKey && String(r.groupKey).includes(finalKey)))
        ) {
          return true;
        }
        if (
          dtlId &&
          (String(r.purchasePlanDtlId) === String(dtlId) ||
            String(r.PurchasePlanDtlID) === String(dtlId))
        ) {
          return true;
        }

        return false;
      });

      if (targetPayment && blanketValue) {
        targetPayment.blanketPODateEst = blanketValue;
      }
    });

  document.querySelectorAll(".BigDataTableKanan tr").forEach((tr) => {
    const rowId = tr.dataset.rowId;
    const paymentIdxAttr = tr.dataset.paymentIdx;
    const paymentIdx = paymentIdxAttr
      ? Number(paymentIdxAttr)
      : [...tr.parentElement.children].indexOf(tr);

    const percent = parseFloat(tr.querySelector(".percentInput")?.value || 0);
    const notes = tr.querySelector(".notesInput")?.value || "";
    const termDays = tr.querySelector(".termInput")?.value || "";
    const formValue = parseInt(
      tr.querySelector(".fromValueSelect")?.value || 1,
    );
    const paymentDate = tr.querySelector(".paymentDateInput")?.value || null;

    // cari target berdasarkan tempRowId / rowId
    const target = paymentChanges.find(
      (r) => String(r.tempRowId || r.rowId) === String(rowId),
    );
    if (target && Array.isArray(target.payments)) {
      // pastikan index ada, kalau belum buat placeholder
      if (target.payments.length <= paymentIdx) {
        // extend array sampai index tersebut
        while (target.payments.length <= paymentIdx) target.payments.push({});
      }
      target.payments[paymentIdx] = Object.assign(
        {},
        target.payments[paymentIdx],
        {
          Percent: percent,
          Notes: notes,
          Term: termDays,
          FromValue: formValue,
          PaymentDate: paymentDate,
        },
      );
    }
  });

  // optional: log untuk debugging
  // console.log("Setelah sync, sumber paymentChanges:", paymentChanges);
}
function normalizeBatch(raw) {
  if (raw === undefined || raw === null) return null;
  // jika sudah number
  if (typeof raw === "number") return String(raw);
  let s = String(raw).trim();
  // jika mengandung 'batch-'
  s = s.replace(/^batch-/, "");
  // jika ada tambahan '-undefined' atau suffix lain, ambil angka pertama
  const m = s.match(/^(\d+)/);
  if (m) return m[1];
  // jika kosong atau "0" -> treat as "0"
  if (s === "" || s === "0") return "0";
  return s;
}
function formatDateCalc(dateStr) {
  if (!dateStr) return "";
  const clean = dateStr.split(" ")[0];
  const [yyyy, mm, dd] = clean.split("-");
  return `${dd}-${mm}-${yyyy}`;
}

function getPaymentDateFromItem(item, alert) {
  // CATATAN: Property bisa berbeda di edit (uppercase) vs purchase_plan (lowercase)
  if (alert === 3) return item.shipmentDate || item.ShipmentDate; // Shipment
  if (alert === 2) return item.poDateEst || item.PODateEst || item.PoDateEst; // PO Est
  return item.poDateEst || item.PODateEst || item.PoDateEst; // default
}

function applyTermDays(baseDate, termDays) {
  if (!baseDate) return null;

  // Parse date dengan format YYYY-MM-DD (ISO format)
  // Gunakan split untuk menghindari timezone issue
  let d;
  const dateStr = String(baseDate).trim();

  if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
    // Format YYYY-MM-DD atau dengan waktu
    const [yyyy, mm, dd] = dateStr.split("-").slice(0, 3);
    d = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
  } else {
    // Fallback untuk format lain
    d = new Date(baseDate);
  }

  // Apply term days
  d.setDate(d.getDate() + parseInt(termDays || 0));

  const resultYyyy = d.getFullYear();
  const resultMm = String(d.getMonth() + 1).padStart(2, "0");
  const resultDd = String(d.getDate()).padStart(2, "0");

  // console.log(" applyTermDays DEBUG:", {
  //   baseDate: baseDate,
  //   termDays: termDays,
  //   dateStr: dateStr,
  //   resultDate: `${resultDd}-${resultMm}-${resultYyyy}`,
  // });

  return `${resultDd}-${resultMm}-${resultYyyy}`;
}

// Sync data table tengah dari DOM agar kalkulasi menggunakan data terbaru
function syncTableTengahFromDOM() {
  // console.log(" Sync table tengah dari DOM...");

  const updatedData = [];

  $(".BigDataTableTengah tbody tr").each(function () {
    const $row = $(this);
    const shipmentId =
      $row.attr("data-shipment-id") || $row.data("shipment-id") || 0;

    //  Ambil itemCodeText dari selected option di dropdown item
    const $itemSelect = $row.find(".itemSelectColumn");
    const $selectedOption = $itemSelect.find(":selected");
    const itemCode = $itemSelect.val() || 0;
    const itemCodeText =
      $selectedOption.data("code") || $selectedOption.text() || "";
    const itemUnitId = $selectedOption.data("itemunitid") || 0;
    const unitName = $selectedOption.data("unitname") || "";

    // Ambil data terbaru dari DOM
    const rowData = {
      ShipmentID: parseInt(shipmentId) || 0,
      rowId:
        String(shipmentId) ||
        `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      vendor:
        $row.find(".vendorSelectColumn").val() || $row.attr("data-vendor-id"),
      vendorId:
        $row.find(".vendorSelectColumn").val() || $row.attr("data-vendor-id"),
      Vendor:
        $row.find(".vendorSelectColumn").val() || $row.attr("data-vendor-id"),
      batch: parseInt($row.find(".batchColumn").val()) || 0,
      Batch: parseInt($row.find(".batchColumn").val()) || 0,
      qty: parseInt($row.find(".qtyColumn").val()) || 0,
      Qty: parseInt($row.find(".qtyColumn").val()) || 0,
      price:
        parseFloat(
          ($row.find(".priceColumn").val() || "0").replace(/[^0-9.-]+/g, ""),
        ) || 0,
      Price:
        parseFloat(
          ($row.find(".priceColumn").val() || "0").replace(/[^0-9.-]+/g, ""),
        ) || 0,
      shipmentDate: $row.find(".shipmentDateColumn").val() || null,
      ShipmentDate: $row.find(".shipmentDateColumn").val() || null,
      poDateEst: $row.find(".PODateEstColumn").val() || null,
      PODateEst: $row.find(".PODateEstColumn").val() || null,
      //  Tambahan: itemCode dan itemCodeText
      itemCode: parseInt(itemCode) || 0,
      ItemCode: parseInt(itemCode) || 0,
      itemCodeText: itemCodeText,
      ItemCodeText: itemCodeText,
      itemUnitId: parseInt(itemUnitId) || 0,
      unitName: unitName,
    };

    updatedData.push(rowData);
  });

  // Update KEDUA variable dengan data terbaru dari DOM
  if (updatedData.length > 0) {
    window.tableTengahData = updatedData;
    window.tableTengahEditData = updatedData; // PENTING: Update juga tableTengahEditData
    // console.log(
    //   " tableTengahData & tableTengahEditData diupdate dari DOM:",
    //   updatedData.length,
    //   "rows",
    // );
    // console.log(" Sample data:", updatedData[0]);
  }

  return updatedData;
}

// Helper function untuk mendapatkan baseDate berdasarkan alert type dan formValue
function getBaseDateForAlert(target, relatedItems, alert, formValue) {
  // Jika formValue = 1 (Per Batch)
  if (formValue === 1) {
    if (alert === 3) {
      if (relatedItems && relatedItems.length > 0) {
        // Ambil shipmentDate dari item pertama yang related
        const firstItem = relatedItems[0];
        const itemShipDate = firstItem.shipmentDate || firstItem.ShipmentDate;
        if (itemShipDate) {
          return itemShipDate;
        }
      }
      // Fallback terakhir: gunakan target.shipmentDate
      return target.shipmentDate || target.ShipmentDate;
    } else if (alert === 2) {
      // Alert 2: PO Est - gunakan poDateEst dari item pertama
      const firstItem = relatedItems && relatedItems[0];
      const firstItemPoDate =
        firstItem &&
        (firstItem.poDateEst || firstItem.PODateEst || firstItem.PoDateEst);
      return firstItemPoDate || target.blanketPODateEst || target.blanketEst;
    } else {
      // Alert 1 atau default: Blanket PO - gunakan blanketPODateEst (di edit) atau blanketEst (di purchase_plan)
      return target.blanketPODateEst || target.blanketEst;
    }
  }
  return target.blanketPODateEst || target.blanketEst;
}

function generateTableCalculasi(targetRowId) {
  // PENTING: Sync data table tengah dari DOM terlebih dahulu
  syncTableTengahFromDOM();

  if (typeof syncPaymentChangesFromDOM === "function") {
    syncPaymentChangesFromDOM();
  }

  let targetVendorId = null;
  let targetBatch = null;

  if (typeof targetRowId === "string" && targetRowId.startsWith("temp-")) {
    const parts = String(targetRowId).split("-");
    if (parts.length >= 3) {
      targetVendorId = parts[1];
      const remainder = parts.slice(2).join("-");
      // Cek apakah remainder adalah tanggal YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(remainder)) {
        targetBatch = null; // date-based, bukan batch
      } else {
        targetBatch = normalizeBatch(remainder);
      }
    }
  }

  if (
    targetVendorId &&
    targetBatch &&
    Array.isArray(window.commitPaymentChanges)
  ) {
    window.commitPaymentChanges = window.commitPaymentChanges.filter(
      (payment) => {
        let paymentBatch = payment.batch;
        if (!paymentBatch && payment.groupKey) {
          const batchMatch = String(payment.groupKey).match(/batch-(\d+)/);
          paymentBatch = batchMatch ? batchMatch[1] : null;
        }

        const isDifferentBatch =
          String(payment.vendorId) === String(targetVendorId) &&
          String(paymentBatch) !== String(targetBatch);
        const adaBatchBaru = (window.tableTengahEditData || []).some(
          (x) =>
            String(x.vendor ?? x.Vendor) === String(targetVendorId) &&
            String(x.batch ?? x.Batch) === String(targetBatch),
        );

        if (!adaBatchBaru) {
          console.warn(
            "Batch belum sinkron ke table tengah, skip hapus payment lama dulu.",
          );
          return; // atau tunda kalkulasi
        }

        if (isDifferentBatch) {
          console.warn(
            `Clearing stale payment cache: vendor=${payment.vendorId}, batch=${paymentBatch} (target batch=${targetBatch})`,
          );
          return false;
        }

        return true;
      },
    );
  }

  let target = kumpulanDataTableKiriKanan.find(
    (r) => String(r.rowId) === String(targetRowId),
  );

  // Jika target ditemukan, cek format data dan konversi jika perlu
  if (target) {
    console.log(
      " Target ditemukan di kumpulanDataTableKiriKanan:",
      target.rowId,
    );
    // console.log(
    //   " Cek format: punya termDays array?",
    //   Array.isArray(target.termDays),
    //   "punya payments?",
    //   Array.isArray(target.payments),
    // );

    if (target.termDays && Array.isArray(target.termDays)) {
      // console.log(
      //   " Format: termDays array (LAMA), semua data sudah tersimpan di array",
      // );
    }
    // PRIORITAS 2: Jika tidak ada termDays array tapi ada payments array → mapping dari payments
    else if (target.payments && Array.isArray(target.payments)) {
      // console.log(" Format: payments array (BARU), mapping ke target arrays");
      // target = {
      //   ...target,
      //   percent: target.payments.map((p) => Number(p.Percent) || 0),
      //   notes: target.payments.map((p) => String(p.Notes || "")),
      //   formValue: target.payments.map((p) => Number(p.FromValue) || 0),
      //   alert: target.payments.map((p) => Number(p.Alert) || 0),
      //   termDays: target.payments.map((p) => Number(p.Term) || 0),
      //   OACredit: target.payments.map((p) => Number(p.OACredit) || null),
      //   paymentDate: target.payments.map((p) => String(p.PaymentDate || "")),
      // };
      // console.log(" Target setelah mapping payments:", {
      //   termDays: target.termDays,
      //   alert: target.alert,
      //   formValue: target.formValue,
      // });
    }
    // PRIORITAS 3: Single payment (properties tunggal), konversi ke array
    else if (
      !Array.isArray(target.termDays) &&
      (target.Term || target.termDays || target.Alert || target.Percent)
    ) {
      target = {
        ...target,
        percent: [Number(target.Percent) || Number(target.percent) || 0],
        notes: [String(target.Notes || target.notes || "")],
        formValue: [Number(target.FromValue) || Number(target.formValue) || 0],
        alert: [Number(target.Alert) || Number(target.alert) || 0],
        termDays: [Number(target.Term) || Number(target.termDays) || 0],
        OACredit: [Number(target.OACredit) || Number(target.OaCredit) || null],
        paymentDate: [String(target.PaymentDate || target.paymentDate || "")],
      };
    }
  }

  if (!target) {
    // Coba ekstrak dtlId dari targetRowId jika formatnya "real-{dtlId}"
    let dtlIdFromRowId = null;
    if (String(targetRowId).startsWith("real-")) {
      dtlIdFromRowId = String(targetRowId).replace("real-", "");
    }

    // Cari dari format lama berdasarkan purchasePlanDtlId atau tempRowId
    const formatLama = kumpulanDataTableKiriKanan.find((r) => {
      // Match by tempRowId
      if (r.tempRowId && String(r.tempRowId) === String(targetRowId)) {
        return true;
      }
      // Match by purchasePlanDtlId (untuk format lama)
      if (
        r.purchasePlanDtlId &&
        dtlIdFromRowId &&
        String(r.purchasePlanDtlId) === dtlIdFromRowId
      ) {
        return true;
      }
      // Match by groupKey yang mengandung dtlId
      if (
        r.groupKey &&
        dtlIdFromRowId &&
        r.groupKey.includes(`dtl-${dtlIdFromRowId}`)
      ) {
        return true;
      }
      return false;
    });

    if (formatLama) {
      // CEK: apakah data berupa array (multiple payments) atau single payment
      if (formatLama.termDays && Array.isArray(formatLama.termDays)) {
        target = formatLama;
      } else if (
        formatLama.Term ||
        formatLama.termDays ||
        formatLama.Alert ||
        formatLama.Percent
      ) {
        target = {
          rowId: formatLama.rowId || formatLama.tempRowId,
          vendor: formatLama.vendor || formatLama.vendorName,
          vendorId: formatLama.vendorId,
          batch: formatLama.batch || 0,
          shipmentDate: formatLama.shipmentDate,
          blanketPODateEst:
            formatLama.blanketPODateEst || formatLama.blanketEstDate,

          // Konversi properties tunggal ke array dengan normalisasi tipe
          percent: [
            Number(formatLama.Percent) || Number(formatLama.percent) || 0,
          ],
          notes: [String(formatLama.Notes || formatLama.notes || "")],
          formValue: [
            Number(formatLama.FromValue) || Number(formatLama.formValue) || 0,
          ],
          alert: [Number(formatLama.Alert) || Number(formatLama.alert) || 0],
          termDays: [
            Number(formatLama.Term) || Number(formatLama.termDays) || 0,
          ],
          OACredit: [
            Number(formatLama.OACredit) || Number(formatLama.OaCredit) || null,
          ],
          paymentDate: [
            String(formatLama.PaymentDate || formatLama.paymentDate || ""),
          ],
          purchasePlanDtlId:
            formatLama.purchasePlanDtlId ||
            formatLama.purchasePlanDtlID ||
            null,
          purchasePlanDtlID:
            formatLama.purchasePlanDtlID ||
            formatLama.purchasePlanDtlId ||
            null,
        };
      }
    }
  }

  const paymentChanges = Array.isArray(window.commitPaymentChanges)
    ? window.commitPaymentChanges
    : Array.isArray(window.kumpulanPaymentChanges)
      ? window.kumpulanPaymentChanges
      : [];

  if (!target) {
    const paymentSources = [
      ...(Array.isArray(window.commitPaymentChanges)
        ? window.commitPaymentChanges
        : []),
      ...(Array.isArray(window.kumpulanDataTableKiriKanan)
        ? window.kumpulanDataTableKiriKanan
        : []),
    ];

    if (paymentSources.length > 0) {
      console.warn(" Mencoba ambil dari sumber payment sementara...");

      // Debug: Show structure of first item
      if (paymentSources[0]) {
        // console.log(
        //   `   First item keys: ${Object.keys(paymentSources[0]).join(", ")}`,
        // );
        console.log(
          `   First item rowId: ${paymentSources[0].rowId}, tempRowId: ${paymentSources[0].tempRowId}, purchasePlanDtlId: ${paymentSources[0].purchasePlanDtlId}`,
        );
      }

      let found = paymentSources.find(
        (r) => String(r.tempRowId) === String(targetRowId),
      );

      let shipmentDate = null;
      let batch = null;

      if (!found && String(targetRowId).startsWith("dtl-")) {
        const dtlIdFromTarget = String(targetRowId).replace("dtl-", "");

        found = paymentSources.find((r) => {
          const matchRowId = String(r.rowId) === String(targetRowId);
          const matchDtlId =
            String(r.purchasePlanDtlId || r.purchasePlanDtlID) ===
            String(dtlIdFromTarget);
          return matchRowId || matchDtlId;
        });
        if (found) console.log(`   ✓ FALLBACK 1 found!`);
      }

      if (!found && String(targetRowId).startsWith("temp-")) {
        let [_, vendorId, batchOrDate] = String(targetRowId).split("-");

        if (/^\d{4}-\d{2}-\d{2}$/.test(batchOrDate)) {
          shipmentDate = batchOrDate;
          batch = 0; // tandai sebagai "tanpa batch"
        } else {
          batch = normalizeBatch(batchOrDate);
        }

        found = paymentSources.find((r) => {
          const matchVendor = String(r.vendorId || "").includes(vendorId);
          const matchBatch =
            String(r.vendor || "").includes(`Batch ${batch}`) ||
            String(r.batch) === String(batch);
          return matchVendor && matchBatch;
        });
      }

      if (!found && String(targetRowId).includes("-")) {
        let parts = String(targetRowId).split("-");
        let shipmentDate = null;
        let vendorId = null;
        let batch = null;

        if (parts[0] === "dtl" && parts.length >= 3) {
          // Format: dtl-335-1
          vendorId = parts[1];
          batch = parts[2];
        } else if (
          (parts[0] === "new" || parts[0] === "temp") &&
          parts.length >= 3
        ) {
          vendorId = parts[1];
          const remainder = parts.slice(2).join("-");
          if (/^\d{4}-\d{2}-\d{2}$/.test(remainder)) {
            shipmentDate = remainder;
            batch = null;
          } else {
            batch = normalizeBatch(remainder);
          }
        } else if (
          parts.length >= 2 &&
          parts[0] !== "dtl" &&
          parts[0] !== "new" &&
          parts[0] !== "temp"
        ) {
          vendorId = parts[0];
          batch = parts[1];
        }

        if ((vendorId && batch !== null) || shipmentDate) {
          found = paymentSources.find((r) => {
            const matchVendor = String(r.vendorId || r.vendor || "").includes(
              String(vendorId),
            );
            const matchBatch = String(r.batch || "0") === String(batch);
            const matchShipDate =
              shipmentDate &&
              String(r.shipmentDate || "").substring(0, 10) ===
                String(shipmentDate).substring(0, 10);
            return matchVendor && (matchBatch || matchShipDate);
          });

          if (!found && String(targetRowId).startsWith("dtl-")) {
            let dtlIdFromLookup = null;
            if (Array.isArray(window.kumpulanDataTableKiriKanan)) {
              const kiriRow = window.kumpulanDataTableKiriKanan.find((r) => {
                const matchVendor =
                  String(r.vendorId || "") === String(vendorId);
                const matchBatch = String(r.batch || "0") === String(batch);
                return matchVendor && matchBatch;
              });
              if (kiriRow) {
                dtlIdFromLookup =
                  kiriRow.purchasePlanDtlId || kiriRow.purchasePlanDtlID;
              }
            }

            // Jika masih belum ditemukan, cari di table kiri DOM
            if (!dtlIdFromLookup) {
              const $kiriRow = $(`.BigDataTableKiri tr`).filter(function () {
                const rowVendor = $(this)
                  .find("td:eq(0)")
                  .attr("data-vendor-id");
                const rowBatch = $(this).find("td:eq(1)").attr("data-batch");
                return (
                  String(rowVendor) === String(vendorId) &&
                  String(rowBatch) === String(batch)
                );
              });
              if ($kiriRow.length > 0) {
                dtlIdFromLookup =
                  parseInt($kiriRow.attr("data-dtl-id")) ||
                  parseInt($kiriRow.attr("data-real-dtl-id"));
              }
            }

            // Sekarang cari payment dengan DTL ID
            if (dtlIdFromLookup) {
              found = paymentSources.find((r) => {
                const matchDtlId =
                  String(r.purchasePlanDtlID || r.purchasePlanDtlId) ===
                  String(dtlIdFromLookup);
                return matchDtlId;
              });
              if (found) {
                console.log(
                  `   ✓ FALLBACK 3 found with DTL ID: ${dtlIdFromLookup}`,
                );
              }
            }
          }
        }
      }

      if (found) {
        const parts = String(targetRowId).split("-");
        const vendorId = parts[1];
        const batchOrDate = parts.slice(2).join("-");

        // PRIORITAS 1: Ambil shipmentDate dari rowId
        const dateFromRowId = parts.find((p) => /^\d{4}-\d{2}-\d{2}$/.test(p));

        let shipmentDate = dateFromRowId || null;
        let batch = null;

        // Jika batchOrDate berisi "date-YYYY-MM-DD"
        if (batchOrDate.startsWith("date-")) {
          shipmentDate = batchOrDate.replace("date-", "");
          batch = 0;
        }
        // Jika format YYYY-MM-DD
        else if (/^\d{4}-\d{2}-\d{2}$/.test(batchOrDate)) {
          shipmentDate = batchOrDate;
          batch = 0;
        }
        // Kalau angka → batch mode
        else {
          batch = normalizeBatch(batchOrDate);
        }

        if (found.termDays && Array.isArray(found.termDays)) {
          target = {
            rowId: found.rowId || found.tempRowId,
            vendor: found.vendor || found.vendorName,
            vendorId: found.vendorId || vendorId,
            batch: found.batch || batch,
            shipmentDate: found.shipmentDate || shipmentDate,
            blanketPODateEst: found.blanketPODateEst || found.blanketEstDate,
            purchasePlanDtlId:
              found.purchasePlanDtlId ||
              found.purchasePlanDtlID ||
              found.PurchasePlanDtlID ||
              null,
            purchasePlanDtlID:
              found.purchasePlanDtlID ||
              found.purchasePlanDtlId ||
              found.PurchasePlanDtlID ||
              null,
            percent: found.percent || [],
            notes: found.notes || [],
            formValue: found.formValue || [],
            alert: found.alert || [],
            termDays: found.termDays || [],
            OACredit: found.OACredit || [],
            paymentDate: found.paymentDate || [],
          };
        } else if (found.payments && Array.isArray(found.payments)) {
          target = {
            rowId: found.tempRowId,
            vendor: found.vendor,
            vendorId,
            batch,
            shipmentDate,
            blanketPODateEst: found.blanketPODateEst || found.blanketEstDate,
            percent: found.payments.map((p) => Number(p.Percent) || 0),
            notes: found.payments.map((p) => String(p.Notes || "")),
            formValue: found.payments.map((p) => Number(p.FromValue) || 0),
            alert: found.payments.map((p) => Number(p.Alert) || 0),
            termDays: found.payments.map((p) => Number(p.Term) || 0),
            OACredit: found.payments.map((p) => Number(p.OACredit) || null),
            paymentDate: found.payments.map((p) => String(p.PaymentDate || "")),
            purchasePlanDtlId:
              found.purchasePlanDtlId ||
              found.purchasePlanDtlID ||
              found.PurchasePlanDtlID ||
              null,
            purchasePlanDtlID:
              found.purchasePlanDtlID ||
              found.purchasePlanDtlId ||
              found.PurchasePlanDtlID ||
              null,
          };
        } else if (
          found.Term ||
          found.termDays ||
          found.Alert ||
          found.Percent
        ) {
          target = {
            rowId: found.rowId || found.tempRowId,
            vendor: found.vendor || found.vendorName,
            vendorId: found.vendorId || vendorId,
            batch: found.batch || batch,
            shipmentDate: found.shipmentDate || shipmentDate,
            blanketPODateEst: found.blanketPODateEst || found.blanketEstDate,

            percent: [Number(found.Percent) || Number(found.percent) || 0],
            notes: [String(found.Notes || found.notes || "")],
            formValue: [
              Number(found.FromValue) || Number(found.formValue) || 0,
            ],
            alert: [Number(found.Alert) || Number(found.alert) || 0],
            termDays: [Number(found.Term) || Number(found.termDays) || 0],
            OACredit: [
              Number(found.OACredit) || Number(found.OaCredit) || null,
            ],
            paymentDate: [String(found.PaymentDate || found.paymentDate || "")],
            purchasePlanDtlId:
              found.purchasePlanDtlId ||
              found.purchasePlanDtlID ||
              found.PurchasePlanDtlID ||
              null,
            purchasePlanDtlID:
              found.purchasePlanDtlID ||
              found.purchasePlanDtlId ||
              found.PurchasePlanDtlID ||
              null,
          };
        } else {
          console.warn(" Format data tidak dikenali:", found);
        }
      }
    }
  }

  // Kalau tetap belum ketemu, buat target dummy
  if (!target) {
    let [_, vendorId, ...rawBatchParts] = String(targetRowId).split("-");
    let rawBatch = rawBatchParts.join("-");

    let batch = null;
    let shipmentDate = null;

    if (/^\d{4}-\d{2}-\d{2}$/.test(rawBatch)) {
      // Format: new-335-2026-01-05 → date-based
      shipmentDate = rawBatch;
      batch = 0;
    } else {
      batch = normalizeBatch(rawBatch);
    }

    const middleSource =
      Array.isArray(window.tableTengahEditData) &&
      window.tableTengahEditData.length > 0
        ? window.tableTengahEditData
        : Array.isArray(window.tableTengahData)
          ? window.tableTengahData
          : [];

    const foundMiddle = middleSource.find((item) => {
      const v1 = String(
        item.vendor ?? item.vendorId ?? item.Vendor ?? item.VendorID,
      );
      if (shipmentDate) {
        return (
          v1 === String(vendorId) &&
          String(item.shipmentDate ?? item.ShipmentDate ?? "").substring(
            0,
            10,
          ) === shipmentDate
        );
      }
      const b1 = String(item.batch ?? item.Batch ?? "0");
      return (
        v1 === String(vendorId) &&
        String(item.batch ?? item.Batch ?? "0") === String(batch)
      );
    });

    if (foundMiddle) {
      shipmentDate = foundMiddle.shipmentDate;
    }

    target = {
      rowId: targetRowId,
      vendorId,
      batch,
      shipmentDate,
      blanketPODateEst: null, // akan diisi dari button atau fallback
      percent: [],
      notes: [],
      formValue: [],
      alert: [],
      termDays: [],
      OACredit: [],
      paymentDate: [],
      purchasePlanDtlId: null,
      purchasePlanDtlID: null,
    };
    console.warn("Target sementara dibuat:", target);
  }

  const { vendorId, batch, shipmentDate } = target;
  const rowIdForButton =
    batch && String(batch) !== "0"
      ? `${vendorId}-batch-${batch}`
      : `${vendorId}-date-${shipmentDate}`;

  const $buttonKiri = $(
    `.BigDataTableKiri tr[data-rowid='${rowIdForButton}'] .view-summary-details-btn`,
  );

  if ($buttonKiri.length) {
    const buttonBlanket =
      $buttonKiri.attr("data-blanket-po-date-est") ||
      $buttonKiri.data("blanket-po-date-est");
    if (
      buttonBlanket &&
      buttonBlanket !== "null" &&
      buttonBlanket !== "undefined"
    ) {
      target.blanketPODateEst = buttonBlanket;
    }
  }

  // PRIORITAS 2: Jika tidak ada dari button, coba dari data tengah terbaru
  if (!target.blanketPODateEst) {
    const middleSourceLatest =
      window.tableTengahEditData && window.tableTengahEditData.length > 0
        ? window.tableTengahEditData
        : window.tableTengahData || [];

    const latestBlanket = middleSourceLatest.find((x) => {
      const v = String(x.vendor ?? x.vendorId ?? x.Vendor);
      const b = String(x.batch ?? x.Batch ?? "0");
      return v === String(vendorId) && b === String(batch);
    });

    if (latestBlanket?.blanketPODateEst || latestBlanket?.blanketEstDate) {
      target.blanketPODateEst =
        latestBlanket.blanketPODateEst || latestBlanket.blanketEstDate;
    }
  }

  const rowIdForBlanketSearch =
    batch && String(batch) !== "0"
      ? `${vendorId}-batch-${batch}`
      : `${vendorId}-date-${shipmentDate}`;

  const $blanketInputRow = $(
    `.BigDataTableKiri tr[data-rowid='${rowIdForBlanketSearch}']:has(.blanket-est-input)`,
  );
  if ($blanketInputRow.length > 0) {
    const $blanketInput = $blanketInputRow.find(".blanket-est-input");
    const domBlanketValue = $blanketInput.val();

    if (domBlanketValue && domBlanketValue !== "null" && target) {
      target.blanketPODateEst = domBlanketValue;
      target.BlanketPODateEst = domBlanketValue;
    }
  }

  let semuaDataGabung = [];

  if (
    Array.isArray(window.tableTengahEditData) &&
    window.tableTengahEditData.length > 0
  ) {
    // Prioritas: pakai tableTengahEditData (data yang sudah diedit user)
    semuaDataGabung.push(...window.tableTengahEditData);
  } else if (
    Array.isArray(window.tableTengahData) &&
    window.tableTengahData.length > 0
  ) {
    // Fallback: pakai tableTengahData (data dari DB)
    semuaDataGabung.push(...window.tableTengahData);
  }

  if (semuaDataGabung.length === 0) {
    console.error(" Nothing source data from middle table is valid!");
    alert("Middle table data not found. cannot be calculate total qty.");
    return;
  }

  let targetShip = shipmentDate ? String(shipmentDate).substring(0, 10) : null;

  if ((batch == 0 || batch === "0") && !targetShip) {
    // Ambil dari targetRowId: temp-vendorId-date-YYYY-MM-DD
    const parts = String(targetRowId).split("-");
    const datePart = parts.find((p) => /^\d{4}-\d{2}-\d{2}$/.test(p));
    if (datePart) {
      targetShip = datePart;
    }
  }

  let normShip = null;

  if (shipmentDate) {
    normShip = String(shipmentDate).substring(0, 10);
  } else {
    const parts = String(targetRowId).split("-");
    const dateFromRowId = parts.find((p) => /^\d{4}-\d{2}-\d{2}$/.test(p));
    if (dateFromRowId) {
      normShip = dateFromRowId;
    }
  }

  // normalisasi batch
  const normBatch = String(batch ?? 0);

  const relatedItems = semuaDataGabung.filter((x) => {
    const sameVendor =
      String(x.vendor ?? x.vendorId ?? x.Vendor ?? x.VendorID) ===
      String(vendorId);

    const dataBatch = String(x.batch ?? x.Batch ?? "0");
    const dataShipDate = String(x.shipmentDate ?? x.ShipmentDate).substring(
      0,
      10,
    );
    const targetShip = normShip ? String(normShip).substring(0, 10) : null;

    if (String(batch) !== "0" && batch !== null && batch !== undefined) {
      return sameVendor && dataBatch === String(batch);
    }
    if (targetShip) {
      return sameVendor && dataShipDate === targetShip;
    }
    return sameVendor && dataBatch === "0";
  });

  if (relatedItems.length === 0 && batch && batch !== "0") {
    console.warn(`Tidak ada item untuk batch ${batch}, fallback ke batch 0`);
    const fallbackItems = semuaDataGabung.filter((x) => {
      const sameVendor =
        String(x.vendor ?? x.vendorId ?? x.Vendor ?? x.VendorID) ===
        String(vendorId);
      const dataBatch = normalizeBatch(x.batch ?? x.Batch ?? 0);
      return sameVendor && String(dataBatch) === "0";
    });

    if (fallbackItems.length > 0) {
      relatedItems.push(...fallbackItems);
    }
  }

  const totalQty = relatedItems.reduce((sum, i) => sum + (i.qty || 0), 0);
  const totalValue = relatedItems.reduce(
    (sum, item) => sum + (item.qty || 0) * (item.price || 0),
    0,
  );
  const avgPrice = totalQty > 0 ? totalValue / totalQty : 0;
  const resultRows = [];

  // blanketPODateEst adalah single value, bukan array
  const blanketPODateEstValue =
    target.blanketPODateEst || target.blanketEstDate || null;

  const seenPaymentCombo = new Set();
  const uniquePaymentIndices = [];

  for (let i = 0; i < (target.percent?.length || 0); i++) {
    const key = `${target.notes?.[i] || ""}-${target.percent?.[i] || 0}-${target.alert?.[i] || 0}-${target.formValue?.[i] || 0}-${target.termDays?.[i] || 0}`;

    if (!seenPaymentCombo.has(key)) {
      seenPaymentCombo.add(key);
      uniquePaymentIndices.push(i);
    } else {
      console.log(" Payment duplikat di-skip (index " + i + "):", key);
    }
  }

  for (const i of uniquePaymentIndices) {
    const percent = target.percent[i];
    const notes = target.notes[i];
    const formValue = Number(target.formValue[i]); // NORMALISASI ke number untuk perbandingan yang konsisten
    const alert = Number(target.alert[i]); // NORMALISASI ke number juga
    const termDays = Number(target.termDays[i]);
    const OACredit = target.OACredit[i] || "";

    if (formValue === 1) {
      const baseDate = getBaseDateForAlert(
        target,
        relatedItems,
        alert,
        formValue,
      );
      const formattedPaymentDate = applyTermDays(baseDate, termDays);

      resultRows.push({
        paymentDate: formattedPaymentDate,
        alert,
        alertName: getAlertName(alert),
        notes,
        fromValue: formValue,
        fromValueName: "Per Batch",
        percent,
        termDays,
        OACredit,
        qty: totalQty,
        payment: parseFloat(((percent / 100) * totalQty * avgPrice).toFixed(2)),
        itemDetail: `All Items (${relatedItems.length} items)`,
      });
    } else {
      // Partial (formValue === 2) dan form value lain dihitung per shipment
      // item dengan cara yang sama, cuma labelnya beda - digabung supaya
      // logikanya tidak dobel dan tidak bisa saling berbeda tanpa sengaja.
      const fromValueName =
        formValue === 2 ? "Partial" : `Form Value ${formValue}`;

      relatedItems.forEach((item, idx) => {
        const baseDate = getPaymentDateFromItem(item, alert);
        const finalPaymentDate = applyTermDays(baseDate, termDays);

        const displayItemCode =
          item.itemCodeText ||
          item.ItemCodeText ||
          item.itemCode ||
          item.ItemCode ||
          "N/A";

        resultRows.push({
          paymentDate: finalPaymentDate,
          alert,
          alertName: getAlertName(alert),
          notes: `${notes} (Shipment ${idx + 1}, ${displayItemCode})`,
          fromValue: formValue,
          fromValueName,
          percent,
          termDays,
          OACredit,
          qty: item.qty,
          payment: parseFloat(
            ((percent / 100) * item.qty * item.price).toFixed(2),
          ),
          itemDetail: `${displayItemCode} | Ship: ${item.shipmentDate || "N/A"}`,
        });
      });
    }
  }

  const uniqueResultRows = [];
  const uniqueKeys = new Set();
  for (const row of resultRows) {
    // Key lebih lengkap untuk menghindari false positive
    const key = `${row.alertName}-${row.notes}-${row.fromValueName}-${row.percent}-${row.paymentDate}`;
    if (!uniqueKeys.has(key)) {
      uniqueResultRows.push(row);
      uniqueKeys.add(key);
    }
  }

  renderTableKananCalc(uniqueResultRows);
  const existingIndex = globalCalcCache.findIndex(
    (r) => String(r.rowId) === String(targetRowId),
  );

  // Cari purchasePlanDtlID untuk mode EDIT
  let purchasePlanDtlID = null;

  // 1. Coba dari target (kumpulanDataTableKiriKanan) - cek berbagai format property name
  if (target) {
    purchasePlanDtlID =
      target.purchasePlanDtlID ||
      target.purchasePlanDtlId ||
      target.PurchasePlanDtlID ||
      null;
  }

  // 2. Jika tidak ada, coba ekstrak dari targetRowId format "real-{dtlId}"
  if (!purchasePlanDtlID && String(targetRowId).startsWith("real-")) {
    purchasePlanDtlID = parseInt(String(targetRowId).replace("real-", ""));
  }
  // 2b. Jika format "dtl-{vendorId}-{batch}"
  if (!purchasePlanDtlID && String(targetRowId).startsWith("dtl-")) {
    const parts = String(targetRowId).split("-");
    if (parts.length >= 3) {
      const vendorId = parts[1];
      const batch = parts[2];

      // Cari di kumpulanDataTableKiriKanan
      const kiriRow = kumpulanDataTableKiriKanan.find(
        (r) =>
          String(r.vendorId) === String(vendorId) &&
          String(r.batch) === String(batch),
      );

      if (kiriRow) {
        purchasePlanDtlID =
          kiriRow.purchasePlanDtlID ||
          kiriRow.purchasePlanDtlId ||
          kiriRow.PurchasePlanDtlID ||
          null;
      }
    }
  }
  // 3. Coba dari kumpulanDataTableKiriKanan berdasarkan rowId atau vendor-batch
  if (
    !purchasePlanDtlID &&
    kumpulanDataTableKiriKanan &&
    kumpulanDataTableKiriKanan.length > 0
  ) {
    // Coba match langsung dengan rowId
    let kiriRow = kumpulanDataTableKiriKanan.find(
      (r) =>
        String(r.rowId) === String(targetRowId) ||
        String(r.tempRowId) === String(targetRowId),
    );

    // Jika tidak ketemu, coba parse vendor-batch dari targetRowId
    if (!kiriRow && targetRowId) {
      const parts = String(targetRowId).split("-");
      if (parts.length >= 3 && parts[1] === "batch") {
        // Format: {vendorId}-batch-{batchNum}
        const vendorId = parts[0];
        const batch = parts[2];
        kiriRow = kumpulanDataTableKiriKanan.find(
          (r) =>
            String(r.vendorId) === String(vendorId) &&
            String(r.batch) === String(batch),
        );
      }
    }

    if (kiriRow) {
      purchasePlanDtlID =
        kiriRow.purchasePlanDtlID ||
        kiriRow.purchasePlanDtlId ||
        kiriRow.PurchasePlanDtlID ||
        null;
    }
  }

  // 4. Coba dari table kiri DOM berdasarkan vendor-batch
  if (!purchasePlanDtlID && targetRowId) {
    const parts = String(targetRowId).split("-");
    if (parts.length >= 3 && parts[1] === "batch") {
      const vendorId = parts[0];
      const batch = parts[2];

      // Cari di DOM table kiri
      $(".BigDataTableKiri tbody tr").each(function () {
        const $row = $(this);
        const rowVendorId = $row.find("td:eq(0)").attr("data-vendor-id");
        const rowBatch = $row.find("td:eq(1)").attr("data-batch");

        if (
          String(rowVendorId) === String(vendorId) &&
          String(rowBatch) === String(batch)
        ) {
          const dtlId =
            parseInt($row.attr("data-dtl-id")) ||
            parseInt($row.attr("data-real-dtl-id")) ||
            0;
          if (dtlId > 0) {
            purchasePlanDtlID = dtlId;
            return false; // break loop
          }
        }
      });
    }
  }
  console.log("FINAL purchasePlanDtlID:", purchasePlanDtlID);
  if (existingIndex !== -1) {
    // UPDATE result milik row ini
    globalCalcCache[existingIndex].calcResult = resultRows;
    // Pastikan purchasePlanDtlID juga diupdate
    if (purchasePlanDtlID) {
      globalCalcCache[existingIndex].purchasePlanDtlID = purchasePlanDtlID;
    }
  } else {
    // TAMBAH BARU
    globalCalcCache.push({
      rowId: targetRowId,
      purchasePlanDtlID: purchasePlanDtlID,
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
  // console.log("=== DEBUG savePaymentCalcData ===");
  // console.log("purchasePlanID:", purchasePlanID);
  // console.log("targetRowId:", targetRowId);
  // console.log("resultRows:", resultRows);
  // console.log("arrListIDTableKiri:", arrListIDTableKiri);

  if (!Array.isArray(resultRows) || resultRows.length === 0) {
    console.warn("No calc result data");
    if (typeof onDone === "function") onDone();
    return;
  }

  // PERBAIKAN: Cari purchasePlanDtlID dengan cara yang lebih robust
  let purchasePlanDtlID = null;

  // 1. Coba dari globalCalcCache
  const cacheRow = globalCalcCache.find(
    (r) => String(r.rowId) === String(targetRowId),
  );

  if (cacheRow && cacheRow.purchasePlanDtlID) {
    purchasePlanDtlID = cacheRow.purchasePlanDtlID;
    // console.log("PurchasePlanDtlID dari cache:", purchasePlanDtlID);
  }

  // 2. Jika tidak ada di cache, cari dari kumpulanDataTableKiriKanan
  if (
    !purchasePlanDtlID &&
    kumpulanDataTableKiriKanan &&
    kumpulanDataTableKiriKanan.length > 0
  ) {
    let kiriRow = kumpulanDataTableKiriKanan.find(
      (r) =>
        String(r.rowId) === String(targetRowId) ||
        String(r.tempRowId) === String(targetRowId),
    );

    // Jika tidak ketemu, coba parse vendor-batch dari targetRowId
    if (!kiriRow && targetRowId) {
      const parts = String(targetRowId).split("-");
      if (parts.length >= 3 && parts[1] === "batch") {
        const vendorId = parts[0];
        const batch = parts[2];
        kiriRow = kumpulanDataTableKiriKanan.find(
          (r) =>
            String(r.vendorId) === String(vendorId) &&
            String(r.batch) === String(batch),
        );
      }
    }

    if (kiriRow) {
      purchasePlanDtlID =
        kiriRow.purchasePlanDtlID ||
        kiriRow.purchasePlanDtlId ||
        kiriRow.PurchasePlanDtlID ||
        null;
      if (purchasePlanDtlID) {
        // console.log(
        //   "PurchasePlanDtlID dari kumpulanDataTableKiriKanan:",
        //   purchasePlanDtlID,
        // );
      }
    }
  }

  // 3. Coba dari table kiri DOM berdasarkan vendor-batch
  if (!purchasePlanDtlID && targetRowId) {
    const parts = String(targetRowId).split("-");
    if (parts.length >= 3 && parts[1] === "batch") {
      const vendorId = parts[0];
      const batch = parts[2];

      $(".BigDataTableKiri tbody tr").each(function () {
        const $row = $(this);
        const rowVendorId = $row.find("td:eq(0)").attr("data-vendor-id");
        const rowBatch = $row.find("td:eq(1)").attr("data-batch");

        if (
          String(rowVendorId) === String(vendorId) &&
          String(rowBatch) === String(batch)
        ) {
          const dtlId =
            parseInt($row.attr("data-dtl-id")) ||
            parseInt($row.attr("data-real-dtl-id")) ||
            0;
          if (dtlId > 0) {
            purchasePlanDtlID = dtlId;
            return false; // break loop
          }
        }
      });
    }
  }

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

  // DEDUPLICATE: Hapus duplikat berdasarkan kombinasi unik (notes + percent + alert)
  const seenKeys = new Set();
  const uniqueRows = [];
  for (const r of resultRows) {
    const key = `${r.notes || ""}-${r.percent || 0}-${r.alert || 0}-${r.fromValue || 0}`;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      uniqueRows.push(r);
    }
  }

  const cleanRows = uniqueRows.map((r) => ({
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
    purchasePlanDtlID: Number(purchasePlanDtlID), // Untuk UPDATE
    rowId: targetRowId,
    calcResult: cleanRows,
    isUpdate: true, // Flag untuk backend bahwa ini UPDATE bukan INSERT
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
      "scm/purchasing/purchase_plan_report/update_payment_calc_summary",
    method: "POST",
    dataType: "json",
    contentType: "application/json",
    data: jsonString,
    timeout: 30000,

    beforeSend: function () {
      // console.log("Mengupdate kalkulasi ke server...");
      // console.log("JSON size:", jsonString.length, "chars");
    },

    success: function (res) {
      if (res && res.status === "success") {
        if (typeof onDone === "function") onDone();
      } else {
        alert("Failed saving calculate: " + (res.message || "Unknown"));
      }
    },

    error: function () {
      alert("Failed saving payment calculation");
      if (typeof onDone === "function") onDone();
    },
  });
}
function filterRelatedItemsEntry(vendorId, batch, shipmentDate) {
  // Gunakan sumber data yang aktif (bisa dari Edit maupun Entry)
  const middleSource =
    (Array.isArray(window.tableTengahEditData) &&
      window.tableTengahEditData.length > 0 &&
      window.tableTengahEditData) ||
    (Array.isArray(window.tableTengahData) &&
      window.tableTengahData.length > 0 &&
      window.tableTengahData) ||
    [];

  if (middleSource.length === 0) {
    console.error("Tidak ada sumber data tabel tengah yang valid!");
    return [];
  }

  // Filter fleksibel berdasarkan vendor, batch, dan shipmentDate
  const filtered = middleSource.filter((item) => {
    const sameVendor =
      String(item.vendor || item.vendorId) === String(vendorId);
    const sameBatch = String(item.batch) === String(batch);
    const sameShip =
      String(item.shipmentDate).split("T")[0] === String(shipmentDate);
    return sameVendor && sameBatch && sameShip;
  });

  // Hapus duplikat berdasarkan itemCode + shipmentDate
  const seen = new Set();
  const unique = filtered.filter((item) => {
    const key = `${item.itemCode || "unknown"}-${item.shipmentDate || "unknown"}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return unique;
}
//  FILTER UNTUK HALAMAN EDIT - DENGAN DEDUPLICATION
function filterRelatedItemsEdit(vendorId, batch, shipmentDate) {
  if (!Array.isArray(tableTengahEditData)) return [];

  // Filter berdasarkan vendor, batch, dan shipmentDate
  const filtered = tableTengahEditData.filter((item) => {
    const sameVendor = String(item.vendor) === String(vendorId);
    const sameBatch = String(item.batch) === String(batch);
    const sameShipment =
      !batch && item.shipmentDate && item.shipmentDate === shipmentDate;
    return sameVendor && (sameBatch || sameShipment);
  });

  const seen = new Set();
  return filtered.filter((item) => {
    const key = `${item.itemCode || "unknown"}-${item.shipmentDate || "unknown"}`;
    if (seen.has(key)) {
      return false; // Lewati jika sudah pernah ada
    }
    seen.add(key);
    return true;
  });
}
function getAlertName(alertId) {
  const alertMap = {
    2: "PO",
    3: "Shipment",
    1: "Blanket PO",
  };
  return alertMap[alertId] || "Unknown";
}

function loadCalcDataFromDB(purchasePlanID, groupKey) {
  return $.ajax({
    url: BASE_URL + "scm/purchasing/purchase_plan_report/get_payment_calc_data",
    type: "GET",
    dataType: "json",
    data: {
      purchasePlanID: purchasePlanID,
      groupKey: groupKey,
    },
  })
    .done(function (response) {
      if (
        response.status === "success" &&
        response.data &&
        response.data.length > 0
      ) {
        // Deduplikasi sebelum simpan ke cache
        const cleanData = deduplicatePaymentCalcData(response.data);
        savedCalcDataFromDB[groupKey] = cleanData;
        return cleanData;
      } else {
        savedCalcDataFromDB[groupKey] = null;
        return null;
      }
    })
    .fail(function (xhr, status, error) {
      console.error("Error loadCalcDataFromDB:", error);
      console.error("Response:", xhr.responseText);
      return null;
    });
}

function loadAllCalcDataFromDB(purchasePlanID) {
  return $.ajax({
    url: BASE_URL + "scm/purchasing/purchase_plan_report/get_all_payment_calc",
    type: "GET",
    dataType: "json",
    data: {
      purchasePlanID: purchasePlanID,
    },
  })
    .done(function (response) {
      if (response.status === "success" && response.data) {
        // Response bisa berupa object dengan key = groupKey
        // atau array yang perlu di-group

        if (Array.isArray(response.data)) {
          // Jika array, group berdasarkan PurchasePlanDtlID atau groupKey
          response.data.forEach(function (item) {
            const key =
              item.groupKey ||
              `dtl-${item.PurchasePlanDtlID}` ||
              `${item.VendorID}-batch-${item.Batch}`;

            if (!savedCalcDataFromDB[key]) {
              savedCalcDataFromDB[key] = [];
            }
            savedCalcDataFromDB[key].push(item);
          });
        } else {
          // Jika sudah object, langsung assign
          savedCalcDataFromDB = response.data;
        }

        // Deduplikasi setiap group setelah loading
        Object.keys(savedCalcDataFromDB).forEach(function (key) {
          if (Array.isArray(savedCalcDataFromDB[key])) {
            savedCalcDataFromDB[key] = deduplicatePaymentCalcData(
              savedCalcDataFromDB[key],
            );
          }
        });
        return savedCalcDataFromDB;
      } else {
        return {};
      }
    })
    .fail(function (xhr, status, error) {
      console.error("Error loadAllCalcDataFromDB:", error);
      return {};
    });
}

function hasCalcDataInCache(groupKey) {
  return (
    savedCalcDataFromDB[groupKey] &&
    Array.isArray(savedCalcDataFromDB[groupKey]) &&
    savedCalcDataFromDB[groupKey].length > 0
  );
}

function getCalcDataFromCache(groupKey) {
  return savedCalcDataFromDB[groupKey] || null;
}
function markCalcAsChanged() {
  hasCalcChanges = true;
}
function resetCalcChanges() {
  hasCalcChanges = false;
}
function hasCalcBeenChanged() {
  return hasCalcChanges;
}

function renderTableKananCalc(data) {
  const tbody = $("#tableKananCalcBody");
  tbody.empty();

  // Jika tidak ada data DB dan tidak ada commitPaymentChanges -> tampilkan empty
  const localChanges = Array.isArray(window.commitPaymentChanges)
    ? window.commitPaymentChanges
    : [];

  if ((!data || data.length === 0) && localChanges.length === 0) {
    tbody.append(
      '<tr><td colspan="6" style="text-align:center; color:#999;">No calculation data</td></tr>',
    );
    // reset totals
    $("#totalPersenCalc").text("0%");
    $("#totalPaymentCalc").text("0.00");
    $("#totalPersenCalc").css("color", "").css("font-weight", "");
    return;
  }

  // --- Build lookup dari DB berdasarkan tempRowId / PurchasePlanDtlID agar bisa dicocokkan dengan local
  const dbByTemp = {};
  const dbByDtlId = {};
  (data || []).forEach((it) => {
    if (it.tempRowId) dbByTemp[String(it.tempRowId)] = it;
    if (it.PurchasePlanDtlID || it.purchasePlanDtlID || it.dtlId) {
      const id =
        it.PurchasePlanDtlID ||
        it.purchasePlanDtlID ||
        it.dtlId ||
        it.PurchasePlanDtlId;
      if (id) dbByDtlId[String(id)] = it;
    }
  });

  // --- Flatten local payments with parent metadata (fix: always carry tempRowId)
  const localPayments = [];
  localChanges.forEach((entry) => {
    const tempRowId =
      entry.tempRowId || entry.TempRowId || entry.temp_id || null;
    const parentDtlId =
      entry.purchasePlanDtlID ||
      entry.PurchasePlanDtlID ||
      entry.purchasePlanDtlId ||
      null;

    if (Array.isArray(entry.payments)) {
      entry.payments.forEach((p) => {
        localPayments.push({
          ...p,
          _parentTempRowId: tempRowId || p.tempRowId || null, // <-- fix penting
          _parentDtlId:
            parentDtlId || p.PurchasePlanDtlID || p.purchasePlanDtlID || null,
        });
      });
    }
  });

  const merged = [];

  // Helper map to mark which local payments already consumed (so we can append any extra)
  const consumedLocalIndexes = new Set();

  (data || []).forEach((it, idx) => {
    const temp = it.tempRowId ? String(it.tempRowId) : null;
    const dtl =
      it.PurchasePlanDtlID || it.purchasePlanDtlID || it.dtlId || null;

    // find local payments that target this row (match by tempRowId or by PurchasePlanDtlID)
    const localsForThis = localPayments.filter((lp, i) => {
      const matchByTemp = temp && String(lp._parentTempRowId) === String(temp);
      const matchByDtl = dtl && String(lp._parentDtlId) === String(dtl);
      if (matchByTemp || matchByDtl) {
        consumedLocalIndexes.add(i);
        return true;
      }
      return false;
    });

    if (localsForThis.length > 0) {
      // Use local payments to build the group's rows (override percent/notes/fromValue).
      localsForThis.forEach((lp) => {
        let paymentValue = 0;
        if (lp.Payment != null) {
          paymentValue = Number(lp.Payment) || 0;
        } else if (lp.payment != null) {
          paymentValue = Number(lp.payment) || 0;
        } else if (it.payment != null) {
          // Heuristic: scale DB payment by percent ratio if DB had a percent value
          const dbPercent = Number(it.percent) || 100;
          const lpPercent = Number(lp.Percent || lp.percent || 0);
          if (dbPercent > 0) {
            paymentValue =
              Number(it.payment || 0) * (lpPercent / dbPercent) || 0;
          } else {
            paymentValue = 0;
          }
        } else {
          paymentValue = 0; // unknown nominal
        }

        merged.push({
          paymentDate: lp.paymentDate || it.paymentDate || null,
          alertName: lp.Alert || it.alertName || lp.alertName || "No Alert",
          notes: lp.Notes || it.notes || "",
          fromValue: Number(lp.FromValue || lp.fromValue || it.fromValue || 1),
          fromValueName:
            lp.FromValueName ||
            lp.fromValueName ||
            (Number(lp.FromValue || lp.fromValue || it.fromValue || 1) === 1
              ? "Vendor"
              : "Item"),
          percent: Number(lp.Percent || lp.percent || 0),
          payment: Number(paymentValue),
          tempRowId: lp._parentTempRowId || temp || null,
        });
      });
    } else {
      // No local override: use DB item as-is (normalize field names)
      merged.push({
        paymentDate: it.paymentDate || it.paymentDate || null,
        alertName: it.alertName || it.Alert || "No Alert",
        notes: it.notes || it.Notes || "",
        fromValue: Number(it.fromValue || it.FromValue || 1),
        fromValueName:
          it.fromValueName ||
          it.FromValueName ||
          (Number(it.fromValue || it.FromValue || 1) === 1 ? "Vendor" : "Item"),
        percent: Number(it.percent || it.Percent || 0),
        payment: Number(it.payment || it.Payment || 0),
        tempRowId: temp,
      });
    }
  });

  // 2) Append any local payments that didn't match any DB row (new entries)
  localPayments.forEach((lp, idx) => {
    if (consumedLocalIndexes.has(idx)) return; // already used
    const paymentValue = Number(lp.Payment || lp.payment || 0);

    merged.push({
      alertName: lp.Alert || lp.alertName || "No Alert",
      notes: lp.Notes || lp.notes || "",
      fromValue: Number(lp.FromValue || lp.fromValue || 1),
      fromValueName:
        lp.FromValueName ||
        lp.fromValueName ||
        (Number(lp.FromValue || lp.fromValue || 1) === 1 ? "Vendor" : "Item"),
      percent: Number(lp.Percent || lp.percent || 0),
      payment: paymentValue,
      tempRowId:
        lp._parentTempRowId ||
        lp.tempRowId ||
        lp._parentDtlId ||
        "temp-" + Date.now(), // <--- fallback agar ga null
    });
  });

  // --- Sekarang proses merged array untuk render (logika grouping & partial sama seperti original)
  let totalPersen = 0;
  let totalPayment = 0;
  let currentAlert = null;

  merged.forEach((item, index) => {
    const isNewGroup = currentAlert !== item.alertName;
    currentAlert = item.alertName;

    const row = `
      <tr ${isNewGroup && index > 0 ? 'style="border-top: 2px solid #007bff;"' : ""}>
        <td>${item.paymentDate}</td>
        <td>${item.alertName}</td>
        <td class="notes-col" style="padding:8px;">
          ${item.notes || "-"}
        </td>
        <td style="padding: 8px; text-align:left;">
          <span class="badge-fromvalue" style="background:${item.fromValue === 1 ? "#28a745" : "#ffc107"}; color:#fff; padding:3px 8px; border-radius:8px; font-size:11px;">
            ${item.fromValueName}
          </span>
        </td>
        <td style="text-align:right; font-weight:bold; padding: 8px;">${item.percent}%</td>
        <td style="text-align:right; font-weight:bold; padding: 8px;">${Number(
          item.payment,
        ).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}</td>
      </tr>
    `;
    tbody.append(row);

    // Hitung total percent (sama aturan seperti sebelumnya)
    if (item.fromValue === 1) {
      totalPersen += item.percent;
    } else if (item.fromValue === 2) {
      // gunakan notes grouping rule yang sama (heuristic)
      const groupKey = `${item.notes.split(" (Item")[0]}-${index}`;
      const prevItem = merged[index - 1];

      if (
        !prevItem ||
        prevItem.notes.split(" (Item")[0] !== item.notes.split(" (Item")[0]
      ) {
        totalPersen += item.percent;
      }
    }

    totalPayment += Number(item.payment);
  });

  // Render total ke footer
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
      .css("font-weight", "bold")
      .attr("title", " Total harus 100%!");
  } else {
    $("#totalPersenCalc").css("color", "green").css("font-weight", "bold");
  }
}

function getAlertColor(alertId) {
  const colorMap = {
    1: "#6c757d", // Blanket PO - Gray
    2: "#007bff", // PO - Blue
    3: "#28a745", // Shipment - Green
  };
  return colorMap[alertId] || "#6c757d";
}
// === EVENT: klik baris di tabel tengah ===
$(document).on("click", ".BigDataTableTengah tbody tr", function () {
  selectedShipmentRow = $(this);

  const shipmentId = $(this).data("shipmentid") || $(this).data("shipment-id");

  // console.log(" Baris shipment dipilih:", shipmentId);
});

$(document).on("change", ".termDaysTableKanan", function () {
  const $rowKanan = $(this).closest("tr");
  const $tbodyKanan = $rowKanan.closest("tbody");
  const termDays = parseInt($(this).val(), 10) || 0;

  const paymentId =
    $rowKanan.attr("data-payment-id") || $rowKanan.data("payment-id");
  // console.log("Ubah PaymentID:", paymentId);

  const info = getShipmentInfoForPaymentRow($rowKanan);
  let shipmentDateStr = info.shipmentDateStr;
  let shipmentId = info.shipmentId;

  if (!shipmentId) {
    const $targetShipmentRow =
      info.shipmentRow && info.shipmentRow.length
        ? info.shipmentRow
        : $(".BigDataTableTengah tbody tr:last");
    const tempShipmentId =
      $targetShipmentRow.attr("data-shipment-id") ||
      $targetShipmentRow.attr("data-shipmentid") ||
      `temp-shipment-${Date.now()}`;
    $rowKanan
      .attr("data-shipment-id", tempShipmentId)
      .data("shipment-id", tempShipmentId);
    shipmentId = tempShipmentId;

    if (!shipmentDateStr && $targetShipmentRow && $targetShipmentRow.length) {
      shipmentDateStr =
        $targetShipmentRow.find(".shipmentDateColumn").val() ||
        $targetShipmentRow.find(".shipmentDateColumn").text().trim();
    }
  }

  if (!shipmentDateStr) {
    console.warn(
      "ShipmentDate tidak ditemukan untuk row kanan (shipmentId:",
      shipmentId,
      ")",
    );
    return;
  }

  // hitung paymentDate
  const shipmentDate = new Date(shipmentDateStr);
  const paymentDate = new Date(shipmentDate);
  paymentDate.setDate(paymentDate.getDate() + termDays);

  // validasi terhadap row sebelumnya
  const rowIndex = $tbodyKanan.find("tr").index($rowKanan);

  const paymentDateStr = paymentDate.toISOString().split("T")[0];
  $rowKanan.find(".paymentDateTableKanan").val(paymentDateStr);

  validateSubsequentPaymentDates($rowKanan, rowIndex);

  //  Tambahkan ini supaya data masuk ke kumpulanDataTableKiriKanan
  commitPaymentChangesFromRow($rowKanan);
});

// Fungsi helper untuk validasi ke bawah (chain check)
function validateSubsequentPaymentDates($currentRow, currentIndex) {
  const $tableKanan = $currentRow.closest("tbody");
  const $allRowsKanan = $tableKanan.find("tr");

  for (let i = currentIndex + 1; i < $allRowsKanan.length; i++) {
    const $currentRowKanan = $allRowsKanan.eq(i);
    const $prevRowKanan = $allRowsKanan.eq(i - 1);

    const currentPaymentDateStr = $currentRowKanan
      .find(".paymentDateTableKanan")
      .val();
    const prevPaymentDateStr = $prevRowKanan
      .find(".paymentDateTableKanan")
      .val();

    if (currentPaymentDateStr && prevPaymentDateStr) {
      const currentPaymentDate = new Date(currentPaymentDateStr);
      const prevPaymentDate = new Date(prevPaymentDateStr);

      if (currentPaymentDate < prevPaymentDate) {
        const adjustedDateStr = prevPaymentDate.toISOString().split("T")[0];
        $currentRowKanan.find(".paymentDateTableKanan").val(adjustedDateStr);
      }
    }
  }
}

// Fungsi untuk ambil parameter ID dari URL
function getPurchasePlanIdFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("id"); // ambil ?id=...
}

function formatDate(dateString) {
  if (!dateString) return "";

  const date = new Date(dateString);

  // Check jika tanggal valid
  if (isNaN(date.getTime())) return dateString;

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}-${month}-${year} ${hours}:${minutes}`;
}
// Jalankan saat halaman sudah ready
$(document).ready(function () {
  const purchasePlanID = getPurchasePlanIdFromURL();

  // console.log("PurchasePlanID dari URL:", purchasePlanID);

  // Set ID ke tombol History Edit
  $(".btn-history").attr("data-id", purchasePlanID);

  // Event klik tombol History Edit
  $(document).on("click", ".btn-history", function (e) {
    e.preventDefault();

    const id = $(this).data("id");
    // console.log("ID yang dikirim ke modal:", id);

    if (!id) {
      alert("PurchasePlanID not found.");
      return;
    }

    // Tampilkan modal
    $("#historyModal").modal("show");

    // Destroy existing DataTable jika ada
    if ($.fn.DataTable.isDataTable("#table-detail")) {
      $("#table-detail").DataTable().clear().destroy();
    }

    // Initialize DataTable
    $("#table-detail").DataTable({
      ajax: {
        url:
          BASE_URL + "scm/purchasing/purchase_plan_report/get_shipment_modal",
        type: "POST",
        dataSrc: function (json) {
          // console.log("Response dari server:", json);

          // Coba berbagai format response
          if (json.data && json.data.shipment_history) {
            return json.data.shipment_history;
          }

          if (json.data && json.data.shipment) {
            return json.data.shipment;
          }

          // Kalau backend langsung kirim array
          if (Array.isArray(json)) {
            return json;
          }

          // Kalau backend langsung kirim data: [...]
          if (Array.isArray(json.data)) {
            return json.data;
          }

          return [];
        },
        data: {
          PurchasePlanID: id,
        },
        error: function (xhr, status, error) {
          console.error("AJAX Error:", error);
          console.error("Status:", status);
          console.error("Response:", xhr.responseText);
          alert("error when load data");
        },
      },
      bInfo: false,
      paging: false,
      searching: false,
      scrollX: true,
      autoWidth: false,

      columns: [
        {
          data: "StartDate",
          defaultContent: "",
          render: function (data, type, row) {
            return formatDate(data);
          },
        },
        {
          data: "EndDate",
          defaultContent: "",
          render: function (data, type, row) {
            return formatDate(data);
          },
        },
        { data: "ShipmentEditedBy", defaultContent: "" },
        {
          data: null,
          defaultContent: "",
          render: function (data, type, row) {
            return (
              '<button class="btn btn-sm btn-primary btn-detail" data-id="' +
              row.ShipmentHistoryID +
              '">Detail</button>'
            );
          },
        },
      ],
      order: [],
      ordering: false,
      language: {
        emptyTable: "Tidak ada data tersedia",
        loadingRecords: "Memuat data...",
        processing: "Sedang memproses...",
      },
      initComplete: function () {
        console.log("DataTable initialized successfully");
      },
    });
  });
});
// Event tombol detail di tabel history
$(document).on("click", ".btn-detail", function () {
  const shipmentHistoryID = $(this).data("id");

  // Tutup modal History dulu
  $("#historyModal").modal("hide");

  $("#historyModal").on("hidden.bs.modal", function () {
    $("#historyModal").off("hidden.bs.modal");

    // Kosongkan tabel dulu
    $("#shipment-plan-table tbody").empty();
    $("#payment-plan-table tbody").empty();

    $.ajax({
      url: BASE_URL + "scm/purchasing/purchase_plan_report/get_shipment_detail",
      type: "POST",
      data: { ShipmentHistoryID: shipmentHistoryID },
      dataType: "json",
      success: function (res) {
        let shipment = res.data?.shipment || [];
        let payment = res.data?.payment || [];

        // Set judul modal
        if (shipment.length > 0) {
          const start = formatDate(shipment[0].StartDate);
          const end = formatDate(shipment[0].EndDate);
          $("#detailModalTitle").text(`History ${start} - ${end}`);
        }

        // Isi Shipment
        shipment.forEach(function (s, i) {
          let formattedPrice =
            s.Price !== undefined && s.Price !== null
              ? new Intl.NumberFormat("en-US", {
                  style: "decimal",
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(s.Price)
              : "-";
          let row = `
            <tr>
              <td class="text-left">${s.ItemCode || "-"}</td>
              <td class="text-left">${s.Vendor || "-"}</td>
              <td>${s.Color || "-"}</td>
              <td>${s.ShipmentDate || "-"}</td>
              <td style="text-align: right;">${s.WW || "-"}</td>
              <td class="text-right">${s.Qty || "-"}</td>
              <td class="text-right">${formattedPrice || "-"}</td>
            </tr>`;
          $("#shipment-plan-table tbody").append(row);
        });

        // Isi Payment
        payment.forEach(function (p, i) {
          let formattedOACredit =
            p.OACredit !== undefined && p.OACredit !== null
              ? new Intl.NumberFormat("en-US", {
                  style: "decimal",
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }).format(p.OACredit)
              : "-";
          let row = `
            <tr>
              <td>${p.PaymentDate || "-"}</td>
              <td>${p.Notes || "-"}</td>
              <td class="text-right">${p.Percentage || "-"}</td>
              <td>${p.FromValue === 1 ? "Per Batch" : p.FromValue === 2 ? "Partial" : "-"}</td>
              <td>${p.Alert === 1 ? "Blanket PO" : p.Alert === 2 ? "PO" : p.Alert === 3 ? "Shipment" : "-"}</td>
              <td class="text-right">${p.Term || "-"}</td>
              <td class="text-right">${formattedOACredit || "-"}</td>
            </tr>`;
          $("#payment-plan-table tbody").append(row);
        });

        $("#detailModal").modal("show");
      },
      error: function (xhr, status, error) {
        console.error(" Error load detail:", error);
        console.error(" Response text:", xhr.responseText);
        alert("error when load detail shipment");
      },
    });
  });
});

// onchange table tengah
$(document).on("change", ".itemSelectColumn", function () {
  const $selectElement = $(this);
  const $currentRow = $selectElement.closest("tr");
  const rowIndex = $currentRow.index();

  const selectedId = $selectElement.val();
  const selectedOption = $selectElement.find(":selected");

  const itemUnitId = parseInt(selectedOption.data("itemunitid"), 10) || 0;
  const unitName = selectedOption.data("unitname") || "";
  const selectedText = selectedOption.text().trim();
  const itemCodeText = selectedOption.data("code") || "";

  // PENTING: Mark sebagai ada perubahan agar Calculate menggunakan kalkulasi baru
  if (typeof isInitialLoadComplete !== "undefined" && isInitialLoadComplete) {
    markCalcAsChanged();
  }

  // update ke array
  if (tableTengahEditData[rowIndex]) {
    tableTengahEditData[rowIndex].itemCode = parseInt(selectedId, 10) || 0;
    tableTengahEditData[rowIndex].itemUnitId = itemUnitId;
    tableTengahEditData[rowIndex].unitName = unitName;
    tableTengahEditData[rowIndex].itemCodeText = itemCodeText;
  }

  // update field readonly di kolom unit
  $currentRow.find(".item-unit-field").val(unitName);
  // update hidden field
  $currentRow.find(".itemunitid").val(itemUnitId);

  if (!selectedId || selectedId === "") {
    return; // Jangan fill jika item di-clear
  }

  const currentVendorId = $currentRow.find(".vendorSelectColumn").val();
  if (!currentVendorId) {
    return; // Skip jika vendor belum dipilih
  }

  // Get semua rows di table tengah
  const $allRows = $(".BigDataTableTengah tbody tr");

  $allRows.each(function () {
    const $row = $(this);
    const $rowItemSelect = $row.find(".itemSelectColumn");
    const $rowVendorSelect = $row.find(".vendorSelectColumn");

    // Jangan proses baris yang sedang diedit
    if ($row.is($currentRow)) {
      return; // continue
    }

    // Jika vendor sama
    if ($rowVendorSelect.val() === currentVendorId) {
      // Cek apakah item di baris ini MASIH KOSONG
      const currentItemId = $rowItemSelect.val();

      if (!currentItemId || currentItemId === "" || currentItemId === "0") {
        // FILL item ke baris ini
        $rowItemSelect.val(selectedId).trigger("change");

        // Update unit field juga
        $row.find(".item-unit-field").val(unitName);
        $row.find(".itemunitid").val(itemUnitId);

        console.log(
          `✓ Auto-filled Item ${itemCodeText} to row ${$row.index() + 1}`,
        );
      } else {
        // Item sudah ada, skip
        // console.log(
        //   `⊘ Row ${$row.index() + 1} sudah punya item (${currentItemId}), skip`,
        // );
      }
    }
  });
});

$(document).on("change", ".vendorSelectColumn", function () {
  let $selectElement = $(this);
  let $currentRow = $selectElement.closest("tr");
  let rowIndex = $currentRow.index();
  let selectedId = $selectElement.val();
  let selectedText = $selectElement.find("option:selected").text();

  //  Jangan langsung rebuild, pakai autoRecalculate dengan delay
  clearTimeout(window.vendorChangeRecalcTimer);
  window.vendorChangeRecalcTimer = setTimeout(function () {
    // pengambilanDataTableTengah();
    autoRecalculateTableKiri();
  }, 100);
});
$(document).on("input", ".colorColumn", function () {
  let $inputElement = $(this);
  let $currentRow = $inputElement.closest("tr");
  let rowIndex = $currentRow.index();
  let changedValue = $inputElement.val();
  // pengambilanDataTableTengah();
});

Date.prototype.getWeek = function () {
  var date = new Date(this.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  var week1 = new Date(date.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((date.getTime() - week1.getTime()) / 86400000 -
        3 +
        ((week1.getDay() + 6) % 7)) /
        7,
    )
  );
};

$(document).on("input", ".shipmentDateColumn", function () {
  let $inputElement = $(this);
  let $currentRow = $inputElement.closest("tr");
  let changedValue = $inputElement.val();

  if (changedValue) {
    let dateParts = changedValue.split("-");
    let year = parseInt(dateParts[0]);
    let month = parseInt(dateParts[1]) - 1;
    let day = parseInt(dateParts[2]);

    let dateObject = new Date(year, month, day);

    if (!isNaN(dateObject.getTime())) {
      // Cek validitas tanggal
      let weekNumber = dateObject.getWeek();
      $currentRow.find(".wwColumn").val(weekNumber);

      let rowIndex = $currentRow.data("rowIndex");
      if (rowIndex !== undefined) {
      }
    } else {
      console.warn(`Invalid date entered: ${changedValue}`);
      $currentRow.find(".wwColumn").val("");
    }
  } else {
    $currentRow.find(".wwColumn").val("");
  }
  // pengambilanDataTableTengah();
});

$(document).on("input", ".qtyColumn", function () {
  let $inputElement = $(this);
  let $currentRow = $inputElement.closest("tr");
  let currentTotalQty = 0;
  // update total qty tengah
  $(".BigDataTableTengah .qtyColumn").each(function () {
    let qty = parseInt($(this).val()) || 0;
    currentTotalQty += qty;
  });
  totalQtyTableTengah.val(currentTotalQty);
  totalQtyTableTengah.text(currentTotalQty);
  // pengambilanDataTableTengah();
});

$(document).on("change", ".priceColumn", function () {
  let $inputElement = $(this);

  let currentValue = $inputElement.val();
  let cleanValue = currentValue.replace(/[^0-9.]/g, "");
  let formattedValue = formatToIDR(cleanValue);

  $inputElement.val(formattedValue);

  const $currentRow = $inputElement.closest("tr");
  const currentVendorId = $currentRow.find(".vendorSelectColumn").val();

  if (!currentVendorId) {
    return; // Skip jika vendor belum dipilih
  }

  // Get semua rows di table tengah
  const $allRows = $(".BigDataTableTengah tbody tr");

  $allRows.each(function () {
    const $row = $(this);
    const $rowPriceInput = $row.find(".priceColumn");
    const $rowVendorSelect = $row.find(".vendorSelectColumn");

    // Jangan proses baris yang sedang diedit
    if ($row.is($currentRow)) {
      return; // continue
    }

    // Jika vendor sama
    if ($rowVendorSelect.val() === currentVendorId) {
      // Cek apakah price di baris ini MASIH KOSONG
      const currentPrice = $rowPriceInput.val();

      if (!currentPrice || currentPrice === "" || currentPrice === "0.00") {
        // FILL price ke baris ini dengan format yang sama
        $rowPriceInput.val(formattedValue);

        // Simpan data value asli
        $rowPriceInput.attr("data-value", cleanValue);

        console.log(
          `✓ Auto-filled Price ${formattedValue} to row ${$row.index() + 1}`,
        );
      } else {
        // Price sudah ada, skip
        // console.log(
        //   `⊘ Row ${$row.index() + 1} sudah punya price (${currentPrice}), skip`,
        // );
      }
    }
  });
});
$(document).on("change", ".blanket-est-input", function () {
  const newVal = $(this).val();
  const tr = $(this).closest("tr");
  const rowId = tr.data("rowid");

  if (!rowId) {
    console.warn("rowId tidak ditemukan pada blanket-est-input");
    return;
  }

  // === AMBIL DATA DARI ROW YANG SEDANG DI-EDIT ===
  const purchasePlanDtlID = parseInt(tr.attr("data-dtl-id"), 10);
  const finalKey = `dtl-${purchasePlanDtlID}`;

  let currentPoDateEst = null;

  //  AMBIL PODateEst DARI GLOBAL validTableKiriData
  if (Array.isArray(window.validTableKiriData)) {
    const dataRow = window.validTableKiriData.find(
      (d) =>
        d.PurchasePlanDtlID === purchasePlanDtlID || d._finalKey === finalKey,
    );

    if (dataRow) {
      currentPoDateEst = dataRow.PODateEst;
    }
  }

  // === VALIDASI: Blanket Est tidak boleh lebih dari PO Date Est ===
  if (currentPoDateEst && newVal) {
    const blanketDate = new Date(newVal);
    const poDate = new Date(currentPoDateEst);

    // console.log("[BLANKET VALIDATION] Comparing dates:", {
    //   blanketDate,
    //   poDate,
    //   blanketDateStr: newVal,
    //   poDateEst: currentPoDateEst,
    // });

    // if (blanketDate > poDate) {
    //   const poDateStr = poDate.toISOString().split("T")[0];
    //   alert(
    //     `Blanket Estimated Date cannot be latest than PO Date Est!\n\n` +
    //       `Date select: ${newVal}\n` +
    //       `PO Date Est: ${poDateStr}\n\n` +
    //       `Date will be set to ${poDateStr}`,
    //   );

    //   // Kembalikan ke PO Date Est
    //   $(this).val(poDateStr);

    //   // Update kumpulanDataTableKiriKanan menggunakan finalKey
    //   const targetObj = kumpulanDataTableKiriKanan.find(
    //     (d) =>
    //       d._finalKey === finalKey || d.PurchasePlanDtlID === purchasePlanDtlID,
    //   );
    //   if (targetObj) {
    //     targetObj.BlanketPODateEst = poDateStr; // uppercase untuk display
    //     targetObj.blanketPODateEst = poDateStr; // lowercase untuk kalkulasi
    //     console.log(
    //       "[BLANKET VALIDATION] Updated kumpulanDataTableKiriKanan:",
    //       {
    //         lowercase: targetObj.blanketPODateEst,
    //         uppercase: targetObj.BlanketPODateEst,
    //       },
    //     );
    //   }

    //   // Mark as changed untuk Calculate
    //   if (typeof markCalcAsChanged === "function" && isInitialLoadComplete) {
    //     markCalcAsChanged();
    //   }
    //   if (typeof syncPaymentChangesFromDOM === "function") {
    //     console.log("[BLANKET VALIDATION] Syncing to paymentChanges...");
    //     syncPaymentChangesFromDOM();
    //   }
    //   return;
    // }
  }

  // === Jika validasi lolos, update seperti biasa ===
  const targetObj = kumpulanDataTableKiriKanan.find(
    (d) =>
      d._finalKey === finalKey || d.PurchasePlanDtlID === purchasePlanDtlID,
  );

  if (targetObj) {
    targetObj.BlanketPODateEst = newVal; // uppercase untuk display
    targetObj.blanketPODateEst = newVal; // lowercase untuk kalkulasi
    // console.log("[BLANKET VALIDATION] Updated kumpulanDataTableKiriKanan:", {
    //   lowercase: targetObj.blanketPODateEst,
    //   uppercase: targetObj.BlanketPODateEst,
    // });
  }

  if (typeof markCalcAsChanged === "function" && isInitialLoadComplete) {
    markCalcAsChanged();
  }

  if (typeof syncPaymentChangesFromDOM === "function") {
    syncPaymentChangesFromDOM();
  }
});
$(document).on("change", ".TermDaysColumn", function () {
  const $currentRow = $(this).closest("tr");
  const termDays = parseInt($(this).val(), 10) || 0;

  if (isInitialLoadComplete) {
    markCalcAsChanged();
  }

  const shipmentDateStr = $currentRow.find(".shipmentDateColumn").val();
  if (!shipmentDateStr) return;

  const shipmentDate = new Date(shipmentDateStr);
  const poDateEst = new Date(shipmentDate);

  poDateEst.setDate(poDateEst.getDate() - termDays);
  const poDateEstStr = poDateEst.toISOString().split("T")[0];

  $currentRow.find(".PODateEstColumn").val(poDateEstStr);

  const vendorId =
    parseInt($currentRow.find(".vendorSelectColumn").val(), 10) || 0;
  const batch = parseInt($currentRow.find(".batchColumn").val(), 10) || 0;

  if (!vendorId) return;

  let earliestPoDate = null;

  $("#tableTengah tr").each(function () {
    const $row = $(this);

    const rVendor = parseInt($row.find(".vendorSelectColumn").val(), 10) || 0;
    const rBatch = parseInt($row.find(".batchColumn").val(), 10) || 0;
    const rPoDate = $row.find(".PODateEstColumn").val();

    if (rVendor === vendorId && rBatch === batch && rPoDate) {
      const d = new Date(rPoDate);
      if (!earliestPoDate || d < earliestPoDate) {
        earliestPoDate = d;
      }
    }
  });

  if (!earliestPoDate) return;

  const blanketEstStr = earliestPoDate.toISOString().split("T")[0];

  const rowId =
    batch && batch !== 0
      ? `${vendorId}-batch-${batch}`
      : `${vendorId}-date-${shipmentDateStr}`;

  //  FIX: Try both old format (vendor-batch) and new dtl- format
  let $blanketRow = $(`.BigDataTableKiri tr[data-rowid='${rowId}']`);

  // Jika tidak ketemu dengan vendor-batch format, cari dengan vendor+batch matching
  if (!$blanketRow.length) {
    // Cari row yang punya vendor dan batch yang sesuai (bisa format dtl- atau vendor-batch)
    $blanketRow = $(`.BigDataTableKiri tbody tr`).filter(function () {
      const $row = $(this);
      const $vendorCell = $row.find("td:eq(0)");
      const $batchCell = $row.find("td:eq(1)");

      const rowVendorId = $vendorCell.attr("data-vendor-id");
      const rowBatch = $batchCell.attr("data-batch");

      return rowVendorId == vendorId && rowBatch == batch;
    });
  }

  if ($blanketRow.length) {
    const $blanketInput = $blanketRow.find(".blanket-est-input");

    if ($blanketInput.length) {
      $blanketInput.val(blanketEstStr).trigger("change");

      //  SYNC KE BUTTON
      const $button = $blanketRow.find(".view-summary-details-btn");

      if ($button.length) {
        $button
          .attr("data-blanket-po-date-est", blanketEstStr)
          .data("blanket-po-date-est", blanketEstStr);

        // console.log(
        //   "%c[SYNC BLANKET → BUTTON]",
        //   "color: green; font-weight: bold",
        //   blanketEstStr,
        // );
      }

      //  SYNC KE kumpulanDataTableKiriKanan (array global)
      if (Array.isArray(window.kumpulanDataTableKiriKanan)) {
        window.kumpulanDataTableKiriKanan.forEach((obj) => {
          // Match by rowId atau groupKey
          if (
            obj.rowId === rowId ||
            (obj.groupKey &&
              obj.groupKey.includes(`dtl-`) &&
              obj.vendorId === vendorId &&
              obj.batch === batch)
          ) {
            obj.blanketPODateEst = blanketEstStr;
            // console.log(
            //   "%c[SYNC BLANKET → kumpulanDataTableKiriKanan]",
            //   "color: blue; font-weight: bold",
            //   {
            //     rowId: obj.rowId,
            //     groupKey: obj.groupKey,
            //     blanketPODateEst: blanketEstStr,
            //   },
            // );
          }
        });
      }
    }
  } else {
    // console.log(
    //   "%c[TERM DAYS → BLANKET NOT FOUND]",
    //   "color: red; font-weight: bold",
    //   { termDays, vendorId, batch, rowId },
    // );
  }
});

function formatToIDR(va) {
  let numberValue = parseFloat(va);
  if (isNaN(numberValue)) {
    return "0.00";
  }

  let formattedNumber = numberValue.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formattedNumber;
}

$(document).on("input", ".PODateEstColumn", function () {
  let $inputElement = $(this);
  let $currentRow = $inputElement.closest("tr");
  let rowIndex = $currentRow.index();
  let changedValue = $inputElement.val();
  // pengambilanDataTableTengah();
});
$(document).on("input", ".TermDaysColumn", function () {
  let $inputElement = $(this);
  let $currentRow = $inputElement.closest("tr");
  let rowIndex = $currentRow.index();
  let changedValue = $inputElement.val();
  // pengambilanDataTableTengah();
});

function autoSavePaymentBeforeBatchChange(vendorId, oldBatch, newBatch) {
  // Cari payment group untuk batch lama pada vendor ini
  const groupWithOldBatch = kumpulanDataTableKiriKanan.find(
    (g) =>
      String(g.vendorId) === String(vendorId) &&
      (oldBatch && oldBatch !== "0"
        ? String(g.batch) === String(oldBatch)
        : !g.batch || g.batch === "0" || g.batch === 0),
  );

  if (!groupWithOldBatch) return; // tidak ada payment data untuk batch lama

  if (
    !groupWithOldBatch.paymentIds ||
    groupWithOldBatch.paymentIds.length === 0
  ) {
    return;
  }

  const oldBatchDtlId = groupWithOldBatch.purchasePlanDtlId;
  if (!oldBatchDtlId || oldBatchDtlId === 0) {
    console.warn(
      "autoSavePaymentBeforeBatchChange: DTL ID batch lama tidak ditemukan, auto-save dibatalkan",
    );
    return;
  }

  const paymentRowsToSave = groupWithOldBatch.paymentIds.map(
    (paymentId, i) => ({
      PaymentID: paymentId || 0,
      PurchasePlanDtlID: oldBatchDtlId, // gunakan DTL ID batch lama, bukan yang baru
      Notes: groupWithOldBatch.notes?.[i] ?? null,
      Percent: groupWithOldBatch.percent?.[i] ?? null,
      FromValue: groupWithOldBatch.formValue?.[i] ?? null,
      Alert: groupWithOldBatch.alert?.[i] ?? null,
      Term: groupWithOldBatch.termDays?.[i] ?? null,
      OACredit: groupWithOldBatch.OACredit?.[i] ?? null,
      PaymentDate: groupWithOldBatch.paymentDate?.[i] ?? null,
    }),
  );

  if (paymentRowsToSave.length === 0) return;

  $.ajax({
    url: BASE_URL + "scm/purchasing/purchase_plan_report/updateTableKanan",
    type: "POST",
    data: JSON.stringify({
      payments: paymentRowsToSave,
      mapping: {},
      mappingShipment: {},
      purchasePlanID: dbtPurchasePlan_ID,
      autoSave: true,
      isAutoSaveBeforeBatchChange: true,
    }),
    contentType: "application/json; charset=utf-8",
    dataType: "json",
    success: function (response) {
      if (response.status !== "success") {
        console.warn(
          "Auto-save payment sebelum ganti batch gagal:",
          response.message || "Unknown error",
        );
      }
    },
    error: function (xhr, status, error) {
      console.error(
        "Auto-save payment sebelum ganti batch error:",
        status,
        error,
        xhr.responseText,
      );
    },
  });
}

$(document).on("blur", ".batchColumn", function () {
  let $inputElement = $(this);
  let $currentRow = $inputElement.closest("tr");
  let rowIndex = $currentRow.index();

  let oldBatchValue = parseInt($inputElement.attr("data-old-value")) || 0;
  let changedBatchValue = parseInt($inputElement.val()) || 0;
  let currentVendorId = $currentRow.find(".vendorSelectColumn").val();

  // Save the new batch value for future reference
  $inputElement.attr("data-old-value", changedBatchValue);

  if (oldBatchValue !== changedBatchValue && currentVendorId) {
    autoSavePaymentBeforeBatchChange(
      currentVendorId,
      oldBatchValue,
      changedBatchValue,
    );
  }

  let currentRowId =
    $currentRow.attr("data-rowid") ||
    $currentRow.data("rowid") ||
    $currentRow.attr("data-id") ||
    $currentRow.data("id") ||
    $currentRow.attr("data-dtl-id") ||
    $currentRow.data("dtl-id") ||
    $currentRow.attr("data-shipment-id") ||
    $currentRow.data("shipment-id");

  if (!Array.isArray(window.tableTengahEditData))
    window.tableTengahEditData = [];

  let foundCurrent = window.tableTengahEditData.find(
    (r) =>
      String(r.rowId) === String(currentRowId) ||
      String(r.ID) === String(currentRowId),
  );

  if (foundCurrent) {
    foundCurrent.batch = changedBatchValue;
    foundCurrent.PurchasePlanDtlID = null;
    foundCurrent.purchasePlanDtlId = null;

    if (window.vendorBatchToIdMap) {
      const newBatchKey = `${currentVendorId}-batch-${changedBatchValue}`;
      if (vendorBatchToIdMap[newBatchKey]) {
        delete vendorBatchToIdMap[newBatchKey];
      }
    }
  } else {
    let original = window.tableTengahData.find(
      (r) =>
        String(r.ID) === String(currentRowId) ||
        String(r.rowId) === String(currentRowId),
    );

    if (original) {
      let clone = { ...original, batch: changedBatchValue };
      // CLEAR PurchasePlanDtlID dari clone juga!
      clone.PurchasePlanDtlID = null;
      clone.purchasePlanDtlId = null;
      window.tableTengahEditData.push(clone);

      if (window.vendorBatchToIdMap) {
        const newBatchKey = `${currentVendorId}-batch-${changedBatchValue}`;
        if (vendorBatchToIdMap[newBatchKey]) {
          delete vendorBatchToIdMap[newBatchKey];
        }
      }
    }
  }

  const oldDtlId = $currentRow.attr("data-dtl-id");
  if (oldDtlId && oldDtlId > 0) {
    $currentRow.attr("data-dtl-id", "0");
    $currentRow.removeAttr("data-dtl-id");
  }

  if (typeof window.syncTableTengahFromDOM === "function") {
    window.syncTableTengahFromDOM();
  }
  autoRecalculateTableKiri();
});

$(document).on("click", ".remove-row-icon", function () {
  ctrNoUrut -= 1;
  let $rowToRemove = $(this).closest("tr");

  let shipmentID = parseInt($rowToRemove.attr("data-shipment-id")) || 0;
  let dtlID =
    parseInt(
      $rowToRemove.attr("data-dtl-id") || $rowToRemove.attr("data-real-dtl-id"),
    ) || 0;
  let tempRowId = $rowToRemove.attr("data-temp-rowid") || null;

  // Hanya track jika ShipmentID sudah ada (bukan row baru yang belum disimpan)
  if (shipmentID > 0) {
    if (!deletedShipmentIDs.includes(shipmentID)) {
      deletedShipmentIDs.push(shipmentID);
    }
  }

  // Track DtlID jika ada dan valid
  if (dtlID > 0) {
    if (!deletedDtlIDs.includes(dtlID)) {
      deletedDtlIDs.push(dtlID);
    }
  }

  $rowToRemove.remove();

  let currentTotalQty = 0;
  $(".BigDataTableTengah tbody .qtyColumn").each(function () {
    let qty = parseInt($(this).val()) || 0;
    currentTotalQty += qty;
  });

  $("#total-qty-main").val(currentTotalQty);
  $("#total-qty-main").text(currentTotalQty);

  autoRecalculateTableKiri();
});

$(document).on("select2:open", function () {
  setTimeout(function () {
    document
      .querySelector(".select2-container--open .select2-search__field")
      .focus();
  }, 0);
});

// fungsi tambah row table tengah (untuk addline table tengah)
function tambahRowTableTengah() {
  var tbody = $(".BigDataTableTengah tbody");

  // Pastikan array global ada
  if (!window.tableTengahEditData) window.tableTengahEditData = [];

  ctrNoUrut++;
  var newRowId = "temp-" + ctrNoUrut;

  var newRowHtml =
    '<tr data-rowid="' +
    newRowId +
    '" data-shipment-id="" data-is-new="true">' +
    "   <td class='column-no' style='width: 5%; text-align:center;'>" +
    ctrNoUrut +
    "</td>" +
    "   <td><select class='form-control form-control-sm itemSelectColumn' style='width:100%;'></select></td>" +
    "   <td>" +
    "       <input type='hidden' class='itemunitid' value='0'>" + // <== tambahkan ini
    "       <input type='text' class='form-control form-control-sm item-unit-field' readonly>" +
    "   </td>" +
    "   <td><select class='form-control form-control-sm vendorSelectColumn' style='width:100%;'></select></td>" +
    "   <td><select class='form-control form-control-sm colorColumn' style='width:100%;'></select></td>" +
    "   <td ><select class='form-control form-control-sm shipment-year-field'  style='width:100%;'></select></td>" +
    "   <td ><select class='form-control form-control-sm wwColumn'></select></td>" +
    "   <td><input type='date' class='form-control form-control-sm shipmentDateColumn ' readonly></td>" +
    "   <td><input type='text' class='form-control form-control-sm text-right qtyColumn' placeholder='0' min='0'></td>" +
    "   <td><input type='text' class='form-control form-control-sm text-right priceColumn' style='width:115px;' placeholder='0' min='0'></td>" +
    "   <td><input type='number' class='form-control form-control-sm TermDaysColumn'></td>" +
    "   <td><input type='date' class='form-control form-control-sm PODateEstColumn'></td>" +
    "   <td><input type='number' class='form-control form-control-sm batchColumn' placeholder='Batch'></td>" +
    "   <td class='column-action-icon'><i class='glyphicon glyphicon-trash remove-row-icon' style='cursor: pointer; color: black;'></i></td>" +
    "</tr>";

  tbody.append(newRowHtml);

  const $lastRow = tbody.find("tr:last");
  renderYearDropdown($lastRow.find(".shipment-year-field"));
  renderWWDropdown($lastRow.find(".wwColumn"));

  const $itemSelect = $lastRow.find(".itemSelectColumn");
  const itemId = 0;
  const itemCodeText = "";

  $itemSelect.select2({
    ajax: {
      url: BASE_URL + "scm/purchasing/purchase_plan_report/get_item_list",
      dataType: "json",
      delay: 300,
      data: function (params) {
        return { search: params.term };
      },
      processResults: function (data) {
        return {
          results: data.map((item) => ({
            id: item.id,
            text: item.code + " - " + item.description,
            itemunitid: item.itemunitid,
            unitname: item.unitname,
            code: item.code,
          })),
        };
      },
    },
    templateSelection: function (data) {
      if (data.element) {
        $(data.element)
          .attr("data-itemunitid", data.itemunitid)
          .attr("data-unitname", data.unitname)
          .attr("data-code", data.code);
      }
      return data.text;
    },
    placeholder: "-- Pilih Item --",
    minimumInputLength: 1,
  });

  $lastRow.find(".vendorSelectColumn").select2({
    ajax: {
      url: BASE_URL + "scm/purchasing/purchase_order_plan/get_vendor_search",
      type: "POST",
      dataType: "json",
      delay: 300,
      data: function (params) {
        return { q: params.term || "", page: params.page || 1 };
      },
      processResults: function (data, params) {
        params.page = params.page || 1;
        return {
          results: data.results || [],
          pagination: data.pagination || { more: false },
        };
      },
    },
    placeholder: "-- Pilih Vendor --",
    minimumInputLength: 0,
  });

  $lastRow
    .find(".colorColumn")
    .html(colorOptionsHTML)
    .select2({
      placeholder: "-- Pilih Warna --",
      tags: true,
      createTag: function (params) {
        const term = $.trim(params.term);
        if (term === "") return null;
        return { id: "__new__" + term, text: term, newOption: true };
      },
      templateResult: function (data) {
        if (data.newOption)
          return $("<span>Add New: <b>" + data.text + "</b></span>");
        return data.text;
      },
    });

  $lastRow.find(".shipment-year-field").html(yearOptionsHTML).select2({
    placeholder: "-- Pilih Tahun --",
  });
  $lastRow
    .find(".wwColumn")
    .html('<option value="">-- Pilih WW --</option>')
    .select2({
      placeholder: "-- Pilih WW --",
    });

  // === Tambahkan ke array ===
  const newRowData = {
    rowId: newRowId,
    shipmentId: null,
    no: ctrNoUrut,
    itemCode: 0,
    itemCodeText: itemCodeText,
    unit: "",
    vendor: 0,
    color: "",
    shipmentDate: null,
    qty: 0,
    price: 0,
    poDateEst: null,
    termDays: 0,
    batch: 0,
  };
  window.tableTengahEditData.push(newRowData);

  console.log(" Row baru ditambahkan:", newRowData);
  console.log(" Data terkini tableTengahEditData:", window.tableTengahEditData);

  // === Listener perubahan setiap input ===
  $lastRow.find("input, select").on("change", function () {
    const $tr = $(this).closest("tr");
    const rowId = $tr.data("rowid");
    const index = window.tableTengahEditData.findIndex(
      (r) => r.rowId === rowId,
    );
    if (index === -1) return;

    // Update data di array sesuai isi terbaru
    window.tableTengahEditData[index] = {
      ...window.tableTengahEditData[index],
      itemCode: $tr.find(".itemSelectColumn").val(),
      vendor: $tr.find(".vendorSelectColumn").val(),
      color: $tr.find(".colorColumn").val(),
      shipmentDate: $tr.find(".shipmentDateColumn").val(),
      qty: parseInt($tr.find(".qtyColumn").val()) || 0,
      price:
        parseFloat(
          ($tr.find(".priceColumn").val() || "").replace(/[^0-9.-]+/g, ""),
        ) || 0,
      poDateEst: $tr.find(".PODateEstColumn").val(),
      termDays: parseInt($tr.find(".TermDaysColumn").val()) || 0,
      batch: parseInt($tr.find(".batchColumn").val()) || 0,
    };

    console.log("Row diperbarui:", window.tableTengahEditData[index]);
    console.log("Semua data:", window.tableTengahEditData);
  });

  // Update summary kiri/payment

  autoRecalculateTableKiri();
}

function updateDuplicateButtonVisibility() {
  const $button = $("#duplicateLineTableTengah");

  // Validasi: qty, vendor, dan shipmentDate minimal harus ada
  const lastRow = tableTengahEditData[tableTengahEditData.length - 1];
  const isComplete =
    lastRow &&
    lastRow.qty &&
    lastRow.qty != 0 &&
    lastRow.vendor &&
    lastRow.vendor != 0 &&
    lastRow.shipmentDate;

  // $button.css("display", isComplete ? "inline-block" : "none");
}

// Duplicate button handler
$("#duplicateLineTableTengah").click(function () {
  if (!tableTengahEditData || tableTengahEditData.length === 0) {
    alert("No data to duplicate.");
    return;
  }

  const lastRowData = tableTengahEditData[tableTengahEditData.length - 1];
  console.log(lastRowData);
  if (!lastRowData || !lastRowData.qty || !lastRowData.shipmentDate) {
    alert(
      "Please fill all required fields in the current line before duplicating!",
    );
    return;
  }

  duplicateLastRowNative();
});

updateDuplicateButtonVisibility();

// Fungsi duplicate - Native untuk halaman edit
function duplicateLastRowNative() {
  // console.log("=== DUPLICATE ROW START (NATIVE) ===");
  console.time("duplicateRowNative");

  const lastRowData = tableTengahEditData[tableTengahEditData.length - 1];
  const $tbody = $(".BigDataTableTengah tbody");
  const $lastRow = $(".BigDataTableTengah tbody tr").last();
  const domUnitValue = $lastRow.find(".item-unit-field").val();

  // Increment counter
  ctrNoUrut++;

  // Buat object data baru (copy dari yang terakhir)
  const newRowData = {
    rowId: "new-" + Date.now(),
    no: ctrNoUrut,
    itemCode: lastRowData.itemCode,
    itemUnitId: lastRowData.itemUnitId,
    unitName: lastRowData.unitName,
    vendor: lastRowData.vendor,
    color: lastRowData.color,
    shipmentDate: lastRowData.shipmentDate,
    qty: lastRowData.qty,
    price: lastRowData.price,
    poDateEst: lastRowData.poDateEst,
    termDays: lastRowData.termDays,
    batch: lastRowData.batch,
    closed: 0,
  };

  console.log("=== DUPLICATE RESULT ===");
  console.log({
    itemCode: { from: lastRowData.itemCode, to: newRowData.itemCode },
    itemUnitId: { from: lastRowData.itemUnitId, to: newRowData.itemUnitId },
    unitName: { from: lastRowData.unitName, to: newRowData.unitName },
    vendor: { from: lastRowData.vendor, to: newRowData.vendor },
    color: { from: lastRowData.color, to: newRowData.color },
    shipmentDate: {
      from: lastRowData.shipmentDate,
      to: newRowData.shipmentDate,
    },
    qty: { from: lastRowData.qty, to: newRowData.qty },
    price: { from: lastRowData.price, to: newRowData.price },
    poDateEst: { from: lastRowData.poDateEst, to: newRowData.poDateEst },
    termDays: { from: lastRowData.termDays, to: newRowData.termDays },
    batch: { from: lastRowData.batch, to: newRowData.batch },
  });
  // Tambah ke array
  tableTengahEditData.push(newRowData);

  // Hitung shipment year
  const shipmentYear = lastRowData.shipmentDate
    ? getISOWeekYear(lastRowData.shipmentDate)
    : "";

  // Build DOM row baru sesuai struktur halaman edit
  const $newRow = $("<tr></tr>").data(
    "rowIndex",
    tableTengahEditData.length - 1,
  );

  // No kolom
  $newRow.append(
    $("<td></td>").append(
      $("<input>", {
        type: "text",
        class: "form-control form-control-sm",
        value: ctrNoUrut,
        style: "text-align: center;",
        readonly: true,
      }),
    ),
  );

  // Item select
  const $itemSelect = $("<select>", {
    class: "form-control form-control-sm itemSelectColumn",
    style: "width: 200px;",
  });

  $newRow.append($("<td class='item-code-col'></td>").append($itemSelect));

  if (lastRowData.itemCode) {
    const itemLabel = [lastRowData.itemCodeText, lastRowData.unitName]
      .filter(Boolean)
      .join(" - ");
    const itemOption = new Option(
      itemLabel || String(lastRowData.itemCode),
      lastRowData.itemCode,
      true,
      true,
    );
    $itemSelect.append(itemOption).trigger("change");
  }

  $itemSelect.select2({
    ajax: {
      url: BASE_URL + "scm/purchasing/purchase_plan_report/get_item_list",
      dataType: "json",
      delay: 300,
      data: (params) => ({ search: params.term }),
      processResults: (data) => ({
        results: data.map((item) => ({
          id: item.id,
          text: item.code + " - " + item.description,
          itemunitid: item.itemunitid,
          unitname: item.unitname,
          code: item.code,
        })),
      }),
    },
    placeholder: "-- Pilih Item --",
    minimumInputLength: 1,
  });

  // Unit (readonly)
  $newRow.append(
    $("<td></td>")
      .append(
        $("<input>", {
          type: "text",
          class: "form-control form-control-sm item-unit-field",
          value: lastRowData.unitName || domUnitValue,
          readonly: true,
        }),
      )
      .append(
        $("<input>", {
          type: "hidden",
          class: "itemunitid",
          value: lastRowData.itemUnitId || 0,
        }),
      ),
  );

  // Vendor select
  const $vendorSelect = $("<select>", {
    class: "form-control form-control-sm vendorSelectColumn",
  });

  $newRow.append($("<td></td>").append($vendorSelect));

  if (lastRowData.vendor) {
    const vendorLabel =
      arrVendor[lastRowData.vendor] || String(lastRowData.vendor);
    const vendorOption = new Option(
      vendorLabel,
      lastRowData.vendor,
      true,
      true,
    );
    $vendorSelect.append(vendorOption).trigger("change");
  }

  $vendorSelect.select2({
    ajax: {
      url: BASE_URL + "scm/purchasing/purchase_order_plan/get_vendor_search",
      type: "POST",
      dataType: "json",
      delay: 300,
      data: (params) => ({ q: params.term || "", page: params.page || 1 }),
      processResults: (data, params) => {
        params.page = params.page || 1;
        return {
          results: data.results || [],
          pagination: data.pagination || { more: false },
        };
      },
    },
    placeholder: "-- Pilih Vendor --",
    minimumInputLength: 0,
  });

  // Color select
  const $colorSelect = $("<select>", {
    class: "form-control form-control-sm colorColumn",
    style: "width: 100px;",
  }).html(colorOptionsHTML || '<option value="">No colors available</option>');

  $newRow.append($("<td></td>").append($colorSelect));

  $colorSelect.select2({
    placeholder: "-- Pilih Warna --",
    minimumResultsForSearch: 1,
    width: "100%",
  });

  if (lastRowData.color) {
    $colorSelect.val(String(lastRowData.color)).trigger("change");
  }

  // Year select
  const $yearSelect = $("<select>", {
    class: "form-control form-control-sm shipment-year-field selectpicker",
    "data-live-search": true,
  }).html(yearOptionsHTML || '<option value="">-- Pilih Tahun --</option>');

  $newRow.append($("<td></td>").append($yearSelect));

  $yearSelect.select2({
    placeholder: "-- Pilih Tahun --",
    minimumResultsForSearch: 1,
    width: "100%",
  });

  if (shipmentYear) {
    $yearSelect.val(shipmentYear).trigger("change");
  }

  // WW select
  const $wwSelect = $("<select>", {
    class: "form-control form-control-sm wwColumn",
  });

  $newRow.append($("<td></td>").append($wwSelect));

  // Shipment date (readonly)
  $newRow.append(
    $("<td></td>").append(
      $("<input>", {
        type: "date",
        class: "form-control form-control-sm shipmentDateColumn",
        value: lastRowData.shipmentDate,
        readonly: true,
      }),
    ),
  );

  // Qty
  $newRow.append(
    $("<td></td>").append(
      $("<input>", {
        type: "number",
        class: "form-control form-control-sm qtyColumn text-right",
        value: lastRowData.qty,
      }),
    ),
  );

  // Price
  const formattedPrice = Number(lastRowData.price).toLocaleString("en-EN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  $newRow.append(
    $("<td></td>").append(
      $("<input>", {
        type: "text",
        class: "form-control form-control-sm priceColumn text-right",
        value: formattedPrice,
        style: "width:115px;",
      }).attr("data-value", lastRowData.price),
    ),
  );

  // Term days
  $newRow.append(
    $("<td></td>").append(
      $("<input>", {
        type: "number",
        class: "form-control form-control-sm TermDaysColumn",
        value: lastRowData.termDays || 0,
      }),
    ),
  );

  // PO Date Est
  $newRow.append(
    $("<td></td>").append(
      $("<input>", {
        type: "date",
        class: "form-control form-control-sm PODateEstColumn",
        value: lastRowData.poDateEst || "",
      }),
    ),
  );

  // Batch
  $newRow.append(
    $("<td></td>").append(
      $("<input>", {
        type: "number",
        class: "form-control form-control-sm batchColumn",
        value: lastRowData.batch || 0,
      }),
    ),
  );

  // Delete button
  $newRow.append(
    $("<td></td>")
      .addClass("column-action-icon")
      .append(
        $("<i></i>")
          .addClass("glyphicon glyphicon-trash remove-row-icon")
          .css("cursor", "pointer")
          .css("color", "black")
          .on("click", function () {
            $(this).closest("tr").remove();
          }),
      ),
  );

  // Append row ke table
  $tbody.append($newRow);

  // Render WW dengan cached data
  if (shipmentYear && wwDataByYear[shipmentYear]) {
    // console.log(` Using cached WW for year ${shipmentYear}`);
    renderWWDropdown($wwSelect, shipmentYear, lastRowData.shipmentDate);
  } else if (shipmentYear) {
    // console.log(` Loading WW for year ${shipmentYear}`);
    loadWWByYear(shipmentYear).then(function () {
      renderWWDropdown($wwSelect, shipmentYear, lastRowData.shipmentDate);
    });
  } else {
    $wwSelect.html('<option value="">-- Pilih WW --</option>').select2({
      placeholder: "-- Pilih WW --",
      minimumResultsForSearch: 1,
      width: "100%",
    });
  }

  // Update summary
  // Calculate total qty
  let currentTotalQty = 0;
  $(".BigDataTableTengah .qtyColumn").each(function () {
    let qty = parseInt($(this).val()) || 0;
    currentTotalQty += qty;
  });
  totalQtyTableTengah.val(currentTotalQty);
  totalQtyTableTengah.text(currentTotalQty);

  autoRecalculateTableKiri();
  updateDuplicateButtonVisibility();
}

// fungsi add line table tengah
btnAddLineTableTengah.on("click", function () {
  tambahRowTableTengah();
});
// tutup fungsi table tengah;
