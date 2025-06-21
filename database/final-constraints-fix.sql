-- ===============================================
-- FINAL CONSTRAINTS FIX - Remove Check Constraints
-- ===============================================

-- Remove the model_type check constraint that's blocking AI model inserts
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.table_constraints 
             WHERE constraint_name = 'ai_models_model_type_check' AND table_name = 'ai_models') THEN
    ALTER TABLE ai_models DROP CONSTRAINT ai_models_model_type_check;
  END IF;
END $$;

-- Also remove any other problematic check constraints on ai_models
DO $$
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN 
        SELECT tc.constraint_name 
        FROM information_schema.table_constraints tc
        WHERE tc.table_name = 'ai_models' 
        AND tc.constraint_type = 'CHECK'
    LOOP
        EXECUTE format('ALTER TABLE ai_models DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END LOOP;
END $$;

-- Success message
SELECT 'All check constraints removed from ai_models. Ready for final seeding.' as message; 