-- Update profiles table to include role and additional host information
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS role user_role NOT NULL DEFAULT 'user',
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS email_address TEXT,
ADD COLUMN IF NOT EXISTS location_address TEXT,
ADD COLUMN IF NOT EXISTS profile_picture TEXT,
ADD COLUMN IF NOT EXISTS host_application_status TEXT DEFAULT 'none' CHECK (host_application_status IN ('none', 'pending', 'approved', 'rejected'));

-- Create host applications table for tracking applications
CREATE TABLE IF NOT EXISTS public.host_applications (
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
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- Create function to check if user has specific role (security definer to avoid RLS recursion)
CREATE OR REPLACE FUNCTION public.user_has_role(user_id UUID, required_role user_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = $1 AND profiles.role = $2
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Update listings policies to only allow hosts and admins to create listings
DROP POLICY IF EXISTS "Hosts can create listings" ON public.listings;
CREATE POLICY "Hosts and admins can create listings" 
ON public.listings 
FOR INSERT 
WITH CHECK (
  auth.uid() = host_id AND 
  public.user_has_role(auth.uid(), 'host') OR public.user_has_role(auth.uid(), 'admin')
);