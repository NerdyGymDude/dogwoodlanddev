export function formatMoneyInput(value: string): string {
	const raw = String(value ?? '').replace(/,/g, '').replace(/[^\d.]/g, '');

	if (!raw) return '';

	const firstDot = raw.indexOf('.');

	let whole = firstDot === -1 ? raw : raw.slice(0, firstDot);
	let decimal = firstDot === -1 ? '' : raw.slice(firstDot + 1).replace(/\./g, '');

	decimal = decimal.slice(0, 2);

	whole = whole.replace(/^0+(?=\d)/, '');
	if (!whole) whole = '0';

	const formattedWhole = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

	return firstDot === -1
		? formattedWhole
		: `${formattedWhole}.${decimal}`;
}

export function parseMoney(value: string | number): number {
	const parsed = Number(String(value ?? '').replace(/[$,]/g, ''));
	return Number.isFinite(parsed) ? parsed : 0;
}

export function displayMoney(value: string | number): string {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(parseMoney(value));
}
