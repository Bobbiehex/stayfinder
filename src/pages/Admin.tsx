import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import { Loader2, Users, Home, Bell, Check, X, Clock } from 'lucide-react';

interface HostApplication {
  id: string;
  user_id: string;
  full_name: string;
  email_address: string;
  location_address: string;
  profile_picture: string | null;
  status: string;
  application_message: string | null;
  created_at: string;
}

interface UserProfile {
  user_id: string;
  name: string | null;
  role: string;
}

const Admin: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<HostApplication[]>([]);
  const [userRole, setUserRole] = useState<string>('');
  const [processingApplication, setProcessingApplication] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAdminAccess();
  }, [user, navigate]);

  const checkAdminAccess = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;

      if (profile.role !== 'admin') {
        navigate('/dashboard');
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page",
          variant: "destructive"
        });
        return;
      }

      setUserRole(profile.role);
      await fetchHostApplications();
    } catch (error) {
      console.error('Error checking admin access:', error);
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const fetchHostApplications = async () => {
    try {
      const { data, error } = await supabase
        .from('host_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast({
        title: "Error",
        description: "Failed to load host applications",
        variant: "destructive"
      });
    }
  };

  const handleApplicationAction = async (applicationId: string, action: 'approved' | 'rejected') => {
    setProcessingApplication(applicationId);
    try {
      const application = applications.find(app => app.id === applicationId);
      if (!application) return;

      // Update application status
      const { error: appError } = await supabase
        .from('host_applications')
        .update({ 
          status: action,
          admin_notes: `Application ${action} by admin`
        })
        .eq('id', applicationId);

      if (appError) throw appError;

      // Update user profile
      const profileUpdates: any = {
        host_application_status: action
      };

      // If approved, change role to host
      if (action === 'approved') {
        profileUpdates.role = 'host';
      } else if (action === 'rejected') {
        // If rejected/disapproved, change role back to guest
        profileUpdates.role = 'guest';
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update(profileUpdates)
        .eq('user_id', application.user_id);

      if (profileError) throw profileError;

      // Create notification for the applicant
      const wasApproved = applications.find(app => app.id === applicationId)?.status === 'approved';
      await supabase.from('notifications').insert({
        user_id: application.user_id,
        type: 'host_application',
        title: action === 'approved' ? 'Host Application Approved!' : wasApproved ? 'Host Status Revoked' : 'Host Application Update',
        message: action === 'approved' 
          ? 'Congratulations! Your host application has been approved. You can now create listings.' 
          : wasApproved 
          ? 'Your host status has been revoked. You can no longer create listings. Please contact support for more information.'
          : 'Your host application was not approved at this time. Please contact support for more information.',
        data: { status: action, application_id: applicationId },
      });

      toast({
        title: "Success",
        description: `Application ${action} successfully`
      });

      await fetchHostApplications();
    } catch (error) {
      console.error('Error updating application:', error);
      toast({
        title: "Error",
        description: "Failed to update application",
        variant: "destructive"
      });
    } finally {
      setProcessingApplication(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-500"><Check className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingApplications = applications.filter(app => app.status === 'pending');
  const processedApplications = applications.filter(app => app.status !== 'pending');

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
              <p className="text-muted-foreground">
                Manage host applications and platform settings
              </p>
            </div>
            {pendingApplications.length > 0 && (
              <Badge variant="secondary" className="w-fit">
                <Bell className="h-4 w-4 mr-1" />
                {pendingApplications.length} Pending
              </Badge>
            )}
          </div>

          <Tabs defaultValue="pending" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pending" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Pending Applications ({pendingApplications.length})
              </TabsTrigger>
              <TabsTrigger value="processed" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Processed Applications ({processedApplications.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="space-y-4">
              {pendingApplications.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Bell className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Pending Applications</h3>
                    <p className="text-muted-foreground text-center">
                      All host applications have been reviewed
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {pendingApplications.map((application) => (
                    <Card key={application.id}>
                      <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarImage src={application.profile_picture || ''} />
                              <AvatarFallback>
                                {application.full_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-lg">{application.full_name}</CardTitle>
                              <CardDescription>{application.email_address}</CardDescription>
                            </div>
                          </div>
                          {getStatusBadge(application.status)}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Location:</span>
                            <p className="text-muted-foreground">{application.location_address}</p>
                          </div>
                          <div>
                            <span className="font-medium">Applied:</span>
                            <p className="text-muted-foreground">
                              {new Date(application.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {application.application_message && (
                          <div>
                            <span className="font-medium">Message:</span>
                            <p className="text-muted-foreground mt-1">
                              {application.application_message}
                            </p>
                          </div>
                        )}

                        <div className="flex flex-col sm:flex-row gap-2 pt-4">
                          <Button 
                            onClick={() => handleApplicationAction(application.id, 'approved')}
                            disabled={processingApplication === application.id}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            {processingApplication === application.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Check className="h-4 w-4 mr-2" />
                            )}
                            Approve
                          </Button>
                          <Button 
                            variant="destructive"
                            onClick={() => handleApplicationAction(application.id, 'rejected')}
                            disabled={processingApplication === application.id}
                            className="flex-1"
                          >
                            {processingApplication === application.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <X className="h-4 w-4 mr-2" />
                            )}
                            Reject
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="processed" className="space-y-4">
              {processedApplications.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Processed Applications</h3>
                    <p className="text-muted-foreground text-center">
                      Processed applications will appear here
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {processedApplications.map((application) => (
                    <Card key={application.id}>
                      <CardHeader>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                          <div className="flex items-center space-x-3">
                            <Avatar>
                              <AvatarImage src={application.profile_picture || ''} />
                              <AvatarFallback>
                                {application.full_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <CardTitle className="text-lg">{application.full_name}</CardTitle>
                              <CardDescription>{application.email_address}</CardDescription>
                            </div>
                          </div>
                          {getStatusBadge(application.status)}
                        </div>
                      </CardHeader>
                       <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="font-medium">Location:</span>
                            <p className="text-muted-foreground">{application.location_address}</p>
                          </div>
                          <div>
                            <span className="font-medium">Applied:</span>
                            <p className="text-muted-foreground">
                              {new Date(application.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">Status:</span>
                            <p className="text-muted-foreground capitalize">
                              {application.status}
                            </p>
                          </div>
                        </div>

                        {application.status === 'approved' && (
                          <div className="pt-4 border-t">
                            <Button 
                              variant="destructive"
                              onClick={() => handleApplicationAction(application.id, 'rejected')}
                              disabled={processingApplication === application.id}
                              className="w-full sm:w-auto"
                            >
                              {processingApplication === application.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <X className="h-4 w-4 mr-2" />
                              )}
                              Disapprove Host
                            </Button>
                          </div>
                        )}

                        {application.status === 'rejected' && (
                          <div className="pt-4 border-t">
                            <Button 
                              onClick={() => handleApplicationAction(application.id, 'approved')}
                              disabled={processingApplication === application.id}
                              className="w-full sm:w-auto bg-green-600 hover:bg-green-700"
                            >
                              {processingApplication === application.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              ) : (
                                <Check className="h-4 w-4 mr-2" />
                              )}
                              Re-approve Host
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Admin;