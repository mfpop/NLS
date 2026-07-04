import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@apollo/client/react";
import { gql } from "@apollo/client";
import { MessageSquare, RefreshCw, Send, Loader2, Users, Plus, X, Check, Paperclip, FileText, Image, Download, Star } from "lucide-react";
import { theme } from "@/styles/themeTokens";
import { AppPageLayout } from "@/pages/shared/AppPageLayout";
import { PageToolbar, ToolbarButton, ToolbarDropdown } from "@/components/layout/PageToolbar";
import { useAuth } from "@/auth/AuthContext";
import {
  CHAT_CONTACTS_QUERY,
  CHAT_THREADS_QUERY,
  OPEN_DIRECT_CHAT_MUTATION,
  SEND_CHAT_MESSAGE_MUTATION,
  MARK_CHAT_THREAD_READ_MUTATION,
  CREATE_GROUP_CHAT_MUTATION,
  TOGGLE_CHAT_FAVORITE_MUTATION,
} from "@/graphql/chatQueries";

const CHAT_MESSAGES_QUERY = gql`
  query ChatMessages($threadId: ID!, $limit: Int) {
    chatMessages(threadId: $threadId, limit: $limit) {
      id
      sender {
        id
        username
        email
        displayName
      }
      body
      createdAt
      isMine
      attachments {
        id
        fileUrl
        fileName
        fileSize
        mimeType
      }
    }
  }
`;

/* ── Types ── */

interface UserInfo {
  id: string;
  username: string;
  email: string;
  displayName: string;
}

interface ChatParticipant {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
}

interface ChatThread {
  id: string;
  threadType: string;
  title: string;
  participants: ChatParticipant[];
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
  isFavorited: boolean;
}

