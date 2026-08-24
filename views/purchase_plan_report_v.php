	<title>Purchase Plan Report</title>
	<script>
		const BASE_URL = '<?php echo base_url(); ?>';
	</script>


	<script>
		const planItemOptions = [];
	</script>
	<script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

	<!-- Bootstrap 3 -->
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.7/css/bootstrap.min.css">
	<script src="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.7/js/bootstrap.min.js"></script>

	<!-- DataTables -->
	<link rel="stylesheet" href="https://cdn.datatables.net/1.11.5/css/jquery.dataTables.min.css">
	<link rel="stylesheet" href="https://cdn.datatables.net/buttons/2.2.2/css/buttons.dataTables.min.css">

	<script src="https://cdn.datatables.net/1.11.5/js/jquery.dataTables.min.js"></script>
	<script src="https://cdn.datatables.net/buttons/2.2.2/js/dataTables.buttons.min.js"></script>
	<script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.1.3/jszip.min.js"></script>
	<script src="https://cdn.datatables.net/buttons/2.2.2/js/buttons.html5.min.js"></script>

	<!-- Bootstrap Datepicker -->
	<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-datepicker/1.9.0/css/bootstrap-datepicker.min.css">
	<script src="https://cdnjs.cloudflare.com/ajax/libs/bootstrap-datepicker/1.9.0/js/bootstrap-datepicker.min.js"></script>

	<!-- jQuery UI (only if really needed) -->
	<link rel="stylesheet" href="https://code.jquery.com/ui/1.13.2/themes/base/jquery-ui.css">
	<script src="https://code.jquery.com/ui/1.13.2/jquery-ui.min.js"></script>
	<script src="https://cdn.jsdelivr.net/npm/sortablejs@latest/Sortable.min.js"></script>

	<!-- DataTables FixedColumns -->
	<link rel="stylesheet" href="https://cdn.datatables.net/fixedcolumns/4.3.0/css/fixedColumns.dataTables.min.css">
	<script src="https://cdn.datatables.net/fixedcolumns/4.3.0/js/dataTables.fixedColumns.min.js"></script>

	<!-- Select2 CSS & JS -->
	<link href="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css" rel="stylesheet" />
	<script src="https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js"></script>

	<script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>




	<!-- File JS kamu -->
	<script src="<?php echo base_url(); ?>js/scm/purchasing/purchase_plan_report/eventlistener.js"></script>

	<style>
		.divParent {
			margin-top: -25px;
			height: 540px;
			overflow-y: auto;
			width: 100%;
			scrollbar-width: auto;
			overflow-x: auto;
			z-index: 999 !important;

			&::-webkit-scrollbar {
				width: 0;
				display: auto;
			}
		}

		body::-webkit-scrollbar {
			height: 4px;
		}

		.btn-custom {
			width: 100px;
		}

		.numeric {
			text-align: right;
		}

		table tbody tr td {
			white-space: nowrap;
			line-height: 0.7 !important;
		}

		table thead tr th {
			white-space: nowrap;
			line-height: 2.5em;
			font-size: 12px;
		}

		tbody {
			background-color: white;
			border-top: 2px solid black;
		}

		.payment-cn-icon {
			cursor: not-allowed;
		}

		.table.compact tbody {
			background-color: white;
		}
		/* Fixed Controls Container */
		/* Custom Button Styling */
		.btn-custom {
			background: white !important;
			border:rgba(63, 63, 63, 0.2) !important;
			color: black !important;
			font-size: 14px !important;
			padding: 8px 16px !important;
			margin-right: 5px !important;
			border-radius: 2px !important;
			transition: all 0.3s ease !important;
		}

		.btn-custom:hover {
			background: white !important;
			color: black !important;
			transform: translateY(-1px);
			box-shadow: 0 4px 8px rgba(0,0,0,0.2);
		}
		/* Kolom Checkbox */
		#purchasePlanTableLeft .checkbox-col {
			width: 40px !important;
			min-width: 40px !important;
			max-width: 40px !important;
			padding: 1px 2px !important;
			text-align: center !important;
		}

		/* khusus header kolom checkbox */
		#purchasePlanTableLeft th.checkbox-col {
			position: sticky !important;
			width: 70px !important;
		}

		/* Input checkbox styling */
		#purchasePlanTableLeft .checkbox-col input[type="checkbox"] {
			width: 10px;
			height: 10px;
			margin: 0;
			padding: 0;
			vertical-align: middle;
			cursor: pointer;
		}
		/* Kolom Vendor */
		#purchasePlanTableLeft .vendor-col {
			width: 52px !important;
			padding-left: 10px !important;	
			
		}
		/* khusus header kolom vendor */
		#purchasePlanTableLeft th.vendor-col {
			position: sticky !important;
			width: 70px !important;
		}


		/* Kolom ItemDesc - lebih lebar */
		#purchasePlanTableLeft .itemdesc-col {
			width: 50px !important;
		}
		#purchasePlanTableLeft th.itemdesc-col {
			width: 150px !important;
			position: sticky !important;
			z-index: 12 !important;
		}

		/* Kolom Color */
		#purchasePlanTableLeft .color-col {
			width: 25px !important;
			position: sticky !important;
			z-index: 12 !important;
		}
		#purchasePlanTableLeft th.color-col {
			width: 25px !important;
			position: sticky !important;
			z-index: 42 !important;
		}
		#purchasePlanTableRight {
		border-collapse: collapse;
		width: 100%;
		padding-top: 7px !important;
		}

		#purchasePlanTableRight thead th {
		position: sticky;
		top: 0;
		background: white;
		z-index: 100;
		box-shadow: 0 2px 2px -1px rgba(0, 0, 0, 0.1); /* opsional: shadow bawah */
		}

		/* biar ada scroll di tbody */
		#right-container {
		max-height: 554px;
		height: fit-content;          /*  Menyesuaikan dengan konten, tidak force 534px */
		overflow-y: auto;
		overflow-x: auto;
		position: relative;
		padding-right: 8px;
		padding-bottom: 8px;
		box-sizing: border-box;
		}
		/* Semua kolom WW */
		#purchasePlanTableRight [class*="ww"][class*="-col"] {
			width: 10px !important;
			min-width: 10px !important;
			max-width: 46px !important;
			text-align: center !important;
		}

				/* Kolom Batch */
		#purchasePlanTableLeft .batch-col {
			width: 10px !important;
			padding-right: 40px !important;
			text-align: right !important;
			position: sticky !important;
			z-index: 12 !important;
		}

		/* Font Sizes */
		#purchasePlanTable {
			font-size: 8px !important;
			table-layout: fixed !important;
			border-collapse: collapse;
			width: 100%;
		}

		#purchasePlanTable thead th {
			font-size: 8px !important;
			font-weight: bold !important;
			text-align: center;
			display: none;
		}
		/* Tombol di dalam cell mingguan */
		#purchasePlanTableRight .ww-btn {
		margin-left: 10px !important;
		   /* batasi lebar tombol */
		}
		div.dataTables_scrollHead {
		overflow: visible !important;
		}
		div.dataTables_scrollBody {
		overflow: visible !important;
		}
		table.dataTable thead th {
		background: #fff;   /* biar header putih */
		position: fixed;
		top: 0;
		z-index: 100;
		}




		/* Search Input Styling */
		.dataTables_filter input {
			font-size: 14px !important;
			padding: 6px 12px !important;
			padding-right: 12px !important;
			border: 2px solid #ddd !important;
			border-radius: 4px !important;
			margin-left: 2px !important;
			width: 120px !important;
			height: 30px !important;
		}
		.dataTables_filter {
			margin-top: -55px !important;   /* naikkan posisi search */
			float: right !important;        /* tetap di kanan */
			padding-right: 10px !important; /* sesuaikan kebutuhan */
			margin-right: 90px !important; 
			position: relative !important;  
			z-index: 1000 !important;
		}
		.dataTables_filter label{
			font-size: 14px !important;
		}

		/* Length Select Styling */
		.dataTables_length select {
			font-size: 14px !important;
			padding: 6px 12px !important;
			border: 2px solid #ddd !important;
			border-radius: 4px !important;
			margin: 0 8px !important;
		}

		/* Info and Pagination Styling */
		.dataTables_info {
			font-size: 14px !important;
			font-weight: 600 !important;
			color: #333 !important;
			margin: 0 !important;
			padding: 10px 0 !important;
			float:  left !important;
		}

		.dataTables_paginate {
			font-size: 14px !important;
			font-weight: 600 !important;
			margin: 0 !important;
			padding: 10px 0 !important;
			float: right !important;     /* paksa ke kanan */
			text-align: right !important;
			padding-right: 40px !important;
		}

		/* Pagination Button Styling */
		.dataTables_paginate .paginate_button {
			font-size: 14px !important;
			padding: 8px 12px !important;
			margin: 0 2px !important;
			border: 1px solid #ddd !important;
			border-radius: 4px !important;
			background: white !important;
			color: #337ab7 !important;
			text-decoration: none !important;
			display: inline-block !important;
			transition: all 0.3s ease !important;
			cursor: pointer;
		}

		.dataTables_paginate .paginate_button:hover {
			background: #f5f5f5 !important;
			border-color: #337ab7 !important;
			color: #23527c !important;
			cursor: pointer;
		}

		.dataTables_paginate .paginate_button.current,
		.dataTables_paginate .paginate_button.current:hover {
			background:  #3498db  !important;
			border-color: #3498db !important;
			color: white !important;
			font-weight: bold !important;
			cursor: pointer;
		}

		.dataTables_paginate .paginate_button.disabled,
		.dataTables_paginate .paginate_button.disabled:hover {
			background: #f8f9fa !important;
			border-color: #ddd !important;
			color: #6c757d !important;
			cursor: not-allowed !important;
		}

		/* Bottom Controls Container Styling */
		.bottom-controls {
			border-radius: 4px;
			padding: 15px !important;
			margin-top: 15px;
		}

		#info-container {
			display: flex;
			align-items: center;
		}

		#pagination-container {
			display: flex;
			justify-content: flex-end;
			align-items: center;
		}

		.selected-row td.main-column,
		.selected-row td.checkbox-col {
		background-color: #0032589e !important;
		opacity: 40% !important;
		}

		.selected-row td.week-column {
		background-color: #6d6d6d9e !important;
		opacity: 40% !important;
		}
		/* Hover Effect */
		#purchasePlanTable tbody tr:hover {
			background-color: #f5f5f5;
			cursor: pointer;
		}

		/* Scrollbar Styling */
		.table-scroll-container::-webkit-scrollbar {
			width: 8px;
		}

		.table-scroll-container::-webkit-scrollbar-track {
			background: #f1f1f1;
			border-radius: 4px;
		}

		.table-scroll-container::-webkit-scrollbar-thumb {
			background: #878787ff;
			border-radius: 4px;
		}

		.table-scroll-container::-webkit-scrollbar-thumb:hover {
			background:  #878787ff;
		}


		/* Hide default DataTables wrappers yang akan kita pindah */
		.dataTables_wrapper .dataTables_length,
		.dataTables_wrapper .dataTables_filter,
		.dataTables_wrapper .dataTables_info,
		.dataTables_wrapper .dataTables_paginate {
			float: none !important;
			margin: 0 !important;
		}
		

		/* Styling untuk container yang menampung controls */
		#buttons-container,
		#search-container,
		#length-container,
		#info-container,
		#pagination-container {
			min-height: 40px;
			display: flex;
			align-items: center;
		}

		#search-container {
			justify-content: flex-end;
		}

		#pagination-container {
			justify-content: flex-end;
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

		.modal-xl {
			max-width: 95% !important;
			width: 95% !important;
		}


		#purchasePlanTable thead {
			display: table;
			width: 100%;
			table-layout: fixed;
			/* Memastikan lebar kolom tetap konsisten */
			position: sticky;
			font-size: 20px;
			top: 0;
			z-index: 10;
			background-color: white;
		}


		#purchasePlanTable tbody {
			display: block;
			max-height: 580px !important;
			/* Sesuaikan dengan tinggi .divParent */
			overflow-y: auto;
			overflow-x:hidden;
			scrollbar-width: none;
		}

		#purchasePlanTable thead tr,
		#purchasePlanTable tbody tr {
			display: table;
			margin-right: 15px;
			width: 100%;
			table-layout: fixed;
		}

		#purchasePlanTableRight_wrapper .dataTables_scrollHead {
		position: sticky !important;
		top: 0 !important;
		z-index: 100 !important;
		}
		div.dataTables_scrollHead {
		display: none !important;
		}
		

		#purchasePlanTableLeft tbody tr td {
			white-space: nowrap;
			overflow: auto;
			text-overflow: ellipsis;
			box-sizing: content-box;
			padding: 7.5px 4px !important;
		}
		#purchasePlanTableRight tbody tr td {
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			box-sizing: content-box;
			padding: 1.76px 2px !important;
		}
		
		#purchasePlanTable tr td {
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
			box-sizing: content-box;
			margin-right: 8px;
		}


		#purchasePlanTable tbody tr.selected-row {
			background-color: #add8e6;
			cursor: pointer;
		}

		#purchasePlanTable tbody tr:hover {
			background-color: #f5f5f5;
			cursor: pointer;
		}
