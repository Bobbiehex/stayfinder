import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Star, Heart, Share2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Link, useNavigate } from 'react-router-dom';

interface FavoriteListing {
  id: string;
  listing_id: string;
  created_at: string;
  listings: {
    id: string;
    title: string;
    city: string;
    country: string;
    price_per_night: number;
    photos: string[];
    property_type: string;
    host_id: string;
  };
}

const Favorites: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [favorites, setFavorites] = useState<FavoriteListing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchFavorites();
  }, [user, navigate]);

  const fetchFavorites = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          *,
          listings (
            id,
            title,
            city,
            country,
            price_per_night,
            photos,
            property_type,
            host_id
          )
        `)
        .eq('guest_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFavorites(data || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
      toast({
        title: "Error",
        description: "Failed to load favorites",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (favoriteId: string, listingTitle: string) => {
    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('id', favoriteId);

      if (error) throw error;

      // Create notification
      await supabase.from('notifications').insert({
        user_id: user?.id,
        type: 'favorite',
        title: 'Favorite Removed',
        message: `"${listingTitle}" has been removed from your favorites.`,
        data: { listing_title: listingTitle, action: 'removed' },
      });

      setFavorites(prev => prev.filter(fav => fav.id !== favoriteId));
      toast({
        title: "Removed",
        description: `${listingTitle} removed from favorites`
      });
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast({
        title: "Error",
        description: "Failed to remove from favorites",
        variant: "destructive"
      });
    }
  };

  const handleShare = async (listing: any) => {
    const url = `${window.location.origin}/listing/${listing.id}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: listing.title,
          text: `Check out this amazing ${listing.property_type} in ${listing.city}!`,
          url: url,
        });
      } catch (error) {
        console.log('Share failed:', error);
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        toast({
          title: "Link copied!",
          description: "Property link copied to clipboard"
        });
      } catch (error) {
        console.error('Copy failed:', error);
        toast({
          title: "Error",
          description: "Failed to copy link",
          variant: "destructive"
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/4" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-80 bg-muted rounded" />
              ))}
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Your Favorites</h1>
          <p className="text-muted-foreground">
            {favorites.length} saved {favorites.length === 1 ? 'property' : 'properties'}
          </p>
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No favorites yet</h3>
            <p className="text-muted-foreground mb-6">
              Start exploring and save properties you love!
            </p>
            <Button onClick={() => navigate('/listings')}>
              Browse Properties
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {favorites.map((favorite) => (
              <Card key={favorite.id} className="group hover:shadow-lg transition-shadow">
                <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg">
                  <img
                    src={favorite.listings.photos[0] || '/placeholder.svg'}
                    alt={favorite.listings.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 rounded-full bg-background/80 hover:bg-background"
                      onClick={() => handleShare(favorite.listings)}
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 rounded-full bg-background/80 hover:bg-background text-red-500 hover:text-red-600"
                      onClick={() => handleRemoveFavorite(favorite.id, favorite.listings.title)}
                    >
                      <Heart className="h-4 w-4 fill-current" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex items-center text-sm text-muted-foreground">
                      <MapPin className="h-3 w-3 mr-1" />
                      {favorite.listings.city}, {favorite.listings.country}
                    </div>
                    <h3 className="font-semibold line-clamp-2">{favorite.listings.title}</h3>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        {favorite.listings.property_type.replace('_', ' ')}
                      </Badge>
                      <div className="flex items-center space-x-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm">4.8</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <div>
                        <span className="font-bold">${favorite.listings.price_per_night}</span>
                        <span className="text-muted-foreground"> / night</span>
                      </div>
                      <Link to={`/listing/${favorite.listings.id}`}>
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      <Footer />
    </div>
  );
};

export default Favorites;