-- Create app roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'sender', 'traveler');

-- Create delivery status enum
CREATE TYPE public.delivery_status AS ENUM ('pending', 'accepted', 'in_transit', 'delivered', 'cancelled');

-- Create kyc status enum
CREATE TYPE public.kyc_status AS ENUM ('pending', 'approved', 'rejected');

-- Create dispute status enum
CREATE TYPE public.dispute_status AS ENUM ('open', 'investigating', 'resolved', 'closed');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  email TEXT NOT NULL UNIQUE,
  first_name TEXT,
  last_name TEXT,
  phone TEXT,
  country TEXT,
  city TEXT,
  avatar_url TEXT,
  rating DECIMAL(3,2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create kyc_documents table
CREATE TABLE public.kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT NOT NULL, -- 'passport', 'id_card', 'driving_license'
  document_url TEXT NOT NULL,
  status kyc_status DEFAULT 'pending',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create trips table
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  traveler_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  departure_city TEXT NOT NULL,
  departure_country TEXT NOT NULL,
  arrival_city TEXT NOT NULL,
  arrival_country TEXT NOT NULL,
  departure_date TIMESTAMPTZ NOT NULL,
  arrival_date TIMESTAMPTZ,
  transport_type TEXT NOT NULL, -- 'plane', 'bus', 'car', 'truck'
  max_weight_kg DECIMAL(5,2) NOT NULL,
  max_volume_m3 DECIMAL(5,2),
  price_per_kg DECIMAL(8,2) NOT NULL,
  available_weight_kg DECIMAL(5,2) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create shipments table
CREATE TABLE public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  weight_kg DECIMAL(5,2) NOT NULL,
  volume_m3 DECIMAL(5,2),
  pickup_address TEXT NOT NULL,
  pickup_city TEXT NOT NULL,
  pickup_country TEXT NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_city TEXT NOT NULL,
  delivery_country TEXT NOT NULL,
  pickup_contact_name TEXT NOT NULL,
  pickup_contact_phone TEXT NOT NULL,
  delivery_contact_name TEXT NOT NULL,
  delivery_contact_phone TEXT NOT NULL,
  estimated_value DECIMAL(10,2),
  special_instructions TEXT,
  photos TEXT[], -- Array of photo URLs
  status delivery_status DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create match_requests table
CREATE TABLE public.match_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE NOT NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  traveler_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  estimated_price DECIMAL(8,2) NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shipment_id, trip_id)
);

-- Create assignments table (accepted matches)
CREATE TABLE public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_request_id UUID REFERENCES public.match_requests(id) ON DELETE CASCADE NOT NULL,
  shipment_id UUID REFERENCES public.shipments(id) ON DELETE CASCADE NOT NULL,
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  traveler_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  final_price DECIMAL(8,2) NOT NULL,
  commission_rate DECIMAL(5,4) DEFAULT 0.15, -- 15% commission
  commission_amount DECIMAL(8,2),
  traveler_amount DECIMAL(8,2),
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'released'
  pickup_completed_at TIMESTAMPTZ,
  delivery_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create tracking_events table
CREATE TABLE public.tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL, -- 'pickup_scheduled', 'picked_up', 'in_transit', 'delivered'
  description TEXT,
  location TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  photo_url TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create proof_of_delivery table
CREATE TABLE public.proof_of_delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
  delivery_photo_url TEXT NOT NULL,
  signature_data TEXT, -- Base64 encoded signature
  recipient_name TEXT NOT NULL,
  delivery_notes TEXT,
  delivered_by UUID REFERENCES auth.users(id) NOT NULL,
  delivered_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create reviews table
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reviewee_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, reviewer_id)
);

-- Create conversations table
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  traveler_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create messages table
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create disputes table
CREATE TABLE public.disputes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
  complainant_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  respondent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL, -- 'lost', 'damaged', 'delay', 'other'
  description TEXT NOT NULL,
  status dispute_status DEFAULT 'open',
  resolution TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create orders table for payment tracking
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID REFERENCES public.assignments(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  stripe_session_id TEXT UNIQUE,
  amount INTEGER NOT NULL, -- Amount in cents
  currency TEXT DEFAULT 'eur',
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proof_of_delivery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Create function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name'
  );
  
  -- Assign default sender role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'sender');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update updated_at columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kyc_documents_updated_at
  BEFORE UPDATE ON public.kyc_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_match_requests_updated_at
  BEFORE UPDATE ON public.match_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at
  BEFORE UPDATE ON public.assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_disputes_updated_at
  BEFORE UPDATE ON public.disputes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service can insert roles" ON public.user_roles
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update roles" ON public.user_roles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for kyc_documents
CREATE POLICY "Users can view own KYC documents" ON public.kyc_documents
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all KYC documents" ON public.kyc_documents
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own KYC documents" ON public.kyc_documents
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own KYC documents" ON public.kyc_documents
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can update KYC status" ON public.kyc_documents
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for trips
CREATE POLICY "Anyone can view active trips" ON public.trips
  FOR SELECT USING (is_active = true);

CREATE POLICY "Travelers can view own trips" ON public.trips
  FOR SELECT USING (traveler_id = auth.uid());

