<script lang="ts">
    import { adminStore as store } from '$lib/admin/store.svelte';
    import type { ActionState, Invoice, Project } from '$lib/admin/types';

    let {
        project,
        ongoback,
        onopenclient,
        onaddtask,
        oncreateinvoice,
        onviewinvoice,
        onedit,
        money
    }: {
        project: Project;
        ongoback: () => void;
        onopenclient: (id: string) => void;
        onaddtask: () => void;
        oncreateinvoice: () => void;
        onviewinvoice: (invoice: Invoice) => void;
        onedit: () => void;
        money: (value: number) => string;
    } = $props();

    const projectInvoices = $derived(
        store.invoices.filter((invoice) => invoice.projectId === project.id)
    );

    const latestInvoice = $derived(projectInvoices[0]);

    const totalInvoiced = $derived(
        projectInvoices.reduce((total, invoice) => total + invoice.amount, 0)
    );

    const invoiceBadge = $derived.by(() => {
        if (!latestInvoice) return '';

        if (
            latestInvoice.status === 'Billed - Paid' ||
            latestInvoice.amountPaid >= latestInvoice.amount
        ) {
            return 'Paid';
        }

        if (
            latestInvoice.status === 'Billed - Partial Payment' ||
            latestInvoice.amountPaid > 0
        ) {
            return 'Partial Payment';
        }

        return 'Invoice Sent';
    });
</script>

<button class="back" onclick={ongoback}>← All projects</button>

<div class="project-hero">
    <div>
        <div class="tags">
            <span class="status {project.status.toLowerCase()}">{project.status}</span>
            <span>{project.phase}</span>
            {#if invoiceBadge}
                <span class="invoice-status">{invoiceBadge}</span>
            {/if}
        </div>

        <h1>{project.name}</h1>

        <button class="link" onclick={() => onopenclient(project.clientId)}>
            {store.clients.find((client) => client.id === project.clientId)?.name}
        </button>

        <p>{project.address}</p>
    </div>

    <div class="hero-actions">
        <button onclick={onaddtask}>＋ Task</button>

        {#if latestInvoice}
            <button onclick={() => onviewinvoice(latestInvoice)}>View Invoice</button>
        {:else}
            <button onclick={oncreateinvoice}>Create invoice</button>
        {/if}

        <button class="primary" onclick={onedit}>Edit project</button>
    </div>
</div>

<div class="project-status">
    <div>
        <span>WAITING ON</span>
        <strong>{project.waitingOn || 'Nothing — work may proceed'}</strong>
    </div>
    <div>
        <span>NEXT MILESTONE</span>
        <strong>{project.nextMilestone}</strong>
    </div>
    <div>
        <span>LAST ACTIVITY</span>
        <strong>{project.lastActivity}</strong>
    </div>
</div>

<div class="tabs">
    <button class="active">Overview</button>
    <button>Actions</button>
    <button>Timeline</button>
    <button>Parcels</button>
    <button>Permits</button>
    <button>Team</button>
    <button>Documents</button>
    <button>Financials</button>
</div>

<div class="record-grid">
    <section class="panel span2">
        <div class="panel-head">
            <h2>Open actions</h2>
            <button onclick={onaddtask}>＋ Add action</button>
        </div>

        {#each store.actions.filter(
            (action) => action.projectId === project.id && action.state !== 'Done'
        ) as action}
            <div class="mini-action">
                <span class:urgent={action.priority === 'High'}></span>

                <div>
                    <strong>{action.title}</strong>
                    <p>{action.due} · {action.state}</p>
                </div>

                <select
                    value={action.state}
                    onchange={(event) =>
                        store.setAction(action.id, event.currentTarget.value as ActionState)}
                >
                    <option>New</option>
                    <option>Needs Action</option>
                    <option>Waiting</option>
                    <option>Done</option>
                </select>
            </div>
        {/each}
    </section>

    <section class="panel">
        <h2>Project summary</h2>
        <p>{project.summary}</p>

        <div class="detail-list">
            <div><span>Project value</span><strong>{money(project.budget)}</strong></div>
            <div><span>Invoiced</span><strong>{money(totalInvoiced)}</strong></div>
            <div><span>Costs to date</span><strong>{money(project.costs)}</strong></div>
        </div>

        {#if latestInvoice}
            <div class="invoice-summary">
                <div>
                    <span>Latest invoice</span>
                    <strong>{latestInvoice.subject}</strong>
                </div>
                <button onclick={() => onviewinvoice(latestInvoice)}>View Invoice</button>
            </div>
        {/if}
    </section>
</div>

<style>
    .invoice-status {
        background: #e8edf4;
        color: #203552;
    }

    .invoice-summary {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-top: 18px;
        padding-top: 14px;
        border-top: 1px solid #e4e7e4;
    }

    .invoice-summary div {
        display: grid;
        gap: 4px;
    }

    .invoice-summary span {
        color: #7a858d;
        font-size: 10px;
        text-transform: uppercase;
    }

    .invoice-summary strong {
        color: #25344b;
        font-size: 13px;
    }

    .invoice-summary button {
        border: 1px solid #cfd6d1;
        border-radius: 6px;
        background: white;
        padding: 7px 10px;
        color: #203552;
        font: inherit;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
    }
</style>
