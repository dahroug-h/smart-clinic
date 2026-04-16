import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("NEXT_PUBLIC_SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    const { clinic_id, patient_phone, message_text } = await req.json();

    // 1. Fetch clinic data & config
    const [{ data: clinic }, { data: content }] = await Promise.all([
      supabase.from("clinics").select("*").eq("id", clinic_id).single(),
      supabase.from("clinic_content").select("*").eq("clinic_id", clinic_id).single(),
    ]);

    if (!clinic || !content) return new Response("Clinic missing", { status: 400 });

    // 2. Fetch or create patient
    let { data: patient } = await supabase
      .from("patients")
      .select("*")
      .match({ clinic_id, phone: patient_phone })
      .single();

    if (!patient) {
      const { data: newPatient } = await supabase
        .from("patients")
        .insert({ clinic_id, phone: patient_phone })
        .select()
        .single();
      patient = newPatient;
    }

    // 3. Fetch conversation history (last 12 messages)
    let { data: conversation } = await supabase
      .from("conversations")
      .select("*")
      .match({ clinic_id, patient_phone })
      .single();

    if (!conversation) {
      const { data: newConv } = await supabase
        .from("conversations")
        .insert({ clinic_id, patient_phone, messages: [] })
        .select()
        .single();
      conversation = newConv;
    }

    const cairoNow = new Date().toLocaleString("en-CA", { timeZone: "Africa/Cairo", hour12: false }).replace(",", "");
    const cairoDate = cairoNow.split(" ")[0]; // "YYYY-MM-DD"
    const cairoTime = cairoNow.split(" ")[1].slice(0, 5); // "HH:MM"

    const messages = conversation.messages || [];
    const history = messages.slice(-12);

    // Extract any confirmed booking fields from older history that was cut off
    const fullHistory = messages;
    const confirmedFields: any = {};
    for (const msg of fullHistory) {
      if (msg.role === "assistant" && msg.content) {
        const m = msg.content.match(/<<<ACTION>>>([\s\S]*?)<<<END>>>/);
        if (m) {
          try {
            const p = JSON.parse(m[1].trim());
            if (p.action === "book") {
              if (p.patient_name) confirmedFields.patient_name = p.patient_name;
              if (p.date) confirmedFields.date = p.date;
              if (p.time) confirmedFields.time = p.time;
            }
          } catch { }
        }
      }
    }

    const fieldSummary = Object.keys(confirmedFields).length > 0
      ? `\n[ملاحظة للبوت: البيانات المتأكدة من المحادثة السابقة: ${JSON.stringify(confirmedFields)}]`
      : "";

    history.push({ role: "user", content: message_text + fieldSummary });

    // Fetch booked slots
    const todayAndFuture = cairoDate;
    const { data: bookedSlots } = await supabase
      .from("appointments")
      .select("appointment_date, appointment_time, patient_name")
      .eq("clinic_id", clinic_id)
      .eq("status", "confirmed")
      .gte("appointment_date", todayAndFuture);

    const bookedText = bookedSlots && bookedSlots.length > 0
      ? bookedSlots.map(b => {
          let timeMsg = b.appointment_time;
          if (timeMsg) {
             const parts = timeMsg.split(":");
             if (parts.length >= 2) {
                let h = parseInt(parts[0], 10);
                const m = parts[1];
                const ampm = h >= 12 ? "م" : "ص";
                h = h % 12 || 12;
                timeMsg = `${h}:${m} ${ampm}`;
             }
          }
          return `- ${b.appointment_date} الساعة ${timeMsg} (محجوز)`;
        }).join("\n")
      : "لا توجد حجوزات حالية";

    // 4. Build prompt
    const systemPrompt = `[أولويات الرد بالترتيب: 1-الشخصية والأسلوب، 2-قواعد الحجز، 3-معلومات العيادة، 4-التعامل مع الحالات الخاصة، 5-صيغة الإخراج JSON]
You are ${content.bot_persona || "مساعد استقبال"} في ${clinic.clinic_name}.
بتتكلم بالعامية المصرية بشكل طبيعي وودي، زي موظف استقبال حقيقي. مش بوت.
متقولش أبدًا إنك بوت أو ذكاء اصطناعي.

=== معلومات العيادة ===
${content.clinic_info || ""}

=== أوقات العمل ===
${content.availability_text || ""}

=== المريض ===
ده مريض جديد أو حالي. اتعامل معاه باهتمام.

=== قواعد الحجز ===
- البيانات المطلوبة عند الحجز: ${content.booking_fields || ""}
- مدة الكشف: ${content.appointment_duration_minutes || 30} دقيقة
- الحجز المزدوج: ممنوع تمامًا، كل وقت لمريض واحد بس
${content.cancellation_allowed
        ? "- المريض ممكن يلغي حجزه، لو طلب يلغي ساعده وأكد إلغاء الحجز"
        : "- الإلغاء مش متاح عبر واتساب، قوله يتصل بالعيادة"}

=== المواعيد المحجوزة حالياً ===
${bookedText}
لا تؤكد أي موعد موجود في القائمة دي. لو الوقت محجوز، اقترح أقرب وقت متاح.

=== تعليمات إضافية ===
${content.custom_instructions || ""}

=== أسلوب الرد ===
- ردودك قصيرة وطبيعية، مش رسمية
- لو المريض كلم بتاريخ مش واضح زي "السبت الجاي" أو "بكرة"، احسبه صح بناءً على إن النهارده هو ${cairoDate}
- قبل ما تأكد الحجز، تأكد من الاسم والوقت
- متستخدمش علامات ترقيم مسموح بس بال (؟) فى نهايه الاسألة فقط
- استخدم نظام 12 ساعة دايماً للوقت (مثلاً 4:30 العصر أو 10:00 الصبح)، ممنوع تستخدم نظام 24 ساعة وممنوع كتابة ثواني.
=== حالات خاصة ===
- لو المريض قال وقت مبهم زي "بعد الضهر" أو "المساء" أو "الصبح" بدون ساعة محددة، اسأله عن الساعة بالظبط قبل ما تكمل.
- لو الوقت اللي طلبه محجوز، قوله الوقت ده محجوز واقترحله أقرب وقتين متاحين.
- لو المريض سأل عن نتايج تحاليل، أو وصفة دوا، أو سؤال طبي، قوله: "الدكتور هو اللي يقدر يجاوبك على ده، حجزلك معاه؟"
- لو المريض طلب حاجة مش في نطاق العيادة أو مش قادر تساعده فيها، قوله: "للأسف مش قادر أساعدك في ده، بس ممكن أحجزلك موعد مع الدكتور."
- لو المريض بعت رسالة مش واضحة أو فيها لغة مش عربي، اطلب منه يوضح بالعربي.
- لا تقدر تعمل أي حاجة غير الحجز والإلغاء والإجابة على أسئلة العيادة. متوعدش المريض بأي خدمة تانية.

=== مهم جدًا ===
-رد على قد السؤال متتابعش بسؤال تانى
في آخر كل رد، حط بلوك JSON بالشكل ده على سطر منفصل (المريض مش هيشوفه):
<<<ACTION>>>{"action": null}<<<END>>>
أو لو في حجز:
<<<ACTION>>>{"action": "book", "date": "YYYY-MM-DD", "time": "hh:mm AM/PM", "patient_name": "الاسم"}<<<END>>>
أو لو في إلغاء:
<<<ACTION>>>{"action": "cancel"}<<<END>>>
لازم يكون الـ JSON محاط بـ <<<ACTION>>> و <<<END>>> بالضبط. متحطش أي حاجة بعده.`;

    // 5. Call OpenRouter API
    const claudeRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ANTHROPIC_API_KEY}`
      },
      body: JSON.stringify({
        model: "qwen/qwen3-14b",
        max_tokens: 600,
        messages: [
          { role: "system", content: systemPrompt },
          ...history
        ]
      })
    });

    const claudeData = await claudeRes.json();
    if (claudeData.error) throw new Error(claudeData.error.message || JSON.stringify(claudeData.error));

    let rawReply = claudeData.choices?.[0]?.message?.content;
    if (typeof rawReply !== 'string') {
      console.error("AI model returned invalid or null content:", JSON.stringify(claudeData));
      rawReply = "عفواً، المساعد غير قادر على الرد حالياً. يرجى المحاولة بعد قليل.";
    }

    let replyText = rawReply;
    let action = null;

    // 6. Parse JSON action
    try {
      const sentinelMatch = rawReply.match(/<<<ACTION>>>([\s\S]*?)<<<END>>>/);
      if (sentinelMatch) {
        let jsonString = sentinelMatch[1].trim();
        // Remove markdown backticks if the AI added them
        jsonString = jsonString.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
        
        const parsed = JSON.parse(jsonString);
        if (parsed.action) {
          action = parsed;
        }
        replyText = rawReply.slice(0, rawReply.indexOf("<<<ACTION>>>")).trim();
      } else {
        // Fallback: observe if it just outputted ```json block at the end
        const fallbackMatch = rawReply.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        if (fallbackMatch) {
           const parsed = JSON.parse(fallbackMatch[1].trim());
           if (parsed.action) {
             action = parsed;
           }
           replyText = rawReply.slice(0, rawReply.indexOf("```json")).trim();
        }
      }
    } catch (e) {
      console.warn("⚠️ Failed to parse action sentinel from AI reply. Error:", e, "Raw Reply:", rawReply);
    }

    history.push({ role: "assistant", content: rawReply });

    // 7. Execute Actions (book, cancel)
    if (action?.action === "book") {
      await supabase.from("appointments").insert({
        clinic_id,
        patient_phone,
        patient_name: action.patient_name || patient.name,
        appointment_date: action.date,
        appointment_time: action.time,
        status: "confirmed"
      });
      // updating patient name
      await supabase.from("patients").update({
        name: action.patient_name || patient.name,
        visit_count: patient.visit_count + 1,
        last_visit: new Date().toISOString()
      }).eq("id", patient.id);

      await supabase.from("analytics_events").insert({ clinic_id, event_type: "appointment_booked" });
    } else if (action?.action === "cancel") {
      // logic to cancel (hard delete)
      const { data: toCancelList } = await supabase.from("appointments").select("id").match({ clinic_id, patient_phone, status: "confirmed" });
      if (toCancelList && toCancelList.length > 0) {
        const ids = toCancelList.map((t: any) => t.id);
        await supabase.from("appointments").delete().in("id", ids);
        await supabase.from("analytics_events").insert({ clinic_id, event_type: "appointment_cancelled" });
      }
    }

    // always log response
    await supabase.from("analytics_events").insert({ clinic_id, event_type: "bot_message_sent" });
    if (history.length === 2) await supabase.from("analytics_events").insert({ clinic_id, event_type: "conversation_started" });

    // 8. Update conversation history
    await supabase.from("conversations").update({ messages: history, last_message_at: new Date().toISOString() }).eq("id", conversation.id);

    // 9. Send WhatsApp Message via Meta Graph API
    if (clinic.whatsapp_phone_id && clinic.whatsapp_access_token) {
      await fetch(`https://graph.facebook.com/v18.0/${clinic.whatsapp_phone_id}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${clinic.whatsapp_access_token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: patient_phone,
          type: "text",
          text: { body: replyText }
        })
      });
    }

    // 10. Trial usage increment logic
    if (clinic.subscription_status === 'trial') {
      await supabase.from("clinics").update({ trial_conversations_used: clinic.trial_conversations_used + 1 }).eq("id", clinic_id);
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });

  } catch (err) {
    console.error("Unhandled process edge function error", err);
    return new Response("Internal Error", { status: 500 });
  }
});