	<title>Purchase Plan Edit</title>
	<script>
		const BASE_URL = '<?php echo base_url(); ?>';
	</script>

	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/jquery-contextmenu/2.7.1/jquery.contextMenu.min.css" crossorigin="anonymous">

	<link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />

	<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>
	<link rel="stylesheet" href="<?php echo base_url(); ?>css/custom-datatable/fixed-columns.min.css">

	<link rel="stylesheet" href="https://cdn.datatables.net/fixedheader/3.1.6/css/fixedHeader.dataTables.min.css">

	<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery-contextmenu/2.7.1/jquery.contextMenu.min.js" crossorigin="anonymous"></script>
	<script src="https://cdnjs.cloudflare.com/ajax/libs/jquery-contextmenu/2.7.1/jquery.ui.position.js" crossorigin="anonymous"></script>
	<script src="https://cdn.datatables.net/fixedheader/3.1.6/js/dataTables.fixedHeader.min.js"></script>

	<script>
		const planItemOptions = [];
	</script>

	<script src="<?php echo base_url(); ?>js/utility/decimal.min.js"></script>

	<style>
		/* === RESPONSIVE SCALING === */
		html {
			font-size: clamp(10px, 0.75vw, 14px);
		}
		
		body {
			overflow-x: auto;
		}

		.btn-custom {
			width: 100px;
		}

		.btn-history {
			color: #fff;
			background-color: #0056b3; 
			border: none;
			padding: 8px 16px;
			border-radius: 4px;
			font-size: 14px;
			font-weight: 500;
			cursor: pointer;
			transition: background-color 0.3s ease, transform 0.2s ease;
		}

		.btn-history:hover {
			background-color: #003f8a; 
			color: white;
		}


		.numeric {
			text-align: right;
		}

		table tbody tr td {
			white-space: nowrap
		}

		table thead tr th {
			white-space: nowrap
		}

		.payment-cn-icon {
			cursor: not-allowed;
		}

		.table.compact tbody {
			background-color: white;
		}

		#headTr {
			border-spacing: 0 !important;
			outline: none !important;
			box-shadow: none !important;
		}

		.content-wrapper {
			font-size: 8pt !important;
		}

		input {
			padding: 0 10px !important;
			height: 20px !important;
		}

		.bootstrap-select button {
			height: 20px;
			padding-top: 0px;
			padding-bottom: 0px;
		}

		.bootstrap-select {
			height: 20px
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

		#search-input {
			height: 30px !important;
			width: 150px !important;
			border-radius: 8px;
			margin-left: 10px;
			font-size: large;
		}

		#purchasePlanModal .modal-dialog {
			max-width: 95% !important;
			width: 95% !important;
		}
		.blanketPODateEstInput{
			width: 125px !important;
		}
		.modal-xl {
			max-width: 95% !important;
			width: 95% !important;
		}

		/* Your existing styles */
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
		/* Untuk input select2 yang terlihat di form */
		.select2-container--default .select2-selection--single {
		font-size: 14px; /* ubah ukuran di sini */
		}

		/* Untuk teks yang muncul setelah memilih */
		.select2-container--default .select2-selection__rendered {
		font-size: 14px;
		}

		/* Untuk daftar dropdown-nya */
		.select2-container--default .select2-results__option {
		font-size: 14px;
		}
		.select2-dropdown{
			width: 500px !important;
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
			text-align: left !important;
			overflow-x: scroll;
			width: 100%;
			table-layout: auto !important;
		}

		#table-main_ tbody {
			background-color: white;
			border-bottom: 2px solid black;
			border-top: 2px solid black;
			border-left: none;
			border-right: none;
		}
