import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardBody,
  Button,
  Chip,
  Slider,
  Select,
  SelectItem,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Divider,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import VideoProcessor from "../components/VideoProcessor";
import NebulaShader from "../components/NebulaShader";

const BLEND_MODES = [
  { key: "normal", label: "Normal" },
  { key: "screen", label: "Screen (Glow)" },
  { key: "multiply", label: "Multiply (Dark)" },
  { key: "overlay", label: "Overlay" },
  { key: "soft-light", label: "Soft Light" },
  { key: "hard-light", label: "Hard Light" },
  { key: "color-dodge", label: "Color Dodge" },
  { key: "lighten", label: "Lighten" },
  { key: "darken", label: "Darken" },
  { key: "difference", label: "Difference" },
  { key: "exclusion", label: "Exclusion" },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [blendMode, setBlendMode] = useState("screen");
  const [opacity, setOpacity] = useState(0.8);
  const [frostBlur, setFrostBlur] = useState(8);
  const [frostOpacity, setFrostOpacity] = useState(0.3);
  const [animateBlur, setAnimateBlur] = useState(true);
  const [animatedBlur, setAnimatedBlur] = useState(8);

  // Animated blur effect
  useEffect(() => {
    if (!animateBlur) return;
    
    let animationFrame;
    let currentBlur = animatedBlur;
    let targetBlur = Math.random() * 30;
    const speed = 0.02; // How fast it transitions (lower = slower)
    
    const animate = () => {
      // Smoothly interpolate towards target
      currentBlur += (targetBlur - currentBlur) * speed;
      setAnimatedBlur(currentBlur);
      
      // Pick new random target when close to current target
      if (Math.abs(targetBlur - currentBlur) < 0.5) {
        targetBlur = Math.random() * 30;
      }
      
      animationFrame = requestAnimationFrame(animate);
    };
    
    animationFrame = requestAnimationFrame(animate);
    
    return () => cancelAnimationFrame(animationFrame);
  }, [animateBlur]);

  const steps = [
    { icon: "solar:link-bold", title: "Paste URL", desc: "Drop YouTube or Instagram video link" },
    { icon: "solar:cpu-bolt-bold", title: "AI Process", desc: "Transcribe & analyze with AI" },
    { icon: "solar:chart-bold", title: "Get Results", desc: "Review in 2-3 minutes" },
  ];

  const features = [
    { icon: "solar:target-bold", title: "Accurate Transcription", desc: "95%+ accuracy with Whisper AI" },
    { icon: "solar:brain-bold", title: "AI-Powered Analysis", desc: "Summaries + fact-checking" },
    { icon: "solar:bolt-bold", title: "Lightning Fast", desc: "2-3 minutes per video" },
    { icon: "solar:link-bold", title: "URL Processing", desc: "Just paste link, no downloads" },
    { icon: "solar:smartphone-bold", title: "Multi-Platform", desc: "YouTube + Instagram" },
    { icon: "solar:shield-check-bold", title: "Secure", desc: "No data stored" },
  ];

  const pricingPreview = [
    { name: "Free", price: "$0", minutes: "60 min" },
    { name: "Starter", price: "$12", minutes: "300 min", popular: true },
    { name: "Pro", price: "$29", minutes: "1000 min" },
    { name: "Business", price: "$79", minutes: "3500 min" },
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden min-h-[90vh]">
        {/* Nebula shader - covers entire hero section */}
        <NebulaShader blendMode={blendMode} opacity={opacity} />
        
        {/* Frosted glass overlay */}
        <div 
          className="absolute inset-0 pointer-events-none transition-all duration-300"
          style={{
            backdropFilter: `blur(${animateBlur ? animatedBlur : frostBlur}px)`,
            WebkitBackdropFilter: `blur(${animateBlur ? animatedBlur : frostBlur}px)`,
            backgroundColor: `rgba(7, 2, 13, ${frostOpacity})`,
          }}
        />
        
        {/* Shader Controls - Fixed position */}
        <Popover placement="bottom-start" backdrop="blur">
          <PopoverTrigger>
            <Button
              isIconOnly
              variant="flat"
              className="fixed top-20 left-4 z-50 bg-white/10 backdrop-blur-xl border border-white/20 shadow-lg"
              aria-label="Shader settings"
            >
              <Icon icon="solar:settings-bold" width={20} />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4 bg-black/40 backdrop-blur-xl border border-white/10 shadow-2xl">
            <div className="space-y-4">
              <h4 className="font-semibold text-sm">Shader Controls</h4>
              
              <div className="space-y-2">
                <label className="text-xs text-default-500">Blend Mode</label>
                <Select
                  size="sm"
                  selectedKeys={[blendMode]}
                  onSelectionChange={(keys) => setBlendMode(Array.from(keys)[0])}
                  aria-label="Blend mode"
                >
                  {BLEND_MODES.map((mode) => (
                    <SelectItem key={mode.key}>{mode.label}</SelectItem>
                  ))}
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs text-default-500">Shader Opacity: {Math.round(opacity * 100)}%</label>
                <Slider
                  size="sm"
                  step={0.05}
                  minValue={0}
                  maxValue={1}
                  value={opacity}
                  onChange={setOpacity}
                  aria-label="Shader Opacity"
                  classNames={{
                    track: "bg-default-200",
                    filler: "bg-secondary",
                  }}
                />
              </div>
              
              <Divider className="my-2" />
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm">Frost Glass</h4>
                <Button
                  size="sm"
                  variant={animateBlur ? "solid" : "flat"}
                  color={animateBlur ? "secondary" : "default"}
                  onPress={() => setAnimateBlur(!animateBlur)}
                  startContent={<Icon icon={animateBlur ? "solar:play-bold" : "solar:pause-bold"} width={14} />}
                >
                  {animateBlur ? "Animating" : "Static"}
                </Button>
              </div>
              
              {animateBlur && (
                <div className="text-xs text-default-400 bg-secondary/10 rounded-lg p-2">
                  <Icon icon="solar:magic-stick-3-bold" width={14} className="inline mr-1 text-secondary" />
                  Blur is smoothly animating: <code className="text-secondary">{animatedBlur.toFixed(1)}px</code>
                </div>
              )}
              
              {!animateBlur && (
                <div className="space-y-2">
                  <label className="text-xs text-default-500">Blur: {frostBlur}px</label>
                  <Slider
                    size="sm"
                    step={1}
                    minValue={0}
                    maxValue={30}
                    value={frostBlur}
                    onChange={setFrostBlur}
                    aria-label="Frost Blur"
                    classNames={{
                      track: "bg-default-200",
                      filler: "bg-primary",
                    }}
                  />
                </div>
              )}
              
              <div className="space-y-2">
                <label className="text-xs text-default-500">Frost Opacity: {Math.round(frostOpacity * 100)}%</label>
                <Slider
                  size="sm"
                  step={0.05}
                  minValue={0}
                  maxValue={0.8}
                  value={frostOpacity}
                  onChange={setFrostOpacity}
                  aria-label="Frost Opacity"
                  classNames={{
                    track: "bg-default-200",
                    filler: "bg-primary",
                  }}
                />
              </div>
              
              <div className="pt-2 border-t border-default-200">
                <p className="text-xs text-default-400">
                  Shader: <code className="text-secondary">{blendMode}</code> @ <code className="text-secondary">{Math.round(opacity * 100)}%</code>
                </p>
                <p className="text-xs text-default-400">
                  Frost: <code className="text-primary">{animateBlur ? `~${animatedBlur.toFixed(0)}px` : `${frostBlur}px`}</code> blur @ <code className="text-primary">{Math.round(frostOpacity * 100)}%</code>
                  {animateBlur && <span className="text-secondary ml-1">✨</span>}
                </p>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        
        {/* Content on top */}
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-6">
          <Chip color="primary" variant="flat" size="lg" startContent={<Icon icon="solar:star-bold" width={16} />}>
            Try FREE - No Signup Required
          </Chip>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Transcribe & Fact-Check
            <br />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Videos with AI
            </span>
          </h1>
          
          <p className="text-xl text-default-600 max-w-2xl mx-auto">
            Stop spreading misinformation. Analyze any YouTube video in seconds with our AI-powered fact-checker.
          </p>
          
          <div className="pt-6">
            <VideoProcessor />
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 text-default-500">
            <span className="flex items-center gap-2">
              <Icon icon="solar:star-bold" className="text-warning" width={18} />
              4.8/5 from 1,200+ users
            </span>
            <span className="flex items-center gap-2">
              <Icon icon="solar:chart-bold" className="text-primary" width={18} />
              12,000+ videos analyzed
            </span>
            <span className="flex items-center gap-2">
              <Icon icon="solar:lock-bold" className="text-success" width={18} />
              No credit card required
            </span>
          </div>
          
          <p className="text-default-500 text-sm">
            🎁 <strong>Try it now!</strong> Paste a YouTube URL above and see results in 2-3 minutes.
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-default-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            How It Works - Simple & Fast
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <Card key={index} className="text-center">
                <CardBody className="gap-4 items-center py-8">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon icon={step.icon} className="text-primary" width={32} />
                  </div>
                  <h3 className="text-xl font-semibold">{index + 1}. {step.title}</h3>
                  <p className="text-default-500">{step.desc}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12">
            What Makes Us Different
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardBody className="gap-3">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                    <Icon icon={feature.icon} className="text-white" width={24} />
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="text-default-500">{feature.desc}</p>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="py-20 px-4 bg-default-50">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-12">
            Pricing That Scales With You
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {pricingPreview.map((plan) => (
              <Card 
                key={plan.name} 
                className={plan.popular ? "border-2 border-primary shadow-lg" : ""}
              >
                <CardBody className="text-center py-6">
                  {plan.popular && (
                    <Chip color="primary" size="sm" className="mb-2">Most Popular</Chip>
                  )}
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  <p className="text-2xl font-bold">{plan.price}<span className="text-sm font-normal text-default-500">/mo</span></p>
                  <p className="text-default-500 text-sm">{plan.minutes}</p>
                </CardBody>
              </Card>
            ))}
          </div>
          <Button
            color="primary"
            size="lg"
            onPress={() => navigate("/pricing")}
            endContent={<Icon icon="solar:arrow-right-linear" width={18} />}
          >
            View All Plans & Features
          </Button>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary to-secondary text-white">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold">Ready to Get Started?</h2>
          <p className="text-xl opacity-90">
            Start analyzing videos in minutes - no credit card required
          </p>
          <Button
            size="lg"
            color="default"
            className="bg-white text-primary font-semibold"
            onPress={() => navigate("/signup")}
            endContent={<Icon icon="solar:arrow-right-linear" width={18} />}
          >
            Get Started Free
          </Button>
          <p className="text-sm opacity-80">60 minutes free • No credit card</p>
        </div>
      </section>
    </div>
  );
}

