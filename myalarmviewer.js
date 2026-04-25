/**
 * ioBroker MYWebUI MyAlarmViewer Components
 * @version 1.0.0
 * @author @gokturk413
 */

import flatpickr from 'flatpickr';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import './vendor/tabulator.min.js';

// Getter for Tabulator (loaded as UMD, attaches to window)
const getTabulator = () => window.Tabulator;

// Decorator imports (provided by mywebui)
import { __decorate } from "tslib";
import { BaseCustomWebComponentConstructorAppend, css, cssFromString, customElement, DomHelper, html, property } from "@node-projects/base-custom-webcomponent";

// Export Service
let ExportService = class ExportService {
  static exportToPDF(data, filename = 'alarms.pdf') {
    const doc = new jsPDF();
    const tableData = data.map(alarm => [
      alarm.id || '',
      alarm.alarmtimeconverted || alarm.alarmtime || '',
      alarm.Alarmtype || '',
      alarm.Tagname || '',
      alarm.Description || '',
      alarm.HIGH_LOW || '',
      alarm.LimitValue || '',
      alarm.Limitmessage || '',
      alarm.AlarmValue || '',
      alarm.Acknowledge === 'ack' || alarm.Acknowledge === 'true' || alarm.Acknowledge === true ? 'Yes' : 'No',
      alarm.acknowledgetime || ''
    ]);

    doc.autoTable({
      head: [['ID', 'Alarm Time', 'Type', 'Tag Name', 'Description', 'HIGH/LOW', 'Limit Value', 'Limit Message', 'Alarm Value', 'Acknowledged', 'Ack Time']],
      body: tableData,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save(filename);
  }

  static exportToExcel(data, filename = 'alarms.xlsx') {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Alarms');
    XLSX.writeFile(workbook, filename);
  }

  static exportToCSV(data, filename = 'alarms.csv') {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}

// AlarmViewer Component
class AlarmViewer extends BaseCustomWebComponentConstructorAppend {
  // Observe attributes for reactive MYWebUI state binding
  static get observedAttributes() {
    // Use decorator metadata to auto-generate observed attributes
    if (this.properties) {
      return Object.keys(this.properties).map(prop =>
        prop.replace(/([A-Z])/g, (g) => `-${g[0].toLowerCase()}`)
      );
    }
    return ['oid-json', 'oid-is-alarm', 'oid-ack', 'soundfile', 'theme'];
  }

  constructor() {
    super();
    this.table = null;
    this.alarms = [];
    this.audio = null;
    this.alarmTypeFilter = '';

    // Private properties
    this._oidJson = '';
    this._oidIsAlarm = '';
    this._oidAck = '';
    this._soundfile = '';
    this._theme = '';
  }

  // Property getters and setters
  get oidJson() { return this._oidJson; }
  set oidJson(value) {
    this._oidJson = value;
    this.onAnyPropertyChanged('oidJson', value);
  }

  get oidIsAlarm() { return this._oidIsAlarm; }
  set oidIsAlarm(value) {
    this._oidIsAlarm = value;
    this.onAnyPropertyChanged('oidIsAlarm', value);
  }

  get oidAck() { return this._oidAck; }
  set oidAck(value) {
    this._oidAck = value;
    this.onAnyPropertyChanged('oidAck', value);
  }

  get soundfile() { return this._soundfile; }
  set soundfile(value) {
    this._soundfile = value;
    this.onAnyPropertyChanged('soundfile', value);
  }

  get theme() { return this._theme; }
  set theme(value) {
    this._theme = value;
    this.onAnyPropertyChanged('theme', value);
  }

  // Sync attribute changes to properties (MYWebUI state binding)
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      // Convert attribute name to property name (kebab-case → camelCase)
      const propName = name.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      // Set property (triggers setter → onAnyPropertyChanged)
      this[propName] = newValue;
    }
  }

  // Centralized property change handler
  onAnyPropertyChanged(propName, value) {
    console.log('AlarmViewer.onAnyPropertyChanged:', propName, value);

    switch (propName) {
      case 'oidJson':
        if (value) {
          this.updateAlarms(value);
        }
        break;

      case 'oidIsAlarm':
        if (value && this.audio) {
          const isActive = value === 'true' || value === true || value === '1';
          if (isActive) {
            this.audio.play().catch(() => { });
          } else {
            this.audio.pause();
          }
        }
        break;

      case 'soundfile':
        if (value && this.audio) {
          const source = this.audio.querySelector('source');
          if (source) {
            source.src = `/myalarm.admin/sounds/${value}`;
            this.audio.load();
          }
        }
        break;

      case 'oidAck':
        // No action needed, value used in methods
        break;

      case 'theme':
        // Theme changes could trigger re-render if needed
        break;
    }
  }

  connectedCallback() {
    // Parse HTML attributes to properties on initial mount
    this._parseAttributesToProperties();

    this.render();
    this.initializeTable();
    this.initializeAudio();
  }

  disconnectedCallback() {
    this.cleanup();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="/mywebui.0.widgets/node_modules/@gokturk413/myalarmviewer/dist/css/tabulator_midnight.css">
      <link rel="stylesheet" href="/mywebui.0.widgets/node_modules/@gokturk413/myalarmviewer/dist/css/flatpickr.min.css">
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
        }
        
        .alarm-container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        
        .alarm-header {
          background: #4682b4;
          color: white;
          padding: 10px;
          text-align: center;
          font-size: 18px;
          font-weight: bold;
        }
        
        .alarm-controls {
          padding: 10px;
          background: #f0f0f0;
          display: flex;
          gap: 10px;
        }
        
        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          background: #666;
          color: white;
        }
        
        .btn:hover {
          background: #555;
        }
        
        .btn-ack {
          background: #5cb85c;
        }
        
        .btn-ack:hover {
          background: #4cae4c;
        }
        
        .btn-sm {
          padding: 4px 8px;
          font-size: 11px;
          background: #4CAF50;
          color: white;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-weight: 500;
        }
        
        .btn-sm:hover {
          background: #45a049;
        }
        
        .alarm-table {
          flex: 1;
          overflow: auto;
        }
      </style>
      
      <div class="alarm-container">
  <div class="alarm-header"><t-t>alarm.header</t-t></div>
  <div class="alarm-controls">
    <button class="btn btn-ack" id="btnAckAll"><t-t>alarm.ackall</t-t></button>
    <button class="btn" id="btnClear"><t-t>alarm.clear</t-t></button>
    <button class="btn" id="btnMute"><t-t>alarm.mute</t-t></button>
  </div>
  <div class="alarm-table" id="alarmTable"></div>
</div>
      
      <audio id="alarmAudio" loop style="display:none;">
        <source src="" type="audio/mpeg">
      </audio>
    `;
  }

  initializeTable() {
    const container = this.shadowRoot.querySelector('#alarmTable');
    if (!container) return;

    const Tabulator = getTabulator();
    if (!Tabulator) {
      console.error('Tabulator not loaded');
      return;
    }

    this.table = new Tabulator(container, {
      data: [],
      height: 400,
      layout: 'fitData',
      tooltipsHeader: false,
      pagination: 'local',
      paginationSize: 6,
      movableColumns: true,
      rowFormatter: (row) => {
        const data = row.getData();
        const element = row.getElement();
        if (data.Alarmtype === 'warning') { element.style.backgroundColor = 'blue'; element.style.color = 'white'; }
        if (data.Alarmtype === 'alarm') { element.style.backgroundColor = 'red'; element.style.color = 'white'; }
        if (data.Alarmtype === 'info') { element.style.backgroundColor = 'orange'; element.style.color = 'white'; }
      },
      columns: this._buildColumns()
    });

    window.addEventListener('languageChanged', () => {
    this.table.setColumns(this._buildColumns());
    // mute button mətnini də yenilə
    const btnMute = this.shadowRoot.querySelector('#btnMute');
    if (btnMute) {
        btnMute.textContent = this.audio?.muted ? t('alarm.unmute') : t('alarm.mute');
    }
    });




    // Wait for table to build before loading initial data
    this.table.on('tableBuilt', () => {
      if (this._oidJson) {
        this.updateAlarms(this._oidJson);
      }

      if (this._oidIsAlarm && this.audio) {
        const isActive = this._oidIsAlarm === 'true' || this._oidIsAlarm === true || this._oidIsAlarm === '1';
        if (isActive) {
          this.audio.play().catch(() => { });
        }
      }

      if (this._soundfile && this.audio) {
        const source = this.audio.querySelector('source');
        if (source) {
          source.src = `/myalarm.admin/sounds/${this._soundfile}`;
          this.audio.load();
        }
      }
    });

    // Row click handler
    this.table.on('rowClick', (e, row) => {
      const data = row.getData();
      if (data.id !== undefined && this._oidAck && window.IOB) {
        window.IOB.setState(this._oidAck, data.id);
      }
    });

    const btnAckAll = this.shadowRoot.querySelector('#btnAckAll');
    const btnClear = this.shadowRoot.querySelector('#btnClear');
    const btnMute = this.shadowRoot.querySelector('#btnMute');

    btnAckAll?.addEventListener('click', () => this.acknowledgeAll());
    btnClear?.addEventListener('click', () => this.clearAcknowledged());
    btnMute?.addEventListener('click', () => this.toggleMute());
  }


  _buildColumns() {
    return [
      { title: t('alarm.id'), field: 'id', width: 50, headerFilter: 'number', headerFilterPlaceholder: 'Select id...', headerFilterFunc: '>=' },
      { title: t('alarm.tagname'), field: 'Tagname', width: 150, headerFilter: 'input' },
      { title: t('alarm.type'), field: 'Alarmtype', width: 100, headerFilter: 'input' },
      { title: t('alarm.time'), field: 'alarmtime', width: 150, headerFilter: 'input' },
      { title: t('alarm.description'), field: 'Description', width: 150, headerFilter: 'input' },
      { title: t('alarm.limitvalue'), field: 'LimitValue', width: 110, headerFilter: 'input' },
      { title: t('alarm.limitmsg'), field: 'Limitmessage', width: 150, headerFilter: 'input' },
      { title: t('alarm.highlow'), field: 'HIGH_LOW', width: 80, headerFilter: 'input' },
      { title: t('alarm.value'), field: 'AlarmValue', width: 110, headerFilter: 'input' },
      { title: t('alarm.ack'), field: 'Acknowledge', width: 80, headerFilter: 'input' },
      { title: t('alarm.acktime'), field: 'acknowledgetime', width: 150, headerFilter: 'input' },
      {
        title: t('alarm.ackbtn'),
        formatter: () => '<button class="fa fa-print"><t-t>alarm.ack</t-t></button>',
        width: 80,
        hozAlign: 'center',
        cellClick: (e, cell) => {
          e.stopPropagation();
          const data = cell.getRow().getData();
          if (this._oidAck && window.IOB && data.id) {
            window.IOB.setState(this._oidAck, data.id);
          }
        }
      }
    ];
  }

  initializeAudio() {
    this.audio = this.shadowRoot.querySelector('#alarmAudio');
    if (this._soundfile && this.audio) {
      const source = this.audio.querySelector('source');
      if (source) {
        source.src = `/myalarm.admin/sounds/${this._soundfile}`;
        this.audio.load();
      }
    }
  }

  updateAlarms(data) {
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : data;
      this.alarms = Array.isArray(parsed) ? parsed : [parsed];

      // Filter by alarm type if specified
      let filteredAlarms = this.alarms;
      if (this.alarmTypeFilter) {
        filteredAlarms = this.alarms.filter(alarm =>
          alarm.Alarmtype === this.alarmTypeFilter
        );
      }

      this.table?.setData(filteredAlarms);
    } catch (err) {
      console.error('Error updating alarms:', err);
    }
  }

  acknowledgeAlarm(alarm) {
    if (this._oidAck && window.IOB) {
      window.IOB.setState(this._oidAck, alarm.id);
    }
  }

  acknowledgeAll() {
    if (!this.table || !window.IOB?.connection_socket) return;

    const tableData = this.table.getData();
    tableData.forEach((row) => {
      if (row.id !== undefined && (row.Acknowledge !== 'true' && row.Acknowledge !== true)) {
        window.IOB.connection_socket.emit('sendTo', 'myalarm.0', 'ackAlarm', { alarmId: row.id }, (response) => {
          if (response.success) {
            // Alarm acknowledged successfully
          } else {
            // Acknowledge failed
          }
        });
      }
    });
  }

  clearAcknowledged() {
    this.alarms = this.alarms.filter(alarm => alarm.Acknowledge !== 'ack');
    this.table?.setData(this.alarms);
  }

toggleMute() {
    if (this.audio) {
        this.audio.muted = !this.audio.muted;
        const btnMute = this.shadowRoot.querySelector('#btnMute');
        if (btnMute) {
            btnMute.textContent = this.audio.muted ? t('alarm.unmute') : t('alarm.mute');
        }
    }
}

  cleanup() {
    if (this.audio) {
      this.audio.pause();
    }
    if (this.table) {
      this.table.destroy();
    }
  }
}

// HistoricalAlarmViewer Component
class HistoricalAlarmViewer extends BaseCustomWebComponentConstructorAppend {
  // Observe attributes for reactive MYWebUI state binding
  static get observedAttributes() {
    // Use decorator metadata to auto-generate observed attributes
    if (this.properties) {
      return Object.keys(this.properties).map(prop =>
        prop.replace(/([A-Z])/g, (g) => `-${g[0].toLowerCase()}`)
      );
    }
    return ['adapter-instance', 'default-days', 'theme'];
  }

  constructor() {
    super();
    this.table = null;
    this.alarms = [];
    this.datePicker = null;

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    this.dateRange = { start, end };

    // Private properties
    this._adapterInstance = 'myalarm.0';
    this._theme = '';
    this._defaultDays = '7';
  }

  // Property getters and setters
  get adapterInstance() { return this._adapterInstance; }
  set adapterInstance(value) {
    this._adapterInstance = value;
    this.onAnyPropertyChanged('adapterInstance', value);
  }

  get theme() { return this._theme; }
  set theme(value) {
    this._theme = value;
    this.onAnyPropertyChanged('theme', value);
  }

  get defaultDays() { return this._defaultDays; }
  set defaultDays(value) {
    this._defaultDays = value;
    this.onAnyPropertyChanged('defaultDays', value);
  }

  // Sync attribute changes to properties (MYWebUI state binding)
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      // Convert attribute name to property name (kebab-case → camelCase)
      const propName = name.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
      // Set property (triggers setter → onAnyPropertyChanged)
      this[propName] = newValue;
    }
  }

  // Centralized property change handler
  onAnyPropertyChanged(propName, value) {
    switch (propName) {
      case 'adapterInstance':
        // Adapter instance updated
        break;

      case 'theme':
        if (this.table) {
          this.render();
          this.initializeTable();
        }
        break;

      case 'defaultDays':
        const days = parseInt(value) || 7;
        const end = new Date();
        const start = new Date();
        start.setDate(start.getDate() - days);
        this.dateRange = { start, end };
        if (this.datePicker) {
          this.datePicker.setDate([start, end]);
        }
        break;
    }
  }

  connectedCallback() {
    // Parse HTML attributes to properties on initial mount
    this._parseAttributesToProperties();

    this.render();
    this.initializeDatePicker();
    this.initializeTable();
    this.setupEventListeners();
  }

  disconnectedCallback() {
    this.cleanup();
  }

  render() {
    this.shadowRoot.innerHTML = `
      <link rel="stylesheet" href="/mywebui.0.widgets/node_modules/@gokturk413/myalarmviewer/dist/css/tabulator_midnight.css">
      <link rel="stylesheet" href="/mywebui.0.widgets/node_modules/@gokturk413/myalarmviewer/dist/css/flatpickr.min.css">
      <style>
        :host {
          display: block;
          width: 100%;
          height: 100%;
        }
        
        .hist-container {
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          padding: 10px;
        }
        
        .hist-controls {
          padding: 10px;
          background: #f0f0f0;
          margin-bottom: 10px;
          display: flex;
          gap: 10px;
          align-items: center;
        }
        
        .hist-export {
          display: flex;
          gap: 10px;
          margin-bottom: 10px;
        }
        
        .btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          background: #2196F3;
          color: white;
        }
        
        .btn:hover {
          background: #0b7dda;
        }
        
        .btn-secondary {
          background: #666;
        }
        
        .btn-secondary:hover {
          background: #555;
        }
        
        input {
          padding: 8px;
          border: 1px solid #ddd;
          border-radius: 4px;
        }
        
        .hist-table {
          flex: 1;
          overflow: auto;
        }
        
        /* Flatpickr arrow fixes for Shadow DOM */
        .flatpickr-calendar {
          font-size: 14px;
        }
        
        .flatpickr-months .flatpickr-prev-month,
        .flatpickr-months .flatpickr-next-month {
          position: static;
          width: 28px;
          height: 28px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .flatpickr-months .flatpickr-prev-month svg,
        .flatpickr-months .flatpickr-next-month svg {
          width: 14px;
          height: 14px;
        }
        
        .flatpickr-current-month {
          font-size: 135%;
          padding: 7px 0;
        }
        
        .flatpickr-day {
          max-width: 39px;
          height: 39px;
          line-height: 39px;
        }
      </style>
      
      <div class="hist-container">
        <div class="hist-controls">
          <input type="text" id="dateRangePicker" placeholder="Select date range" />
          <button class="btn" id="btnGetAlarms"><t-t>alarm.Getalarms</t-t></button>
        </div>
        
        <div class="hist-export">
          <button class="btn btn-secondary" id="btnExportXLSX"><t-t>alarm.DownloadXLSX</t-t></button>
          <button class="btn btn-secondary" id="btnExportCSV"><t-t>alarm.DownloadCSV</t-t></button>
          <button class="btn btn-secondary" id="btnExportPDF"><t-t>alarm.DownloadPDF</t-t></button>
        </div>
        
        <div class="hist-table" id="histTable"></div>
      </div>
    `;
  }

  initializeDatePicker() {
    const input = this.shadowRoot.querySelector('#dateRangePicker');
    if (!input) {
      console.error('Date picker input not found');
      return;
    }
    else {
      input.placeholder = t('alarm.selectdate');
    }

    // Check if flatpickr is available
    if (typeof flatpickr === 'undefined') {
      console.error('Flatpickr library not loaded');
      // Try to load it dynamically
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/flatpickr@4.6.13/dist/flatpickr.min.js';
      script.onload = () => {
        console.log('Flatpickr loaded dynamically');
        this.initializeDatePickerInstance(input);
      };
      document.head.appendChild(script);
      return;
    }

    this.initializeDatePickerInstance(input);
  }

  initializeDatePickerInstance(input) {
    // Destroy existing instance if any
    if (this.datePicker) {
      this.datePicker.destroy();
    }

    this.datePicker = flatpickr(input, {
      mode: 'range',
      dateFormat: 'Y-m-d',
      defaultDate: [this.dateRange.start, this.dateRange.end],
      allowInput: true,
      clickOpens: true,
      appendTo: this.shadowRoot.querySelector('.hist-container'), // Keep calendar in Shadow DOM
      onChange: (selectedDates) => {
        if (selectedDates.length === 2) {
          this.dateRange = {
            start: selectedDates[0],
            end: selectedDates[1]
          };
          // Automatically load alarms when date range changes
          this.loadHistoricalAlarms();
        }
      },
      onReady: function (selectedDates, dateStr, instance) {
        console.log('Flatpickr ready with dates:', dateStr);
      }
    });

    console.log('Date picker initialized:', this.datePicker);
  }

  initializeTable() {
    const container = this.shadowRoot.querySelector('#histTable');
    if (!container) return;

    const Tabulator = getTabulator();
    if (!Tabulator) {
      console.error('Tabulator not loaded');
      return;
    }

    this.table = new Tabulator(container, {
      data: [],
      layout: 'fitColumns',
      height: '100%',
      pagination: true,
      paginationSize: 50,
      columns: this._buildColumns()
    });
    const input = this.shadowRoot.querySelector('#dateRangePicker');

    window.addEventListener('languageChanged', () => {
      this.table.setColumns(this._buildColumns());
      input.placeholder = t('alarm.selectdate');
    });

    // Table built - ready for data loading via date picker
  }

  _buildColumns() {
    return [
      { title: t('alarm.id'), field: 'id', width: 60, headerFilter: 'number', headerFilterPlaceholder: 'Select id...', headerFilterFunc: '>=' },
      { title: t('alarm.time'), field: 'alarmtimeconverted', width: 150, headerFilter: 'input' },
      { title: t('alarm.type'), field: 'Alarmtype', width: 100, headerFilter: 'input' },
      { title: t('alarm.tagname'), field: 'Tagname', widthGrow: 2, headerFilter: 'input' },
      { title: t('alarm.description'), field: 'Description', width: 150, headerFilter: 'input' },
      {
        title: t('alarm.highlow'),
        field: 'HIGH_LOW',
        width: 100,
        headerFilter: 'input',
        formatter: (cell) => {
          const val = cell.getValue();
          return val ? val : '';
        }
      },
      { title: t('alarm.limitvalue'), field: 'LimitValue', width: 100, headerFilter: 'input' },
      { title: t('alarm.limitmsg'), field: 'Limitmessage', width: 150, headerFilter: 'input' },
      { title: t('alarm.value'), field: 'AlarmValue', width: 100, headerFilter: 'input' },
      {
        title: t('alarm.ack'),
        field: 'Acknowledge',
        width: 100,
        headerFilter: 'input',
        formatter: (cell) => {
          const val = cell.getValue();
          return val === 'ack' || val === 'true' || val === true ? t('alarm.yes') : t('alarm.no');
        }
      },
      { title: t('alarm.acktime'), field: 'acknowledgetime', width: 150, headerFilter: 'input' }
    ];
  }

  setupEventListeners() {
    const btnGetAlarms = this.shadowRoot.querySelector('#btnGetAlarms');
    const btnExportXLSX = this.shadowRoot.querySelector('#btnExportXLSX');
    const btnExportCSV = this.shadowRoot.querySelector('#btnExportCSV');
    const btnExportPDF = this.shadowRoot.querySelector('#btnExportPDF');

    btnGetAlarms?.addEventListener('click', () => this.loadHistoricalAlarms());
    btnExportXLSX?.addEventListener('click', () => ExportService.exportToExcel(this.alarms));
    btnExportCSV?.addEventListener('click', () => ExportService.exportToCSV(this.alarms));
    btnExportPDF?.addEventListener('click', () => ExportService.exportToPDF(this.alarms));
  }

  loadHistoricalAlarms() {
    if (!this.dateRange || !window.IOB?.connection?._socket) return;

    // Format dates for adapter query
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    };

    const startDate = formatDate(this.dateRange.start);
    const endDate = formatDate(this.dateRange.end);

    // Send request to adapter via socket
    console.log('Loading historical alarms from', startDate, 'to', endDate);
    window.IOB.connection._socket.emit('sendTo', this.adapterInstance, 'getlog', {
      startdate: startDate,
      enddate: endDate
    }, (response) => {
      console.log('Adapter response:', response, 'Type:', typeof response, 'IsArray:', Array.isArray(response));

      try {
        let data = response;

        // If response is a string, parse it as JSON
        if (typeof response === 'string') {
          data = JSON.parse(response);
          console.log('Parsed JSON string to array:', Array.isArray(data));
        }

        // Check if data is valid array
        if (Array.isArray(data)) {
          this.alarms = data;
          if (this.table) {
            this.table.setData(this.alarms);
            console.log('Loaded', this.alarms.length, 'historical alarms');
          }
        } else if (data && typeof data === 'object' && data.error) {
          console.error('Adapter error:', data.error);
        } else {
          console.error('Invalid response from adapter. Expected array, got:', typeof data, data);
        }
      } catch (e) {
        console.error('Error parsing adapter response:', e, response);
      }
    });
  }

  cleanup() {
    if (this.datePicker) {
      this.datePicker.destroy();
    }
    if (this.table) {
      this.table.destroy();
    }
  }
}

// Property decorators for AlarmViewer
__decorate([
  property({ type: String })
], AlarmViewer.prototype, "oidJson", void 0);

__decorate([
  property({ type: String })
], AlarmViewer.prototype, "oidIsAlarm", void 0);

__decorate([
  property({ type: String })
], AlarmViewer.prototype, "oidAck", void 0);

__decorate([
  property({ type: String })
], AlarmViewer.prototype, "soundfile", void 0);

__decorate([
  property({ type: String })
], AlarmViewer.prototype, "theme", void 0);

// Property decorators for HistoricalAlarmViewer
__decorate([
  property({ type: String, defaultValue: 'myalarm.0' })
], HistoricalAlarmViewer.prototype, "adapterInstance", void 0);

__decorate([
  property({ type: String })
], HistoricalAlarmViewer.prototype, "theme", void 0);

__decorate([
  property({ type: String, defaultValue: '7' })
], HistoricalAlarmViewer.prototype, "defaultDays", void 0);

// Register components immediately
customElements.define('alarm-viewer', AlarmViewer);
customElements.define('historical-alarm-viewer', HistoricalAlarmViewer);
console.log('MyAlarmViewer components registered with bundled Tabulator');

export { AlarmViewer, HistoricalAlarmViewer, ExportService };
