"use client";
import { t as uiText } from "@/lib/editor/i18n";

import { avatarStyle, initials, type AvatarPreset } from "@/lib/editor/profile";
import { Button } from "./ui";

export function ProfileAvatar({
  name,
  photo,
  preset,
}: {
  name: string;
  photo: string | null;
  preset: AvatarPreset;
}) {
  return (
    <span className="avatar" style={avatarStyle(preset)} aria-hidden="true">
      {photo ? <img src={photo} alt="" /> : initials(name)}
    </span>
  );
}

export function ProfileFields({
  name,
  handle,
  photo,
  preset,
  onName,
  choosePhoto,
  removePhoto,
}: {
  name: string;
  handle: string;
  photo: string | null;
  preset: AvatarPreset;
  onName: (value: string) => void;
  choosePhoto: () => void;
  removePhoto: () => void;
}) {
  return (
    <>
      <div className="avatar-editor">
        <ProfileAvatar name={name || handle} photo={photo} preset={preset} />
        <Button secondary onClick={choosePhoto}>
          {photo ? uiText("Replace photo") : uiText("Upload photo")}
        </Button>
        {photo && (
          <button className="text-button" onClick={removePhoto}>
            {uiText("Remove photo")}
          </button>
        )}
      </div>
      <label>
        {uiText("Display name")}
        <input
          required
          maxLength={80}
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder={handle || "Your name"}
          autoComplete="nickname"
        />
      </label>
    </>
  );
}
