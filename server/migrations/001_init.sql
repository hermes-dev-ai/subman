-- SubMan - Database Schema
-- PostgreSQL 16 + PostgREST v12

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Auth schema (managed by auth-service)
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE auth.clients (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  company TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE auth.customers (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  phone TEXT,
  fcm_token TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Public schema (exposed via PostgREST)
CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE public.subscription_plans (
  id SERIAL PRIMARY KEY,
  client_id INT NOT NULL REFERENCES auth.clients(id),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'XOF',
  duration INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.subscriptions (
  id SERIAL PRIMARY KEY,
  plan_id INT NOT NULL REFERENCES public.subscription_plans(id),
  customer_id INT NOT NULL REFERENCES auth.customers(id),
  client_id INT NOT NULL REFERENCES auth.clients(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active','expired','cancelled')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  auto_renew BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.payments (
  id SERIAL PRIMARY KEY,
  subscription_id INT NOT NULL REFERENCES public.subscriptions(id),
  amount NUMERIC(10,2) NOT NULL,
  currency TEXT DEFAULT 'XOF',
  method TEXT DEFAULT 'especes' CHECK (method IN ('especes','orange_money','mtn','wave','virement')),
  status TEXT DEFAULT 'paye' CHECK (status IN ('paye','en_attente','annule')),
  paid_at DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Views for PostgREST
CREATE VIEW public.v_subscriptions AS
SELECT s.id, sp.name AS plan_name, sp.description, sp.price, sp.currency,
  s.status, s.start_date, s.end_date, s.auto_renew,
  c.id AS customer_id, c.name AS customer_name, c.email AS customer_email,
  cl.id AS client_id, cl.name AS client_name,
  GREATEST(0, (s.end_date - CURRENT_DATE)) AS days_remaining,
  (s.end_date < CURRENT_DATE) AS is_expired,
  (SELECT COALESCE(SUM(p.amount), 0) FROM public.payments p WHERE p.subscription_id = s.id) AS total_paid
FROM public.subscriptions s
JOIN public.subscription_plans sp ON sp.id = s.plan_id
JOIN auth.customers c ON c.id = s.customer_id
JOIN auth.clients cl ON cl.id = s.client_id;

CREATE VIEW public.v_dashboard AS
SELECT cl.id AS client_id, cl.name AS client_name,
  COUNT(DISTINCT s.id) AS total_subscriptions,
  COUNT(DISTINCT s.customer_id) AS total_customers,
  COUNT(DISTINCT CASE WHEN s.status = 'active' THEN s.id END) AS active_subscriptions,
  COUNT(DISTINCT CASE WHEN s.end_date < CURRENT_DATE THEN s.id END) AS expired_subscriptions,
  COALESCE(SUM(p.amount), 0) AS total_revenue
FROM auth.clients cl
LEFT JOIN public.subscriptions s ON s.client_id = cl.id
LEFT JOIN public.payments p ON p.subscription_id = s.id
GROUP BY cl.id, cl.name;

-- Roles for PostgREST JWT auth
CREATE ROLE subman_anon NOLOGIN;
CREATE ROLE subman_customer NOLOGIN;
CREATE ROLE subman_client NOLOGIN;

GRANT USAGE ON SCHEMA public TO subman_anon, subman_customer, subman_client;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO subman_anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO subman_customer, subman_client;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO subman_customer, subman_client;

-- RPC Functions
CREATE OR REPLACE FUNCTION public.renew_subscription(pid INT)
RETURNS public.subscriptions AS $$
DECLARE vs public.subscriptions; vp public.subscription_plans;
BEGIN
  SELECT * INTO vs FROM public.subscriptions WHERE id = pid;
  SELECT * INTO vp FROM public.subscription_plans WHERE id = vs.plan_id;
  UPDATE public.subscriptions SET status='active', start_date=CURRENT_DATE,
    end_date=CURRENT_DATE + vp.duration, updated_at=NOW()
  WHERE id = pid RETURNING * INTO vs;
  RETURN vs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.record_payment(
  pid INT, amt NUMERIC, cur TEXT DEFAULT 'XOF', meth TEXT DEFAULT 'especes'
) RETURNS public.payments AS $$
DECLARE vp public.payments;
BEGIN
  INSERT INTO public.payments(subscription_id, amount, currency, method, status, paid_at)
  VALUES (pid, amt, cur, meth, 'paye', CURRENT_DATE) RETURNING * INTO vp;
  RETURN vp;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Indexes
CREATE INDEX idx_subscriptions_customer ON public.subscriptions(customer_id);
CREATE INDEX idx_subscriptions_client ON public.subscriptions(client_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_payments_subscription ON public.payments(subscription_id);
CREATE INDEX idx_plans_client ON public.subscription_plans(client_id);
