import React from "react";
import { usePresence } from "../collab/useField";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function PresenceBar() {
  const users = usePresence();
  return (
    <div className="presence-bar" title="People editing this project">
      {users.map((u) => (
        <span
          key={u.clientId}
          className="avatar"
          style={{ background: u.color }}
          title={u.isSelf ? `${u.name} (you)` : u.name}
        >
          {initials(u.name)}
        </span>
      ))}
      <span className="presence-count muted">
        {users.length} online
      </span>
    </div>
  );
}
