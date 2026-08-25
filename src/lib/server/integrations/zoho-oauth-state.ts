const OAUTH_STATE_BYTES = 32;

export function createZohoOAuthState() {
	const bytes = crypto.getRandomValues(new Uint8Array(OAUTH_STATE_BYTES));

	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function statesMatch(expected: string, returned: string) {
	const expectedBytes = new TextEncoder().encode(expected);
	const returnedBytes = new TextEncoder().encode(returned);
	let difference = expectedBytes.length ^ returnedBytes.length;
	const length = Math.max(expectedBytes.length, returnedBytes.length);

	for (let index = 0; index < length; index += 1) {
		difference |= (expectedBytes[index] ?? 0) ^ (returnedBytes[index] ?? 0);
	}

	return difference === 0;
}
