export type AdminRecordType =
	| 'client'
	| 'contact'
	| 'project'
	| 'task'
	| 'estimate'
	| 'invoice'
	| 'expense'
	| 'document'
	| 'event'
	| 'note';

export type AdminRecordStatus =
	| 'new'
	| 'active'
	| 'pending'
	| 'completed'
	| 'canceled'
	| 'draft';

export interface AdminFormBase {
	clientId: string;
	projectId: string;
	title: string;
	description: string;
	date: string;
	status: AdminRecordStatus;
	assignedTo: string;
	notes: string;
	clientVisible: boolean;
	attachments: File[];
}

export interface ClientFormData {
	companyName: string;
	status: AdminRecordStatus;

	primaryContactName: string;
	primaryContactPhone: string;
	primaryContactEmail: string;

	secondaryContactName: string;
	secondaryContactPhone: string;
	secondaryContactEmail: string;

	tertiaryContactName: string;
	tertiaryContactPhone: string;
	tertiaryContactEmail: string;

	address: string;
	city: string;
	state: string;
	zip: string;

	notes: string;
	attachments: File[];
}

export interface ContactFormData extends AdminFormBase {
	firstName: string;
	lastName: string;
	company: string;
	email: string;
	phone: string;
	jobTitle: string;
}

export interface ProjectFormData extends AdminFormBase {
	projectNumber: string;
	projectType: string;
	address: string;
	city: string;
	state: string;
	zip: string;
	startDate: string;
	targetCompletionDate: string;
	budget: string;
}

export interface TaskFormData extends AdminFormBase {
	dueDate: string;
	priority: 'low' | 'normal' | 'high' | 'urgent';
}

export interface LineItem {
	id: string;
	description: string;
	quantity: number;
	rate: string;
}

export interface EstimateFormData extends AdminFormBase {
	estimateNumber: string;
	validThrough: string;
	lineItems: LineItem[];
	discount: string;
	taxRate: number;
}

export interface InvoiceFormData extends AdminFormBase {
	invoiceNumber: string;
	dueDate: string;
	lineItems: LineItem[];
	discount: string;
	taxRate: number;
	paymentStatus: 'unpaid' | 'partial' | 'paid' | 'overdue';
}

export interface ExpenseFormData extends AdminFormBase {
	vendorId: string;
	amount: string;
	category: string;
	paymentMethod: string;
	expenseDate: string;
	receiptFile: File | null;
}

export interface DocumentFormData extends AdminFormBase {
	documentType: string;
	file: File | null;
}

export interface EventFormData extends AdminFormBase {
	startDate: string;
	startTime: string;
	endDate: string;
	endTime: string;
	location: string;
	eventType: string;
}

export interface NoteFormData extends AdminFormBase {
	noteType: string;
}
