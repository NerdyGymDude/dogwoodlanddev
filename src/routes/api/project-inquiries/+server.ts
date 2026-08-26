import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { sendZohoMail } from '$lib/server/integrations/zoho-mail';

type InquiryInput = {
	businessName?: string; firstName?: string; lastName?: string; phone?: string;
	email?: string; address?: string; preferredContact?: string; projectType?: string; message?: string;
};

const clean = (value: unknown) => String(value ?? '').trim();
const html = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const POST: RequestHandler = async ({ request }) => {
	let raw: InquiryInput;
	try { raw = (await request.json()) as InquiryInput; }
	catch { return json({ error: 'Invalid project inquiry.' }, { status: 400 }); }

	const input = {
		businessName: clean(raw.businessName), firstName: clean(raw.firstName), lastName: clean(raw.lastName),
		phone: clean(raw.phone), email: clean(raw.email), address: clean(raw.address),
		preferredContact: clean(raw.preferredContact), projectType: clean(raw.projectType), message: clean(raw.message)
	};
	if (!input.firstName || !input.lastName || !input.email || !input.email.includes('@')) {
		return json({ error: 'First Name, Last Name, and a valid Email are required.' }, { status: 400 });
	}

	const subjectName = input.businessName || `${input.firstName} ${input.lastName}`;
	const lines = [
		...(input.businessName ? [`Business Name: ${input.businessName}`] : []),
		`First Name: ${input.firstName}`, `Last Name: ${input.lastName}`,
		...(input.phone ? [`Phone: ${input.phone}`] : []), `Email: ${input.email}`,
		`Property Address: ${input.address || 'Not supplied'}`,
		`Preferred Contact: ${input.preferredContact || 'Not supplied'}`,
		`Project Type: ${input.projectType || 'Not supplied'}`,
		`Project Details: ${input.message || 'Not supplied'}`
	];
	try {
		await sendZohoMail({
			from: 'office@dogwoodlanddev.com', to: 'office@dogwoodlanddev.com',
			subject: `${subjectName} has requested information on a new project`,
			content: lines.map((line) => html(line)).join('<br>')
		});
		return json({ notificationSent: true });
	} catch (error) {
		console.error('Project inquiry notification failed:', error);
		return json({ notificationSent: false, error: 'The project inquiry notification could not be delivered.' }, { status: 502 });
	}
};
