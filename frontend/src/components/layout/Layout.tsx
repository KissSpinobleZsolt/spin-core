import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './header';
import Sidebar from './sidebar';
import Footer from './Footer';
import { ChatBubble } from '../chat/chatBubble';
import { ModelStatusBanner } from './modelStatusBanner';
import { WorkspaceTermsModal } from '../workspaceTermsModal'
import { Spinner } from '../ui/spinner';
import { PageLoaderProvider } from '@context'
import { useI18nSync } from '@i18n/i18nSync'

export default function Layout() {
  const i18nReady = useI18nSync()  // loads translation bundle; returns true once the initial fetch resolves

  // Block the authenticated shell until translations are ready to prevent untranslated flash
  if (!i18nReady)
    return <div className="flex h-screen items-center justify-center"><Spinner size="lg" /></div>

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <ModelStatusBanner />
        <main className="flex-1 overflow-y-auto p-6">
          <Suspense fallback={<div className="flex items-center justify-center py-20"><Spinner /></div>}>
            <PageLoaderProvider>
              <Outlet />  {/* render the matched child route inside the shared shell */}
            </PageLoaderProvider>
          </Suspense>
        </main>
        <Footer />
      </div>
      <ChatBubble />
      <WorkspaceTermsModal />
    </div>
  );
}
