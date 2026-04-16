"use client";
import React, { useState } from "react";
import ConfirmModal from "@/components/ConfirmModal";

export default function ConfirmForm({ 
  action, 
  message, 
  children 
}: { 
  action: (formData: FormData) => void, 
  message: string, 
  children: React.ReactNode 
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <form 
        action={action} 
        onSubmit={(e) => {
          e.preventDefault(); // Stop native submission immediately
          setIsOpen(true); // Open sleek modal instead
        }}
        id="action-form"
      >
        {children}
      </form>

      {/* Modern custom replacement for ugly browser confirm */}
      <ConfirmModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="تأكيد الإجراء"
        message={message}
        confirmText="نعم، تنفيذ الإجراء"
        cancelText="إلغاء"
        isDestructive={message.includes("إيقاف")}
        onConfirm={() => {
          // Manually execute the Next.js Server Action bound to the form
          action(new FormData());
        }}
      />
    </>
  );
}
