# WhatsApp Clinic Receptionist Bot — Full Build Instructions

---

## What You Are Building

A multi-tenant SaaS platform where clinic owners get a WhatsApp AI receptionist bot that handles patient conversations in Egyptian Arabic slang, books appointments, and manages availability. The platform has three roles: super admin (the product owner), clinic owners (doctors), and patients (WhatsApp only).

---

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend + Backend API routes | Next.js 14 (App Router) on Vercel |
| Auth | Clerk |
| Database | Supabase (PostgreSQL) |
| AI | Claude API (claude-sonnet-4-20250514) |
| WhatsApp | Meta Cloud API (one Business Account, multiple phone numbers) |
| Edge Functions (webhook logic) | Supabase Edge Functions (Deno) |
| Styling | Tailwind CSS |

---

## Design Direction

Clean, minimal, professional. Inspired by Softr and Linear. Think:
- Off-white or very light gray background (#FAFAFA or #F5F5F5)
- Dark text (#111 or #1A1A1A)
- One accent color (deep teal or slate blue — pick one and commit)
- Generous whitespace
- No gradients, no shadows that are too heavy
- Cards with subtle 1px borders
- Thin clean typography — use Geist or DM Sans
- Tables and lists feel airy not cramped
- Status badges are small pill shapes with muted colors
- The whole UI should feel like a tool, not a marketing page

---

## Clerk Auth Setup

Use Clerk for all authentication.

- Clinic owners register with email and password
- After registration they land on their dashboard immediately but see a "Trial" badge
- Super admin is identified by a specific email stored in an env variable `ADMIN_EMAIL`
- In every protected route, check `user.primaryEmailAddress` against `ADMIN_EMAIL` to gate admin pages
- Store `clerk_user_id` in the `clinics` table to link Clerk user to clinic data
- No social login needed — email/password only

---

## Supabase Schema

Run these SQL statements exactly:

```sql
-- Clinics table (one row per clinic owner)
create table clinics (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text unique not null,
  payment_code integer unique not null, -- starts at 60, increments per new clinic
  clinic_name text not null,
  whatsapp_phone_id text, -- Meta phone_number_id for this clinic's number
  whatsapp_access_token text, -- Meta access token for this number
  whatsapp_number text, -- the actual phone number e.g. +201001234567
  subscription_status text not null default 'trial', -- 'trial' | 'active' | 'inactive'
  trial_conversations_limit integer not null default 30,
  trial_conversations_used integer not null default 0,
  trial_warning_sent boolean default false,
  subscription_expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Clinic content (the knowledge the bot uses)
create table clinic_content (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  clinic_info text, -- free text: name, address, services, prices, doctor name, anything
  availability_text text, -- free text: "السبت والأحد من 10 الصبح لـ 3 العصر"
  bot_persona text, -- free text: what the doctor wrote about how the bot should sound
  custom_instructions text, -- free text: extra rules, things to always say, things to never say
  booking_fields text, -- free text: what to collect from patient — "الاسم والسن وسبب الزيارة"
  cancellation_allowed boolean default true,
  returning_patient_greeting boolean default true,
  appointment_duration_minutes integer default 30,
  updated_at timestamptz default now()
);

-- Slots (available appointment times)
create table slots (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  slot_date date not null,
  slot_time time not null,
  is_available boolean default true,
  created_at timestamptz default now(),
  unique(clinic_id, slot_date, slot_time)
);

-- Appointments (confirmed bookings)
create table appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  slot_id uuid references slots(id),
  patient_phone text not null,
  patient_name text,
  patient_notes text, -- any extra info collected (age, reason, etc)
  appointment_date date not null,
  appointment_time time not null,
  status text default 'confirmed', -- 'confirmed' | 'cancelled'
  created_at timestamptz default now()
);

-- Patients (remembered across conversations)
create table patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  phone text not null,
  name text,
  visit_count integer default 0,
  last_visit timestamptz,
  created_at timestamptz default now(),
  unique(clinic_id, phone)
);

-- Conversations (message history per patient per clinic)
create table conversations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  patient_phone text not null,
  messages jsonb not null default '[]', -- array of {role: user|assistant, content: string}
  last_message_at timestamptz default now(),
  unique(clinic_id, patient_phone)
);

-- Analytics (simple event tracking)
create table analytics_events (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid references clinics(id) on delete cascade,
  event_type text not null, -- 'conversation_started' | 'appointment_booked' | 'appointment_cancelled' | 'bot_message_sent'
  metadata jsonb,
  created_at timestamptz default now()
);
```

Enable Row Level Security on all tables. Clinic owners can only read/write their own rows using `clinic_id` matching their `clerk_user_id` lookup.

---

## Next.js App Structure

```
app/
  (auth)/
    sign-in/page.tsx
    sign-up/page.tsx
  (clinic)/
    layout.tsx          -- clinic dashboard shell with sidebar
    dashboard/page.tsx  -- appointments list + simple stats
    settings/page.tsx   -- clinic info, availability, bot config
    subscription/page.tsx -- subscription status + payment code
  (admin)/
    layout.tsx          -- admin shell
    admin/page.tsx      -- all clinics list, activate/deactivate
    admin/[id]/page.tsx -- single clinic detail
  api/
    webhook/route.ts    -- receives Meta WhatsApp webhooks
  page.tsx              -- landing or redirect to dashboard
```

---

## Clinic Dashboard Pages

### /dashboard
- Page title: clinic name (fetched from clinic_content)
- Subscription badge top right: pill shape, colors:
  - Trial: amber/yellow — "تجربة مجانية · X محادثة متبقية"
  - Active: green — "مشترك · ينتهي DD/MM/YYYY"
  - Inactive: red — "الاشتراك منتهي"
  - Warning state (3 days or less / trial about to run out): orange with subtle pulse animation
- Appointments section: clean table — patient name, date, time, status (confirmed/cancelled)
  - Filter by date (today / this week / all)
  - No edit needed in v1, display only
- Simple stats row (3 numbers only):
  - Conversations this month
  - Appointments this month
  - Cancellations this month

### /settings
Split into clearly labeled sections (not tabs, just sections on one scrollable page):

**1. Clinic Information**
Large textarea — free text. Label: "معلومات العيادة"
Placeholder: "اكتب كل حاجة عن العيادة — الاسم، العنوان، التخصص، الخدمات، الأسعار، رقم التليفون، اسم الدكتور، أي تفاصيل المريض محتاج يعرفها"

**2. مواعيد الكشف**
Large textarea — free text. Label: "أوقات العمل"
Placeholder: "مثال: السبت والأحد من 10 الصبح لـ 2 بعد الضهر، الثلاثاء من 5 العصر لـ 9 بالليل. أو اكتب أي ترتيب تاني يناسبك"

**3. إعدادات البوت**
- Textarea: "شخصية البوت" — placeholder: "مثال: بوت اسمه رنا، بتتكلم بأسلوب ودي وخفيف، زي موظفة استقبال شاطرة"
- Textarea: "تعليمات إضافية" — placeholder: "أي حاجة تانية عايز البوت يعملها أو ميعملهاش. مثال: دايما اسأل عن سبب الزيارة، متقولش أي أسعار، رحب بالمرضى الجدد بكلمة خاصة"
- Textarea: "البيانات المطلوبة عند الحجز" — placeholder: "مثال: الاسم بس. أو: الاسم والسن وسبب الزيارة"
- Toggle: "السماح بإلغاء الحجز عبر واتساب" — on/off
- Toggle: "ترحيب خاص بالمرضى المترددين" — on/off
- Number input: "مدة الكشف (بالدقائق)" — default 30

**4. الأوقات المتاحة للحجز**
Instruction text: "أضف الأوقات المتاحة للحجز يدويًا. البوت هيستخدمها للحجز مع المرضى."
- Button: "+ إضافة وقت"
- When clicked: date picker + time picker inline row, save button
- Shows list of upcoming available slots (next 14 days only), each with a delete button
- Group by date for readability

Save button at bottom of page — saves all sections at once.

### /subscription
- Large centered payment code: `#60` (bold, big font)
- Instruction text: "بعد الدفع، ابعت الكود ده على واتساب عشان نفعّل اشتراكك"
- Subscription status card (same badge as dashboard)
- If trial: shows conversations remaining out of limit
- If inactive: shows message "اشتراكك انتهى، تواصل معنا عشان تجدد"

---

## Admin Panel Pages

### /admin
Table of all clinics:
- Clinic name
- Payment code
- WhatsApp number
- Subscription status (badge)
- Conversations this month
- Appointments this month
- Created date
- Actions: Activate / Deactivate / View

Each row click goes to /admin/[id]

### /admin/[id]
- All clinic details
- Edit subscription status dropdown: trial / active / inactive
- Edit trial_conversations_limit
- Edit subscription_expires_at (date picker)
- Save button
- View their appointments
- Analytics: total conversations all time, this month, total bookings all time, this month — across this clinic
- WhatsApp config section: phone_number_id, access_token, whatsapp_number input fields

### Admin Analytics Summary (top of /admin page)
4 stat cards:
- Total active clinics
- Total conversations this month (all clinics)
- Total appointments this month (all clinics)
- Total inactive clinics

---

## Meta WhatsApp Webhook (Next.js API Route)

File: `app/api/webhook/route.ts`

### GET handler (webhook verification)
Meta sends a GET request with `hub.verify_token` and `hub.challenge`. Verify against your `WHATSAPP_VERIFY_TOKEN` env variable and return the challenge.

### POST handler (incoming messages)
```
1. Parse incoming Meta webhook payload
2. Extract: phone_number_id, from (patient phone), message text, message type
3. Only process type === 'text' messages, ignore others silently
4. Find clinic by whatsapp_phone_id matching phone_number_id
5. If no clinic found → return 200 (ignore)
6. Check subscription_status:
   - If 'inactive' → return 200 silently (no reply)
   - If 'trial' and trial_conversations_used >= trial_conversations_limit → return 200 silently
7. Call Supabase Edge Function: process-message
8. Return 200 immediately (Meta requires fast response)
```

**Important:** The webhook route must return 200 within 3 seconds. Offload all processing to the Supabase Edge Function asynchronously. Do NOT await the full AI processing inside the webhook route.

---

## Supabase Edge Function: process-message

This is the brain. File: `supabase/functions/process-message/index.ts`

### Input
```typescript
{
  clinic_id: string,
  patient_phone: string,
  message_text: string
}
```

### Logic Flow

```
1. Fetch clinic data:
   - clinics row (status, limits)
   - clinic_content row (all config)

2. Fetch or create patient record:
   - Look up by (clinic_id, phone)
   - If exists: get name, visit_count
   - If new: create record

3. Fetch conversation history:
   - Get messages JSONB array for this (clinic_id, phone)
   - Take last 12 messages only (keep context window clean)

4. Fetch available slots (next 14 days):
   - SELECT slot_date, slot_time FROM slots
     WHERE clinic_id = X AND is_available = true
     AND slot_date >= today AND slot_date <= today + 14
   - Format as JSON grouped by date:
     {"2025-06-07": ["09:00", "09:30", "10:00"], "2025-06-08": ["11:00"]}

5. Fetch reserved slots (next 14 days):
   - SELECT appointment_date, appointment_time FROM appointments
     WHERE clinic_id = X AND status = 'confirmed'
     AND appointment_date >= today AND appointment_date <= today + 14
   - Format same way

6. Build system prompt (see Prompt Design section below)

7. Call Claude API:
   model: claude-sonnet-4-20250514
   max_tokens: 600
   system: [system prompt]
   messages: [...conversation_history, {role: user, content: message_text}]

8. Parse Claude response:
   - Extract the JSON block at end of response (see Prompt Design)
   - Strip JSON block from the text sent to patient
   - If action === 'book': 
       - Find slot_id matching date+time
       - INSERT into appointments
       - UPDATE slot is_available = false
       - UPDATE patient visit_count++, last_visit = now()
       - If new patient name captured: UPDATE patients.name
   - If action === 'cancel':
       - Find appointment by patient_phone + clinic_id + confirmed status
       - UPDATE appointment status = 'cancelled'
       - UPDATE slot is_available = true

9. Save updated conversation:
   - Append user message and assistant reply to messages JSONB
   - UPSERT conversations table

10. If trial subscription:
    - Increment trial_conversations_used
    - If (limit - used) <= 3 and warning not sent:
        UPDATE trial_warning_sent = true
        (frontend reads this and shows warning badge)

11. Log analytics event:
    - 'bot_message_sent' always
    - 'appointment_booked' if booking happened
    - 'appointment_cancelled' if cancellation happened
    - 'conversation_started' if this is first message (conversation row was just created)

12. Send reply via Meta Cloud API:
    POST https://graph.facebook.com/v18.0/{phone_number_id}/messages
    Authorization: Bearer {clinic.whatsapp_access_token}
    Body: {
      messaging_product: "whatsapp",
      to: patient_phone,
      type: "text",
      text: { body: reply_text }
    }
```

---

## Prompt Design

This is the most critical part. Build it dynamically from clinic_content data.

```
You are {{bot_persona OR "مساعد استقبال"}} في {{clinic_name}}.

بتتكلم بالعامية المصرية بشكل طبيعي وودي، زي موظف استقبال حقيقي. مش بوت.
متقولش أبدًا إنك بوت أو ذكاء اصطناعي.

=== معلومات العيادة ===
{{clinic_info}}

=== أوقات العمل ===
{{availability_text}}

=== الأوقات المتاحة للحجز (14 يوم جاي) ===
{{available_slots_json}}

=== الأوقات المحجوزة ===
{{reserved_slots_json}}

=== المريض ===
{{IF returning_patient_greeting AND patient.visit_count > 0}}
ده مريض متردد، اسمه {{patient.name}}، زار العيادة {{patient.visit_count}} مرة قبل كده. رحب بيه بشكل شخصي.
{{ELSE}}
ده مريض جديد.
{{END}}

=== قواعد الحجز ===
- البيانات المطلوبة عند الحجز: {{booking_fields}}
- مدة الكشف: {{appointment_duration_minutes}} دقيقة
- الحجز المزدوج: ممنوع تمامًا، كل وقت لمريض واحد بس
{{IF cancellation_allowed}}
- المريض ممكن يلغي حجزه، لو طلب يلغي ساعده وأكد إلغاء الحجز
{{ELSE}}
- الإلغاء مش متاح عبر واتساب، قوله يتصل بالعيادة
{{END}}

=== تعليمات إضافية ===
{{custom_instructions}}

=== أسلوب الرد ===
- ردودك قصيرة وطبيعية، مش رسمية
- لو المريض كلم بتاريخ مش واضح زي "السبت الجاي" أو "بكرة"، احسبه صح بناءً على إن النهارده هو {{current_date}}
- لو مفيش أوقات متاحة في اليوم اللي طلبه، اقترح أقرب وقت متاح
- مش لازم تعدد كل الأوقات المتاحة دفعة واحدة، اقترح أوقات بشكل طبيعي
- قبل ما تأكد الحجز، تأكد من الاسم والوقت

=== مهم جدًا ===
في آخر كل رد، حط بلوك JSON على السطر الأخير بالشكل ده (المريض مش هيشوفه، انت بس اللي بتستخدمه):
{"action": null}
أو لو في حجز:
{"action": "book", "date": "YYYY-MM-DD", "time": "HH:MM", "patient_name": "الاسم"}
أو لو في إلغاء:
{"action": "cancel"}

متحطش أي حاجة بعد الـ JSON.
```

---

## Environment Variables

Create `.env.local` for Next.js and configure in Vercel:

```
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Anthropic
ANTHROPIC_API_KEY=

# Meta WhatsApp
WHATSAPP_VERIFY_TOKEN=         # any random string you choose, used to verify webhook

# Admin
ADMIN_EMAIL=your@email.com

# Supabase Edge Function secret
EDGE_FUNCTION_SECRET=          # shared secret between Next.js and Edge Function
```

For Supabase Edge Functions, set these in Supabase dashboard under Project Settings > Edge Functions:
```
ANTHROPIC_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

---

## Payment Code Logic

- When a new clinic signs up, insert their row with `payment_code = (SELECT MAX(payment_code) + 1 FROM clinics)` with a floor of 60
- This code is shown prominently on their `/subscription` page
- You look it up in the admin panel and manually set `subscription_status = 'active'` and `subscription_expires_at`

---

## Subscription Status Logic

| Status | Bot behavior | Dashboard badge |
|---|---|---|
| trial | Replies until trial_conversations_used >= limit | Amber — shows remaining conversations |
| trial (≤3 remaining) | Still replies | Orange pulsing — warning |
| active | Replies freely | Green — shows expiry date |
| active (expires in ≤3 days) | Still replies | Orange pulsing — renewal warning |
| inactive | Silent — no reply | Red — subscription ended |

Check expiry daily: create a Supabase scheduled function (pg_cron) that runs every day at midnight and sets `subscription_status = 'inactive'` where `subscription_expires_at < now()`.

```sql
-- Enable pg_cron extension in Supabase SQL editor first
select cron.schedule(
  'check-subscriptions',
  '0 0 * * *',
  $$
    update clinics
    set subscription_status = 'inactive'
    where subscription_status = 'active'
    and subscription_expires_at < now();
  $$
);
```

---

## Slot Generation

Clinic owners add slots manually via the /settings page. When they add a slot:
- POST to `/api/slots` with `{ clinic_id, date, time }`
- Insert into `slots` table
- They can delete upcoming slots (sets is_available = false or hard deletes — hard delete is fine for future slots)

There is no auto-generation. The doctor manually picks dates and times from the UI. Keep it simple.

---

## Data Fetching Pattern

Use Supabase JS client in Next.js server components for all dashboard data. Use Clerk's `auth()` to get the current user, then look up their clinic by `clerk_user_id`.

```typescript
// In any server component
const { userId } = auth()
const supabase = createServerSupabaseClient()
const { data: clinic } = await supabase
  .from('clinics')
  .select('*')
  .eq('clerk_user_id', userId)
  .single()
```

---

## Key Rules for the AI Builder

1. All text facing clinic owners should be in Arabic (labels, placeholders, helper text)
2. All text facing the super admin can be in English
3. Never hardcode clinic data — always fetch from DB
4. The webhook route MUST return 200 immediately — never await the full AI flow inside it
5. Strip the JSON block from Claude's reply before sending to patient
6. Always handle the case where Claude returns malformed JSON gracefully — catch parse errors and treat as `{"action": null}`
7. Conversation history: keep last 12 messages only when sending to Claude
8. Slots injected to Claude: next 14 days only, grouped by date as JSON
9. Row Level Security must be enabled — clinic owners never see other clinics' data
10. All DB writes from the Edge Function use the service role key, not the anon key
