import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Keyboard, Palette, X, Check } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { BlossomColorPicker } from "@dayflow/blossom-color-picker-react";
import "../blossom-color-picker.css";
import { applyThemeColors, hexToBlossom } from "../utils/color";

interface AppSettings {
  ender_char: string;
  theme_color: string;
}

export function SettingsView() {
  const [enderChar, setEnderChar] = useState("!");
  const [themeColor, setThemeColor] = useState("#8b5cf6");
  const [originalEnderChar, setOriginalEnderChar] = useState("!");
  const [originalThemeColor, setOriginalThemeColor] = useState("#8b5cf6");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const colorControlRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    invoke<AppSettings>("get_settings")
      .then((s) => {
        setEnderChar(s.ender_char);
        setThemeColor(s.theme_color);
        setOriginalEnderChar(s.ender_char);
        setOriginalThemeColor(s.theme_color);
        applyThemeColors(s.theme_color);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!showColorPicker) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        colorControlRef.current &&
        !colorControlRef.current.contains(e.target as Node)
      ) {
        setShowColorPicker(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showColorPicker]);

  const hasChanges = useMemo(
    () => enderChar !== originalEnderChar || themeColor !== originalThemeColor,
    [enderChar, themeColor, originalEnderChar, originalThemeColor],
  );

  const blossomValue = useMemo(() => hexToBlossom(themeColor), [themeColor]);

  const handleSave = useCallback(async () => {
    try {
      await invoke("update_settings", { enderChar, themeColor });
      setOriginalEnderChar(enderChar);
      setOriginalThemeColor(themeColor);
      setShowColorPicker(false);
      applyThemeColors(themeColor);
    } catch (e) {
      console.error("Failed to save:", e);
    }
  }, [enderChar, themeColor]);

  const handleDiscard = useCallback(() => {
    setEnderChar(originalEnderChar);
    setThemeColor(originalThemeColor);
    setShowColorPicker(false);
  }, [originalEnderChar, originalThemeColor]);

  const handleColorChange = useCallback((color: { hex: string }) => {
    setThemeColor(color.hex);
  }, []);

  const handleEnderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setEnderChar(e.target.value.slice(-1));
    },
    [],
  );

  return (
    <div className="view-container">
      <div className="view-header">
        <h1>Settings</h1>
        <p>Configure your text expander</p>
      </div>

      <div className="settings-card">
        <div className="settings-card-header settings-card-header-first">
          <Palette size={16} />
          <span>Appearance</span>
        </div>
        <div className="settings-row settings-row-last">
          <div className="settings-row-label">
            <div className="row-title">Theme Color</div>
            <div className="row-desc">Accent color for the app interface</div>
          </div>
          <div className="theme-color-control" ref={colorControlRef}>
            <button
              className="color-swatch-btn"
              style={{ backgroundColor: themeColor }}
              onClick={() => setShowColorPicker(!showColorPicker)}
            />
            {showColorPicker && (
              <div className="color-picker-dropdown">
                <BlossomColorPicker
                  value={blossomValue}
                  onChange={handleColorChange}
                  initialExpanded={true}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="settings-card" style={{ marginTop: "1rem" }}>
        <div className="settings-card-header settings-card-header-first">
          <Keyboard size={16} />
          <span>Behavior</span>
        </div>
        <div className="settings-row settings-row-last">
          <div className="settings-row-label">
            <div className="row-title">Ender Character</div>
            <div className="row-desc">Finalizes arguments in argument mode</div>
          </div>
          <input
            type="text"
            maxLength={1}
            value={enderChar}
            onChange={handleEnderChange}
            className="settings-text-input"
          />
        </div>
      </div>

      {hasChanges && (
        <div className="settings-toast-container">
          <div className="settings-toast">
            <span>You have unsaved changes</span>
            <div className="toast-actions">
              <button
                className="toast-btn toast-btn-discard"
                onClick={handleDiscard}
              >
                <X size={14} />
                Revert
              </button>
              <button className="toast-btn toast-btn-save" onClick={handleSave}>
                <Check size={14} />
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
