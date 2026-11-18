import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { cn } from '../../utils/cn';
import { useLocale } from '../../localization/useLocale';

export const Layout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { direction, rootClassName } = useLocale();

  return (
    <div dir={direction} className={cn('min-h-screen bg-[#F4F7FE] dark:bg-gray-950 overflow-x-clip', rootClassName)}>
      <Sidebar
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        isCollapsed={sidebarCollapsed}
        onCollapseToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className={cn(
        'transition-[padding] duration-300 ease-in-out',
        sidebarCollapsed
          ? 'ltr:lg:pl-[72px] rtl:lg:pr-[72px]'
          : 'ltr:lg:pl-64 rtl:lg:pr-64'
      )}>
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        <main className="px-4 sm:px-6 py-2 overflow-x-clip">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
