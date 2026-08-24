import type {
	ActionItem,
	Client,
	Project,
	Task,
	MailThread,
	DocumentItem,
	CalendarEvent,
	Vendor,
	Estimate,
	Invoice,
	Expense,
	AppUser,
	ActionState,
	ProjectStatus
} from './types';

class AdminStore {
	actions = $state<ActionItem[]>([]);
	clients = $state<Client[]>([]);
	projects = $state<Project[]>([]);
	tasks = $state<Task[]>([]);
	mail = $state<MailThread[]>([]);
	documents = $state<DocumentItem[]>([]);
	events = $state<CalendarEvent[]>([]);
	vendors = $state<Vendor[]>([]);
	estimates = $state<Estimate[]>([]);
	invoices = $state<Invoice[]>([]);
	expenses = $state<Expense[]>([]);
	users = $state<AppUser[]>([]);
	toast = $state('');
	notify(message: string) {
		this.toast = message;
		window.setTimeout(() => (this.toast = ''), 2800);
	}
	setAction(id: string, state: ActionState) {
		const item = this.actions.find((a) => a.id === id);
		if (item) {
			item.state = state;
			this.notify(`Action moved to ${state}`);
		}
	}
	toggleDocument(id: string) {
		const d = this.documents.find((x) => x.id === id);
		if (d) {
			d.shared = !d.shared;
			this.notify(d.shared ? 'Document shared with client' : 'Document made private');
		}
	}
	toggleEvent(id: string) {
		const e = this.events.find((x) => x.id === id);
		if (e) {
			e.shared = !e.shared;
			this.notify(e.shared ? 'Event shared with client' : 'Event made private');
		}
	}
	updateProject(id: string, status: ProjectStatus, phase: string) {
		const p = this.projects.find((x) => x.id === id);
		if (p) {
			p.status = status;
			p.phase = phase;
			this.notify('Project updated');
		}
	}
	addTask(title: string, projectId?: string) {
		this.tasks.unshift({
			id: `t${Date.now()}`,
			title,
			projectId,
			due: 'Aug 28',
			priority: 'Medium',
			status: 'Open',
			assignee: 'Branch Williams'
		});
		this.notify('Task created');
	}
	addClient(client: Omit<Client, 'id' | 'projectIds' | 'contacts'>) {
		this.clients.unshift({ ...client, id: `c${Date.now()}`, projectIds: [], contacts: [] });
		this.notify('Client added');
	}
	addPersistedClient(client: Client) {
		const existing = this.clients.findIndex((x) => x.id === client.id);
		if (existing >= 0) this.clients[existing] = client;
		else this.clients.unshift(client);
	}
	loadPersistedClients(clients: Client[]) {
		for (const client of [...clients].reverse()) this.addPersistedClient(client);
	}
	addPersistedProject(project: any) {
		const existing = this.projects.findIndex((x) => x.id === project.id);
		if (existing >= 0) this.projects[existing] = project;
		else this.projects.unshift(project);
	}
	loadPersistedProjects(projects: any[]) {
		for (const project of [...projects].reverse()) this.addPersistedProject(project);
	}
	addPersistedTask(task: any) {
		const existing = this.tasks.findIndex((x) => x.id === task.id);
		if (existing >= 0) this.tasks[existing] = task;
		else this.tasks.unshift(task);
	}
	loadPersistedTasks(tasks: any[]) {
		for (const task of [...tasks].reverse()) this.addPersistedTask(task);
	}
	addPersistedEvent(event: any) {
		const existing = this.events.findIndex((x) => x.id === event.id);
		if (existing >= 0) this.events[existing] = event;
		else this.events.unshift(event);
	}
	loadPersistedEvents(events: any[]) {
		for (const event of [...events].reverse()) this.addPersistedEvent(event);
	}
	markMailRead(id: string) {
		const m = this.mail.find((x) => x.id === id);
		if (m) m.unread = false;
	}
}
export const adminStore = new AdminStore();
