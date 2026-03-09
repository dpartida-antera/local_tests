import { normalizeLabelName } from './api-fields-helper';

export const REPORT_BUILDER_MISSING_COLUMNS_ALLOWLIST = new Set([
	'Add Ons Cost',
	'Add Ons Total',
	'Balance',
	'Billing Customer Email',
	'Booked Date',
	'Contact Email',
	'Decoration Cost',
	'Decoration Total',
	'Difference Regular To Vouched Cost',
	'Freight Cost',
	'Freight Total',
	'Gross Profit Percent',
	'Invoice Date',
	'Non Taxable Amount',
	'Order Subtotal',
	'Payment Amount',
	'Payment Date',
	'Payment Method',
	'Payment Status',
	'Product Cost',
	'Product Total',
	'Production Manager Email',
	'Production Manager Phone',
	'Proforma Date',
	'Sales Person Mobile',
	'Shipping Customer Email',
	'Taxable Amount',
	'Tracking Number',
	'Transaction Number',
	'Vouched Cost',
	'Vouched Gross Profit',
	'Vouched Gross Profit Percent',
	'Workflow Status',
].map(normalizeLabelName));

export function normalizeColumnName(name: string): string {
	return normalizeLabelName(name);
}
