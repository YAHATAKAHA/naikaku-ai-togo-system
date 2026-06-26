import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  Download,
  CircleStop,
  Cloud,
  Cpu,
  FileKey2,
  GitBranch,
  Languages,
  Play,
  RefreshCcw,
  Save,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Upload
} from "lucide-react";
import { AuditTrailPanel } from "./components/AuditTrailPanel";
import { AutomationQueue } from "./components/AutomationQueue";
import { AutomationRunbookPanel } from "./components/AutomationRunbookPanel";
import { CodingAgentBriefsPanel } from "./components/CodingAgentBriefsPanel";
import { DevelopmentBoardPanel } from "./components/DevelopmentBoardPanel";
import { DevelopmentIssuesPanel } from "./components/DevelopmentIssuesPanel";
import { MemoryInboxPanel } from "./components/MemoryInboxPanel";
import { MissionControl } from "./components/MissionControl";
import { ProviderReadinessPanel } from "./components/ProviderReadinessPanel";
import { ProductReadinessPanel } from "./components/ProductReadinessPanel";
import { ReleaseRehearsalPanel } from "./components/ReleaseRehearsalPanel";
import { RoleInspector } from "./components/RoleInspector";
import { RoleRail } from "./components/RoleRail";
import { RunLog } from "./components/RunLog";
import { SandboxCapabilityPanel } from "./components/SandboxCapabilityPanel";
import { SandboxPanel } from "./components/SandboxPanel";
import { ServerLedgerPanel } from "./components/ServerLedgerPanel";
import { TeamHandoffPanel } from "./components/TeamHandoffPanel";
import {
  addRunHistoryItem,
  appendAuditEvent,
  clearAuditEvents,
  clearCurrentRun,
  clearDevelopmentItems,
  clearRunHistory,
  createDefaultWorkspace,
  loadAuditEvents,
  loadDevelopmentItems,
  loadMemoryEntries,
  loadApprovalRecords,
  loadCurrentRun,
  loadProviderReadinessRows,
  loadRunHistory,
  loadWorkspace,
  parseWorkspaceExport,
  saveApprovalRecord,
  saveCurrentRun,
  saveDevelopmentWorkItem,
  saveMemoryEntry,
  saveProviderReadinessRow,
  saveWorkspace,
  serializeAuditLog,
  serializeCodingAgentBriefReviewExport,
  serializeAutomationRunbookExport,
  serializeCodingAgentBriefsExport,
  serializeCodingAgentBriefsMarkdownExport,
  serializeCodingAgentSessionBundleExport,
  serializeCodingAgentSessionBundleMarkdownExport,
  serializeCodingAgentSessionDrillExport,
  serializeCodingAgentSessionDrillMarkdownExport,
  serializeCodingAgentImplementationEvidenceExport,
  serializeCodingAgentImplementationEvidenceMarkdownExport,
  serializeCodingAgentSessionReceiptExport,
  serializeCodingAgentSessionReceiptMarkdownExport,
  serializeDevelopmentBoardExport,
  serializeDevelopmentIssueDraftsExport,
  serializeDevelopmentIssueGhScriptExport,
  serializeExecutorEvidenceExport,
  serializeMemoryLog,
  serializeProviderReadinessExport,
  serializeProductReadinessExport,
  serializeProductReleaseBundleExport,
  serializeProductReleaseNotesExport,
  serializeReleaseRehearsalExport,
  serializeReleaseVerificationExport,
  serializeRoleWorkspaceScaffoldScriptExport,
  serializeRunBundle,
  serializeWorkspace
} from "./domain/storage";
import { approvalRecordsByActionId, buildExecutorHandoff, createApprovalRecord } from "./domain/automation";
import { buildAutomationRunbook } from "./domain/automationRunbook";
import { createAuditEvent } from "./domain/auditLog";
import { buildCodingAgentBriefReview } from "./domain/codingAgentBriefReview";
import { buildCodingAgentBriefs } from "./domain/codingAgentBriefs";
import { auditCodingAgentImplementationArtifacts } from "./domain/codingAgentImplementationArtifactAudit";
import { buildCodingAgentImplementationEvidence } from "./domain/codingAgentImplementationEvidence";
import { reconcileCodingAgentImplementationEvidence } from "./domain/codingAgentImplementationReconciliation";
import { buildCodingAgentSessionBundle } from "./domain/codingAgentSessionBundle";
import { buildCodingAgentSessionDrill } from "./domain/codingAgentSessionDrill";
import { buildCodingAgentSessionReceiptTemplate, reviewCodingAgentSessionReceipt } from "./domain/codingAgentSessionReceipt";
import { executorProfiles } from "./data/defaultCabinet";
import { buildDevelopmentBoard, updateDevelopmentWorkItemStatus } from "./domain/developmentBoard";
import { buildDevelopmentIssueDrafts } from "./domain/developmentIssues";
import { buildExecutorEvidenceBundle, runExecutorHandoff } from "./domain/executorRunner";
import { findAdapter } from "./domain/adapters";
import { buildMemoryCandidates, createMemoryDecision } from "./domain/memory";
import { runCabinetMission } from "./domain/orchestrator";
import { buildProductReadinessReport } from "./domain/productReadiness";
import { buildProductReleaseBundle } from "./domain/productReleaseBundle";
import { buildProviderReadinessMatrix, createProviderReadinessCheck } from "./domain/providerReadiness";
import { buildReleaseRehearsalReport } from "./domain/releaseRehearsal";
import { buildReleaseRemediationIssueDrafts } from "./domain/releaseRemediationIssues";
import { buildReleaseVerification } from "./domain/releaseVerification";
import { buildRoleWorkspaceScaffolds } from "./domain/roleWorkspaceScaffolds";
import { buildSandboxCapabilityRegistry } from "./domain/sandboxCapabilities";
import { createCustomRole, isDefaultRoleId } from "./domain/roles";
import { buildTeamHandoff, serializeTeamHandoff } from "./domain/teamPackages";
import { getCopy, getInitialLocale, htmlLang, saveLocale, supportedLocales, type SupportedLocale } from "./i18n";
import {
  auditCodingAgentImplementationArtifactsViaGateway,
  createAutomationRunbookViaGateway,
  createCodingAgentBriefsViaGateway,
  createCodingAgentImplementationEvidenceViaGateway,
  createCodingAgentSessionBundleViaGateway,
  createCodingAgentSessionDrillViaGateway,
  createCodingAgentSessionReceiptTemplateViaGateway,
  createDevelopmentIssuesViaGateway,
  createExecutorEvidenceViaGateway,
  createProductReadinessViaGateway,
  createProductReleaseBundleViaGateway,
  createReleaseVerificationViaGateway,
  createRoleWorkspaceScaffoldsViaGateway,
  createTeamHandoffViaGateway,
  gatewayBaseUrl,
  getLedgerSummaryViaGateway,
  listApprovalLedgerViaGateway,
  listEvidenceLedgerViaGateway,
  reviewCodingAgentBriefsViaGateway,
  reviewCodingAgentSessionReceiptViaGateway,
  runCabinetViaGateway,
  runExecutorHandoffViaGateway,
  saveApprovalRecordViaGateway,
  testProviderViaGateway
} from "./domain/gatewayClient";
import type { LedgerSummary } from "./domain/gatewayClient";
import type {
  AutomationAction,
  AutomationApprovalDecision,
  AutomationApprovalRecord,
  AutomationRunbook,
  AuditEvent,
  CabinetRole,
  CabinetRun,
  CodingAgentBriefReviewReport,
  CodingAgentBriefs,
  CodingAgentImplementationArtifactAudit,
  CodingAgentImplementationEvidence,
  CodingAgentImplementationReconciliation,
  CodingAgentSessionBundle,
  CodingAgentSessionDrillReport,
  CodingAgentSessionReceipt,
  DevelopmentIssueDrafts,
  DevelopmentWorkItem,
  DevelopmentWorkItemStatus,
  ExecutorEvidenceBundle,
  ExecutorRun,
  MemoryEntry,
  ProviderConfig,
  ProviderReadinessRow,
  ProductReadinessReport,
  ProductReleaseBundle,
  ReleaseRehearsalReport,
  ReleaseVerificationReport,
  RoleWorkspaceScaffolds,
  RunHistoryItem,
  TeamHandoff
} from "./domain/types";
import type { CabinetRunMode } from "./domain/types";

type AuditEventInput = Parameters<typeof createAuditEvent>[0];

interface ServerLedgerState {
  status: "idle" | "loading" | "ready" | "error";
  message: string;
  summary: LedgerSummary | null;
  approvals: AutomationApprovalRecord[];
  evidenceBundles: ExecutorEvidenceBundle[];
  evidenceMessage?: string;
}

