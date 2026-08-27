<script lang="ts">
    import FormField from '../FormField.svelte';
    import FormGrid from '../FormGrid.svelte';
    import FormSection from '../FormSection.svelte';
    import type { InvoiceFormData, InvoiceTaskLineFormData } from '../types';

    type Contact = { id: string; name: string; email: string; role: string; primary?: boolean };
    type Client = { id: string; name: string; contacts: Contact[] };
    type Project = { id: string; name: string; clientId?: string; projectNumber?: string };

    type BillingTask = {
        id: string;
        projectId: string;
        description: string;
        taskTotal: number;
        displayOrder: number;
        previouslyBilledPercentage: number;
        previouslyBilledAmount: number;
        paidAmount: number | null;
    };

    let {
        value = $bindable(),
        clients = [],
        projects = [],
        invoices = [],
        billingTasks = [],
        editing = false
    }: {
        value: InvoiceFormData;
        clients?: Client[];
        projects?: Project[];
        invoices?: Array<{ projectId?: string; invoiceIdentifier: string }>;
        billingTasks?: BillingTask[];
        editing?: boolean;
    } = $props();

    const selectedClient = $derived(clients.find((client) => client.id === value.clientId));
    const selectedProject = $derived(projects.find((project) => project.id === value.projectId));

    const visibleProjects = $derived(
        (value.clientId
            ? projects.filter((project) => !project.clientId || project.clientId === value.clientId)
            : projects
        ).filter(
            (project) =>
                editing || !invoices.some((invoice) => invoice.projectId === project.id)
        )
    );

    const invoiceTotal = $derived(
        value.taskLines.reduce((sum, line) => sum + (line.included ? line.currentDue : 0), 0)
    );

    const invoiceIdentifier = $derived.by(() => {
        const number = selectedProject?.projectNumber;
        if (!number) return 'Select a project';
        return number;
    });

    let loadedProject = $state('');

    $effect(() => {
        const subject =
            selectedClient && selectedProject
                ? `${selectedClient.name} - ${selectedProject.name} - Invoice`
                : '';

        if (!editing && value.subject !== subject) {
            value.subject = subject;
        }

        value.amount = invoiceTotal.toFixed(2);
    });

    $effect(() => {
        if (value.projectId === loadedProject) return;

        loadedProject = value.projectId;

        if (!editing || value.taskLines.length === 0) {
            value.taskLines = billingTasks
                .filter((task) => task.projectId === value.projectId)
                .sort((a, b) => a.displayOrder - b.displayOrder)
                .map((task, index) => ({
                    id: crypto.randomUUID(),
                    projectBillingTaskId: task.id,
                    included: false,
                    description: task.description,
                    taskTotal: task.taskTotal.toFixed(2),
                    previouslyBilledPercentage: task.previouslyBilledPercentage,
                    previouslyBilledAmount: task.previouslyBilledAmount,
                    paidAmount: task.paidAmount,
                    billNowPercentage: 0,
                    currentDue: 0,
                    amountDueInput: '',
                    displayOrder: index
                }));
        }
    });

    function defaultRecipients(clientId: string) {
        const primary = clients
            .find((client) => client.id === clientId)
            ?.contacts.find((contact) => contact.primary && contact.email);

        value.recipientContactIds = primary ? [primary.id] : [];
    }

    function changeClient(event: Event) {
        const id = (event.currentTarget as HTMLSelectElement).value;

        value.clientId = id;

        if (
            value.projectId &&
            projects.find((project) => project.id === value.projectId)?.clientId !== id
        ) {
            value.projectId = '';
        }

        defaultRecipients(id);
    }

    function changeProject(event: Event) {
        const id = (event.currentTarget as HTMLSelectElement).value;

        value.projectId = id;

        const clientId = projects.find((project) => project.id === id)?.clientId;

        if (clientId && clientId !== value.clientId) {
            value.clientId = clientId;
            defaultRecipients(clientId);
        }
    }

    function parseMoney(input: string | number) {
        return Number(String(input).replace('$', '').replaceAll(',', '')) || 0;
    }

    function calculatedLine(line: InvoiceTaskLineFormData): InvoiceTaskLineFormData {
        const taskTotal = parseMoney(line.taskTotal);
        const requestedDue = Math.max(0, Number(line.currentDue) || 0);
        const included = requestedDue > 0;

        return {
            ...line,
            included,
            billNowPercentage: taskTotal > 0 ? (requestedDue / taskTotal) * 100 : 0,
            currentDue: Math.round(requestedDue * 100) / 100,
            amountDueInput: included ? line.amountDueInput : ''
        };
    }

    function updateTaskLine(
        index: number,
        changes: Partial<InvoiceTaskLineFormData>,
        shouldCalculate = false
    ) {
        value.taskLines = value.taskLines.map((line, item) => {
            if (item !== index) return line;

            const next = { ...line, ...changes };

            return shouldCalculate ? calculatedLine(next) : next;
        });
    }

    function addTask() {
        value.taskLines = [
            ...value.taskLines,
            {
                id: crypto.randomUUID(),
                included: false,
                description: '',
                taskTotal: '',
                previouslyBilledPercentage: 0,
                previouslyBilledAmount: 0,
                paidAmount: 0,
                billNowPercentage: 0,
                currentDue: 0,
                amountDueInput: '',
                displayOrder: value.taskLines.length
            }
        ];
    }

    function removeTask(index: number) {
        if (!window.confirm('Are you sure you want to delete this task from the invoice?')) {
            return;
        }

        value.taskLines = value.taskLines
            .filter((_, item) => item !== index)
            .map((line, item) => ({
                ...line,
                displayOrder: item
            }));
    }
