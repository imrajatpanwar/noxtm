import React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "./ui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
import { cn } from "../lib/utils";

const AVATAR_COLORS = [
  "tw-bg-violet-500", "tw-bg-purple-500", "tw-bg-pink-500", "tw-bg-rose-500",
  "tw-bg-blue-500", "tw-bg-cyan-500", "tw-bg-emerald-500", "tw-bg-teal-500",
];

function getInitials(user) {
  const name = user?.fullName || user?.name || user?.email?.split("@")[0] || "U";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function getDisplayName(user) {
  return user?.fullName || user?.name || user?.email?.split("@")[0] || "User";
}

function getColor(user) {
  const name = getDisplayName(user);
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

function getProfileImg(user) {
  return user?.profileImage || user?.avatarUrl || user?.photoUrl || user?.avatar || user?.profilePicture || user?.image;
}

const MAX_VISIBLE = 4;

function TeamAvatar({ user, size = "sm", showDot = true }) {
  const profileImg = getProfileImg(user);
  const sizeClass = size === "sm"
    ? "tw-h-[30px] tw-w-[30px] tw-text-[11px]"
    : "tw-h-[28px] tw-w-[28px] tw-text-[10px]";

  return (
    <div className="tw-relative">
      <Avatar className={cn(
        sizeClass,
        "tw-ring-2 tw-ring-white tw-transition-transform tw-duration-150 hover:tw-scale-110 hover:tw-z-10"
      )}>
        <AvatarImage src={profileImg} alt={getDisplayName(user)} />
        <AvatarFallback className={cn(
          getColor(user),
          "tw-text-white tw-font-semibold tw-text-[11px] tw-leading-none"
        )}>
          {getInitials(user)}
        </AvatarFallback>
      </Avatar>
      {showDot && (
        <span className="tw-absolute tw-bottom-[-1px] tw-right-[-1px] tw-h-[9px] tw-w-[9px] tw-rounded-full tw-bg-emerald-500 tw-ring-2 tw-ring-white tw-z-[2]" />
      )}
    </div>
  );
}

function PopoverUserItem({ user }) {
  return (
    <div className="tw-flex tw-items-center tw-gap-2.5 tw-px-2 tw-py-1.5 tw-rounded-lg hover:tw-bg-gray-50 tw-transition-colors tw-cursor-default">
      <TeamAvatar user={user} size="xs" showDot={true} />
      <div className="tw-flex tw-flex-col tw-min-w-0">
        <span className="tw-text-[13px] tw-font-medium tw-text-gray-800 tw-truncate tw-leading-tight" style={{ fontFamily: "'Switzer', sans-serif" }}>
          {getDisplayName(user)}
        </span>
        {user?.email && (
          <span className="tw-text-[11px] tw-text-gray-400 tw-truncate tw-leading-tight" style={{ fontFamily: "'Switzer', sans-serif" }}>
            {user.email}
          </span>
        )}
      </div>
    </div>
  );
}

export default function HeaderActiveTeam({ activeUsers = [] }) {
  if (activeUsers.length === 0) return null;

  const visibleUsers = activeUsers.slice(0, MAX_VISIBLE);
  const overflowUsers = activeUsers.slice(MAX_VISIBLE);
  const hasOverflow = overflowUsers.length > 0;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="tw-flex tw-items-center tw-mr-1">
        {/* Active indicator pill */}
        <div className="tw-flex tw-items-center tw-gap-1.5 tw-mr-2">
          <span className="tw-relative tw-flex tw-h-2 tw-w-2">
            <span className="tw-animate-ping tw-absolute tw-inline-flex tw-h-full tw-w-full tw-rounded-full tw-bg-emerald-400 tw-opacity-75" />
            <span className="tw-relative tw-inline-flex tw-rounded-full tw-h-2 tw-w-2 tw-bg-emerald-500" />
          </span>
          <span className="tw-text-[11px] tw-font-medium tw-text-gray-500 tw-hidden sm:tw-inline" style={{ fontFamily: "'Switzer', sans-serif" }}>
            {activeUsers.length} online
          </span>
        </div>

        {/* Avatar stack */}
        <div className="tw-flex tw-items-center tw--space-x-2">
          {visibleUsers.map((u) => (
            <Tooltip key={u._id || u.id}>
              <TooltipTrigger asChild>
                <div className="tw-relative tw-cursor-pointer">
                  <TeamAvatar user={u} size="sm" showDot={true} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" sideOffset={8}>
                <p className="tw-font-medium" style={{ fontFamily: "'Switzer', sans-serif" }}>
                  {getDisplayName(u)}
                </p>
              </TooltipContent>
            </Tooltip>
          ))}

          {/* Overflow "+N" with Popover */}
          {hasOverflow && (
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <button
                      className={cn(
                        "tw-relative tw-flex tw-items-center tw-justify-center",
                        "tw-h-[30px] tw-w-[30px] tw-rounded-full",
                        "tw-bg-gray-100 tw-ring-2 tw-ring-white",
                        "tw-text-[11px] tw-font-bold tw-text-gray-500",
                        "tw-cursor-pointer tw-border-0",
                        "hover:tw-bg-gray-200 tw-transition-all tw-duration-150 hover:tw-scale-110"
                      )}
                      style={{ fontFamily: "'Switzer', sans-serif" }}
                    >
                      +{overflowUsers.length}
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={8}>
                  <p style={{ fontFamily: "'Switzer', sans-serif" }}>
                    {overflowUsers.length} more online
                  </p>
                </TooltipContent>
              </Tooltip>

              <PopoverContent
                side="bottom"
                align="end"
                sideOffset={12}
                className="tw-w-60 tw-p-2"
              >
                <div className="tw-flex tw-items-center tw-gap-2 tw-px-2 tw-pb-2 tw-mb-1 tw-border-b tw-border-gray-100">
                  <span className="tw-relative tw-flex tw-h-1.5 tw-w-1.5">
                    <span className="tw-relative tw-inline-flex tw-rounded-full tw-h-1.5 tw-w-1.5 tw-bg-emerald-500" />
                  </span>
                  <span className="tw-text-[11px] tw-font-semibold tw-text-gray-400 tw-uppercase tw-tracking-wider" style={{ fontFamily: "'Switzer', sans-serif" }}>
                    {overflowUsers.length} more online
                  </span>
                </div>
                <div className="tw-flex tw-flex-col tw-gap-0.5 tw-max-h-[200px] tw-overflow-y-auto">
                  {overflowUsers.map((u) => (
                    <PopoverUserItem key={u._id || u.id} user={u} />
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
