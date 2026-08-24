<?php if (! defined('BASEPATH')) exit('No direct script access allowed');
class purchase_order_m extends CI_Model
{
    function __construct()
    {
        parent::__construct();
    }

    public function get_purchase_plan_shipment_data()
    {
        $this->db->from('dbtPurchasePlanDtlShipment');
        $query = $this->db->get();
        return $query->result_array();
    }

    public function insertPurchasePlanDtl($data)
    {
        $this->db->insert('dbtPurchasePlanDtl', $data);
        return $this->db->insert_id();
    }

    // Payment History (relasi dengan PurchasePlanDtlID)
    public function closeDtlHistory($purchasePlanDtlID)
    {
        $this->db->where('PurchasePlanDtlID', $purchasePlanDtlID);
        $this->db->where('EndDate IS NULL', null, false);
        return $this->db->update('dbtPurchasePlanDtlPaymentHistory', [
            'EndDate' => date('Y-m-d H:i:s')
        ]);
    }

    public function insertDtlHistory($data)
    {
        return $this->db->insert('dbtPurchasePlanDtlPaymentHistory', $data);
    }

    public function insertPurchasePlanDtlShipment($data)
    {
        $this->db->insert('dbtPurchasePlanDtlShipment', $data);
        return $this->db->insert_id();
    }

    // Shipment History (relasi dengan PurchasePlanID)
    public function closeShipmentHistory($purchasePlanID)
    {
        // Tutup baris aktif (set EndDate = sekarang)
        $this->db->where('PurchasePlanID', $purchasePlanID);
        $this->db->where('EndDate IS NULL', null, false);
        return $this->db->update('dbtPurchasePlanDtlShipmentHistory', [
            'EndDate' => date('Y-m-d H:i:s'),
            'EditUserID' => $this->userid
        ]);
    }

    public function insertShipmentHistory($data)
    {
        // Cari StartDate lama
        $this->db->select('StartDate');
        $this->db->from('dbtPurchasePlanDtlShipmentHistory');
        $this->db->where('PurchasePlanID', $data['PurchasePlanID']);
        $this->db->order_by('StartDate', 'ASC');
        $this->db->limit(1);
        $query = $this->db->get();
        $row = $query->row();

        if ($row) {
            $data['StartDate'] = $row->StartDate; // gunakan StartDate lama
        } else {
            $data['StartDate'] = date('Y-m-d H:i:s'); // kalau baru pertama kali
        }

        $data['EditDate'] = date('Y-m-d H:i:s');
        $data['EditUserID'] = $this->userid;

        return $this->db->insert('dbtPurchasePlanDtlShipmentHistory', $data);
    }

    // Close histori lama
    public function closePaymentHistory($purchasePlanDtlID, $userID)
    {
        $this->db->where('PurchasePlanDtlID', $purchasePlanDtlID);
        $this->db->where('EndDate IS NULL', null, false);
        return $this->db->update('dbtPurchasePlanDtlPaymentHistory', [
            'EndDate'    => date('Y-m-d H:i:s'),
            'EditUserID' => $userID
        ]);
    }

    public function insertPurchasePlanDtlPayment($data)
    {
        $this->db->insert('dbtPurchasePlanDtlPayment', $data);
        return $this->db->insert_id();
    }

    // Insert histori baru
    public function insertPaymentHistory($data)
    {
        return $this->db->insert('dbtPurchasePlanDtlPaymentHistory', $data);
    }

    // Ambil StartDate pertama untuk histori
    public function getFirstPaymentStartDate($purchasePlanDtlID)
    {
        $q = $this->db->select('MIN(StartDate) AS StartDate')
                    ->from('dbtPurchasePlanDtlPaymentHistory')
                    ->where('PurchasePlanDtlID', $purchasePlanDtlID)
                    ->get()->row();
        return ($q && !empty($q->StartDate)) ? $q->StartDate : null;
    }
    public function insert_payment_detail($data)
    {
        // Handle [Percent] (SQL Server reserved word) - consistent dengan controller
        if (isset($data['[Percent]'])) {
            $percentValue = $data['[Percent]'];
            unset($data['[Percent]']);
            $this->db->set('[Percent]', $percentValue, false);
        }

        // Handle [Alert] (SQL Server reserved word juga)
        if (isset($data['[Alert]'])) {
            $alertValue = $data['[Alert]'];
            unset($data['[Alert]']);
            $this->db->set('[Alert]', $alertValue, false);
        }

        // Pastikan FK masuk dengan type casting
        if (isset($data['PurchasePlanDtlID'])) {
            $this->db->set('PurchasePlanDtlID', (int)$data['PurchasePlanDtlID']);
            unset($data['PurchasePlanDtlID']);
        }

        // Log data yang akan diinsert
        log_message('debug', 'Data to insert: ' . json_encode($data));

        // INSERT ke tabel yang benar
        $result = $this->db->insert('dbtPurchasePlanDtlPayment', $data);

        log_message('debug', 'Last Query insert_payment_detail: ' . $this->db->last_query());

        $db_error = $this->db->error();
        if (!empty($db_error['message'])) {
            log_message('error', 'Insert payment detail gagal: ' . json_encode($db_error));
            return false;
        }

        if (!$result) {
            log_message('error', 'Insert payment detail failed without specific error');
            return false;
        }

        $insert_id = $this->db->insert_id();
        log_message('debug', 'Payment detail inserted with ID: ' . $insert_id);
        
        return $insert_id;
    }

    public function insert_payment_history($inserted_payment_id, $data_main, $userID)
    {
        // Log input parameters
        // Validasi input
        if (empty($inserted_payment_id)) {
            log_message('error', 'PurchasePlanDtlPaymentID is NULL or empty');
            return false;
        }

        // Prepare base data (non-reserved fields)
        $base_data = [
            'PurchasePlanDtlPaymentID' => $inserted_payment_id,
            'PurchasePlanDtlID' => $data_main['PurchasePlanDtlID'],
            'PaymentDate'       => $data_main['PaymentDate'] ?? null,
            'Notes'             => $data_main['Notes'] ?? null,
            'FromValue'         => $data_main['FromValue'] ?? null,
            'Term'              => $data_main['Term'] ?? null,
            'OACredit'          => $data_main['OACredit'] ?? null,
            'StartDate'         => date('Y-m-d H:i:s'),
            'EditDate'          => date('Y-m-d H:i:s'),
            'EditUserID'        => $userID,
            'EndDate'           => null
        ];

        // Insert base data first
        $this->db->insert('dbtPurchasePlanDtlPaymentHistory', $base_data);

        // Get the inserted ID for updating reserved fields
        $history_id = $this->db->insert_id();
        
        if ($history_id) {
            // Update reserved fields using SET with brackets
            if (isset($data_main['[Percent]']) && $data_main['[Percent]'] !== null) {
                $this->db->where('ID', $history_id); // Assuming ID is primary key
                $this->db->set('[Percent]', $data_main['[Percent]'], false);
                $this->db->update('dbtPurchasePlanDtlPaymentHistory');
            }

            if (isset($data_main['[Alert]']) && $data_main['[Alert]'] !== null) {
                $this->db->where('ID', $history_id); // Assuming ID is primary key
                $this->db->set('[Alert]', $data_main['[Alert]'], false);
                $this->db->update('dbtPurchasePlanDtlPaymentHistory');
            }
        }

        log_message('debug', 'Last Query insert_payment_history: ' . $this->db->last_query());

        $db_error = $this->db->error();
        if (!empty($db_error['message'])) {
            log_message('error', 'Insert history gagal: ' . json_encode($db_error));
            return false;
        }

        return true;
    }
    public function getFilteredData($itemDesc, $quarter, $docDateStart, $docDateEnd, $docNumber, $vendorId, $planGroup) {
        $this->db->select('p.*, d.Vendor, v.Description as VendorName');
        $this->db->from('dbtPurchasePlan p');
        $this->db->join('dbtPurchasePlanDtl d', 'd.PurchasePlanID = p.PurchasePlanID', 'left');
        $this->db->join('_dbmcoattr v', 'v.ID = d.Vendor', 'left');

        // Filter ItemDesc
        if (!empty($itemDesc)) {
            $this->db->like('p.ItemDesc', $itemDesc);
        }

        // Filter Quarter
        if (!empty($quarter)) {
            $this->db->where('p.Quarter', $quarter);
        }

        // Filter DocDate range
        if (!empty($docDateStart) && !empty($docDateEnd)) {
            $this->db->where("p.DocDate >=", $docDateStart);
            $this->db->where("p.DocDate <=", $docDateEnd);
        }

        // Filter DocNumber (case-insensitive)
        if (!empty($docNumber)) {
            $this->db->where("LOWER(p.DocNumber) LIKE", "%" . strtolower($docNumber) . "%");
        }

        // Filter Vendor ID
        if (!empty($vendorId)) {
            $this->db->where('d.Vendor', $vendorId);
        }
        if (!empty($planGroup)) {
            $this->db->where('p.PlanGroupID', $planGroup);
        }

        $query = $this->db->get();
        return $query->result_array();
    }
    public function searchVendor($term = '')
    {
        $this->db->distinct();
        $this->db->select('v.ID, v.Description');
        $this->db->from('dbtPurchasePlanDtl d');
        $this->db->join('dbmcoaattr v', 'v.ID = d.Vendor', 'left');
        

        if (!empty($term)) {
            $this->db->like('v.Description', $term, 'both');
        }

        $this->db->limit(20);

        $query = $this->db->get();

        if (!$query) {
            $error = $this->db->error();
            log_message('error', 'DB Error searchVendor: ' . print_r($error, true));
            return [];
        }

        return $query->result_array();
    }


    public function insert_purchase_order_plan($data)
    {
        $this->db->insert('dbtPurchasePlanDtlShipment', $data);
        return $this->db->insert_id(); // Perbaikan: hapus return yang duplikat
    }

    public function insert_purchase_plan_header($data)
    {
        $this->db->insert('dbtpurchaseplan', $data);
        return $this->db->insert_id();
    }
    // Method untuk insert ke tabel history
    public function insert_shipment_history($shipmentID, $data_main, $userID)
    {
        $history_data = [
            // Data dari tabel utama (warna kuning di gambar)
            'ShipmentID'        => $shipmentID,
            'Vendor'            => $data_main['Vendor'],
            'ItemID'            => $data_main['ItemID'],
            'PurchasePlanID'    => $data_main['PurchasePlanID'],
            'ItemUnitID'    => $data_main['ItemUnitID'],
            'Color'             => $data_main['Color'],
            'ShipmentDate'      => $data_main['ShipmentDate'],
            'Qty'               => $data_main['Qty'],
            'Price'             => $data_main['Price'],
            'PODateEst'         => $data_main['PODateEst'],
            'Term'              => $data_main['Term'],
            'Batch'             => $data_main['Batch'],
            'BlanketID'         => $data_main['BlanketID'],
            'Closed'            => $data_main['Closed'],
            
            // Data khusus history (warna putih di gambar)
            'StartDate'         => date('Y-m-d H:i:s'),
            'EditDate'          => date('Y-m-d H:i:s'),
            'EditUserID'        => $userID,
            
            // Data yang bisa null (warna abu-abu di gambar)
            'EndDate'           => null
        ];

        $this->db->insert('dbtPurchasePlanDtlShipmentHistory', $history_data);
        $db_error = $this->db->error();
        if (!$this->db->affected_rows()) {
            log_message('error', 'Insert history gagal: ' . json_encode($this->db->error()));
            return false;
        }

        return true;
    }

    // public function insert_payment_history($purchasePlanDtlID, $data_main, $userID)
    // {
    //     $history_data = [
    //         // Data dari tabel utama (warna kuning di gambar)
    //         'PurchasePlanDtlID' => $purchasePlanDtlID,
    //         'PaymentDate'       => $data_main['PaymentDate'],
    //         'Notes'             => $data_main['Notes'],
    //         'Percent'           => $data_main['Percent'],
    //         'FromValue'         => $data_main['FromValue'],
    //         'Alert'             => $data_main['Alert'],
    //         'Term'              => $data_main['Term'],
    //         'OACredit'          => $data_main['OACredit'],
            
    //         // Data khusus history (warna putih di gambar)
    //         'StartDate'         => date('Y-m-d H:i:s'),
    //         'EditDate'          => date('Y-m-d H:i:s'),
    //         'EditUserID'        => $userID,
            
    //         // Data yang bisa null (warna abu-abu di gambar)
    //         'EndDate'           => null
    //     ];

    //     $this->db->insert('dbtPurchasePlanDtlPaymentHistory', $history_data);

    //     $db_error = $this->db->error();
    //     if (!empty($db_error['message'])) {
    //         log_message('error', 'Insert history gagal: ' . json_encode($db_error));
    //         return false;
    //     }

    //     return true;

    // }


// Method alternatif dengan error handling yang lebih baik
public function insert_purchase_plan_dtl($data)
{
    try {
        // Log data yang akan diinsert
        log_message('debug', 'insert_purchase_plan_dtl data: ' . print_r($data, true));
        
        // Validasi data
        if (empty($data) || !is_array($data)) {
            log_message('error', 'insert_purchase_plan_dtl: Invalid data provided');
            return false;
        }
        
        // Insert ke database
        $this->db->insert('dbtPurchasePlanDtl', $data);
        
        // Log query yang dijalankan
        log_message('debug', 'insert_purchase_plan_dtl query: ' . $this->db->last_query());
        
        // Cek apakah insert berhasil
        if ($this->db->affected_rows() > 0) {
            $insert_id = $this->db->insert_id();
            log_message('debug', 'insert_purchase_plan_dtl success, ID: ' . $insert_id);
            return $insert_id;
        } else {
            log_message('error', 'insert_purchase_plan_dtl: No rows affected');
            return false;
        }
        
    } catch (Exception $e) {
        log_message('error', 'insert_purchase_plan_dtl exception: ' . $e->getMessage());
        return false;
    }
}

// Method untuk test koneksi database
public function test_db_connection()
{
    try {
        $query = $this->db->query("SELECT 1 as test");
        return $query->row_array();
    } catch (Exception $e) {
        log_message('error', 'Database connection test failed: ' . $e->getMessage());
        return false;
    }
}

// Method untuk cek struktur tabel
public function check_table_structure()
{
    try {
        $query = $this->db->query("DESCRIBE dbtPurchasePlanDtl");
        return $query->result_array();
    } catch (Exception $e) {
        log_message('error', 'Table structure check failed: ' . $e->getMessage());
        return false;
    }
}
    public function get_latest_purchase_plan_id()
    {
        $this->db->select_max('ID');
        $query = $this->db->get('dbtpurchaseplan');
        $result = $query->row_array();
        return $result['ID'] ?? null;
    }
    public function get_latest_purchase_plan_dtl_summary()
    {

        $this->db->select_max('PurchasePlanID');
        $query_max_id = $this->db->get('dbtPurchasePlanDtl');
        $latest_plan_id_row = $query_max_id->row_array();
        $latest_plan_id = $latest_plan_id_row['PurchasePlanID'] ?? null;

        if (empty($latest_plan_id)) {
            return [];
        }

        $this->db->select('ID, PurchasePlanID, Vendor, Batch, BlanketPODateEst, Total');
        $this->db->from('dbtPurchasePlanDtl');
        $this->db->where('PurchasePlanID', $latest_plan_id);
        $query_summary = $this->db->get();
        return $query_summary->result_array();
    }

    private function getPOPlanShipments($docId) {
        if (empty($docId)) {
            return [];
        }
        
        $sql = "SELECT ID, Qty, ETD, ItemID, ItemUnitID
                FROM tPOPlan 
                WHERE DocID = ?
                ORDER BY ETD";
        $result = $this->db->query($sql, [$docId])->result_array();
        
        return $result;
    }

    public function getPOPlanShipmentsByDocID($docId)
    {
        $sql = "
            SELECT 
                t.ID,
                t.DocID,
                t.ETD,
                t.ItemID,
                t.ItemUnitID,
                t.Qty,
                d.DocNumber,
                t.ReffDocID,
                t.ReffShipmentID
            FROM tPOPlan t
            LEFT JOIN dbtItemDoc d ON d.ID = t.DocID
            WHERE d.void = 0 AND t.DocID = ?
        ";
        return $this->db->query($sql, [$docId])->result_array();
    }


    private function getDocNumberById($docID) {
        if (empty($docID)) {
            return null;
        }
        
        $sql = "SELECT DocNumber FROM dbtItemDoc WHERE ID = ?";
        $result = $this->db->query($sql, [$docID])->row_array();
        
        return $result ? $result['DocNumber'] : null;
    }

