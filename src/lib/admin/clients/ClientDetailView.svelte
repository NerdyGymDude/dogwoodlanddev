<script lang="ts">
	import { adminStore as store } from '$lib/admin/store.svelte';
	import DestructiveConfirmModal from '$lib/admin/modals/DestructiveConfirmModal.svelte';
	import type { Client, Contact } from '$lib/admin/types';
	let { client, ongoback, onopenproject, onemail, onedit, onremove, oncreateproject }: { client: Client; ongoback: () => void; onopenproject: (id: string) => void; onemail: (contactId?: string) => void; onedit: () => void; onremove: () => void; oncreateproject: () => void } = $props();
	let contactOpen = $state(false), editingId = $state(''), contactName = $state(''), contactEmail = $state(''), contactPhone = $state(''), contactType = $state<'primary' | 'secondary' | 'tertiary'>('primary'), contactSaving = $state(false), contactError = $state('');
	let removingContact = $state<Contact | null>(null), contactRemoving = $state(false), removeError = $state('');
	let invoiceEmails = $state<string[]>([]);
	let orderedContacts = $derived([...client.contacts].sort((a, b) => Number(Boolean(b.primary)) - Number(Boolean(a.primary))));
	$effect(() => { const id = client.id; fetch('/admin/api/client-invoice-emails').then((r) => r.ok ? r.json() : { emails: [] }).then((r) => invoiceEmails = (r.emails ?? []).filter((x: { client_id: string }) => x.client_id === id).map((x: { email: string }) => x.email)); });
	const roleFor = (type: string) => `${type[0].toUpperCase()}${type.slice(1)} Contact`;
	const typeFor = (contact: Contact) => contact.role.toLowerCase().startsWith('secondary') ? 'secondary' : contact.role.toLowerCase().startsWith('tertiary') ? 'tertiary' : 'primary';
	function closeContact() { contactOpen = false; contactError = ''; }
	function addContact() { editingId = ''; contactName = ''; contactEmail = ''; contactPhone = ''; contactType = client.contacts.length === 0 ? 'primary' : 'secondary'; contactError = ''; contactOpen = true; }
	function editContact(contact: Contact) { editingId = contact.id; contactName = contact.name; contactEmail = contact.email; contactPhone = contact.phone; contactType = typeFor(contact); contactError = ''; contactOpen = true; }
	async function saveContact() {
		contactSaving = true; contactError = '';
		try {
			const editing = Boolean(editingId);
			const response = await fetch('/admin/api/client-contacts', { method: editing ? 'PATCH' : 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ clientId: client.id, contactId: editingId, name: contactName, email: contactEmail, phone: contactPhone, contactType }) });
			const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Unable to save contact.');
			const updated: Contact = { id: result.contact.id, name: result.contact.name ?? '', email: result.contact.email ?? '', phone: result.contact.phone ?? '', role: roleFor(result.contact.contact_type), preferred: 'Email', primary: result.contact.contact_type === 'primary' };
			client.contacts = editing ? client.contacts.map((c) => c.id === updated.id ? updated : c) : [...client.contacts, updated];
			const primary = client.contacts.find((contact) => contact.primary);
			client.email = primary?.email ?? ''; client.phone = primary?.phone ?? '';
			closeContact(); store.notify(editing ? 'Contact updated' : 'Contact added');
		} catch (error) { contactError = error instanceof Error ? error.message : 'Unable to save contact.'; } finally { contactSaving = false; }
	}
	function openRemoveContact(contact: Contact) { removingContact = contact; removeError = ''; }
	async function confirmRemoveContact() {
		if (!removingContact) return; contactRemoving = true; removeError = '';
		try {
			const response = await fetch(`/admin/api/client-contacts?clientId=${encodeURIComponent(client.id)}&id=${encodeURIComponent(removingContact.id)}`, { method: 'DELETE' }); const result = await response.json().catch(() => ({})); if (!response.ok) throw new Error(result.error || 'Unable to remove contact.');
			const removed = removingContact; client.contacts = client.contacts.filter((c) => c.id !== removed.id); const primary = client.contacts.find((contact) => contact.primary); client.email = primary?.email ?? ''; client.phone = primary?.phone ?? ''; removingContact = null; store.notify(`${removed.name || 'Contact'} removed`);
		} catch (error) { removeError = error instanceof Error ? error.message : 'Unable to remove contact.'; } finally { contactRemoving = false; }
	}
</script>

