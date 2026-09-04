import { read } from '$app/server';
import invoiceTemplate from './assets/dogwood-sample-invoice.pdf';
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	calculateFinancialTotals,
	loadProjectFinancialState,
	mapFinancialDocument
} from './accounting';
import { sendZohoMail } from '$lib/server/integrations/zoho-mail';
import { createPaymentLinkToken } from '$lib/server/integrations/stripe';
import { paperCheckInstructions } from './business-identity';

const money = (value: number) =>
	new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const escapeHtml = (value: string) =>
	value
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
const formatDate = (value: unknown) => {
	if (!value) return '';
	const date = new Date(String(value).length === 10 ? `${value}T12:00:00` : String(value));
	return Number.isNaN(date.getTime())
		? String(value)
		: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};
const logoUrl = 'https://dogwoodlanddev.com/images/dogwoodlogo-transparent.png';

type EmailProject = { name?: unknown; project_number?: unknown; client_name?: unknown };
type EmailDocument = {
	id?: unknown;
	invoice_identifier?: unknown;
	created_at?: unknown;
	total_project_invoice: unknown;
	amount_paid_to_date: unknown;
	amount_due: unknown;
};
type EmailLine = { description?: unknown; task_total?: unknown; billed_amount?: unknown };

function financialEmailLayout(input: {
	title: string;
	identifier: string;
	dateLabel: string;
	date: string;
	project: EmailProject;
	lines: EmailLine[];
	document: EmailDocument;
	intro: string;
	note?: string;
	paymentReceived?: number;
	paymentDetails?: Array<[string, string]>;
	paymentUrl?: string;
}) {
	const check = paperCheckInstructions();
	const rows = input.lines
		.map(
			(line) =>
				`<tr><td style="padding:10px 12px;border-bottom:1px solid #d7dde3;color:#1f2937;">${escapeHtml(String(line.description ?? ''))}</td><td style="padding:10px 12px;border-bottom:1px solid #d7dde3;text-align:right;white-space:nowrap;color:#1f2937;">${money(Number(line.task_total ?? 0))}</td><td style="padding:10px 12px;border-bottom:1px solid #d7dde3;text-align:right;white-space:nowrap;color:#1f2937;">${money(Number(line.billed_amount ?? 0))}</td></tr>`
		)
		.join('');
	const detailRows = (input.paymentDetails ?? [])
		.filter(([, value]) => value)
		.map(
			([label, value]) =>
				`<tr><td style="padding:4px 12px 4px 0;color:#64748b;">${escapeHtml(label)}</td><td style="padding:4px 0;color:#1f2937;font-weight:600;">${escapeHtml(value)}</td></tr>`
		)
		.join('');
	const note = input.note?.trim()
		? `<div style="margin:24px 0;padding:16px;background:#f8fafc;border-left:4px solid #2f6b3c;color:#1f2937;">${escapeHtml(input.note.trim()).replace(/\r?\n/g, '<br>')}</div>`
		: '';
	const payment = input.paymentUrl
		? `<div style="margin:24px 0;padding:20px;text-align:center;background:#eef6ee;border:1px solid #c8dccb;"><p style="margin:0 0 16px;color:#1f2937;font-weight:700;">Payment options</p><a href="${escapeHtml(input.paymentUrl)}" style="display:inline-block;padding:13px 22px;border-radius:5px;background:#2f6b3c;color:#ffffff;font-weight:700;text-decoration:none;">Pay Invoice via Stripe</a></div>`
		: '';
	const received =
		input.paymentReceived === undefined
			? ''
			: `<tr><td style="padding:6px 0;color:#475569;">Payment Received</td><td style="padding:6px 0;text-align:right;font-weight:700;color:#1f2937;">${money(input.paymentReceived)}</td></tr>`;
	return `<!doctype html><html><body style="margin:0;padding:0;background:#f1f5f0;font-family:Arial,Helvetica,sans-serif;color:#1f2937;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f0;"><tr><td align="center" style="padding:24px 12px;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border:1px solid #d7dde3;"><tr><td style="padding:24px 28px;background:#f7f4e8;border-bottom:4px solid #2f6b3c;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td><img src="${logoUrl}" alt="Dogwood Land Development" width="180" style="display:block;max-width:180px;height:auto;border:0;"><div style="margin-top:8px;font-size:15px;font-weight:700;color:#17324d;">Dogwood Land Development</div></td><td align="right" valign="top"><div style="font-size:26px;font-weight:700;color:#17324d;">${escapeHtml(input.title)}</div><div style="margin-top:6px;font-size:13px;color:#475569;">${escapeHtml(input.identifier)}</div><div style="margin-top:3px;font-size:13px;color:#475569;">${escapeHtml(input.dateLabel)}: ${escapeHtml(input.date)}</div></td></tr></table></td></tr><tr><td style="padding:28px;"><p style="margin:0 0 20px;line-height:1.5;">${escapeHtml(input.intro)}</p>${note}<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:24px;background:#f8fafc;border:1px solid #e2e8f0;"><tr><td style="padding:16px;width:50%;"><div style="font-size:11px;text-transform:uppercase;color:#64748b;">Client</div><div style="margin-top:4px;font-weight:700;">${escapeHtml(String(input.project.client_name ?? ''))}</div></td><td style="padding:16px;width:50%;"><div style="font-size:11px;text-transform:uppercase;color:#64748b;">Project</div><div style="margin-top:4px;font-weight:700;">${escapeHtml(String(input.project.name ?? ''))}</div><div style="margin-top:3px;font-size:13px;color:#475569;">Project Number: ${escapeHtml(String(input.project.project_number ?? ''))}</div></td></tr></table>${detailRows ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom:20px;">${detailRows}</table>` : ''}<table width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #d7dde3;"><thead><tr style="background:#17324d;color:#ffffff;"><th align="left" style="padding:10px 12px;">Description</th><th align="right" style="padding:10px 12px;">Amount</th><th align="right" style="padding:10px 12px;">Billed Amount</th></tr></thead><tbody>${rows}</tbody></table><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:18px 0 0 auto;max-width:360px;">${received}<tr><td style="padding:6px 0;color:#475569;">Total Project Invoice</td><td style="padding:6px 0;text-align:right;">${money(Number(input.document.total_project_invoice))}</td></tr><tr><td style="padding:6px 0;color:#475569;">Amount Paid to Date</td><td style="padding:6px 0;text-align:right;">${money(Number(input.document.amount_paid_to_date))}</td></tr><tr><td style="padding:10px 0;border-top:2px solid #2f6b3c;font-weight:700;">Amount Due</td><td style="padding:10px 0;border-top:2px solid #2f6b3c;text-align:right;font-weight:700;">${money(Number(input.document.amount_due))}</td></tr></table>${payment}<div style="margin-top:24px;padding:18px;background:#f8fafc;border:1px solid #e2e8f0;"><div style="font-weight:700;margin-bottom:8px;">Pay by paper check</div><div>Make checks payable to:<br><strong>${escapeHtml(check.payee)}</strong></div><div style="margin-top:10px;">Mail to:<br>${check.addressLines.map(escapeHtml).join('<br>')}</div></div><p style="margin:24px 0 0;line-height:1.5;">Thank you,<br><strong>Dogwood Land Development</strong></p><div style="margin-top:28px;padding-top:18px;border-top:1px solid #d7dde3;text-align:center;font-size:13px;line-height:1.6;color:#475569;font-style:italic;">&quot;Commit to the Lord whatever you do, and he will establish your plans.&quot; - Proverbs 16:3</div></td></tr><tr><td style="padding:16px 28px;background:#17324d;color:#ffffff;font-size:12px;text-align:center;">Dogwood Land Development</td></tr></table></td></tr></table></body></html>`;
}

