// Dummy env for the unit suite. Nothing here points at a real service: tests
// either import pure modules or mock `lib/supabase`, so no test can reach the
// live database. These values only exist so an accidental `config/env` import
// cannot fall through to `backend/.env` (dotenv does not override what is
// already set in process.env).
process.env.NODE_ENV = "test";
process.env.PORT = "4000";
process.env.SUPABASE_URL = "http://127.0.0.1:54321";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
process.env.OPENAI_API_KEY = "test-openai-key";
process.env.OPENAI_MODEL = "gpt-4o-mini";
process.env.CORS_ORIGIN = "http://127.0.0.1:5173";
