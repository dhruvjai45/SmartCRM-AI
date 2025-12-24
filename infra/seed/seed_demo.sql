SET search_path = smartcrm, public;

INSERT INTO plans (id, name, slug, description, price_amount_cents, currency, billing_interval, trial_days, features, limits, is_active) VALUES (gen_random_uuid(), 'Starter', 'starter', 'Starter plan for demos', 0, 'USD', 'month', 30, '[]', '{}', true);

INSERT INTO companies (id, name, domain, timezone, currency, trial_started_at, trial_ends_at, subscription_status) VALUES (gen_random_uuid(), 'Demo Company', 'demo.local', 'Asia/Kolkata', 'INR', now(), now() + interval '30 days', 'trialing');

WITH c AS (SELECT id FROM companies WHERE name = 'Demo Company' LIMIT 1)
INSERT INTO pipeline_stages (company_id, name, position, is_won, is_lost)
SELECT id, 'New', 0, false, false FROM c
UNION ALL SELECT id, 'Contacted', 1, false, false FROM c
UNION ALL SELECT id, 'Interested', 2, false, false FROM c
UNION ALL SELECT id, 'Proposal', 3, false, false FROM c
UNION ALL SELECT id, 'Won', 4, true, false FROM c
UNION ALL SELECT id, 'Lost', 5, false, true FROM c;

INSERT INTO users (id, company_id, email, name, role, password_hash, created_at)
SELECT gen_random_uuid(), id, 'admin@demo.local', 'Demo Admin', 'admin', '$argon2id$PLACEHOLDER', now()
FROM companies WHERE name = 'Demo Company' LIMIT 1;

WITH c AS (SELECT id FROM companies WHERE name = 'Demo Company' LIMIT 1),
  s AS (SELECT id FROM pipeline_stages WHERE company_id = (SELECT id FROM c) ORDER BY position LIMIT 1)
INSERT INTO leads (id, company_id, pipeline_stage_id, owner_user_id, name, organization, email, phone, source, lead_score, priority, metadata)
SELECT gen_random_uuid(), (SELECT id FROM c), (SELECT id FROM s), (SELECT id FROM users WHERE email = 'admin@demo.local'), 'Ravi Sharma', 'Acme Solutions', 'ravi@acme.com', '+91-99999-00001', 'website', 45, 'medium', '{"note":"Interested in pricing"}'
UNION ALL
SELECT gen_random_uuid(), (SELECT id FROM c), (SELECT id FROM s), (SELECT id FROM users WHERE email = 'admin@demo.local'), 'Priya Verma', 'Beta Corp', 'priya@beta.com', '+91-99999-00002', 'import', 30, 'low', '{}';

INSERT INTO interactions (lead_id, company_id, type, subject, body, created_by)
SELECT l.id, l.company_id, 'email', 'Intro to SmartCRM', 'Hi, I want to know about SmartCRM features.', u.id
FROM leads l
JOIN users u ON u.company_id = l.company_id
WHERE l.email = 'ravi@acme.com' LIMIT 1;

INSERT INTO tags (company_id, name, slug) SELECT id, 'pricing', 'pricing' FROM companies WHERE name = 'Demo Company' LIMIT 1;

INSERT INTO lead_scores (company_id, lead_id, score, model)
SELECT l.company_id, l.id, 40, 'heuristic-v1' FROM leads l WHERE l.email = 'ravi@acme.com' LIMIT 1;