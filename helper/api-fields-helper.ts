// API Field Types
export interface APIField {
	id: string;
	fieldName: string;
	defaultLabelName: string;
	labelName: string;
	fieldType: string;
	optionName: string | null;
	isEditable: string;
	autoUpdate: string;
	isVisible: string;
	module: string | null;
	moduleSection: string;
	strictlyRequired: string;
	required: string;
	allowImport: string;
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
	return fields.filter(field => {
		// Handle null module or case-insensitive comparison
		if (!field.module) return false;
		// Trim whitespace and newlines, then compare case-insensitively
		const normalizedModule = field.module.trim().toLowerCase();
		return normalizedModule === moduleName.toLowerCase();
	});
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

function addNormalizedLabel(target: Set<string>, label: string | null | undefined): void {
	if (!label) return;
	const normalized = normalizeLabelName(label);
	if (normalized) target.add(normalized);
}

/**
 * Extract label names from a list of fields
 * @param fields - Array of API fields
 * @returns Array of normalized label names
 */
export function extractLabelNames(fields: APIField[]): string[] {
	const labels = new Set<string>();
	fields.forEach(field => {
		addNormalizedLabel(labels, field.labelName);
	});
	return Array.from(labels);
}

/**
 * Create a map of label names to field names
 * @param fields - Array of API fields
 * @returns Map with normalized labelName as key and fieldName as value
 */
export function createFieldMap(fields: APIField[]): Map<string, string> {
	const fieldMap = new Map<string, string>();
	fields.forEach(field => {
		const normalizedLabel = normalizeLabelName(field.labelName);
		fieldMap.set(normalizedLabel, field.fieldName);
	});
	return fieldMap;
}

/**
 * Get fields for a specific module and return label names and field map
 * @param fields - Array of all API fields
 * @param moduleName - Module name to filter by
 * @returns Object containing labelNames array and fieldMap
 */
export function getModuleFieldData(
	fields: APIField[], 
	moduleName: string
): { labelNames: string[], fieldMap: Map<string, string> } {
	const filteredFields = filterFieldsByModule(fields, moduleName);
	const labelNames = extractLabelNames(filteredFields);
	const fieldMap = createFieldMap(filteredFields);
	
	console.log(`Module '${moduleName}': ${filteredFields.length} fields, ${labelNames.length} labels, ${fieldMap.size} mappings`);
	
	return { labelNames, fieldMap };
}

/**
 * Get all unique module names from fields
 * @param fields - Array of API fields
 * @returns Array of unique module names
 */
export function getUniqueModules(fields: APIField[]): string[] {
	const modules = new Set<string>();
	fields.forEach(field => {
		if (field.module) {
			modules.add(field.module);
		}
	});
	return Array.from(modules).sort();
}

/**
 * Filter fields by visibility
 * @param fields - Array of API fields
 * @param visible - Whether to get visible fields (default: true)
 * @returns Filtered array of fields
 */
export function filterFieldsByVisibility(fields: APIField[], visible: boolean = true): APIField[] {
	const visibilityValue = visible ? '1' : '0';
	return fields.filter(field => field.isVisible === visibilityValue);
}
