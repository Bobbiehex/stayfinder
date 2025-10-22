import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Check, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  read: boolean;
  created_at: string;
}

const Notifications = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }

    if (user) {
      fetchNotifications();
      subscribeToNotifications();
    }
  }, [user, loading, navigate]);

  const fetchNotifications = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notifications:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load notifications',
      });
    } else {
      setNotifications(data || []);
    }
    setLoadingNotifications(false);
  };

  const subscribeToNotifications = () => {
    if (!user) return;

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const markAsRead = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    if (error) {
      console.error('Error marking notification as read:', error);
    } else {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) {
      console.error('Error marking all as read:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to mark all as read',
      });
    } else {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast({
        title: 'Success',
        description: 'All notifications marked as read',
      });
    }
  };

  const deleteNotification = async (notificationId: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);

    if (error) {
      console.error('Error deleting notification:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete notification',
      });
    } else {
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      toast({
        title: 'Success',
        description: 'Notification deleted',
      });
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (loading || loadingNotifications) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="text-center">Loading notifications...</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-4 md:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 md:gap-3">
              <Bell className="h-6 w-6 md:h-8 md:w-8" />
              <h1 className="text-2xl md:text-3xl font-bold">Notifications</h1>
              {unreadCount > 0 && (
                <span className="bg-primary text-primary-foreground px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-semibold">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <Button onClick={markAllAsRead} variant="outline" size="sm">
                <Check className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">Mark all as read</span>
              </Button>
            )}
          </div>

          {notifications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No notifications yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {notifications.map((notification) => (
                <Card
                  key={notification.id}
                  className={`${
                    !notification.read
                      ? 'border-primary bg-primary/5'
                      : 'bg-card'
                  } transition-all hover:shadow-md`}
                >
                  <CardHeader className="pb-2 md:pb-3 p-4 md:p-6">
                    <div className="flex items-start justify-between gap-2">
                      <div 
                        className="flex-1 cursor-pointer min-w-0"
                        onClick={() => !notification.read && markAsRead(notification.id)}
                      >
                        <CardTitle className="text-base md:text-lg break-words">{notification.title}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(notification.created_at), 'PPpp')}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
                        {!notification.read && (
                          <div className="h-2 w-2 bg-primary rounded-full" />
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(notification.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 md:p-6 pt-0">
                    <p className="text-sm break-words">{notification.message}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Notifications;
