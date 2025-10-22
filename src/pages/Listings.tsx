import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MapPin, Star, Heart, Filter } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import SearchBar from '@/components/SearchBar';
import { Link } from 'react-router-dom';

interface Listing {
  id: string;
  title: string;
  location: string;
  city: string;
  country: string;
  price_per_night: number;
  photos: string[];
  property_type: string;
  max_guests: number;
  host_id: string;
}

const Listings: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('price_asc');
  
  const location = searchParams.get('location') || '';
  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';
  const guests = searchParams.get('guests') || '1';

  useEffect(() => {
    fetchListings();
  }, [sortBy, priceRange]);

  const fetchListings = async () => {
    setLoading(true);
    let query = supabase
      .from('listings')
      .select('*')
      .eq('is_active', true)
      .gte('price_per_night', priceRange[0])
      .lte('price_per_night', priceRange[1])
      .gte('max_guests', parseInt(guests));

    if (location) {
      query = query.or(`city.ilike.%${location}%,country.ilike.%${location}%,location.ilike.%${location}%`);
    }

    if (selectedPropertyTypes.length > 0) {
      query = query.in('property_type', selectedPropertyTypes as ('apartment' | 'villa' | 'house' | 'shared_room' | 'entire_place')[]);
    }

    if (sortBy === 'price_asc') {
      query = query.order('price_per_night', { ascending: true });
    } else if (sortBy === 'price_desc') {
      query = query.order('price_per_night', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    
    if (!error && data) {
      setListings(data);
    }
    setLoading(false);
  };

  const propertyTypes = ['apartment', 'villa', 'house', 'shared_room', 'entire_place'];

  const handlePropertyTypeChange = (type: string, checked: boolean) => {
    setSelectedPropertyTypes(prev => 
      checked 
        ? [...prev, type]
        : prev.filter(t => t !== type)
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Search Bar */}
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-6">
          <SearchBar />
        </div>
      </div>

      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="flex flex-col md:flex-row gap-4 md:gap-8">
          {/* Filters Sidebar */}
          <div className="w-full md:w-80 space-y-4 md:space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center space-x-2">
                  <Filter className="h-5 w-5" />
                  <h3 className="font-semibold">Filters</h3>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Price Range */}
                <div>
                  <h4 className="font-medium mb-3">Price Range (per night)</h4>
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    max={1000}
                    min={0}
                    step={25}
                    className="mb-2"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>${priceRange[0]}</span>
                    <span>${priceRange[1]}</span>
                  </div>
                </div>

                {/* Property Type */}
                <div>
                  <h4 className="font-medium mb-3">Property Type</h4>
                  <div className="space-y-2">
                    {propertyTypes.map(type => (
                      <div key={type} className="flex items-center space-x-2">
                        <Checkbox
                          id={type}
                          checked={selectedPropertyTypes.includes(type)}
                          onCheckedChange={(checked) => 
                            handlePropertyTypeChange(type, checked as boolean)
                          }
                        />
                        <label htmlFor={type} className="text-sm capitalize cursor-pointer">
                          {type.replace('_', ' ')}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sort By */}
                <div>
                  <h4 className="font-medium mb-3">Sort By</h4>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="price_asc">Price: Low to High</SelectItem>
                      <SelectItem value="price_desc">Price: High to Low</SelectItem>
                      <SelectItem value="newest">Newest First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Listings Grid */}
          <div className="flex-1">
            <div className="mb-4 md:mb-6">
              <h1 className="text-xl md:text-2xl font-bold">
                {location ? `Stays in ${location}` : 'All Stays'}
              </h1>
              <p className="text-muted-foreground mt-1">
                {listings.length} properties found
                {checkIn && checkOut && ` • ${checkIn} - ${checkOut}`}
                {guests !== '1' && ` • ${guests} guests`}
              </p>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <div className="aspect-[4/3] bg-muted rounded-t-lg" />
                    <CardContent className="p-4 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-4 bg-muted rounded w-1/4" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {listings.map((listing) => (
                  <Card key={listing.id} className="group hover:shadow-lg transition-shadow cursor-pointer">
                    <Link to={`/listing/${listing.id}`}>
                      <div className="relative aspect-[4/3] overflow-hidden rounded-t-lg">
                        <img
                          src={listing.photos[0] || '/placeholder.svg'}
                          alt={listing.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/80 hover:bg-background"
                        >
                          <Heart className="h-4 w-4" />
                        </Button>
                      </div>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center text-sm text-muted-foreground">
                            <MapPin className="h-3 w-3 mr-1" />
                            {listing.city}, {listing.country}
                          </div>
                          <h3 className="font-semibold line-clamp-2">{listing.title}</h3>
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-xs">
                              {listing.property_type.replace('_', ' ')}
                            </Badge>
                            <div className="flex items-center space-x-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-sm">4.8</span>
                            </div>
                          </div>
                          <div className="pt-2">
                            <span className="font-bold">${listing.price_per_night}</span>
                            <span className="text-muted-foreground"> / night</span>
                          </div>
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>
            )}

            {!loading && listings.length === 0 && (
              <div className="text-center py-12">
                <h3 className="text-lg font-medium mb-2">No properties found</h3>
                <p className="text-muted-foreground">Try adjusting your search criteria</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Listings;