    private function get_iso_week_from_date($dateStr) {
        try {
            $date = new DateTime($dateStr);
        } catch (Exception $e) {
            // Fallback
            return ['year' => date('Y'), 'week' => date('W')];
        }
        
        $isoYear = (int)$date->format('o'); // ISO-8601 year
        $isoWeek = (int)$date->format('W'); // ISO-8601 week number
        
        return [
            'year' => $isoYear,
            'week' => $isoWeek
        ];
    }
    public function getIndonesianHoliday($year)
    {
        $this->db->where('YEAR(Date)', $year, FALSE);
        return $this->db->get('tLiburNasional')->result();
    }
    public function getPurchasePlanData(
        $item_description_filter = '', 
        $quarter_filter = '', 
        $doc_date_start = '', 
        $doc_date_end = '', 
        $doc_number_filter = '', 
        $vendor_id_filter = '',
        $year_filter = '',
        $plan_group_id_filter = ''
        ) {
            // Build dynamic filter conditions
            $filter_conditions = [];
            $filter_params = [];
            
            // Item description filter
            if (!empty($item_description_filter)) {
                $filter_conditions[] = "pp.ItemDesc LIKE ?";
                $filter_params[] = '%' . $item_description_filter . '%';
            }
            
            
            // Quarter filter - HATI-HATI: DATEPART(wk, NULL) = NULL di beberapa SQL Server
            if (!empty($quarter_filter)) {
                $quarter_map = [
                    'Q1' => ['start' => 1, 'end' => 12],
                    'Q2' => ['start' => 13, 'end' => 24],
                    'Q3' => ['start' => 25, 'end' => 36],
                    'Q4' => ['start' => 37, 'end' => 48]
                ];
                if (isset($quarter_map[$quarter_filter])) {
                    $start_week = $quarter_map[$quarter_filter]['start'];
                    $end_week = $quarter_map[$quarter_filter]['end'];
                    // FIX: Use ISNULL untuk safe NULL handling
                    $filter_conditions[] = "DATEPART(wk, ISNULL(ppsh.ShipmentDate, GETDATE())) BETWEEN ? AND ?";
                    $filter_params[] = $start_week;
                    $filter_params[] = $end_week;
                }
            }
            
            if (!empty($doc_date_start) && !empty($doc_date_end)) {
                $filter_conditions[] = "ISNULL(ppsh.ShipmentDate, GETDATE()) BETWEEN ? AND ?";
                $filter_params[] = $doc_date_start;
                $filter_params[] = $doc_date_end;
            } elseif (!empty($doc_date_start)) {
                $filter_conditions[] = "ISNULL(ppsh.ShipmentDate, GETDATE()) >= ?";
                $filter_params[] = $doc_date_start;
            } elseif (!empty($doc_date_end)) {
                $filter_conditions[] = "ISNULL(ppsh.ShipmentDate, GETDATE()) <= ?";
                $filter_params[] = $doc_date_end;
            }
            
            // Doc number filter
            if (!empty($doc_number_filter)) {
                $filter_conditions[] = "pp.DocNumber LIKE ?";
                $filter_params[] = '%' . $doc_number_filter . '%';
            }
            
            // Vendor filter
            if (!empty($vendor_id_filter)) {
                $filter_conditions[] = "ppsh.Vendor = ?";
                $filter_params[] = $vendor_id_filter;
            }
            // Year filter - HATI-HATI: YEAR(NULL) = NULL
            if (!empty($year_filter)) {
                $filter_conditions[] = "YEAR(ISNULL(ppsh.ShipmentDate, GETDATE())) = ?";
                $filter_params[] = $year_filter;
            }

            // Plan Group ID filter
            if ($plan_group_id_filter !== '' && $plan_group_id_filter !== null) {
                $filter_conditions[] = "pp.PlanGroupID = ?";
                $filter_params[] = (int)$plan_group_id_filter;
            }

            // Combine all filter conditions
            $where_clause = '';
            if (!empty($filter_conditions)) {
                $where_clause = 'AND ' . implode(' AND ', $filter_conditions);
            }

            // Query yang disederhanakan - ambil semua data yang valid, grouping dilakukan di PHP
            // PENTING: Include data dengan POID (closed=2) yang mungkin tidak punya ShipmentDate
            $sql = " 
        SELECT 
            pp.ID, 
            pp.DocDate, 
            pp.DocNumber, 
            v.Description AS Vendor, 
            ppsh.Vendor AS VendorID,
            pp.ItemDesc,
            pp.PlanGroupID, 
            pg.AttributeValue AS PlanGroupName,
            ppsh.ShipmentID,
            ppsh.PurchasePlanID, 
            ppsh.ShipmentDate, 
            ppsh.ItemID,
            ppsh.ItemUnitID,
            ppsh.Batch,     
            i.Code AS ItemCode,  
            ppsh.Color, 
            ppsh.Closed,
            ppsh.Price, 
            ppsh.BlanketID, 
            ppsh.POID, 
            ppsh.EditDate, 
            ppsh.HistoryID,
            YEAR(ISNULL(ppsh.ShipmentDate, GETDATE())) AS YearNumber,
            DATEPART(wk, ISNULL(ppsh.ShipmentDate, GETDATE())) AS WeekNumber,
            ppsh.Qty,
            pdt.Total, 
            pp.CreateUserID, 
            gu.DisplayName AS CreateUser, 
            pp.CreateDate 
        FROM dbtPurchasePlan pp 
        INNER JOIN (
            SELECT 
                sh.PurchasePlanID,
                sh.ShipmentID,
                sh.ShipmentDate,
                sh.ItemID,
                sh.ItemUnitID,
                sh.Batch,
                sh.Color,
                sh.Closed,
                sh.Vendor,
                SUM(sh.Qty) AS Qty,
                MAX(sh.Price) AS Price,
                sh.BlanketID,
                sh.POID,
                MAX(sh.EditDate) AS EditDate,
                MAX(sh.ID) AS HistoryID
            FROM dbtPurchasePlanDtlShipmentHistory sh
            WHERE sh.EndDate IS NULL
            GROUP BY 
                sh.PurchasePlanID,
                sh.ShipmentID,
                sh.ShipmentDate,
                sh.ItemID,
                sh.ItemUnitID,
                sh.Batch,
                sh.Color,
                sh.Vendor,
                sh.BlanketID,
                sh.POID,
                sh.Closed
        ) ppsh
            ON ppsh.PurchasePlanID = pp.ID
        LEFT JOIN dbmcoaattr v 
            ON v.ID = ppsh.Vendor 
        LEFT JOIN mAttributeValue pg 
            ON pg.ID = pp.PlanGroupID
        LEFT JOIN (
            SELECT * FROM (
                SELECT *, 
                    ROW_NUMBER() OVER (
                        PARTITION BY PurchasePlanID, Vendor, Batch
                        ORDER BY ID DESC
                    ) rn
                FROM dbtPurchasePlanDtl
            ) t WHERE rn = 1
        ) pdt  
            ON pdt.PurchasePlanID = pp.ID 
            AND pdt.Vendor = ppsh.Vendor 
            AND pdt.Batch = ppsh.Batch 
        LEFT JOIN dbsGroupUser gu 
            ON gu.ID = pp.CreateUserID 
        LEFT JOIN dbmItemUnit iu 
            ON iu.ItemID = ppsh.ItemID 
        LEFT JOIN dbmItem i 
            ON i.ID = iu.ItemID 
        WHERE pp.Void != 1  
        " . $where_clause . " 
        ORDER BY 
            CASE WHEN pp.PlanGroupID IS NULL OR pp.PlanGroupID = 0 THEN 1 ELSE 0 END ASC,
            pp.PlanGroupID ASC,
            pp.CreateDate ASC,
            ppsh.PurchasePlanID, 
            ppsh.ItemID, 
            ppsh.Vendor, 
            ppsh.Color, 
            ppsh.Batch, 
            ppsh.ShipmentDate

            ";

            $query = $this->db->query($sql, $filter_params);
            $raw_data = $query->result_array();
            $existingShipmentIds = [];

            $all_poids = [];
            foreach ($raw_data as $row) {
                if (isset($row['POID']) && is_numeric($row['POID']) && (int)$row['POID'] > 0) {
                    $poid_val = (int)$row['POID'];
                    $all_poids[$poid_val] = true;
                }
                if (isset($row['BlanketID']) && is_numeric($row['BlanketID']) && (int)$row['BlanketID'] > 0) {
                    $blanket_val = (int)$row['BlanketID'];
                    $all_poids[$blanket_val] = true;
                }
            }
            
            $all_poids = array_keys($all_poids);
            
            $po_shipments_by_doc = [];
            foreach ($all_poids as $docId) {
                $poShipments = $this->getPOPlanShipmentsByDocID($docId);
                $po_shipments_by_doc[$docId] = $poShipments;
            }
            // Ambil semua PurchasePlanID dari raw_data
            $purchasePlanIds = [];
            foreach ($raw_data as $row) {
                $purchasePlanIds[(int)$row['PurchasePlanID']] = true;
            }
            $purchasePlanIds = array_keys($purchasePlanIds);

            $payments_by_ppid = [];

            if (!empty($purchasePlanIds)) {
                $in = implode(',', array_fill(0, count($purchasePlanIds), '?'));

                $sql_payment = "
                    SELECT 
                        p.PurchasePlanDtlID,
                        p.PaymentDate,
                        p.[Percent],
                        p.FromValue,
                        p.[Alert],
                        p.Term,
                        p.OACredit,
                        d.PurchasePlanID
                    FROM dbtPurchasePlanDtlPayment p
                    JOIN dbtPurchasePlanDtl d 
                        ON d.ID = p.PurchasePlanDtlID
                    WHERE d.PurchasePlanID IN ($in)
                ";

                $query_payment = $this->db->query($sql_payment, $purchasePlanIds);
                $payment_rows = $query_payment->result_array();

                foreach ($payment_rows as $p) {
                    $ppid = (int)$p['PurchasePlanID'];
                    $payments_by_ppid[$ppid][] = $p;
                }
            }

            // Grouping data di PHP untuk menggabungkan shipment date yang berbeda
            $grouped_data = [];
            $used_spblk = [];
            $processed_po_ids = [];  // FIX: Track PO yang sudah diproses di PASS 1
            
            foreach ($raw_data as $row) {
                $existingShipmentIds[$row['ShipmentID']] = true;

                // Buat key unik berdasarkan kolom yang ingin digabung
                // $itemCode = trim((string)$row['ItemCode']); // pastikan string aman

                // $group_key_base = $row['PurchasePlanID'] . '|' . 
                //             $row['ItemDesc'] . '|' . 
                //             $row['Vendor'] . '|' . 
                //             $row['Color'] . '|' .
                //             $row['ItemID'] . '|' . 
                //             ($row['ItemUnitID'] ?? ''); 
                // // Jika ItemCode diisi, tambahkan ke key agar dipisah
                // if ($itemCode !== '' && $itemCode !== null) {
                //     $group_key = $group_key_base . '|' . $itemCode;
                // } else {
                //     $group_key = $group_key_base; // tetap gabung kalau kosong
                // }

                $group_key = implode('|', [
                    (int)$row['PurchasePlanID'],
                    trim($row['ItemDesc']),
                    trim($row['Vendor']),
                    trim($row['Color'] ?? '')
                ]);
                        
                if (!isset($grouped_data[$group_key])) {
                    // Inisialisasi data untuk grup baru
                    $grouped_data[$group_key] = [
                        'ID' => $row['ID'],
                        'DocDate' => $row['DocDate'],
                        'DocNumber' => $row['DocNumber'],
                        'Vendor' => $row['Vendor'],
                        'VendorID' => $row['VendorID'],
                        'ItemDesc' => $row['ItemDesc'],
                        'PlanGroupID' => $row['PlanGroupID'],
                        'PlanGroupName' => $row['PlanGroupName'] ?? null,
                        'Year' => $row['YearNumber'],
                        'ShipmentID' => $row['ShipmentID'], // Ambil yang pertama
                        'PurchasePlanID' => $row['PurchasePlanID'],
                        'ShipmentDate' => $row['ShipmentDate'], // Ambil yang pertama  
                        'ItemID' => $row['ItemID'],
                        'ItemUnitID' => $row['ItemUnitID'] ?? null,
                        'Batch' => $row['Batch'],
                        'ItemCode' => $row['ItemCode'],
                        'Color' => $row['Color'],
                        'Price' => $row['Price'],
                        'BlanketID' => $row['BlanketID'],
                        'POIDs' => [],  //  FIX: Array of POIDs instead of single POID (1 group = many POIDs possible)
                        'Closed' => $row['Closed'],
                        'EditDate' => $row['EditDate'], // Akan di-update jika ada yang lebih baru
                        'HistoryID' => $row['HistoryID'], // Ambil yang pertama
                        'TotalQtyBLG' => 0,
                        'weekly_qtys' => '',
                        'weekly_data' => [],
                        'Total' => $row['Total'],
                        'CreateUserID' => $row['CreateUserID'],
                        'CreateUser' => $row['CreateUser'],
                        'CreateDate' => $row['CreateDate'],
                        'has_blanket' => false,  //  Track: ada shipment blanket?
                        'has_po' => false,       //  Track: ada shipment PO?
                        'has_po_plan' => false   // Track apakah punya PO Plan
                    ];
                }
                
                // Update EditDate jika lebih baru
                if (strtotime($row['EditDate']) > strtotime($grouped_data[$group_key]['EditDate'])) {
                    $grouped_data[$group_key]['EditDate'] = $row['EditDate'];
                }

                //  FIX: Collect ALL POIDs into array - STRICT validation
                // Hanya terima POID yang truly numeric dan > 0
                if (!empty($row['POID'])) {
                    $poid_val = (int)$row['POID'];
                    if ($poid_val > 0) {
                        $grouped_data[$group_key]['POIDs'][$poid_val] = true;
                        $grouped_data[$group_key]['has_po'] = true;
                    }
                }
                
                // Set has_blanket HANYA jika BlanketID ada
                if (!empty($row['BlanketID'])) {
                    $grouped_data[$group_key]['has_blanket'] = true;
                }
                
                // Update BlanketID: Ambil yang pertama non-NULL
                if (empty($grouped_data[$group_key]['BlanketID']) && !empty($row['BlanketID'])) {
                    $grouped_data[$group_key]['BlanketID'] = $row['BlanketID'];
                }
                // Update Closed: Prioritas nilai tertinggi (2=SPORD > 1=SPBLK)
                if ((int)$row['Closed'] > (int)$grouped_data[$group_key]['Closed']) {
                    $grouped_data[$group_key]['Closed'] = (int)$row['Closed'];
                }
                
                // Tambahkan qty ke total
                $grouped_data[$group_key]['TotalQtyBLG'] += (int)$row['Qty'];

                if (!empty($row['ShipmentDate'])) {
                    // FIX: Jangan skip Closed=2! Handle dengan proper logic
                    
                    // Safety: Handle NULL WeekNumber (SQL Server version difference)
                    $weekNumber = !empty($row['WeekNumber']) ? (int)$row['WeekNumber'] : 1;
                    $week_key = 'ww' . $weekNumber;

                    if (!isset($grouped_data[$group_key]['weekly_data'][$week_key])) {
                        $grouped_data[$group_key]['weekly_data'][$week_key] = [];
                    }

                    $docNumber = $row['DocNumber']; // default: original DocNumber (closed: 0)
                    $qty = (int)$row['Qty']; // default dari history
                    $shipmentDate = $row['ShipmentDate']; // default dari history
                    $shipmentId = (int)$row['ShipmentID'];
                    $reffDocID = null;
                    $reffShipmentID = null;
                    $foundInPOPlan = false;
                    
                   if ((int)$row['Closed'] === 1 && !empty($row['BlanketID'])) {

                        $blanketDocNumber = $this->getDocNumberById($row['BlanketID']);
                        if (!empty($blanketDocNumber)) {
                            $docNumber = $blanketDocNumber;
                        }

                        // Collect ALL matching POs dulu sebelum add ke weekly_data
                        // FIX: Allow matching berdasarkan item properties, tidak hanya ReffShipmentID
                        $matchingPos = [];
                        
                        if (isset($po_shipments_by_doc[$row['BlanketID']])) {
                            foreach ($po_shipments_by_doc[$row['BlanketID']] as $po) {
                                // Primary match: exact ReffShipmentID
                                if (
                                    (int)$po['ItemID'] === (int)$row['ItemID'] &&
                                    (int)$po['ItemUnitID'] === (int)$row['ItemUnitID'] &&
                                    (int)$po['ReffShipmentID'] === (int)$row['ShipmentID']
                                ) {
                                    $useKey = $row['BlanketID'] . '|' . $po['ID'];

                                    if (!isset($used_spblk[$useKey])) {
                                        $used_spblk[$useKey] = true;
                                        $matchingPos[] = $po;
                                    }
                                }
                            }
                        }

                        // Add semua matching POs ke weekly_data
                        foreach ($matchingPos as $po) {
                            $qty_po = (int)$po['Qty'];
                            $shipmentDate_po = $po['ETD'];
                            $shipmentId_po = (int)$po['ID'];
                            $reffShipmentID_po = $po['ReffShipmentID'] ?? null;

                            $newWeekNum = date('W', strtotime($shipmentDate_po));
                            if (!$newWeekNum || $newWeekNum === false) {
                                $newWeekNum = 1;
                            }
                            $newWeekKey = 'ww' . (int)$newWeekNum;

                            if (!isset($grouped_data[$group_key]['weekly_data'][$newWeekKey])) {
                                $grouped_data[$group_key]['weekly_data'][$newWeekKey] = [];
                            }

                            $grouped_data[$group_key]['weekly_data'][$newWeekKey][] = [
                                'qty' => $qty_po,
                                'shipmentId' => $shipmentId_po,
                                'shipmentDate' => $shipmentDate_po,
                                'batch' => (int)$row['Batch'],
                                'closed' => (int)$row['Closed'],
                                'itemID' => (int)$row['ItemID'],
                                'itemUnitID' => $row['ItemUnitID'] ?? null,
                                'poId' => null,
                                'isSpord' => false,
                                'docNumber' => $docNumber,
                                'reffDocID' => null,
                                'reffShipmentID' => $reffShipmentID_po
                            ];
                        }

                        // Jika tidak ada matching PO, gunakan original shipment ID
                        if (empty($matchingPos)) {
                            $shipmentId = (int)$row['ShipmentID'];
                            $qty = (int)$row['Qty'];
                            $shipmentDate = $row['ShipmentDate'];
                            $reffDocID = null;
                            $reffShipmentID = null;
                            
                            $weekNumber = !empty($row['WeekNumber']) ? (int)$row['WeekNumber'] : 1;
                            $week_key = 'ww' . $weekNumber;

                            if (!isset($grouped_data[$group_key]['weekly_data'][$week_key])) {
                                $grouped_data[$group_key]['weekly_data'][$week_key] = [];
                            }
                            $ppid = (int)$row['PurchasePlanID'];
                            $payments = $payments_by_ppid[$ppid] ?? [];

                            $grouped_data[$group_key]['weekly_data'][$week_key][] = [
                                'qty' => $qty,
                                'shipmentId' => $shipmentId,
                                'shipmentDate' => $shipmentDate,
                                'batch' => (int)$row['Batch'],
                                'closed' => (int)$row['Closed'],
                                'itemID' => (int)$row['ItemID'],
                                'itemUnitID' => $row['ItemUnitID'] ?? null,
                                'poId' => null,
                                'isSpord' => false,
                                'docNumber' => $docNumber,
                                'reffDocID' => $reffDocID,
                                'reffShipmentID' => $reffShipmentID,
                                'payments' => $payments
                            ];
                        }
                        
                        // Skip penambahan ke weekly_data di bawah karena sudah dihandle di atas
                        continue;
                    } elseif ((int)$row['Closed'] === 2 && !empty($row['POID'])) {
                        // FIX: SPORD - lookup di tPOPlan via POID dengan RELAX date matching
                        // PENTING: Process ALL matching POs, jangan break setelah yang pertama!
                        $poid_val = (int)$row['POID'];
                        $spordProcessed = false;
                        
                        if (isset($po_shipments_by_doc[$poid_val]) && !empty($po_shipments_by_doc[$poid_val])) {
                            foreach ($po_shipments_by_doc[$poid_val] as $po) {
                                $poID_check = (int)$po['ID'];
                                
                                // FIX: Skip PO yang sudah diproses di row sebelumnya untuk prevent duplicate
                                if (isset($processed_po_ids[$poID_check])) {
                                    continue;
                                }
                                
                                // FIX: Relax matching - cukup item + unit, TIDAK perlu strict date
                                if ((int)$po['ItemID'] === (int)$row['ItemID'] && 
                                    (int)$po['ItemUnitID'] === (int)$row['ItemUnitID']) {
                                    
                                    $spordProcessed = true;
                                    
                                    // Calculate week untuk setiap PO yang match
                                    $shipmentDate_po = !empty($po['ETD']) ? $po['ETD'] : $row['ShipmentDate'];
                                    $newWeekNum = date('W', strtotime($shipmentDate_po));
                                    $newWeekNum = (!$newWeekNum || $newWeekNum === false) ? 1 : (int)$newWeekNum;
                                    $week_key_po = 'ww' . $newWeekNum;

                                    if (!isset($grouped_data[$group_key]['weekly_data'][$week_key_po])) {
                                        $grouped_data[$group_key]['weekly_data'][$week_key_po] = [];
                                    }

                                    // FIX: Check if shipmentId (PO) already in weekly_data untuk minggu ini
                                    // Prevent duplicate dalam row yang sama
                                    $po_id_int = (int)$po['ID'];
                                    $po_already_added = false;
                                    foreach ($grouped_data[$group_key]['weekly_data'][$week_key_po] as $existing) {
                                        if ((int)$existing['shipmentId'] === $po_id_int) {
                                            $po_already_added = true;
                                            break;
                                        }
                                    }
                                    
                                    if (!$po_already_added) {
                                        // Add setiap matching PO ke weekly_data
                                        $grouped_data[$group_key]['weekly_data'][$week_key_po][] = [
                                            'qty' => (int)$po['Qty'],
                                            'shipmentId' => $po_id_int,
                                            'shipmentDate' => $shipmentDate_po,
                                            'batch' => (int)$row['Batch'],
                                            'closed' => 2,
                                            'itemID' => (int)$row['ItemID'],
                                            'itemUnitID' => $row['ItemUnitID'] ?? null,
                                            'poId' => $poid_val,
                                            'isSpord' => true,
                                            'docNumber' => !empty($po['DocNumber']) ? $po['DocNumber'] : $row['DocNumber'],
                                            'reffDocID' => $po['ReffDocID'] ?? null,
                                            'reffShipmentID' => $po['ReffShipmentID'] ?? null
                                        ];
                                    }
                                    
                                    // FIX: Mark PO ini sudah diproses untuk prevent duplicate di PASS 2
                                    $processed_po_ids[$po_id_int] = true;
                                }   
                            }
                        }
                        
                        // Jika ada yang diproses, skip penambahan default di bawah
                        if ($spordProcessed) {
                            continue;
                        }
                    }

                    $newWeekNum = date('W', strtotime($shipmentDate));
                    if (!$newWeekNum || $newWeekNum === false) {
                        $newWeekNum = 1;
                    }
                    $newWeekKey = 'ww' . (int)$newWeekNum;

                    if ($newWeekKey !== $week_key) {
                        $week_key = $newWeekKey;
                        if (!isset($grouped_data[$group_key]['weekly_data'][$week_key])) {
                            $grouped_data[$group_key]['weekly_data'][$week_key] = [];
                        }
                    }

                    $ppid = (int)$row['PurchasePlanID'];
                    $payments = $payments_by_ppid[$ppid] ?? [];

                    $grouped_data[$group_key]['weekly_data'][$week_key][] = [
                        'qty' => $qty,
                        'shipmentId' => $shipmentId,
                        'shipmentDate' => $shipmentDate,
                        'batch' => (int)$row['Batch'],
                        'closed' => (int)$row['Closed'],
                        'itemID' => (int)$row['ItemID'],
                        'itemUnitID' => $row['ItemUnitID'] ?? null,
                        'poId' => ((int)$row['Closed'] === 2 && !empty($row['POID'])) ? (int)$row['POID'] : null,
                        'isSpord' => ((int)$row['Closed'] === 2),
                        'docNumber' => $docNumber,
                        'reffDocID' => $reffDocID,
                        'reffShipmentID' => $reffShipmentID,
                        'payments' => $payments
                    ];
                }
            }

            foreach ($grouped_data as $group_key => &$group) {
                if ($group['has_po'] && !$group['has_blanket']) {
                    // Semua shipment PO → full PO status
                    $group['Closed'] = 2;
                } elseif ($group['has_po'] && $group['has_blanket']) {
                    $group['Closed'] = 2;  
                } else {
                    // Hanya blanket → blanket status
                    $group['Closed'] = 1;
                }
            }
            unset($group);

            // === PASS 2: Distribute PO shipments ke group_key dengan week MATCHING ===
            foreach ($grouped_data as $group_key => &$group_data) {
                
                $addedShipmentIds = [];
                
                $addPoEntries = function($poList, $isFromPOID = false, $currentPOID = null) use (&$group_data, &$existingShipmentIds, &$addedShipmentIds, $used_spblk, &$processed_po_ids) {
                    if (!is_array($poList)) {
                        return;
                    }
                    
                    foreach ($poList as $po) {
                        $poID = (int)$po['ID'];
                        $poItemID = (int)($po['ItemID'] ?? 0);
                        $poItemUnitID = $po['ItemUnitID'] ?? null;
                        $groupItemID = (int)$group_data['ItemID'];
                        $groupItemUnitID = $group_data['ItemUnitID'] ?? null;

                        if ($poItemID !== $groupItemID) {
                            continue;
                        }

                        if ($poItemUnitID !== null && $groupItemUnitID !== null && $poItemUnitID !== $groupItemUnitID) {
                            continue;
                        }

                        $shipmentKey = 'po_' . $poID;

                        if (isset($existingShipmentIds[$shipmentKey])) {
                            continue;
                        }

                        if (isset($addedShipmentIds[$poID])) {
                            continue;
                        }

                        // FIX: Skip PO yang sudah diproses di PASS 1 untuk prevent duplicate
                        if (isset($processed_po_ids[$poID])) {
                            continue;
                        }

                        // FIX: Skip PO yang sudah dihandle di PASS 1 (SPBLK) untuk prevent duplicate
                        if ($isFromPOID === false && !empty($currentPOID)) {
                            // Ini adalah blanket (isFromPOID=false), check $used_spblk
                            $checkKey = (int)$currentPOID . '|' . (int)$po['ID'];
                            if (isset($used_spblk[$checkKey])) {
                                continue;
                            }
                        }

                        $etdDate = !empty($po['ETD']) ? $po['ETD'] : (!empty($group_data['ShipmentDate']) ? $group_data['ShipmentDate'] : date('Y-m-d'));
                        
                        if (empty($etdDate)) {
                            $etdDate = date('Y-m-d');
                        }
                        
                        try {
                            $poWeekInfo = $this->get_iso_week_from_date($etdDate);
                            $po_week = $poWeekInfo['week'];
                        } catch (Exception $e) {
                            continue;
                        }

                        $weekNum = date('W', strtotime($etdDate));
                        if (!$weekNum || $weekNum === false) {
                            $weekNum = 1;
                        }
                        $week_key = 'ww' . (int)$weekNum;

                        if (!isset($group_data['weekly_data'][$week_key])) {
                            $group_data['weekly_data'][$week_key] = [];
                        }

                        $closedValue = $isFromPOID ? 2 : 1;
                        $isSpordValue = $isFromPOID ? true : false;
                        
                        $existingIndex = null;
                        $etdDateNormalized = date('Y-m-d', strtotime($etdDate));
                        
                        foreach ($group_data['weekly_data'][$week_key] as $idx => $existing) {
                            if ((int)$existing['shipmentId'] === $poID) {
                                $existingIndex = $idx;
                                break;
                            }

                            // FIX: Relax date matching - allow item match without strict date
                            // Ini memungkinkan PO dengan ETD berbeda tetap ditambahkan
                            if (
                                (int)$existing['closed'] === 0 &&
                                (int)$existing['itemID'] === $poItemID &&
                                (int)($existing['itemUnitID'] ?? 0) === (int)($poItemUnitID ?? 0)
                            ) {
                                $existingIndex = $idx;
                                break;
                            }
                        }
                        
                        if ($existingIndex !== null) {
                            $existingShipmentId = $group_data['weekly_data'][$week_key][$existingIndex]['shipmentId'] ?? null;
                            if ($existingShipmentId === null) {
                                // lanjut overwrite
                            } elseif ((int)$group_data['weekly_data'][$week_key][$existingIndex]['closed'] >= $closedValue) {
                                continue;
                            }
                        }


                        $docNumber = !empty($po['DocNumber']) ? $po['DocNumber'] : $group_data['DocNumber'];
                        
                        if (empty($po['DocNumber'])) {
                            if ($closedValue === 1 && !empty($group_data['BlanketID'])) {
                                $blanketDocNumber = $this->getDocNumberById($group_data['BlanketID']);
                                $docNumber = $blanketDocNumber ?? $group_data['DocNumber'];
                            } elseif ($closedValue === 2 && !empty($currentPOID)) {
                                $poDocNumber = $this->getDocNumberById($currentPOID);
                                $docNumber = $poDocNumber ?? $group_data['DocNumber'];
                            }
                        }
                        
                        $newEntry = [
                            'qty' => (int)$po['Qty'],
                            'shipmentId' => $poID,
                            'shipmentDate' => $etdDate,
                            'batch' => (int)$group_data['Batch'],
                            'closed' => $closedValue,
                            'itemID' => (int)$group_data['ItemID'],
                            'itemUnitID' => $group_data['ItemUnitID'] ?? null,
                            'poId' => $isFromPOID ? (int)($currentPOID ?? 0) : null,
                            'isSpord' => $isSpordValue,
                            'docNumber' => $docNumber,
                            'reffDocID' => isset($po['ReffDocID']) ? $po['ReffDocID'] : null,
                            'reffShipmentID' => isset($po['ReffShipmentID']) ? $po['ReffShipmentID'] : null
                        ];
                        
                        if ($existingIndex !== null) {
                            $group_data['weekly_data'][$week_key][$existingIndex] = $newEntry;
                        } else {
                            $group_data['weekly_data'][$week_key][] = $newEntry;
                        }
                        
                        $existingShipmentIds['po_' . $poID] = true;
                        $addedShipmentIds[$poID] = true;
                    }
                };

                foreach ($group_data['POIDs'] as $poid => $_) {
                    if (isset($po_shipments_by_doc[$poid])) {
                        $addPoEntries($po_shipments_by_doc[$poid], true, $poid);
                    }
                }

                if (!empty($group_data['BlanketID'])) {
                    if (isset($po_shipments_by_doc[$group_data['BlanketID']])) {
                        $addPoEntries($po_shipments_by_doc[$group_data['BlanketID']], false, $group_data['BlanketID']);
                    }
                }
            }
            unset($group_data);

            foreach ($grouped_data as &$group) {
                $allReffDocIds = [];
                foreach ($group['weekly_data'] as &$shipments) {
                    foreach ($shipments as $shipment) {
                        if ($shipment['isSpord'] && !empty($shipment['reffDocID'])) {
                            $allReffDocIds[$shipment['reffDocID']] = true;
                        }
                    }
                }

                foreach ($group['weekly_data'] as &$shipments) {
                    $toRemove = [];
                    $seenShipmentIds = [];

                    foreach ($shipments as $idx => $shipment) {
                        if (
                            $shipment['isSpord'] &&
                            empty($shipment['reffDocID']) &&
                            empty($shipment['reffShipmentID'])
                        ) {
                            $toRemove[] = $idx;
                        }
                    }

                    foreach ($shipments as $idx => $shipment) {
                        if (!isset($toRemove[$idx]) && !$shipment['isSpord'] && isset($allReffDocIds[$shipment['shipmentId']])) {
                            $toRemove[] = $idx;
                        }
                    }

                    foreach ($shipments as $idx => $shipment) {
                        if (!isset($toRemove[$idx])) {
                            $sid = $shipment['shipmentId'];
                            
                            if (isset($seenShipmentIds[$sid])) {
                                $toRemove[] = $idx;
                            } else {
                                $seenShipmentIds[$sid] = $idx;
                            }
                        }
                    }

                    foreach (array_reverse(array_unique($toRemove)) as $idx) {
                        unset($shipments[$idx]);
                    }
                    $shipments = array_values($shipments);
                }
                unset($shipments);
            }
            unset($group);

            foreach ($grouped_data as &$group) {
                $weekly_pairs = [];
                foreach ($group['weekly_data'] as $week => $shipments) {
                    foreach ($shipments as $shipment) {
                        $weekly_pairs[] = 
                            $shipment['qty'] . '@' . 
                            str_replace('ww','', $week) . '#' . 
                            $shipment['shipmentId'] . '#' . 
                            (isset($shipment['shipmentDate']) ? $shipment['shipmentDate'] : '') . '#' .  
                            (isset($shipment['batch']) ? $shipment['batch'] : '') . '#' .  
                            (isset($shipment['closed']) ? $shipment['closed'] : '0') . '#' .  
                            (isset($shipment['poId']) ? $shipment['poId'] : '') . '#' .  
                            (isset($shipment['isSpord']) && $shipment['isSpord'] ? '1' : '0') . '#' .
                            (isset($shipment['docNumber']) ? $shipment['docNumber'] : '') . '#' .
                            (isset($shipment['reffDocID']) ? $shipment['reffDocID'] : '') . '#' .
                            (isset($shipment['reffShipmentID']) ? $shipment['reffShipmentID'] : '');
                    }
                }
                $group['weekly_qtys'] = implode(',', $weekly_pairs);
            }
            unset($group);
            $spord_with_reff = [];

            foreach ($grouped_data as $group) {
                foreach ($group['weekly_data'] as $week => $shipments) {
                    foreach ($shipments as $s) {
                        if (
                            isset($s['isSpord']) && $s['isSpord'] === true &&
                            !empty($s['reffDocID'])
                        ) {
                            $spord_with_reff[] = [
                                'qty' => $s['qty'],
                                'shipmentId' => $s['shipmentId'],
                                'shipmentDate' => $s['shipmentDate'],
                                'poId' => $s['poId'] ?? null,
                                'docNumber' => $s['docNumber'] ?? null,
                                'reffDocID' => $s['reffDocID'],
                                'reffShipmentID' => $s['reffShipmentID'] ?? null
                            ];
                        }
                    }
                }
            }
            // Convert associative array back to indexed array
            // return array_values($grouped_data);

            $result = array_values($grouped_data);
            $last5 = array_slice($result, -5);
            return [
                '_debug_from_model' => [
                    'row_count'   => count($result),
                    'spord_with_reff_count' => count($spord_with_reff),
                    'spord_with_reff_sample' => array_slice($spord_with_reff, 0, 5),
                    'first_row'   => $result[0] ?? null,
                    'last_5_rows' => $last5,
                    'all_poids_found' => $all_poids,
                    'po_shipments_by_doc_keys' => array_keys($po_shipments_by_doc),
                    'po_shipments_count' => array_map('count', $po_shipments_by_doc)
                ],
                '_data' => $result
            ];
    }



