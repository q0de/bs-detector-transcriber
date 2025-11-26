import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Chip,
  Divider,
  Image,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import VideoProcessor from "../components/VideoProcessor";
import UsageIndicator from "../components/UsageIndicator";
import ProcessingStatus from "../components/ProcessingStatus";
import AnalysisResults from "../components/AnalysisResults";
import { videoAPI } from "../services/api";

export default function DashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [videoResult, setVideoResult] = useState(() => {
    const result = location.state?.videoResult;
    if (result?.analysis && typeof result.analysis === "string") {
      try {
        result.analysis = JSON.parse(result.analysis);
      } catch (e) {
        console.error("Failed to parse analysis JSON:", e);
      }
    }
    return result || null;
  });
  const [recentVideos, setRecentVideos] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentVideoUrl, setCurrentVideoUrl] = useState("");
  const [currentAnalysisType, setCurrentAnalysisType] = useState("fact-check");
  const [showLoginMessage, setShowLoginMessage] = useState(location.state?.loginSuccess || false);
  const loginMessage = location.state?.message;

  useEffect(() => {
    fetchRecentVideos();

    if (showLoginMessage) {
      const timer = setTimeout(() => setShowLoginMessage(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showLoginMessage]);

  const fetchRecentVideos = async () => {
    try {
      const response = await videoAPI.getHistory({ limit: 5 });
      setRecentVideos(response.data.videos || []);
    } catch (err) {
      console.error("Failed to fetch recent videos:", err);
    }
  };

  const handleVideoProcessed = (result) => {
    if (result.analysis && typeof result.analysis === "string") {
      try {
        result.analysis = JSON.parse(result.analysis);
      } catch (e) {
        console.error("Failed to parse analysis JSON:", e);
      }
    }
    setVideoResult(result);
    fetchRecentVideos();
  };

  const handleProcessingStart = (videoUrl, analysisType = "fact-check") => {
    setVideoResult(null);
    setCurrentVideoUrl(videoUrl || "");
    setCurrentAnalysisType(analysisType);
  };

  const handleDeleteVideo = async (videoId) => {
    if (window.confirm("Delete this video?")) {
      await videoAPI.deleteVideo(videoId);
      fetchRecentVideos();
    }
  };

  const handleRecheckClaim = async (videoId, claimData) => {
    try {
      const response = await videoAPI.recheckClaim(videoId, claimData);
      // Refresh the video result if we're looking at it
      if (videoResult && videoResult.id === videoId) {
        const updatedVideo = await videoAPI.getVideo(videoId);
        setVideoResult(updatedVideo.data);
      }
      return response.data;
    } catch (err) {
      console.error('Failed to recheck claim:', err);
      throw err;
    }
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Welcome back!</h1>
          <UsageIndicator />
        </div>

        {showLoginMessage && loginMessage && (
          <div className="p-4 rounded-lg bg-success-50 text-success flex items-center gap-2">
            <Icon icon="solar:check-circle-bold" width={20} />
            {loginMessage}
          </div>
        )}

        <ProcessingStatus
          isProcessing={isProcessing}
          videoUrl={currentVideoUrl}
          analysisType={currentAnalysisType}
        />

        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Icon icon="solar:play-bold" className="text-primary" width={24} />
              Analyze a Video
            </h2>
          </CardHeader>
          <CardBody>
            <VideoProcessor
              onProcessed={handleVideoProcessed}
              onLoadingChange={setIsProcessing}
              onProcessingStart={handleProcessingStart}
              embedded
            />
          </CardBody>
        </Card>

        {videoResult && (
          <Card className="border-2 border-success/20">
            <CardHeader className="bg-success-50">
              <div className="flex items-center gap-2 text-success">
                <Icon icon="solar:check-circle-bold" width={24} />
                <h2 className="font-semibold">Video Processed Successfully!</h2>
              </div>
            </CardHeader>
            <CardBody className="gap-4">
              <div className="flex items-center gap-2 text-sm text-default-500">
                <Chip size="sm" color="primary" variant="flat">
                  {videoResult.minutes_charged} min used
                </Chip>
                <Chip size="sm" variant="flat">
                  {videoResult.minutes_remaining} min remaining
                </Chip>
              </div>

              {videoResult.metadata && (
                <div className="flex gap-4 p-4 bg-default-50 rounded-xl">
                  {videoResult.metadata.thumbnail && (
                    <div className="relative group">
                      <Image
                        src={videoResult.metadata.thumbnail}
                        alt="Video thumbnail"
                        className="w-32 h-20 object-cover rounded-lg"
                      />
                      <a 
                        href={videoResult.url || videoResult.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Icon icon="solar:play-circle-bold" className="text-white" width={32} />
                      </a>
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold">{videoResult.metadata?.title || videoResult.title}</h3>
                    {videoResult.metadata?.author && (
                      <p className="text-sm text-default-500">
                        <Icon icon="solar:user-linear" width={14} className="inline mr-1" />
                        {videoResult.metadata.author}
                      </p>
                    )}
                    <p className="text-xs text-default-400 mb-2">
                      {videoResult.platform} • {videoResult.duration_minutes?.toFixed(1)} min
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="flat"
                        color="primary"
                        as="a"
                        href={videoResult.url || videoResult.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        startContent={<Icon icon="solar:play-circle-linear" width={16} />}
                      >
                        Watch
                      </Button>
                      <Button
                        size="sm"
                        variant="flat"
                        startContent={<Icon icon="solar:copy-linear" width={16} />}
                        onPress={async () => {
                          try {
                            await navigator.clipboard.writeText(videoResult.url || videoResult.video_url);
                            // Could add toast notification here
                          } catch (err) {
                            console.error('Failed to copy:', err);
                          }
                        }}
                      >
                        Copy URL
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              <Divider />

              <AnalysisResults 
                analysis={videoResult.analysis}
                videoId={videoResult.id}
                onRecheck={handleRecheckClaim}
                transcript={videoResult.transcription}
                highlightedTranscript={videoResult.highlighted_transcript}
              />
            </CardBody>
          </Card>
        )}

        {recentVideos.length > 0 && (
          <Card>
            <CardHeader className="flex justify-between items-center">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Icon icon="solar:history-bold" className="text-secondary" width={24} />
                Recent Videos
              </h2>
              <Button
                variant="light"
                color="primary"
                size="sm"
                endContent={<Icon icon="solar:arrow-right-linear" width={16} />}
                onPress={() => navigate("/history")}
              >
                View All
              </Button>
            </CardHeader>
            <CardBody className="gap-3">
              {recentVideos.map((video) => (
                <div
                  key={video.id}
                  className="flex items-center gap-4 p-3 bg-default-50 rounded-xl hover:bg-default-100 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Icon
                      icon={video.platform === "youtube" ? "lucide:youtube" : "lucide:instagram"}
                      className="text-primary"
                      width={20}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{video.title || "Untitled"}</h3>
                    <p className="text-xs text-default-400">
                      {video.platform} • {video.duration_minutes.toFixed(1)} min •{" "}
                      {video.analysis_type} • {new Date(video.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="flat"
                      color="primary"
                      onPress={() => navigate(`/history#${video.id}`)}
                    >
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      color="danger"
                      isIconOnly
                      aria-label="Delete video"
                      onPress={() => handleDeleteVideo(video.id)}
                    >
                      <Icon icon="solar:trash-bin-trash-linear" width={16} />
                    </Button>
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}

