import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from 'pdf-lib';
import type { SupabaseClient } from '@supabase/supabase-js';
import { calculateFinancialTotals, loadProjectFinancialState, mapFinancialDocument } from './accounting';
import { sendZohoMail } from '$lib/server/integrations/zoho-mail';

const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
const escapeHtml = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function buildInvoiceEmailContent(document: { total_project_invoice: unknown; amount_paid_to_date: unknown; amount_due: unknown }, note = '') {
	const optionalNote = note.trim() && note.trim() !== 'Please find the attached invoice.' ? `<p>${escapeHtml(note.trim()).replace(/\n/g, '<br>')}</p>` : '';
	return `<p>Please find your Dogwood Land Development invoice attached.</p>${optionalNote}<p>Total Project Invoice: ${money(Number(document.total_project_invoice))}<br>Amount Paid to Date: ${money(Number(document.amount_paid_to_date))}<br>Amount Due: ${money(Number(document.amount_due))}</p><p>To pay your invoice online, please visit:<br><a href="https://stripe.com">https://stripe.com</a></p><p>If you would like to pay by paper check, please contact accounting@dogwoodlanddev.com to make arrangements.</p><p>Thank you,<br>Dogwood Land Development</p>`;
}

function drawRightAligned(page: PDFPage, value: string, right: number, y: number, size: number, font: PDFFont, color = rgb(0.121569, 0.160784, 0.215686)) {
	page.drawText(value, { x: right - font.widthOfTextAtSize(value, size), y, size, font, color });
}

export async function renderInvoicePdf(input: { project: any; document: any; lines: any[]; documentKind?: 'invoice' | 'receipt'; paymentReceived?: number }) {
	const template = await readFile(join(process.cwd(), 'static', 'pdfs', 'dogwood-sample-invoice.pdf'));
	const pdf = await PDFDocument.load(template);
	const font = await pdf.embedFont(StandardFonts.Helvetica);
	const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
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
	const invoiceDate = new Date(input.document.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

	for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
		const page = pdf.getPage(pageIndex);
		const pageLines = input.lines.slice(pageIndex * rowsPerPage, (pageIndex + 1) * rowsPerPage);
		const isReceipt = input.documentKind === 'receipt';
		if (isReceipt) {
			page.drawRectangle({ x: 438, y: 700, width: 126, height: 48, color: white });
			page.drawText('RECEIPT', { x: 445, y: 724, size: 28, font: bold, color: rgb(0.043137, 0.180392, 0.403922) });
		}

		// Target only sample-value areas. Static headings, boxes, logo, payment instructions and footer remain untouched.
		page.drawRectangle({ x: 410, y: 648, width: 154, height: 38, color: white });
		page.drawText(isReceipt ? 'Receipt Date' : 'Invoice Date', { x: 480, y: 672, size: 10.5, font: bold, color: ink });
		page.drawText(invoiceDate, { x: 480, y: 656, size: 10.5, font, color: ink });
		if (isReceipt && pageIndex === 0) drawRightAligned(page, `Payment Received: ${money(Number(input.paymentReceived ?? 0))}`, 564, 638, 9, bold);

		page.drawRectangle({ x: 60, y: 526, width: 226, height: 55, color: beige });
		const billTo = [input.project.bill_to_contact, input.project.client_name, input.project.client_address, input.project.client_city_line].filter(Boolean);
		billTo.slice(0, 4).forEach((value, index) => page.drawText(String(value).slice(0, 42), { x: 62, y: 573 - index * 14, size: 10, font, color: ink }));

		page.drawRectangle({ x: 302, y: 526, width: 258, height: 55, color: beige });
		const projectDetails = [input.project.name, input.project.description, input.project.address_line].filter(Boolean);
		projectDetails.slice(0, 3).forEach((value, index) => page.drawText(String(value).slice(0, 43), { x: 304.52, y: 573 - index * 14, size: 10, font, color: ink }));

		page.drawRectangle({ x: 48, y: 304, width: 516, height: 168, color: white });
		let rowTop = 472;
		for (const line of pageLines) {
			const rowBottom = rowTop - 52;
			page.drawRectangle({ x: 48, y: rowBottom, width: 516, height: 52, borderColor: rule, borderWidth: 0.55, color: white });
			page.drawLine({ start: { x: 378.24, y: rowBottom }, end: { x: 378.24, y: rowTop }, thickness: 0.55, color: rule });
			page.drawLine({ start: { x: 471.12, y: rowBottom }, end: { x: 471.12, y: rowTop }, thickness: 0.55, color: rule });
			const description = String(line.description);
			const splitAt = description.length > 55 ? description.lastIndexOf(' ', 55) : -1;
			const descriptionLines = splitAt > 0 ? [description.slice(0, splitAt), description.slice(splitAt + 1, splitAt + 56)] : [description.slice(0, 55)];
			descriptionLines.forEach((value, index) => page.drawText(value, { x: 55, y: rowBottom + 31 - index * 14, size: index ? 8 : 8.5, font, color: ink }));
			drawRightAligned(page, money(Number(line.task_total)), 460, rowBottom + 21, 9, font);
			drawRightAligned(page, money(Number(line.billed_amount)), 553, rowBottom + 21, 9, font);
			rowTop = rowBottom;
		}

		const isLastPage = pageIndex === pageCount - 1;
		const summaryValues = isLastPage
			? [money(Number(input.document.total_project_invoice)), money(Number(input.document.amount_paid_to_date)), money(Number(input.document.amount_due))]
			: ['', '', ''];
		page.drawRectangle({ x: 480, y: 275, width: 78, height: 16, color: summaryFill });
		page.drawRectangle({ x: 480, y: 243, width: 78, height: 16, color: summaryFill });
		page.drawRectangle({ x: 480, y: 211, width: 78, height: 16, color: dueFill });
		if (summaryValues[0]) drawRightAligned(page, summaryValues[0], 553, 278, 10.5, font);
		if (summaryValues[1]) drawRightAligned(page, summaryValues[1], 553, 246, 10.5, font);
		if (summaryValues[2]) drawRightAligned(page, summaryValues[2], 553, 214, 12, bold, white);
	}
	return pdf.save();
}

