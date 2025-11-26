import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Chip,
  Input,
  Select,
  SelectItem,
  Pagination,
  Spinner,
} from "@heroui/react";
import { Icon } from "@iconify/react";
import { videoAPI } from "../services/api";

export default function HistoryPage() {
  const navigate = useNavigate();
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const perPage = 10;

  useEffect(() => {
    fetchVideos();
  }, [page, filter]);

  const fetchVideos = async () => {
    setIsLoading(true);
    try {
      const params = {
        limit: perPage,
        offset: (page - 1) * perPage,
      };
      if (filter !== "all") {
        params.analysis_type = filter;
      }

      const response = await videoAPI.getHistory(params);
      setVideos(response.data.videos || []);
      setTotalPages(Math.ceil((response.data.total || 0) / perPage));
    } catch (err) {
      console.error("Failed to fetch videos:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (videoId) => {
    if (window.confirm("Delete this video?")) {
      try {
        await videoAPI.deleteVideo(videoId);
        fetchVideos();
      } catch (err) {
        console.error("Failed to delete video:", err);
      }
    }
  };

  const handleExport = async (videoId, format = "json") => {
    try {
      const response = await videoAPI.exportVideo(videoId, format);
      const blob = new Blob([response.data], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `video-${videoId}.${format}`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export video:", err);
    }
  };

  const filteredVideos = videos.filter((video) =>
    video.title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Icon icon="solar:history-bold" className="text-primary" width={32} />
            Video History
          </h1>
          <Button
            color="primary"
            onPress={() => navigate("/dashboard")}
            startContent={<Icon icon="solar:add-circle-linear" width={18} />}
          >
            Analyze New Video
          </Button>
        </div>

        <Card>
          <CardBody className="flex flex-row gap-4">
            <Input
              placeholder="Search videos..."
              value={search}
              onValueChange={setSearch}
              startContent={<Icon icon="solar:magnifer-linear" className="text-default-400" width={18} />}
              className="flex-1"
              variant="bordered"
            />
            <Select
              selectedKeys={[filter]}
              onSelectionChange={(keys) => setFilter(Array.from(keys)[0])}
              className="w-48"
              variant="bordered"
            >
              <SelectItem key="all">All Types</SelectItem>
              <SelectItem key="summarize">Summarize</SelectItem>
              <SelectItem key="fact-check">Fact Check</SelectItem>
            </Select>
          </CardBody>
        </Card>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" color="primary" />
          </div>
        ) : filteredVideos.length === 0 ? (
          <Card>
            <CardBody className="py-12 text-center">
              <Icon icon="solar:folder-open-linear" className="text-default-300 mx-auto mb-4" width={48} />
              <h3 className="text-lg font-medium text-default-500">No videos found</h3>
              <p className="text-default-400">Start analyzing videos to see them here.</p>
              <Button
                color="primary"
                className="mt-4"
                onPress={() => navigate("/dashboard")}
              >
                Analyze Your First Video
              </Button>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredVideos.map((video) => (
              <Card key={video.id} className="hover:shadow-md transition-shadow">
                <CardBody className="flex flex-row items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon
                      icon={video.platform === "youtube" ? "lucide:youtube" : "lucide:instagram"}
                      className="text-primary"
                      width={24}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{video.title || "Untitled"}</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Chip size="sm" variant="flat">
                        {video.platform}
                      </Chip>
                      <Chip size="sm" variant="flat" color={video.analysis_type === "fact-check" ? "secondary" : "primary"}>
                        {video.analysis_type}
                      </Chip>
                      <span className="text-xs text-default-400">
                        {video.duration_minutes.toFixed(1)} min •{" "}
                        {new Date(video.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      color="primary"
                      variant="flat"
                      onPress={() => navigate(`/dashboard`, { state: { videoResult: video } })}
                    >
                      View
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      onPress={() => handleExport(video.id)}
                      startContent={<Icon icon="solar:download-linear" width={16} />}
                    >
                      Export
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      color="danger"
                      isIconOnly
                      aria-label="Delete video"
                      onPress={() => handleDelete(video.id)}
                    >
                      <Icon icon="solar:trash-bin-trash-linear" width={16} />
                    </Button>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-center">
            <Pagination
              total={totalPages}
              page={page}
              onChange={setPage}
              color="primary"
            />
          </div>
        )}
      </div>
    </div>
  );
}

