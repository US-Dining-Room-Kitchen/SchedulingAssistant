import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Field,
  Dropdown,
  Option,
  Text,
  makeStyles,
  tokens,
  Card,
  Badge,
  Tooltip,
  Slider,
  Menu,
  MenuTrigger,
  MenuPopover,
  MenuList,
  MenuItem,
} from "@fluentui/react-components";
import {
  Add20Regular,
  Delete20Regular,
  Edit20Regular,
  Lightbulb20Regular,
  ArrowRight16Regular,
  Clock16Regular,
  Info16Regular,
} from "@fluentui/react-icons";
import type { SegmentRow } from "../services/segments";
import type { SegmentAdjustmentRow } from "../services/segmentAdjustments";
import AlertDialog from "./AlertDialog";
import ConfirmDialog from "./ConfirmDialog";
import { useDialogs } from "../hooks/useDialogs";

interface Props {
  all: (sql: string, params?: any[]) => any[];
  run: (sql: string, params?: any[]) => void;
  refresh: () => void;
  segments: SegmentRow[];
}

interface Role {
  id: number;
  name: string;
}

// Reference point options with user-friendly labels
const referencePointOpts = [
  { value: "condition.start", label: "start of Trigger Segment" },
  { value: "condition.end", label: "end of Trigger Segment" },
  { value: "target.start", label: "original start of Target Segment" },
  { value: "target.end", label: "original end of Target Segment" },
];

// Action options with user-friendly labels
const actionOpts = [
  { value: "start", label: "move start of" },
  { value: "end", label: "extend end of" },
];

const mins = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
const pad2 = (n: number) => String(n).padStart(2, "0");
const fmt = (m: number) => `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}`;

const useSegmentAdjustmentStyles = makeStyles({
  section: { display: "flex", flexDirection: "column", rowGap: tokens.spacingVerticalL },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: tokens.spacingVerticalM },
  buttonGroup: { display: "flex", gap: tokens.spacingHorizontalS },
  
  // Card grid layout
  cardGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: tokens.spacingVerticalL,
    marginBottom: tokens.spacingVerticalL,
  },
  card: {
    padding: tokens.spacingHorizontalL,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusLarge,
    boxShadow: tokens.shadow4,
    transition: "box-shadow 0.2s ease",
    ":hover": {
      boxShadow: tokens.shadow8,
    },
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: tokens.spacingVerticalM,
  },
  cardDescription: {
    fontSize: tokens.fontSizeBase300,
    lineHeight: tokens.lineHeightBase300,
    color: tokens.colorNeutralForeground2,
    marginBottom: tokens.spacingVerticalS,
  },
  badgeRow: {
    display: "flex",
    gap: tokens.spacingHorizontalXS,
    flexWrap: "wrap",
    marginTop: tokens.spacingVerticalXS,
  },
  cardActions: {
    display: "flex",
    gap: tokens.spacingHorizontalXS,
    justifyContent: "flex-end",
  },
  
  // Empty state
  emptyState: {
    textAlign: "center",
    padding: `${tokens.spacingVerticalXXXL} ${tokens.spacingHorizontalXL}`,
    color: tokens.colorNeutralForeground3,
  },
  emptyIcon: {
    fontSize: "48px",
    marginBottom: tokens.spacingVerticalL,
  },
  
  // Form layout - sentence builder
  formCard: {
    padding: tokens.spacingHorizontalXL,
    border: `2px solid ${tokens.colorBrandBackground}`,
    borderRadius: tokens.borderRadiusLarge,
    backgroundColor: tokens.colorNeutralBackground1,
    marginBottom: tokens.spacingVerticalL,
  },
  sentenceBuilder: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    marginBottom: tokens.spacingVerticalL,
    fontSize: tokens.fontSizeBase400,
    lineHeight: tokens.lineHeightBase400,
  },
  sentenceText: {
    color: tokens.colorNeutralForeground2,
  },
  dropdownInline: {
    minWidth: "160px",
    maxWidth: "200px",
  },
  
  // Slider section
  sliderSection: {
    marginTop: tokens.spacingVerticalL,
    marginBottom: tokens.spacingVerticalL,
  },
  sliderLabel: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
    marginBottom: tokens.spacingVerticalS,
  },
  
  // Enhanced preview
  previewSection: {
    marginTop: tokens.spacingVerticalL,
    padding: tokens.spacingHorizontalL,
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
  },
  previewTitle: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalXS,
    marginBottom: tokens.spacingVerticalM,
    fontWeight: tokens.fontWeightSemibold,
  },
  timeline: {
    position: "relative",
    height: "60px",
    background: tokens.colorNeutralBackground5,
    borderRadius: tokens.borderRadiusMedium,
    marginBottom: tokens.spacingVerticalM,
    overflow: "hidden",
  },
  timeAxis: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    marginTop: tokens.spacingVerticalXS,
  },
  triggerBar: {
    position: "absolute",
    top: "5px",
    height: "20px",
    background: tokens.colorPaletteYellowBackground2,
    border: `2px solid ${tokens.colorPaletteYellowBorder2}`,
    borderRadius: tokens.borderRadiusSmall,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForeground1,
  },
  targetBeforeBar: {
    position: "absolute",
    top: "30px",
    height: "20px",
    border: `2px dashed ${tokens.colorNeutralStroke1}`,
    borderRadius: tokens.borderRadiusSmall,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
  },
  targetAfterBar: {
    position: "absolute",
    top: "30px",
    height: "20px",
    background: tokens.colorBrandBackground,
    border: `2px solid ${tokens.colorBrandBackground}`,
    borderRadius: tokens.borderRadiusSmall,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: tokens.fontSizeBase100,
    fontWeight: tokens.fontWeightSemibold,
    color: tokens.colorNeutralForegroundOnBrand,
  },
  timeChangeRow: {
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalS,
    fontSize: tokens.fontSizeBase300,
  },
  
  actionsRow: { 
    display: "flex", 
    gap: tokens.spacingHorizontalS, 
    justifyContent: "flex-end",
    marginTop: tokens.spacingVerticalL,
  },
});

