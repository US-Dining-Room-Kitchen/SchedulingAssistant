/**
 * MergeConflictDialog - Displays merge conflicts and allows user resolution
 * 
 * Shows conflicts between working files and provides:
 * - "Keep All from A" / "Keep All from B" quick buttons
 * - "Keep Original" to revert to base
 * - Advanced row-by-row resolution option
 */

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogSurface,
  DialogBody,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  makeStyles,
  tokens,
  Table,
  TableHeader,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Radio,
  RadioGroup,
  Badge,
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionPanel,
  Divider,
  Text,
} from "@fluentui/react-components";
import type { MergeConflict, ConflictResolution } from "../sync/ThreeWayMerge";

const useStyles = makeStyles({
  surface: {
    maxWidth: '900px',
    width: '90vw',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalM,
    maxHeight: '60vh',
    overflowY: 'auto',
  },
  summary: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  quickActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    marginTop: tokens.spacingVerticalS,
  },
  conflictTable: {
    width: '100%',
  },
  cellValue: {
    fontSize: tokens.fontSizeBase200,
    fontFamily: 'monospace',
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  modifiedBy: {
    fontSize: tokens.fontSizeBase100,
    color: tokens.colorNeutralForeground3,
  },
  conflictRow: {
    backgroundColor: tokens.colorPaletteYellowBackground1,
  },
  radioGroup: {
    display: 'flex',
    gap: tokens.spacingHorizontalM,
  },
  actions: {
    display: 'flex',
    gap: tokens.spacingHorizontalS,
    flexWrap: 'wrap',
  },
  warningText: {
    color: tokens.colorPaletteRedForeground1,
  },
});

export interface MergeConflictDialogProps {
  open: boolean;
  conflicts: MergeConflict[];
  userALabel: string; // e.g., "john@company.com"
  userBLabel: string; // e.g., "jane@company.com"
  onResolve: (resolutions: ConflictResolution[]) => void;
  onCancel: () => void;
}

