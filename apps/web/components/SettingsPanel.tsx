"use client";

import { DIFFICULTIES } from "@ur/ai";
import { useSettings, type Settings } from "@/lib/settings";
import { Modal } from "./ui/Modal";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm text-[var(--ink)]">{label}</span>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: readonly { id: T; label: string }[];
  onChange(v: T): void;
  label: string;
}) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          role="radio"
          aria-checked={value === option.id}
          className={[
            "btn rounded-lg px-2.5 py-1 text-xs",
            value === option.id ? "ring-1 ring-[var(--gold)] text-[var(--gold)]" : "",
          ].join(" ")}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsPanel({ open, onClose }: { open: boolean; onClose(): void }) {
  const { settings, update } = useSettings();

  return (
    <Modal
      open={open}
      title="Settings"
      onClose={onClose}
      actions={
        <button className="btn rounded-lg px-4 py-2 text-sm" onClick={onClose}>
          Done
        </button>
      }
    >
      <div className="flex flex-col divide-y divide-white/5">
        <Row label="Board orientation">
          <Segmented<Settings["orientation"]>
            label="Board orientation"
            value={settings.orientation}
            options={[
              { id: "auto", label: "Auto" },
              { id: "vertical", label: "Vertical" },
              { id: "horizontal", label: "Horizontal" },
            ]}
            onChange={(orientation) => update({ orientation })}
          />
        </Row>
        <Row label="Move hints">
          <Segmented<"on" | "off">
            label="Move hints"
            value={settings.hints ? "on" : "off"}
            options={[
              { id: "on", label: "On" },
              { id: "off", label: "Off" },
            ]}
            onChange={(v) => update({ hints: v === "on" })}
          />
        </Row>
        <Row label="Confirm new game">
          <Segmented<"on" | "off">
            label="Confirm new game"
            value={settings.confirmNew ? "on" : "off"}
            options={[
              { id: "on", label: "On" },
              { id: "off", label: "Off" },
            ]}
            onChange={(v) => update({ confirmNew: v === "on" })}
          />
        </Row>
        <Row label="Animations">
          <Segmented<Settings["motion"]>
            label="Animations"
            value={settings.motion}
            options={[
              { id: "system", label: "System" },
              { id: "reduced", label: "Reduced" },
            ]}
            onChange={(motion) => update({ motion })}
          />
        </Row>
        <p className="pt-2 text-xs text-[var(--ink-dim)]">
          Auto orientation follows your device rotation on touch screens and the header toggle on
          desktop. {DIFFICULTIES.length} AI tiers available — pick per game from the menu.
        </p>
      </div>
    </Modal>
  );
}
