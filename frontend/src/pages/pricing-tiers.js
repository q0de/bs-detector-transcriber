import { FrequencyEnum, TiersEnum } from "./pricing-types";

export const frequencies = [
  { key: FrequencyEnum.Yearly, label: "Pay Yearly", priceSuffix: "per year" },
  { key: FrequencyEnum.Monthly, label: "Pay Monthly", priceSuffix: "per month" },
];

export const tiers = [
  {
    key: TiersEnum.Free,
    title: "Free",
    price: "Free",
    href: "/signup",
    featured: false,
    mostPopular: false,
    description: "Try TruthLens with limited access. Perfect for casual users.",
    features: [
      "3 videos per month",
      "10 min max per video",
      "Basic fact-check analysis",
      "Transcript export (TXT)",
      "Community support",
    ],
    buttonText: "Get Started Free",
    buttonColor: "default",
    buttonVariant: "flat",
  },
  {
    key: TiersEnum.Starter,
    title: "Starter",
    description: "For content creators and researchers who need regular analysis.",
    href: "#",
    mostPopular: true,
    price: {
      yearly: "$36",
      monthly: "$3.99",
    },
    priceSuffix: "",
    featured: false,
    features: [
      "30 videos per month",
      "30 min max per video",
      "Full fact-check + bias analysis",
      "Highlighted transcript",
      "Export to PDF & JSON",
      "Email support",
    ],
    buttonText: "Start Analyzing",
    buttonColor: "secondary",
    buttonVariant: "solid",
    // Stripe Price IDs - replace with actual IDs
    priceId: {
      monthly: "price_starter_monthly",
      yearly: "price_starter_yearly",
    },
  },
  {
    key: TiersEnum.Pro,
    title: "Pro",
    href: "#",
    featured: true,
    mostPopular: false,
    description: "Unlimited analysis for journalists, researchers & power users.",
    price: {
      yearly: "$48",
      monthly: "$4.99",
    },
    priceSuffix: "",
    features: [
      "Unlimited videos",
      "60 min max per video",
      "Advanced bias detection",
      "Source credibility scores",
      "API access (coming soon)",
      "Priority support",
    ],
    buttonText: "Go Pro",
    buttonColor: "default",
    buttonVariant: "flat",
    // Stripe Price IDs - replace with actual IDs
    priceId: {
      monthly: "price_pro_monthly",
      yearly: "price_pro_yearly",
    },
  },
];
