-- Enable the pgvector extension to work with embedding vectors (if needed later)
-- create extension vector;

-- Projects Table
create table projects (
  id text primary key,
  title text,
  original_note text,
  tags jsonb, -- Stores array of strings
  main_image_url text,
  timestamp bigint
);

-- Versions Table
create table versions (
  id text primary key,
  project_id text references projects(id) on delete cascade,
  title text,
  tags jsonb, -- Stores array of strings
  description text,
  content text,
  image_url text,
  type text,
  is_recommended boolean default false
);

-- Drafts Table
create table drafts (
  id text primary key,
  text text,
  timestamp bigint
);

-- Enable Row Level Security (RLS) - Optional: Disable if you want public access for simple testing
-- alter table projects enable row level security;
-- alter table versions enable row level security;
-- alter table drafts enable row level security;

-- Create policies (Simplest: Allow all for anon if you set up anon key)
-- create policy "Enable read access for all users" on projects for select using (true);
-- create policy "Enable insert access for all users" on projects for insert with check (true);
-- create policy "Enable update access for all users" on projects for update using (true);
-- create policy "Enable delete access for all users" on projects for delete using (true);
-- Same for versions and drafts...