export function buildInvoiceEmailContent(
	document: EmailDocument,
	project: EmailProject,
	lines: EmailLine[],
	note = '',
	paymentUrl = ''
) {
	const cleanNote = note.trim() === 'Please find the attached invoice.' ? '' : note;
	return financialEmailLayout({
		title: 'INVOICE',
		identifier: String(document.invoice_identifier ?? ''),
		dateLabel: 'Invoice Date',
		date: formatDate(document.created_at),
		project,
		lines,
		document,
		intro: 'Your Dogwood Land Development invoice is provided below.',
		note: cleanNote,
		paymentUrl
	});
}

function drawRightAligned(
	page: PDFPage,
	value: string,
	right: number,
	y: number,
	size: number,
	font: PDFFont,
	color = rgb(0.121569, 0.160784, 0.215686)
) {
	page.drawText(value, { x: right - font.widthOfTextAtSize(value, size), y, size, font, color });
}

export async function renderInvoicePdf(input: {
	project: any;
	document: any;
	lines: any[];
	documentKind?: 'invoice' | 'receipt';
	paymentReceived?: number;
}) {
	const templateResponse = read(invoiceTemplate);
	const template = new Uint8Array(await templateResponse.arrayBuffer());
	const pdf = await PDFDocument.load(template);
	const font = await pdf.embedFont(StandardFonts.Helvetica);
	const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
	const isReceiptDocument = input.documentKind === 'receipt';
	const invoiceIdentifier = String(input.document.invoice_identifier ?? '').trim();
	if (!isReceiptDocument) {
		if (!invoiceIdentifier)
			throw new Error('Invoice identifier is required to render an invoice PDF.');
		pdf.setTitle(invoiceIdentifier);
	}
	const rowsPerPage = 3;
	const pageCount = Math.max(1, Math.ceil(input.lines.length / rowsPerPage));
	if (pageCount > 1) {
		const [templateBackground] = await pdf.embedPdf(template, [0]);
		for (let index = 1; index < pageCount; index += 1) {
			const added = pdf.addPage([612, 792]);
			added.drawPage(templateBackground, { x: 0, y: 0, width: 612, height: 792 });
		}
	}

	const white = rgb(1, 1, 1);
	const ink = rgb(0.121569, 0.160784, 0.215686);
	const beige = rgb(0.960784, 0.945098, 0.905882);
	const rule = rgb(0.788235, 0.807843, 0.831373);
	const summaryFill = rgb(0.917647, 0.94902, 0.909804);
	const dueFill = rgb(0.117647, 0.356863, 0.172549);
	const invoiceDate = new Date(input.document.created_at).toLocaleDateString('en-US', {
		month: 'long',
		day: 'numeric',
		year: 'numeric'
	});

	for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
		const page = pdf.getPage(pageIndex);
		const pageLines = input.lines.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage);
		const isReceipt = isReceiptDocument;
		if (isReceipt) {
			page.drawRectangle({ x: 438, y: 700, width: 126, height: 48, color: white });
			page.drawText('RECEIPT', {
				x: 445,
				y: 724,
				size: 28,
				font: bold,
				color: rgb(0.043137, 0.180392, 0.403922)
			});
		}

		// Target only sample-value areas. Static headings, boxes, logo, payment instructions and footer remain untouched.
		page.drawRectangle({ x: 410, y: 648, width: 154, height: 38, color: white });
		page.drawText(isReceipt ? 'Receipt Date' : 'Invoice Date', {
			x: 480,
			y: 672,
			size: 10.5,
			font: bold,
			color: ink
		});
		page.drawText(invoiceDate, { x: 480, y: 656, size: 10.5, font, color: ink });
		if (isReceipt && pageIndex === 0)
			drawRightAligned(
				page,
				`Payment Received: ${money(Number(input.paymentReceived ?? 0))}`,
				564,
				638,
				9,
				bold
			);
		if (!isReceipt) {
			page.drawRectangle({ x: 410, y: 606, width: 154, height: 40, color: white });
			page.drawText('Invoice Number', { x: 480, y: 630, size: 10.5, font: bold, color: ink });
			drawRightAligned(page, invoiceIdentifier, 564, 613, 8.5, font, ink);
		}

		page.drawRectangle({ x: 60, y: 526, width: 226, height: 55, color: beige });
		const billTo = [
			input.project.bill_to_contact,
			input.project.client_name,
			input.project.client_address,
			input.project.client_city_line
		].filter(Boolean);
		billTo
			.slice(0, 4)
			.forEach((value, index) =>
				page.drawText(String(value).slice(0, 42), {
					x: 62,
					y: 573 - index * 14,
					size: 10,
					font,
					color: ink
				})
			);

		page.drawRectangle({ x: 302, y: 526, width: 258, height: 55, color: beige });
		const projectDetails = [
			input.project.name,
			input.project.description,
			input.project.address_line
		].filter(Boolean);
		projectDetails
			.slice(0, 3)
			.forEach((value, index) =>
				page.drawText(String(value).slice(0, 43), {
					x: 304.52,
					y: 573 - index * 14,
					size: 10,
					font,
					color: ink
				})
			);

		page.drawRectangle({ x: 48, y: 304, width: 516, height: 168, color: white });
		let rowTop = 472;
		for (const line of pageLines) {
			const rowBottom = rowTop - 52;
			page.drawRectangle({
				x: 48,
				y: rowBottom,
				width: 516,
				height: 52,
				borderColor: rule,
				borderWidth: 0.55,
				color: white
			});
			page.drawLine({
				start: { x: 378.24, y: rowBottom },
				end: { x: 378.24, y: rowTop },
				thickness: 0.55,
				color: rule
			});
			page.drawLine({
				start: { x: 471.12, y: rowBottom },
				end: { x: 471.12, y: rowTop },
				thickness: 0.55,
				color: rule
			});
			const description = String(line.description);
			const splitAt = description.length > 55 ? description.lastIndexOf(' ', 55) : -1;
			const descriptionLines =
				splitAt > 0
					? [description.slice(0, splitAt), description.slice(splitAt + 1, splitAt + 56)]
					: [description.slice(0, 55)];
			descriptionLines.forEach((value, index) =>
				page.drawText(value, {
					x: 55,
					y: rowBottom + 31 - index * 14,
					size: index ? 8 : 8.5,
					font,
					color: ink
				})
			);
			drawRightAligned(page, money(Number(line.task_total)), 460, rowBottom + 21, 9, font);
			drawRightAligned(page, money(Number(line.billed_amount)), 553, rowBottom + 21, 9, font);
			rowTop = rowBottom;
		}

		const isLastPage = pageIndex === pageCount - 1;
		const summaryValues = isLastPage
			? [
					money(Number(input.document.total_project_invoice)),
					money(Number(input.document.amount_paid_to_date)),
					money(Number(input.document.amount_due))
				]
			: ['', '', ''];
		page.drawRectangle({ x: 480, y: 275, width: 78, height: 16, color: summaryFill });
		page.drawRectangle({ x: 480, y: 243, width: 78, height: 16, color: summaryFill });
		page.drawRectangle({ x: 480, y: 211, width: 78, height: 16, color: dueFill });
		if (summaryValues[0]) drawRightAligned(page, summaryValues[0], 553, 278, 10.5, font);
		if (summaryValues[1]) drawRightAligned(page, summaryValues[1], 553, 246, 10.5, font);
		if (summaryValues[2]) drawRightAligned(page, summaryValues[2], 553, 214, 12, bold, white);

		if (!isReceipt) {
			const check = paperCheckInstructions();
			const paymentFill = rgb(0.933333, 0.945098, 0.956863);
			const verse =
				'"Commit to the Lord whatever you do, and he will establish your plans." - Proverbs 16:3';
			const verseSize = 9;
			page.drawRectangle({ x: 48, y: 92, width: 516, height: 28, color: white });
			page.drawRectangle({ x: 48, y: 120, width: 516, height: 70, color: white });
			page.drawRectangle({
				x: 48,
				y: 120,
				width: 516,
				height: 66,
				color: paymentFill,
				borderColor: rule,
				borderWidth: 0.5
			});
			page.drawLine({
				start: { x: 306, y: 120 },
				end: { x: 306, y: 186 },
				thickness: 0.5,
				color: rule
			});
			page.drawText('PAYMENT OPTIONS', { x: 62, y: 171, size: 7.5, font: bold, color: ink });
			page.drawText('Pay by ACH/Debit or Credit Card using', {
				x: 62,
				y: 155,
				size: 7.5,
				font,
				color: ink
			});
			page.drawText('the Stripe link in the email.', {
				x: 62,
				y: 146,
				size: 7.5,
				font,
				color: ink
			});
			page.drawText('OR', { x: 320, y: 171, size: 7.5, font: bold, color: ink });
			page.drawText('Pay by check — make checks payable to', {
				x: 320,
				y: 158,
				size: 7.25,
				font,
				color: ink
			});
			page.drawText(`${check.payee} and mail to:`, {
				x: 320,
				y: 149,
				size: 7.25,
				font,
				color: ink
			});
			page.drawText(check.addressLines[0], { x: 320, y: 140, size: 7.25, font, color: ink });
			page.drawText(check.addressLines[1], { x: 320, y: 131, size: 7.25, font, color: ink });
			page.drawText(verse, {
				x: (612 - font.widthOfTextAtSize(verse, verseSize)) / 2,
				y: 99,
				size: verseSize,
				font,
				color: dueFill
			});
		}
	}
	return isReceiptDocument ? pdf.save() : pdf.save({ useObjectStreams: false });
}

