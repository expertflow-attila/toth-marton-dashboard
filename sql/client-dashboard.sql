-- Expert Flow Client Dashboard Tables
-- Run this in Supabase SQL Editor

-- Client projects (which package each client has)
CREATE TABLE IF NOT EXISTS client_projects (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  business_name text NOT NULL,
  package_tier text NOT NULL CHECK (package_tier IN ('1mo', '3mo', '6mo')),
  package_name text NOT NULL,
  total_price integer NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
  start_date date,
  google_drive_url text,
  telegram_link text,
  stripe_payment_link text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Timeline phases
CREATE TABLE IF NOT EXISTS client_phases (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES client_projects(id) ON DELETE CASCADE,
  phase_number integer NOT NULL,
  title text NOT NULL,
  description text,
  start_date date,
  end_date date,
  status text DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'in_progress', 'completed')),
  created_at timestamptz DEFAULT now()
);

-- Tasks
CREATE TABLE IF NOT EXISTS client_tasks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES client_projects(id) ON DELETE CASCADE,
  phase_id uuid REFERENCES client_phases(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  due_date date,
  created_at timestamptz DEFAULT now()
);

-- Documents
CREATE TABLE IF NOT EXISTS client_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES client_projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  file_url text,
  file_type text,
  created_at timestamptz DEFAULT now()
);

-- AI chat messages
CREATE TABLE IF NOT EXISTS client_chat_messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid REFERENCES client_projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_projects_user_id ON client_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_client_phases_project_id ON client_phases(project_id);
CREATE INDEX IF NOT EXISTS idx_client_tasks_project_id ON client_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_client_tasks_phase_id ON client_tasks(phase_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_project_id ON client_documents(project_id);
CREATE INDEX IF NOT EXISTS idx_client_chat_messages_project_id ON client_chat_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_client_chat_messages_user_id ON client_chat_messages(user_id);

-- RLS Policies
ALTER TABLE client_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see their own projects
CREATE POLICY "Users can view own projects" ON client_projects
  FOR SELECT USING (auth.uid() = user_id);

-- Users can see phases for their projects
CREATE POLICY "Users can view own phases" ON client_phases
  FOR SELECT USING (
    project_id IN (SELECT id FROM client_projects WHERE user_id = auth.uid())
  );

-- Users can see tasks for their projects
CREATE POLICY "Users can view own tasks" ON client_tasks
  FOR SELECT USING (
    project_id IN (SELECT id FROM client_projects WHERE user_id = auth.uid())
  );

-- Users can see documents for their projects
CREATE POLICY "Users can view own documents" ON client_documents
  FOR SELECT USING (
    project_id IN (SELECT id FROM client_projects WHERE user_id = auth.uid())
  );

-- Users can view and insert their own chat messages
CREATE POLICY "Users can view own chat messages" ON client_chat_messages
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat messages" ON client_chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);
