-- Auth profile table (references Supabase auth.users)
CREATE TABLE auth_profile (
  user_id UUID PRIMARY KEY,
  email TEXT NOT NULL,
  name TEXT,
  avatar TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- User profiles extension
CREATE TABLE user_profiles (
  user_id UUID PRIMARY KEY,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  locale TEXT NOT NULL DEFAULT 'en',
  bio TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Threads table
CREATE TABLE threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  state TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- User memory table
CREATE TABLE user_memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Slack links table
CREATE TABLE slack_links (
  app_user_id UUID NOT NULL,
  slack_team_id TEXT NOT NULL,
  slack_user_id TEXT NOT NULL,
  slack_user_name TEXT,
  slack_display_name TEXT,
  slack_email TEXT,
  linked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  PRIMARY KEY (slack_team_id, slack_user_id)
);

-- Slack link codes table
CREATE TABLE slack_link_codes (
  code TEXT PRIMARY KEY,
  app_user_id UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Phone links table
CREATE TABLE phone_links (
  app_user_id UUID NOT NULL,
  phone_number TEXT PRIMARY KEY,
  linked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes
CREATE INDEX threads_user_updated_idx ON threads (user_id, updated_at);
CREATE INDEX user_memory_user_category_idx ON user_memory (user_id, category);
CREATE UNIQUE INDEX slack_links_app_user_idx ON slack_links (app_user_id);
CREATE INDEX slack_link_codes_app_user_idx ON slack_link_codes (app_user_id);
CREATE UNIQUE INDEX phone_links_app_user_idx ON phone_links (app_user_id);