    public function getPurchasePlanDataEdit($purchasePlanID) 
    {

        $sql = "
        SELECT 
            pp.ID,
            pp.DocNumber,
            pp.DocDate,
            pp.ItemDesc,
            v.Description AS Vendor,
            ppsh.Vendor AS VendorID,
            ppsh.Color,
            ppsh.Price,
            COALESCE(SUM(ppsh.Qty), 0) AS TotalQtyBLG,
            STRING_AGG(
                CAST(ppsh.Qty AS VARCHAR(MAX)) + '|' + 
                CAST(DATEPART(ISO_WEEK, ppsh.ShipmentDate) AS VARCHAR(MAX)),
                ','
            ) AS weekly_qtys
        FROM dbtPurchasePlan pp
        INNER JOIN dbtPurchasePlanDtlShipmentHistory ppsh 
            ON ppsh.PurchasePlanID = pp.ID 
            AND ppsh.EndDate IS NULL
        LEFT JOIN dbmcoaattr v 
            ON v.ID = ppsh.Vendor
        WHERE pp.ID = ?
            AND pp.Void != 1
        GROUP BY 
            pp.ID, 
            pp.DocNumber, 
            pp.DocDate, 
            pp.ItemDesc,
            v.Description, 
            ppsh.Vendor, 
            ppsh.Color, 
            ppsh.Price
        ORDER BY pp.ID, ppsh.Vendor, ppsh.Color, ppsh.Price
        ";

        $query = $this->db->query($sql, [$purchasePlanID]);
        $result = $query->result_array();
        
        // Transform weekly_qtys format to match frontend expectation
        foreach ($result as &$row) {
            $weekly_data = [];
            if (!empty($row['weekly_qtys'])) {
                $pairs = explode(',', $row['weekly_qtys']);
                foreach ($pairs as $pair) {
                    if (!empty($pair)) {
                        list($qty, $week) = explode('|', $pair);
                        $weekly_data['ww' . $week] = (int)$qty;
                    }
                }
            }
            $row['weekly_data'] = $weekly_data;
        }
        unset($row);
        
        return $result;
    }


    public function getLatestDtlId($planId, $vendor, $batch)
    {

        $result = $this->db
            ->select('ID')
            ->from('dbtPurchasePlanDtl')
            ->where('PurchasePlanID', $planId)
            ->where('Vendor', $vendor)
            ->where('Batch', $batch)
            ->where('Void', 0)
            ->order_by('ID', 'DESC')  // ← Ambil ID terbesar (paling baru)
            ->limit(1)
            ->get()
            ->row();
        
        if (!$result) {
            $result = $this->db
                ->select('ID')
                ->from('dbtPurchasePlanDtl')
                ->where('PurchasePlanID', $planId)
                ->where('Batch', $batch)
                ->where('Void', 0)
                ->order_by('ID', 'DESC')
                ->limit(1)
                ->get()
                ->row();
        }
        
        return $result;
    }
public function recalc_aging_by_docid($docID)
{
    if (empty($docID)) {
        log_message('error', 'recalc_aging_by_docid: DocID kosong');
        return false;
    }

    // Hitung total Qty dari tPOPlan dengan DocID
    $qtyQuery = $this->db->select("SUM(Qty) AS totalQty")
                         ->from("tPOPlan")
                         ->where("DocID", $docID)  // PENTING: gunakan DocID, bukan ID!
                         ->get();

    if ($qtyQuery->num_rows() == 0) {
        log_message('error', 'recalc_aging_by_docid: DocID ' . $docID . ' tidak ditemukan di tPOPlan');
        return false;
    }

    $row = $qtyQuery->row();
    $totalQty = (int) ($row->totalQty ?? 0);

    // Ambil semua aging records dengan DocID yang sama
    $agingRows = $this->db->from("dbtItemAgingTrans")
                          ->where("DocID", $docID)
                          ->get()
                          ->result();

    if (empty($agingRows)) {
        log_message('warn', 'recalc_aging_by_docid: Tidak ada aging records untuk DocID ' . $docID);
        return true;
    }

    // Update setiap aging record
    foreach ($agingRows as $ag) {
        
        // Pastikan ItemPrice ada nilainya
        $price = (float) ($ag->ItemPrice ?? 0);
        
        // Hitung subtotal
        $subtotal = $totalQty * $price;

        // Update per ID (gunakan ID, bukan DocID!)
        $updateResult = $this->db->where("ID", $ag->ID)
                                 ->update("dbtItemAgingTrans", [
                                    "ItemQtyEntry"   => $totalQty,
                                    "ItemQtyApprove" => $totalQty,
                                    "ItemSubTotal"   => $subtotal  // Cek: apakah nama kolom ini benar?
                                 ]);

        if (!$updateResult) {
            log_message('error', 'recalc_aging_by_docid: Gagal update ID ' . $ag->ID . ' - ' . $this->db->last_query());
        }
    }

    return true;
}

public function recalc_item_trans_by_docid_and_item($docID, $itemID, $itemUnitID)
{
    if (empty($docID) || empty($itemID)) {
        log_message('error', 'recalc_item_trans_by_docid_and_item: DocID atau ItemID kosong');
        return false;
    }

    //  Hitung total Qty dari tPOPlan dengan DocID + ItemID + ItemUnitID
    $qtyQuery = $this->db->select("SUM(Qty) AS totalQty")
                         ->from("tPOPlan")
                         ->where("DocID", $docID)
                         ->where("ItemID", $itemID);
    
    // Jika ItemUnitID diberikan, gunakan untuk filter
    if (!empty($itemUnitID)) {
        $qtyQuery->where("ItemUnitID", $itemUnitID);
    }
    
    $qtyResult = $qtyQuery->get();

    if ($qtyResult->num_rows() == 0) {
        log_message('warn', 'recalc_item_trans_by_docid_and_item: Tidak ada tPOPlan untuk DocID=' . $docID . ', ItemID=' . $itemID);
        return true;
    }

    $row = $qtyResult->row();
    $totalQty = (int) ($row->totalQty ?? 0);

    //  Fetch ItemPrice dari dbtItemTrans untuk menghitung ItemSubTotal
    $itemTransQuery = $this->db->select("ItemPrice")
                               ->from("dbtItemTrans")
                               ->where("DocID", $docID)
                               ->where("ItemID", $itemID);
    
    // Jika ItemUnitID diberikan, gunakan untuk filter
    if (!empty($itemUnitID)) {
        $itemTransQuery->where("ItemUnitID", $itemUnitID);
    }
    
    $itemTransResult = $itemTransQuery->get();

    if ($itemTransResult->num_rows() == 0) {
        log_message('warn', 'recalc_item_trans_by_docid_and_item: Tidak ada dbtItemTrans untuk DocID=' . $docID . ', ItemID=' . $itemID);
        return true;
    }

    $itemTransRow = $itemTransResult->row();
    $itemPrice = (float) ($itemTransRow->ItemPrice ?? 0);
    
    //  Hitung ItemSubTotal = totalQty * ItemPrice
    $itemSubTotal = $totalQty * $itemPrice;

    //  Update dbtItemTrans dengan total Qty DAN ItemSubTotal
    $updateData = [
        'ItemQty'      => $totalQty,
        'ItemQtyEntry' => $totalQty,
        'ItemQtyApprove' => $totalQty,
        'ItemSubTotal' => $itemSubTotal
    ];

    $updateResult = $this->db->where("DocID", $docID)
                             ->where("ItemID", $itemID);
    
    // Jika ItemUnitID diberikan, gunakan untuk filter
    if (!empty($itemUnitID)) {
        $updateResult->where("ItemUnitID", $itemUnitID);
    }
    
    $updateResult->update("dbtItemTrans", $updateData);

    if ($this->db->affected_rows() > 0) {
        log_message('debug', 'recalc_item_trans_by_docid_and_item: Updated dbtItemTrans for DocID=' . $docID . ', ItemID=' . $itemID . ', ItemUnitID=' . $itemUnitID . ' with totalQty=' . $totalQty . ', ItemPrice=' . $itemPrice . ', ItemSubTotal=' . $itemSubTotal);
    } else {
        log_message('warn', 'recalc_item_trans_by_docid_and_item: No dbtItemTrans record updated for DocID=' . $docID . ', ItemID=' . $itemID);
    }

    return true;
}

public function insert_po_plan_from_poid($poID, $qty, $etd)
{
    $row = $this->db->get_where('tPOPlan', ['DocID' => $poID])->row_array();
    if (!$row) return false;

    $insert = [
        'DocID'      => $row['DocID'],
        'DocType'    => $row['DocType'],
        'ItemID'     => $row['ItemID'],
        'ItemUnitID' => $row['ItemUnitID'],
        'Qty'        => $qty,
        'ETD'        => $etd,
        'ReffDocID'  => $row['ReffDocID'] ?? null,
        'ReffShipmentID' => $row['ReffShipmentID'] ?? null
    ];

    $this->db->insert('tPOPlan', $insert);
    return $this->db->insert_id();
}

public function insert_po_plan_row_po($poID, $qty, $etd)
{
    $existing = $this->db->get_where('tPOPlan', ['DocID' => $poID])->row_array();
    if (!$existing) return false;

    $insertData = [
        'DocID'      => $existing['DocID'],
        'DocType'    => $existing['DocType'],
        'ItemID'     => $existing['ItemID'],
        'ItemUnitID' => $existing['ItemUnitID'],
        'Qty'        => $qty,
        'ETD'        => $etd,
        'ReffDocID'  => $existing['ReffDocID'] ?? null,
        'ReffShipmentID' => $existing['ReffShipmentID'] ?? null
    ];

    $this->db->insert('tPOPlan', $insertData);
    return $this->db->insert_id();
}


public function insert_po_plan_from_blanket($blanketID, $qty, $etd)
{
    // Ambil data asli berdasarkan BlanketID
    $row = $this->db->get_where('tPOPlan', ['DocID' => $blanketID])->row_array();

    if (!$row) return false;

    // Bangun row baru berdasarkan row lama
    $insert = [
        'DocID'      => $row['DocID'],
        'DocType'    => $row['DocType'],
        'ItemID'     => $row['ItemID'],
        'ItemUnitID' => $row['ItemUnitID'],
        'Qty'        => $qty,
        'ETD'        => $etd,
        'ReffDocID'  => null,  // Blanket: ReffDocID tetap NULL
        'ReffShipmentID' => $row['ReffShipmentID'] ?? null  // Hanya copy ReffShipmentID
    ];

    $this->db->insert('tPOPlan', $insert);

    return $this->db->insert_id();
}

public function update_po_plan_row($id, $qty, $etd)
{
    $updateData = [];
    
    if ($qty !== null) {
        $updateData['Qty'] = $qty;
    }
    
    if ($etd !== null) {
        $updateData['ETD'] = $etd;
    }

    $this->db->where('ID', $id);
    return $this->db->update('tPOPlan', $updateData);
}
public function insert_po_plan_row($qty, $etd, $sourceRowID, $isBlanketSplit = false)
{
    // harusnya pakai sourceRowID = ID row tPOPlan existing
    $existing = $this->db->get_where('tPOPlan', ['ID' => $sourceRowID])->row_array();

    if (!$existing) {
        return false;
    }

    $insertData = [
        'DocID'      => $existing['DocID'],
        'DocType'    => $existing['DocType'],
        'ItemID'     => $existing['ItemID'],
        'ItemUnitID' => $existing['ItemUnitID'],
        'Qty'        => $qty,
        'ETD'        => $etd,
        'ReffShipmentID' => $existing['ReffShipmentID'] ?? null
    ];

    // ReffDocID hanya di-copy untuk SPORD (PO), TIDAK untuk SPBLK (Blanket)
    if ($isBlanketSplit) {
        // Untuk SPBLK split, ReffDocID tetap NULL
        $insertData['ReffDocID'] = null;
    } else {
        // Untuk SPORD split, copy dari source
        $insertData['ReffDocID'] = $existing['ReffDocID'] ?? null;
    }

    $this->db->insert('tPOPlan', $insertData);
    return $this->db->insert_id();
}





    public function update_shipment_data($shipment_id, $qty, $shipment_date, $edit_user, $edit_date, $itemID = null, $color = null)
    {
        $this->db->trans_start();

        // 1. Ambil data history aktif berdasarkan ShipmentID
        $shipment = $this->db->where('ShipmentID', $shipment_id)
                            ->where('EndDate IS NULL', null, false)
                            ->get('dbtPurchasePlanDtlShipmentHistory')
                            ->row();

        if (!$shipment) {
            $this->db->trans_complete();
            return false; // tidak ada data aktif
        }

        // 1B. Ambil BlanketPODateEst dari dbtPurchasePlanDtl
        $dtlData = $this->db->select('BlanketPODateEst')
                            ->where('PurchasePlanID', $shipment->PurchasePlanID)
                            ->where('Vendor', $shipment->Vendor)
                            ->where('Batch', $shipment->Batch)
                            ->where('Void', 0)
                            ->get('dbtPurchasePlanDtl')
                            ->row();
        
        $blanketPODateEst = $dtlData ? $dtlData->BlanketPODateEst : null;

        $price = $shipment->Price;
        $new_total = $qty * $price;

        // 2A. Hitung PODateEst = ShipmentDate - Term (dalam hari)
        $term = (int) $shipment->Term;
        $poDateEst = $shipment->PODateEst; // default: nilai lama
        if ($term > 0 && !empty($shipment_date)) {
            $shipmentDateTime = new DateTime($shipment_date);
            $shipmentDateTime->modify("-{$term} days");
            $poDateEst = $shipmentDateTime->format('Y-m-d');
        }

        // 2B. Pastikan BlanketPODateEst tidak lebih besar dari PODateEst
        if (!empty($blanketPODateEst) && !empty($poDateEst)) {
            if (strtotime($blanketPODateEst) > strtotime($poDateEst)) {
                $blanketPODateEst = $poDateEst;
            }
        }

        // 2. Tutup history lama
        $this->db->where('ID', $shipment->ID)
                ->update('dbtPurchasePlanDtlShipmentHistory', ['EndDate' => $edit_date]);

        // 3. Insert history baru
        $new_history = [
            'ShipmentID'      => $shipment_id,
            'Vendor'          => $shipment->Vendor,
            'ItemID'          => $shipment->ItemID,
            'ItemUnitID'      => $shipment->ItemUnitID,
            'PurchasePlanID'  => $shipment->PurchasePlanID,
            'Color'           => $shipment->Color,
            'ShipmentDate'    => $shipment_date,
            'Qty'             => $qty,
            'Price'           => $price,
            'PODateEst'       => $poDateEst,
            'Term'       => $shipment->Term,
            'Batch'           => $shipment->Batch,
            'BlanketID'       => $shipment->BlanketID,
            'Closed'          => $shipment->Closed,
            'StartDate'       => $edit_date,
            'EditDate'        => $edit_date,
            'EditUserID'      => $edit_user
        ];
        $this->db->insert('dbtPurchasePlanDtlShipmentHistory', $new_history);

        // 4. Update data utama di shipment (termasuk PODateEst)
        $this->db->where('ID', $shipment_id)
                ->update('dbtPurchasePlanDtlShipment', [
                    'Qty' => $qty,
                    'ShipmentDate' => $shipment_date,
                    'PODateEst' => $poDateEst
                ]);

        $total_amount = $this->calculate_total_by_plan_batch(
            $shipment->PurchasePlanID, 
            $shipment->Batch,
            !empty($itemID) ? $itemID : $shipment->ItemID,
            !empty($color) ? $color : $shipment->Color
        );


        $existing_dtl = $this->db->select('ID')
                                ->where('PurchasePlanID', $shipment->PurchasePlanID)
                                ->where('Batch', $shipment->Batch)
                                ->where('Vendor', $shipment->Vendor)
                                ->where('Void', 0)
                                ->get('dbtPurchasePlanDtl')
                                ->row();

        if ($existing_dtl) {
            //  UPDATE DTL yang sudah ada dengan total baru (jangan insert baru!)
            $this->db->where('ID', $existing_dtl->ID)
                    ->update('dbtPurchasePlanDtl', [
                        'Total' => $total_amount
                    ]);
        } else {
            // Jika belum ada DTL, baru insert
            $new_dtl = [
                'PurchasePlanID' => $shipment->PurchasePlanID,
                'Vendor'         => $shipment->Vendor,
                'Batch'          => $shipment->Batch,
                'BlanketPODateEst' => $blanketPODateEst,
                'Total'          => $total_amount,
                'Void'           => 0
            ];
            $this->db->insert('dbtPurchasePlanDtl', $new_dtl);
        }


        $this->db->trans_complete();
        return $this->db->trans_status();
    }

    private function calculate_total_by_plan_batch($purchase_plan_id, $batch, $itemID = null, $color = null)
    {
        $query = $this->db->select('SUM(Qty * Price) as total_amount')
                         ->where('PurchasePlanID', $purchase_plan_id)
                         ->where('Batch', $batch);
        
        // Filter dengan ItemID & Color jika diberikan untuk precision
        if ($itemID !== null) {
            $query->where('ItemID', $itemID);
        }
        if ($color !== null) {
            $query->where('Color', $color);
        }
        
        $result = $query->get('dbtPurchasePlanDtlShipment')->row();
        
        return $result && $result->total_amount ? (int) $result->total_amount : 0;
    }

