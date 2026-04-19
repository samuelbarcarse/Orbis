// @ts-nocheck
import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Map, FileText, AlertTriangle,
  ChevronLeft, ChevronRight, Bell
} from 'lucide-react';
import { UserButton } from '@clerk/clerk-react';
import { cn } from '@/lib/utils';
import ChatAssistant from '../ai/ChatAssistant';
import NotificationBell from './NotificationBell';

const BASE_NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/regions', icon: Map, label: 'Regions' },
  { path: '/alerts', icon: AlertTriangle, label: 'Alerts' },
  { path: '/alert-rules', icon: Bell, label: 'Alert Rules' },
  { path: '/reports', icon: FileText, label: 'Reports' },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  const navItems = BASE_NAV_ITEMS;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className={cn(
        "flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 relative z-30",
        collapsed ? "w-16" : "w-56"
      )}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-sidebar-border">
          <img
            src="/logo.png"
            alt="Orbis logo"
            className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
          />
          {!collapsed && (
            <div className="overflow-hidden">
              <h1 className="text-sm font-bold text-sidebar-foreground tracking-tight">Orbis</h1>
              <p className="text-[10px] text-sidebar-foreground/50 font-medium">Marine Intelligence</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 flex flex-col">
          <div className="space-y-1">
            {navItems.map(item => {
              const isActive = location.pathname === item.path ||
                (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-sidebar-primary/15 text-sidebar-primary"
                      : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                >
                  <item.icon className="w-4.5 h-4.5 flex-shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
          <div className="mt-auto pt-2">
            <NotificationBell collapsed={collapsed} />
          </div>
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4">
          <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
            <UserButton afterSignOutUrl="/" />
            {!collapsed && <span className="text-xs text-sidebar-foreground/50">Account</span>}
          </div>
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-sidebar border border-sidebar-border flex items-center justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground transition-colors"
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto relative">
        <Outlet />
      </main>

      {/* AI Chat */}
      <ChatAssistant />
    </div>
  );
}