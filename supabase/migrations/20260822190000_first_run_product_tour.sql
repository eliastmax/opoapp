-- First-run product education is account state, not preparation-profile state.
CREATE TABLE public.product_tour_states (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  completion_kind text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_tour_states_completion_kind_check
    CHECK (completion_kind IN ('completed', 'skipped'))
);

ALTER TABLE public.product_tour_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY product_tour_states_read_own
  ON public.product_tour_states FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY product_tour_states_insert_own
  ON public.product_tour_states FOR INSERT TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY product_tour_states_update_own
  ON public.product_tour_states FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

REVOKE ALL ON TABLE public.product_tour_states FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.product_tour_states TO authenticated;

COMMENT ON TABLE public.product_tour_states IS
  'Private per-user completion state for the optional first-run product tour; separate from preparation profiles.';