interface ChatAttachment {
  id: string;
  fileUrl: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

interface ChatMessage {
  id: string;
  sender: UserInfo;
  body: string;
  createdAt: string;
  isMine: boolean;
  attachments: ChatAttachment[];
}

interface MutationError {
  field: string;
  code: string;
  message: string;
}

/* ── Helpers ── */

function initials(name: string): string {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function otherParticipant(thread: ChatThread, currentUserId: string): ChatParticipant | undefined {
  return thread.participants.find((p) => p.userId !== currentUserId);
}

function threadDisplayName(thread: ChatThread, currentUserId: string): string {
  if (thread.threadType === "GROUP") {
    return thread.title || `Group (${thread.participants.length})`;
  }
  return otherParticipant(thread, currentUserId)?.displayName || "Unknown";
}

function threadDisplayIcon(thread: ChatThread, currentUserId: string): React.ReactNode {
  const name = threadDisplayName(thread, currentUserId);
  return thread.threadType === "GROUP" ? (
    <Users className="h-4 w-4 text-muted-foreground" />
  ) : (
    <span className="text-[11px] font-bold text-muted-foreground">{initials(name)}</span>
  );
}

const FILTER_OPTIONS = [
  { value: "", label: "All" },
  { value: "favorites", label: "Favorites" },
  { value: "unread", label: "Unread" },
];

/* ── Contact Row ── */

function ContactRow({
  contact,
  isSelected,
  onClick,
}: {
  contact: { id: string; displayName: string; lastMessagePreview?: string | null };
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`group mx-1 my-0.5 flex h-16 cursor-pointer items-center gap-2.5 px-3 transition-all duration-150 ${
        isSelected
          ? "bg-table-selected border-l-2 border-l-amber-500"
          : "border-l-2 border-l-transparent hover:bg-table-row-hover"
      }`}
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
        {initials(contact.displayName)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className={`min-w-0 truncate text-sm font-semibold ${theme.textPrimary}`}>{contact.displayName}</span>
        </div>
        {contact.lastMessagePreview && (
          <span className="block truncate text-xs text-muted-foreground">{contact.lastMessagePreview}</span>
        )}
      </div>
    </div>
  );
}

/* ── Thread Row ── */

function ThreadRow({
  thread,
  currentUserId,
  isSelected,
  onToggleFavorite,
  onClick,
}: {
  thread: ChatThread;
  currentUserId: string;
  isSelected: boolean;
  onToggleFavorite: (e: React.MouseEvent, threadId: string) => void;
  onClick: () => void;
}) {
  const name = threadDisplayName(thread, currentUserId);
  const isGroup = thread.threadType === "GROUP";
  return (
    <div
      onClick={onClick}
      className={`group mx-1 my-0.5 flex h-16 cursor-pointer items-center gap-2.5 px-3 transition-all duration-150 ${
        isSelected
          ? "bg-table-selected border-l-2 border-l-amber-500"
          : "border-l-2 border-l-transparent hover:bg-table-row-hover"
      }`}
    >
      {/* Favorite star */}
      <button
        type="button"
        onClick={(e) => onToggleFavorite(e, thread.id)}
        className="shrink-0 flex items-center justify-center h-5 w-5 rounded-full transition-colors hover:bg-yellow-100 opacity-0 group-hover:opacity-100 data-[favorited=true]:opacity-100"
        data-favorited={thread.isFavorited}
        title={thread.isFavorited ? "Remove from favorites" : "Add to favorites"}
      >
        {thread.isFavorited ? (
          <Star className="h-3.5 w-3.5 text-warning fill-yellow-500" />
        ) : (
          <Star className="h-3.5 w-3.5 text-muted-foreground/30 hover:text-warning" />
        )}
      </button>
      <div className={`relative flex h-8 w-8 shrink-0 items-center justify-center ${isGroup ? "bg-card border border-border" : "rounded-full bg-card"} text-xs font-bold text-muted-foreground ${isGroup ? "rounded-[4px]" : "rounded-full"}`}>
        {threadDisplayIcon(thread, currentUserId)}
        {thread.unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-info text-[9px] font-bold text-white">
            {thread.unreadCount > 9 ? "9+" : thread.unreadCount}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className={`min-w-0 truncate text-sm font-semibold ${theme.textPrimary}`}>{name}</span>
          {isGroup && <span className="shrink-0 text-[9px] font-medium text-muted-foreground uppercase tracking-wide">Group</span>}
        </div>
        {thread.lastMessagePreview && (
          <span className="block truncate text-xs text-muted-foreground">{thread.lastMessagePreview}</span>
        )}
      </div>
      {thread.lastMessageAt && (
        <span className="shrink-0 text-[10px] text-muted-foreground">{formatTime(thread.lastMessageAt)}</span>
      )}
    </div>
  );
}

/* ── Helpers for attachment display ── */

function isImageMime(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function attachmentIcon(mimeType: string): React.ReactNode {
  if (isImageMime(mimeType)) return <Image className="h-4 w-4 text-accent-foreground" />;
  return <FileText className="h-4 w-4 text-muted-foreground" />;
}

/* ── Message Bubble ── */

function MessageBubble({ message }: { message: ChatMessage }) {
  const hasAttachments = message.attachments && message.attachments.length > 0;

  return (
    <div className={`flex ${message.isMine ? "justify-end" : "justify-start"} px-4 py-1`}>
      <div
        className={`max-w-[70%] rounded-[4px] px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words ${
          message.isMine
            ? "bg-primary/10 border border-blue-100 text-foreground"
            : "bg-background border border-border text-foreground"
        }`}
      >
        <p className="text-[11px] font-medium text-muted-foreground mb-0.5">
          {message.isMine ? "You" : message.sender.displayName || message.sender.username}
        </p>

        {message.body && <p className="mb-1">{message.body}</p>}

        {/* Attachments */}
        {hasAttachments && (
          <div className={`space-y-1 ${message.body ? "mt-1.5" : ""}`}>
            {message.attachments.map((att) => {
              const isImage = isImageMime(att.mimeType);
              return (
                <div key={att.id}>
                  {isImage ? (
                    <a href={att.fileUrl} target="_blank" rel="noopener noreferrer" className="block">
                      <img
                        src={att.fileUrl}
                        alt={att.fileName}
                        className="max-w-full max-h-48 rounded-[2px] border border-border object-cover hover:opacity-90 transition-opacity cursor-pointer"
                      />
                    </a>
                  ) : (
                    <a
                      href={att.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`flex items-center gap-2 px-2.5 py-1.5 rounded-[2px] text-xs transition-colors ${
                        message.isMine
                          ? "bg-primary/15/60 hover:bg-primary/15"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      {attachmentIcon(att.mimeType)}
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{att.fileName}</p>
                        <p className="text-[10px] text-muted-foreground">{formatFileSize(att.fileSize)}</p>
                      </div>
                      <Download className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[10px] text-muted-foreground/60 text-right mt-1">{formatTime(message.createdAt)}</p>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ChatMessagesPanel — sub-component with its own useQuery
   Keyed by threadId so Apollo creates a fresh query per thread
   ══════════════════════════════════════════════════════════════ */

function ChatMessagesPanel({
  threadId,
  onNewMessage,
}: {
  threadId: string;
  onNewMessage: (count: number) => void;
}) {
  const { data, loading, refetch } = useQuery<{ chatMessages: ChatMessage[] }>(CHAT_MESSAGES_QUERY, {
    variables: { threadId, limit: 100 },
    fetchPolicy: "cache-and-network",
    pollInterval: 10000,
  });

  const messages = data?.chatMessages || [];
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Notify parent of received message count
  useEffect(() => {
    onNewMessage(messages.length);
  }, [messages.length, onNewMessage]);

  // Expose refetch for parent toolbar refresh
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__chatMessagesRefetch = refetch;
    return () => {
      delete (window as unknown as Record<string, unknown>).__chatMessagesRefetch;
    };
  }, [refetch]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (loading && messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin mr-2" />
        Loading messages...
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-8">
        <MessageSquare className="h-8 w-8 text-slate-200 mb-2" />
        <p className="text-xs font-medium text-muted-foreground">No messages yet</p>
        <p className="text-[10px] text-muted-foreground/60 mt-0.5">Send a message to start the conversation.</p>
      </div>
    );
  }

  return (
    <div className="py-2 space-y-1">
      {[...messages].reverse().map((m) => (
        <MessageBubble key={m.id} message={m} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════════ */

export function ChatPage() {
  const { user } = useAuth();
  const currentUserId = user?.id?.toString() || "";
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [composingText, setComposingText] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"threads" | "contacts">("threads");
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentUploadError, setAttachmentUploadError] = useState<string | null>(null);
  const [visibleMessageCount, setVisibleMessageCount] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ── Queries ── */

  const {
    data: threadsData,
    loading: threadsLoading,
    refetch: refetchThreads,
  } = useQuery<{ chatThreads: ChatThread[] }>(CHAT_THREADS_QUERY, {
    variables: { search: search || undefined, filterType: filter || undefined },
    fetchPolicy: "cache-and-network",
    pollInterval: 15000,
  });

  const {
    data: contactsData,
    loading: contactsLoading,
  } = useQuery<{ chatContacts: Array<{ id: string; displayName: string }> }>(CHAT_CONTACTS_QUERY, {
    variables: { search: activeTab === "contacts" ? search || undefined : undefined },
    fetchPolicy: "cache-and-network",
  });

  /* ── Mutations ── */

  const [openDirectChat] = useMutation<{
    openDirectChat: { thread: ChatThread | null; errors?: MutationError[] | null };
  }>(OPEN_DIRECT_CHAT_MUTATION);

  const [sendChatMessage, { loading: sendingMessage }] = useMutation<{
    sendChatMessage: { message: ChatMessage | null; thread: ChatThread | null; errors?: MutationError[] | null };
  }>(SEND_CHAT_MESSAGE_MUTATION);

  const [markThreadRead] = useMutation<{
    markChatThreadRead: { thread: { id: string; unreadCount: number } | null; errors?: MutationError[] | null };
  }>(MARK_CHAT_THREAD_READ_MUTATION);

  const [createGroupChat, { loading: creatingGroup }] = useMutation<{
    createGroupChat: { thread: ChatThread | null; errors?: MutationError[] | null };
  }>(CREATE_GROUP_CHAT_MUTATION);

  const [toggleFavorite] = useMutation<{
    toggleChatFavorite: { thread: { id: string; isFavorited: boolean; unreadCount: number } | null; errors?: MutationError[] | null };
  }>(TOGGLE_CHAT_FAVORITE_MUTATION);

  /* ── Derived data ── */

  const threads = threadsData?.chatThreads || [];
  const contacts = contactsData?.chatContacts || [];

  // Apply filter: when "favorites", return only favorited threads
  // Sort: favorited threads always on top, then by last_message_at
  const filteredThreads = ((filter === "favorites"
    ? threads.filter((t) => t.isFavorited)
    : filter === "unread"
      ? threads.filter((t) => t.unreadCount > 0)
      : [...threads]
  ) as typeof threads).sort((a, b) => {
    // Favorited first
    if (a.isFavorited && !b.isFavorited) return -1;
    if (!a.isFavorited && b.isFavorited) return 1;
    // Then by lastMessageAt (most recent first)
    if (a.lastMessageAt && b.lastMessageAt) {
      return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
    }
    if (a.lastMessageAt) return -1;
    if (b.lastMessageAt) return 1;
    return 0;
  });

  const selectedThread = selectedThreadId
    ? threads.find((t) => t.id === selectedThreadId) ?? null
    : null;

  const selectedOther = selectedThread && selectedThread.threadType !== "GROUP"
    ? otherParticipant(selectedThread, currentUserId)
    : null;

  /* ── Group creation handler ── */

  const hCreateGroup = useCallback(async () => {
    const title = groupTitle.trim();
    if (!title || selectedContactIds.length < 2) {
      setGroupError("Title required and at least 2 other participants.");
      return;
    }
    setGroupError(null);
    try {
      const res = await createGroupChat({ variables: { title, participantIds: selectedContactIds } });
      const errs = res.data?.createGroupChat?.errors;
      if (errs && errs.length > 0) {
        setGroupError(errs[0].message);
        return;
      }
      const thread = res.data?.createGroupChat?.thread;
      if (thread) {
        setSelectedThreadId(thread.id);
        setShowGroupDialog(false);
        setGroupTitle("");
        setSelectedContactIds([]);
        refetchThreads();
      }
    } catch {
      setGroupError("Failed to create group. Please try again.");
    }
  }, [groupTitle, selectedContactIds, createGroupChat, refetchThreads]);

  /* ── Mark thread as read when selected ── */

  useEffect(() => {
    if (selectedThreadId) {
      markThreadRead({ variables: { threadId: selectedThreadId } }).then(() => {
        refetchThreads();
      });
    }
  }, [selectedThreadId, markThreadRead, refetchThreads]);

  /* ── Auto-resize textarea ── */

  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }
  }, [composingText]);

  /* ── Handlers ── */

  const hRefresh = useCallback(() => {
    refetchThreads();
    const rf = (window as unknown as Record<string, unknown>).__chatMessagesRefetch;
    if (typeof rf === "function") rf();
  }, [refetchThreads]);

  const hNewGroup = useCallback(() => {
    setShowGroupDialog(true);
    setGroupTitle("");
    setSelectedContactIds([]);
    setGroupError(null);
  }, []);

  const hToggleFavorite = useCallback(async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    try {
      await toggleFavorite({ variables: { threadId } });
      refetchThreads();
    } catch {
      // silent
    }
  }, [toggleFavorite, refetchThreads]);

  const hSelectContact = useCallback(async (contactId: string) => {
    try {
      const res = await openDirectChat({ variables: { userId: contactId } });
      const thread = res.data?.openDirectChat?.thread;
      if (thread) {
        setSelectedThreadId(thread.id);
        refetchThreads();
      }
    } catch {
      // handled by UI error state
    }
  }, [openDirectChat, refetchThreads]);

  const hUploadAttachment = useCallback(async (file: File) => {
    setUploadingAttachment(true);
    setAttachmentUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const resp = await fetch("/api/upload-chat-attachment/", {
        method: "POST",
        body: formData,
      });
      if (!resp.ok) {
        let msg = `Upload failed (${resp.status})`;
        try {
          const err = await resp.json();
          msg = err.message ?? msg;
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      const data = await resp.json();
      if (!data.ok) throw new Error(data.message ?? "Upload failed");
      setPendingAttachments((prev) => [
        ...prev,
        { id: "", fileUrl: data.url, fileName: data.file_name, fileSize: data.file_size, mimeType: data.mime_type },
      ]);
    } catch (err) {
      setAttachmentUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingAttachment(false);
    }
  }, []);

  const hRemoveAttachment = useCallback((index: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const hPickAttachment = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const hFileSelected = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      hUploadAttachment(file);
      e.target.value = "";
    }
  }, [hUploadAttachment]);

  const hSendMessage = useCallback(async () => {
    const body = composingText.trim();
    if ((!body && pendingAttachments.length === 0) || !selectedThreadId) return;
    setSendError(null);
    try {
      const vars: Record<string, unknown> = { threadId: selectedThreadId, body };
      if (pendingAttachments.length > 0) {
        vars.attachments = pendingAttachments.map((a) => ({
          url: a.fileUrl,
          fileName: a.fileName,
          fileSize: a.fileSize,
          mimeType: a.mimeType,
        }));
      }
      const res = await sendChatMessage({ variables: vars });
      const errs = res.data?.sendChatMessage?.errors;
      if (errs && errs.length > 0) {
        setSendError(errs[0].message);
        return;
      }
      setComposingText("");
      setPendingAttachments([]);
      const rf = (window as unknown as Record<string, unknown>).__chatMessagesRefetch;
      if (typeof rf === "function") rf();
      refetchThreads();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setSendError(`Failed to send: ${msg}`);
      console.error("sendChatMessage error:", err);
    }
  }, [composingText, selectedThreadId, pendingAttachments, sendChatMessage, refetchThreads]);

  const hKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      hSendMessage();
    }
  }, [hSendMessage]);

  const hMessageCount = useCallback((count: number) => {
    setVisibleMessageCount(count);
  }, []);

  /* ── Render: Left Column ── */

  const leftColumn = (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-muted border-r border-border-major">
      {/* Tabs: Threads / Contacts */}
      <div className="shrink-0 flex border-b border-border-major bg-muted">
        <div className="flex-1 flex items-center h-10 px-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setActiveTab("threads")}
              className={`text-xs font-semibold transition-colors ${
                activeTab === "threads"
                  ? "bg-primary text-primary-foreground px-2 py-0.5 rounded-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted px-2 py-0.5 rounded-sm"
              }`}
            >
              Conversations
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("contacts")}
              className={`text-xs font-semibold transition-colors ${
                activeTab === "contacts"
                  ? "bg-primary text-primary-foreground px-2 py-0.5 rounded-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted px-2 py-0.5 rounded-sm"
              }`}
            >
              People
            </button>
          </div>
          <div className="flex-1" />
          <span className="inline-flex items-center justify-center h-[18px] min-w-[22px] px-1.5 text-[11px] font-semibold rounded-sm border border-border bg-card text-muted-foreground whitespace-nowrap">
            {activeTab === "threads" ? filteredThreads.length : contacts.length}
          </span>
        </div>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-muted scroll-thin">
        {activeTab === "threads" ? (
          <>
            {threadsLoading && threads.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin mr-2" />
                Loading...
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                <p className="text-xs font-medium text-muted-foreground">No conversations found</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">Select a person to start chatting.</p>
              </div>
            ) : (
              <div>
                {filteredThreads.map((t) => (
                  <ThreadRow
                    key={t.id}
                    thread={t}
                    currentUserId={currentUserId}
                    isSelected={t.id === selectedThreadId}
                    onToggleFavorite={hToggleFavorite}
                    onClick={() => setSelectedThreadId(t.id)}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {contactsLoading && contacts.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin mr-2" />
                Loading...
              </div>
            ) : contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-32 text-center px-4">
                <p className="text-xs font-medium text-muted-foreground">No people found</p>
                <p className="text-[10px] text-muted-foreground/60 mt-0.5">Try a different search.</p>
              </div>
            ) : (
              <div>
                {contacts.map((c) => (
                  <ContactRow
                    key={c.id}
                    contact={{ id: c.id, displayName: c.displayName }}
                    isSelected={false}
                    onClick={() => hSelectContact(c.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}          <div className="shrink-0 border-t border-border-major bg-muted px-3 py-1.5 flex items-center text-xs text-muted-foreground">
        {activeTab === "threads" ? (
          <span className="font-medium">{filteredThreads.length} conversation{filteredThreads.length !== 1 ? "s" : ""}</span>
        ) : (
          <span className="font-medium">{contacts.length} contact{contacts.length !== 1 ? "s" : ""}</span>
        )}
      </div>
    </div>
  );

  /* ── Render: Main Content ── */

  const mainContent = selectedThread ? (
    <div className="h-full flex flex-col bg-muted" key={selectedThreadId}>
      {/* Conversation header */}
      <div className="shrink-0 h-12 border-b border-border bg-muted flex items-center gap-2.5 px-4">
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center ${selectedThread.threadType === "GROUP" ? "bg-muted border border-border rounded-[4px]" : "rounded-full bg-muted/80"} text-[11px] font-bold text-muted-foreground`}>
          {selectedThread.threadType === "GROUP" ? (
            <Users className="h-4 w-4 text-muted-foreground" />
          ) : (
            initials(selectedOther?.displayName || "")
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {threadDisplayName(selectedThread, currentUserId)}
          </p>
          {selectedThread.threadType === "GROUP" && (
            <p className="text-[10px] text-muted-foreground truncate">
              {selectedThread.participants.map((p) => p.displayName).join(", ")}
            </p>
          )}
        </div>
      </div>

      {/* Messages — sub-component keyed by threadId forces fresh useQuery */}
      <div className="flex-1 min-h-0 overflow-y-auto bg-muted scroll-thin">
        <ChatMessagesPanel
          key={selectedThreadId}
          threadId={selectedThreadId as string}
          onNewMessage={hMessageCount}
        />
      </div>

      {/* Composer */}
      <div className="shrink-0 border-t border-border bg-muted">
        {/* Pending attachments */}
        {pendingAttachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 px-4 pt-2 pb-0">
            {pendingAttachments.map((att, idx) => (
              <div key={idx} className="flex items-center gap-1.5 h-8 px-2 rounded-[2px] bg-accent/10 border border-sky-100 text-xs">
                {isImageMime(att.mimeType) ? (
                  <Image className="h-3.5 w-3.5 text-accent-foreground" />
                ) : (
                  <FileText className="h-3.5 w-3.5 text-accent-foreground" />
                )}
                <span className="max-w-[120px] truncate text-sky-800">{att.fileName}</span>
                <span className="text-[10px] text-accent-foreground">{formatFileSize(att.fileSize)}</span>
                <button type="button" onClick={() => hRemoveAttachment(idx)} className="p-0.5 text-sky-400 hover:text-danger transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {attachmentUploadError && (
          <p className="text-[11px] font-medium text-danger px-4 pt-1">{attachmentUploadError}</p>
        )}

        <div className="px-4 py-3">
          {sendError && (
            <p className="text-[11px] font-medium text-danger mb-1">{sendError}</p>
          )}
          <div className="flex items-end gap-1.5">
            <button
              type="button"
              onClick={hPickAttachment}
              disabled={uploadingAttachment}
              title="Attach file"
              className="shrink-0 flex h-9 w-9 items-center justify-center rounded-[2px] text-muted-foreground hover:text-accent-foreground hover:bg-accent/10 disabled:opacity-40 transition-colors"
            >
              {uploadingAttachment ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </button>
            <textarea
              ref={textareaRef}
              value={composingText}
              onChange={(e) => setComposingText(e.target.value)}
              onKeyDown={hKeyDown}
              placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
              rows={1}
              className="flex-1 min-h-[36px] max-h-[120px] resize-none rounded-[2px] border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 outline-none focus:border-sky-500 focus:ring-0 leading-relaxed"
            />
            <button
              type="button"
              onClick={hSendMessage}
              disabled={(!composingText.trim() && pendingAttachments.length === 0) || sendingMessage}
              className="shrink-0 flex h-9 w-9 items-center justify-center rounded-[2px] bg-accent/100 text-white hover:bg-sky-600 active:bg-sky-700 disabled:pointer-events-none disabled:opacity-40 transition-colors"
            >
              {sendingMessage ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={hFileSelected}
          className="hidden"
          accept=".jpg,.jpeg,.png,.gif,.webp,.svg,.pdf,.docx,.xlsx,.txt,.csv,.json,.zip"
        />
      </div>
    </div>
  ) : (
    <div className="h-full flex flex-col items-center justify-center bg-muted text-center px-8">
      <MessageSquare className="h-12 w-12 text-slate-200 mb-3" />
      <p className="text-sm font-medium text-muted-foreground">Select a contact or group</p>
      <p className="text-xs text-muted-foreground/60 mt-1">Choose a conversation from the left or create a new group chat.</p>
    </div>
  );

  /* ── Group Creation Dialog ── */

  const groupDialog = showGroupDialog && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowGroupDialog(false)}>
      <div className="w-[420px] max-h-[80vh] overflow-y-auto bg-background rounded-[4px] shadow-xl border border-border" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between h-12 px-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">New Group Chat</h3>
          <button type="button" onClick={() => setShowGroupDialog(false)} className="p-1 text-muted-foreground/60 hover:text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Group Title */}
        <div className="px-4 py-3 border-b border-border/50">
          <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Group Name</label>
          <input
            type="text"
            value={groupTitle}
            onChange={(e) => setGroupTitle(e.target.value)}
            placeholder="e.g. Quality Team"
            className="w-full h-8 rounded-[2px] border border-border px-2 text-xs text-foreground outline-none focus:border-sky-500"
          />
        </div>

        {/* Select Participants */}
        <div className="px-4 py-3 border-b border-border/50">
          <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">
            Add Participants (select at least 2)
          </label>
          <div className="max-h-[200px] overflow-y-auto space-y-0.5">
            {contacts.length === 0 ? (
              <p className="text-xs text-muted-foreground/60 italic py-2">Loading contacts...</p>
            ) : (
              contacts.map((c) => {
                const isSelected = selectedContactIds.includes(c.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedContactIds((prev) =>
                        isSelected ? prev.filter((id) => id !== c.id) : [...prev, c.id],
                      );
                    }}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-[2px] cursor-pointer text-xs ${
                      isSelected ? "bg-accent/10 text-sky-800" : "hover:bg-muted text-foreground"
                    }`}
                  >
                    <div className={`h-4 w-4 shrink-0 rounded-[2px] border flex items-center justify-center ${
                      isSelected ? "bg-accent/100 border-sky-500" : "border-border"
                    }`}>
                      {isSelected && <Check className="h-3 w-3 text-white stroke-[3]" />}
                    </div>
                    <span>{c.displayName}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Error */}
        {groupError && (
          <div className="px-4 py-2">
            <p className="text-[11px] font-medium text-danger">{groupError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
          <button
            type="button"
            onClick={() => setShowGroupDialog(false)}
            className="h-8 px-3 rounded-[2px] border border-border bg-background text-xs text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={hCreateGroup}
            disabled={!groupTitle.trim() || selectedContactIds.length < 2 || creatingGroup}
            className="h-8 px-3 rounded-[2px] bg-accent/100 text-xs text-white font-medium hover:bg-sky-600 disabled:opacity-40 disabled:pointer-events-none flex items-center gap-1.5"
          >
            {creatingGroup ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Create Group
          </button>
        </div>
      </div>
    </div>
  );

  /* ── Render: Final Layout ── */

  return (
    <AppPageLayout
      title="Chat"
      subtitle="Direct team conversations and workspace messages."
      icon={<MessageSquare />}
      iconClass="bg-primary/10 text-primary"
      toolbar={
        <PageToolbar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search people or chats..."
          filters={<ToolbarDropdown value={filter} onChange={setFilter} options={FILTER_OPTIONS} placeholder="Filter" width="w-28" />}
          actions={<>
            <ToolbarButton icon={Users} label="New Group" onClick={hNewGroup} variant="create" />
            <ToolbarButton icon={RefreshCw} label="Refresh" onClick={hRefresh} variant="neutral" />
          </>}
        />
      }
      leftColumn={leftColumn}
      leftColumnWidth="w-[20%]"
      footer={
        <span className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="font-medium">Chat</span>
          <span className="flex-1" />
          {selectedThread
            ? `${visibleMessageCount} message${visibleMessageCount !== 1 ? "s" : ""} · ${selectedThread.threadType === "GROUP" ? `${selectedThread.participants.length} participants` : `with ${selectedOther?.displayName || ""}`}`
            : `${filteredThreads.length} conversation${filteredThreads.length !== 1 ? "s" : ""}`}
          <span className="text-muted-foreground/60">
            {selectedThread?.lastMessageAt
              ? `Last updated: ${formatTime(selectedThread.lastMessageAt)}`
              : ""}
          </span>
        </span>
      }
    >
      {mainContent}
      {groupDialog}
    </AppPageLayout>
  );
}
