import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarDays, MapPin, Users, Star, Plus, Edit, Trash2, RotateCcw, CreditCard, Check, DollarSign, TrendingUp } from 'lucide-react';
import { isPast, isToday } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import { Link, useNavigate } from 'react-router-dom';
import { format, differenceInMinutes } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Booking {
  id: string;
  listing_id: string;
  check_in_date: string;
  check_out_date: string;
  guests_count: number;
  total_price: number;
  status: string;
  payment_status: string;
  payment_intent_id: string | null;
  created_at: string;
  cancelled_at: string | null;
  listings: {
    title: string;
    city: string;
    country: string;
    photos: string[];
  };
}

interface Listing {
  id: string;
  title: string;
  city: string;
  country: string;
  price_per_night: number;
  property_type: string;
  is_active: boolean;
  photos: string[];
  created_at: string;
}

interface Profile {
  name: string;
  role: string;
  bio: string;
  profile_photo: string;
  phone: string;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bookings');
  const [hostBookings, setHostBookings] = useState<Booking[]>([]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchDashboardData();
  }, [user, navigate]);

  const handleCancelBooking = async (bookingId: string, listingTitle: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'canceled',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (error) throw error;

      // Create notification
      await supabase.from('notifications').insert({
        user_id: user?.id,
        type: 'booking',
        title: 'Booking Canceled',
        message: `Your booking for "${listingTitle}" has been canceled. You have 10 minutes to restore it.`,
        data: { booking_id: bookingId, action: 'canceled' },
      });

      toast({
        title: 'Booking canceled',
        description: 'You have 10 minutes to restore this booking',
      });

      await fetchDashboardData();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to cancel booking',
      });
    }
  };

  const handleRestoreBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'pending',
          cancelled_at: null
        })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: 'Booking restored',
        description: 'Your booking has been restored successfully',
      });

      await fetchDashboardData();
    } catch (error) {
      console.error('Error restoring booking:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to restore booking',
      });
    }
  };

  const canRestoreBooking = (booking: Booking) => {
    if (booking.status !== 'canceled' || !booking.cancelled_at) return false;
    const cancelledDate = new Date(booking.cancelled_at);
    const now = new Date();
    const minutesSinceCancelled = differenceInMinutes(now, cancelledDate);
    return minutesSinceCancelled < 10;
  };

  const handleDeleteListing = async (listingId: string, listingTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${listingTitle}"?`)) return;
    
    try {
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingId);

      if (error) throw error;

      // Create notification
      await supabase.from('notifications').insert({
        user_id: user?.id,
        type: 'listing_deleted',
        title: 'Listing Deleted',
        message: `Your listing "${listingTitle}" has been deleted successfully.`,
        data: { listing_id: listingId },
      });

      toast({
        title: 'Listing deleted',
        description: `"${listingTitle}" has been removed`,
      });

      await fetchDashboardData();
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete listing',
      });
    }
  };

  const canCheckout = (booking: Booking) => {
    const checkInDate = new Date(booking.check_in_date);
    return (isToday(checkInDate) || isPast(checkInDate)) && booking.payment_status !== 'paid';
  };

  const fetchDashboardData = async () => {
    if (!user) return;

    // Fetch user profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileData) {
      setProfile(profileData);
    }

    // Fetch bookings (as guest)
    const { data: bookingsData } = await supabase
      .from('bookings')
      .select(`
        *,
        listings (
          title,
          city,
          country,
          photos
        )
      `)
      .eq('guest_id', user.id)
      .order('created_at', { ascending: false });

    if (bookingsData) {
      setBookings(bookingsData);
    }

    // Fetch listings (if host)
    if (profileData?.role === 'host' || profileData?.role === 'admin') {
      const { data: listingsData } = await supabase
        .from('listings')
        .select('*')
        .eq('host_id', user.id)
        .order('created_at', { ascending: false });

      if (listingsData) {
        setListings(listingsData);
      }

      // Fetch bookings for host's listings
      const { data: hostBookingsData } = await supabase
        .from('bookings')
        .select(`
          *
        `)
        .in('listing_id', listingsData?.map(l => l.id) || []);

      if (hostBookingsData) {
        setHostBookings(hostBookingsData as any);
      }
    }

    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'canceled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/4" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-32 bg-muted rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isHost = profile?.role === 'host' || profile?.role === 'admin';
  const upcomingBookings = bookings.filter(b => new Date(b.check_in_date) > new Date());
  const activeListings = listings.filter(l => l.is_active);
  
  // Filter out canceled bookings that are past 10 minutes restoration window
  const visibleBookings = bookings.filter(booking => {
    if (booking.status !== 'canceled') return true;
    return canRestoreBooking(booking);
  });

  // Calculate earnings for hosts
  const totalEarnings = hostBookings
    .filter(b => b.payment_status === 'paid')
    .reduce((sum, b) => sum + Number(b.total_price), 0);

  const potentialEarnings = hostBookings
    .filter(b => b.payment_status !== 'paid' && b.status !== 'canceled')
    .reduce((sum, b) => sum + Number(b.total_price), 0);

  // Calculate total spent for guests
  const totalSpent = bookings
    .filter(b => b.payment_status === 'paid')
    .reduce((sum, b) => sum + Number(b.total_price), 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="mb-4 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 break-words">
            Welcome back, {profile?.name || user.email}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Manage your bookings {isHost && 'and listings'} from your dashboard
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-6 md:mb-8">
          {activeTab === 'bookings' && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
                  <CardTitle className="text-xs md:text-sm font-medium">Total Bookings</CardTitle>
                  <CalendarDays className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                  <div className="text-xl md:text-2xl font-bold">{visibleBookings.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {upcomingBookings.length} upcoming
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
                  <CardTitle className="text-xs md:text-sm font-medium">Total {isHost ? 'Spent' : 'Price'}</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                  <div className="text-xl md:text-2xl font-bold break-words">
                    ${totalSpent.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    From all bookings
                  </p>
                </CardContent>
              </Card>

              {isHost && (
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
                    <CardTitle className="text-xs md:text-sm font-medium">Active Listings</CardTitle>
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 pt-0">
                    <div className="text-xl md:text-2xl font-bold">{activeListings.length}</div>
                    <p className="text-xs text-muted-foreground">
                      {listings.length} total
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {activeTab === 'listings' && isHost && (
            <>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
                  <CardTitle className="text-xs md:text-sm font-medium">Active Listings</CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                  <div className="text-xl md:text-2xl font-bold">{activeListings.length}</div>
                  <p className="text-xs text-muted-foreground">
                    {listings.length} total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
                  <CardTitle className="text-xs md:text-sm font-medium">Total Earnings</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                  <div className="text-xl md:text-2xl font-bold break-words">
                    ${totalEarnings.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Guest payments
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4 md:p-6">
                  <CardTitle className="text-xs md:text-sm font-medium">Potential Earnings</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </CardHeader>
                <CardContent className="p-4 md:p-6 pt-0">
                  <div className="text-xl md:text-2xl font-bold break-words">
                    ${potentialEarnings.toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Pending bookings
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <Tabs defaultValue="bookings" className="w-full" onValueChange={setActiveTab}>
          <TabsList className={`grid w-full ${isHost ? 'grid-cols-2' : 'grid-cols-1'}`}>
            <TabsTrigger value="bookings" className="text-sm md:text-base">My Bookings</TabsTrigger>
            {isHost && <TabsTrigger value="listings" className="text-sm md:text-base">My Listings</TabsTrigger>}
          </TabsList>

          <TabsContent value="bookings" className="space-y-3 md:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg md:text-xl font-semibold">Your Bookings</h2>
              <Button onClick={() => navigate('/listings')} size="sm" className="w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                <span className="text-sm">New Booking</span>
              </Button>
            </div>

            {visibleBookings.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CalendarDays className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No bookings yet</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    Start exploring amazing places to stay
                  </p>
                  <Button onClick={() => navigate('/listings')}>
                    Browse Listings
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 md:gap-4">
                {visibleBookings.map((booking) => (
                  <Card key={booking.id}>
                    <CardContent className="p-4 md:p-6">
                      <div className="flex flex-col sm:flex-row items-start gap-3 md:gap-4">
                        <img
                          src={booking.listings.photos[0] || '/placeholder.svg'}
                          alt={booking.listings.title}
                          className="w-full sm:w-20 md:w-24 h-48 sm:h-20 md:h-24 object-cover rounded-lg flex-shrink-0"
                        />
                        <div className="flex-1 space-y-2 min-w-0 w-full">
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                            <h3 className="font-semibold text-sm md:text-base break-words">{booking.listings.title}</h3>
                            <Badge className={`${getStatusColor(booking.status)} text-xs flex-shrink-0 w-fit`}>
                              {booking.status}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="break-words">{booking.listings.city}, {booking.listings.country}</span>
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm text-muted-foreground">
                            <div className="flex items-center">
                              <CalendarDays className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span className="whitespace-nowrap">{format(new Date(booking.check_in_date), 'MMM dd')} - {format(new Date(booking.check_out_date), 'MMM dd')}</span>
                            </div>
                            <div className="flex items-center">
                              <Users className="h-3 w-3 mr-1 flex-shrink-0" />
                              <span>{booking.guests_count} guest{booking.guests_count !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
                            <span className="font-semibold text-base md:text-lg">
                              ${booking.total_price}
                            </span>
                            <div className="flex flex-wrap gap-2">
                              {booking.status === 'pending' && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleCancelBooking(booking.id, booking.listings.title)}
                                >
                                  Cancel
                                </Button>
                              )}
                              {booking.status === 'canceled' && canRestoreBooking(booking) && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleRestoreBooking(booking.id)}
                                >
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Restore
                                </Button>
                              )}
                              {booking.payment_status === 'paid' ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled
                                    className="bg-green-50 text-green-700 border-green-200"
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    Paid
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      toast({
                                        title: "Payment Details",
                                        description: `Payment ID: ${booking.payment_intent_id || 'N/A'}\nAmount: $${Number(booking.total_price).toFixed(2)}\nStatus: Paid`
                                      });
                                    }}
                                  >
                                    View Payment
                                  </Button>
                                </>
                              ) : (
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  onClick={() => navigate(`/checkout?booking=${booking.id}`)}
                                >
                                  <CreditCard className="h-3 w-3 mr-1" />
                                  Checkout
                                </Button>
                              )}
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  const listingId = booking.listing_id;
                                  if (listingId) {
                                    navigate(`/listing/${listingId}`);
                                  }
                                }}
                              >
                                View Details
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {isHost && (
            <TabsContent value="listings" className="space-y-3 md:space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-lg md:text-xl font-semibold">Your Listings</h2>
                <Button onClick={() => navigate('/host')} size="sm" className="w-full sm:w-auto">
                  <Plus className="h-4 w-4 mr-2" />
                  <span className="text-sm">Add Listing</span>
                </Button>
              </div>

              {listings.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No listings yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Start hosting and earn money from your property
                    </p>
                    <Button onClick={() => navigate('/host')}>
                      Create Listing
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-3 md:gap-4">
                  {listings.map((listing) => (
                    <Card key={listing.id}>
                      <CardContent className="p-4 md:p-6">
                        <div className="flex flex-col sm:flex-row items-start gap-3 md:gap-4">
                          <img
                            src={listing.photos[0] || '/placeholder.svg'}
                            alt={listing.title}
                            className="w-full sm:w-20 md:w-24 h-48 sm:h-20 md:h-24 object-cover rounded-lg flex-shrink-0"
                          />
                          <div className="flex-1 space-y-2 min-w-0 w-full">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                              <h3 className="font-semibold text-sm md:text-base break-words">{listing.title}</h3>
                              <Badge variant={listing.is_active ? 'default' : 'secondary'} className="text-xs w-fit flex-shrink-0">
                                {listing.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs md:text-sm text-muted-foreground">
                              <div className="flex items-center">
                                <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                                <span className="break-words">{listing.city}, {listing.country}</span>
                              </div>
                            </div>
                            <div className="text-xs md:text-sm text-muted-foreground capitalize">
                              {listing.property_type.replace('_', ' ')}
                            </div>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
                              <div className="flex flex-col">
                                <span className="text-xs text-muted-foreground">Price</span>
                                <span className="font-semibold text-sm md:text-base">
                                  ${listing.price_per_night}
                                </span>
                                <span className="text-xs text-muted-foreground">per night</span>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => navigate(`/host/edit/${listing.id}`)}
                                  className="text-xs"
                                >
                                  <Edit className="h-3 w-3 sm:mr-1" />
                                  <span className="hidden sm:inline">Edit</span>
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleDeleteListing(listing.id, listing.title)}
                                  className="text-xs"
                                >
                                  <Trash2 className="h-3 w-3 sm:mr-1" />
                                  <span className="hidden sm:inline">Delete</span>
                                </Button>
                                <Link to={`/listing/${listing.id}`}>
                                  <Button variant="outline" size="sm" className="text-xs">
                                    View
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;