export function App() {
  const [locale, setLocale] = useState<SupportedLocale>(() => getInitialLocale());
  const copy = useMemo(() => getCopy(locale), [locale]);
  const [workspace, setWorkspace] = useState(() => loadWorkspace());
  const [selectedRoleId, setSelectedRoleId] = useState(workspace.roles[0]?.id || "");
  const [sessionSecrets, setSessionSecrets] = useState<Record<string, string>>({});
  const [run, setRun] = useState<CabinetRun | null>(() => loadCurrentRun());
  const [runMode, setRunMode] = useState<CabinetRunMode>("dry-run");
  const [approvalRecords, setApprovalRecords] = useState<AutomationApprovalRecord[]>([]);
  const [executorRun, setExecutorRun] = useState<ExecutorRun | null>(null);
  const [executorRunning, setExecutorRunning] = useState(false);
  const [runHistory, setRunHistory] = useState<RunHistoryItem[]>(() => loadRunHistory());
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(() => loadAuditEvents());
  const [memoryEntries, setMemoryEntries] = useState<MemoryEntry[]>(() => loadMemoryEntries());
  const [developmentItems, setDevelopmentItems] = useState<DevelopmentWorkItem[]>(() => loadDevelopmentItems());
  const [providerReadinessRows, setProviderReadinessRows] = useState<ProviderReadinessRow[]>(() => loadProviderReadinessRows());
  const [testingProviderRoleIds, setTestingProviderRoleIds] = useState<string[]>([]);
  const [isTestingAllProviders, setIsTestingAllProviders] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");
  const [runState, setRunState] = useState<{
    status: "idle" | "running" | "gateway" | "fallback" | "local" | "error";
    message: string;
  }>({ status: "idle", message: getCopy(locale).gatewayReady });
  const [exportLink, setExportLink] = useState<{ href: string; fileName: string } | null>(null);
  const [handoffLink, setHandoffLink] = useState<{ href: string; fileName: string } | null>(null);
  const [automationRunbookLink, setAutomationRunbookLink] = useState<{ href: string; fileName: string } | null>(null);
  const [teamHandoffLink, setTeamHandoffLink] = useState<{ href: string; fileName: string } | null>(null);
  const [roleWorkspaceLink, setRoleWorkspaceLink] = useState<{ href: string; fileName: string } | null>(null);
  const [productReadinessLink, setProductReadinessLink] = useState<{ href: string; fileName: string } | null>(null);
  const [productReleaseLink, setProductReleaseLink] = useState<{ href: string; fileName: string } | null>(null);
  const [productReleaseNotesLink, setProductReleaseNotesLink] = useState<{ href: string; fileName: string } | null>(null);
  const [releaseRehearsal, setReleaseRehearsal] = useState<ReleaseRehearsalReport | null>(null);
  const [releaseRehearsalLink, setReleaseRehearsalLink] = useState<{ href: string; fileName: string } | null>(null);
  const [releaseVerification, setReleaseVerification] = useState<ReleaseVerificationReport | null>(null);
  const [releaseVerificationLink, setReleaseVerificationLink] = useState<{ href: string; fileName: string } | null>(null);
  const [releaseRemediationIssuesLink, setReleaseRemediationIssuesLink] = useState<{ href: string; fileName: string } | null>(null);
  const [releaseRemediationScriptLink, setReleaseRemediationScriptLink] = useState<{ href: string; fileName: string } | null>(null);
  const [auditLink, setAuditLink] = useState<{ href: string; fileName: string } | null>(null);
  const [memoryLink, setMemoryLink] = useState<{ href: string; fileName: string } | null>(null);
  const [developmentBoardLink, setDevelopmentBoardLink] = useState<{ href: string; fileName: string } | null>(null);
  const [codingAgentBriefsLink, setCodingAgentBriefsLink] = useState<{ href: string; fileName: string } | null>(null);
  const [codingAgentBriefsMarkdownLink, setCodingAgentBriefsMarkdownLink] = useState<{ href: string; fileName: string } | null>(null);
  const [codingAgentBriefReview, setCodingAgentBriefReview] = useState<CodingAgentBriefReviewReport | null>(null);
  const [codingAgentBriefReviewLink, setCodingAgentBriefReviewLink] = useState<{ href: string; fileName: string } | null>(null);
  const [codingAgentSessionBundle, setCodingAgentSessionBundle] = useState<CodingAgentSessionBundle | null>(null);
  const [codingAgentSessionBundleLink, setCodingAgentSessionBundleLink] = useState<{ href: string; fileName: string } | null>(null);
  const [codingAgentSessionBundleMarkdownLink, setCodingAgentSessionBundleMarkdownLink] = useState<{ href: string; fileName: string } | null>(null);
  const [codingAgentSessionDrill, setCodingAgentSessionDrill] = useState<CodingAgentSessionDrillReport | null>(null);
  const [codingAgentSessionDrillLink, setCodingAgentSessionDrillLink] = useState<{ href: string; fileName: string } | null>(null);
  const [codingAgentSessionDrillMarkdownLink, setCodingAgentSessionDrillMarkdownLink] = useState<{ href: string; fileName: string } | null>(null);
  const [codingAgentSessionReceipt, setCodingAgentSessionReceipt] = useState<CodingAgentSessionReceipt | null>(null);
  const [codingAgentSessionReceiptLink, setCodingAgentSessionReceiptLink] = useState<{ href: string; fileName: string } | null>(null);
  const [codingAgentSessionReceiptMarkdownLink, setCodingAgentSessionReceiptMarkdownLink] = useState<{ href: string; fileName: string } | null>(null);
  const [codingAgentImplementationEvidenceLink, setCodingAgentImplementationEvidenceLink] = useState<{ href: string; fileName: string } | null>(null);
  const [codingAgentImplementationEvidenceMarkdownLink, setCodingAgentImplementationEvidenceMarkdownLink] = useState<{ href: string; fileName: string } | null>(null);
  const [developmentIssuesLink, setDevelopmentIssuesLink] = useState<{ href: string; fileName: string } | null>(null);
  const [developmentIssuesScriptLink, setDevelopmentIssuesScriptLink] = useState<{ href: string; fileName: string } | null>(null);
  const [providerReadinessLink, setProviderReadinessLink] = useState<{ href: string; fileName: string } | null>(null);
  const [executorEvidenceLink, setExecutorEvidenceLink] = useState<{ href: string; fileName: string } | null>(null);
  const [serverLedger, setServerLedger] = useState<ServerLedgerState>({
    status: "idle",
    message: "Refresh gateway ledger when the local service is running.",
    summary: null,
    approvals: [],
    evidenceBundles: []
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const preserveCodingAgentBriefReviewRef = useRef(false);

  useEffect(() => {
    saveLocale(locale);
  }, [locale]);

  const selectedRole = useMemo(
    () => workspace.roles.find((role) => role.id === selectedRoleId) || workspace.roles[0],
    [selectedRoleId, workspace.roles]
  );

  const activeRoles = workspace.roles.filter((role) => role.enabled);
  const approvalRecordsByAction = useMemo(
    () => Object.fromEntries(approvalRecordsByActionId(approvalRecords)),
    [approvalRecords]
  );
  const readyActionCount = useMemo(
    () =>
      run
        ? buildExecutorHandoff({
            run,
            approvalRecords,
            createdAt: run.completedAt
          }).readyActions.length
        : 0,
    [approvalRecords, run]
  );
  const automationRunbook = useMemo<AutomationRunbook>(
    () =>
      run
        ? buildAutomationRunbook({
            run,
            approvalRecords,
            generatedAt: run.completedAt
          })
        : {
            schema: "naikaku.automation-runbook.v1",
            generatedAt: "",
            runId: "",
            handoffId: "",
            steps: [],
            heldActions: [],
            summary: {
              ready: 0,
              held: 0,
              approvalGated: 0,
              shell: 0,
              browser: 0,
              desktop: 0,
              mcp: 0,
              human: 0
            }
          },
    [approvalRecords, run]
  );
  const teamHandoff = useMemo(
    () => buildTeamHandoff({ workspace, run }),
    [run, workspace]
  );
  const roleWorkspaceScaffolds = useMemo<RoleWorkspaceScaffolds>(
    () => buildRoleWorkspaceScaffolds({ handoff: teamHandoff }),
    [teamHandoff]
  );
  const memoryCandidates = useMemo(
    () => (run ? buildMemoryCandidates({ run }) : []),
    [run]
  );
  const providerReadinessMatrix = useMemo(
    () =>
      buildProviderReadinessMatrix({
        roles: workspace.roles,
        sessionSecrets,
        savedRows: providerReadinessRows
      }),
    [providerReadinessRows, sessionSecrets, workspace.roles]
  );
  const sandboxCapabilityRegistry = useMemo(
    () =>
      buildSandboxCapabilityRegistry({
        profiles: executorProfiles,
        roles: workspace.roles,
        sandboxPolicy: workspace.sandboxPolicy
      }),
    [workspace.roles, workspace.sandboxPolicy]
  );
  const developmentBoard = useMemo(
    () =>
      buildDevelopmentBoard({
        handoff: teamHandoff,
        run,
        memoryEntries,
        savedItems: developmentItems
      }),
    [developmentItems, memoryEntries, run, teamHandoff]
  );
  const developmentIssueDrafts = useMemo<DevelopmentIssueDrafts>(
    () =>
      buildDevelopmentIssueDrafts({
        board: developmentBoard,
        generatedAt: developmentBoard.generatedAt
      }),
    [developmentBoard]
  );
  const codingAgentBriefs = useMemo<CodingAgentBriefs>(
    () =>
      buildCodingAgentBriefs({
        board: developmentBoard,
        operatorLocale: locale,
        releaseVerification
      }),
    [developmentBoard, locale, releaseVerification]
  );
  const productReadinessReport = useMemo<ProductReadinessReport>(
    () =>
      buildProductReadinessReport({
        workspace,
        run,
        providerReadiness: providerReadinessMatrix,
        sandboxCapabilities: sandboxCapabilityRegistry,
        automationRunbook,
        teamHandoff,
        roleWorkspaces: roleWorkspaceScaffolds,
        developmentBoard,
        issueDrafts: developmentIssueDrafts,
        approvalRecords,
        auditEvents,
        memoryEntries
      }),
    [
      approvalRecords,
      auditEvents,
      automationRunbook,
      developmentBoard,
      developmentIssueDrafts,
      memoryEntries,
      providerReadinessMatrix,
      roleWorkspaceScaffolds,
      run,
      sandboxCapabilityRegistry,
      teamHandoff,
      workspace
    ]
  );
  const productReleaseBundle = useMemo<ProductReleaseBundle>(
    () =>
      buildProductReleaseBundle({
        workspace,
        run,
        providerReadiness: providerReadinessMatrix,
        productReadiness: productReadinessReport,
        automationRunbook,
        teamHandoff,
        roleWorkspaces: roleWorkspaceScaffolds,
        developmentBoard,
        issueDrafts: developmentIssueDrafts,
        approvalRecords,
        auditEvents,
        memoryEntries
      }),
    [
      approvalRecords,
      auditEvents,
      automationRunbook,
      developmentBoard,
      developmentIssueDrafts,
      memoryEntries,
      productReadinessReport,
      providerReadinessMatrix,
      roleWorkspaceScaffolds,
      run,
      teamHandoff,
      workspace
    ]
  );

  useEffect(() => {
    return () => {
      if (exportLink) {
        URL.revokeObjectURL(exportLink.href);
      }
    };
  }, [exportLink]);

  useEffect(() => {
    return () => {
      if (handoffLink) {
        URL.revokeObjectURL(handoffLink.href);
      }
    };
  }, [handoffLink]);

  useEffect(() => {
    return () => {
      if (automationRunbookLink) {
        URL.revokeObjectURL(automationRunbookLink.href);
      }
    };
  }, [automationRunbookLink]);

  useEffect(() => {
    return () => {
      if (teamHandoffLink) {
        URL.revokeObjectURL(teamHandoffLink.href);
      }
    };
  }, [teamHandoffLink]);

  useEffect(() => {
    return () => {
      if (roleWorkspaceLink) {
        URL.revokeObjectURL(roleWorkspaceLink.href);
      }
    };
  }, [roleWorkspaceLink]);

  useEffect(() => {
    return () => {
      if (productReadinessLink) {
        URL.revokeObjectURL(productReadinessLink.href);
      }
    };
  }, [productReadinessLink]);

  useEffect(() => {
    return () => {
      if (productReleaseLink) {
        URL.revokeObjectURL(productReleaseLink.href);
      }
    };
  }, [productReleaseLink]);

  useEffect(() => {
    return () => {
      if (productReleaseNotesLink) {
        URL.revokeObjectURL(productReleaseNotesLink.href);
      }
    };
  }, [productReleaseNotesLink]);

  useEffect(() => {
    return () => {
      if (releaseRehearsalLink) {
        URL.revokeObjectURL(releaseRehearsalLink.href);
      }
    };
  }, [releaseRehearsalLink]);

  useEffect(() => {
    return () => {
      if (releaseVerificationLink) {
        URL.revokeObjectURL(releaseVerificationLink.href);
      }
    };
  }, [releaseVerificationLink]);

  useEffect(() => {
    return () => {
      if (releaseRemediationIssuesLink) {
        URL.revokeObjectURL(releaseRemediationIssuesLink.href);
      }
    };
  }, [releaseRemediationIssuesLink]);

  useEffect(() => {
    return () => {
      if (releaseRemediationScriptLink) {
        URL.revokeObjectURL(releaseRemediationScriptLink.href);
      }
    };
  }, [releaseRemediationScriptLink]);

  useEffect(() => {
    return () => {
      if (auditLink) {
        URL.revokeObjectURL(auditLink.href);
      }
    };
  }, [auditLink]);

  useEffect(() => {
    return () => {
      if (memoryLink) {
        URL.revokeObjectURL(memoryLink.href);
      }
    };
  }, [memoryLink]);

  useEffect(() => {
    return () => {
      if (developmentBoardLink) {
        URL.revokeObjectURL(developmentBoardLink.href);
      }
    };
  }, [developmentBoardLink]);

  useEffect(() => {
    return () => {
      if (codingAgentBriefsLink) {
        URL.revokeObjectURL(codingAgentBriefsLink.href);
      }
    };
  }, [codingAgentBriefsLink]);

  useEffect(() => {
    return () => {
      if (codingAgentBriefsMarkdownLink) {
        URL.revokeObjectURL(codingAgentBriefsMarkdownLink.href);
      }
    };
  }, [codingAgentBriefsMarkdownLink]);

  useEffect(() => {
    return () => {
      if (codingAgentBriefReviewLink) {
        URL.revokeObjectURL(codingAgentBriefReviewLink.href);
      }
    };
  }, [codingAgentBriefReviewLink]);

  useEffect(() => {
    return () => {
      if (codingAgentSessionBundleLink) {
        URL.revokeObjectURL(codingAgentSessionBundleLink.href);
      }
    };
  }, [codingAgentSessionBundleLink]);

  useEffect(() => {
    return () => {
      if (codingAgentSessionBundleMarkdownLink) {
        URL.revokeObjectURL(codingAgentSessionBundleMarkdownLink.href);
      }
    };
  }, [codingAgentSessionBundleMarkdownLink]);

  useEffect(() => {
    return () => {
      if (codingAgentSessionDrillLink) {
        URL.revokeObjectURL(codingAgentSessionDrillLink.href);
      }
    };
  }, [codingAgentSessionDrillLink]);

  useEffect(() => {
    return () => {
      if (codingAgentSessionDrillMarkdownLink) {
        URL.revokeObjectURL(codingAgentSessionDrillMarkdownLink.href);
      }
    };
  }, [codingAgentSessionDrillMarkdownLink]);

  useEffect(() => {
    return () => {
      if (codingAgentSessionReceiptLink) {
        URL.revokeObjectURL(codingAgentSessionReceiptLink.href);
      }
    };
  }, [codingAgentSessionReceiptLink]);

  useEffect(() => {
    return () => {
      if (codingAgentSessionReceiptMarkdownLink) {
        URL.revokeObjectURL(codingAgentSessionReceiptMarkdownLink.href);
      }
    };
  }, [codingAgentSessionReceiptMarkdownLink]);

  useEffect(() => {
    return () => {
      if (codingAgentImplementationEvidenceLink) {
        URL.revokeObjectURL(codingAgentImplementationEvidenceLink.href);
      }
    };
  }, [codingAgentImplementationEvidenceLink]);

  useEffect(() => {
    return () => {
      if (codingAgentImplementationEvidenceMarkdownLink) {
        URL.revokeObjectURL(codingAgentImplementationEvidenceMarkdownLink.href);
      }
    };
  }, [codingAgentImplementationEvidenceMarkdownLink]);

  useEffect(() => {
    if (preserveCodingAgentBriefReviewRef.current) {
      preserveCodingAgentBriefReviewRef.current = false;
      return;
    }
    clearCodingAgentBriefReview();
  }, [codingAgentBriefs]);

  useEffect(() => {
    return () => {
      if (developmentIssuesLink) {
        URL.revokeObjectURL(developmentIssuesLink.href);
      }
    };
  }, [developmentIssuesLink]);

  useEffect(() => {
    return () => {
      if (developmentIssuesScriptLink) {
        URL.revokeObjectURL(developmentIssuesScriptLink.href);
      }
    };
  }, [developmentIssuesScriptLink]);

  useEffect(() => {
    return () => {
      if (providerReadinessLink) {
        URL.revokeObjectURL(providerReadinessLink.href);
      }
    };
  }, [providerReadinessLink]);

  useEffect(() => {
    return () => {
      if (executorEvidenceLink) {
        URL.revokeObjectURL(executorEvidenceLink.href);
      }
    };
  }, [executorEvidenceLink]);

  useEffect(() => {
    setApprovalRecords(run ? loadApprovalRecords(run.id) : []);
    setHandoffLink(null);
    setAutomationRunbookLink(null);
    setExecutorRun(null);
    setMemoryLink(null);
    setDevelopmentBoardLink(null);
    setCodingAgentBriefsLink(null);
    setCodingAgentBriefsMarkdownLink(null);
    setCodingAgentBriefReview(null);
    setCodingAgentBriefReviewLink(null);
    setCodingAgentSessionBundle(null);
    setCodingAgentSessionBundleLink(null);
    setCodingAgentSessionBundleMarkdownLink(null);
    setCodingAgentSessionDrill(null);
    setCodingAgentSessionDrillLink(null);
    setCodingAgentSessionDrillMarkdownLink(null);
    setCodingAgentSessionReceipt(null);
    setCodingAgentSessionReceiptLink(null);
    setCodingAgentSessionReceiptMarkdownLink(null);
    setDevelopmentIssuesLink(null);
    setDevelopmentIssuesScriptLink(null);
    setRoleWorkspaceLink(null);
    setProductReadinessLink(null);
    setProductReleaseLink(null);
    setProductReleaseNotesLink(null);
    setReleaseRehearsal(null);
    setReleaseRehearsalLink(null);
    setReleaseVerification(null);
    setReleaseVerificationLink(null);
    setReleaseRemediationIssuesLink(null);
    setReleaseRemediationScriptLink(null);
    setProviderReadinessLink(null);
    setExecutorEvidenceLink(null);
    setServerLedger((current) => ({
      ...current,
      status: "idle",
      message: run
        ? "Refresh gateway ledger for the current run."
        : "Refresh gateway ledger when the local service is running.",
      approvals: [],
      evidenceBundles: [],
      evidenceMessage: undefined
    }));
  }, [run?.id]);

  useEffect(() => {
    setTeamHandoffLink(null);
    setRoleWorkspaceLink(null);
    setProductReadinessLink(null);
    setProductReleaseLink(null);
    setProductReleaseNotesLink(null);
    setReleaseRehearsal(null);
    setReleaseRehearsalLink(null);
    setReleaseVerification(null);
    setReleaseVerificationLink(null);
    setReleaseRemediationIssuesLink(null);
    setReleaseRemediationScriptLink(null);
    setDevelopmentIssuesLink(null);
    setDevelopmentIssuesScriptLink(null);
    clearCodingAgentBriefReview();
  }, [run?.id, workspace]);

  useEffect(() => {
    if (!workspace.roles.some((role) => role.id === selectedRoleId)) {
      setSelectedRoleId(workspace.roles[0]?.id || "");
    }
  }, [selectedRoleId, workspace.roles]);

  function updateRole(roleId: string, patch: Partial<CabinetRole>) {
    setWorkspace((current) => ({
      ...current,
      roles: current.roles.map((role) =>
        role.id === roleId
          ? {
              ...role,
              ...patch,
              provider: {
                ...role.provider,
                ...(patch.provider || {})
              },
              permissions: {
                ...role.permissions,
                ...(patch.permissions || {})
              }
            }
          : role
      )
    }));
  }

  function updateSecret(roleId: string, value: string) {
    setSessionSecrets((current) => ({
      ...current,
      [roleId]: value
    }));
  }

  function updateRoleProvider(roleId: string, patch: Partial<ProviderConfig>) {
    const role = workspace.roles.find((candidate) => candidate.id === roleId);
    if (!role) return;

    updateRole(roleId, {
      provider: {
        ...role.provider,
        ...patch
      }
    });
  }

  function recordAudit(input: AuditEventInput) {
    const event = createAuditEvent(input);
    setAuditEvents((current) => appendAuditEvent(event, current));
  }

  function clearProductReadinessDownload({
    preserveCodingAgentBriefReview = false
  }: { preserveCodingAgentBriefReview?: boolean } = {}) {
    if (productReadinessLink) {
      URL.revokeObjectURL(productReadinessLink.href);
      setProductReadinessLink(null);
    }
    clearProductReleaseDownload();
    clearReleaseRehearsal({ preserveCodingAgentBriefReview });
  }

  function clearProductReleaseDownload() {
    if (productReleaseLink) {
      URL.revokeObjectURL(productReleaseLink.href);
      setProductReleaseLink(null);
    }
    if (productReleaseNotesLink) {
      URL.revokeObjectURL(productReleaseNotesLink.href);
      setProductReleaseNotesLink(null);
    }
  }

  function clearReleaseRehearsal({
    preserveCodingAgentBriefReview = false
  }: { preserveCodingAgentBriefReview?: boolean } = {}) {
    setReleaseRehearsal(null);
    if (releaseRehearsalLink) {
      URL.revokeObjectURL(releaseRehearsalLink.href);
      setReleaseRehearsalLink(null);
    }
    clearReleaseVerification({ preserveCodingAgentBriefReview });
    if (releaseRemediationIssuesLink) {
      URL.revokeObjectURL(releaseRemediationIssuesLink.href);
      setReleaseRemediationIssuesLink(null);
    }
    if (releaseRemediationScriptLink) {
      URL.revokeObjectURL(releaseRemediationScriptLink.href);
      setReleaseRemediationScriptLink(null);
    }
  }

  function clearReleaseVerification({
    preserveCodingAgentBriefReview = false
  }: { preserveCodingAgentBriefReview?: boolean } = {}) {
    setReleaseVerification(null);
    if (releaseVerificationLink) {
      URL.revokeObjectURL(releaseVerificationLink.href);
      setReleaseVerificationLink(null);
    }
    if (!preserveCodingAgentBriefReview) {
      clearCodingAgentBriefReview();
    }
  }

  function clearCodingAgentBriefDownloads() {
    if (codingAgentBriefsLink) {
      URL.revokeObjectURL(codingAgentBriefsLink.href);
      setCodingAgentBriefsLink(null);
    }
    if (codingAgentBriefsMarkdownLink) {
      URL.revokeObjectURL(codingAgentBriefsMarkdownLink.href);
      setCodingAgentBriefsMarkdownLink(null);
    }
  }

  function clearCodingAgentBriefReview() {
    setCodingAgentBriefReview(null);
    if (codingAgentBriefReviewLink) {
      URL.revokeObjectURL(codingAgentBriefReviewLink.href);
      setCodingAgentBriefReviewLink(null);
    }
    clearCodingAgentSessionBundle();
  }

  function clearCodingAgentSessionBundle() {
    setCodingAgentSessionBundle(null);
    if (codingAgentSessionBundleLink) {
      URL.revokeObjectURL(codingAgentSessionBundleLink.href);
      setCodingAgentSessionBundleLink(null);
    }
    if (codingAgentSessionBundleMarkdownLink) {
      URL.revokeObjectURL(codingAgentSessionBundleMarkdownLink.href);
      setCodingAgentSessionBundleMarkdownLink(null);
    }
    clearCodingAgentSessionDrill();
    clearCodingAgentSessionReceipt();
  }

  function clearCodingAgentSessionDrill() {
    setCodingAgentSessionDrill(null);
    if (codingAgentSessionDrillLink) {
      URL.revokeObjectURL(codingAgentSessionDrillLink.href);
      setCodingAgentSessionDrillLink(null);
    }
    if (codingAgentSessionDrillMarkdownLink) {
      URL.revokeObjectURL(codingAgentSessionDrillMarkdownLink.href);
      setCodingAgentSessionDrillMarkdownLink(null);
    }
  }

  function clearCodingAgentSessionReceipt() {
    setCodingAgentSessionReceipt(null);
    if (codingAgentSessionReceiptLink) {
      URL.revokeObjectURL(codingAgentSessionReceiptLink.href);
      setCodingAgentSessionReceiptLink(null);
    }
    if (codingAgentSessionReceiptMarkdownLink) {
      URL.revokeObjectURL(codingAgentSessionReceiptMarkdownLink.href);
      setCodingAgentSessionReceiptMarkdownLink(null);
    }
    clearCodingAgentImplementationEvidence();
  }

  function clearCodingAgentImplementationEvidence() {
    if (codingAgentImplementationEvidenceLink) {
      URL.revokeObjectURL(codingAgentImplementationEvidenceLink.href);
      setCodingAgentImplementationEvidenceLink(null);
    }
    if (codingAgentImplementationEvidenceMarkdownLink) {
      URL.revokeObjectURL(codingAgentImplementationEvidenceMarkdownLink.href);
      setCodingAgentImplementationEvidenceMarkdownLink(null);
    }
  }

  async function refreshServerLedger() {
    setServerLedger((current) => ({
      ...current,
      status: "loading",
      message: "Reading gateway approval and evidence ledgers..."
    }));

    try {
      const [summary, approvalQuery] = await Promise.all([
        getLedgerSummaryViaGateway(),
        listApprovalLedgerViaGateway(run?.id)
      ]);
      let evidenceBundles: ExecutorEvidenceBundle[] = [];
      let evidenceMessage: string | undefined;

      try {
        const evidenceQuery = await listEvidenceLedgerViaGateway(run?.id);
        evidenceBundles = evidenceQuery.bundles;
      } catch (error) {
        evidenceMessage = error instanceof Error
          ? `${error.message}. Evidence reads may require runner authentication.`
          : "Gateway evidence ledger unavailable. Evidence reads may require runner authentication.";
      }

      setServerLedger({
        status: "ready",
        message: run
          ? `Gateway ledger loaded for ${run.id}.`
          : "Gateway ledger loaded for all runs.",
        summary,
        approvals: approvalQuery.records,
        evidenceBundles,
        evidenceMessage
      });
    } catch (error) {
      setServerLedger((current) => ({
        ...current,
        status: "error",
        message: error instanceof Error ? error.message : "Gateway ledger unavailable."
      }));
    }
  }

  function addRole(sourceRole?: CabinetRole) {
    const role = createCustomRole({
      roles: workspace.roles,
      sourceRole
    });
    setWorkspace((current) => ({
      ...current,
      roles: [...current.roles, role]
    }));
    setSelectedRoleId(role.id);
    setRunState({
      status: "idle",
      message: sourceRole
        ? `Duplicated ${sourceRole.name}. Configure its provider and permissions before the next run.`
        : "Added a custom role. Configure its provider and permissions before the next run."
    });
    recordAudit({
      type: sourceRole ? "role.duplicated" : "role.created",
      severity: "info",
      summary: sourceRole ? `Duplicated role ${sourceRole.name}.` : `Created role ${role.name}.`,
      roleId: role.id,
      metadata: {
        ministry: role.ministry,
        stage: role.stage,
        provider: role.provider.provider,
        sourceRoleId: sourceRole?.id || null
      }
    });
  }

  function deleteRole(roleId: string) {
    if (isDefaultRoleId(roleId)) return;
    const deletedRole = workspace.roles.find((role) => role.id === roleId);

    setWorkspace((current) => {
      const nextRoles = current.roles.filter((role) => role.id !== roleId);
      setSelectedRoleId(nextRoles[0]?.id || "");
      return {
        ...current,
        roles: nextRoles
      };
    });
    setSessionSecrets((current) => {
      const next = { ...current };
      delete next[roleId];
      return next;
    });
    setRunState({
      status: "idle",
      message: "Custom role removed from the workspace."
    });
    recordAudit({
      type: "role.deleted",
      severity: "warning",
      summary: `Deleted custom role ${deletedRole?.name || roleId}.`,
      roleId,
      metadata: {
        ministry: deletedRole?.ministry || null,
        stage: deletedRole?.stage || null
      }
    });
  }

  async function runCabinet() {
    setRunState({
      status: "running",
      message: `Calling local gateway at ${gatewayBaseUrl()}...`
    });
    try {
      const result = await runCabinetViaGateway(workspace, runMode);
      setRun(result.run);
      saveCurrentRun(result.run);
      setRunHistory((current) => addRunHistoryItem(result.run, result.source, current));
      setRunState({
        status: "gateway",
        message: `Run completed through the local gateway in ${runMode} mode.`
      });
      recordAudit({
        type: "cabinet.run.completed",
        severity: "success",
        summary: `Cabinet run completed through ${result.source}.`,
        runId: result.run.id,
        metadata: {
          mode: runMode,
          decision: result.run.score.decision,
          overall: result.run.score.overall,
          automationActions: result.run.automationActions?.length || 0
        }
      });
    } catch (error) {
      const fallbackRun = runCabinetMission(workspace);
      setRun(fallbackRun);
      saveCurrentRun(fallbackRun);
      setRunHistory((current) => addRunHistoryItem(fallbackRun, "fallback", current));
      setRunState({
        status: "fallback",
        message: error instanceof Error
          ? `Gateway unavailable; used local fallback. ${error.message}`
          : "Gateway unavailable; used local fallback."
      });
      recordAudit({
        type: "cabinet.run.completed",
        severity: "warning",
        summary: "Cabinet run completed through local fallback.",
        runId: fallbackRun.id,
        metadata: {
          mode: "dry-run",
          decision: fallbackRun.score.decision,
          overall: fallbackRun.score.overall,
          gatewayError: error instanceof Error ? error.message : "unknown"
        }
      });
    }
  }

  function persistWorkspace() {
    saveWorkspace(workspace);
    setSaveState("saved");
    window.setTimeout(() => setSaveState("idle"), 1400);
    recordAudit({
      type: "workspace.saved",
      severity: "success",
      summary: "Workspace saved locally.",
      metadata: {
        roles: workspace.roles.length,
        activeRoles: activeRoles.length
      }
    });
  }

  function resetWorkspace() {
    const next = createDefaultWorkspace();
    setWorkspace(next);
    setSelectedRoleId(next.roles[0].id);
    setRun(null);
    clearCurrentRun();
    setApprovalRecords([]);
    setExecutorRun(null);
    setHandoffLink(null);
    setTeamHandoffLink(null);
    setRoleWorkspaceLink(null);
    setProductReadinessLink(null);
    setProductReleaseLink(null);
    setProductReleaseNotesLink(null);
    setReleaseRehearsal(null);
    setReleaseRehearsalLink(null);
    setReleaseVerification(null);
    setReleaseVerificationLink(null);
    setReleaseRemediationIssuesLink(null);
    setReleaseRemediationScriptLink(null);
    setDevelopmentBoardLink(null);
    setCodingAgentBriefsLink(null);
    setCodingAgentBriefsMarkdownLink(null);
    clearCodingAgentBriefReview();
    setDevelopmentItems(clearDevelopmentItems());
    setDevelopmentIssuesLink(null);
    setDevelopmentIssuesScriptLink(null);
    setProviderReadinessLink(null);
    setExecutorEvidenceLink(null);
    setSessionSecrets({});
    recordAudit({
      type: "workspace.reset",
      severity: "warning",
      summary: "Workspace reset to default cabinet.",
      metadata: {
        roles: next.roles.length
      }
    });
  }

  function exportWorkspace() {
    const blob = new Blob([serializeWorkspace(workspace)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const fileName = `naikaku-workspace-${new Date().toISOString().slice(0, 10)}.json`;

    if (exportLink) {
      URL.revokeObjectURL(exportLink.href);
    }

    setExportLink({ href: url, fileName });
    setRunState({
      status: "idle",
      message: "Workspace export is ready. Use Download JSON before closing this page."
    });
    recordAudit({
      type: "workspace.exported",
      severity: "info",
      summary: "Workspace export prepared.",
      metadata: {
        roles: workspace.roles.length,
        activeRoles: activeRoles.length
      }
    });
  }

  async function importWorkspace(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const imported = parseWorkspaceExport(await file.text());
      setWorkspace(imported);
      setSelectedRoleId(imported.roles[0]?.id || "");
      setRun(null);
      clearCurrentRun();
      setApprovalRecords([]);
      setExecutorRun(null);
      setHandoffLink(null);
      setTeamHandoffLink(null);
      setRoleWorkspaceLink(null);
      setProductReadinessLink(null);
      setProductReleaseLink(null);
      setProductReleaseNotesLink(null);
      setReleaseRehearsal(null);
      setReleaseRehearsalLink(null);
      setReleaseVerification(null);
      setReleaseVerificationLink(null);
      setReleaseRemediationIssuesLink(null);
      setReleaseRemediationScriptLink(null);
      setDevelopmentBoardLink(null);
      setCodingAgentBriefsLink(null);
      setCodingAgentBriefsMarkdownLink(null);
      clearCodingAgentBriefReview();
      setDevelopmentIssuesLink(null);
      setDevelopmentIssuesScriptLink(null);
      setProviderReadinessLink(null);
      setExecutorEvidenceLink(null);
      setRunState({
        status: "idle",
        message: `Imported workspace from ${file.name}.`
      });
      recordAudit({
        type: "workspace.imported",
        severity: "success",
        summary: `Imported workspace from ${file.name}.`,
        metadata: {
          roles: imported.roles.length,
          activeRoles: imported.roles.filter((role) => role.enabled).length
        }
      });
    } catch (error) {
      setRunState({
        status: "error",
        message: error instanceof Error ? `Import failed: ${error.message}` : "Import failed."
      });
    }
  }

  function recordAutomationDecision(
    action: AutomationAction,
    decision: AutomationApprovalDecision
  ) {
    const record = createApprovalRecord({
      action,
      decision
    });
    const nextRecords = saveApprovalRecord(record).filter(
      (candidate) => candidate.runId === action.runId
    );
    void saveApprovalRecordViaGateway(record)
      .then(() => {
        void refreshServerLedger();
      })
      .catch(() => {
        // Local approval storage remains the source of truth when the gateway is offline.
      });
    setApprovalRecords(nextRecords);
    setHandoffLink(null);
    setAutomationRunbookLink(null);
    setExecutorRun(null);
    setExecutorEvidenceLink(null);
    clearProductReadinessDownload();
    recordAudit({
      type: "automation.decision.recorded",
      severity: decision === "approved" ? "success" : "warning",
      summary: `${decision === "approved" ? "Approved" : "Rejected"} automation action ${action.title}.`,
      runId: action.runId,
      roleId: action.roleId,
      actionId: action.id,
      metadata: {
        decision,
        executorProfileId: action.executorProfileId,
        riskLevel: action.riskLevel,
        target: action.target
      }
    });
  }

  function createTeamHandoffDownload(handoff: TeamHandoff) {
    const blob = new Blob([serializeTeamHandoff(handoff)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const runSlug = handoff.runId ? handoff.runId.replace(/[^a-z0-9-]/gi, "-") : "workspace";
    const fileName = `naikaku-team-packages-${runSlug}.json`;

    if (teamHandoffLink) {
      URL.revokeObjectURL(teamHandoffLink.href);
    }

    setTeamHandoffLink({ href: url, fileName });
  }

  async function exportTeamHandoff() {
    try {
      const gatewayHandoff = await createTeamHandoffViaGateway(workspace, run);
      createTeamHandoffDownload(gatewayHandoff);
      setRunState({
        status: "gateway",
        message: "Team work packages exported through the local gateway."
      });
      recordAudit({
        type: "team.handoff.exported",
        severity: "info",
        summary: "Team work packages exported through gateway.",
        runId: gatewayHandoff.runId,
        metadata: {
          packages: gatewayHandoff.packages.length,
          ready: gatewayHandoff.summary.ready,
          blocked: gatewayHandoff.summary.blocked
        }
      });
    } catch (error) {
      createTeamHandoffDownload(teamHandoff);
      setRunState({
        status: "fallback",
        message: error instanceof Error
          ? `Gateway team packages unavailable; used local export. ${error.message}`
          : "Gateway team packages unavailable; used local export."
      });
      recordAudit({
        type: "team.handoff.exported",
        severity: "warning",
        summary: "Team work packages exported locally.",
        runId: teamHandoff.runId,
        metadata: {
          packages: teamHandoff.packages.length,
          gatewayError: error instanceof Error ? error.message : "unknown"
        }
      });
    }
  }

  function createRoleWorkspaceScaffoldDownload(scaffolds: RoleWorkspaceScaffolds) {
    const blob = new Blob([serializeRoleWorkspaceScaffoldScriptExport(scaffolds)], { type: "text/x-shellscript" });
    const url = URL.createObjectURL(blob);
    const runSlug = scaffolds.runId ? scaffolds.runId.replace(/[^a-z0-9-]/gi, "-") : "workspace";
    const fileName = `naikaku-role-workspaces-${runSlug}.sh`;

    if (roleWorkspaceLink) {
      URL.revokeObjectURL(roleWorkspaceLink.href);
    }

    setRoleWorkspaceLink({ href: url, fileName });
  }

  async function exportRoleWorkspaceScaffolds() {
    try {
      const gatewayScaffolds = await createRoleWorkspaceScaffoldsViaGateway(workspace, run);
      createRoleWorkspaceScaffoldDownload(gatewayScaffolds);
      setRunState({
        status: "gateway",
        message: "Role workspace scaffold script exported through the local gateway."
      });
      recordAudit({
        type: "role.workspaces.exported",
        severity: "info",
        summary: "Role workspace scaffold script exported through gateway.",
        runId: gatewayScaffolds.runId,
        metadata: {
          roles: gatewayScaffolds.summary.roles,
          files: gatewayScaffolds.summary.files,
          source: "gateway"
        }
      });
    } catch (error) {
      createRoleWorkspaceScaffoldDownload(roleWorkspaceScaffolds);
      setRunState({
        status: "fallback",
        message: error instanceof Error
          ? `Gateway role workspaces unavailable; used local export. ${error.message}`
          : "Gateway role workspaces unavailable; used local export."
      });
      recordAudit({
        type: "role.workspaces.exported",
        severity: "warning",
        summary: "Role workspace scaffold script exported locally.",
        runId: roleWorkspaceScaffolds.runId,
        metadata: {
          roles: roleWorkspaceScaffolds.summary.roles,
          files: roleWorkspaceScaffolds.summary.files,
          source: "local",
          gatewayError: error instanceof Error ? error.message : "unknown"
        }
      });
    }
  }

  function createProductReadinessDownload(report: ProductReadinessReport) {
    const blob = new Blob([serializeProductReadinessExport(report)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const runSlug = report.runId ? report.runId.replace(/[^a-z0-9-]/gi, "-") : "workspace";
    const fileName = `naikaku-product-readiness-${runSlug}.json`;

    if (productReadinessLink) {
      URL.revokeObjectURL(productReadinessLink.href);
    }

    setProductReadinessLink({ href: url, fileName });
  }

  async function exportProductReadiness() {
    try {
      const gatewayReport = await createProductReadinessViaGateway(
        workspace,
        providerReadinessMatrix,
        run,
        approvalRecords,
        memoryEntries,
        developmentItems,
        auditEvents
      );
      createProductReadinessDownload(gatewayReport);
      setRunState({
        status: "gateway",
        message: "Product readiness report exported through the local gateway."
      });
      recordAudit({
        type: "product.readiness.exported",
        severity: gatewayReport.decision === "blocked" ? "warning" : "info",
        summary: `Product readiness report exported: ${gatewayReport.decision}.`,
        runId: gatewayReport.runId,
        metadata: {
          score: gatewayReport.score,
          blockers: gatewayReport.summary.blockers,
          warnings: gatewayReport.summary.warnings,
          source: "gateway"
        }
      });
    } catch (error) {
      createProductReadinessDownload(productReadinessReport);
      setRunState({
        status: "fallback",
        message: error instanceof Error
          ? `Gateway product readiness unavailable; used local export. ${error.message}`
          : "Gateway product readiness unavailable; used local export."
      });
      recordAudit({
        type: "product.readiness.exported",
        severity: productReadinessReport.decision === "blocked" ? "warning" : "info",
        summary: `Product readiness report exported locally: ${productReadinessReport.decision}.`,
        runId: productReadinessReport.runId,
        metadata: {
          score: productReadinessReport.score,
          blockers: productReadinessReport.summary.blockers,
          warnings: productReadinessReport.summary.warnings,
          source: "local",
          gatewayError: error instanceof Error ? error.message : "unknown"
        }
      });
    }
  }

  function createProductReleaseBundleDownload(bundle: ProductReleaseBundle) {
    const blob = new Blob([serializeProductReleaseBundleExport(bundle)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const runSlug = bundle.runId ? bundle.runId.replace(/[^a-z0-9-]/gi, "-") : "workspace";
    const fileName = `naikaku-product-release-bundle-${runSlug}.json`;
    const notesBlob = new Blob([serializeProductReleaseNotesExport(bundle)], { type: "text/markdown" });
    const notesUrl = URL.createObjectURL(notesBlob);
    const notesFileName = `naikaku-release-notes-${runSlug}.md`;

    if (productReleaseLink) {
      URL.revokeObjectURL(productReleaseLink.href);
    }
    if (productReleaseNotesLink) {
      URL.revokeObjectURL(productReleaseNotesLink.href);
    }

    setProductReleaseLink({ href: url, fileName });
    setProductReleaseNotesLink({ href: notesUrl, fileName: notesFileName });
  }

  async function exportProductReleaseBundle() {
    try {
      const gatewayBundle = await createProductReleaseBundleViaGateway(
        workspace,
        providerReadinessMatrix,
        run,
        approvalRecords,
        memoryEntries,
        developmentItems,
        auditEvents
      );
      createProductReleaseBundleDownload(gatewayBundle);
      setRunState({
        status: "gateway",
        message: "Product release bundle exported through the local gateway."
      });
      recordAudit({
        type: "product.release.exported",
        severity: gatewayBundle.readiness.decision === "blocked" ? "warning" : "info",
        summary: `Product release bundle exported: ${gatewayBundle.readiness.decision}.`,
        runId: gatewayBundle.runId,
        metadata: {
          score: gatewayBundle.readiness.score,
          artifacts: gatewayBundle.summary.artifacts,
          missing: gatewayBundle.summary.missing,
          reviewRequired: gatewayBundle.summary.reviewRequired,
          source: "gateway"
        }
      });
    } catch (error) {
      createProductReleaseBundleDownload(productReleaseBundle);
      setRunState({
        status: "fallback",
        message: error instanceof Error
          ? `Gateway product release bundle unavailable; used local export. ${error.message}`
          : "Gateway product release bundle unavailable; used local export."
      });
      recordAudit({
        type: "product.release.exported",
        severity: productReleaseBundle.readiness.decision === "blocked" ? "warning" : "info",
        summary: `Product release bundle exported locally: ${productReleaseBundle.readiness.decision}.`,
        runId: productReleaseBundle.runId,
        metadata: {
          score: productReleaseBundle.readiness.score,
          artifacts: productReleaseBundle.summary.artifacts,
          missing: productReleaseBundle.summary.missing,
          reviewRequired: productReleaseBundle.summary.reviewRequired,
          source: "local",
          gatewayError: error instanceof Error ? error.message : "unknown"
        }
      });
    }
  }

  function runReleaseRehearsal() {
    const report = buildReleaseRehearsalReport({
      workspace,
      providerReadiness: providerReadinessMatrix,
      run,
      approvalRecords,
      auditEvents,
      memoryEntries,
      savedItems: developmentItems,
      secretProbeValues: Object.values(sessionSecrets)
    });
    setReleaseRehearsal(report);

    if (releaseRehearsalLink) {
      URL.revokeObjectURL(releaseRehearsalLink.href);
      setReleaseRehearsalLink(null);
    }
    clearReleaseVerification();
    if (releaseRemediationIssuesLink) {
      URL.revokeObjectURL(releaseRemediationIssuesLink.href);
      setReleaseRemediationIssuesLink(null);
    }
    if (releaseRemediationScriptLink) {
      URL.revokeObjectURL(releaseRemediationScriptLink.href);
      setReleaseRemediationScriptLink(null);
    }

    setRunState({
      status: "local",
      message: copy.releaseRehearsalStatus(report.decision, report.summary.blockers, report.summary.warnings)
    });
    recordAudit({
      type: "release.rehearsal.completed",
      severity: report.decision === "blocked" ? "error" : report.decision === "needs-review" ? "warning" : "success",
      summary: `Release rehearsal completed: ${report.decision}.`,
      runId: report.runId,
      metadata: {
        score: report.score,
        blockers: report.summary.blockers,
        warnings: report.summary.warnings,
        evidenceItems: report.summary.evidenceItems,
        sourceRun: report.sourceRun,
        secretLeakDetected: report.summary.secretLeakDetected
      }
    });
  }

  function exportReleaseRehearsal() {
    if (!releaseRehearsal) return;

    const blob = new Blob([serializeReleaseRehearsalExport(releaseRehearsal)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const fileName = `naikaku-release-rehearsal-${releaseRehearsal.runId.replace(/[^a-z0-9-]/gi, "-")}.json`;

    if (releaseRehearsalLink) {
      URL.revokeObjectURL(releaseRehearsalLink.href);
    }

    setReleaseRehearsalLink({ href: url, fileName });
    recordAudit({
      type: "release.rehearsal.exported",
      severity: releaseRehearsal.decision === "blocked" ? "error" : releaseRehearsal.decision === "needs-review" ? "warning" : "info",
      summary: `Release rehearsal export prepared: ${releaseRehearsal.decision}.`,
      runId: releaseRehearsal.runId,
      metadata: {
        score: releaseRehearsal.score,
        blockers: releaseRehearsal.summary.blockers,
        warnings: releaseRehearsal.summary.warnings,
        evidenceItems: releaseRehearsal.summary.evidenceItems
      }
    });
  }

  function createReleaseVerificationDownload(report: ReleaseVerificationReport) {
    const blob = new Blob([serializeReleaseVerificationExport(report)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const mode = report.requireProductionEvidence ? "production" : report.scope;
    const fileName = `naikaku-release-verification-${mode}-${report.sourceRunId.replace(/[^a-z0-9-]/gi, "-")}.json`;

    if (releaseVerificationLink) {
      URL.revokeObjectURL(releaseVerificationLink.href);
    }

    setReleaseVerificationLink({ href: url, fileName });
    recordAudit({
      type: "release.verification.exported",
      severity: report.decision === "verified" ? "success" : report.decision === "not-production-ready" ? "warning" : "error",
      summary: `Release verification export prepared: ${report.decision}.`,
      runId: report.sourceRunId,
      metadata: {
        scope: report.scope,
        requireProductionEvidence: report.requireProductionEvidence,
        failed: report.summary.failed
      }
    });
  }

  async function verifyRelease(requireProductionEvidence = false) {
    if (!releaseRehearsal) return;

    let verification = buildReleaseVerification({
      report: releaseRehearsal,
      requireProductionEvidence
    });
    let source: "gateway" | "local" = "local";

    try {
      verification = await createReleaseVerificationViaGateway(releaseRehearsal, requireProductionEvidence);
      source = "gateway";
    } catch (error) {
      setRunState({
        status: "fallback",
        message: copy.releaseVerificationFallback(error instanceof Error ? error.message : undefined)
      });
    }

    setReleaseVerification(verification);
    createReleaseVerificationDownload(verification);
    setRunState({
      status: source === "gateway" ? "gateway" : "local",
      message: copy.releaseVerificationStatus(verification.decision, verification.summary.failed)
    });
    recordAudit({
      type: "release.verification.completed",
      severity: verification.decision === "verified" ? "success" : verification.decision === "not-production-ready" ? "warning" : "error",
      summary: `Release verification completed: ${verification.decision}.`,
      runId: verification.sourceRunId,
      metadata: {
        scope: verification.scope,
        requireProductionEvidence: verification.requireProductionEvidence,
        failed: verification.summary.failed,
        source
      }
    });
  }

  function exportReleaseRemediationIssues() {
    if (!releaseRehearsal) return;

    const drafts = buildReleaseRemediationIssueDrafts({
      report: releaseRehearsal,
      generatedAt: releaseRehearsal.generatedAt
    });
    const blob = new Blob([serializeDevelopmentIssueDraftsExport(drafts)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const fileName = `naikaku-release-remediation-issues-${releaseRehearsal.runId.replace(/[^a-z0-9-]/gi, "-")}.json`;

    if (releaseRemediationIssuesLink) {
      URL.revokeObjectURL(releaseRemediationIssuesLink.href);
    }

    setReleaseRemediationIssuesLink({ href: url, fileName });
    recordAudit({
      type: "release.rehearsal.exported",
      severity: "info",
      summary: "Release remediation issue drafts prepared.",
      runId: releaseRehearsal.runId,
      metadata: {
        drafts: drafts.summary.total,
        highPriority: drafts.summary.highPriority,
        source: "release-remediation"
      }
    });
  }

  function exportReleaseRemediationScript() {
    if (!releaseRehearsal) return;

    const drafts = buildReleaseRemediationIssueDrafts({
      report: releaseRehearsal,
      generatedAt: releaseRehearsal.generatedAt
    });
    const blob = new Blob([serializeDevelopmentIssueGhScriptExport(drafts)], { type: "text/x-shellscript" });
    const url = URL.createObjectURL(blob);
    const fileName = `naikaku-release-remediation-gh-issues-${releaseRehearsal.runId.replace(/[^a-z0-9-]/gi, "-")}.sh`;

    if (releaseRemediationScriptLink) {
      URL.revokeObjectURL(releaseRemediationScriptLink.href);
    }

    setReleaseRemediationScriptLink({ href: url, fileName });
    recordAudit({
      type: "release.rehearsal.exported",
      severity: "info",
      summary: "Release remediation GitHub issue script prepared.",
      runId: releaseRehearsal.runId,
      metadata: {
        drafts: drafts.summary.total,
        highPriority: drafts.summary.highPriority,
        format: "gh-script",
        source: "release-remediation"
      }
    });
  }

  function exportExecutorHandoff() {
    if (!run) return;

    const blob = new Blob([serializeRunBundle(run, approvalRecords)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const fileName = `naikaku-handoff-${run.id.replace(/[^a-z0-9-]/gi, "-")}.json`;

    if (handoffLink) {
      URL.revokeObjectURL(handoffLink.href);
    }

    setHandoffLink({ href: url, fileName });
    recordAudit({
      type: "executor.handoff.exported",
      severity: "info",
      summary: "Executor handoff exported.",
      runId: run.id,
      metadata: {
        approvalRecords: approvalRecords.length,
        readyActions: buildExecutorHandoff({ run, approvalRecords }).readyActions.length
      }
    });
  }

  function createAutomationRunbookDownload(runbook: AutomationRunbook) {
    const blob = new Blob([serializeAutomationRunbookExport(runbook)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const runSlug = runbook.runId ? runbook.runId.replace(/[^a-z0-9-]/gi, "-") : "workspace";
    const fileName = `naikaku-automation-runbook-${runSlug}.json`;

    if (automationRunbookLink) {
      URL.revokeObjectURL(automationRunbookLink.href);
    }

    setAutomationRunbookLink({ href: url, fileName });
  }

  async function exportAutomationRunbook() {
    if (!run) return;

    try {
      const gatewayRunbook = await createAutomationRunbookViaGateway(run, approvalRecords);
      createAutomationRunbookDownload(gatewayRunbook);
      setRunState({
        status: "gateway",
        message: "Automation runbook exported through the local gateway."
      });
      recordAudit({
        type: "automation.runbook.exported",
        severity: "info",
        summary: "Automation runbook exported through gateway.",
        runId: gatewayRunbook.runId,
        metadata: {
          ready: gatewayRunbook.summary.ready,
          held: gatewayRunbook.summary.held,
          source: "gateway"
        }
      });
    } catch (error) {
      createAutomationRunbookDownload(automationRunbook);
      setRunState({
        status: "fallback",
        message: error instanceof Error
          ? `Gateway automation runbook unavailable; used local export. ${error.message}`
          : "Gateway automation runbook unavailable; used local export."
      });
      recordAudit({
        type: "automation.runbook.exported",
        severity: "warning",
        summary: "Automation runbook exported locally.",
        runId: automationRunbook.runId,
        metadata: {
          ready: automationRunbook.summary.ready,
          held: automationRunbook.summary.held,
          source: "local",
          gatewayError: error instanceof Error ? error.message : "unknown"
        }
      });
    }
  }

  async function runExecutorDryRun() {
    if (!run) return;

    const handoff = buildExecutorHandoff({
      run,
      approvalRecords
    });
    setExecutorRunning(true);
    try {
      setExecutorRun(await runExecutorHandoffViaGateway(handoff));
      setExecutorEvidenceLink(null);
      clearProductReadinessDownload();
      setRunState({
        status: "gateway",
        message: "Executor dry-run completed through the local gateway."
      });
      recordAudit({
        type: "executor.run.dry.completed",
        severity: "success",
        summary: "Executor dry-run completed through gateway.",
        runId: handoff.runId,
        metadata: {
          readyActions: handoff.readyActions.length,
          heldActions: handoff.heldActions.length
        }
      });
    } catch (error) {
      const localExecutorRun = runExecutorHandoff({ handoff });
      setExecutorRun(localExecutorRun);
      setExecutorEvidenceLink(null);
      clearProductReadinessDownload();
      setRunState({
        status: "fallback",
        message: error instanceof Error
          ? `Gateway executor unavailable; used local dry-run. ${error.message}`
          : "Gateway executor unavailable; used local dry-run."
      });
      recordAudit({
        type: "executor.run.dry.completed",
        severity: "warning",
        summary: "Executor dry-run completed locally.",
        runId: localExecutorRun.runId,
        metadata: {
          simulated: localExecutorRun.summary.simulated,
          held: localExecutorRun.summary.held,
          gatewayError: error instanceof Error ? error.message : "unknown"
        }
      });
    } finally {
      setExecutorRunning(false);
    }
  }

  async function exportExecutorEvidence() {
    if (!executorRun) return;

    let bundle = buildExecutorEvidenceBundle({ executorRun });
    let source: "gateway" | "local" = "local";

    try {
      bundle = await createExecutorEvidenceViaGateway(executorRun);
      source = "gateway";
      setRunState({
        status: "gateway",
        message: "Executor evidence exported and stored through the local gateway."
      });
    } catch {
      setRunState({
        status: "fallback",
        message: "Gateway evidence ledger unavailable; prepared local evidence export."
      });
    }

    const blob = new Blob([serializeExecutorEvidenceExport(bundle)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const fileName = `naikaku-executor-evidence-${executorRun.id.replace(/[^a-z0-9-]/gi, "-")}.json`;

    if (executorEvidenceLink) {
      URL.revokeObjectURL(executorEvidenceLink.href);
    }

    setExecutorEvidenceLink({ href: url, fileName });
    recordAudit({
      type: "executor.evidence.exported",
      severity: "info",
      summary: "Executor evidence export prepared.",
      runId: executorRun.runId,
      metadata: {
        executorRunId: executorRun.id,
        steps: executorRun.steps.length,
        evidenceItems: executorRun.summary.evidenceItems,
        replayableSteps: executorRun.summary.replayableSteps,
        source
      }
    });

    if (source === "gateway") {
      void refreshServerLedger();
    }
  }

  function exportAuditLog() {
    const blob = new Blob([serializeAuditLog(auditEvents)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const fileName = `naikaku-audit-log-${new Date().toISOString().slice(0, 10)}.json`;

    if (auditLink) {
      URL.revokeObjectURL(auditLink.href);
    }

    setAuditLink({ href: url, fileName });
  }

  function recordMemoryReview(
    candidate: MemoryEntry,
    decision: "accepted" | "rejected"
  ) {
    const entry = createMemoryDecision({
      entry: candidate,
      decision
    });
    const nextEntries = saveMemoryEntry(entry);
    setMemoryEntries(nextEntries);
    if (memoryLink) {
      URL.revokeObjectURL(memoryLink.href);
      setMemoryLink(null);
    }
    if (developmentIssuesLink) {
      URL.revokeObjectURL(developmentIssuesLink.href);
      setDevelopmentIssuesLink(null);
    }
    if (developmentIssuesScriptLink) {
      URL.revokeObjectURL(developmentIssuesScriptLink.href);
      setDevelopmentIssuesScriptLink(null);
    }
    clearProductReadinessDownload();
    recordAudit({
      type: decision === "accepted" ? "memory.entry.accepted" : "memory.entry.rejected",
      severity: decision === "accepted" ? "success" : "warning",
      summary: `${decision === "accepted" ? "Accepted" : "Rejected"} memory candidate ${candidate.title}.`,
      runId: candidate.runId,
      actionId: candidate.sourceActionId,
      metadata: {
        kind: candidate.kind,
        source: candidate.source,
        retention: candidate.retention,
        tags: candidate.tags.slice(0, 4).join(",")
      }
    });
  }

  function exportMemoryLog() {
    const blob = new Blob([serializeMemoryLog(memoryEntries)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const fileName = `naikaku-memory-log-${new Date().toISOString().slice(0, 10)}.json`;

    if (memoryLink) {
      URL.revokeObjectURL(memoryLink.href);
    }

    setMemoryLink({ href: url, fileName });
    recordAudit({
      type: "memory.log.exported",
      severity: "info",
      summary: "Memory log export prepared.",
      metadata: {
        entries: memoryEntries.length,
        accepted: memoryEntries.filter((entry) => entry.status === "accepted").length,
        rejected: memoryEntries.filter((entry) => entry.status === "rejected").length
      }
    });
  }

  function changeDevelopmentItemStatus(
    item: DevelopmentWorkItem,
    status: DevelopmentWorkItemStatus
  ) {
    const nextItem = updateDevelopmentWorkItemStatus({
      item,
      status
    });
    const nextItems = saveDevelopmentWorkItem(nextItem);
    setDevelopmentItems(nextItems);
    if (developmentBoardLink) {
      URL.revokeObjectURL(developmentBoardLink.href);
      setDevelopmentBoardLink(null);
    }
    clearCodingAgentBriefDownloads();
    clearCodingAgentBriefReview();
    if (developmentIssuesLink) {
      URL.revokeObjectURL(developmentIssuesLink.href);
      setDevelopmentIssuesLink(null);
    }
    if (developmentIssuesScriptLink) {
      URL.revokeObjectURL(developmentIssuesScriptLink.href);
      setDevelopmentIssuesScriptLink(null);
    }
    clearProductReadinessDownload();
    recordAudit({
      type: "development.item.status.changed",
      severity: status === "blocked" ? "warning" : status === "done" ? "success" : "info",
      summary: `Set development item ${item.title} to ${status}.`,
      runId: item.runId,
      roleId: item.roleId,
      metadata: {
        itemId: item.id,
        status,
        source: item.source,
        priority: item.priority
      }
    });
  }

  function exportDevelopmentBoard() {
    const blob = new Blob([serializeDevelopmentBoardExport(developmentBoard)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const runSlug = developmentBoard.runId
      ? developmentBoard.runId.replace(/[^a-z0-9-]/gi, "-")
      : "workspace";
    const fileName = `naikaku-development-board-${runSlug}.json`;

    if (developmentBoardLink) {
      URL.revokeObjectURL(developmentBoardLink.href);
    }

    setDevelopmentBoardLink({ href: url, fileName });
    recordAudit({
      type: "development.board.exported",
      severity: "info",
      summary: "Development board export prepared.",
      runId: developmentBoard.runId,
      metadata: {
        items: developmentBoard.summary.total,
        blocked: developmentBoard.summary.blocked,
        highPriority: developmentBoard.summary.highPriority
      }
    });
  }

  function createCodingAgentBriefsDownload(briefs: CodingAgentBriefs) {
    const blob = new Blob([serializeCodingAgentBriefsExport(briefs)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const runSlug = briefs.runId ? briefs.runId.replace(/[^a-z0-9-]/gi, "-") : "workspace";
    const fileName = `naikaku-coding-agent-briefs-${runSlug}-${briefs.operatorLocale}.json`;

    if (codingAgentBriefsLink) {
      URL.revokeObjectURL(codingAgentBriefsLink.href);
    }

    setCodingAgentBriefsLink({ href: url, fileName });
  }

  function createCodingAgentBriefsMarkdownDownload(briefs: CodingAgentBriefs) {
    const blob = new Blob([serializeCodingAgentBriefsMarkdownExport(briefs)], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const runSlug = briefs.runId ? briefs.runId.replace(/[^a-z0-9-]/gi, "-") : "workspace";
    const fileName = `naikaku-coding-agent-briefs-${runSlug}-${briefs.operatorLocale}.md`;

    if (codingAgentBriefsMarkdownLink) {
      URL.revokeObjectURL(codingAgentBriefsMarkdownLink.href);
    }

    setCodingAgentBriefsMarkdownLink({ href: url, fileName });
  }

  async function exportCodingAgentBriefs() {
    try {
      const gatewayBriefs = await createCodingAgentBriefsViaGateway(
        workspace,
        run,
        memoryEntries,
        developmentItems,
        releaseVerification,
        locale
      );
      createCodingAgentBriefsDownload(gatewayBriefs);
      setRunState({
        status: "gateway",
        message: copy.codingBriefs.statusGateway
      });
      recordAudit({
        type: "development.coding_briefs.exported",
        severity: gatewayBriefs.summary.blocked ? "warning" : "info",
        summary: "Coding agent briefs exported through gateway.",
        runId: gatewayBriefs.runId,
        metadata: {
          briefs: gatewayBriefs.summary.total,
          blocked: gatewayBriefs.summary.blocked,
          humanReview: gatewayBriefs.summary.humanReview,
          source: "gateway"
        }
      });
    } catch (error) {
      createCodingAgentBriefsDownload(codingAgentBriefs);
      setRunState({
        status: "fallback",
        message: copy.codingBriefs.statusFallback(error instanceof Error ? error.message : undefined)
      });
      recordAudit({
        type: "development.coding_briefs.exported",
        severity: "warning",
        summary: "Coding agent briefs exported locally.",
        runId: codingAgentBriefs.runId,
        metadata: {
          briefs: codingAgentBriefs.summary.total,
          blocked: codingAgentBriefs.summary.blocked,
          humanReview: codingAgentBriefs.summary.humanReview,
          source: "local",
          gatewayError: error instanceof Error ? error.message : "unknown"
        }
      });
    }
  }

  function exportCodingAgentBriefsMarkdown() {
    createCodingAgentBriefsMarkdownDownload(codingAgentBriefs);
    setRunState({
      status: "local",
      message: copy.codingBriefs.statusMarkdown
    });
    recordAudit({
      type: "development.coding_briefs.exported",
      severity: codingAgentBriefs.summary.blocked ? "warning" : "info",
      summary: "Coding agent Markdown prompt pack prepared.",
      runId: codingAgentBriefs.runId,
      metadata: {
        briefs: codingAgentBriefs.summary.total,
        blocked: codingAgentBriefs.summary.blocked,
        humanReview: codingAgentBriefs.summary.humanReview,
        format: "markdown",
        source: "local"
      }
    });
  }

  function createCodingAgentBriefReviewDownload(
    report: CodingAgentBriefReviewReport,
    requireProductionEvidence: boolean
  ) {
    const blob = new Blob([serializeCodingAgentBriefReviewExport(report)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const runSlug = report.runId ? report.runId.replace(/[^a-z0-9-]/gi, "-") : "workspace";
    const mode = requireProductionEvidence ? "production" : "dry-run";
    const fileName = `naikaku-coding-agent-brief-review-${mode}-${runSlug}-${report.operatorLocale}.json`;

    if (codingAgentBriefReviewLink) {
      URL.revokeObjectURL(codingAgentBriefReviewLink.href);
    }

    setCodingAgentBriefReviewLink({ href: url, fileName });
  }

  async function runCodingAgentBriefReview(requireProductionEvidence = false) {
    let review = buildCodingAgentBriefReview({
      briefs: codingAgentBriefs,
      releaseVerification,
      requireProductionEvidence
    });
    let source: "gateway" | "local" = "local";
    let gatewayError: string | null = null;

    try {
      review = await reviewCodingAgentBriefsViaGateway(
        codingAgentBriefs,
        releaseVerification,
        requireProductionEvidence
      );
      source = "gateway";
    } catch (error) {
      gatewayError = error instanceof Error ? error.message : "unknown";
    }

    setCodingAgentBriefReview(review);
    createCodingAgentBriefReviewDownload(review, requireProductionEvidence);
    setRunState({
      status: source === "gateway" ? "gateway" : "local",
      message: source === "gateway"
        ? copy.codingBriefs.statusReviewGateway(review.decision, review.summary.blockers, review.summary.warnings)
        : copy.codingBriefs.statusReviewLocal(
          review.decision,
          review.summary.blockers,
          review.summary.warnings,
          gatewayError || undefined
        )
    });
    recordAudit({
      type: "development.coding_briefs.reviewed",
      severity: review.decision === "ready" ? "success" : review.decision === "needs-review" ? "warning" : "error",
      summary: `Coding agent brief review completed: ${review.decision}.`,
      runId: review.runId,
      metadata: {
        briefs: review.summary.briefs,
        passed: review.summary.passed,
        warnings: review.summary.warnings,
        blockers: review.summary.blockers,
        source,
        requireProductionEvidence,
        gatewayError
      }
    });
  }

  function createCodingAgentSessionBundleDownload(
    bundle: CodingAgentSessionBundle,
    requireProductionEvidence: boolean
  ) {
    const blob = new Blob([serializeCodingAgentSessionBundleExport(bundle)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const markdownBlob = new Blob([serializeCodingAgentSessionBundleMarkdownExport(bundle)], { type: "text/markdown" });
    const markdownUrl = URL.createObjectURL(markdownBlob);
    const runSlug = bundle.runId ? bundle.runId.replace(/[^a-z0-9-]/gi, "-") : "workspace";
    const mode = requireProductionEvidence ? "production" : "dry-run";
    const fileName = `naikaku-coding-agent-session-bundle-${mode}-${runSlug}-${bundle.operatorLocale}.json`;
    const markdownFileName = `naikaku-coding-agent-session-bundle-${mode}-${runSlug}-${bundle.operatorLocale}.md`;

    if (codingAgentSessionBundleLink) {
      URL.revokeObjectURL(codingAgentSessionBundleLink.href);
    }
    if (codingAgentSessionBundleMarkdownLink) {
      URL.revokeObjectURL(codingAgentSessionBundleMarkdownLink.href);
    }

    setCodingAgentSessionBundleLink({ href: url, fileName });
    setCodingAgentSessionBundleMarkdownLink({ href: markdownUrl, fileName: markdownFileName });
  }

  async function exportCodingAgentSessionBundle(requireProductionEvidence = false) {
    let bundle = buildCodingAgentSessionBundle({
      briefs: codingAgentBriefs,
      review: codingAgentBriefReview,
      releaseVerification,
      requireProductionEvidence
    });
    let source: "gateway" | "local" = "local";
    let gatewayError: string | null = null;

    try {
      bundle = await createCodingAgentSessionBundleViaGateway(
        codingAgentBriefs,
        codingAgentBriefReview,
        releaseVerification,
        requireProductionEvidence
      );
      source = "gateway";
    } catch (error) {
      gatewayError = error instanceof Error ? error.message : "unknown";
    }

    clearCodingAgentSessionDrill();
    clearCodingAgentSessionReceipt();
    setCodingAgentBriefReview(bundle.review);
    setCodingAgentSessionBundle(bundle);
    createCodingAgentSessionBundleDownload(bundle, requireProductionEvidence);
    setRunState({
      status: source === "gateway" ? "gateway" : "local",
      message: source === "gateway"
        ? copy.codingBriefs.statusSessionGateway(bundle.decision, bundle.summary.ready, bundle.summary.held)
        : copy.codingBriefs.statusSessionLocal(
          bundle.decision,
          bundle.summary.ready,
          bundle.summary.held,
          gatewayError || undefined
        )
    });
    recordAudit({
      type: "development.coding_sessions.exported",
      severity: bundle.decision === "ready" ? "success" : bundle.decision === "needs-review" ? "warning" : "error",
      summary: `Coding agent session bundle exported: ${bundle.decision}.`,
      runId: bundle.runId,
      metadata: {
        sessions: bundle.summary.total,
        ready: bundle.summary.ready,
        held: bundle.summary.held,
        productionHeld: bundle.summary.productionHeld,
        source,
        requireProductionEvidence,
        gatewayError
      }
    });
  }

  function createCodingAgentSessionReceiptDownload(report: CodingAgentSessionReceipt) {
    const blob = new Blob([serializeCodingAgentSessionReceiptExport(report)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const markdownBlob = new Blob([serializeCodingAgentSessionReceiptMarkdownExport(report)], { type: "text/markdown" });
    const markdownUrl = URL.createObjectURL(markdownBlob);
    const runSlug = report.runId ? report.runId.replace(/[^a-z0-9-]/gi, "-") : "workspace";
    const fileName = `naikaku-coding-agent-session-receipt-${runSlug}-${report.operatorLocale}.json`;
    const markdownFileName = `naikaku-coding-agent-session-receipt-${runSlug}-${report.operatorLocale}.md`;

    if (codingAgentSessionReceiptLink) {
      URL.revokeObjectURL(codingAgentSessionReceiptLink.href);
    }
    if (codingAgentSessionReceiptMarkdownLink) {
      URL.revokeObjectURL(codingAgentSessionReceiptMarkdownLink.href);
    }

    setCodingAgentSessionReceiptLink({ href: url, fileName });
    setCodingAgentSessionReceiptMarkdownLink({ href: markdownUrl, fileName: markdownFileName });
  }

  async function createCodingAgentImplementationEvidenceDownload(receipt: CodingAgentSessionReceipt): Promise<{
    evidence: CodingAgentImplementationEvidence;
    artifactAudit: CodingAgentImplementationArtifactAudit;
    reconciliation: CodingAgentImplementationReconciliation;
    source: "gateway" | "local";
    gatewayError: string | null;
    artifactAuditSource: "gateway" | "local";
    artifactAuditError: string | null;
  }> {
    let evidence: CodingAgentImplementationEvidence = buildCodingAgentImplementationEvidence({ receipt });
    let artifactAudit: CodingAgentImplementationArtifactAudit | null = null;
    let source: "gateway" | "local" = "local";
    let gatewayError: string | null = null;
    let artifactAuditSource: "gateway" | "local" = "local";
    let artifactAuditError: string | null = null;

    try {
      evidence = await createCodingAgentImplementationEvidenceViaGateway(receipt);
      source = "gateway";
    } catch (error) {
      gatewayError = error instanceof Error ? error.message : "unknown";
    }

    try {
      artifactAudit = await auditCodingAgentImplementationArtifactsViaGateway(evidence);
      artifactAuditSource = "gateway";
    } catch (error) {
      artifactAuditError = error instanceof Error ? error.message : "unknown";
      artifactAudit = auditCodingAgentImplementationArtifacts({ evidence });
    }

    const blob = new Blob([serializeCodingAgentImplementationEvidenceExport(evidence)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const markdownBlob = new Blob([serializeCodingAgentImplementationEvidenceMarkdownExport(evidence)], { type: "text/markdown" });
    const markdownUrl = URL.createObjectURL(markdownBlob);
    const runSlug = evidence.runId ? evidence.runId.replace(/[^a-z0-9-]/gi, "-") : "workspace";
    const fileName = `naikaku-coding-agent-implementation-evidence-${runSlug}-${evidence.operatorLocale}.json`;
    const markdownFileName = `naikaku-coding-agent-implementation-evidence-${runSlug}-${evidence.operatorLocale}.md`;

    if (codingAgentImplementationEvidenceLink) {
      URL.revokeObjectURL(codingAgentImplementationEvidenceLink.href);
    }
    if (codingAgentImplementationEvidenceMarkdownLink) {
      URL.revokeObjectURL(codingAgentImplementationEvidenceMarkdownLink.href);
    }

    setCodingAgentImplementationEvidenceLink({ href: url, fileName });
    setCodingAgentImplementationEvidenceMarkdownLink({ href: markdownUrl, fileName: markdownFileName });
    const { reconciliation, updatedItems } = reconcileCodingAgentImplementationEvidence({
      evidence,
      artifactAudit,
      items: developmentBoard.items,
      generatedAt: evidence.generatedAt
    });
    const appliedItems = reconciliation.items
      .filter((item) => item.applied && item.sourceItemId)
      .map((item) => updatedItems.find((candidate) => candidate.id === item.sourceItemId))
      .filter((item): item is DevelopmentWorkItem => Boolean(item));

    if (appliedItems.length) {
      let nextItems = developmentItems;
      appliedItems.forEach((item) => {
        nextItems = saveDevelopmentWorkItem(item, nextItems);
      });
      preserveCodingAgentBriefReviewRef.current = true;
      setDevelopmentItems(nextItems);
      if (developmentBoardLink) {
        URL.revokeObjectURL(developmentBoardLink.href);
        setDevelopmentBoardLink(null);
      }
      if (developmentIssuesLink) {
        URL.revokeObjectURL(developmentIssuesLink.href);
        setDevelopmentIssuesLink(null);
      }
      if (developmentIssuesScriptLink) {
        URL.revokeObjectURL(developmentIssuesScriptLink.href);
        setDevelopmentIssuesScriptLink(null);
      }
      clearCodingAgentBriefDownloads();
      clearProductReadinessDownload({ preserveCodingAgentBriefReview: true });
    }

    recordAudit({
      type: "development.coding_sessions.implementation_evidence_prepared",
      severity: evidence.decision === "accepted-for-handoff" ? "success" : evidence.decision === "needs-evidence" ? "warning" : "error",
      summary: `Coding agent implementation evidence prepared: ${evidence.decision}.`,
      runId: evidence.runId,
      metadata: {
        sessions: evidence.summary.total,
        accepted: evidence.summary.accepted,
        needsEvidence: evidence.summary.needsEvidence,
        blocked: evidence.summary.blocked,
        changedFiles: evidence.summary.changedFiles,
        commandResults: evidence.summary.commandResults,
        failedCommands: evidence.summary.failedCommands,
        source,
        gatewayError
      }
    });
    recordAudit({
      type: "development.coding_sessions.implementation_artifacts_audited",
      severity: artifactAudit.decision === "verified"
        ? "success"
        : artifactAudit.decision === "needs-artifacts"
          ? "warning"
          : "error",
      summary: `Coding agent implementation artifacts audited: ${artifactAudit.decision}.`,
      runId: artifactAudit.runId,
      metadata: {
        decision: artifactAudit.decision,
        total: artifactAudit.summary.total,
        verified: artifactAudit.summary.verified,
        needsArtifacts: artifactAudit.summary.needsArtifacts,
        blocked: artifactAudit.summary.blocked,
        paths: artifactAudit.summary.paths,
        verifiedPaths: artifactAudit.summary.verifiedPaths,
        missingPaths: artifactAudit.summary.missingPaths,
        unsafePaths: artifactAudit.summary.unsafePaths,
        uncheckedPaths: artifactAudit.summary.uncheckedPaths,
        source: artifactAuditSource,
        gatewayError: artifactAuditError
      }
    });
    recordAudit({
      type: "development.coding_sessions.implementation_evidence_applied",
      severity: reconciliation.decision === "applied"
        ? "success"
        : reconciliation.decision === "partial"
          ? "warning"
          : "error",
      summary: `Coding agent implementation evidence reconciled with development board: ${reconciliation.decision}.`,
      runId: reconciliation.runId,
      metadata: {
        decision: reconciliation.decision,
        sourceDecision: reconciliation.sourceDecision,
        total: reconciliation.summary.total,
        matched: reconciliation.summary.matched,
        applied: reconciliation.summary.applied,
        skipped: reconciliation.summary.skipped,
        blocked: reconciliation.summary.blocked,
        source,
        gatewayError,
        artifactAudit: artifactAudit.decision,
        artifactAuditSource,
        artifactAuditError
      }
    });

    return {
      evidence,
      artifactAudit,
      reconciliation,
      source,
      gatewayError,
      artifactAuditSource,
      artifactAuditError
    };
  }

  async function createCodingAgentSessionReceiptTemplate() {
    const bundle = codingAgentSessionBundle || buildCodingAgentSessionBundle({
      briefs: codingAgentBriefs,
      review: codingAgentBriefReview,
      releaseVerification
    });
    let receipt = buildCodingAgentSessionReceiptTemplate({ bundle });
    let source: "gateway" | "local" = "local";
    let gatewayError: string | null = null;

    try {
      receipt = await createCodingAgentSessionReceiptTemplateViaGateway(bundle);
      source = "gateway";
    } catch (error) {
      gatewayError = error instanceof Error ? error.message : "unknown";
    }

    setCodingAgentBriefReview(bundle.review);
    setCodingAgentSessionBundle(bundle);
    setCodingAgentSessionReceipt(receipt);
    if (!codingAgentSessionBundle) {
      createCodingAgentSessionBundleDownload(bundle, false);
    }
    createCodingAgentSessionReceiptDownload(receipt);
    clearCodingAgentImplementationEvidence();
    setRunState({
      status: source === "gateway" ? "gateway" : "local",
      message: source === "gateway"
        ? copy.codingBriefs.statusReceiptGateway(
          receipt.decision,
          receipt.summary.verified,
          receipt.summary.pendingEvidence,
          receipt.summary.failed
        )
        : copy.codingBriefs.statusReceiptLocal(
          receipt.decision,
          receipt.summary.verified,
          receipt.summary.pendingEvidence,
          receipt.summary.failed,
          gatewayError || undefined
        )
    });
    recordAudit({
      type: "development.coding_sessions.receipt_prepared",
      severity: receipt.decision === "verified" ? "success" : receipt.decision === "needs-evidence" ? "warning" : "error",
      summary: `Coding agent session receipt template prepared: ${receipt.decision}.`,
      runId: receipt.runId,
      metadata: {
        sessions: receipt.summary.total,
        verified: receipt.summary.verified,
        pendingEvidence: receipt.summary.pendingEvidence,
        failed: receipt.summary.failed,
        held: receipt.summary.held,
        source,
        gatewayError
      }
    });
  }

  async function reviewImportedCodingAgentSessionReceipt(file: File) {
    try {
      const raw = JSON.parse(await file.text()) as CodingAgentSessionReceipt;
      if (raw.schema !== "naikaku.coding-agent-session-receipt.v1") {
        throw new Error("receipt with schema naikaku.coding-agent-session-receipt.v1 is required.");
      }

      const bundle = codingAgentSessionBundle || buildCodingAgentSessionBundle({
        briefs: codingAgentBriefs,
        review: codingAgentBriefReview,
        releaseVerification
      });
      let receipt = reviewCodingAgentSessionReceipt({ bundle, receipt: raw });
      let source: "gateway" | "local" = "local";
      let gatewayError: string | null = null;

      try {
        receipt = await reviewCodingAgentSessionReceiptViaGateway(bundle, raw);
        source = "gateway";
      } catch (error) {
        gatewayError = error instanceof Error ? error.message : "unknown";
      }

      setCodingAgentBriefReview(bundle.review);
      setCodingAgentSessionBundle(bundle);
      setCodingAgentSessionReceipt(receipt);
      if (!codingAgentSessionBundle) {
        createCodingAgentSessionBundleDownload(bundle, false);
      }
      createCodingAgentSessionReceiptDownload(receipt);
      const implementationResult = await createCodingAgentImplementationEvidenceDownload(receipt);
      const statusMessage = source === "gateway"
        ? copy.codingBriefs.statusReceiptReviewGateway(
          receipt.decision,
          receipt.summary.verified,
          receipt.summary.pendingEvidence,
          receipt.summary.failed
        )
        : copy.codingBriefs.statusReceiptReviewLocal(
          receipt.decision,
          receipt.summary.verified,
          receipt.summary.pendingEvidence,
          receipt.summary.failed,
          gatewayError || undefined
        );
      setRunState({
        status: source === "gateway" ? "gateway" : "local",
        message: copy.codingBriefs.statusReceiptReviewApplied(
          statusMessage,
          implementationResult.artifactAudit.decision,
          implementationResult.artifactAudit.summary.verifiedPaths,
          implementationResult.artifactAudit.summary.missingPaths + implementationResult.artifactAudit.summary.uncheckedPaths,
          implementationResult.reconciliation.summary.applied,
          implementationResult.reconciliation.summary.skipped
        )
      });
      recordAudit({
        type: "development.coding_sessions.receipt_reviewed",
        severity: receipt.decision === "verified" ? "success" : receipt.decision === "needs-evidence" ? "warning" : "error",
        summary: `Coding agent session receipt reviewed: ${receipt.decision}.`,
        runId: receipt.runId,
        metadata: {
          sessions: receipt.summary.total,
          verified: receipt.summary.verified,
          pendingEvidence: receipt.summary.pendingEvidence,
          failed: receipt.summary.failed,
          held: receipt.summary.held,
          source,
          gatewayError,
          fileName: file.name
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      clearCodingAgentSessionReceipt();
      setRunState({
        status: "error",
        message: copy.codingBriefs.statusReceiptImportError(message)
      });
      recordAudit({
        type: "development.coding_sessions.receipt_reviewed",
        severity: "error",
        summary: `Coding agent session receipt import failed: ${message}.`,
        metadata: {
          fileName: file.name
        }
      });
    }
  }

  function createCodingAgentSessionDrillDownload(report: CodingAgentSessionDrillReport) {
    const blob = new Blob([serializeCodingAgentSessionDrillExport(report)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const markdownBlob = new Blob([serializeCodingAgentSessionDrillMarkdownExport(report)], { type: "text/markdown" });
    const markdownUrl = URL.createObjectURL(markdownBlob);
    const runSlug = report.runId ? report.runId.replace(/[^a-z0-9-]/gi, "-") : "workspace";
    const fileName = `naikaku-coding-agent-session-drill-${runSlug}-${report.operatorLocale}.json`;
    const markdownFileName = `naikaku-coding-agent-session-drill-${runSlug}-${report.operatorLocale}.md`;

    if (codingAgentSessionDrillLink) {
      URL.revokeObjectURL(codingAgentSessionDrillLink.href);
    }
    if (codingAgentSessionDrillMarkdownLink) {
      URL.revokeObjectURL(codingAgentSessionDrillMarkdownLink.href);
    }

    setCodingAgentSessionDrillLink({ href: url, fileName });
    setCodingAgentSessionDrillMarkdownLink({ href: markdownUrl, fileName: markdownFileName });
  }

  async function runCodingAgentSessionDrill() {
    const bundle = codingAgentSessionBundle || buildCodingAgentSessionBundle({
      briefs: codingAgentBriefs,
      review: codingAgentBriefReview,
      releaseVerification
    });
    let drill = buildCodingAgentSessionDrill({ bundle });
    let source: "gateway" | "local" = "local";
    let gatewayError: string | null = null;

    try {
      drill = await createCodingAgentSessionDrillViaGateway(bundle);
      source = "gateway";
    } catch (error) {
      gatewayError = error instanceof Error ? error.message : "unknown";
    }

    setCodingAgentBriefReview(bundle.review);
    setCodingAgentSessionBundle(bundle);
    setCodingAgentSessionDrill(drill);
    if (!codingAgentSessionBundle) {
      createCodingAgentSessionBundleDownload(bundle, false);
    }
    createCodingAgentSessionDrillDownload(drill);
    setRunState({
      status: source === "gateway" ? "gateway" : "local",
      message: source === "gateway"
        ? copy.codingBriefs.statusDrillGateway(drill.decision, drill.summary.wouldAssign, drill.summary.notAssigned)
        : copy.codingBriefs.statusDrillLocal(
          drill.decision,
          drill.summary.wouldAssign,
          drill.summary.notAssigned,
          gatewayError || undefined
        )
    });
    recordAudit({
      type: "development.coding_sessions.drilled",
      severity: drill.decision === "assignable" ? "success" : drill.decision === "held" ? "warning" : "error",
      summary: `Coding agent session drill completed: ${drill.decision}.`,
      runId: drill.runId,
      metadata: {
        sessions: drill.summary.total,
        wouldAssign: drill.summary.wouldAssign,
        notAssigned: drill.summary.notAssigned,
        needsReview: drill.summary.needsReview,
        source,
        gatewayError
      }
    });
  }

  function createDevelopmentIssuesDownload(drafts: DevelopmentIssueDrafts) {
    const blob = new Blob([serializeDevelopmentIssueDraftsExport(drafts)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const runSlug = drafts.runId ? drafts.runId.replace(/[^a-z0-9-]/gi, "-") : "workspace";
    const fileName = `naikaku-github-issue-drafts-${runSlug}.json`;

    if (developmentIssuesLink) {
      URL.revokeObjectURL(developmentIssuesLink.href);
    }

    setDevelopmentIssuesLink({ href: url, fileName });
  }

  function createDevelopmentIssuesScriptDownload(drafts: DevelopmentIssueDrafts) {
    const blob = new Blob([serializeDevelopmentIssueGhScriptExport(drafts)], { type: "text/x-shellscript" });
    const url = URL.createObjectURL(blob);
    const runSlug = drafts.runId ? drafts.runId.replace(/[^a-z0-9-]/gi, "-") : "workspace";
    const fileName = `naikaku-gh-issue-create-${runSlug}.sh`;

    if (developmentIssuesScriptLink) {
      URL.revokeObjectURL(developmentIssuesScriptLink.href);
    }

    setDevelopmentIssuesScriptLink({ href: url, fileName });
  }

  async function exportDevelopmentIssues() {
    try {
      const gatewayDrafts = await createDevelopmentIssuesViaGateway(
        workspace,
        run,
        memoryEntries,
        developmentItems
      );
      createDevelopmentIssuesDownload(gatewayDrafts);
      setRunState({
        status: "gateway",
        message: "GitHub issue drafts exported through the local gateway."
      });
      recordAudit({
        type: "development.issues.exported",
        severity: "info",
        summary: "GitHub issue drafts exported through gateway.",
        runId: gatewayDrafts.runId,
        metadata: {
          drafts: gatewayDrafts.summary.total,
          blocked: gatewayDrafts.summary.blocked,
          source: "gateway"
        }
      });
    } catch (error) {
      createDevelopmentIssuesDownload(developmentIssueDrafts);
      setRunState({
        status: "fallback",
        message: error instanceof Error
          ? `Gateway issue drafts unavailable; used local export. ${error.message}`
          : "Gateway issue drafts unavailable; used local export."
      });
      recordAudit({
        type: "development.issues.exported",
        severity: "warning",
        summary: "GitHub issue drafts exported locally.",
        runId: developmentIssueDrafts.runId,
        metadata: {
          drafts: developmentIssueDrafts.summary.total,
          blocked: developmentIssueDrafts.summary.blocked,
          source: "local",
          gatewayError: error instanceof Error ? error.message : "unknown"
        }
      });
    }
  }

  function exportDevelopmentIssueScript() {
    createDevelopmentIssuesScriptDownload(developmentIssueDrafts);
    setRunState({
      status: "local",
      message: "GitHub CLI issue script prepared locally."
    });
    recordAudit({
      type: "development.issues.exported",
      severity: "info",
      summary: "GitHub CLI issue creation script prepared.",
      runId: developmentIssueDrafts.runId,
      metadata: {
        drafts: developmentIssueDrafts.summary.total,
        blocked: developmentIssueDrafts.summary.blocked,
        format: "gh-script",
        source: "local"
      }
    });
  }

  async function testProviderReadiness(row: ProviderReadinessRow) {
    const role = workspace.roles.find((candidate) => candidate.id === row.roleId);
    if (!role) return;

    setTestingProviderRoleIds((current) => Array.from(new Set([...current, row.roleId])));
    try {
      const result = await testProviderViaGateway(role.provider, sessionSecrets[role.id]);
      const checked = createProviderReadinessCheck({
        row,
        ok: result.ok,
        secretReady: Boolean(result.secretReady),
        source: "gateway",
        message: result.message
      });
      const nextRows = saveProviderReadinessRow(checked);
      setProviderReadinessRows(nextRows);
      recordProviderReadinessAudit(checked);
    } catch {
      const adapter = findAdapter(role.provider);
      const ok = await adapter.testConnection(role.provider, sessionSecrets[role.id]);
      const checked = createProviderReadinessCheck({
        row,
        ok,
        secretReady: Boolean(sessionSecrets[role.id]) || row.secretReady,
        source: "local-fallback",
        message: ok
          ? `${adapter.id}: local fallback accepted endpoint and model shape.`
          : "Gateway unavailable and local fallback found missing endpoint or model."
      });
      const nextRows = saveProviderReadinessRow(checked);
      setProviderReadinessRows(nextRows);
      recordProviderReadinessAudit(checked);
    } finally {
      setTestingProviderRoleIds((current) => current.filter((roleId) => roleId !== row.roleId));
    }
  }

  async function testAllProviders() {
    setIsTestingAllProviders(true);
    try {
      for (const row of providerReadinessMatrix.rows.filter((candidate) => candidate.enabled)) {
        await testProviderReadiness(row);
      }
    } finally {
      setIsTestingAllProviders(false);
    }
  }

  function recordProviderReadinessAudit(row: ProviderReadinessRow) {
    if (providerReadinessLink) {
      URL.revokeObjectURL(providerReadinessLink.href);
      setProviderReadinessLink(null);
    }
    clearProductReadinessDownload();
    recordAudit({
      type: "provider.readiness.checked",
      severity: row.status === "ready" ? "success" : row.status === "failed" ? "error" : "warning",
      summary: `Provider readiness for ${row.roleName}: ${row.status}.`,
      roleId: row.roleId,
      metadata: {
        provider: row.provider,
        model: row.model,
        status: row.status,
        source: row.source,
        secretReady: row.secretReady
      }
    });
  }

  function exportProviderReadiness() {
    const blob = new Blob([serializeProviderReadinessExport(providerReadinessMatrix)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const fileName = `naikaku-provider-readiness-${new Date().toISOString().slice(0, 10)}.json`;

    if (providerReadinessLink) {
      URL.revokeObjectURL(providerReadinessLink.href);
    }

    setProviderReadinessLink({ href: url, fileName });
    recordAudit({
      type: "provider.readiness.exported",
      severity: "info",
      summary: "Provider readiness export prepared.",
      metadata: {
        roles: providerReadinessMatrix.summary.roles,
        ready: providerReadinessMatrix.summary.ready,
        missingConfig: providerReadinessMatrix.summary.missingConfig,
        missingSecret: providerReadinessMatrix.summary.missingSecret,
        failed: providerReadinessMatrix.summary.failed
      }
    });
  }

  function clearAuditLog() {
    setAuditEvents(clearAuditEvents());
    if (auditLink) {
      URL.revokeObjectURL(auditLink.href);
      setAuditLink(null);
    }
    clearProductReadinessDownload();
  }

  return (
    <main className="app-shell" lang={htmlLang(locale)}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <GitBranch size={19} />
          </div>
          <div>
            <strong>Naikaku AI Togo</strong>
            <span>{copy.brandSubtitle}</span>
          </div>
        </div>
        <nav className="topbar-nav" aria-label="Workspace status">
          <span>
            <Brain size={15} /> {copy.rolesActive(activeRoles.length)}
          </span>
          <span>
            <Shield size={15} /> {copy.sandboxFirst}
          </span>
          <span>
            <FileKey2 size={15} /> {copy.secretsSessionOnly}
          </span>
        </nav>
        <div className="topbar-actions">
          <label className="locale-select">
            <Languages size={15} />
            <span>{copy.language}</span>
            <select
              aria-label={copy.language}
              value={locale}
              onChange={(event) => setLocale(event.target.value as SupportedLocale)}
            >
              {supportedLocales.map((option) => (
                <option value={option.code} key={option.code}>
                  {option.nativeLabel}
                </option>
              ))}
            </select>
          </label>
          <button className="icon-button" type="button" onClick={resetWorkspace} aria-label={copy.resetWorkspace}>
            <RefreshCcw size={17} />
          </button>
          <button className="icon-button" type="button" onClick={() => fileInputRef.current?.click()} aria-label={copy.importWorkspace}>
            <Upload size={17} />
          </button>
          <button className="icon-button" type="button" onClick={exportWorkspace} aria-label={copy.exportWorkspace}>
            <Download size={17} />
          </button>
          {exportLink ? (
            <a className="secondary-button download-link" href={exportLink.href} download={exportLink.fileName}>
              <Download size={16} /> JSON
            </a>
          ) : null}
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            onChange={importWorkspace}
          />
          <button className="secondary-button" type="button" onClick={persistWorkspace}>
            {saveState === "saved" ? <CheckCircle2 size={16} /> : <Save size={16} />}
            {saveState === "saved" ? copy.saved : copy.save}
          </button>
          <button className="primary-button" type="button" onClick={runCabinet} disabled={runState.status === "running"}>
            <Play size={16} /> {runState.status === "running" ? copy.running : copy.runCabinet}
          </button>
        </div>
      </header>

      <section className="workspace-grid">
        <RoleRail
          roles={workspace.roles}
          selectedRoleId={selectedRole?.id || ""}
          onSelect={setSelectedRoleId}
          onToggle={(roleId, enabled) => updateRole(roleId, { enabled })}
          onCreateRole={() => addRole()}
          onDuplicateRole={() => selectedRole && addRole(selectedRole)}
        />

        <section className="center-column">
          <section className="mission-header">
            <div>
              <p className="section-kicker">{copy.missionKicker}</p>
              <h1>{copy.missionTitle}</h1>
            </div>
            <div className="decision-tile" data-decision={run?.score.decision || "idle"}>
              <span>{copy.decision}</span>
              <strong>{run?.score.decision || copy.notRun}</strong>
            </div>
          </section>

          <MissionControl
            mission={workspace.mission}
            onMissionChange={(mission) => setWorkspace((current) => ({ ...current, mission }))}
            run={run}
            roles={workspace.roles}
            sandboxPolicy={workspace.sandboxPolicy}
            runStatus={runState}
            runMode={runMode}
            onRunModeChange={setRunMode}
          />

          <ProductReadinessPanel
            report={productReadinessReport}
            exportLink={productReadinessLink}
            releaseLink={productReleaseLink}
            releaseNotesLink={productReleaseNotesLink}
            onExport={exportProductReadiness}
            onExportRelease={exportProductReleaseBundle}
          />

          <ReleaseRehearsalPanel
            report={releaseRehearsal}
            exportLink={releaseRehearsalLink}
            verification={releaseVerification}
            verificationLink={releaseVerificationLink}
            issueDraftsLink={releaseRemediationIssuesLink}
            issueScriptLink={releaseRemediationScriptLink}
            copy={copy.releaseRehearsal}
            onRun={runReleaseRehearsal}
            onExport={exportReleaseRehearsal}
            onVerify={() => void verifyRelease(false)}
            onVerifyProduction={() => void verifyRelease(true)}
            onExportIssueDrafts={exportReleaseRemediationIssues}
            onExportIssueScript={exportReleaseRemediationScript}
          />

          <ProviderReadinessPanel
            matrix={providerReadinessMatrix}
            sessionSecrets={sessionSecrets}
            testingRoleIds={testingProviderRoleIds}
            isTestingAll={isTestingAllProviders}
            exportLink={providerReadinessLink}
            onProviderConfigChange={updateRoleProvider}
            onSecretChange={updateSecret}
            onTestRole={testProviderReadiness}
            onTestAll={testAllProviders}
            onExport={exportProviderReadiness}
          />

          <AutomationQueue
            actions={run?.automationActions || []}
            approvalRecords={approvalRecordsByAction}
            readyCount={readyActionCount}
            handoffLink={handoffLink}
            evidenceLink={executorEvidenceLink}
            executorRun={executorRun}
            executorRunning={executorRunning}
            onDecision={recordAutomationDecision}
            onExportHandoff={exportExecutorHandoff}
            onExportEvidence={exportExecutorEvidence}
            onRunExecutor={runExecutorDryRun}
          />

          <AutomationRunbookPanel
            runbook={automationRunbook}
            exportLink={automationRunbookLink}
            onExport={exportAutomationRunbook}
          />

          <ServerLedgerPanel
            status={serverLedger.status}
            message={serverLedger.message}
            summary={serverLedger.summary}
            approvals={serverLedger.approvals}
            evidenceBundles={serverLedger.evidenceBundles}
            evidenceMessage={serverLedger.evidenceMessage}
            onRefresh={refreshServerLedger}
          />

          <TeamHandoffPanel
            handoff={teamHandoff}
            exportLink={teamHandoffLink}
            scaffoldLink={roleWorkspaceLink}
            onExport={exportTeamHandoff}
            onExportScaffolds={exportRoleWorkspaceScaffolds}
          />

          <DevelopmentBoardPanel
            board={developmentBoard}
            exportLink={developmentBoardLink}
            onStatusChange={changeDevelopmentItemStatus}
            onExport={exportDevelopmentBoard}
          />

          <CodingAgentBriefsPanel
            briefs={codingAgentBriefs}
            review={codingAgentBriefReview}
            sessionBundle={codingAgentSessionBundle}
            sessionDrill={codingAgentSessionDrill}
            sessionReceipt={codingAgentSessionReceipt}
            exportLink={codingAgentBriefsLink}
            markdownLink={codingAgentBriefsMarkdownLink}
            reviewLink={codingAgentBriefReviewLink}
            sessionLink={codingAgentSessionBundleLink}
            sessionMarkdownLink={codingAgentSessionBundleMarkdownLink}
            drillLink={codingAgentSessionDrillLink}
            drillMarkdownLink={codingAgentSessionDrillMarkdownLink}
            receiptLink={codingAgentSessionReceiptLink}
            receiptMarkdownLink={codingAgentSessionReceiptMarkdownLink}
            implementationEvidenceLink={codingAgentImplementationEvidenceLink}
            implementationEvidenceMarkdownLink={codingAgentImplementationEvidenceMarkdownLink}
            copy={copy.codingBriefs}
            onExport={() => void exportCodingAgentBriefs()}
            onExportMarkdown={exportCodingAgentBriefsMarkdown}
            onReview={() => void runCodingAgentBriefReview(false)}
            onProductionReview={() => void runCodingAgentBriefReview(true)}
            onExportSession={() => void exportCodingAgentSessionBundle(false)}
            onExportProductionSession={() => void exportCodingAgentSessionBundle(true)}
            onRunSessionDrill={() => void runCodingAgentSessionDrill()}
            onCreateSessionReceipt={() => void createCodingAgentSessionReceiptTemplate()}
            onImportSessionReceipt={(file) => void reviewImportedCodingAgentSessionReceipt(file)}
          />

          <DevelopmentIssuesPanel
            drafts={developmentIssueDrafts}
            exportLink={developmentIssuesLink}
            scriptLink={developmentIssuesScriptLink}
            onExport={exportDevelopmentIssues}
            onExportScript={exportDevelopmentIssueScript}
          />

          <MemoryInboxPanel
            candidates={memoryCandidates}
            entries={memoryEntries}
            exportLink={memoryLink}
            onDecision={recordMemoryReview}
            onExport={exportMemoryLog}
          />

          <SandboxCapabilityPanel registry={sandboxCapabilityRegistry} />

          <SandboxPanel
            policy={workspace.sandboxPolicy}
            onChange={(sandboxPolicy) => setWorkspace((current) => ({ ...current, sandboxPolicy }))}
          />
        </section>

        <RoleInspector
          role={selectedRole}
          sessionSecret={sessionSecrets[selectedRole?.id || ""] || ""}
          canDelete={Boolean(selectedRole && !isDefaultRoleId(selectedRole.id))}
          onSecretChange={(value) => selectedRole && updateSecret(selectedRole.id, value)}
          onChange={(patch) => selectedRole && updateRole(selectedRole.id, patch)}
          onDelete={() => selectedRole && deleteRole(selectedRole.id)}
        />
      </section>

      <footer className="operator-footer">
        <RunLog
          run={run}
          history={runHistory}
          onClearHistory={() => setRunHistory(clearRunHistory())}
        />
        <section className="footer-panel">
          <div className="panel-heading">
            <span>
              <Activity size={15} /> Automation posture
            </span>
            <strong>{workspace.sandboxPolicy.killSwitchArmed ? "armed" : "open"}</strong>
          </div>
          <div className="metric-strip">
            <Metric icon={<Cpu size={16} />} label="Executors" value={`${sandboxCapabilityRegistry.summary.profiles} profiles`} />
            <Metric icon={<SlidersHorizontal size={16} />} label="Allowlist" value={`${workspace.sandboxPolicy.networkAllowlist.length} domains`} />
            <Metric icon={<CircleStop size={16} />} label="Blocked" value={`${workspace.sandboxPolicy.blockedActions.length} actions`} />
            <Metric icon={<Sparkles size={16} />} label="Next loop" value={run ? `${run.nextIteration.length} tasks` : "pending"} />
            <Metric
              icon={runState.status === "fallback" || runState.status === "error" ? <AlertTriangle size={16} /> : <Cloud size={16} />}
              label="Run path"
              value={runState.status}
            />
          </div>
        </section>
        <AuditTrailPanel
          events={auditEvents}
          exportLink={auditLink}
          onExport={exportAuditLog}
          onClear={clearAuditLog}
        />
      </footer>
    </main>
  );
}

function Metric({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
