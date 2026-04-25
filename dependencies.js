/**
 * Bundled Dependencies for Offline Use
 * This file will be bundled with all required libraries
 */

import { TabulatorFull } from 'tabulator-tables';
import flatpickr from 'flatpickr';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

// Export to window for use by myalarmviewer.js
window.TabulatorFull = TabulatorFull;
window.flatpickr = flatpickr;
window.jspdf = { jsPDF };
window.XLSX = XLSX;

console.log('✅ Dependencies loaded successfully');
