"use client";
import { createContext } from "react";
import type { AppColorTheme } from "@/lib/editor/app-theme";

export const AppThemeContext = createContext<AppColorTheme>("editAI");
