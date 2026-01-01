import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  RadioGroup,
  Radio,
  Text,
  Spinner,
  makeStyles,
  tokens,
  Badge,
} from "@fluentui/react-components";
import { Merge20Regular, Warning20Regular, Checkmark20Regular } from "@fluentui/react-icons";

interface MergeChoice {
  table: string;
  choice: "mine" | "theirs";
}

interface MergeDialogProps {
  open: boolean;
  onClose: () => void;
  myDb: any;
  theirFilename: string;
  theirDb: any;
  onMerge: (choices: MergeChoice[]) => void;
}

// All tables that contain user data (not just "high conflict" - we want to be thorough)
const ALL_DATA_TABLES = [
  { name: "person", label: "People", description: "Staff members" },
  { name: "person_role", label: "Person Roles", description: "Role assignments per person" },
  { name: "person_group", label: "Person Groups", description: "Group memberships" },
  { name: "assignment", label: "Daily Assignments", description: "Who's assigned where each day" },
  { name: "timeoff", label: "Time Off", description: "Vacation and leave entries" },
  { name: "availability_override", label: "Availability Overrides", description: "Per-day availability changes" },
  { name: "monthly_default", label: "Monthly Defaults", description: "Default monthly assignments" },
  { name: "monthly_default_day", label: "Monthly Weekday Overrides", description: "Weekday-specific defaults" },
  { name: "monthly_default_week", label: "Monthly Week Overrides", description: "Week-specific defaults" },
  { name: "role", label: "Roles", description: "Role definitions" },
  { name: "segment", label: "Segments", description: "Time segments (AM, PM, etc.)" },
  { name: "segment_role", label: "Segment Roles", description: "Roles available per segment" },
  { name: "segment_adjustment", label: "Segment Adjustments", description: "Segment time adjustments" },
  { name: "segment_adjustment_condition", label: "Adjustment Conditions", description: "When adjustments apply" },
  { name: "groups", label: "Groups", description: "Group definitions" },
  { name: "export_group", label: "Export Groups", description: "Export configurations" },
  { name: "department_event", label: "Department Events", description: "Department-wide events" },
  { name: "training", label: "Training", description: "Training records" },
  { name: "skill", label: "Skills", description: "Skill definitions" },
  { name: "person_skill", label: "Person Skills", description: "Skills per person" },
];

interface TableDiff {
  table: string;
  label: string;
  myCount: number;
  theirCount: number;
  hasDifferences: boolean;
  differenceType: "none" | "count" | "content";
  differenceDetails: string;
}

const useStyles = makeStyles({
  tableSection: {
    padding: tokens.spacingVerticalM,
    marginBottom: tokens.spacingVerticalS,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground2,
  },
  tableSectionDiff: {
    border: `1px solid ${tokens.colorPaletteYellowBorder2}`,
    backgroundColor: tokens.colorPaletteYellowBackground1,
  },
  tableName: {
    fontWeight: tokens.fontWeightSemibold,
    marginBottom: tokens.spacingVerticalXS,
    display: "flex",
    alignItems: "center",
    gap: tokens.spacingHorizontalS,
  },
  counts: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
    marginBottom: tokens.spacingVerticalS,
  },
  diffDetails: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorPaletteYellowForeground2,
    marginBottom: tokens.spacingVerticalS,
    fontStyle: "italic",
  },
  noDifferences: {
    textAlign: "center",
    padding: tokens.spacingVerticalL,
    color: tokens.colorNeutralForeground3,
  },
  loadingContainer: {
    textAlign: "center",
    padding: tokens.spacingVerticalXXL,
  },
  sameCount: {
    color: tokens.colorNeutralForeground3,
    fontStyle: "italic",
  },
  summary: {
    padding: tokens.spacingVerticalM,
    marginBottom: tokens.spacingVerticalM,
    border: `1px solid ${tokens.colorNeutralStroke2}`,
    borderRadius: tokens.borderRadiusMedium,
    backgroundColor: tokens.colorNeutralBackground3,
  },
  scrollContainer: {
    maxHeight: "400px",
    overflowY: "auto",
  },
});

