<script lang="ts">
    import { adminStore as store } from '$lib/admin/store.svelte';
    import type { Invoice } from '$lib/admin/types';

    let {
        oncreateinvoice,
        onviewinvoice
    }: {
        oncreateinvoice: () => void;
        onviewinvoice: (invoice: Invoice) => void;
    } = $props();

    const invoices = $derived(store.invoices);

    function money(value: number) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(value);
    }

    function paymentState(invoice: Invoice) {
        if (invoice.status === 'Billed - Paid' || invoice.amountPaid >= invoice.amount) {
            return { className: 'paid', label: 'Billed — Paid' };
        }

        if (invoice.status === 'Billed - Partial Payment' || invoice.amountPaid > 0) {
            return { className: 'partial', label: 'Billed — Partial Payment' };
        }

        return { className: 'unpaid', label: 'Billed — Not Paid' };
    }
</script>

<header class="accounting-heading">
    <div>
        <p class="eyebrow">ACCOUNTING</p>
        <h1>Invoices</h1>
        <p>Create invoices and track payment status across active projects.</p>
    </div>

    <button class="create-invoice" onclick={oncreateinvoice}>＋ Create Invoice</button>
</header>

<section class="invoice-section" aria-labelledby="invoices-title">
    <div class="section-title">
        <div>
            <h2 id="invoices-title">Invoices</h2>
            <p>All customer invoices created by Dogwood Land Development.</p>
        </div>

        {#if invoices.length}
            <span>{invoices.length} total</span>
        {/if}
    </div>

    {#if invoices.length}
        <div class="invoice-list">
            {#each invoices as invoice (invoice.id)}
                {@const project = store.projects.find((item) => item.id === invoice.projectId)}
                {@const client = store.clients.find((item) => item.id === invoice.clientId)}
                {@const state = paymentState(invoice)}

                <article class="invoice-card {state.className}">
                    <div class="invoice-main">
                        <div>
                            <h3>{invoice.subject || project?.name || 'Invoice'}</h3>
                            <p>
                                {client?.name ?? 'Client unavailable'}
                                {#if project} · {project.name}{/if}
                            </p>
                        </div>

                        <div class="invoice-amount">
                            <strong>{money(invoice.amount)}</strong>
                            {#if invoice.dueDate}
                                <span>Due {invoice.dueDate}</span>
                            {/if}
                        </div>
                    </div>

                    <div class="invoice-actions">
                        <strong class="payment-status">{state.label}</strong>
                        <button onclick={() => onviewinvoice(invoice)}>View Invoice</button>
                    </div>
                </article>
            {/each}
        </div>
    {:else}
        <div class="empty-state">
            <h3>No invoices yet</h3>
            <p>Create an invoice when a customer is ready to be billed.</p>
        </div>
    {/if}
</section>

<style>
    .accounting-heading {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 20px;
        margin-bottom: 28px;
    }
    .eyebrow {
        margin: 0 0 8px;
        color: #718667;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.15em;
    }
    .accounting-heading h1 {
        margin: 0 0 7px;
        color: #1b2a44;
        font-family: Georgia, serif;
        font-size: 35px;
        font-weight: 600;
        line-height: 1.1;
    }
    .accounting-heading > div > p:last-child,
    .section-title p,
    .empty-state p {
        margin: 0;
        color: #747e86;
        font-size: 14px;
    }
    .create-invoice {
        flex: 0 0 auto;
        border: 0;
        border-radius: 7px;
        background: #203552;
        padding: 11px 17px;
        color: white;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
    }
    .invoice-section {
        max-width: 900px;
    }
    .section-title {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
        margin-bottom: 14px;
    }
    .section-title h2 {
        margin: 0 0 4px;
        color: #25344b;
        font-size: 18px;
    }
    .section-title > span {
        border-radius: 999px;
        background: #e9eee6;
        padding: 5px 9px;
        color: #587052;
        font-size: 11px;
        font-weight: 700;
    }
    .invoice-list {
        display: grid;
        gap: 10px;
    }
    .invoice-card {
        border: 1px solid transparent;
        border-radius: 10px;
        padding: 16px 18px;
    }
    .invoice-card.unpaid {
        border-color: #efd8d5;
        background: #fbefed;
    }
    .invoice-card.partial {
        border-color: #eadfbd;
        background: #fbf6e6;
    }
    .invoice-card.paid {
        border-color: #d3e5d2;
        background: #eef7ed;
    }
    .invoice-main,
    .invoice-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 18px;
    }
    .invoice-main h3 {
        margin: 0 0 5px;
        color: #25344b;
        font-size: 15px;
    }
    .invoice-main p {
        margin: 0;
        color: #68747c;
        font-size: 12px;
    }
    .invoice-amount {
        display: grid;
        justify-items: end;
        gap: 3px;
    }
    .invoice-amount strong {
        color: #25344b;
        font-size: 17px;
    }
    .invoice-amount span {
        color: #68747c;
        font-size: 11px;
    }
    .invoice-actions {
        margin-top: 14px;
        padding-top: 12px;
        border-top: 1px solid rgba(80, 90, 90, 0.12);
    }
    .payment-status {
        color: #3f4b50;
        font-size: 12px;
    }
    .invoice-actions button {
        border: 1px solid #cfd6d1;
        border-radius: 6px;
        background: white;
        padding: 7px 11px;
        color: #203552;
        font: inherit;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
    }
    .empty-state {
        display: grid;
        justify-items: center;
        border: 1px solid #dfe4df;
        border-radius: 12px;
        background: white;
        padding: 52px 24px;
        text-align: center;
    }
    .empty-state h3 {
        margin: 0 0 7px;
        color: #25344b;
        font-size: 16px;
    }
    @media (max-width: 620px) {
        .accounting-heading,
        .invoice-main,
        .invoice-actions {
            align-items: stretch;
            flex-direction: column;
        }
        .accounting-heading h1 {
            font-size: 29px;
        }
        .create-invoice {
            width: 100%;
            min-height: 46px;
        }
        .invoice-amount {
            justify-items: start;
        }
    }
</style>
