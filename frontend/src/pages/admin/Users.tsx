import { Card } from '@components/ui/Card'
import { PageTitle } from '@components/ui/PageTitle'
import { AdminPageShell } from '@components/layout/adminPageShell'
import { Table } from '@components/ui/Table' // shared data table

export default function Users() {
  return (
    <AdminPageShell>
      <PageTitle>Users</PageTitle>
      <Card>
        <Table<never>
          columns={[
            { key: 'name',    header: 'Name',    cell: () => null },
            { key: 'email',   header: 'Email',   cell: () => null },
            { key: 'roles',   header: 'Roles',   cell: () => null },
            { key: 'actions', header: 'Actions', cell: () => null },
          ]}
          rows={[]} // placeholder — no user CRUD implemented yet
          rowKey={(_, i) => i}
          empty={<p className="py-8 text-center text-slate-400 text-sm">No users found.</p>}
        />
      </Card>
    </AdminPageShell>
  )
}
