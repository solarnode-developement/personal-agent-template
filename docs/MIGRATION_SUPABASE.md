# Migration Guide: Better Auth → Supabase Auth

This document describes the migration from Better Auth with SQLite to Supabase Auth with PostgreSQL.

## Overview

The project has been successfully migrated to use Supabase for both authentication and database operations. This provides several benefits:

- **Managed PostgreSQL Database**: Automatic backups, scaling, and maintenance
- **Native Authentication**: Built-in email/password auth with session management
- **Better Type Safety**: PostgreSQL with Drizzle ORM provides stricter typing
- **Improved Scalability**: PostgreSQL handles more concurrent users and data volume
- **Row-Level Security**: Option to add fine-grained access control if needed

## Key Changes

### Authentication

**Before (Better Auth)**:
- Custom session management with SQLite
- Sessions stored in `session` table
- User credentials in `account` table

**After (Supabase Auth)**:
- Supabase manages auth users via `auth.users` table
- JWT tokens stored as HTTP-only cookies
- Custom user metadata stored in auth.users.user_metadata
- No custom session/account tables needed

### Database Structure

**SQLite Schema** → **PostgreSQL Schema**:
- `user` table → Removed (use Supabase auth.users)
- `session` table → Removed (Supabase manages sessions)
- `account` table → Removed (Supabase OAuth handled)
- `verification` table → Removed (Supabase email verification)
- `user_profiles` → Migrated with UUID user IDs
- `threads` → Migrated with UUID IDs
- `user_memory` → Migrated with UUID IDs
- `slack_links`, `slack_link_codes`, `phone_links` → Migrated

### Dependencies

**Removed**:
- `better-auth` - Authentication library
- `@libsql/client` - SQLite database client

**Added**:
- `@supabase/supabase-js` - Supabase client SDK
- `postgres` - PostgreSQL driver for Drizzle

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for the database to initialize

### 2. Set Environment Variables

Copy your Supabase credentials:

```bash
# From Supabase Project Settings → API
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-secret-service-role-key

# Also needed:
SUPABASE_DATABASE_URL=postgresql://postgres:password@db.url/postgres
```

The `SUPABASE_DATABASE_URL` format can be found in your Supabase project settings under "Database" → "Connection pooling" or "Connection string".

### 3. Run Database Migrations

```bash
# Pull environment variables from Vercel
vercel env pull .env --yes

# Run migrations to create tables
pnpm db:migrate
```

### 4. Deploy to Vercel

When deploying, ensure both the `web` and `eve` services have the same environment variables:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_DATABASE_URL` (backend/server only)
- `INTERNAL_API_SECRET` (matching between web and eve)

## Code Changes

### Client-Side Authentication

**Login Page** (`app/pages/login.vue`):
```typescript
// Before
import { authClient } from "~/lib/auth-client";
const result = await authClient.signUp.email({ email, password, name });

// After
import { supabase } from "~/lib/auth-client";
const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } });
```

### Server-Side Session

**Session Middleware** (`app/middleware/auth.global.ts`):
```typescript
// Before
const { data: session } = await authClient.getSession({ headers });

// After
const { data: { session } } = await supabase.auth.getSession();
```

### Profile Management

**Profile Utils** (`server/utils/profile.ts`):
- Now fetches user info from Supabase Auth admin API
- Stores profile settings in `user_profiles` table
- User metadata (name) stored in Supabase auth.users.user_metadata

## User Data Migration

If you had existing users in Better Auth SQLite, you'll need to migrate them:

1. **Export user data** from your old SQLite database
2. **Create Supabase users** using the admin API
3. **Import profile data** into the new PostgreSQL database

Example migration script (if needed):
```typescript
// Import old user data
const oldUsers = await sqliteDb.select().from(userTable);

// Create new Supabase users
for (const oldUser of oldUsers) {
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: oldUser.email,
    password: crypto.randomUUID(), // New password
    email_confirm: true,
    user_metadata: {
      name: oldUser.name,
    }
  });

  if (data?.user?.id) {
    // Create profile record with new UUID
    await postgresDb.insert(schema.userProfiles).values({
      userId: data.user.id,
      // ... other fields
    });
  }
}
```

## Testing the Migration

1. **Sign up**: Test creating a new account via the login page
2. **Check Supabase**: Verify the user appears in `Authentication` → `Users`
3. **Sign in**: Test logging back in with the created credentials
4. **Protected routes**: Verify `/chat` and `/settings` require authentication
5. **Profile**: Test updating profile information
6. **Sign out**: Verify session is cleared and redirect to `/login`

## Troubleshooting

### "SUPABASE_DATABASE_URL is not set"

The `postgres.ts` client needs the database URL for server-side operations:

```bash
# Add to .env.local
SUPABASE_DATABASE_URL=postgresql://postgres:...@db.url/postgres
```

### "Can't connect to database"

1. Verify the database URL is correct (no spaces, proper format)
2. Check firewall/IP whitelist in Supabase settings
3. Ensure the database is initialized (check Supabase dashboard)

### "JWT expired or invalid"

- Tokens are stored as HTTP-only cookies (`sb-access-token`)
- Browsers must support cookies for authentication
- Check that redirect after login goes to correct URL

### "User metadata not updating"

When changing user name through `/api/profile`, the update goes to Supabase:

```typescript
// This updates auth.users.user_metadata
await supabaseAdmin.auth.admin.updateUserById(userId, {
  user_metadata: { name: newName }
});
```

## Rollback (if needed)

If you need to rollback:

1. Keep the old SQLite database files as backup
2. Revert to the previous git commit: `git revert <commit-hash>`
3. Reinstall old dependencies: `pnpm install`
4. Redeploy

## Future Improvements

With Supabase, you can now:

- **Enable Row-Level Security (RLS)** for fine-grained access control
- **Add OAuth providers** (Google, GitHub, etc.)
- **Use Supabase Realtime** for live updates
- **Implement Magic Links** or Passwordless auth
- **Add Two-Factor Authentication** (2FA)
- **Use Custom Claims** for role-based access control

Refer to the Supabase documentation for these features.

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Drizzle ORM PostgreSQL Guide](https://orm.drizzle.team/docs/get-started-postgresql)
- [Better Auth Supabase Adapter](https://www.better-auth.com/docs/adapters/supabase) (for reference)