<button class="back" onclick={ongoback}>← All clients</button>
<div class="record-hero"><div class="monogram large">{client.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}</div><div><span class="status">{client.type}</span><h1>{client.name}</h1><p>{client.address}</p></div><div class="hero-actions"><button onclick={() => onemail()}>✉ Email</button><button class="primary" onclick={onedit}>Edit client</button><button onclick={onremove}>Remove</button></div></div>
<div class="record-grid">
	<section class="panel span2"><div class="panel-head"><h2>Projects</h2><button onclick={oncreateproject}>＋ Create project</button></div>{#each store.projects.filter((p) => p.clientId === client.id) as project}<button class="project-row" onclick={() => onopenproject(project.id)}><div><h3>{project.name}</h3><p>{project.phase} · {project.address}</p></div><div><strong>{project.nextMilestone}</strong><span>Next milestone</span></div><b>→</b></button>{/each}</section>
	<section class="panel"><div class="panel-head"><h2>Contacts</h2><button onclick={addContact}>＋ Add</button></div>
		{#each orderedContacts as contact}<div class="contact managed"><div class="avatar">{contact.name.split(' ').filter(Boolean).map((p) => p[0]).join('')}</div><div class="copy"><strong>{contact.name || 'Unnamed contact'} {#if contact.primary}<span class="primary-tag">Primary</span>{/if}</strong><span>{contact.role}</span>{#if contact.email}<span class="wrap">{contact.email}</span>{/if}{#if contact.phone}<span>{contact.phone} · Prefers {contact.preferred}</span>{/if}</div><div class="actions"><button onclick={() => editContact(contact)}>Edit</button><button class="danger" onclick={() => openRemoveContact(contact)}>Remove</button></div></div>{/each}
		{#each invoiceEmails.filter((email) => !client.contacts.some((c) => c.email.toLowerCase() === email.toLowerCase())) as email}<div class="contact"><div class="avatar">$</div><div><strong>Invoice recipient</strong><span>Billing contact</span><span class="wrap">{email}</span><span>Saved from invoice</span></div></div>{/each}
	</section>
	<section class="panel"><h2>Client details</h2><div class="details">{#each orderedContacts as contact}<article><header><strong>{contact.name || 'Unnamed contact'}</strong><span>{contact.primary ? 'Primary Contact' : contact.role}</span></header>{#if contact.email}<div><span>Email</span><button class="email" onclick={() => onemail(contact.id)}>{contact.email}</button></div>{/if}{#if contact.phone}<div><span>Phone</span><strong>{contact.phone}</strong></div>{/if}{#if contact.email}<div><span>Preferred contact</span><strong>{contact.preferred}</strong></div>{/if}</article>{/each}{#if !client.contacts.length}<p>No contacts have been added.</p>{/if}</div>{#if client.notes}<div class="notes"><span>Notes</span><p>{client.notes}</p></div>{/if}</section>
</div>

{#if contactOpen}<div class="backdrop" role="presentation" onclick={(e) => e.currentTarget === e.target && closeContact()}><form class="dialog" onsubmit={(e) => { e.preventDefault(); void saveContact(); }}><h2>{editingId ? 'Edit Contact' : 'Add Contact'}</h2><label>Name<input bind:value={contactName} /></label><label>Email<input type="email" bind:value={contactEmail} /></label><label>Phone<input type="tel" bind:value={contactPhone} /></label><label>Contact type<select bind:value={contactType}>{#if contactType === 'tertiary'}<option value="tertiary" disabled>Legacy Tertiary Contact</option>{/if}<option value="primary" disabled={client.contacts.some((contact) => contact.primary && contact.id !== editingId)}>Primary Contact</option><option value="secondary" disabled={client.contacts.length === 0}>Secondary Contact</option></select></label>{#if contactError}<p class="error">{contactError}</p>{/if}<footer><button type="button" onclick={closeContact}>Cancel</button><button class="primary" disabled={contactSaving || contactType === 'tertiary'}>{contactSaving ? 'Saving…' : editingId ? 'Save Contact' : 'Add Contact'}</button></footer></form></div>{/if}
<DestructiveConfirmModal open={Boolean(removingContact)} title="Remove Contact" recordName={removingContact?.name || 'Unnamed contact'} description={`This will permanently remove this contact from ${client.name}.`} actionLabel="Remove contact" onclose={() => { removingContact = null; removeError = ''; }} onconfirm={confirmRemoveContact} />
{#if removeError}<p class="error remove-error">{removeError}</p>{/if}

<style>
	.backdrop{position:fixed;inset:0;z-index:1300;display:grid;place-items:center;padding:18px;background:#141f1785;overflow-y:auto}.dialog{box-sizing:border-box;display:grid;gap:14px;width:min(460px,100%);max-height:calc(100dvh - 36px);overflow-y:auto;border-radius:14px;background:#fff;padding:22px}.dialog h2,.dialog p{margin:0}.dialog h2{color:#26384d}.dialog label{display:grid;gap:6px;color:#46564c;font-size:12px;font-weight:700}.dialog input,.dialog select{width:100%;border:1px solid #d4dbd4;border-radius:7px;background:#fff;padding:10px}.dialog footer{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap}.dialog button,.actions button{border:1px solid #cbd5cd;border-radius:7px;background:#fff;padding:9px 14px;color:#203552;font-weight:700;cursor:pointer}.dialog button.primary{border-color:#203552;background:#203552;color:#fff}.dialog button:disabled{cursor:not-allowed;opacity:.5}.error{color:#9b3028;font-size:12px}.remove-error{position:fixed;z-index:1401;right:20px;bottom:20px;background:#fff;padding:10px;border-radius:7px}.managed{display:grid;grid-template-columns:37px minmax(0,1fr) auto;align-items:start}.copy{min-width:0}.actions{display:flex;gap:5px}.actions button{padding:5px 7px;font-size:9px}.wrap,.email{overflow-wrap:anywhere;word-break:break-word}.details{display:grid;gap:12px;margin-top:12px}.details article{border-top:1px solid #edf0ed;padding-top:12px}.details header{display:flex;justify-content:space-between;gap:12px;margin-bottom:9px}.details header span{color:#70806e;font-size:10px;font-weight:700}.details article>div{display:grid;grid-template-columns:105px minmax(0,1fr);gap:10px;margin-top:6px;font-size:11px}.details article>div>span,.notes>span{color:#8b9490}.email{border:0;background:transparent;padding:0;color:#57734f;font-weight:700;text-align:left;cursor:pointer}.notes{border-top:1px solid #edf0ed;margin-top:16px;padding-top:12px;font-size:11px}.notes p{margin:6px 0 0}@media(max-width:620px){.managed{grid-template-columns:37px minmax(0,1fr)}.actions{grid-column:2;margin-top:7px}.details header{flex-direction:column;gap:3px}.details article>div{grid-template-columns:1fr;gap:2px}.dialog footer button{flex:1 1 auto}}
</style>
