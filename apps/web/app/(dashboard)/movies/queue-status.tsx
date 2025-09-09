"use client";
import React from "react";
import {
  Loader2,
  Clock,
  CheckCircle,
  XCircle,
  Brain,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@next-media/ui/utils/index.ts";
import { useState } from "react";
import { useQueueStatus } from "./hooks";
import type { QueueStatusResponseType } from "../../../lib/types";

const getStatusConfig = (type: keyof QueueStatusResponseType["stats"]) => {
  switch (type) {
    case "active":
      return {
        icon: Loader2,
        label: "Processing",
        color: "text-blue-600",
        bgColor: "bg-blue-50",
        borderColor: "border-blue-200",
      };
    case "waiting":
      return {
        icon: Clock,
        label: "Waiting",
        color: "text-amber-600",
        bgColor: "bg-amber-50",
        borderColor: "border-amber-200",
      };
    case "failed":
      return {
        icon: XCircle,
        label: "Failed",
        color: "text-red-600",
        bgColor: "bg-red-50",
        borderColor: "border-red-200",
      };
    case "completed":
      return {
        icon: CheckCircle,
        label: "Completed",
        color: "text-green-600",
        bgColor: "bg-green-50",
        borderColor: "border-green-200",
      };
    default:
      return {
        icon: Loader2,
        label: "Unknown",
        color: "text-gray-600",
        bgColor: "bg-gray-50",
        borderColor: "border-gray-200",
      };
  }
};

export default function QueueStatus() {
  const [isExpanded, setIsExpanded] = useState(false);
  const { queueStatusQuery } = useQueueStatus();

  if (!queueStatusQuery.data) {
    return <></>;
  }

  const { stats: queueNumbers, details: queueDetails } = queueStatusQuery.data;

  if (queueNumbers.waiting === 0 && queueNumbers.active === 0) {
    return <></>;
  }
  return (
    <>
      <div
        className={cn(
          "inline-flex w-full items-center gap-3 px-4 py-3 rounded-lg border",
          "bg-neutral-50/50 border-neutral-200/50 backdrop-blur-sm",
          "transition-all duration-200 hover:bg-neutral-50/70 "
        )}
      >
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-100/80">
          <Brain className="h-4 w-4 text-gray-600" />
        </div>

        <div className="flexgap-1 text-sm text-gray-600">
          <span>Processing movies</span>
        </div>

        <div className="flex ml-auto items-center gap-2">
          {Object.entries(queueNumbers).map(([type, count]) => {
            if (count === 0) return null;

            const config = getStatusConfig(
              type as keyof QueueStatusResponseType["stats"]
            );
            const Icon = config.icon;

            return (
              <div
                key={type}
                className={cn(
                  "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium",
                  config.bgColor,
                  config.borderColor,
                  "border"
                )}
              >
                <Icon
                  className={cn(
                    "h-3 w-3",
                    config.color,
                    config.label === "Processing" ? "animate-spin" : ""
                  )}
                />
                <span className={config.color}>{count}</span>
                <span className="text-gray-500">{config.label}</span>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="ml-2 p-1 rounded-md hover:bg-gray-100/50 transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3 p-4 bg-gray-50/30 rounded-lg border border-gray-200/50">
          <div className="space-y-3">
            {queueDetails.active.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                  Currently Processing
                </h4>
                <div className="space-y-2">
                  {queueDetails.active.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-2 bg-blue-50/50 rounded-md"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">
                          {job.movieTitle}
                          {job.year && ` (${job.year})`}
                        </div>
                        {job.libraryPath && (
                          <div className="text-xs text-gray-500 truncate mt-1">
                            {job.libraryPath}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {queueDetails.waiting.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-amber-600" />
                  Waiting in Queue
                </h4>
                <div className="space-y-2">
                  {queueDetails.waiting.slice(0, 5).map((job) => (
                    <div key={job.id} className="p-2 bg-amber-50/30 rounded-md">
                      <div className="text-sm font-medium text-gray-800">
                        {job.movieTitle}
                        {job.year && ` (${job.year})`}
                      </div>
                      {job.libraryPath && (
                        <div className="text-xs text-gray-500 truncate mt-1">
                          {job.libraryPath}
                        </div>
                      )}
                    </div>
                  ))}
                  {queueDetails.waiting.length > 5 && (
                    <div className="text-xs text-gray-500">
                      +{queueDetails.waiting.length - 5} more...
                    </div>
                  )}
                </div>
              </div>
            )}

            {queueDetails.failed.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  Failed
                </h4>
                <div className="space-y-2">
                  {queueDetails.failed.slice(0, 3).map((job) => (
                    <div key={job.id} className="p-2 bg-red-50/50 rounded-md">
                      <div className="text-sm font-medium text-gray-800">
                        {job.movieTitle}
                        {job.year && ` (${job.year})`}
                      </div>
                      {job.libraryPath && (
                        <div className="text-xs text-gray-500 truncate mt-1">
                          {job.libraryPath}
                        </div>
                      )}
                      {job.failedReason && (
                        <div className="text-xs text-red-600 mt-1">
                          {job.failedReason}
                        </div>
                      )}
                    </div>
                  ))}
                  {queueDetails.failed.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{queueDetails.failed.length - 3} more failed...
                    </div>
                  )}
                </div>
              </div>
            )}

            {queueDetails.completed.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Recently Completed
                </h4>
                <div className="space-y-2">
                  {queueDetails.completed.slice(0, 5).map((job) => (
                    <div key={job.id} className="p-2 bg-green-50/30 rounded-md">
                      <div className="text-sm font-medium text-gray-800">
                        {job.movieTitle}
                        {job.year && ` (${job.year})`}
                      </div>
                      {job.libraryPath && (
                        <div className="text-xs text-gray-500 truncate mt-1">
                          {job.libraryPath}
                        </div>
                      )}
                    </div>
                  ))}
                  {queueDetails.completed.length > 5 && (
                    <div className="text-xs text-gray-500">
                      +{queueDetails.completed.length - 5} more completed...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
