import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';
import Footer from './Footer';
import { ChatBubble } from '../chat/ChatBubble';
import { ModelStatusBanner } from './ModelStatusBanner';
import { WorkspaceTermsModal } from '../WorkspaceTermsModal';

export default function Layout() {
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <ModelStatusBanner />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
        <Footer />
      </div>
      <ChatBubble />
      <WorkspaceTermsModal />
    </div>
  );
}