export function calculateReceiptAmountDue(originalInvoiceAmountDue: number, paymentAmount: number) {
	return Math.max(Math.round((originalInvoiceAmountDue - paymentAmount) * 100) / 100, 0);
}

export function buildReceiptEmailContent(input: {
	document: EmailDocument;
	project: EmailProject;
	lines: EmailLine[];
	paymentReceived: number;
	paymentDate: unknown;
	paymentMethod: string;
	checkNumber?: string;
	memo?: string;
	invoiceIdentifier?: string;
}) {
	const method =
		input.paymentMethod === 'paper_check'
			? 'Paper check'
			: input.paymentMethod === 'stripe'
				? 'Stripe'
				: input.paymentMethod;
	return financialEmailLayout({
		title: 'RECEIPT',
		identifier: `Receipt Reference: ${String(input.document.id ?? '')}`,
		dateLabel: 'Receipt Date',
		date: formatDate(input.document.created_at),
		project: input.project,
		lines: input.lines,
		document: input.document,
		intro:
			'Thank you. We have received your payment. Your Dogwood Land Development receipt is provided below.',
		paymentReceived: input.paymentReceived,
		paymentDetails: [
			['Related Invoice', input.invoiceIdentifier ?? ''],
			['Payment Date', formatDate(input.paymentDate)],
			['Payment Method', method],
			['Check Number', input.checkNumber ?? ''],
			['Payment Note', input.memo ?? '']
		]
	});
}

