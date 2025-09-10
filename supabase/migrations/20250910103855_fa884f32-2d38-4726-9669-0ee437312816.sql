-- Create admin management tables
CREATE TABLE IF NOT EXISTS public.admin_actions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  target_user_id UUID,
  target_resource_id UUID,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on admin_actions
ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

-- Create admin policies
CREATE POLICY "Admins can view admin actions" 
ON public.admin_actions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can create admin actions" 
ON public.admin_actions 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'admin') AND admin_id = auth.uid());

-- Create problem reports table
CREATE TABLE IF NOT EXISTS public.problem_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  assignment_id UUID,
  resolved_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on problem_reports
ALTER TABLE public.problem_reports ENABLE ROW LEVEL SECURITY;

-- Create problem report policies
CREATE POLICY "Users can create problem reports" 
ON public.problem_reports 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their problem reports" 
ON public.problem_reports 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all problem reports" 
ON public.problem_reports 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update problem reports" 
ON public.problem_reports 
FOR UPDATE 
USING (has_role(auth.uid(), 'admin'));

-- Create offers table for service proposals
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id UUID NOT NULL,
  traveler_id UUID NOT NULL,
  sender_id UUID NOT NULL,
  trip_id UUID,
  proposed_price NUMERIC NOT NULL,
  pickup_date DATE NOT NULL,
  delivery_date DATE NOT NULL,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days')
);

-- Enable RLS on offers
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Create offer policies
CREATE POLICY "Travelers can create offers" 
ON public.offers 
FOR INSERT 
WITH CHECK (traveler_id = auth.uid());

CREATE POLICY "Users can view their offers" 
ON public.offers 
FOR SELECT 
USING (traveler_id = auth.uid() OR sender_id = auth.uid());

CREATE POLICY "Senders can update offers" 
ON public.offers 
FOR UPDATE 
USING (sender_id = auth.uid());

-- Add updated_at trigger for problem_reports
CREATE TRIGGER update_problem_reports_updated_at
BEFORE UPDATE ON public.problem_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for offers
CREATE TRIGGER update_offers_updated_at
BEFORE UPDATE ON public.offers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();