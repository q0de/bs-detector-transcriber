import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenuToggle,
  NavbarMenu,
  NavbarMenuItem,
  Button,
  Avatar,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  DropdownSection,
  Chip,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { supabase } from "../services/supabase";
import { userAPI } from "../services/api";
import { useTheme } from "../hooks/useTheme";

export default function AppNavbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUser(session.user);
        try {
          const response = await userAPI.getCurrentUser();
          setUserDetails(response.data);
        } catch (err) {
          console.error('Failed to fetch user details:', err);
        }
      } else {
        const token = localStorage.getItem('access_token');
        const storedUser = localStorage.getItem('user');
        
        if (token && storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            const response = await userAPI.getCurrentUser();
            setUserDetails(response.data);
          } catch (e) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('user');
            setUser(null);
            setUserDetails(null);
          }
        }
      }
    };

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.access_token) {
        localStorage.setItem('access_token', session.access_token);
        localStorage.setItem('user', JSON.stringify(session.user));
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
      }
      
      if (event !== 'INITIAL_SESSION' || session?.user) {
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => {
            userAPI.getCurrentUser()
              .then(res => setUserDetails(res.data))
              .catch(err => console.error('Failed to fetch user details:', err));
          }, 100);
        } else if (event === 'SIGNED_OUT') {
          setUserDetails(null);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const isLoggedIn = !!(user || localStorage.getItem('access_token'));

  const getTierColor = (tier) => {
    const colors = {
      'free': 'default',
      'starter': 'primary',
      'pro': 'success',
      'business': 'warning'
    };
    return colors[tier?.toLowerCase()] || 'default';
  };

  const menuItems = [
    { label: "Pricing", href: "/pricing", icon: "solar:wallet-linear" },
    ...(isLoggedIn ? [
      { label: "Dashboard", href: "/dashboard", icon: "solar:chart-2-linear" },
      { label: "History", href: "/history", icon: "solar:history-linear" },
    ] : []),
  ];

  return (
    <Navbar 
      isMenuOpen={isMenuOpen} 
      onMenuOpenChange={setIsMenuOpen}
      classNames={{
        wrapper: "max-w-7xl",
      }}
      isBordered
    >
      <NavbarContent>
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          className="sm:hidden"
        />
        <NavbarBrand>
          <Link to="/" className="flex items-center gap-2.5 font-bold text-xl">
            <div className="relative">
              <Icon icon="solar:shield-check-bold" className="text-secondary" width={32} />
            </div>
            <span className="font-semibold tracking-tight">
              <span className="text-foreground">Truth</span>
              <span className="bg-gradient-to-r from-secondary to-primary bg-clip-text text-transparent">Lens</span>
            </span>
          </Link>
        </NavbarBrand>
      </NavbarContent>

      <NavbarContent className="hidden sm:flex gap-4" justify="center">
        {menuItems.map((item) => (
          <NavbarItem key={item.href}>
            <Link 
              to={item.href}
              className="flex items-center gap-2 text-foreground hover:text-primary transition-colors"
            >
              <Icon icon={item.icon} width={18} />
              {item.label}
            </Link>
          </NavbarItem>
        ))}
      </NavbarContent>

      <NavbarContent justify="end">
        <NavbarItem>
          <Button
            isIconOnly
            variant="light"
            onPress={toggleTheme}
            aria-label="Toggle theme"
          >
            <Icon 
              icon={theme === "dark" ? "solar:sun-linear" : "solar:moon-linear"} 
              width={20}
            />
          </Button>
        </NavbarItem>
        
        {isLoggedIn ? (
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Avatar
                as="button"
                className="transition-transform"
                color="primary"
                name={user?.email?.charAt(0).toUpperCase() || 'U'}
                size="sm"
                isBordered
              />
            </DropdownTrigger>
            <DropdownMenu aria-label="User menu" variant="flat">
              <DropdownSection showDivider>
                <DropdownItem key="email" className="h-16 gap-2" textValue="email" isReadOnly>
                  <div className="flex flex-col gap-1">
                    <p className="font-semibold">{user?.email || 'User'}</p>
                    {userDetails && (
                      <div className="flex items-center gap-2">
                        <Chip 
                          size="sm" 
                          color={getTierColor(userDetails.subscription_tier)}
                          variant="flat"
                        >
                          {userDetails.subscription_tier?.toUpperCase() || 'FREE'}
                        </Chip>
                        <span className="text-xs text-default-400">
                          {userDetails.minutes_remaining || 0} / {userDetails.minutes_limit || 0} min
                        </span>
                      </div>
                    )}
                  </div>
                </DropdownItem>
              </DropdownSection>
              <DropdownSection showDivider>
                <DropdownItem 
                  key="profile" 
                  startContent={<Icon icon="solar:user-linear" width={18} />}
                  onPress={() => navigate("/profile")}
                >
                  Profile & Billing
                </DropdownItem>
                <DropdownItem 
                  key="referrals" 
                  startContent={<Icon icon="solar:gift-linear" width={18} />}
                  onPress={() => navigate("/profile#referrals")}
                >
                  Referral Program
                </DropdownItem>
                <DropdownItem 
                  key="upgrade" 
                  startContent={<Icon icon="solar:bolt-linear" width={18} />}
                  onPress={() => navigate("/pricing")}
                >
                  Upgrade Plan
                </DropdownItem>
              </DropdownSection>
              <DropdownItem 
                key="logout" 
                color="danger"
                startContent={<Icon icon="solar:logout-2-linear" width={18} />}
                onPress={handleLogout}
              >
                Log Out
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        ) : (
          <NavbarItem className="flex gap-2">
            {location.pathname === '/' ? (
              <Button 
                as={Link} 
                to="/signup" 
                color="primary"
                endContent={<Icon icon="solar:arrow-right-linear" width={18} />}
              >
                Sign Up Free
              </Button>
            ) : (
              <Button 
                as={Link} 
                to="/" 
                color="primary"
                variant="flat"
                endContent={<Icon icon="solar:arrow-right-linear" width={18} />}
              >
                Try Free
              </Button>
            )}
          </NavbarItem>
        )}
      </NavbarContent>

      <NavbarMenu>
        {menuItems.map((item) => (
          <NavbarMenuItem key={item.href}>
            <Link
              to={item.href}
              className="flex items-center gap-2 w-full text-foreground py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              <Icon icon={item.icon} width={18} />
              {item.label}
            </Link>
          </NavbarMenuItem>
        ))}
        {!isLoggedIn && (
          <NavbarMenuItem>
            <Link
              to="/signup"
              className="flex items-center gap-2 w-full text-primary py-2"
              onClick={() => setIsMenuOpen(false)}
            >
              <Icon icon="solar:login-2-linear" width={18} />
              Sign Up
            </Link>
          </NavbarMenuItem>
        )}
      </NavbarMenu>
    </Navbar>
  );
}

