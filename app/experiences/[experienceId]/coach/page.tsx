"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@whop/react/components";
import { ArrowRight, MoreVertical, Star, Trash2, Edit2, X, AlertTriangle, MessageSquare, Send, Menu, Sparkles, Home, Target, Settings, HelpCircle } from "lucide-react";

function MessageContent({ content }: { content: string }) {
  // Simple markdown-like rendering
  return (
    <div className="space-y-3 text-gray-900 prose prose-sm max-w-none">
      {content.split('\n\n').map((paragraph, i) => {
        if (!paragraph.trim()) return null;
        
        // Check for headers
        if (paragraph.startsWith('## ')) {
          return (
            <h3 key={i} className="font-bold text-base mt-4 mb-2 first:mt-0 text-gray-900">
              {paragraph.replace(/^## /, '')}
            </h3>
          );
        }
        
        // Check for numbered lists
        if (/^\d+\.\s/.test(paragraph)) {
          const lines = paragraph.split('\n');
          return (
            <ol key={i} className="list-decimal list-inside space-y-1.5 ml-2 text-gray-900">
              {lines.map((line, j) => {
                const match = line.match(/^\d+\.\s(.+)/);
                if (match) {
                  return (
                    <li key={j} className="ml-2 text-gray-900">
                      {match[1].split(/\*\*(.+?)\*\*/g).map((part, k) => 
                        k % 2 === 1 ? <strong key={k} className="font-semibold text-gray-900">{part}</strong> : <span key={k} className="text-gray-900">{part}</span>
                      )}
                    </li>
                  );
                }
                return <li key={j} className="text-gray-900">{line}</li>;
              })}
            </ol>
          );
        }
        
        // Check for bullet lists
        if (/^[-*]\s/.test(paragraph)) {
          const lines = paragraph.split('\n');
          return (
            <ul key={i} className="list-disc list-inside space-y-1.5 ml-2 text-gray-900">
              {lines.map((line, j) => {
                const match = line.match(/^[-*]\s(.+)/);
                if (match) {
                  return (
                    <li key={j} className="ml-2 text-gray-900">
                      {match[1].split(/\*\*(.+?)\*\*/g).map((part, k) => 
                        k % 2 === 1 ? <strong key={k} className="font-semibold text-gray-900">{part}</strong> : <span key={k} className="text-gray-900">{part}</span>
                      )}
                    </li>
                  );
                }
                return <li key={j} className="text-gray-900">{line}</li>;
              })}
            </ul>
          );
        }
        
        // Regular paragraph with bold support
        return (
          <p key={i} className="leading-relaxed text-gray-900 whitespace-pre-wrap">
            {paragraph.split(/\*\*(.+?)\*\*/g).map((part, k) => 
              k % 2 === 1 ? <strong key={k} className="font-semibold text-gray-900">{part}</strong> : <span key={k} className="text-gray-900">{part}</span>
            )}
          </p>
        );
      })}
    </div>
  );
}

function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  threadTitle,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  threadTitle?: string | null;
}) {
  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleEscape);
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative z-10 w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">Delete Chat</h3>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4 text-slate-600" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              Are you sure you want to delete <span className="font-medium text-slate-900">"{threadTitle || "Coach Chat"}"</span>? This action cannot be undone.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ThreadItem({
  thread,
  isActive,
  onSelect,
  onDelete,
  onFavorite,
  onRename,
}: {
  thread: Thread;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onFavorite: () => void;
  onRename: (newTitle: string) => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(thread.title || "");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }

    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showMenu]);

  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isRenaming]);

  function handleRename() {
    if (renameValue.trim() !== (thread.title || "")) {
      onRename(renameValue);
    }
    setIsRenaming(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      handleRename();
    } else if (e.key === "Escape") {
      setRenameValue(thread.title || "");
      setIsRenaming(false);
    }
  }

  return (
    <div
      className={[
        "w-full rounded-xl px-3 py-2 text-sm text-slate-800 border transition-all duration-200 group relative flex items-center justify-between gap-3",
        isActive 
          ? "border-blue-500/60 bg-blue-50/90" 
          : "border-transparent hover:border-blue-300/60 hover:bg-white hover:shadow-[0_0_0_4px_rgba(59,130,246,0.10),0_14px_30px_rgba(59,130,246,0.10)]",
      ].join(" ")}
    >
      <button
        onClick={onSelect}
        className="flex-1 min-w-0 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`h-9 w-9 rounded-lg border border-slate-200 bg-white grid place-items-center ${
            isActive ? "border-blue-300 bg-blue-50" : ""
          }`}>
            {thread.favorite ? (
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            ) : (
              <MessageSquare className="h-4 w-4 text-slate-700" />
            )}
          </div>
          {isRenaming ? (
            <input
              ref={inputRef}
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRename}
              onKeyDown={handleKeyDown}
              className="flex-1 text-sm font-medium border border-blue-500 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500/40 bg-white"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="text-sm font-medium text-slate-800 truncate">{thread.title || "New Chat"}</span>
          )}
        </div>
      </button>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-gray-200 rounded"
          type="button"
        >
          <MoreVertical className="h-4 w-4 text-gray-600" />
        </button>
        <ArrowRight className="h-4 w-4 text-slate-400 opacity-60" />
      </div>

      {showMenu && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-gray-200 bg-white shadow-xl py-1"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              onFavorite();
              setShowMenu(false);
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
          >
            <Star
              className={[
                "h-4 w-4",
                thread.favorite ? "text-yellow-500 fill-yellow-500" : "text-gray-400",
              ].join(" ")}
            />
            {thread.favorite ? "Unfavorite" : "Favorite"}
          </button>
          <button
            onClick={() => {
              setIsRenaming(true);
              setShowMenu(false);
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-gray-700"
          >
            <Edit2 className="h-4 w-4 text-gray-400" />
            Rename
          </button>
          <button
            onClick={() => {
              setShowDeleteConfirm(true);
              setShowMenu(false);
            }}
            className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 text-red-600 flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>
        </div>
      )}

      <DeleteConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={onDelete}
        threadTitle={thread.title}
      />
    </div>
  );
}

type Thread = { id: string; title?: string | null; updatedAt: string; favorite?: boolean };
type Msg = { id: string; role: "user" | "assistant"; content: string; createdAt: string };

const QUICK_ACTIONS = [
  { key: "plan", label: "Make a plan" },
  { key: "quiz", label: "Quiz me" },
  { key: "roleplay", label: "Roleplay me" },
  { key: "explain", label: "Explain simply" },
  { key: "fix", label: "Fix my answer" },
];

export default function CoachChatPage() {
  const params = useParams();
  const router = useRouter();
  const experienceId = params.experienceId as string;

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [workContext, setWorkContext] = useState<{
    nicheKey: string | null;
    nicheLabel: string | null;
    currentProblem: string | null;
    hasContext: boolean;
  } | null>(null);
  const [hasAskedAboutContext, setHasAskedAboutContext] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [coachName, setCoachName] = useState<string>("AI Coach");
  const [isPro, setIsPro] = useState(false);
  const [proLoading, setProLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string>("");
  const [username, setUsername] = useState<string>("");

  async function loadThreads() {
    try {
      console.log("[loadThreads] Fetching threads for experienceId:", experienceId);
      const res = await fetch(`/api/coach/threads?experienceId=${encodeURIComponent(experienceId)}`);
      
      if (!res.ok) {
        let errorData: any = null;
        try {
          const text = await res.text();
          console.error("[loadThreads] API error response text:", text);
          errorData = text ? JSON.parse(text) : null;
        } catch (e) {
          console.error("[loadThreads] Failed to parse error response:", e);
        }
        console.error("[loadThreads] API error:", {
          status: res.status,
          statusText: res.statusText,
          errorData,
          headers: Object.fromEntries(res.headers.entries()),
        });
        setThreads([]);
        return;
      }
      
      const data = await res.json();
      console.log("[loadThreads] API response:", { 
        threadCount: data.threads?.length, 
        threads: data.threads,
        hasThreads: !!data.threads,
        isArray: Array.isArray(data.threads),
        fullResponse: data,
      });
      
      if (data.threads && Array.isArray(data.threads)) {
        console.log("[loadThreads] Setting threads in state:", data.threads.length);
        setThreads(data.threads);
        
        if (!activeThreadId && data.threads.length > 0) {
          console.log("[loadThreads] Setting active thread:", data.threads[0].id);
          setActiveThreadId(data.threads[0].id);
        }
      } else {
        console.warn("[loadThreads] No threads array in response, setting empty array. Response:", data);
        setThreads([]);
      }
    } catch (error) {
      console.error("[loadThreads] Failed to load threads:", error);
      setThreads([]); // Set empty array on error
    }
  }

  async function loadMessages(threadId: string) {
    try {
      const res = await fetch(`/api/coach/messages?threadId=${threadId}`);
      const data = await res.json();
      if (data.messages && Array.isArray(data.messages)) {
        // Ensure messages are properly formatted and normalize roles
        const formattedMessages = data.messages.map((msg: any) => {
          // Normalize role
          let normalizedRole = String(msg.role || "").toLowerCase().trim();
          if (normalizedRole === "human" || normalizedRole === "USER") {
            normalizedRole = "user";
          }
          if (normalizedRole !== "user" && normalizedRole !== "assistant") {
            normalizedRole = "assistant"; // fallback
          }
          
          return {
            id: String(msg.id),
            role: normalizedRole,
            content: String(msg.content || ""),
            createdAt: msg.createdAt ? new Date(msg.createdAt).toISOString() : new Date().toISOString(),
          };
        });
        
        // Log what we're loading
        const userCount = formattedMessages.filter((m: any) => m.role === "user").length;
        console.log("[loadMessages] Loading messages for thread:", threadId, "Total:", formattedMessages.length, "Users:", userCount);
        
        setMessages(formattedMessages);
        
        // Return the message count so caller can check if thread is empty
        return formattedMessages.length;
      }
      return 0;
    } catch (error) {
      console.error("Failed to load messages:", error);
      return 0;
    }
  }

  async function loadWorkContext() {
    try {
      console.log("[loadWorkContext] Fetching context for experienceId:", experienceId);
      const res = await fetch(`/api/coach/context?experienceId=${encodeURIComponent(experienceId)}`);
      const data = await res.json();
      console.log("[loadWorkContext] API response:", data);
      
      const context = data.nicheKey && data.nicheLabel ? {
        nicheKey: data.nicheKey,
        nicheLabel: data.nicheLabel,
        currentProblem: data.currentProblem || null,
        hasContext: data.hasContext || false,
      } : null;
      
      setWorkContext(context);
      console.log("[loadWorkContext] Set context:", context);
      return context;
    } catch (error) {
      console.error("[loadWorkContext] Failed to load work context:", error);
      setWorkContext(null);
      return null;
    }
  }

  async function loadCoachName() {
    try {
      const res = await fetch(`/api/coach/name?experienceId=${encodeURIComponent(experienceId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.coachName) {
          setCoachName(data.coachName);
        }
      }
    } catch (error) {
      console.error("Failed to load coach name:", error);
    }
  }

  const [isOwner, setIsOwner] = useState(false);

  async function loadProStatus() {
    try {
      setProLoading(true);
      // Pass experienceId so owners can get auto Pro access
      const res = await fetch(`/api/pro/status?experienceId=${encodeURIComponent(experienceId)}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      const proStatus = Boolean(data?.isPro);
      setIsPro(proStatus);
    } catch (error) {
      console.error("Failed to load pro status:", error);
    } finally {
      setProLoading(false);
    }
  }

  async function loadUserInfo() {
    try {
      const res = await fetch(`/api/user/info?experienceId=${encodeURIComponent(experienceId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.displayName) setDisplayName(data.displayName);
        if (data.username) setUsername(data.username);
        if (data.avatarUrl) setAvatarUrl(data.avatarUrl);
        if (data.isOwner !== undefined) setIsOwner(Boolean(data.isOwner));
      }
    } catch (error) {
      console.error("Failed to load user info:", error);
      // Fallback: try to get from header element
      const header = document.querySelector('[data-avatar-url]');
      if (header) {
        const headerAvatar = header.getAttribute('data-avatar-url');
        if (headerAvatar) setAvatarUrl(headerAvatar);
        const headerDisplayName = header.getAttribute('data-display-name');
        if (headerDisplayName) setDisplayName(headerDisplayName);
        const headerUsername = header.getAttribute('data-username');
        if (headerUsername) setUsername(headerUsername);
      }
    }
  }

  useEffect(() => {
    loadThreads();
    loadWorkContext();
    loadCoachName();
    loadProStatus();
    loadUserInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experienceId]);

  // Redirect to upgrade if not Pro (after loading completes)
  useEffect(() => {
    if (!proLoading && !isPro) {
      router.push(`/experiences/${experienceId}/upgrade`);
    }
  }, [proLoading, isPro, experienceId, router]);

  useEffect(() => {
    if (activeThreadId) {
      // Load messages when thread changes
      loadMessages(activeThreadId);
    } else {
      // Clear messages if no thread selected
      setMessages([]);
      setHasAskedAboutContext(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeThreadId]);

  // Single effect to check context after messages load - only runs once per thread
  useEffect(() => {
    if (activeThreadId && workContext?.hasContext && !hasAskedAboutContext && messages.length === 0) {
      // Small delay to ensure messages state is updated
      const timer = setTimeout(() => {
        autoAskAboutContext();
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, workContext, activeThreadId, hasAskedAboutContext]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, sending]);

  async function newThread() {
    try {
      console.log("[newThread] Creating new thread for experienceId:", experienceId);
      const res = await fetch(`/api/coach/threads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ experienceId }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        console.error("[newThread] Failed to create thread:", res.status, errorData);
        alert(errorData?.error || "Failed to create chat");
        return;
      }
      
      const data = await res.json();
      console.log("[newThread] Thread created:", data);
      
      if (data.thread) {
        console.log("[newThread] Adding thread to state:", data.thread.id);
        setThreads((t) => [data.thread, ...t]);
        setActiveThreadId(data.thread.id);
        setHasAskedAboutContext(false); // Reset for new thread
        setMessages([]); // Clear messages for new thread
        
        // Load messages - the useEffect will handle auto-asking if needed
        await loadMessages(data.thread.id);
      } else {
        console.error("[newThread] No thread in response:", data);
        // Reload threads to get the latest
        await loadThreads();
      }
    } catch (error) {
      console.error("[newThread] Failed to create thread:", error);
      alert("Failed to create chat. Please try again.");
    }
  }

  async function autoAskAboutContext() {
    console.log("[autoAskAboutContext] Called", {
      hasContext: workContext?.hasContext,
      activeThreadId,
      hasAsked: hasAskedAboutContext,
      nicheLabel: workContext?.nicheLabel,
    });

    if (!workContext?.hasContext || !activeThreadId || hasAskedAboutContext) {
      console.log("[autoAskAboutContext] Skipping - conditions not met");
      return;
    }

    // Mark as asked IMMEDIATELY and synchronously to prevent duplicate calls
    // This must happen before any async operations
    setHasAskedAboutContext(true);

    const nicheLabel = workContext.nicheLabel || "your current niche";
    const problemText = workContext.currentProblem
      ? ` You're working on: "${workContext.currentProblem}"`
      : "";

    const contextMessage = `I see you're working on **${nicheLabel}**.${problemText} Would you like help with this?`;
    
    console.log("[autoAskAboutContext] Sending context message:", contextMessage);
    
    // Send the context message as the AI (system message)
    try {
      const res = await fetch(`/api/coach/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experienceId,
          threadId: activeThreadId,
          content: contextMessage,
          isSystemMessage: true, // Flag to indicate this is an auto-generated context message
        }),
      });

      if (res.ok) {
        const data = await res.json();
        console.log("[autoAskAboutContext] Response received", { messageCount: data.messages?.length });
        if (data.messages && Array.isArray(data.messages)) {
          const formattedMessages = data.messages.map((msg: any) => {
            let normalizedRole = String(msg.role || "").toLowerCase().trim();
            if (normalizedRole === "human" || normalizedRole === "USER") {
              normalizedRole = "user";
            }
            if (normalizedRole !== "user" && normalizedRole !== "assistant") {
              normalizedRole = "assistant";
            }
            return {
              id: String(msg.id),
              role: normalizedRole,
              content: String(msg.content || ""),
              createdAt: msg.createdAt ? new Date(msg.createdAt).toISOString() : new Date().toISOString(),
            };
          });
          setMessages(formattedMessages);
          console.log("[autoAskAboutContext] Messages updated in state");
        }
      } else {
        const errorData = await res.json().catch(() => null);
        console.error("[autoAskAboutContext] Failed to send context message:", errorData);
        setHasAskedAboutContext(false);
      }
    } catch (error) {
      console.error("[autoAskAboutContext] Error sending context message:", error);
      // Reset flag on error so it can retry
      setHasAskedAboutContext(false);
    }
  }

  async function deleteThread(threadId: string) {
    try {
      const res = await fetch(`/api/coach/threads/${threadId}`, {
        method: "DELETE",
      });
      
      const data = await res.json().catch(() => null);
      
      if (res.ok) {
        setThreads((t) => t.filter((th) => th.id !== threadId));
        if (activeThreadId === threadId) {
          setActiveThreadId(null);
          setMessages([]);
        }
      } else {
        console.error("Delete failed:", data);
        alert(data?.error || "Failed to delete chat");
      }
    } catch (error) {
      console.error("Failed to delete thread:", error);
      alert("Failed to delete chat");
    }
  }

  async function toggleFavorite(threadId: string, currentFavorite: boolean) {
    try {
      const res = await fetch(`/api/coach/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorite: !currentFavorite }),
      });
      if (res.ok) {
        const data = await res.json();
        setThreads((t) => t.map((th) => (th.id === threadId ? { ...th, favorite: data.thread.favorite } : th)));
      } else {
        alert("Failed to update favorite");
      }
    } catch (error) {
      console.error("Failed to toggle favorite:", error);
      alert("Failed to update favorite");
    }
  }

  async function renameThread(threadId: string, newTitle: string) {
    try {
      const res = await fetch(`/api/coach/threads/${threadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() || null }),
      });
      if (res.ok) {
        const data = await res.json();
        setThreads((t) => t.map((th) => (th.id === threadId ? { ...th, title: data.thread.title } : th)));
      } else {
        alert("Failed to rename chat");
      }
    } catch (error) {
      console.error("Failed to rename thread:", error);
      alert("Failed to rename chat");
    }
  }

  async function sendMessage(content: string, quickActionKey?: string) {
    if (!activeThreadId || !content.trim() || sending) {
      console.warn("Cannot send message:", { activeThreadId, hasContent: !!content.trim(), sending });
      return;
    }
    setSending(true);

    const messageContent = content.trim();
    
    // Optimistic UI - add user message IMMEDIATELY (shows instantly)
    const tempUserId = `temp_user_${Date.now()}`;
    
    // Ensure content is not empty
    if (!messageContent || messageContent.trim().length === 0) {
      console.error("[sendMessage] ERROR: Cannot send empty message");
      setSending(false);
      return;
    }
    
    const optimisticUserMessage: Msg = {
      id: tempUserId,
      role: "user",
      content: messageContent, // This is the trimmed content from input
      createdAt: new Date().toISOString(),
    };
    
    console.log("[sendMessage] Creating optimistic message:", {
      id: optimisticUserMessage.id,
      role: optimisticUserMessage.role,
      content: optimisticUserMessage.content,
      contentLength: optimisticUserMessage.content.length,
    });
    
    // Add to state immediately - user sees their message right away
    setMessages((prev) => {
      const updated = [...prev, optimisticUserMessage];
      console.log("[sendMessage] State updated. Total messages:", updated.length);
      console.log("[sendMessage] Last message:", updated[updated.length - 1]);
      return updated;
    });
    
    // Clear input after message is visible
    setInput("");

    try {
      const res = await fetch(`/api/coach/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          experienceId,
          threadId: activeThreadId,
          content: messageContent,
          quickAction: quickActionKey ?? null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        // rollback temp user message
        setMessages((m) => m.filter((x) => x.id !== tempUserId));
        alert(data?.error || "Failed to send message");
        setSending(false);
        return;
      }

      // Server response handling - NEVER wipe optimistic message unless server confirms it
      if (data.messages && Array.isArray(data.messages)) {
        // Format and normalize server messages
        const formattedMessages = data.messages.map((msg: any) => {
          let normalizedRole = String(msg.role || "").toLowerCase();
          if (normalizedRole === "human" || normalizedRole === "USER") {
            normalizedRole = "user";
          }
          if (normalizedRole !== "user" && normalizedRole !== "assistant") {
            normalizedRole = "assistant";
          }
          
          // Ensure content is properly extracted
          const content = msg.content != null ? String(msg.content) : "";
          
          // Debug: log if content is missing
          if (!content && normalizedRole === "user") {
            console.error("[sendMessage] Server message missing content:", {
              id: msg.id,
              role: msg.role,
              content: msg.content,
              contentType: typeof msg.content,
              fullMsg: msg,
            });
          }
          
          return {
            id: String(msg.id),
            role: normalizedRole,
            content: content,
            createdAt: msg.createdAt ? new Date(msg.createdAt).toISOString() : new Date().toISOString(),
          };
        });
        
        // Server returns ALL messages for the thread
        // Verify it includes our user message (check by content)
        const hasOurUserMessage = formattedMessages.some(
          (m: any) => m.role === "user" && m.content.trim() === messageContent.trim()
        );
        
        const serverUserCount = formattedMessages.filter((m: any) => m.role === "user").length;
        
        console.log("[sendMessage] Server response:", {
          total: formattedMessages.length,
          userCount: serverUserCount,
          hasOurMessage: hasOurUserMessage,
          roles: formattedMessages.map((m: any) => m.role),
        });
        
        if (hasOurUserMessage) {
          // Server confirmed - use server response (it's complete)
          setMessages(formattedMessages);
        } else if (serverUserCount > 0) {
          // Server has user messages but not ours (maybe content mismatch) - use server anyway
          console.warn("[sendMessage] Server has user messages but not ours - using server response");
          setMessages(formattedMessages);
        } else {
          // Server has NO user messages - keep optimistic, add assistant
          console.error("[sendMessage] Server has NO user messages! Keeping optimistic message");
          setMessages((prev) => {
            const withoutTemp = prev.filter((m) => m.id !== tempUserId);
            const assistantMsgs = formattedMessages.filter((m: any) => m.role === "assistant");
            return [...withoutTemp, optimisticUserMessage, ...assistantMsgs];
          });
        }
      } else {
        // Unexpected response format - keep optimistic message
        console.error("[sendMessage] Unexpected server response format");
        // Don't call loadMessages - it would wipe our optimistic message
        // Just keep what we have
      }
      await loadThreads(); // refresh ordering / updatedAt
    } catch (error) {
      console.error("Failed to send message:", error);
      // rollback temp user message
      setMessages((m) => m.filter((x) => x.id !== tempUserId));
      alert("Failed to send message");
    } finally {
      setSending(false);
    }
  }

  const [chatsMenuOpen, setChatsMenuOpen] = useState(false);

  // Logo component - Original colored SA logo
  const LogoIcon = () => (
    <div className="flex items-center justify-center">
      <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden shrink-0">
        <Image 
          src="/brand/Icon.png" 
          alt="Skill Accelerator" 
          width={128} 
          height={128} 
          className="w-full h-full object-cover"
          unoptimized
        />
      </div>
    </div>
  );

  // Small logo icon for messages - Original colored SA logo
  const MessageLogoIcon = () => (
    <div className="w-10 h-10 rounded-full overflow-hidden shrink-0">
      <Image 
        src="/brand/Icon.png" 
        alt="Skill Accelerator" 
        width={40} 
        height={40} 
        className="w-full h-full object-cover"
        unoptimized
      />
    </div>
  );

  return (
    <div className="flex h-screen bg-white">
      {/* Sidebar - Hidden by default, accessible via hamburger */}
      {chatsMenuOpen && (
        <div className="fixed inset-0 z-[60]">
          <div
            className="absolute inset-0 bg-black/20 pointer-events-auto"
            onClick={() => setChatsMenuOpen(false)}
          />
          <div className="fixed left-0 top-0 h-full w-[320px] bg-white p-4 shadow-xl pointer-events-auto z-[70]">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-semibold text-gray-900">
                Navigation
              </div>
              <Button
                variant="classic"
                size="2"
                type="button"
                onClick={() => setChatsMenuOpen(false)}
              >
                ✕
              </Button>
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <Link
                href={`/experiences/${experienceId}/home`}
                onClick={() => setChatsMenuOpen(false)}
                className="w-full rounded-xl px-3 py-2 text-sm text-slate-800 border border-transparent transition-all duration-200 hover:border-blue-300/60 hover:bg-white hover:shadow-[0_0_0_4px_rgba(59,130,246,0.10),0_14px_30px_rgba(59,130,246,0.10)] group relative flex items-center justify-between gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg border border-slate-200 bg-white grid place-items-center">
                      <Home className="h-4 w-4 text-slate-700" />
                    </div>
                    <span className="text-sm font-medium text-slate-800 truncate">
                      Home
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 opacity-60" />
                </div>
              </Link>

              <Link
                href={`/experiences/${experienceId}/n/custom`}
                onClick={() => setChatsMenuOpen(false)}
                className="w-full rounded-xl px-3 py-2 text-sm text-slate-800 border border-transparent transition-all duration-200 hover:border-blue-300/60 hover:bg-white hover:shadow-[0_0_0_4px_rgba(59,130,246,0.10),0_14px_30px_rgba(59,130,246,0.10)] group relative flex items-center justify-between gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg border border-slate-200 bg-white grid place-items-center">
                      <Target className="h-4 w-4 text-slate-700" />
                    </div>
                    <span className="text-sm font-medium text-slate-800 truncate">
                      Practice
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 opacity-60" />
                </div>
              </Link>

              {/* Admin Panel - Only for owners */}
              {isOwner && (
                <Link
                  href={`/experiences/${experienceId}/admin`}
                  onClick={() => setChatsMenuOpen(false)}
                  className="w-full rounded-xl px-3 py-2 text-sm text-slate-800 border border-transparent transition-all duration-200 hover:border-blue-300/60 hover:bg-white hover:shadow-[0_0_0_4px_rgba(59,130,246,0.10),0_14px_30px_rgba(59,130,246,0.10)] group relative flex items-center justify-between gap-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg border border-slate-200 bg-white grid place-items-center">
                        <Settings className="h-4 w-4 text-slate-700" />
                      </div>
                      <span className="text-sm font-medium text-slate-800 truncate">
                        Admin Panel
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 opacity-60" />
                  </div>
                </Link>
              )}

              {/* Support - For all users */}
              <Link
                href={`/experiences/${experienceId}/support`}
                onClick={() => setChatsMenuOpen(false)}
                className="w-full rounded-xl px-3 py-2 text-sm text-slate-800 border border-transparent transition-all duration-200 hover:border-blue-300/60 hover:bg-white hover:shadow-[0_0_0_4px_rgba(59,130,246,0.10),0_14px_30px_rgba(59,130,246,0.10)] group relative flex items-center justify-between gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg border border-slate-200 bg-white grid place-items-center">
                      <HelpCircle className="h-4 w-4 text-slate-700" />
                    </div>
                    <span className="text-sm font-medium text-slate-800 truncate">
                      Support
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 opacity-60" />
                </div>
              </Link>

              {/* Upgrade - For all users */}
              {!isPro && (
                <Link
                  href={`/experiences/${experienceId}/upgrade`}
                  onClick={() => setChatsMenuOpen(false)}
                  className="w-full rounded-xl px-3 py-2 text-sm text-slate-800 border border-transparent transition-all duration-200 hover:border-blue-300/60 hover:bg-white hover:shadow-[0_0_0_4px_rgba(59,130,246,0.10),0_14px_30px_rgba(59,130,246,0.10)] group relative flex items-center justify-between gap-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg border border-slate-200 bg-white grid place-items-center">
                        <Sparkles className="h-4 w-4 text-slate-700" />
                      </div>
                      <span className="text-sm font-medium text-slate-800 truncate">
                        Upgrade to Pro
                      </span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400 opacity-60" />
                  </div>
                </Link>
              )}

              <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
                Chats
              </div>

              <button
                onClick={newThread}
                className="w-full rounded-xl px-3 py-2 text-sm text-slate-800 border border-transparent transition-all duration-200 hover:border-blue-300/60 hover:bg-white hover:shadow-[0_0_0_4px_rgba(59,130,246,0.10),0_14px_30px_rgba(59,130,246,0.10)] group relative flex items-center justify-between gap-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg border border-slate-200 bg-white grid place-items-center">
                      <span className="text-slate-700 font-semibold">+</span>
                    </div>
                    <span className="text-sm font-medium text-slate-800 truncate">
                      New chat
                    </span>
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-400 opacity-60" />
                </div>
              </button>

              <div className="flex-1 overflow-y-auto mt-2 flex flex-col gap-2">
                {threads.length === 0 ? (
                  <div className="text-xs text-gray-500 px-3 py-4 text-center">
                    No chats yet
                  </div>
                ) : (
                  threads.map((t) => (
                    <ThreadItem
                      key={t.id}
                      thread={t}
                      isActive={t.id === activeThreadId}
                      onSelect={() => {
                        setActiveThreadId(t.id);
                        setChatsMenuOpen(false);
                      }}
                      onDelete={() => deleteThread(t.id)}
                      onFavorite={() => toggleFavorite(t.id, t.favorite || false)}
                      onRename={(newTitle) => renameThread(t.id, newTitle)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Area - ChatGPT style */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Hamburger menu button for chats */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <button
            onClick={() => setChatsMenuOpen(true)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Menu className="h-5 w-5 text-gray-700" />
          </button>
          <div className="text-sm font-semibold text-gray-900">{coachName}</div>
          
          {/* Right side - User info and Pro/Upgrade */}
          <div className="flex items-center gap-3">
            {!proLoading && (
              <Button
                variant={isPro ? "soft" : "classic"}
                size="2"
                type="button"
                onClick={() =>
                  isPro ? undefined : router.push(`/experiences/${experienceId}/upgrade`)
                }
                className="rounded-lg"
                disabled={isPro}
              >
                {isPro ? "Pro" : "Upgrade"}
              </Button>
            )}

            {(displayName || username) && (
              <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
                <div className="h-8 w-8 overflow-hidden rounded-full border border-gray-200 bg-gray-50 grid place-items-center text-[12px] font-semibold text-gray-700">
                  {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarUrl}
                      alt={displayName || username}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (displayName?.[0] || username?.[0] || "?").toUpperCase()
                  )}
                </div>
                <div className="leading-tight">
                  <div className="text-[13px] font-semibold text-gray-900">
                    {displayName || username}
                  </div>
                  {username && displayName && (
                    <div className="text-[11px] text-gray-500">@{username}</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-8">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
                <LogoIcon />
                <h1 className="mt-8 text-3xl font-semibold text-gray-900 mb-2">
                  How can I help you today?
                </h1>
              </div>
            ) : (
              <div className="space-y-6">
                {messages
                  .filter((m) => {
                    if (m.content === "Thinking..." && m.role === "assistant") return false;
                    return true;
                  })
                  .map((m, idx) => {
                    const role = String(m.role || "").toLowerCase().trim();
                    const isUser = role === "user" || role === "human";
                    const content = m.content != null ? String(m.content) : "";

                    if (isUser) {
                      return (
                        <div key={m.id} className="flex gap-4 group">
                          <div className="flex-1 flex justify-end">
                            <div className="max-w-[85%] rounded-2xl bg-gray-100 px-4 py-3 text-sm leading-relaxed">
                              <p className="text-gray-900 whitespace-pre-wrap">{content}</p>
                            </div>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0 overflow-hidden">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt="User" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs font-medium text-gray-700">U</span>
                            )}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={m.id} className="flex gap-4 group">
                        <MessageLogoIcon />
                        <div className="flex-1">
                          <div className="max-w-[85%] rounded-2xl bg-gray-50 px-4 py-3 text-sm leading-relaxed">
                            {content ? (
                              <MessageContent content={content} />
                            ) : (
                              <p className="text-gray-500">[No content]</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                {sending && (
                  <div className="flex gap-4">
                    <MessageLogoIcon />
                    <div className="flex-1">
                      <div className="max-w-[85%] rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-500">
                        Thinking...
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Input Area - ChatGPT style */}
        <div className="border-t border-gray-200 bg-white">
          <div className="max-w-3xl mx-auto px-4 py-4">
            {messages.length === 0 && (
              <div className="mb-3 flex flex-wrap gap-2 justify-center">
                {QUICK_ACTIONS.map((a) => (
                  <button
                    key={a.key}
                    disabled={sending || !activeThreadId}
                    onClick={() => {
                      if (activeThreadId && !sending) {
                        sendMessage(
                          input || `Use this mode: ${a.label}. Ask me what you need from me first.`,
                          a.key,
                        );
                      }
                    }}
                    className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm transition hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            )}
            <div className="relative">
              <div className="flex items-end gap-2 rounded-2xl border border-gray-300 bg-white shadow-sm hover:shadow-md transition-shadow focus-within:border-gray-400 focus-within:shadow-md">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (input.trim() && activeThreadId && !sending) {
                        sendMessage(input);
                      }
                    }
                  }}
                  placeholder={messages.length === 0 ? `Message ${coachName}...` : `Message ${coachName}...`}
                  disabled={!activeThreadId || sending}
                  className="flex-1 resize-none rounded-2xl px-4 py-3 text-sm focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed bg-transparent"
                  rows={1}
                  style={{ minHeight: '52px', maxHeight: '200px' }}
                />
                <button
                  disabled={sending || !input.trim() || !activeThreadId}
                  onClick={() => {
                    if (input.trim() && activeThreadId && !sending) {
                      sendMessage(input);
                    }
                  }}
                  className="mb-2 mr-2 p-2 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
            {!activeThreadId && (
              <p className="mt-2 text-xs text-gray-500 text-center">
                Please create a new chat to start
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