CREATE POLICY "Travelers can create trips" ON public.trips
  FOR INSERT WITH CHECK (traveler_id = auth.uid());

CREATE POLICY "Travelers can update own trips" ON public.trips
  FOR UPDATE USING (traveler_id = auth.uid());

-- RLS Policies for shipments
CREATE POLICY "Senders can view own shipments" ON public.shipments
  FOR SELECT USING (sender_id = auth.uid());

CREATE POLICY "Travelers can view shipments for their assignments" ON public.shipments
  FOR SELECT USING (
    id IN (
      SELECT shipment_id FROM public.assignments
      WHERE traveler_id = auth.uid()
    )
  );

CREATE POLICY "Senders can create shipments" ON public.shipments
  FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Senders can update own shipments" ON public.shipments
  FOR UPDATE USING (sender_id = auth.uid());

-- RLS Policies for match_requests
CREATE POLICY "Users can view their match requests" ON public.match_requests
  FOR SELECT USING (sender_id = auth.uid() OR traveler_id = auth.uid());

CREATE POLICY "Senders can create match requests" ON public.match_requests
  FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Travelers can update match requests" ON public.match_requests
  FOR UPDATE USING (traveler_id = auth.uid());

-- RLS Policies for assignments
CREATE POLICY "Users can view their assignments" ON public.assignments
  FOR SELECT USING (sender_id = auth.uid() OR traveler_id = auth.uid());

CREATE POLICY "Service can create assignments" ON public.assignments
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their assignments" ON public.assignments
  FOR UPDATE USING (sender_id = auth.uid() OR traveler_id = auth.uid());

-- RLS Policies for tracking_events
CREATE POLICY "Users can view tracking for their assignments" ON public.tracking_events
  FOR SELECT USING (
    assignment_id IN (
      SELECT id FROM public.assignments
      WHERE sender_id = auth.uid() OR traveler_id = auth.uid()
    )
  );

CREATE POLICY "Travelers can create tracking events" ON public.tracking_events
  FOR INSERT WITH CHECK (
    assignment_id IN (
      SELECT id FROM public.assignments
      WHERE traveler_id = auth.uid()
    )
  );

-- RLS Policies for proof_of_delivery
CREATE POLICY "Users can view proof for their assignments" ON public.proof_of_delivery
  FOR SELECT USING (
    assignment_id IN (
      SELECT id FROM public.assignments
      WHERE sender_id = auth.uid() OR traveler_id = auth.uid()
    )
  );

CREATE POLICY "Travelers can create proof of delivery" ON public.proof_of_delivery
  FOR INSERT WITH CHECK (delivered_by = auth.uid());

-- RLS Policies for reviews
CREATE POLICY "Users can view reviews about them" ON public.reviews
  FOR SELECT USING (reviewee_id = auth.uid() OR reviewer_id = auth.uid());

CREATE POLICY "Users can create reviews" ON public.reviews
  FOR INSERT WITH CHECK (reviewer_id = auth.uid());

-- RLS Policies for conversations
CREATE POLICY "Users can view their conversations" ON public.conversations
  FOR SELECT USING (sender_id = auth.uid() OR traveler_id = auth.uid());

CREATE POLICY "Service can create conversations" ON public.conversations
  FOR INSERT WITH CHECK (true);

-- RLS Policies for messages
CREATE POLICY "Users can view messages in their conversations" ON public.messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM public.conversations
      WHERE sender_id = auth.uid() OR traveler_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages" ON public.messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update own messages" ON public.messages
  FOR UPDATE USING (sender_id = auth.uid());

-- RLS Policies for disputes
CREATE POLICY "Users can view their disputes" ON public.disputes
  FOR SELECT USING (complainant_id = auth.uid() OR respondent_id = auth.uid());

CREATE POLICY "Admins can view all disputes" ON public.disputes
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create disputes" ON public.disputes
  FOR INSERT WITH CHECK (complainant_id = auth.uid());

CREATE POLICY "Admins can update disputes" ON public.disputes
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for orders
CREATE POLICY "Users can view own orders" ON public.orders
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Service can create orders" ON public.orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service can update orders" ON public.orders
  FOR UPDATE USING (true);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('shipment-photos', 'shipment-photos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('proof-photos', 'proof-photos', false);

-- Storage policies for avatars
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for KYC documents
CREATE POLICY "Users can view their own KYC documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all KYC documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'kyc-documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can upload their own KYC documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for shipment photos
CREATE POLICY "Shipment photos are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'shipment-photos');

CREATE POLICY "Users can upload shipment photos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'shipment-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for proof photos
CREATE POLICY "Users can view proof photos for their assignments" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'proof-photos' AND
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE (a.sender_id = auth.uid() OR a.traveler_id = auth.uid())
      AND a.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Travelers can upload proof photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'proof-photos' AND
    EXISTS (
      SELECT 1 FROM public.assignments a
      WHERE a.traveler_id = auth.uid()
      AND a.id::text = (storage.foldername(name))[1]
    )
  );

-- Enable realtime for real-time updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tracking_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.match_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.assignments;