    public function insert_new_shipment($purchase_plan_id, $batch, $qty, $shipment_date, $edit_user, $edit_date, $itemID = null, $color = null)
    {
        $this->db->trans_start();

        // PENTING: Cari template dari shipment EXISTING dengan matching ItemID & Color
        // Ini untuk memastikan kita gunakan data dari item yang BENAR, bukan item lain yang kebetulan ada di batch yang sama
        $query = $this->db->where('PurchasePlanID', $purchase_plan_id)
                         ->where('Batch', $batch);
        
        // Jika itemID dan color diberikan, WAJIB filter dengan mereka (PRECISION MODE)
        if ($itemID !== null) {
            $query->where('ItemID', $itemID);
        }
        if ($color !== null) {
            $query->where('Color', $color);
        }
        
        $template = $query->order_by('ID', 'DESC')
                         ->get('dbtPurchasePlanDtlShipment')
                         ->row();

        // FALLBACK: Jika tidak ada shipment existing untuk item+color ini, lookup dari dbtPurchasePlanDtl
        if (!$template) {
            // Cari DTL untuk item+color+batch yang spesifik
            $dtlQuery = $this->db->where('PurchasePlanID', $purchase_plan_id)
                                 ->where('Batch', $batch);
            
            if ($itemID !== null) {
                $dtlQuery->where('ItemID', $itemID);
            }
            if ($color !== null) {
                $dtlQuery->where('Color', $color);
            }
            
            $dtlQuery->where('Void', 0);
            $dtlRecord = $dtlQuery->order_by('ID', 'DESC')
                                 ->get('dbtPurchasePlanDtl')
                                 ->row();

            if (!$dtlRecord) {
                $this->db->trans_complete();
                return false; // tidak ada DTL untuk item ini
            }

            // Ambil template shipment dari batch yang sama (untuk consistency)
            // Tapi gunakan data dari DTL record (Price, Vendor, ItemID, Color, etc)
            // Sehingga Price & Vendor akurat untuk item yang ditambah
            $shipmentForTemplate = $this->db->where('PurchasePlanID', $purchase_plan_id)
                                           ->where('Batch', $batch)
                                           ->order_by('ID', 'DESC')
                                           ->get('dbtPurchasePlanDtlShipment')
                                           ->row();

            if ($shipmentForTemplate) {
                // Gunakan struktur shipment yang ada, tapi replace Vendor, ItemID, Color, Price dengan DTL data
                $template = (object)[
                    'PurchasePlanID' => $dtlRecord->PurchasePlanID,
                    'Vendor'         => $dtlRecord->Vendor,
                    'ItemID'         => $dtlRecord->ItemID,
                    'ItemUnitID'     => $dtlRecord->ItemID, // Ambil dari DTL
                    'Color'          => $dtlRecord->Color,
                    'Price'          => $shipmentForTemplate->Price ?? 0, // Gunakan dari shipment jika ada
                    'Term'           => $shipmentForTemplate->Term ?? 0,
                    'BlanketID'      => $shipmentForTemplate->BlanketID ?? 0,
                    'Closed'         => $shipmentForTemplate->Closed ?? 0,
                    'PODateEst'      => $shipmentForTemplate->PODateEst ?? null
                ];
            } else {
                // Jika tidak ada shipment sama sekali di batch ini, gunakan DTL sebagai template
                $template = (object)[
                    'PurchasePlanID' => $dtlRecord->PurchasePlanID,
                    'Vendor'         => $dtlRecord->Vendor,
                    'ItemID'         => $dtlRecord->ItemID,
                    'ItemUnitID'     => $dtlRecord->ItemID,
                    'Color'          => $dtlRecord->Color,
                    'Price'          => 0,
                    'Term'           => 0,
                    'BlanketID'      => 0,
                    'Closed'         => 0,
                    'PODateEst'      => null
                ];
            }
        }

        // Ambil BlanketPODateEst dari dbtPurchasePlanDtl yang masih aktif
        $dtlData = $this->db->select('BlanketPODateEst')
                            ->where('PurchasePlanID', $purchase_plan_id)
                            ->where('Vendor', $template->Vendor)
                            ->where('Batch', $batch)
                            ->where('Void', 0)
                            ->get('dbtPurchasePlanDtl')
                            ->row();
        
        $blanketPODateEst = $dtlData ? $dtlData->BlanketPODateEst : null;

        $price = $template->Price;
        $new_total = $qty * $price;

        // Hitung PODateEst = ShipmentDate - Term (dalam hari)
        $term = (int) $template->Term;
        $poDateEst = $template->PODateEst; // default: nilai dari template
        if ($term > 0 && !empty($shipment_date)) {
            $shipmentDateTime = new DateTime($shipment_date);
            $shipmentDateTime->modify("-{$term} days");
            $poDateEst = $shipmentDateTime->format('Y-m-d');
        }

        // Pastikan BlanketPODateEst tidak lebih besar dari PODateEst
        if (!empty($blanketPODateEst) && !empty($poDateEst)) {
            if (strtotime($blanketPODateEst) > strtotime($poDateEst)) {
                $blanketPODateEst = $poDateEst;
            }
        }

        $new_shipment = [
            'PurchasePlanID' => $template->PurchasePlanID,
            'Vendor'         => $template->Vendor,
            'ItemID'         => $template->ItemID,
            'ItemUnitID'     => $template->ItemUnitID,
            'Color'          => $template->Color,
            'ShipmentDate'   => $shipment_date,
            'Qty'            => $qty,
            'Price'          => $price,
            'PODateEst'      => $poDateEst,
            'Term'      => $template->Term,
            'Batch'          => $batch,
            'BlanketID'      => $template->BlanketID,
            'Closed'         => $template->Closed,
        ];
        $this->db->insert('dbtPurchasePlanDtlShipment', $new_shipment);
        $new_shipment_id = $this->db->insert_id();

        $new_history = [
            'ShipmentID'      => $new_shipment_id,
            'Vendor'          => $template->Vendor,
            'ItemID'          => $template->ItemID,
            'ItemUnitID'      => $template->ItemUnitID,
            'PurchasePlanID'  => $template->PurchasePlanID,
            'Color'           => $template->Color,
            'ShipmentDate'    => $shipment_date,
            'Qty'             => $qty,
            'Price'           => $price,
            'PODateEst'       => $poDateEst,
            'Term'       => $template->Term,
            'Batch'           => $batch,
            'BlanketID'       => $template->BlanketID,
            'Closed'          => $template->Closed,
            'StartDate'       => $edit_date,
            'EditDate'        => $edit_date,
            'EditUserID'      => $edit_user,
        ];
        $this->db->insert('dbtPurchasePlanDtlShipmentHistory', $new_history);

        $total_amount = $this->calculate_total_by_plan_batch(
            $template->PurchasePlanID, 
            $batch, 
            $itemID, 
            $color
        );

        // Cari DTL existing untuk plan+batch+vendor ini
        // PENTING: Gunakan Vendor filter untuk presisi, jangan hanya PurchasePlanID+Batch
        // Karena bisa ada multiple DTL dengan batch sama tapi vendor berbeda
        $existing_dtl = $this->db->select('ID')
                                ->where('PurchasePlanID', $template->PurchasePlanID)
                                ->where('Batch', $batch)
                                ->where('Vendor', $template->Vendor)
                                ->where('Void', 0)
                                ->get('dbtPurchasePlanDtl')
                                ->row();

        if ($existing_dtl) {
            //  UPDATE DTL yang sudah ada dengan total baru (jangan insert baru!)
            $this->db->where('ID', $existing_dtl->ID)
                    ->update('dbtPurchasePlanDtl', [
                        'Total' => $total_amount
                    ]);
            
            $dtl_id = $existing_dtl->ID;
        } else {
            // Jika belum ada DTL, baru insert
            $new_dtl = [
                'PurchasePlanID'   => $template->PurchasePlanID,
                'Vendor'           => $template->Vendor,
                'Batch'            => $batch,
                'BlanketPODateEst' => $blanketPODateEst,
                'Total'            => $total_amount,
                'Void'             => 0
            ];
            $this->db->insert('dbtPurchasePlanDtl', $new_dtl);
            $dtl_id = $this->db->insert_id();
        }


        $this->db->trans_complete();
        return $this->db->trans_status();
    }
    public function update_shipment_direct($shipment_id, $batch, $qty, $shipment_date)
    {
        $this->db->trans_start();

        // Ambil Term dan data lain dari record existing untuk menghitung PODateEst
        $existing = $this->db->select('Term, PODateEst, PurchasePlanID, Vendor, Batch')
                            ->where('ID', $shipment_id)
                            ->get('dbtPurchasePlanDtlShipment')
                            ->row();

        // Hitung PODateEst = ShipmentDate - Term (dalam hari)
        $term = $existing ? (int) $existing->Term : 0;
        $poDateEst = $existing ? $existing->PODateEst : null; // default: nilai lama
        if ($term > 0 && !empty($shipment_date)) {
            $shipmentDateTime = new DateTime($shipment_date);
            $shipmentDateTime->modify("-{$term} days");
            $poDateEst = $shipmentDateTime->format('Y-m-d');
        }

        // Cek dan update BlanketPODateEst jika lebih besar dari PODateEst
        if ($existing && !empty($poDateEst)) {
            $dtlData = $this->db->select('ID, BlanketPODateEst')
                                ->where('PurchasePlanID', $existing->PurchasePlanID)
                                ->where('Vendor', $existing->Vendor)
                                ->where('Batch', $existing->Batch)
                                ->where('Void', 0)
                                ->get('dbtPurchasePlanDtl')
                                ->row();

            if ($dtlData && !empty($dtlData->BlanketPODateEst)) {
                if (strtotime($dtlData->BlanketPODateEst) > strtotime($poDateEst)) {
                    // Update BlanketPODateEst agar tidak lebih besar dari PODateEst
                    $this->db->where('ID', $dtlData->ID)
                            ->update('dbtPurchasePlanDtl', [
                                'BlanketPODateEst' => $poDateEst
                            ]);
                }
            }
        }

        $this->db->where('ID', $shipment_id)
                ->update('dbtPurchasePlanDtlShipment', [
                    'Batch' => $batch,
                    'Qty' => $qty,
                    'ShipmentDate' => $shipment_date,
                    'PODateEst' => $poDateEst
                ]);

        $this->db->where('ShipmentID', $shipment_id)
                ->where('EndDate IS NULL', null, false)
                ->update('dbtPurchasePlanDtlShipmentHistory', [
                    'Batch' => $batch,
                    'Qty' => $qty,
                    'ShipmentDate' => $shipment_date,
                    'PODateEst' => $poDateEst
                ]);

        $this->db->trans_complete();
        return $this->db->trans_status();
    }
    public function validate_batch_date_order($purchase_plan_id, $new_batch, $new_shipment_date)
    {

        // Ambil semua batch yang ada untuk PurchasePlanID ini
        $this->db->select('DISTINCT Batch, MIN(ShipmentDate) as minDate, MAX(ShipmentDate) as maxDate');
        $this->db->from('dbtPurchasePlanDtlShipment');
        $this->db->where('PurchasePlanID', $purchase_plan_id);
        $this->db->where('Closed', 0);  // Hanya yang belum closed
        $this->db->group_by('Batch');
        $this->db->order_by('Batch', 'ASC');

        $batches = $this->db->get()->result();

        if (empty($batches)) {
            // Belum ada batch apapun
            return ['valid' => true, 'message' => 'OK - Batch baru'];
        }

        $newDate = strtotime($new_shipment_date);

        // Cek batch sebelumnya
        foreach ($batches as $b) {
            if ($b->Batch < $new_batch) {
                $maxPrevDate = strtotime($b->maxDate);
                if ($newDate < $maxPrevDate) {
                    return [
                        'valid' => false,
                        'message' => "Batch $new_batch date ($new_shipment_date) cannot be before Batch {$b->Batch} ({$b->maxDate})"
                    ];
                }
            }
        }

        // Cek batch sesudahnya
        foreach ($batches as $b) {
            if ($b->Batch > $new_batch) {
                $minNextDate = strtotime($b->minDate);
                if ($newDate > $minNextDate) {
                    return [
                        'valid' => false,
                        'message' => "Batch $new_batch date ($new_shipment_date) cannot be before Batch {$b->Batch} ({$b->minDate})"
                    ];
                }
            }
        }

        return ['valid' => true, 'message' => 'OK'];
    }
    public function delete_shipment($id)
        {
            return $this->db->where('ID', $id)->delete('dbtPurchasePlanDtlShipment');
        }
    public function recalculate_payment_dates_by_plan_id($purchase_plan_id, $new_shipment_date, $edit_user, $edit_date)
    {
        // 1. Ambil semua PurchasePlanDtlID dari PurchasePlanID ini
        $this->db->select('ID as PurchasePlanDtlID');
        $this->db->from('dbtPurchasePlanDtl');
        $this->db->where('PurchasePlanID', $purchase_plan_id);
        $dtl_query = $this->db->get();
        
        if ($dtl_query->num_rows() == 0) {
            log_message('debug', "Tidak ada PurchasePlanDtl untuk PurchasePlanID: {$purchase_plan_id}");
            return false;
        }
        
        // 2. Untuk setiap PurchasePlanDtl, update payment dates-nya
        foreach ($dtl_query->result() as $dtl) {
            $this->db->select('ID as PaymentHistoryID, Term');
            $this->db->from('dbtPurchasePlanDtlPaymentHistory');
            $this->db->where('PurchasePlanDtlID', $dtl->PurchasePlanDtlID);
            $payment_query = $this->db->get();
            
            foreach ($payment_query->result() as $payment) {
                // Hitung PaymentDate baru = ShipmentDate + Term (hari)
                $term_days = (int) $payment->Term;
                $new_payment_date = date('Y-m-d', strtotime($new_shipment_date . " +{$term_days} days"));
                
                // Update PaymentDate
                $this->db->where('ID', $payment->PaymentHistoryID);
                $this->db->update('dbtPurchasePlanDtlPaymentHistory', [
                    'PaymentDate' => $new_payment_date,
                    'EditUserID' => $edit_user,
                    'EditDate' => $edit_date
                ]);
                
                log_message('debug', " Updated Payment: PurchasePlanDtlID={$dtl->PurchasePlanDtlID}, PaymentHistoryID={$payment->PaymentHistoryID}, NewPaymentDate={$new_payment_date} (ShipmentDate={$new_shipment_date} + Term={$term_days} days)");
            }
        }
        
        return true;
    }


