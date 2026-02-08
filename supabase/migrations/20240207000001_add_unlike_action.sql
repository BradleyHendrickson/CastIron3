-- Add 'unlike' to allowed actions
ALTER TABLE public.restaurant_interactions
DROP CONSTRAINT IF EXISTS restaurant_interactions_action_check;

ALTER TABLE public.restaurant_interactions
ADD CONSTRAINT restaurant_interactions_action_check
CHECK (action IN ('like', 'skip', 'unlike'));
