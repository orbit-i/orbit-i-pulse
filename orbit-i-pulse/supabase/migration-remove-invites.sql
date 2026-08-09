-- =============================================================
-- MIGRATION: Remove invite_codes table (if it exists)
-- =============================================================
-- Run this ONLY if you already ran an earlier version of
-- schema.sql that created the invite_codes table, and your
-- Supabase project still has it. Safe to run even if the table
-- doesn't exist (DROP TABLE IF EXISTS is a no-op in that case).
--
-- If you have NOT run any schema yet, skip this file and just
-- run supabase/schema.sql — it no longer includes invite_codes.
-- =============================================================

DROP TABLE IF EXISTS invite_codes;
