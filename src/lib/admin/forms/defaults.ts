import type {
	AdminFormBase,
	ClientFormData,
	ContactFormData,
	DocumentFormData,
	EstimateFormData,
	EventFormData,
	ExpenseFormData,
	InvoiceFormData,
	NoteFormData,
	ProjectFormData,
	TaskFormData
} from './types';

function today() {
	const date = new Date();
	const offset = date.getTimezoneOffset() * 60_000;
	return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function createBaseForm(): AdminFormBase {
	return {
		clientId: '',
		projectId: '',
		title: '',
		description: '',
		date: today(),
		status: 'new',
		assignedTo: '',
		notes: '',
		clientVisible: false,
		attachments: []
	};
}

export function createClientForm(): ClientFormData {
	return {
		companyName: '',
		shortName: '',
		status: 'new',

		primaryContactName: '',
		primaryContactPhone: '',
		primaryContactEmail: '',

		secondaryContactName: '',
		secondaryContactPhone: '',
		secondaryContactEmail: '',

		tertiaryContactName: '',
		tertiaryContactPhone: '',
		tertiaryContactEmail: '',

		address: '',
		city: '',
		state: 'NC',
		zip: '',

		notes: '',
		attachments: []
	};
}

export function createContactForm(): ContactFormData {
	return {
		...createBaseForm(),
		firstName: '',
		lastName: '',
		company: '',
		email: '',
		phone: '',
		jobTitle: ''
	};
}

export function createProjectForm(): ProjectFormData {
	return {
		...createBaseForm(),
		projectNumber: '',
		projectType: '',
		address: '',
		city: '',
		state: 'NC',
		zip: '',
		startDate: today(),
		targetCompletionDate: '',
		budget: ''
	};
}

export function createTaskForm(): TaskFormData {
	return {
		...createBaseForm(),
		dueDate: '',
		priority: 'normal'
	};
}

export function createEstimateForm(): EstimateFormData {
	return {
		...createBaseForm(),
		status: 'draft',
		estimateNumber: '',
		validThrough: '',
		lineItems: [],
		discount: '',
		taxRate: 0
	};
}

export function createInvoiceForm(): InvoiceFormData {
	return {
		clientId: '',
		projectId: '',
		subject: '',
		date: today(),
		status: 'Billed - Not Paid',
		dueDate: '',
		amount: '',
		recipientContactIds: [],
		attachments: []
	};
}

export function createExpenseForm(): ExpenseFormData {
	return {
		...createBaseForm(),
		vendorId: '',
		amount: '',
		category: '',
		paymentMethod: '',
		expenseDate: today(),
		receiptFile: null
	};
}

export function createDocumentForm(): DocumentFormData {
	return {
		...createBaseForm(),
		documentType: '',
		file: null
	};
}

export function createEventForm(): EventFormData {
	return {
		...createBaseForm(),
		startDate: today(),
		startTime: '',
		endDate: today(),
		endTime: '',
		location: '',
		eventType: ''
	};
}

export function createNoteForm(): NoteFormData {
	return {
		...createBaseForm(),
		noteType: ''
	};
}
