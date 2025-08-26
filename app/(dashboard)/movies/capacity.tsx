"use client";
import { useUserLibrary, useUserLibraryCapacity } from "./hooks";
import { Badge } from "@/components/ui/badge";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function Capacity() {
  const { userLibraryQuery } = useUserLibrary();
  const { userLibraryCapacityQuery } = useUserLibraryCapacity(
    userLibraryQuery.data?.userLibrary?.path ?? ""
  );

  const capacity = userLibraryCapacityQuery.data?.capacity ?? 0;
  const checkCacheCapacity = userLibraryCapacityQuery.data?.checkCacheCapacity;
  const userLibraryCapacity =
    userLibraryCapacityQuery.data?.userLibraryCapacity;

  // 计算圆形进度条的半径和周长
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset =
    circumference - (Number(capacity) / 100) * circumference;

  return (
    <div className="w-full flex justify-end">
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="[&>svg]:!w-5 [&>svg]:!h-5">
            <span className="text-neutral-500">{capacity}%</span>
            <svg className="transform -rotate-90" viewBox="0 0 48 48">
              {/* 背景圆环 */}
              <circle
                cx="24"
                cy="24"
                r={radius}
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                className="text-muted-foreground/30"
              />
              {/* 进度圆环 */}
              <circle
                cx="24"
                cy="24"
                r={radius}
                stroke="currentColor"
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={strokeDasharray}
                strokeDashoffset={strokeDashoffset}
                className="text-foreground transition-all duration-500 ease-out"
              />
            </svg>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {checkCacheCapacity} GB used of {userLibraryCapacity} GB
          </p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
