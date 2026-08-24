
<head>
	<title>Purchase Plan</title>
	<script>
		const BASE_URL = '<?php echo base_url(); ?>';
		const planItemOptions = [];
		
	</script>

	<style>
		/* === RESPONSIVE SCALING === */
		html {
			font-size: clamp(10px, 0.75vw, 14px); /* Responsive base font */
		}
		
		body {
			overflow-x: hidden;
		}
		
		/* Pastikan content-wrapper tidak terpotong */
		.content-wrapper {
			min-height: 100vh;
			width: 100%;
			box-sizing: border-box;
			padding: 0 0.5% !important;
		}

		
		.btn-custom {
			width: 100px;
		}

		.numeric {
			text-align: right;
		}

		/* I simplified these as they were repetitive */
		table tbody tr td,
		table thead tr th,
		.my-custom-table th,
		.my-custom-table tbody td,
		.my-custom-table tfoot td {
			white-space: nowrap;
			font-size: clamp(9pt, 0.65vw, 11pt);
			vertical-align: middle;
			padding-top: 3px !important;
			padding-bottom: 3px !important;
			height: 35px !important;
		}

		.form-control-sm {
			height: 25px !important;
			padding: 3px 5px !important;
			font-size: 10.5pt !important;
			line-height: 1.5 !important;
			box-sizing: border-box;
			width: 100%;
			margin: 0 !important;
			/* Added to remove potential default margins */
		}

		select.form-control-sm {
			appearance: none;
			-webkit-appearance: none;
			-moz-appearance: none;
			background-image: url('data:image/svg+xml;utf8,<svg fill="%23212529" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><path d="M7.247 11.14 2.451 5.658C1.885 5.013 2.345 4 3.204 4h9.592c.86 0 1.32 1.013.754 1.659L8.753 11.14a.952.952 0 0 1-1.506 0z"/></svg>');
			background-repeat: no-repeat;
			background-position: right 0.5rem center;
			background-size: 0.8em;
			padding-right: 1.5rem !important;
		}

		select.form-control-sm::-ms-expand {
			display: none;
		}

		.payment-cn-icon {
			cursor: not-allowed;
		}

		.table.compact tbody {
			background-color: white;
			border: 2px solid black;
		}

		/* table kiri */
		#table-main_ {
			/* width: 100%; */
			text-align: center;
			overflow-x: scroll;
			width: auto;
			table-layout: fixed;
		}

		#table-main_ tbody {
			background-color: white;
			border-bottom: 2px solid black;
			border-top: 2px solid black;
			border-left: none;
			border-right: none;
		}

		#table-main_ thead {
			border-top: none;
			border-left: none;
			border-right: none;
			text-align: center;
		}

		#table-main_ tfoot {
			border-top: 2px solid black;
			border-bottom: none;
			border-left: none;
			border-right: none;
		}

		#table-main_ tbody tr,
		#table-main_ tfoot tr {
			background-color: transparent;
		}

		table thead tr th {
			padding-right: 7px !important;
			text-align: center;
		}

		#table-main_ tbody td:nth-child(1) {
			max-width: 120px;
    		width: 120px;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.content-wrapper {
			height: auto;
			min-height: 100vh;
			width: 100%;
			overflow: visible;
			box-sizing: border-box;
		}

		input {
			padding: 0 10px !important;
			height: 25px !important;
		}

		.bootstrap-select button {
			height: 25px;
			padding-top: 0px;
			padding-bottom: 0px;
		}

		.bootstrap-select {
			height: 25px
		}

		.text-right {
			text-align: right;
		}

		.field-date {
			position: relative;
		}

		.hidden-date-table {
			position: absolute;
			left: 0;
			z-index: -1;
		}

		.readonly-date {
			background-color: #fff !important;
		}

		.readonly-date:hover {
			cursor: pointer;
		}

		#qty-plan-total {
			padding-right: 16px;
			padding-left: 16px;
			font-size: 14px;
			font-weight: bold;
		}

		.my-custom-table {
			width: 100%;
			margin-bottom: 1rem;
			color: #212529;
			vertical-align: top;
			border-color: #dee2e6;
			padding: 0;
			border-collapse: collapse;
			table-layout: fixed;
		}

		.my-custom-table tbody {
			background-color: white;
			border-bottom: 2px solid black;
		}

		.my-custom-table tfoot {
			border: none;
			border-color: none;
		}
		.row-tableKanan {
			margin-right: 0;
			margin-left: 0;
		}

		.my-custom-table th,
		.my-custom-table tbody td {
			padding: 0.5rem 0.5rem;
			border-bottom: 1px solid #dee2e6;
			text-align: inherit;
			vertical-align: inherit;
			font-size: 10.5pt;
		}

		.my-custom-table tfoot td {
			padding: 0.5rem 0.5rem;
			text-align: inherit;
			vertical-align: inherit;
			font-size: 10.5pt;
		}

		.my-custom-table thead {
			border-bottom: 2px solid black;
			text-align: center;
		}

		.table td .btn {
			vertical-align: middle;
		}

		#deldocreff {
			pointer-events: none;
			opacity: 0.6;
			cursor: not-allowed;
		}

		.column-no {
			width: 5%;
			text-align: center !important;
			align-items: center;
		}


		#tableTengah {
			border-left: none;
			border-rigt: none;
		}

		#tableTengah td {
			text-align: left;
		}

		#tableTengah td .batch-field {
			margin: 0;
			padding: 0;
			vertical-align: middle;
			display: inline-block;
			width: 70px !important;
		}

		#tableTengah td .qty-field {
			width: 90px !important;
		}
		#tableTengah td .price-field {
			width: 110px !important;
		}
		#tableTengah td .po-date-est-field {
			width: 120px !important;
		}
		#tableTengah td .term-days-field {
			width: 70px !important;
		}
		#tableTengah td .color-field {
			width: 110px !important;
		}
		#tableTengah td .shipment-date-field {
			width: 120px !important;
		}
		#tableTengah td .shipment-year-field {
			width: 95px !important;
		}
		#tableTengah td .ww-field {
			width: 150px !important;
		}
		#tableTengah td .vendorSelector {
			width: 200px !important;
		}
		#tableTengah td .item-code-field {
			width: 200px !important;
		}

		#tableTengah thead,
		#tableTengah tfoot {
			display: table-header-group;
		}


		#tableTengah tbody {
			display: block;
			max-height: 200px;
			overflow-y: auto;
			overflow-x: auto;
		}

		#tableTengah thead th,
		#tableTengah tbody td,
		#tableTengah tfoot td {
			width: calc(100% / 10);
		}

		#tableTengah tbody {
			-ms-overflow-style: none;
		}

		.column-action-icon {
			text-align: center !important;
			padding-left: 0 !important;
		}

		#table-main_ thead,
		#tableKananHead thead {
			white-space: nowrap;
		}


		#table-main_ thead th,
		#tableKananHead thead th {
			vertical-align: middle;
			text-align: center;
			padding: 3px;
		}

		#table-main_ thead,
		#tableKananHead thead {
			table-layout: fixed;
		}

		#tableKanan {
			border-left: None;
			border-right: None;
			max-width: 600px !important;
		}
		/* .table { 
			width: fit-content !important; 
			max-width: 100%; 
			margin-bottom: 20px; 
		} */
		table#tableKananHead {
			width: auto !important;
			max-width: unset !important;
		}


		.row.col-sm-4,
		.row.col-sm-8 {
			display: flex;
			flex-direction: column;
		}

		.form-control-sm {
			min-height: 30px;
			line-height: 1.5;
		}

		.tableCek th,
		.tableCek td {
			white-space: nowrap;
		}
		/* #tableKananHead input,
		#tableKananHead select {
			width: 50% !important;
			box-sizing: border-box;
		} */

		#table-main_ thead tr,
		#tableKananHead thead tr {
			height: 100%;
		}
		.no-spinner::-webkit-outer-spin-button,
		.no-spinner::-webkit-inner-spin-button {
		-webkit-appearance: none;
		margin: 0;
		}
		.termDaysTableKanan{
			width: 79px;
		}
		.formValueTableKanan{
			width: 110px;
		}
		.OACreditTableKanan{
			width: 115px;
		}
		.alertTableKanan{
			width: 95px;
		}

		.select2-results{
			width: 500px !important;
		}
		.select2-dropdown{
			width: 500px !important;
		}
		/* === TABLE KANAN CALC - CLEAN LAYOUT === */
		.tableKananCalc table {
		border-collapse: collapse !important;
		width: 100% !important;
		margin: 0 !important;
		table-layout: fixed !important;
		font-size: clamp(11px, 0.7vw, 13px) !important;
		display: flow;
		transform: none;
		}

		.tableKananCalc thead th {
		background-color: #f5f5f5 !important;
		font-weight: 600 !important;
		text-align: left !important;
		padding: 6px 8px !important;
		border-bottom: 1px solid #ddd !important;
		vertical-align: middle !important;
		white-space: nowrap !important;
		}

		.tableKananCalc tbody td {
		padding: 5px 8px !important;
		border-bottom: 1px solid #eee !important;
		vertical-align: middle !important;
		}

		.tableKananCalc tfoot td {
		padding: 6px 8px !important;
		border-top: 2px solid #aaa !important;
		font-weight: 600 !important;
		background-color: #fafafa !important;
		}

		.tableKananCalc tr:hover td {
		background-color: #f9f9f9 !important;
		}

		.tableKananCalc td:nth-child(4),
		.tableKananCalc td:nth-child(5) {
		text-align: right !important;
		}

		.tableKananCalc th:nth-child(5),
		.tableKananCalc th:nth-child(6) {
		text-align: right !important;
		}

		/* Responsive tweak biar tidak terlalu renggang */
		#tableKananCalc th:nth-child(1) { width: 100px; }
		#tableKananCalc th:nth-child(2) { width: 90px; }
		#tableKananCalc th:nth-child(3) { width: 120px; }
		#tableKananCalc th:nth-child(4) { width: 60px; }
		#tableKananCalc th:nth-child(5) { width: 120px; }
		#tableKananCalc th:nth-child(6) { width: 120px; }

		/* Tag warna kecil (From Value) */
		.tableKananCalc span {
		display: inline-block !important;
		padding: 2px 8px !important;
		border-radius: 10px !important;
		font-size: 11px !important;
		font-weight: 500 !important;
		color: #fff !important;
		white-space: nowrap !important;
		}
		#totalPersenCalc {
		padding-left: 30px !important;
		text-align: right !important;
		}
		#totalPaymentCalc {
		text-align: right !important;
		}
		.btn-question {
			width: 20px;
			height: 20px;
			padding: 0;
			font-size: 12px;
			margin-left: 6px;
			vertical-align: middle;

			border: 1px solid #000;
			background-color: #fff;
			color: #000;

			border-radius: 50%;
			line-height: 18px;
			text-align: center;
		}
		#divTableKiri {
			flex: 0 0 auto;
			max-width: 40%;
			min-width: 480px;
			width: auto;
		}

		/* Kolom Vendor di table kiri lebih lebar */
		#table-main_ thead th:nth-child(1),
		#table-main_ tbody td:nth-child(1) {
			min-width: 180px;
			max-width: 220px;
			white-space: normal;
			word-wrap: break-word;
		}

		/* === RESPONSIVE LAYOUT FIXES === */
		.tableKananWrapper {
			flex: 0 1 auto;
			max-width: 55%;
			min-width: 0;
			overflow-x: auto;
		}

		.table-responsive-custom {
			width: 100%;
			overflow-x: auto;
			overflow-y: hidden;
			-webkit-overflow-scrolling: touch;
		}

		.table-responsive-custom table {
			margin: 0;
		}

		/* Responsive table inputs */
		table input,
		table select {
			min-width: 70px;
			max-width: 100%;
		}

		/* === RESPONSIVE MEDIA QUERIES === */
		@media (max-width: 1600px) {
			html {
				font-size: 11px;
			}
			#divTableKiri {
				max-width: 38%;
				min-width: 420px;
			}
			.tableKananWrapper {
				max-width: 58%;
			}
			table input, table select {
				min-width: 65px;
			}
		}

		@media (max-width: 1400px) {
			html {
				font-size: 10px;
			}
			#divTableKiri {
				max-width: 35%;
				min-width: 380px;
			}
			.tableKananWrapper {
				max-width: 60%;
			}
			.row-tableKanan {
				margin-left: 0;
				margin-right: 0;
			}
			table input, table select {
				min-width: 60px;
			}
		}

		@media (max-width: 1200px) {
			html {
				font-size: 9px;
			}
			#divTableKiri {
				max-width: 100%;
				min-width: unset;
				flex: 1 1 100%;
			}
			.tableKananWrapper {
				flex: 1 1 100%;
			}
			/* Stack tables vertically on smaller screens */
			div[style*="display: flex; align-items: flex-start"] {
				flex-wrap: wrap !important;
			}
		}

		/* === SCALING FOR DIFFERENT SCREEN SIZES === */
		@media screen and (min-width: 1920px) {
			html {
				font-size: 14px;
			}
		}

		@media screen and (min-width: 1600px) and (max-width: 1919px) {
			html {
				font-size: 12px;
			}
		}

		@media screen and (min-width: 1366px) and (max-width: 1599px) {
			html {
				font-size: 11px;
			}
		}

		@media screen and (min-width: 1280px) and (max-width: 1365px) {
			html {
				font-size: 10px;
			}
		}

		@media screen and (max-width: 1279px) {
			html {
				font-size: 9px;
			}
		}


		@media (min-width: 500px) and (max-width: 1450px) {
			.tableCek {
				scrollbar-width: none;
			}

			.tableCek::-webkit-scrollbar {
				display: none;
				width: 0;
				height: 0;
			}
		}

		/* === FLEX CONTAINER FIX === */
		.flex-table-container {
			display: flex;
			align-items: flex-start;
			width: 100%;
			gap: 15px;
			flex-wrap: wrap;
		}

		@media (min-width: 1200px) {
			.flex-table-container {
				flex-wrap: nowrap;
			}
		}
	</style>