saya 
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
			text-align: left;
		}

		#table-main_ tbody td:nth-child(1) {
			max-width: 250px;
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}

		.content-wrapper {
			min-height: 100vh;
			width: 100%;
			overflow: auto;
			box-sizing: border-box;
			padding: 0 0.5% !important;
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

		input.wwColumn{
			text-align: right !important;
		}
		.select2-container .select2-selection--single {
		padding-left: 0 !important; /* hilangkan padding bawaan */
		}

		.select2-container .select2-selection__rendered {
		text-align: left !important;
		padding-left: 5px !important; /* kasih sedikit jarak kiri */
		}
		select.itemSelectColumn,
		select.vendorSelectColumn {
		text-align: left !important;           /* Untuk teks yang tampil */
		text-align-last: left !important;      /* Untuk opsi yang dipilih */
		padding-left: 0px !important;          /* Supaya tidak terlalu mepet */
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

		input.vendorColumnTableKiri{
			width: 220px;
		}

		input.batchColumnTableKiri{
			width: 50px;
			margin-left: 15px;
		}

		input.totalColumnTableKiri{
			width: 120px;
			margin-left: -40px;
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

		.table td.btn-col {
			text-align: left;
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
			border-right: none;
		}

		#tableTengah td {
			text-align: left;
			padding-left: 5px;
		}
		/* Khusus select2 yang dibikin dari select.itemSelectColumn */
		.itemSelectColumn + .select2-container .select2-selection--single {
		width: 180px !important;   /* ubah sesuai kebutuhan */
		}

		.itemSelectColumn {
		width: 100px !important; /* supaya penuh td */
		}

		.table td.item-code-col {
		width: 150px; /* kolom fix */
		}

		#tableTengah td .batch-field {
			margin: 0;
			padding: 0;
			vertical-align: middle;
			display: inline-block;
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
			padding-top: 10px !important;
			padding-left: 0 !important;
			padding-right: 5px !important;
		}

		#table-main_ thead,
		#tableKananHead thead {
			white-space: nowrap;
		}


		#table-main_ thead th,
		#tableKananHead thead th {
			vertical-align: middle;
			text-align: center;
			padding: 8px;
		}

		#table-main_ thead,
		#tableKananHead thead {
			table-layout: auto !important;
			width: 100% !important;
		}


		/* === TABLE KANAN HEAD - RESPONSIVE & COMPACT === */
		#tableKananHead {
			table-layout: auto;
			width: auto !important;
			max-width: 680px;
			min-width: 450px;
			margin-left: 0;
			border-collapse: collapse;
		}

		/* Wrapper untuk mengontrol pergeseran */
		.tableKananHead {
			justify-content: flex-start;
			padding-left: 0;
		}

		/* Untuk tampilan 100% - geser ke kanan (responsive berdasarkan layar) */
		.tableCek.tableKananHead {
			transform: translateX(0); /* Default tanpa geser */
		}

		/* Layar 15 inch keatas (1600px+) */
		@media screen and (min-width: 1500px) {
			/* .tableCek.tableKananHead {
				transform: translateX(75px);
			} */
		}

		/* Layar 14-15 inch (1366px - 1599px) */
		@media screen and (min-width: 1366px) and (max-width: 1499px) {
			/* .tableCek.tableKananHead {
				transform: translateX(30px);
			} */
		}

		/* Layar dibawah 14 inch (< 1366px) */
		@media screen and (max-width: 1365px) {
			.tableCek.tableKananHead {
				transform: translateX(0);
			}
		}

		/* Kolom dengan persentase - responsive otomatis */
		#tableKanan td:nth-child(1), #tableKananHead th:nth-child(1) {  width: 18%; min-width: 80px; } /* Notes */
		#tableKanan td:nth-child(2), #tableKananHead th:nth-child(2) { width: 10%; min-width: 50px; }  /* % */
		#tableKanan td:nth-child(3), #tableKananHead th:nth-child(3) {  width: 22%; min-width: 100px; }  /* From Value */
		#tableKanan td:nth-child(4), #tableKananHead th:nth-child(4) {  width: 24%; min-width: 120px; }  /* Alert */
		#tableKanan td:nth-child(5), #tableKananHead th:nth-child(5) { width: 10%; min-width: 60px; }  /* Term Days */
		#tableKanan td:nth-child(6), #tableKananHead th:nth-child(6) {  width: 10%; min-width: 60px; }  /* OA Credit */
		#tableKanan td:nth-child(7), #tableKananHead th:nth-child(7) { width: 6%; min-width: 40px; }   /* Action */

		/* Compact cell padding - hanya untuk table cells */
		#tableKananHead th,
		#tableKananHead td,
		#tableKanan td {
			padding: 4px 6px !important;
			font-size: 11px !important;
		}

		/* Judul Table Kanan - ukuran normal */
		#judulTableKanan {
			font-size: 14px !important;
			font-weight: bold !important;
			margin-bottom: 10px;
			margin-left: 0;
		}

		/* Desktop besar (1400px+) */
		@media (min-width: 1400px) {
			#tableKananHead {
				max-width: 720px;
				margin-left: 0;
			}
		}

		/* Desktop normal (1200-1399px) */
		@media (min-width: 1200px) and (max-width: 1399px) {
			#tableKananHead {
				max-width: 680px;
				margin-left: 0;
			}
		}

		/* Laptop (992-1199px) */
		@media (min-width: 992px) and (max-width: 1199px) {
			#tableKananHead {
				max-width: 620px;
				margin-left: 0;
			}
		}

		/* Tablet (768-991px) */
		@media (min-width: 768px) and (max-width: 991px) {
			#tableKananHead {
				max-width: 580px;
				min-width: 400px;
				margin-left: 0;
			}
			#tableKananHead th,
			#tableKanan td {
				padding: 3px 4px !important;
				font-size: 10px !important;
			}
		}

		/* Mobile/Small (< 768px) */
		@media (max-width: 767px) {
			#tableKananHead {
				max-width: 100%;
				min-width: 350px;
				margin-left: 0;
			}
			.tableKananHead {
				overflow-x: auto;
				padding-left: 0;
			}
		}
		.percenTableKanan{
			text-align: right !important;
		}
		.termDaysTableKanan{
			text-align: right !important;
		}
		.OACreditTableKanan {
			text-align: right !important;
			width: 120px !important;
		}
		.priceColumn{
			text-align: right !important;
			width: 115px !important;
		}
		/* Atau jika ingin mengatur per kolom */
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

		#table-main_ thead tr,
		#tableKananHead thead tr {
			height: 100%;
		}

		@media (min-width: 500px) and (max-width: 1450px) {
			.tableCek {
				overflow-x: auto;
			}

			#tableKananHead {
				width: 800px;
			}
		}

		/* ::-webkit-scrollbar {
			width: 0px;
			height: 0px;
			background-color: transparent;
		}

		::-webkit-scrollbar-thumb {
			background-color: transparent;
		}

		::-webkit-scrollbar-track {
			background-color: transparent;
		} */

		#purchasePlanTable {
			width: 100%;
			table-layout: auto;
			border-collapse: collapse;
		}
		#purchasePlanTable th:nth-child(1),
		#purchasePlanTable td:nth-child(1) {
			width: 200px !important; /* Vendor */
		}

		#purchasePlanTable th:nth-child(2),
		#purchasePlanTable td:nth-child(2) {
			width: 150px !important; /* Item */
		}

		#purchasePlanTable th:nth-child(3),
		#purchasePlanTable td:nth-child(3) {
			width: 100px !important; /* Color */
		}

		#purchasePlanTable th:nth-child(4),
		#purchasePlanTable td:nth-child(4) {
			width: 100px !important; /* Price */
			text-align: right !important;
			padding-right: 6px !important;
		}

		#purchasePlanTable th:nth-child(5),
		#purchasePlanTable td:nth-child(5) {
			width: 100px !important; /* TotalQtyBLG */
			text-align: right !important;
			padding-right: 6px !important;
		}
		#purchasePlanTable th:nth-child(n+6),
		#purchasePlanTable td:nth-child(n+6) {
			width: 50px !important; 
			text-align: right !important;
			padding-right: 6px !important;
		}

		#purchasePlanTable th,
		#purchasePlanTable td {
			white-space: nowrap;
			font-size: 10.5pt;
			vertical-align: middle;
			padding: 3px;
			height: 40px !important;
			text-align: left;
		}
		#purchasePlanTable tbody {
			border-top: 2px solid black;
		}

		#purchasePlanTable thead th {
			text-align: left !important;
		}

		.divBungkusTableReport {
			overflow-x: none;
			table-layout: fixed !important;
		}

		.BigDataTableTengah tbody td {
			text-align: center;
			vertical-align: middle;
		}

		#purchasePlanTable tbody {
			background: white;
		}
		/* Modal History Styling */
