<?php if (!defined('BASEPATH')) exit('No direct script access allowed');

class Purchase_order_plan extends Base_Class
{
  public $dbtPurchasePlanDtl_ID = 0;

  function __construct()
  {
    parent::__construct();
    $this->load->model('purchasing/purchase_order/purchase_order_m', 'pom');
    $this->load->library("session");
    $this->load->database();
  }

  public function index()
  {
    ob_start("ob_gzhandler");
    $this->load->helper("url");
    $this->load->view("base/base_header");
    $this->load->view("scm/purchasing/purchase_order_plan_v");
    $this->load->view("base/base_footer");
  }

  // testing purchase order plan report
  public function get_purchase_plan_data()
  {
    header('Content-Type: application/json');
    $results_from_model = $this->pom->get_purchase_plan_shipment_data();
    $formatted_data_for_datatables = [];
    if (!empty($results_from_model)) {
      foreach ($results_from_model as $row) {
        $formatted_data_for_datatables[] = [
          $row["ItemID"] ?? '',
          $row["Color"] ?? '',
          $row["Price"] ?? 0,
          $row["Qty"] ?? 0,
          "-",
          "-",
          "-",
          "-",
          "-",
          "-",
          "-",
          "-",
          "-",
          "-",
          "-",
          "-"
        ];
      }
    }

    $response = array(
      'data' => $formatted_data_for_datatables
    );

    echo json_encode($response);
  }
  // tutup testing purchase order plan report





  public function save_header()
  {
    $this->load->model("base/register", "register");
    $this->load->model("base/updating");

    if ($this->input->method() !== 'post') {
      return $this->output
        ->set_content_type('application/json')
        ->set_status_header(405)
        ->set_output(json_encode(['status' => 'error', 'message' => 'Method not allowed.']));
    }

    $docDate  = $this->input->post('doc_date');
    $itemDesc = $this->input->post('item_desc');
    $currID = $this->input->post('currency');
    $rate = $this->input->post('rate');

    $rate = trim($rate);

    // Jika ada koma dan titik → tentukan mana decimal separator
    if (strpos($rate, ',') !== false && strpos($rate, '.') !== false) {

        // Jika titik muncul setelah koma → format US (16,600.00)
        if (strrpos($rate, '.') > strrpos($rate, ',')) {
            // hapus koma (thousand)
            $rate = str_replace(',', '', $rate);
        } 
        // Jika koma muncul setelah titik → format Indonesia (16.600,00)
        else {
            // hapus titik (thousand)
            $rate = str_replace('.', '', $rate);
            // ubah koma jadi titik (decimal)
            $rate = str_replace(',', '.', $rate);
        }

    }
    // Jika hanya ada koma → kemungkinan decimal Indonesia
    elseif (strpos($rate, ',') !== false) {
        $rate = str_replace(',', '.', $rate);
    }

    // Jika hanya ada titik → biarkan (sudah format benar)

    // Konversi ke float lalu format 2 desimal
    $rate = number_format((float)$rate, 2, '.', '');

    if (empty($docDate) || empty($itemDesc)|| empty($currID)|| empty($rate)) {
      return $this->output
        ->set_content_type('application/json')
        ->set_status_header(400)
        ->set_output(json_encode(['status' => 'error', 'message' => 'Tanggal Dokumen dan Deskripsi Item wajib diisi.']));
    }

    $userLocID = $this->session->writelocid;
    $header = $this->create_header_doc("SPPLN", $docDate, $userLocID);

    $data_header = [
      'DocDate'      => $docDate,
      'DocType'      => 'SPPLN',
      'DocNumber'    => $header['docnumber'],
      'ItemDesc'     => $itemDesc,
      'CurrID'       => $currID,
      'CurrRate'     => $rate,
      'Void'         => 0,
      'CreateDate'   => date('Y-m-d H:i:s'),
      'CreateUserID' => $this->userid,
      'EditDate'     => date('Y-m-d H:i:s'),
      'EditUserID'   => $this->userid,
    ];

    $this->db->trans_start();
    try {
      $dbtPurchasePlan_ID = $this->pom->insert_purchase_plan_header($data_header);
      if (!$dbtPurchasePlan_ID) {
        throw new Exception("Gagal menyimpan header Purchase Plan.");
      }

      $this->db->trans_complete();

      if ($this->db->trans_status() === FALSE) {
        throw new Exception("Transaksi database untuk header gagal.");
      }

      $dbtPurchasePlan_ID = (int)$dbtPurchasePlan_ID;

      return $this->output
        ->set_content_type('application/json')
        ->set_status_header(200)
        ->set_output(json_encode(['status' => 'success', 'message' => 'Header berhasil disimpan!', 'dbtPurchasePlan_ID' => $dbtPurchasePlan_ID,  'docNumber' => $header['docnumber']]));
    } catch (Exception $e) {
      $this->db->trans_rollback();
      return $this->output
        ->set_content_type('application/json')
        ->set_status_header(500)
        ->set_output(json_encode(['status' => 'error', 'message' => 'Gagal menyimpan data header: ' . $e->getMessage()]));
    }
  }

