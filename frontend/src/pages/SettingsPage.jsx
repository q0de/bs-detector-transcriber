import { useState } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Switch,
  Divider,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { useTheme } from "../hooks/useTheme";

export default function SettingsPage() {
  const { theme, toggleTheme, isDark } = useTheme();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Icon icon="solar:settings-bold" className="text-primary" width={32} />
          Settings
        </h1>

        {/* Appearance */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold flex items-center gap-2">
              <Icon icon="solar:palette-linear" width={20} />
              Appearance
            </h2>
          </CardHeader>
          <CardBody className="gap-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-sm text-default-500">
                  Switch between light and dark theme
                </p>
              </div>
              <Switch
                isSelected={isDark}
                onValueChange={toggleTheme}
                size="lg"
                color="primary"
                startContent={<Icon icon="solar:sun-linear" width={18} />}
                endContent={<Icon icon="solar:moon-linear" width={18} />}
              />
            </div>
          </CardBody>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold flex items-center gap-2">
              <Icon icon="solar:bell-linear" width={20} />
              Notifications
            </h2>
          </CardHeader>
          <CardBody className="gap-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Email Notifications</p>
                <p className="text-sm text-default-500">
                  Receive updates about your video analyses
                </p>
              </div>
              <Switch
                isSelected={emailNotifications}
                onValueChange={setEmailNotifications}
                color="primary"
              />
            </div>
            <Divider />
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Marketing Emails</p>
                <p className="text-sm text-default-500">
                  Receive tips, product updates, and offers
                </p>
              </div>
              <Switch
                isSelected={marketingEmails}
                onValueChange={setMarketingEmails}
                color="primary"
              />
            </div>
          </CardBody>
        </Card>

        {/* Data & Privacy */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold flex items-center gap-2">
              <Icon icon="solar:shield-check-linear" width={20} />
              Data & Privacy
            </h2>
          </CardHeader>
          <CardBody className="gap-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Export Your Data</p>
                <p className="text-sm text-default-500">
                  Download all your video analyses
                </p>
              </div>
              <Button
                variant="flat"
                startContent={<Icon icon="solar:download-linear" width={18} />}
              >
                Export
              </Button>
            </div>
            <Divider />
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Clear History</p>
                <p className="text-sm text-default-500">
                  Delete all your video analysis history
                </p>
              </div>
              <Button
                variant="flat"
                color="danger"
                startContent={<Icon icon="solar:trash-bin-trash-linear" width={18} />}
                onPress={() => {
                  if (window.confirm("Are you sure? This will delete all your video history.")) {
                    console.log("Clearing history...");
                  }
                }}
              >
                Clear
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* About */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold flex items-center gap-2">
              <Icon icon="solar:info-circle-linear" width={20} />
              About
            </h2>
          </CardHeader>
          <CardBody className="gap-2">
            <p className="text-sm text-default-500">
              <strong>TruthLens</strong> - Video Transcription & Fact-Checking
            </p>
            <p className="text-sm text-default-400">Version 2.0.0</p>
            <div className="flex gap-4 mt-2">
              <a href="/terms" className="text-sm text-primary hover:underline">
                Terms of Service
              </a>
              <a href="/privacy" className="text-sm text-primary hover:underline">
                Privacy Policy
              </a>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

