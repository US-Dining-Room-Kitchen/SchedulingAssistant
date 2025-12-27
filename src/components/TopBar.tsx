import * as React from "react";
import { makeStyles, tokens, Text, Tooltip, Toolbar as FluentToolbar, ToolbarButton, ToolbarDivider, Spinner, Menu, MenuTrigger, MenuPopover, MenuList, MenuItem, MenuDivider } from "@fluentui/react-components";
import { Add20Regular, FolderOpen20Regular, Save20Regular, SaveCopy20Regular, QuestionCircle20Regular, ChevronDown20Regular, People20Regular } from "@fluentui/react-icons";
import { isEdgeBrowser } from "../utils/edgeBrowser";
import CopilotHelper from "./CopilotHelper";
import CopilotPromptMenu from "./CopilotPromptMenu";

interface TopBarProps {
  appName?: string;
  ready: boolean;
  sqlDb: any;
  canSave: boolean;
  createNewDb: () => void;
  openDbFromFile: () => void;
  openFolderForSync?: () => void;
  saveDb: () => void;
  saveDbAs: () => void;
  status: string;
  folderSyncActive?: boolean;
}

const useStyles = makeStyles({
  root: {
    position: 'sticky',
    top: 0,
    zIndex: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalM,
    padding: `${tokens.spacingVerticalS} ${tokens.spacingHorizontalM}`,
    borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    backgroundColor: tokens.colorNeutralBackground1,
    flexWrap: 'wrap',
    // Mobile adjustments
    "@media (max-width: 767px)": {
      padding: `${tokens.spacingVerticalXS} ${tokens.spacingHorizontalXS}`,
      gap: tokens.spacingHorizontalXS,
    },
  },
  logo: {
    "@media (max-width: 767px)": {
      width: '24px',
      height: '24px',
    },
  },
  left: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: tokens.spacingHorizontalM,
    minWidth: 0,
    flex: '1 1 auto',
    // Stack on very small screens
    "@media (max-width: 767px)": {
      gap: tokens.spacingHorizontalXS,
    },
  },
  actionsBar: { 
    alignItems: 'center',
    // Hide button text on mobile, show icon only
    "@media (max-width: 767px)": {
      '& button': {
        minWidth: '32px',
        padding: tokens.spacingHorizontalXS,
        '& > span:not(:has(svg))': {
          display: 'none',
        },
      },
    },
  },
  right: { 
    display: 'flex', 
    alignItems: 'center', 
    gap: tokens.spacingHorizontalM,
    minWidth: 0,
    "@media (max-width: 767px)": {
      gap: tokens.spacingHorizontalXS,
      flex: '0 0 auto',
    },
  },
  status: { 
    color: tokens.colorNeutralForeground2, 
    whiteSpace: 'nowrap', 
    overflow: 'hidden', 
    textOverflow: 'ellipsis', 
    minWidth: 0,
    // Hide on mobile screens
    "@media (max-width: 767px)": {
      display: 'none',
    },
  },
  mobileHidden: {
    "@media (max-width: 767px)": {
      display: 'none',
    },
  },
});

export default function TopBar({ appName = 'Scheduler', ready, sqlDb, canSave, createNewDb, openDbFromFile, openFolderForSync, saveDb, saveDbAs, status, folderSyncActive }: TopBarProps){
  const s = useStyles();
  const isEdge = isEdgeBrowser();
  
  const handleHelpClick = () => {
    window.open(`${import.meta.env.BASE_URL}documentation.html`, '_blank', 'noopener,noreferrer');
  };
  
  return (
    <header className={s.root}>
      <div className={s.left}>
        <img src={`${import.meta.env.BASE_URL}favicon-32x32.png`} alt={appName} width={32} height={32} className={s.logo} />
        {!sqlDb && <Tooltip content="No database loaded" relationship="label"><Spinner size="tiny" /></Tooltip>}
        <FluentToolbar aria-label="File actions" className={s.actionsBar} size="small">
          <Tooltip content="New DB" relationship="label">
            <ToolbarButton appearance="primary" icon={<Add20Regular />} onClick={createNewDb}>New</ToolbarButton>
          </Tooltip>
          
          {/* Open dropdown with file and folder options */}
          <Menu>
            <MenuTrigger disableButtonEnhancement>
              <Tooltip content="Open database" relationship="label">
                <ToolbarButton icon={<FolderOpen20Regular />}>
                  Open
                  <ChevronDown20Regular />
                </ToolbarButton>
              </Tooltip>
            </MenuTrigger>
            <MenuPopover>
              <MenuList>
                <MenuItem icon={<FolderOpen20Regular />} onClick={openDbFromFile}>
                  Open File...
                </MenuItem>
                {openFolderForSync && (
                  <>
                    <MenuDivider />
                    <MenuItem icon={<People20Regular />} onClick={openFolderForSync}>
                      Open Shared Folder...
                      <Text size={100} style={{ marginLeft: '8px', opacity: 0.7 }}>(Multi-user)</Text>
                    </MenuItem>
                  </>
                )}
              </MenuList>
            </MenuPopover>
          </Menu>
          
          <ToolbarDivider />
          <Tooltip content={folderSyncActive ? "Save to working file" : "Save"} relationship="label">
            <ToolbarButton icon={<Save20Regular />} onClick={saveDb} disabled={!canSave}>Save</ToolbarButton>
          </Tooltip>
          <Tooltip content="Save As" relationship="label">
            <ToolbarButton icon={<SaveCopy20Regular />} onClick={saveDbAs} disabled={!sqlDb}>Save As</ToolbarButton>
          </Tooltip>
        </FluentToolbar>
      </div>
      <div className={s.right}>
        {isEdge && <CopilotHelper />}
        {isEdge && <CopilotPromptMenu />}
        <FluentToolbar aria-label="Help actions" size="small">
          <Tooltip content="Open documentation" relationship="label">
            <ToolbarButton icon={<QuestionCircle20Regular />} onClick={handleHelpClick}>Help</ToolbarButton>
          </Tooltip>
        </FluentToolbar>
        <Text size={200} className={s.status}>{status}</Text>
      </div>
    </header>
  );
}
