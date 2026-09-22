-- Use this only if the admin page says:
-- "Could not find the 'name' column of 'signers' in the schema cache".
-- It upgrades an older/basic signers table without deleting existing rows.

alter table public.signers alter column id set default gen_random_uuid();

alter table public.signers add column if not exists slug text;
alter table public.signers add column if not exists name text;
alter table public.signers add column if not exists category text;
alter table public.signers add column if not exists subcategory text;
alter table public.signers add column if not exists note text default '';
alter table public.signers add column if not exists public_contact_type text;
alter table public.signers add column if not exists public_contact_label text;
alter table public.signers add column if not exists public_contact_url text;
alter table public.signers add column if not exists public_contact_verified_at date;
alter table public.signers add column if not exists source_notes text;
alter table public.signers add column if not exists record_status text default 'draft';
alter table public.signers add column if not exists confidence text default 'medium';
alter table public.signers add column if not exists response_status text default 'unverified';
alter table public.signers add column if not exists signed_status text default 'unknown';
alter table public.signers add column if not exists wait_unit text default 'days';
alter table public.signers add column if not exists typical_wait_min integer default 0;
alter table public.signers add column if not exists typical_wait_max integer default 0;
alter table public.signers add column if not exists signal_score integer default 0;
alter table public.signers add column if not exists created_by uuid;
alter table public.signers add column if not exists updated_by uuid;
alter table public.signers add column if not exists created_at timestamptz default timezone('utc', now());
alter table public.signers add column if not exists updated_at timestamptz default timezone('utc', now());

update public.signers
set
  name = coalesce(nullif(name, ''), 'Unnamed signer'),
  slug = coalesce(nullif(slug, ''), 'signer-' || id::text),
  category = coalesce(nullif(category, ''), 'Sports'),
  subcategory = coalesce(nullif(subcategory, ''), 'Baseball'),
  record_status = coalesce(nullif(record_status, ''), 'draft'),
  confidence = coalesce(nullif(confidence, ''), 'medium'),
  response_status = coalesce(nullif(response_status, ''), 'unverified'),
  signed_status = coalesce(nullif(signed_status, ''), 'unknown'),
  wait_unit = coalesce(nullif(wait_unit, ''), 'days'),
  typical_wait_min = coalesce(typical_wait_min, 0),
  typical_wait_max = coalesce(typical_wait_max, 0),
  signal_score = coalesce(signal_score, 0),
  created_at = coalesce(created_at, timezone('utc', now())),
  updated_at = coalesce(updated_at, timezone('utc', now()));

create unique index if not exists signers_slug_key on public.signers (slug);
notify pgrst, 'reload schema';
