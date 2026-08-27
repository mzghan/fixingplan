
<?php if (!defined('BASEPATH')) exit('No direct script access allowed');

require 'vendor/autoload.php';
use PhpOffice\PhpSpreadsheet\IOFactory;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\NumberFormat;
use PhpOffice\PhpSpreadsheet\Cell\DataType;
use PhpOffice\PhpSpreadsheet\Shared\Date;

class purchase_plan_report extends Base_Class
{
  public $dbtPurchasePlanDtl_ID = 0;

  function __construct()
  {
    parent::__construct();
    $this->load->model('purchasing/purchase_order/purchase_order_m', 'pom');
    $this->load->library("session");
    $this->load->database();
    $this->load->helper('url');
  }

  public function index()
  {
    // ob_start("ob_gzhandler");
    $this->load->helper("url");
    $this->load->view("base/base_header");
    $this->load->view("scm/purchasing/report/purchase_plan_report_v");
    $this->load->view("base/base_footer");
  }

  public function save() {}

public function get_dtl_id()
{
    $planId = $this->input->get('plan');
    $vendor = $this->input->get('vendor');
    $batch  = $this->input->get('batch');

    $data = $this->pom->getLatestDtlId($planId, $vendor, $batch);
    
    $response = [
        'ID' => ($data && isset($data->ID)) ? (int)$data->ID : null,
        'status' => ($data && isset($data->ID)) ? 'found' : 'not_found'
    ];
    
    echo json_encode($response);
}
public function getHolidayIndonesia()
{
    $year = $this->input->get('year');

    $this->db->where("YEAR(Date)", $year, FALSE);
    $query = $this->db->get("tLiburNasional");

    $data = $query->result();

    header('Content-Type: application/json');
    echo json_encode($data);
}
public function getHolidayYearRange()
{
    $query = $this->db->query("
        SELECT 
            MIN(YEAR(Date)) as minYear,
            MAX(YEAR(Date)) as maxYear
        FROM tLiburNasional
    ");

    echo json_encode($query->row());
}
// Controller yang sudah disederhanakan
public function get_purchase_plan_data()
{
    header('Content-Type: application/json');

    $item_description_filter = $this->input->get('itemDesc', TRUE);
    $quarter_filter          = $this->input->get('quarter', TRUE);
    $doc_date_start          = $this->input->get('docDateStart', TRUE);
    $doc_date_end            = $this->input->get('docDateEnd', TRUE);
    $doc_number              = $this->input->get('docNumber', TRUE);
    $vendor_id               = $this->input->get('vendorId', TRUE);
    $year_filter             = $this->input->get('year', TRUE);
    $plan_group_filter       = $this->input->get('planGroupId', TRUE);

    if (!empty($year_filter)) {
        //  Kalau user pilih tahun tertentu -> WW1-WW52 tahun itu
        $week_range = $this->generate_full_year_weeks((int)$year_filter);
        
        $latest_week_info = [
            'year' => (int)$year_filter,
            'week' => 52 // atau bisa ambil minggu sekarang kalau masih di tahun itu
        ];
        
    } else {
        //  Kalau tidak ada filter year -> 52 minggu mundur dari data terakhir
        $query = "
            SELECT TOP 1
                YEAR(ShipmentDate) as year,
                DATEPART(ISO_WEEK, ShipmentDate) as week
            FROM dbtPurchasePlanDtlShipmentHistory
            WHERE ShipmentDate IS NOT NULL
            ORDER BY ShipmentDate DESC
        ";
        
        $result = $this->db->query($query);
        $latest = $result->row();

        // Fallback jika belum ada data
        if (!$latest) {
            $latest = (object)[
                'year' => date('Y'),
                'week' => date('W')
            ];
        }

        $week_range = $this->generate_52_weeks_backward($latest->year, $latest->week);
        
        $latest_week_info = [
            'year' => (int)$latest->year,
            'week' => (int)$latest->week
        ];
    }

    $modelResult = $this->pom->getPurchasePlanData(
        $item_description_filter,
        $quarter_filter,
        $doc_date_start,
        $doc_date_end,
        $doc_number,
        $vendor_id,
        $year_filter,
        $plan_group_filter
    );

    $debug_from_model = $modelResult['_debug_from_model'] ?? null;

    // DATA ASLI YANG DIPAKAI CONTROLLER
    $data_from_model = $modelResult['_data'] ?? [];


    $formatDate = function($dateString) {
        if (empty($dateString)) return null;
        
        try {
            $date = new DateTime($dateString);
            return $date->format('d-m-Y');
        } catch (Exception $e) {
            return substr($dateString, 0, 10);
        }
    };

    $processed_data = [];
    foreach ($data_from_model as $row) {
        $vendorName = $row['Vendor'] ?? '';
        $vendorName = str_replace(["\r\n", "\n", "\r"], '', trim($vendorName));
        $payments = [];

        if (!empty($row['weekly_data'])) {
            foreach ($row['weekly_data'] as $week) {
                foreach ($week as $entry) {
                    if (!empty($entry['payments'])) {
                        $payments = $entry['payments'];
                        break 2;
                    }
                }
            }
        }
        
        $temp_row = [
            'ID'         => $row['ID'],
            'DocDate'    => $formatDate($row['DocDate']),
            'DocNumber'  => $row['DocNumber'],
            'Vendor'     => $vendorName,
            'VendorID'   => (int)$row['VendorID'],
            'ItemDesc'   => $row['ItemDesc'],
            'PlanGroupID'  => $row['PlanGroupID'],
            'PlanGroupName'  => $row['PlanGroupName'],
            'ItemCode'   => $row['ItemCode'],
            'ItemID'   => $row['ItemID'],
            'ItemUnitID'   => $row['ItemUnitID'],
            'Year'       => $row['Year'],
            'Batch'      => $row['Batch'],
            'Color'      => $row['Color'],
            'Closed'     => $row['Closed'],
            'ShipmentID'    => $row['ShipmentID'],
            'ShipmentDate'  => $row['ShipmentDate'],
            'PurchasePlanID'=> $row['PurchasePlanID'],
            'BlanketID'  => $row['BlanketID'],
            'POID'       => !empty($row['POIDs']) ? max(array_keys($row['POIDs'])) : null,  //  FIX: Extract max POID from array
            'Price'      => (float)$row['Price'],
            'Qty'        => (int)$row['TotalQtyBLG'],
            'Total'      => (float)$row['Total'],
            'CreateUser' => $row['CreateUser'],
            'CreateDate' => $formatDate($row['CreateDate']),
            'EditDate'   => $formatDate($row['EditDate']), // EditDate terbaru dari history
            'payments' => $payments,
            'weekly_data'=> []
        ];

        if (!empty($row['weekly_qtys'])) {
        $weekly_pairs = explode(',', $row['weekly_qtys']);
        foreach ($weekly_pairs as $pair) {
            // Format: qty@week#shipmentId#shipmentDate#batch#closed#poId#isSpord#docNumber#reffDocID#reffShipmentID
            $parts = explode('#', $pair);

            $left         = $parts[0] ?? null;
            $shipmentId   = $parts[1] ?? $row['ShipmentID'];
            $shipmentDate = $parts[2] ?? $row['ShipmentDate'];
            $batch        = $parts[3] ?? $row['Batch'];
            $closed       = $parts[4] ?? $row['Closed'];
            $poId         = $parts[5] ?? null;
            $isSpord      = $parts[6] ?? '0';
            $docNumber    = $parts[7] ?? $row['DocNumber'];
            $reffDocID    = $parts[8] ?? null;
            $reffShipmentID = $parts[9] ?? null;

            $qty  = 0;
            $week = null;
            if ($left && strpos($left, '@') !== false) {
                list($qty, $week) = explode('@', $left);
            }

            if ($week !== null) {
              $shipmentDate = $shipmentDate ?: $row['ShipmentDate'];
                if (empty($shipmentDate)) {
                    continue;
                }
                try {
                    $dt = new DateTime($shipmentDate);
                    $shipmentDate = $dt->format('Y-m-d');
                } catch (Exception $e) {
                    continue; // skip shipment invalid
                }

                $isoWeekInfo = $this->get_iso_week_from_date($shipmentDate);
                $isoWeek = $isoWeekInfo['week'];
                
                $weekKey = "ww" . (int)$isoWeek;
                if (!isset($temp_row['weekly_data'][$weekKey])) {
                    $temp_row['weekly_data'][$weekKey] = [];
                }

                $temp_row['weekly_data'][$weekKey][] = [
                    'qty'         => (int)$qty,
                    'shipmentId'  => (int)$shipmentId,
                    'shipmentDate'=> $shipmentDate,
                    'batch'       => (int)$batch,
                    'closed'      => (int)$closed,
                    'itemID'      => $row['ItemID'] ?? null,
                    'itemUnitID'  => $row['ItemUnitID'] ?? null,
                    'poId'        => !empty($poId) ? (int)$poId : null,
                    'isSpord'     => (int)$isSpord === 1,
                    'docNumber'   => $docNumber,
                    'reffDocID'   => $reffDocID,
                    'reffShipmentID' => $reffShipmentID,
                    'purchasePlanID' => $row['PurchasePlanID'],
                    'payments'    => $payments
                ];
            }
        }
      }
        $processed_data[] = $temp_row;
    }

    $last5Processed = array_slice($processed_data, -5);

    $response = [
        'success' => true,
        'data' => $processed_data,

        '_debug' => [
          'from_model' => $debug_from_model,
          'from_controller' => [
              'row_count'   => count($processed_data),
              'first_row'   => $processed_data[0] ?? null,
              'last_5_rows' => $last5Processed,
          ]
        ],

        'latest_week' => $latest_week_info,
        'week_range' => $week_range
    ];


    echo json_encode($response);
}


private function generate_full_year_weeks($year) {
    $weeks = [];
    
    for ($week = 1; $week <= 52; $week++) {
        $weeks[] = [
            'year' => $year,
            'week' => $week,
            'label' => 'WW' . substr($year, -2)  . '-' . str_pad($week, 2, '0', STR_PAD_LEFT) ,
            'date' => $this->get_wednesday_of_week($year, $week)
        ];
    }
    
    return $weeks;
}

private function get_iso_week_from_date($dateStr) {
    try {
        $date = new DateTime($dateStr);
    } catch (Exception $e) {
        // Fallback
        return ['year' => date('Y'), 'week' => date('W')];
    }
    
    // Gunakan ISO 8601 standard: week tahun+week number
    $isoYear = (int)$date->format('o'); // ISO-8601 year
    $isoWeek = (int)$date->format('W'); // ISO-8601 week number
    
    return [
        'year' => $isoYear,
        'week' => $isoWeek
    ];
}

// Function generate 52 minggu mundur (SAMA SEPERTI SEBELUMNYA)
private function generate_52_weeks_backward($from_year, $from_week) {
    $weeks = [];
    $current_year = $from_year;
    $current_week = $from_week;

    for ($i = 0; $i < 52; $i++) {
        $weeks[] = [
            'year' => $current_year,
            'week' => $current_week,
            'label' => 'WW' . substr($current_year, -2) . '-' . str_pad($current_week, 2, '0', STR_PAD_LEFT) ,
            'date' => $this->get_wednesday_of_week($current_year, $current_week)
        ];

        // Mundur 1 minggu
        $current_week--;
        if ($current_week < 1) {
            $current_year--;
            $current_week = 52;
        }
    }

    return array_reverse($weeks);
}

// Function get tanggal Rabu (SAMA SEPERTI SEBELUMNYA)
  private function get_wednesday_of_week($year, $week) {
      $date = new DateTime();
      $date->setISODate($year, $week, 1); // 1 = Monday
      return $date->format('Y-m-d');
  }
  public function get_color_list()
  {
    $items = $this->pom->getColorList();
    $this->output->set_content_type('application/json');
    echo json_encode($items);
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
  public function update_report()
  {
      $shipments = json_decode($this->input->post('shipments'), true);

      if (!$shipments || !is_array($shipments)) {
          echo json_encode(['status' => 'error', 'message' => 'Data shipments tidak valid']);
          return;
      }

      $successCount = 0;
      $errorCount = 0;
      $errors=[];

      foreach ($shipments as $s) {
          $id = $s['ShipmentID'] ?? null;
          $purchasePlanID = $s['PurchasePlanID'] ?? null;
          $batch = $s['batch'] ?? null;
          $qty_awal = (int) ($s['qty_awal'] ?? 0);
          $shipment_date_awal = $s['shipment_date_awal'] ?? '';
          $qty_edit = (int) ($s['qty_edit'] ?? 0);
          $shipment_date_edit = $s['shipment_date_edit'] ?? '';
          $mode = strtolower(trim($s['mode'] ?? ''));
          $is_new = (int) ($s['is_new'] ?? 0);
          $poID = $s['POID'] ?? null;
          $blanketID = $s['BlanketID'] ?? null;
          $closed = (int) ($s['closed'] ?? 0);
          $docNumber = $s['docNumber'] ?? null;
          $reffDocID = $s['reffDocID'] ?? null;
          $reffShipmentID = $s['reffShipmentID'] ?? null;
          $edit_user = $this->userid;
          $edit_date = date('Y-m-d H:i:s');

          $itemID = $s['itemID'] ?? null;
          $color = $s['color'] ?? null;
          
          if ((empty($itemID) || empty($color)) && !empty($id) && $id > 0) {
              // Ambil dari existing shipment
              $shipment_data = $this->db->select('ItemID, Color')
                                       ->where('ID', $id)
                                       ->get('dbtPurchasePlanDtlShipment')
                                       ->row();
              if ($shipment_data) {
                  if (empty($itemID)) {
                      $itemID = $shipment_data->ItemID;
                  }
                  if (empty($color)) {
                      $color = $shipment_data->Color;
                  }
              }
          }

          if ((int)$closed === 0) {
              $dateValidation = $this->pom->validate_batch_date_order(
                  $purchasePlanID,
                  $batch,
                  $shipment_date_edit
              );

              if (!$dateValidation['valid']) {
                  $errorCount++;
                  $errors[] = $dateValidation['message'];
                  continue;
              }
          }

          $updated = false;

        if ((int)$closed === 1 && !empty($blanketID) && intval($blanketID) > 0) {
            if ($is_new == 1) {
                $newID = $this->pom->insert_po_plan_from_blanket($blanketID, $qty_edit, $shipment_date_edit);
                if ($newID) {
                    $successCount++;
                    $this->pom->recalc_aging_by_docid($blanketID);
                    $newRow = $this->db->get_where('tPOPlan', ['ID' => $newID])->row_array();
                    if ($newRow) {
                        $this->pom->recalc_item_trans_by_docid_and_item($newRow['DocID'], $newRow['ItemID'], $newRow['ItemUnitID']);
                    }
                } else {
                    $errorCount++;
                    $errors[] = "Gagal insert row baru dari BLANKET";
                }
                continue;
            }

            $existingRow = $this->db->get_where('tPOPlan', ['ID' => $id])->row_array();
            $itemIDForSync = $existingRow ? $existingRow['ItemID'] : null;
            $itemUnitIDForSync = $existingRow ? $existingRow['ItemUnitID'] : null;

            switch ($mode) {
                case 'partial_split':
                    $ok1 = $this->pom->update_po_plan_row($id, $qty_awal - $qty_edit, $shipment_date_awal);
                    $ok2 = $this->pom->insert_po_plan_row($qty_edit, $shipment_date_edit, $id, true);
                    $updated = ($ok1 && $ok2);
                    break;
                case 'full_move':
                case 'override':
                    $updated = $this->pom->update_po_plan_row($id, $qty_edit, $shipment_date_edit);
                    break;
                case 'update_same':
                    $updated = $this->pom->update_po_plan_row($id, $qty_edit, $shipment_date_awal);
                    break;
            }

            if ($updated) {
                $successCount++;
                $this->pom->recalc_aging_by_docid($blanketID);
                if ($itemIDForSync && $itemUnitIDForSync) {
                    $this->pom->recalc_item_trans_by_docid_and_item($blanketID, $itemIDForSync, $itemUnitIDForSync);
                }
            } else {
                $errorCount++;
                $errors[] = "Gagal update tPOPlan dari BLANKET";
            }

            continue;

        } elseif ((int)$closed === 2 && !empty($poID) && intval($poID) > 0) {
            if ($is_new == 1) {
                $newID = $this->pom->insert_po_plan_from_poid($poID, $qty_edit, $shipment_date_edit);
                if ($newID) {
                    $successCount++;
                    $this->pom->recalc_aging_by_docid($poID);
                    $newRow = $this->db->get_where('tPOPlan', ['ID' => $newID])->row_array();
                    if ($newRow) {
                        $this->pom->recalc_item_trans_by_docid_and_item($newRow['DocID'], $newRow['ItemID'], $newRow['ItemUnitID']);
                    }
                } else {
                    $errorCount++;
                    $errors[] = "Gagal insert row baru dari POID";
                }
                continue;
            }

            $existingRow = $this->db->get_where('tPOPlan', ['ID' => $id])->row_array();
            $itemIDForSync = $existingRow ? $existingRow['ItemID'] : null;
            $itemUnitIDForSync = $existingRow ? $existingRow['ItemUnitID'] : null;

            switch ($mode) {
                case 'partial_split':
                    $ok1 = $this->pom->update_po_plan_row($id, $qty_awal - $qty_edit, $shipment_date_awal);
                    $ok2 = $this->pom->insert_po_plan_row_po($poID, $qty_edit, $shipment_date_edit);
                    $updated = ($ok1 && $ok2);
                    break;
                case 'full_move':
                case 'override':
                    $updated = $this->pom->update_po_plan_row($id, $qty_edit, $shipment_date_edit);
                    break;
                case 'update_same':
                    $updated = $this->pom->update_po_plan_row($id, $qty_edit, $shipment_date_awal);
                    break;
            }

            if ($updated) {
                $successCount++;
                $this->pom->recalc_aging_by_docid($poID);
                if ($itemIDForSync && $itemUnitIDForSync) {
                    $this->pom->recalc_item_trans_by_docid_and_item($poID, $itemIDForSync, $itemUnitIDForSync);
                }
            } else {
                $errorCount++;
                $errors[] = "Gagal update tPOPlan dari POID";
            }

            continue;
        }
        
          if ($is_new) {
              $updated = $this->pom->insert_new_shipment(
                  $purchasePlanID,
                  $batch,
                  $qty_edit,
                  $shipment_date_edit,
                  $edit_user,
                  $edit_date,
                  $itemID,
                  $color
              );
          } else {
              switch ($mode) {
                  case 'partial_split':
                      $ok1 = $this->pom->update_shipment_data(
                          $id,
                          $qty_awal - $qty_edit,
                          $shipment_date_awal,
                          $edit_user,
                          $edit_date,
                          $itemID,
                          $color
                      );
                      $ok2 = $this->pom->insert_new_shipment(
                          $purchasePlanID,
                          $batch,
                          $qty_edit,
                          $shipment_date_edit,
                          $edit_user,
                          $edit_date,
                          $itemID,
                          $color
                      );
                      $updated = ($ok1 && $ok2);
                      break;

                  case 'full_move':
                  case 'override':
                      $updated = $this->pom->update_shipment_direct(
                          $id,
                          $batch,
                          $qty_edit,
                          $shipment_date_edit
                      );
                      break;

                  case 'update_same':
                      $updated = $this->pom->update_shipment_data(
                          $id,
                          $qty_edit,
                          $shipment_date_awal,
                          $edit_user,
                          $edit_date,
                          $itemID,
                          $color
                      );
                      break;
              }
          }

          if ($updated && $purchasePlanID) {
              $this->pom->recalculate_payment_dates_by_plan_id(
                  $purchasePlanID,
                  $shipment_date_edit,
                  $edit_user,
                  $edit_date
              );
              $successCount++;
          } else {
              $errorCount++;
              $errors[] = "Gagal update shipment untuk batch $batch";
          } 
      }


      $recalcResults = [];
      $processedPlanIds = [];

      foreach ($shipments as $s) {
          $purchasePlanID = $s['PurchasePlanID'] ?? null;
          $vendorId = $s['Vendor'] ?? null;
          $batch = $s['batch'] ?? null;

          if (!$purchasePlanID || in_array($purchasePlanID, $processedPlanIds)) {
              continue;
          }

          $poID = $s['POID'] ?? null;
          $blanketID = $s['BlanketID'] ?? null;
          if ((!empty($poID) && intval($poID) > 0) || (!empty($blanketID) && intval($blanketID) > 0)) {
              continue;
          }

          log_message('debug', "Recalculating payment summary for PurchasePlanID: $purchasePlanID");
          
          $recalcSuccess = $this->pom->recalculate_payment_summary($purchasePlanID, null, null);
          
          $recalcResults[$purchasePlanID] = $recalcSuccess;
          $processedPlanIds[] = $purchasePlanID;
          
          if (!$recalcSuccess) {
              log_message('error', "Failed to recalculate payment summary for PurchasePlanID: $purchasePlanID");
          } else {
              log_message('debug', "Successfully recalculated payment summary for PurchasePlanID: $purchasePlanID");
          }
      }

      if ($errorCount === 0) {
          $message = 'Update completed successfully.';
          if (!empty($processedPlanIds)) {
              $message .= ' Payment calculation updated for ' . count($processedPlanIds) . ' plan(s).';
          }
      } else {
          $message = 'Some updates failed: ' . implode("; ", $errors);
      }

      echo json_encode([
          'status' => $errorCount === 0 ? 'success' : 'error',
          'message' => $message,
          'recalc_count' => count($processedPlanIds),
          'recalc_results' => $recalcResults
      ]);
  }

  public function recalculate_payment()
  {
      header('Content-Type: application/json');

      $purchasePlanID = $this->input->post('purchasePlanID');
      $vendorId = $this->input->post('vendorId');
      $batch = $this->input->post('batch');

      if (!$purchasePlanID) {
          echo json_encode([
              'status' => 'error',
              'message' => 'PurchasePlanID is required'
          ]);
          return;
      }

      log_message('debug', "Manual recalculate_payment called for PurchasePlanID: $purchasePlanID");

      $result = $this->pom->recalculate_payment_summary(
          $purchasePlanID,
          $vendorId ?: null,
          $batch !== '' ? $batch : null
      );

      if ($result) {
          echo json_encode([
              'status' => 'success',
              'message' => 'Payment calculation updated successfully'
          ]);
      } else {
          echo json_encode([
              'status' => 'error',
              'message' => 'Failed to recalculate payment'
          ]);
      }
  }


  public function get_header_modal()
  {
    header('Content-Type: application/json');
    $modal_data_from_model = $this->pom->getPurchasePlanModalData();

    $cleaned_data = [];
    if (!empty($modal_data_from_model)) {
      foreach ($modal_data_from_model as $row) {
        $cleaned_row = [];
        foreach ($row as $key => $value) {
          $cleaned_row[$key] = ($value === null) ? '' : (string)$value;
        }
        $cleaned_data[] = $cleaned_row;
      }
    }
    $response = array(
      'data' => $cleaned_data
    );
    echo json_encode($response);
  }
  // fungsi baru untuk filter
    public function get_purchase_plan_data_filter() {
        $itemDesc     = $this->input->get('itemDesc');
        $quarter      = $this->input->get('quarter');
        $docDateStart = $this->input->get('docDateStart');
        $docDateEnd   = $this->input->get('docDateEnd');
        $docNumber    = $this->input->get('docNumber');
        $vendorId     = $this->input->get('vendorId');
        $planGroup    = $this->input->get('planGroup');

        $data = $this->pom->getFilteredData(
            $itemDesc,
            $quarter,
            $docDateStart,
            $docDateEnd,
            $docNumber,
            $vendorId,
            $planGroup
        );

        echo json_encode([
            "status" => "success",
            "data"   => $data
        ]);
    }

    // tetap ada search_vendor untuk autocomplete
  public function search_vendor()
  {
      $term = $this->input->get('term', TRUE);
      $this->load->model('purchase_order_m', 'pom');

      $vendors = $this->pom->searchVendor($term);

      $result = [];
      foreach ($vendors as $v) {
          $result[] = [
              'ID'          => $v['ID'],
              'Description' => $v['Description']
          ];
      }

      header('Content-Type: application/json');
      echo json_encode($result);
}

public function get_period()
{
    $date = $this->input->post("date"); // format YYYY-MM-DD

    $this->db->select("WW, QQ, MM, FY, CY");
    $this->db->from("ODS4..dbmPeriod");
    $this->db->where("Tanggal", $date);
    $query = $this->db->get();
    $row = $query->row_array();

    if ($row) {
    // contoh: dari WW202501 jadi WW2501
    $row['WW_Short'] = preg_replace('/^WW20/', 'WW', $row['WW']);

    echo json_encode([
        "status" => "success",
        "data" => $row
    ]);
}
 else {
        echo json_encode([
            "status" => "error",
            "message" => "Data tidak ditemukan"
        ]);
    }
}

public function get_weeks_by_year()
{
    $year = $this->input->post("year"); // contoh: 2025

    $this->db->select("DISTINCT WW");
    $this->db->from("ODS4..dbmPeriod");
    $this->db->where("Tanggal >=", $year . "-01-01");
    $this->db->where("Tanggal <=", $year . "-12-31");
    $this->db->order_by("WW", "ASC");

    $query = $this->db->get();
    $weeks = array_column($query->result_array(), "WW");

    echo json_encode([
        "status" => "success",
        "weeks" => $weeks
    ]);
}


public function get_item_list()
{
    $search = $this->input->get('search') ?? $this->input->get('term');
    $limit  = 8;

    $this->db->distinct();
    $this->db->select('a.id, a.code, a.description, c.id as itemunitid, c.unitname');
    $this->db->from('dbmitem a');
    $this->db->join('dbmitemunit c', 'a.id = c.itemid AND c.status <> 0');
    $this->db->where('a.status <>', 0);

    if (!empty($search)) {
        $this->db->group_start();
        $this->db->like('a.code', $search, 'both');        // '%search%'
        $this->db->or_like('a.description', $search, 'both');
        $this->db->group_end();
    }

    $this->db->limit($limit);

    $data = $this->db->get()->result_array();

    $result = [];
    foreach ($data as $row) {
        $result[] = [
            'id'         => $row['id'],
            'text'       => $row['code'] . ' - ' . $row['description'],
            'code'        => $row['code'],         // tambah ini
            'description' => $row['description'],  // tambah ini
            'itemunitid' => $row['itemunitid'],
            'unitname'   => $row['unitname']
        ];
    }

    echo json_encode($result);
}

  public function edit()
  {
    $purchasePlanID = $this->input->get('id', TRUE);
    $docDate = $this->input->get('docDate', TRUE);
    $itemDesc = $this->input->get('itemDesc', TRUE);

    $data_to_view = [
      'purchase_plan_id' => $purchasePlanID,
    ];

    $this->load->view("base/base_header");
    $this->load->view("scm/purchasing/purchase_plan_edit_v", $data_to_view);
    $this->load->view("base/base_footer");
  }

  public function getDataUrl()
  {
    header('Content-Type: application/json');

    $purchasePlanID = $this->input->get('id', TRUE);
    if (!$purchasePlanID) {
      echo json_encode(['status' => 'error', 'message' => 'Purchase Plan ID is required.']);
      return;
    }
    $main_data = $this->pom->get_purchase_plan_by_id($purchasePlanID);
    $detail_data = $this->pom->get_purchase_plan_dtl_by_plan_id($purchasePlanID);
    $shipment_data = $this->pom->get_purchase_plan_dtl_shipment_by_plan_id($purchasePlanID);

    $payment_data = [];
    if (!empty($detail_data)) {
        foreach ($detail_data as $detail) {
            $payment_data[$detail['ID']] = $this->pom->get_purchase_plan_dtl_payment_by_dtl_id($detail['ID']);
        }
    }
    $response_data = [
      'status' => 'success',
      'main_plan' => $main_data,
      'details' => $detail_data,
      'shipments' => $shipment_data,
      'payments' => $payment_data // table kanan
    ];

    echo json_encode($response_data);
    return;
  }
public function get_shipment_modal()
{
    // Validasi method request
    if ($this->input->method() !== 'post') {
        return $this->output
            ->set_content_type('application/json')
            ->set_status_header(405) // Method Not Allowed
            ->set_output(json_encode([
                'status'  => 'error',
                'message' => 'Metode request tidak diizinkan. Gunakan POST.'
            ]));
    }

    $purchasePlanID = $this->input->post('PurchasePlanID');

    // Validasi input
    if (empty($purchasePlanID) || !is_numeric($purchasePlanID)) {
        return $this->output
            ->set_content_type('application/json')
            ->set_status_header(400) // Bad Request
            ->set_output(json_encode([
                'status'  => 'error',
                'message' => 'PurchasePlanID tidak valid.'
            ]));
    }

    // Ambil data modal
    $data = $this->pom->get_purchase_plan_dtl_shipment_modal($purchasePlanID);

    return $this->output
        ->set_content_type('application/json')
        ->set_status_header(200)
        ->set_output(json_encode([
            'status'  => 'success',
            'message' => 'Data shipment modal berhasil diambil.',
            'data'    => $data
        ]));
}

public function get_shipment_detail()
{
    $shipmentHistoryID = $this->input->post('ShipmentHistoryID');

    if (!$shipmentHistoryID) {
        echo json_encode([
            'status'  => 'error',
            'message' => 'ShipmentHistoryID tidak ditemukan'
        ]);
        return;
    }

    try {
        // panggil model untuk ambil shipment detail
        $detail = $this->pom->get_purchase_plan_dtl_shipment_detail($shipmentHistoryID);

        echo json_encode([
            'status' => 'success',
            'data'   => $detail
        ]);
    } catch (Exception $e) {
        echo json_encode([
            'status'  => 'error',
            'message' => $e->getMessage()
        ]);
    }
}

public function get_payment_calc_data()
{
    header('Content-Type: application/json');

    $purchasePlanID = $this->input->get('purchasePlanID');
    $groupKey = $this->input->get('groupKey');

    if (!$purchasePlanID) {
        echo json_encode([
            'status' => 'error',
            'message' => 'PurchasePlanID is required'
        ]);
        return;
    }

    try {
        // Parse groupKey untuk mendapatkan vendor dan batch/date
        $vendorId = null;
        $batch = null;
        $shipmentDate = null;

        if ($groupKey) {
            // Format: "vendorId-batch-X" atau "vendorId-date-YYYY-MM-DD"
            if (strpos($groupKey, '-batch-') !== false) {
                $parts = explode('-batch-', $groupKey);
                $vendorId = $parts[0];
                $batch = isset($parts[1]) ? $parts[1] : null;
            } elseif (strpos($groupKey, '-date-') !== false) {
                $parts = explode('-date-', $groupKey);
                $vendorId = $parts[0];
                $shipmentDate = isset($parts[1]) ? $parts[1] : null;
            }
        }

        // Query ke database
        // Join dengan dbtPurchasePlanDtl untuk filter berdasarkan PurchasePlanID, Vendor, Batch
        $this->db->select('
            pps.ID,
            pps.PaymentPlanID,
            pps.PaymentDate,
            pps.Notes,
            pps.FromValue,
            pps.[Alert] as [Alert],
            pps.[Percent] as [Percent],
            pps.Total,
            ppd.Vendor as VendorID,
            ppd.Batch,
            ppd.ID as PurchasePlanDtlID
        ', FALSE);
        $this->db->from('dbtPaymentPlanSummary pps');
        $this->db->join('dbtPurchasePlanDtl ppd', 'ppd.ID = pps.PaymentPlanID', 'inner');
        $this->db->where('ppd.PurchasePlanID', $purchasePlanID);
        $this->db->where('ppd.Void', 0); // Hanya dtl yang tidak void

        if ($vendorId) {
            $this->db->where('ppd.Vendor', $vendorId);
        }
        if ($batch !== null && $batch !== '' && $batch !== '0') {
            $this->db->where('ppd.Batch', $batch);
        }
        if ($shipmentDate) {
            // Join dengan shipment table jika perlu filter by date
            // Tambahkan filter Batch juga untuk menghindari duplikasi
            $this->db->join('dbtPurchasePlanDtlShipment ship', 
                'ship.PurchasePlanID = ppd.PurchasePlanID AND ship.Vendor = ppd.Vendor AND (ship.Batch = ppd.Batch OR (ship.Batch IS NULL AND ppd.Batch IS NULL))', 
                'left');
            $this->db->where('CONVERT(DATE, ship.ShipmentDate)', $shipmentDate);
            $this->db->group_by('pps.ID, pps.PaymentPlanID, pps.PaymentDate, pps.Notes, pps.FromValue, pps.[Alert], pps.[Percent], pps.Total, ppd.Vendor, ppd.Batch, ppd.ID');
        }

        $this->db->order_by('pps.ID', 'ASC');
        $result = $this->db->get()->result_array();

        // Map field names untuk konsistensi dengan frontend
        $mappedResult = [];
        foreach ($result as $row) {
            $mappedResult[] = [
                'ID' => $row['ID'],
                'PaymentPlanID' => $row['PaymentPlanID'],
                'PurchasePlanDtlID' => $row['PurchasePlanDtlID'],
                'PaymentDate' => $row['PaymentDate'],
                'Notes' => $row['Notes'],
                'FromValue' => (int)$row['FromValue'],
                'FromValueName' => ((int)$row['FromValue'] === 1) ? 'Per Batch' : 'Partial',
                'Alert' => (int)$row['Alert'],
                'AlertName' => $this->_getAlertName((int)$row['Alert']),
                'Percent' => (float)$row['Percent'],
                'Total' => (float)$row['Total'],
                'Payment' => (float)$row['Total'], // Alias untuk konsistensi
                'VendorID' => $row['VendorID'],
                'Batch' => $row['Batch']
            ];
        }

        echo json_encode([
            'status' => 'success',
            'data' => $mappedResult,
            'count' => count($mappedResult),
            'groupKey' => $groupKey
        ]);

    } catch (Exception $e) {
        log_message('error', 'Error in get_payment_calc_data: ' . $e->getMessage());
        echo json_encode([
            'status' => 'error',
            'message' => $e->getMessage()
        ]);
    }
}

public function get_all_payment_calc()
{
    header('Content-Type: application/json');

    $purchasePlanID = $this->input->get('purchasePlanID');

    if (!$purchasePlanID) {
        echo json_encode([
            'status' => 'error',
            'message' => 'PurchasePlanID is required'
        ]);
        return;
    }

    try {
        $this->db->select("
            pps.ID,
            pps.PaymentPlanID,
            pps.PaymentDate,
            pps.Notes,
            pps.FromValue,
            pps.[Alert],
            pps.[Percent],
            pps.Total,
            ppd.Vendor as VendorID,
            ppd.Batch,
            ppd.ID as PurchasePlanDtlID,
            ship.ShipmentDate
        ", FALSE);

        $this->db->from('dbtPaymentPlanSummary pps');

        $this->db->join('dbtPurchasePlanDtl ppd', 'ppd.ID = pps.PaymentPlanID', 'inner');

        $this->db->join("
            (
                SELECT 
                    PurchasePlanID,
                    Vendor,
                    Batch,
                    MIN(ShipmentDate) as ShipmentDate
                FROM dbtPurchasePlanDtlShipment
                GROUP BY PurchasePlanID, Vendor, Batch
            ) ship
        ", "
            ship.PurchasePlanID = ppd.PurchasePlanID
            AND ship.Vendor = ppd.Vendor
            AND (
                ship.Batch = ppd.Batch 
                OR (ship.Batch IS NULL AND ppd.Batch IS NULL)
            )
        ", "left");

        $this->db->where('ppd.PurchasePlanID', $purchasePlanID);
        $this->db->where('ppd.Void', 0);

        $this->db->order_by('ppd.Vendor', 'ASC');
        $this->db->order_by('ppd.Batch', 'ASC');
        $this->db->order_by('pps.ID', 'ASC');

        $result = $this->db->get()->result_array();

        // Group by groupKey (dibentuk manual, kolom ini tidak ada di hasil SELECT)
        $grouped = [];
        foreach ($result as $row) {
            $key = !empty($row['PurchasePlanDtlID'])
                ? 'dtl-' . $row['PurchasePlanDtlID']
                : $row['VendorID'] . '-batch-' . $row['Batch'];

            if (!isset($grouped[$key])) {
                $grouped[$key] = [];
            }

            $grouped[$key][] = [
                'ID' => $row['ID'],
                'PaymentPlanID' => $row['PaymentPlanID'],
                'PurchasePlanDtlID' => $row['PurchasePlanDtlID'],
                'PaymentDate' => $row['PaymentDate'],
                'Notes' => $row['Notes'],
                'FromValue' => (int)$row['FromValue'],
                'FromValueName' => ((int)$row['FromValue'] === 1) ? 'Per Batch' : 'Partial',
                'Alert' => (int)$row['Alert'],
                'AlertName' => $this->_getAlertName((int)$row['Alert']),
                'Percent' => (float)$row['Percent'],
                'Total' => (float)$row['Total'],
                'Payment' => (float)$row['Total'],
                'VendorID' => $row['VendorID'],
                'Batch' => $row['Batch'],
                'ShipmentDate' => $row['ShipmentDate'],
                'groupKey' => $key
            ];
        }

        echo json_encode([
            'status' => 'success',
            'data' => $grouped,
            'total_records' => count($result),
            'total_groups' => count($grouped)
        ]);

    } catch (Exception $e) {
        log_message('error', 'Error in get_all_payment_calc: ' . $e->getMessage());
        echo json_encode([
            'status' => 'error',
            'message' => $e->getMessage()
        ]);
    }
}
public function get_payment_calc_by_dtl_id()
{
    header('Content-Type: application/json');

    $purchasePlanDtlID = $this->input->get('purchasePlanDtlID');

    if (!$purchasePlanDtlID) {
        echo json_encode([
            'status' => 'error',
            'message' => 'PurchasePlanDtlID is required'
        ]);
        return;
    }

    try {
        $this->db->select('
            ID,
            PaymentPlanID,
            PaymentDate,
            Notes,
            FromValue,
            [Alert] as [Alert],
            [Percent] as [Percent],
            Total
        ', FALSE);
        $this->db->from('dbtPaymentPlanSummary');
        $this->db->where('PaymentPlanID', $purchasePlanDtlID);
        $this->db->order_by('ID', 'ASC');

        $result = $this->db->get()->result_array();

        // Map untuk konsistensi
        $mappedResult = [];
        foreach ($result as $row) {
            $mappedResult[] = [
                'ID' => $row['ID'],
                'PaymentPlanID' => $row['PaymentPlanID'],
                'PurchasePlanDtlID' => $row['PaymentPlanID'], // Alias
                'PaymentDate' => $row['PaymentDate'],
                'Notes' => $row['Notes'],
                'FromValue' => (int)$row['FromValue'],
                'FromValueName' => ((int)$row['FromValue'] === 1) ? 'Per Batch' : 'Partial',
                'Alert' => (int)$row['Alert'],
                'AlertName' => $this->_getAlertName((int)$row['Alert']),
                'Percent' => (float)$row['Percent'],
                'Total' => (float)$row['Total'],
                'Payment' => (float)$row['Total']
            ];
        }

        echo json_encode([
            'status' => 'success',
            'data' => $mappedResult,
            'count' => count($mappedResult)
        ]);

    } catch (Exception $e) {
        log_message('error', 'Error in get_payment_calc_by_dtl_id: ' . $e->getMessage());
        echo json_encode([
            'status' => 'error',
            'message' => $e->getMessage()
        ]);
    }
}
private function _getAlertName($alertValue)
{
    $alertMap = [
        1 => 'Blanket PO',
        2 => 'PO Release',
        3 => 'Shipment',
        4 => 'Arrival',
        5 => 'Custom'
    ];

    return isset($alertMap[$alertValue]) ? $alertMap[$alertValue] : 'Unknown';
}



  public function get_purchase_plan_data_edit() 
{
    header('Content-Type: application/json');
    
    $purchasePlanID = $this->input->get('purchasePlanID', TRUE);
    
    $data_from_model = $this->pom->getPurchasePlanDataEdit($purchasePlanID);
    
    $processed_data = [];
    
    if (!empty($data_from_model)) {
        foreach ($data_from_model as $row) {
            $week_number = 0;
             // Filter: Hanya tampilkan data dengan EndDate IS NULL
            if (isset($row['EndDate']) && $row['EndDate'] !== null && $row['EndDate'] !== '') {
                continue; // Skip data yang EndDate nya tidak NULL
            }
            if (!empty($row['ShipmentDate'])) {
                $timestamp = strtotime($row['ShipmentDate']);
                if ($timestamp !== false) {
                    $week_number = (int)date('W', $timestamp);
                }
            }
            
            $temp_row = [
                'ID' => $row['ID'],
                'DocNumber' => $row['DocNumber'],
                'Vendor' => $row['Vendor'],
                'ItemDesc' => $row['ItemDesc'],
                'Color' => $row['Color'],
                'Price' => (float)$row['Price'],
                'TotalQtyBLG' => (int)$row['TotalQtyBLG'],
                'weekly_data' => []
            ];
            
            if (!empty($row['weekly_qtys'])) {
                $weekly_pairs = explode(',', $row['weekly_qtys']);
                foreach ($weekly_pairs as $pair) {
                    if (strpos($pair, '@') !== false) {
                        list($qty, $week) = explode('@', $pair);
                        $temp_row['weekly_data']["ww" . (int)$week] = (int)$qty;
                    }
                }
            }
            
            $processed_data[] = $temp_row;
        }
    }
    
    $response = array(
        'data' => $processed_data
    );
    
    echo json_encode($response);
}

  public function getAllDataTableTengah()
  {
    $this->output->set_content_type('application/json');
    $purchasePlanID = $this->input->get('purchasePlanID', TRUE);
    $data = $this->pom->getAllDataTableTengah_m($purchasePlanID);
    if ($data) {
      $response = [
        'status' => 'success',
        'data' => $data
      ];
      $this->output->set_status_header(200)->set_output(json_encode($response));
    } else {
      $response = [
        'status' => 'error',
        'message' => 'No Data Found'
      ];
      $this->output->set_status_header(404)->set_output(json_encode($response));
    }
  }

  public function getDocNumber() 
{
    if ($this->input->method() !== 'post') {
        $this->output
            ->set_content_type('application/json')
            ->set_output(json_encode(['status' => 'error', 'message' => 'Metode request tidak diizinkan.']));
        return;
    }

    $id = $this->input->post('id');
    
    if (empty($id)) {
        $this->output
            ->set_content_type('application/json')
            ->set_output(json_encode(['status' => 'error', 'message' => 'ID tidak boleh kosong.']));
        return;
    }

    // Gunakan method yang sudah ada di model Anda
    $purchasePlan = $this->pom->get_purchase_plan_by_id($id);
    
    if ($purchasePlan && isset($purchasePlan['DocNumber'])) {
        $this->output
            ->set_content_type('application/json')
            ->set_output(json_encode([
                'status' => 'success', 
                'docNumber' => $purchasePlan['DocNumber'],
                'data' => $purchasePlan // optional: kirim semua data jika diperlukan
            ]));
    } else {
        $this->output
            ->set_content_type('application/json')
            ->set_output(json_encode(['status' => 'error', 'message' => 'Data Purchase Plan tidak ditemukan.']));
    }
}


public function void_purchase_plan()
{
    if ($this->input->method() !== 'post') {
        return $this->output
            ->set_content_type('application/json')
            ->set_status_header(405)
            ->set_output(json_encode([
                'status' => 'error',
                'message' => 'Method not allowed'
            ]));
    }

    $input = json_decode($this->input->raw_input_stream, true);
    $purchasePlanIDs = isset($input['purchasePlanIDs']) ? $input['purchasePlanIDs'] : [];

    //  Support single ID atau array of IDs
    if (!is_array($purchasePlanIDs)) {
        $purchasePlanIDs = [$purchasePlanIDs];
    }

    // Validasi setiap ID
    $purchasePlanIDs = array_filter($purchasePlanIDs, function($id) {
        return is_numeric($id) && (int)$id > 0;
    });

    if (empty($purchasePlanIDs)) {
        return $this->output
            ->set_content_type('application/json')
            ->set_status_header(400)
            ->set_output(json_encode([
                'status' => 'error',
                'message' => 'No valid Plan IDs provided'
            ]));
    }

    try {
        $voidedCount = 0;
        $alreadyVoidCount = 0;

        foreach ($purchasePlanIDs as $planID) {
            $planID = (int)$planID;
            if ($planID <= 0) continue;

            log_message('info', "=== Processing VOID Purchase Plan {$planID} ===");

            // Check if plan exists
            $plan = $this->db->select('ID, ItemDesc, Void')
                ->from('dbtPurchasePlan')
                ->where('ID', $planID)
                ->get()
                ->row_array();

            if (!$plan) {
                log_message('warn', "Plan ID {$planID} not found");
                continue;
            }

            // Skip jika sudah voided
            if ($plan['Void'] == 1) {
                $alreadyVoidCount++;
                log_message('info', "Plan ID {$planID} already voided, skip");
                continue;
            }

            $closedShipment = $this->db
                ->where('PurchasePlanID', $planID)
                ->where('Closed !=', 0)
                ->count_all_results('dbtPurchasePlanDtlShipment');

            $closedShipmentHistory = $this->db
                ->where('PurchasePlanID', $planID)
                ->where('Closed !=', 0)
                ->count_all_results('dbtPurchasePlanDtlShipmentHistory');

            if ($closedShipment > 0 || $closedShipmentHistory > 0) {
                log_message('info', "Plan ID {$planID} has closed shipment. Skip void.");
                continue;
            }

            // Update Void status to 1
            $updateData = [
                'Void' => 1,
            ];

            $this->db->where('ID', $planID);
            $updated = $this->db->update('dbtPurchasePlan', $updateData);

            if ($updated) {
                $voidedCount++;
                log_message('info', "Plan ID {$planID} marked as VOID - Item: {$plan['ItemDesc']}");
            } else {
                log_message('error', "Failed to void Plan ID {$planID}");
            }
        }

        log_message('info', "=== VOID Multiple Plans COMPLETED: {$voidedCount} voided, {$alreadyVoidCount} already voided ===");

        return $this->output
            ->set_content_type('application/json')
            ->set_output(json_encode([
                'status' => 'success',
                'message' => "{$voidedCount} plan(s) successfully marked as VOID" . 
                           ($alreadyVoidCount > 0 ? ", {$alreadyVoidCount} already voided" : ""),
                'voided_count' => $voidedCount,
                'already_void_count' => $alreadyVoidCount,
                'total_requested' => count($purchasePlanIDs)
            ]));

    } catch (Exception $e) {
        log_message('error', "VOID FAILED: " . $e->getMessage());

        return $this->output
            ->set_content_type('application/json')
            ->set_status_header(500)
            ->set_output(json_encode([
                'status' => 'error',
                'message' => 'Error voiding plans: ' . $e->getMessage()
            ]));
    }
}


  public function updateHeader()
  {
    if ($this->input->method() !== 'post') {
      $this->output
        ->set_content_type('application/json')
        ->set_output(json_encode(['status' => 'error', 'message' => 'Metode request tidak diizinkan.']));
      return;
    }
    $id = $this->input->post('id');
    $docDate = $this->input->post('DocDate');
    $itemDesc = $this->input->post('ItemDesc');
    $currID = $this->input->post('CurrID');
    $currRate = $this->input->post('CurrRate');
    if (empty($id)) {
      $this->output
        ->set_content_type('application/json')
        ->set_output(json_encode(['status' => 'error', 'message' => 'ID tidak boleh kosong.']));
      return;
    }
    if (empty($docDate)) {
      $this->output
        ->set_content_type('application/json')
        ->set_output(json_encode(['status' => 'error', 'message' => 'DocDate tidak boleh kosong.']));
      return;
    }
    if (!preg_match("/^\d{4}-\d{2}-\d{2}$/", $docDate)) {
      $this->output
        ->set_content_type('application/json')
        ->set_output(json_encode(['status' => 'error', 'message' => 'Format DocDate tidak valid (YYYY-MM-DD).']));
      return;
    }
    $currRate = str_replace(',', '', $currRate);
    if (!is_numeric($currRate)) {
      $currRate = 1;
    }
    $dataToUpdate = [
      'DocDate' => $docDate,
      'ItemDesc' => $itemDesc,
      'CurrID'      => $currID,
      'CurrRate'    => $currRate,
      'EditDate'     => date('Y-m-d H:i:s'),
      'EditUserID'   => $this->userid,
    ];

    $updated = $this->pom->updatePurchasePlanHeader($id, $dataToUpdate);

    if ($updated) {
      $this->output
        ->set_content_type('application/json')
        ->set_output(json_encode(['status' => 'success', 'message' => 'Header Purchase Plan berhasil diperbarui.']));
    } else {
      $this->output
        ->set_content_type('application/json')
        ->set_output(json_encode(['status' => 'error', 'message' => 'Gagal memperbarui header Purchase Plan. Mungkin ID tidak ditemukan atau tidak ada perubahan data.']));
    }
  }


public function updateTableKiri()
{
    if ($this->input->method() !== 'post') {
        return $this->output
            ->set_content_type('application/json')
            ->set_status_header(405)
            ->set_output(json_encode(['status' => 'error', 'message' => 'Method not allowed.']));
    }

    $rawInput = json_decode($this->input->raw_input_stream, true);

    $rows = $rawInput['dataKiri'] ?? $rawInput;
    $mappingShipment = $rawInput['mappingShipment'] ?? [];

    if (empty($rows)) {
        echo json_encode(['status' => 'error', 'message' => 'Data Table Kiri kosong.']);
        return;
    }

    $purchasePlanID = $rows[0]['PurchasePlanID'] ?? null;
    if (!$purchasePlanID) {
        echo json_encode(['status' => 'error', 'message' => 'PurchasePlanID tidak ditemukan.']);
        return;
    }

    $this->db->trans_begin();
    $mapping = [];

    try {

        foreach ($rows as $r) {
            $DtlID = isset($r['DtlID']) ? (int)$r['DtlID'] : 0;

            
            //  CASE 1: UPDATE EXISTING DTL
            if ($DtlID > 0) {
                log_message('debug', "UPDATE BY ID: DtlID={$DtlID}");

                $batchValue = !empty($r['Batch']) ? (int)$r['Batch'] : null;
                $purchasePlanID = (int)$r['PurchasePlanID'];
                $vendorID = (int)($r['Vendor'] ?? 0);

                //  FIX: Get OLD batch value BEFORE update so we can sync shipment table
                $oldDtlData = $this->db->get_where('dbtPurchasePlanDtl', ['ID' => $DtlID])->row_array();
                $oldBatch = $oldDtlData ? ($oldDtlData['Batch'] ?? null) : null;

                $data = [
                    'PurchasePlanID' => $purchasePlanID,
                    'Vendor' => $vendorID,
                    'Batch' => $batchValue,
                    'BlanketPODateEst' => !empty($r['BlanketPODateEst']) ? $r['BlanketPODateEst'] : null,
                    'Total' => (float)($r['Total'] ?? 0),
                ];

                $this->db->where('ID', $DtlID)->update('dbtPurchasePlanDtl', $data);
                
                //  CRITICAL FIX: Sync batch in shipment table using composite key (PurchasePlanID, Vendor, Batch)
                // Shipment table relates via composite key, NOT via PurchasePlanDtlID
                if ($oldBatch !== $batchValue) {
                    $this->db->where('PurchasePlanID', $purchasePlanID)
                             ->where('Vendor', $vendorID)
                             ->where('Batch', $oldBatch)
                             ->update('dbtPurchasePlanDtlShipment', ['Batch' => $batchValue]);
                    log_message('debug', "SYNC: Updated shipment batch for Plan={$purchasePlanID}, Vendor={$vendorID}, OldBatch={$oldBatch} -> NewBatch={$batchValue}");
                }
                
                $mapping[$r['tempRowId']] = $DtlID;

                continue;
            }

            //  CASE 2: INSERT ATAU CARI DTL BARU
            
            $this->_saveOrUpdateDtl($r, $mapping);
        }

        if ($this->db->trans_status() === false) {
            $this->db->trans_rollback();
            echo json_encode(['status' => 'error', 'message' => 'Transaksi gagal.']);
            return;
        }

        $this->db->trans_commit();

        echo json_encode([
            'status' => 'success',
            'message' => 'Berhasil Simpan Table Kiri',
            'mapping' => $mapping,
            'mappingShipment' => $mappingShipment,
        ]);

    } catch (Exception $e) {
        $this->db->trans_rollback();
        echo json_encode(['status' => 'error', 'message' => 'Kesalahan internal: ' . $e->getMessage()]);
    }
}

private function _saveOrUpdateDtl($r, &$mapping)
{
    $DtlID = (int)$r['DtlID'];

    // CASE UPDATE
    if ($DtlID > 0) {
        $data = [
            'PurchasePlanID' => $r['PurchasePlanID'],
            'Vendor' => $r['Vendor'],
            'Batch' => !empty($r['Batch']) ? $r['Batch'] : null,
            'BlanketPODateEst' => !empty($r['BlanketPODateEst']) ? $r['BlanketPODateEst'] : null,
            'Total' => $r['Total'],
        ];

        $this->db->where('ID', $DtlID)->update('dbtPurchasePlanDtl', $data);
        $mapping[$r['tempRowId']] = $DtlID;
        return;
    }

    // CASE INSERT
    $data = [
        'PurchasePlanID' => $r['PurchasePlanID'],
        'Vendor' => $r['Vendor'],
        'Batch' => !empty($r['Batch']) ? $r['Batch'] : null,
        'BlanketPODateEst' => !empty($r['BlanketPODateEst']) ? $r['BlanketPODateEst'] : null,
        'Total' => $r['Total'],
    ];

    $this->db->insert('dbtPurchasePlanDtl', $data);
    $newId = $this->db->insert_id();
    $mapping[$r['tempRowId']] = $newId;
}


public function updateTableTengah()
{
    if ($this->input->method() !== 'post') {
        echo json_encode(['status' => 'error', 'message' => 'Metode tidak diizinkan.']);
        return;
    }

    $rawInput = json_decode($this->input->raw_input_stream, true);
    $rows = $rawInput['shipments'] ?? $rawInput;
    $deletedShipmentIDs = $rawInput['deletedShipmentIDs'] ?? [];

    if (empty($rows) && empty($deletedShipmentIDs)) {
        echo json_encode(['status' => 'error', 'message' => 'Data kosong.']);
        return;
    }

    $purchasePlanID = $rows[0]['PurchasePlanID'] ?? null;
    if (!$purchasePlanID) {
        echo json_encode(['status' => 'error', 'message' => 'PurchasePlanID tidak ditemukan.']);
        return;
    }

    $this->db->trans_begin();

    try {

        $currentUserID = $this->session->userdata('userid');
        $currentDate = date('Y-m-d H:i:s');
        $newShipments = [];

        /* =========================
           DELETE (CASCADE SAFE)
        ========================== */
        foreach ($deletedShipmentIDs as $shipmentID) {
            $this->_deleteShipmentCascade($shipmentID);
        }


        /* =========================
           PROCESS INSERT & UPDATE
        ========================== */
        foreach ($rows as $row) {

            $shipmentID = (int)($row['ShipmentID'] ?? 0);

            $shipmentData = [
                'Vendor' => (int)($row['Vendor'] ?? 0),
                'ItemID' => (int)($row['ItemID'] ?? 0),
                'ItemUnitID' => (int)($row['ItemUnitID'] ?? 0),
                'PurchasePlanID' => (int)$purchasePlanID,
                'Color' => $row['Color'] ?? null,
                'ShipmentDate' => $row['ShipmentDate'] ?? null,
                'Qty' => (float)($row['Qty'] ?? 0),
                'Price' => (float)($row['Price'] ?? 0),
                'PODateEst' => $row['PODateEst'] ?? null,
                'Term' => (int)($row['Term'] ?? 0),
                'Batch' => (int)($row['Batch'] ?? 0),
                'BlanketID' => (int)($row['BlanketID'] ?? 0),
                'POID' => (int)($row['POID'] ?? 0),
                'Closed' => (int)($row['Closed'] ?? 0)
            ];

            /* ========= UPDATE ========= */
            if ($shipmentID > 0) {

                // update master
                $this->db->where('ID', $shipmentID);
                $this->db->update('dbtPurchasePlanDtlShipment', $shipmentData);

                // close history lama
                $this->db->where('ShipmentID', $shipmentID);
                $this->db->where('EndDate IS NULL', null, false);
                $this->db->update('dbtPurchasePlanDtlShipmentHistory', [
                    'EndDate' => $currentDate,
                    'EditUserID' => $currentUserID
                ]);

                // insert history baru
                $historyData = $shipmentData;
                $historyData['ShipmentID'] = $shipmentID;
                $historyData['StartDate'] = $currentDate;
                $historyData['EditDate'] = $currentDate;
                $historyData['EditUserID'] = $currentUserID;

                $this->db->insert('dbtPurchasePlanDtlShipmentHistory', $historyData);
            }

            /* ========= INSERT ========= */
            else {

                // insert master satu per satu (AMAN SQL SERVER)
                $this->db->insert('dbtPurchasePlanDtlShipment', $shipmentData);
                $newID = $this->db->insert_id();

                if (!$newID) {
                    throw new Exception("Gagal mendapatkan ShipmentID baru.");
                }

                $newShipments[] = [
                    'tempShipmentId' => $row['tempShipmentId'] ?? null,
                    'ShipmentID' => $newID
                ];

                // insert history
                $historyData = $shipmentData;
                $historyData['ShipmentID'] = $newID;
                $historyData['StartDate'] = $currentDate;
                $historyData['EditDate'] = $currentDate;
                $historyData['EditUserID'] = $currentUserID;

                $this->db->insert('dbtPurchasePlanDtlShipmentHistory', $historyData);
            }
        }

        if ($this->db->trans_status() === FALSE) {
            throw new Exception("Transaksi gagal.");
        }

        $this->db->trans_commit();

        echo json_encode([
            'status' => 'success',
            'message' => 'Berhasil simpan shipment',
            'newShipments' => $newShipments,
            'mappingShipment' => array_column($newShipments, 'ShipmentID', 'tempShipmentId')
        ]);

    } catch (Exception $e) {

        $this->db->trans_rollback();

        echo json_encode([
            'status' => 'error',
            'message' => $e->getMessage()
        ]);
    }
}

  private function _deleteShipmentCascade($shipmentID)
  {
    $this->db->trans_begin();
    
    try {
        // Get shipment info
        $shipment = $this->db->get_where('dbtPurchasePlanDtlShipment', ['ID' => $shipmentID])->row_array();
        if (!$shipment) {
            log_message('warn', "Shipment {$shipmentID} not found");
            return;
        }
        
        $purchasePlanID = $shipment['PurchasePlanID'];
        $vendor = $shipment['Vendor'];
        $batch = $shipment['Batch'];
        
        // Cek: apakah ada shipment LAIN dengan vendor + batch yang SAMA?
        $this->db->select('COUNT(*) as cnt');
        $this->db->from('dbtPurchasePlanDtlShipment');
        $this->db->where('PurchasePlanID', $purchasePlanID);
        $this->db->where('Vendor', $vendor);
        $this->db->where('Batch', $batch);
        $this->db->where('ID !=', $shipmentID); // exclude yang sedang dihapus
        $otherShipmentsWithSameBatch = $this->db->get()->row_array();
        $hasOtherShipmentsSameBatch = ($otherShipmentsWithSameBatch['cnt'] > 0);
        
        // Cek: apakah ada shipment LAIN di plan ini (dengan vendor+batch BERBEDA)?
        $this->db->select('COUNT(*) as cnt');
        $this->db->from('dbtPurchasePlanDtlShipment');
        $this->db->where('PurchasePlanID', $purchasePlanID);
        $this->db->where('ID !=', $shipmentID);
        $otherShipmentsOtherBatch = $this->db->get()->row_array();
        $hasOtherShipmentsOtherBatch = ($otherShipmentsOtherBatch['cnt'] > 0);
        
        // CASE 1: Masih ada shipment lain (baik same batch atau other batch)
        if ($hasOtherShipmentsSameBatch || $hasOtherShipmentsOtherBatch) {
            log_message('info', "Shipment {$shipmentID} has other shipments. Deleting only this shipment + its DTL.");
            
            // 1a. Hapus Shipment History
            $this->db->where('ShipmentID', $shipmentID);
            $this->db->delete('dbtPurchasePlanDtlShipmentHistory');
            
            // 1b. Hapus Shipment Week
            $this->db->where('PurchasePlanDtlShipmentID', $shipmentID);
            $this->db->delete('dbtPurchasePlanDtlShipmentWeek');
            
            // 1c. Hapus Shipment
            $this->db->where('ID', $shipmentID);
            $this->db->delete('dbtPurchasePlanDtlShipment');
            
            // 1d. ONLY hapus Dtl jika tidak ada shipment lain dengan vendor+batch yang SAMA
            if (!$hasOtherShipmentsSameBatch) {
                // Find DTL dengan vendor + batch yang match
                $dtlToDelete = $this->db->select('ID')
                    ->from('dbtPurchasePlanDtl')
                    ->where('PurchasePlanID', $purchasePlanID)
                    ->where('Vendor', $vendor)
                    ->where('Batch', $batch)
                    ->get()
                    ->row_array();
                
                if ($dtlToDelete) {
                    $dtlID = $dtlToDelete['ID'];
                    
                    // Delete Payment History -> Payment -> PaymentPlanSummary untuk DTL ini
                    $this->db->select('ph.ID');
                    $this->db->from('dbtPurchasePlanDtlPaymentHistory ph');
                    $this->db->join('dbtPurchasePlanDtlPayment p', 'ph.PaymentID = p.ID', 'inner');
                    $this->db->where('p.PurchasePlanDtlID', $dtlID);
                    $paymentHistories = $this->db->get()->result_array();
                    $phIDs = array_column($paymentHistories, 'ID');
                    
                    if (!empty($phIDs)) {
                        $this->db->where_in('ID', $phIDs);
                        $this->db->delete('dbtPurchasePlanDtlPaymentHistory');
                        log_message('info', "  Deleted " . count($phIDs) . " payment histories for DTL {$dtlID}");
                    }
                    
                    // Delete Payments untuk DTL ini
                    $this->db->where('PurchasePlanDtlID', $dtlID);
                    $this->db->delete('dbtPurchasePlanDtlPayment');
                    
                    // Delete PaymentPlanSummary untuk DTL ini
                    $this->db->where('PaymentPlanID', $dtlID);
                    $this->db->delete('dbtPaymentPlanSummary');
                    
                    // Delete DTL itself
                    $this->db->where('ID', $dtlID);
                    $this->db->delete('dbtPurchasePlanDtl');
                    
                    log_message('info', "  Deleted DTL {$dtlID} dan related payments");
                }
            } else {
                log_message('info', "  Keeping DTL - masih ada shipment lain dengan batch yang sama");
            }
            
        } else {
            // CASE 2: Ini SHIPMENT TERAKHIR di plan ini - full cascade delete
            log_message('info', "Shipment {$shipmentID} is the last one. Executing full cascade delete.");
            
            // Get all details di plan ini
            $this->db->select('ID');
            $this->db->from('dbtPurchasePlanDtl');
            $this->db->where('PurchasePlanID', $purchasePlanID);
            $details = $this->db->get()->result_array();
            $dtlIDs = array_column($details, 'ID');
            
            if (!empty($dtlIDs)) {
                // Delete Payment History
                $this->db->select('ph.ID');
                $this->db->from('dbtPurchasePlanDtlPaymentHistory ph');
                $this->db->join('dbtPurchasePlanDtlPayment p', 'ph.PaymentID = p.ID', 'inner');
                $this->db->where_in('p.PurchasePlanDtlID', $dtlIDs);
                $paymentHistories = $this->db->get()->result_array();
                $phIDs = array_column($paymentHistories, 'ID');
                
                if (!empty($phIDs)) {
                    $this->db->where_in('ID', $phIDs);
                    $this->db->delete('dbtPurchasePlanDtlPaymentHistory');
                }
                
                // Delete Payments
                $this->db->where_in('PurchasePlanDtlID', $dtlIDs);
                $this->db->delete('dbtPurchasePlanDtlPayment');
                
                // Delete PaymentPlanSummary
                $this->db->where_in('PaymentPlanID', $dtlIDs);
                $this->db->delete('dbtPaymentPlanSummary');
            }
            
            // Delete Shipment History
            $this->db->where('PurchasePlanID', $purchasePlanID);
            $this->db->delete('dbtPurchasePlanDtlShipmentHistory');
            
            // Delete Shipment Week
            $this->db->select('ID');
            $this->db->from('dbtPurchasePlanDtlShipment');
            $this->db->where('PurchasePlanID', $purchasePlanID);
            $shipmentsForWeek = $this->db->get()->result_array();
            $shipmentIDsForWeek = array_column($shipmentsForWeek, 'ID');
            
            if (!empty($shipmentIDsForWeek)) {
                $this->db->where_in('PurchasePlanDtlShipmentID', $shipmentIDsForWeek);
                $this->db->delete('dbtPurchasePlanDtlShipmentWeek');
            }
            
            // Delete Shipments
            $this->db->where('PurchasePlanID', $purchasePlanID);
            $this->db->delete('dbtPurchasePlanDtlShipment');
            
            // Delete Details
            $this->db->where('PurchasePlanID', $purchasePlanID);
            $this->db->delete('dbtPurchasePlanDtl');
            
            // Delete Master Plan
            $this->db->where('ID', $purchasePlanID);
            $this->db->delete('dbtPurchasePlan');
            
            log_message('info', "Full cascade delete completed for PurchasePlanID {$purchasePlanID}");
        }
        
    } catch (Exception $e) {
        log_message('error', "Error deleting shipment {$shipmentID}: " . $e->getMessage());
        $this->db->trans_rollback();
        throw $e;
    }
    
    $this->db->trans_complete();
  }

public function updateTableKanan()
{
    if ($this->input->method() !== 'post') {
        echo json_encode(['status' => 'error', 'message' => 'Metode request tidak diizinkan.']);
        return;
    }

    $rawInput = json_decode($this->input->raw_input_stream, true);

    // Data payment + mapping dari frontend
    $rows = $rawInput['payments'] ?? $rawInput;
    $mapping = $rawInput['mapping'] ?? [];
    $deletedDtlIDs = isset($rawInput['deletedDtlIDs']) ? $rawInput['deletedDtlIDs'] : [];

    // Handle deletions first
    if (!empty($deletedDtlIDs)) {
        foreach ($deletedDtlIDs as $dtlID) {
            $this->_deleteDtlCascade($dtlID);
        }
        log_message('info', "Deleted details: " . json_encode($deletedDtlIDs));
    }

    if (empty($rows)) {
        echo json_encode(['status' => 'success', 'message' => 'Data berhasil dihapus.']);
        return;
    }

    $this->db->trans_begin();

    try {
        foreach ($rows as $r) {
            $tempRowId = $r['tempRowId'] ?? null;
            $purchasePlanDtlID = $r['PurchasePlanDtlID'] ?? $r['purchasePlanDtlId'] ?? null;

            //  Jika belum ada ID real tapi punya tempRowId, ambil dari mapping
            if (!$purchasePlanDtlID && $tempRowId && isset($mapping[$tempRowId])) {
                $purchasePlanDtlID = $mapping[$tempRowId];
            }

            $paymentID = isset($r['PaymentID']) ? (int)$r['PaymentID'] : 0;

            // Abaikan jika tidak ada Dtl ID yang valid
            if (!$purchasePlanDtlID) {
                log_message('debug', 'Skip payment row - missing PurchasePlanDtlID');
                continue;
            }

            $dataMain = [
                'PurchasePlanDtlID' => (int)$purchasePlanDtlID,
                'PaymentDate'       => $r['PaymentDate'] ?? null,
                'Notes'             => $r['Notes'] ?? null,
                '[Percent]'         => isset($r['Percent']) ? (float)$r['Percent'] : null,
                'FromValue'         => isset($r['FromValue']) ? (float)$r['FromValue'] : null,
                '[Alert]'           => isset($r['Alert']) ? (int)$r['Alert'] : null,
                'Term'              => isset($r['Term']) ? (int)$r['Term'] : null,
                'OACredit'          => isset($r['OACredit']) ? (int)$r['OACredit'] : null,
            ];

            if ($paymentID > 0) {
                //  UPDATE Payment Lama
                $oldData = $this->db->get_where('dbtPurchasePlanDtlPayment', ['ID' => $paymentID])->row_array();
                $this->db->where('ID', $paymentID);
                $this->db->update('dbtPurchasePlanDtlPayment', $dataMain);

                // Cek perubahan
                $hasChanges = false;
                foreach ($dataMain as $key => $val) {
                    if ((string)($oldData[$key] ?? null) !== (string)$val) {
                        $hasChanges = true;
                        break;
                    }
                }

                if ($hasChanges) {
                    // Tutup histori lama
                    $this->db->where('PaymentID', $paymentID);
                    $this->db->where('EndDate IS NULL', null, false);
                    $this->db->update('dbtPurchasePlanDtlPaymentHistory', [
                        'EndDate' => date('Y-m-d H:i:s'),
                        'EditUserID' => $this->userid,
                    ]);

                    // Tambahkan histori baru
                    $historyData = array_merge($dataMain, [
                        'PaymentID'  => $paymentID,
                        'StartDate'  => date('Y-m-d H:i:s'),
                        'EditDate'   => date('Y-m-d H:i:s'),
                        'EditUserID' => $this->userid,
                    ]);
                    $this->db->insert('dbtPurchasePlanDtlPaymentHistory', $historyData);
                }
            } else {
                //  INSERT Payment Baru
                $this->db->insert('dbtPurchasePlanDtlPayment', $dataMain);
                $paymentID = $this->db->insert_id();

                // Simpan histori awal
                $historyData = array_merge($dataMain, [
                    'PaymentID'  => $paymentID,
                    'StartDate'  => date('Y-m-d H:i:s'),
                    'EditDate'   => date('Y-m-d H:i:s'),
                    'EditUserID' => $this->userid,
                ]);
                $this->db->insert('dbtPurchasePlanDtlPaymentHistory', $historyData);
            }
        }

        if ($this->db->trans_status() === false) {
            $this->db->trans_rollback();
            echo json_encode(['status' => 'error', 'message' => 'Gagal menyimpan Table Kanan.']);
            return;
        }

        $this->db->trans_commit();
        echo json_encode(['status' => 'success', 'message' => 'Berhasil Simpan Table Kanan']);

    } catch (Exception $e) {
        $this->db->trans_rollback();
        log_message('error', 'Error in updateTableKanan: ' . $e->getMessage());
        echo json_encode(['status' => 'error', 'message' => 'Terjadi kesalahan internal: ' . $e->getMessage()]);
    }
}

private function _deleteDtlCascade($dtlID)
{
    $this->db->trans_begin();
    
    try {
        // Get detail info
        $detail = $this->db->get_where('dbtPurchasePlanDtl', ['ID' => $dtlID])->row_array();
        if (!$detail) {
            log_message('warn', "Detail {$dtlID} not found");
            return;
        }
        
        $purchasePlanID = $detail['PurchasePlanID'];
        
        // 1. Hapus Payment History via join to Payment via DtlID
        $this->db->select('ph.ID');
        $this->db->from('dbtPurchasePlanDtlPaymentHistory ph');
        $this->db->join('dbtPurchasePlanDtlPayment p', 'ph.PaymentID = p.ID', 'inner');
        $this->db->where('p.PurchasePlanDtlID', $dtlID);
        $paymentHistories = $this->db->get()->result_array();
        $phIDs = array_column($paymentHistories, 'ID');
        
        if (!empty($phIDs)) {
            $this->db->where_in('ID', $phIDs);
            $this->db->delete('dbtPurchasePlanDtlPaymentHistory');
        }
        
        // 2. Hapus Payments via DtlID
        $this->db->where('PurchasePlanDtlID', $dtlID);
        $this->db->delete('dbtPurchasePlanDtlPayment');
        
        // 2b. Hapus PaymentPlanSummary via DtlID
        $this->db->where('PaymentPlanID', $dtlID);
        $this->db->delete('dbtPaymentPlanSummary');
        
        // 3. Hapus Shipment History via PurchasePlanID
        $this->db->where('PurchasePlanID', $purchasePlanID);
        $this->db->delete('dbtPurchasePlanDtlShipmentHistory');
        
        // 4. Hapus Shipment Week via ShipmentID relationship
        $this->db->select('ID');
        $this->db->from('dbtPurchasePlanDtlShipment');
        $this->db->where('PurchasePlanID', $purchasePlanID);
        $shipmentsForWeek = $this->db->get()->result_array();
        $shipmentIDsForWeek = array_column($shipmentsForWeek, 'ID');
        
        if (!empty($shipmentIDsForWeek)) {
            $this->db->where_in('PurchasePlanDtlShipmentID', $shipmentIDsForWeek);
            $this->db->delete('dbtPurchasePlanDtlShipmentWeek');
        }
        
        // 4b. Hapus Shipments via PurchasePlanID
        $this->db->where('PurchasePlanID', $purchasePlanID);
        $this->db->delete('dbtPurchasePlanDtlShipment');
        
        // 5. Hapus Detail
        $this->db->where('ID', $dtlID);
        $this->db->delete('dbtPurchasePlanDtl');
        
        // Cek: apakah masih ada detail di plan ini?
        $this->db->select('COUNT(*) as cnt');
        $this->db->from('dbtPurchasePlanDtl');
        $this->db->where('PurchasePlanID', $purchasePlanID);
        $remainingDetails = $this->db->get()->row_array();
        
        // 6. Hapus Master Plan jika tidak ada detail lagi
        if ($remainingDetails['cnt'] == 0) {
            $this->db->where('ID', $purchasePlanID);
            $this->db->delete('dbtPurchasePlan');
            log_message('info', "Master Plan {$purchasePlanID} deleted (no details left)");
        }
        
        log_message('info', "Detail {$dtlID} and related data deleted successfully");
        
    } catch (Exception $e) {
        log_message('error', "Error deleting detail {$dtlID}: " . $e->getMessage());
        $this->db->trans_rollback();
        throw $e;
    }
    
    $this->db->trans_complete();
}

public function save_all_payment_calc_summary()
{
    $input = file_get_contents('php://input');
    $data  = json_decode($input, true);

    if (!isset($data['purchasePlanID']) || !isset($data['calcItems'])) {
        return $this->output
            ->set_content_type('application/json')
            ->set_status_header(400)
            ->set_output(json_encode([
                'status' => 'error',
                'message' => 'purchasePlanID dan calcItems wajib.'
            ]));
    }

    $purchasePlanID = $data['purchasePlanID'];
    $calcItems      = $data['calcItems'];

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

    $docID   = $plan['ID'];
    $docType = $plan['DocType'];

    $this->db->trans_start();

    //  STEP 1: kumpulkan semua PaymentPlanID yang akan diupdate
    $allDtlIDs = [];

    foreach ($calcItems as $item) {
        if (!empty($item['purchasePlanDtlID'])) {
            $allDtlIDs[] = $item['purchasePlanDtlID'];
        }
    }

    $allDtlIDs = array_unique($allDtlIDs);

    if (!empty($allDtlIDs)) {
        $this->db->where_in('PaymentPlanID', $allDtlIDs);
        $this->db->delete('dbtPaymentPlanSummary');
    }

    //  STEP 2: kumpulkan semua data insert dalam 1 array besar
    $batchInsert = [];

    foreach ($calcItems as $item) {

        $dtlID = $item['purchasePlanDtlID'];
        $rows  = $item['calcResult'];

        foreach ($rows as $r) {

            $date = null;
            if (!empty($r['paymentDate'])) {
                $dt = DateTime::createFromFormat('d-m-Y', $r['paymentDate']);
                if ($dt) $date = $dt->format('Y-m-d');
            }

            $batchInsert[] = [
                "DocID"         => $docID,
                "DocType"       => $docType,
                "PaymentPlanID" => $dtlID,
                "PaymentDate"   => $date,
                "Notes"         => $r['notes'],
                "FromValue"     => $r['fromValue'],
                "[Alert]"       => $r['alert'],
                "[Percent]"     => $r['percent'],
                "Total"         => $r['payment'],
            ];
        }
    }

    //  STEP 3: insert batch sekali saja
    if (!empty($batchInsert)) {
        $this->db->insert_batch("dbtPaymentPlanSummary", $batchInsert);
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
        ->set_output(json_encode([
            'status' => 'success',
            'message' => 'Bulk payment calc berhasil disimpan.'
        ]));
}

public function update_payment_calc_summary()
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

    $purchasePlanID     = $data['purchasePlanID'];
    $purchasePlanDtlID  = isset($data['purchasePlanDtlID']) ? $data['purchasePlanDtlID'] : null;
    $isUpdate           = isset($data['isUpdate']) ? $data['isUpdate'] : false;
    $resultRows         = $data['calcResult'];

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

    // Jika mode UPDATE: hapus data lama berdasarkan PaymentPlanID (purchasePlanDtlID)
    if ($isUpdate && $purchasePlanDtlID) {
        $this->db->where('PaymentPlanID', $purchasePlanDtlID);
        $this->db->delete('dbtPaymentPlanSummary');
        log_message('debug', 'Deleted old PaymentPlanSummary for PaymentPlanID: ' . $purchasePlanDtlID);
    }

    foreach ($resultRows as $r) {

        // ubah tanggal format dd-mm-yyyy -> yyyy-mm-dd
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
            'message' => $isUpdate ? 'Payment calc berhasil diupdate.' : 'Payment calc berhasil disimpan.'
        ]));
}


  // tutup update table kanan

public function getPurchasePlanDtlPayment()
{
    if ($this->input->method() !== 'get') {
        return $this->output
            ->set_content_type('application/json')
            ->set_output(json_encode([
                'status' => 'error',
                'message' => 'Gunakan metode GET.'
            ]));
    }

    $purchasePlanDtlID = $this->input->get('id');
    $shipmentID = $this->input->get('shipmentID');
    $autoDuplicate = $this->input->get('autoDuplicate') === 'true';

    log_message('debug', "▶️ getPurchasePlanDtlPayment => ID: $purchasePlanDtlID, shipmentID: $shipmentID, autoDuplicate: $autoDuplicate");

    if (empty($purchasePlanDtlID) || !is_numeric($purchasePlanDtlID)) {
        return $this->output
            ->set_content_type('application/json')
            ->set_output(json_encode([
                'status' => 'error',
                'message' => 'ID detail rencana pembelian tidak valid.'
            ]));
    }

    // 1. Ambil payment dari tabel utama
    $payments = $this->pom->getDataTableKanan($purchasePlanDtlID);

    // 2. Kalau kosong & autoDuplicate aktif -> ambil dari parent
    if (empty($payments) && $autoDuplicate) {
        // Cari shipment lain dalam PurchasePlanID yang sama, vendor sama, dan ID beda
        $parentDtl = $this->db->select('TOP 1 d2.ID AS ParentDtlID')
            ->from('dbtPurchasePlanDtl d1')
            ->join('dbtPurchasePlanDtl d2', 'd1.PurchasePlanID = d2.PurchasePlanID AND d2.ID != d1.ID', 'left')
            ->where('d1.ID', $purchasePlanDtlID)
            ->where('d1.Vendor = d2.Vendor') // pastikan vendor sama
            ->order_by('d2.ID', 'ASC') // shipment lama dianggap parent
            ->get()
            ->row();

        if ($parentDtl && $parentDtl->ParentDtlID) {
            log_message('debug', " Auto-duplicate from ParentDtlID (same PurchasePlanID): {$parentDtl->ParentDtlID}");

            $parentPayments = $this->pom->getDataTableKanan($parentDtl->ParentDtlID);

            if (!empty($parentPayments)) {
                foreach ($parentPayments as &$p) {
                    // Simpan ID lama sebagai referensi, jangan dihapus
                    $p['ParentPaymentID'] = $p['PaymentID']; 
                    unset($p['ID']); // ini ID tabel payment history, biar gak bentrok

                    // Tetap ubah ke detail baru
                    $p['PurchasePlanDtlID'] = $purchasePlanDtlID;
                }

                $payments = $parentPayments;
                log_message('debug', " Duplikasi sukses dari plan {$parentDtl->ParentDtlID} ke {$purchasePlanDtlID}");
            }

        }
    }

    return $this->output
        ->set_content_type('application/json')
        ->set_output(json_encode([
            'status' => 'success',
            'message' => 'Data pembayaran berhasil diambil.',
            'data' => $payments
        ]));
}

  // tutup get data table kanan
  public function getDataKursByDate($currID, $docdate)
  {
      $docdate = substr($docdate, 0, 10); 
      if ($currID == 1) {
          echo 1;
          die();
      }

      $result = $this->data->detail(
          "dbmCurrHistRate",
          "TOP 1 Rate",
          "CurrID = {$currID} AND CONVERT(DATE, StartDate) <= '{$docdate}' ORDER BY ID DESC"
      );

      if (count($result) > 0)
          $result = $result[0]['Rate'];
      else
          $result = 0;

      echo $result;
  }

  public function getCurrencyList($docdate) 
  {
      $docdate = substr($docdate, 0, 10); //  filter tanggal agar aman

      $result = [];
      $currid_all = $this->data->detail(
          "dbmCurr",
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


  public function updateDetails()
  {
    if ($this->input->method() !== 'post') {
      $this->output
        ->set_content_type('application/json')
        ->set_output(json_encode(['status' => 'error', 'message' => 'Metode request tidak diizinkan.']));
      return;
    }

    $input = json_decode($this->input->raw_input_stream, true);

    $purchasePlanID = $input['purchasePlanID'] ?? null;
    $details = $input['details'] ?? [];


    if (empty($purchasePlanID)) {
      $this->output
        ->set_content_type('application/json')
        ->set_output(json_encode(['status' => 'error', 'message' => 'Purchase Plan ID tidak boleh kosong.']));
      return;
    }
    if (!is_array($details)) {
      $this->output
        ->set_content_type('application/json')
        ->set_output(json_encode(['status' => 'error', 'message' => 'Format detail tidak valid.']));
      return;
    }


    $updated = $this->pom->updatePurchasePlanDetails($purchasePlanID, $details);

    if ($updated) {
      $this->output
        ->set_content_type('application/json')
        ->set_output(json_encode(['status' => 'success', 'message' => 'Detail Purchase Plan berhasil diperbarui.']));
    } else {
      $this->output
        ->set_content_type('application/json')
        ->set_output(json_encode(['status' => 'error', 'message' => 'Gagal memperbarui detail Purchase Plan.']));
    }
  }
  public function updateShipmentDetails()
  {
    // Hanya izinkan POST requests
    if ($this->input->method() !== 'post') {
      $this->output
        ->set_content_type('application/json')
        ->set_output(json_encode(['status' => 'error', 'message' => 'Metode request tidak diizinkan.']));
      return;
    }

    $input = json_decode($this->input->raw_input_stream, true);

    $purchasePlanID = $input['purchasePlanID'] ?? null;
    $shipmentDetails = $input['shipmentDetails'] ?? [];
    if (empty($purchasePlanID)) {
      $this->output
        ->set_content_type('application/json')
        ->set_output(json_encode(['status' => 'error', 'message' => 'Purchase Plan ID tidak boleh kosong.']));
      return;
    }
    if (!is_array($shipmentDetails)) {
      $this->output
        ->set_content_type('application/json')
        ->set_output(json_encode(['status' => 'error', 'message' => 'Format detail shipment tidak valid.']));
      return;
    }
    foreach ($shipmentDetails as $detail) {
      if (!isset($detail['vendor']) || empty($detail['qty'])) {
        $this->output
          ->set_content_type('application/json')
          ->set_output(json_encode(['status' => 'error', 'message' => 'Detail shipment tidak lengkap (vendor atau qty kosong).']));
        return;
      }
    }


    $updated = $this->pom->updatePurchasePlanShipmentDetails($purchasePlanID, $shipmentDetails);

    if ($updated) {
      $this->output
        ->set_content_type('application/json')
        ->set_output(json_encode(['status' => 'success', 'message' => 'Detail shipment Purchase Plan berhasil diperbarui.']));
    } else {
      $this->output
        ->set_content_type('application/json')
        ->set_output(json_encode(['status' => 'error', 'message' => 'Gagal memperbarui detail shipment Purchase Plan.']));
    }
  }

  public function updatePaymentDetailsTableKanan()
  {
    if ($this->input->method() !== 'post') {
      $this->output
        ->set_content_type('application/json')
        ->set_status_header(405)
        ->set_output(json_encode(['status' => 'error', 'message' => 'Metode request tidak diizinkan.']));
      return;
    }

    $input = json_decode($this->input->raw_input_stream, true);
    $paymentDetails = $input['paymentDetails'] ?? [];

    if (!is_array($paymentDetails) || empty($paymentDetails)) {
      $this->output
        ->set_content_type('application/json')
        ->set_status_header(400)
        ->set_output(json_encode(['status' => 'error', 'message' => 'Format detail pembayaran tidak valid atau kosong.']));
      return;
    }

    foreach ($paymentDetails as $detail) {
      // Validasi PurchasePlanDtlID
      if (!isset($detail['PurchasePlanDtlID']) || !is_numeric($detail['PurchasePlanDtlID'])) {
        $this->output
          ->set_content_type('application/json')
          ->set_status_header(400)
          ->set_output(json_encode(['status' => 'error', 'message' => 'PurchasePlanDtlID tidak valid.']));
        return;
      }

      // Validasi PaymentDate
      if (isset($detail['PaymentDate']) && !empty($detail['PaymentDate']) && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $detail['PaymentDate'])) {
        $this->output
          ->set_content_type('application/json')
          ->set_status_header(400)
          ->set_output(json_encode(['status' => 'error', 'message' => 'Format PaymentDate tidak valid (YYYY-MM-DD).']));
        return;
      }

      // Validasi Percent
      if (isset($detail['Percent']) && !is_numeric($detail['Percent'])) {
        $this->output
          ->set_content_type('application/json')
          ->set_status_header(400)
          ->set_output(json_encode(['status' => 'error', 'message' => 'Percent harus berupa angka.']));
        return;
      }

      // Validasi FromValue
      if (isset($detail['FromValue']) && !is_numeric($detail['FromValue'])) {
        $this->output
          ->set_content_type('application/json')
          ->set_status_header(400)
          ->set_output(json_encode(['status' => 'error', 'message' => 'FromValue harus berupa angka.']));
        return;
      }

      // Validasi OACredit
      if (isset($detail['OACredit']) && !is_numeric($detail['OACredit'])) {
        $this->output
          ->set_content_type('application/json')
          ->set_status_header(400)
          ->set_output(json_encode(['status' => 'error', 'message' => 'OACredit harus berupa angka.']));
        return;
      }

      // Validasi Term
      if (isset($detail['Term']) && !is_numeric($detail['Term'])) {
        $this->output
          ->set_content_type('application/json')
          ->set_status_header(400)
          ->set_output(json_encode(['status' => 'error', 'message' => 'Term harus berupa angka.']));
        return;
      }


      if (isset($detail['Alert']) && !is_string($detail['Alert']) && !is_numeric($detail['Alert'])) {
        $this->output
          ->set_content_type('application/json')
          ->set_status_header(400)
          ->set_output(json_encode(['status' => 'error', 'message' => 'Alert harus berupa string atau angka.']));
        return;
      }


      if (isset($detail['Notes']) && !is_string($detail['Notes'])) {
        $this->output
          ->set_content_type('application/json')
          ->set_status_header(400)
          ->set_output(json_encode(['status' => 'error', 'message' => 'Notes harus berupa string.']));
        return;
      }
    }

    $updated = $this->pom->syncPurchasePlanPaymentDetails($paymentDetails);

    if ($updated) {
      $this->output
        ->set_content_type('application/json')
        ->set_status_header(200)
        ->set_output(json_encode(['status' => 'success', 'message' => 'Detail pembayaran Purchase Plan berhasil diperbarui.']));
    } else {
      $this->output
        ->set_content_type('application/json')
        ->set_status_header(500)
        ->set_output(json_encode(['status' => 'error', 'message' => 'Gagal memperbarui detail pembayaran Purchase Plan.']));
    }
  }

  public function prepare_export_data()
  {
    header('Content-Type: application/json');

    try {
      error_reporting(E_ALL);
      ini_set('display_errors', 0);

      $json = file_get_contents('php://input');
      $data = json_decode($json, true);

      log_message('info', '=== PREPARE EXPORT START ===');
      log_message('info', 'Raw JSON received: ' . substr($json, 0, 500));

      if (!$data) {
        throw new Exception('JSON decode error: ' . json_last_error_msg());
      }

      if (!isset($data['export_data'])) {
        throw new Exception('Missing export_data in request');
      }

      $export_data = $data['export_data'];
      $processed_count = 0;
      $errors = [];

      log_message('info', 'Processing ' . count($export_data) . ' purchase plans');

      // Process setiap purchase plan
      foreach ($export_data as $planIdx => $plan) {
        try {
          $purchasePlanID = $plan['PurchasePlanID'] ?? null;
          $shipmentWeeks = $plan['ShipmentWeeks'] ?? [];

          log_message('info', "Processing Plan {$planIdx}: PurchasePlanID={$purchasePlanID}, Weeks count=" . count($shipmentWeeks));

          if (!$purchasePlanID) {
            throw new Exception("Plan {$planIdx}: Missing PurchasePlanID");
          }

          // Insert/Update setiap shipment week
          foreach ($shipmentWeeks as $weekIdx => $week) {
            try {
              //  PENTING: gunakan PurchasePlanDtlShipmentID dari export_data
              $shipmentID = $week['PurchasePlanDtlShipmentID'] ?? null;
              $weekLabel = $week['Week'] ?? '';
              $shipmentDate = $week['ShipmentDate'] ?? null;
              $qty = (int)($week['Qty'] ?? 0);

              log_message('info', "  Week {$weekIdx}: {$weekLabel}, ShipmentID={$shipmentID}, Date={$shipmentDate}, Qty={$qty}");

              // Validasi data
              if (empty($weekLabel)) {
                throw new Exception("Week {$weekIdx}: Empty WeekLabel");
              }
              
              if (!$shipmentID) {
                log_message('warn', "  Week {$weekIdx}: Skipped - No PurchasePlanDtlShipmentID");
                continue;
              }

              // Data untuk insert/update
              //  INCLUDE PurchasePlanID untuk reference saat import nanti
              $week_data = [
                'PurchasePlanID' => $purchasePlanID,  //  ADDED: Store PurchasePlanID untuk import reference
                'PurchasePlanDtlShipmentID' => $shipmentID,
                'WeekID' => $weekLabel,
                'ShipmentDate' => $shipmentDate,
                'Qty' => $qty
              ];

              // Cek apakah sudah ada (unique key: ShipmentID + WeekID)
              $this->db->where('PurchasePlanDtlShipmentID', $shipmentID)
                ->where('WeekID', $weekLabel);
              $query = $this->db->get('dbtPurchasePlanDtlShipmentWeek');

              $existing = $query->row();

              if ($existing) {
                // Update
                $this->db->where('ID', $existing->ID)
                  ->update('dbtPurchasePlanDtlShipmentWeek', $week_data);
                
                log_message('info', "  Updated ID {$existing->ID}: ShipmentID={$shipmentID}, WeekID={$weekLabel}, Qty={$qty}");
              } else {
                // Insert
                $this->db->insert('dbtPurchasePlanDtlShipmentWeek', $week_data);
                $insertedID = $this->db->insert_id();
                
                log_message('info', "  Inserted ID {$insertedID}: ShipmentID={$shipmentID}, WeekID={$weekLabel}, Qty={$qty}");
              }

              $processed_count++;

            } catch (Exception $weekEx) {
              $errors[] = "Week {$weekIdx} error: " . $weekEx->getMessage();
              log_message('error', "Week processing error: " . $weekEx->getMessage());
            }
          }

        } catch (Exception $planEx) {
          $errors[] = "Plan {$planIdx} error: " . $planEx->getMessage();
          log_message('error', "Plan processing error: " . $planEx->getMessage());
        }
      }

      log_message('info', "=== PREPARE EXPORT END: Processed={$processed_count}, Errors=" . count($errors));

      // Response
      http_response_code(200);
      echo json_encode([
        'status' => 'success',
        'processed_count' => $processed_count,
        'total_plans' => count($export_data),
        'errors' => $errors,
        'message' => "{$processed_count} shipment weeks synchronized to dbtPurchasePlanDtlShipmentWeek"
      ]);

    } catch (Exception $e) {
      log_message('error', '=== PREPARE EXPORT EXCEPTION ===');
      log_message('error', 'Message: ' . $e->getMessage());
      log_message('error', 'Code: ' . $e->getCode());
      log_message('error', 'Trace: ' . $e->getTraceAsString());
      
      http_response_code(500);
      echo json_encode([
        'status' => 'error',
        'message' => 'Server error: ' . $e->getMessage(),
        'trace' => $e->getTraceAsString()
      ]);
    }
  }

  public function import_from_excel()
  {
      header('Content-Type: application/json');

      $debugLogs = [];

      try {
          error_reporting(E_ALL);
          ini_set('display_errors', 0);

          $debugLogs[] = '[INFO] ===== REQUEST DETAILS =====';
          $debugLogs[] = '[INFO] REQUEST_METHOD: ' . $_SERVER['REQUEST_METHOD'];
          $debugLogs[] = '[INFO] CONTENT_TYPE: ' . (isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : 'not-set');
          $debugLogs[] = '[INFO] CONTENT_LENGTH: ' . (isset($_SERVER['CONTENT_LENGTH']) ? $_SERVER['CONTENT_LENGTH'] : 'not-set');
          $debugLogs[] = '[INFO] HTTP_X_REQUESTED_WITH: ' . (isset($_SERVER['HTTP_X_REQUESTED_WITH']) ? $_SERVER['HTTP_X_REQUESTED_WITH'] : 'not-set');

          log_message('info', '=== IMPORT FROM EXCEL WITH MODE DETECTION START ===');
          log_message('info', 'REQUEST_METHOD: ' . $_SERVER['REQUEST_METHOD']);
          log_message('info', 'CONTENT_TYPE: ' . (isset($_SERVER['CONTENT_TYPE']) ? $_SERVER['CONTENT_TYPE'] : 'not-set'));
          log_message('info', 'CONTENT_LENGTH: ' . (isset($_SERVER['CONTENT_LENGTH']) ? $_SERVER['CONTENT_LENGTH'] : 'not-set'));

          $json = null;
          
          if (!$json && property_exists($this->input, 'raw_input_stream')) {
              $json = $this->input->raw_input_stream;
              $debugLogs[] = '[INFO] Using raw_input_stream method - got ' . strlen($json) . ' bytes';
          }
          
          if (!$json || strlen($json) === 0) {
              $json = file_get_contents('php://input');
              $debugLogs[] = '[INFO] Using php://input method - got ' . strlen($json) . ' bytes';
          }
          
          if (!$json && !empty($_POST)) {
              $json = json_encode($_POST);
              $debugLogs[] = '[INFO] Using $_POST method - got ' . strlen($json) . ' bytes';
          }
          
          $debugLogs[] = '[INFO] Final JSON length: ' . strlen($json);
          $debugLogs[] = '[INFO] First 500 chars: ' . substr($json, 0, 500);

          if (!$json || strlen($json) === 0) {
              $debugLogs[] = '[ERROR] Empty request body!';
              $debugLogs[] = '[DEBUG] $_POST: ' . (empty($_POST) ? 'empty' : count($_POST) . ' items');
              $debugLogs[] = '[DEBUG] $_SERVER[CONTENT_LENGTH]: ' . (isset($_SERVER['CONTENT_LENGTH']) ? $_SERVER['CONTENT_LENGTH'] : 'not-set');
              $debugLogs[] = '[DEBUG] Try checking Network tab in browser console!';
              $debugLogs[] = '[DEBUG] Make sure Content-Type header is set to application/json';
              throw new Exception('Empty request body received - check Network tab in browser console for actual request headers');
          }

          $data = json_decode($json, true);

          if (json_last_error() !== JSON_ERROR_NONE) {
              $errorMsg = json_last_error_msg();
              $errorCode = json_last_error();
              $debugLogs[] = '[ERROR] JSON decode failed: ' . $errorMsg;
              $debugLogs[] = '[ERROR] JSON error code: ' . $errorCode;
              log_message('error', 'JSON decode failed: ' . $errorMsg);
              log_message('error', 'JSON error code: ' . $errorCode);
              throw new Exception('JSON decode error: ' . $errorMsg . ' (code: ' . $errorCode . ')');
          }

          if (!$data) {
              $debugLogs[] = '[ERROR] JSON decoded to empty result';
              throw new Exception('JSON decoded to empty result');
          }

          $debugLogs[] = '[INFO] JSON decoded successfully';
          $debugLogs[] = '[INFO] Data keys: ' . implode(',', array_keys($data));

          if (!isset($data['changes'])) {
              $debugLogs[] = '[ERROR] Missing "changes" key in data';
              throw new Exception('Missing "changes" in request');
          }

          $changes = $data['changes'];
          $debugLogs[] = '[INFO] Changes count: ' . count($changes);
          
          log_message('info', '=== RECEIVED CHANGES DETAIL ===');
          log_message('info', 'Total changes: ' . count($changes));
          
          $groupedChanges = [];
          
          foreach ($changes as $idx => $change) {
              $groupKey = $change['Vendor'] . '||' . $change['ItemDesc'] . '||' . $change['Color'];
              
              if (!isset($groupedChanges[$groupKey])) {
                  $groupedChanges[$groupKey] = [
                      'PurchasePlanID' => $change['PurchasePlanID'],
                      'ShipmentID' => $change['ShipmentID'],
                      'Vendor' => $change['Vendor'],
                      'ItemDesc' => $change['ItemDesc'],
                      'Color' => $change['Color'],
                      'ItemCode' => $change['ItemCode'],
                      'ItemUnitID' => $change['ItemUnitID'],
                      'Price' => $change['Price'],
                      'PODateEst' => $change['PODateEst'],
                      'Term' => $change['Term'],
                      'BlanketID' => $change['BlanketID'],
                      'POID' => $change['POID'],
                      'sourceShipmentData' => $change['sourceShipmentData'],
                      'changedWeeks' => [],
                      '_groupedShipmentIDs' => []
                  ];
              }
              
              $groupedChanges[$groupKey]['_groupedShipmentIDs'][] = $change['ShipmentID'];
              
              foreach ($change['changedWeeks'] as $weekChange) {
                  $weekLabel = $weekChange['week'];
                  $found = false;
                  foreach ($groupedChanges[$groupKey]['changedWeeks'] as &$existingWeek) {
                      if ($existingWeek['week'] === $weekLabel) {
                          $existingWeek['qty_existing'] += $weekChange['qty_existing'];
                          $existingWeek['qty_imported'] += $weekChange['qty_imported'];
                          if (!empty($weekChange['existingShipments'])) {
                              $existingWeek['existingShipments'] = array_merge(
                                  $existingWeek['existingShipments'],
                                  $weekChange['existingShipments']
                              );
                          }
                          $found = true;
                          break;
                      }
                  }
                  if (!$found) {
                      $groupedChanges[$groupKey]['changedWeeks'][] = [
                          'week' => $weekLabel,
                          'qty_existing' => $weekChange['qty_existing'],
                          'qty_imported' => $weekChange['qty_imported'],
                          'shipment_date_existing' => $weekChange['shipment_date_existing'],
                          'shipment_date_imported' => $weekChange['shipment_date_imported'],
                          'batch_existing' => $weekChange['batch_existing'],
                          'mode' => $weekChange['mode'],
                          'existingShipments' => $weekChange['existingShipments'] ?? [],
                          'sourceShipmentData' => $weekChange['sourceShipmentData'] ?? $change['sourceShipmentData'],
                          'week_move_to' => $weekChange['week_move_to'] ?? null,
                          'shipment_date_move_to' => $weekChange['shipment_date_move_to'] ?? null,
                          'qty_moved' => $weekChange['qty_moved'] ?? null,
                          '_isUserModified' => true
                      ];
                  }

              }
          }
          
          $groupedChanges = array_values($groupedChanges);
          $debugLogs[] = '[INFO] Grouped changes count: ' . count($groupedChanges);
          log_message('info', 'Grouped changes: ' . count($groupedChanges) . ' groups');

          $this->db->trans_start();

          $results_by_mode = [
              'insert' => 0,
              'update_same' => 0,
              'full_move' => 0,
              'partial_split' => 0,
              'override' => 0,
              'overwrite_qty' => 0,
              'delete' => 0,
              'new_plan_created' => 0
          ];
          $errors = [];
          $currentUserID = $this->_get_current_user_id();

          $debugLogs[] = '[INFO] Starting to process ' . count($groupedChanges) . ' grouped changes';
          log_message('info', 'Processing ' . count($groupedChanges) . ' grouped shipment changes');

          foreach ($groupedChanges as $changeIdx => $change) {
              try {
                  $sourceShipmentID = $change['ShipmentID'] ?? null;
                  $purchasePlanID = $change['PurchasePlanID'] ?? null;
                  $changedWeeks = $change['changedWeeks'] ?? [];
                  $groupedShipmentIDs = $change['_groupedShipmentIDs'] ?? [];

                  log_message('info', "Group Change {$changeIdx}: SourceShipmentID={$sourceShipmentID}, PurchasePlanID={$purchasePlanID}, GroupedShipmentIDs=" . implode(',', $groupedShipmentIDs));

                  if (empty($purchasePlanID)) {
                      log_message('info', "Change {$changeIdx}: BARIS BARU TERDETEKSI - Akan membuat Purchase Plan baru");
                      
                      $vendor = $change['Vendor'] ?? null;
                      $itemDesc = $change['ItemDesc'] ?? null;
                      $color = $change['Color'] ?? null;
                      $itemID = $change['ItemID'] ?? null;
                      $itemUnitID = $change['ItemUnitID'] ?? null;
                      $vendorID = 0;

                      if (empty($vendor) || empty($itemDesc)) {
                          throw new Exception("Change {$changeIdx}: Vendor atau ItemDesc kosong untuk baris baru");
                      }

                      $newPurchasePlanID = $this->_create_new_purchase_plan($itemDesc, $currentUserID);
                      log_message('info', "  Purchase Plan baru dibuat: ID={$newPurchasePlanID}");

                      foreach ($changedWeeks as $weekIdx => $weekChange) {
                          try {
                              $weekLabel = $weekChange['week'] ?? '';
                              $qtyImported = (int)($weekChange['qty_imported'] ?? 0);
                              $shipmentDateImported = $weekChange['shipment_date_imported'] ?? null;

                              log_message('info', "  Processing new row shipment for week {$weekLabel}, Qty={$qtyImported}");

                              if ($qtyImported > 0) {
                                  $this->_create_new_shipment_for_import(
                                      $newPurchasePlanID,
                                      $vendorID > 0 ? $vendorID : $vendor,
                                      $itemID,
                                      $itemUnitID,
                                      $color,
                                      $qtyImported,
                                      $shipmentDateImported,
                                      $weekLabel,
                                      $currentUserID
                                  );
                                  log_message('info', "  Shipment created for new plan");
                              }
                          } catch (Throwable $shipmentEx) {
                              $errors[] = "New row week {$weekLabel}: " . $shipmentEx->getMessage();
                              log_message('error', "New shipment error: " . $shipmentEx->getMessage());
                          }
                      }

                      $sourceShipmentID = -1;
                      $purchasePlanID = $newPurchasePlanID;
                      $results_by_mode['new_plan_created']++;

                      continue;
                  }

                  if (!$sourceShipmentID || !$purchasePlanID) {
                      throw new Exception("Missing ShipmentID or PurchasePlanID");
                  }

                  $blanketID = $change['BlanketID'] ?? null;
                  $poID = $change['POID'] ?? null;
                  $itemID = $change['ItemID'] ?? null;
                  $itemUnitID = $change['ItemUnitID'] ?? null;

                  $sourceShipment = null;
                  
                  if (!empty($poID) && intval($poID) > 0) {
                      $sourceShipment = $this->db->select('*')
                          ->where('DocID', $poID)
                          ->where('ItemID', $itemID)
                          ->where('ItemUnitID', $itemUnitID)
                          ->order_by('ID', 'DESC')
                          ->limit(1)
                          ->get('tPOPlan')
                          ->row_array();

                      if ($sourceShipment) {
                          log_message('info', "  Source tPOPlan found (PO): DocID={$sourceShipment['DocID']}, ItemID={$sourceShipment['ItemID']}, ItemUnitID={$sourceShipment['ItemUnitID']}, Qty={$sourceShipment['Qty']}");
                      }
                  } elseif (!empty($blanketID) && intval($blanketID) > 0) {
                      $sourceShipment = $this->db->select('*')
                          ->where('DocID', $blanketID)
                          ->where('ItemID', $itemID)
                          ->where('ItemUnitID', $itemUnitID)
                          ->order_by('ID', 'DESC')
                          ->limit(1)
                          ->get('tPOPlan')
                          ->row_array();

                      if ($sourceShipment) {
                          log_message('info', "  Source tPOPlan found (BLANKET): DocID={$sourceShipment['DocID']}, ItemID={$sourceShipment['ItemID']}, ItemUnitID={$sourceShipment['ItemUnitID']}, Qty={$sourceShipment['Qty']}");
                      }
                  }
                  
                  if (!$sourceShipment) {
                      $sourceShipment = $this->db->select('*')
                          ->where('ID', $sourceShipmentID)
                          ->get('dbtPurchasePlanDtlShipment')
                          ->row_array();

                      if ($sourceShipment) {
                          log_message('info', "  Source shipment found: Vendor={$sourceShipment['Vendor']}, Batch={$sourceShipment['Batch']}");
                      }
                  }

                  if (!$sourceShipment) {
                      throw new Exception("Source shipment not found for ShipmentID {$sourceShipmentID}");
                  }

                  foreach ($changedWeeks as $weekIdx => $weekChange) {
                      try {
                          $mode = strtolower(trim($weekChange['mode'] ?? 'unknown'));
                          $weekLabel = $weekChange['week'] ?? '';
                          $qtyImported = (int)($weekChange['qty_imported'] ?? 0);
                          $qtyExisting = (int)($weekChange['qty_existing'] ?? 0);
                          $shipmentDateImported = $weekChange['shipment_date_imported'] ?? null;
                          $shipmentDateExisting = $weekChange['shipment_date_existing'] ?? null;
                          $existingShipments = $weekChange['existingShipments'] ?? [];
                          //  Split lintas WW (row-level): dipasangkan dari week lain di baris yang
                          // sama yang datanya "muncul baru" (insert). Kalau field ini ada, artinya
                          // qty yang benar-benar berpindah = qty_moved (bukan qty_imported minggu ini),
                          // dan tujuan split adalah week_move_to/shipment_date_move_to.
                          $qtyMoved = isset($weekChange['qty_moved']) ? (int)$weekChange['qty_moved'] : null;
                          $weekMoveTo = $weekChange['week_move_to'] ?? null;
                          $shipmentDateMoveTo = $weekChange['shipment_date_move_to'] ?? null;

                          log_message('info', "  Processing week {$weekLabel}: mode={$mode}, qty {$qtyExisting}->{$qtyImported}");

                          if ($qtyExisting == $qtyImported && $mode !== 'full_move') {
                              log_message('info', "    Skip week {$weekLabel} - no real change (qty same)");
                              continue;
                          }

                          if ($mode === 'update_same' && $qtyExisting == $qtyImported) {
                              log_message('info', "    Skip week {$weekLabel} - update_same with same qty");
                              continue;
                          }

                          $sourceShipmentData = $weekChange['sourceShipmentData'] ?? [];
                          $isPOPlan = false;
                          $docID = null;
                          $poType = null;

                          $closedValue = (int)($sourceShipmentData['closed'] ?? 0);
                          $weekBlanketID = $sourceShipmentData['BlanketID'] ?? null;
                          $weekPOID = $sourceShipmentData['POID'] ?? null;

                          if (!empty($weekBlanketID) && intval($weekBlanketID) > 0) {
                              $isPOPlan = true;
                              $docID = $weekBlanketID;
                              $poType = 'blanket';
                              log_message('info', "    Week {$weekLabel}: Detected as BLANKET (BlanketID={$weekBlanketID})");
                          } elseif (!empty($weekPOID) && intval($weekPOID) > 0) {
                              $isPOPlan = true;
                              $docID = $weekPOID;
                              $poType = 'po';
                              log_message('info', "    Week {$weekLabel}: Detected as PO (POID={$weekPOID})");
                          } elseif ($closedValue === 2) {
                              $fallbackDocID = !empty($weekPOID) ? $weekPOID : $poID;
                              if (!empty($fallbackDocID) && intval($fallbackDocID) > 0) {
                                  $isPOPlan = true;
                                  $docID = $fallbackDocID;
                                  $poType = 'po';
                                  log_message('info', "    Week {$weekLabel}: Detected as PO (closed=2 fallback, DocID={$docID})");
                              }
                          } elseif ($closedValue === 1) {
                              $fallbackDocID = !empty($weekBlanketID) ? $weekBlanketID : $blanketID;
                              if (!empty($fallbackDocID) && intval($fallbackDocID) > 0) {
                                  $isPOPlan = true;
                                  $docID = $fallbackDocID;
                                  $poType = 'blanket';
                                  log_message('info', "    Week {$weekLabel}: Detected as BLANKET (closed=1 fallback, DocID={$docID})");
                              }
                          }

                          $weekShipmentID = $sourceShipmentID;
                          if (!empty($existingShipments) && is_array($existingShipments)) {
                              foreach ($existingShipments as $shipment) {
                                  if (!empty($shipment['shipmentId'])) {
                                      $weekShipmentID = $shipment['shipmentId'];
                                      break;
                                  }
                              }
                          }

                          $weekItemID = $sourceShipmentData['ItemID'] ?? $itemID;
                          $weekItemUnitID = $sourceShipmentData['ItemUnitID'] ?? $itemUnitID;
                          $weekSourceShipment = $sourceShipment;
                          $sourceIsFromPOPlan = isset($sourceShipment['DocID']) && !array_key_exists('Vendor', $sourceShipment);

                          if ($isPOPlan) {
                              $hasConcreteShipmentID = !empty($existingShipments) && is_array($existingShipments) && (int)$weekShipmentID !== (int)$sourceShipmentID;

                              if ($hasConcreteShipmentID) {
                                  $weekSourceShipment = $this->db->select('*')
                                      ->where('ID', $weekShipmentID)
                                      ->get('tPOPlan')
                                      ->row_array();

                                  if (!$weekSourceShipment) {
                                      $fallbackShipment = $this->db->select('*')
                                          ->where('ID', $weekShipmentID)
                                          ->get('dbtPurchasePlanDtlShipment')
                                          ->row_array();
                                      if ($fallbackShipment) {
                                          $weekSourceShipment = $fallbackShipment;
                                          $isPOPlan = false;
                                          log_message('info', "    Week {$weekLabel}: ID {$weekShipmentID} di dbtPurchasePlanDtlShipment, isPOPlan=false");
                                      }
                                  }
                              } else {
                                  $rowLevelDocID = !empty($poID) ? $poID : (!empty($blanketID) ? $blanketID : null);
                                  if (!$sourceIsFromPOPlan || (int)$docID !== (int)$rowLevelDocID) {
                                      $weekSourceShipment = $this->db->select('*')
                                          ->where('DocID', $docID)
                                          ->where('ItemID', $weekItemID)
                                          ->where('ItemUnitID', $weekItemUnitID)
                                          ->order_by('ID', 'DESC')
                                          ->limit(1)
                                          ->get('tPOPlan')
                                          ->row_array();
                                  }
                              }
                              if (!empty($weekSourceShipment['ID'])) {
                                  $weekShipmentID = $weekSourceShipment['ID'];
                              }
                          } else {
                              if ($sourceIsFromPOPlan || (int)$weekShipmentID !== (int)$sourceShipmentID) {
                                  $weekSourceShipment = $this->db->select('*')
                                      ->where('ID', $weekShipmentID)
                                      ->get('dbtPurchasePlanDtlShipment')
                                      ->row_array();
                              }
                          }

                          if (!$weekSourceShipment) {
                              throw new Exception("Source data not found for week {$weekLabel} (ID {$weekShipmentID})");
                          }

                          log_message('info', "  Executing mode {$mode} for week {$weekLabel}");
                          
                          switch ($mode) {
                              case 'insert':
                                  $this->_handle_insert_mode($weekSourceShipment, $purchasePlanID, $weekLabel, $qtyImported, $shipmentDateImported, $currentUserID, $isPOPlan, $docID, $poType);
                                  $results_by_mode['insert']++;
                                  break;

                              case 'update_same':
                              case 'overwrite_qty':
                                  $this->_handle_update_same_mode($weekShipmentID, $qtyImported, $weekLabel, $currentUserID, $isPOPlan, $docID);
                                  $results_by_mode[$mode]++;
                                  break;

                              case 'full_move':
                                  $dateForFullMove = !empty($weekChange['shipment_date_move_to']) 
                                      ? $weekChange['shipment_date_move_to'] 
                                      : $shipmentDateImported;
                                  $weekForFullMove = !empty($weekChange['week_move_to']) 
                                      ? $weekChange['week_move_to'] 
                                      : $weekLabel;
                                  
                                  log_message('info', "   FULL_MOVE: Using shipment_date_move_to={$dateForFullMove}, week_move_to={$weekForFullMove}");
                      
                                  $this->_handle_full_move_mode($weekShipmentID, $dateForFullMove, $weekForFullMove, $currentUserID, $isPOPlan, $docID, $weekSourceShipment);
                                  $results_by_mode['full_move']++;
                                  break;

                              case 'partial_split':
                                  $dateMoveTo = !empty($weekChange['shipment_date_move_to'])
                                      ? $weekChange['shipment_date_move_to']
                                      : $shipmentDateImported;
                                  $weekMoveTo = !empty($weekChange['week_move_to'])
                                      ? $weekChange['week_move_to']
                                      : $weekLabel;
                                  $qtyMoved = isset($weekChange['qty_moved']) && $weekChange['qty_moved'] !== null
                                      ? (int)$weekChange['qty_moved']
                                      : null;

                                  log_message('info', "   PARTIAL_SPLIT: Using shipment_date_move_to={$dateMoveTo}, week_move_to={$weekMoveTo}, qty_moved=" . ($qtyMoved ?? 'null(fallback ke qtyExisting-qtyImported)'));

                                  $this->_handle_partial_split_mode($weekShipmentID, $weekSourceShipment, $purchasePlanID, $qtyImported, $qtyExisting, $dateMoveTo, $weekMoveTo, $currentUserID, $isPOPlan, $docID, $qtyMoved);
                                  $results_by_mode['partial_split']++;
                                  break;

                              case 'override':
                                  $this->_handle_override_mode($weekShipmentID, $weekSourceShipment, $purchasePlanID, $qtyImported, $shipmentDateImported, $weekLabel, $currentUserID, $isPOPlan, $docID);
                                  $results_by_mode['override']++;
                                  break;

                              case 'delete':
                                  $this->_handle_delete_mode($weekShipmentID, $weekLabel, $currentUserID, $isPOPlan, $docID, $existingShipments);
                                  $results_by_mode['delete']++;
                                  break;

                              default:
                                  throw new Exception("Unknown mode: {$mode}");
                          }

                          log_message('info', " Mode {$mode} processed successfully");

                      } catch (Throwable $weekEx) {
                          $errors[] = "Week {$weekLabel} ({$mode}): " . $weekEx->getMessage();
                          log_message('error', "Week processing error: " . $weekEx->getMessage());
                      }
                  }

              } catch (Throwable $changeEx) {
                  $errors[] = "Change {$changeIdx}: " . $changeEx->getMessage();
                  log_message('error', "Change processing error: " . $changeEx->getMessage());
              }
          }

          $this->db->trans_complete();

          if ($this->db->trans_status() === FALSE) {
              throw new Exception('Transaction failed');
          }

          log_message('info', "=== IMPORT END ===");
          log_message('info', 'Results by mode: ' . json_encode($results_by_mode));

          http_response_code(200);
          echo json_encode([
              'status' => 'success',
              'total_processed' => count($groupedChanges),
              'results_by_mode' => $results_by_mode,
              'errors' => $errors,
              'message' => 'Import completed successfully',
              'debug_logs' => $debugLogs
          ]);

      } catch (Throwable $e) {
          $this->db->trans_rollback();
          
          $exceptionMsg = $e->getMessage();
          $debugLogs[] = '[EXCEPTION] ' . $exceptionMsg;
          $debugLogs[] = '[FILE] ' . $e->getFile() . ':' . $e->getLine();
          
          log_message('error', '=== IMPORT EXCEPTION ===');
          log_message('error', 'Message: ' . $exceptionMsg);
          log_message('error', 'File: ' . $e->getFile() . ':' . $e->getLine());
          log_message('error', 'Trace: ' . $e->getTraceAsString());
          
          http_response_code(500);
          echo json_encode([
              'status' => 'error',
              'message' => 'Server error: ' . $exceptionMsg,
              'debug_logs' => $debugLogs
          ]);
      }
  }

  private function _validate_week_duplicates($changes)
  {
      $errors = [];
      $weekGroups = [];

      foreach ($changes as $change) {
          $changedWeeks = $change['changedWeeks'] ?? [];
          
          foreach ($changedWeeks as $weekChange) {
              $isModified = isset($weekChange['_isUserModified']) && $weekChange['_isUserModified'] === true;
              
              if (!$isModified) {
                  continue;
              }

              $week = $weekChange['week'] ?? '';
              if (empty($week)) {
                  continue;
              }

              if (!isset($weekGroups[$week])) {
                  $weekGroups[$week] = [];
              }

              $weekGroups[$week][] = [
                  'shipmentId' => $change['ShipmentID'] ?? null,
                  'mode' => $weekChange['mode'] ?? 'unknown',
                  'qty' => $weekChange['qty_imported'] ?? 0
              ];
          }
      }

      foreach ($weekGroups as $week => $items) {
          if (count($items) > 1) {
              $shipmentIds = array_unique(array_column($items, 'shipmentId'));
              $shipmentIds = array_filter($shipmentIds);
              
              if (!empty($shipmentIds)) {
                  $errors[] = "Minggu {$week} terdiri dari beberapa data (ShipmentID: " . implode(', ', $shipmentIds) . "). Harap ubah di website.";
              } else {
                  $errors[] = "Minggu {$week} terdiri dari beberapa data. Harap ubah di website.";
              }
          }
      }

      return $errors;
  }

  private function _handle_insert_mode($sourceShipment, $purchasePlanID, $weekLabel, $qtyImported, $shipmentDate, $currentUserID, $isPOPlan = false, $docID = null, $poType = null)
  {
    $mondayDate = $this->_parse_week_date($weekLabel, $shipmentDate);

    if ($isPOPlan) {
      $docType = $sourceShipment['DocType'] ?? null;
      if (!$docType) {
        if ($poType === 'blanket') {
          $docType = 'SPBLK';
        } elseif ($poType === 'po') {
          $docType = 'SPORD';
        } else {
          $docType = null;
        }
      }
      
      $reffShipmentID = $sourceShipment['ReffShipmentID'] ?? null;
      if (!$reffShipmentID && $poType === 'blanket') {
        // Cari dari tabel dbtPurchasePlanDtlShipment tempat BlanketID = $docID
        $blanketShipment = $this->db->select('ID')
          ->where('BlanketID', $docID)
          ->where('ItemID', $sourceShipment['ItemID'])
          ->where('ItemUnitID', $sourceShipment['ItemUnitID'])
          ->limit(1)
          ->get('dbtPurchasePlanDtlShipment')
          ->row_array();
        
        if ($blanketShipment) {
          $reffShipmentID = $blanketShipment['ID'];
          log_message('info', "  Found ReffShipmentID from Blanket shipment: {$reffShipmentID}");
        }
      }
      
      $poData = [
        'DocID' => $docID,
        'DocType' => $docType,
        'ItemID' => $sourceShipment['ItemID'],
        'ItemUnitID' => $sourceShipment['ItemUnitID'],
        'Qty' => $qtyImported,
        'ETD' => $mondayDate,
        'ReffShipmentID' => $reffShipmentID
      ];

      $this->db->insert('tPOPlan', $poData);
      $newPOID = $this->db->insert_id();

      if (!$newPOID) {
        throw new Exception("Failed to insert tPOPlan row");
      }

      // Recalc aging untuk PO/Blanket
      $this->pom->recalc_aging_by_docid($docID);
      //  Recalc item trans untuk update dbtItemTrans
      $this->pom->recalc_item_trans_by_docid_and_item($docID, $sourceShipment['ItemID'], $sourceShipment['ItemUnitID']);

      log_message('info', " INSERT PO: New tPOPlan {$newPOID} created for DocID={$docID}, DocType={$docType}, ReffShipmentID={$reffShipmentID}, qty {$qtyImported}");
    } else {
      // Original dbtPurchasePlanDtlShipment logic
      $shipmentData = [
        'Vendor' => $sourceShipment['Vendor'],
        'ItemID' => $sourceShipment['ItemID'],
        'ItemUnitID' => $sourceShipment['ItemUnitID'],
        'PurchasePlanID' => $purchasePlanID,
        'Color' => $sourceShipment['Color'],
        'Price' => $sourceShipment['Price'],
        'PODateEst' => $sourceShipment['PODateEst'],
        'Term' => $sourceShipment['Term'],
        'Batch' => 0,
        'BlanketID' => $sourceShipment['BlanketID'],
        'POID' => $sourceShipment['POID'],
        'Closed' => 0,
        'ShipmentDate' => $mondayDate,
        'Qty' => $qtyImported,

      ];

      $this->db->insert('dbtPurchasePlanDtlShipment', $shipmentData);
      $newShipmentID = $this->db->insert_id();

      if (!$newShipmentID) {
        throw new Exception("Failed to insert shipment");
      }

      // Insert ke dbtPurchasePlanDtlShipmentWeek
      $weekData = [
        'PurchasePlanID' => $purchasePlanID,
        'PurchasePlanDtlShipmentID' => $newShipmentID,
        'WeekID' => $weekLabel,
        'ShipmentDate' => $mondayDate,
        'Qty' => $qtyImported
      ];
      $this->db->insert('dbtPurchasePlanDtlShipmentWeek', $weekData);

      // Insert ke history
      $this->_insert_history($newShipmentID, $sourceShipment, $purchasePlanID, $qtyImported, $mondayDate, $currentUserID);

      log_message('info', " INSERT: New shipment {$newShipmentID} created with qty {$qtyImported}");
    }
  }

  private function _handle_update_same_mode($sourceShipmentID, $newQty, $weekLabel, $currentUserID, $isPOPlan = false, $docID = null)
  {
    if ($isPOPlan) {
      //  UPDATE tPOPlan
      $existing = $this->db->select('ETD, ItemID, ItemUnitID, DocID')
        ->where('ID', $sourceShipmentID)
        ->get('tPOPlan')
        ->row_array();

      $currentETD = $existing['ETD'] ?? date('Y-m-d');
      $ok = $this->pom->update_po_plan_row($sourceShipmentID, $newQty, $currentETD);

      if (!$ok) {
        throw new Exception("Failed to update tPOPlan ID {$sourceShipmentID}");
      }

      // Recalc aging untuk PO/Blanket
      $docIDForSync = $existing['DocID'] ?? $docID;
      $this->pom->recalc_aging_by_docid($docIDForSync);
      
      //  Recalc item trans untuk update dbtItemTrans
      $existingItemID = $existing['ItemID'] ?? null;
      $existingItemUnitID = $existing['ItemUnitID'] ?? null;
      if (!empty($existingItemID)) {
        $this->pom->recalc_item_trans_by_docid_and_item($docIDForSync, $existingItemID, $existingItemUnitID);
      }

      log_message('info', " UPDATE_SAME PO: tPOPlan {$sourceShipmentID} qty updated to {$newQty}");
    } else {

      $shipment = $this->db->select('*')
        ->where('ID', $sourceShipmentID)
        ->get('dbtPurchasePlanDtlShipment')
        ->row_array();

      $oldQty = $shipment['Qty'] ?? 0;

      // Update dbtPurchasePlanDtlShipment
      $this->db->update('dbtPurchasePlanDtlShipment',
        ['Qty' => $newQty],
        ['ID' => $sourceShipmentID]
      );

      // Update dbtPurchasePlanDtlShipmentWeek
      $this->db->update('dbtPurchasePlanDtlShipmentWeek',
        ['Qty' => $newQty],
        ['PurchasePlanDtlShipmentID' => $sourceShipmentID, 'WeekID' => $weekLabel]
      );

      // Update history record lama - set EndDate untuk tandai tidak aktif lagi
      $now = date('Y-m-d H:i:s');
      $this->db->update('dbtPurchasePlanDtlShipmentHistory',
        ['EndDate' => $now],
        ['ShipmentID' => $sourceShipmentID, 'EndDate' => null]
      );

      // Record history - insert record baru dengan qty yang sudah diupdate
      $historyData = [
        'ShipmentID' => (int)$sourceShipmentID,
        'Vendor' => (int)$shipment['Vendor'],
        'ItemID' => (int)$shipment['ItemID'],
        'ItemUnitID' => (int)$shipment['ItemUnitID'],
        'PurchasePlanID' => (int)$shipment['PurchasePlanID'],
        'Color' => $shipment['Color'] ?? null,
        'ShipmentDate' => $shipment['ShipmentDate'],
        'Qty' => (int)$newQty,
        'Price' => $shipment['Price'] ?? null,
        'PODateEst' => $shipment['PODateEst'] ?? null,
        'Term' => $shipment['Term'] ?? null,
        'Batch' => $shipment['Batch'] ?? null,
        'BlanketID' => $shipment['BlanketID'] ?? null,
        'POID' => $shipment['POID'] ?? null,
        'Closed' => (int)$shipment['Closed'],
        'StartDate' => $now,
        'EndDate' => null,
        'EditDate' => $now,
        'EditUserID' => (int)$currentUserID,
      ];
      $this->db->insert('dbtPurchasePlanDtlShipmentHistory', $historyData);

      log_message('info', " UPDATE_SAME: Shipment {$sourceShipmentID} qty updated {$oldQty} -> {$newQty}");
    }
  }

  private function _handle_full_move_mode($sourceShipmentID, $newShipmentDate, $newWeekLabel, $currentUserID, $isPOPlan = false, $docID = null, $sourceShipment = null, $existingShipments = null)
  {
    $mondayDate = $this->_parse_week_date($newWeekLabel, $newShipmentDate);
    $shipmentIDsToMove = [];
    if (!empty($existingShipments) && is_array($existingShipments)) {
      foreach ($existingShipments as $existingShipment) {
        $sid = $existingShipment['shipmentId'] ?? $existingShipment['shipmentID'] ?? null;
        if (!empty($sid)) {
          $shipmentIDsToMove[] = $sid;
        }
      }
    }
    if (empty($shipmentIDsToMove)) {
      $shipmentIDsToMove[] = $sourceShipmentID;
    }
    $shipmentIDsToMove = array_values(array_unique($shipmentIDsToMove));

    if ($isPOPlan) {
      foreach ($shipmentIDsToMove as $sid) {
        //  UPDATE tPOPlan dengan ETD baru (Qty tetap, update ETD saja)
        $ok = $this->pom->update_po_plan_row($sid, null, $mondayDate);

        if (!$ok) {
          throw new Exception("Failed to update tPOPlan ID {$sid} for full_move");
        }

        log_message('info', " FULL_MOVE PO: tPOPlan {$sid} ETD updated to {$mondayDate}");
      }

      // Recalc aging untuk PO/Blanket
      $this->pom->recalc_aging_by_docid($docID);

      $itemID = null;
      $itemUnitID = null;

      if ($sourceShipment && !empty($sourceShipment['ItemID'])) {
        $itemID = $sourceShipment['ItemID'];
        $itemUnitID = $sourceShipment['ItemUnitID'];
      } else {
        $existingRow = $this->db->select('ItemID, ItemUnitID, DocID')
          ->where('ID', $sourceShipmentID)
          ->get('tPOPlan')
          ->row_array();
        if ($existingRow) {
          $itemID = $existingRow['ItemID'];
          $itemUnitID = $existingRow['ItemUnitID'];
          if (!$docID) $docID = $existingRow['DocID'];
        }
      }

      if ($itemID && $itemUnitID) {
        $this->pom->recalc_item_trans_by_docid_and_item($docID, $itemID, $itemUnitID);
      }
    } else {
      // Original dbtPurchasePlanDtlShipment logic - sekarang loop utk setiap shipment
      foreach ($shipmentIDsToMove as $sid) {
        // Get existing shipment untuk copy master data
        $shipment = $this->db->select('*')
          ->where('ID', $sid)
          ->get('dbtPurchasePlanDtlShipment')
          ->row_array();

        if (!$shipment) {
          log_message('warn', " FULL_MOVE: Shipment {$sid} not found, skip");
          continue;
        }

        $oldDate = $shipment['ShipmentDate'];
        $qty = $shipment['Qty'];

        // Delete old week record
        $this->db->delete('dbtPurchasePlanDtlShipmentWeek',
          ['PurchasePlanDtlShipmentID' => $sid]
        );

        // Delete shipment lama dari dbtPurchasePlanDtlShipment (benar-benar dihapus)
        $this->db->delete('dbtPurchasePlanDtlShipment',
          ['ID' => $sid]
        );

        // Create shipment baru dengan master data yang sama
        $newShipmentData = [
          'Vendor' => $shipment['Vendor'],
          'ItemID' => $shipment['ItemID'],
          'ItemUnitID' => $shipment['ItemUnitID'],
          'PurchasePlanID' => $shipment['PurchasePlanID'],
          'Color' => $shipment['Color'],
          'Price' => $shipment['Price'],
          'PODateEst' => $shipment['PODateEst'],
          'Term' => $shipment['Term'],
          'Batch' => $shipment['Batch'],
          'BlanketID' => $shipment['BlanketID'],
          'POID' => $shipment['POID'],
          'Closed' => 0,
          'ShipmentDate' => $mondayDate,
          'Qty' => $qty
        ];

        $this->db->insert('dbtPurchasePlanDtlShipment', $newShipmentData);
        $newShipmentID = $this->db->insert_id();

        // Insert new week record untuk shipment baru
        $weekData = [
          'PurchasePlanID' => $shipment['PurchasePlanID'],
          'PurchasePlanDtlShipmentID' => $newShipmentID,
          'WeekID' => $newWeekLabel,
          'ShipmentDate' => $mondayDate,
          'Qty' => $qty
        ];
        $this->db->insert('dbtPurchasePlanDtlShipmentWeek', $weekData);

        $now = date('Y-m-d H:i:s');
        $this->db->update('dbtPurchasePlanDtlShipmentHistory',
          ['EndDate' => $now],
          ['ShipmentID' => $sid, 'EndDate' => null]
        );

        $historyData = [
          'ShipmentID' => (int)$newShipmentID,
          'Vendor' => (int)$shipment['Vendor'],
          'ItemID' => (int)$shipment['ItemID'],
          'ItemUnitID' => (int)$shipment['ItemUnitID'],
          'PurchasePlanID' => (int)$shipment['PurchasePlanID'],
          'Color' => $shipment['Color'] ?? null,
          'ShipmentDate' => $mondayDate,
          'Qty' => (int)$qty,
          'Price' => $shipment['Price'] ?? null,
          'PODateEst' => $shipment['PODateEst'] ?? null,
          'Term' => $shipment['Term'] ?? null,
          'Batch' => $shipment['Batch'] ?? null,
          'BlanketID' => $shipment['BlanketID'] ?? null,
          'POID' => $shipment['POID'] ?? null,
          'Closed' => 0,
          'StartDate' => $now,
          'EndDate' => null,
          'EditDate' => $now,
          'EditUserID' => (int)$currentUserID,
        ];
        $this->db->insert('dbtPurchasePlanDtlShipmentHistory', $historyData);

        log_message('info', " FULL_MOVE: Shipment {$sid} deleted, new {$newShipmentID} created from {$oldDate} to {$mondayDate}");
      }
    }
  }

  private function _handle_partial_split_mode($sourceShipmentID, $sourceShipment, $purchasePlanID, $qtyImported, $qtyExisting, $newShipmentDate, $newWeekLabel, $currentUserID, $isPOPlan = false, $docID = null, $qtyMoved = null)
  {
      // $qtyImported  = qty yang TETAP tinggal di minggu/tanggal ASAL (tidak berubah tanggal)
      // $qtySplitOff  = qty yang PINDAH ke minggu/tanggal TUJUAN ($newShipmentDate/$newWeekLabel)
      //
      // Dulu kode di bawah ini menyimpan qty yang salah di masing-masing baris
      // (row asal malah disimpan qtySplitOff, row baru malah disimpan qtyImported)
      // dan $newShipmentDate/$newWeekLabel selalu berisi tanggal minggu asal itu
      // sendiri (bukan tujuan split yang sebenarnya) karena dispatcher belum
      // mengirim tujuan split yang benar. Sekarang $newShipmentDate/$newWeekLabel
      // adalah tujuan split yang sebenarnya (lihat pemanggil), dan qty yang
      // dipindah pakai $qtyMoved kalau tersedia (hasil deteksi pasangan
      // berkurang+insert baru di baris yang sama), fallback ke selisih qty.
      $qtySplitOff = $qtyMoved !== null ? $qtyMoved : ($qtyExisting - $qtyImported);
      $mondayDate = $this->_parse_week_date($newWeekLabel, $newShipmentDate);

      if ($qtySplitOff <= 0) {
          throw new Exception("Invalid split: qty yang dipindah harus > 0, got {$qtySplitOff}");
      }

      if ($isPOPlan) {

          $existing = $this->db->select('ETD, ItemID, ItemUnitID, DocID')
              ->where('ID', $sourceShipmentID)
              ->get('tPOPlan')
              ->row_array();

          $currentETD = $existing['ETD'] ?? date('Y-m-d');
          $ok1 = $this->pom->update_po_plan_row($sourceShipmentID, $qtyImported, $currentETD);  // qty yang tetap tinggal, ETD tetap sama
          $ok2 = $this->pom->insert_po_plan_row($qtySplitOff, $mondayDate, $sourceShipmentID);  // qty yang pindah, di tanggal tujuan

          if (!$ok1 || !$ok2) {
              throw new Exception("Failed to split tPOPlan {$sourceShipmentID}");
          }

          // Recalc aging untuk PO/Blanket
          $docIDForSync = $existing['DocID'] ?? $docID;
          $this->pom->recalc_aging_by_docid($docIDForSync);

          $itemID = $sourceShipment['ItemID'] ?? $existing['ItemID'];
          $itemUnitID = $sourceShipment['ItemUnitID'] ?? $existing['ItemUnitID'];

          if ($itemID && $itemUnitID) {
              $this->pom->recalc_item_trans_by_docid_and_item($docIDForSync, $itemID, $itemUnitID);
          }

          log_message('info', " PARTIAL_SPLIT PO: tPOPlan {$sourceShipmentID} split into {$qtyImported} (tetap) + {$qtySplitOff} (pindah ke {$mondayDate})");
      } else {
          $this->db->update('dbtPurchasePlanDtlShipment',
              ['Qty' => $qtyImported],
              ['ID' => $sourceShipmentID]
          );

          // Update week record untuk shipment lama (qty yang tetap tinggal)
          $this->db->update('dbtPurchasePlanDtlShipmentWeek',
              ['Qty' => $qtyImported],
              ['PurchasePlanDtlShipmentID' => $sourceShipmentID]
          );

          // Create new shipment untuk qty yang pindah, di tanggal/minggu TUJUAN
          $newShipmentData = [
              'Vendor' => $sourceShipment['Vendor'],
              'ItemID' => $sourceShipment['ItemID'],
              'ItemUnitID' => $sourceShipment['ItemUnitID'],
              'PurchasePlanID' => $purchasePlanID,
              'Color' => $sourceShipment['Color'],
              'Price' => $sourceShipment['Price'],
              'PODateEst' => $sourceShipment['PODateEst'],
              'Term' => $sourceShipment['Term'],
              'Batch' => $sourceShipment['Batch'],
              'BlanketID' => $sourceShipment['BlanketID'],
              'POID' => $sourceShipment['POID'],
              'Closed' => 0,
              'ShipmentDate' => $mondayDate,
              'Qty' => $qtySplitOff
          ];

          $this->db->insert('dbtPurchasePlanDtlShipment', $newShipmentData);
          $newShipmentID = $this->db->insert_id();

          // Insert week record untuk shipment baru (di minggu/tanggal tujuan)
          $weekData = [
              'PurchasePlanID' => $purchasePlanID,
              'PurchasePlanDtlShipmentID' => $newShipmentID,
              'WeekID' => $newWeekLabel,
              'ShipmentDate' => $mondayDate,
              'Qty' => $qtySplitOff
          ];
          $this->db->insert('dbtPurchasePlanDtlShipmentWeek', $weekData);

          // Update history record lama - set EndDate untuk tandai tidak aktif lagi
          $now = date('Y-m-d H:i:s');
          $this->db->update('dbtPurchasePlanDtlShipmentHistory',
              ['EndDate' => $now],
              ['ShipmentID' => $sourceShipmentID, 'EndDate' => null]
          );

          // Insert history baru untuk shipment lama dengan qty yang tetap tinggal
          $historyOld = [
              'ShipmentID' => (int)$sourceShipmentID,
              'Vendor' => (int)$sourceShipment['Vendor'],
              'ItemID' => (int)$sourceShipment['ItemID'],
              'ItemUnitID' => (int)$sourceShipment['ItemUnitID'],
              'PurchasePlanID' => (int)$purchasePlanID,
              'Color' => $sourceShipment['Color'] ?? null,
              'ShipmentDate' => $sourceShipment['ShipmentDate'],
              'Qty' => (int)$qtyImported,
              'Price' => $sourceShipment['Price'] ?? null,
              'PODateEst' => $sourceShipment['PODateEst'] ?? null,
              'Term' => $sourceShipment['Term'] ?? null,
              'Batch' => $sourceShipment['Batch'] ?? null,
              'BlanketID' => $sourceShipment['BlanketID'] ?? null,
              'POID' => $sourceShipment['POID'] ?? null,
              'Closed' => 0,
              'StartDate' => $now,
              'EndDate' => null,
              'EditDate' => $now,
              'EditUserID' => (int)$currentUserID,
          ];
          $this->db->insert('dbtPurchasePlanDtlShipmentHistory', $historyOld);

          // Record history untuk shipment baru (qty yang pindah)
          $this->_insert_history($newShipmentID, $sourceShipment, $purchasePlanID, $qtySplitOff, $mondayDate, $currentUserID);

          log_message('info', " PARTIAL_SPLIT: Shipment {$sourceShipmentID} split into {$qtyImported} (tetap) + {$qtySplitOff} (pindah, new: {$newShipmentID} di {$mondayDate})");
      }
  }

  private function _handle_override_mode($sourceShipmentID, $sourceShipment, $purchasePlanID, $qtyImported, $newShipmentDate, $newWeekLabel, $currentUserID, $isPOPlan = false, $docID = null)
  {
    $mondayDate = $this->_parse_week_date($newWeekLabel, $newShipmentDate);

    if ($isPOPlan) {
      //  OVERRIDE tPOPlan: Update qty dan ETD
      $ok = $this->pom->update_po_plan_row($sourceShipmentID, $qtyImported, $mondayDate);

      if (!$ok) {
        throw new Exception("Failed to update tPOPlan ID {$sourceShipmentID} for override");
      }

      // Recalc aging untuk PO/Blanket
      $this->pom->recalc_aging_by_docid($docID);
      
      $itemID = null;
      $itemUnitID = null;
      
      if ($sourceShipment && !empty($sourceShipment['ItemID'])) {
        $itemID = $sourceShipment['ItemID'];
        $itemUnitID = $sourceShipment['ItemUnitID'];
      } else {
        $existingRow = $this->db->select('ItemID, ItemUnitID, DocID')
          ->where('ID', $sourceShipmentID)
          ->get('tPOPlan')
          ->row_array();
        if ($existingRow) {
          $itemID = $existingRow['ItemID'];
          $itemUnitID = $existingRow['ItemUnitID'];
          if (!$docID) $docID = $existingRow['DocID'];
        }
      }
      
      if ($itemID && $itemUnitID) {
        $this->pom->recalc_item_trans_by_docid_and_item($docID, $itemID, $itemUnitID);
      }

      log_message('info', " OVERRIDE PO: tPOPlan {$sourceShipmentID} updated with qty {$qtyImported} and ETD {$mondayDate}");
    } else {
      // Original dbtPurchasePlanDtlShipment logic
      // Delete old week record
      $this->db->delete('dbtPurchasePlanDtlShipmentWeek',
        ['PurchasePlanDtlShipmentID' => $sourceShipmentID]
      );

      // Delete shipment lama dari dbtPurchasePlanDtlShipment (benar-benar dihapus)
      $this->db->delete('dbtPurchasePlanDtlShipment',
        ['ID' => $sourceShipmentID]
      );

      // Create shipment baru
      $newShipmentData = [
        'Vendor' => $sourceShipment['Vendor'],
        'ItemID' => $sourceShipment['ItemID'],
        'ItemUnitID' => $sourceShipment['ItemUnitID'],
        'PurchasePlanID' => $purchasePlanID,
        'Color' => $sourceShipment['Color'],
        'Price' => $sourceShipment['Price'],
        'PODateEst' => $sourceShipment['PODateEst'],
        'Term' => $sourceShipment['Term'],
        'Batch' => $sourceShipment['Batch'],
        'BlanketID' => $sourceShipment['BlanketID'],
        'POID' => $sourceShipment['POID'],
        'Closed' => 0,
        'ShipmentDate' => $mondayDate,
        'Qty' => $qtyImported
      ];

      $this->db->insert('dbtPurchasePlanDtlShipment', $newShipmentData);
      $newShipmentID = $this->db->insert_id();

      // Insert week record untuk shipment baru
      $weekData = [
        'PurchasePlanID' => $purchasePlanID,
        'PurchasePlanDtlShipmentID' => $newShipmentID,
        'WeekID' => $newWeekLabel,
        'ShipmentDate' => $mondayDate,
        'Qty' => $qtyImported
      ];
      $this->db->insert('dbtPurchasePlanDtlShipmentWeek', $weekData);

      // Update history record lama - set EndDate untuk tandai tidak aktif lagi
      $now = date('Y-m-d H:i:s');
      $this->db->update('dbtPurchasePlanDtlShipmentHistory',
        ['EndDate' => $now],
        ['ShipmentID' => $sourceShipmentID, 'EndDate' => null]
      );

      // Record history untuk shipment baru
      $this->_insert_history($newShipmentID, $sourceShipment, $purchasePlanID, $qtyImported, $mondayDate, $currentUserID);

      log_message('info', "     OVERRIDE: Shipment {$sourceShipmentID} deleted, new {$newShipmentID} created with qty {$qtyImported}");
    }
  }

  private function _handle_delete_mode($sourceShipmentID, $weekLabel, $currentUserID, $isPOPlan = false, $docID = null, $existingShipments = null)
  {
    if ($isPOPlan) {
      $poIDsToDelete = [];
      if (!empty($existingShipments) && is_array($existingShipments)) {
        foreach ($existingShipments as $existingShipment) {
          $sid = $existingShipment['shipmentId'] ?? $existingShipment['shipmentID'] ?? null;
          if (!empty($sid)) {
            $poIDsToDelete[] = $sid;
          }
        }
      }
      if (empty($poIDsToDelete)) {
        $poIDsToDelete[] = $sourceShipmentID;
      }
      $poIDsToDelete = array_values(array_unique($poIDsToDelete));

      $docIDForSync = $docID;
      foreach ($poIDsToDelete as $poIDToDelete) {
        $poRow = $this->db->select('ItemID, ItemUnitID, DocID')
          ->where('ID', $poIDToDelete)
          ->get('tPOPlan')
          ->row_array();

        if (!$poRow) {
          log_message('warn', "   tPOPlan {$poIDToDelete} not found for deletion");
          continue;
        }

        $this->db->delete('tPOPlan', ['ID' => $poIDToDelete]);

        $docIDForSync = $poRow['DocID'];
        $this->pom->recalc_aging_by_docid($docIDForSync);
        $this->pom->recalc_item_trans_by_docid_and_item($docIDForSync, $poRow['ItemID'], $poRow['ItemUnitID']);

        log_message('info', "   tPOPlan {$poIDToDelete} deleted from database");
      }
    } else {
      $shipmentIDsToDelete = [];
      
      if (!empty($existingShipments) && is_array($existingShipments)) {
        
        foreach ($existingShipments as $existingShipment) {
          $shipmentIDToDelete = $existingShipment['shipmentId'] ?? $existingShipment['shipmentID'] ?? null;
          if (!empty($shipmentIDToDelete)) {
            $shipmentIDsToDelete[] = $shipmentIDToDelete;
          }
        }
      }
      
      if (empty($shipmentIDsToDelete)) {
        $shipmentIDsToDelete[] = $sourceShipmentID;
      }
      
      log_message('info', "   DELETE: Processing " . count($shipmentIDsToDelete) . " shipment(s): " . implode(', ', $shipmentIDsToDelete));
      
      foreach ($shipmentIDsToDelete as $shipmentIDToDelete) {
        // Get shipment untuk audit
        $shipment = $this->db->select('*')
          ->where('ID', $shipmentIDToDelete)
          ->get('dbtPurchasePlanDtlShipment')
          ->row_array();

        if ($shipment) {
          $this->db->delete('dbtPurchasePlanDtlShipmentWeek',
            ['PurchasePlanDtlShipmentID' => $shipmentIDToDelete]
          );
          $this->db->delete('dbtPurchasePlanDtlShipmentHistory',
            ['ShipmentID' => $shipmentIDToDelete]
          );

          $this->db->delete('dbtPurchasePlanDtlShipment',
            ['ID' => $shipmentIDToDelete]
          );

          log_message('info', "   Shipment {$shipmentIDToDelete} deleted from all 3 tables");
        } else {
          log_message('warn', "   Shipment {$shipmentIDToDelete} not found for deletion");
        }
      }
    }
  }


  private function _get_current_user_id()
  {
    $userID = $this->session->userdata('user_id')
      ?? $this->session->userdata('UserID')
      ?? $this->session->userdata('id')
      ?? null;

    if (!$userID) {
      log_message('warn', "Could not get user ID from session, defaulting to 1");
      $userID = 1;
    }

    return $userID;
  }

  private function _parse_week_date($weekLabel, $shipmentDate)
  {
    // Jika shipmentDate provided dan valid, gunakan itu
    if (!empty($shipmentDate)) {
      return $shipmentDate;
    }
    preg_match('/WW(\d{2})-(\d{2})/', $weekLabel, $matches);
    if (!$matches) {
      throw new Exception("Invalid week label format: {$weekLabel}");
    }

    $yearSuffix = (int)$matches[1];
    $weekNumber = (int)$matches[2];
    $fullYear = 2000 + $yearSuffix;

    // Calculate Monday of that week
    $date = new DateTime();
    $date->setISODate($fullYear, $weekNumber, 1);
    return $date->format('Y-m-d');
  }

  private function _insert_history($shipmentID, $sourceShipment, $purchasePlanID, $qty, $shipmentDate, $currentUserID)
  {
    $now = date('Y-m-d H:i:s');
    $historyData = [
      'ShipmentID' => (int)$shipmentID,
      'Vendor' => (int)$sourceShipment['Vendor'],
      'ItemID' => (int)$sourceShipment['ItemID'],
      'ItemUnitID' => (int)$sourceShipment['ItemUnitID'],
      'PurchasePlanID' => (int)$purchasePlanID,
      'Color' => $sourceShipment['Color'] ?? null,
      'ShipmentDate' => $shipmentDate,
      'Qty' => (int)$qty,
      'Price' => $sourceShipment['Price'] ?? null,
      'PODateEst' => $sourceShipment['PODateEst'] ?? null,
      'Term' => $sourceShipment['Term'] ?? null,
      'Batch' => $sourceShipment['Batch'] ?? null,
      'BlanketID' => $sourceShipment['BlanketID'] ?? null,
      'POID' => $sourceShipment['POID'] ?? null,
      'Closed' => 0,
      'StartDate' => $now,
      'EndDate' => null,
      'EditDate' => $now,
      'EditUserID' => (int)$currentUserID,
    ];

    $this->db->insert('dbtPurchasePlanDtlShipmentHistory', $historyData);
  }

  private function get_monday_of_week($year, $week)
  {
    try {
      $date = new DateTime();
      $date->setISODate($year, $week, 1); // 1 = Monday of that week
      return $date->format('Y-m-d');
    } catch (Exception $e) {
      log_message('error', "Error calculating Monday: " . $e->getMessage());
      // Fallback: return current date
      return date('Y-m-d');
    }
  }

  /**
   * Convert column number to Excel column letter
   * 1 = A, 26 = Z, 27 = AA, 52 = AZ, etc
   */
  private function getColumnLetter($colNum)
  {
    $letter = '';
    while ($colNum > 0) {
      $colNum--; // Adjust for 0-based indexing
      $letter = chr(65 + ($colNum % 26)) . $letter;
      $colNum = intdiv($colNum, 26);
    }
    return $letter;
  }


  public function export_purchase_plan_to_excel()
  {
    try {
    while (ob_get_level()) {
        ob_end_clean();
    }
      error_reporting(E_ALL);
      ini_set('display_errors', 0);

      // Initialize debug logs array to send to client
      $debugLogs = [];
      
      // Custom logging function that sends logs to both file AND client
      $log = function($level, $msg) use (&$debugLogs) {
        log_message($level, $msg);
        $debugLogs[] = '[' . strtoupper($level) . '] ' . $msg;
      };

      // Get JSON data using multiple methods
      $json = null;

      // Method 1: Use CodeIgniter's input library (BEST - handles php://input properly)
      $json = $this->input->raw_input_stream;
      $log('info', "raw_input_stream length: " . strlen($json ?? '') . " bytes");

      // Method 2: Fallback to file_get_contents (can only read once!)
      if (!$json || strlen($json) === 0) {
        $json = file_get_contents('php://input');
        $log('info', "Fallback file_get_contents length: " . strlen($json ?? '') . " bytes");
      }

      // Method 3: Try fopen as last resort
      if (!$json || strlen($json) === 0) {
        $inputStream = fopen('php://input', 'r');
        if ($inputStream) {
          $json = stream_get_contents($inputStream);
          fclose($inputStream);
          $log('info', "Fallback fopen length: " . strlen($json ?? '') . " bytes");
        }
      }

      $log('info', "Final JSON length: " . strlen($json ?? '') . " bytes");
      if ($json) {
        $log('info', "First 500 chars: " . substr($json, 0, 500));
      }

      if (!$json || strlen($json) === 0) {
        // Check if this is actually a GET redirect or something
        $log('error', "EMPTY BODY RECEIVED! REQUEST_METHOD=" . $_SERVER['REQUEST_METHOD'] . ", CONTENT_LENGTH=" . ($_SERVER['CONTENT_LENGTH'] ?? '0'));
        throw new Exception('No data received (empty request body). Content-Length: ' . ($_SERVER['CONTENT_LENGTH'] ?? '0') . ', REQUEST_METHOD: ' . $_SERVER['REQUEST_METHOD']);
      }

      // Decode JSON
      $data = json_decode($json, true);

      $log('info', "JSON decoded successfully");
      $log('info', "Data keys: " . implode(',', array_keys($data ?? [])));

      // Validasi
      if (json_last_error() !== JSON_ERROR_NONE) {
        throw new Exception('JSON decode error: ' . json_last_error_msg() . " (code: " . json_last_error() . ")");
      }

      if (!is_array($data)) {
        throw new Exception('Decoded data is not an array, type: ' . gettype($data));
      }

      if (empty($data['rows'])) {
        throw new Exception('Missing or empty "rows". Available keys: ' . implode(',', array_keys($data)));
      }

      if (empty($data['headers'])) {
        throw new Exception('Missing or empty "headers". Available keys: ' . implode(',', array_keys($data)));
      }

      $rows = $data['rows'];
      $headerRightData = $data['headers'];
      $selectedYear = $data['selectedYear'] ?? date('Y');

      foreach ($rows as &$row) {
        if (isset($row['Vendor']) && !empty($row['Vendor'])) {
          $row['Vendor'] = str_replace(["\r\n", "\n", "\r"], '', trim($row['Vendor']));
        }
      }
      unset($row); // Unset reference

      $log('info', "Validation passed. Rows: " . count($rows) . ", Headers: " . count($headerRightData));

      // Extract unique vendors dari data (untuk dropdown validation)
      $vendorList = $this->_extractVendorList($rows);
      $log('info', "Extracted vendors: " . implode(', ', $vendorList) . " (total: " . count($vendorList) . ")");

      // Create new Spreadsheet
      $spreadsheet = new Spreadsheet();
      $sheet = $spreadsheet->getActiveSheet();
      $sheet->setTitle('PurchasePlan');

      //  CREATE HIDDEN SHEET FOR VENDOR LIST (untuk avoid comma splitting in dropdown)
      $vendorSheet = $spreadsheet->createSheet();
      $vendorSheet->setTitle('__vendors');
      $vendorSheet->setSheetState('hidden'); // Hide this sheet dari user
      
      // Populate vendor list ke hidden sheet
      for ($i = 0; $i < count($vendorList); $i++) {
        $vendorSheet->setCellValue('A' . ($i + 1), $vendorList[$i]);
      }
      
      // Get range string untuk DataValidation (misal: __vendors!$A$1:$A$25 jika 25 vendors)
      $vendorRangeRef = '__vendors!$A$1:$A$' . count($vendorList);
      $log('info', "Created hidden vendor sheet with " . count($vendorList) . " vendors, range: {$vendorRangeRef}");

      // Setup header kiri (static)
      $headerLeft = ['Vendor', 'Item Desc', 'Color'];
      
      // Setup header kanan (minggu-minggu)
      $headerRightLabels = [];
      $dateMap = [];

      // Kumpulkan semua week dari headerRightData
      foreach ($headerRightData as $h) {
        if (isset($h['ww']) && !empty($h['ww'])) {
          $ww = strtoupper(trim($h['ww']));
          $headerRightLabels[] = $ww;
          $dateMap[$ww] = $h['date'] ?? '';
        }
      }

      if (count($headerRightLabels) === 0) {
        throw new Exception('No valid WW headers found in data');
      }

      // Sort headers by year then week
      usort($headerRightLabels, function ($a, $b) {
        preg_match('/WW(\d{2})-(\d{2})/i', $a, $ma);
        preg_match('/WW(\d{2})-(\d{2})/i', $b, $mb);
        
        if (!$ma || !$mb) return strcmp($a, $b);
        
        $ya = (int)$ma[1];
        $yb = (int)$mb[1];
        if ($ya !== $yb) return $ya - $yb;
        
        return (int)$ma[2] - (int)$mb[2];
      });

      $log('info', "Headers sorted: " . implode(',', array_slice($headerRightLabels, 0, 5)) . "...");

      // Build all headers (dengan Vendor ID hidden column)
      $technicalHeaders = ['_ShipmentID', '_ItemCode', '_VendorID', '_RowHash'];
      $allHeaders = array_merge($technicalHeaders, $headerLeft, $headerRightLabels);
      $totalCols = count($allHeaders);
      
      // Get last column letter
      $lastColLetter = $this->getColumnLetter($totalCols);

      // ROW 0: ETD Header (merged)
      $sheet->mergeCells("D1:" . $lastColLetter . "1");
      $sheet->setCellValue('A1', '');
      $sheet->setCellValue('D1', 'ETD (VESSEL depart HK)');
      
      // Style ETD row
      $sheet->getStyle('A1:' . $lastColLetter . '1')->applyFromArray([
        'alignment' => ['horizontal' => 'left', 'vertical' => 'center', 'wrapText' => true],
        'font' => ['bold' => true, 'size' => 14, 'color' => ['rgb' => '000000']],
        'fill' => ['fillType' => 'solid', 'startColor' => ['rgb' => 'FFFFFF']],
        'border' => [
          'left' => ['style' => 'thin', 'color' => ['rgb' => '000000']],
          'right' => ['style' => 'thin', 'color' => ['rgb' => '000000']],
          'top' => ['style' => 'thin', 'color' => ['rgb' => '000000']],
          'bottom' => ['style' => 'thin', 'color' => ['rgb' => '000000']]
        ]
      ]);

      // ROW 1: Week labels
      for ($col = 0; $col < $totalCols; $col++) {
        $colLetter = $this->getColumnLetter($col + 1);
        $header = $allHeaders[$col] ?? '';
        $sheet->setCellValue($colLetter . '2', $header);
      }

      // Style week row
      $sheet->getStyle('A2:' . $lastColLetter . '2')->applyFromArray([
        'alignment' => ['horizontal' => 'center', 'vertical' => 'center', 'wrapText' => true],
        'font' => ['bold' => true, 'size' => 10, 'color' => ['rgb' => '000000']],
        'fill' => ['fillType' => 'solid', 'startColor' => ['rgb' => 'FFFFFF']],
        'border' => [
          'left' => ['style' => 'thin', 'color' => ['rgb' => '000000']],
          'right' => ['style' => 'thin', 'color' => ['rgb' => '000000']],
          'top' => ['style' => 'thin', 'color' => ['rgb' => '000000']],
          'bottom' => ['style' => 'thin', 'color' => ['rgb' => '000000']]
        ]
      ]);

      // ROW 2: Dates
      for ($col = 0; $col < $totalCols; $col++) {
        $colLetter = $this->getColumnLetter($col + 1);
        if ($col >= (count($technicalHeaders) + count($headerLeft))) {
          $colIdx = $col - count($technicalHeaders) - count($headerLeft);
          if (isset($headerRightLabels[$colIdx])) {
            $ww = $headerRightLabels[$colIdx];
            $date = $dateMap[$ww] ?? '';
            $sheet->setCellValue($colLetter . '3', $date);
          }
        }
      }

      // Style date row
      $sheet->getStyle('A3:' . $lastColLetter . '3')->applyFromArray([
        'alignment' => ['horizontal' => 'center', 'vertical' => 'center', 'wrapText' => true],
        'font' => ['bold' => true, 'size' => 10, 'color' => ['rgb' => '000000']],
        'fill' => ['fillType' => 'solid', 'startColor' => ['rgb' => 'FFFFFF']],
        'border' => [
          'left' => ['style' => 'thin', 'color' => ['rgb' => '000000']],
          'right' => ['style' => 'thin', 'color' => ['rgb' => '000000']],
          'top' => ['style' => 'thin', 'color' => ['rgb' => '000000']],
          'bottom' => ['style' => 'thin', 'color' => ['rgb' => '000000']]
        ]
      ]);

      // ROW 3+: Data rows
      $quarterColors = [
        'Q1' => 'FFEB9C',
        'Q2' => 'C6E0B4',
        'Q3' => 'F4B084',
        'Q4' => 'B4C7E7'
      ];

      // Debug: Log header mapping and first row's weekly_data structure
      $log('info', "Headers mapping: " . json_encode(array_slice($headerRightLabels, 0, 5), JSON_FORCE_OBJECT));
      if (isset($rows[0]['weekly_data'])) {
        $log('info', "First row weekly_data keys: " . implode(', ', array_keys($rows[0]['weekly_data'])));
        $log('info', "First row weekly_data: " . json_encode($rows[0]['weekly_data'], JSON_FORCE_OBJECT));
      } else {
        $log('warn', "First row HAS NO weekly_data!");
        $log('info', "First row keys: " . implode(', ', array_keys($rows[0])));
      }

      // Back to main sheet
      $sheet = $spreadsheet->getSheetByName('PurchasePlan');

      $dataRow = 4;
      $populatedCount = 0;
      $matchDebug = [];
      $weekDataStatus = []; // Initialize for storing batch & closed status
      foreach ($rows as $idx => $row) {
        // Column A-D: Technical columns (hidden)
        $sheet->setCellValue('A' . $dataRow, $row['ShipmentID'] ?? '');
        $sheet->setCellValue('B' . $dataRow, $row['ItemCode'] ?? '');
        $sheet->setCellValue('C' . $dataRow, $row['VendorID'] ?? 0);  // Hidden Vendor ID column
        
        $rowHash = $this->generateRowHash(
          $row['Vendor'] ?? '',
          $row['ItemDesc'] ?? '',
          $row['Color'] ?? ''
        );
        $sheet->setCellValue('D' . $dataRow, $rowHash);

        // Detect if this row is NEW (no PurchasePlanID) or EXISTING
        $isNewRow = empty($row['PurchasePlanID']);

        $vendorName = $row['Vendor'] ?? '';
        $vendorName = str_replace(["\r\n", "\n", "\r"], '', trim($vendorName));
        
        $sheet->setCellValue('E' . $dataRow, $vendorName);
        $sheet->setCellValue('F' . $dataRow, $row['ItemDesc'] ?? '');
        $sheet->setCellValue('G' . $dataRow, $row['Color'] ?? '');

        // Apply vendor validation for NEW rows ONLY
        if ($isNewRow && count($vendorList) > 0) {
          // Create DataValidation untuk dropdown (range reference ke hidden sheet) pada column E (Vendor Name)
          $validation = new \PhpOffice\PhpSpreadsheet\Cell\DataValidation();
          $validation->setType(\PhpOffice\PhpSpreadsheet\Cell\DataValidation::TYPE_LIST);
          $validation->setErrorStyle(\PhpOffice\PhpSpreadsheet\Cell\DataValidation::STYLE_STOP);
          $validation->setAllowBlank(true);
          $validation->setShowInputMessage(true);
          $validation->setShowErrorMessage(true);
          $validation->setErrorTitle('Invalid Vendor');
          $validation->setError('Please select a vendor from the dropdown list');
          $validation->setPromptTitle('Select Vendor');
          $validation->setPrompt('Choose vendor from list');
          
          $validation->setFormula1($vendorRangeRef);
          
          $sheet->getCell('E' . $dataRow)->setDataValidation($validation);
          $log('info', "  Applied vendor dropdown to E{$dataRow} (NEW row) with {$vendorRangeRef}");
        }

        // Column H+: Week data (shifted because of new VendorID column)
        for ($colIdx = 0; $colIdx < count($headerRightLabels); $colIdx++) {
          $colLetter = $this->getColumnLetter($colIdx + 8); // H = column 8
          $wwKey = $headerRightLabels[$colIdx];
          $qtyData = $this->findWeeklyQtyWithStatus($row, $wwKey);
          
          // Debug first row's week matching
          if ($idx === 0 && $colIdx < 5) {
            $matchDebug[] = "Header '{$wwKey}' -> Qty: '{$qtyData['qty']}'";
          }
          
          $sheet->setCellValue($colLetter . $dataRow, $qtyData['qty']);
          
          // Store status info for later styling
          if (!isset($weekDataStatus)) {
            $weekDataStatus = [];
          }
          $weekDataStatus[$colLetter . $dataRow] = $qtyData;
        }
        
        // Log week matching for first row (for debugging)
        if ($idx === 0 && !empty($matchDebug)) {
          $log('info', "Week matching debug (first 5): " . implode(', ', $matchDebug));
        }

        // Style data row
        for ($col = 0; $col < $totalCols; $col++) {
          $colLetter = $this->getColumnLetter($col + 1);
          $cellRef = $colLetter . $dataRow;
          
          $quarter = 'static';
          if ($col >= (count($technicalHeaders) + count($headerLeft))) {
            $colIdx = $col - count($technicalHeaders) - count($headerLeft);
            if ($colIdx < count($headerRightLabels)) {
              $wwKey = $headerRightLabels[$colIdx];
              $quarter = $this->getQuarterFromWeekLabel($wwKey);
            }
          }

          $bgColor = ($quarter === 'static') ? 'FFFFFF' : $quarterColors[$quarter];
          $hasBlanketOrPO = !empty($row['BlanketID']) || !empty($row['POID']);
          $borderStyle = 'thin';
          
          // Determine font color based on batch & closed status (for weekly data columns)
          $fontColor = '000000'; // default black
          if ($col >= (count($technicalHeaders) + count($headerLeft)) && isset($weekDataStatus[$cellRef])) {
            $status = $weekDataStatus[$cellRef];
            $batch = $status['batch'] ?? 0;
            $closed = $status['closed'] ?? 0;
            
            if ($batch == 0) {
              $fontColor = 'FF0000'; // Red
            } elseif ($batch > 0 && $closed == 0) {
              $fontColor = '0000FF'; // Blue
            } elseif ($batch > 0 && $closed == 1) {
              $fontColor = '800080'; // Purple
            } elseif ($batch > 0 && $closed == 2) {
              $fontColor = '000000'; // Black
            }
          }

          $sheet->getStyle($cellRef)->applyFromArray([
            'alignment' => [
              'horizontal' => ($col < (count($technicalHeaders) + count($headerLeft))) ? 'left' : 'center',
              'vertical' => 'center',
              'wrapText' => false // Disable wrapText untuk semua cell agar data tidak terpisah (terutama vendor names dengan comma)
            ],
            'font' => ['size' => 10, 'color' => ['rgb' => $fontColor]],
            'fill' => ['fillType' => 'solid', 'startColor' => ['rgb' => $bgColor]],
            'border' => [
              'left' => ['style' => 'thin', 'color' => ['rgb' => '000000']],
              'right' => ['style' => 'thin', 'color' => ['rgb' => '000000']],
              'top' => ['style' => 'thin', 'color' => ['rgb' => '000000']],
              'bottom' => ['style' => 'thin', 'color' => ['rgb' => '000000']]
            ]
          ]);
        }

        $dataRow++;
        $populatedCount++;
      }

      $log('info', "Data populated: {$populatedCount} rows processed, final dataRow: {$dataRow}");

      // Add validation untuk empty rows (untuk bisa tambah baris baru)
      if (count($vendorList) > 0) {
        // Apply to 10 empty rows di bawah data
        $emptyRowsStart = $dataRow;
        $emptyRowsEnd = $dataRow + 9;
        
        for ($emptyRow = $emptyRowsStart; $emptyRow <= $emptyRowsEnd; $emptyRow++) {
          $validation = new \PhpOffice\PhpSpreadsheet\Cell\DataValidation();
          $validation->setType(\PhpOffice\PhpSpreadsheet\Cell\DataValidation::TYPE_LIST);
          $validation->setErrorStyle(\PhpOffice\PhpSpreadsheet\Cell\DataValidation::STYLE_STOP);
          $validation->setAllowBlank(true);
          $validation->setShowInputMessage(true);
          $validation->setShowErrorMessage(true);
          $validation->setErrorTitle('Invalid Vendor');
          $validation->setError('Please select a vendor from the dropdown list');
          $validation->setPromptTitle('Select Vendor');
          $validation->setPrompt('Choose vendor from list');
          
          //  Use range reference (NOT inline string with comma delimiter)
          $validation->setFormula1($vendorRangeRef);
          $validation->setShowDropDown(true);
          
          $sheet->getCell('E' . $emptyRow)->setDataValidation($validation);
        }
        
        $log('info', "Applied vendor dropdown to empty rows E{$emptyRowsStart}:E{$emptyRowsEnd} using {$vendorRangeRef}");
      }

      // Apply ALL BORDERS to entire used range (BEST PRACTICE)
      $lastDataRow = $dataRow - 1; // baris terakhir berisi data
      $lastColLetter = $this->getColumnLetter($totalCols);
      $fullRange = "A1:{$lastColLetter}{$lastDataRow}";
      
      $sheet->getStyle($fullRange)
        ->getBorders()
        ->getAllBorders()
        ->setBorderStyle(\PhpOffice\PhpSpreadsheet\Style\Border::BORDER_THIN)
        ->setColor(new \PhpOffice\PhpSpreadsheet\Style\Color('FF000000'));
      
      $log('info', "All borders applied to range: {$fullRange}");

      // Setup columns (A, B, C, D hidden; E, F, G visible)
      $sheet->getColumnDimension('A')->setWidth(0)->setVisible(false);  // ShipmentID
      $sheet->getColumnDimension('B')->setWidth(0)->setVisible(false);  // ItemCode
      $sheet->getColumnDimension('C')->setWidth(0)->setVisible(false);  // VendorID (hidden)
      $sheet->getColumnDimension('D')->setWidth(0)->setVisible(false);  // RowHash
      $sheet->getColumnDimension('E')->setWidth(35);                    // Vendor Name
      $sheet->getColumnDimension('F')->setWidth(60);                    // ItemDesc
      $sheet->getColumnDimension('G')->setWidth(12);                    // Color
      
      for ($i = 0; $i < count($headerRightLabels); $i++) {
        $colLetter = $this->getColumnLetter($i + 8); // H = column 8
        $sheet->getColumnDimension($colLetter)->setWidth(12);
      }

      // Set row heights
      $sheet->getRowDimension(1)->setRowHeight(20);
      $sheet->getRowDimension(2)->setRowHeight(20);
      $sheet->getRowDimension(3)->setRowHeight(20);
      for ($i = 4; $i < $dataRow; $i++) {
        $sheet->getRowDimension($i)->setRowHeight(20);
      }

      // Set freeze panes at H4 (freeze columns A-G and rows 1-3)
      $sheet->freezePane('H4');
      $log('info', "Freeze panes set at H4 (header area frozen)");

      $filename = 'PurchasePlan_' . date('Y-m-d') . '.xlsx';
      
      $log('info', "Excel created. Filename: {$filename}, Data rows: " . ($dataRow - 4));
      $log('info', "=== EXPORT SUCCESSFUL ===");

      // Send debug logs as response header (JavaScript will parse it)
      header('X-Debug-Logs: ' . base64_encode(json_encode($debugLogs)));
      
      header('Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      header('Content-Disposition: attachment;filename="' . $filename . '"');
      header('Cache-Control: no-cache');
      header('Pragma: no-cache');

      // Write to temporary file first to ensure integrity
      $tempFile = sys_get_temp_dir() . '/' . $filename;
      $writer = new Xlsx($spreadsheet);
      $writer->save($tempFile);
      
      // Check if file was created
      if (!file_exists($tempFile) || filesize($tempFile) === 0) {
        throw new Exception('Failed to create Excel file. Temp path: ' . $tempFile);
      }

      $log('info', "Temp file created: {$tempFile}, size: " . filesize($tempFile) . " bytes");

      // Send file directly
      readfile($tempFile);
      
      // Clean up temp file
      @unlink($tempFile);
      exit();

    } catch (Exception $e) {
      log_message('error', '=== EXPORT EXCEL EXCEPTION ===');
      log_message('error', 'Message: ' . $e->getMessage());
      log_message('error', 'File: ' . $e->getFile() . ':' . $e->getLine());

      header('Content-Type: application/json');
      http_response_code(500);
      echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage(),
        'debug_logs' => $debugLogs ?? []
      ]);
      exit();
    }
  }

  private function findWeeklyQty($row, $wwKey)
  {
    if (!isset($row['weekly_data']) || !is_array($row['weekly_data'])) {
      return '';
    }

    $weeklyData = $row['weekly_data'];
    
    // Extract week number dari header (WW25-04 -> 4, WW26-01 -> 1, WW25-40 -> 40)
    $headerWeekNum = null;
    if (preg_match('/WW(\d{2})-(\d{1,2})/i', $wwKey, $m)) {
      $headerWeekNum = (int)$m[2];  // Extract hanya bagian week
    }

    if ($headerWeekNum === null) {
      return '';
    }

    // Try different key formats dari data dengan week number yang sama
    $possibleKeys = [
      'ww' . str_pad($headerWeekNum, 2, '0', STR_PAD_LEFT),  // ww04, ww40
      'ww' . $headerWeekNum,                                   // ww4, ww40
      'WW' . str_pad($headerWeekNum, 2, '0', STR_PAD_LEFT),  // WW04, WW40
      'WW' . $headerWeekNum,                                   // WW4, WW40
    ];

    $matchedData = null;
    foreach ($possibleKeys as $key) {
      if (isset($weeklyData[$key])) {
        $matchedData = $weeklyData[$key];
        break;
      }
    }

    // Jika tidak ada match, return kosong
    if ($matchedData === null) {
      return '';
    }

    // Calculate total quantity dari matched data
    $total = 0;
    
    if (is_array($matchedData)) {
      foreach ($matchedData as $item) {
        if (is_array($item)) {
          $total += (int)($item['qty'] ?? 0);
        } elseif (is_object($item)) {
          $total += (int)($item->qty ?? 0);
        } elseif (is_numeric($item)) {
          $total += (int)$item;
        }
      }
    } elseif (is_object($matchedData)) {
      $total += (int)($matchedData->qty ?? 0);
    } elseif (is_numeric($matchedData)) {
      $total = (int)$matchedData;
    }

    return $total > 0 ? $total : '';
  }

  private function findWeeklyQtyWithStatus($row, $wwKey)
  {
    $result = [
      'qty' => '',
      'batch' => 0,
      'closed' => 0
    ];

    if (!isset($row['weekly_data']) || !is_array($row['weekly_data'])) {
      return $result;
    }

    $weeklyData = $row['weekly_data'];
    
    // Extract week number dari header (WW25-04 -> 4, WW26-01 -> 1, WW25-40 -> 40)
    $headerWeekNum = null;
    if (preg_match('/WW(\d{2})-(\d{1,2})/i', $wwKey, $m)) {
      $headerWeekNum = (int)$m[2];  // Extract hanya bagian week
    }

    if ($headerWeekNum === null) {
      return $result;
    }

    // Try different key formats dari data dengan week number yang sama
    $possibleKeys = [
      'ww' . str_pad($headerWeekNum, 2, '0', STR_PAD_LEFT),  // ww04, ww40
      'ww' . $headerWeekNum,                                   // ww4, ww40
      'WW' . str_pad($headerWeekNum, 2, '0', STR_PAD_LEFT),  // WW04, WW40
      'WW' . $headerWeekNum,                                   // WW4, WW40
    ];

    $matchedData = null;
    foreach ($possibleKeys as $key) {
      if (isset($weeklyData[$key])) {
        $matchedData = $weeklyData[$key];
        break;
      }
    }

    // Jika tidak ada match, return default
    if ($matchedData === null) {
      return $result;
    }

    // Calculate total quantity dan ambil batch & closed dari item terakhir
    $total = 0;
    $batchValue = 0;
    $closedValue = 0;
    
    if (is_array($matchedData)) {
      foreach ($matchedData as $item) {
        if (is_array($item)) {
          $total += (int)($item['qty'] ?? 0);
          // Ambil batch & closed dari item (gunakan yang pertama atau terakhir)
          $batchValue = (int)($item['batch'] ?? 0);
          $closedValue = (int)($item['closed'] ?? 0);
        } elseif (is_object($item)) {
          $total += (int)($item->qty ?? 0);
          $batchValue = (int)($item->batch ?? 0);
          $closedValue = (int)($item->closed ?? 0);
        } elseif (is_numeric($item)) {
          $total += (int)$item;
        }
      }
    } elseif (is_object($matchedData)) {
      $total += (int)($matchedData->qty ?? 0);
      $batchValue = (int)($matchedData->batch ?? 0);
      $closedValue = (int)($matchedData->closed ?? 0);
    } elseif (is_numeric($matchedData)) {
      $total = (int)$matchedData;
    }

    $result['qty'] = $total > 0 ? $total : '';
    $result['batch'] = $batchValue;
    $result['closed'] = $closedValue;

    return $result;
  }

  private function _detect_po_plan_origin($shipmentID)
  {
    $result = [
      'isPOPlan' => false,
      'docID' => null,
      'type' => null,
      'tPOPlanID' => null
    ];

    // Cari di tPOPlan dengan ID = shipmentID
    $poPlan = $this->db->select('ID, DocID, DocType')
      ->where('ID', $shipmentID)
      ->get('tPOPlan')
      ->row_array();

    if ($poPlan) {
      $result['isPOPlan'] = true;
      $result['docID'] = $poPlan['DocID'];
      $result['tPOPlanID'] = $poPlan['ID'];

      $docType = strtoupper($poPlan['DocType'] ?? '');
      
      if (stripos($docType, 'BLANKET') !== false) {
        $result['type'] = 'blanket';
      } elseif (stripos($docType, 'PO') !== false) {
        $result['type'] = 'po';
      } else {
        // Default ke PO jika tidak bisa determine
        $result['type'] = 'po';
      }
    }

    return $result;
  }

  private function generateRowHash($vendor, $itemDesc, $color)
  {
    $key = strtoupper($vendor) . '|' . strtoupper($itemDesc) . '|' . strtoupper($color);
    return substr(base64_encode($key), 0, 20);
  }

  private function getQuarterFromWeekLabel($weekLabel)
  {
    // Parse week label format: WW25-04, WW26-01, etc.
    if (!preg_match('/WW(\d{2})-(\d{1,2})/i', $weekLabel, $matches)) {
      return 'Q1'; // Default fallback
    }

    $weekNum = (int)$matches[2]; // Extract week number (4, 1, 40, etc.)

    // Determine quarter based on week number
    if ($weekNum >= 1 && $weekNum <= 13) {
      return 'Q1';
    } elseif ($weekNum >= 14 && $weekNum <= 26) {
      return 'Q2';
    } elseif ($weekNum >= 27 && $weekNum <= 39) {
      return 'Q3';
    } else {
      // Week 40-52 (Q4)
      return 'Q4';
    }
  }

  private function _extractVendorList($rows)
  {
    $vendors = [];
    
    foreach ($rows as $row) {
      $vendor = $row['Vendor'] ?? null;
      if (!empty($vendor)) {
        $vendor = str_replace(["\r\n", "\n", "\r"], '', trim($vendor));
        
        if (!in_array($vendor, $vendors)) {
          $vendors[] = $vendor;
        }
      }
    }
    
    // Sort vendors alphabetically
    sort($vendors);
    
    return $vendors;
  }

  private function _create_new_purchase_plan($itemDesc, $userID)
  {
    try {
      // Generate doc number directly dari database (bypass create_header_doc untuk avoid POST->GET conversion)
      // Format: SPPLNTDI-26010173 (using dbsDocNoDate logic)
      
      $docDate = date('Y-m-d');
      $dateparts = explode('-', $docDate);
      $year = substr($dateparts[0], -2); // 26 from 2026
      $month = $dateparts[1]; // 01
      
      $writeLocID = $this->session->writelocid ?? 1;
      
      // Get TDI location code (lokasi untuk tax)
      $tdiLocQuery = $this->db->select("ISNULL(BranchIDTax, 0) as id")
        ->from('dbsSystem')
        ->limit(1)
        ->get();
      
      if ($tdiLocQuery->num_rows() == 0) {
        throw new Exception("System config not found");
      }
      
      $tdiLocId = $tdiLocQuery->row()->id;
      $tdiLocId = ($tdiLocId == 0) ? $writeLocID : $tdiLocId;
      
      // Get location code
      $locQuery = $this->db->select("code")
        ->from('dbmLocation')
        ->where('id', $tdiLocId)
        ->limit(1)
        ->get();
      
      if ($locQuery->num_rows() == 0) {
        throw new Exception("Location not found");
      }
      
      $locCode = $locQuery->row()->code;
      
      // Check/insert doc number counter for this month
      $doctype = "SPPLN";
      $counterQuery = $this->db->select("counter")
        ->from('dbsDocNoDate')
        ->where('locationid', $tdiLocId)
        ->where('doctype', $doctype)
        ->where('mm', $month)
        ->where('yy', $year)
        ->limit(1)
        ->get();
      
      if ($counterQuery->num_rows() == 0) {
        // Insert new counter record
        $baseCounter = $year . $month . '0001';
        $this->db->insert('dbsDocNoDate', [
          'LocationID' => $tdiLocId,
          'DocType' => $doctype,
          'MM' => $month,
          'YY' => $year,
          'Counter' => $baseCounter,
          'CounterTax' => 0
        ]);
        $docNo = $baseCounter;
      } else {
        // Increment existing counter
        $currentCounter = $counterQuery->row()->counter;
        $docNo = $currentCounter + 1;
        
        $this->db->where('locationid', $tdiLocId)
          ->where('doctype', $doctype)
          ->where('mm', $month)
          ->where('yy', $year)
          ->update('dbsDocNoDate', ['Counter' => $docNo]);
      }
      
      // Format doc number: SPPLNTDI-26010173 format
      $docNumber = $doctype . $locCode . "-" . $docNo;
      
      log_message('info', "Generated doc number directly: {$docNumber} for SPPLN purchase plan");

      // Default currency dan rate
      $currID = 1; // Default IDR
      $currRate = 1;

      // Data untuk dbtPurchasePlan
      $planData = [
        'DocDate'      => date('Y-m-d'),
        'DocType'      => 'SPPLN',
        'DocNumber'    => $docNumber,
        'ItemDesc'     => $itemDesc,
        'CurrID'       => $currID,
        'CurrRate'     => $currRate,
        'Void'         => 0,
        'CreateDate'   => date('Y-m-d H:i:s'),
        'CreateUserID' => $userID,
        'EditDate'     => date('Y-m-d H:i:s'),
        'EditUserID'   => $userID,
      ];

      log_message('info', "Creating plan with data: " . json_encode($planData));

      // Insert plan header
      $purchasePlanID = $this->pom->insert_purchase_plan_header($planData);

      if (!$purchasePlanID) {
        throw new Exception("insert_purchase_plan_header returned empty");
      }

      log_message('info', "  Purchase Plan created: ID={$purchasePlanID}, DocNumber={$docNumber}");

      return (int)$purchasePlanID;
    } catch (Exception $e) {
      log_message('error', "Error in _create_new_purchase_plan: " . $e->getMessage());
      throw new Exception("Failed to create purchase plan: " . $e->getMessage());
    }
  }

  private function _create_new_shipment_for_import(
    $purchasePlanID,
    $vendor,
    $itemID,
    $itemUnitID,
    $color,
    $qtyImported,
    $shipmentDate,
    $weekLabel,
    $userID
  ) {
    // Calculate PODateEst = ShipmentDate - 90 days
    $poDateEst = date('Y-m-d', strtotime($shipmentDate . ' -90 days'));

    // Data untuk dbtPurchasePlanDtlShipment
    $shipmentData = [
      'Vendor'         => (int)$vendor,
      'ItemID'         => $itemID ? (int)$itemID : null,
      'ItemUnitID'     => $itemUnitID ? (int)$itemUnitID : null,
      'PurchasePlanID' => (int)$purchasePlanID,
      'Color'          => $color,
      'ShipmentDate'   => $shipmentDate,
      'Qty'            => (int)$qtyImported,
      'Price'          => null,
      'PODateEst'      => $poDateEst,
      'Term'           => 90,
      'Batch'          => 0,
      'BlanketID'      => null,
      'POID'           => null,
      'Closed'         => 0,
    ];

    // Insert shipment
    $shipmentID = $this->db->insert('dbtPurchasePlanDtlShipment', $shipmentData);
    $shipmentID = $this->db->insert_id();

    if (!$shipmentID) {
      throw new Exception("Failed to insert shipment for new plan");
    }

    log_message('info', "  Shipment created: ID={$shipmentID}, Vendor={$vendor}, Qty={$qtyImported}");

    // Insert ke dbtPurchasePlanDtlShipmentWeek
    $weekData = [
      'PurchasePlanID'             => (int)$purchasePlanID,
      'PurchasePlanDtlShipmentID'  => (int)$shipmentID,
      'WeekID'                     => $weekLabel,
      'ShipmentDate'               => $shipmentDate,
      'Qty'                        => (int)$qtyImported
    ];
    $this->db->insert('dbtPurchasePlanDtlShipmentWeek', $weekData);

    // Insert history
    $now = date('Y-m-d H:i:s');
    $historyData = [
      'ShipmentID'    => (int)$shipmentID,
      'Vendor'        => (int)$vendor,
      'ItemID'        => $itemID ? (int)$itemID : null,
      'ItemUnitID'    => $itemUnitID ? (int)$itemUnitID : null,
      'PurchasePlanID' => (int)$purchasePlanID,
      'Color'         => $color,
      'ShipmentDate'  => $shipmentDate,
      'Qty'           => (int)$qtyImported,
      'Price'         => null,
      'PODateEst'     => $poDateEst,
      'Term'          => 90,
      'Batch'         => 0,
      'BlanketID'     => null,
      'POID'          => null,
      'Closed'        => 0,
      'StartDate'     => $now,
      'EndDate'       => null,
      'EditDate'      => $now,
      'EditUserID'    => (int)$userID,
    ];
    $this->db->insert('dbtPurchasePlanDtlShipmentHistory', $historyData);

    // Insert ke dbtPurchasePlanDtl (detail summary)
    $detailData = [
      'PurchasePlanID'   => (int)$purchasePlanID,
      'Vendor'           => (int)$vendor,
      'Batch'            => 0,
      'BlanketPODateEst' => $poDateEst,
      'Total'            => 0,
    ];
    $this->db->insert('dbtPurchasePlanDtl', $detailData);

    return (int)$shipmentID;
  }

  public function get_plan_groups()
  {
    try {
      $query = "SELECT ID, AttributeValue 
                FROM mAttributeValue 
                WHERE AttributeID = (SELECT ID from mAttribute where name = 'PlanGroup')
                ORDER BY AttributeValue ASC";
      
      $result = $this->db->query($query)->result();
      
      $groups = array();
      foreach ($result as $row) {
        $groups[] = array(
          'id'    => (int)$row->ID,
          'text'  => $row->AttributeValue
        );
      }
      
      header('Content-Type: application/json');
      echo json_encode(array(
        'status' => 'success',
        'data'   => $groups
      ));
    } catch (Exception $e) {
      header('Content-Type: application/json');
      echo json_encode(array(
        'status' => 'error',
        'message' => $e->getMessage()
      ));
    }
  }

  public function save_plan_grouping()
  {
      // Ambil raw JSON
      $input = json_decode(file_get_contents('php://input'), true);

      if (!$input) {
          echo json_encode([
              'status' => 'error',
              'message' => 'Invalid JSON input'
          ]);
          return;
      }

      $groupID = isset($input['group_id']) ? (int)$input['group_id'] : 0;
      $planIDs = isset($input['plan_ids']) ? $input['plan_ids'] : [];

      if (!$groupID || empty($planIDs)) {
          echo json_encode([
              'status' => 'error',
              'message' => 'Group ID or Plan IDs missing'
          ]);
          return;
      }

      // Validasi array numeric
      $planIDs = array_map('intval', $planIDs);

      $this->db->trans_start();

      $this->db->where_in('ID', $planIDs);
      $this->db->update('dbtPurchasePlan', [
          'PlanGroupID' => $groupID
      ]);

      $this->db->trans_complete();

      if ($this->db->trans_status() === FALSE) {
          echo json_encode([
              'status' => 'error',
              'message' => 'Database update failed'
          ]);
      } else {
          echo json_encode([
              'status' => 'success',
              'message' => 'Grouping updated successfully'
          ]);
      }
  }
}
