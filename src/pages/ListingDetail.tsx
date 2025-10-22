import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { MapPin, Star, Heart, Share, Wifi, Car, Utensils, Calendar as CalendarIcon, Users } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import Header from '@/components/layout/Header';
import ReviewSection from '@/components/ReviewSection';

interface Listing {
  id: string;
  title: string;
  description: string;
  location: string;
  city: string;
  country: string;
  price_per_night: number;
  photos: string[];
  property_type: string;
  max_guests: number;
  amenities: any;
  host_id: string;
  profiles?: {
    name: string;
    profile_photo: string;
    profile_picture: string;
    bio: string;
  };
}

const ListingDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [guests, setGuests] = useState(1);
  const [isBooking, setIsBooking] = useState(false);
  const [reviewStats, setReviewStats] = useState({ rating: 0, count: 0 });
  const [canReview, setCanReview] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [bookedDates, setBookedDates] = useState<Array<{check_in: string, check_out: string}>>([]);

  useEffect(() => {
    if (id) {
      fetchListing();
      fetchReviewStats();
    }
  }, [id]);

  useEffect(() => {
    if (user && listing) {
      checkCanReview();
      checkIsFavorited();
    }
  }, [user, listing]);

  const checkIsFavorited = async () => {
    if (!user || !id) return;
    
    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('guest_id', user.id)
      .eq('listing_id', id)
      .maybeSingle();
    
    setIsFavorited(!!data);
  };

  const fetchListing = async () => {
    const { data, error } = await supabase
      .from('listings')
      .select(`
        *,
        profiles!listings_host_id_fkey (
          name,
          profile_photo,
          profile_picture,
          bio
        )
      `)
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Listing not found',
      });
      navigate('/listings');
      return;
    }

    setListing(data);
    setLoading(false);
  };

  const fetchReviewStats = async () => {
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('listing_id', id);

    if (reviews && reviews.length > 0) {
      const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
      setReviewStats({
        rating: Math.round(avgRating * 10) / 10,
        count: reviews.length
      });
    }
  };

  const checkCanReview = async () => {
    if (!user || !listing) return;

    // Check if user has a completed booking for this listing
    const { data: bookings } = await supabase
      .from('bookings')
      .select('id')
      .eq('guest_id', user.id)
      .eq('listing_id', listing.id)
      .eq('status', 'confirmed')
      .lt('check_out_date', new Date().toISOString().split('T')[0]);

    // Check if user already reviewed this listing
    const { data: existingReview } = await supabase
      .from('reviews')
      .select('id')
      .eq('guest_id', user.id)
      .eq('listing_id', listing.id)
      .single();

    setCanReview(bookings && bookings.length > 0 && !existingReview);
  };

  const handleToggleFavorite = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    setSavingFavorite(true);
    try {
      if (isFavorited) {
        // Remove from favorites
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('guest_id', user.id)
          .eq('listing_id', id);

        if (error) throw error;

        // Create notification
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'favorite',
          title: 'Favorite Removed',
          message: `"${listing?.title}" has been removed from your favorites.`,
          data: { listing_id: id, listing_title: listing?.title, action: 'removed' },
        });

        setIsFavorited(false);
        toast({
          title: "Removed",
          description: "Property removed from favorites"
        });
      } else {
        // Add to favorites
        const { error } = await supabase
          .from('favorites')
          .insert({
            guest_id: user.id,
            listing_id: id
          });

        if (error) throw error;

        // Create notification
        await supabase.from('notifications').insert({
          user_id: user.id,
          type: 'favorite',
          title: 'Favorite Added',
          message: `"${listing?.title}" has been added to your favorites.`,
          data: { listing_id: id, listing_title: listing?.title, action: 'added' },
        });

        setIsFavorited(true);
        toast({
          title: "Saved",
          description: "Property added to favorites"
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive"
      });
    } finally {
      setSavingFavorite(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: listing?.title,
          text: `Check out this amazing ${listing?.property_type} in ${listing?.city}!`,
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

  const calculateTotal = () => {
    if (!checkIn || !checkOut || !listing) {
      return {
        nights: 0,
        subtotal: 0,
        serviceFee: 0,
        cleaningFee: 0,
        total: 0
      };
    }
    
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const subtotal = nights * listing.price_per_night;
    const serviceFee = subtotal * 0.1; // 10% service fee
    const cleaningFee = 50; // Fixed cleaning fee
    
    return {
      nights,
      subtotal,
      serviceFee,
      cleaningFee,
      total: subtotal + serviceFee + cleaningFee
    };
  };

  const handleBooking = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (!checkIn || !checkOut || !listing) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Please select check-in and check-out dates',
      });
      return;
    }

    setIsBooking(true);
    const costs = calculateTotal();

    const { data: newBooking, error } = await supabase.from('bookings').insert({
      guest_id: user.id,
      listing_id: listing.id,
      check_in_date: format(checkIn, 'yyyy-MM-dd'),
      check_out_date: format(checkOut, 'yyyy-MM-dd'),
      guests_count: guests,
      total_price: costs.total,
      service_fee: costs.serviceFee,
      cleaning_fee: costs.cleaningFee,
    }).select().single();

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Booking failed',
        description: error.message,
      });
    } else {
      // Create notification for guest
      await supabase.from('notifications').insert({
        user_id: user.id,
        type: 'booking',
        title: 'Booking Created',
        message: `Your booking for "${listing.title}" from ${format(checkIn, 'PPP')} to ${format(checkOut, 'PPP')} has been created.`,
        data: { 
          booking_id: newBooking.id, 
          listing_id: listing.id, 
          listing_title: listing.title,
          check_in: format(checkIn, 'yyyy-MM-dd'),
          check_out: format(checkOut, 'yyyy-MM-dd')
        },
      });

      // Create notification for host
      await supabase.from('notifications').insert({
        user_id: listing.host_id,
        type: 'booking',
        title: 'New Booking Received',
        message: `You have a new booking for "${listing.title}" from ${format(checkIn, 'PPP')} to ${format(checkOut, 'PPP')}.`,
        data: { 
          booking_id: newBooking.id, 
          listing_id: listing.id, 
          listing_title: listing.title,
          guest_id: user.id
        },
      });

      toast({
        title: 'Booking confirmed!',
        description: 'Your booking has been submitted successfully.',
      });
      navigate('/dashboard');
    }
    setIsBooking(false);
  };


  const isDateRangeBooked = (startDate: Date, endDate: Date) => {
    return bookedDates.some(booking => {
      const bookedStart = new Date(booking.check_in);
      const bookedEnd = new Date(booking.check_out);
      return (startDate < bookedEnd && endDate > bookedStart);
    });
  };

  const amenityIcons: Record<string, React.ComponentType<any>> = {
    wifi: Wifi,
    parking: Car,
    kitchen: Utensils,
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/2" />
            <div className="aspect-[2/1] bg-muted rounded-lg" />
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-4">
                <div className="h-4 bg-muted rounded" />
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </div>
              <div className="h-64 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!listing) return null;

  const costs = calculateTotal();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="mb-4 md:mb-6">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{listing.title}</h1>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 text-muted-foreground">
                {reviewStats.count > 0 ? (
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{reviewStats.rating}</span>
                    <span>({reviewStats.count} review{reviewStats.count !== 1 ? 's' : ''})</span>
                  </div>
                ) : (
                  <span className="text-sm">No reviews yet</span>
                )}
                <div className="flex items-center space-x-1">
                  <MapPin className="h-4 w-4" />
                  <span>{listing.city}, {listing.country}</span>
                </div>
              </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" onClick={handleShare}>
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleToggleFavorite}
                className={isFavorited ? "text-red-500" : ""}
              >
                <Heart className={`h-4 w-4 mr-2 ${isFavorited ? "fill-current" : ""}`} />
                {isFavorited ? "Saved" : "Save"}
              </Button>
            </div>
          </div>
        </div>

        {/* Photo Gallery */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-6 md:mb-12 h-64 md:h-96">
          <div className="md:col-span-2 md:row-span-2">
            <img
              src={listing.photos[0] || '/placeholder.svg'}
              alt={listing.title}
              className="w-full h-full object-cover rounded-lg md:rounded-l-lg md:rounded-r-none"
            />
          </div>
          <div className="hidden md:grid md:col-span-2 md:grid-cols-2 gap-2">
            {listing.photos.slice(1, 5).map((photo, index) => (
              <img
                key={index}
                src={photo}
                alt={`${listing.title} ${index + 2}`}
                className={cn(
                  "w-full h-full object-cover",
                  index === 1 && "rounded-tr-lg",
                  index === 3 && "rounded-br-lg"
                )}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Booking availability notice */}
          {bookedDates.length > 0 && (
            <div className="lg:col-span-3 mb-4">
              <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20">
                <CardContent className="p-4">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <strong>Note:</strong> This property has existing bookings. Some dates may not be available.
                    Next available after: {new Date(Math.max(...bookedDates.map(d => new Date(d.check_out).getTime()))).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Property Info */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-semibold">
                    {listing.property_type.replace('_', ' ').charAt(0).toUpperCase() + listing.property_type.replace('_', ' ').slice(1)} hosted by {listing.profiles?.name}
                  </h2>
                  <p className="text-muted-foreground">
                    Up to {listing.max_guests} guests
                  </p>
                </div>
                <Avatar className="h-12 w-12">
                  <AvatarImage src={listing.profiles?.profile_picture || listing.profiles?.profile_photo} />
                  <AvatarFallback>
                    {listing.profiles?.name?.[0] || 'H'}
                  </AvatarFallback>
                </Avatar>
              </div>
              <Separator />
            </div>

            {/* Description */}
            <div>
              <p className="text-foreground leading-relaxed">{listing.description}</p>
            </div>

            {/* Amenities */}
            <div>
              <h3 className="text-lg font-semibold mb-4">What this place offers</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.isArray(listing.amenities) && listing.amenities.map((amenity: string, index: number) => {
                  const IconComponent = amenityIcons[amenity.toLowerCase()] || Wifi;
                  return (
                    <div key={index} className="flex items-center space-x-3">
                      <IconComponent className="h-5 w-5 text-muted-foreground" />
                      <span className="capitalize">{amenity.replace('_', ' ')}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Host Info */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Meet your host</h3>
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4 mb-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={listing.profiles?.profile_picture || listing.profiles?.profile_photo} />
                      <AvatarFallback className="text-lg">
                        {listing.profiles?.name?.[0] || 'H'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold">{listing.profiles?.name}</h4>
                      <p className="text-sm text-muted-foreground">Host since 2023</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {listing.profiles?.bio || 'A wonderful host with great attention to detail.'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Booking Card */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>
                  <span className="text-2xl font-bold">${listing.price_per_night}</span>
                  <span className="text-muted-foreground"> / night</span>
                </span>
                {reviewStats.count > 0 && (
                  <div className="flex items-center space-x-1 text-sm">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span>{reviewStats.rating}</span>
                  </div>
                )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Date Selection */}
                <div className="grid grid-cols-2 gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-12 flex-col items-start p-2">
                        <span className="text-xs text-muted-foreground">CHECK-IN</span>
                        <span className="text-sm">
                          {checkIn ? format(checkIn, 'MMM dd') : 'Add date'}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={checkIn}
                        onSelect={setCheckIn}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="h-12 flex-col items-start p-2">
                        <span className="text-xs text-muted-foreground">CHECK-OUT</span>
                        <span className="text-sm">
                          {checkOut ? format(checkOut, 'MMM dd') : 'Add date'}
                        </span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={checkOut}
                        onSelect={setCheckOut}
                        disabled={(date) => date < (checkIn || new Date())}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Guests */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full h-12 flex-col items-start p-2">
                      <span className="text-xs text-muted-foreground">GUESTS</span>
                      <span className="text-sm">
                        {guests} guest{guests !== 1 ? 's' : ''}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Guests</span>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setGuests(Math.max(1, guests - 1))}
                          disabled={guests <= 1}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center">{guests}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setGuests(Math.min(listing.max_guests, guests + 1))}
                          disabled={guests >= listing.max_guests}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                {/* Price Breakdown */}
                {checkIn && checkOut && (
                  <div className="space-y-2 pt-4 border-t">
                    <div className="flex justify-between">
                      <span>${listing.price_per_night} × {costs.nights} nights</span>
                      <span>${costs.subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Service fee</span>
                      <span>${costs.serviceFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cleaning fee</span>
                      <span>${costs.cleaningFee.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>${costs.total.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handleBooking}
                  disabled={isBooking || !checkIn || !checkOut}
                >
                  {isBooking ? 'Booking...' : 'Reserve'}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  You won't be charged yet
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Reviews Section */}
        <div className="mt-12">
          <ReviewSection listingId={listing.id} canReview={canReview} />
        </div>
      </div>
    </div>
  );
};

export default ListingDetail;