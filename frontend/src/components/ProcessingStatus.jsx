import {
  Card,
  CardBody,
  Progress,
  Chip,
} from "@heroui/react";
import { Icon } from "@iconify/react";

export default function ProcessingStatus({ isProcessing, videoUrl, analysisType }) {
  if (!isProcessing) {
    return null;
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardBody className="gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Icon
              icon="solar:spinner-line-duotone"
              className="text-primary animate-spin"
              width={24}
            />
            <div>
              <p className="font-medium">Processing video...</p>
              {videoUrl && (
                <p className="text-sm text-default-500 truncate max-w-md">
                  {videoUrl}
                </p>
              )}
            </div>
          </div>
          <Chip color="primary" variant="flat" size="sm">
            {analysisType === "fact-check" ? "Fact Check" : "Summarize"}
          </Chip>
        </div>

        <Progress
          isIndeterminate
          color="primary"
          size="sm"
          classNames={{
            indicator: "bg-gradient-to-r from-primary to-secondary",
          }}
        />

        <div className="flex gap-4 text-xs text-default-400">
          <span className="flex items-center gap-1">
            <Icon icon="solar:document-text-linear" width={14} />
            Transcribing audio
          </span>
          <span className="flex items-center gap-1">
            <Icon icon="solar:cpu-bolt-linear" width={14} />
            AI analysis
          </span>
          <span className="flex items-center gap-1">
            <Icon icon="solar:clock-circle-linear" width={14} />
            ~2-3 minutes
          </span>
        </div>
      </CardBody>
    </Card>
  );
}

