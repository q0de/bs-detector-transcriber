import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Input,
  Chip,
  Progress,
  Divider,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { userAPI, paymentAPI } from "../services/api";
import { supabase } from "../services/supabase";

export default function ProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userDetails, setUserDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      setUser(authUser);

      const response = await userAPI.getCurrentUser();
      setUserDetails(response.data);
    } catch (err) {
      console.error("Failed to fetch user data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      const response = await paymentAPI.createPortalSession();
      window.location.href = response.data.url;
    } catch (err) {
      console.error("Failed to create portal session:", err);
    }
  };

  const getTierColor = (tier) => {
    const colors = {
      free: "default",
      starter: "primary",
      pro: "success",
      business: "warning",
    };
    return colors[tier?.toLowerCase()] || "default";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Icon icon="solar:spinner-line-duotone" className="animate-spin text-primary" width={40} />
      </div>
    );
  }

  const usagePercent = userDetails
    ? ((userDetails.minutes_used || 0) / (userDetails.minutes_limit || 1)) * 100
    : 0;

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Icon icon="solar:user-bold" className="text-primary" width={32} />
          Profile
        </h1>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold flex items-center gap-2">
              <Icon icon="solar:user-circle-linear" width={20} />
              Account Information
            </h2>
          </CardHeader>
          <CardBody className="gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold">
                {user?.email?.charAt(0).toUpperCase() || "U"}
              </div>
              <div>
                <p className="font-medium">{user?.email || "Unknown"}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Chip size="sm" color={getTierColor(userDetails?.subscription_tier)}>
                    {userDetails?.subscription_tier?.toUpperCase() || "FREE"} Plan
                  </Chip>
                  <span className="text-xs text-default-400">
                    Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "N/A"}
                  </span>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Usage */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold flex items-center gap-2">
              <Icon icon="solar:chart-2-linear" width={20} />
              Usage This Month
            </h2>
          </CardHeader>
          <CardBody className="gap-4">
            <div className="flex justify-between text-sm">
              <span>Minutes Used</span>
              <span className="font-medium">
                {Math.round(userDetails?.minutes_used || 0)} / {userDetails?.minutes_limit || 0} min
              </span>
            </div>
            <Progress
              value={usagePercent}
              color={usagePercent > 80 ? "danger" : usagePercent > 50 ? "warning" : "primary"}
              className="h-3"
            />
            <p className="text-sm text-default-500">
              {userDetails?.minutes_remaining || 0} minutes remaining
            </p>
            {usagePercent > 80 && (
              <Button
                color="primary"
                onPress={() => navigate("/pricing")}
                startContent={<Icon icon="solar:bolt-linear" width={18} />}
              >
                Upgrade for More Minutes
              </Button>
            )}
          </CardBody>
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold flex items-center gap-2">
              <Icon icon="solar:wallet-linear" width={20} />
              Subscription & Billing
            </h2>
          </CardHeader>
          <CardBody className="gap-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{userDetails?.subscription_tier?.toUpperCase() || "FREE"} Plan</p>
                <p className="text-sm text-default-500">
                  {userDetails?.minutes_limit || 0} minutes per month
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="flat"
                  onPress={handleManageBilling}
                  startContent={<Icon icon="solar:settings-linear" width={18} />}
                >
                  Manage Billing
                </Button>
                <Button
                  color="primary"
                  onPress={() => navigate("/pricing")}
                  startContent={<Icon icon="solar:bolt-linear" width={18} />}
                >
                  Upgrade
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Danger Zone */}
        <Card className="border-danger/20">
          <CardHeader>
            <h2 className="font-semibold text-danger flex items-center gap-2">
              <Icon icon="solar:danger-triangle-linear" width={20} />
              Danger Zone
            </h2>
          </CardHeader>
          <CardBody className="gap-4">
            <p className="text-sm text-default-500">
              Once you delete your account, there is no going back. Please be certain.
            </p>
            <Button
              color="danger"
              variant="flat"
              startContent={<Icon icon="solar:trash-bin-trash-linear" width={18} />}
              onPress={() => {
                if (window.confirm("Are you sure you want to delete your account? This cannot be undone.")) {
                  userAPI.deleteAccount().then(() => {
                    localStorage.clear();
                    navigate("/");
                  });
                }
              }}
            >
              Delete Account
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

