# TTM Finder
A lightweight static site for researching Through the Mail signers, exploring categories, and tracking response habits.

## Pages
- `index.html` — landing page for the project
- `directory.html` — signer directory with filters
- `profile.html` — transparent signer profile with Signal Score and Request Mission CTA
- `mission.html` — browser-local Request Mission checklist prototype
- `data-model.json` — draft signer and report schema for the future backend
- `resources.html` — curated external card, supply, database, and community links
- `styles.css` — shared site styling
- `logo.svg` — replaceable TTM Finder logo asset used across the shared brand mark
- `script.js` — rendering logic for signer cards and footer year
- `legal.html` — legal and trust center
- `terms.html`, `privacy.html` — draft terms and privacy notice
- `guidelines.html`, `abuse.html` — community safety and platform integrity rules
- `disclaimer.html`, `data-policy.html` — public-contact and record-quality rules
- `submissions.html`, `copyright.html` — contributor rights and takedown process
- `accessibility.html` — accessibility statement and feedback placeholder
- `supabase/schema.sql` — production database, authentication profile, RLS, reports, missions, and moderation schema
- `supabase/config.example.js` — safe browser configuration template; never commit the real anon configuration file
- `supabase-client.js` — optional frontend adapter with local-prototype fallback
- `admin.html` — Supabase-protected moderation queue for signer and report approvals
- `account.html` — Supabase email/password sign-in and account creation surface

The legal pages are jurisdiction-neutral starting drafts, not legal advice. Replace every placeholder with the operating entity, jurisdiction, monitored contacts, vendors, retention rules, effective dates, and attorney-approved language before launch.

## Supabase setup
1. Create a Supabase project.
2. Run `supabase/schema.sql` in the SQL Editor.
3. Copy `supabase/config.example.js` to `supabase-config.js` and add the project URL and public anon key.
4. The deployed pages load the Supabase browser SDK, `supabase-config.js`, and `supabase-client.js` before `script.js`.
5. Sign up once, then promote that user's profile to `admin` in Supabase.

The schema uses row-level security. Never put a Supabase service-role key in this repository or in browser code.
