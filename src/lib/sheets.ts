import { google, type sheets_v4 } from 'googleapis';

const SPREADSHEET_ID = import.meta.env.GOOGLE_SHEETS_SPREADSHEET_ID;

function getAuth(): sheets_v4.Sheets {
	const credentials = JSON.parse(import.meta.env.GOOGLE_SERVICE_ACCOUNT_JSON);

	const auth = new google.auth.GoogleAuth({
		credentials,
		scopes: ['https://www.googleapis.com/auth/spreadsheets'],
	});

	return google.sheets({ version: 'v4', auth });
}

/**
 * Lee todas las filas de un rango (ej: "Mensajes!A:Z").
 * Retorna un array de objetos donde cada clave es el header de la columna.
 */
export async function getSheetData(range: string): Promise<Record<string, string>[]> {
	const sheets = getAuth();
	const spreadsheetId = SPREADSHEET_ID;

	const res = await sheets.spreadsheets.values.get({
		spreadsheetId,
		range,
	});

	const rows = res.data.values;

	if (!rows || rows.length === 0) return [];

	const [headers, ...data] = rows;

	return data.map((row) => {
		const obj: Record<string, string> = {};

		headers.forEach((header, i) => {
			obj[header] = row[i] ?? '';
		});

		return obj;
	});
}

/**
 * Busca la primera fila donde `column` coincida con `value`.
 * Retorna el objeto o null.
 */
export async function findFirst(
	sheetName: string,
	column: string,
	value: string
): Promise<Record<string, string> | null> {
	const rows = await getSheetData(`${sheetName}!A:Z`);

	return rows.find((row) => row[column] === value) ?? null;
}

/**
 * Agrega una fila al final de la hoja.
 */
export async function appendRow(sheetName: string, values: Record<string, string>): Promise<void> {
	const sheets = getAuth();
	const spreadsheetId = SPREADSHEET_ID;

	// Primero obtener los headers para mapear en orden
	const headerRes = await sheets.spreadsheets.values.get({
		spreadsheetId,
		range: `${sheetName}!1:1`,
	});

	const headers = headerRes.data.values?.[0] ?? [];
	const orderedValues = headers.map((h) => values[h] ?? '');

	await sheets.spreadsheets.values.append({
		spreadsheetId,
		range: `${sheetName}!A:A`,
		valueInputOption: 'USER_ENTERED',
		requestBody: { values: [orderedValues] },
	});
}

/**
 * Actualiza una fila existente buscando por cualquier columna.
 * `columnName` es el nombre de la columna a buscar (ej: 'asistenteId', 'locationId', 'id').
 * `columnValue` es el valor a buscar en esa columna.
 */
export async function updateRowByColumn(
	sheetName: string,
	columnName: string,
	columnValue: string,
	values: Record<string, string>
): Promise<void> {
	const sheets = getAuth();
	const spreadsheetId = SPREADSHEET_ID;

	// Buscar la fila por la columna indicada
	const rows = await getSheetData(`${sheetName}!A:Z`);
	const rowIndex = rows.findIndex((row) => row[columnName] === columnValue);

	if (rowIndex === -1) {
		throw new Error(`No se encontró registro donde ${columnName}="${columnValue}" en ${sheetName}`);
	}

	// Obtener headers para mapear en orden
	const headerRes = await sheets.spreadsheets.values.get({
		spreadsheetId,
		range: `${sheetName}!1:1`,
	});

	const headers = headerRes.data.values?.[0] ?? [];
	const orderedValues = headers.map((h) => values[h] ?? '');

	// rowIndex es 0-based, pero la fila 1 son headers → rango real = rowIndex + 2
	const range = `${sheetName}!A${rowIndex + 2}:Z${rowIndex + 2}`;

	await sheets.spreadsheets.values.update({
		spreadsheetId,
		range,
		valueInputOption: 'RAW',
		requestBody: { values: [orderedValues] },
	});
}

/**
 * Genera un ID único (UUID v4).
 */
export function generateId(): string {
	return crypto.randomUUID();
}