// Smart preset configurations
interface PresetRule {
  name: string;
  description: string;
  condition_segment: string;
  target_segment: string;
  target_field: "start" | "end";
  baseline: SegmentAdjustmentRow["baseline"];
  offset_minutes: number;
}

// Generate smart presets based on available segments
function generatePresets(segments: SegmentRow[]): PresetRule[] {
  const presets: PresetRule[] = [];
  const segNames = segments.map(s => s.name);
  
  // Common patterns
  if (segNames.includes("AM") && segNames.includes("Lunch")) {
    presets.push({
      name: "Extend AM to Lunch",
      description: "AM ends when Lunch starts",
      condition_segment: "Lunch",
      target_segment: "AM",
      target_field: "end",
      baseline: "condition.start",
      offset_minutes: 0,
    });
  }
  
  if (segNames.includes("PM") && segNames.includes("Lunch")) {
    presets.push({
      name: "Start PM after Lunch",
      description: "PM begins when Lunch ends",
      condition_segment: "Lunch",
      target_segment: "PM",
      target_field: "start",
      baseline: "condition.end",
      offset_minutes: 0,
    });
  }
  
  if (segNames.includes("AM") && segNames.includes("Early")) {
    presets.push({
      name: "Start AM after Early",
      description: "AM starts when Early ends",
      condition_segment: "Early",
      target_segment: "AM",
      target_field: "start",
      baseline: "condition.end",
      offset_minutes: 0,
    });
  }
  
  if (segNames.includes("PM") && segNames.includes("AM")) {
    presets.push({
      name: "Start PM after AM",
      description: "PM begins when AM ends",
      condition_segment: "AM",
      target_segment: "PM",
      target_field: "start",
      baseline: "condition.end",
      offset_minutes: 0,
    });
  }
  
  return presets;
}

