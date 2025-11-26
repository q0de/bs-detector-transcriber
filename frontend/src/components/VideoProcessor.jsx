import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardBody,
  Input,
  Button,
  Tabs,
  Tab,
  Divider,
  Image,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { videoAPI } from "../services/api";

export default function VideoProcessor({ onProcessed, onLoadingChange, onProcessingStart, embedded = false }) {
  const [inputType, setInputType] = useState("url");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState(null);
  const [analysisType, setAnalysisType] = useState("summarize");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [insufficientCredits, setInsufficientCredits] = useState(null);
  const [videoMetadata, setVideoMetadata] = useState(null);
  const [processingStatus, setProcessingStatus] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (onLoadingChange) {
      onLoadingChange(isLoading);
    }
  }, [isLoading, onLoadingChange]);

  const fetchVideoMetadata = async (videoUrl) => {
    try {
      const videoId = videoUrl.match(/(?:v=|\/)([0-9A-Za-z_-]{11})/)?.[1];
      if (!videoId) return null;

      const response = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
      );
      if (response.ok) {
        const data = await response.json();
        return {
          title: data.title,
          author: data.author_name,
          thumbnail: data.thumbnail_url,
        };
      }
    } catch (err) {
      console.error("Failed to fetch metadata:", err);
    }
    return null;
  };

  const handleUrlChange = async (value) => {
    setUrl(value);
    if (value.includes("youtube.com") || value.includes("youtu.be")) {
      const metadata = await fetchVideoMetadata(value);
      if (metadata) {
        setVideoMetadata(metadata);
      }
    }
  };

  const handleSubmit = async () => {
    if (inputType === "url" && !url) {
      setError("Please enter a video URL");
      return;
    }

    if (inputType === "file" && !file) {
      setError("Please select a video file");
      return;
    }

    if (inputType === "file") {
      setError("File upload is coming soon! Please use URL for now.");
      return;
    }

    const token = localStorage.getItem("access_token");
    const isAnonymous = !token;

    setIsLoading(true);
    setError("");
    setInsufficientCredits(null);
    setProcessingStatus("Fetching video info...");

    const cleanUrl = url.trim();

    if (onProcessingStart) {
      onProcessingStart(cleanUrl, analysisType);
    }

    try {
      if (!videoMetadata) {
        const metadata = await fetchVideoMetadata(cleanUrl);
        if (metadata) {
          setVideoMetadata(metadata);
        }
      }

      setProcessingStatus("Processing video...");

      let response;
      if (isAnonymous) {
        response = await videoAPI.processFree(cleanUrl);
      } else {
        response = await videoAPI.process(cleanUrl, analysisType);
      }

      setProcessingStatus("Analysis complete!");

      const normalizedData = {
        ...response.data,
        id: response.data.video_id || response.data.id,
        metadata: videoMetadata || null,
      };

      if (onProcessed) {
        onProcessed(normalizedData);
      }

      if (!isAnonymous) {
        window.dispatchEvent(new Event("usageUpdated"));
      }

      if (isAnonymous) {
        navigate("/free-trial-result", {
          state: {
            videoResult: normalizedData,
            originalUrl: cleanUrl,
          },
        });
      } else {
        navigate("/dashboard", { state: { videoResult: normalizedData } });
      }
    } catch (err) {
      if (err.response?.status === 403 && err.response?.data?.upgrade_required) {
        setInsufficientCredits({
          used: err.response.data.used,
          limit: err.response.data.limit,
          currentTier: err.response.data.current_tier,
        });
      } else {
        let errorMessage = "Failed to process video. Please try again.";
        const errorData = err.response?.data?.error;
        if (errorData) {
          if (typeof errorData === "string") {
            errorMessage = errorData;
          } else if (typeof errorData === "object" && errorData.message) {
            errorMessage = errorData.message;
          }
        } else if (err.response?.status === 502) {
          errorMessage = "Server is temporarily unavailable. Please try again in a moment.";
        }
        setError(errorMessage);
      }
      setProcessingStatus("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card 
      isBlurred={!embedded}
      shadow={embedded ? "none" : "md"}
      className={`w-full max-w-2xl mx-auto ${embedded ? 'bg-transparent' : 'bg-background/60 dark:bg-default-100/50 p-3'}`}
    >
      <CardBody className="gap-6 p-6">
        {/* Input Type Tabs */}
        <Tabs
          selectedKey={inputType}
          onSelectionChange={setInputType}
          color="primary"
          variant="solid"
          classNames={{
            tabList: "bg-default-100/70",
            cursor: "bg-background dark:bg-default-200/30",
            tab: "px-6 h-10 min-w-[120px] data-[hover-unselected=true]:opacity-90",
            tabContent: "group-data-[selected=true]:text-foreground",
          }}
          radius="full"
        >
          <Tab
            key="url"
            title={
              <div className="flex items-center gap-2">
                <Icon icon="solar:link-linear" width={18} />
                <span>Paste Link</span>
              </div>
            }
          />
          <Tab
            key="file"
            title={
              <div className="flex items-center gap-2">
                <Icon icon="solar:folder-linear" width={18} />
                <span>File Upload</span>
              </div>
            }
          />
        </Tabs>

        {/* URL Input */}
        {inputType === "url" ? (
          <Input
            label="Video URL"
            labelPlacement="outside"
            placeholder="Paste your YouTube or Instagram URL..."
            value={url}
            onValueChange={handleUrlChange}
            isDisabled={isLoading}
            variant="bordered"
            size="lg"
            startContent={
              <Icon icon="solar:link-linear" className="text-default-400 flex-shrink-0" width={20} />
            }
            classNames={{
              base: "gap-2",
              label: "text-default-500 font-medium text-sm pb-1",
              inputWrapper: "h-12 px-4",
              input: "text-base placeholder:text-default-400",
            }}
          />
        ) : (
          <div className="border-2 border-dashed border-default-300 rounded-xl p-8 text-center hover:border-primary transition-colors">
            <Icon icon="solar:upload-linear" className="text-default-400 mx-auto mb-3" width={40} />
            <p className="text-default-500">
              File upload coming soon!<br />
              Please use URL for now.
            </p>
          </div>
        )}

        {/* Video Preview - Clickable to open video */}
        {videoMetadata && (
          <a 
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex gap-4 p-4 rounded-xl transition-all cursor-pointer group bg-background/60 dark:bg-default-100/50 hover:bg-default-100/70"
            title="Click to open video"
          >
            {videoMetadata.thumbnail && (
              <div className="relative">
                <Image
                  src={videoMetadata.thumbnail}
                  alt="Video thumbnail"
                  className="w-32 h-20 object-cover rounded-lg"
                />
                <div className="absolute inset-0 flex items-center justify-center rounded-lg transition-opacity bg-black/40 opacity-0 group-hover:opacity-100">
                  <Icon icon="solar:play-circle-bold" className="text-white" width={32} />
                </div>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium truncate transition-colors group-hover:text-primary">
                {videoMetadata.title}
              </h4>
              <p className="text-sm text-default-500 flex items-center gap-1">
                <Icon icon="solar:user-linear" width={14} />
                {videoMetadata.author}
              </p>
              <p className="text-xs text-default-400 flex items-center gap-1 mt-1">
                <Icon icon="mdi:youtube" width={14} className="text-danger" />
                youtube
                {videoMetadata.duration && ` • ${videoMetadata.duration}`}
              </p>
            </div>
            <div className="flex items-center transition-colors text-default-400 group-hover:text-primary">
              <Icon icon="solar:square-arrow-right-up-linear" width={20} />
            </div>
          </a>
        )}

        <Divider />

        {/* Analysis Type */}
        <div className="space-y-3">
          <p className="text-sm text-default-600 font-medium">Analysis Type:</p>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={analysisType === "summarize" ? "solid" : "flat"}
              color={analysisType === "summarize" ? "primary" : "default"}
              className="h-auto py-4 flex-col bg-background/60 dark:bg-default-100/50"
              onPress={() => setAnalysisType("summarize")}
              isDisabled={isLoading}
            >
              <Icon icon="solar:document-text-linear" width={24} />
              <span className="font-semibold">Summarize</span>
              <span className="text-xs opacity-70">Quick overview • 1× minutes</span>
            </Button>
            <Button
              variant={analysisType === "fact-check" ? "solid" : "flat"}
              color={analysisType === "fact-check" ? "secondary" : "default"}
              className="h-auto py-4 flex-col bg-background/60 dark:bg-default-100/50"
              onPress={() => setAnalysisType("fact-check")}
              isDisabled={isLoading}
            >
              <Icon icon="solar:magnifer-linear" width={24} />
              <span className="font-semibold">Fact Check ⭐</span>
              <span className="text-xs opacity-70">Full BS detection • 2.5× minutes</span>
            </Button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 rounded-lg bg-danger-50 text-danger text-sm flex items-center gap-2">
            <Icon icon="solar:danger-triangle-linear" width={18} />
            {error}
          </div>
        )}

        {/* Insufficient Credits Notice */}
        {insufficientCredits && (
          <Card className="border-warning border-2">
            <CardBody className="gap-3">
              <div className="flex items-center gap-2 text-warning">
                <Icon icon="solar:danger-triangle-linear" width={24} />
                <h4 className="font-semibold">Insufficient Credits</h4>
              </div>
              <p className="text-sm text-default-600">
                You've used <strong>{Math.round(insufficientCredits.used)}</strong> out of{" "}
                <strong>{insufficientCredits.limit}</strong> minutes this month.
              </p>
              <div className="flex gap-2">
                <Button color="primary" onPress={() => navigate("/pricing")}>
                  View Plans & Upgrade
                </Button>
                <Button variant="light" onPress={() => setInsufficientCredits(null)}>
                  Dismiss
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Submit Button */}
        <Button
          color="primary"
          size="lg"
          onPress={handleSubmit}
          isLoading={isLoading}
          isDisabled={isLoading || (inputType === "url" && !url) || (inputType === "file" && !file)}
          startContent={!isLoading && <Icon icon="solar:play-bold" width={20} />}
          className="font-semibold"
        >
          {isLoading ? "Processing..." : "Analyze Video - Free →"}
        </Button>
      </CardBody>
    </Card>
  );
}

