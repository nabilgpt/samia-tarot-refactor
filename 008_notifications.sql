-- 008_notifications.sql - M15 Notifications Schema (idempotent)
-- Email/SMS/WhatsApp notification templates and logging

-- Notification templates with placeholders
create table if not exists notif_templates (
  id bigserial primary key,
  channel text not null check (channel in ('email','sms','whatsapp')),
  code text unique not null,             -- e.g. 'order_created','order_delivered'
  subject text,                          -- for email
  body text not null,                    -- handlebars-like placeholders
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Notification delivery log
create table if not exists notif_log (
  id bigserial primary key,
  user_id uuid references profiles(id),
  channel text not null check (channel in ('email','sms','whatsapp')),
  template_code text,
  target text not null,                  -- email or phone
  payload jsonb,                         -- rendered data
  status text not null check (status in ('queued','sent','failed')),
  provider_ref text,                     -- external message ID
  error text,
  created_at timestamptz default now()
);

-- User notification preferences (opt-in/opt-out)
create table if not exists notif_prefs (
  user_id uuid primary key references profiles(id) on delete cascade,
  email_enabled boolean default true,
  sms_enabled boolean default true,
  whatsapp_enabled boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_notif_log_user on notif_log(user_id);
create index if not exists idx_notif_log_status on notif_log(status, created_at);
create index if not exists idx_notif_templates_code on notif_templates(code);

-- Insert default notification templates
insert into notif_templates (channel, code, subject, body) values
('email', 'verify_phone_sent', 'Phone Verification Code', 'Hello {{first_name}}, your verification code is {{code}}. Enter this code to verify your phone number.'),
('sms', 'verify_phone_sent', null, 'SAMIA-TAROT: Your verification code is {{code}}'),
('email', 'order_created', 'Order Confirmation', 'Hello {{first_name}}, your order #{{order_id}} for {{service_name}} has been placed successfully.'),
('email', 'order_assigned', 'Your Reading is Starting', 'Hello {{first_name}}, your order #{{order_id}} has been assigned to a reader and work is beginning.'),
('email', 'order_awaiting_approval', 'Reading Complete - Under Review', 'Hello {{first_name}}, your reading for order #{{order_id}} is complete and under final review.'),
('email', 'order_delivered', 'Your Reading is Ready!', 'Hello {{first_name}}, your reading for order #{{order_id}} is now ready. View your results in your account.'),
('email', 'call_reminder', 'Call Reminder', 'Hello {{first_name}}, this is a reminder that your call is scheduled for {{scheduled_time}}.'),
('sms', 'call_reminder', null, 'SAMIA-TAROT: Call reminder - your session starts in 15 minutes'),
('email', 'refund_succeeded', 'Refund Processed', 'Hello {{first_name}}, your refund of {{amount}} for order #{{order_id}} has been processed successfully.')
on conflict (code) do nothing;

-- RLS policies (inherit from M8 global RLS setup)
-- Users can only see their own notification logs and preferences
-- Admins can manage templates and view all notification logs