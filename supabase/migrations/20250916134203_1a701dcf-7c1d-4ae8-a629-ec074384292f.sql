-- Create user roles enum and host applications table
CREATE TYPE public.user_role AS ENUM ('user', 'host', 'admin');

-- Update profiles table to include role and additional host information
ALTER TABLE public.profiles 
ADD COLUMN role user_role NOT NULL DEFAULT 'user',
ADD COLUMN full_name TEXT,
ADD COLUMN email_address TEXT,
ADD COLUMN location_address TEXT,
ADD COLUMN profile_picture TEXT,
ADD COLUMN host_application_status TEXT DEFAULT 'none' CHECK (host_application_status IN ('none', 'pending', 'approved', 'rejected'));

-- Create host applications table for tracking applications
CREATE TABLE public.host_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email_address TEXT NOT NULL,
  location_address TEXT NOT NULL,
  profile_picture TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  application_message TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on host_applications
ALTER TABLE public.host_applications ENABLE ROW LEVEL SECURITY;

-- Create policies for host_applications
CREATE POLICY "Users can view their own applications" 
ON public.host_applications 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own applications" 
ON public.host_applications 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all applications" 
ON public.host_applications 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

CREATE POLICY "Admins can update all applications" 
ON public.host_applications 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Create trigger for host_applications updated_at
CREATE TRIGGER update_host_applications_updated_at
BEFORE UPDATE ON public.host_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update bookings table to include booking status tracking
ALTER TABLE public.bookings 
ADD COLUMN confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE;

-- Create listings availability view to check booking conflicts
CREATE OR REPLACE VIEW public.listing_availability AS
SELECT 
  l.id as listing_id,
  l.title,
  COALESCE(
    array_agg(
      json_build_object(
        'check_in', b.check_in_date,
        'check_out', b.check_out_date,
        'status', b.status
      ) ORDER BY b.check_in_date
    ) FILTER (WHERE b.status = 'confirmed'),
    ARRAY[]::json[]
  ) as booked_dates
FROM public.listings l
LEFT JOIN public.bookings b ON l.id = b.listing_id 
  AND b.status = 'confirmed'
  AND b.check_out_date >= CURRENT_DATE
GROUP BY l.id, l.title;