export function calculateReceiptAmountDue(originalInvoiceAmountDue: number, paymentAmount: number) {
	return Math.max(Math.round((originalInvoiceAmountDue - paymentAmount) * 100) / 100, 0);
}

export function buildReceiptEmailContent(paymentReceived: number, amountDue: number) {
	return `<p>Thank you. We have received your payment.</p><p>Payment Received: ${money(paymentReceived)}<br>Amount Due: ${money(amountDue)}</p><p>Your Dogwood Land Development receipt is attached.</p><p>Thank you,<br>Dogwood Land Development</p>`;
}

export async function createAndSendReceipt(admin: SupabaseClient, userId: string, payment: { id: string; project_id: string; amount: number | string }) {
	const { data: existingReceipt, error: existingError } = await admin.from('financial_documents').select('*, financial_document_lines(*)').eq('document_type', 'receipt').eq('source_payment_id', payment.id).maybeSingle();
	if (existingError) throw existingError;
	if (existingReceipt?.sent_at) return mapFinancialDocument(existingReceipt);

	const { data: invoice, error: invoiceError } = await admin.from('financial_documents').select('*').eq('document_type', 'invoice').eq('project_id', payment.project_id).not('sent_at', 'is', null).order('sent_at', { ascending: false }).limit(1).maybeSingle();
	if (invoiceError) throw invoiceError;
	if (!invoice) throw new Error('A sent invoice is required before a receipt can be generated for this payment.');

	const state = await loadProjectFinancialState(admin, payment.project_id);
	const paymentAmount = Number(payment.amount);
	const receiptAmountDue = calculateReceiptAmountDue(Number(invoice.amount_due), paymentAmount);
	let receipt = existingReceipt;
	if (!receipt) {
		const { data, error } = await admin.from('financial_documents').insert({ project_id: payment.project_id, document_type: 'receipt', source_payment_id: payment.id, total_project_invoice: Number(invoice.total_project_invoice), amount_paid_to_date: state.totals.amountPaidToDate, amount_due: receiptAmountDue, recipient_contact_ids: invoice.recipient_contact_ids ?? [], created_by: userId }).select('*').single();
		if (error?.code === '23505') {
			const { data: racedReceipt, error: racedError } = await admin.from('financial_documents').select('*, financial_document_lines(*)').eq('document_type', 'receipt').eq('source_payment_id', payment.id).single();
			if (racedError) throw racedError;
			if (racedReceipt.sent_at) return mapFinancialDocument(racedReceipt);
			receipt = racedReceipt;
		} else if (error) throw error;
		else receipt = data;
	}

	let lines = receipt.financial_document_lines ?? [];
	if (!lines.length) {
		const snapshotLines = state.tasks.map((task: any, index: number) => ({ financial_document_id: receipt.id, project_billing_task_id: task.id, description: task.description, task_total: task.task_total, billed_amount: task.billed_amount, display_order: index }));
		const { data, error } = await admin.from('financial_document_lines').insert(snapshotLines).select('*');
		if (error) throw error;
		lines = data ?? [];
	}

	const recipientIds = Array.isArray(receipt.recipient_contact_ids) ? receipt.recipient_contact_ids : [];
	if (!recipientIds.length) throw new Error('The related sent invoice has no approved receipt recipients.');
	const [{ data: contacts, error: contactError }, { data: projectDetails, error: projectError }, { data: clientDetails, error: clientError }] = await Promise.all([
		admin.from('client_contacts').select('id, name, email').eq('client_id', state.project.client_id).in('id', recipientIds),
		admin.from('projects').select('name, description, address, city, state, zip').eq('id', payment.project_id).single(),
		admin.from('clients').select('name, address, city, state, zip').eq('id', state.project.client_id).single()
	]);
	if (contactError) throw contactError;
	if (projectError) throw projectError;
	if (clientError) throw clientError;
	const recipients = (contacts ?? []).map((contact) => String(contact.email ?? '').trim()).filter(Boolean);
	if (recipients.length !== recipientIds.length) throw new Error('Every receipt recipient must be an approved project contact with an email address.');
	const cityLine = (record: any) => [record?.city, record?.state, record?.zip].filter(Boolean).join(' ');
	const renderProject = { ...state.project, ...projectDetails, bill_to_contact: contacts?.[0]?.name ?? '', client_name: clientDetails.name ?? '', client_address: clientDetails.address ?? '', client_city_line: cityLine(clientDetails), address_line: [projectDetails.address, cityLine(projectDetails)].filter(Boolean).join(', ') };
	const bytes = await renderInvoicePdf({ project: renderProject, document: receipt, lines, documentKind: 'receipt', paymentReceived: paymentAmount });
	const path = `financials/${payment.project_id}/receipts/${receipt.id}/receipt.pdf`;
	const { error: uploadError } = await admin.storage.from('client-documents').upload(path, bytes, { contentType: 'application/pdf', upsert: true });
	if (uploadError) throw uploadError;
	const { error: pathError } = await admin.from('financial_documents').update({ pdf_storage_path: path }).eq('id', receipt.id);
	if (pathError) throw pathError;
	const attachmentBytes = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
	await sendZohoMail({ from: 'accounting@dogwoodlanddev.com', to: recipients.join(','), subject: `Payment Receipt - ${state.project.project_number ?? state.project.name}`, content: buildReceiptEmailContent(paymentAmount, receiptAmountDue), attachments: [new File([attachmentBytes], 'receipt.pdf', { type: 'application/pdf' })] });
	const sentAt = new Date().toISOString();
	const { data: sent, error: sentError } = await admin.from('financial_documents').update({ sent_at: sentAt }).eq('id', receipt.id).select('*').single();
	if (sentError) throw new Error('Receipt email was sent, but its sent timestamp could not be recorded.');
	return mapFinancialDocument({ ...sent, financial_document_lines: lines });
}

