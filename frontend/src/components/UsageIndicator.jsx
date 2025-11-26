import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Progress,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Chip,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { userAPI } from "../services/api";

export default function UsageIndicator() {
  const navigate = useNavigate();
  const [usage, setUsage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchUsage();

    // Listen for usage updates
    const handleUsageUpdate = () => fetchUsage();
    window.addEventListener("usageUpdated", handleUsageUpdate);
    return () => window.removeEventListener("usageUpdated", handleUsageUpdate);
  }, []);

  const fetchUsage = async () => {
    try {
      const response = await userAPI.getUsage();
      setUsage(response.data);
    } catch (err) {
      console.error("Failed to fetch usage:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading || !usage) {
    return null;
  }

  const usedMinutes = Math.round(usage.minutes_used || 0);
  const totalMinutes = usage.minutes_limit || 60;
  const remainingMinutes = Math.round(usage.minutes_remaining || 0);
  const percentage = Math.round((usedMinutes / totalMinutes) * 100);

  const getColor = () => {
    if (percentage >= 90) return "danger";
    if (percentage >= 70) return "warning";
    return "primary";
  };

  return (
    <Popover placement="bottom-end">
      <PopoverTrigger>
        <Button
          variant="flat"
          size="sm"
          className="gap-2"
          startContent={<Icon icon="solar:chart-2-linear" width={16} />}
        >
          {remainingMinutes} min left
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72">
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Usage This Month</h4>
            <Chip size="sm" color={getColor()} variant="flat">
              {percentage}%
            </Chip>
          </div>

          <Progress
            value={percentage}
            color={getColor()}
            className="h-2"
          />

          <div className="flex justify-between text-sm">
            <span className="text-default-500">Used</span>
            <span className="font-medium">{usedMinutes} / {totalMinutes} min</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-default-500">Remaining</span>
            <span className="font-medium text-success">{remainingMinutes} min</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-default-500">Plan</span>
            <Chip size="sm" variant="flat">
              {usage.subscription_tier?.toUpperCase() || "FREE"}
            </Chip>
          </div>

          {percentage >= 70 && (
            <Button
              color="primary"
              size="sm"
              className="w-full"
              onPress={() => navigate("/pricing")}
              startContent={<Icon icon="solar:bolt-linear" width={16} />}
            >
              Upgrade Plan
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

