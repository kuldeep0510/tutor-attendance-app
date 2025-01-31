-- Create app_versions table
create table if not exists app_versions (
  id uuid default uuid_generate_v4() primary key,
  version varchar not null,
  force_update boolean default false,
  message text,
  release_date timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Add RLS policies
alter table app_versions enable row level security;

-- Allow anyone to read version info
create policy "Allow anyone to read version info"
on app_versions for select
to authenticated
using (true);

-- Only allow admins to modify version info
create policy "Only admins can insert versions"
on app_versions for insert
to authenticated
using (
  auth.jwt() ->> 'email' in (
    select email from users where is_admin = true
  )
);

create policy "Only admins can update versions"
on app_versions for update
to authenticated
using (
  auth.jwt() ->> 'email' in (
    select email from users where is_admin = true
  )
);

-- Insert initial version
insert into app_versions (version, message)
values ('0.1.0', 'Initial release');

-- Create index on version and release_date
create index app_versions_version_idx on app_versions(version);
create index app_versions_release_date_idx on app_versions(release_date);
