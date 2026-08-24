let vendorData = [];
let itemData = [];

// Load vendor sekali saja
function loadVendorData() {
  return $.ajax({
    url: BASE_URL + "scm/purchasing/purchase_order_plan/get_vendor",
    type: "GET",
    dataType: "json",
    data: { type: "Vendor" },
    success: function (data) {
      vendorData = data.data || [];
      // console.log('Vendor data stored in array.');
    },
    error: function (jqXHR, textStatus, errorThrown) {
      console.error("Error loading vendor options:", textStatus, errorThrown);
    },
  });
}

// Load item sekali saja
function loadItemData() {
  return $.ajax({
    url: BASE_URL + "scm/purchasing/purchase_order_plan/get_item_list",
    type: "GET",
    dataType: "json",
    success: function (data) {
      itemData = data || [];
      // console.log('Item data stored in array.');
    },
    error: function (jqXHR, textStatus, errorThrown) {
      console.error("Error loading item options:", textStatus, errorThrown);
    },
  });
}

// Render vendor dari array
function renderVendorDropdown($select) {
  let html = '<option value="">-- Pilih Vendor --</option>';
  vendorData.forEach((vendor) => {
    html += `<option value="${vendor.coCode}">${vendor.coName}</option>`;
  });
  $select.html(html);
}

// Render item dari array
function renderItemDropdown($select) {
  let html = '<option value="">-- Pilih Item --</option>';
  itemData.forEach((item) => {
    html += `<option value="${item.id}">${item.code}</option>`;
  });
  $select.html(html);
}

$(function () {
  // Load semua data sekali di awal
  Promise.all([loadVendorData(), loadItemData()]).then(() => {
    // Render dropdown pertama
    renderVendorDropdown($("#vendorSelect"));
    renderItemDropdown($("#itemSelect"));

    // Saat klik tambah form baru
    $("#addFormButton").on("click", function () {
      let $newForm = $(`
        <div class="form-row">
          <select class="vendor-select"></select>
          <select class="item-select"></select>
        </div>
      `);
      renderVendorDropdown($newForm.find(".vendor-select"));
      renderItemDropdown($newForm.find(".item-select"));
      $("#formContainer").append($newForm);
    });
  });
});
