export type Role = 'Super User' | 'Admin' | 'Accounting' | 'User' | 'Client';
export type ActionState = 'New' | 'Needs Action' | 'Waiting' | 'Done';
export type ProjectStatus = 'Active' | 'Pending' | 'Completed' | 'Cancelled';

export interface Contact { id: string; name: string; role: string; email: string; phone: string; preferred: string; primary?: boolean }
export interface Client { id: string; name: string; type: 'Person' | 'Company' | 'Inquiry'; email: string; phone: string; address: string; notes: string; contacts: Contact[]; projectIds: string[] }
export interface Project { id: string; projectNumber: string; name: string; clientId: string; address: string; status: ProjectStatus; phase: string; summary: string; waitingOn?: string; nextMilestone: string; lastActivity: string; budget: number; invoiced: number; costs: number; createdDate: string }
export interface ActionItem { id: string; title: string; detail: string; state: ActionState; priority: 'High' | 'Medium' | 'Low'; due: string; age: string; projectId?: string; clientId?: string; source: string }
export interface Task { id: string; title: string; projectId?: string; clientId?: string; due: string; priority: string; status: string; assignee: string }
export interface MailThread { id: string; mailbox: string; sender: string; email: string; subject: string; preview: string; time: string; unread: boolean; projectId?: string; clientId?: string; messages: { from: string; body: string; time: string }[] }
export interface DocumentItem { id: string; name: string; category: string; projectId?: string; clientId?: string; size: string; updated: string; shared: boolean }
export interface CalendarEvent { id: string; title: string; date: string; time: string; type: string; projectId?: string; clientId?: string; shared: boolean }
export interface Vendor { id: string; name: string; category: string; contact: string; email: string; phone: string; spend: number; projectIds: string[] }

export interface Invoice {
    id: string;
    clientId: string;
    projectId?: string;
    subject: string;
    date: string;
    dueDate: string;
    amount: number;
    status: string;
    amountPaid: number;
    recipientContactIds: string[];
}

export interface Estimate { id: string; clientId: string; title: string; amount: number; status: string; date: string }
export interface Expense { id: string; vendorId: string; projectId?: string; description: string; amount: number; date: string; category: string }
export interface AppUser { id: string; name: string; email: string; role: Role; status: string; overrides: Record<string, boolean> }