export async function createAndSendInvoice(admin: SupabaseClient, userId: string, projectId: string, recipientContactIds: string[], message: string) {
	const state = await loadProjectFinancialState(admin, projectId);
	if (!state.tasks.length) throw new Error('Add at least one financial task before sending an invoice.');
	const ids = [...new Set(recipientContactIds)].filter(Boolean);
	if (!ids.length) throw new Error('Select at least one invoice recipient.');
	const [{ data: contacts, error: contactError }, { data: projectDetails, error: projectError }, { data: clientDetails, error: clientError }] = await Promise.all([
		admin.from('client_contacts').select('id, name, email').eq('client_id', state.project.client_id).in('id', ids),
		admin.from('projects').select('name, description, address, city, state, zip').eq('id', projectId).single(),
		admin.from('clients').select('name, address, city, state, zip').eq('id', state.project.client_id).single()
	]);
	if (contactError) throw contactError;
	if (projectError) throw projectError;
	if (clientError) throw clientError;
	const recipients = (contacts ?? []).map((contact) => String(contact.email ?? '').trim()).filter(Boolean);
	if (recipients.length !== ids.length) throw new Error('Every selected recipient must be an approved project contact with an email address.');
	const totals = calculateFinancialTotals(state.tasks, state.payments);
	const { data: document, error: documentError } = await admin.from('financial_documents').insert({ project_id: projectId, document_type: 'invoice', total_project_invoice: totals.totalProjectInvoice, amount_paid_to_date: totals.amountPaidToDate, amount_due: totals.amountDue, recipient_contact_ids: ids, created_by: userId }).select('*').single();
	if (documentError) throw documentError;
	const snapshotLines = state.tasks.map((task: any, index: number) => ({ financial_document_id: document.id, project_billing_task_id: task.id, description: task.description, task_total: task.task_total, billed_amount: task.billed_amount, display_order: index }));
	const { data: lines, error: linesError } = await admin.from('financial_document_lines').insert(snapshotLines).select('*');
	if (linesError) throw linesError;
	const cityLine = (record: any) => [record?.city, record?.state, record?.zip].filter(Boolean).join(' ');
	const renderProject = { ...state.project, ...projectDetails, bill_to_contact: contacts?.[0]?.name ?? '', client_name: clientDetails.name ?? '', client_address: clientDetails.address ?? '', client_city_line: cityLine(clientDetails), address_line: [projectDetails.address, cityLine(projectDetails)].filter(Boolean).join(', ') };
	const bytes = await renderInvoicePdf({ project: renderProject, document, lines: lines ?? snapshotLines });
	const path = `financials/${projectId}/invoices/${document.id}/invoice.pdf`;
	const { error: uploadError } = await admin.storage.from('client-documents').upload(path, bytes, { contentType: 'application/pdf', upsert: false });
	if (uploadError) throw uploadError;
	const { data: stored, error: storedError } = await admin.from('financial_documents').update({ pdf_storage_path: path }).eq('id', document.id).select('*').single();
	if (storedError) throw storedError;
	const attachmentBytes = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
	await sendZohoMail({ from: 'accounting@dogwoodlanddev.com', to: recipients.join(','), subject: `Invoice - ${state.project.project_number ?? state.project.name}`, content: buildInvoiceEmailContent(document, message), attachments: [new File([attachmentBytes], 'invoice.pdf', { type: 'application/pdf' })] });
	const sentAt = new Date().toISOString();
	const { data: sent, error: sentError } = await admin.from('financial_documents').update({ sent_at: sentAt }).eq('id', document.id).select('*').single();
	if (sentError) throw new Error('Email was sent, but the sent timestamp could not be saved.');
	return mapFinancialDocument({ ...sent, financial_document_lines: lines });
}
