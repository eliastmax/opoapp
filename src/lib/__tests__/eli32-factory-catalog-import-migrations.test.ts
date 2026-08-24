// @ts-expect-error bun:test provided by bun runtime
import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";

const paths = [
  "../../../supabase/migrations/20260824005113_eli32_factory_catalog_security.sql",
  "../../../supabase/migrations/20260824005816_eli32_factory_catalog_importers.sql",
  "../../../supabase/migrations/20260824010235_eli32_core_owner_execute_fix.sql",
  "../../../supabase/migrations/20260824010424_eli32_study_import_returning_fix.sql",
  "../../../supabase/migrations/20260824011321_eli32_session_auth_uid_helper.sql",
  "../../../supabase/migrations/20260824011359_eli32_session_auth_uid_policy_patch.sql",
  "../../../supabase/migrations/20260824011701_eli32_auth_surface_normalization.sql",
] as const;

const migrations = paths.map((path) =>
  readFileSync(new URL(path, import.meta.url), "utf8"),
);
const [security, importers, ownerFix, returningFix, helper, policyPatch, normalization] =
  migrations;
const all = migrations.join("\n");

describe("ELI-32 Factory catalog import infrastructure", () => {
  it("creates dedicated non-login, non-bypass technical roles", () => {
    expect(security).toContain(
      "create role factory_catalog_executor nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls noreplication",
    );
    expect(security).toContain(
      "create role v4_authenticated_executor nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls noreplication",
    );
    expect(all).not.toMatch(/alter\s+role\s+(factory_catalog_executor|v4_authenticated_executor)[\s\S]*?bypassrls/i);
  });

  it("keeps Factory entry points in private schemas and closes client access", () => {
    expect(security).toContain("create schema factory_admin");
    expect(security).toContain("create schema catalog_import_private");
    expect(security).toContain(
      "revoke all on schema factory_admin from public, anon, authenticated, service_role",
    );
    expect(importers).toContain(
      "revoke all on function factory_admin.import_questions(uuid,uuid,uuid,uuid,jsonb,text[]) from public,anon,authenticated,service_role",
    );
    expect(importers).toContain(
      "revoke all on function factory_admin.import_v4_study_content(uuid,uuid,uuid,uuid,jsonb) from public,anon,authenticated,service_role",
    );
  });

  it("uses security-definer wrappers with fixed search paths and security-invoker cores", () => {
    const factoryQuestionsStart = importers.indexOf(
      "create or replace function factory_admin.import_questions(",
    );
    const factoryV4Start = importers.indexOf(
      "create or replace function factory_admin.import_v4_study_content(",
    );
    const authenticatedWrapperStart = importers.indexOf(
      "-- Historical authenticated wrapper",
    );
    const factoryQuestions = importers.slice(factoryQuestionsStart, factoryV4Start);
    const factoryV4 = importers.slice(factoryV4Start, authenticatedWrapperStart);
    const questionsCore = importers.slice(
      importers.indexOf("create or replace function catalog_import_private.import_questions_core("),
      importers.indexOf("create or replace function catalog_import_private.import_v4_core("),
    );
    const v4Core = importers.slice(
      importers.indexOf("create or replace function catalog_import_private.import_v4_core("),
      factoryQuestionsStart,
    );

    expect(factoryQuestionsStart).toBeGreaterThanOrEqual(0);
    expect(factoryV4Start).toBeGreaterThan(factoryQuestionsStart);
    expect(authenticatedWrapperStart).toBeGreaterThan(factoryV4Start);

    expect(factoryQuestions).toMatch(/security\s+definer/i);
    expect(factoryQuestions).toMatch(/set\s+search_path\s*=\s*pg_catalog,pg_temp/i);
    expect(factoryQuestions).toMatch(/session_user\s*<>\s*'postgres'/i);
    expect(factoryV4).toMatch(/security\s+definer/i);
    expect(factoryV4).toMatch(/set\s+search_path\s*=\s*pg_catalog,pg_temp/i);
    expect(factoryV4).toMatch(/session_user\s*<>\s*'postgres'/i);

    for (const core of [questionsCore, v4Core]) {
      expect(core).toContain("security invoker");
      expect(core).toContain("set search_path=pg_catalog,pg_temp");
    }
  });

  it("activates Factory trigger semantics only for the technical current_user", () => {
    expect(importers).toContain("if current_user='factory_catalog_executor' then");
    expect(importers).toContain("Factory cannot write %");
    expect(importers).toContain("Factory question identity cannot move");
    expect(importers).toContain("Factory question subtopic is outside the locked topic");
    expect(importers).toContain("v_user_id:=(select auth.uid())");
    expect(importers).toContain("v_opposition_id:=public.current_active_opposition_id()");
  });

  it("locks Factory v1 to Celador and resolves question identity by opposition/topic/code", () => {
    expect(all).toContain("00000000-0000-4000-8000-000000000002");
    expect(importers).toContain(
      "where q.opposition_id=p_opposition_id and q.topic_id=p_topic_id and q.codigo=v_code",
    );
    expect(importers).toContain(
      "where q.opposition_id=p_opposition_id and q.codigo=v_code and q.topic_id<>p_topic_id",
    );
    expect(importers).toContain("values(\n        v_curator_id,v_code,v_subject_id,p_topic_id");
    expect(importers).not.toContain("where q.user_id=p_actor_user_id");
  });

  it("uses exact-code replacement whitelisting rather than pattern matching", () => {
    expect(importers).toContain(
      "v_code=any(coalesce(p_allowed_replacement_codes,'{}'::text[]))",
    );
    expect(importers).toContain(
      "Every allowed replacement must exist in both payload and locked topic",
    );
    const conflict = importers.slice(
      importers.indexOf("if v_changed and not(v_code=any"),
      importers.indexOf("update public.questions q set"),
    );
    expect(conflict).not.toMatch(/\blike\b|similar\s+to/i);
  });

  it("keeps one shared V4 core reached by both wrappers", () => {
    expect(
      all.match(
        /create or replace function catalog_import_private\.import_v4_core\(/gi,
      ),
    ).toHaveLength(1);
    const factoryWrapper = importers.slice(
      importers.indexOf("create or replace function factory_admin.import_v4_study_content("),
      importers.indexOf("-- Historical authenticated wrapper"),
    );
    expect(factoryWrapper).toContain("catalog_import_private.import_v4_core(");
    expect(policyPatch).toContain("catalog_import_private.import_v4_core(");
  });

  it("resolves authenticated identity privately without granting auth schema access", () => {
    expect(helper).toContain(
      "create or replace function catalog_import_private.session_auth_uid()",
    );
    expect(helper).toContain("security invoker");
    expect(helper).toContain("current_setting('request.jwt.claim.sub', true)");
    expect(helper).toContain("current_setting('request.jwt.claims', true)");
    expect(helper).toContain("::jsonb ->> 'sub'");
    expect(helper).toContain("revoke usage on schema auth from v4_authenticated_executor");
    expect(normalization).toContain(
      "revoke usage on schema auth from v4_authenticated_executor",
    );
    expect(helper).toContain(
      "revoke all on function catalog_import_private.session_auth_uid() from public, anon, authenticated, service_role, postgres, factory_catalog_executor",
    );
  });

  it("preserves authenticated V4 authorization after identity resolution", () => {
    const policyPatchBody = policyPatch.slice(0, policyPatch.indexOf("do $assertions$"));

    expect(policyPatchBody).toContain("v_user_id uuid := catalog_import_private.session_auth_uid()");
    expect(policyPatchBody).toContain("select p.active_opposition_id into v_active_opposition_id");
    expect(policyPatchBody).toContain("The package opposition must be the current active opposition");
    expect(policyPatchBody).toContain("Opposition administrator permission required");
    expect(policyPatchBody).toContain("subjectName");
    expect(policyPatchBody).toContain("Topic % is ambiguous in opposition %; subjectName is required");
    expect(policyPatchBody).not.toContain("auth.uid()");
    expect(policyPatchBody).not.toContain("current_active_opposition_id()");
    expect(policyPatch).toContain("ilike '%auth.uid%'");
  });

  it("persists private audit metadata without academic payload bodies", () => {
    expect(security).toContain("create table factory_admin.catalog_import_audit");
    for (const field of [
      "run_id uuid not null",
      "actor_user_id uuid not null",
      "opposition_id uuid not null",
      "topic_id uuid not null",
      "payload_fingerprint text not null",
      "allowed_replacement_codes text[]",
      "counts jsonb",
      "status text not null",
      "started_at timestamptz",
      "completed_at timestamptz",
      "error_code text",
    ]) {
      expect(security).toContain(field);
    }
    expect(security).not.toContain("pregunta text");
    expect(security).not.toContain("prompt text");
    expect(security).not.toContain("answer text");
  });

  it("retains minimal technical fixes and removes temporary SET ROLE capability", () => {
    expect(ownerFix).toContain("grant execute on function catalog_import_private.import_questions_core");
    expect(returningFix).toContain("grant select on public.study_content_imports");
    expect(all).toContain("revoke factory_catalog_executor from postgres");
    expect(all).toContain("revoke v4_authenticated_executor from postgres");
  });

  it("contains no academic import invocation or T04 payload", () => {
    expect(all).not.toMatch(/select\s+factory_admin\.import_questions\s*\(/i);
    expect(all).not.toMatch(/select\s+factory_admin\.import_v4_study_content\s*\(/i);
    expect(all).not.toContain("SMS-CEL-T04-0007");
    expect(all).not.toContain("153 nuevas");
  });
});
