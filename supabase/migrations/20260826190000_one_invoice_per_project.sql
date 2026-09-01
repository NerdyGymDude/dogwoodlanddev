-- Dogwood Land Development
-- Enforce one invoice per project.

create unique index if not exists invoices_one_per_project_idx
on public.invoices (project_id)
where project_id is not null;