#historyModal .modal-dialog {
    margin: 5% auto; /* Kurangi margin top dari default 1.75rem */
    max-width: 800px; /* Lebih lebar untuk tampilan yang lebih baik */
    width: 90%; /* Responsive width */
}

/* Modal content styling */
#historyModal .modal-content {
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

/* Modal header styling */
#historyModal .modal-header {
    padding: 15px 20px 10px 20px; /* Kurangi padding bottom */
    border-bottom: 1px solid #e9ecef;
    background-color: #f8f9fa;
    border-radius: 8px 8px 0 0;
}

#historyModal .modal-header div {
    font-weight: 600;
    color: #343a40;
    margin: 0;
}

#historyModal .modal-header .close {
    padding: 0;
    margin: 0;
    font-size: 24px;
    font-weight: bold;
    color: #6c757d;
    opacity: 0.7;
    transition: opacity 0.2s;
}

#historyModal .modal-header .close:hover {
    opacity: 1;
    color: #495057;
}

/* Modal body styling */
#historyModal .modal-body {
    padding: 15px 20px; /* Kurangi padding top */
    background-color: #fff;
}

/* Table styling */
#historyModal #table-detail {
    margin-bottom: 0; /* Hilangkan margin bottom table */
    font-size: 14px;
}

#historyModal #table-detail thead th {
    background-color: #f8f9fa;
    font-weight: 600;
    color: #495057;
    border-top: none;
    padding: 12px 8px; /* Kurangi padding vertical */
    font-size: 13px;
    text-align: center;
    vertical-align: middle;
}

