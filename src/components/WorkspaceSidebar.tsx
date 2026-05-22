"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Settings, 
  Smile, 
  GitMerge, 
  Target, 
  Code, 
  MessageSquare, 
  Zap, 
  Database, 
  Bot, 
  UserPlus, 
  Contact, 
  BarChart,
  Sparkles
} from 'lucide-react';

interface WorkspaceSidebarProps {
  currentBusinessId: string;
}

export default function WorkspaceSidebar({ currentBusinessId }: WorkspaceSidebarProps) {
  const pathname = usePathname();

  const menuCategories = [
    {
      title: 'Configuration',
      items: [
        { name: 'General', href: `/admin/${currentBusinessId}/general`, icon: Settings },
        { name: 'AI Personality', href: `/admin/${currentBusinessId}/ai-personality`, icon: Smile },
        { name: 'Chat Flow', href: `/admin/${currentBusinessId}/chat-flow`, icon: GitMerge },
        { name: 'CTA & Conversion', href: `/admin/${currentBusinessId}/cta`, icon: Target },
        { name: 'Prompt Studio', href: `/admin/${currentBusinessId}/prompt-studio`, icon: Sparkles },
      ]
    },
    {
      title: 'Operations',
      items: [
        { name: 'Smart Inbox', href: `/admin/${currentBusinessId}/conversations`, icon: MessageSquare },
        { name: 'Lead Management', href: `/admin/${currentBusinessId}/leads`, icon: Contact },
        { name: 'Analytics', href: `/admin/${currentBusinessId}/analytics`, icon: BarChart },
      ]
    },
    {
      title: 'AI Logic',
      items: [
        { name: 'Knowledge Base AI', href: `/admin/${currentBusinessId}/knowledge-base`, icon: Database },
        { name: 'AI Actions', href: `/admin/${currentBusinessId}/engage`, icon: Zap },
        { name: 'Automation', href: `/admin/${currentBusinessId}/automation`, icon: Bot },
        { name: 'Human Handover', href: `/admin/${currentBusinessId}/handover`, icon: UserPlus },
      ]
    },
    {
      title: 'Deployment',
      items: [
        { name: 'Embed & Integrate', href: `/admin/${currentBusinessId}/integration`, icon: Code },
      ]
    }
  ];

  return (
    <div className="w-64 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex-shrink-0 h-full overflow-y-auto no-scrollbar flex flex-col">
      <div className="p-4 space-y-6">
        {menuCategories.map((category) => (
          <div key={category.title}>
            <h3 className="px-3 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">
              {category.title}
            </h3>
            <div className="space-y-1">
              {category.items.map((item) => {
                const isActive = pathname.includes(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    <item.icon className={`h-4 w-4 ${isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400 dark:text-zinc-500'}`} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
