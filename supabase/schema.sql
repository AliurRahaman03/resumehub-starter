-- Run this entire file in Supabase Dashboard > SQL Editor.
create table if not exists public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  candidate_name text not null check (char_length(candidate_name) between 1 and 100),
  job_role text not null check (char_length(job_role) between 1 and 80),
  file_name text not null check (char_length(file_name) between 1 and 255),
  storage_path text not null unique,
  created_at timestamptz not null default now()
);

alter table public.resumes enable row level security;

drop policy if exists "Users can read their own resumes" on public.resumes;
create policy "Users can read their own resumes"
on public.resumes for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can add their own resumes" on public.resumes;
create policy "Users can add their own resumes"
on public.resumes for insert to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own resumes" on public.resumes;
create policy "Users can delete their own resumes"
on public.resumes for delete to authenticated
using (auth.uid() = user_id);

-- Create a PRIVATE bucket. File access is controlled by these policies.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 10485760, array['application/pdf'])
on conflict (id) do update set
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = array['application/pdf'];

drop policy if exists "Users can upload resumes to own folder" on storage.objects;
create policy "Users can upload resumes to own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
  and lower(storage.extension(name)) = 'pdf'
);

drop policy if exists "Users can read resumes in own folder" on storage.objects;
create policy "Users can read resumes in own folder"
on storage.objects for select to authenticated
using (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete resumes in own folder" on storage.objects;
create policy "Users can delete resumes in own folder"
on storage.objects for delete to authenticated
using (
  bucket_id = 'resumes'
  and (storage.foldername(name))[1] = auth.uid()::text
);
