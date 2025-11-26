import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardBody,
  Input,
  Button,
  Checkbox,
  Divider,
  Progress,
  Chip,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { authAPI } from "../services/api";
import { supabase } from "../services/supabase";

export default function SignUpPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { strength: 0, label: "", color: "default" };
    if (pwd.length < 8) return { strength: 25, label: "Weak", color: "danger" };
    if (pwd.length < 12) return { strength: 60, label: "Medium", color: "warning" };
    return { strength: 100, label: "Strong", color: "success" };
  };

  const passwordStrength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    if (!agreeToTerms) {
      setError("Please agree to the Terms & Privacy Policy");
      return;
    }

    setIsLoading(true);

    try {
      await authAPI.signup(email, password);
      
      const loginResponse = await authAPI.login(email, password);
      localStorage.setItem("access_token", loginResponse.data.access_token);
      
      await supabase.auth.setSession({
        access_token: loginResponse.data.access_token,
        refresh_token: loginResponse.data.refresh_token || loginResponse.data.access_token
      });
      
      navigate("/dashboard", {
        state: {
          loginSuccess: true,
          message: "🎉 Welcome! You have 60 free minutes to get started.",
          showVerificationReminder: true
        }
      });
    } catch (err) {
      if (err.code === "ECONNREFUSED" || err.message?.includes("Network Error")) {
        setError("Cannot connect to server. Please make sure the backend is running.");
      } else {
        const errorData = err.response?.data?.error || err.response?.data?.message;
        let errorMessage = "Signup failed. Please try again.";
        if (errorData) {
          if (typeof errorData === "string") {
            errorMessage = errorData;
          } else if (typeof errorData === "object" && errorData.message) {
            errorMessage = errorData.message;
          }
        } else if (err.message) {
          errorMessage = err.message;
        }
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) setError(error.message);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-default-100">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-col gap-1 pb-0">
          <h1 className="text-2xl font-bold">Get Started Free</h1>
          <p className="text-default-500">60 minutes free • No credit card</p>
          
          {/* Trust badges */}
          <div className="flex flex-wrap gap-2 mt-3">
            <Chip size="sm" variant="flat" color="warning" startContent={<Icon icon="solar:star-bold" width={14} />}>
              4.8/5 Rating
            </Chip>
            <Chip size="sm" variant="flat" startContent={<Icon icon="solar:users-group-rounded-linear" width={14} />}>
              1,200+ users
            </Chip>
            <Chip size="sm" variant="flat" color="primary" startContent={<Icon icon="solar:video-library-linear" width={14} />}>
              12,000+ videos
            </Chip>
          </div>
        </CardHeader>
        <CardBody className="gap-4">
          {error && (
            <div className="p-3 rounded-lg bg-danger-50 text-danger text-sm flex items-center gap-2">
              <Icon icon="solar:danger-triangle-linear" width={18} />
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onValueChange={setEmail}
              variant="bordered"
              isRequired
              isDisabled={isLoading}
              startContent={
                <Icon icon="solar:letter-linear" className="text-default-400" width={18} />
              }
            />
            
            <div className="flex flex-col gap-2">
              <Input
                label="Password"
                placeholder="Create a password"
                value={password}
                onValueChange={setPassword}
                variant="bordered"
                isRequired
                isDisabled={isLoading}
                type={isVisible ? "text" : "password"}
                description="Must be at least 8 characters"
                endContent={
                  <button 
                    type="button" 
                    onClick={() => setIsVisible(!isVisible)}
                    className="focus:outline-none"
                  >
                    <Icon 
                      icon={isVisible ? "solar:eye-closed-linear" : "solar:eye-linear"} 
                      className="text-default-400"
                      width={18}
                    />
                  </button>
                }
              />
              {password && (
                <div className="flex items-center gap-2">
                  <Progress 
                    size="sm" 
                    value={passwordStrength.strength} 
                    color={passwordStrength.color}
                    className="flex-1"
                  />
                  <span className={`text-xs text-${passwordStrength.color}`}>
                    {passwordStrength.label}
                  </span>
                </div>
              )}
            </div>
            
            <Input
              label="Confirm Password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onValueChange={setConfirmPassword}
              variant="bordered"
              isRequired
              isDisabled={isLoading}
              type={isVisible ? "text" : "password"}
              isInvalid={confirmPassword && password !== confirmPassword}
              errorMessage={confirmPassword && password !== confirmPassword ? "Passwords don't match" : ""}
            />
            
            <Checkbox 
              size="sm" 
              isSelected={agreeToTerms}
              onValueChange={setAgreeToTerms}
            >
              <span className="text-sm">
                I agree to the{" "}
                <Link to="/terms" className="text-primary hover:underline">
                  Terms & Privacy Policy
                </Link>
              </span>
            </Checkbox>
            
            <Button
              type="submit"
              color="primary"
              size="lg"
              isLoading={isLoading}
              isDisabled={isLoading || !agreeToTerms}
              className="font-semibold"
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
          
          <div className="flex items-center gap-4">
            <Divider className="flex-1" />
            <span className="text-default-400 text-sm">or</span>
            <Divider className="flex-1" />
          </div>
          
          <Button
            variant="bordered"
            size="lg"
            startContent={<Icon icon="logos:google-icon" width={18} />}
            onPress={handleGoogleSignIn}
            className="w-full"
          >
            Continue with Google
          </Button>
          
          <p className="text-center text-sm text-default-500">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">
              Log in
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