    public function recalculate_payment_summary($purchasePlanID, $vendorId = null, $batch = null)
    {
        log_message('debug', "=== recalculate_payment_summary START ===");
        log_message('debug', "PurchasePlanID: $purchasePlanID, VendorId: $vendorId, Batch: $batch");

        $this->db->trans_begin();

        try {
            // 1. Ambil semua PurchasePlanDtl yang terkait (yang tidak void)
            $this->db->select('
                ppd.ID as PurchasePlanDtlID, 
                ppd.Vendor, 
                ppd.Batch, 
                ppd.BlanketPODateEst, 
                ppd.Total
            ');
            $this->db->from('dbtPurchasePlanDtl ppd');
            $this->db->where('ppd.PurchasePlanID', $purchasePlanID);
            $this->db->where('ppd.Void', 0);
            
            if ($vendorId) {
                $this->db->where('ppd.Vendor', $vendorId);
            }
            if ($batch !== null && $batch !== '') {
                $this->db->where('ppd.Batch', $batch);
            }
            
            $dtlList = $this->db->get()->result_array();
            
            if (empty($dtlList)) {
                log_message('debug', "No PurchasePlanDtl found, skipping recalculation");
                $this->db->trans_commit();
                return true;
            }

            // Ambil DocType dari PurchasePlan
            $plan = $this->db->get_where('dbtPurchasePlan', ['ID' => $purchasePlanID])->row();
            $docType = $plan ? $plan->DocType : 'PP';

            foreach ($dtlList as $dtl) {
                $purchasePlanDtlID = $dtl['PurchasePlanDtlID'];
                $dtlVendor = $dtl['Vendor'];
                $dtlBatch = $dtl['Batch'];
                $blanketPODateEst = $dtl['BlanketPODateEst'];
                
                log_message('debug', "Processing PurchasePlanDtlID: $purchasePlanDtlID, Vendor: $dtlVendor, Batch: $dtlBatch");

                // 2. Ambil payment details dari dbtPurchasePlanDtlPaymentHistory (yang aktif)
                $payments = $this->get_active_payments_for_dtl($purchasePlanDtlID);
                
                if (empty($payments)) {
                    log_message('debug', "No payments found for DtlID: $purchasePlanDtlID");
                    continue;
                }

                // 3. Ambil shipment data terkait untuk calculation
                $shipments = $this->get_shipments_for_calculation($purchasePlanID, $dtlVendor, $dtlBatch);
                
                if (empty($shipments)) {
                    log_message('debug', "No shipments found for calculation");
                    continue;
                }

                // 4. Calculate dan update PaymentPlanSummary
                $this->calculate_and_save_summary(
                    $purchasePlanID,
                    $purchasePlanDtlID,
                    $docType,
                    $payments,
                    $shipments,
                    $blanketPODateEst
                );
            }

            if ($this->db->trans_status() === false) {
                $this->db->trans_rollback();
                log_message('error', "Transaction failed in recalculate_payment_summary");
                return false;
            }

            $this->db->trans_commit();
            log_message('debug', "=== recalculate_payment_summary SUCCESS ===");
            return true;

        } catch (Exception $e) {
            $this->db->trans_rollback();
            log_message('error', "Exception in recalculate_payment_summary: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Ambil payment yang aktif untuk sebuah PurchasePlanDtl
     */
    private function get_active_payments_for_dtl($purchasePlanDtlID)
    {
        // Ambil dari history yang EndDate IS NULL (aktif)
        $sql = "
            SELECT 
                h.ID as PaymentHistoryID,
                h.PaymentID,
                h.PurchasePlanDtlID,
                h.PaymentDate,
                h.Notes,
                h.[Percent] as PercentValue,
                h.FromValue,
                h.[Alert] as AlertValue,
                h.Term,
                h.OACredit
            FROM dbtPurchasePlanDtlPaymentHistory h
            WHERE h.PurchasePlanDtlID = ?
              AND h.EndDate IS NULL
            ORDER BY h.ID ASC
        ";
        
        $result = $this->db->query($sql, [$purchasePlanDtlID])->result_array();
        
        // Jika tidak ada di history, ambil dari tabel utama
        if (empty($result)) {
            $sql2 = "
                SELECT 
                    p.ID as PaymentID,
                    p.PurchasePlanDtlID,
                    p.PaymentDate,
                    p.Notes,
                    p.[Percent] as PercentValue,
                    p.FromValue,
                    p.[Alert] as AlertValue,
                    p.Term,
                    p.OACredit
                FROM dbtPurchasePlanDtlPayment p
                WHERE p.PurchasePlanDtlID = ?
                ORDER BY p.ID ASC
            ";
            
            $result = $this->db->query($sql2, [$purchasePlanDtlID])->result_array();
        }
        
        return $result;
    }

    /**
     * Ambil shipment data untuk calculation
     */
    private function get_shipments_for_calculation($purchasePlanID, $vendorId, $batch)
    {
        $sql = "
            SELECT 
                sh.ID as ShipmentHistoryID,
                sh.ShipmentID,
                sh.PurchasePlanID,
                sh.Qty,
                sh.Price,
                sh.ShipmentDate,
                sh.PODateEst,
                sh.Batch,
                sh.Vendor,
                sh.ItemID
            FROM dbtPurchasePlanDtlShipmentHistory sh
            WHERE sh.PurchasePlanID = ?
              AND sh.Vendor = ?
              AND sh.EndDate IS NULL
        ";
        
        $params = [$purchasePlanID, $vendorId];
        
        if ($batch !== null && $batch !== '' && $batch != 0) {
            $sql .= " AND sh.Batch = ?";
            $params[] = $batch;
        }
        
        $sql .= " ORDER BY sh.ShipmentDate ASC";
        
        return $this->db->query($sql, $params)->result_array();
    }

    /**
     * Calculate payment dan simpan ke dbtPaymentPlanSummary
     * Logika sama dengan generateTableCalculasi di JS
     */
    private function calculate_and_save_summary($purchasePlanID, $purchasePlanDtlID, $docType, $payments, $shipments, $blanketPODateEst)
    {
        log_message('debug', "calculate_and_save_summary for DtlID: $purchasePlanDtlID");
        
        // Hapus summary lama untuk DtlID ini
        $this->db->where('PaymentPlanID', $purchasePlanDtlID);
        $this->db->delete('dbtPaymentPlanSummary');
        log_message('debug', "Deleted old PaymentPlanSummary for PaymentPlanID: $purchasePlanDtlID");
        
        // Hitung total qty dan total value dari shipments
        $totalQty = 0;
        $totalValue = 0;
        $latestShipmentDate = null;
        $latestPODateEst = null;
        
        foreach ($shipments as $ship) {
            $qty = (float) ($ship['Qty'] ?? 0);
            $price = (float) ($ship['Price'] ?? 0);
            $totalQty += $qty;
            $totalValue += ($qty * $price);
            
            // Track tanggal terbaru
            if (!empty($ship['ShipmentDate']) && (!$latestShipmentDate || $ship['ShipmentDate'] > $latestShipmentDate)) {
                $latestShipmentDate = $ship['ShipmentDate'];
            }
            if (!empty($ship['PODateEst']) && (!$latestPODateEst || $ship['PODateEst'] > $latestPODateEst)) {
                $latestPODateEst = $ship['PODateEst'];
            }
        }
        
        // Hitung average price
        $avgPrice = $totalQty > 0 ? $totalValue / $totalQty : 0;
        
        log_message('debug', "TotalQty: $totalQty, TotalValue: $totalValue, AvgPrice: $avgPrice");
        
        // Process setiap payment
        foreach ($payments as $payment) {
            $percent = (float) ($payment['PercentValue'] ?? $payment['Percent'] ?? 0);
            $fromValue = (int) ($payment['FromValue'] ?? 1);
            $alert = (int) ($payment['AlertValue'] ?? $payment['Alert'] ?? 2);
            $term = (int) ($payment['Term'] ?? 0);
            $notes = $payment['Notes'] ?? '';
            
            if ($percent <= 0) {
                continue;
            }
            
            if ($fromValue == 1) {

                // Tentukan base date berdasarkan alert
                $baseDate = $this->get_base_date_by_alert($alert, $blanketPODateEst, $latestPODateEst, $latestShipmentDate);
                
                // Calculate payment date = baseDate + term days
                $paymentDate = $this->apply_term_days($baseDate, $term);
                
                // Calculate payment amount
                $paymentAmount = ($percent / 100) * $totalQty * $avgPrice;
                
                $summaryData = [
                    'DocID' => $purchasePlanID,
                    'DocType' => $docType,
                    'PaymentPlanID' => $purchasePlanDtlID,
                    'PaymentDate' => $paymentDate,
                    'Notes' => $notes,
                    'FromValue' => $fromValue,
                    '[Alert]' => $alert,
                    '[Percent]' => $percent,
                    'Total' => round($paymentAmount, 2)
                ];
                
                $this->db->insert('dbtPaymentPlanSummary', $summaryData);
                log_message('debug', "Inserted summary (Per Batch): Payment=" . round($paymentAmount, 2));
                
            } else if ($fromValue == 2) {
                foreach ($shipments as $idx => $ship) {
                    $shipQty = (float) ($ship['Qty'] ?? 0);
                    $shipPrice = (float) ($ship['Price'] ?? 0);
                    $shipValue = $shipQty * $shipPrice;
                    $itemPayment = ($percent / 100) * $shipValue;
                    
                    // Untuk partial, gunakan shipment date masing-masing
                    $itemBaseDate = $this->get_base_date_by_alert(
                        $alert, 
                        $blanketPODateEst, 
                        $ship['PODateEst'], 
                        $ship['ShipmentDate']
                    );
                    
                    $itemPaymentDate = $this->apply_term_days($itemBaseDate, $term);
                    
                    $summaryData = [
                        'DocID' => $purchasePlanID,
                        'DocType' => $docType,
                        'PaymentPlanID' => $purchasePlanDtlID,
                        'PaymentDate' => $itemPaymentDate,
                        'Notes' => $notes . " (Shipment " . ($idx + 1) . ")",
                        'FromValue' => $fromValue,
                        '[Alert]' => $alert,
                        '[Percent]' => $percent,
                        'Total' => round($itemPayment, 2)
                    ];
                    
                    $this->db->insert('dbtPaymentPlanSummary', $summaryData);
                    log_message('debug', "Inserted summary (Partial): Shipment " . ($idx + 1) . ", Payment=" . round($itemPayment, 2));
                }
            }
        }
        
        return true;
    }

    /**
     * Tentukan base date berdasarkan alert value
     * Alert 1 = Blanket PO Date
     * Alert 2 = PO Date Est
     * Alert 3 = Shipment Date
     */
    private function get_base_date_by_alert($alert, $blanketPODateEst, $poDateEst, $shipmentDate)
    {
        switch ($alert) {
            case 1: // Blanket PO
                return $blanketPODateEst;
            case 2: // PO
                return $poDateEst ?? $shipmentDate;
            case 3: // Shipment
                return $shipmentDate;
            default:
                return $shipmentDate;
        }
    }

    /**
     * Apply term days ke base date
     * Return format Y-m-d atau d-m-Y sesuai kebutuhan
     */
    private function apply_term_days($baseDate, $termDays)
    {
        if (empty($baseDate)) {
            return null;
        }
        
        // Clean date string (remove time if present)
        $cleanDate = substr($baseDate, 0, 10);
        
        // Add term days
        $resultDate = date('Y-m-d', strtotime($cleanDate . " +{$termDays} days"));
        
        return $resultDate;
    }

    public function getAllDataTableTengah_m($purchasePlanID)
    {
        $this->db->select('a.*')
            ->from('dbtPurchasePlanDtlShipment a')
            ->join('dbtPurchasePlan b', 'a.PurchasePlanID = b.ID')
            ->where('a.PurchasePlanID', $purchasePlanID);
        $query = $this->db->get();
        return $query->result;
    }
    public function getPurchasePlanModalData()
    {
        $this->db->select('pp.ID, pp.DocDate, pp.DocNumber, pp.ItemDesc');
        $this->db->select('ppd.Color, ppd.Qty, ppd.ShipmentDate, ppd.Vendor');
        $this->db->from('dbtPurchasePlan pp');
        $this->db->join(
            'dbtPurchasePlanDtlShipment ppd',
            'ppd.PurchasePlanId = pp.ID',
            'left'
        );
        $query = $this->db->get();
        return $query->result_array();
    }
    // close purchase plan report

    // purchase plan edit

    public function get_purchase_plan_by_id($id)
    {
        $this->db->where('ID', $id);
        $query = $this->db->get('dbtPurchasePlan');
        return $query->row_array();
    }

    public function get_purchase_plan_dtl_by_plan_id($purchase_plan_id)
    {
        $this->db->select('*');
        $this->db->where('PurchasePlanID', $purchase_plan_id);
        $query = $this->db->get('dbtPurchasePlanDtl');
        return $query->result_array();
    }

    public function get_purchase_plan_dtl_shipment_by_plan_id($purchase_plan_id)
    {
        $sql = "
            SELECT *
            FROM (
                SELECT 
                    h.*,
                    u.UnitName,
                    i.Code AS ItemCode,
                    i.Description AS ItemDesc,
                    ROW_NUMBER() OVER (
                        PARTITION BY h.ShipmentID
                        ORDER BY h.EditDate DESC, h.ID DESC
                    ) as rn
                FROM dbtPurchasePlanDtlShipmentHistory h
                LEFT JOIN dbtPurchasePlanDtlShipment s 
                    ON s.ID = h.ShipmentID
                LEFT JOIN dbmItemUnit u 
                    ON u.ID = h.ItemUnitID
                LEFT JOIN dbmItem i
                    ON i.ID = h.ItemID
                WHERE h.PurchasePlanID = ?
                AND h.EndDate IS NULL
            ) x
            WHERE rn = 1
            ORDER BY x.Batch ASC
        ";

        $query = $this->db->query($sql, [$purchase_plan_id]);
        return $query->result_array();
    }
public function get_period_range($startDate, $endDate)
{
    $this->db->select("Tanggal, WW, MM, QQ, FY, CY");
    $this->db->from("ODS4..dbmPeriod");
    $this->db->where("Tanggal >=", $startDate);
    $this->db->where("Tanggal <=", $endDate);
    $query = $this->db->get();
    return $query->result_array();
}

public function get_calendar_years()
{
    $this->db->distinct();
    $this->db->select("CY");
    $this->db->from("ODS4..dbmPeriod");
    $this->db->order_by("CY", "ASC");
    return $this->db->get()->result_array();
}
public function get_ww_by_calendar_year($cy)
{
    $this->db->distinct();
    $this->db->select("WW");
    $this->db->from("ODS4..dbmPeriod");
    $this->db->where("CY", $cy);
    $this->db->order_by("WW", "ASC");

    return $this->db->get()->result_array();
}



    public function get_purchase_plan_dtl_payment_by_dtl_id($purchase_plan_dtl_id)
{
    $this->db->select('h.*, p.ID as PaymentID');
    $this->db->from('dbtPurchasePlanDtlPaymentHistory h');
    $this->db->join(
        'dbtPurchasePlanDtlPayment p',
        'p.ID = h.PaymentID', // FK di history mengacu ke tabel utama
        'inner'
    );
    $this->db->where('h.PurchasePlanDtlID', $purchase_plan_dtl_id);
    $this->db->where('h.EndDate IS NULL', null, false); // sama seperti shipment, ambil yang aktif
    $this->db->order_by('h.EditDate', 'DESC');

    $query = $this->db->get();
    return $query->result_array();
}


public function get_purchase_plan_dtl_shipment_modal($purchase_plan_id)
{
    
    // --- Shipment History ---
    $sql_shipment = "
        WITH Shipment_CTE AS (
            SELECT 
                sh.ID,
                sh.PurchasePlanID,
                sh.Qty,
                sh.ShipmentDate,
                sh.Color,
                sh.Price,
                sh.EditDate AS ShipmentEditDate,
                sh.EditUserID AS ShipmentEditUserID,
                sh.StartDate,
                sh.EndDate,
                ROW_NUMBER() OVER (
                    PARTITION BY sh.StartDate, sh.EndDate 
                    ORDER BY sh.EditDate DESC
                ) AS rn
            FROM dbtPurchasePlanDtlShipmentHistory sh
            WHERE sh.StartDate IS NOT NULL
              AND sh.EndDate IS NOT NULL
              AND sh.PurchasePlanID = ?
        )
        SELECT DISTINCT
            sh.PurchasePlanID,
            sh.ID AS ShipmentHistoryID,
            sh.Qty,
            sh.ShipmentDate,
            sh.Color,
            sh.Price,
            sh.ShipmentEditDate,
            sh.ShipmentEditUserID,
            sh.StartDate,
            sh.EndDate,
            us.DisplayName AS ShipmentEditedBy
        FROM Shipment_CTE sh 
        LEFT JOIN dbsGroupUser us 
            ON us.ID = sh.ShipmentEditUserID
        WHERE sh.rn = 1
        ORDER BY sh.ShipmentEditDate ASC
    ";

    $shipment_history = $this->db->query($sql_shipment, [$purchase_plan_id])->result_array();


    // --- Payment History ---
    $sql_payment = "
        SELECT 
            ph.ID AS PaymentHistoryID,
            ph.PurchasePlanDtlID,
            ph.[Percent] AS PaymentPercent,
            ph.PaymentDate,
            ph.Notes,
            ph.OACredit,
            ph.EditDate AS PaymentEditDate,
            ph.EditUserID AS PaymentEditUserID,
            up.DisplayName AS PaymentEditedBy
        FROM dbtPurchasePlanDtlPaymentHistory ph
        LEFT JOIN dbsGroupUser up ON up.ID = ph.EditUserID
        WHERE ph.PurchasePlanDtlID IN (
            SELECT ID FROM dbtPurchasePlanDtl WHERE PurchasePlanID = ?
        )
        ORDER BY ph.EditDate ASC
    ";

    $payment_history = $this->db->query($sql_payment, [$purchase_plan_id])->result_array();


    // --- Return gabungan ---
    return [
        'shipment' => $shipment_history,
        'payment'  => $payment_history
    ];
}

public function get_purchase_plan_dtl_shipment_detail($shipment_history_id)
{
    // --- Ambil StartDate & EndDate dari shipment yang dipilih ---
    $sql_header = "
        SELECT 
            FORMAT(StartDate, 'yyyy-MM-dd HH:mm') AS StartDate,
            FORMAT(EndDate, 'yyyy-MM-dd HH:mm') AS EndDate,
            PurchasePlanID
        FROM dbtPurchasePlanDtlShipmentHistory
        WHERE ID = ?
    ";
    $header = $this->db->query($sql_header, [$shipment_history_id])->row_array();

    if (!$header) {
        return [
            'shipment' => [],
            'payment'  => []
        ];
    }

    $startDate = $header['StartDate'];
    $endDate   = $header['EndDate'];
    $purchasePlanID = $header['PurchasePlanID'];

    // --- Shipment Detail (samakan StartDate & EndDate sampai jam:menit) ---
    $sql_shipment = "
    SELECT 
        sh.ID AS ShipmentHistoryID,
        sh.PurchasePlanID,
        sh.Qty,
        sh.ShipmentDate,
        sh.Color,
        sh.Price,
        sh.StartDate,
        sh.EndDate,
         DATEPART(WEEK, sh.ShipmentDate) AS WeekNumber,
        CASE
           WHEN DATEPART(WEEK, sh.ShipmentDate) BETWEEN 1  AND 12 THEN DATEPART(WEEK, sh.ShipmentDate)
            WHEN DATEPART(WEEK, sh.ShipmentDate) BETWEEN 13 AND 24 THEN DATEPART(WEEK, sh.ShipmentDate)
            WHEN DATEPART(WEEK, sh.ShipmentDate) BETWEEN 25 AND 36 THEN DATEPART(WEEK, sh.ShipmentDate)
            WHEN DATEPART(WEEK, sh.ShipmentDate) BETWEEN 37 AND 48 THEN DATEPART(WEEK, sh.ShipmentDate)
            ELSE DATEPART(WEEK, sh.ShipmentDate)
        END AS WW,
        sh.EditDate AS ShipmentEditDate,
        sh.EditUserID AS ShipmentEditUserID,
        us.DisplayName AS ShipmentEditedBy,
        i.Code AS ItemCode,                    
        v.Description AS Vendor    
    FROM dbtPurchasePlanDtlShipmentHistory sh
    LEFT JOIN dbsGroupUser us 
        ON us.ID = sh.EditUserID
    LEFT JOIN dbmItemUnit iu 
        ON iu.ItemID = sh.ItemID
    LEFT JOIN dbmItem i
        ON i.ID = iu.ItemID
    LEFT JOIN dbmcoaattr v
        ON v.ID = sh.Vendor
    WHERE sh.PurchasePlanID = ?
      AND CONVERT(VARCHAR(16), sh.StartDate, 120) = CONVERT(VARCHAR(16), ?, 120)
      AND CONVERT(VARCHAR(16), sh.EndDate, 120)   = CONVERT(VARCHAR(16), ?, 120)
    ORDER BY sh.EditDate ASC
";
$shipment_detail = $this->db->query($sql_shipment, [
    $purchasePlanID,
    $startDate,
    $endDate
])->result_array();


    // --- Payment Detail (tetap join lewat PurchasePlanDtl, tapi filter by StartDate & EndDate) ---
    $sql_payment = "
        SELECT 
            ph.ID AS PaymentHistoryID,
            ph.PurchasePlanDtlID,
            ph.[Percent] AS Percentage,
            ph.PaymentDate,
            ph.Notes,
            ph.FromValue,
            ph.OACredit,
            ph.Term,
            ph.Alert,
            ph.StartDate,
            ph.EndDate,
            ph.EditDate AS PaymentEditDate,
            ph.EditUserID AS PaymentEditUserID,
            up.DisplayName AS PaymentEditedBy
        FROM dbtPurchasePlanDtlPaymentHistory ph
        LEFT JOIN dbsGroupUser up ON up.ID = ph.EditUserID
        WHERE ph.PurchasePlanDtlID IN (
            SELECT dtl.ID
            FROM dbtPurchasePlanDtl dtl
            INNER JOIN dbtPurchasePlanDtlShipmentHistory sh 
                ON sh.PurchasePlanID = dtl.PurchasePlanID
            WHERE sh.PurchasePlanID = ?
            AND CONVERT(VARCHAR(16), sh.StartDate, 120) = CONVERT(VARCHAR(16), ?, 120)
            AND CONVERT(VARCHAR(16), sh.EndDate, 120)   = CONVERT(VARCHAR(16), ?, 120)
        )
        AND CONVERT(VARCHAR(16), ph.StartDate, 120) = CONVERT(VARCHAR(16), ?, 120)
        AND CONVERT(VARCHAR(16), ph.EndDate, 120)   = CONVERT(VARCHAR(16), ?, 120)
        ORDER BY ph.EditDate ASC
    ";
    $payment_detail = $this->db->query($sql_payment, [
        $purchasePlanID,
        $startDate,
        $endDate,
        $startDate,
        $endDate
    ])->result_array();

    return [
        'shipment' => $shipment_detail,
        'payment'  => $payment_detail
    ];
}





    public function updatePurchasePlanHeader($id, $data)
    {
        if (empty($id)) {
            return false;
        }
        $tableName = 'dbtPurchasePlan';
        $this->db->where('ID', $id);
        $this->db->update($tableName, $data);
        return $this->db->affected_rows() > 0;
    }

    // table tengah
    public function deletePurchasePlanDtlShipment($purchasePlanID)
    {
        $this->db->where('PurchasePlanID', $purchasePlanID);
        return $this->db->delete('dbtPurchasePlanDtlShipment');
    }

    // tutup table tengah

    // update table kiri 
    public function deletePurchasePlanDtl($purchasePlanID)
    {
        log_message('debug', 'Attempting to delete PurchasePlanDtl for PurchasePlanID: ' . $purchasePlanID);
        $this->db->where('PurchasePlanID', $purchasePlanID);
        $result = $this->db->delete('dbtPurchasePlanDtl');
        log_message('debug', 'Delete Query (dbtPurchasePlanDtl): ' . $this->db->last_query());
        if ($result) {
            log_message('debug', 'Successfully deleted ' . $this->db->affected_rows() . ' rows from dbtPurchasePlanDtl.');
        } else {
            log_message('error', 'Failed to delete from dbtPurchasePlanDtl for PurchasePlanID ' . $purchasePlanID . '. Error: ' . $this->db->error()['message']);
        }
        return $result;
    }
    // tutup update table kiri 
    public function insertTableKananData($data)
    {
        try {
            $this->db->trans_start();
            
            // Validate data
            if (empty($data) || !is_array($data)) {
                throw new Exception('Invalid data provided');
            }
            
            $insertedCount = 0;
            
            foreach ($data as $row) {
                // Prepare insert data
                $insertData = [
                    'PurchasePlanDtlID' => (int)$row['PurchasePlanDtlID'],
                    'PaymentDate' => $row['PaymentDate'],
                    'Notes' => isset($row['Notes']) ? $row['Notes'] : '',
                    'Percent' => (float)$row['Percent'],
                    'FormValue' => isset($row['FormValue']) ? (int)$row['FormValue'] : 1,
                    'Alert' => isset($row['Alert']) ? (int)$row['Alert'] : 2,
                    'TermDays' => isset($row['TermDays']) ? (int)$row['TermDays'] : 0,
                    'OACredit' => isset($row['OACredit']) ? (float)$row['OACredit'] : 0,
                    'CreatedDate' => date('Y-m-d H:i:s'),
                    'CreatedBy' => $this->session->userdata('user_id') ?? 'system',
                ];
                
                $result = $this->db->insert('dbtPurchasePlanDtlPayment', $insertData);
                
                if ($result) {
                    $insertedCount++;
                } else {
                    throw new Exception('Failed to insert data: ' . $this->db->last_query());
                }
            }
            
            $this->db->trans_complete();
            
            if ($this->db->trans_status() === FALSE) {
                throw new Exception('Transaction failed');
            }
            
            return [
                'success' => true,
                'inserted_count' => $insertedCount,
                'message' => 'Data inserted successfully'
            ];
            
        } catch (Exception $e) {
            $this->db->trans_rollback();
            
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'inserted_count' => 0
            ];
        }
    }

    public function getDataTableKanan($purchasePlanDtlID)
    {
        $this->db->select('h.*, d.PurchasePlanID, s.ShipmentID, s.ShipmentDate, d.Vendor AS VendorID, s.Closed');
        $this->db->from('dbtPurchasePlanDtlPaymentHistory h');
        $this->db->join('dbtPurchasePlanDtl d', 'h.PurchasePlanDtlID = d.ID', 'left');

        $this->db->join(
            'dbtPurchasePlanDtlShipmentHistory s',
            's.PurchasePlanID = d.PurchasePlanID 
            AND s.Vendor = d.Vendor 
            AND s.EndDate IS NULL',
            'left'  // Tetap left dulu untuk debug
        );

        $this->db->where('h.PurchasePlanDtlID', $purchasePlanDtlID);
        $this->db->where('h.EndDate IS NULL');
        $this->db->order_by('h.ID', 'ASC');

        return $this->db->get()->result_array();
    }

    public function deletePurchasePlanDtlPayment($purchasePlanDtlID)
    {
        $this->db->where('PurchasePlanDtlID', (int) $purchasePlanDtlID);
        $result = $this->db->delete('dbtPurchasePlanDtlPayment');
        log_message('debug', 'DB Delete Query (dbtPurchasePlanDtlPayment): ' . $this->db->last_query());
        if (!$result) {
            log_message('error', 'Failed to delete from dbtPurchasePlanDtlPayment for ID: ' . $purchasePlanDtlID . '. Error: ' . $this->db->error()['message']);
        }
        return $result;
    }
    public function insertPurchasePlanDtlPaymentBatch($data)
    {
        if (empty($data)) {
            return 0;
        }

        $processed_data = [];
        foreach ($data as $row) {
            $new_row = [];
            foreach ($row as $key => $value) {
                if ($key === 'Percent') {
                    $new_row['[Percent]'] = $value;
                } else {
                    $new_row[$key] = $value;
                }
            }
            $processed_data[] = $new_row;
        }

        $result = $this->db->insert_batch('dbtPurchasePlanDtlPayment', $processed_data);

        log_message('debug', 'DB Insert Batch Query (dbtPurchasePlanDtlPayment): ' . $this->db->last_query());

        if ($result === FALSE) {
            $db_error = $this->db->error();
            log_message('error', 'Failed to insert batch into dbtPurchasePlanDtlPayment. Error Code: ' . $db_error['code'] . '. Error Message: ' . $db_error['message']);
        }
        return $result;
    }
    // tutup update table kanan


    public function syncPurchasePlanPaymentDetails($paymentDetails)
    {
        $this->db->trans_begin();

        try {
            // Ambil PurchasePlanDtlID unik
            $clientPurchasePlanDtlIDs = array_unique(array_column($paymentDetails, 'PurchasePlanDtlID'));
            $existingPayments = [];
            if (!empty($clientPurchasePlanDtlIDs)) {
                $query = $this->db->select('PurchasePlanDtlID, PaymentDate')
                    ->where_in('PurchasePlanDtlID', $clientPurchasePlanDtlIDs)
                    ->get('dbtPurchasePlanDtlPayment');
                foreach ($query->result_array() as $row) {
                    $existingPayments[$row['PurchasePlanDtlID']][] = $row['PaymentDate'];
                }
            }

            $dataToInsert = [];
            $dataToUpdate = [];
            $recordsToDelete = [];

            // Kelompokkan detail berdasarkan PurchasePlanDtlID
            $groupedDetails = [];
            foreach ($paymentDetails as $detail) {
                $purchasePlanDtlID = $detail['PurchasePlanDtlID'];
                $groupedDetails[$purchasePlanDtlID][] = $detail;
            }

            foreach ($groupedDetails as $purchasePlanDtlID => $details) {
                $existingPaymentDates = $existingPayments[$purchasePlanDtlID] ?? [];

                foreach ($details as $index => $detail) {
                    $dbData = [
                        'PurchasePlanDtlID' => $purchasePlanDtlID,
                        'PaymentDate' => $detail['PaymentDate'] ?? null,
                        'Notes' => $detail['Notes'] ?? null,
                        'Percent' => isset($detail['Percent']) ? floatval($detail['Percent']) : 0,
                        'FromValue' => isset($detail['FromValue']) ? floatval($detail['FromValue']) : 0, // Ubah ke FromValue
                        'Alert' => $detail['Alert'] ?? 0,
                        'Term' => isset($detail['Term']) ? intval($detail['Term']) : 0,
                        'OACredit' => isset($detail['OACredit']) ? floatval($detail['OACredit']) : 0
                    ];

                    // Jika PaymentDate ada di database, update; jika tidak, insert
                    if (isset($existingPaymentDates[$index]) && $existingPaymentDates[$index] == $detail['PaymentDate']) {
                        $dataToUpdate[] = $dbData;
                    } else {
                        $dataToInsert[] = $dbData;
                    }
                }

                // Hapus record yang tidak ada di data baru
                if (count($existingPaymentDates) > count($details)) {
                    $datesToDelete = array_slice($existingPaymentDates, count($details));
                    foreach ($datesToDelete as $date) {
                        $recordsToDelete[] = [
                            'PurchasePlanDtlID' => $purchasePlanDtlID,
                            'PaymentDate' => $date
                        ];
                    }
                }
            }

            // Hapus record yang tidak diperlukan
            if (!empty($recordsToDelete)) {
                foreach ($recordsToDelete as $record) {
                    $this->db->where('PurchasePlanDtlID', $record['PurchasePlanDtlID'])
                        ->where('PaymentDate', $record['PaymentDate'])
                        ->delete('dbtPurchasePlanDtlPayment');
                }
            }

            // Update record yang ada
            if (!empty($dataToUpdate)) {
                foreach ($dataToUpdate as $data) {
                    $this->db->where('PurchasePlanDtlID', $data['PurchasePlanDtlID'])
                        ->where('PaymentDate', $data['PaymentDate'])
                        ->update('dbtPurchasePlanDtlPayment', $data);
                }
            }

            // Insert record baru
            if (!empty($dataToInsert)) {
                $this->db->insert_batch('dbtPurchasePlanDtlPayment', $dataToInsert);
            }

            $this->db->trans_commit();
            return true;
        } catch (Exception $e) {
            $this->db->trans_rollback();
            log_message('error', 'Gagal memperbarui detail pembayaran Purchase Plan: ' . $e->getMessage());
            return false;
        }
    }

    // close purchase plan edit

    public function getVendorsFromShipmentTable()
    {

        $this->db->select('vendor');
        $this->db->distinct();
        $query = $this->db->get('dbtpurchaseplandtlshipment');

        return $query->result_array();
    }

    public function getVendorQuotationList($filterdept, $condition = "")
    {
        $returnData = [];

        $this->db->where($condition);
        $this->db->where("Void", "0");
        $this->db->where('Closed', 0);
        $vqList = $this->db->get('tVendorQuotation')->result_array();

        foreach ($vqList as $vqData) {
            $vqID = $vqData["ID"];

            $this->db->where('VendorQuotationID', $vqID);
            $this->db->where('IsWinner', 1);
            $detailResult = $this->db->get('tVendorQuotationDtl')->result_array();

            if (count($detailResult) > 0) {
                $vqDtl = $detailResult[0];
                $data = [
                    "ID" => $vqData["ID"],
                    "DocDate" => $this->formatDate($vqData["DocDate"]),
                    "DocNumber" => $vqData["DocNumber"],
                    "PRType" => $this->getAttributeValue('PurchaseRequisitionType', $vqData['PRTypeID']),
                    "POType" => ((int)$vqData["IsPoOther"] == 1 ? "Other" : "Inventory"),
                    "Vendor" => $vqData["Winner"],
                    "IncTax" => ($vqDtl["TaxType"] ? ($vqDtl["TaxType"] == 2 ? "Yes" : "No") : "No"),
                    "CreateUser" => $this->getRequestorName($vqData["CreateUserID"]),
                    "RequestUser" => $this->getRequestorName($vqData["RequestUserID"]), //Confirm By
                    "ApprBy" => $vqData["ApprUser"],
                    "DateAppr" => $this->formatDate($vqData["ApprDate"]),
                    "Reason" => $vqData["ApprReason"],
                    "Age" => $this->calculateAgeInDays($vqData["DocDate"])
                ];
                if (strtolower($filterdept) == "all") {
                    array_push($returnData, $data);
                } else {
                    $itemFilterDept = $this->findItemDept($vqDtl['ID'], implode(' ', explode('_', $filterdept)));
                    if (count($itemFilterDept) > 0) {
                        array_push($returnData, $data);
                    }
                }
            }
        }
        return $returnData;
    }

    public function getVendorQuotationFinalData($docNumber)
    {
        $returnData = [];

        $this->db->where('DocNumber', $docNumber);
        $this->db->where('Void', '0');
        $vqData = $this->db->get('tVendorQuotation')->result_array()[0];
        $vqData["PRType"] = $this->getAttributeValue('PurchaseRequisitionType', $vqData['PRTypeID']);
        $vqData["POStatus"] = ((int)$vqData["IsPoOther"] == 1 ? "Other" : "Inventory");
        $vqData["POTypeName"] = ($vqData["POType"] == 0 ? 'Asset' : ($vqData["POType"] == 1 ? 'Campaign' : 'Other'));
        $vqData["BranchName"] = ($vqData["IsPoOther"] == 1 ? $this->getAreaName($vqData["BranchID"]) : '');
        $vqData["DocDate"] = $this->formatDate(explode(' ', $vqData["DocDate"])[0]);

        $vqID = $vqData["ID"];

        $this->db->where('VendorQuotationID', $vqID);
        $this->db->where('IsWinner', 1);
        $vqDtlData = $this->db->get('tVendorQuotationDtl')->result_array()[0];

        $vqDtlData["Date"] = $this->formatDate(explode(' ', $vqDtlData["Date"])[0]);
        $vqDtlData["Total"] = $this->formatNumbersWithDot(explode('.', $vqDtlData["Total"])[0]);
        $vqDtlData["Rate"] = $this->formatNumbersWithDot($vqDtlData["Rate"]);
        $vqDtlData["GrandTotal"] = $this->formatNumbersWithDot(explode('.', $vqDtlData["GrandTotal"])[0] == "" ? 0 : explode('.', $vqDtlData["GrandTotal"])[0]);
        $vqDtlData["Discount"] = $this->formatNumbersWithDot(explode('.', $vqDtlData["Discount"])[0] == "" ? 0 : explode('.', $vqDtlData["Discount"])[0]);
        $vqDtlData["Tax"] = $this->formatNumbersWithDot(explode('.', $vqDtlData["Tax"])[0] == "" ? 0 : explode('.', $vqDtlData["Tax"])[0]);
        $vqDtlData["Currency"] = $this->getCurrencyName($vqDtlData["CurrID"]);
        $vqDtlData["Term"] = $vqDtlData["Term"];

        $vqDtlID = $vqDtlData["ID"];
        $this->db->where('VendorQuotationDtlID', $vqDtlID);
        $vqDtlItem = $this->db->get('tVendorQuotationDtlItem')->result_array();

        foreach ($vqDtlItem as $idx => $dtlItemData) {
            $vqDtlItem[$idx]["Price"] = $this->formatNumbersWithDot(intval($dtlItemData["Price"]));
            $vqDtlItem[$idx]["DiscPrice"] = $this->formatNumbersWithDot(intval($dtlItemData["DiscPrice"]));
            $vqDtlItem[$idx]["Total"] = intval($dtlItemData["Total"]);

            $additionQuery = "SELECT tpr.DocNumber, tprd.Line, tprd.GroupID, CAST(tprd.Name AS VARCHAR(MAX)) AS Name, tprd.Qty, tprd.Unit 
                                FROM tPurchaseRequisition tpr
                                JOIN tPurchaseRequisitionDtl tprd
                                ON tpr.ID = tprd.PurchaseRequisitionID
                                WHERE tprd.ID = {$dtlItemData['PurchaseRequisitionDtlID']}";
            $queryInfo_result = $this->db->query($additionQuery)->result_array()[0];

            $vqDtlItem[$idx]["DocNumber"] = $queryInfo_result["DocNumber"];
            $vqDtlItem[$idx]["Line"] = $queryInfo_result["Line"];
            $vqDtlItem[$idx]["Name"] = ($queryInfo_result["GroupID"] ? $queryInfo_result["GroupID"] : $queryInfo_result["Name"]);
            $vqDtlItem[$idx]["QtyReq"] = $queryInfo_result["Qty"];
            $vqDtlItem[$idx]["UnitReq"] = $queryInfo_result["Unit"];
        }

        $this->db->where('DocID', $vqID);
        $vqDocumentData = $this->db->get('tTransform')->result_array();

        $returnData["vqData"] = $vqData;
        $returnData["vqDtlData"] = $vqDtlData;
        $returnData["vqDtlItemData"] = $vqDtlItem;
        $returnData["vqDocData"] = $vqDocumentData;

        return $returnData;
    }

    public function getDocumentNameList()
    {
        $this->db->select('ID, Name');
        $query_result = $this->db->get('mTransform');

        return $query_result->result_array();
    }

    public function getVendorQuotationPOdata($docNumber)
    {
        $returnData = [];

        $this->db->where('DocNumber', $docNumber);
        $this->db->where('void', 0);
        $this->db->where('Closed', 0);
        $vqData = $this->db->get('tVendorQuotation')->result_array()[0];

        $vqId = $vqData["ID"];

        $this->db->where('VendorQuotationID', $vqId);
        $this->db->where('IsWinner', 1);
        $vqWinnerDtl = $this->db->get('tVendorQuotationDtl')->result_array()[0];

        $term = "-";
        $termID = -1;
        $this->db->select('ID, Description');
        if (isset($vqWinnerDtl["TermID"])) {
            $this->db->where('ID', $vqWinnerDtl["TermID"]);
        } else {
            $this->db->where('NetDue', $vqWinnerDtl["Term"]);
        }
        $termData = $this->db->get('dbmTerm')->result_array();
        if (count($termData) > 0) {
            $term = $termData[0]['Description'];
            $termID = $termData[0]['ID'];
        }

        $this->db->select('Code, Description');
        $this->db->where('ID', $vqWinnerDtl["CurrID"]);
        $curr = $this->db->get('dbmCurr')->result_array()[0];

        $returnData["vqData"] = [
            "VendorQuotationID" => $vqId,
            "DocNumber" => $vqData["DocNumber"],
            "Winner" => $vqData["Winner"],
            "DocDate" => explode(' ', $vqData["DocDate"])[0],
            "TermID" => $termID,
            "Term" => $term,
            "CurrID" => $vqWinnerDtl["CurrID"],
            "Currency" => $curr["Code"] . " - " . $curr["Description"],
            "Rate" => $vqWinnerDtl["Rate"],
            "IncludeTax" => $vqWinnerDtl["TaxType"] ? $vqWinnerDtl["TaxType"] : 1,
            "ProjectID" => $vqData["ProjectID"] ? $vqData["ProjectID"] : -1,
            "RequestUserName" => $this->getRequestorName($vqData["RequestUserID"])
        ];

        $prTypeID = $vqData["PRTypeID"];
        $defaultVendor = -1;

        if ($prTypeID == 3302 || $prTypeID == 3303) {
            $this->db->distinct();
            $this->db->select('VendorID');
            $this->db->from('tPurchaseRequisition tpr');
            $this->db->join('tPurchaseRequisitionDtl tprd', 'tpr.ID = tprd.PurchaseRequisitionID');
            $this->db->join('tVendorQuotation tvq', 'tvq.ID = tprd.VendorQuotationID');
            $this->db->where('tvq.DocNumber', $docNumber);
            $defaultVendorIDList = $this->db->get()->result_array();

            if (count($defaultVendorIDList) > 0) {
                $defaultVendor = $defaultVendorIDList[0]['VendorID'];
            }
        }

        $returnData["vqData"]["DefaultVendor"] = $defaultVendor;

        $queryNeeds = "SELECT TOP 1 tpr.Needs 
                        FROM tPurchaseRequisition tpr 
                        JOIN tPurchaseRequisitionDtl tprd ON tpr.ID = tprd.PurchaseRequisitionID 
                        JOIN tVendorQuotation tvq ON tvq.ID = tprd.VendorQuotationID 
                        WHERE tvq.DocNumber = '$docNumber'";
        $Needs = $this->db->query($queryNeeds)->result_array()[0];

        $returnData["vqData"]["Needs"] = $Needs['Needs'];

        //get detail item data
        $this->db->select("tvqdi.ID, tprd.GroupID, CAST(tprd.Name AS VARCHAR(MAX)) AS Name, tvqdi.Qty, tvqdi.Unit, tvqdi.Price, tvqdi.DiscPrice, tvqdi.Total, tvqdi.LeadTime, tvqdi.Warranty, tpr.RequestUserID, tpr.DepartemenID, tprd.Line, tpr.DocNumber, tpr.POType, tpr.FundCatID, tvqdi.SubTotal, CASE 
                                    WHEN tvqd.TaxType = 3 AND tvqdi.TaxRate > 0 THEN 'Exclude PPN (' + CAST(tvqdi.TaxRate AS VARCHAR) + '%)'
                                    WHEN tvqd.TaxType = 2 AND tvqdi.TaxRate > 0 THEN 'Include PPN (' + CAST(tvqdi.TaxRate AS VARCHAR) + '%)'
                                    ELSE 'Non PPN'
                                END AS TaxRate, tvqdi.Tax");
        $this->db->from('tVendorQuotation tvq');
        $this->db->join('tVendorQuotationDtl tvqd', 'tvq.ID = tvqd.VendorQuotationID');
        $this->db->join('tVendorQuotationDtlItem tvqdi', 'tvqd.ID = tvqdi.VendorQuotationDtlID');
        $this->db->join('tPurchaseRequisitionDtl tprd', 'tvqdi.PurchaseRequisitionDtlID = tprd.ID');
        $this->db->join('tPurchaseRequisition tpr', 'tprd.PurchaseRequisitionID = tpr.ID');
        $this->db->where('tvq.ID', $vqId);
        $this->db->where('tvqd.IsWinner', 1);
        $this->db->where('tvqdi.Void', 0);
        $dtlItemResult = $this->db->get()->result_array();

        foreach ($dtlItemResult as $index => $dtlItem) {
            $dtlItemResult[$index]["DiscPrice"] = (explode('.', $dtlItem["DiscPrice"])[0] == "" ? 0 : explode('.', $dtlItem["DiscPrice"])[0]);
            $dtlItemResult[$index]["Price"] = explode('.', $dtlItem["Price"])[0];
            $dtlItemResult[$index]["SubTotal"] = explode('.', $dtlItem["SubTotal"])[0];
            $dtlItemResult[$index]["Tax"] = explode('.', $dtlItem["Tax"])[0];
            $dtlItemResult[$index]["Total"] = explode('.', $dtlItem["Total"])[0];
            $dtlItemResult[$index]["RequestUser"] = $this->getRequestorName($dtlItem["RequestUserID"]);
            $dtlItemResult[$index]["Dept"] = $this->getDeptName($dtlItem["DepartemenID"]);
            // $dtlItemResult[$index]["DiscCode"] = $this->getDiscCode($dtlItem["DiscPriceID"]);
            $dtlItemResult[$index]["DiscCode"] = $this->getDiscCode(null);
        }
        $returnData["vqDtlItem"] = $dtlItemResult;

        //get detail vq discount & tax
        $this->db->select('Tax,TaxRate,DiscountID,Discount,GrandTotal');
        $this->db->where('VendorQuotationID', $vqId);
        $this->db->where('IsWinner', 1);
        $discTaxResult = $this->db->get('tVendorQuotationDtl')->result_array()[0];

        $discTaxResult["DiscountCode"] = $this->getDiscCode($discTaxResult["DiscountID"]);
        // $discTaxResult["TaxCode"] = $this->getTaxCode($discTaxResult["TaxID"]);
        $discTaxResult["TaxCode"] = $this->getTaxCode(null);
        $discTaxResult["GrandTotal"] = explode('.', $discTaxResult["GrandTotal"])[0];
        $discTaxResult["Tax"] = (explode('.', $discTaxResult["Tax"])[0] == "" ? 0 : explode('.', $discTaxResult["Tax"])[0]);
        $discTaxResult["Discount"] = (explode('.', $discTaxResult["Discount"])[0] == "" ? 0 : explode('.', $discTaxResult["Discount"])[0]);

        $returnData["discTaxResult"] = $discTaxResult;

        //get vendor Quotation Document data
        $vqDocData = $this->getVendorQuotationDocumentData($vqId);
        $returnData["vqDocData"] = $vqDocData;

        return $returnData;
    }

    public function getVendorQuotationPoOtherData($docNumber)
    {
        $returnData = [];

        $queryVqData = "SELECT DISTINCT 
                            tvq.ID, 
                            tvq.DocNumber, 
                            tvq.PRTypeID, 
                            tvq.DocDate, 
                            tvq.Winner, 
                            tpr.QQ, 
                            tpr.BranchID, 
                            tpr.POType, 
                            tpr.FundID, 
                            tpr.FundName, 
                            tpr.FundCatID, 
                            tpr.FundCategory, 
                            tvqd.Term, 
                            tvqd.Discount,
                            mir.TargetType,
                            CASE 
                                WHEN tvqd.TaxType = 3 THEN 'Exclude PPN (' + CAST(tvqd.TaxRate AS VARCHAR) + '%)'
                                WHEN tvqd.TaxType = 2 THEN 'Include PPN (' + CAST(tvqd.TaxRate AS VARCHAR) + '%)'
                                ELSE 'Non PPN'
                            END AS TaxRate, 
                            tvqd.Tax, 
                            tvqd.TaxType, 
                            tvq.EstBiaya  
                        FROM tVendorQuotation tvq
                        JOIN tVendorQuotationDtl tvqd ON tvq.ID = tvqd.VendorQuotationID
                        JOIN tVendorQuotationDtlItem tvqdi ON tvqd.ID = tvqdi.VendorQuotationDtlID
                        JOIN tPurchaseRequisitionDtl tprd ON tvqdi.PurchaseRequisitionDtlID = tprd.ID
                        JOIN tPurchaseRequisition tpr ON tprd.PurchaseRequisitionID = tpr.ID
                        LEFT JOIN dbtMarketingItemRequest mir ON tpr.ReffDocNumber = mir.DocNumber
                        WHERE tvq.DocNumber = '$docNumber'
                        AND tvqd.IsWinner = 1
                        AND tvq.Void = 0
                        AND tvq.Closed = 0";
        $vqData = $this->db->query($queryVqData)->result_array();
        if (empty($vqData)) {
            return [
                "vqData"             => null,
                "vqItemData"         => [],
                "prDealerData"       => [],
                "prProductData"      => [],
                "prDealerTotalCost"  => 0,
                "prProductTotalCost" => 0,
                "error"              => "Data tidak ditemukan untuk DocNumber: $docNumber"
            ];
        }

        $vqData = $vqData[0];

        $term = "-";
        $termID = -1;
        $this->db->select('ID, Description');
        $this->db->where('NetDue', $vqData["Term"]);
        $termData = $this->db->get('dbmTerm')->result_array();
        if (count($termData) > 0) {
            $term = $termData[0]['Description'];
            $termID = $termData[0]['ID'];
        }

        $vqData["Area"] = $this->getAreaName($vqData["BranchID"]);
        $vqData["TransactionType"] = ($vqData["POType"] == 0 ? 'Asset' : ($vqData["POType"] == 1 ? 'Campaign' : 'Other'));
        $vqData["FundName"] = $vqData["FundName"] . " - " . $this->getFundSourceFullName($vqData["FundName"]);
        $vqData["DocDate"] = explode(' ', $vqData["DocDate"])[0];
        $vqData["TermID"] = $termID;
        $vqData["Term"] = $term;

        $returnData["vqData"] = $vqData;

        $vqId = $vqData["ID"];

        $prTypeID = $vqData["PRTypeID"];
        $defaultVendor = -1;

        if ($prTypeID == 3302 || $prTypeID == 3303) {
            $this->db->distinct();
            $this->db->select('VendorID');
            $this->db->from('tPurchaseRequisition tpr');
            $this->db->join('tPurchaseRequisitionDtl tprd', 'tpr.ID = tprd.PurchaseRequisitionID');
            $this->db->join('tVendorQuotation tvq', 'tvq.ID = tprd.VendorQuotationID');
            $this->db->where('tvq.DocNumber', $docNumber);
            $defaultVendorIDList = $this->db->get()->result_array();

            if (count($defaultVendorIDList) > 0) {
                $defaultVendor = $defaultVendorIDList[0]['VendorID'];
            }
        }

        if ($prTypeID == 3304) {
            $vqData["TargetType"] = null;
            $vqData["TargetTypeID"] = null;
            $vqData["TargetValue"] = null;
            $vqData["TargetID"] = null;
            // Ambil ReffDocNumber dari PR yang terkait
            $queryReff = "SELECT TOP 1 tpr.ReffDocNumber 
                        FROM tPurchaseRequisition tpr 
                        JOIN tPurchaseRequisitionDtl tprd ON tpr.ID = tprd.PurchaseRequisitionID 
                        JOIN tVendorQuotationDtlItem tvqdi ON tprd.ID = tvqdi.PurchaseRequisitionDtlID
                        JOIN tVendorQuotationDtl tvqd ON tvqdi.VendorQuotationDtlID = tvqd.ID
                        WHERE tvqd.VendorQuotationID = $vqId";
            $reffResult = $this->db->query($queryReff)->result_array();
            $reff = $reffResult[0]["ReffDocNumber"] ?? null;

            $targetValue = null;

            if ($reff) {
                $mireq = $this->db
                    ->select('TargetID, TargetType')
                    ->from('dbtMarketingItemRequest')
                    ->where('DocNumber', $reff)
                    ->get()
                    ->row_array();

                if ($mireq && $mireq["TargetID"]) {
                    if ($mireq["TargetType"] == 1) {
                        $outlet = $this->db
                            ->select('Name')
                            ->from('SalesOut..mOutlet')
                            ->where('ID', $mireq["TargetID"])
                            ->where('Status', 1)
                            ->get()
                            ->row_array();

                        $targetValue = $outlet ? $outlet["Name"] : null;
                        $vqData["TargetType"] = "OUTLET";
                        $vqData["TargetTypeID"] = 1;

                    } elseif ($mireq["TargetType"] == 2) {
                        $vqData["TargetType"] = "INTERNAL";
                        $vqData["TargetTypeID"] = 2;
                        $targetValue = null; 

                    } elseif ($mireq["TargetType"] == 3) {
                        $coa = $this->db
                            ->select('Description')
                            ->from('_dbmcoaattr')
                            ->where('ID', $mireq["TargetID"])
                            ->get()
                            ->row_array();

                        $targetValue = $coa ? $coa["Description"] : null;
                        $vqData["TargetType"] = "COA";
                        $vqData["TargetTypeID"] = 3;
                        $vqData["TargetID"] = $mireq["TargetID"];
                    }
                }
            }

            $vqData["TargetValue"] = $targetValue;

        } else {
            // Untuk POType selain 3304, TargetType berdasarkan POType
            $vqData["TargetType"] = ($vqData["POType"] == 1) ? "DEALER" : "USER";
            $vqData["TargetValue"] = null;
            $vqData["TargetTypeID"] = null;
        }

        // Update returnData setelah perubahan vqData
        $returnData["vqData"] = $vqData;

        $returnData["vqData"]["DefaultVendor"] = $defaultVendor;

        $queryNeeds = "SELECT TOP 1 tpr.Needs 
                        FROM tPurchaseRequisition tpr 
                        JOIN tPurchaseRequisitionDtl tprd ON tpr.ID = tprd.PurchaseRequisitionID 
                        JOIN tVendorQuotation tvq ON tvq.ID = tprd.VendorQuotationID 
                        WHERE tvq.DocNumber = '$docNumber'";
        $Needs = $this->db->query($queryNeeds)->result_array()[0];

        $returnData["vqData"]["Needs"] = $Needs['Needs'];

        $queryVqItemData = "SELECT 
                                tpr.ID, 
                                CAST(tprd.Name AS VARCHAR(MAX)) AS Name, 
                                tprd.GroupID, 
                                tvqdi.PurchaseRequisitionDtlID, 
                                tvqdi.Qty,
                                tvqdi.Unit, --baru
                                tvqdi.Price,
                                tvqdi.DiscPrice, 
                                tvqdi.SubTotal,
                                tvqdi.Total,
                                CASE 
                                    WHEN tvqd.Total <> 0 THEN 
                                        CAST(CAST((CAST(tvqd.Discount AS DECIMAL(18,4)) / CAST(tvqd.Total AS DECIMAL(18,4))) * 100 AS DECIMAL(18,2)) AS VARCHAR) + '%'
                                    ELSE 
                                        '0%'
                                END AS Discount,
                                CASE 
                                    WHEN tvqd.Total <> 0 THEN 
                                        CAST(tvqdi.Total - (tvqdi.Total * (CAST(tvqd.Discount AS DECIMAL(18,4)) / CAST(tvqd.Total AS DECIMAL(18,4)))) AS DECIMAL(18,2))
                                    ELSE 
                                        CAST(tvqdi.Total AS DECIMAL(18,2))
                                END AS SubTotalAfterDiscount,
                                CASE 
                                    WHEN tvqd.TaxType = 3 AND tvqdi.TaxRate > 0 THEN 'Exclude PPN (' + CAST(tvqdi.TaxRate AS VARCHAR) + '%)'
                                    WHEN tvqd.TaxType = 2 AND tvqdi.TaxRate > 0 THEN 'Include PPN (' + CAST(tvqdi.TaxRate AS VARCHAR) + '%)'
                                    ELSE 'Non PPN'
                                END AS TaxRate,
                                tvqdi.Tax,
                                -- CASE 
                                --     WHEN tvqd.TaxType = 3 THEN 
                                --         CAST(
                                --             (CASE 
                                --                 WHEN tvqd.Total <> 0 THEN 
                                --                     tvqdi.Total - (tvqdi.Total * (CAST(tvqd.Discount AS DECIMAL(18,4)) / CAST(tvqd.Total AS DECIMAL(18,4))))
                                --                 ELSE 
                                --                     tvqdi.Total
                                --             END) + 
                                --             ((CASE 
                                --                 WHEN tvqd.Total <> 0 THEN 
                                --                     tvqdi.Total - (tvqdi.Total * (CAST(tvqd.Discount AS DECIMAL(18,4)) / CAST(tvqd.Total AS DECIMAL(18,4))))
                                --                 ELSE 
                                --                     tvqdi.Total
                                --             END) * CAST(tvqd.TaxRate AS DECIMAL(18,2)) / 100)
                                --             AS DECIMAL(18,2))
                                --     ELSE 
                                --         CAST(
                                --             CASE 
                                --                 WHEN tvqd.Total <> 0 THEN 
                                --                     tvqdi.Total - (tvqdi.Total * (CAST(tvqd.Discount AS DECIMAL(18,4)) / CAST(tvqd.Total AS DECIMAL(18,4))))
                                --                 ELSE 
                                --                     tvqdi.Total
                                --             END
                                --             AS DECIMAL(18,2))
                                -- END AS Total, 
                                tprd.UserName, 
                                tprd.DealerID, 
                                tprd.DealerName, 
                                tpr.RequestUserID, 
                                tpr.DepartemenID, 
                                tprd.Line, 
                                tprd.Qty AS QtyReq,  --baru
                                tprd.ID AS prdID,  --baru
                                tpr.DocNumber,
                                tvqdi.Notes,
								av.AttributeValue AS MarketingType
                            FROM tPurchaseRequisition tpr
                                JOIN tPurchaseRequisitionDtl tprd ON tpr.ID = tprd.PurchaseRequisitionID
                                JOIN tVendorQuotationDtlItem tvqdi ON tprd.ID = tvqdi.PurchaseRequisitionDtlID
                                JOIN tVendorQuotationDtl tvqd ON tvqdi.VendorQuotationDtlID = tvqd.ID
                                JOIN tVendorQuotation tvq ON tvqd.VendorQuotationID = tvq.ID
                                LEFT JOIN dbtMarketingItemRequestDtl mird ON mird.PRDtlID = tprd.ID
								LEFT JOIN dbmMarketingItemInformation a on a.ItemID = mird.ItemID and a.IsActive = 1
								LEFT JOIN mAttributeValue av on av.ID = a.MarketingType
                            WHERE tvq.ID = $vqId
                                AND tvqd.IsWinner = 1
                                AND tpr.IsPoOther = 1
                                AND tvq.Void = 0
                                AND tvq.Closed = 0
                                AND tvqdi.Void = 0";
        $vqItemData = $this->db->query($queryVqItemData)->result_array();

        foreach ($vqItemData as $index => $data) {
            $vqItemData[$index]["Price"] = explode('.', $data["Price"])[0];
            $vqItemData[$index]["Total"] = $data["Total"];
            $vqItemData[$index]["ReqBy"] = $this->getRequestorName($data["RequestUserID"]);
            $vqItemData[$index]["Dept"] = $this->getDeptName($data["DepartemenID"]);
        }

        $returnData["vqItemData"] = $vqItemData;

        $prDealerData = [];
        $prProductData = [];
        $prDealerTotalCost = 0;
        $prProductTotalCost = 0;

        if ($vqData["POType"] == 1) {
            $prID = $vqItemData[0]["ID"];

            // Dealer
            $this->db->where('PurchaseRequisitionID', $prID);
            $prDealerData = $this->db->get('tPurchaseRequisitionDealerAlloc')->result_array();

            foreach ($prDealerData as $index => $dealerData) {
                // Perbaikan: Hitung Cost berdasarkan CostPercent dan EstBiaya
                $costPercent = floatval($dealerData["CostPercent"]);
                $estBiaya = floatval($vqData["EstBiaya"]);
                $calculatedCost = ($costPercent/100) * $estBiaya;
                
                // Simpan cost yang sudah dihitung (dibulatkan tanpa desimal)
                $prDealerData[$index]["Cost"] = floor($calculatedCost);
                $prDealerTotalCost += $prDealerData[$index]["Cost"];
            }

            // Product
            $this->db->where('PurchaseRequisitionID', $prID);
            $prProductData = $this->db->get('tPurchaseRequisitionProductAlloc')->result_array();

            foreach ($prProductData as $index => $productData) {
                // Perbaikan: Hitung Cost berdasarkan CostPercent dan EstBiaya
                $costProductPercent = floatval($productData["CostPercent"]);
                $estBiaya = floatval($vqData["EstBiaya"]);
                $calculatedCost = ($costProductPercent/100) * $estBiaya;
                
                // Simpan cost yang sudah dihitung (dibulatkan tanpa desimal)
                $prProductData[$index]["Cost"] = floor($calculatedCost);
                $prProductTotalCost += $prProductData[$index]["Cost"];

            }
        }

        $returnData["prDealerData"] = $prDealerData;
        $returnData["prProductData"] = $prProductData;
        $returnData["prDealerTotalCost"] = $prDealerTotalCost;
        $returnData["prProductTotalCost"] = $prProductTotalCost;

        return $returnData;
    }

    public function getMarketingItemRequestAndOutlet($vqDocNumber)
    {
        $query = "SELECT DISTINCT 
                        c.ReffDocNumber AS MarketingItemRequestDocNo, 
                        e.Code + ' - ' + e.Name AS Outlet, 
                        e.ID AS OutletID,
                        d.TargetID,
                        d.TargetType,
                        c.PRTypeID,
                        jd.Description AS Internal,
                        co.Description AS Dealer
                FROM tVendorQuotation a 
                LEFT JOIN tPurchaseRequisitionDtl b ON b.VendorQuotationID = a.ID 
                LEFT JOIN tPurchaseRequisition c ON c.id = b.PurchaseRequisitionID 
                LEFT JOIN dbtMarketingItemRequest d ON d.ID = c.ReffDocID 
                LEFT JOIN dbmJobDivision jd on jd.ID = d.TargetID 
                LEFT JOIN SalesOut..mOutlet e ON d.TargetID = e.ID 
                LEFT JOIN dbmCoaAttr co ON d.TargetID = co.ID 
                WHERE a.DocNumber = '$vqDocNumber'";
        
        return $this->db->query($query)->result_array();
    }

    public function getMarketingItemVariantByDocNumber($vqDocNumber)
    {
        $query = "
            SELECT DISTINCT 
                b.ID AS PurchaseRequisitionDtlID,
                dtl.ItemID,
                dtl.ItemUnitID,
                d.LocationID,
                dtl.MarketingItemVariantID,
                dtl.MarketingItemVariantCustom,
                dtl.ID AS MarketingItemRequestDtlID
            FROM tVendorQuotation a 
            LEFT JOIN tPurchaseRequisitionDtl b 
                ON b.VendorQuotationID = a.ID 
            LEFT JOIN tPurchaseRequisition c 
                ON c.id = b.PurchaseRequisitionID 
            LEFT JOIN dbtMarketingItemRequest d 
                ON d.ID = c.ReffDocID 
            LEFT JOIN dbtMarketingItemRequestDtl dtl 
                ON dtl.PRDtlID = b.ID    -- relasi langsung via PRDtlID
            WHERE a.DocNumber = ?
        ";

        return $this->db->query($query, [$vqDocNumber])->result_array();
    }

    public function insertPurchaseOrderDocument($post_data)
    {
        $this->db->insert('tTransform', $post_data);
        return ($this->db->affected_rows() != 1) ? false : true;
    }

    public function insertPurchaseOrderPlan($planData)
    {
        $this->db->insert('tPOPlan', $planData);
        return ($this->db->affected_rows() != 1) ? false : true;
    }

    public function closedVendorQuotation($vqID, $updateData)
    {
        $this->db->where('ID', $vqID);
        $updatedRow = $this->db->update('tVendorQuotation', $updateData);

        return ($this->db->affected_rows() != 1) ? false : true;
    }

    public function updateStatusOnPo($vqID)
    {
        $successUpdate = true;
        $prDtlIDQuery = "SELECT DISTINCT tprd.ID 
                        FROM tVendorQuotation tvq
                        JOIN tVendorQuotationDtl tvqd ON tvq.ID = tvqd.VendorQuotationID
                        JOIN tVendorQuotationDtlItem tvqdi ON tvqd.ID = tvqdi.VendorQuotationDtlID
                        JOIN tPurchaseRequisitionDtl tprd ON tvqdi.PurchaseRequisitionDtlID = tprd.ID
                        WHERE tvq.ID = $vqID";
        $prDtlIDs = $this->db->query($prDtlIDQuery)->result_array();

        $continueUpdate = true;
        foreach ($prDtlIDs as $prDtlID) {
            if ($continueUpdate) {
                $data = [
                    "Status" => 9
                ];

                $this->db->where('ID', $prDtlID["ID"]);
                $this->db->update('tPurchaseRequisitionDtl', $data);
                if ($this->db->affected_rows() != 1) {
                    $successUpdate = false;
                    $continueUpdate = false;
                }
            }
        }
        return $successUpdate;
    }

    public function getCampaignList()
    {
        $this->db->select('ID, Name');
        $campaignList = $this->db->get('NVT..mCampaign')->result_array();
        return $campaignList;
    }

    public function getItemList()
    {
        $query = "SELECT distinct a.id, a.code, a.description, c.id as itemunitid, c.unitname, a.Type, a.coaattrid itemdeptid
                    FROM dbmitem a
                    LEFT JOIN ods4..dbmitemmarketingname b ON a.id = b.itemid
                    JOIN dbmitemunit c ON a.id = c.itemid AND c.status <> 0
                    WHERE a.status <> 0";
        $itemList = $this->db->query($query)->result_array();
        return $itemList;
    }

    public function getColorList()
    {
        $query = "
            SELECT 
                a.ID AS AttributeID,
                a.Name AS AttributeName,
                v.ID AS AttributeValueID,
                v.AttributeValue
            FROM mAttribute a
            LEFT JOIN mAttributeValue v ON v.AttributeID = a.ID
            WHERE a.Status = 1 
            AND v.Status = 1
            AND a.Name = 'Color'
            ORDER BY v.ID
        ";

        $result = $this->db->query($query)->result_array();
        return $result;
    }

    public function addNewColor($colorName)
    {
        // cari dulu ID dari atribut 'Color'
        $attribute = $this->db->get_where('mAttribute', ['Name' => 'Color', 'Status' => 1])->row();

        if (!$attribute) return false;

        $data = [
            'AttributeID' => $attribute->ID,
            'AttributeValue' => $colorName,
            'Status' => 1,
            'CreateDate' => date('Y-m-d H:i:s'),
            'CreateUserID' => 1692
        ];

        $this->db->insert('mAttributeValue', $data);

        if ($this->db->affected_rows() > 0) {
            $insertID = $this->db->insert_id();
            return [
                'AttributeValueID' => $insertID,
                'AttributeValue' => $colorName
            ];
        }
        return false;
    }

    public function getVendorQuotationDocumentData($vqId)
    {
        $this->db->where('DocID', $vqId);
        $query_result = $this->db->get('tTransform')->result_array();
        return $query_result;
    }

    public function getUnitList($itemId)
    {
        $this->db->select('ID,UnitName');
        $this->db->where('ItemID', $itemId);
        $unitList = $this->db->get('dbmItemUnit')->result_array();
        return $unitList;
    }

    public function updateFundReff($fundIds, $fundData) // fundIds sekarang diharapkan berupa array
    {
        // Pastikan input adalah array, jika tidak, bungkus sebagai array tunggal
        if (!is_array($fundIds)) {
            $fundIds = [$fundIds];
        }
        
        $this->db->where_in('ID', $fundIds); 
        $this->db->update('tFundRequest', $fundData);
        
        return ($this->db->affected_rows() > 0) ? true : false;
    }

    public function getStatusFiscalPeriod($fiscalYear, $periodIndex)
    {
        $this->db->select('Status');
        $this->db->where('FiscalYear', $fiscalYear);
        $this->db->where('PeriodIndex', $periodIndex);
        $result = $this->db->get('dbmFiscalPeriod')->result_array();

        return $result;
    }

    public function getPurchaseOrderData($poID)
    {
        $returnData = [
            'docData' => [],
            'itemData' => [],
            'reffData' => [],
            'planData' => []
        ];

        $this->db->where('ID', $poID);
        $result = $this->db->get('dbtItemDoc')->result_array();

        if (count($result) > 0) {
            $returnData['docData'] = $result[0];
            if ($result[0]['DiscountID'] > 0) {
                $returnData['docData']['DiscountDescription'] = $this->getDiscDesc($result[0]['DiscountID']);
            }
            // if ($result[0]['TaxID'] > 0) {
            //     $returnData['docData']['TaxDescription'] = $this->getTaxDesc($result[0]['TaxID']);
            // }
            if ($result[0]['TermID']) {
                $returnData['docData']['termDesc'] = $this->getTermName($result[0]['TermID']);
            }
            if ($result[0]['CurrID']) {
                $returnData['docData']['currDesc'] = $this->getCurrName($result[0]['CurrID']);
            }
            if ($result[0]['CreateUserID']) {
                $returnData['docData']['CreateUserName'] = $this->getRequestorName($result[0]['CreateUserID']);
            }
            if ($result[0]['ConfirmDate']) {
                [$year, $month, $day] = explode('-', explode(' ', $result[0]['ConfirmDate'])[0]);
                $returnData['docData']['ConfirmDate'] = "$day-$month-$year";
            }

            $this->db->where('DocID', $poID);
            $itemData = $this->db->get('dbtItemTrans')->result_array();

            foreach ($itemData as $index => $transData) {
                $itemData[$index]['UnitDesc'] = $this->getUnitDesc($transData['ItemUnitID']);
                if ($transData['ItemDiscPriceID'] > 0) {
                    $itemData[$index]['DiscDesc'] = $this->getDiscDesc($transData['ItemDiscPriceID']);
                }
                if ($transData['TaxTmp'] > 0) {
                    $itemData[$index]['ItemPrice'] = $transData['ItemPrice'] + $transData['TaxTmp'];
                    if ($transData['ItemDiscPrice'] > 0) {
                        $itemData[$index]['ItemSubTotal'] = $transData['ItemSubTotal']-($transData['TaxItemDiscTmp']*$transData['ItemQty']) + ($transData['TaxTmp']*$transData['ItemQty']);
                    } else {
                        $itemData[$index]['ItemSubTotal'] = $transData['ItemSubTotal'] + ($transData['TaxTmp']*$transData['ItemQty']);
                    }
                    $itemData[$index]['ItemDiscPrice'] = $transData['ItemDiscPrice'] + $transData['TaxItemDiscTmp'];
                }
            }
            $returnData['itemData'] = $itemData;

            $reffID = $result[0]['ReffDocID'] ? $returnData['docData']['ReffDocID'] : '';
            $reffDocNumber = $result[0]['ReffDocNumber'];
            $reffDocType = '';
            if ($reffDocNumber) {
                $reffDocType = substr(explode('-', $reffDocNumber)[0], 0, 5);
            }
            if ($reffDocType == 'SPQTN') {
                //get ProcurementTypeID & PaymentTypeID & EstBiaya
                $this->db->select('ProcurementTypeID, PaymentTypeID, EstBiaya');
                $this->db->where('ID', $reffID);
                $vqProcurementInfo = $this->db->get('tVendorQuotation')->result_array();

                if (count($vqProcurementInfo) == 1) {
                    $returnData['reffData']['ReffProcurementTypeID'] = $vqProcurementInfo[0]['ProcurementTypeID'];
                    $returnData['reffData']['ReffPaymentTypeID'] = $vqProcurementInfo[0]['PaymentTypeID'];
                    $returnData['reffData']['EstBiaya'] = $vqProcurementInfo[0]['EstBiaya'];
                }

                $this->db->select("DISTINCT
                                    CASE 
                                        WHEN d.TaxType = 3 AND vqdi.TaxRate > 0 THEN 'Exclude PPN (' + CAST(vqdi.TaxRate AS VARCHAR) + '%)'
                                        WHEN d.TaxType = 2 AND vqdi.TaxRate > 0 THEN 'Include PPN (' + CAST(vqdi.TaxRate AS VARCHAR) + '%)'
                                        WHEN d.TaxType = 1 THEN 'Non PPN'
                                    END AS Tax,
                                    vqdi.TaxRate");
                                $this->db->from('tVendorQuotationDtl d');
                                $this->db->join('tVendorQuotationDtlItem vqdi', 'vqdi.vendorquotationdtlid = d.id', 'join');
                                $this->db->join('tPurchaseRequisitionDtl a', 'a.ID = vqdi.PurchaseRequisitionDtlID', 'join');
                                $this->db->join('dbtitemtrans b', 'b.ID = a.ReffTransID', 'join');
                                $this->db->where('d.VendorQuotationID', $reffID);
                                $this->db->where('b.DocID', $poID); // Sesuaikan dengan parameter jika perlu
                                $this->db->where('d.IsWinner', 1);
                $TaxList = $this->db->get()->result_array();

                // Set nilai TaxDescription dan Tax berdasarkan kondisi
                if ($result[0]['TaxID'] = 0) { //Non PPN
                    $returnData['docData']['TaxDescription'] = '';
                    $returnData['docData']['Tax'] = '';
                } else if (stripos($TaxList[0]['Tax'], 'include') !== false) {
                    $returnData['docData']['TaxDescription'] = $TaxList[0]['Tax'];
                    $returnData['docData']['Tax'] = '';
                } else {
                    $returnData['docData']['TaxDescription'] = $TaxList[0]['Tax'];
                }
            }

            $returnData['reffData']['ReffID'] = $reffID;
            $returnData['reffData']['ReffDocNumber'] = $reffDocNumber;
            $returnData['reffData']['ReffDocType'] = $reffDocType;

            $query = "SELECT p.*, itm.code AS ItemCode, itm.description AS ItemDescription, unit.UnitName
                        FROM tPOPlan p
                        JOIN dbmItem itm ON p.ItemID = itm.ID AND itm.Status <> 0
                        JOIN dbmItemUnit unit ON p.ItemUnitID = unit.ID AND unit.Status <> 0
                        WHERE p.DocID = $poID";
            $shipmentplans = $this->db->query($query)->result_array();

            if (count($shipmentplans) > 0) {
                $returnData['planData'] = $shipmentplans;
            }
        }

        return $returnData;
    }

    public function getPoOtherData($poID)
    {
        $returnData = [
            'docData' => [],
            'itemData' => [],
            'reffData' => []
        ];

        $this->db->where('ID', $poID);
        $poResult = $this->db->get('tFundRequest')->result_array();

        if (count($poResult) > 0) {
            $poResult[0]['GrandTotal'] = $poResult[0]['Cost'];
            $poResult[0]['currDesc'] = '';
            $returnData['docData'] = $poResult[0];
            if ($poResult[0]['CreateUserID']) {
                $returnData['docData']['CreateUserName'] = $this->getRequestorName($poResult[0]['CreateUserID']);
            }
            if ($poResult[0]['ETA']) {
                [$year, $month, $day] = explode('-', explode(' ', $poResult[0]['ETA'])[0]);
                $returnData['docData']['ConfirmDate'] = "$day-$month-$year";
            }
            if ($poResult[0]['TermID']) {
                $returnData['docData']['termDesc'] = $this->getTermName($poResult[0]['TermID']);
            }

            $this->db->select('CONVERT(VARCHAR(MAX), fr.Activity) as Activity, fr.Qty, pr.Unit as PRUnit, fr.Price, vqd.DiscPrice, fr.Total, vqd.TaxRate', FALSE);
            $this->db->from('tFundRequestDtl fr');
            $this->db->join('tFundRequest f', 'f.id = fr.FundRequestID');
            $this->db->join('tVendorQuotationDtl vq', 'vq.VendorQuotationID = f.ReffDocID');
            $this->db->join('tPurchaseRequisitionDtl pr', 'fr.id = pr.ReffTransID', 'left');
            $this->db->join('tVendorQuotationDtlItem vqd', 'pr.id = vqd.PurchaseRequisitionDtlID AND vqd.VendorQuotationDtlID = vq.ID');
            $this->db->where('fr.FundRequestID', $poID);
            $this->db->where('fr.Void', 0);
            $this->db->where('vq.IsWinner', 1);
            $itemData = $this->db->get()->result_array();

            $discountResult = $this->data->detail('dbmcoaattr a JOIN dbmdisc b ON a.id = b.coaattrid', 'a.id, a.code, a.description, b.isbase, b.discpercentage, b.type', 'a.kind = 6 AND a.status = 1 AND b.applied = 0 AND b.Type = 0 ');
		    $Discount = '';
		
            if ($discountResult && count($discountResult) > 0) {
                // Ambil discount pertama (yang paling sesuai karena diurutkan by isbase DESC)
                $Discount = $discountResult[0]['description'];
            }

            foreach ($itemData as $index => $transData) {
                $itemData[$index]['ItemDesc'] = $transData['Activity'];
                $itemData[$index]['ItemQty'] = $transData['Qty'];
                $itemData[$index]['UnitDesc'] = $transData['PRUnit']; // Mengambil Unit dari tPurchaseRequisitionDtl
                $itemData[$index]['ItemPrice'] = $transData['Price'];
                $itemData[$index]['ItemSubTotal'] = ($transData['Qty']*$transData['Price'])-$transData['DiscPrice'];
                if ($transData['DiscPrice'] > 0) {
                    $itemData[$index]['DiscDesc'] = $Discount;
                    $itemData[$index]['ItemDiscPrice'] = $transData['DiscPrice']/$transData['Qty'];
                }
				// $itemData[$index]['ItemSubTotal'] = $transData['Total'];
            }
            $returnData['itemData'] = $itemData;

            $reffID = $poResult[0]['ReffDocID'] ? $returnData['docData']['ReffDocID'] : '';
            $reffDocNumber = $poResult[0]['ReffDocNumber'];
            $reffDocType = '';
            if ($reffDocNumber) {
                $reffDocType = substr(explode('-', $reffDocNumber)[0], 0, 5);
            }
            if ($reffDocType == 'SPQTN') {
                //get ProcurementTypeID & PaymentTypeID & EstBiaya
                $this->db->select('ProcurementTypeID, PaymentTypeID, EstBiaya');
                $this->db->where('ID', $reffID);
                $vqProcurementInfo = $this->db->get('tVendorQuotation')->result_array();

                if (count($vqProcurementInfo) == 1) {
                    $returnData['reffData']['ReffProcurementTypeID'] = $vqProcurementInfo[0]['ProcurementTypeID'];
                    $returnData['reffData']['ReffPaymentTypeID'] = $vqProcurementInfo[0]['PaymentTypeID'];
                    $returnData['reffData']['EstBiaya'] = $vqProcurementInfo[0]['EstBiaya'];
                }

                //Cek tvendorquotationdtl cek ppn, jika semua item taxrate 0 maka no ppn
                //get Curr Desc
                $this->db->select("DISTINCT d.CurrID,
                                    CASE 
                                        WHEN d.TaxType = 3 AND vqdi.TaxRate > 0 THEN 'Exclude PPN (' + CAST(vqdi.TaxRate AS VARCHAR) + '%)'
                                        WHEN d.TaxType = 2 AND vqdi.TaxRate > 0 THEN 'Include PPN (' + CAST(vqdi.TaxRate AS VARCHAR) + '%)'
                                        WHEN d.TaxType = 1 THEN 'Non PPN'
                                    END AS Tax,
                                    vqdi.TaxRate,
                                    d.Tax AS TaxValue, 
                                    0 AS Discount");
                                $this->db->from('tVendorQuotationDtl d');
                                $this->db->join('tVendorQuotationDtlItem vqdi', 'vqdi.vendorquotationdtlid = d.id', 'join');
                                $this->db->join('tPurchaseRequisitionDtl a', 'a.ID = vqdi.PurchaseRequisitionDtlID', 'join');
                                $this->db->join('tFundRequestDtl b', 'b.ID = a.ReffTransID', 'join');
                                $this->db->where('d.VendorQuotationID', $reffID);
                                $this->db->where('b.FundRequestID', $poID); // Sesuaikan dengan parameter jika perlu
                                $this->db->where('d.IsWinner', 1);
                                $currIDList = $this->db->get()->result_array();

                if (count($currIDList) > 0) {
                    $currID = $currIDList[0]['CurrID'];
                    $returnData['docData']['currDesc'] = $this->getCurrName($currID);
                }
            }

            // Cek apakah semua item memiliki TaxRate = 0
            $allTaxZero = true;
            foreach ($itemData as $item) {
                if (!empty($item['TaxRate']) && $item['TaxRate'] != 0) {
                    $allTaxZero = false;
                    break;
                }
            }

            $returnData['reffData']['ReffID'] = $reffID;
            $returnData['reffData']['ReffDocNumber'] = $reffDocNumber;
            $returnData['reffData']['ReffDocType'] = $reffDocType;
            // Set nilai TaxDescription dan Tax berdasarkan kondisi
            if ($allTaxZero && !empty($itemData)) { //Non PPN
                $returnData['docData']['TaxDescription'] = '';
                $returnData['docData']['Tax'] = '';
            } else if (stripos($currIDList[0]['Tax'], 'include') !== false) {
                $returnData['docData']['TaxDescription'] = $currIDList[0]['Tax'];
                $returnData['docData']['Tax'] = '';
            } else {
                $returnData['docData']['TaxDescription'] = $currIDList[0]['Tax'];
                $returnData['docData']['Tax'] = $currIDList[0]['TaxValue'] ?? 0;
            }

            if ($currIDList[0]['Discount']) {
                $returnData['docData']['DiscountDescription'] = 'Discount';
            }
            $returnData['docData']['Discount'] = $currIDList[0]['Discount'];
        }
        return $returnData;
    }

    public function getVendorAddressData($vendorID)
    {
        $this->db->select('id, address, city, province, postalcode, country, phone1, email1');
        $this->db->where('MasterID', $vendorID);
        $result = $this->db->get('dbmAddress')->result_array();

        if (count($result) == 0) {
            return [
                'id' => '',
                'address' => '',
                'phone1' => '',
            ];
        }

        return $result[0];
    }

    public function getDocumentApproverData($docID, $docType)
    {
        $attachmentData = [];
        if ($docID && $docType) {
            $attachmentQuery = "SELECT 
                                    u.DisplayName as displayNameApprover, 
                                    a.URL as Attachment,
                                    a.Description as Description 
                                FROM 
                                    tAttachment a 
                                LEFT JOIN 
                                    tAttachmentRelation ar ON ar.AttachmentID = a.ID 
                                LEFT JOIN 
                                    dbsGroupUser u ON u.id = a.CreateUserID 
                                WHERE 
                                    ar.DocType = '$docType' 
                                    AND ar.DocID = $docID";
            $attachmentData = $this->db->query($attachmentQuery)->result_array();
        }

        return $attachmentData;
    }

    public function updateReffTransIDPrDtl($transID, $vqdtlitemid)
    {
        $this->db->select('PurchaseRequisitionDtlID');
        $this->db->where('ID', $vqdtlitemid);
        $prdtlid = $this->db->get('tVendorQuotationDtlItem')->result_array()[0]['PurchaseRequisitionDtlID'];

        $this->db->where('ID', $prdtlid);
        $this->db->update('tPurchaseRequisitionDtl', ["ReffTransID" => $transID]);
    }

// Di dalam model (misalnya: pom.php)
public function updateReffTransIDPrDtlOther($fundIDs, $prdtlidlist) // fundIDs sekarang diharapkan berupa array
{
    // 1. Ambil semua ID tFundRequestDtl yang terkait dengan semua FundRequestID yang baru
    $this->db->select('ID');
    $this->db->where_in('FundRequestID', $fundIDs); // Menggunakan WHERE IN
    $itemIDList = $this->db->get('tFundRequestDtl')->result_array();

    // 2. Karena $itemIDList dan $prdtlidlist harus memiliki korelasi 1-to-1:
    // Pastikan $prdtlidlist adalah array.
    if (!is_array($prdtlidlist)) {
        // Asumsi jika bukan array, itu adalah string koma-separated (seperti di input post sebelumnya)
        $prdtlidlist = array_map('trim', explode(',', $prdtlidlist));
    }
    
    // 3. Lakukan update
    $success = true;
    foreach ($itemIDList as $index => $itemID) {
        if (isset($prdtlidlist[$index])) {
            $this->db->where('ID', $prdtlidlist[$index]);
            $this->db->update('tPurchaseRequisitionDtl', ['ReffTransID' => $itemID['ID']]);
            
            if ($this->db->affected_rows() <= 0) {
                $success = false;
            }
        } else {
            // Logika untuk menangani ketidaksesuaian jumlah item jika diperlukan
            $success = false;
        }
    }
    return $success; // Mengembalikan status sukses jika semua berhasil diupdate
}

    private function getAttributeValue($categoryName, $attrValueID)
    {
        $query = "SELECT mav.AttributeValue
                FROM mAttributeValue mav
                JOIN mAttribute ma ON mav.AttributeID = ma.ID
                WHERE ma.Name = '$categoryName' AND mav.ID = $attrValueID ";
        $result = $this->db->query($query)->result_array();
        return $result[0]["AttributeValue"];
    }

    private function formatDate($date)
    {
        if ($date) {
            $dateString = explode(" ", $date)[0];
            $dateArr = explode("-", $dateString);
            return $dateArr[2] . "-" . $dateArr[1] . "-" . $dateArr[0];
        } else {
            return "";
        }
    }

    private function calculateAgeInDays($date)
    {
        try {
            $dateOfDocument = new DateTime($date);
            $today = new DateTime();

            if ($dateOfDocument > $today) {
                return 0;
            }

            $interval = $today->diff($dateOfDocument);

            return $interval->days;
        } catch (Exception $e) {
            return 'Invalid date format';
        }
    }

    private function formatNumbersWithDot($number)
    {
        // Convert the number to a float to ensure it's in a numerical format
        $number = (float)$number;

        // Use number_format with a dot as the thousands separator
        return number_format($number, 2, '.', ',');
    }

    private function getAreaName($areaID)
    {
        $this->db->select('ID, Description');
        $this->db->where('ID', $areaID);
        $query_result = $this->db->get('dbmLocation')->result_array()[0];

        return $query_result['Description'];
    }

    private function getDeptName($deptID)
    {
        $this->db->select('ID,Description');
        $this->db->where('ID', $deptID);
        $query_result = $this->db->get('dbmJobDivision')->result_array()[0];

        return $query_result["Description"];
    }

    private function getRequestorName($userGroupID)
    {
        $this->db->select('ID, DisplayName');
        $this->db->where('kind', 1);
        $this->db->where('status <>', 0);
        $this->db->where('ID', $userGroupID);
        $query_result = $this->db->get('dbsGroupUser')->result_array();

        if (count($query_result) > 0) {
            return $query_result[0]["DisplayName"];
        } else {
            return "-";
        }
    }

    private function getDiscCode($discID)
    {
        $this->db->select('ca.ID, ca.Code, ca.Description, dc.IsBase, dc.DiscPercentage, dc.Type');
        $this->db->from('dbmDisc dc');
        $this->db->join('dbmCoaAttr ca', 'dc.CoaAttrID = ca.ID');
        $this->db->where('ca.Kind', 6);
        $this->db->where('ca.Status', 1);
        $this->db->where('dc.Applied', 0);
        $this->db->where('ca.ID', $discID);
        $result = $this->db->get()->result_array();

        if (count($result) == 0) {
            return "-";
        }

        return $result[0]["Code"];
    }

    private function getTaxCode($taxID)
    {
        $this->db->select('ca.ID, ca.Code, ca.Description, dt.IsBase, dt.rate, dt.Type');
        $this->db->from('dbmTax dt');
        $this->db->join('dbmCoaAttr ca', 'dt.CoaAttrID = ca.ID');
        $this->db->where('ca.Kind', 7);
        $this->db->where('ca.Status', 1);
        $this->db->where('dt.Applied', 0);
        $this->db->where('ca.ID', $taxID);
        $result = $this->db->get()->result_array();

        if (count($result) == 0) {
            return "-";
        }

        return $result[0]["Code"];
    }

    private function getTaxRate($taxID = null)
    {
        $query = "SELECT a.id, a.code, a.description, b.isbase, b.rate, b.type
                    FROM dbmCoaAttr a
                    JOIN dbmTax b ON a.id = b.CoaAttrID
                    WHERE a.kind = 7 AND a.Status = 1 AND b.Applied = 1";
        if ($taxID) {
            $query .= " AND a.id = $taxID";
        }
        $result = $this->db->query($query)->result_array();

        return $result;
    }

    private function getDiscDesc($discID)
    {
        $this->db->select('a.description');
        $this->db->from('dbmcoaattr a');
        $this->db->join('dbmdisc b', 'a.id = b.coaattrid');
        $this->db->where('a.id', $discID);
        return $this->db->get()->result_array()[0]['description'];
    }

    private function getTaxDesc($taxID)
    {
        $this->db->select('a.description');
        $this->db->from('dbmcoaattr a');
        $this->db->join('dbmtax b', 'a.id = b.coaattrid');
        $this->db->where('a.id', $taxID);
        return $this->db->get()->result_array()[0]['description'];
    }

    private function getFundSourceFullName($fundSourceName)
    {
        $this->db->select('Name, Description');
        $this->db->where('Name', $fundSourceName);
        $query_result = $this->db->get('mFund')->result_array();

        if (!empty($query_result)) {
            $query_result = $query_result[0]['Description'];
        } else {
            $query_result = "";
        }

        return $query_result;
    }

    private function getCurrencyName($currID)
    {
        $this->db->select('Code, Description');
        $this->db->where('ID', $currID);
        $currencyData = $this->db->get('dbmCurr')->result_array()[0];

        return $currencyData["Code"] . " - " . $currencyData["Description"];
    }

    private function getTermName($termID)
    {
        $this->db->select('Description');
        $this->db->where('ID', $termID);
        $termData = $this->db->get('dbmTerm')->result_array()[0];

        return $termData["Description"];
    }

    private function getCurrName($currID)
    {
        $this->db->select('Description');
        $this->db->where('ID', $currID);
        $currData = $this->db->get('dbmCurr')->result_array()[0];

        if (preg_match('/indonesia/', strtolower($currData['Description']))) {
            return 'Rupiah';
        } else {
            return $currData['Description'];
        }
    }

    private function getUnitDesc($unitID)
    {
        $this->db->where('ID', $unitID);
        $unitName = $this->db->get('dbmItemUnit')->result_array()[0]['UnitName'];
        return $unitName;
    }

    private function findItemDept($vqDtlID, $deptName)
    {
        $query = "SELECT djd.Description as 'FoundDept'
                    FROM tPurchaseRequisition tpr
                    JOIN tPurchaseRequisitionDtl tprd ON tpr.ID = tprd.PurchaseRequisitionID
                    JOIN dbmJobDivision djd ON tpr.DepartemenID = djd.ID
                    WHERE tprd.ID IN (
                        SELECT tvqdi.PurchaseRequisitionDtlID
                        FROM tVendorQuotationDtl tvqd
                        JOIN tVendorQuotationDtlItem tvqdi ON tvqd.ID = tvqdi.VendorQuotationDtlID
                        WHERE tvqd.ID = $vqDtlID
                    ) AND tprd.Status = 7 AND djd.Description = '$deptName'";
        $foundDept = $this->db->query($query)->result_array();
        return $foundDept;
    }

    public function getDataReport($startDate, $endDate, $void, $status, $startdocno, $enddocno) {
        $startdocno = ($startdocno == "" ? "" : " AND CAST(RIGHT(tpr.DocNumber, 8) AS INT) >= " . (int)$startdocno);
        $enddocno   = ($enddocno == ""   ? "" : " AND CAST(RIGHT(tpr.DocNumber, 8) AS INT) <= " . (int)$enddocno);
        
        // Filter status - tambahan kondisi WHERE untuk status
        $statusCondition = "";
        if ($status != "0") { // Jika bukan "All"
            $statusCondition = " AND tprd.Status = " . (int)$status;
        }

        $query = "SELECT DISTINCT
                    tpr.DocDate AS Date,
                    tpr.DueDate,
                    tpr.DocNumber AS PRNumber,
                    prtypeinfo.prTypeName AS PRType,
                    CAST(tprd.Name AS VARCHAR(MAX)) AS ItemPR,
                    tprd.Qty AS QtyPR,
                    dgu.DisplayName AS ReqBy,
                    djd.Description AS Dept,
                    tpr.Void AS PrVoid,
                    tvq.DocDate AS VQDate,
                    tvq.DocNumber AS VQNumber,
                    COALESCE(poth.DocDate, po.PODate) AS PODate,
                    COALESCE(poth.DocNumber, po.PONumber) AS PONumber,
                    po.ItemDescription AS ItemDescPO,
                    po.ItemCode AS ItemCodePO,
                    COALESCE(poth.QtyPO, po.QtyPO) AS QtyPO,
                    COALESCE(poth.Price, po.PricePO) AS PricePO,
                    COALESCE(poth.Total, po.PriceTotal) AS PriceTotal,
                    --COALESCE(poth.PPN, po.PPN) AS PPN,
                    CASE
                        WHEN vqd.TaxType = 3 AND vqdtl.TaxRate > 0 THEN 'Exclude PPN (' + CAST(vqdtl.TaxRate AS VARCHAR) + '%)'
                        WHEN vqd.TaxType = 2 AND vqdtl.TaxRate > 0 THEN 'Include PPN (' + CAST(vqdtl.TaxRate AS VARCHAR) + '%)'
                        ELSE 'Non PPN'
                    END AS PPN,
                    COALESCE(poth.Vendor, po.Vendor) AS Vendor,
                    vqd.NPWPNo,
                    vqd.Email,
                    po.Term,
                    po.ETA,
                    COALESCE(poth.CreateUser, po.CreateUser) AS PoCreatedBy,
                    rcv.DocDate AS ReceivedDate,
                    rcv.DocNumber AS ReceivedNumber,
                    rcv.QtyReceived AS ReceivedQty,
                    inv.DocDate AS InvoiceDate,
                    inv.DocNumber AS InvoiceNumber,
                    CASE
                        WHEN tprd.Status <> 9 THEN mprs.Name
                        WHEN tprd.Status = 9 THEN
                        CASE
                            WHEN inv.DocNumber IS NOT NULL THEN 'Invoice'
                            WHEN rcv.DocNumber IS NOT NULL THEN 'Received'
                            ELSE 'On PO'
                        END
                    END AS Status,
                    COALESCE(poth.DocID, po.DocID) AS POID,
                    tprd.ID AS PurchaseRequisitionDtlID,
                    CASE 
                        WHEN CONVERT(DATE, tpr.DocDate) = CONVERT(DATE, GETDATE()) THEN 0
                        ELSE DATEDIFF(DAY, tpr.DocDate, ISNULL(rcv.DocDate, GETDATE()))
                    END AS Age
                    FROM tPurchaseRequisition tpr
                    JOIN tPurchaseRequisitionDtl tprd ON tpr.ID = tprd.PurchaseRequisitionID AND (tprd.Void <> 1 OR tprd.Void IS NULL)
                    LEFT JOIN tVendorQuotation tvq ON tvq.ID = tprd.VendorQuotationID
                    LEFT JOIN tVendorQuotationDtl vqd ON vqd.VendorQuotationID = tprd.VendorQuotationID AND vqd.IsWinner = 1
                    LEFT JOIN (
                        SELECT 
                        dit.ID,
                        did.ID AS DocID,
                        dit.ItemPrice AS PricePO, 
                        dit.ItemSubTotal AS PriceTotal,
                        dit.ItemQty AS QtyPO,
                        did.DocDate AS PODate, 
                        did.DocNumber AS PONumber, 
                        did.BizCardName AS Vendor,
                        did.RequestDate AS ETD,
                        did.ConfirmDate AS ETA,
                        CASE
                            WHEN did.Term = 0 THEN 'Cash'
                            WHEN did.Term = 1 THEN CAST(did.Term AS varchar) + ' Day'
                            ELSE CAST(did.Term AS varchar) + ' Days'
                        END AS Term,
                        dgu.DisplayName AS CreateUser,
                        itemUnit.Code AS ItemCode,
                        itemUnit.Description AS ItemDescription
                        --vq.PPN
                        FROM dbtItemDoc did
                        JOIN dbtItemTrans dit ON did.ID = dit.DocID AND (dit.Void <> 1 OR dit.Void IS NULL)
                        JOIN (
                            SELECT tvq.ID, tvqd.TaxType,
                            CASE
                                WHEN tvqd.TaxType = 2 THEN 'Include Tax'
                                WHEN tvqd.TaxType = 3 THEN 'Exclude Tax'
                                ELSE 'Non PPN'
                            END AS PPN
                            FROM tVendorQuotation tvq
                            JOIN tVendorQuotationDtl tvqd ON tvq.ID = tvqd.VendorQuotationID
                            WHERE tvqd.IsWinner = 1
                        ) AS vq ON did.ReffDocID = vq.ID
                        JOIN dbsGroupUser dgu ON did.CreateUserID = dgu.ID
                        JOIN (
                            SELECT distinct a.id, a.code, a.description, c.id as itemunitid, c.unitname, a.Type, a.coaattrid itemdeptid
                            FROM dbmitem a
                            LEFT JOIN ods4..dbmitemmarketingname b ON a.id = b.itemid
                            JOIN dbmitemunit c ON a.id = c.itemid AND c.status <> 0
                            WHERE a.status <> 0
                        ) AS itemUnit ON dit.ItemID = itemUnit.ID
                        WHERE (did.Void <> 1 OR did.Void IS NULL) 
                    ) AS po ON po.ID = tprd.ReffTransID AND tpr.IsPoOther <> 1
                    LEFT JOIN (
                        SELECT did.*, dit.ReffTransID AS TransID, dit.ItemQtyApprove AS QtyReceived
                        FROM dbtItemDoc did
                        JOIN dbtItemTrans dit ON did.ID = dit.DocID AND (dit.Void <> 1 OR dit.Void IS NULL)
                        WHERE (did.Void <> 1 OR did.Void IS NULL)
                    ) AS rcv ON po.PONumber = rcv.ReffDocNumber AND rcv.TransID = tprd.ReffTransID AND (rcv.Void <> 1 OR rcv.Void IS NULL) AND tpr.IsPoOther <> 1
                    LEFT JOIN dbtItemDoc inv ON rcv.ID = inv.ReffDocID AND (inv.Void <> 1 OR inv.Void IS NULL) AND tpr.IsPoOther <> 1 AND inv.DocType = 'SPINV'
                    LEFT JOIN (
                        SELECT
                        tfrd.ID, 
                        tfr.ID AS DocID, 
                        tfrd.Price, 
                        tfrd.Total, 
                        tfrd.Qty AS QtyPO,
                        tfr.DocDate,
                        tfr.DocNumber, 
                        tfr.Vendor,
                        --vq.PPN,
                        dgu.DisplayName AS CreateUser
                        FROM tFundRequest tfr
                        JOIN tFundRequestDtl tfrd ON tfr.ID = tfrd.FundRequestID
                        JOIN (
                            SELECT tvq.ID, tvqd.TaxType,
                            CASE
                                WHEN tvqd.TaxType = 2 THEN 'Include Tax'
                                WHEN tvqd.TaxType = 3 THEN 'Exclude Tax'
                                ELSE 'Non PPN'
                            END AS PPN
                            FROM tVendorQuotation tvq
                            JOIN tVendorQuotationDtl tvqd ON tvq.ID = tvqd.VendorQuotationID
                            WHERE tvqd.IsWinner = 1
                        ) AS vq ON tfr.ReffDocID = vq.ID
                        JOIN dbsGroupUser dgu ON tfr.CreateUserID = dgu.ID
                        WHERE (tfr.Void <> 1 OR tfr.Void IS NULL) AND (tfrd.Void <> 1 OR tfrd.Void IS NULL)
                    ) AS poth ON tprd.ReffTransID = poth.ID AND tpr.IsPoOther = 1
                    JOIN dbsGroupUser dgu ON tpr.RequestUserID = dgu.ID
                    JOIN dbmJobDivision djd ON tpr.DepartemenID = djd.ID
                    JOIN mPurchaseReqStatus mprs ON tprd.Status = mprs.ID
                    JOIN (
                        SELECT mav.AttributeValue AS prTypeName, mav.ID AS prTypeID
                        FROM mAttributeValue mav
                        JOIN mAttribute ma ON mav.AttributeID = ma.ID
                        WHERE ma.Name = 'PurchaseRequisitionType'
                    ) AS prtypeinfo ON tpr.PRTypeID = prtypeinfo.prTypeID
                    LEFT JOIN tVendorQuotationDtlItem vqdtl ON tprd.ID = vqdtl.PurchaseRequisitionDtlID
                    WHERE tpr.IsPoOther = 0 AND " . ($void == 0 ? "(tpr.Void <> 1 OR tpr.Void IS NULL)" : ($void == 1 ? "tpr.Void = 1" : "(tpr.Void = 0 OR tpr.Void = 1 OR tpr.Void IS NULL)")) . 
                    " AND tpr.DocDate BETWEEN
                    CONVERT(DATE, '$startDate', 103) 
                    AND 
                    CONVERT(DATE, '$endDate', 103) 
                    {$startdocno} {$enddocno} {$statusCondition}
                    ";
        $result = $this->db->query($query)->result_array();
        foreach ($result as $index => $data) {
            if($data['ReceivedNumber']) {
                $supacData = $this->getSupacData($data['ReceivedNumber']);
                $result[$index]['SupacDate'] = $supacData['SupacDate'];
                $result[$index]['SupacNumber'] = $supacData['SupacNumber'];
            } else {
                $result[$index]['SupacDate'] = NULL;
                $result[$index]['SupacNumber'] = NULL;
            }
        }
        return $result;
    }
    
    public function getAllDocAttachments($prDtlID,$poNumber=false,$invNumber=false) {
        $returnData = [
            'pr' => null,
            'vq' => null,
            'po' => null,
            'inv' => null
        ];

        //get prID, vqID, poID, invNumber
        $query = "SELECT DISTINCT 
                    tpr.ID as PrID,
                    tvq.ID as VqID,
                    COALESCE(poth.ID, po.ID) as PoID,
                    inv.ID as InvID
                    FROM tPurchaseRequisition tpr
                    JOIN tPurchaseRequisitionDtl tprd ON tpr.ID = tprd.PurchaseRequisitionID
                    LEFT JOIN (
                        SELECT DISTINCT tvq.ID, tvqdi.PurchaseRequisitionDtlID
                        FROM tVendorQuotation tvq
                        JOIN tVendorQuotationDtl tvqd ON tvq.ID = tvqd.VendorQuotationID
                        JOIN tVendorQuotationDtlItem tvqdi ON tvqd.ID = tvqdi.VendorQuotationDtlID
                    ) AS tvq ON tprd.ID = tvq.PurchaseRequisitionDtlID
                    LEFT JOIN dbtItemDoc po ON tvq.ID = po.ReffDocID
                    LEFT JOIN tFundRequest poth ON tvq.ID = poth.ReffDocID
                    LEFT JOIN dbtItemDoc rcv ON po.ID = rcv.ReffDocID
                    LEFT JOIN dbtItemDoc inv ON rcv.ID = inv.ReffDocID AND inv.DocType = 'SPINV'
                    WHERE tprd.ID = $prDtlID";
        
        if($poNumber) {
            $query .= " AND po.DocNumber = '$poNumber'";

            if($invNumber) {
                $query .= " AND inv.DocNumber = '$invNumber'";
            }
        }

        $allDocID = $this->db->query($query)->result_array();

        if(count($allDocID) > 0) {
            $prID = $allDocID[0]["PrID"];
            $vqID = $allDocID[0]["VqID"];
            $poID = $allDocID[0]["PoID"];
            $invID = $allDocID[0]["InvID"];
            //get pr attachment
            $returnData["pr"] = $this->getTransformData('tPurchaseRequisition',$prID);
    
            //get vq attachment
            if($vqID) {
                $query = "SELECT tvq.DocNumber, tvqd.VendorName, tvqda.*, tvqd.IsWinner
                            FROM tVendorQuotation tvq
                            JOIN tVendorQuotationDtl tvqd ON tvq.ID = tvqd.VendorQuotationID
                            JOIN tVendorQuotationDtlAttach tvqda ON tvqd.ID = tvqda.VendorQuotationDtlID
                            WHERE tvq.ID = $vqID";
                $vqAttachmentList = $this->db->query($query)->result_array();
                if(count($vqAttachmentList) > 0) {
                    foreach ($vqAttachmentList as $index => $data) {
                        $file_info = pathinfo($data["Attachment"]);
                        $extension = strtolower($file_info['extension']);
                        $vqAttachmentList[$index]['Extension'] = $extension;
                    }
                    $returnData["vq"] = $vqAttachmentList;
                }
            }
    
            //get po attachment
            if($poID) {
                $returnData["po"] = $this->getTransformData('dbtItemDoc',$poID);
            }
    
            //get inv attachment
            if($invID) {
                $returnData["inv"] = $this->getTransformData('dbtItemDoc',$invID);
            }
        }

        return $returnData;
    }
    private function getSupacData($receivedNumber) {
        $query = "SELECT 
                    -- SupacNumber
                    STUFF((
                        SELECT ',' + DocNumber
                        FROM dbtItemDoc
                        WHERE ReffDocNumber = '$receivedNumber'
                        AND DocType = 'SUPAC' 
                        AND (Void <> 1 OR Void IS NULL)
                        FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 1, '') AS SupacNumber,

                    -- SupacDate
                    STUFF((
                        SELECT ',' + CONVERT(varchar, DocDate, 105)
                        FROM dbtItemDoc
                        WHERE ReffDocNumber = '$receivedNumber'
                        AND DocType = 'SUPAC' 
                        AND (Void <> 1 OR Void IS NULL)
                        FOR XML PATH(''), TYPE).value('.', 'NVARCHAR(MAX)'), 1, 1, '') AS SupacDate";
                        
        $query_result = $this->db->query($query)->result_array();

        if(count($query_result) > 0) {
            return $query_result[0];
        } else {
            return [
                "SupacNumber" => NULL,
                "SupacDate" => NULL
            ];
        }
    }
    private function getTransformData($tableName, $docID) {
        $query = "SELECT tbl.DocNumber, tt.*, mt.Name as FormName
                    FROM tTransForm tt
                    JOIN mTransform mt ON tt.FormID = mt.ID
                    JOIN $tableName tbl ON tt.DocID = tbl.ID
                    WHERE tt.DocID = $docID";
        $query_result = $this->db->query($query)->result_array();

        if(count($query_result) > 0) {
            foreach ($query_result as $index => $data) {
                if($data["Attachment"]) {
                    $file_info = pathinfo($data["Attachment"]);
                    $extension = strtolower($file_info['extension']);
                    $query_result[$index]['Extension'] = $extension;
                } else {
                    $query_result[$index]['Extension'] = 'none';
                }
            }
        }

        return count($query_result) > 0 ? $query_result : null;
    }

    public function getDataReportSppln($startDate, $endDate)
    {
        $query = "
        WITH sppln AS (
        SELECT
            pp.ID AS PlanID,
            pp.DocDate,
            pp.DocNumber,
            pp.ItemDesc,

            pps.ID AS PlanItemID,
            coa.Description AS Vendor, 
            pps.Color,
            pps.Qty,
            pps.Price,

            
            pps.POID,
            pps.BlanketID,

            mi.Code AS ItemCode_SPPLN
            

        FROM dbtPurchasePlan pp
        JOIN dbtPurchasePlanDtlShipment pps 
            ON pp.ID = pps.PurchasePlanID
        LEFT JOIN dbmItem mi             
            ON pps.ItemID = mi.ID

        LEFT JOIN dbmcoaattr coa 
            ON pps.Vendor = coa.ID
        ),

        doc AS (
            SELECT 
                did.ID,
                did.DocNumber,
                did.DocDate,
                did.DocType,
                did.ReffDocNumber,
                did.BizCardName,
                did.DocNo,          
                did.ShipmentDate,   
                did.WarehouseID     
            FROM dbtItemDoc did
            WHERE (did.Void <> 1 OR did.Void IS NULL)
        ),

        item AS (
            SELECT
                dit.DocID,
                dit.ItemQty,
                dit.ItemPrice,
                dit.ItemSubTotal,
                dit.ItemID,
                mi.Code,
                mi.Description
            FROM dbtItemTrans dit
            LEFT JOIN dbmItem mi ON dit.ItemID = mi.ID
            WHERE (dit.Void <> 1 OR dit.Void IS NULL)
        )

        SELECT
            -- === SPPLN ===
            sp.DocDate AS Date,
            NULL AS DueDate,
            sp.DocDate AS SPPLN_Date,
            sp.DocNumber AS SPPLN_Number,
            sp.Vendor,
            sp.ItemCode_SPPLN,
            sp.ItemDesc,
            sp.Color,
            sp.Qty,
            sp.Price,

            -- === SPBLK ===
            spblk.DocDate AS SPBLK_Date,
            spblk.DocNumber AS SPBLK_Number,
            pi_blk.Notes AS PI_BLK,
            spblk.BizCardName AS Vendor_BLK,
            iblk.Code AS ItemCode_BLK,
            iblk.Description AS ItemDesc_BLK,

            CASE 
                WHEN spblk.ID IS NOT NULL THEN sp.Color
                ELSE NULL
            END AS Color_BLK,

            iblk.ItemQty,
            iblk.ItemPrice,

            -- === SPORD ===
            spord.DocDate AS PO_Date,
            spord.DocNumber AS PO_Number,
            pi_po.Notes AS PI_PO,
            iord.Code AS ItemCode_PO,
            iord.Description AS ItemDesc_PO,

            CASE 
                WHEN spord.ID IS NOT NULL THEN sp.Color
                ELSE NULL
            END AS Color_PO,

            iord.ItemQty AS ItemQty_PO,
            iord.ItemPrice AS ItemPrice_PO,

            -- === SITIF ===
            sitif.DocDate AS SITIF_Date,
            pi_sitif.Notes AS AWB,
            sitif.ShipmentDate AS ETD,
            loc.code AS Forwarder,

            -- === RECEIVED ===
            strrv.DocDate AS Received_Date,
            strrv.DocNumber AS Received_Number,
            ircv.ItemQty AS Received_Qty,

            -- === SPINV ===
            spinv.DocDate AS SPINV_Date,
            spinv.DocNumber AS SPINV_Number,

            -- === STATUS ===
            CASE
                WHEN spinv.DocNumber IS NOT NULL THEN 'Invoice'
                WHEN strrv.DocNumber IS NOT NULL THEN 'Received'
                WHEN sitif.DocNumber IS NOT NULL THEN 'Shipping'
                WHEN spord.DocNumber IS NOT NULL THEN 'Ordered'
                WHEN spblk.DocNumber IS NOT NULL THEN 'Blanket'
                ELSE 'Planning'
            END AS Status,

            sp.PlanID,
            sp.PlanItemID

        FROM sppln sp

        -- SPBLK (pakai BlanketID)
        LEFT JOIN doc spblk 
            ON spblk.ID = sp.BlanketID
            AND spblk.DocType LIKE '%SPBLK%'

        -- SPORD (pakai POID)
        LEFT JOIN doc spord 
            ON spord.ID = sp.POID
            AND spord.DocType LIKE '%SPORD%'
            
        -- SITIF
        LEFT JOIN doc sitif 
            ON sitif.ReffDocNumber = spord.DocNumber 
            AND sitif.DocType LIKE '%SITIF%'

        -- STRDN (dari SITIF)
        LEFT JOIN doc strdn 
            ON strdn.ReffDocNumber = sitif.DocNumber
            AND strdn.DocType LIKE '%STRDN%'

        -- STRRV (dari STRDN)
        LEFT JOIN doc strrv 
            ON (strrv.ReffDocNumber = COALESCE(strdn.DocNumber, spord.DocNumber))
            AND strrv.DocType LIKE '%STRRV%'

        -- JOIN SECURITY
        LEFT JOIN dbssecurity sec 
            ON sec.secid = sitif.WarehouseID
            AND sec.tabletype = 7
            AND sec.groupuserid = 1

        -- JOIN LOCATION
        LEFT JOIN dbmlocation loc
            ON loc.ID = sec.secid
            AND loc.type = 1
            AND loc.status <> 0

        -- SPINV
        LEFT JOIN doc spinv 
            ON spinv.ReffDocNumber = sitif.DocNumber 
            AND spinv.DocType LIKE '%SPINV%'

        -- ITEM JOIN
        OUTER APPLY (
            SELECT TOP 1 *
            FROM item
            WHERE DocID = spblk.ID
        ) iblk

        OUTER APPLY (
            SELECT TOP 1 t.Notes, t.FormID, t.DocID
            FROM tTransform t
            WHERE t.DocID = spblk.ID
        ) pi_blk

        OUTER APPLY (
            SELECT TOP 1 t.Notes, t.FormID, t.DocID
            FROM tTransform t
            WHERE t.DocID = spord.ID
        ) pi_po

        OUTER APPLY (
            SELECT TOP 1 t.Notes, t.FormID, t.DocID
            FROM tTransform t
            WHERE t.DocID = sitif.ID
        ) pi_sitif

        OUTER APPLY (
            SELECT TOP 1 *
            FROM item
            WHERE DocID = spord.ID
        ) iord

        OUTER APPLY (
            SELECT 
                SUM(dit.ItemQty) AS ItemQty
            FROM dbtItemTrans dit
            WHERE dit.DocID = strrv.ID
        ) ircv
        ";
        

        $result = $this->db->query($query)->result_array();

        return $result;
    }
}
