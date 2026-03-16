import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AIConversation, AIMessage, AIProject } from '@/types';

interface PromptlyStore {
  sidebarCollapsed: boolean;
  currentConversationId: string | null;
  conversations: AIConversation[];
  messages: AIMessage[];
  isLoading: boolean;
  isWaitingForResponse: boolean;
  isTypingEffect: boolean;
  typingContent: string;
  typingTargetContent: string;
  projects: AIProject[];
  pendingProjectId: string | null;

  toggleSidebar: () => void;
  setCurrentConversationId: (id: string | null) => void;
  setConversations: (conversations: AIConversation[]) => void;
  addConversation: (conv: AIConversation) => void;
  updateConversationTitle: (id: string, title: string) => void;
  removeConversation: (id: string) => void;
  updateConversationProject: (id: string, projectId: string | null) => void;
  setMessages: (messages: AIMessage[]) => void;
  addMessage: (message: AIMessage) => void;
  setIsLoading: (loading: boolean) => void;
  setIsWaitingForResponse: (v: boolean) => void;
  startTypingEffect: (content: string, messageId: string) => void;
  appendTypingChar: () => void;
  finishTypingEffect: () => void;
  resetConversation: () => void;
  setProjects: (projects: AIProject[]) => void;
  addProject: (project: AIProject) => void;
  removeProject: (id: string) => void;
  updateProject: (id: string, updates: Partial<Omit<AIProject, 'id' | 'createdAt'>>) => void;
  setPendingProjectId: (id: string | null) => void;
}

export const usePromptlyStore = create<PromptlyStore>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      currentConversationId: null,
      conversations: [],
      messages: [],
      isLoading: false,
      isWaitingForResponse: false,
      isTypingEffect: false,
      typingContent: '',
      typingTargetContent: '',
      projects: [],
      pendingProjectId: null,

      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setCurrentConversationId: (id) => set({ currentConversationId: id }),

      setConversations: (conversations) => set({ conversations }),

      addConversation: (conv) =>
        set((state) => ({ conversations: [conv, ...state.conversations] })),

      updateConversationTitle: (id, title) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, title } : c,
          ),
        })),

      removeConversation: (id) =>
        set((state) => ({
          conversations: state.conversations.filter((c) => c.id !== id),
          currentConversationId:
            state.currentConversationId === id ? null : state.currentConversationId,
          messages: state.currentConversationId === id ? [] : state.messages,
        })),

      updateConversationProject: (id, projectId) =>
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, projectId } : c,
          ),
        })),

      setMessages: (messages) => set({ messages }),

      addMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),

      setIsLoading: (loading) => set({ isLoading: loading }),

      setIsWaitingForResponse: (v) => set({ isWaitingForResponse: v }),

      startTypingEffect: (content, messageId) => {
        const placeholderMsg: AIMessage = {
          id: messageId,
          conversationId: get().currentConversationId ?? '',
          role: 'assistant',
          content,
          createdAt: new Date().toISOString(),
        };
        set((state) => ({
          messages: [...state.messages, placeholderMsg],
          isTypingEffect: true,
          isWaitingForResponse: false,
          typingContent: '',
          typingTargetContent: content,
        }));
      },

      appendTypingChar: () => {
        const { typingContent, typingTargetContent } = get();
        if (typingContent.length < typingTargetContent.length) {
          set({ typingContent: typingTargetContent.slice(0, typingContent.length + 1) });
        } else {
          get().finishTypingEffect();
        }
      },

      finishTypingEffect: () => {
        const { typingTargetContent } = get();
        set({
          isTypingEffect: false,
          typingContent: typingTargetContent,
          typingTargetContent: '',
        });
      },

      resetConversation: () =>
        set({
          currentConversationId: null,
          messages: [],
          isTypingEffect: false,
          isWaitingForResponse: false,
          typingContent: '',
          typingTargetContent: '',
        }),

      setProjects: (projects) => set({ projects }),

      addProject: (project) =>
        set((state) => ({ projects: [...state.projects, project] })),

      removeProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          // conversations belonging to this project become unassigned locally
          conversations: state.conversations.map((c) =>
            c.projectId === id ? { ...c, projectId: null } : c,
          ),
        })),

      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p,
          ),
        })),

      setPendingProjectId: (id) => set({ pendingProjectId: id }),
    }),
    {
      name: 'kodlearn-promptly',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        projects: state.projects,
      }),
    },
  ),
);
