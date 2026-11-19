"use client";
import { Check } from "lucide-react";
import {
  appearances,
  avatarPresets,
  avatarStyle,
  initials,
  type AvatarPreset,
  type ProfileAppearance,
} from "@/lib/editor/profile";
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

export function ProfileCustomization({
  name,
  handle,
  photo,
  preset,
  appearance,
  onName,
  onPreset,
  onAppearance,
  choosePhoto,
  removePhoto,
  save,
}: {
  name: string;
  handle: string;
  photo: string | null;
  preset: AvatarPreset;
  appearance: ProfileAppearance;
  onName: (value: string) => void;
  onPreset: (value: AvatarPreset) => void;
  onAppearance: (value: ProfileAppearance) => void;
  choosePhoto: () => void;
  removePhoto: () => void;
  save: () => void;
}) {
  return (
    <main className="dashboard settings-page profile-page">
      <div className="page-heading">
        <h1>Customize profile</h1>
      </div>
      <div className="settings-grid">
        <section className="settings-card">
          <h2>Profile</h2>
          <div className="avatar-editor">
            <ProfileAvatar
              name={name || handle}
              photo={photo}
              preset={preset}
            />
            <Button secondary onClick={choosePhoto}>
              {photo ? "Replace photo" : "Choose photo"}
            </Button>
            {photo && (
              <button className="text-button" onClick={removePhoto}>
                Remove photo
              </button>
            )}
          </div>
          <label>
            Display name
            <input
              maxLength={80}
              value={name}
              onChange={(e) => onName(e.target.value)}
              placeholder={handle || "Your name"}
            />
          </label>
          <fieldset className="avatar-presets">
            <legend>Avatar color</legend>
            {(Object.keys(avatarPresets) as AvatarPreset[]).map((value) => (
              <label key={value}>
                <input
                  type="radio"
                  name="avatar-preset"
                  checked={!photo && preset === value}
                  onChange={() => {
                    onPreset(value);
                    if (photo) removePhoto();
                  }}
                />
                <span
                  className="avatar"
                  style={avatarStyle(value)}
                  aria-hidden="true"
                >
                  {initials(name || handle)}
                </span>
                {avatarPresets[value].label}
              </label>
            ))}
          </fieldset>
        </section>
        <section className="settings-card">
          <h2>Appearance</h2>
          <fieldset className="appearance-options">
            <legend>App theme</legend>
            {appearances.map((value) => (
              <label key={value}>
                <input
                  type="radio"
                  name="appearance"
                  checked={appearance === value}
                  onChange={() => onAppearance(value)}
                />
                {value === "system"
                  ? "System"
                  : value === "light"
                    ? "Light"
                    : "Dark"}
              </label>
            ))}
          </fieldset>
        </section>
      </div>
      <Button onClick={save}>
        <Check size={17} /> Save profile
      </Button>
    </main>
  );
}
