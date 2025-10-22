-- Create storage buckets for photo uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-pictures', 'profile-pictures', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('listing-photos', 'listing-photos', true);

-- Create storage policies for profile pictures
CREATE POLICY "Profile pictures are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'profile-pictures');

CREATE POLICY "Users can upload their own profile picture" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own profile picture" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own profile picture" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'profile-pictures' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create storage policies for listing photos
CREATE POLICY "Listing photos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'listing-photos');

CREATE POLICY "Hosts can upload listing photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'listing-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Hosts can update their listing photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'listing-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Hosts can delete their listing photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'listing-photos' AND auth.uid()::text = (storage.foldername(name))[1]);