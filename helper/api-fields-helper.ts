// API Field Types
type BooleanString = "0" | "1";

export interface APIField {
	id: string;
	fieldName: string;
	defaultLabelName: string;
	labelName: string;
	fieldType: string;
	optionName: string | null;
	isEditable: BooleanString;
	autoUpdate: BooleanString;
	isVisible: BooleanString;
	module: string | null;
	moduleSection: string;
	strictlyRequired: BooleanString;
	required: BooleanString;
	allowImport: BooleanString;
	dateCreated: string | null;
	dateModified: string | null;
	createdByName: string | null;
	createdById: string | null;
	modifiedByName: string | null;
	modifiedById: string | null;
	parentFieldName: string;
	parentFieldValue: string;
	popUp: string;
}

/**
 * Filter fields by module name
 * @param fields - Array of API fields
 * @param moduleName - Module name to filter by (e.g., 'orders')
 * @returns Filtered array of fields matching the module
 */
export function filterFieldsByModule(fields: APIField[], moduleName: string): APIField[] {
	const normalizedModuleName = moduleName.toLowerCase();
	return fields.filter(field => 
		field.module?.trim().toLowerCase() === normalizedModuleName
	);
}

/**
 * Normalize a label name by removing newlines and extra whitespace
 * @param labelName - Label name to normalize
 * @returns Normalized label name
 */
export function normalizeLabelName(labelName: string | null | undefined): string {
	if (!labelName) return '';
	// Replace newlines, tabs, and multiple spaces with a single space, then trim
	return labelName.replace(/[\n\r\t]+/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Get unique normalized label names for a specific module
 * Optimized single-pass implementation
 * @param fields - Array of API fields
 * @param moduleName - Module name to filter by
 * @param debug - Optional flag to enable debug logging
 * @returns Array of unique normalized label names
 */
export function getModuleLabelNames(
	fields: APIField[], 
	moduleName: string,
	debug = false
): string[] {
	const labels = new Set<string>();
	const normalizedModuleName = moduleName.toLowerCase();
	let fieldCount = 0;
	
	for (const field of fields) {
		// Filter by module inline
		if (field.module?.trim().toLowerCase() === normalizedModuleName) {
			fieldCount++;
			const normalized = normalizeLabelName(field.labelName);
			if (normalized) {
				labels.add(normalized);
			}
		}
	}
	
	if (debug) {
		console.log(`Module '${moduleName}': ${fieldCount} fields, ${labels.size} unique labels`);
	}
	
	return Array.from(labels);
}

/**
 * Get all unique label names from API fields regardless of module
 * @param fields - Array of API fields
 * @returns Set of all unique label names
 */
export function getAllLabelNames(fields: APIField[]): Set<string> {
	const labels = new Set<string>();
	
	for (const field of fields) {
		const normalized = normalizeLabelName(field.labelName);
		if (normalized) {
			labels.add(normalized);
		}
	}
	
	return labels;
}

/**
 * Create a map of label names to field names for a specific module
 * @param fields - Array of API fields
 * @param moduleName - Module name to filter by
 * @returns Map with normalized labelName as key and fieldName as value
 */
export function getModuleFieldMap(
	fields: APIField[], 
	moduleName: string
): Map<string, string> {
	const fieldMap = new Map<string, string>();
	const normalizedModuleName = moduleName.toLowerCase();
	
	for (const field of fields) {
		// Filter by module inline
		if (field.module?.trim().toLowerCase() === normalizedModuleName) {
			const normalizedLabel = normalizeLabelName(field.labelName);
			if (normalizedLabel) {
				fieldMap.set(normalizedLabel, field.fieldName);
			}
		}
	}
	
	return fieldMap;
}
