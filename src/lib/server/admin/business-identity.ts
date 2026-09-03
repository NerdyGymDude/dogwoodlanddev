export const businessIdentity = {
	legalPayee: 'Dogwood LD, PLLC',
	mailingAddress: ['PO Box 93', 'Wrightsville Beach, NC 28480']
} as const;

export function paperCheckInstructions() {
	return {
		payee: businessIdentity.legalPayee,
		addressLines: businessIdentity.mailingAddress
	};
}
