SET search_path = smartcrm, public;

CREATE SCHEMA IF NOT EXISTS smartcrm AUTHORIZATION postgres;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE OR REPLACE FUNCTION smartcrm.fn_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('admin','manager','sales');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_status') THEN
    CREATE TYPE subscription_status AS ENUM ('trialing','active','past_due','canceled','expired');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'page_status') THEN
    CREATE TYPE page_status AS ENUM ('draft','scheduled','published','archived');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'plan_interval') THEN
    CREATE TYPE plan_interval AS ENUM ('month','year','one_time');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'interaction_type') THEN
    CREATE TYPE interaction_type AS ENUM ('email','note','call','meeting','sms','other');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'priority_level') THEN
    CREATE TYPE priority_level AS ENUM ('low','medium','high','urgent');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_status') THEN
    CREATE TYPE task_status AS ENUM ('open','completed','cancelled');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS smartcrm.site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_by UUID,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS smartcrm.pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  locale TEXT NOT NULL DEFAULT 'en',
  summary TEXT,
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  seo JSONB NOT NULL DEFAULT '{}'::jsonb,
  status page_status NOT NULL DEFAULT 'draft',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  author_id UUID,
  version INTEGER NOT NULL DEFAULT 1,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT pages_slug_locale_unique UNIQUE (slug, locale)
);

CREATE INDEX IF NOT EXISTS idx_pages_status ON smartcrm.pages(status);
CREATE INDEX IF NOT EXISTS idx_pages_locale ON smartcrm.pages(locale);
CREATE INDEX IF NOT EXISTS idx_pages_content_gin ON smartcrm.pages USING GIN (content jsonb_path_ops);

CREATE TABLE IF NOT EXISTS smartcrm.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  price_amount_cents BIGINT NOT NULL DEFAULT 0 CHECK (price_amount_cents >= 0),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  billing_interval plan_interval NOT NULL DEFAULT 'month',
  trial_days INTEGER NOT NULL DEFAULT 0 CHECK (trial_days >= 0),
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  provider_plan_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plans_active ON smartcrm.plans(is_active);
CREATE INDEX IF NOT EXISTS idx_plans_features_gin ON smartcrm.plans USING GIN (features);
CREATE INDEX IF NOT EXISTS idx_plans_limits_gin ON smartcrm.plans USING GIN (limits);

CREATE TABLE IF NOT EXISTS smartcrm.marketing_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT,
  company_name TEXT,
  source TEXT NOT NULL DEFAULT 'landing',
  campaign_metadata JSONB,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_marketing_leads_email ON smartcrm.marketing_leads(email);
CREATE INDEX IF NOT EXISTS idx_marketing_leads_status ON smartcrm.marketing_leads(status);

CREATE TABLE IF NOT EXISTS smartcrm.testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  user_name TEXT NOT NULL,
  role TEXT,
  content TEXT NOT NULL,
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  image_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  locale TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_testimonials_featured ON smartcrm.testimonials(is_featured);

CREATE TABLE IF NOT EXISTS smartcrm.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT NULL,
  owner_user_id UUID NULL,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  timezone TEXT NULL,
  currency CHAR(3) NULL,
  trial_started_at TIMESTAMPTZ NULL,
  trial_ends_at TIMESTAMPTZ NULL,
  subscription_status subscription_status NOT NULL DEFAULT 'trialing',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_companies_name ON smartcrm.companies (name);
CREATE INDEX IF NOT EXISTS idx_companies_domain ON smartcrm.companies (domain);
CREATE INDEX IF NOT EXISTS idx_companies_subscription_status ON smartcrm.companies (subscription_status);

CREATE TRIGGER IF NOT EXISTS trg_companies_updated_at
BEFORE UPDATE ON smartcrm.companies
FOR EACH ROW EXECUTE FUNCTION smartcrm.fn_update_updated_at();

CREATE TABLE IF NOT EXISTS smartcrm.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES smartcrm.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  role user_role NOT NULL DEFAULT 'sales',
  password_hash TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  must_reset_password BOOLEAN NOT NULL DEFAULT FALSE,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ NULL,
  last_login_at TIMESTAMPTZ NULL,
  locale TEXT NULL,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_users_company_email ON smartcrm.users (company_id, lower(email));
