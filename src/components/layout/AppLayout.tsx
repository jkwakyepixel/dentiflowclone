import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutGrid, 
  Calendar as CalendarIcon, 
  Users, 
  FileText, 
  CreditCard, 
  BarChart3, 
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
  Bell,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useClinic } from '../../contexts/ClinicContext';
import { usePermissions } from '../../hooks/usePermissions';
import type { AppPermission } from '../../config/permissions';
import { format } from 'date-fns';

export const AppLayout = () => {
  const { userData, currentUser, logout } = useAuth();
  const { clinicProfile } = useClinic();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const { hasPermission } = usePermissions();

  const navItems: { name: string; path: string; icon: any; permission: AppPermission }[] = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutGrid, permission: 'view_dashboard' },
    { name: 'Admissions', path: '/admissions', icon: UserCheck, permission: 'manage_admissions' },
    { name: 'Appointments', path: '/appointments', icon: CalendarIcon, permission: 'manage_appointments' },
    { name: 'Patients', path: '/patients', icon: Users, permission: 'manage_patients' },
    { name: 'Invoices', path: '/invoices', icon: FileText, permission: 'manage_invoices' },
    { name: 'Payments', path: '/payments', icon: CreditCard, permission: 'manage_payments' },
    { name: 'Financial Reports', path: '/financial-reports', icon: BarChart3, permission: 'view_reports' },
    { name: 'Settings', path: '/settings', icon: SettingsIcon, permission: 'manage_settings' },
  ];

  const visibleNavItems = navItems.filter(item => hasPermission(item.permission));

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Failed to log out", error);
    }
  };

  const displayName = userData?.name || currentUser?.displayName || userData?.email?.split('@')[0] || currentUser?.email?.split('@')[0] || 'Jonathankwakye27';
  const userEmail = userData?.email || currentUser?.email || 'jonathankwakye27@gmail.com';
  const initial = (displayName.charAt(0) || 'J').toUpperCase();
  const currentDate = format(new Date(), 'EEEE, d MMMM yyyy');

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-800">
      {/* Mobile sidebar backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-100 flex flex-col justify-between transform transition-all duration-300 ease-in-out md:translate-x-0 md:static md:inset-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isSidebarCollapsed ? 'w-20' : 'w-64'}`}
      >
        <div>
          {/* Clinic Brand Header */}
          <div className={`flex items-center ${isSidebarCollapsed ? 'justify-center' : 'justify-between'} h-20 px-5 border-b border-slate-100/80 transition-all duration-300`}>
            <div className="flex items-center gap-3 overflow-hidden">
              {clinicProfile.logo ? (
                <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 p-1 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-2xs">
                  <img 
                    src={clinicProfile.logo} 
                    alt="Logo" 
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-[#2563eb] text-white flex items-center justify-center shadow-xs flex-shrink-0">
                  <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                    <path d="M18.8 4C17.2 4 16 5.1 15.3 6.3C14.6 4.9 13.1 4 11.4 4C8.4 4 6 6.4 6 9.4C6 14.1 10.6 18.5 11.5 19.3C11.7 19.5 11.9 19.5 12.1 19.5C12.3 19.5 12.5 19.5 12.7 19.3C13.6 18.5 18.2 14.1 18.2 9.4C18.2 8.7 18 8 17.6 7.4C18.4 6.8 19 5.8 19 4.7C19 4.3 18.9 4.1 18.8 4ZM12 17.5C10.5 16 7.8 12.8 7.8 9.4C7.8 7.4 9.4 5.8 11.4 5.8C12.8 5.8 14.1 6.6 14.7 7.9C14.8 8.2 15.1 8.4 15.5 8.4C15.9 8.4 16.2 8.2 16.3 7.8C16.8 6.5 17.8 5.8 18.8 5.8C18.9 5.8 19 5.8 19 5.9C18.8 6.7 18.2 7.3 17.4 7.6C17 7.8 16.7 8.2 16.7 8.6C16.7 8.9 16.8 9.2 17 9.4C17.1 9.4 17.1 9.4 17.1 9.4C17.1 12.8 14.4 16 12 17.5Z" opacity="0.9" />
                    <path d="M12 2C8.5 2 5.5 4.5 5 8C4.5 11.5 6 15 8 18.5C9 20 10.5 21.5 11.5 22C11.8 22.1 12.2 22.1 12.5 22C13.5 21.5 15 20 16 18.5C18 15 19.5 11.5 19 8C18.5 4.5 15.5 2 12 2Z" fill="none" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
              {!isSidebarCollapsed && (
                <div className="overflow-hidden">
                  <h2 className="text-sm font-bold text-slate-900 truncate leading-tight">
                    {clinicProfile.name || 'Bright Smile Dental Clinic'}
                  </h2>
                  <p className="text-xs text-slate-400 font-normal truncate mt-0.5">Clinic Manager</p>
                </div>
              )}
            </div>
            {!isSidebarCollapsed && (
              <button 
                className="md:hidden text-slate-400 hover:text-slate-600 p-1"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X size={20} />
              </button>
            )}
          </div>

          {/* Nav Items */}
          <nav className="px-3.5 py-5 space-y-1.5">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname.startsWith(item.path);
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  title={isSidebarCollapsed ? item.name : undefined}
                  className={`flex items-center ${isSidebarCollapsed ? 'justify-center px-0' : 'gap-3.5 px-3.5'} py-2.5 rounded-xl text-sm transition-all duration-150 ${
                    isActive 
                      ? 'bg-[#eff6ff] text-[#2563eb] font-semibold shadow-2xs' 
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium'
                  }`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Icon size={19} className={isActive ? 'text-[#2563eb]' : 'text-slate-400'} />
                  {!isSidebarCollapsed && <span>{item.name}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile Footer */}
        <div className={`p-4 border-t border-slate-100 flex items-center ${isSidebarCollapsed ? 'justify-center flex-col gap-3' : 'justify-between'}`}>
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-[#dc2626] text-white flex items-center justify-center font-bold text-sm shadow-xs flex-shrink-0">
              {initial}
            </div>
            {!isSidebarCollapsed && (
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-900 truncate">{displayName}</p>
                <p className="text-[11px] text-slate-400 truncate">{userEmail}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2 rounded-lg transition-colors flex-shrink-0"
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 px-6 md:px-8 border-b border-slate-100 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden text-slate-500 hover:text-slate-700 p-1 -ml-1"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu size={22} />
            </button>
            <button 
              className="hidden md:block text-slate-500 hover:text-slate-700 p-1 -ml-1 rounded-lg hover:bg-slate-50 transition-colors"
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              title="Toggle Sidebar"
            >
              <Menu size={22} />
            </button>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <CalendarIcon size={14} className="text-slate-400" />
              <span>{currentDate}</span>
            </div>
          </div>

          <div className="flex items-center gap-5">
            {/* Profile Avatar & Name */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#dc2626] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {initial}
              </div>
              <span className="text-xs font-semibold text-slate-800 hidden sm:inline-block">
                {displayName}
              </span>
            </div>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#f8fafc] p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
