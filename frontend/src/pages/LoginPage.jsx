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
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { authAPI } from "../services/api";
import { supabase } from "../services/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await authAPI.login(email, password);
      
      localStorage.setItem("access_token", response.data.session.access_token);
      localStorage.setItem("user", JSON.stringify(response.data.user));
      
      await supabase.auth.setSession({
        access_token: response.data.session.access_token,
        refresh_token: response.data.session.refresh_token,
      });
      
      navigate("/dashboard", { 
        state: { 
          loginSuccess: true, 
          message: `Welcome back, ${response.data.user.email}!` 
        } 
      });
    } catch (err) {
      const errorData = err.response?.data?.error;
      let errorMessage = "Login failed. Please try again.";
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
          <h1 className="text-2xl font-bold">Welcome Back</h1>
          <p className="text-default-500">Log in to your account</p>
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
            
            <Input
              label="Password"
              placeholder="Enter your password"
              value={password}
              onValueChange={setPassword}
              variant="bordered"
              isRequired
              isDisabled={isLoading}
              type={isVisible ? "text" : "password"}
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
            
            <div className="flex justify-between items-center">
              <Checkbox 
                size="sm" 
                isSelected={rememberMe}
                onValueChange={setRememberMe}
              >
                Remember me
              </Checkbox>
              <Link to="/reset-password" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>
            
            <Button
              type="submit"
              color="primary"
              size="lg"
              isLoading={isLoading}
              isDisabled={isLoading}
              className="font-semibold"
            >
              {isLoading ? "Logging in..." : "Log In"}
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
            Don't have an account?{" "}
            <Link to="/signup" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </CardBody>
      </Card>
    </div>
  );
}