CREATE INDEX IF NOT EXISTS idx_users_company_id ON smartcrm.users (company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON smartcrm.users (email);

CREATE TRIGGER IF NOT EXISTS trg_users_updated_at
BEFORE UPDATE ON smartcrm.users
FOR EACH ROW EXECUTE FUNCTION smartcrm.fn_update_updated_at();

CREATE TABLE IF NOT EXISTS smartcrm.auth_refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES smartcrm.users(id) ON DELETE CASCADE,
  refresh_token_hash TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NULL,
  user_agent TEXT NULL,
  ip_address TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_token_hash ON smartcrm.auth_refresh_tokens (refresh_token_hash);
CREATE INDEX IF NOT EXISTS idx_auth_refresh_tokens_user ON smartcrm.auth_refresh_tokens (user_id);

CREATE TABLE IF NOT EXISTS smartcrm.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES smartcrm.users(id) ON DELETE CASCADE,
  session_token_hash TEXT NOT NULL,
  device_info TEXT,
  user_agent TEXT,
  ip_address TEXT,
  last_seen TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON smartcrm.sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON smartcrm.sessions (session_token_hash);

CREATE TABLE IF NOT EXISTS smartcrm.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES smartcrm.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'sales',
  token_hash TEXT NOT NULL,
  sent_by_user_id UUID NULL REFERENCES smartcrm.users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_by UUID NULL,
  accepted_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_company_email ON smartcrm.invitations (company_id, lower(email));
CREATE INDEX IF NOT EXISTS idx_invitations_token_hash ON smartcrm.invitations (token_hash);

CREATE TABLE IF NOT EXISTS smartcrm.password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES smartcrm.users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_token_hash ON smartcrm.password_resets (token_hash);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON smartcrm.password_resets (user_id);

CREATE TABLE IF NOT EXISTS smartcrm.oauth_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES smartcrm.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  provider_user_id TEXT NOT NULL,
  provider_email TEXT,
  tokens_encrypted BYTEA NULL,
  scopes TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_oauth_providers_user ON smartcrm.oauth_providers (user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_providers_provider ON smartcrm.oauth_providers (provider, provider_user_id);

CREATE TRIGGER IF NOT EXISTS trg_oauth_providers_updated_at
BEFORE UPDATE ON smartcrm.oauth_providers
FOR EACH ROW EXECUTE FUNCTION smartcrm.fn_update_updated_at();

CREATE TABLE IF NOT EXISTS smartcrm.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES smartcrm.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  is_won BOOLEAN NOT NULL DEFAULT FALSE,
  is_lost BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_stages_company_pos ON smartcrm.pipeline_stages (company_id, position);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_company_name ON smartcrm.pipeline_stages (company_id, name);
CREATE INDEX IF NOT EXISTS idx_pipeline_stages_metadata_gin ON smartcrm.pipeline_stages USING GIN (metadata);

CREATE TRIGGER IF NOT EXISTS trg_pipeline_stages_updated_at
BEFORE UPDATE ON smartcrm.pipeline_stages
FOR EACH ROW EXECUTE FUNCTION smartcrm.fn_update_updated_at();

CREATE TABLE IF NOT EXISTS smartcrm.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES smartcrm.companies(id) ON DELETE CASCADE,
  pipeline_stage_id UUID NULL REFERENCES smartcrm.pipeline_stages(id) ON DELETE SET NULL,
  owner_user_id UUID NULL REFERENCES smartcrm.users(id) ON DELETE SET NULL,
  name TEXT,
  title TEXT,
  organization TEXT,
  email TEXT,
  phone TEXT,
  source TEXT,
  lead_score INTEGER DEFAULT 0,
  priority priority_level DEFAULT 'medium',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_leads_company_stage ON smartcrm.leads (company_id, pipeline_stage_id);
CREATE INDEX IF NOT EXISTS idx_leads_company_owner ON smartcrm.leads (company_id, owner_user_id);
CREATE INDEX IF NOT EXISTS idx_leads_company_score ON smartcrm.leads (company_id, lead_score);
CREATE INDEX IF NOT EXISTS idx_leads_email ON smartcrm.leads (company_id, lower(email));
CREATE INDEX IF NOT EXISTS idx_leads_metadata_gin ON smartcrm.leads USING GIN (metadata);

CREATE TRIGGER IF NOT EXISTS trg_leads_updated_at
BEFORE UPDATE ON smartcrm.leads
FOR EACH ROW EXECUTE FUNCTION smartcrm.fn_update_updated_at();

CREATE TABLE IF NOT EXISTS smartcrm.contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES smartcrm.companies(id) ON DELETE CASCADE,
  lead_id UUID NULL REFERENCES smartcrm.leads(id) ON DELETE SET NULL,
  name TEXT,
  title TEXT,
  organization TEXT,
  email TEXT,
  phone TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_company_email ON smartcrm.contacts (company_id, lower(email));
CREATE INDEX IF NOT EXISTS idx_contacts_company_org ON smartcrm.contacts (company_id, organization);
CREATE INDEX IF NOT EXISTS idx_contacts_metadata_gin ON smartcrm.contacts USING GIN (metadata);

CREATE TRIGGER IF NOT EXISTS trg_contacts_updated_at
BEFORE UPDATE ON smartcrm.contacts
FOR EACH ROW EXECUTE FUNCTION smartcrm.fn_update_updated_at();

CREATE TABLE IF NOT EXISTS smartcrm.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES smartcrm.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  color TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ux_tags_company_slug UNIQUE (company_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_tags_company_name ON smartcrm.tags (company_id, name);

CREATE TRIGGER IF NOT EXISTS trg_tags_updated_at
BEFORE UPDATE ON smartcrm.tags
FOR EACH ROW EXECUTE FUNCTION smartcrm.fn_update_updated_at();

CREATE TABLE IF NOT EXISTS smartcrm.lead_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES smartcrm.leads(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES smartcrm.tags(id) ON DELETE CASCADE,
  confidence FLOAT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_tags_lead ON smartcrm.lead_tags (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_tags_tag ON smartcrm.lead_tags (tag_id);

CREATE TABLE IF NOT EXISTS smartcrm.interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES smartcrm.leads(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES smartcrm.companies(id) ON DELETE CASCADE,
  contact_id UUID NULL REFERENCES smartcrm.contacts(id) ON DELETE SET NULL,
  type interaction_type NOT NULL DEFAULT 'note',
  direction TEXT NULL,
  subject TEXT,
  body TEXT,
  raw JSONB NULL,
  summary TEXT NULL,
  sentiment TEXT NULL,
  created_by UUID NULL REFERENCES smartcrm.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interactions_lead ON smartcrm.interactions (lead_id);
CREATE INDEX IF NOT EXISTS idx_interactions_company_created ON smartcrm.interactions (company_id, created_at);
CREATE INDEX IF NOT EXISTS idx_interactions_type ON smartcrm.interactions (type);
CREATE INDEX IF NOT EXISTS idx_interactions_raw_gin ON smartcrm.interactions USING GIN (COALESCE(raw, '{}'::jsonb));

CREATE TRIGGER IF NOT EXISTS trg_interactions_updated_at
BEFORE UPDATE ON smartcrm.interactions
FOR EACH ROW EXECUTE FUNCTION smartcrm.fn_update_updated_at();

CREATE TABLE IF NOT EXISTS smartcrm.interaction_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id UUID NOT NULL REFERENCES smartcrm.interactions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES smartcrm.tags(id) ON DELETE CASCADE,
  confidence FLOAT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interaction_tags_interaction ON smartcrm.interaction_tags (interaction_id);
CREATE INDEX IF NOT EXISTS idx_interaction_tags_tag ON smartcrm.interaction_tags (tag_id);

CREATE TABLE IF NOT EXISTS smartcrm.lead_stage_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES smartcrm.leads(id) ON DELETE CASCADE,
  from_stage_id UUID NULL REFERENCES smartcrm.pipeline_stages(id) ON DELETE SET NULL,
  to_stage_id UUID NULL REFERENCES smartcrm.pipeline_stages(id) ON DELETE SET NULL,
  changed_by UUID NULL REFERENCES smartcrm.users(id) ON DELETE SET NULL,
  note TEXT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_stage_history_lead ON smartcrm.lead_stage_history (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_stage_history_to ON smartcrm.lead_stage_history (to_stage_id);

CREATE TABLE IF NOT EXISTS smartcrm.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES smartcrm.companies(id) ON DELETE CASCADE,
  lead_id UUID NULL REFERENCES smartcrm.leads(id) ON DELETE SET NULL,
  contact_id UUID NULL REFERENCES smartcrm.contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to UUID NULL REFERENCES smartcrm.users(id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ NULL,
  status task_status NOT NULL DEFAULT 'open',
  priority priority_level NOT NULL DEFAULT 'medium',
  created_by UUID NULL REFERENCES smartcrm.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_tasks_company_assignee ON smartcrm.tasks (company_id, assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_company_status_due ON smartcrm.tasks (company_id, status, due_at);

CREATE TRIGGER IF NOT EXISTS trg_tasks_updated_at
BEFORE UPDATE ON smartcrm.tasks
FOR EACH ROW EXECUTE FUNCTION smartcrm.fn_update_updated_at();

CREATE TABLE IF NOT EXISTS smartcrm.lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES smartcrm.companies(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES smartcrm.leads(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  model TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_scores_lead ON smartcrm.lead_scores (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_company ON smartcrm.lead_scores (company_id);

ALTER SCHEMA smartcrm OWNER TO postgres;