  public function getIDTerBaru()
  {
    $latest_id = $this->pom->get_latest_purchase_plan_id();
    $response = [];
    if ($latest_id !== null) {
      $response['success'] = true;
      $response['purchase_plan_id'] = $latest_id;
      $response['message'] = "ID Rencana Pembelian Terbaru berhasil diambil.";
    } else {
      $response['success'] = false;
      $response['purchase_plan_id'] = null;
      $response['message'] = "Tidak ada rencana pembelian ditemukan.";
    }

    $this->output->set_content_type('application/json');
    $this->output->set_output(json_encode($response));
  }

public function get_calendar_years()
{
    $data = $this->pom->get_calendar_years();
    echo json_encode($data);
}

public function get_ww_by_year()
{
    $cy = $this->input->get('cy'); // ex: CY2025
    $year = substr($cy, -4);      // 2025

    // coba cari pakai CY dulu
    $data = $this->pom->get_ww_by_calendar_year("CY" . $year);

    // kalau kosong, fallback ke FY
    if (empty($data)) {
        $data = $this->pom->get_ww_by_calendar_year("FY" . $year);
    }

    echo json_encode($data);
}


public function save()
{
    if ($this->input->method() !== 'post') {
        return $this->output
            ->set_content_type('application/json')
            ->set_status_header(405)
            ->set_output(json_encode(['status' => 'error', 'message' => 'Method not allowed.']));
    }

    $table_data        = $this->input->post('table_data');
    $purchasePlanID    = (int)$this->input->post('purchasePlanID');
    $blanketIDFromPost = $this->input->post('blanket_id', TRUE);

    //  Validasi awal
    if (empty($table_data) || !is_array($table_data)) {
        return $this->output
            ->set_content_type('application/json')
            ->set_status_header(400)
            ->set_output(json_encode(['status' => 'error', 'message' => 'No item data received or format is invalid.']));
    }

    if (empty($purchasePlanID) || $purchasePlanID <= 0) {
        return $this->output
            ->set_content_type('application/json')
            ->set_status_header(400)
            ->set_output(json_encode(['status' => 'error', 'message' => 'Purchase Plan ID is missing or invalid.']));
    }

    //  Validasi data + batch optional
    $batchVendorMap = [];
    foreach ($table_data as $index => $row) {
        if (
            !array_key_exists('itemCode', $row) || $row['itemCode'] === '' ||
            empty($row['vendor']) ||
            empty(trim($row['color'])) ||
            !array_key_exists('itemUnitId', $row) || $row['itemUnitId'] === '' ||
            empty($row['shipmentDate']) ||
            empty($row['poDateEst']) ||
            empty($row['termDays']) ||
            !is_numeric($row['qty']) ||
            !is_numeric($row['price'])
        ) {
            return $this->output
                ->set_content_type('application/json')
                ->set_status_header(400)
                ->set_output(json_encode([
                    'status' => 'error',
                    'message' => 'Invalid or missing required fields for row ' . ($index + 1) . '.'
                ]));
        }

        $vendorId   = (int)$row['vendor'];
        $batchValue = isset($row['batch']) && $row['batch'] !== '' ? (int)$row['batch'] : null;
        $rowNumber  = $index + 1;

        //  Cek batch hanya kalau tidak null
        if ($batchValue !== null) {
            if (isset($batchVendorMap[$batchValue]) && $batchVendorMap[$batchValue]['vendor'] !== $vendorId) {
                return $this->output
                    ->set_content_type('application/json')
                    ->set_status_header(400)
                    ->set_output(json_encode(['status' => 'error', 'message' =>
                        "Batch '{$batchValue}' sudah digunakan oleh Vendor (ID: {$batchVendorMap[$batchValue]['vendor']}) " .
                        "pada baris {$batchVendorMap[$batchValue]['row']}. Vendor berbeda tidak boleh menggunakan Batch yang sama."
                    ]));
            }

            $batchVendorMap[$batchValue] = ['vendor' => $vendorId, 'row' => $rowNumber];
        }
    }

    //  Proses simpan
    $this->db->trans_start();
    $saved_count = 0;
    $error_logs = [];

    try {
        foreach ($table_data as $index => $row) {
            $data_to_save = [
                'Vendor'         => (int)$row['vendor'],
                'ItemID'         => !empty($row['itemCode']) ? (int)$row['itemCode'] : null,
                'PurchasePlanID' => $purchasePlanID,
                'ItemUnitID'     => !empty($row['itemUnitId']) ? (int)$row['itemUnitId'] : null,
                'Color'          => $row['color'],
                'ShipmentDate'   => $row['shipmentDate'],
                'Qty'            => (float)$row['qty'],
                'Price'          => (float)$row['price'],
                'PODateEst'      => $row['poDateEst'],
                'Term'           => (int)$row['termDays'],
                //  Batch boleh null
                'Batch'          => isset($row['batch']) && $row['batch'] !== '' ? (int)$row['batch'] : null,
                'BlanketID'      => (empty($blanketIDFromPost) || !is_numeric($blanketIDFromPost)) ? null : (int)$blanketIDFromPost,
                'Closed'         => 0,
            ];

            $inserted_id = $this->pom->insert_purchase_order_plan($data_to_save);
            $saved_count++;

            // Simpan shipment history
            $history_result = $this->pom->insert_shipment_history(
                $inserted_id,
                $data_to_save,
                $this->userid
            );
            if (!$history_result) {
                $error_logs[] = [
                    'type'  => 'shipment_history',
                    'row'   => $index,
                    'error' => $this->db->error()
                ];
            }
        }

        $this->db->trans_complete();

        if ($this->db->trans_status() === FALSE) {
            throw new Exception("Database transaction failed during save process.");
        }

        return $this->output
            ->set_content_type('application/json')
            ->set_status_header(200)
            ->set_output(json_encode([
                'status'         => 'success',
                'message'        => "{$saved_count} items successfully saved!",
                'saved_items'    => $saved_count,
                'error_logs'     => $error_logs
            ]));

    } catch (Exception $e) {
        $this->db->trans_rollback();
        return $this->output
            ->set_content_type('application/json')
            ->set_status_header(500)
            ->set_output(json_encode([
                'status'     => 'error',
                'message'    => 'Gagal menyimpan data: ' . $e->getMessage(),
                'error_logs' => $error_logs
            ]));
    }
}


public function save_detail_only()
{
    $raw_input = json_decode($this->input->raw_input_stream, true);
    $purchasePlanID = $raw_input['purchasePlanID'] ?? null;
    $blanket_id     = $raw_input['blanket_id'] ?? null;
    $table_data     = $raw_input['table_data'] ?? [];

    if (empty($purchasePlanID) || empty($table_data) || !is_array($table_data)) {
        echo json_encode(['status' => 'error', 'message' => 'Data detail tidak valid']);
        return;
    }

    $detail_ids = [];
    foreach ($table_data as $index => $row) {
        $row = (array) $row; // pastikan array
        $insert_data = [
            'PurchasePlanID' => $purchasePlanID,
            'BlanketID'      => $blanket_id ?: null,
            'VendorID'       => (int)$row['vendor'],
            'ItemCode'       => (int)$row['itemCode'],
            'Color'          => $row['color'],
            'ShipmentDate'   => $row['shipmentDate'],
            'Qty'            => (float)$row['qty'],
            'Price'          => (float)$row['price'],
            'PODateEst'      => $row['poDateEst'],
            'Term'       => (int)$row['termDays'],
            'Batch' => isset($row['batch']) && $row['batch'] !== '' ? (int)$row['batch'] : null,
            'CreatedBy'      => $this->session->userdata('user_id'),
            'CreatedDate'    => date('Y-m-d H:i:s')
        ];
        $this->db->insert('purchase_plan_detail', $insert_data);
        $detail_ids[] = [
            'index'             => $index,
            'PurchasePlanDtlID' => $this->db->insert_id()
        ];
    }

    echo json_encode([
        'status'     => 'success',
        'detail_ids' => $detail_ids
    ]);
}

public function save_payment_only()
{
    // Ambil JSON body
    $raw_input = json_decode($this->input->raw_input_stream, true);
    $purchasePlanID = $raw_input['purchasePlanID'] ?? null;
    $payment_data   = $raw_input['payment_data'] ?? [];

    if (empty($purchasePlanID) || empty($payment_data) || !is_array($payment_data)) {
        echo json_encode(['status' => 'error', 'message' => 'Data payment tidak valid']);
        return;
    }

    $saved_payment_count = 0;
    $error_logs = [];

    foreach ($payment_data as $payment_row) {
        $payment_row = (array) $payment_row; // pastikan array

        // Validasi wajib
        if (empty($payment_row['PurchasePlanDtlID']) || empty($payment_row['paymentDate'])) {
            $error_logs[] = [
                'type'  => 'payment_detail',
                'error' => 'PurchasePlanDtlID atau paymentDate kosong'
            ];
            continue;
        }

        $insert_data = [
            'PurchasePlanDtlID' => (int)$payment_row['PurchasePlanDtlID'],
            'PaymentDate'       => date('Y-m-d', strtotime($payment_row['paymentDate'])),
            'Notes'             => $payment_row['notes'] ?? null,
            'Percent'           => (float)($payment_row['percent'] ?? 0),
            'FromValue'         => (float)($payment_row['formValue'] ?? 0),
            'Alert'             => (int)($payment_row['alert'] ?? 0),
            'Term'              => (int)($payment_row['termDays'] ?? 0),
            'OACredit'          => (float)($payment_row['OACredit'] ?? 0),
            'CreatedBy'         => $this->session->userdata('user_id'),
            'CreatedDate'       => date('Y-m-d H:i:s')
        ];

        $this->db->insert('purchase_plan_payment', $insert_data);
        if ($this->db->affected_rows() > 0) {
            $saved_payment_count++;
        } else {
            $error_logs[] = [
                'type'  => 'payment_detail',
                'error' => $this->db->error()
            ];
        }
    }

    echo json_encode([
        'status'               => 'success',
        'saved_payments'       => $saved_payment_count,
        'payment_insert_error' => $error_logs
    ]);
}

