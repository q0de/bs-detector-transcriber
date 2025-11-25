import React, { useState } from "react";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Chip,
  Divider,
  Progress,
  Accordion,
  AccordionItem,
  Tooltip,
  Link,
  cn,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { ResponsiveContainer, PieChart, Pie, Cell, Label } from "recharts";

// Fact Score Ring Chart Component
function FactScoreRing({ score, verdict }) {
  const maxScore = 10;
  const percentage = (score / maxScore) * 100;
  
  const getScoreColor = (s) => {
    if (s >= 8) return "success";
    if (s >= 6) return "warning";
    if (s >= 4) return "warning";
    return "danger";
  };

  const color = getScoreColor(score);
  
  const chartData = [
    { name: "Score", value: score },
    { name: "Remaining", value: maxScore - score },
  ];

  const colorMap = {
    success: ["hsl(var(--heroui-success-500))", "hsl(var(--heroui-success-100))"],
    warning: ["hsl(var(--heroui-warning-500))", "hsl(var(--heroui-warning-100))"],
    danger: ["hsl(var(--heroui-danger-500))", "hsl(var(--heroui-danger-100))"],
  };

  return (
    <Card className="border border-default-200">
      <CardBody className="flex flex-col items-center gap-4 p-6">
        <h3 className="text-lg font-semibold text-default-700">Fact Score</h3>
        <div className="relative w-40 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="70%"
                outerRadius="90%"
                startAngle={90}
                endAngle={-270}
                dataKey="value"
                strokeWidth={0}
              >
                <Cell fill={colorMap[color][0]} />
                <Cell fill={colorMap[color][1]} />
                <Label
                  content={({ viewBox }) => {
                    if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                      return (
                        <text
                          x={viewBox.cx}
                          y={viewBox.cy}
                          textAnchor="middle"
                          dominantBaseline="middle"
                        >
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy - 8}
                            className="fill-foreground text-3xl font-bold"
                          >
                            {score}
                          </tspan>
                          <tspan
                            x={viewBox.cx}
                            y={viewBox.cy + 16}
                            className="fill-default-500 text-sm"
                          >
                            / {maxScore}
                          </tspan>
                        </text>
                      );
                    }
                    return null;
                  }}
                />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <Chip
          color={color}
          variant="flat"
          size="lg"
          className="font-semibold"
        >
          {verdict}
        </Chip>
      </CardBody>
    </Card>
  );
}

// Claims Stats Card
function ClaimsStatsCard({ analysis }) {
  const stats = [
    {
      title: "Verified",
      count: analysis.verified_claims?.length || 0,
      icon: "solar:verified-check-bold",
      color: "success",
    },
    {
      title: "False",
      count: analysis.false_claims?.length || 0,
      icon: "solar:close-circle-bold",
      color: "danger",
    },
    {
      title: "Uncertain",
      count: analysis.uncertain_claims?.length || 0,
      icon: "solar:question-circle-bold",
      color: "warning",
    },
    {
      title: "Opinion",
      count: (analysis.opinion_claims?.length || 0) + (analysis.opinion_based_claims?.length || 0),
      icon: "solar:chat-round-dots-bold",
      color: "secondary",
    },
  ];

  return (
    <Card className="border border-default-200">
      <CardBody className="p-4">
        <h3 className="text-lg font-semibold text-default-700 mb-4">Claims Breakdown</h3>
        <div className="grid grid-cols-2 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.title}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl",
                {
                  "bg-success-50": stat.color === "success",
                  "bg-danger-50": stat.color === "danger",
                  "bg-warning-50": stat.color === "warning",
                  "bg-secondary-50": stat.color === "secondary",
                }
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  {
                    "bg-success-100 text-success": stat.color === "success",
                    "bg-danger-100 text-danger": stat.color === "danger",
                    "bg-warning-100 text-warning": stat.color === "warning",
                    "bg-secondary-100 text-secondary": stat.color === "secondary",
                  }
                )}
              >
                <Icon icon={stat.icon} width={20} />
              </div>
              <div>
                <p className="text-2xl font-bold text-default-700">{stat.count}</p>
                <p className="text-xs text-default-500">{stat.title}</p>
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

// Summary Card
function SummaryCard({ summary }) {
  if (!summary) return null;
  
  return (
    <Card className="border border-default-200">
      <CardHeader className="pb-0">
        <div className="flex items-center gap-2">
          <Icon icon="solar:document-text-bold" className="text-primary" width={20} />
          <h3 className="text-lg font-semibold">Summary</h3>
        </div>
      </CardHeader>
      <CardBody>
        <p className="text-default-600 leading-relaxed">{summary}</p>
      </CardBody>
    </Card>
  );
}

