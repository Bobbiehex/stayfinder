-- Insert sample listings with proper photos
INSERT INTO listings (
  host_id,
  title,
  description,
  location,
  city,
  country,
  price_per_night,
  max_guests,
  property_type,
  photos,
  amenities,
  is_active
) VALUES 
(
  (SELECT user_id FROM profiles LIMIT 1),
  'Modern Downtown Apartment',
  'Beautiful modern apartment in the heart of the city with stunning skyline views',
  '123 Main Street',
  'New York',
  'United States',
  150.00,
  4,
  'apartment',
  ARRAY[
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&h=600&fit=crop'
  ],
  ARRAY['wifi', 'kitchen', 'air_conditioning', 'tv', 'washer'],
  true
),
(
  (SELECT user_id FROM profiles LIMIT 1),
  'Cozy Beach House',
  'Charming beach house with direct ocean access and sunset views',
  '456 Ocean Drive',
  'Miami',
  'United States',
  220.00,
  6,
  'house',
  ARRAY[
    'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1520637836862-4d197d17c155?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&h=600&fit=crop'
  ],
  ARRAY['wifi', 'kitchen', 'pool', 'parking', 'fireplace'],
  true
),
(
  (SELECT user_id FROM profiles LIMIT 1),
  'Luxury Mountain Villa',
  'Exclusive mountain retreat with panoramic views and premium amenities',
  '789 Mountain View Road',
  'Aspen',
  'United States',
  450.00,
  8,
  'villa',
  ARRAY[
    'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=800&h=600&fit=crop'
  ],
  ARRAY['wifi', 'kitchen', 'hot_tub', 'gym', 'fireplace', 'heating'],
  true
),
(
  (SELECT user_id FROM profiles LIMIT 1),
  'Historic City Loft',
  'Converted warehouse loft in historic downtown district',
  '321 Industrial Ave',
  'San Francisco',
  'United States',
  180.00,
  3,
  'apartment',
  ARRAY[
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&h=600&fit=crop'
  ],
  ARRAY['wifi', 'kitchen', 'air_conditioning', 'washer', 'dryer'],
  true
),
(
  (SELECT user_id FROM profiles LIMIT 1),
  'Charming Garden Cottage',
  'Quaint cottage surrounded by beautiful gardens in peaceful neighborhood',
  '654 Garden Lane',
  'Portland',
  'United States',
  120.00,
  2,
  'house',
  ARRAY[
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&h=600&fit=crop'
  ],
  ARRAY['wifi', 'kitchen', 'fireplace', 'parking'],
  true
),
(
  (SELECT user_id FROM profiles LIMIT 1),
  'Trendy Studio Space',
  'Stylish studio in vibrant arts district with modern amenities',
  '987 Arts District Blvd',
  'Los Angeles',
  'United States',
  95.00,
  2,
  'apartment',
  ARRAY[
    'https://images.unsplash.com/photo-1560184897-ae75f418493e?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1556020685-ae41abfc9365?w=800&h=600&fit=crop',
    'https://images.unsplash.com/photo-1554995207-c18c203602cb?w=800&h=600&fit=crop'
  ],
  ARRAY['wifi', 'kitchen', 'air_conditioning', 'tv'],
  true
);