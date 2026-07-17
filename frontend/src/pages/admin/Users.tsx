import { Card } from '../../components/ui/Card'
import { PageTitle } from '../../components/ui/PageTitle'
import { AdminPageShell } from '../../components/layout/adminPageShell'

export default function Users() {
  return (
    <AdminPageShell>
      <PageTitle>Users</PageTitle>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Email</th>
                <th className="pb-2 pr-4">Roles</th>
                <th className="pb-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-400 text-sm">
                  No users found.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </AdminPageShell>
  )
}
