CREATE TABLE public.queue_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  answer TEXT NOT NULL,
  viewed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT INSERT ON public.queue_responses TO anon, authenticated;
GRANT ALL ON public.queue_responses TO service_role;

ALTER TABLE public.queue_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a response"
ON public.queue_responses
FOR INSERT
TO anon, authenticated
WITH CHECK (char_length(answer) BETWEEN 1 AND 2000);