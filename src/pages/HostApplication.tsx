import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/layout/Header';
import { Loader2, Upload, Home, Check } from 'lucide-react';

const HostApplication: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [hasExistingApplication, setHasExistingApplication] = useState(false);
  const [applicationStatus, setApplicationStatus] = useState<string>('none');
  const [formData, setFormData] = useState({
    full_name: '',
    email_address: '',
    location_address: '',
    profile_picture: '',
    application_message: ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkExistingApplication();
  }, [user, navigate]);

  const checkExistingApplication = async () => {
    try {
      // Check if user already has an application
      const { data: application, error: appError } = await supabase
        .from('host_applications')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (application) {
        setHasExistingApplication(true);
        setApplicationStatus(application.status);
        setFormData({
          full_name: application.full_name,
          email_address: application.email_address,
          location_address: application.location_address,
          profile_picture: application.profile_picture || '',
          application_message: application.application_message || ''
        });
      } else {
        // Pre-fill from profile if available
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user?.id)
          .single();

        if (profile) {
          setFormData(prev => ({
            ...prev,
            full_name: profile.full_name || profile.name || '',
            email_address: profile.email_address || user?.email || '',
            location_address: profile.location_address || ''
          }));
        }
      }
    } catch (error) {
      console.error('Error checking application:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitApplication = async () => {
    if (!formData.full_name || !formData.email_address || !formData.location_address) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from('host_applications')
        .insert({
          user_id: user?.id,
          full_name: formData.full_name,
          email_address: formData.email_address,
          location_address: formData.location_address,
          profile_picture: formData.profile_picture,
          application_message: formData.application_message,
          status: 'pending'
        });

      if (error) throw error;

      // Update profile with host application status
      await supabase
        .from('profiles')
        .update({
          host_application_status: 'pending',
          full_name: formData.full_name,
          email_address: formData.email_address,
          location_address: formData.location_address,
          profile_picture: formData.profile_picture
        })
        .eq('user_id', user?.id);

      // Create notification
      await supabase.from('notifications').insert({
        user_id: user?.id,
        type: 'host_application',
        title: 'Host Application Submitted',
        message: 'Your host application has been submitted successfully and is under review.',
        data: { status: 'pending' },
      });

      toast({
        title: "Application Submitted!",
        description: "Your host application has been submitted successfully. We'll review it and get back to you soon."
      });

      navigate('/dashboard');
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        title: "Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    try {
      // Upload file to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      setFormData(prev => ({ ...prev, profile_picture: publicUrl }));

      toast({
        title: "Success",
        description: "Profile picture uploaded successfully"
      });
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Error",
        description: "Failed to upload profile picture",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

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

  if (hasExistingApplication) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                {applicationStatus === 'approved' ? (
                  <Check className="h-12 w-12 text-green-500" />
                ) : applicationStatus === 'rejected' ? (
                  <Home className="h-12 w-12 text-red-500" />
                ) : (
                  <Home className="h-12 w-12 text-yellow-500" />
                )}
              </div>
              <CardTitle>
                {applicationStatus === 'approved' && 'Application Approved!'}
                {applicationStatus === 'rejected' && 'Application Not Approved'}
                {applicationStatus === 'pending' && 'Application Under Review'}
              </CardTitle>
              <CardDescription>
                {applicationStatus === 'approved' && 'Congratulations! You can now create listings as a host.'}
                {applicationStatus === 'rejected' && 'Your host application was not approved. You can contact support for more information.'}
                {applicationStatus === 'pending' && 'Your host application is currently being reviewed by our team.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button onClick={() => navigate('/dashboard')}>
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center mb-4">
              <Home className="h-12 w-12 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Become a Host</h1>
            <p className="text-muted-foreground">
              Join our community of hosts and start earning by sharing your space
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Host Application</CardTitle>
              <CardDescription>
                Please provide the following information to apply as a host
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Profile Picture */}
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={formData.profile_picture || user?.user_metadata?.avatar_url} />
                  <AvatarFallback className="text-lg">
                    {formData.full_name?.[0] || user?.email?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <label htmlFor="photo-upload-host">
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={uploading}
                    className="cursor-pointer"
                    asChild
                  >
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? 'Uploading...' : 'Upload Photo'}
                    </span>
                  </Button>
                </label>
                <input
                  id="photo-upload-host"
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                    placeholder="Enter your full legal name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email_address">Email Address *</Label>
                  <Input
                    id="email_address"
                    type="email"
                    value={formData.email_address}
                    onChange={(e) => setFormData(prev => ({ ...prev, email_address: e.target.value }))}
                    placeholder="Enter your email address"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="location_address">Address *</Label>
                  <Input
                    id="location_address"
                    value={formData.location_address}
                    onChange={(e) => setFormData(prev => ({ ...prev, location_address: e.target.value }))}
                    placeholder="Enter your full address"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="application_message">Why do you want to become a host? (Optional)</Label>
                  <Textarea
                    id="application_message"
                    value={formData.application_message}
                    onChange={(e) => setFormData(prev => ({ ...prev, application_message: e.target.value }))}
                    placeholder="Tell us about your hosting goals and experience..."
                    rows={4}
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/')}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmitApplication} 
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Submit Application
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default HostApplication;