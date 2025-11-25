import { useState, useEffect } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Input,
  Chip,
  Divider,
  Image,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { authAPI } from "../services/api";
import AnalysisResults from "../components/AnalysisResults";

export default function FreeTrialResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const videoResult = location.state?.videoResult;

  useEffect(() => {
    if (!videoResult) {
      navigate("/");
    }
  }, [videoResult, navigate]);

  const handleQuickSignup = async (e) => {
    e?.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      await authAPI.signup(signupEmail, signupPassword);
      const loginResponse = await authAPI.login(signupEmail, signupPassword);
      localStorage.setItem("access_token", loginResponse.data.access_token);

      navigate("/dashboard", {
        state: {
          loginSuccess: true,
          message: "Account created! Enjoy your 60 free minutes.",
        },
      });
    } catch (err) {
      const errorData = err.response?.data?.error;
      const errorMessage =
        typeof errorData === "string"
          ? errorData
          : typeof errorData === "object" && errorData.message
          ? errorData.message
          : "Failed to create account";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!videoResult) return null;

  // Parse analysis if it's a string
  let parsedAnalysis = videoResult.analysis;
  if (typeof parsedAnalysis === "string") {
    try {
      parsedAnalysis = JSON.parse(parsedAnalysis);
    } catch (e) {
      // Keep as string if not valid JSON
    }
  }

  // For preview text, use summary if available
  const summaryText = typeof parsedAnalysis === "object" 
    ? parsedAnalysis.summary 
    : parsedAnalysis || "";
  const words = summaryText.split(" ");
  const preview = words.slice(0, 100).join(" ");
  const hasMore = words.length > 100;

  return (
    <div className="min-h-screen py-12 px-4 bg-gradient-to-br from-background to-default-100">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Celebration header */}
        <div className="text-center space-y-4">
          <div className="text-6xl">🎉</div>
          <h1 className="text-3xl font-bold">Your Free Analysis is Ready!</h1>
          <p className="text-default-500 text-lg">Here's what we found in your video</p>
        </div>

        {/* Video info card */}
        {videoResult.metadata && (
          <Card>
            <CardBody className="flex flex-row gap-4 items-center">
              {videoResult.metadata.thumbnail && (
                <Image
                  src={videoResult.metadata.thumbnail}
                  alt="Video thumbnail"
                  className="w-40 h-24 object-cover rounded-lg"
                />
              )}
              <div className="flex-1">
                <h2 className="font-semibold text-lg">
                  {videoResult.title || videoResult.metadata.title || "Video Analysis"}
                </h2>
                {videoResult.metadata.author && (
                  <p className="text-default-500 flex items-center gap-1">
                    <Icon icon="solar:user-linear" width={14} />
                    {videoResult.metadata.author}
                  </p>
                )}
                <p className="text-default-400 text-sm">
                  📹 {videoResult.platform || "YouTube"} • ⏱️ {videoResult.duration_minutes?.toFixed(1)} min
                </p>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Analysis preview */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold flex items-center gap-2">
              <Icon icon="solar:chart-bold" className="text-primary" width={20} />
              Analysis Preview
            </h3>
          </CardHeader>
          <CardBody className="relative overflow-hidden">
            {typeof parsedAnalysis === "object" ? (
              <div className="relative">
                {/* Show partial analysis */}
                <div className="space-y-4">
                  {/* Fact Score Preview */}
                  {parsedAnalysis.fact_score !== undefined && (
                    <div className="flex items-center gap-4 p-4 bg-default-50 rounded-xl">
                      <div className="text-4xl font-bold text-primary">
                        {parsedAnalysis.fact_score}/10
                      </div>
                      <div>
                        <Chip color={parsedAnalysis.fact_score >= 7 ? "success" : parsedAnalysis.fact_score >= 4 ? "warning" : "danger"} variant="flat">
                          {parsedAnalysis.overall_verdict}
                        </Chip>
                      </div>
                    </div>
                  )}
                  
                  {/* Summary Preview */}
                  <div className="text-default-600">
                    <p>{preview}{hasMore && "..."}</p>
                  </div>
                  
                  {/* Claims Count Preview */}
                  <div className="flex flex-wrap gap-2">
                    {parsedAnalysis.verified_claims?.length > 0 && (
                      <Chip color="success" variant="flat" size="sm" startContent={<Icon icon="solar:check-circle-bold" width={14} />}>
                        {parsedAnalysis.verified_claims.length} Verified
                      </Chip>
                    )}
                    {parsedAnalysis.false_claims?.length > 0 && (
                      <Chip color="danger" variant="flat" size="sm" startContent={<Icon icon="solar:close-circle-bold" width={14} />}>
                        {parsedAnalysis.false_claims.length} False
                      </Chip>
                    )}
                    {parsedAnalysis.uncertain_claims?.length > 0 && (
                      <Chip color="warning" variant="flat" size="sm" startContent={<Icon icon="solar:question-circle-bold" width={14} />}>
                        {parsedAnalysis.uncertain_claims.length} Uncertain
                      </Chip>
                    )}
                  </div>
                </div>
                
                {/* Blur overlay */}
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent flex items-end justify-center pb-4">
                  <Chip color="primary" variant="flat" startContent={<Icon icon="solar:lock-linear" width={14} />}>
                    Sign up free to see full details
                  </Chip>
                </div>
              </div>
            ) : (
              <div className="relative">
                <div className="text-default-600 whitespace-pre-wrap">
                  {preview}
                  {hasMore && "..."}
                </div>
                {hasMore && (
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-background to-transparent flex items-end justify-center pb-4">
                    <Chip color="primary" variant="flat" startContent={<Icon icon="solar:lock-linear" width={14} />}>
                      Sign up free to see full analysis
                    </Chip>
                  </div>
                )}
              </div>
            )}
          </CardBody>
        </Card>

        {/* Signup prompt */}
        <Card className="border-2 border-primary/20">
          <CardHeader>
            <div className="text-center w-full">
              <h2 className="text-xl font-bold">💡 Want to unlock more?</h2>
              <p className="text-default-500">Sign up FREE to get:</p>
            </div>
          </CardHeader>
          <CardBody className="gap-6">
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: "solar:check-circle-bold", title: "Fact-Checking", desc: "Verify every claim with sources" },
                { icon: "solar:disk-bold", title: "Save Results", desc: "Access your analyses anytime" },
                { icon: "solar:chart-2-bold", title: "60 Free Minutes", desc: "Analyze more videos each month" },
                { icon: "solar:target-bold", title: "Bias Analysis", desc: "Understand content perspective" },
              ].map((feature, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-default-50 rounded-lg">
                  <Icon icon={feature.icon} className="text-success mt-0.5" width={20} />
                  <div>
                    <p className="font-semibold text-sm">{feature.title}</p>
                    <p className="text-xs text-default-500">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap justify-center gap-2">
              <Chip size="sm" variant="flat" color="warning">⭐ 4.8/5</Chip>
              <Chip size="sm" variant="flat">👥 1,200+ users</Chip>
              <Chip size="sm" variant="flat" color="primary">📊 12,000+ videos</Chip>
            </div>

            <Divider />

            {/* Quick signup form */}
            <form onSubmit={handleQuickSignup} className="space-y-4">
              <h3 className="font-semibold text-center">Get Started in 10 Seconds</h3>

              {error && (
                <div className="p-3 rounded-lg bg-danger-50 text-danger text-sm flex items-center gap-2">
                  <Icon icon="solar:danger-triangle-linear" width={18} />
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <Input
                  type="email"
                  placeholder="Your email"
                  value={signupEmail}
                  onValueChange={setSignupEmail}
                  variant="bordered"
                  isRequired
                  isDisabled={isLoading}
                  className="flex-1"
                />
                <Input
                  type="password"
                  placeholder="Password (8+ chars)"
                  value={signupPassword}
                  onValueChange={setSignupPassword}
                  variant="bordered"
                  isRequired
                  isDisabled={isLoading}
                  className="flex-1"
                />
              </div>

              <Button
                type="submit"
                color="primary"
                size="lg"
                isLoading={isLoading}
                className="w-full font-semibold"
                startContent={!isLoading && <Icon icon="solar:rocket-bold" width={20} />}
              >
                {isLoading ? "Creating Account..." : "Claim 60 Free Minutes"}
              </Button>

              <p className="text-center text-xs text-default-400">
                No credit card • Free forever plan available
              </p>
            </form>

            <div className="text-center space-y-2">
              <p className="text-sm text-default-500">
                Already have an account?{" "}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  Log in
                </Link>
              </p>
              <Button
                variant="light"
                size="sm"
                onPress={() => navigate("/")}
                startContent={<Icon icon="solar:arrow-left-linear" width={16} />}
              >
                Try another video
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

