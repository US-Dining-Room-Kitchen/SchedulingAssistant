import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Slider,
  Text,
  Label,
} from "@fluentui/react-components";
import { logger } from "../utils/logger";

interface TimeOffThresholdSettingsProps {
  open: boolean;
  onClose: () => void;
  all: (sql: string, params?: any[]) => any[];
  run: (sql: string, params?: any[]) => void;
  onThresholdChange?: (threshold: number) => void;
}

export default function TimeOffThresholdSettings({ 
  open, 
  onClose, 
  all, 
  run,
  onThresholdChange,
}: TimeOffThresholdSettingsProps) {
  const [threshold, setThreshold] = useState<number>(50);

  useEffect(() => {
    if (open) {
      // Load current setting from database
      try {
        const rows = all(`SELECT value FROM meta WHERE key='time_off_block_threshold'`);
        if (rows.length > 0 && rows[0].value) {
          const value = parseInt(rows[0].value, 10);
          if (!isNaN(value) && value >= 25 && value <= 75) {
            setThreshold(value);
          }
        }
      } catch (e) {
        logger.error('Failed to load time_off_block_threshold:', e);
      }
    }
  }, [open, all]);

  function handleSave() {
    try {
      run(
        `INSERT INTO meta (key, value) VALUES ('time_off_block_threshold', ?) 
         ON CONFLICT(key) DO UPDATE SET value=excluded.value`,
        [String(threshold)]
      );
      // Notify parent of the change for immediate effect
      if (onThresholdChange) {
        onThresholdChange(threshold);
      }
    } catch (e) {
      logger.error('Failed to save time_off_block_threshold:', e);
    }
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(_, d) => { if (!d.open) onClose(); }}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>Time-Off Threshold Settings</DialogTitle>
          <DialogContent>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <Text>
                Set the percentage of time-off overlap that blocks scheduling a person. 
                If overlap is below this threshold, you'll be prompted for confirmation instead of being blocked.
              </Text>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <Label htmlFor="threshold-slider" style={{ fontWeight: 600 }}>
                  Block Threshold: {threshold}%
                </Label>
                <Slider
                  id="threshold-slider"
                  min={25}
                  max={75}
                  step={5}
                  value={threshold}
                  onChange={(_, data) => setThreshold(data.value)}
                  style={{ width: "100%" }}
                />
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#666" }}>
                  <span>25% (more permissive)</span>
                  <span>75% (more restrictive)</span>
                </div>
              </div>
              
              <div style={{ fontSize: "12px", color: "#666", marginTop: "8px", lineHeight: "1.5" }}>
                <strong>How it works:</strong>
                <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
                  <li>
                    <strong>Overlap ≥ {threshold}%:</strong> Scheduling is blocked (person won't appear in dropdown)
                  </li>
                  <li>
                    <strong>Overlap &lt; {threshold}%:</strong> Person can be scheduled with a confirmation dialog
                  </li>
                </ul>
                <em>Default is 50%, meaning someone with less than half their shift off can still be scheduled with confirmation.</em>
              </div>
            </div>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>Cancel</Button>
            <Button appearance="primary" onClick={handleSave}>Save</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
