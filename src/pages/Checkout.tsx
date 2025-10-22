import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CreditCard, Wallet, Building2, DollarSign, Bitcoin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, isPast, isToday } from 'date-fns';

interface Booking {
  id: string;
  listing_id: string;
  check_in_date: string;
  check_out_date: string;
  total_price: number;
  service_fee: number;
  cleaning_fee: number;
  payment_status: string;
  listings: {
    title: string;
    location: string;
  };
}

const Checkout = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('booking');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loadingBooking, setLoadingBooking] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardName, setCardName] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (user && bookingId) {
      fetchBooking();
    } else if (user && !bookingId) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate, bookingId]);

  const fetchBooking = async () => {
    if (!bookingId || !user) return;

    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        listings (
          title,
          location
        )
      `)
      .eq('id', bookingId)
      .eq('guest_id', user.id)
      .single();

    if (error) {
      console.error('Error fetching booking:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load booking details',
      });
      navigate('/dashboard');
    } else {
      setBooking(data);
    }
    setLoadingBooking(false);
  };

  const canMakePayment = () => {
    if (!booking) return false;
    const checkInDate = new Date(booking.check_in_date);
    return (isToday(checkInDate) || isPast(checkInDate)) && booking.payment_status !== 'paid';
  };

  const handlePaymentMethodSelect = (method: string) => {
    if (!canMakePayment()) {
      toast({
        variant: 'destructive',
        title: 'Payment Not Available',
        description: 'Payment can only be made on or after the check-in date',
      });
      return;
    }
    setSelectedMethod(method);
  };

  const handlePaymentSubmit = async () => {
    if (!booking || !selectedMethod) return;

    // Validate card details if Credit/Debit Card is selected
    if (selectedMethod === 'Credit/Debit Card') {
      if (!cardNumber || !cardExpiry || !cardCvv || !cardName) {
        toast({
          variant: 'destructive',
          title: 'Incomplete Details',
          description: 'Please fill in all card details',
        });
        return;
      }
    }

    setProcessing(true);

    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const { error, data: updatedBooking } = await supabase
      .from('bookings')
      .update({ 
        payment_status: 'paid',
        payment_intent_id: `${selectedMethod}_${Date.now()}`
      })
      .eq('id', booking.id)
      .select('*, listings(title, host_id)')
      .single();

    if (error) {
      console.error('Error updating payment:', error);
      toast({
        variant: 'destructive',
        title: 'Payment Failed',
        description: 'Failed to process payment. Please try again.',
      });
    } else {
      // Create notification for guest
      await supabase.from('notifications').insert({
        user_id: user?.id,
        type: 'payment',
        title: 'Payment Successful',
        message: `Your payment of $${totalAmount.toFixed(2)} for "${booking.listings.title}" has been processed successfully using ${selectedMethod}.`,
        data: { booking_id: booking.id, method: selectedMethod },
      });

      // Create notification for host about payment
      if (updatedBooking?.listings) {
        await supabase.from('notifications').insert({
          user_id: updatedBooking.listings.host_id,
          type: 'payment',
          title: 'Booking Payment Received',
          message: `Payment received for "${updatedBooking.listings.title}". Check-out date: ${format(new Date(booking.check_out_date), 'PPP')}. You may want to mark this listing as unavailable.`,
          data: { 
            booking_id: booking.id, 
            listing_id: booking.listing_id,
            check_out_date: booking.check_out_date,
            guest_id: user?.id
          },
        });
      }

      toast({
        title: 'Payment Successful',
        description: `Your payment has been processed via ${selectedMethod}`,
      });

      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
    }

    setProcessing(false);
  };

  const vat = booking ? Number(booking.total_price) * 0.1 : 0;
  const totalAmount = booking ? Number(booking.total_price) + vat : 0;

  if (loading || loadingBooking) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center">Loading...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center">Booking not found</div>
        </main>
        <Footer />
      </div>
    );
  }

  const checkInDate = new Date(booking.check_in_date);
  const isPaymentAvailable = canMakePayment();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-4 md:py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold mb-4 md:mb-6">Checkout</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {/* Booking Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4">
                <div>
                  <p className="font-semibold text-sm md:text-base">{booking.listings.title}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">{booking.listings.location}</p>
                </div>
                <div className="border-t pt-3 md:pt-4">
                  <div className="flex justify-between mb-2 text-sm md:text-base">
                    <span>Check-in</span>
                    <span className="text-xs md:text-sm">{format(new Date(booking.check_in_date), 'PP')}</span>
                  </div>
                  <div className="flex justify-between mb-2 text-sm md:text-base">
                    <span>Check-out</span>
                    <span className="text-xs md:text-sm">{format(new Date(booking.check_out_date), 'PP')}</span>
                  </div>
                </div>
                <div className="border-t pt-3 md:pt-4 space-y-2">
                  <div className="flex justify-between text-sm md:text-base">
                    <span>Booking Price</span>
                    <span>${Number(booking.total_price).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm md:text-base">
                    <span>VAT (10%)</span>
                    <span>${vat.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base md:text-lg pt-2 border-t">
                    <span>Total</span>
                    <span>${totalAmount.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <div className="space-y-4">
              {!selectedMethod ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Method</CardTitle>
                    <CardDescription>
                      {isPaymentAvailable
                        ? 'Select your preferred payment method'
                        : `Payment available from ${format(checkInDate, 'PP')}`}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2 md:space-y-3">
                    <Button
                      onClick={() => handlePaymentMethodSelect('Credit/Debit Card')}
                      disabled={!isPaymentAvailable || processing}
                      className="w-full justify-start text-sm md:text-base"
                      variant="outline"
                    >
                      <CreditCard className="h-4 w-4 md:h-5 md:w-5 mr-2 md:mr-3" />
                      Credit / Debit Card
                    </Button>

                    <Button
                      onClick={() => handlePaymentMethodSelect('Stripe')}
                      disabled={!isPaymentAvailable || processing}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <DollarSign className="h-5 w-5 mr-3" />
                      Stripe
                    </Button>

                    <Button
                      onClick={() => handlePaymentMethodSelect('PayPal')}
                      disabled={!isPaymentAvailable || processing}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <Wallet className="h-5 w-5 mr-3" />
                      PayPal
                    </Button>

                    <Button
                      onClick={() => handlePaymentMethodSelect('Paystack')}
                      disabled={!isPaymentAvailable || processing}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <Building2 className="h-5 w-5 mr-3" />
                      Paystack
                    </Button>

                    <Button
                      onClick={() => handlePaymentMethodSelect('CashApp')}
                      disabled={!isPaymentAvailable || processing}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <DollarSign className="h-5 w-5 mr-3" />
                      CashApp
                    </Button>

                    <Button
                      onClick={() => handlePaymentMethodSelect('Bank Transfer')}
                      disabled={!isPaymentAvailable || processing}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <Building2 className="h-5 w-5 mr-3" />
                      Bank Transfer
                    </Button>

                    <Button
                      onClick={() => handlePaymentMethodSelect('USSD')}
                      disabled={!isPaymentAvailable || processing}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <Building2 className="h-5 w-5 mr-3" />
                      USSD
                    </Button>

                    <Button
                      onClick={() => handlePaymentMethodSelect('Cryptocurrency')}
                      disabled={!isPaymentAvailable || processing}
                      className="w-full justify-start"
                      variant="outline"
                    >
                      <Bitcoin className="h-5 w-5 mr-3" />
                      Cryptocurrency
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle>Payment Details</CardTitle>
                    <CardDescription>
                      Complete your payment with {selectedMethod}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {selectedMethod === 'Credit/Debit Card' && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="cardName">Cardholder Name</Label>
                          <Input
                            id="cardName"
                            placeholder="John Doe"
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cardNumber">Card Number</Label>
                          <Input
                            id="cardNumber"
                            placeholder="1234 5678 9012 3456"
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                            maxLength={19}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="cardExpiry">Expiry Date</Label>
                            <Input
                              id="cardExpiry"
                              placeholder="MM/YY"
                              value={cardExpiry}
                              onChange={(e) => setCardExpiry(e.target.value)}
                              maxLength={5}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="cardCvv">CVV</Label>
                            <Input
                              id="cardCvv"
                              placeholder="123"
                              value={cardCvv}
                              onChange={(e) => setCardCvv(e.target.value)}
                              maxLength={3}
                            />
                          </div>
                        </div>
                      </>
                    )}
                    
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        onClick={() => setSelectedMethod(null)}
                        disabled={processing}
                        className="flex-1"
                      >
                        Back
                      </Button>
                      <Button
                        onClick={handlePaymentSubmit}
                        disabled={processing}
                        className="flex-1"
                      >
                        {processing ? 'Processing...' : `Pay $${totalAmount.toFixed(2)}`}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {!isPaymentAvailable && booking.payment_status !== 'paid' && (
                <Card className="border-warning bg-warning/10">
                  <CardContent className="pt-6">
                    <p className="text-sm">
                      <strong>Note:</strong> Payment will be available on your check-in date ({format(checkInDate, 'PP')})
                    </p>
                  </CardContent>
                </Card>
              )}

              {booking.payment_status === 'paid' && (
                <Card className="border-green-500 bg-green-50">
                  <CardContent className="pt-6">
                    <p className="text-sm text-green-700">
                      <strong>Payment Completed</strong> - This booking has been paid
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Checkout;