// Generate human-readable description from adjustment row
function generateDescription(row: SegmentAdjustmentRow, roles: Role[]): string {
  const actionLabel = row.target_field === "start" ? "Move start of" : "Extend end of";
  const refPoint = referencePointOpts.find(o => o.value === row.baseline)?.label || row.baseline;
  const roleText = row.condition_role_id 
    ? ` (with ${roles.find(r => r.id === row.condition_role_id)?.name || "role"})`
    : "";
  
  let desc = `When ${row.condition_segment}${roleText} is scheduled, ${actionLabel.toLowerCase()} ${row.target_segment} to match ${refPoint}`;
  
  if (row.offset_minutes !== 0) {
    desc += ` ${row.offset_minutes > 0 ? '+' : ''}${row.offset_minutes} min`;
  }
  
  return desc;
}

export default function SegmentAdjustmentEditor({ all, run, refresh, segments }: Props) {
  const empty: Omit<SegmentAdjustmentRow, "id"> = {
    condition_segment: "",
    condition_role_id: null,
    target_segment: "",
    target_field: "start",
    baseline: "condition.start",
    offset_minutes: 0,
  };
  const [rows, setRows] = useState<SegmentAdjustmentRow[]>([]);
  const [editing, setEditing] = useState<SegmentAdjustmentRow | null>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [form, setForm] = useState<typeof empty>(empty);
  const [roles, setRoles] = useState<Role[]>([]);
  const dialogs = useDialogs();
  const s = useSegmentAdjustmentStyles();
  
  // Generate smart presets based on available segments
  const smartPresets = useMemo(() => generatePresets(segments), [segments]);
  
  const conditionRoleLabel = useMemo(() => {
    if (form.condition_role_id == null) return "Any Role";
    const role = roles.find((ro: Role) => ro.id === form.condition_role_id);
    return role ? role.name : "";
  }, [form.condition_role_id, roles]);
  
  const referencePointLabel = useMemo(() => {
    const match = referencePointOpts.find((o) => o.value === form.baseline);
    return match ? match.label : "";
  }, [form.baseline]);
  
  const actionLabel = useMemo(() => {
    const match = actionOpts.find((o) => o.value === form.target_field);
    return match ? match.label : "";
  }, [form.target_field]);

  const condSeg = segments.find((s) => s.name === form.condition_segment);
  const targetSeg = segments.find((s) => s.name === form.target_segment);
  let preview: {
    condStart: number;
    condEnd: number;
    targetStart: number;
    targetEnd: number;
    newStart: number;
    newEnd: number;
  } | null = null;
  if (condSeg && targetSeg) {
    const condStart = mins(condSeg.start_time);
    const condEnd = mins(condSeg.end_time);
    const targetStart = mins(targetSeg.start_time);
    const targetEnd = mins(targetSeg.end_time);
    let base: number | null = null;
    switch (form.baseline) {
      case "condition.start":
        base = condStart;
        break;
      case "condition.end":
        base = condEnd;
        break;
      case "target.start":
        base = targetStart;
        break;
      case "target.end":
        base = targetEnd;
        break;
    }
    if (base != null) {
      const adj = base + form.offset_minutes;
      let newStart = targetStart;
      let newEnd = targetEnd;
      if (form.target_field === "start") newStart = adj;
      else newEnd = adj;
      preview = { condStart, condEnd, targetStart, targetEnd, newStart, newEnd };
    }
  }

  function load() {
    setRows(all(`SELECT id,condition_segment,condition_role_id,target_segment,target_field,baseline,offset_minutes FROM segment_adjustment`));
    setRoles(all(`SELECT id,name FROM role ORDER BY name`));
  }
  useEffect(load, []);

  function startAdd() {
    setEditing(null);
    setForm(empty);
    setFormVisible(true);
  }

  function startEdit(r: SegmentAdjustmentRow) {
    setEditing(r);
    setForm({
      condition_segment: r.condition_segment,
      condition_role_id: r.condition_role_id ?? null,
      target_segment: r.target_segment,
      target_field: r.target_field,
      baseline: r.baseline,
      offset_minutes: r.offset_minutes,
    });
    setFormVisible(true);
  }

  function save() {
    if (!form.condition_segment || !form.target_segment) {
      dialogs.showAlert("Both condition and target segments are required", "Validation Error");
      return;
    }
    const params = [
      form.condition_segment,
      form.condition_role_id,
      form.target_segment,
      form.target_field,
      form.baseline,
      form.offset_minutes,
    ];
    if (editing) {
      run(
        `UPDATE segment_adjustment SET condition_segment=?, condition_role_id=?, target_segment=?, target_field=?, baseline=?, offset_minutes=? WHERE id=?`,
        [...params, editing.id]
      );
    } else {
      run(
        `INSERT INTO segment_adjustment (condition_segment,condition_role_id,target_segment,target_field,baseline,offset_minutes) VALUES (?,?,?,?,?,?)`,
        params
      );
    }
    load();
    refresh();
    cancel();
  }

  function cancel() {
    setFormVisible(false);
    setEditing(null);
    setForm(empty);
  }

  async function remove(id: number) {
    const confirmed = await dialogs.showConfirm("Are you sure you want to delete this adjustment?", "Delete Adjustment");
    if (!confirmed) return;
    run(`DELETE FROM segment_adjustment WHERE id=?`, [id]);
    load();
    refresh();
  }
  
  function applyPreset(preset: PresetRule) {
    setEditing(null);
    setForm({
      condition_segment: preset.condition_segment,
      condition_role_id: null,
      target_segment: preset.target_segment,
      target_field: preset.target_field,
      baseline: preset.baseline,
      offset_minutes: preset.offset_minutes,
    });
    setFormVisible(true);
  }

  return (
    <div className={s.section}>
      <div className={s.header}>
        <Text size={500} weight="semibold">Segment Adjustments</Text>
        <div className={s.buttonGroup}>
          {smartPresets.length > 0 && !formVisible && (
            <Menu>
              <MenuTrigger disableButtonEnhancement>
                <Button icon={<Lightbulb20Regular />}>Quick Add</Button>
              </MenuTrigger>
              <MenuPopover>
                <MenuList>
                  {smartPresets.map((preset, idx) => (
                    <MenuItem key={idx} onClick={() => applyPreset(preset)}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{preset.name}</div>
                        <div style={{ fontSize: "12px", color: tokens.colorNeutralForeground3 }}>
                          {preset.description}
                        </div>
                      </div>
                    </MenuItem>
                  ))}
                </MenuList>
              </MenuPopover>
            </Menu>
          )}
          <Button appearance="primary" icon={<Add20Regular />} onClick={startAdd}>
            Add Adjustment
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {rows.length === 0 && !formVisible && (
        <div className={s.emptyState}>
          <div className={s.emptyIcon}>🎯</div>
          <Text size={400} weight="semibold">No adjustment rules yet</Text>
          <Text size={300} style={{ marginTop: tokens.spacingVerticalS, marginBottom: tokens.spacingVerticalL }}>
            Create rules to dynamically adjust segment times based on scheduling conditions
          </Text>
          <Button appearance="primary" icon={<Add20Regular />} onClick={startAdd}>
            Create Your First Rule
          </Button>
        </div>
      )}

      {/* Card Grid Display */}
      {rows.length > 0 && !formVisible && (
        <div className={s.cardGrid}>
          {rows.map((r: SegmentAdjustmentRow) => {
            const description = generateDescription(r, roles);
            const actionType = r.target_field === "start" ? "Move Start" : "Extend End";
            const hasOffset = r.offset_minutes !== 0;
            
            return (
              <Card className={s.card} key={r.id}>
                <div className={s.cardHeader}>
                  <div style={{ flex: 1 }}>
                    <div className={s.badgeRow}>
                      <Badge appearance="tint" color="brand">{actionType}</Badge>
                      {hasOffset && (
                        <Badge appearance="outline">
                          <Clock16Regular style={{ marginRight: 4 }} />
                          {r.offset_minutes > 0 ? '+' : ''}{r.offset_minutes} min
                        </Badge>
                      )}
                      {r.condition_role_id && (
                        <Badge appearance="outline">
                          {roles.find((ro: Role) => ro.id === r.condition_role_id)?.name || ""}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className={s.cardActions}>
                    <Tooltip content="Edit rule" relationship="label">
                      <Button 
                        size="small" 
                        appearance="subtle" 
                        icon={<Edit20Regular />}
                        onClick={() => startEdit(r)}
                      />
                    </Tooltip>
                    <Tooltip content="Delete rule" relationship="label">
                      <Button 
                        size="small" 
                        appearance="subtle" 
                        icon={<Delete20Regular />}
                        onClick={() => remove(r.id)}
                      />
                    </Tooltip>
                  </div>
                </div>
                <div className={s.cardDescription}>
                  {description}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form - Sentence Builder */}
      {formVisible && (
        <div className={s.formCard}>
          <Text size={400} weight="semibold" style={{ marginBottom: tokens.spacingVerticalM }}>
            {editing ? "Edit Adjustment Rule" : "Create New Adjustment Rule"}
          </Text>
          
          {/* Sentence Builder */}
          <div className={s.sentenceBuilder}>
            <Text className={s.sentenceText}>When</Text>
            <Dropdown
              className={s.dropdownInline}
              placeholder="Select segment"
              selectedOptions={[form.condition_segment]}
              value={form.condition_segment}
              onOptionSelect={(_, d) => setForm({ ...form, condition_segment: d.optionValue || "" })}
            >
              {segments.map((sg) => (
                <Option key={sg.name} value={sg.name}>
                  {sg.name}
                </Option>
              ))}
            </Dropdown>
            
            <Dropdown
              className={s.dropdownInline}
              selectedOptions={[form.condition_role_id == null ? "" : String(form.condition_role_id)]}
              value={conditionRoleLabel}
              onOptionSelect={(_, d) =>
                setForm({ ...form, condition_role_id: d.optionValue ? Number(d.optionValue) : null })
              }
            >
              <Option value="">Any Role</Option>
              {roles.map((ro: Role) => (
                <Option key={ro.id} value={String(ro.id)}>
                  {ro.name}
                </Option>
              ))}
            </Dropdown>
            
            <Text className={s.sentenceText}>is scheduled,</Text>
            
            <Dropdown
              className={s.dropdownInline}
              selectedOptions={[form.target_field]}
              value={actionLabel}
              onOptionSelect={(_, d) =>
                setForm({ ...form, target_field: d.optionValue as "start" | "end" })
              }
            >
              {actionOpts.map((o) => (
                <Option key={o.value} value={o.value}>
                  {o.label}
                </Option>
              ))}
            </Dropdown>
            
            <Dropdown
              className={s.dropdownInline}
              placeholder="Select segment"
              selectedOptions={[form.target_segment]}
              value={form.target_segment}
              onOptionSelect={(_, d) => setForm({ ...form, target_segment: d.optionValue || "" })}
            >
              {segments.map((sg) => (
                <Option key={sg.name} value={sg.name}>
                  {sg.name}
                </Option>
              ))}
            </Dropdown>
            
            <Text className={s.sentenceText}>to match</Text>
            
            <Dropdown
              className={s.dropdownInline}
              selectedOptions={[form.baseline]}
              value={referencePointLabel}
              onOptionSelect={(_, d) =>
                setForm({ ...form, baseline: d.optionValue as SegmentAdjustmentRow["baseline"] })
              }
            >
              {referencePointOpts.map((o) => (
                <Option key={o.value} value={o.value}>
                  {o.label}
                </Option>
              ))}
            </Dropdown>
          </div>

          {/* Slider for Offset */}
          <div className={s.sliderSection}>
            <div className={s.sliderLabel}>
              <Clock16Regular />
              <Text weight="semibold" size={300}>Fine-Tune Timing (Optional)</Text>
              <Tooltip 
                content="Adjust the timing by adding or subtracting minutes from the reference point" 
                relationship="label"
              >
                <Info16Regular style={{ color: tokens.colorNeutralForeground3, cursor: "help" }} />
              </Tooltip>
            </div>
            <Slider
              min={-60}
              max={60}
              step={5}
              value={form.offset_minutes}
              onChange={(_, data) => setForm({ ...form, offset_minutes: data.value })}
            />
            <Text size={200} style={{ textAlign: "center", marginTop: tokens.spacingVerticalXS }}>
              {form.offset_minutes === 0 
                ? "No offset" 
                : `${form.offset_minutes > 0 ? '+' : ''}${form.offset_minutes} minutes`
              }
            </Text>
          </div>

          {/* Enhanced Preview */}
          {preview && (
            <div className={s.previewSection}>
              <div className={s.previewTitle}>
                <Text size={300}>Preview</Text>
              </div>
              
              <div className={s.timeline}>
                {/* Trigger segment bar */}
                <div
                  className={s.triggerBar}
                  style={{
                    left: `${(preview.condStart / (24 * 60)) * 100}%`,
                    width: `${((preview.condEnd - preview.condStart) / (24 * 60)) * 100}%`,
                  }}
                >
                  {form.condition_segment}
                </div>
                
                {/* Target before (dashed outline) */}
                <div
                  className={s.targetBeforeBar}
                  style={{
                    left: `${(preview.targetStart / (24 * 60)) * 100}%`,
                    width: `${((preview.targetEnd - preview.targetStart) / (24 * 60)) * 100}%`,
                  }}
                >
                  Before
                </div>
                
                {/* Target after (solid blue) */}
                <div
                  className={s.targetAfterBar}
                  style={{
                    left: `${(preview.newStart / (24 * 60)) * 100}%`,
                    width: `${((preview.newEnd - preview.newStart) / (24 * 60)) * 100}%`,
                  }}
                >
                  {form.target_segment}
                </div>
              </div>
              
              <div className={s.timeAxis}>
                <Text>00:00</Text>
                <Text>06:00</Text>
                <Text>12:00</Text>
                <Text>18:00</Text>
                <Text>23:59</Text>
              </div>
              
              <div className={s.timeChangeRow}>
                <Text weight="semibold">{form.target_segment}:</Text>
                <Text>{fmt(preview.targetStart)}-{fmt(preview.targetEnd)}</Text>
                <ArrowRight16Regular />
                <Text weight="semibold" style={{ color: tokens.colorBrandForeground1 }}>
                  {fmt(preview.newStart)}-{fmt(preview.newEnd)}
                </Text>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className={s.actionsRow}>
            <Button appearance="primary" onClick={save}>
              {editing ? "Update Rule" : "Create Rule"}
            </Button>
            <Button onClick={cancel}>Cancel</Button>
          </div>
        </div>
      )}
      
      {dialogs.alertState && (
        <AlertDialog
          open={true}
          title={dialogs.alertState.title}
          message={dialogs.alertState.message}
          onClose={dialogs.closeAlert}
        />
      )}
      
      {dialogs.confirmState && (
        <ConfirmDialog
          open={true}
          title={dialogs.confirmState.options.title}
          message={dialogs.confirmState.options.message}
          confirmText={dialogs.confirmState.options.confirmText}
          cancelText={dialogs.confirmState.options.cancelText}
          onConfirm={() => dialogs.handleConfirm(true)}
          onCancel={() => dialogs.handleConfirm(false)}
        />
      )}
    </div>
  );
}