export default function MergeConflictDialog({
  open,
  conflicts,
  userALabel,
  userBLabel,
  onResolve,
  onCancel,
}: MergeConflictDialogProps) {
  const styles = useStyles();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [resolutions, setResolutions] = useState<Record<string, 'base' | 'a' | 'b' | 'both'>>({});

  // Group conflicts by table
  const conflictsByTable = useMemo(() => {
    const grouped: Record<string, MergeConflict[]> = {};
    for (const conflict of conflicts) {
      if (!grouped[conflict.table]) {
        grouped[conflict.table] = [];
      }
      grouped[conflict.table].push(conflict);
    }
    return grouped;
  }, [conflicts]);

  // Set all resolutions to a specific choice
  const setAllResolutions = (choice: 'base' | 'a' | 'b') => {
    const newResolutions: Record<string, 'base' | 'a' | 'b' | 'both'> = {};
    for (const conflict of conflicts) {
      newResolutions[`${conflict.table}:${conflict.syncId}`] = choice;
    }
    setResolutions(newResolutions);
  };

  // Handle quick action buttons
  const handleKeepAllOriginal = () => {
    const allResolutions: ConflictResolution[] = conflicts.map(c => ({
      syncId: c.syncId,
      table: c.table,
      choice: 'base' as const,
    }));
    onResolve(allResolutions);
  };

  const handleKeepAllA = () => {
    const allResolutions: ConflictResolution[] = conflicts.map(c => ({
      syncId: c.syncId,
      table: c.table,
      choice: 'a' as const,
    }));
    onResolve(allResolutions);
  };

  const handleKeepAllB = () => {
    const allResolutions: ConflictResolution[] = conflicts.map(c => ({
      syncId: c.syncId,
      table: c.table,
      choice: 'b' as const,
    }));
    onResolve(allResolutions);
  };

  // Handle advanced merge submit
  const handleAdvancedSubmit = () => {
    const allResolutions: ConflictResolution[] = conflicts.map(c => {
      const key = `${c.table}:${c.syncId}`;
      return {
        syncId: c.syncId,
        table: c.table,
        choice: resolutions[key] || 'base',
      };
    });
    onResolve(allResolutions);
  };

  // Check if all conflicts have a resolution in advanced mode
  const allResolved = conflicts.every(
    c => resolutions[`${c.table}:${c.syncId}`] !== undefined
  );

  // Format a value for display
  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '(empty)';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  // Get the key differences between two rows
  const getDifferences = (rowA: Record<string, unknown> | null, rowB: Record<string, unknown> | null): string[] => {
    if (!rowA || !rowB) return [];
    const diffs: string[] = [];
    const allKeys = new Set([...Object.keys(rowA), ...Object.keys(rowB)]);
    for (const key of allKeys) {
      if (key === 'sync_id' || key === 'modified_at' || key === 'modified_by') continue;
      if (formatValue(rowA[key]) !== formatValue(rowB[key])) {
        diffs.push(key);
      }
    }
    return diffs;
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => !data.open && onCancel()}>
      <DialogSurface className={styles.surface}>
        <DialogBody>
          <DialogTitle>Merge Conflicts Detected</DialogTitle>
          <DialogContent className={styles.content}>
            <div className={styles.summary}>
              <Badge appearance="filled" color="warning">
                {conflicts.length} conflict{conflicts.length !== 1 ? 's' : ''}
              </Badge>
              <Text>
                Changes from both <strong>{userALabel}</strong> and <strong>{userBLabel}</strong> affect the same records.
              </Text>
            </div>

            {!showAdvanced ? (
              <>
                <Text>Choose how to resolve all conflicts:</Text>
                <div className={styles.quickActions}>
                  <Button appearance="outline" onClick={handleKeepAllOriginal}>
                    Keep All Original
                  </Button>
                  <Button appearance="primary" onClick={handleKeepAllA}>
                    Keep All from {userALabel}
                  </Button>
                  <Button appearance="primary" onClick={handleKeepAllB}>
                    Keep All from {userBLabel}
                  </Button>
                </div>
                <Divider />
                <Button appearance="subtle" onClick={() => setShowAdvanced(true)}>
                  Advanced: Resolve individually...
                </Button>
              </>
            ) : (
              <>
                <Button appearance="subtle" onClick={() => setShowAdvanced(false)}>
                  ← Back to quick options
                </Button>
                <div className={styles.quickActions}>
                  <Text size={200}>Set all to:</Text>
                  <Button size="small" onClick={() => setAllResolutions('base')}>Original</Button>
                  <Button size="small" onClick={() => setAllResolutions('a')}>{userALabel}</Button>
                  <Button size="small" onClick={() => setAllResolutions('b')}>{userBLabel}</Button>
                </div>
                <Divider />
                <Accordion multiple collapsible>
                  {Object.entries(conflictsByTable).map(([table, tableConflicts]) => (
                    <AccordionItem key={table} value={table}>
                      <AccordionHeader>
                        {table} ({tableConflicts.length} conflict{tableConflicts.length !== 1 ? 's' : ''})
                      </AccordionHeader>
                      <AccordionPanel>
                        <Table className={styles.conflictTable} size="small">
                          <TableHeader>
                            <TableRow>
                              <TableHeaderCell>Record</TableHeaderCell>
                              <TableHeaderCell>Differences</TableHeaderCell>
                              <TableHeaderCell>Resolution</TableHeaderCell>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tableConflicts.map(conflict => {
                              const key = `${conflict.table}:${conflict.syncId}`;
                              const diffs = getDifferences(conflict.rowA, conflict.rowB);
                              return (
                                <TableRow key={key} className={styles.conflictRow}>
                                  <TableCell>
                                    <div>{conflict.rowDescription}</div>
                                    <div className={styles.modifiedBy}>
                                      A: {conflict.modifiedByA || 'unknown'}<br />
                                      B: {conflict.modifiedByB || 'unknown'}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className={styles.cellValue}>
                                      {diffs.length > 0 ? diffs.join(', ') : 'All fields'}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <RadioGroup
                                      layout="horizontal"
                                      value={resolutions[key] || ''}
                                      onChange={(_, data) => {
                                        setResolutions(prev => ({
                                          ...prev,
                                          [key]: data.value as 'base' | 'a' | 'b',
                                        }));
                                      }}
                                    >
                                      <Radio value="base" label="Original" />
                                      <Radio value="a" label="A" />
                                      <Radio value="b" label="B" />
                                    </RadioGroup>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </AccordionPanel>
                    </AccordionItem>
                  ))}
                </Accordion>
              </>
            )}
          </DialogContent>
          <DialogActions className={styles.actions}>
            <Button appearance="secondary" onClick={onCancel}>
              Cancel Merge
            </Button>
            {showAdvanced && (
              <Button
                appearance="primary"
                onClick={handleAdvancedSubmit}
                disabled={!allResolved}
              >
                Apply Resolutions ({Object.keys(resolutions).length}/{conflicts.length})
              </Button>
            )}
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