</script>

<FormSection
    title="Invoice"
    description="Choose the project being billed and set up the invoice before reviewing it."
>
    <FormGrid>
        <FormField label="Client" forId="invoice-client" required>
            <select
                id="invoice-client"
                value={value.clientId}
                onchange={changeClient}
                required
                disabled={editing}
            >
                <option value="">Select a client</option>

                {#each clients as client}
                    <option value={client.id}>{client.name}</option>
                {/each}
            </select>
        </FormField>

        <FormField label="Project" forId="invoice-project" required>
            <select
                id="invoice-project"
                value={value.projectId}
                onchange={changeProject}
                required
                disabled={editing}
            >
                <option value="">Select a project</option>

                {#each visibleProjects as project}
                    <option value={project.id}>{project.name}</option>
                {/each}
            </select>
        </FormField>

        <FormField label="Invoice Identifier">
            <div class="read-only-value">{invoiceIdentifier}</div>
        </FormField>

        <FormField label="Status">
            <div class="status-value">{value.status}</div>
        </FormField>
    </FormGrid>

    <FormField label="Subject">
        <div class="read-only-value">
            {value.subject || 'Select a client and project'}
        </div>
    </FormField>

    <FormGrid>
        <FormField label="Date" forId="invoice-date" required>
            <input
                id="invoice-date"
                type="date"
                bind:value={value.date}
                required
            />
        </FormField>

        <FormField label="Due Date" forId="invoice-due">
            <input
                id="invoice-due"
                type="date"
                bind:value={value.dueDate}
            />
        </FormField>
    </FormGrid>
</FormSection>

<FormSection
    title="Project Billing Tasks"
    description="Set the task total and the dollar amount due on this invoice."
>
    {#if !value.projectId}
        <p class="empty">
            Select a project to manage its billing tasks.
        </p>
    {:else}
        <div class="task-table">
            <div class="task-head">
                <span>Task</span>
                <span>Total</span>
                <span>Paid</span>
                <span>Amount Due</span>
                <span></span>
            </div>

            {#each value.taskLines as line, index (line.id)}
                <div class="task-row">
                    <input
                        type="text"
                        aria-label="Task"
                        value={line.description}
                        oninput={(event) =>
                            updateTaskLine(
                                index,
                                { description: event.currentTarget.value }
                            )}
                        required
                    />

                    <input
                        type="text"
                        aria-label="Total"
                        inputmode="decimal"
                        value={line.taskTotal}
                        oninput={(event) =>
                            updateTaskLine(
                                index,
                                { taskTotal: event.currentTarget.value },
                                true
                            )}
                        placeholder="$0.00"
                        required
                    />

                    <div class="metric">
                        <small>Paid</small>

                        <strong>
                            {line.paidAmount === null
                                ? 'Not allocated'
                                : new Intl.NumberFormat('en-US', {
                                        style: 'currency',
                                        currency: 'USD'
                                    }).format(line.paidAmount)}
                        </strong>
                    </div>

                    <label class="amount-due">
                        <small>Amount Due</small>

                        <input
                            aria-label="Amount Due"
                            type="text"
                            inputmode="decimal"
                            value={line.amountDueInput ?? (line.currentDue || '')}
                            oninput={(event) =>
                                updateTaskLine(
                                    index,
                                    {
                                        currentDue: parseMoney(event.currentTarget.value),
                                        amountDueInput: event.currentTarget.value
                                    },
                                    true
                                )}
                            placeholder="$0.00"
                        />
                    </label>

                    <button
                        type="button"
                        class="delete-task"
                        aria-label="Delete task"
                        title="Delete task"
                        onclick={() => removeTask(index)}
                    >
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
            {/each}
        </div>

        <button
            type="button"
            class="add-task"
            onclick={addTask}
        >
            + Add Task
        </button>
    {/if}

    <div class="invoice-total">
        <span>Invoice Amount Due</span>

        <strong>
            {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD'
            }).format(invoiceTotal)}
        </strong>

        <input
            type="hidden"
            name="amount"
            value={value.amount}
        />
    </div>
</FormSection>

<style>
    .read-only-value,
    .status-value {
        min-height: 44px;
        box-sizing: border-box;
        border: 1px solid #dfe5df;
        border-radius: 0.65rem;
        background: #f6f8f5;
        padding: 0.72rem 0.8rem;
        color: #34483a;
    }

    .status-value {
        color: #526a4b;
        font-weight: 700;
    }

    .empty {
        margin: 0;
        color: #737d75;
        font-size: 0.82rem;
    }

    .task-table {
        display: grid;
        gap: 0.55rem;
        width: 100%;
    }

    .task-head,
    .task-row {
        display: grid;
        grid-template-columns:
            minmax(180px, 2fr)
            minmax(100px, 1fr)
            minmax(100px, 0.8fr)
            minmax(120px, 1fr)
            42px;
        gap: 0.55rem;
        align-items: center;
        width: 100%;
        min-width: 0;
    }

    .task-head {
        padding: 0 0.55rem;
        color: #68766c;
        font-size: 0.68rem;
        font-weight: 800;
        text-transform: uppercase;
    }

    .task-row {
        box-sizing: border-box;
        border: 1px solid #dfe5df;
        border-radius: 0.75rem;
        background: #fff;
        padding: 0.65rem;
    }

    .task-row input {
        box-sizing: border-box;
        min-width: 0;
        width: 100%;
        border: 1px solid #d6ddd6;
        border-radius: 0.55rem;
        padding: 0.62rem;
        font: inherit;
    }

    .metric {
        display: grid;
        gap: 0.15rem;
    }

    .metric small,
    .amount-due small {
        display: none;
    }

    .metric strong {
        color: #314336;
        font-size: 0.82rem;
    }

    .amount-due {
        display: block;
        min-width: 0;
    }

    .delete-task {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border: 0;
    background: transparent;
    color: #943c35;
    font-size: 1.35rem;
    line-height: 1;
    cursor: pointer;
}

    .add-task {
        margin-top: 0.75rem;
        border: 1px solid #cdd7cc;
        border-radius: 0.5rem;
        background: #fff;
        padding: 0.55rem 0.7rem;
        color: #526a4b;
        font-weight: 700;
        cursor: pointer;
    }

    .invoice-total {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 1rem;
        margin-top: 1rem;
        border-top: 1px solid #dce3dc;
        padding-top: 1rem;
        color: #253c2c;
    }

    .invoice-total strong {
        font-size: 1.35rem;
    }

    @media (max-width: 700px) {
        .task-head {
            display: none;
        }

        .task-row {
            grid-template-columns: 1fr 1fr 42px;
        }

        .task-row > input:first-child {
            grid-column: 1 / -1;
        }

        .metric small,
        .amount-due small {
            display: block;
            color: #788178;
            font-size: 0.65rem;
        }

        .delete-task {
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    border: 0;
    background: transparent;
    color: #943c35;
    font-size: 1.35rem;
    line-height: 1;
    cursor: pointer;
}

        .invoice-total {
            justify-content: space-between;
        }
    }
</style>
