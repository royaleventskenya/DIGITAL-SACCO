-- Run these in Supabase SQL editor to create tables  
  
create table users (  
  id uuid primary key default gen_random_uuid(),  
  name text,  
  email text unique not null,  
  password text not null,  
  created_at timestamptz default now()  
);  
  
create table savings (  
  id uuid primary key default gen_random_uuid(),  
  user_id uuid references user