/* Lebar kolom fix biar table panjang bisa discroll */
		#purchasePlanTable thead th,
		#purchasePlanTable tbody td {
		min-width: 40px;   /* kecilkan kolom */
		max-width: 100px;  /* jangan terlalu lebar */
		white-space: nowrap; /* biar teks tidak turun ke bawah */
		overflow: hidden;
		text-overflow: ellipsis;
		font-size: 11px;   /* kecilkan font */
		padding: 4px 6px;  /* kecilkan padding */
		line-height: 0.8 !important;
		}

		/* Kolom khusus bisa diatur manual */
		#purchasePlanTable thead tr th:nth-child(1),
		#purchasePlanTable tbody tr td:nth-child(1) {
		max-width: 8%; /* DocDate */
		position: sticky !important;
		z-index: 12 !important;
		}

		#purchasePlanTable thead tr th:nth-child(2),
		#purchasePlanTable tbody tr td:nth-child(2) {
		max-width: 8%; /* DocNumber */
		position: sticky !important;
		z-index: 12 !important;
		}

		#purchasePlanTable thead tr th:nth-child(3),
		#purchasePlanTable tbody tr td:nth-child(3) {
		max-width: 8%; /* Item */
		position: sticky !important;
		z-index: 12 !important;
		}

		#purchasePlanTable thead tr th:nth-child(4),
		#purchasePlanTable tbody tr td:nth-child(4) {
		max-width: 8%; /* Vendor */
		position: sticky !important;
	    z-index: 12 !important;
		}

		#purchasePlanTable thead tr th:nth-child(5),
		#purchasePlanTable tbody tr td:nth-child(5) {
		max-width: 8%; /* Color */
		position: sticky !important;
	    z-index: 12 !important;
		}

		#purchasePlanTable thead tr th:nth-child(6),
		#purchasePlanTable tbody tr td:nth-child(6) {
		max-width: 8%; /* Batch */
		position: sticky !important;
		z-index: 12 !important;
		}

		/* Sisanya (kolom 12 sampai 50) */
		#purchasePlanTable thead tr th:nth-child(n+7),
		#purchasePlanTable tbody tr td:nth-child(n+7) {
		max-width: 100px;
		}

		.table.dataTable tbody tr {
			height: 20px !important;
		}

		.table-responsive {
		overflow-x: auto;   /* scroll horizontal */
		}
		#purchasePlanTable {
		font-size: 8px;   /* biar muat lebih banyak */
		min-width: 6000px; /* paksa tabel jadi lebar, bisa 4000px kalau 50 kolom */
		white-space: nowrap;
		}
		/* Supaya mirip modal ke-2 */
		#filterModal .modal-dialog {
		width: 700px !important;  /* modal lebih lebar */
		max-width: 90% !important;
		}

		#filterModal .form-group {
		margin-bottom: 10px !important;
		}

		#filterModal label {
		font-weight: 600 !important;
		font-size: 13px !important;
		margin-bottom: 3px !important;
		}

		#filterModal .input-group .form-control {
			width: 100% !important;
		}
		#filterModal .form-control {
			width: 40% !important;
		}

		#filterModal input,
		#filterModal select {
		height: 38px !important;
		font-size: 14px !important;
		padding: 5px 10px !important;
		}
		.modal-body .form-group {
		margin-bottom: 0; /* hilangkan jarak bawaan */
		}
		#shipmentBatchTable .form-group {
		margin-bottom: 0; /* hilangkan jarak bawaan */
		}

		#shipmentBatchTable {
		margin-bottom: 5px; /* kecil saja supaya ada sedikit napas */
		}

		#weekModal .footer-btn {
		text-align: right;
		padding: 10px 20px 15px;
		border-top: 1px solid #ddd;
		}
		.text-center {
		text-align: center;
		padding-top: 10px;
		vertical-align: middle;
		}


		#filterModal .modal-footer {
		display: flex !important;
		justify-content: flex-end !important;
		gap: 10px !important;
		}
		/* Grup khusus untuk Start & End Date */

		#filterModal h4.modal-title {
		font-size: 16px;
		font-weight: bold;
		text-transform: uppercase;
		}


		/* .pagination {
			display: flex;
			justify-content: flex-end;
			gap: 5px;
		}

		.page-btn {
			padding: 5px 10px;
			border: 1px solid #ccc;
			background-color: #fff;
			cursor: pointer;
			border-radius: 4px;
			font-size: 14px;
		} */
		.btn-custom {
			background-color: #ffffff;   /* putih */
			border: 1px solid #878787ff;      /* abu-abu muda */
			color: #000000ff;                 /* teks abu-abu gelap */
			border-radius: 1px;          /* radius */
			padding: 6px 12px;           /* ukuran konsisten */
			font-size: 14px;
			width: auto;
		}

		.btn-custom:hover {
			background-color: #f8f9fa;   /* efek hover abu muda */
			border-color: #000000ff;          /* border lebih gelap pas hover */
			color: #000;
		}

		.page-btn:hover {
			background-color: #f0f0f0;
		}

		.dataTables_length {
		display: none;
		}

		.page-btn.active {
			background-color: #007bff;
			color: white;
			border-color: #007bff;
		}

		.page-btn:disabled {
			cursor: not-allowed;
			opacity: 0.5;
		}
		#paginationContainer {
			position: sticky;  /* atau fixed jika mau selalu di layar walau di-scroll */
			bottom: 0;
			top: 600px;
			left: 0;
			background: none; /* biar tidak ketimpa tabel */
			padding: 5px;
		}

		.etd-header {
			font-weight: bold;
			text-decoration: underline;
			padding-left: 95rem;
			top: 0;
			z-index: 11; /* lebih tinggi dari th lainnya */
		}
		
		/* Perbesar font untuk Item, Qty (teks), dan ShipmentDate (teks) di atas */
		#weekModal .modal-item-desc,
		#weekModal .modal-qty,
		#weekModal .modal-shipmentdate {
		font-size: 13px; /* lebih besar dari default */
		font-weight: 500;
		display: block;
		margin-bottom: 8px;
		}
		.ww-btn {
		display: block;
		margin: 1px auto;
		background: transparent !important;
		}

		#weekModal .modal-dialog {
		max-width: 480px;       /* Lebar maksimal modal */
		width: auto;            /* Biarkan menyesuaikan isi */
		margin-top: 1.75rem;
		margin-bottom: 1.75rem;
		margin-left: 57.5rem;
		margin-right: auto;
		}
		.modal-backdrop {
		background-color: rgba(0, 0, 0, 0.2) !important; /* 0.3 = lebih terang, default biasanya 0.5 */
		}


		/* Konten modal fleksibel, tinggi otomatis */
		#weekModal .modal-content {
		width: auto !important;
		margin-top: 150px !important;
		max-width: 620px !important;
		height: auto !important;
		max-height: 85vh;       /* Biar gak keluar layar */
		overflow-y: auto;       /* Scroll jika terlalu tinggi */
		border-radius: 10px;
		}
		/* Label "Item:", "Qty:", "ShipmentDate:" */
		#weekModal p {
		font-size: 14px;
		font-weight: 600;
		margin-bottom: 4px;
		}
		/* Sedikit padding biar rapi */
		#weekModal .modal-body {
		padding: 15px 20px;
		}

		/* Tabel dalam modal lebih rapat */
		#weekModal table.table {
		margin-bottom: 0;
		}

		/* Input Qty dan ShipmentDate dibuat sebelahan */
		#weekModal .form-row {
		display: flex;
		gap: 1px; /* jarak antar input */
		margin-top: 10px;
		}
		.text-muted {
			display: block;
			padding-top: 10px;
			color: #777;
		}

		#weekModal input[type="date"] {
		width: 120px;
		height: 30px !important;
		padding: 6px 10px;
		font-size: 12px;
		}
		#weekModal input[type="number"] {
		width: 80px;
		height: 30px !important;
		padding: 6px 10px;
		margin-right: 15px;
		font-size: 12px;
		}
		
		.table-scroll-container .dataTables_scrollHeadInner {
			max-width: 600px !important;
		}
		.status-box {
		margin-left: 10px;
		}

		.icon-box {
		margin-left: -358px; /* default di 100% */
		}

		/* Saat zoom <100%, resolusi efektif menurun */
		@media (min-width: 1240px) and (max-width: 1360px) {
		.icon-spblk {
			margin-left: -358px !important;
		}
		}


		.status1-box {
		margin-left: 10px;
		}

		.icon1-box {
		margin-left: 10px;
		}
		.icon-spblk {
		margin-left: 10px;
		}

        div.dt-buttons {
		position: relative;
		float: left;
		transform: translateY(-55px);
		z-index: 1000;
		}
		button.dt-button.buttons-collection.btn.btn-custom {
		min-width: 10px; /* ukuran tetap, bisa sesuaikan */
		max-width: 160px;
		white-space: nowrap; /* biar teks ga turun ke bawah */
		text-align: center;
		}

		.dtfc-fixed-left {
		z-index: 3 !important;
		background: #fff; /* biar nggak transparan */
		}

		.dataTables_scrollBody {
		z-index: 1;
		}
		.dtfc-fixed-left th,
		.dtfc-fixed-left td {
		background: #fff; /* warna background biar rapi */
		z-index: 4 !important;
		}

		/* Di file CSS anda */
		.sortable-ghost {
		opacity: 0.4;
		background-color: #f5f5f5;
		}

		.sortable-chosen {
		background-color: #e8f4f8;
		}

		.sortable-drag {
		opacity: 0.9;
		background-color: #fff9e6;
		box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
		}

		/* #purchasePlanTableLeft tbody tr,
		#purchasePlanTableRight tbody tr {
		cursor: move;
		} */

		#scroll-left::-webkit-scrollbar { display: none; }
   		#scroll-left { scrollbar-width: none; -ms-overflow-style: none; }

		.datatable-footer {
			overflow-x: auto;
			background: #f8f9fa;
			border-top: 2px solid #dee2e6;
			margin-top: 10px;
			margin-left: 0;
			position: relative;
			z-index: 10;
			border-radius: 4px;
		}

		.datatable-footer table {
			background: white;
			box-shadow: 0 2px 4px rgba(0,0,0,0.1);
		}

		.datatable-footer td {
			vertical-align: middle;
			white-space: nowrap;
		}

		.datatable-footer small {
			display: block;
			font-size: 9px;
			margin-top: 2px;
		}
		/* ===== GROUPING MODAL COMPACT ===== */

		.grouping-modal {
		font-size: 12px;
		}

		.grouping-modal .modal-body {
		padding: 15px 20px;
		}

		.grouping-modal .modal-header {
		padding: 12px 20px;
		}

		.grouping-modal .modal-footer {
		padding: 10px 20px;
		}

		/* batasi tinggi selected plan */
		#selectedPlanList {
		max-height: 180px;   /* kira-kira 5 item */
		overflow-y: auto;
		border: 1px solid #dee2e6;
		border-radius: 6px;
		}

		/* kecilkan list item */
		#selectedPlanList .list-group-item {
		padding: 6px 10px;
		font-size: 12px;
		}

		/* select2 compact */
		.grouping-modal .select2-container--default .select2-selection--single {
		height: 32px;
		font-size: 12px;
		padding: 3px 8px;
		}

		.grouping-modal .select2-selection__rendered {
		line-height: 24px !important;
		}

		.grouping-modal .select2-selection__arrow {
		height: 30px !important;
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
				<a class="btn btn-app" id="btn-filter" name="btn-filter">
					<i class="fa fa-filter" id="btn-filter"></i> Filter
				</a>
			</div>
		</div>
		
		<div class="fixed-controls-container" style="position: sticky; top: 0; z-index: 1000;  margin: 2px 0">
			<div class="row">
				<div class="col-sm-8">
					<div id="buttons-container">
					</div>
				</div>
				<div class="col-sm-4">
					<div id="search-container" style="text-align: right;">
					</div>
				</div>
			</div>
		</div>
		
		<div class="tab-content px-4">
			<div class="tab-pane fade in active">
				<div class="row mt-3">
					<div class="col-sm-4">
					</div>
				</div>
			</div>
		</div>
		<div id="table-controls" class="d-flex justify-content-start mb-2">



		<div id="globalButtonsContainer"></div>
		<div id="globalLengthContainer"></div>
		<div id="globalSearchContainer"></div>
		</div>
		
		<div class="table-scroll-container" style="max-height: 530px; border-radius: 4px;">
		<div class="row col-sm-12 divParent" style="display:flex;">

			<div id="scroll-left" style="flex:0 0 auto; overflow-y:scroll; max-height:534px; height:fit-content; border-right:1px solid #ddd; padding-top:1px; margin-bottom:15px;">
			<table id="purchasePlanTableLeft" class="table table-striped table-hover" style="margin-bottom:0; width:600px;">
				<thead>
				</thead>
				<tbody></tbody>
			</table>
			</div>

			<div id="right-container" style="flex:1 1 auto; overflow-y:scroll; max-height:554px; height:fit-content;">
			<table id="purchasePlanTableRight" class="table table-striped table-hover" style="min-width:600px; margin-bottom:0;">
				<thead>
				<tr id="week-header"></tr>
				</thead>
				<tbody></tbody>
			</table>
			</div>
			
		</div>
		</div>


	
		<div class="d-flex justify-content-between mt-2">
		<div id="globalInfoContainer"></div>
		<div id="globalPaginationContainer" class="ml-auto"></div>
		</div>
		
		<div class="bottom-controls" style="margin-top: 15px; padding-top: 15px;">
			<div class="row">
				<div class="col-sm-6">
					<div id="info-container">

					</div>
				</div>
				<div class="col-sm-6">
					<div id="pagination-container" style="text-align: right;">
					</div>
				</div>
			</div>
		</div>
		
		<div class="modal fade" id="weekModal" tabindex="-1" role="dialog" aria-labelledby="weekModalLabel">
			<div class="modal-dialog" role="document">
				<div class="modal-content">
				<div class="modal-header">
					<button type="button" class="close" data-dismiss="modal" aria-label="Close">
					<span aria-hidden="true">&times;</span>
					</button>
					<h4 class="modal-title">Edit Week <span class="modal-week-label"></span></h4>
				</div>
				<div class="modal-body">
					<p>Group Plan: <strong class="modal-group-plan"></strong></p>
					<p>Item: <strong class="modal-item-desc"></strong></p>
					<p class="modal-ubahdata">Change new data</p>
					<div class="form-row">
					<div class="form-group">
					<label>Shipment per Batch</label>
					<table class="table table-sm table-bordered" id="shipmentBatchTable">
						<thead>
						<tr>
							<th style="width: 20px;">Batch</th>
							<th style="width: 80px;">Qty</th>
							<th>Shipment Date</th>
							<th style="width: 180px;">DocNumber</th>
						</tr>
						</thead>
						<tbody>
						<!-- Baris batch akan ditambahkan via JavaScript -->
						</tbody>
					</table>
					</div>

					<!-- Info tambahan opsional -->
					<small id="shipmentInfo" class="form-text text-muted mt-1"></small>
				</div>
				<div class="footer-btn">
					<button type="button" class="btn btn-default" data-dismiss="modal">Close</button>
					<button type="button" class="btn btn-primary" id="saveChangesBtn">Save</button>
				</div>
				</div>
			</div>
			</div>

		</div>

		<!-- Calendar Modal -->
		 <div class="modal fade" id="holidayModal" tabindex="-1">
			<div class="modal-dialog modal-md modal-dialog-centered">
				<div class="modal-content">

				<div class="modal-header">
					<h5 class="modal-title">
					China Public Holiday 
					<span id="holidayYear"></span>
					</h5>

					<div class="ml-auto d-flex gap-2">
					<button class="btn btn-sm btn-secondary" id="prevYear">◀</button>
					<button class="btn btn-sm btn-secondary" id="nextYear">▶</button>
					</div>

				</div>

				<div class="modal-body">

					<table class="table table-bordered table-sm" id="holidayTable">
					<thead>
						<tr>
						<th width="100">Date</th>
						<th width="80">WW</th>
						<th width="100">Holiday Name</th>
						</tr>
					</thead>

					<tbody></tbody>
					</table>

				</div>

				<div class="modal-footer">
					<button class="btn btn-secondary" data-dismiss="modal">
					Close
					</button>
				</div>

				</div>
			</div>
		</div>
		<!-- Calendar Indo Modal -->
		 <div class="modal fade" id="holidayModalID" tabindex="-1">
			<div class="modal-dialog modal-md modal-dialog-centered">
				<div class="modal-content">

				<div class="modal-header">
					<h5 class="modal-title">
					Indonesian Public Holiday 
					<span id="holidayYearID"></span>
					</h5>

					<div class="ml-auto d-flex gap-2">
					<button class="btn btn-sm btn-secondary" id="prevYearID">◀</button>
					<button class="btn btn-sm btn-secondary" id="nextYearID">▶</button>
					</div>

				</div>

				<div class="modal-body">

					<table class="table table-bordered table-sm" id="holidayTableID">
					<thead>
						<tr>
						<th width="100">Date</th>
						<th width="80">WW</th>
						<th width="100">Holiday Name</th>
						</tr>
					</thead>

					<tbody></tbody>
					</table>

				</div>

				<div class="modal-footer">
					<button class="btn btn-secondary" data-dismiss="modal">
					Close
					</button>
				</div>

				</div>
			</div>
		</div>

		<div class="modal fade" id="editPickerModal" tabindex="-1">
			<div class="modal-dialog">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title">Select plan to edit</h5>
						<button type="button" class="close" data-dismiss="modal">&times;</button>
					</div>
					<div class="modal-body">
						<ul class="list-group" id="editPickerList"></ul>
					</div>
				</div>
			</div>
		</div>

		<div class="modal fade" id="legendModal" tabindex="-1" aria-labelledby="legendModalLabel" aria-hidden="true">
			<div class="modal-dialog modal-sm">
				<div class="modal-content">
				<div class="modal-header">
					<h5 class="modal-title" id="legendModalLabel">Info Status</h5>
				</div>

				<div class="modal-body">

					<div class="d-flex align-items-center gap-2 mb-2">
						<span style="display:inline-block;width:15px;height:15px;background:black;border-radius:4px;"></span>
						<span>Already SPORD</span>
					</div>

					<div class="d-flex align-items-center gap-2 mb-2">
						<span style="display:inline-block;width:15px;height:15px;background:#7e0097ff;border-radius:4px;"></span>
						<span>Already SPBLK</span>
					</div>

					<div class="d-flex align-items-center gap-2 mb-2">
						<span style="display:inline-block;width:15px;height:15px;background:#003dcdff;border-radius:4px;"></span>
						<span>Not Yet SPBLK</span>
					</div>

					<div class="d-flex align-items-center gap-2">
						<span style="display:inline-block;width:15px;height:15px;background:red;border-radius:4px;"></span>
						<span>Not have Batch</span>
					</div>

				</div>

				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>
				</div>

				</div>
			</div>
		</div>

		<div class="modal fade" id="quarterSummaryModal" tabindex="-1">
			<div class="modal-dialog modal-lg modal-dialog-centered">
				<div class="modal-content">

				<div class="modal-header">
					<h5 class="modal-title">Quarter Summary</h5>
				</div>

				<div class="modal-body">
					<div id="quarterSummaryModalBody"></div>
				</div>

				<div class="modal-footer">
					<button type="button" class="btn btn-secondary" data-dismiss="modal">
					Close
					</button>
				</div>

				</div>
			</div>
		</div>

		<div class="modal fade" id="voidConfirmModal" tabindex="-1">
			<div class="modal-dialog">
				<div class="modal-content">
					<div class="modal-header">
						<h5 class="modal-title">Confirm Void Purchase Plan</h5>
						<button type="button" class="close" data-dismiss="modal">&times;</button>
					</div>
					<div class="modal-body">
						<div class="form-check mb-2">
							<input type="checkbox" class="form-check-input" id="voidSelectAllCheckbox">
							<label class="form-check-label" for="voidSelectAllCheckbox"><strong>Select All</strong></label>
						</div>
						<ul class="list-group" id="voidPlanList"></ul>
					</div>
					<div class="modal-footer">
						<button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
						<button type="button" class="btn btn-danger" id="confirmVoidBtn">Confirm</button>
					</div>
				</div>
			</div>
		</div>
		<!-- Grouping Modal -->
		<div class="modal fade" id="groupingModal" tabindex="-1">
		<div class="modal-dialog modal-md modal-dialog-centered">
			<div class="modal-content grouping-modal">

			<div class="modal-header">
				<h5 class="modal-title">Grouping Shipment Plan</h5>
			</div>

			<div class="modal-body">

				<div class="row">
				<!-- LEFT SIDE -->
				<div class="col-sm-6">
					<h6>Selected Plan :</h6>
					<ul id="selectedPlanList" class="list-group">
					<!-- diisi via JS -->
					</ul>
				</div>

				<!-- RIGHT SIDE -->
				<div class="col-sm-6">
					<h6>Select Group</h6>
					<select 
					id="groupNameInput" 
					class="form-control"
					style="width: 100%;"
					>
						<option></option>
					</select>
				</div>
				</div>

			</div>

			<div class="modal-footer">
				<button type="button" class="btn btn-secondary" data-dismiss="modal">
				Close
				</button>
				<button type="button" class="btn btn-primary" id="saveGroupingBtn">
				Save
				</button>
			</div>

			</div>
		</div>
		</div>

			
	<script>
	console.log('HTML terakhir dimuat');
	</script>