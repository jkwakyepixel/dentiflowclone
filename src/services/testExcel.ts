import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export async function generateTestExcel() {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Financial Summary');

  // Define column widths
  ws.columns = [
    { width: 15 }, { width: 15 },
    { width: 15 }, { width: 15 },
    { width: 15 }, { width: 15 },
    { width: 15 }, { width: 15 },
    { width: 4 },  // Spacer
    { width: 30 }  // How to read box
  ];

  // Helper for background colors
  const setBg = (cell: ExcelJS.Cell, argb: string) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
  };

  // 1-2. Headers
  ws.mergeCells('A2:H2');
  const title1 = ws.getCell('A2');
  title1.value = 'LUXE DENTAL CLINIC';
  title1.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFDCA451' } };
  title1.alignment = { horizontal: 'center', vertical: 'middle' };
  setBg(title1, 'FF0F2C1A');

  ws.mergeCells('A3:H3');
  const title2 = ws.getCell('A3');
  title2.value = 'MONTHLY FINANCIAL SUMMARY';
  title2.font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFDCA451' } };
  title2.alignment = { horizontal: 'center', vertical: 'middle' };
  setBg(title2, 'FF164B2C');

  // We can write a complete function here
}
