export type LayoutStyle = 'intercom' | 'whatsapp';

export interface ThemeColors {
  // Container
  widgetBackground: string;
  widgetBorder: string;
  
  // Header
  headerBackground: string;
  headerText: string;
  headerIcon: string;
  
  // Chat Area
  chatBackground: string;
  chatBackgroundImage?: string;
  
  // Messages
  userBubble: string;
  userText: string;
  agentBubble: string;
  agentText: string;
  
  // Input Area
  inputContainer: string;
  inputBackground: string;
  inputText: string;
  inputBorder: string;
  
  // System Messages
  systemNoticeBackground: string;
  systemNoticeText: string;
}

export interface ThemeConfig {
  id: string;
  name: string;
  layout: LayoutStyle;
  primaryColor: string; // Overrideable by user
  colors: ThemeColors;
}

export const builtInThemes: Record<string, ThemeConfig> = {
  'dark': {
    id: 'dark',
    name: 'Dark Modern',
    layout: 'intercom',
    primaryColor: '#4f46e5', // indigo-600
    colors: {
      widgetBackground: '#0F1117',
      widgetBorder: 'rgba(255,255,255,0.05)',
      
      headerBackground: 'rgba(15, 17, 23, 0.75)',
      headerText: '#f1f5f9', // slate-100
      headerIcon: '#94a3b8', // slate-400
      
      chatBackground: 'transparent',
      
      userBubble: 'var(--primary-color)',
      userText: '#ffffff',
      agentBubble: '#1E222D',
      agentText: '#e2e8f0', // slate-200
      
      inputContainer: 'rgba(15, 17, 23, 0.8)',
      inputBackground: '#1A1D27',
      inputText: '#e2e8f0',
      inputBorder: 'rgba(255,255,255,0.1)',
      
      systemNoticeBackground: 'rgba(255,255,255,0.05)',
      systemNoticeText: '#64748b' // slate-500
    }
  },
  'light-blue': {
    id: 'light-blue',
    name: 'Light Corporate',
    layout: 'intercom',
    primaryColor: '#2563eb', // blue-600
    colors: {
      widgetBackground: '#FFFFFF',
      widgetBorder: 'rgba(0,0,0,0.08)',
      
      headerBackground: 'rgba(255, 255, 255, 0.85)',
      headerText: '#1e293b', // slate-800
      headerIcon: '#64748b', // slate-500
      
      chatBackground: 'transparent',
      
      userBubble: 'var(--primary-color)',
      userText: '#ffffff',
      agentBubble: '#f1f5f9', // slate-100
      agentText: '#1e293b', // slate-800
      
      inputContainer: 'rgba(255, 255, 255, 0.9)',
      inputBackground: '#f8fafc', // slate-50
      inputText: '#1e293b',
      inputBorder: '#e2e8f0', // slate-200
      
      systemNoticeBackground: '#f1f5f9',
      systemNoticeText: '#64748b'
    }
  },
  'dark-wa': {
    id: 'dark-wa',
    name: 'Dark Classic',
    layout: 'whatsapp',
    primaryColor: '#00a884',
    colors: {
      widgetBackground: '#0b141a',
      widgetBorder: '#202c33',
      
      headerBackground: '#202c33',
      headerText: '#e9edef',
      headerIcon: '#aebac1',
      
      chatBackground: '#0b141a',
      
      userBubble: '#005c4b',
      userText: '#e9edef',
      agentBubble: '#202c33',
      agentText: '#e9edef',
      
      inputContainer: '#202c33',
      inputBackground: '#2a3942',
      inputText: '#e9edef',
      inputBorder: 'transparent',
      
      systemNoticeBackground: '#182229',
      systemNoticeText: '#ffd279' // For encryption text usually, or slate for dates
    }
  },
  'light-wa': {
    id: 'light-wa',
    name: 'Light Classic',
    layout: 'whatsapp',
    primaryColor: '#00A884',
    colors: {
      widgetBackground: '#FFFFFF',
      widgetBorder: 'rgba(0,0,0,0.08)',
      
      headerBackground: '#008069',
      headerText: '#ffffff',
      headerIcon: '#ffffff',
      
      chatBackground: '#EFEAE2',
      chatBackgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23d6d0c4\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
      
      userBubble: '#D9FDD3',
      userText: '#111B21',
      agentBubble: '#FFFFFF',
      agentText: '#111B21',
      
      inputContainer: '#F0F2F5',
      inputBackground: '#FFFFFF',
      inputText: '#111B21',
      inputBorder: 'transparent',
      
      systemNoticeBackground: '#FFEECD',
      systemNoticeText: '#54656F'
    }
  }
};

export function getTheme(themeId: string): ThemeConfig {
  return builtInThemes[themeId] || builtInThemes['light-blue'];
}

// Function to generate CSS variables string from ThemeConfig
export function generateThemeVariables(theme: ThemeConfig, overridePrimaryColor?: string): React.CSSProperties {
  const primary = overridePrimaryColor || theme.primaryColor;
  
  return {
    '--primary-color': primary,
    '--widget-bg': theme.colors.widgetBackground,
    '--widget-border': theme.colors.widgetBorder,
    
    '--header-bg': theme.colors.headerBackground,
    '--header-text': theme.colors.headerText,
    '--header-icon': theme.colors.headerIcon,
    
    '--chat-bg': theme.colors.chatBackground,
    '--chat-bg-image': theme.colors.chatBackgroundImage || 'none',
    
    '--user-bubble': theme.colors.userBubble,
    '--user-text': theme.colors.userText,
    '--agent-bubble': theme.colors.agentBubble,
    '--agent-text': theme.colors.agentText,
    
    '--input-container': theme.colors.inputContainer,
    '--input-bg': theme.colors.inputBackground,
    '--input-text': theme.colors.inputText,
    '--input-border': theme.colors.inputBorder,
    
    '--notice-bg': theme.colors.systemNoticeBackground,
    '--notice-text': theme.colors.systemNoticeText,
  } as React.CSSProperties;
}
