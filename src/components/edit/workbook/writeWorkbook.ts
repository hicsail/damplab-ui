import { bundlesExportRows } from './bundlesSheet';
import { operationsExportRows } from './operationsWorkbookSheet';
import { parameterListExportRows, TYPE_CHOICES } from './parameterListSheet';
import { sowSectionsExportRows } from './sowSectionsSheet';
import { CatalogSnapshot, LISTS_SHEET_TITLE, SHEET_TITLES } from './types';

/**
 * The downloaded catalog workbook. `buildWorkbookData` is pure — what goes in
 * every cell and which columns are dropdowns; `writeWorkbook` hands it to
 * exceljs, which (unlike SheetJS) can write in-cell dropdowns.
 *
 * A dropdown points at a range on a hidden `Lists` sheet rather than carrying
 * its values inline: Excel caps an inline list at 255 characters, and the list
 * of operation names is far longer.
 */
export type ListName = 'categories' | 'sets' | 'yesNo' | 'types' | 'operations';

export interface WorkbookSheetData {
  title: string;
  /** Header row first. */
  rows: Array<Array<string | number>>;
  /** Column header → the list its cells choose from. */
  dropdowns: Record<string, ListName>;
}

export interface WorkbookData {
  sheets: WorkbookSheetData[];
  lists: Record<ListName, string[]>;
}

export const WORKBOOK_FILE_NAME = 'damplab-catalog-workbook.xlsx';
/** Blank rows below the data that also get the dropdowns, for rows someone adds. */
export const SPARE_ROWS = 200;

/** Column order on the Lists sheet. */
const LIST_ORDER: readonly ListName[] = ['categories', 'sets', 'yesNo', 'types', 'operations'];
const WIDE_COLUMNS = new Set(['name', 'description', 'text', 'options', 'parameter', 'BundleName', 'Operation', 'serviceCategory', 'validation', 'conditionalDisplayLogic']);

const unique = (values: string[]): string[] => [...new Set(values.map((value) => value.trim()).filter((value) => value !== ''))];

export function buildWorkbookData(catalog: CatalogSnapshot, options: { includePricing: boolean }): WorkbookData {
  const operations = operationsExportRows(catalog, options.includePricing);
  const operationDropdowns: Record<string, ListName> = { serviceCategory: 'categories', hiddenFromClients: 'yesNo' };
  for (const header of operations[0]) if (/^parameterSet\d+$/.test(String(header))) operationDropdowns[String(header)] = 'sets';

  return {
    sheets: [
      { title: SHEET_TITLES.operations, rows: operations, dropdowns: operationDropdowns },
      { title: SHEET_TITLES.parameterList, rows: parameterListExportRows(catalog), dropdowns: { required: 'yesNo', type: 'types' } },
      { title: SHEET_TITLES.bundles, rows: bundlesExportRows(catalog), dropdowns: { Operation: 'operations' } },
      { title: SHEET_TITLES.sowSections, rows: sowSectionsExportRows(catalog), dropdowns: {} }
    ],
    lists: {
      categories: unique(catalog.categories.map((category) => category.label)),
      sets: unique(catalog.sets.map((set) => set.name)),
      yesNo: ['Y', 'N'],
      types: [...TYPE_CHOICES],
      operations: unique(catalog.operations.map((operation) => operation.name))
    }
  };
}

export async function writeWorkbook(data: WorkbookData): Promise<ArrayBuffer> {
  // Loaded on demand: exceljs is large and only the download needs it.
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();

  const rangeOf = (list: ListName): string | null => {
    const count = data.lists[list].length;
    if (count === 0) return null;
    const letter = String.fromCharCode(65 + LIST_ORDER.indexOf(list));
    return `${LISTS_SHEET_TITLE}!$${letter}$2:$${letter}$${count + 1}`;
  };

  for (const sheet of data.sheets) {
    const worksheet = workbook.addWorksheet(sheet.title, { views: [{ state: 'frozen', ySplit: 1 }] });
    for (const row of sheet.rows) worksheet.addRow(row);
    worksheet.getRow(1).font = { bold: true };
    (sheet.rows[0] ?? []).forEach((header, index) => {
      const title = String(header);
      worksheet.getColumn(index + 1).width = WIDE_COLUMNS.has(title) ? 36 : Math.max(14, title.length + 2);
      const list = sheet.dropdowns[title];
      const range = list ? rangeOf(list) : null;
      if (!range) return;
      for (let row = 2; row <= sheet.rows.length + SPARE_ROWS; row += 1) {
        worksheet.getCell(row, index + 1).dataValidation = { type: 'list', allowBlank: true, formulae: [range] };
      }
    });
  }

  const lists = workbook.addWorksheet(LISTS_SHEET_TITLE, { state: 'hidden' });
  LIST_ORDER.forEach((list, index) => {
    lists.getCell(1, index + 1).value = list;
    data.lists[list].forEach((value, position) => {
      lists.getCell(position + 2, index + 1).value = value;
    });
  });

  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
}