  // fungsi save table kiri
  public function saveTableKiri()
  {
      // Validasi method request
      $method = strtoupper($_SERVER['REQUEST_METHOD']);
      if ($method !== 'POST') {
          return $this->output
              ->set_content_type('application/json')
              ->set_status_header(405)
              ->set_output(json_encode(['status' => 'error', 'message' => 'Method not allowed.']));
      }

      // Ambil data JSON dari raw input
      $rawData = json_decode($this->input->raw_input_stream, true);
      
      // Cek jika JSON decode gagal
      if (json_last_error() !== JSON_ERROR_NONE) {
          return $this->output
              ->set_content_type('application/json')
              ->set_status_header(400)
              ->set_output(json_encode(['status' => 'error', 'message' => 'Invalid JSON format.']));
      }

      $table_data = $rawData['table_data'] ?? [];
      $purchasePlanID = (int)($rawData['purchasePlanID'] ?? 0);

      // Validasi data tabel
      if (empty($table_data) || !is_array($table_data)) {
          return $this->output
              ->set_content_type('application/json')
              ->set_status_header(400)
              ->set_output(json_encode(['status' => 'error', 'message' => 'No table data received or format is invalid.']));
      }

      // Validasi Purchase Plan ID
      if ($purchasePlanID <= 0) {
          return $this->output
              ->set_content_type('application/json')
              ->set_status_header(400)
              ->set_output(json_encode(['status' => 'error', 'message' => 'Purchase Plan ID is missing or invalid.']));
      }

      // Validasi setiap row data
      $validationPassed = true;
      $validationMessage = '';

      foreach ($table_data as $index => $row) {
          // Validasi vendorId
          if (!isset($row['vendorId']) || !is_numeric($row['vendorId']) || (int)$row['vendorId'] <= 0) {
              $validationPassed = false;
              $validationMessage = 'Invalid vendor ID for row ' . ($index + 1) . '.';
              break;
          }

          // Validasi batch
          if (!isset($row['batch']) || !is_numeric($row['batch']) || (int)$row['batch'] < 0) {
              $validationPassed = false;
              $validationMessage = 'Invalid batch number for row ' . ($index + 1) . '.';
              break;
          }

          // Validasi total
          if (!isset($row['total']) || !is_numeric($row['total']) || (float)$row['total'] < 0) {
              $validationPassed = false;
              $validationMessage = 'Invalid total amount for row ' . ($index + 1) . '.';
              break;
          }
      }

      if (!$validationPassed) {
          return $this->output
              ->set_content_type('application/json')
              ->set_status_header(400)
              ->set_output(json_encode(['status' => 'error', 'message' => $validationMessage]));
      }

      // Mulai database transaction
      $this->db->trans_start();
      $inserted_summary_ids = [];

      try {
          // Loop untuk menyimpan setiap row
          foreach ($table_data as $index => $row) {
              // PENTING: Hanya gunakan kolom yang benar-benar ada di tabel
            $batch = isset($row['batch']) && $row['batch'] !== '' && (int)$row['batch'] !== 0
                ? (int)$row['batch']
                : null;
            $blanketEst = null;

            if (!empty($row['blanketEst'])) {
                $blanketEst = date('Y-m-d', strtotime($row['blanketEst']));
            }

              $data_to_save = [
                  'PurchasePlanID' => $purchasePlanID,
                  'Vendor'         => (int)$row['vendorId'],
                  'Batch'          => $batch,
                  'BlanketPODateEst'     => $blanketEst,
                  'Total'          => (float)$row['total']
                  // Hapus CreatedDate dan CreatedBy karena kolom tidak ada
              ];

              $new_summary_id = $this->pom->insertPurchasePlanDtl($data_to_save);

              if (!$new_summary_id) {
                  throw new Exception("Failed to save data for row " . ($index + 1) . ".");
              }
              
              $inserted_summary_ids[] = (int)$new_summary_id;
          }

          // Complete transaction
          $this->db->trans_complete();
          
          // Cek status transaction
          if ($this->db->trans_status() === FALSE) {
              throw new Exception("Database transaction failed during data save.");
          }

          // Response sukses
          return $this->output
              ->set_content_type('application/json')
              ->set_status_header(200)
              ->set_output(json_encode([
                  'status'               => 'success',
                  'message'              => 'Data successfully saved!',
                  'purchasePlanID'       => $purchasePlanID,
                  'inserted_summary_ids' => $inserted_summary_ids,
                  'saved_records'        => $inserted_summary_ids,
                  'total_records'        => count($inserted_summary_ids)
              ]));

      } catch (Exception $e) {
          // Rollback transaction jika ada error
          $this->db->trans_rollback();
          
          // Log error untuk debugging
          log_message('error', 'saveTableKiri Error: ' . $e->getMessage());
          
          return $this->output
              ->set_content_type('application/json')
              ->set_status_header(500)
              ->set_output(json_encode([
                  'status'  => 'error',
                  'message' => 'Failed to save data: ' . $e->getMessage()
              ]));
      }
  }

