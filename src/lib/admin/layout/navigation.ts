export type AdminNavItem = {
	id: string;
	label: string;
	icon: string;
};

export const adminNavigation: AdminNavItem[] = [
	{ id: 'home', label: 'Action Center', icon: '⌂' },
	{ id: 'clients', label: 'Clients', icon: '♙' },
	{ id: 'projects', label: 'Projects', icon: '◇' },
	{ id: 'inbox', label: 'Inbox', icon: '✉' },
	{ id: 'calendar', label: 'Calendar', icon: '□' },
	{ id: 'accounting', label: 'Accounting', icon: '$' },
	{ id: 'reports', label: 'Reports', icon: '⌁' },
	{ id: 'settings', label: 'Settings', icon: '⚙' }
];

const navigationById = new Map(adminNavigation.map((item) => [item.id, item]));

export const mobilePrimaryNavigation: AdminNavItem[] = [
	{ ...navigationById.get('home')!, label: 'Home' },
	navigationById.get('inbox')!,
	navigationById.get('calendar')!,
	navigationById.get('projects')!
];

export const mobileMoreNavigation: AdminNavItem[] = [
	navigationById.get('clients')!,
	navigationById.get('accounting')!,
	navigationById.get('reports')!,
	navigationById.get('settings')!
];