#historyModal #table-detail tbody td {
    padding: 10px 8px; /* Kurangi padding vertical */
    vertical-align: middle;
    text-align: center;
    font-size: 13px;
}

/* Styling untuk kolom tanggal */
#historyModal #table-detail tbody td:nth-child(1),
#historyModal #table-detail tbody td:nth-child(2) {
    
    font-size: 14px;
    white-space: nowrap;
}

/* Button styling */
#historyModal .btn-primary {
    background-color: #007bff;
    border-color: #007bff;
    font-size: 12px;
    padding: 4px 12px;
    border-radius: 4px;
    transition: all 0.2s;
}

#historyModal .btn-primary:hover {
    background-color: #0056b3;
    border-color: #004085;
    transform: translateY(-1px);
}

/* Modal footer */
#historyModal .modal-footer {
    padding: 10px 20px;
    border-top: 1px solid #e9ecef;
    background-color: #f8f9fa;
    border-radius: 0 0 8px 8px;
}
#totalTableKiri {
    font-weight: 700 !important;
	font-size: 15px !important;
}


/* DataTable wrapper styling */
#historyModal .dataTables_wrapper {
    margin-top: 0;
}
#historyModal .dataTables_wrapper .dataTables_info,
#historyModal .dataTables_wrapper .dataTables_paginate {
    margin-top: 10px;
}
		/* === TABLE KANAN CALC - CLEAN LAYOUT === */
		.tableKananCalc table {
		border-collapse: collapse !important;
		width: 100% !important;
		margin: 0 !important;
		table-layout: fixed !important;
		font-size: 13px !important;
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
		#tableKananCalc th:nth-child(3),
		#tableKananCalc td:nth-child(3) {
		width: 35% !important;
		}

		#tableKananCalc th:nth-child(4) { width: 60px; }
		#tableKananCalc th:nth-child(5) { width: 120px; }
		#tableKananCalc th:nth-child(6) { width: 120px; }
		/* Tag warna kecil (From Value) */
		#tableKananCalc th:nth-child(3) {
		white-space: normal !important;
		}

		.tableKananCalc td:nth-child(3) {
		white-space: normal !important;
		word-break: break-word !important;
		overflow-wrap: anywhere !important;
		}

