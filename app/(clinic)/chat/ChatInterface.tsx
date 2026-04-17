"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { toggleBotActive } from "./actions";
import { Send, Image as ImageIcon, Trash2, Bot, User as UserIcon, Loader2, MessageCircle, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Message = {
  id?: string;
  role: "user" | "assistant" | "agent";
  type?: "text" | "image";
  content: string;
  media_url?: string;
  created_at?: string;
};

type Conversation = {
  id: string;
  clinic_id: string;
  patient_phone: string;
  messages: Message[];
  last_message_at: string;
};

type Patient = {
  id: string;
  phone: string;
  name?: string;
};

export default function ChatInterface({
  clinicId,
  initialBotActive,
  initialConversations,
  patients
}: {
  clinicId: string;
  initialBotActive: boolean;
  initialConversations: Conversation[];
  patients: Patient[];
}) {
  const [botActive, setBotActive] = useState(initialBotActive);
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);

  const [inputText, setInputText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find(c => c.id === selectedConvId);
  const activePatient = activeConversation
    ? patients.find(p => p.phone === activeConversation.patient_phone)
    : null;

  useEffect(() => {
    // Scroll to bottom when conversation changes or new message arrives
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

  useEffect(() => {
    // Realtime subscription
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `clinic_id=eq.${clinicId}`
        },
        (payload) => {
          const newDoc = payload.new as Conversation;
          setConversations(prev => {
            const index = prev.findIndex(c => c.id === newDoc.id);
            if (index > -1) {
              const clone = [...prev];
              clone[index] = newDoc;
              return clone.sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
            } else {
              return [newDoc, ...prev].sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinicId]);

  const handleToggleBot = async () => {
    try {
      const newVal = !botActive;
      setBotActive(newVal);
      await toggleBotActive(clinicId, newVal);
      toast.success(newVal ? "تم تفعيل البوت" : "تم إيقاف البوت مؤقتاً");
    } catch (err) {
      setBotActive(!botActive);
      toast.error("حدث خطأ أثناء تعديل حالة البوت");
    }
  };

  const handleSendMessage = async (mediaUrl?: string) => {
    if (!activeConversation) return;
    if (!inputText.trim() && !mediaUrl) return;

    const messageContent = inputText.trim();
    setInputText("");

    // Optimistic UI Update
    const optimisticMsg: Message = {
      id: crypto.randomUUID(),
      role: 'agent',
      type: mediaUrl ? 'image' : 'text',
      content: messageContent,
      media_url: mediaUrl || undefined,
      created_at: new Date().toISOString()
    };

    setConversations(prev => prev.map(c => {
      if (c.id === activeConversation.id) {
        return {
          ...c,
          messages: [...(c.messages || []), optimisticMsg],
          last_message_at: new Date().toISOString()
        };
      }
      return c;
    }).sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()));

    setIsSending(true);
    try {
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId,
          conversationId: activeConversation.id,
          patientPhone: activeConversation.patient_phone,
          messageText: messageContent,
          mediaUrl: mediaUrl || null
        })
      });

      if (!res.ok) throw new Error("Failed");
    } catch (err) {
      toast.error("فشل إرسال الرسالة. تحقق من الواتساب.");
      // Rollback optimistic update on failure (optional but recommended for robust UI)
      setConversations(prev => prev.map(c => {
        if (c.id === activeConversation.id) {
          return { ...c, messages: c.messages.filter(m => m.id !== optimisticMsg.id) };
        }
        return c;
      }));
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!activeConversation) return;
    const confirmDelete = window.confirm("هل أنت متأكد من حذف هذه الرسالة من لوحة التحكم؟ (الرسالة لن تُحذف من هاتف المريض)");
    if (!confirmDelete) return;

    try {
      const res = await fetch("/api/chat/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId,
          conversationId: activeConversation.id,
          messageId: msgId
        })
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("تم الحذف");
    } catch (error) {
      toast.error("فشل الحذف");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clinicId', clinicId);

      const res = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error("Upload Failed");

      const data = await res.json();
      if (data.url) {
        toast.success("تم رفع الصورة، جاري الإرسال...");
        await handleSendMessage(data.url);
      }
    } catch (error) {
      console.error(error);
      toast.error("فشل رفع الصورة تأكد من إعدادات قاعدة البيانات والصلاحيات");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex h-full bg-[#f0f2f5] overflow-hidden">

      {/* Sidebar List */}
      <div className={clsx(
        "w-full lg:w-1/4 bg-white border-l border-[var(--border)] flex-col",
        selectedConvId ? "hidden md:flex" : "flex"
      )}>
        <div className="p-4 bg-[#f0f2f5] border-b border-[var(--border)] flex items-center justify-between shadow-sm shrink-0">
          <h2 className="font-bold text-lg text-[var(--foreground)]">المحادثات</h2>
          {/* Bot Toggle */}
          <button
            onClick={handleToggleBot}
            className={clsx(
              "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all",
              botActive ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-700 hover:bg-red-200"
            )}
            title="إيقاف البوت للرد اليدوي"
          >
            <Bot className="w-4 h-4" />
            {botActive ? "البوت يعمل" : "البوت متوقف"}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">لا توجد محادثات</div>
          ) : (
            conversations.map(conv => {
              const p = patients.find(pat => pat.phone === conv.patient_phone);
              const lastMsg = conv.messages && conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null;

              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  className={clsx(
                    "p-4 border-b border-gray-100 cursor-pointer hover:bg-[#f5f6f6] transition-colors flex items-center gap-3",
                    selectedConvId === conv.id && "bg-[#ebebeb]"
                  )}
                >
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 overflow-hidden shrink-0">
                    <UserIcon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold truncate text-[var(--foreground)]">{p?.name || `+${conv.patient_phone.replace(/^\+/, '')}`}</span>
                      <span className="text-xs text-gray-400">
                        {new Date(conv.last_message_at).toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate" dir="auto">
                      {lastMsg?.type === "image" ? "📷 صورة" : lastMsg?.content || "محادثة بدأت"}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className={clsx(
        "flex-1 flex-col bg-[#efeae2] relative w-full h-full",
        !selectedConvId ? "hidden md:flex" : "flex"
      )}>
        {activeConversation ? (
          <div className="flex-1 flex flex-col h-full absolute inset-0">
            {/* Chat Header */}
            <div className="h-16 bg-[#f0f2f5] border-b border-[var(--border)] px-4 flex items-center gap-3 shadow-sm z-10 shrink-0">
              <button 
                onClick={() => setSelectedConvId(null)}
                className="md:hidden p-2 -mr-2 cursor-pointer text-gray-500 hover:text-gray-900 rounded-md hover:bg-gray-100 shrink-0"
              >
                <ArrowRight className="w-6 h-6" />
              </button>
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 shrink-0">
                <UserIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-[var(--foreground)] truncate">{activePatient?.name || `+${activeConversation.patient_phone.replace(/^\+/, '')}`}</h3>
                <p className="text-xs text-gray-500 truncate" dir="ltr">+{activeConversation.patient_phone.replace(/^\+/, '')}</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#efeae2]">
              {activeConversation.messages.map((msg, idx) => {
                // Determine layout
                // User (patient) = incoming = white bubble on right (in RTL)
                // Assistant / Agent = outgoing = green bubble on left (in RTL)
                const isOutgoing = msg.role === "assistant" || msg.role === "agent";

                let displayContent = msg.content || "";
                if (displayContent.includes("<<<ACTION>>>")) {
                  displayContent = displayContent.split("<<<ACTION>>>")[0].trim();
                }
                if (displayContent.includes("[ملاحظة للبوت:")) {
                  displayContent = displayContent.split("[ملاحظة للبوت:")[0].trim();
                }

                return (
                  <div key={msg.id || idx.toString()} className={clsx("flex", isOutgoing ? "justify-end" : "justify-start")}>
                    <div
                      className={clsx(
                        "relative group max-w-[80%] md:max-w-[65%] rounded-lg p-3 shadow-sm",
                        isOutgoing ? "bg-[#d9fdd3] text-gray-800 rounded-tr-none" : "bg-white text-gray-800 rounded-tl-none"
                      )}
                      dir="auto"
                    >
                      {/* Sub-label for AI vs Manual */}
                      {isOutgoing && (
                        <div className="text-[10px] text-black-400 mb-1 flex justify-between items-center">
                          <span>{msg.role === "agent" ? "يدوي" : " الرد الآلي"}</span>
                        </div>
                      )}

                      {/* Content */}
                      {msg.media_url && (
                        <div className="mb-2 rounded overflow-hidden">
                          <img src={msg.media_url} alt="Media" className="max-w-full h-auto max-h-[300px] object-cover" />
                        </div>
                      )}

                      {displayContent && (
                        <p className="whitespace-pre-wrap text-black font-medium leading-relaxed">{displayContent}</p>
                      )}

                      {/* Timestamp & Delete */}
                      <div className="flex justify-end items-center gap-2 mt-2">
                        {msg.id && (
                          <button
                            onClick={() => handleDeleteMessage(msg.id!)}
                            className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity"
                            title="حذف من لوحة التحكم"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                        {(msg.created_at || activeConversation.last_message_at) && (
                          <span className="text-[10px] text-gray-500">
                            {new Date(msg.created_at || activeConversation.last_message_at).toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={chatBottomRef} />
            </div>

            {/* Input Footer */}
            <div className="p-3 bg-[#f0f2f5] flex items-end gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage || isSending}
                className="p-3 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-all focus:outline-none disabled:opacity-50"
              >
                {uploadingImage ? <Loader2 className="w-6 h-6 animate-spin" /> : <ImageIcon className="w-6 h-6" />}
              </button>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileUpload}
              />

              <div className="flex-1 bg-white rounded-xl overflow-hidden shadow-sm">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="اكتب رسالة..."
                  dir="auto"
                  className="w-full max-h-32 p-3 bg-transparent resize-none focus:outline-none"
                  rows={1}
                />
              </div>

              <button
                onClick={() => handleSendMessage()}
                disabled={(!inputText.trim() && !uploadingImage) || isSending}
                className="p-3 bg-[var(--accent)] text-white rounded-full hover:bg-teal-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shrink-0"
              >
                {isSending ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center opacity-50 flex-col gap-4 h-full">
            <MessageCircle className="w-24 h-24 text-gray-400" />
            <p className="text-xl font-medium text-gray-500">اختر محادثة للبدء</p>
          </div>
        )}
      </div>

    </div>
  );
}
