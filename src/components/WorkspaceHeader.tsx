"use client";

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ThemeToggle } from './ThemeToggle';
import { ChevronDown, Box, LayoutDashboard, Settings, MessageSquare, Megaphone, Database, Contact, BarChart, ArrowLeft } from 'lucide-react';

interface Business {
  id: string;
  name: string;
}

interface WorkspaceHeaderProps {
  businesses: Business[];
  currentBusinessId: string;
}

export default function WorkspaceHeader({ businesses, currentBusinessId }: WorkspaceHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const currentBusiness = businesses.find(b => b.id === currentBusinessId) || businesses[0];

  return (
    <div className="bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 shrink-0 z-30 transition-colors">
      {/* Top Header Row */}
      <div className="h-14 px-4 sm:px-6 flex items-center justify-between">
        
        {/* Workspace Switcher */}
        <div className="flex items-center space-x-4">
          <Link 
            href="/admin"
            className="p-2 -ml-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            title="Back to Agency Hub"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          
          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              <div className="h-6 w-6 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded flex items-center justify-center font-bold text-xs">
                {currentBusiness?.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 max-w-[150px] sm:max-w-[200px] truncate">
                {currentBusiness?.name}
              </span>
              <ChevronDown className={`h-4 w-4 text-zinc-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-800 z-20 py-2 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Your Workspaces
                  </div>
                  {businesses.map((business) => (
                    <button
                      key={business.id}
                      onClick={() => {
                        setIsDropdownOpen(false);
                        if (business.id !== currentBusinessId) {
                          // Swap the businessId in the current pathname to keep them on the same tab if possible,
                          // or just redirect to their general settings dashboard
                          router.push(`/admin/${business.id}/general`);
                        }
                      }}
                      className={`w-full text-left flex items-center space-x-3 px-4 py-2.5 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors ${business.id === currentBusinessId ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'text-zinc-700 dark:text-zinc-300'}`}
                    >
                      <div className="h-6 w-6 bg-zinc-100 dark:bg-zinc-800 rounded flex items-center justify-center font-bold text-xs">
                        {business.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate">{business.name}</span>
                    </button>
                  ))}
                  <div className="border-t border-zinc-200 dark:border-zinc-800 mt-2 pt-2 px-2">
                    <Link href="/admin" className="block w-full text-center px-4 py-2 text-xs font-medium text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-colors">
                      + Create New Workspace
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-3">
          <ThemeToggle />
        </div>
      </div>
    </div>
  );
}