/* L

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
		.table-payment {
		table-layout: fixed;
		width: 100%;
		}

		/* NOTES column */
		.table-payment td.notes-col {
		white-space: normal;
		word-break: break-word;
		overflow-wrap: anywhere;
		}

		/* Badge From Value */
		.badge-fromvalue {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		white-space: nowrap;
		}

/* Responsive untuk mobile */
@media (max-width: 768px) {
    #historyModal .modal-dialog {
        margin: 2% auto;
        width: 95%;
    }
    
    #historyModal .modal-body {
        padding: 10px 15px;
    }
    
    #historyModal #table-detail {
        font-size: 12px;
    }
    
    #historyModal #table-detail thead th,
    #historyModal #table-detail tbody td {
        padding: 8px 4px;
    }
}

/* Untuk layar kecil, buat table scroll horizontal */
@media (max-width: 576px) {
    #historyModal .table-responsive {
        border: none;
    }
    
    #historyModal #table-detail {
        min-width: 500px;
    }
}

		/* === RESPONSIVE LAYOUT FOR DIFFERENT SCREEN SIZES === */
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

		/* Table Kanan Wrapper */
		.container-fluid {
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

		/* Responsive table inputs */
		table input,
		table select {
			min-width: 70px;
			max-width: 100%;
		}

		/* === SCALING FOR DIFFERENT SCREEN SIZES === */
		@media screen and (min-width: 1920px) {
			html {
				font-size: 14px;
			}
			#divTableKiri {
				max-width: 35%;
				min-width: 380px;
			}
			.container-fluid {
				max-width: 50%;
			}
		}

		@media screen and (min-width: 1600px) and (max-width: 1919px) {
			html {
				font-size: 12px;
			}
			#divTableKiri {
				max-width: 35%;
				min-width: 380px;
			}
			.container-fluid {
				max-width: 50%;
			}
		}

		@media screen and (min-width: 1366px) and (max-width: 1599px) {
			html {
				font-size: 11px;
			}
			#divTableKiri {
				max-width: 38%;
				min-width: 420px;
			}
			.container-fluid {
				transform: translateX(50px);
				max-width: 50%;
			}
		}

		@media screen and (min-width: 1280px) and (max-width: 1365px) {
			html {
				font-size: 10px;
			}
			#divTableKiri {
				max-width: 35%;
				min-width: 380px;
			}
			.container-fluid {
				max-width: 60%;
			}
		}

		@media screen and (max-width: 1279px) {
			html {
				font-size: 9px;
			}
			#divTableKiri {
				max-width: 100%;
				min-width: unset;
				flex: 1 1 100%;
			}
			.container-fluid {
				max-width: 100%;
				flex: 1 1 100%;
			}
			/* Stack tables vertically on smaller screens */
			div[style*="display: flex"][style*="justify-content: space-between"] {
				flex-wrap: wrap !important;
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
	<div class="content-wrapper" style="overflow:auto;padding:0 1%;">

		<div class="row" style="padding-top:5px; ">
			<div class="col-sm-4">
				<p style="font-size:20px;font-weight:bold;">Edit Purchase Plan (SPPLN)</p>
			</div>

			<div class="col-sm-4" style="padding-left:0px;padding-right:0px;">

			</div>

			<div class="col-sm-4" style="text-align:right;">
				<button class="btn btn-success btn-custom btn-save">Save</button>
				<button class="btn btn-danger btn-custom btn-exit">Exit</button>
				<button class="btn btn-history">
					History Edit
				</button>



			</div>
			
		</div>

		<!-- table report -->
		<div class="col-sm-12 parent-flex-container" style="margin-top:40px;">
			<div class="col-sm-3"></div>
			<div class="col-sm-9 d-flex justify-content-center align-items-center" style=" height:100%;">
				<p class="w-100 text-center" style="font-weight:bold; font-size:medium; margin:0;">ETD (VESSEL depart HK).</p>
			</div>
		</div>
		<div class="row col-sm-12 divBungkusTableReport" style="margin-top:20px; margin-bottom:100px; table-layout: fixed;">
			<table id="purchasePlanTable" style="min-width: 1500px;">
				<thead>
					<tr>
						<th style="width: 5.33%;">DocNumber</th>
						<th style="width: 5.33%;">Vendor</th>
						<th style="width: 5.33%;">Item</th>
						<th style="width: 5.33%;">Color</th>
						<th style="width: 5.33%;">Price</th>
						<th style="width: 5.33%;">TotalQtyBLG</th>
					</tr>
				</thead>
				<tbody>
				</tbody>
			</table>


		</div>
		<!-- tutup table report -->

		<!-- div docDate  -->
		<div class="tab-content px-4">
			<div class="tab-pane fade in active" id="poPlanEntry">
				<div class="row">
					<div class="col-sm-2"> <label style="margin-bottom:4px; font-size:14px;">Doc Date</label>
						<input class="form-control " type="date" style="cursor:pointer;" id="DocDate" disabled></input>
					</div>
				</div>
				<div class="row mt-3">
					<div class="col-sm-4">
						<label style="margin-bottom:4px; font-size:14px;">Item Desc</label>
						<input type="text" class="form-control text  input-text" id="ItemDesc" style="text-align: left; width: 250px" />
					</div>
				</div>
				<div class="row mt-2">
				<div class="col-sm-2">
					<label style="margin-bottom:0px;">Currency</label>
					<select class="selectpicker form-control input-sm" id="currency"></select>
				</div>
				<div class="col-sm-2" style="padding-left:0px">
					<label style="margin-bottom:0px;">Rate</label>
					<input type="text" class="form-control numeric input-sm input-numeric" style="width: 120px;" id="rate" disabled />
				</div>
			</div>
			</div>
		</div>
		<!-- tutup div docDate -->

		<!-- divTableTengah -->
		<div class="row col-sm-12 tableCek" style="margin-top:20px;">
			<div class="table-responsive-custom">
			<table class="table table-condensed table-stripe compact BigDataTableTengah" style="min-width: 1200px; width: 100%; table-layout: auto; text-align:center;">
				<thead>
					<tr>
						<th style="width: 5%;" class="column-no">#</th>
						<th style="width: 5.5%;">Item Code</th>
						<th style="width: 5.5%;">Item Unit</th>
						<th style="width: 12.5%;">Vendor</th>
						<th style="width: 6.5%;">Color</th>
						<th style="width: 10.5%;">Year</th>
						<th style="width: 5.5%;">WW</th>
						<th style="width: 10.5%;">ShipmentDate</th>
						<th style="width: 10.5%;">Qty</th>
						<th style="width: 12.5%;">Price</th>
						<th style="width: 5.5%;">Leadtime
							<!-- <button class="btn btn-question" data-toggle="modal" data-target="#infoLeadtimeModal">
								?
							</button> -->
						</th>
						<th style="width: 5.5%;">PO Date Est</th>
						<th style="width: 5%;">Batch</th>
						<th style="width: 6%;">Action</th>
					</tr>
				</thead>
				<tbody id="tableTengah">
				</tbody>
				<tfoot>
					<tr>
						<td></td>
						<td class="btn-col"><input type="button" value="Add Line" class="btn btn-primary btn-xs" id="addLineTableTengah" /></td>
						<td class="btn-col"><input type="button" value="Copy Line" class="btn btn-primary btn-xs" id="duplicateLineTableTengah" /></td>
						<td style="font-weight:bold;padding-right:24px;"></td>
						<td></td>
						<td  colspan="4" style="font-weight:bold;padding-left:370px; font-size: 15px;" class="totalQTY" id="total-qty-main">0</td>
						<td id="z"></td>
					</tr>
				</tfoot>
			</table>
			</div>
		</div>
		<!-- tutup divTableTengah -->



		<!-- div tableDetail -->
		<div style="
			width: 100%;">
			<div class="flex-table-container">
				<div class="row tableCek" id="divTableKiri" style="flex:0 0 auto; padding: 0 10px;">
					<table class="table table-condensed table-stripe compact BigDataTableKiri" id="table-main_" style="margin-top:50px; min-width: 480px;
			width: 100%;
			table-layout: auto;">
						<thead>
							<tr>
								<th style="width: 200px;">Vendor</th>
								<th style="width: 50px;">Batch</th>
								<th style="width: 50px;">Blanket Est</th>
								<th style="width: 100px;">Total</th>
								<th style="width: 100px;">Detail</th>
								<th style="width: 100px;">Action</th>
							</tr>
						</thead>
						<tbody class="tableKiri">
						</tbody>
						<tfoot>
							<tr class="tableKiriFoot">
								<td></td>
								<td></td>
								<td></td>
								<td id="totalTableKiri" class="tbodyTotalTableKiri">000</td>

								<td></td>
							</tr>
						</tfoot>
					</table>
				</div>

				<!-- Tambahkan container-fluid agar baris tidak sejajar -->
				<div class="container-fluid tableKananWrapper" style="flex:1 1 auto; min-width:0; padding: 0 10px;">

				<!-- === TABLE KANAN HEAD === -->
				<div class="row">
					<div class="col-sm-12 tableCek tableKananHead" style="margin: 10px; margin-top:10px;">
					<div id="judulTableKanan" style="font-weight:bold; visibility:hidden; font-weight:large;"></div>
					<table class="table table-condensed table-stripe compact" id="tableKananHead"
							style="visibility:hidden; margin-top:20px; border-right:none; width: auto; table-layout: auto;">
						<thead>
						<tr>
							<th>Notes</th>
							<th>%</th>
							<th>From Value</th>
							<th>Alert</th>
							<th>
								Term (Days)
								<button class="btn btn-question" data-toggle="modal" data-target="#infoLeadtimeModal">
									?
								</button>
							</th>
							<th>OA Credit</th>
							<th>Action</th>
						</tr>
						</thead>
						<tbody id="tableKanan"></tbody>
						<tfoot>
						<tr>
							<td colspan="2">
							<input type="button" value="Add Line" class="btn btn-primary btn-xs" id="addlineTableKanan" />
							<input type="button" value="Duplicate Payment" class="btn btn-primary btn-xs" id="duplicatePayment" />
							<input type="button" value="Calculate Payment" class="btn btn-primary btn-xs" id="calculatePayment" />
							</td>
							<td id="total-qty-main" style="font-weight:bold;padding-right:24px;"></td>
							<td colspan="4"></td>
						</tr>
						</tfoot>
					</table>
					</div>
				</div>

				<!-- === TABLE KALKULASI === -->
				<div class="row" style="clear: both;">
					<div class="col-sm-12 tableKananCalc" style="margin-top: 15px; padding: 0 15px;">
					<table id="tableKananCalc" class="table table-condensed table-striped compact table-payment" style="margin-bottom:0; visibility:hidden; width: auto; table-layout: auto;">
						<thead>
						<tr>
							<th>Payment Date</th>
							<th>Alert</th>
							<th>Notes</th>
							<th>From Value</th>
							<th>%</th>
							<th>Payment</th>
						</tr>
						</thead>
						<tbody id="tableKananCalcBody"></tbody>
						<tfoot>
						<tr>
							<td colspan="4" style="text-align:right;  margin: right 40px;"></td>
							<span></span>
							<!-- <td id="totalPersenCalc" class="pad-left"></td> -->
							<td></td>
							<td id="totalPaymentCalc" style="text-align: right;"></td>
						</tr>
						</tfoot>
					</table>
					</div>
				</div>

				</div> <!-- Tutup container-fluid -->


			<!-- Modal History -->
			<div class="modal fade" id="historyModal">
				<div class="modal-dialog">
					<div class="modal-content">
						<div class="modal-header">
							<div style="float:left; font-size:19px;">History Edit</div>
							<button type="button" class="close" data-dismiss="modal">&times;</button>
						</div>
						<div class="modal-body">
							<div class="table-responsive">
								<table class="table table-condensed table-striped compact" id="table-detail" width="100%">
									<thead>
										<tr>
											<th>Start Date</th>
											<th>End Date</th>
											<th>Edit User</th>
											<th>Action</th>
										</tr>
									</thead>
									<tbody></tbody>
								</table>
							</div>
						</div>
						<div class="modal-footer"></div>
					</div>
				</div>
			</div>

			<!-- Modal Detail (Modal baru) -->
			<div class="modal fade" id="detailModal">
				<div class="modal-dialog modal-xl">
					<div class="modal-content">
						<div class="modal-header">
							<h5 class="modal-title" id="detailModalTitle">History StartDate - EndDate</h5>
							<button type="button" class="close" data-dismiss="modal">&times;</button>
						</div>
						<div class="modal-body">
							<!-- Shipment Plan Section -->
							<div class="mb-4">
								<div class="section-title">SHIPMENT PLAN</div>
								<div class="table-responsive">
									<table class="table table-bordered table-striped" id="shipment-plan-table">
										<thead>
											<tr>
												<th class="text-left">Item Code</th>
												<th class="text-left">Vendor</th>
												<th class="text-left">Color</th>
												<th class="text-left">Shipment Date</th>
												<th class="text-right">WW</th>
												<th class="text-right">Qty</th>
												<th class="text-right">Price</th>
											</tr>
										</thead>
										<tbody>
											<!-- Data akan diisi via JavaScript -->
										</tbody>
									</table>
								</div>
							</div>

							<!-- Payment Plan Section -->
							<div>
								<div class="section-title">PAYMENT PLAN</div>
								<div class="table-responsive">
									<table class="table table-bordered table-striped" id="payment-plan-table">
										<thead>
											<tr>
												<th class="text-left">Payment Date</th>
												<th class="text-left">Notes</th>
												<th class="text-right">%</th>
												<th class="text-left">From Value</th>
												<th class="text-left">Alert</th>
												<th class="text-right">Term (days)</th>
												<th class="text-right">OA Credit (%)</th>
											</tr>
										</thead>
										<tbody>
											<!-- Data akan diisi via JavaScript -->
										</tbody>
									</table>
								</div>
							</div>
						</div>
						<div class="modal-footer">
							<button type="button" class="btn btn-close-detail" data-dismiss="modal">Close</button>
						</div>
					</div>
				</div>
			</div>
			<!---- Modal Info Leadtime -->
			<div class="modal fade" id="infoLeadtimeModal" tabindex="-1" role="dialog">
			<div class="modal-dialog modal-sm" role="document">
				<div class="modal-content">
				<div class="modal-header">
					<h5 class="modal-title">Information for Term</h5>
					<button type="button" class="close" data-dismiss="modal" aria-label="Close">
					<span aria-hidden="true">&times;</span>
					</button>
				</div>
				<div class="modal-body">
					<p style="margin-bottom:4px;">Use (–) for term date before shipment.</p>
					<p style="margin-bottom:0;">*Example: (–90) = 90 days before shipment.</p>
				</div>
				<div class="modal-footer">
					<button type="button" class="btn btn-primary btn-sm" data-dismiss="modal">OK</button>
				</div>
				</div>
			</div>
			</div>
			<!-- Modal Progress Saving -->
			<div class="modal fade" id="progressModal" data-backdrop="static" data-keyboard="false">
			<div class="modal-dialog modal-dialog-centered">
				<div class="modal-content">
				<div class="modal-header">
					<h5 class="modal-title">Saving Data...</h5>
				</div>
				<div class="modal-body">
					<div class="progress" style="height: 25px;">
					<div 
						id="progressBar" 
						class="progress-bar progress-bar-striped progress-bar-animated" 
						role="progressbar" 
						style="width: 0%">
						<span id="progressText">0%</span>
					</div>
					</div>
					<div class="mt-3">
					<small id="progressStatus" class="text-muted">Saving header plan...</small>
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
							<a style="font-weight:bold;font-size:16pt;">Edit Purchase Plan Saved</a>
							<button type="button" class="close" data-dismiss="modal">&times;</button>
						</div>

						<div class="modal-body" style='font-size:14px;color:black;'>
							 <p>Data has been succesfully saved with DocNumber: <strong id="modalDocNumber"></strong></p>
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
		<!-- div tutup tableDetail -->
		<script src="<?php echo base_url(); ?>js/scm/purchasing/purchase_plan_edit/eventlistener.js"></script>
	</div>