  	public function getCurrencyList($docdate) 
{
    $result = [];
    $currid_all = $this->data->detail(
        "dbmcurr",
        "id, code, description, currentrate",
        "status <> 0 order by id"
    );

    foreach ($currid_all as $value) {
        if ($value['id'] == 1) {
            $rate = 1;
        } else {
            $curr_hist_rate_q = $this->data->detail(
                "dbmCurrHistRate",
                "TOP 1 Rate",
                "CurrID = {$value['id']} AND CONVERT(DATE, StartDate) <= '{$docdate}' ORDER BY StartDate DESC"
            );
            $rate = count($curr_hist_rate_q) > 0 
                ? $curr_hist_rate_q[0]['Rate'] 
                : $value['currentrate'];
        }

        $result[] = [
            'id'   => $value['id'],
            'code' => $value['code'],
            'desc' => $value['description'],
            'rate' => $rate
        ];
    }

    header('Content-Type: application/json');
    echo json_encode($result);
    exit;
}
public function add_new_color()
{
    $colorName = $this->input->post('color_name');

    if (!$colorName) {
        echo json_encode(['success' => false, 'message' => 'Color name is required']);
        return;
    }

    // simpan ke DB lewat model
    $result = $this->pom->addNewColor($colorName);

    if ($result) {
        echo json_encode([
            'success' => true,
            'data' => [
                'AttributeValueID' => $result['AttributeValueID'],
                'AttributeValue' => $result['AttributeValue']
            ]
        ]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Failed to insert color']);
    }
}

  public function get_item_list()
  {
    $items = $this->pom->getItemList();
    $this->output->set_content_type('application/json');
    echo json_encode($items);
  }
  public function get_color_list()
  {
    $items = $this->pom->getColorList();
    $this->output->set_content_type('application/json');
    echo json_encode($items);
  }
  public function get_vendor()
  {

    log_message('debug', 'Attempting to call get_vendor in Purchase_order_plan.');
    ob_start();
    $this->get_coaattr_customer_vendor();

    $json_output = ob_get_clean();

    if (empty(trim($json_output))) {
      log_message('error', 'get_vendor_purchasePlan: Captured JSON output is empty. Check get_coaattr_customer_vendor logic.');
      $this->output->set_content_type('application/json');
      echo json_encode(['error' => 'No output from get_coaattr_customer_vendor']);
      return;
    }

    $decoded_json = json_decode($json_output, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
      log_message('error', 'get_vendor_purchasePlan: JSON decoding error: ' . json_last_error_msg() . ' Raw output: ' . $json_output);

      $this->output->set_content_type('application/json');
      echo json_encode(['error' => 'Invalid JSON from get_coaattr_customer_vendor', 'raw_response' => substr($json_output, 0, 200)]);
      return;
    }

    $this->output->set_content_type('application/json');
    echo $json_output;
  }

  // Endpoint untuk select2 lazy-load vendor di Purchase Plan.
  // Awalnya (tanpa q) return 5 vendor pertama, saat user mengetik baru search ke server.
  //
  // Reuse get_coaattr_customer_vendor() - sumber data yang sama dipakai fungsi asli
  // loadVendorOptionsAndMap() di eventListener.js sebelum lazy-load. Parameter & format
  // response di bawah ini diverifikasi dari fungsi tersebut (POST, type=20010, response
  // berupa array polos dengan field ID & coName) - bukan tebakan.
  //
  // PENTING: get_coaattr_customer_vendor() mensyaratkan request method POST. Endpoint ini
  // HARUS dipanggil via POST (lihat konfigurasi select2 ajax di initVendorSelect2, eventListener.js).
  // Test manual lewat address bar browser (selalu GET) TIDAK akan pernah berhasil - itu bukan bug.
  public function get_vendor_search()
  {
    $this->output->set_content_type('application/json');

    $term = trim($this->input->post('q'));
    $page = (int) $this->input->post('page');
    if ($page < 1) $page = 1;

    $limit = ($term === '') ? 5 : 20;
    $offset = ($page - 1) * $limit;

    // get_coaattr_customer_vendor() baca parameter 'type' dari $_POST, bukan dari argumen fungsi
    $originalPost = $_POST;
    $_POST['type'] = '20010';
    ob_start();
    $this->get_coaattr_customer_vendor();
    $json_output = ob_get_clean();
    $_POST = $originalPost;

    $decoded = json_decode($json_output, true);
    $allVendors = (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) ? $decoded : [];

    if ($term !== '') {
      $allVendors = array_values(array_filter($allVendors, function ($v) use ($term) {
        return stripos($v['coName'] ?? '', $term) !== false;
      }));
    }

    $total = count($allVendors);
    $pageItems = array_slice($allVendors, $offset, $limit);

    $results = array_map(function ($v) {
      return [
        'id'   => $v['ID'] ?? '',
        'text' => $v['coName'] ?? '',
      ];
    }, $pageItems);

    echo json_encode([
      'results' => $results,
      'pagination' => ['more' => ($offset + $limit) < $total],
    ]);
  }

  // Endpoint untuk select2 lazy-load item di Purchase Plan.
  // Awalnya (tanpa q) return 5 item pertama, saat user mengetik baru search ke server.
  public function get_item_search()
  {
    $this->output->set_content_type('application/json');

    $term = trim($this->input->get('q'));
    $page = (int) $this->input->get('page');
    if ($page < 1) $page = 1;

    $limit = ($term === '') ? 5 : 20;
    $offset = ($page - 1) * $limit;

    // ambil 1 baris ekstra untuk tahu apakah masih ada halaman berikutnya, tanpa count(*) terpisah
    $items = $this->pom->searchItemList($term, $limit + 1, $offset);
    $hasMore = count($items) > $limit;
    $items = array_slice($items, 0, $limit);

    $results = array_map(function ($item) {
      return [
        'id'         => $item['id'],
        'text'       => $item['code'] . ' - ' . $item['description'],
        'code'       => $item['code'],
        'itemunitid' => $item['itemunitid'],
        'unitname'   => $item['unitname'],
      ];
    }, $items);

    echo json_encode([
      'results' => $results,
      'pagination' => ['more' => $hasMore],
    ]);
  }

  public function get_purchase_plan_dtl_summary_list()
  {
    if ($this->input->method() !== 'get') {
      return $this->output->set_content_type('application/json')->set_status_header(405)->set_output(json_encode(['status' => 'error', 'message' => 'Method not allowed.']));
    }

    try {

      $summary_data = $this->pom->get_latest_purchase_plan_dtl_summary();

      if (empty($summary_data)) {
        return $this->output->set_content_type('application/json')->set_status_header(200)
          ->set_output(json_encode(['status' => 'success', 'message' => 'Tidak ada data ringkasan ditemukan untuk Purchase Plan terbaru.', 'data' => []]));
      }

      return $this->output->set_content_type('application/json')->set_status_header(200)
        ->set_output(json_encode(['status' => 'success', 'message' => 'Data ringkasan berhasil diambil.', 'data' => $summary_data]));
    } catch (Exception $e) {
      return $this->output->set_content_type('application/json')->set_status_header(500)
        ->set_output(json_encode(['status' => 'error', 'message' => 'Gagal mengambil data ringkasan: ' . $e->getMessage()]));
    }
  }


public function save_payment_details()
{
    if ($this->input->method() !== 'post') {
        return $this->output
            ->set_content_type('application/json')
            ->set_status_header(405)
            ->set_output(json_encode([
                'status'  => 'error',
                'message' => 'Method not allowed.'
            ]));
    }

    // Read raw JSON input
    $input = file_get_contents('php://input');
    $data  = json_decode($input, true);

    // Debug
    error_log('=== DEBUG save_payment_details ===');
    error_log('Raw input: ' . $input);
    error_log('Decoded data: ' . print_r($data, true));

    if (json_last_error() !== JSON_ERROR_NONE) {
        return $this->output
            ->set_content_type('application/json')
            ->set_status_header(400)
            ->set_output(json_encode([
                'status'  => 'error',
                'message' => 'Invalid JSON format: ' . json_last_error_msg()
            ]));
    }

    $purchasePlanID     = $data['purchasePlanID'] ?? null;
    $arrListIDTableKiri = $data['arrListIDTableKiri'] ?? null; 
    $allTableKananData  = $data['allTableKananData'] ?? null;

    if (empty($purchasePlanID) || empty($arrListIDTableKiri)) {
        return $this->output
            ->set_content_type('application/json')
            ->set_status_header(400)
            ->set_output(json_encode([
                'status'  => 'error',
                'message' => 'purchasePlanID dan arrListIDTableKiri harus diisi.',
                'debug'   => [
                    'purchasePlanID'     => $purchasePlanID,
                    'arrListIDTableKiri' => $arrListIDTableKiri
                ]
            ]));
    }

    if (empty($allTableKananData) || !is_array($allTableKananData)) {
        return $this->output
            ->set_content_type('application/json')
            ->set_status_header(200)
            ->set_output(json_encode([
                'status'        => 'success',
                'message'       => 'No payment details to save.',
                'saved_records' => 0
            ]));
    }

    $this->db->trans_start();
    $saved_count = 0;
    $error_logs  = [];

    try {
        foreach ($allTableKananData as $index => $row) {
            $purchasePlanDtlID = $arrListIDTableKiri[$index] ?? $arrListIDTableKiri[0];

            // Case 1: Nested structure (paymentDetails[])
            if (isset($row['paymentDetails']) && is_array($row['paymentDetails'])) {
                foreach ($row['paymentDetails'] as $paymentIndex => $p) {
                    $insertData = [
                        'PurchasePlanDtlID' => $purchasePlanDtlID,
                        'PaymentDate'       => $p['paymentDate'] ?? null,
                        'Notes'             => $p['notes'] ?? null,
                        '[Percent]'         => $p['percent'] ?? null,
                        'FromValue'         => $p['formValue'] ?? null,
                        '[Alert]'           => $p['alert'] ?? null,
                        'Term'              => $p['termDays'] ?? null,
                        'OACredit'          => $p['oaCredit'] ?? $p['OACredit'] ?? $p['OACreditTableKanan'] ?? null,
                    ];

                    error_log("Insert (nested): " . json_encode($insertData));

                    //  Pakai set() supaya semua field pasti masuk
                    $this->db->set('PurchasePlanDtlID', $insertData['PurchasePlanDtlID']);
                    $this->db->set('PaymentDate', $insertData['PaymentDate']);
                    $this->db->set('Notes', $insertData['Notes']);
                    $this->db->set('[Percent]', $insertData['[Percent]']);
                    $this->db->set('FromValue', $insertData['FromValue']);
                    $this->db->set('[Alert]', $insertData['[Alert]']);
                    $this->db->set('Term', $insertData['Term']);
                    $this->db->set('OACredit', $insertData['OACredit']);

                    $inserted = $this->db->insert('dbtPurchasePlanDtlPayment');

                    if ($inserted) {
                        $paymentID = $this->db->insert_id(); 
                        $saved_count++;

                        // Insert ke History
                        $history_data = $insertData;
                        $history_data['PaymentID']   = $paymentID;
                        $history_data['StartDate']  = date('Y-m-d H:i:s');
                        $history_data['EditDate']  = date('Y-m-d H:i:s');
                        $history_data['EditUserID'] = $this->userid;

                        $this->db->insert('dbtPurchasePlanDtlPaymentHistory', $history_data);
                    } else {
                        $error = $this->db->error();
                        $error_logs[] = [
                            'row'    => $index,
                            'detail' => $paymentIndex,
                            'error'  => $error
                        ];
                    }
                }
            } 
            // Case 2: Legacy flat structure
            else {
                $paymentDates = $row['paymentDate'] ?? [];
                $notes        = $row['notes'] ?? [];
                $percents     = $row['percent'] ?? [];
                $formValues   = $row['formValue'] ?? [];
                $alerts       = $row['alert'] ?? [];
                $terms        = $row['termDays'] ?? [];
                $oaCreditsRaw = $row['oaCredit'] ?? $row['OACredit'] ?? $row['OACreditTableKanan'] ?? null;
                $oaCredits    = is_array($oaCreditsRaw) ? $oaCreditsRaw : [$oaCreditsRaw];


                $maxCount = max(
                    count($paymentDates),
                    count($notes),
                    count($percents),
                    count($formValues),
                    count($alerts),
                    count($terms),
                    count($oaCredits)
                );

                for ($i = 0; $i < $maxCount; $i++) {
                    $data_to_save = [
                        'PurchasePlanDtlID' => $purchasePlanDtlID,
                        'PaymentDate'       => $paymentDates[$i] ?? null,
                        'Notes'             => $notes[$i] ?? null,
                        '[Percent]'           => $percents[$i] ?? null,
                        'FromValue'         => $formValues[$i] ?? null,
                        '[Alert]'             => $alerts[$i] ?? null,
                        'Term'              => $terms[$i] ?? null,
                        'OACredit'          => $oaCredits[$i] ?? null,
                    ];

                    $inserted = $this->db->insert('dbtPurchasePlanDtlPayment', $data_to_save);

                    if ($inserted) {
                        $paymentID = $this->db->insert_id(); 
                        $saved_count++;

                        // Insert ke History
                        $history_data = $data_to_save;
                        $history_data['PaymentID']   = $paymentID;
                        $history_data['StartDate']  = date('Y-m-d H:i:s');
                        $history_data['EditUserID'] = $this->userid;

                        $this->db->insert('dbtPurchasePlanDtlPaymentHistory', $history_data);
                    } else {
                        $error = $this->db->error();
                        $error_logs[] = [
                            'row'   => $index,
                            'index' => $i,
                            'error' => $error
                        ];
                    }
                }
            }
        }

        $this->db->trans_complete();

        if ($this->db->trans_status() === FALSE) {
            throw new Exception('Database transaction failed');
        }

        $response = [
            'status'        => 'success',
            'message'       => "Payment details berhasil disimpan. Total: $saved_count records.",
            'saved_records' => $saved_count
        ];

        if (!empty($error_logs)) {
            $response['warnings'] = $error_logs;
        }

        return $this->output
            ->set_content_type('application/json')
            ->set_status_header(200)
            ->set_output(json_encode($response));

    } catch (Exception $e) {
        $this->db->trans_rollback();
        return $this->output
            ->set_content_type('application/json')
            ->set_status_header(500)
            ->set_output(json_encode([
                'status'  => 'error',
                'message' => $e->getMessage(),
                'debug'   => [
                    'line' => $e->getLine(),
                    'file' => basename($e->getFile())
                ]
            ]));
    }
}

public function save_payment_calc_summary()
{
    $input = file_get_contents('php://input');
    $data  = json_decode($input, true);

    if (!isset($data['purchasePlanID']) || !isset($data['calcResult'])) {
        return $this->output
            ->set_content_type('application/json')
            ->set_status_header(400)
            ->set_output(json_encode([
                'status' => 'error',
                'message' => 'purchasePlanID dan calcResult wajib.'
            ]));
    }

    $purchasePlanID = $data['purchasePlanID'];
    $resultRows     = $data['calcResult'];

    // Ambil DocID dan DocType dari tabel utama
    $plan = $this->db->get_where('dbtPurchasePlan', [
        'ID' => $purchasePlanID
    ])->row_array();

    if (!$plan) {
        return $this->output
            ->set_content_type('application/json')
            ->set_status_header(404)
            ->set_output(json_encode([
                'status' => 'error',
                'message' => 'Purchase plan tidak ditemukan.'
            ]));
    }

    $docID = $plan['ID'];
    $docType = $plan['DocType'];

    $this->db->trans_start();

    foreach ($resultRows as $r) {

        // ubah tanggal format dd-mm-yyyy → yyyy-mm-dd
        $date = null;
        if (!empty($r['paymentDate'])) {
            $dt = DateTime::createFromFormat('d-m-Y', $r['paymentDate']);
            if ($dt) $date = $dt->format('Y-m-d');
        }

        $insert = [
            "DocID"         => $docID,
            "DocType"       => $docType,
            "PaymentPlanID" => $r['paymentPlanID'],
            "PaymentDate"   => $date,
            "Notes"         => $r['notes'],
            "FromValue"     => $r['fromValue'],
            "[Alert]"       => $r['alert'],
            "[Percent]"     => $r['percent'],
            "Total"         => $r['payment'],
        ];

        $this->db->insert("dbtPaymentPlanSummary", $insert);
    }

    $this->db->trans_complete();

    if (!$this->db->trans_status()) {
        return $this->output
            ->set_content_type('application/json')
            ->set_status_header(500)
            ->set_output(json_encode([
                'status' => 'error',
                'message' => 'Database transaction failed.'
            ]));
    }

    return $this->output
        ->set_content_type('application/json')
        ->set_status_header(200)
        ->set_output(json_encode([
            'status' => 'success',
            'message' => 'Payment calc berhasil disimpan.'
        ]));
}





}
