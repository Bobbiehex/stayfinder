import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Home, Facebook, Twitter, Instagram, Mail } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Footer: React.FC = () => {
  const { user } = useAuth();
  const [userRole, setUserRole] = React.useState<string>('');

  React.useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) return;
      
      try {
        const { data } = await import('@/integrations/supabase/client').then(module => 
          module.supabase.from('profiles').select('role').eq('user_id', user.id).single()
        );
        
        if (data) {
          setUserRole(data.role);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };

    fetchUserRole();
  }, [user]);

  const isHostOrAdmin = userRole === 'host' || userRole === 'admin';
  
  return (
    <footer className="bg-background border-t border-border mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center space-x-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Home className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-primary">StayFinder</span>
            </Link>
            <p className="text-muted-foreground text-sm">
              Discover amazing places to stay around the world. Your perfect accommodation awaits.
            </p>
            <div className="flex space-x-3">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Facebook className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Twitter className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Instagram className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Quick Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/listings" className="text-muted-foreground hover:text-foreground transition-colors">
                  Browse Listings
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-muted-foreground hover:text-foreground transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors">
                  Contact
                </Link>
              </li>
              <li>
                <Link to="/help" className="text-muted-foreground hover:text-foreground transition-colors">
                  Help Center
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Support</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/safety" className="text-muted-foreground hover:text-foreground transition-colors">
                  Safety Center
                </Link>
              </li>
              <li>
                <Link to="/terms" className="text-muted-foreground hover:text-foreground transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-muted-foreground hover:text-foreground transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/sitemap" className="text-muted-foreground hover:text-foreground transition-colors">
                  Sitemap
                </Link>
              </li>
            </ul>
          </div>

          {/* Hosting */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Hosting</h3>
            <ul className="space-y-2 text-sm">
              <li>
                {isHostOrAdmin ? (
                  <Link to="/host" className="text-muted-foreground hover:text-foreground transition-colors">
                    Host Dashboard
                  </Link>
                ) : (
                  <Link to="/host-application" className="text-muted-foreground hover:text-foreground transition-colors">
                    Become a Host
                  </Link>
                )}
              </li>
              <li>
                <Link to="/hosting-guide" className="text-muted-foreground hover:text-foreground transition-colors">
                  Hosting Guide
                </Link>
              </li>
              <li>
                <Link to="/host-protection" className="text-muted-foreground hover:text-foreground transition-colors">
                  Host Protection
                </Link>
              </li>
              <li>
                <Link to="/resources" className="text-muted-foreground hover:text-foreground transition-colors">
                  Resources
                </Link>
              </li>
            </ul>
            
            {/* CTA Button */}
            <div className="pt-4">
              {isHostOrAdmin ? (
                <Link to="/host">
                  <Button className="w-full sm:w-auto">
                    <Home className="h-4 w-4 mr-2" />
                    Host
                  </Button>
                </Link>
              ) : (
                <Link to="/host-application">
                  <Button className="w-full sm:w-auto">
                    <Home className="h-4 w-4 mr-2" />
                    Become a Host
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0">
          <div className="text-sm text-muted-foreground">
            © 2024 StayFinder. All rights reserved.
          </div>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <Link to="/contact" className="hover:text-foreground transition-colors flex items-center">
              <Mail className="h-4 w-4 mr-1" />
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;