export async function createAndSendReceipt(
	admin: SupabaseClient,
	userId: string | null,
	payment: { id: string; project_id: string; amount: number | string },
	sourceInvoiceId = ''
) {
	const { data: existingReceipt, error: existingError } = await admin
		.from('financial_documents')
		.select('*, financial_document_lines(*)')
		.eq('document_type', 'receipt')
		.eq('source_payment_id', payment.id)
		.maybeSingle();

	if (existingError) throw existingError;
	if (existingReceipt?.sent_at) return mapFinancialDocument(existingReceipt);

	const invoiceResult = sourceInvoiceId
		? await admin
				.from('financial_documents')
				.select('*, financial_document_lines(*)')
				.eq('id', sourceInvoiceId)
				.eq('document_type', 'invoice')
				.eq('project_id', payment.project_id)
				.not('sent_at', 'is', null)
				.maybeSingle()
		: await admin
				.from('financial_documents')
				.select('*, financial_document_lines(*)')
				.eq('document_type', 'invoice')
				.eq('project_id', payment.project_id)
				.not('sent_at', 'is', null)
				.order('sent_at', { ascending: false })
				.limit(1)
				.maybeSingle();

	const { data: invoice, error: invoiceError } = invoiceResult;

	if (invoiceError) throw invoiceError;
	if (!invoice) {
		throw new Error(
			sourceInvoiceId
				? 'The paid invoice could not be found for this receipt.'
				: 'A sent invoice is required before a receipt can be generated for this payment.'
		);
	}

	const state = await loadProjectFinancialState(admin, payment.project_id);
	const paymentAmount = Number(payment.amount);
	const { data: paymentDetails, error: paymentDetailsError } = await admin
		.from('project_payments')
		.select('payment_method, payment_date, check_number, memo')
		.eq('id', payment.id)
		.eq('project_id', payment.project_id)
		.single();
	if (paymentDetailsError) throw paymentDetailsError;
	const receiptAmountDue = calculateReceiptAmountDue(Number(invoice.amount_due), paymentAmount);

	let receipt = existingReceipt;

	if (!receipt) {
		const { data, error } = await admin
			.from('financial_documents')
			.insert({
				project_id: payment.project_id,
				document_type: 'receipt',
				source_payment_id: payment.id,
				total_project_invoice: Number(invoice.total_project_invoice),
				amount_paid_to_date: state.totals.amountPaidToDate,
				amount_due: receiptAmountDue,
				recipient_contact_ids: invoice.recipient_contact_ids ?? [],
				created_by: userId || null
			})
			.select('*')
			.single();

		if (error?.code === '23505') {
			const { data: racedReceipt, error: racedError } = await admin
				.from('financial_documents')
				.select('*, financial_document_lines(*)')
				.eq('document_type', 'receipt')
				.eq('source_payment_id', payment.id)
				.single();

			if (racedError) throw racedError;
			if (racedReceipt.sent_at) return mapFinancialDocument(racedReceipt);

			throw new Error('Receipt generation is already in progress; retry this webhook.');
		} else if (error) {
			throw error;
		} else {
			receipt = data;
		}
	}

	let lines = receipt.financial_document_lines ?? [];

	if (!lines.length) {
		const invoiceLines = Array.isArray(invoice.financial_document_lines)
			? invoice.financial_document_lines
			: [];

		const snapshotLines =
			sourceInvoiceId && invoiceLines.length
				? invoiceLines.map((line: any, index: number) => ({
						financial_document_id: receipt.id,
						project_billing_task_id: line.project_billing_task_id,
						description: line.description,
						task_total: line.task_total,
						billed_amount: line.billed_amount,
						display_order: line.display_order ?? index
					}))
				: state.tasks.map((task: any, index: number) => ({
						financial_document_id: receipt.id,
						project_billing_task_id: task.id,
						description: task.description,
						task_total: task.task_total,
						billed_amount: task.billed_amount,
						display_order: index
					}));

		const { data, error } = await admin
			.from('financial_document_lines')
			.insert(snapshotLines)
			.select('*');

		if (error) throw error;
		lines = data ?? [];
	}

	const recipientIds = Array.isArray(receipt.recipient_contact_ids)
		? receipt.recipient_contact_ids
		: [];

	if (!recipientIds.length) {
		throw new Error('The related sent invoice has no approved receipt recipients.');
	}

	const [
		{ data: contacts, error: contactError },
		{ data: projectDetails, error: projectError },
		{ data: clientDetails, error: clientError }
	] = await Promise.all([
		admin
			.from('client_contacts')
			.select('id, name, email')
			.eq('client_id', state.project.client_id)
			.in('id', recipientIds),
		admin
			.from('projects')
			.select('name, description, address, city, state, zip')
			.eq('id', payment.project_id)
			.single(),
		admin
			.from('clients')
			.select('name, address, city, state, zip')
			.eq('id', state.project.client_id)
			.single()
	]);

	if (contactError) throw contactError;
	if (projectError) throw projectError;
	if (clientError) throw clientError;

	const recipients = (contacts ?? [])
		.map((contact) => String(contact.email ?? '').trim())
		.filter(Boolean);

	if (recipients.length !== recipientIds.length) {
		throw new Error(
			'Every receipt recipient must be an approved project contact with an email address.'
		);
	}

	const cityLine = (record: any) =>
		[record?.city, record?.state, record?.zip].filter(Boolean).join(' ');

	const renderProject = {
		...state.project,
		...projectDetails,
		bill_to_contact: contacts?.[0]?.name ?? '',
		client_name: clientDetails.name ?? '',
		client_address: clientDetails.address ?? '',
		client_city_line: cityLine(clientDetails),
		address_line: [projectDetails.address, cityLine(projectDetails)].filter(Boolean).join(', ')
	};

	const bytes = await renderInvoicePdf({
		project: renderProject,
		document: receipt,
		lines,
		documentKind: 'receipt',
		paymentReceived: paymentAmount
	});

	const path = `financials/${payment.project_id}/receipts/${receipt.id}/receipt.pdf`;

	const { error: uploadError } = await admin.storage.from('client-documents').upload(path, bytes, {
		contentType: 'application/pdf',
		upsert: true
	});

	if (uploadError) throw uploadError;

	const { error: pathError } = await admin
		.from('financial_documents')
		.update({ pdf_storage_path: path })
		.eq('id', receipt.id);

	if (pathError) throw pathError;

	await sendZohoMail({
		from: 'accounting@dogwoodlanddev.com',
		to: recipients.join(','),
		subject: `Payment Receipt - ${state.project.project_number ?? state.project.name}`,
		content: buildReceiptEmailContent({
			document: receipt,
			project: renderProject,
			lines,
			paymentReceived: paymentAmount,
			paymentDate: paymentDetails.payment_date,
			paymentMethod: paymentDetails.payment_method,
			checkNumber: paymentDetails.check_number ?? '',
			memo: paymentDetails.memo ?? '',
			invoiceIdentifier: invoice.invoice_identifier ?? ''
		})
	});

	const sentAt = new Date().toISOString();

	const { data: sent, error: sentError } = await admin
		.from('financial_documents')
		.update({ sent_at: sentAt })
		.eq('id', receipt.id)
		.select('*')
		.single();

	if (sentError) {
		throw new Error('Receipt email was sent, but its sent timestamp could not be recorded.');
	}

	return mapFinancialDocument({
		...sent,
		financial_document_lines: lines
	});
}

