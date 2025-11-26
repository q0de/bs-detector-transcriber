import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardBody,
  Spinner,
  Button,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { supabase } from "../services/supabase";

export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("processing");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Check if we already have a session
        const { data: existingSession } = await supabase.auth.getSession();
        if (existingSession?.session) {
          localStorage.setItem("access_token", existingSession.session.access_token);
          localStorage.setItem("user", JSON.stringify(existingSession.session.user));
          setStatus("success");
          setTimeout(() => {
            navigate("/dashboard", { replace: true, state: { loginSuccess: true } });
          }, 100);
          return;
        }

        // Check URL hash for OAuth tokens
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");

        if (accessToken) {
          window.history.replaceState(null, "", window.location.pathname);

          const { data: sessionData, error: setError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || accessToken,
          });

          if (setError) {
            setStatus("error");
            setErrorMessage(setError.message || "Failed to establish session");
            return;
          }

          if (sessionData.session) {
            localStorage.setItem("access_token", sessionData.session.access_token);
            localStorage.setItem("user", JSON.stringify(sessionData.session.user));

            const isNewUser = new Date(sessionData.session.user.created_at).getTime() > Date.now() - 10000;

            setStatus("success");
            setTimeout(() => {
              navigate("/dashboard", {
                replace: true,
                state: {
                  loginSuccess: true,
                  message: isNewUser
                    ? "🎉 Welcome! You have 60 free minutes to get started."
                    : `Welcome back, ${sessionData.session.user.email}!`,
                },
              });
            }, 300);
            return;
          }
        }

        // Fallback: Try getting existing session
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          setStatus("error");
          setErrorMessage(error.message || "Authentication failed");
          return;
        }

        if (data.session) {
          localStorage.setItem("access_token", data.session.access_token);
          localStorage.setItem("user", JSON.stringify(data.session.user));

          setStatus("success");
          setTimeout(() => {
            navigate("/dashboard", {
              replace: true,
              state: {
                loginSuccess: true,
                message: `Welcome back, ${data.session.user.email}!`,
              },
            });
          }, 300);
        } else {
          setStatus("error");
          setErrorMessage("No session found. Please try signing in again.");
          setTimeout(() => {
            navigate("/login", { replace: true });
          }, 2000);
        }
      } catch (err) {
        setStatus("error");
        setErrorMessage("An unexpected error occurred. Please try again.");
      }
    };

    handleOAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-default-100">
      <Card className="w-full max-w-md">
        <CardBody className="py-12 text-center gap-4">
          {status === "processing" && (
            <>
              <Spinner size="lg" color="primary" />
              <h2 className="text-xl font-semibold">Completing sign-in...</h2>
              <p className="text-default-500">Please wait while we set up your account.</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-success/10 flex items-center justify-center">
                <Icon icon="solar:check-circle-bold" className="text-success" width={40} />
              </div>
              <h2 className="text-xl font-semibold">Success!</h2>
              <p className="text-default-500">Redirecting to dashboard...</p>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-16 h-16 mx-auto rounded-full bg-danger/10 flex items-center justify-center">
                <Icon icon="solar:close-circle-bold" className="text-danger" width={40} />
              </div>
              <h2 className="text-xl font-semibold">Authentication Failed</h2>
              <p className="text-default-500">{errorMessage}</p>
              <Button
                color="primary"
                onPress={() => navigate("/login")}
                className="mt-4"
              >
                Back to Login
              </Button>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