export default function MergeDialog({
  open,
  onClose,
  myDb,
  theirFilename,
  theirDb,
  onMerge,
}: MergeDialogProps) {
  const styles = useStyles();
  const [loading, setLoading] = useState(true);
  const [tableDiffs, setTableDiffs] = useState<TableDiff[]>([]);
  const [choices, setChoices] = useState<Record<string, "mine" | "theirs">>({});

  useEffect(() => {
    if (open && myDb && theirDb) {
      analyzeDbDifferences();
    }
  }, [open, myDb, theirDb]);

  function hashRow(row: any[]): string {
    return JSON.stringify(row);
  }

  function analyzeDbDifferences() {
    setLoading(true);
    const diffs: TableDiff[] = [];
    const initialChoices: Record<string, "mine" | "theirs"> = {};

    for (const table of ALL_DATA_TABLES) {
      try {
        // Get row counts
        const myCountResult = myDb.exec(`SELECT COUNT(*) FROM ${table.name}`);
        const theirCountResult = theirDb.exec(`SELECT COUNT(*) FROM ${table.name}`);
        const myCount = (myCountResult[0]?.values[0]?.[0] as number) || 0;
        const theirCount = (theirCountResult[0]?.values[0]?.[0] as number) || 0;

        let hasDifferences = false;
        let differenceType: "none" | "count" | "content" = "none";
        let differenceDetails = "";

        if (myCount !== theirCount) {
          hasDifferences = true;
          differenceType = "count";
          const diff = theirCount - myCount;
          differenceDetails = diff > 0 
            ? `Their version has ${diff} more row(s)` 
            : `Your version has ${Math.abs(diff)} more row(s)`;
        } else if (myCount > 0) {
          // Same count - check actual content
          try {
            const myRows = myDb.exec(`SELECT * FROM ${table.name} ORDER BY 1`);
            const theirRows = theirDb.exec(`SELECT * FROM ${table.name} ORDER BY 1`);
            
            if (myRows[0] && theirRows[0]) {
              const myHashes = new Set(myRows[0].values.map(hashRow));
              const theirHashes = new Set(theirRows[0].values.map(hashRow));
              
              // Find differences
              let onlyInMine = 0;
              let onlyInTheirs = 0;
              
              for (const hash of myHashes) {
                if (!theirHashes.has(hash)) onlyInMine++;
              }
              for (const hash of theirHashes) {
                if (!myHashes.has(hash)) onlyInTheirs++;
              }
              
              if (onlyInMine > 0 || onlyInTheirs > 0) {
                hasDifferences = true;
                differenceType = "content";
                differenceDetails = `${onlyInMine} row(s) only in yours, ${onlyInTheirs} row(s) only in theirs`;
              }
            }
          } catch (e) {
            // Content comparison failed, fall back to count comparison
            console.warn(`[Merge] Content comparison failed for ${table.name}:`, e);
          }
        }

        diffs.push({
          table: table.name,
          label: table.label,
          myCount,
          theirCount,
          hasDifferences,
          differenceType,
          differenceDetails,
        });
        
        // Default to keeping mine
        initialChoices[table.name] = "mine";
      } catch (e) {
        // Table might not exist in one of the databases
        console.warn(`[Merge] Could not compare table ${table.name}:`, e);
      }
    }

    setTableDiffs(diffs);
    setChoices(initialChoices);
    setLoading(false);
  }

  function handleChoiceChange(table: string, value: "mine" | "theirs") {
    setChoices((prev) => ({ ...prev, [table]: value }));
  }

  function handleMerge() {
    const mergeChoices = Object.entries(choices).map(([table, choice]) => ({
      table,
      choice,
    }));
    onMerge(mergeChoices);
  }

  const tablesWithDifferences = tableDiffs.filter((t) => t.hasDifferences);
  const tablesWithoutDifferences = tableDiffs.filter((t) => !t.hasDifferences);

  // Extract username from filename
  const theirUser = theirFilename.match(/schedule-[^-]+-[^-]+-([^.]+)\.db/)?.[1]?.replace(/-/g, ' ') || 'Other user';

  return (
    <Dialog open={open} onOpenChange={(_, d) => !d.open && onClose()}>
      <DialogSurface style={{ maxWidth: "600px" }}>
        <DialogBody>
          <DialogTitle>
            <div style={{ display: "flex", alignItems: "center", gap: tokens.spacingHorizontalS }}>
              <Merge20Regular />
              Merge Changes from {theirUser}
            </div>
          </DialogTitle>
          <DialogContent>
            {loading ? (
              <div className={styles.loadingContainer}>
                <Spinner size="medium" />
                <Text block style={{ marginTop: tokens.spacingVerticalM }}>
                  Analyzing all tables for differences...
                </Text>
              </div>
            ) : (
              <>
                {/* Summary */}
                <div className={styles.summary}>
                  <Text weight="semibold" block>
                    Comparison Summary
                  </Text>
                  <Text size={200} block style={{ marginTop: tokens.spacingVerticalXS }}>
                    Scanned {tableDiffs.length} tables: {" "}
                    <Badge color="warning" appearance="filled">{tablesWithDifferences.length} with differences</Badge>
                    {" "}
                    <Badge color="success" appearance="tint">{tablesWithoutDifferences.length} identical</Badge>
                  </Text>
                </div>

                {tablesWithDifferences.length === 0 ? (
                  <div className={styles.noDifferences}>
                    <Checkmark20Regular style={{ color: tokens.colorPaletteGreenForeground1 }} />
                    <Text block style={{ marginTop: tokens.spacingVerticalS }}>
                      No differences detected in any tables!
                    </Text>
                    <Text size={200} block style={{ marginTop: tokens.spacingVerticalS }}>
                      The databases appear to be identical. You can close this dialog.
                    </Text>
                  </div>
                ) : (
                  <>
                    <Text block style={{ marginBottom: tokens.spacingVerticalM }}>
                      Choose which version to keep for each table with differences:
                    </Text>
                    <div className={styles.scrollContainer}>
                      {tablesWithDifferences.map((table) => (
                        <div 
                          key={table.table} 
                          className={`${styles.tableSection} ${styles.tableSectionDiff}`}
                        >
                          <div className={styles.tableName}>
                            <Warning20Regular style={{ color: tokens.colorPaletteYellowForeground1 }} />
                            <Text weight="semibold">{table.label}</Text>
                          </div>
                          <Text className={styles.counts}>
                            Your version: {table.myCount} rows | {theirUser}: {table.theirCount} rows
                          </Text>
                          {table.differenceDetails && (
                            <Text className={styles.diffDetails}>
                              {table.differenceDetails}
                            </Text>
                          )}
                          <RadioGroup
                            value={choices[table.table]}
                            onChange={(_, data) => handleChoiceChange(table.table, data.value as "mine" | "theirs")}
                            layout="horizontal"
                          >
                            <Radio value="mine" label="Keep mine" />
                            <Radio value="theirs" label="Use theirs" />
                          </RadioGroup>
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {tablesWithoutDifferences.length > 0 && tablesWithDifferences.length > 0 && (
                  <Text size={200} className={styles.sameCount} block style={{ marginTop: tokens.spacingVerticalM }}>
                    Identical tables (no action needed): {tablesWithoutDifferences.map(t => t.label).join(', ')}
                  </Text>
                )}
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={onClose}>
              Cancel
            </Button>
            {tablesWithDifferences.length > 0 && (
              <Button
                appearance="primary"
                icon={<Merge20Regular />}
                onClick={handleMerge}
                disabled={loading}
              >
                Merge & Save
              </Button>
            )}
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
