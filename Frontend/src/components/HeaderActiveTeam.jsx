import React, { useState, useRef, useEffect } from "react";
import "./HeaderActiveTeam.css";

const AVATAR_COLORS = [
  "#667eea", "#764ba2", "#f093fb", "#f5576c",
  "#4facfe", "#00c9a7", "#43e97b", "#fa709a",
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

function MiniAvatar({ user, size = 28 }) {
  const profileImg = getProfileImg(user);
  const bgColor = getColor(user);

  return (
    <div className="hat-avatar" style={{ width: size, height: size, fontSize: size * 0.38, background: profileImg ? "transparent" : bgColor }}>
      {profileImg ? (
        <img src={profileImg} alt={getDisplayName(user)} />
      ) : (
        <span className="hat-avatar-initials">{getInitials(user)}</span>
      )}
      <span className="hat-active-dot" />
    </div>
  );
}

export default function HeaderActiveTeam({ activeUsers = [] }) {
  const [popupOpen, setPopupOpen] = useState(false);
  const popupRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setPopupOpen(false);
      }
    }
    if (popupOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [popupOpen]);

  if (activeUsers.length === 0) return null;

  const visibleUsers = activeUsers.slice(0, MAX_VISIBLE);
  const overflowUsers = activeUsers.slice(MAX_VISIBLE);
  const hasOverflow = overflowUsers.length > 0;

  return (
    <div className="hat-container">
      {/* Avatar stack */}
      <div className="hat-stack">
        {visibleUsers.map((u, i) => (
          <div key={u._id || u.id} className="hat-stack-item" style={{ zIndex: MAX_VISIBLE - i }}>
            <MiniAvatar user={u} size={34} />
            <div className="hat-tooltip">{getDisplayName(u)}</div>
          </div>
        ))}

        {/* Overflow "+N" */}
        {hasOverflow && (
          <div className="hat-stack-item hat-more-wrap" ref={popupRef} style={{ zIndex: 0 }}>
            <button className="hat-more-btn" onClick={() => setPopupOpen(!popupOpen)}>
              +{overflowUsers.length}
            </button>

            {popupOpen && (
              <div className="hat-popup">
                <div className="hat-popup-header">
                  <span className="hat-popup-dot" />
                  <span>{overflowUsers.length} more online</span>
                </div>
                {overflowUsers.map((u) => (
                  <div key={u._id || u.id} className="hat-popup-item">
                    <MiniAvatar user={u} size={24} />
                    <div className="hat-popup-info">
                      <span className="hat-popup-name">{getDisplayName(u)}</span>
                      {u?.email && <span className="hat-popup-email">{u.email}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Count badge removed */}
    </div>
  );
}
