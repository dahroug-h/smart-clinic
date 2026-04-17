"use client";
import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";

export default function AdminClinicsTable({ clinics }: { clinics: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredClinics = clinics.filter(c => 
    c.payment_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.clinic_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 border rounded-lg shadow-sm">
        <label className="block text-sm font-medium mb-2">بحث عن عيادة</label>
        <input
          type="text"
          placeholder="ابحث بكود الدفع أو اسم العيادة..."
          className="w-full max-w-md p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <table className="w-full text-right text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 font-medium">كود الدفع</th>
              <th className="px-6 py-3 font-medium">اسم العيادة</th>
              <th className="px-6 py-3 font-medium">الحالة</th>
              <th className="px-6 py-3 font-medium">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredClinics.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                  لا توجد عيادات مطابقة للبحث
                </td>
              </tr>
            ) : (
              filteredClinics.map(clinic => (
                <tr key={clinic.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-bold">#{clinic.payment_code}</td>
                  <td className="px-6 py-4">{clinic.clinic_name}</td>
                  <td className="px-6 py-4">
                    <span className={clsx(
                      "px-3 py-1 rounded-full text-xs font-bold",
                      clinic.subscription_status === 'active' ? "bg-green-100 text-green-800" :
                      clinic.subscription_status === 'trial' ? "bg-amber-100 text-amber-800" :
                      "bg-red-100 text-red-800"
                    )}>
                      {clinic.subscription_status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/admin/${clinic.id}`} className="text-[var(--accent)] hover:text-teal-800 font-medium underline">
                      التفاصيل والإعدادات
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