</head>
<?php $this->load->view("base/base_body"); ?>

<div class="content-wrapper" style="overflow:hidden;padding:0 1%;">

	<div class="row" style="padding-top:5px; ">
		<div class="col-sm-4">
			<p style="font-size:20px;font-weight:bold;">Purchase Plan (SPPLN)</p>
		</div>

		<div class="col-sm-4" style="padding-left:0px;padding-right:0px;">

		</div>

		<div class="col-sm-4" style="text-align:right;">
			<button class="btn btn-warning btn-custom btn-report">Report Plan</button>
			<button class="btn btn-success btn-custom btn-save">Save</button>
			<button class="btn btn-danger btn-custom btn-exit">Exit</button>
		</div>
	</div>

	<div class="tab-content px-4">

		<div class="tab-pane fade in active" id="poPlanEntry">
			<div class="row">
				<div class="col-sm-2"> 
					<label style="margin-bottom:0px;">Doc Date</label>
					<input class="form-control input-sm" type="date" style="cursor:pointer;" id="DocDate"></input>
				</div>
			</div>

			<div class="row mt-2">
				<div class="col-sm-2">
					<label style="margin-bottom:0px;">Currency</label>
					<select class=form-control input-sm" id="currency"></select>
				</div>
				<div class="col-sm-2" style="padding-left:0px">
					<label style="margin-bottom:0px;">Rate</label>
					<input type="text" class="form-control numeric input-sm input-numeric" style="width: 120px; padding-left: 70px;" id="rate" name="rate" readonly />
				</div>
			</div>

			<div class="row mt-3">
				<div class="col-sm-4">
					<label style="margin-bottom:0px;">Item Desc</label>
					<input type="text" class="form-control input-sm" id="ItemDesc" style="text-align: left;" />
				</div>
			</div>
		</div>

	</div>


	<div class="row col-sm-12 tableCek" style="margin-top:20px;">
		<div class="table-responsive-custom">
		<table class="table table-condensed table-stripe compact BigDataTableTengah" style="min-width: 1200px;
			width: 100%;
			margin-left: 20px;
			table-layout: auto;">
			<thead>
				<tr>
					<th class="column-no">#</th>
					<th>Item Code</th>
					<th>Item Unit</th>
					<th>Vendor</th>
					<th>Color</th>
					<th>Year</th>
					<th>WW</th>
					<th>ShipmentDate</th>	
					<th>Qty</th>
					<th>Price</th>
					<th>
						Leadtime
						<!-- <button class="btn btn-question" data-toggle="modal" data-target="#infoLeadtimeModal">
							?
						</button> -->
					</th>
					<th>PO Date Est</th>
					<th>Batch</th>
					<th> Action</th>
				</tr>
			</thead>

			<tbody id="tableTengah">
			</tbody>

			<tfoot>
				<tr>
					<td></td>
					<td ><input type="button" value="Add Line" class="btn btn-primary btn-xs" id="addLineTableTengah" /></td>
					<td ><input type="button" value="Copy Line" class="btn btn-primary btn-xs" id="duplicateLineTableTengah" /></td>
					<td style="font-weight:bold;padding-right:24px;"></td>
					<td colspan=4></td>
					<td style="font-weight:bold;padding-right:17px;align-items:end;" class="totalQTY text-right" id="total-qty-main"></td>
					<td id="z"></td>
				</tr>
			</tfoot>
		</table>
		</div>
	</div>



	<div style="
			width: 100%;
			table-layout: fixed;">
		<div class="flex-table-container">
			<div class="row col-sm-6 tableCek" id="divTableKiri" style="flex:0 0 auto; margin-left: 10px; padding: 0 10px;">
				<div class="table-responsive-custom">
				<table class="table table-condensed table-stripe compact BigDataTableKiri" id="table-main_" style="margin-top:50px; min-width: 480px;
					width: 100%;
					table-layout: auto;">
					<thead>
						<tr>
							<th>Vendor</th>
							<th>Batch</th>
							<th>Blanket Est</th>
							<th>Total</th>
							<th>Action</th>
						</tr>
					</thead>
					<tbody class="tableKiri">
					</tbody>
					<tfoot>
						<tr class="tableKiriFoot">
							<td></td>
							<td></td>
							<td></td>
							<td class="tbodyTotal">000</td>
							<td></td>
						</tr>
					</tfoot>
				</table>
				</div>
			</div>
			<!-- Bungkus SEMUA dalam satu container -->
			<div class="container-fluid tableKananWrapper" style="flex:1 1 auto; min-width:0; padding: 0 10px;">
			
			<!-- Table Payment (Kiri) - Baris Pertama -->
			<div class="row-tableKanan">
				<div class="col-sm-12 tableCek tableKananHead" style="margin: 5px 0; padding: 0;">
				<div class="table-responsive-custom" id="judulTableKanan" style="font-weight:bold; visibility:hidden; margin-bottom: 10px;"></div>
				<table class="table table-condensed table-striped compact" id="tableKananHead"
					style="visibility:hidden; margin-top:20px; margin-bottom:0; border-right:none; min-width: 450px; width: auto; table-layout: auto;">
					<thead>
					<tr>
						<!-- <th style="width: 140px;">Payment Date</th> -->
						<th style="width: 150px;">Notes</th>
						<th style="width: 70px;">%</th>
						<th style="width: 90px;">From Value</th>
						<th style="width: 50px;">Alert</th>
						<th style="width: 55px;">
							Term (Days)
							<button class="btn btn-question" data-toggle="modal" data-target="#infoLeadtimeModal">
								?
							</button>
						</th>
						<th style="width: 100px;">OA Credit (%)</th>
						<th style="width: 50px;">Action</th>
					</tr>
					</thead>
					<tbody id="tableKanan"></tbody>
					<tfoot>
					<tr>
						<td colspan="2">
						<input type="button" value="Add Line" class="btn btn-primary btn-xs" id="addlineTableKanan" />
						<input type="button" value="Calculate Payment" class="btn btn-primary btn-xs" id="calculatePayment" />
						</td>
						<td id="total-qty-main" style="font-weight:bold;padding-right:24px;"></td>
						<td colspan="4"></td>
					</tr>
					</tfoot>
				</table>
				</div>
			</div>
			<div class="row" style="clear: both;">
			<div class="col-sm-12 tableKananCalc" style="margin-top: 15px; padding: 0;">
				<table id="tableKananCalc" class="table table-condensed table-striped compact" style="margin-bottom:0; visibility:hidden; width: 100%; table-layout: auto;">
				<thead>
					<tr>
					<th>Payment Date</th>
					<th>Alert</th>
					<th>Notes</th>
					<th>From Value</th>
					<th>%</th>
					<th class="text-right">Payment</th>
					</tr>
				</thead>
				<tbody id="tableKananCalcBody"></tbody>
				<tfoot>
					<tr>
					<td colspan="4" style="text-align:right; margin: right 40px;"></td>
					<span></span>
					<!-- <td id="totalPersenCalc"  class="pad-left"></td> -->
					<td></td>
					<td id="totalPaymentCalc"></td>
					</tr>
				</tfoot>
				</table>
			</div>
			</div>

			<!---- Modal Info Leadtime -->
			<div class="modal fade" id="infoLeadtimeModal" tabindex="-1" role="dialog">
			<div class="modal-dialog modal-sm" role="document">
				<div class="modal-content">
				<div class="modal-header">
					<h5 class="modal-title">Information of Term</h5>
					<button type="button" class="close" data-dismiss="modal" aria-label="Close">
					<span aria-hidden="true">&times;</span>
					</button>
				</div>
				<div class="modal-body">
					<p style="margin-bottom:4px;">Use (–) Term for date before shipment.</p>
					<p style="margin-bottom:0;">*Example: (–90) = 90 days before shipment.</p>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-primary btn-sm" data-dismiss="modal">OK</button>
				</div>
				</div>
			</div>
			</div>


			</div>
			<!-- modal save-->
			 <div class="modal" id="successModal"tabindex="-1" aria-hidden="true">
				<div class="modal-dialog" role="document">
					<div class="modal-content">
						<div class="modal-header">
							<input type="hidden" id="saved-docid" />
							<a style="font-weight:bold;font-size:16pt;">Purchase Plan Saved</a>
							<button type="button" class="close" data-dismiss="modal">&times;</button>
						</div>

						<div class="modal-body" style='font-size:14px;color:black;'>
							 <strong id="modalDocNumber"></strong>
							 <p>Your data has been successfully saved!</p>
						</div>

						<div class="modal-footer">
							<button type="button" class="btn btn-warning btn-custom" id="finish-close" data-dismiss="modal">Close</button>
						</div>
					</div>
				</div>
			</div> 
			<!-- End of aging modal -->

		</div>
	</div>
</div>

<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.bundle.min.js"></script>

<link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>


<script src="<?php echo base_url(); ?>js/scm/purchasing/purchase_plan/ajax.js"></script>
<script src="<?php echo base_url(); ?>js/scm/purchasing/purchase_plan/eventListener.js"></script>
<script>
	$(document).ready(function() {

		var today = new Date();
		var year = today.getFullYear();
		var month = (today.getMonth() + 1).toString().padStart(2, "0");
		var day = today.getDate().toString().padStart(2, "0");
		var formattedDate = year + "-" + month + "-" + day;
		document.getElementById("DocDate").value = formattedDate;

	});
</script>
</body>

</html>