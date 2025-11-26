import React, { useState } from "react";
import {
  Card,
  Button,
  Chip,
  Tooltip,
  Link,
  cn,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { ResponsiveContainer, RadialBarChart, RadialBar, Cell, PolarAngleAxis } from "recharts";
import { videoAPI } from "../services/api";

// Fact Score Ring Chart Component (HeroUI Pro Style)
function FactScoreRing({ score, verdict }) {
  const maxScore = 10;
  
  const getScoreColor = (s) => {
    if (s >= 8) return "success";
    if (s >= 6) return "warning";
    if (s >= 4) return "warning";
    return "danger";
  };

  const color = getScoreColor(score);
  
  const chartData = [
    { name: "Fact Score", value: score, fill: `hsl(var(--heroui-${color}))` },
  ];

  return (
    <Card className="dark:border-default-100 h-[250px] border border-transparent">
      <div className="flex flex-col gap-y-2 p-4 pb-0">
        <div className="flex items-center justify-between gap-x-2">
          <dt>
            <h3 className="text-small text-default-500 font-medium">Fact Score</h3>
          </dt>
          <Chip size="sm" color={color} variant="flat">
            {verdict || (score >= 8 ? "Highly Reliable" : score >= 6 ? "Mostly Accurate" : score >= 4 ? "Mixed" : "Unreliable")}
          </Chip>
        </div>
      </div>
      <div className="flex h-full gap-x-3">
        <ResponsiveContainer
          className="[&_.recharts-surface]:outline-hidden"
          height="100%"
          width="100%"
        >
          <RadialBarChart
            barSize={12}
            cx="50%"
            cy="50%"
            data={chartData}
            endAngle={-45}
            innerRadius={90}
            outerRadius={70}
            startAngle={225}
          >
            <PolarAngleAxis angleAxisId={0} domain={[0, maxScore]} tick={false} type="number" />
            <RadialBar
              angleAxisId={0}
              animationDuration={1000}
              animationEasing="ease"
              background={{
                fill: "hsl(var(--heroui-default-100))",
              }}
              cornerRadius={12}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={`hsl(var(--heroui-${color}))`}
                />
              ))}
            </RadialBar>
            <g>
              <text textAnchor="middle" x="50%" y="48%">
                <tspan className="fill-default-500 text-tiny" dy="-0.5em" x="50%">
                  Reliability
                </tspan>
                <tspan className="fill-foreground text-3xl font-bold" dy="1.5em" x="50%">
                  {score}/{maxScore}
                </tspan>
              </text>
            </g>
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// Claims Stats Card (HeroUI Pro Style)
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

  const total = stats.reduce((sum, stat) => sum + stat.count, 0);

  return (
    <Card className="dark:border-default-100 h-[250px] border border-transparent">
      <div className="flex flex-col gap-y-2 p-4 pb-0">
        <div className="flex items-center justify-between gap-x-2">
          <dt>
            <h3 className="text-small text-default-500 font-medium">Claims Breakdown</h3>
          </dt>
          <Chip size="sm" variant="flat">
            {total} total
          </Chip>
        </div>
      </div>
      <div className="flex flex-col justify-center h-full p-4 gap-3">
        {stats.map((stat) => (
          <div
            key={stat.title}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full"
                style={{ backgroundColor: `hsl(var(--heroui-${stat.color}-100))` }}
              >
                <Icon 
                  icon={stat.icon} 
                  width={16} 
                  style={{ color: `hsl(var(--heroui-${stat.color}))` }}
                />
              </div>
              <span className="text-small text-default-600">{stat.title}</span>
            </div>
            <span className="text-medium font-semibold text-foreground">{stat.count}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

// Summary Card (HeroUI Pro Style)
function SummaryCard({ summary }) {
  if (!summary) return null;
  
  // Format summary text - handle numbered sections and bullet points
  const formatSummary = (text) => {
    // Split by numbered sections (1. 2. 3. etc) or newlines
    const sections = text.split(/(?=\d+\.\s+[A-Z])|(?:\n\s*\n)/);
    
    return sections.map((section, idx) => {
      const trimmed = section.trim();
      if (!trimmed) return null;
      
      // Check if this is a numbered section header
      const headerMatch = trimmed.match(/^(\d+)\.\s+([^:]+):(.*)/s);
      
      if (headerMatch) {
        const [, num, title, content] = headerMatch;
        // Split content by bullet points
        const bullets = content.split(/\s*-\s+/).filter(b => b.trim());
        
        return (
          <div key={idx} className="mb-4">
            <h4 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">
                {num}
              </span>
              {title.trim()}
            </h4>
            {bullets.length > 1 ? (
              <ul className="space-y-1 ml-8">
                {bullets.map((bullet, bIdx) => (
                  <li key={bIdx} className="text-default-600 text-small flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{bullet.trim()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-default-600 text-small ml-8">{content.trim()}</p>
            )}
          </div>
        );
      }
      
      // Regular paragraph - check for bullet points
      const hasBullets = trimmed.includes(' - ');
      if (hasBullets) {
        const parts = trimmed.split(/\s*-\s+/).filter(p => p.trim());
        return (
          <ul key={idx} className="space-y-1 mb-3">
            {parts.map((part, pIdx) => (
              <li key={pIdx} className="text-default-600 text-small flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>{part.trim()}</span>
              </li>
            ))}
          </ul>
        );
      }
      
      return (
        <p key={idx} className="text-default-600 leading-relaxed text-small mb-3">
          {trimmed}
        </p>
      );
    });
  };
  
  return (
    <Card className="dark:border-default-100 border border-transparent">
      <div className="flex flex-col gap-y-2 p-4 pb-0">
        <div className="flex items-center gap-2">
          <Icon icon="solar:document-text-bold" className="text-primary" width={20} />
          <h3 className="text-small text-default-500 font-medium">Summary</h3>
        </div>
      </div>
      <div className="p-4">
        {formatSummary(summary)}
      </div>
    </Card>
  );
}

// Single Claim Card (Expandable with Actions)
function ClaimCard({ claim, type, onRecheck, videoId }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRechecking, setIsRechecking] = useState(false);
  const [recheckResult, setRecheckResult] = useState(null);
  const [copied, setCopied] = useState(false);
  const [errorReported, setErrorReported] = useState(false);
  const [showThumbsUp, setShowThumbsUp] = useState(false);
  
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
  const hasDetails = claim.explanation || (claim.sources && claim.sources.length > 0) || claim.logical_fallacies;

  const handleCopy = async () => {
    try {
      // Copy full claim details
      const copyText = `📋 CLAIM:
"${claim.claim}"

🏷️ VERDICT: ${config.label}
${claim.confidence ? `📊 CONFIDENCE: ${claim.confidence}` : ''}
${claim.timestamp ? `⏱️ TIMESTAMP: ${claim.timestamp}` : ''}

📝 ANALYSIS:
${claim.explanation || 'No explanation available'}

${claim.sources && claim.sources.length > 0 ? `🔗 SOURCES:\n${claim.sources.map(s => `• ${s}`).join('\n')}` : ''}
${claim.logical_fallacies && claim.logical_fallacies.length > 0 ? `\n🧠 LOGICAL ANALYSIS:\n${claim.logical_fallacies.map(f => `• ${f}`).join('\n')}` : ''}`;
      
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleRecheck = async () => {
    console.log('🔄 Recheck clicked! videoId:', videoId);
    
    // Start loading animation immediately
    setIsRechecking(true);
    setIsExpanded(true);
    
    if (!videoId) {
      console.log('⚠️ No videoId - simulating recheck');
      // Simulate a delay so user sees the animation even without videoId
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIsRechecking(false);
      alert('Re-check requires a saved video. Please sign in and process a video first.');
      return;
    }
    
    try {
      const response = await videoAPI.recheckClaim(videoId, {
        claim: claim.claim,
        timestamp: claim.timestamp,
        original_verdict: type
      });
      console.log('🔄 Recheck response:', response.data);
      // API returns { success: true, result: {...} }
      setRecheckResult(response.data.result || response.data);
    } catch (err) {
      console.error('Recheck failed:', err);
      let errorMessage = 'Failed to re-check claim. ';
      if (err.response?.data?.error) {
        errorMessage += err.response.data.error;
      } else if (err.message) {
        errorMessage += err.message;
      }
      alert(errorMessage);
    } finally {
      setIsRechecking(false);
    }
  };

  const handleReportError = async () => {
    if (errorReported) return;
    
    try {
      await videoAPI.reportClaimError({
        video_id: videoId || 'anonymous',
        claim_text: claim.claim,
        claim_verdict: claim.verdict || config.label,
        reason: 'User reported as incorrect',
      });
      
      setShowThumbsUp(true);
      setErrorReported(true);
      setTimeout(() => setShowThumbsUp(false), 2000);
    } catch (error) {
      console.error('Error reporting claim:', error);
    }
  };

  // Get verdict color for recheck comparison
  const getVerdictColor = (verdict) => {
    const v = verdict?.toLowerCase();
    if (v === 'verified' || v === 'true') return 'success';
    if (v === 'false') return 'danger';
    if (v === 'uncertain') return 'warning';
    if (v === 'opinion') return 'secondary';
    return 'default';
  };

  return (
    <div className={cn("rounded-xl border p-4 transition-all relative", config.bg, config.border)}>
      {/* Thumbs-up animation overlay */}
      {showThumbsUp && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl z-10">
          <div className="text-center">
            <div className="text-4xl animate-bounce">👍</div>
            <p className="text-sm text-white font-medium mt-2">Thanks for the feedback!</p>
          </div>
        </div>
      )}
      
      {/* Header - Always visible */}
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
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center flex-wrap gap-2">
              <Chip size="sm" color={config.color} variant="flat">
                {config.label}
              </Chip>
              {claim.confidence && (
                <Chip size="sm" variant="bordered" className="text-xs">
                  {claim.confidence}
                </Chip>
              )}
              {claim.timestamp && (
                <span className="text-xs text-default-400">
                  @ {claim.timestamp}
                </span>
              )}
            </div>
            {/* Action buttons */}
            <div className="flex items-center gap-1">
              <Tooltip content={copied ? "Copied!" : "Copy claim details"}>
                <Button
                  isIconOnly
                  size="sm"
                  variant="light"
                  className="min-w-7 w-7 h-7"
                  onPress={handleCopy}
                  aria-label="Copy claim"
                >
                  <Icon 
                    icon={copied ? "solar:check-circle-bold" : "solar:copy-linear"} 
                    width={16}
                    className={copied ? "text-success" : ""}
                  />
                </Button>
              </Tooltip>
              <Tooltip content={isRechecking ? "Re-checking with AI..." : "Re-check this claim with deeper analysis"}>
                <Button
                  isIconOnly
                  size="sm"
                  variant={isRechecking ? "solid" : "light"}
                  color={isRechecking ? "primary" : "default"}
                  className={cn(
                    "min-w-7 w-7 h-7 transition-all duration-300",
                    isRechecking && "scale-110"
                  )}
                  onPress={handleRecheck}
                  isDisabled={isRechecking}
                  aria-label="Re-check claim"
                >
                  {isRechecking ? (
                    <Icon 
                      icon="solar:refresh-bold" 
                      width={16} 
                      className="animate-spin"
                    />
                  ) : (
                    <Icon 
                      icon="solar:refresh-linear" 
                      width={16}
                    />
                  )}
                </Button>
              </Tooltip>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                className="min-w-7 w-7 h-7"
                onPress={() => setIsExpanded(!isExpanded)}
                aria-label={isExpanded ? "Collapse" : "Expand"}
              >
                <Icon 
                  icon={isExpanded ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"} 
                  width={16} 
                />
              </Button>
            </div>
          </div>
          
          <p 
            className="font-medium text-default-800 cursor-pointer italic"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            "{claim.claim}"
          </p>
          
          {/* Show sources inline (collapsed) - show full URLs */}
          {!isExpanded && claim.sources && claim.sources.length > 0 && (
            <div className="mt-2 space-y-1">
              {claim.sources.slice(0, 2).map((source, idx) => (
                <div key={idx}>
                  {source.startsWith('http') ? (
                    <Link
                      href={source}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="sm"
                      className="text-xs break-all"
                      showAnchorIcon
                      onClick={(e) => e.stopPropagation()}
                    >
                      {source}
                    </Link>
                  ) : (
                    <span className="text-xs text-default-500">{source}</span>
                  )}
                </div>
              ))}
              {claim.sources.length > 2 && (
                <span className="text-xs text-default-400">
                  +{claim.sources.length - 2} more sources...
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expandable Details */}
      {isExpanded && (
        <div className="mt-4 pl-11 space-y-4 border-t border-default-200 pt-4">
          {/* Re-checking in progress indicator */}
          {isRechecking && (
            <div className="flex items-center gap-3 p-4 bg-primary-500/10 rounded-lg border border-primary-200 animate-pulse">
              <div className="relative">
                <Icon icon="solar:refresh-bold" width={24} className="text-primary animate-spin" />
              </div>
              <div>
                <p className="text-sm font-medium text-primary">Re-analyzing claim with AI...</p>
                <p className="text-xs text-default-500">This may take a few seconds</p>
              </div>
            </div>
          )}
          
          {/* Analysis/Explanation - gradient from top to bottom */}
          {claim.explanation && (
            <div 
              className="p-4 rounded-lg"
              style={{
                background: type === "verified" 
                  ? 'linear-gradient(180deg, rgba(23, 201, 100, 0.25) 0%, rgba(23, 201, 100, 0.08) 50%, rgba(23, 201, 100, 0) 100%)'
                  : type === "false"
                  ? 'linear-gradient(180deg, rgba(243, 18, 96, 0.25) 0%, rgba(243, 18, 96, 0.08) 50%, rgba(243, 18, 96, 0) 100%)'
                  : type === "uncertain"
                  ? 'linear-gradient(180deg, rgba(245, 165, 36, 0.25) 0%, rgba(245, 165, 36, 0.08) 50%, rgba(245, 165, 36, 0) 100%)'
                  : 'linear-gradient(180deg, rgba(126, 34, 206, 0.25) 0%, rgba(126, 34, 206, 0.08) 50%, rgba(126, 34, 206, 0) 100%)',
                borderTop: type === "verified" 
                  ? '3px solid rgb(23, 201, 100)'
                  : type === "false"
                  ? '3px solid rgb(243, 18, 96)'
                  : type === "uncertain"
                  ? '3px solid rgb(245, 165, 36)'
                  : '3px solid rgb(126, 34, 206)',
              }}
            >
              <h5 className={cn(
                "text-xs font-semibold uppercase mb-2 flex items-center gap-1",
                {
                  "text-success-700 dark:text-success-400": type === "verified",
                  "text-danger-700 dark:text-danger-400": type === "false",
                  "text-warning-700 dark:text-warning-400": type === "uncertain",
                  "text-secondary-700 dark:text-secondary-400": type === "opinion",
                }
              )}>
                <Icon icon="solar:document-text-linear" width={14} />
                ANALYSIS:
              </h5>
              <p className="text-sm text-foreground leading-relaxed">
                {claim.explanation}
              </p>
            </div>
          )}
          
          {/* Confidence Badge */}
          {claim.confidence && (
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-xs font-semibold",
                {
                  "text-success-700": type === "verified",
                  "text-danger-700": type === "false",
                  "text-warning-700": type === "uncertain",
                  "text-secondary-700": type === "opinion",
                }
              )}>Confidence:</span>
              <Chip 
                size="sm" 
                variant="flat"
                color={config.color}
              >
                {claim.confidence}
              </Chip>
            </div>
          )}
          
          {/* Sources - Full URLs with colored background matching claim type */}
          {claim.sources && claim.sources.length > 0 && (
            <div className={cn(
              "p-4 rounded-lg border-l-4",
              {
                "bg-success-50/50 border-success-500": type === "verified",
                "bg-danger-50/50 border-danger-500": type === "false",
                "bg-warning-50/50 border-warning-500": type === "uncertain",
                "bg-secondary-50/50 border-secondary-500": type === "opinion",
              }
            )}>
              <h5 className={cn(
                "text-xs font-semibold uppercase mb-3 flex items-center gap-1",
                {
                  "text-success-700": type === "verified",
                  "text-danger-700": type === "false",
                  "text-warning-700": type === "uncertain",
                  "text-secondary-700": type === "opinion",
                }
              )}>
                <Icon icon="solar:link-bold" width={14} />
                SOURCES:
              </h5>
              <ul className="space-y-2 list-none ml-1">
                {claim.sources.map((source, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className={cn(
                      "mt-1.5 text-lg leading-none",
                      {
                        "text-success-600": type === "verified",
                        "text-danger-600": type === "false",
                        "text-warning-600": type === "uncertain",
                        "text-secondary-600": type === "opinion",
                      }
                    )}>•</span>
                    {source.startsWith('http') ? (
                      <Link
                        href={source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm break-all text-primary hover:underline"
                        isExternal
                        showAnchorIcon
                      >
                        {source}
                      </Link>
                    ) : (
                      <span className="text-sm text-default-700">{source}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Logical Fallacies */}
          {claim.logical_fallacies && claim.logical_fallacies.length > 0 && (
            <div className="bg-default-50 p-3 rounded-lg">
              <h5 className="text-xs font-semibold text-default-500 uppercase mb-2 flex items-center gap-1">
                <Icon icon="solar:brain-linear" width={14} />
                Logical Analysis
              </h5>
              <ul className="space-y-1">
                {claim.logical_fallacies.map((fallacy, idx) => {
                  const isNone = fallacy.toLowerCase() === 'none detected' || fallacy.toLowerCase() === 'sound reasoning';
                  return (
                    <li key={idx} className="flex items-center gap-2 text-sm">
                      <Icon 
                        icon={isNone ? "solar:check-circle-bold" : "solar:danger-triangle-bold"} 
                        width={16}
                        className={isNone ? "text-success" : "text-warning"}
                      />
                      <span className={isNone ? "text-success-700" : "text-warning-700"}>
                        {fallacy}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          
          {/* Re-check Results - Styled like original */}
          {recheckResult && (
            <div className="border-l-4 border-primary rounded-lg overflow-hidden">
              {/* Header */}
              <div className="bg-default-100 p-4 flex items-center justify-between">
                <h5 className="text-sm font-semibold text-primary flex items-center gap-2">
                  <Icon icon="solar:magnifer-zoom-in-bold" width={18} />
                  Deep Re-check Results:
                </h5>
                {recheckResult.changed && (
                  <Chip color="warning" size="sm" variant="solid">
                    ⚠️ Verdict Changed!
                  </Chip>
                )}
              </div>
              
              {/* Comparison Table */}
              <div className="bg-default-50 p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left py-2 px-3 text-default-500 font-medium w-1/4"></th>
                      <th className="text-center py-2 px-3 text-default-500 font-medium uppercase tracking-wider">Original</th>
                      <th className="text-center py-2 px-3 text-default-400 w-12"></th>
                      <th className="text-center py-2 px-3 text-default-500 font-medium uppercase tracking-wider">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="py-3 px-3 text-default-600 font-medium">Verdict:</td>
                      <td className="py-3 px-3 text-center">
                        <Chip size="sm" color={config.color} variant="flat">
                          {config.label.toUpperCase()}
                        </Chip>
                      </td>
                      <td className="py-3 px-3 text-center text-default-400">→</td>
                      <td className="py-3 px-3 text-center">
                        <Chip 
                          size="sm" 
                          color={getVerdictColor(recheckResult.verdict)} 
                          variant="flat"
                        >
                          {(recheckResult.verdict || config.label).toUpperCase()} {recheckResult.changed ? '⚠️' : '✓'}
                        </Chip>
                      </td>
                    </tr>
                    <tr>
                      <td className="py-3 px-3 text-default-600 font-medium">Confidence:</td>
                      <td className="py-3 px-3 text-center">
                        <Chip size="sm" color={config.color} variant="flat">
                          {claim.confidence || 'Medium'}
                        </Chip>
                      </td>
                      <td className="py-3 px-3 text-center text-default-400">→</td>
                      <td className="py-3 px-3 text-center">
                        <Chip size="sm" color={getVerdictColor(recheckResult.verdict)} variant="flat">
                          {recheckResult.confidence || 'Medium'} {!recheckResult.changed ? '✓' : ''}
                        </Chip>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              
              {/* Updated Analysis */}
              {recheckResult.explanation && (
                <div className="bg-warning-50/50 p-4 border-t border-default-200">
                  <h6 className="text-xs font-semibold text-warning-700 uppercase mb-2">
                    Updated Analysis:
                  </h6>
                  <p className="text-sm text-default-700 leading-relaxed">{recheckResult.explanation}</p>
                </div>
              )}
              
              {/* Correction Notes */}
              {recheckResult.correction_notes && (
                <div className="bg-warning-50/50 p-4 border-t border-default-200">
                  <h6 className="text-xs font-semibold text-warning-700 uppercase mb-2">
                    Corrections Made:
                  </h6>
                  <p className="text-sm text-default-700 leading-relaxed">{recheckResult.correction_notes}</p>
                </div>
              )}
              
              {/* Additional Sources from Recheck */}
              {recheckResult.sources && recheckResult.sources.length > 0 && (
                <div className="bg-warning-50/50 p-4 border-t border-default-200">
                  <h6 className="text-xs font-semibold text-warning-700 uppercase mb-2">
                    Additional Sources:
                  </h6>
                  <ul className="space-y-2 ml-1">
                    {recheckResult.sources.map((source, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-warning-600 mt-1">•</span>
                        <Link
                          href={source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary break-all hover:underline"
                          isExternal
                          showAnchorIcon
                        >
                          {source}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          {/* Report Error Button */}
          <div className="flex justify-end pt-2">
            <Button
              size="sm"
              variant="light"
              color={errorReported ? "success" : "default"}
              onPress={handleReportError}
              isDisabled={errorReported}
              startContent={
                <Icon 
                  icon={errorReported ? "solar:check-circle-bold" : "solar:flag-linear"} 
                  width={14} 
                />
              }
              className="text-xs"
            >
              {errorReported ? 'Reported' : 'Report as incorrect'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Claims List Section
function ClaimsList({ title, claims, type, icon, onRecheck, videoId }) {
  if (!claims || claims.length === 0) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-md font-semibold flex items-center gap-2 text-default-700">
        <Icon icon={icon} width={18} />
        {title} ({claims.length})
      </h4>
      <div className="space-y-3">
        {claims.map((claim, index) => (
          <ClaimCard 
            key={index} 
            claim={claim} 
            type={type} 
            onRecheck={onRecheck}
            videoId={videoId}
          />
        ))}
      </div>
    </div>
  );
}

// Bias Analysis Section
function BiasAnalysisCard({ bias, redFlags }) {
  if (!bias) return null;
  
  // Use redFlags prop or fallback to bias.red_flags
  const flags = redFlags || bias.red_flags;

  const getBiasColor = (level) => {
    const l = level?.toLowerCase();
    if (l === 'low' || l === 'minimal') return 'success';
    if (l === 'moderate') return 'warning';
    if (l === 'high' || l === 'significant') return 'danger';
    return 'default';
  };

  const getSliderPosition = (score, min = -10, max = 10) => {
    // Normalize to 0-100%
    return ((score - min) / (max - min)) * 100;
  };

  return (
    <Card className="dark:border-default-100 border border-transparent">
      <div className="flex flex-col gap-y-2 p-4 pb-0">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Icon icon="solar:chart-2-bold" className="text-primary" width={20} />
            <h3 className="text-small text-default-500 font-medium">Bias Analysis</h3>
          </div>
          {bias.overall_bias && (
            <Chip color={getBiasColor(bias.overall_bias)} variant="flat" size="sm">
              {bias.overall_bias}
            </Chip>
          )}
        </div>
      </div>
      <div className="p-4 space-y-6">
        {/* Political Lean */}
        {bias.political_lean !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Political Lean</span>
              <Chip size="sm" variant="flat">
                {bias.political_lean_label || (bias.political_lean > 0 ? 'Right' : bias.political_lean < 0 ? 'Left' : 'Neutral')}
              </Chip>
            </div>
            <div className="relative h-2 rounded-full bg-gradient-to-r from-blue-500 via-gray-300 to-red-500">
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary rounded-full shadow"
                style={{ left: `calc(${getSliderPosition(bias.political_lean)}% - 8px)` }}
              />
            </div>
            <div className="flex justify-between text-xs text-default-400">
              <span>Left</span>
              <span>Neutral</span>
              <span>Right</span>
            </div>
          </div>
        )}

        {/* Emotional Tone */}
        {bias.emotional_tone !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Emotional Tone</span>
              <Chip size="sm" variant="flat" color={bias.emotional_tone > 6 ? 'warning' : 'default'}>
                {bias.emotional_tone_label || (bias.emotional_tone > 6 ? 'Highly Emotional' : bias.emotional_tone > 3 ? 'Moderate' : 'Factual')}
              </Chip>
            </div>
            <div className="relative h-2 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500">
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary rounded-full shadow"
                style={{ left: `calc(${(bias.emotional_tone / 10) * 100}% - 8px)` }}
              />
            </div>
            <div className="flex justify-between text-xs text-default-400">
              <span>Factual</span>
              <span>Moderate</span>
              <span>Emotional</span>
            </div>
          </div>
        )}

        {/* Source Quality */}
        {bias.source_quality !== undefined && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Source Quality</span>
              <Chip size="sm" variant="flat" color={getBiasColor(bias.source_quality > 6 ? 'low' : bias.source_quality > 3 ? 'moderate' : 'high')}>
                {bias.source_quality_label || (bias.source_quality > 6 ? 'Authoritative' : bias.source_quality > 3 ? 'Mixed' : 'Poor')}
              </Chip>
            </div>
            <div className="relative h-2 rounded-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500">
              <div 
                className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-primary rounded-full shadow"
                style={{ left: `calc(${(bias.source_quality / 10) * 100}% - 8px)` }}
              />
            </div>
            <div className="flex justify-between text-xs text-default-400">
              <span>No Sources</span>
              <span>Mixed</span>
              <span>Authoritative</span>
            </div>
          </div>
        )}

        {/* Red Flags */}
        {flags && flags.length > 0 && (
          <div 
            className="p-4 rounded-lg"
            style={{
              background: 'linear-gradient(180deg, rgba(243, 18, 96, 0.2) 0%, rgba(243, 18, 96, 0.05) 50%, rgba(243, 18, 96, 0) 100%)',
              borderTop: '3px solid rgb(243, 18, 96)',
            }}
          >
            <h4 className="text-sm font-semibold text-danger flex items-center gap-2 mb-3">
              <Icon icon="solar:flag-bold" width={18} />
              Red Flags Detected
            </h4>
            <ul className="space-y-2">
              {flags.map((flag, idx) => (
                <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                  <span className="text-danger mt-0.5">•</span>
                  {flag}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

// Transcript Section
function TranscriptCard({ transcript, highlightedTranscript }) {
  const [showFull, setShowFull] = useState(false);
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [showHighlights, setShowHighlights] = useState(true);
  const [visibleTypes, setVisibleTypes] = useState({
    verified: true,
    false: true,
    uncertain: true,
    opinion: true,
  });
  const displayText = highlightedTranscript || transcript;
  
  // Toggle a specific highlight type
  const toggleHighlightType = (type) => {
    setVisibleTypes(prev => ({ ...prev, [type]: !prev[type] }));
  };
  
  // Strip highlight tags from text
  const stripHighlightTags = (text) => {
    if (!text) return text;
    return text.replace(/\[(VERIFIED|FALSE|UNCERTAIN|OPINION|\/VERIFIED|\/FALSE|\/UNCERTAIN|\/OPINION)\]/g, '');
  };
  
  if (!displayText) return null;

  // Extract timestamp from text (formats: [00:00], (00:00), 0:00, 00:00:00)
  const extractTimestamp = (text) => {
    const timestampMatch = text.match(/^[\[\(]?(\d{1,2}:\d{2}(?::\d{2})?)[\]\)]?\s*/);
    if (timestampMatch) {
      return {
        timestamp: timestampMatch[1],
        text: text.slice(timestampMatch[0].length)
      };
    }
    return { timestamp: null, text };
  };

  // Format seconds to MM:SS or HH:MM:SS
  const formatTimestamp = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Track highlight state across paragraphs
  const getActiveHighlight = (text) => {
    // Count opens and closes to find current state
    const opens = {
      VERIFIED: (text.match(/\[VERIFIED\]/g) || []).length,
      FALSE: (text.match(/\[FALSE\]/g) || []).length,
      UNCERTAIN: (text.match(/\[UNCERTAIN\]/g) || []).length,
      OPINION: (text.match(/\[OPINION\]/g) || []).length,
    };
    const closes = {
      VERIFIED: (text.match(/\[\/VERIFIED\]/g) || []).length,
      FALSE: (text.match(/\[\/FALSE\]/g) || []).length,
      UNCERTAIN: (text.match(/\[\/UNCERTAIN\]/g) || []).length,
      OPINION: (text.match(/\[\/OPINION\]/g) || []).length,
    };
    
    for (const type of ['VERIFIED', 'FALSE', 'UNCERTAIN', 'OPINION']) {
      if (opens[type] > closes[type]) return type;
    }
    return null;
  };

  // Split text into paragraphs with timestamps, preserving highlights
  const splitIntoParagraphs = (text) => {
    if (!text) return [];
    
    // Check if text has line-by-line timestamps (common in transcripts)
    const lines = text.split('\n').filter(l => l.trim());
    const hasLineTimestamps = lines.some(line => /^[\[\(]?\d{1,2}:\d{2}/.test(line.trim()));
    
    let paragraphs = [];
    
    if (hasLineTimestamps) {
      // Group lines by timestamps, creating paragraphs every few timestamped lines
      let currentParagraph = { timestamp: null, lines: [] };
      let lineCount = 0;
      
      lines.forEach((line) => {
        const { timestamp, text: lineText } = extractTimestamp(line.trim());
        
        if (timestamp && currentParagraph.lines.length === 0) {
          currentParagraph.timestamp = timestamp;
        }
        
        if (lineText) {
          currentParagraph.lines.push(lineText);
          lineCount++;
        }
        
        // Create new paragraph every 4-5 lines or at natural breaks
        if (lineCount >= 5 || (lineCount >= 3 && /[.!?]$/.test(lineText))) {
          if (currentParagraph.lines.length > 0) {
            paragraphs.push({
              timestamp: currentParagraph.timestamp,
              text: currentParagraph.lines.join(' ')
            });
          }
          currentParagraph = { timestamp: timestamp, lines: [] };
          lineCount = 0;
        }
      });
      
      // Add remaining lines
      if (currentParagraph.lines.length > 0) {
        paragraphs.push({
          timestamp: currentParagraph.timestamp,
          text: currentParagraph.lines.join(' ')
        });
      }
    } else if (text.includes('\n\n')) {
      // Has paragraph breaks already
      paragraphs = text.split(/\n\n+/).filter(p => p.trim()).map((p, idx) => ({
        timestamp: formatTimestamp(idx * 30),
        text: p
      }));
    } else {
      // Split by sentences and group into paragraphs
      const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z\[])/);
      let currentParagraph = [];
      let paragraphIdx = 0;
      
      sentences.forEach((sentence, idx) => {
        currentParagraph.push(sentence);
        
        // Create a new paragraph every 3-4 sentences
        const shouldBreak = 
          currentParagraph.length >= 4 ||
          (currentParagraph.length >= 2 && sentence.endsWith('?')) ||
          (currentParagraph.length >= 3 && /[.!]$/.test(sentence));
        
        if (shouldBreak || idx === sentences.length - 1) {
          paragraphs.push({
            timestamp: formatTimestamp(paragraphIdx * 30),
            text: currentParagraph.join(' ')
          });
          currentParagraph = [];
          paragraphIdx++;
        }
      });
    }
    
    // Now fix highlights that span across paragraphs
    // We need to ensure each paragraph has balanced tags
    let activeHighlight = null;
    
    paragraphs = paragraphs.map((para) => {
      let fixedText = para.text;
      
      // If we're inside a highlight from previous paragraph, add opening tag
      if (activeHighlight) {
        fixedText = `[${activeHighlight}]` + fixedText;
      }
      
      // Check what highlight state we're in after this paragraph
      const newActiveHighlight = getActiveHighlight(fixedText);
      
      // If we're still in a highlight at end of paragraph, close it
      if (newActiveHighlight) {
        fixedText = fixedText + `[/${newActiveHighlight}]`;
      }
      
      activeHighlight = newActiveHighlight;
      
      return { ...para, text: fixedText };
    });
    
    return paragraphs.filter(p => p.text.trim());
  };

  // Parse highlighted text within a paragraph to render with colors
  const renderHighlightedText = (text) => {
    if (!text) return null;
    
    // Split by highlight tags
    const parts = text.split(/(\[VERIFIED\]|\[FALSE\]|\[UNCERTAIN\]|\[OPINION\]|\[\/VERIFIED\]|\[\/FALSE\]|\[\/UNCERTAIN\]|\[\/OPINION\])/);
    
    let currentType = null;
    return parts.map((part, idx) => {
      if (part === '[VERIFIED]') { currentType = 'verified'; return null; }
      if (part === '[FALSE]') { currentType = 'false'; return null; }
      if (part === '[UNCERTAIN]') { currentType = 'uncertain'; return null; }
      if (part === '[OPINION]') { currentType = 'opinion'; return null; }
      if (part.startsWith('[/')) { currentType = null; return null; }
      
      if (currentType) {
        // Skip empty or whitespace-only highlighted sections
        if (!part || !part.trim()) {
          return null;
        }
        
        // If this type is toggled off, render as plain text
        if (!visibleTypes[currentType]) {
          return <span key={idx}>{part}</span>;
        }
        
        // Gradient styles for each type - rounded line at start, fades only at the end
        const gradientStyles = {
          verified: {
            background: 'linear-gradient(90deg, rgba(23, 201, 100, 0.35) 0%, rgba(23, 201, 100, 0.35) 75%, rgba(23, 201, 100, 0) 100%)',
            borderLeft: '3px solid rgb(23, 201, 100)',
            borderRadius: '6px',
          },
          false: {
            background: 'linear-gradient(90deg, rgba(243, 18, 96, 0.35) 0%, rgba(243, 18, 96, 0.35) 75%, rgba(243, 18, 96, 0) 100%)',
            borderLeft: '3px solid rgb(243, 18, 96)',
            borderRadius: '6px',
          },
          uncertain: {
            background: 'linear-gradient(90deg, rgba(245, 165, 36, 0.35) 0%, rgba(245, 165, 36, 0.35) 75%, rgba(245, 165, 36, 0) 100%)',
            borderLeft: '3px solid rgb(245, 165, 36)',
            borderRadius: '6px',
          },
          opinion: {
            background: 'linear-gradient(90deg, rgba(126, 34, 206, 0.35) 0%, rgba(126, 34, 206, 0.35) 75%, rgba(126, 34, 206, 0) 100%)',
            borderLeft: '3px solid rgb(126, 34, 206)',
            borderRadius: '6px',
          },
        };
        
        const textColors = {
          verified: 'text-success',
          false: 'text-danger',
          uncertain: 'text-warning',
          opinion: 'text-secondary',
        };
        
        return (
          <mark 
            key={idx} 
            className={`${textColors[currentType]} pl-2 pr-2 py-1 inline`}
            style={gradientStyles[currentType]}
          >
            {part}
          </mark>
        );
      }
      // Skip empty non-highlighted parts too
      if (!part) return null;
      return <span key={idx}>{part}</span>;
    });
  };

  const paragraphs = splitIntoParagraphs(displayText);
  const previewParagraphs = 2; // Show first 2 paragraphs in preview
  const needsTruncate = paragraphs.length > previewParagraphs;
  const displayParagraphs = showFull ? paragraphs : paragraphs.slice(0, previewParagraphs);

  return (
    <Card className="dark:border-default-100 border border-transparent">
      <div className="flex flex-col gap-y-2 p-4 pb-0">
        <div className="flex items-center justify-between w-full flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Icon icon="solar:document-text-bold" className="text-primary" width={20} />
            <h3 className="text-small text-default-500 font-medium">Transcript</h3>
            <Chip size="sm" variant="flat">
              {paragraphs.length} paragraphs
            </Chip>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Timestamp Toggle */}
            <Button
              size="sm"
              variant={showTimestamps ? "flat" : "light"}
              color={showTimestamps ? "primary" : "default"}
              onPress={() => setShowTimestamps(!showTimestamps)}
              startContent={<Icon icon="solar:clock-circle-linear" width={14} />}
            >
              Timestamps {showTimestamps ? 'ON' : 'OFF'}
            </Button>
            {/* Highlights Toggle */}
            {highlightedTranscript && (
              <Button
                size="sm"
                variant={showHighlights ? "flat" : "light"}
                color={showHighlights ? "secondary" : "default"}
                onPress={() => setShowHighlights(!showHighlights)}
                startContent={<Icon icon="solar:highlighter-linear" width={14} />}
              >
                Highlights {showHighlights ? 'ON' : 'OFF'}
              </Button>
            )}
            {/* Legend - only show when highlights are on */}
            {showHighlights && highlightedTranscript && (
              <>
                <Chip 
                  size="sm" 
                  variant={visibleTypes.verified ? "flat" : "bordered"}
                  className={`cursor-pointer transition-opacity ${!visibleTypes.verified && 'opacity-50'}`}
                  onClick={() => toggleHighlightType('verified')}
                  startContent={<span className={`w-2 h-2 rounded-full ${visibleTypes.verified ? 'bg-success' : 'bg-default-300'}`} />}
                >
                  Verified {visibleTypes.verified ? '✓' : ''}
                </Chip>
                <Chip 
                  size="sm" 
                  variant={visibleTypes.false ? "flat" : "bordered"}
                  className={`cursor-pointer transition-opacity ${!visibleTypes.false && 'opacity-50'}`}
                  onClick={() => toggleHighlightType('false')}
                  startContent={<span className={`w-2 h-2 rounded-full ${visibleTypes.false ? 'bg-danger' : 'bg-default-300'}`} />}
                >
                  False {visibleTypes.false ? '✓' : ''}
                </Chip>
                <Chip 
                  size="sm" 
                  variant={visibleTypes.uncertain ? "flat" : "bordered"}
                  className={`cursor-pointer transition-opacity ${!visibleTypes.uncertain && 'opacity-50'}`}
                  onClick={() => toggleHighlightType('uncertain')}
                  startContent={<span className={`w-2 h-2 rounded-full ${visibleTypes.uncertain ? 'bg-warning' : 'bg-default-300'}`} />}
                >
                  Uncertain {visibleTypes.uncertain ? '✓' : ''}
                </Chip>
                <Chip 
                  size="sm" 
                  variant={visibleTypes.opinion ? "flat" : "bordered"}
                  className={`cursor-pointer transition-opacity ${!visibleTypes.opinion && 'opacity-50'}`}
                  onClick={() => toggleHighlightType('opinion')}
                  startContent={<span className={`w-2 h-2 rounded-full ${visibleTypes.opinion ? 'bg-secondary' : 'bg-default-300'}`} />}
                >
                  Opinion {visibleTypes.opinion ? '✓' : ''}
                </Chip>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="p-4 space-y-4">
        {displayParagraphs.map((paragraph, idx) => (
          <div key={idx} className="flex gap-3">
            {/* Timestamp column */}
            {showTimestamps && paragraph.timestamp && (
              <div className="flex-shrink-0 w-16">
                <Chip 
                  size="sm" 
                  variant="flat" 
                  color="primary"
                  className="font-mono text-xs"
                >
                  {paragraph.timestamp}
                </Chip>
              </div>
            )}
            {/* Text content */}
            <p className="text-small text-default-600 leading-relaxed flex-1">
              {highlightedTranscript && showHighlights 
                ? renderHighlightedText(paragraph.text) 
                : stripHighlightTags(paragraph.text)}
            </p>
          </div>
        ))}
        {needsTruncate && !showFull && (
          <p className="text-default-400 text-sm pl-19">
            ... {paragraphs.length - previewParagraphs} more paragraphs
          </p>
        )}
        {needsTruncate && (
          <Button
            variant="light"
            size="sm"
            onPress={() => setShowFull(!showFull)}
            startContent={<Icon icon={showFull ? "solar:alt-arrow-up-linear" : "solar:alt-arrow-down-linear"} width={16} />}
          >
            {showFull ? 'Show Less' : `Show All ${paragraphs.length} Paragraphs`}
          </Button>
        )}
      </div>
    </Card>
  );
}

// Main Component
export default function AnalysisResults({ 
  analysis, 
  onRecheck, 
  videoId,
  transcript,
  highlightedTranscript 
}) {
  if (!analysis) return null;

  // Handle string analysis - could be plain text summary or JSON string
  let data;
  if (typeof analysis === "string") {
    console.log("AnalysisResults received STRING, length:", analysis.length, "starts with:", analysis.substring(0, 50));
    try {
      data = JSON.parse(analysis);
      console.log("✅ JSON.parse succeeded, fact_score:", data.fact_score);
    } catch (e) {
      console.error("❌ JSON.parse failed:", e.message);
      // Try to find JSON object in the string
      const startIdx = analysis.indexOf('{');
      const endIdx = analysis.lastIndexOf('}');
      if (startIdx !== -1 && endIdx > startIdx) {
        try {
          const jsonStr = analysis.substring(startIdx, endIdx + 1);
          data = JSON.parse(jsonStr);
          console.log("✅ Extracted JSON parse succeeded, fact_score:", data.fact_score);
        } catch (e2) {
          console.error("❌ Extracted JSON parse also failed:", e2.message);
          data = { summary: analysis };
        }
      } else {
        data = { summary: analysis };
      }
    }
  } else if (typeof analysis === "object" && analysis !== null) {
    console.log("AnalysisResults received OBJECT, fact_score:", analysis.fact_score);
    data = analysis;
  } else {
    console.log("AnalysisResults received unexpected type:", typeof analysis);
    data = { summary: String(analysis) };
  }
  
  // Debug log
  console.log("AnalysisResults final data:", { 
    hasFactScore: data?.fact_score !== undefined,
    factScore: data?.fact_score,
    hasSummary: !!data?.summary,
    summaryType: typeof data?.summary,
    keys: Object.keys(data || {})
  });

  const hasFactCheck = data.fact_score !== undefined;
  const hasSummary = data.summary;
  const hasClaims =
    data.verified_claims?.length ||
    data.false_claims?.length ||
    data.uncertain_claims?.length ||
    data.opinion_claims?.length ||
    data.opinion_based_claims?.length;
  const hasBias = data.bias_analysis || data.bias;
  const hasTranscript = transcript || highlightedTranscript || data.transcript || data.full_transcript_with_highlights || data.highlighted_transcript;

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
        <Card className="dark:border-default-100 border border-transparent">
          <div className="flex flex-col gap-y-2 p-4 pb-0">
            <div className="flex items-center gap-2">
              <Icon icon="solar:clipboard-check-bold" className="text-primary" width={20} />
              <h3 className="text-small text-default-500 font-medium">Detailed Claims Analysis</h3>
            </div>
          </div>
          <div className="p-4 space-y-6">
            <ClaimsList
              title="Verified Claims"
              claims={data.verified_claims}
              type="verified"
              icon="solar:verified-check-bold"
              onRecheck={onRecheck}
              videoId={videoId}
            />
            
            <ClaimsList
              title="False Claims"
              claims={data.false_claims}
              type="false"
              icon="solar:close-circle-bold"
              onRecheck={onRecheck}
              videoId={videoId}
            />
            
            <ClaimsList
              title="Uncertain Claims"
              claims={data.uncertain_claims}
              type="uncertain"
              icon="solar:question-circle-bold"
              onRecheck={onRecheck}
              videoId={videoId}
            />
            
            <ClaimsList
              title="Opinion-Based Statements"
              claims={[
                ...(data.opinion_claims || []),
                ...(data.opinion_based_claims || []),
              ]}
              type="opinion"
              icon="solar:chat-round-dots-bold"
              onRecheck={onRecheck}
              videoId={videoId}
            />
          </div>
        </Card>
      )}

      {/* Bias Analysis */}
      {hasBias && (
        <BiasAnalysisCard 
          bias={data.bias_analysis || data.bias} 
          redFlags={data.red_flags || (data.bias_analysis || data.bias)?.red_flags}
        />
      )}

      {/* Transcript */}
      {hasTranscript && (
        <TranscriptCard 
          transcript={transcript || data.transcript}
          highlightedTranscript={highlightedTranscript || data.full_transcript_with_highlights || data.highlighted_transcript}
        />
      )}
    </div>
  );
}