export async function createAndSendInvoice(
	admin: SupabaseClient,
	userId: string,
	projectId: string,
	recipientContactIds: string[],
	message: string,
	manualRecipientEmails: string[] = [],
	saveToClientId = '',
	origin = ''
) {
	const state = await loadProjectFinancialState(admin, projectId);
	if (!state.tasks.length)
		throw new Error('Add at least one financial task before sending an invoice.');
	const requestedIds = [...new Set(recipientContactIds)].filter(Boolean);
	const manualEmails = [
		...new Set(manualRecipientEmails.map((email) => email.trim().toLowerCase()).filter(Boolean))
	];
	if (manualEmails.some((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
		throw new Error('Enter a valid invoice email address.');
	if (!requestedIds.length && !manualEmails.length)
		throw new Error('Choose an email or select Send to Client.');
	if (saveToClientId && saveToClientId !== state.project.client_id)
		throw new Error('Invoice recipients must belong to the project client.');
	const [
		{ data: existingContacts, error: contactError },
		{ data: projectDetails, error: projectError },
		{ data: clientDetails, error: clientError }
	] = await Promise.all([
		admin
			.from('client_contacts')
			.select('id, name, email, phone, contact_type')
			.eq('client_id', state.project.client_id),
		admin
			.from('projects')
			.select('name, description, address, city, state, zip')
			.eq('id', projectId)
			.single(),
		admin
			.from('clients')
			.select('name, address, city, state, zip')
			.eq('id', state.project.client_id)
			.single()
	]);
	if (contactError) throw contactError;
	if (projectError) throw projectError;
	if (clientError) throw clientError;
	const selectedContacts = (existingContacts ?? []).filter((contact) =>
		requestedIds.includes(contact.id)
	);
	const contactRecipients = selectedContacts
		.map((contact) =>
			String(contact.email ?? '')
				.trim()
				.toLowerCase()
		)
		.filter(Boolean);
	if (
		selectedContacts.length !== requestedIds.length ||
		contactRecipients.length !== requestedIds.length
	)
		throw new Error(
			'Every selected recipient must be an approved project contact with an email address.'
		);

	const contactsByEmail = new Map(
		(existingContacts ?? []).map((contact) => [
			String(contact.email ?? '')
				.trim()
				.toLowerCase(),
			contact
		])
	);
	const newEmails = manualEmails.filter((email) => !contactsByEmail.has(email));
	let savedContacts: Array<{
		id: string;
		name: string | null;
		email: string | null;
		phone: string | null;
		contact_type: string;
	}> = [];
	if (newEmails.length) {
		const hasPrimary = (existingContacts ?? []).some(
			(contact) => contact.contact_type === 'primary'
		);
		const { data: inserted, error: insertError } = await admin
			.from('client_contacts')
			.insert(
				newEmails.map((email, index) => ({
					client_id: state.project.client_id,
					contact_type: !hasPrimary && index === 0 ? 'primary' : 'secondary',
					name: 'Invoice recipient',
					email,
					phone: null
				}))
			)
			.select('id, name, email, phone, contact_type');
		if (insertError) console.warn('Invoice recipient contact persistence failed:', insertError);
		else savedContacts = inserted ?? [];
		for (const contact of savedContacts)
			contactsByEmail.set(
				String(contact.email ?? '')
					.trim()
					.toLowerCase(),
				contact
			);
	}
	const ids = [
		...new Set([
			...requestedIds,
			...manualEmails.map((email) => contactsByEmail.get(email)?.id ?? '').filter(Boolean)
		])
	];
	const recipients = [...new Set([...contactRecipients, ...manualEmails])];
	const totals = calculateFinancialTotals(state.tasks, state.payments);
	const { data: invoiceIdentifier, error: identifierError } = await admin.rpc(
		'next_financial_invoice_identifier',
		{ p_client_id: state.project.client_id }
	);
	if (identifierError)
		throw new Error(`Invoice identifier could not be allocated: ${identifierError.message}`);
	if (typeof invoiceIdentifier !== 'string' || !invoiceIdentifier.trim())
		throw new Error('Invoice identifier could not be allocated.');
	const { data: document, error: documentError } = await admin
		.from('financial_documents')
		.insert({
			project_id: projectId,
			document_type: 'invoice',
			invoice_identifier: invoiceIdentifier,
			total_project_invoice: totals.totalProjectInvoice,
			amount_paid_to_date: totals.amountPaidToDate,
			amount_due: totals.amountDue,
			recipient_contact_ids: ids,
			created_by: userId
		})
		.select('*')
		.single();
	if (documentError) throw documentError;
	const snapshotLines = state.tasks.map((task: any, index: number) => ({
		financial_document_id: document.id,
		project_billing_task_id: task.id,
		description: task.description,
		task_total: task.task_total,
		billed_amount: task.billed_amount,
		display_order: index
	}));
	const { data: lines, error: linesError } = await admin
		.from('financial_document_lines')
		.insert(snapshotLines)
		.select('*');
	if (linesError) throw linesError;
	const cityLine = (record: any) =>
		[record?.city, record?.state, record?.zip].filter(Boolean).join(' ');
	const renderProject = {
		...state.project,
		...projectDetails,
		bill_to_contact: selectedContacts[0]?.name ?? contactsByEmail.get(manualEmails[0])?.name ?? '',
		client_name: clientDetails.name ?? '',
		client_address: clientDetails.address ?? '',
		client_city_line: cityLine(clientDetails),
		address_line: [projectDetails.address, cityLine(projectDetails)].filter(Boolean).join(', ')
	};
	const bytes = await renderInvoicePdf({
		project: renderProject,
		document,
		lines: lines ?? snapshotLines
	});
	const filename = `${invoiceIdentifier}.pdf`;
	const path = `financials/${projectId}/invoices/${document.id}/${filename}`;
	const { error: uploadError } = await admin.storage
		.from('client-documents')
		.upload(path, bytes, { contentType: 'application/pdf', upsert: false });
	if (uploadError) throw uploadError;
	const { data: stored, error: storedError } = await admin
		.from('financial_documents')
		.update({ pdf_storage_path: path })
		.eq('id', document.id)
		.select('*')
		.single();
	if (storedError) throw storedError;
	const paymentUrl =
		origin && Number(document.amount_due) > 0
			? `${origin}/pay/${document.id}?token=${createPaymentLinkToken(document.id)}`
			: '';
	await sendZohoMail({
		from: 'accounting@dogwoodlanddev.com',
		to: recipients.join(','),
		subject: `${invoiceIdentifier} - ${state.project.name}`,
		content: buildInvoiceEmailContent(
			document,
			renderProject,
			lines ?? snapshotLines,
			message,
			paymentUrl
		)
	});
	const sentAt = new Date().toISOString();
	const { data: sent, error: sentError } = await admin
		.from('financial_documents')
		.update({ sent_at: sentAt })
		.eq('id', document.id)
		.select('*')
		.single();
	if (sentError) throw new Error('Email was sent, but the sent timestamp could not be saved.');
	return {
		document: mapFinancialDocument({ ...sent, financial_document_lines: lines }),
		savedContacts
	};
}