// Single Claim Card
function ClaimCard({ claim, type }) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const typeConfig = {
    verified: {
      color: "success",
      icon: "solar:verified-check-bold",
      label: "Verified",
      bg: "bg-success-50/50",
      border: "border-success-200",
    },
    false: {
      color: "danger",
      icon: "solar:close-circle-bold",
      label: "False",
      bg: "bg-danger-50/50",
      border: "border-danger-200",
    },
    uncertain: {
      color: "warning",
      icon: "solar:question-circle-bold",
      label: "Uncertain",
      bg: "bg-warning-50/50",
      border: "border-warning-200",
    },
    opinion: {
      color: "secondary",
      icon: "solar:chat-round-dots-bold",
      label: "Opinion",
      bg: "bg-secondary-50/50",
      border: "border-secondary-200",
    },
  };

  const config = typeConfig[type] || typeConfig.uncertain;

  return (
    <div className={cn("rounded-xl border p-4", config.bg, config.border)}>
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full mt-0.5",
            `bg-${config.color}-100 text-${config.color}`
          )}
        >
          <Icon icon={config.icon} width={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Chip size="sm" color={config.color} variant="flat">
              {config.label}
            </Chip>
            {claim.confidence && (
              <Chip size="sm" variant="bordered" className="text-xs">
                {claim.confidence} confidence
              </Chip>
            )}
            {claim.timestamp && (
              <span className="text-xs text-default-400">
                @ {claim.timestamp}
              </span>
            )}
          </div>
          
          <p className="font-medium text-default-800 mb-2">
            "{claim.claim}"
          </p>
          
          {claim.explanation && (
            <p className="text-sm text-default-600 mb-2">
              {claim.explanation}
            </p>
          )}
          
          {claim.sources && claim.sources.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-xs text-default-500">Sources:</span>
              {claim.sources.map((source, idx) => (
                <Link
                  key={idx}
                  href={source}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="sm"
                  className="text-xs"
                  showAnchorIcon
                >
                  {new URL(source).hostname.replace('www.', '')}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Claims List Section
function ClaimsList({ title, claims, type, icon }) {
  if (!claims || claims.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-md font-semibold flex items-center gap-2 text-default-700">
        <Icon icon={icon} width={18} />
        {title} ({claims.length})
      </h4>
      <div className="space-y-3">
        {claims.map((claim, index) => (
          <ClaimCard key={index} claim={claim} type={type} />
        ))}
      </div>
    </div>
  );
}

// Main Component
export default function AnalysisResults({ analysis }) {
  if (!analysis) return null;

  // Handle string analysis (shouldn't happen but just in case)
  const data = typeof analysis === "string" ? JSON.parse(analysis) : analysis;

  const hasFactCheck = data.fact_score !== undefined;
  const hasSummary = data.summary;
  const hasClaims =
    data.verified_claims?.length ||
    data.false_claims?.length ||
    data.uncertain_claims?.length ||
    data.opinion_claims?.length ||
    data.opinion_based_claims?.length;

  // If it's just a simple summary (no fact-checking)
  if (!hasFactCheck && !hasClaims && hasSummary) {
    return <SummaryCard summary={data.summary} />;
  }

  // Full fact-check display
  return (
    <div className="space-y-6">
      {/* Top Row: Score + Stats */}
      {hasFactCheck && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FactScoreRing
            score={data.fact_score}
            verdict={data.overall_verdict}
          />
          <ClaimsStatsCard analysis={data} />
        </div>
      )}

      {/* Summary */}
      {hasSummary && <SummaryCard summary={data.summary} />}

      {/* Claims Sections */}
      {hasClaims && (
        <Card className="border border-default-200">
          <CardHeader className="pb-0">
            <div className="flex items-center gap-2">
              <Icon icon="solar:clipboard-check-bold" className="text-primary" width={20} />
              <h3 className="text-lg font-semibold">Detailed Claims Analysis</h3>
            </div>
          </CardHeader>
          <CardBody className="space-y-6">
            <ClaimsList
              title="Verified Claims"
              claims={data.verified_claims}
              type="verified"
              icon="solar:verified-check-bold"
            />
            
            <ClaimsList
              title="False Claims"
              claims={data.false_claims}
              type="false"
              icon="solar:close-circle-bold"
            />
            
            <ClaimsList
              title="Uncertain Claims"
              claims={data.uncertain_claims}
              type="uncertain"
              icon="solar:question-circle-bold"
            />
            
            <ClaimsList
              title="Opinion-Based Statements"
              claims={[
                ...(data.opinion_claims || []),
                ...(data.opinion_based_claims || []),
              ]}
              type="opinion"
              icon="solar:chat-round-dots-bold"
            />
          </CardBody>
        </Card>
      )}
    </div>
  );
}

