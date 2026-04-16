"use client";
import { useState } from "react";
import { deleteAppointment } from "./actions";
import { Trash2 } from "lucide-react";
import ConfirmModal from "@/components/ConfirmModal";
import toast from "react-hot-toast";

export default function DeleteButton({ id }: { id: string }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function executeDelete() {
    setIsDeleting(true);
    try {
      await deleteAppointment(id);
      toast.success("تم حذف الموعد بنجاح", { duration: 3000 });
    } catch (e) {
      toast.error("حدث خطأ أثناء الحذف");
      setIsDeleting(false);
    }
  }

  return (
    <>
      <button 
        onClick={() => setIsModalOpen(true)}
        disabled={isDeleting}
        className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
        title="حذف الموعد"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      <ConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="تأكيد الحذف"
        message="هل أنت متأكد من مسح مسار هذا الموعد نهائياً؟ هذا الإجراء لا يمكن التراجع عنه."
        confirmText="نعم، احذف الموعد"
        cancelText="إلغاء"
        isDestructive={true}
        onConfirm={executeDelete}
      />
    </>
  );
}
