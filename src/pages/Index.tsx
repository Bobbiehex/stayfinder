import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import SearchBar from '@/components/SearchBar';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Star, MapPin, Heart, Wifi, Car, Coffee, Tv, AirVent, Waves } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface FeaturedListing {
  id: string;
  title: string;
  location: string;
  city: string;
  country: string;
  price_per_night: number;
  photos: string[];
  amenities: any;
  rating: number;
  reviews: number;
}

const Index = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [featuredListings, setFeaturedListings] = useState<FeaturedListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoritedListings, setFavoritedListings] = useState<Set<string>>(new Set());
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetchFeaturedListings();
    if (user) {
      fetchUserFavorites();
      fetchUserRole();
    }
  }, [user]);

  const fetchUserRole = async () => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        setUserRole(data.role);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchFeaturedListings = async () => {
    try {
      // Fetch 6 most recent listings with their reviews
      const { data: listings, error } = await supabase
        .from('listings')
        .select(`
          id,
          title,
          location,
          city,
          country,
          price_per_night,
          photos,
          amenities,
          created_at
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(6);

      if (error) throw error;

      // Get reviews for each listing to calculate ratings
      const listingsWithReviews = await Promise.all(
        (listings || []).map(async (listing) => {
          const { data: reviews } = await supabase
            .from('reviews')
            .select('rating')
            .eq('listing_id', listing.id);

          const rating = reviews && reviews.length > 0 
            ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
            : 0;

          // Ensure photos array exists and use placeholder if empty
          const photos = Array.isArray(listing.photos) && listing.photos.length > 0 
            ? listing.photos 
            : ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop'];

          return {
            ...listing,
            location: `${listing.city}, ${listing.country}`,
            rating: Math.round(rating * 10) / 10,
            reviews: reviews?.length || 0,
            amenities: Array.isArray(listing.amenities) ? listing.amenities : 
                      (listing.amenities && Array.isArray(listing.amenities) ? listing.amenities : []),
            photos
          };
        })
      );

      setFeaturedListings(listingsWithReviews);
    } catch (error) {
      console.error('Error fetching featured listings:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserFavorites = async () => {
    if (!user) return;
    
    try {
      const { data: favorites } = await supabase
        .from('favorites')
        .select('listing_id')
        .eq('guest_id', user.id);
      
      if (favorites) {
        setFavoritedListings(new Set(favorites.map(f => f.listing_id)));
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  const toggleFavorite = async (listingId: string) => {
    if (!user) {
      toast({
        title: 'Sign in required',
        description: 'Please sign in to save favorites',
        action: <Button variant="outline" onClick={() => window.location.href = '/auth'}>Sign In</Button>,
      });
      return;
    }

    try {
      const isFavorited = favoritedListings.has(listingId);
      
      if (isFavorited) {
        // Remove favorite
        await supabase
          .from('favorites')
          .delete()
          .eq('guest_id', user.id)
          .eq('listing_id', listingId);
        
        setFavoritedListings(prev => {
          const newSet = new Set(prev);
          newSet.delete(listingId);
          return newSet;
        });
        
        toast({
          title: 'Removed from favorites',
          description: 'Property removed from your favorites',
        });
      } else {
        // Add favorite
        await supabase
          .from('favorites')
          .insert({
            guest_id: user.id,
            listing_id: listingId
          });
        
        setFavoritedListings(prev => new Set([...prev, listingId]));
        
        toast({
          title: 'Added to favorites',
          description: 'Property saved to your favorites',
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update favorites',
      });
    }
  };

  const amenityIcons = {
    wifi: Wifi,
    parking: Car,
    pool: Waves,
    fireplace: Coffee,
    kitchen: Coffee,
    gym: AirVent,
    rooftop: Tv,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        {/* Hero Section */}
        <section className="relative h-[400px] md:h-[600px] bg-gradient-to-r from-primary/90 to-primary/70 flex items-center justify-center">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&h=600&fit=crop)',
          }}
        />
        <div className="absolute inset-0 bg-black/40" />
        
        <div className="relative z-10 text-center text-white space-y-4 md:space-y-8 px-4">
          <div className="space-y-2 md:space-y-4">
            <h1 className="text-2xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              Find your perfect stay
            </h1>
            <p className="text-sm md:text-xl lg:text-2xl font-light max-w-2xl mx-auto">
              Discover unique places to stay and experiences around the world
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto w-full overflow-hidden">
            <SearchBar size="large" className="bg-white" />
          </div>
        </div>
      </section>

      {/* Featured Listings */}
      <section className="py-8 md:py-16 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-3 md:mb-4">Featured Stays</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Hand-picked properties that offer exceptional experiences
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
            {loading ? (
              // Loading skeleton
              Array.from({ length: 6 }).map((_, index) => (
                <Card key={index} className="overflow-hidden border-0 shadow-lg">
                  <Skeleton className="w-full h-64" />
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <Skeleton className="h-4 w-1/2" />
                      <div className="flex items-center space-x-2">
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <Skeleton className="w-8 h-8 rounded-full" />
                        <Skeleton className="w-8 h-8 rounded-full" />
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <Skeleton className="h-8 w-24" />
                        <Skeleton className="h-10 w-24" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : featuredListings.length > 0 ? (
              featuredListings.map((listing) => (
                <Card key={listing.id} className="group overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="relative overflow-hidden">
                    <img
                      src={listing.photos[0] || '/placeholder.svg'}
                      alt={listing.title}
                      className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-3 right-3 bg-white/80 hover:bg-white"
                      onClick={(e) => {
                        e.preventDefault();
                        toggleFavorite(listing.id);
                      }}
                    >
                      <Heart 
                        className={`h-4 w-4 ${
                          favoritedListings.has(listing.id) 
                            ? 'fill-red-500 text-red-500' 
                            : 'text-gray-600'
                        }`} 
                      />
                    </Button>
                  </div>
                  
                  <CardContent className="p-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-lg leading-tight">{listing.title}</h3>
                        {listing.reviews > 0 ? (
                          <div className="flex items-center space-x-1 text-sm">
                            <Star className="h-4 w-4 fill-primary text-primary" />
                            <span className="font-medium">{listing.rating}</span>
                            <span className="text-muted-foreground">({listing.reviews})</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">New</span>
                        )}
                      </div>
                      
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span className="text-sm">{listing.location}</span>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {Array.isArray(listing.amenities) && listing.amenities.slice(0, 3).map((amenity) => {
                          const Icon = amenityIcons[amenity as keyof typeof amenityIcons];
                          return Icon ? (
                            <div key={amenity} className="flex items-center justify-center w-8 h-8 bg-secondary rounded-full">
                              <Icon className="h-4 w-4 text-secondary-foreground" />
                            </div>
                          ) : null;
                        })}
                      </div>
                      
                      <div className="flex items-center justify-between pt-2">
                        <div>
                          <span className="text-2xl font-bold">${listing.price_per_night}</span>
                          <span className="text-muted-foreground"> / night</span>
                        </div>
                        <Button asChild>
                          <Link to={`/listing/${listing.id}`}>View Details</Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">No listings available at the moment.</p>
              </div>
            )}
          </div>

          <div className="text-center mt-12">
            <Button asChild size="lg" variant="outline">
              <Link to="/listings">View All Listings</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 md:py-16 bg-primary text-primary-foreground">
        <div className="container mx-auto text-center px-4">
          <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
            {userRole === 'host' || userRole === 'admin' ? (
              <>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold">Ready to list your property?</h2>
                <p className="text-base md:text-xl opacity-90">
                  Create a new listing and start earning money by sharing your space
                </p>
                <Button asChild size="lg" variant="secondary">
                  <Link to="/host">Host</Link>
                </Button>
              </>
            ) : (
              <>
                <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold">Ready to start hosting?</h2>
                <p className="text-base md:text-xl opacity-90">
                  Join thousands of hosts worldwide and start earning money by sharing your space
                </p>
                <Button asChild size="lg" variant="secondary">
                  <Link to="/host-application">Become a Host</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </section>
      </main>
      <Footer />
    </div>
  );
};

export default Index;
