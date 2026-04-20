"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { toggleBotActive } from "./actions";
import { Send, Image as ImageIcon, Bot, User as UserIcon, Loader2, MessageCircle, ArrowRight, FlaskConical, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import clsx from "clsx";
import ConfirmModal from "@/components/ConfirmModal";

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
  const [creatingTest, setCreatingTest] = useState(false);
  const [convToDelete, setConvToDelete] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const activeConversation = conversations.find(c => c.id === selectedConvId);
  const activePatient = activeConversation
    ? patients.find(p => p.phone === activeConversation.patient_phone)
    : null;

  const isTestConversation = (conv: Conversation) => conv.patient_phone.startsWith("test_");
  const isActiveTest = activeConversation ? isTestConversation(activeConversation) : false;

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

  // ─── Create a new test conversation ───
  const handleCreateTest = async () => {
    setCreatingTest(true);
    try {
      const res = await fetch("/api/chat/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId })
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();

      const newConv: Conversation = {
        id: data.conversationId,
        clinic_id: clinicId,
        patient_phone: data.patientPhone,
        messages: [],
        last_message_at: new Date().toISOString()
      };

      setConversations(prev => [newConv, ...prev]);
      setSelectedConvId(data.conversationId);
      toast.success("تم إنشاء محادثة تجريبية — اكتب كأنك المريض", { duration: 3000 });
    } catch (err) {
      toast.error("فشل إنشاء المحادثة التجريبية");
    } finally {
      setCreatingTest(false);
    }
  };

  // ─── Send message in a REAL conversation (agent → patient via WhatsApp) ───
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

  // ─── Send message in a TEST conversation (simulates patient → bot) ───
  const handleTestSend = async () => {
    if (!activeConversation || !inputText.trim()) return;

    const messageContent = inputText.trim();
    setInputText("");

    // Optimistic: show user (patient) message immediately
    const optimisticMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      type: 'text',
      content: messageContent,
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
      const res = await fetch("/api/chat/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clinicId,
          patientPhone: activeConversation.patient_phone,
          messageText: messageContent
        })
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed");
      }
      // Realtime subscription will deliver the bot reply from DB
    } catch (err: any) {
      toast.error(err.message || "فشل إرسال الرسالة التجريبية. تأكد من إعدادات البوت.");
      // Rollback optimistic message
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

  // Determine the correct send handler based on conversation type
  const handleActiveSend = () => {
    if (isActiveTest) {
      handleTestSend();
    } else {
      handleSendMessage();
    }
  };

  // ─── Delete a conversation from the panel ───
  const handleDeleteConversation = async () => {
    if (!convToDelete) return;
    try {
      const res = await fetch("/api/chat/conversation", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId, conversationId: convToDelete })
      });
      if (!res.ok) throw new Error("Failed");

      // Remove from local state
      setConversations(prev => prev.filter(c => c.id !== convToDelete));
      if (selectedConvId === convToDelete) setSelectedConvId(null);
      toast.success("تم حذف المحادثة");
    } catch (err) {
      toast.error("فشل حذف المحادثة");
    } finally {
      setConvToDelete(null);
    }
  };

  return (
    <div className="flex h-full bg-[#f0f2f5] overflow-hidden">

      {/* Sidebar List */}
      <div className={clsx(
        "w-full lg:w-1/4 bg-white border-l border-[var(--border)] flex-col",
        selectedConvId ? "hidden md:flex" : "flex"
      )}>
        <div className="p-3 bg-[#f0f2f5] border-b border-[var(--border)] shadow-sm shrink-0">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-bold text-lg text-[var(--foreground)]">المحادثات</h2>

            <div className="flex items-center gap-2">
              {/* Test Chat Button */}
              <button
                onClick={handleCreateTest}
                disabled={creatingTest}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-dashed border-[var(--accent)]/40 text-[var(--accent)] hover:bg-teal-50 hover:border-[var(--accent)] transition-all disabled:opacity-50 text-xs font-bold shrink-0"
                title="محادثة تجريبية جديدة"
              >
                {creatingTest
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Plus className="w-3.5 h-3.5" />
                }
                <span>تجربة</span>
              </button>

              {/* Bot Toggle Switch */}
              <button
                onClick={handleToggleBot}
                className="flex items-center gap-1.5 cursor-pointer shrink-0"
                title={botActive ? "اضغط لإيقاف البوت" : "اضغط لتشغيل البوت"}
              >
                <span className={clsx("text-[10px] font-bold transition-colors", botActive ? "text-green-600" : "text-gray-400")}>
                  {botActive ? "يعمل" : "متوقف"}
                </span>
                <div className={clsx(
                  "relative w-9 h-5 rounded-full transition-colors duration-200",
                  botActive ? "bg-green-500" : "bg-gray-300"
                )}>
                  <div className={clsx(
                    "absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200",
                    botActive ? "right-0.5" : "left-0.5"
                  )} />
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">لا توجد محادثات</div>
          ) : (
            conversations.map(conv => {
              const p = patients.find(pat => pat.phone === conv.patient_phone);
              const lastMsg = conv.messages && conv.messages.length > 0 ? conv.messages[conv.messages.length - 1] : null;
              const isTest = isTestConversation(conv);

              return (
                <div
                  key={conv.id}
                  onClick={() => setSelectedConvId(conv.id)}
                  className={clsx(
                    "p-4 border-b border-gray-100 cursor-pointer hover:bg-[#f5f6f6] transition-colors flex items-center gap-3",
                    selectedConvId === conv.id && "bg-[#ebebeb]"
                  )}
                >
                  <div className={clsx(
                    "w-12 h-12 rounded-full flex items-center justify-center overflow-hidden shrink-0",
                    isTest ? "bg-teal-100 text-teal-600" : "bg-gray-200 text-gray-500"
                  )}>
                    {isTest ? <FlaskConical className="w-6 h-6" /> : <UserIcon className="w-6 h-6" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold truncate text-[var(--foreground)]">
                        {isTest ? "عميل تجريبي" : (p?.name || `+${conv.patient_phone.replace(/^\+/, '')}`)}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(conv.last_message_at).toLocaleTimeString("ar-EG", { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 truncate" dir="auto">
                      {lastMsg?.type === "image" ? "📷 صورة" : lastMsg?.content || (isTest ? "ابدأ المحادثة التجريبية..." : "محادثة بدأت")}
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
            <div className={clsx(
              "h-16 border-b border-[var(--border)] px-4 flex items-center gap-3 shadow-sm z-10 shrink-0",
              isActiveTest ? "bg-teal-50" : "bg-[#f0f2f5]"
            )}>
              <button 
                onClick={() => setSelectedConvId(null)}
                className="md:hidden p-2 -mr-2 cursor-pointer text-gray-500 hover:text-gray-900 rounded-md hover:bg-gray-100 shrink-0"
              >
                <ArrowRight className="w-6 h-6" />
              </button>
              <div className={clsx(
                "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                isActiveTest ? "bg-teal-100 text-teal-600" : "bg-gray-200 text-gray-500"
              )}>
                {isActiveTest ? <FlaskConical className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-bold text-[var(--foreground)] truncate">
                  {isActiveTest ? "وضع التجربة" : (activePatient?.name || `+${activeConversation.patient_phone.replace(/^\+/, '')}`)}
                </h3>
                <p className="text-xs text-gray-500 truncate" dir="ltr">
                  {isActiveTest ? "أنت تكتب كمريض — البوت يرد عليك" : `+${activeConversation.patient_phone.replace(/^\+/, '')}`}
                </p>
              </div>
              {/* Delete Conversation */}
              <button
                onClick={() => setConvToDelete(activeConversation.id)}
                className="p-2 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                title="حذف المحادثة"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#efeae2]">
              {/* Test mode hint at top of empty test chat */}
              {isActiveTest && activeConversation.messages.length === 0 && (
                <div className="flex justify-center">
                  <div className="bg-white/80 backdrop-blur-sm text-gray-500 text-xs px-4 py-2 rounded-lg shadow-sm text-center max-w-xs">
                    اكتب رسالة كأنك المريض وشوف رد البوت — التجربة تتحذف تلقائياً بعد ٢٤ ساعة
                  </div>
                </div>
              )}

              {activeConversation.messages.map((msg, idx) => {
                // In test mode: user=patient (white, left in LTR), assistant=bot (green, right in LTR)
                // In real mode: user=patient (white), assistant/agent=outgoing (green)
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
                      {/* Sub-label for AI vs Manual vs Test Patient */}
                      {isActiveTest ? (
                        <div className="text-[10px] text-gray-400 mb-1">
                          <span>{isOutgoing ? "رد البوت" : "أنت (المريض)"}</span>
                        </div>
                      ) : (
                        isOutgoing && (
                          <div className="text-[10px] text-black-400 mb-1 flex justify-between items-center">
                            <span>{msg.role === "agent" ? "يدوي" : " الرد الآلي"}</span>
                          </div>
                        )
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

                      {/* Timestamp */}
                      <div className="flex justify-end items-center gap-2 mt-2">
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
              {/* Hide image upload for test conversations */}
              {!isActiveTest && (
                <>
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
                </>
              )}

              <div className="flex-1 bg-white rounded-xl overflow-hidden shadow-sm">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleActiveSend();
                    }
                  }}
                  placeholder={isActiveTest ? "اكتب كأنك المريض..." : "اكتب رسالة..."}
                  dir="auto"
                  className="w-full max-h-32 p-3 bg-transparent resize-none focus:outline-none"
                  rows={1}
                />
              </div>

              <button
                onClick={handleActiveSend}
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

      <ConfirmModal
        isOpen={!!convToDelete}
        onClose={() => setConvToDelete(null)}
        onConfirm={handleDeleteConversation}
        title="حذف المحادثة"
        message="هل أنت متأكد من حذف هذه المحادثة؟ سيتم حذفها نهائياً من لوحة التحكم."
        confirmText="نعم، احذف"
        cancelText="تراجع"
        isDestructive={true}
      />

    </div>
  );
}
