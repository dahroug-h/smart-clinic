"use client";
import { useState } from "react";
import { completeAppointment } from "./actions";
import { Check } from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import toast from "react-hot-toast";

export default function CompleteButton({ id }: { id: string }) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function executeComplete() {
    setIsCompleting(true);
    try {
      await completeAppointment(id);
      toast.success("تم إنهاء الموعد بنجاح", { duration: 3000 });
    } catch (e) {
      toast.error("حدث خطأ أثناء تحديث الحالة");
      setIsCompleting(false);
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsModalOpen(true)}
        disabled={isCompleting}
        className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-md transition-colors disabled:opacity-50"
        title="إنهاء الموعد"
      >
        <Check className="w-5 h-5" />
      </button>

      <ConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="تأكيد إنهاء الموعد"
        message="هل المريض أتم الكشف بنجاح وتريد تغيير حالة الموعد إلى منتهي؟"
        confirmText="نعم، إنهاء الموعد"
        cancelText="إلغاء"
        isDestructive={false}
        onConfirm={executeComplete}
      />
    </>
  );
}
