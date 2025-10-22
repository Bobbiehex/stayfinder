import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Search, MapPin, Calendar as CalendarIcon, Users } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface SearchBarProps {
  className?: string;
  size?: 'default' | 'large';
}

const SearchBar: React.FC<SearchBarProps> = ({ className, size = 'default' }) => {
  const [location, setLocation] = useState('');
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [guests, setGuests] = useState(1);
  const navigate = useNavigate();

  const handleSearch = () => {
    const searchParams = new URLSearchParams({
      location: location || '',
      checkIn: checkIn ? format(checkIn, 'yyyy-MM-dd') : '',
      checkOut: checkOut ? format(checkOut, 'yyyy-MM-dd') : '',
      guests: guests.toString(),
    });

    navigate(`/listings?${searchParams.toString()}`);
  };

  const isLarge = size === 'large';

  return (
    <div className={cn(
      'flex items-center rounded-full border border-border bg-background shadow-lg overflow-x-auto md:overflow-visible',
      isLarge ? 'h-auto md:h-16 p-1 md:p-2' : 'h-12 p-1',
      className
    )}>
      {/* Location - Icon only on mobile */}
      <div className={cn(
        'flex items-center space-x-1 md:space-x-2 flex-shrink-0 px-2 md:px-4',
        isLarge ? 'py-2 md:py-3' : 'py-2'
      )}>
        <MapPin className={cn('text-muted-foreground flex-shrink-0', isLarge ? 'h-4 w-4 md:h-5 md:w-5' : 'h-4 w-4')} />
        <Input
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-20 md:w-auto text-xs md:text-sm"
        />
      </div>

      {/* Divider */}
      <div className="h-6 md:h-8 w-px bg-border flex-shrink-0" />

      {/* Check-in - Icon only on mobile */}
      <div className={cn('flex items-center space-x-1 flex-shrink-0 px-2 md:px-4', isLarge ? 'py-2 md:py-3' : 'py-2')}>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="h-auto p-0 font-normal text-left flex items-center">
              <CalendarIcon className={cn('text-muted-foreground flex-shrink-0', isLarge ? 'h-4 w-4 md:h-5 md:w-5 md:mr-2' : 'h-4 w-4')} />
              <span className="text-muted-foreground text-xs md:text-sm whitespace-nowrap hidden md:inline">
                {checkIn ? format(checkIn, 'MMM dd') : 'Check in'}
              </span>
              <span className="text-muted-foreground text-xs md:hidden">
                {checkIn ? format(checkIn, 'dd') : 'In'}
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
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Divider */}
      <div className="h-6 md:h-8 w-px bg-border flex-shrink-0" />

      {/* Check-out - Icon only on mobile */}
      <div className={cn('flex items-center space-x-1 flex-shrink-0 px-2 md:px-4', isLarge ? 'py-2 md:py-3' : 'py-2')}>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="h-auto p-0 font-normal text-left flex items-center">
              <CalendarIcon className={cn('text-muted-foreground flex-shrink-0', isLarge ? 'h-4 w-4 md:h-5 md:w-5 md:mr-2' : 'h-4 w-4')} />
              <span className="text-muted-foreground text-xs md:text-sm whitespace-nowrap hidden md:inline">
                {checkOut ? format(checkOut, 'MMM dd') : 'Check out'}
              </span>
              <span className="text-muted-foreground text-xs md:hidden">
                {checkOut ? format(checkOut, 'dd') : 'Out'}
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
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Divider */}
      <div className="h-6 md:h-8 w-px bg-border flex-shrink-0" />

      {/* Guests - Icon only on mobile */}
      <div className={cn('flex items-center space-x-1 flex-shrink-0 px-2 md:px-4', isLarge ? 'py-2 md:py-3' : 'py-2')}>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" className="h-auto p-0 font-normal text-left flex items-center">
              <Users className={cn('text-muted-foreground flex-shrink-0', isLarge ? 'h-4 w-4 md:h-5 md:w-5 md:mr-2' : 'h-4 w-4')} />
              <span className="text-muted-foreground text-xs md:text-sm whitespace-nowrap hidden md:inline">
                {guests} guest{guests !== 1 ? 's' : ''}
              </span>
              <span className="text-muted-foreground text-xs md:hidden">
                {guests}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
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
                    onClick={() => setGuests(Math.min(10, guests + 1))}
                    disabled={guests >= 10}
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Search button */}
      <Button
        onClick={handleSearch}
        size={isLarge ? 'lg' : 'default'}
        className={cn(
          'rounded-full flex-shrink-0',
          isLarge ? 'h-10 w-10 md:h-12 md:w-12' : 'h-10 w-10'
        )}
      >
        <Search className={cn(isLarge ? 'h-5 w-5 md:h-6 md:w-6' : 'h-4 w-4')} />
      </Button>
    </div>
  );
};

export default SearchBar;