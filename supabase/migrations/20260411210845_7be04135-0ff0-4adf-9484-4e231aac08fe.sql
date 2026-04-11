-- Fix: Add WITH CHECK to 'own apps' policy so users can only insert rows for themselves
DROP POLICY "own apps" ON public.apps;
CREATE POLICY "own apps" ON public.apps
  FOR ALL
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Fix: Add WITH CHECK to 'own analyses' policy so users can only insert rows for themselves
DROP POLICY "own analyses" ON public.analyses;
CREATE POLICY "own analyses" ON public.analyses
  FOR ALL
  TO public
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);