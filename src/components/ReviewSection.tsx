import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  profiles: {
    name: string;
    profile_photo: string;
  };
}

interface ReviewSectionProps {
  listingId: string;
  canReview?: boolean;
}

const ReviewSection: React.FC<ReviewSectionProps> = ({ listingId, canReview = false }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchReviews();
  }, [listingId]);

  const fetchReviews = async () => {
    try {
      const { data, error } = await supabase
        .from('reviews')
        .select(`
          id,
          rating,
          comment,
          created_at,
          profiles!reviews_guest_id_fkey (
            name,
            profile_photo
          )
        `)
        .eq('listing_id', listingId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReviews(data || []);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Authentication required',
        description: 'Please sign in to leave a review',
      });
      return;
    }

    if (rating === 0) {
      toast({
        variant: 'destructive',
        title: 'Rating required',
        description: 'Please select a rating',
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from('reviews').insert({
        listing_id: listingId,
        guest_id: user.id,
        rating,
        comment: comment.trim() || null,
      });

      if (error) throw error;

      toast({
        title: 'Review submitted',
        description: 'Thank you for your feedback!',
      });

      // Reset form
      setRating(0);
      setComment('');
      
      // Refresh reviews
      fetchReviews();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error submitting review',
        description: error.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (currentRating: number, interactive = false) => {
    return Array.from({ length: 5 }, (_, i) => {
      const starValue = i + 1;
      const isActive = interactive 
        ? starValue <= (hoveredStar || rating)
        : starValue <= currentRating;

      return (
        <Star
          key={i}
          className={`h-4 w-4 cursor-pointer transition-colors ${
            isActive ? 'fill-primary text-primary' : 'text-muted-foreground'
          }`}
          onClick={interactive ? () => setRating(starValue) : undefined}
          onMouseEnter={interactive ? () => setHoveredStar(starValue) : undefined}
          onMouseLeave={interactive ? () => setHoveredStar(0) : undefined}
        />
      );
    });
  };

  const averageRating = reviews.length > 0 
    ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Reviews {reviews.length > 0 && `(${reviews.length})`}
        </h3>
        {reviews.length > 0 && (
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              {renderStars(averageRating)}
            </div>
            <span className="font-medium">{averageRating.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Add Review Form */}
      {canReview && user && (
        <Card>
          <CardHeader>
            <CardTitle>Leave a Review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Rating</label>
              <div className="flex items-center space-x-1">
                {renderStars(rating, true)}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Comment (optional)</label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience..."
                rows={4}
              />
            </div>

            <Button 
              onClick={handleSubmitReview}
              disabled={submitting || rating === 0}
              className="w-full"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading reviews...
          </div>
        ) : reviews.length > 0 ? (
          reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-6">
                <div className="flex items-start space-x-4">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={review.profiles?.profile_photo} />
                    <AvatarFallback>
                      {review.profiles?.name?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{review.profiles?.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(review.created_at), 'MMM yyyy')}
                        </p>
                      </div>
                      <div className="flex items-center space-x-1">
                        {renderStars(review.rating)}
                      </div>
                    </div>
                    
                    {review.comment && (
                      <p className="text-sm leading-relaxed">{review.comment}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No reviews yet. Be the first to leave a review!
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewSection;