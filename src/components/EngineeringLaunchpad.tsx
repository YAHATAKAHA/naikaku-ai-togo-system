import {
  Bot,
  CheckCircle2,
  ClipboardCheck,
  Download,
  FlaskConical,
  PackageCheck,
  PlayCircle,
  ShieldCheck,
  Terminal,
  WandSparkles
} from "lucide-react";
import type {
  CabinetRun,
  CodingAgentBriefs,
  CodingAgentRunnerManifest,
  CodingAgentRunnerSelfTest,
  CodingAgentSandboxRunnerPreflight,
  CodingAgentSandboxRunnerReport,
  CodingAgentSessionBundle,
  DevelopmentIssueDrafts
} from "../domain/types";
import type { EngineeringLaunchProfile } from "../domain/engineeringLaunchProfile";
import type { EngineeringExecutionReceipt } from "../domain/engineeringExecutionReceipt";
import type { EngineeringLaunchQueue } from "../domain/engineeringLaunchQueue";
import type { EngineeringMacRunnerContract } from "../domain/engineeringMacRunnerContract";
import type { EngineeringMacRunnerReadiness } from "../domain/engineeringMacRunnerReadiness";
import type { EngineeringSelfSimulationReport } from "../domain/engineeringSelfSimulation";
import type { EngineeringLaunchpadCopy } from "../i18n";

interface DownloadLink {
  href: string;
  fileName: string;
}

interface EngineeringLaunchpadProps {
  copy: EngineeringLaunchpadCopy;
  activeRoles: number;
  run: CabinetRun | null;
  mission: string;
  profile: EngineeringLaunchProfile;
  selfSimulation: EngineeringSelfSimulationReport | null;
  selfSimulationJsonLink: DownloadLink | null;
  selfSimulationMarkdownLink: DownloadLink | null;
  launchQueue: EngineeringLaunchQueue | null;
  launchQueueJsonLink: DownloadLink | null;
  launchQueueMarkdownLink: DownloadLink | null;
  executionReceipt: EngineeringExecutionReceipt | null;
  executionReceiptJsonLink: DownloadLink | null;
  executionReceiptMarkdownLink: DownloadLink | null;
  macRunnerReadiness: EngineeringMacRunnerReadiness;
  macRunnerContract: EngineeringMacRunnerContract;
  briefs: CodingAgentBriefs;
  sessionBundle: CodingAgentSessionBundle | null;
  runnerManifest: CodingAgentRunnerManifest | null;
  runnerSelfTest: CodingAgentRunnerSelfTest | null;
  sandboxRunnerPreflight: CodingAgentSandboxRunnerPreflight | null;
  sandboxRunnerReport: CodingAgentSandboxRunnerReport | null;
  issueDrafts: DevelopmentIssueDrafts;
  runStatus: string;
  onMissionChange: (mission: string) => void;
  onFocusMission: () => void;
  onApplyMissionTemplate: () => void;
  onRunSelfSimulation: () => void;
  onRunCabinet: () => void;
  onPrepareEngineeringPack: () => void;
  onRunPreflight: () => void;
  onRunSandbox: () => void;
  onExportIssueScript: () => void;
}

export function EngineeringLaunchpad({
  copy,
  activeRoles,
  run,
  mission,
  profile,
  selfSimulation,
  selfSimulationJsonLink,
  selfSimulationMarkdownLink,
  launchQueue,
  launchQueueJsonLink,
  launchQueueMarkdownLink,
  executionReceipt,
  executionReceiptJsonLink,
  executionReceiptMarkdownLink,
  macRunnerReadiness,
  macRunnerContract,
  briefs,
  sessionBundle,
  runnerManifest,
  runnerSelfTest,
  sandboxRunnerPreflight,
  sandboxRunnerReport,
  issueDrafts,
  runStatus,
  onMissionChange,
  onFocusMission,
  onApplyMissionTemplate,
  onRunSelfSimulation,
  onRunCabinet,
  onPrepareEngineeringPack,
  onRunPreflight,
  onRunSandbox,
  onExportIssueScript
}: EngineeringLaunchpadProps) {
  const readySessions = sessionBundle?.summary.ready || 0;
  const heldSessions = sessionBundle?.summary.held || 0;
  const runnerTasks = runnerManifest?.summary.runnerTasks || 0;
  const canRunSandbox = Boolean(
    runnerSelfTest?.decision === "self-test-ready" &&
    (!sandboxRunnerPreflight || sandboxRunnerPreflight.decision === "ready")
  );
  const externalWriteRequested = profile.signals.includes("external-write-requested");
  const hasVerifiedCodeExecution = Boolean(
    executionReceipt?.canClaimLocalRun || executionReceipt?.canClaimCodeChanged
  );
  const state = launchState({
    run,
    runnerSelfTest,
    sandboxRunnerPreflight,
    sandboxRunnerReport
  });

  return (
    <section className="engineering-launchpad-panel" data-state={state}>
      <div className="engineering-launchpad-header">
        <div>
          <span>
            <Bot size={15} /> {copy.kicker}
          </span>
          <h2>{copy.title}</h2>
          <p>{copy.subtitle}</p>
        </div>
        <div className="engineering-launchpad-state">
          <small>{copy.stateLabel}</small>
          <strong>{copy.state(state)}</strong>
        </div>
      </div>

      <div className="engineering-entry-console">
        <article>
          <small>{copy.entryLabel}</small>
          <strong>{copy.entryTitle}</strong>
          <p>{copy.entryBody}</p>
        </article>
        <div className="engineering-entry-actions">
          <button type="button" onClick={onFocusMission}>
            <ClipboardCheck size={15} /> {copy.focusMission}
          </button>
          <button className="engineering-self-simulation-button" type="button" onClick={onRunSelfSimulation}>
            <FlaskConical size={15} /> {copy.runSelfSimulation}
          </button>
          <button type="button" onClick={onRunCabinet} disabled={runStatus === "running"}>
            <PlayCircle size={15} /> {copy.runCabinet}
          </button>
        </div>
      </div>

      <div className="engineering-reality-strip" aria-label={copy.realityLabel}>
        <small>{copy.realityLabel}</small>
        <div>
          <span data-status={hasVerifiedCodeExecution ? "ready" : profile.missionReady ? "waiting" : "blocked"}>
            {copy.realityCodeLabel}
            <strong>
              {copy.realityCodeStatus(
                hasVerifiedCodeExecution,
                macRunnerReadiness.canRunCodeSandbox,
                profile.missionReady,
                Boolean(selfSimulation)
              )}
            </strong>
          </span>
          <span data-status={macRunnerReadiness.canControlMacDesktop ? "ready" : "blocked"}>
            {copy.realityMacLabel}
            <strong>{copy.realityMacStatus(macRunnerReadiness.canControlMacDesktop)}</strong>
          </span>
          <span data-status={externalWriteRequested ? "blocked" : "waiting"}>
            {copy.realityExternalLabel}
            <strong>{copy.realityExternalStatus(externalWriteRequested)}</strong>
          </span>
        </div>
      </div>

      <div className="engineering-launchpad-metrics" aria-label={copy.metricsLabel}>
        <span>{copy.roles(activeRoles)}</span>
        <span>{copy.briefs(briefs.summary.total, briefs.summary.implementable)}</span>
        <span>{copy.sessions(readySessions, heldSessions)}</span>
        <span>{copy.runner(runnerTasks, runnerSelfTest?.decision || "not-ready")}</span>
      </div>

      <div className="engineering-mission-composer">
        <label htmlFor="engineering-mission">{copy.missionInputLabel}</label>
        <textarea
          id="engineering-mission"
          value={mission}
          onChange={(event) => onMissionChange(event.target.value)}
          placeholder={copy.missionInputPlaceholder}
          rows={5}
        />
        <p className="engineering-mission-help">{copy.missionInputHelp}</p>
        <div className="engineering-mission-composer-footer">
          <span>
            {copy.missionDraftScore(
              profile.missionDraft.score,
              profile.missionDraft.present,
              profile.missionDraft.missing,
              profile.missionDraft.recommended
            )}
          </span>
          <div>
            <button type="button" onClick={onApplyMissionTemplate}>
              <WandSparkles size={15} /> {copy.applyMissionTemplate}
            </button>
            <button className="engineering-self-simulation-button" type="button" onClick={onRunSelfSimulation}>
              <FlaskConical size={15} /> {copy.runSelfSimulation}
            </button>
            <button type="button" onClick={onRunCabinet} disabled={runStatus === "running"}>
              <PlayCircle size={15} /> {copy.runCabinet}
            </button>
          </div>
        </div>
      </div>

      <div className="engineering-profile-grid">
        <article>
          <small>{copy.permissionModeLabel}</small>
          <strong>{copy.permissionMode(profile.permissionMode)}</strong>
        </article>
        <article>
          <small>{copy.launchStageLabel}</small>
          <strong>{copy.launchStage(profile.stage)}</strong>
        </article>
        <article>
          <small>{copy.nextActionLabel}</small>
          <strong>{copy.nextAction(profile.nextAction)}</strong>
        </article>
      </div>

      <div className="engineering-mission-draft-grid" aria-label={copy.missionDraftLabel}>
        <article className="engineering-mission-draft-score">
          <small>{copy.missionDraftLabel}</small>
          <strong>
            {copy.missionDraftScore(
              profile.missionDraft.score,
              profile.missionDraft.present,
              profile.missionDraft.missing,
              profile.missionDraft.recommended
            )}
          </strong>
        </article>
        <div>
          {profile.missionDraft.items.map((item) => (
            <span data-status={item.status} key={item.id}>
              {copy.missionDraftItem(item.id)}
              <small>{copy.missionDraftStatus(item.status)}</small>
            </span>
          ))}
        </div>
      </div>

      <div className="engineering-capability-strip" aria-label={copy.capabilitiesLabel}>
        {profile.capabilities.map((capability) => (
          <span
            data-status={capability.status}
            key={capability.id}
            title={capability.reason}
          >
            {copy.capability(capability.id)}
            <small>{copy.capabilityStatus(capability.status)}</small>
          </span>
        ))}
      </div>

      <div className="engineering-mac-scope" aria-label={copy.macScopeLabel}>
        <strong>{copy.macScopeLabel}</strong>
        <div>
          {copy.macScopeItems.map((item) => (
            <span key={item}>{item}</span>
          ))}
        </div>
      </div>

      <div
        className="engineering-mac-runner-readiness"
        data-decision={macRunnerReadiness.decision}
        aria-label={copy.macRunnerLabel}
      >
        <article className="engineering-mac-runner-heading">
          <small>{copy.macRunnerLabel}</small>
          <strong>{copy.macRunnerDecision(macRunnerReadiness.decision)}</strong>
          <p>
            {copy.macRunnerSummary(
              macRunnerReadiness.summary.readyCapabilities,
              macRunnerReadiness.summary.approvalRequired,
              macRunnerReadiness.summary.runtimeNeeded,
              macRunnerReadiness.summary.deniedByDefault,
              macRunnerReadiness.summary.availableAdapters
            )}
          </p>
        </article>
        <div className="engineering-mac-runner-capabilities">
          {macRunnerReadiness.capabilities.map((capability) => (
            <span data-status={capability.status} key={capability.id} title={capability.requiredForRealUse}>
              {copy.macRunnerCapability(capability.id)}
              <small>{copy.macRunnerCapabilityStatus(capability.status)}</small>
            </span>
          ))}
        </div>
        <div className="engineering-mac-runner-review">
          <article>
            <strong>{copy.macRunnerPermissionsLabel}</strong>
            <div>
              {macRunnerReadiness.permissions.map((permission) => (
                <span data-status={permission.status} key={permission.id} title={permission.evidenceRequired}>
                  {copy.macRunnerPermission(permission.id)}
                  <small>{copy.macRunnerPermissionStatus(permission.status)}</small>
                </span>
              ))}
            </div>
          </article>
          <article>
            <strong>{copy.macRunnerAdaptersLabel}</strong>
            <div>
              {macRunnerReadiness.adapters.map((adapter) => (
                <span data-status={adapter.status} key={adapter.id} title={adapter.stopCondition}>
                  {copy.macRunnerAdapter(adapter.id)}
                  <small>{copy.macRunnerAdapterStatus(adapter.status)}</small>
                </span>
              ))}
            </div>
          </article>
        </div>
        <div className="engineering-mac-runner-notes">
          <article>
            <strong>{copy.macRunnerNextActionsLabel}</strong>
            <ul>
              {macRunnerReadiness.nextActions.slice(0, 4).map((action) => (
                <li key={action}>{copy.macRunnerNextAction(action)}</li>
              ))}
            </ul>
          </article>
          <article>
            <strong>{copy.macRunnerHonestyLabel}</strong>
            <p>{copy.macRunnerHonestyClaim(macRunnerReadiness.canControlMacDesktop)}</p>
            <small>{copy.macRunnerHonestyLimit}</small>
          </article>
        </div>
      </div>

      <div
        className="engineering-mac-runner-contract"
        data-decision={macRunnerContract.decision}
        aria-label={copy.macRunnerContractLabel}
      >
        <article className="engineering-mac-runner-contract-heading">
          <small>{copy.macRunnerContractLabel}</small>
          <strong>{copy.macRunnerContractDecision(macRunnerContract.decision)}</strong>
          <p>
            {copy.macRunnerContractSummary(
              macRunnerContract.summary.totalActions,
              macRunnerContract.summary.readyForApproval,
              macRunnerContract.summary.needsRuntime,
              macRunnerContract.summary.blocked,
              macRunnerContract.summary.evidenceTargets,
              macRunnerContract.summary.requiredPermissions
            )}
          </p>
        </article>
        <div className="engineering-mac-runner-contract-actions">
          {macRunnerContract.actions.slice(0, 10).map((action) => (
            <span data-status={action.status} key={action.id} title={action.nextAction}>
              {copy.macRunnerContractAction(action.id)}
              <small>{copy.macRunnerContractActionStatus(action.status)}</small>
            </span>
          ))}
        </div>
        <div className="engineering-mac-runner-contract-review">
          <article>
            <strong>{copy.macRunnerContractChecksLabel}</strong>
            <div>
              {macRunnerContract.checks.map((check) => (
                <span data-status={check.status} key={check.id} title={check.summary}>
                  {check.id}
                  <small>{copy.macRunnerContractCheckStatus(check.status)}</small>
                </span>
              ))}
            </div>
          </article>
          <article>
            <strong>{copy.macRunnerContractDeniedLabel}</strong>
            <ul>
              {macRunnerContract.deniedActions.slice(0, 5).map((item) => (
                <li key={item}>{copy.macRunnerContractDeniedAction(item)}</li>
              ))}
            </ul>
          </article>
        </div>
        <article className="engineering-mac-runner-contract-instructions">
          <strong>{copy.macRunnerContractInstructionsLabel}</strong>
          <ul>
            {macRunnerContract.runnerInstructions.slice(0, 4).map((item) => (
              <li key={item}>{copy.macRunnerContractInstruction(item)}</li>
            ))}
          </ul>
        </article>
      </div>

      <div className="engineering-signal-strip" aria-label={copy.signalsLabel}>
        {profile.signals.map((signal) => (
          <span key={signal}>{copy.signal(signal)}</span>
        ))}
      </div>

      <div className="engineering-unlock-list" aria-label={copy.unlockChecklistLabel}>
        {profile.unlockChecklist.map((item) => (
          <article data-status={item.status} key={item.id}>
            <strong>{copy.unlockItem(item.id, item.count)}</strong>
            <small>{copy.unlockStatus(item.status)}</small>
          </article>
        ))}
      </div>

      <div
        className="engineering-self-simulation-panel"
        data-decision={selfSimulation?.decision || "not-run"}
        aria-label={copy.selfSimulationLabel}
      >
        <article className="engineering-self-simulation-heading">
          <small>{copy.selfSimulationLabel}</small>
          <strong>
            {selfSimulation
              ? copy.selfSimulationDecision(selfSimulation.decision)
              : copy.selfSimulationEmpty}
          </strong>
          <p>
            {selfSimulation
              ? copy.selfSimulationSummary(
                selfSimulation.summary.readySessions,
                selfSimulation.summary.heldSessions,
                selfSimulation.summary.allowedCommands,
                selfSimulation.summary.expectedEvidenceArtifacts
              )
              : copy.selfSimulationEmptyDetail}
          </p>
        </article>
        {selfSimulation ? (
          <>
            <div className="engineering-self-simulation-stages">
              {selfSimulation.stages.map((stage) => (
                <span data-status={stage.status} key={stage.id} title={stage.nextAction}>
                  {copy.selfSimulationStage(stage.id)}
                  <small>{copy.selfSimulationStageStatus(stage.status)}</small>
                </span>
              ))}
            </div>
            <div className="engineering-self-simulation-capabilities">
              {selfSimulation.capabilities.map((capability) => (
                <span data-status={capability.status} key={capability.id} title={capability.summary}>
                  {copy.selfSimulationCapability(capability.id)}
                  <small>{copy.selfSimulationCapabilityStatus(capability.status)}</small>
                </span>
              ))}
            </div>
            <div
              className="engineering-permission-request"
              data-decision={selfSimulation.permissionRequest.decision}
            >
              <article className="engineering-permission-request-heading">
                <small>{copy.permissionRequestLabel}</small>
                <strong>{copy.permissionRequestDecision(selfSimulation.permissionRequest.decision)}</strong>
                <p>
                  {copy.permissionRequestSummary(
                    selfSimulation.permissionRequest.requests.length,
                    selfSimulation.permissionRequest.requests.filter((request) =>
                      request.mode === "ask-before-use"
                    ).length,
                    selfSimulation.permissionRequest.defaultDenied.length
                  )}
                </p>
              </article>
              <div className="engineering-permission-request-items">
                {selfSimulation.permissionRequest.requests.map((request) => (
                  <span data-mode={request.mode} key={request.id} title={`${request.requiredFor} ${request.reason}`}>
                    {copy.capability(request.id)}
                    <small>{copy.permissionRequestMode(request.mode)}</small>
                  </span>
                ))}
              </div>
              <article className="engineering-permission-denied">
                <strong>{copy.permissionRequestDeniedLabel}</strong>
                <ul>
                  {selfSimulation.permissionRequest.defaultDenied.slice(0, 3).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            </div>
            <div
              className="engineering-capability-gap"
              data-decision={selfSimulation.capabilityGap.decision}
            >
              <article className="engineering-capability-gap-heading">
                <small>{copy.capabilityGapLabel}</small>
                <strong>{copy.capabilityGapDecision(selfSimulation.capabilityGap.decision)}</strong>
                <p>
                  {copy.capabilityGapSummary(
                    selfSimulation.capabilityGap.engineeringReadiness,
                    selfSimulation.capabilityGap.macRuntimeReadiness,
                    selfSimulation.capabilityGap.canPrepareEngineering,
                    selfSimulation.capabilityGap.canControlMacDesktop
                  )}
                </p>
              </article>
              <div className="engineering-capability-gap-items">
                {selfSimulation.capabilityGap.items.map((item) => (
                  <span data-status={item.status} key={item.id} title={`${item.current} ${item.requiredToBeReal}`}>
                    {copy.capabilityGapItem(item.id)}
                    <small>{copy.capabilityGapStatus(item.status)}</small>
                  </span>
                ))}
              </div>
              <article className="engineering-capability-gap-note">
                <strong>{copy.capabilityGapHonestyLabel}</strong>
                <p>{selfSimulation.capabilityGap.honestComparison}</p>
              </article>
            </div>
            <div
              className="engineering-launch-queue"
              data-decision={launchQueue?.decision || "not-prepared"}
            >
              <article className="engineering-launch-queue-heading">
                <small>{copy.launchQueueLabel}</small>
                <strong>
                  {launchQueue
                    ? copy.launchQueueDecision(launchQueue.decision)
                    : copy.launchQueueEmpty}
                </strong>
                <p>
                  {launchQueue
                    ? copy.launchQueueSummary(
                      launchQueue.summary.readyToRun,
                      launchQueue.summary.readyToHandoff,
                      launchQueue.summary.held,
                      launchQueue.summary.allowedCommands,
                      launchQueue.summary.expectedEvidenceArtifacts
                    )
                    : copy.launchQueueSummary(0, 0, 0, 0, 0)}
                </p>
              </article>
              {launchQueue ? (
                <>
                  <div className="engineering-launch-queue-items">
                    {launchQueue.items.slice(0, 6).map((item) => (
                      <span data-status={item.status} key={item.sessionId} title={item.nextAction}>
                        {item.title}
                        <small>
                          {copy.launchQueueStatus(item.status)}・{item.commands.length} cmd
                        </small>
                      </span>
                    ))}
                  </div>
                  <div className="engineering-launch-queue-review">
                    <article>
                      <strong>{copy.launchQueueChecklistLabel}</strong>
                      <ul>
                        {launchQueue.operatorChecklist.slice(0, 3).map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </article>
                    <article>
                      <strong>{copy.launchQueueHonestyLabel}</strong>
                      <p>{launchQueue.honestyClaim.claim}</p>
                      <small>{launchQueue.honestyClaim.limitations[0]}</small>
                    </article>
                  </div>
                  <div className="engineering-launch-queue-export">
                    {launchQueueJsonLink ? (
                      <a href={launchQueueJsonLink.href} download={launchQueueJsonLink.fileName}>
                        <Download size={14} /> {copy.downloadLaunchQueueJson}
                      </a>
                    ) : null}
                    {launchQueueMarkdownLink ? (
                      <a href={launchQueueMarkdownLink.href} download={launchQueueMarkdownLink.fileName}>
                        <Download size={14} /> {copy.downloadLaunchQueueMarkdown}
                      </a>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
            <div
              className="engineering-execution-receipt"
              data-decision={executionReceipt?.decision || "not-started"}
            >
              <article className="engineering-execution-receipt-heading">
                <small>{copy.executionReceiptLabel}</small>
                <strong>
                  {executionReceipt
                    ? copy.executionReceiptDecision(executionReceipt.decision)
                    : copy.executionReceiptEmpty}
                </strong>
                <p>
                  {executionReceipt
                    ? copy.executionReceiptSummary(
                      executionReceipt.summary.executedTasks,
                      executionReceipt.summary.verifiedReceipts,
                      executionReceipt.summary.acceptedEvidence,
                      executionReceipt.summary.verifiedArtifacts,
                      executionReceipt.canClaimCompletion
                    )
                    : copy.executionReceiptSummary(0, 0, 0, 0, false)}
                </p>
              </article>
              {executionReceipt ? (
                <>
                  <div className="engineering-execution-receipt-items">
                    {executionReceipt.items.slice(0, 6).map((item) => (
                      <span data-status={item.status} key={item.sessionId} title={item.nextAction}>
                        {item.title}
                        <small>
                          {copy.executionReceiptStatus(item.status)}・{item.commandResults} cmd
                        </small>
                      </span>
                    ))}
                  </div>
                  <div className="engineering-execution-receipt-review">
                    <article>
                      <strong>{copy.executionReceiptClaimsLabel}</strong>
                      <ul>
                        {(executionReceipt.blockedClaims.length
                          ? executionReceipt.blockedClaims
                          : executionReceipt.allowedClaims
                        ).slice(0, 3).map((claim) => (
                          <li key={claim}>{claim}</li>
                        ))}
                      </ul>
                    </article>
                    <article>
                      <strong>{copy.executionReceiptHonestyLabel}</strong>
                      <p>{executionReceipt.honestyClaim.claim}</p>
                      <small>{executionReceipt.nextAction}</small>
                    </article>
                  </div>
                  <div className="engineering-execution-receipt-export">
                    {executionReceiptJsonLink ? (
                      <a href={executionReceiptJsonLink.href} download={executionReceiptJsonLink.fileName}>
                        <Download size={14} /> {copy.downloadExecutionReceiptJson}
                      </a>
                    ) : null}
                    {executionReceiptMarkdownLink ? (
                      <a href={executionReceiptMarkdownLink.href} download={executionReceiptMarkdownLink.fileName}>
                        <Download size={14} /> {copy.downloadExecutionReceiptMarkdown}
                      </a>
                    ) : null}
                  </div>
                </>
              ) : null}
            </div>
            <div
              className="engineering-handoff-receipt"
              data-decision={selfSimulation.handoffReceipt.decision}
            >
              <article className="engineering-handoff-receipt-heading">
                <small>{copy.handoffReceiptLabel}</small>
                <strong>{copy.handoffReceiptDecision(selfSimulation.handoffReceipt.decision)}</strong>
                <p>
                  {copy.handoffReceiptSummary(
                    selfSimulation.handoffReceipt.canHandOffToCodingAgent,
                    selfSimulation.handoffReceipt.canRunLocalSandbox,
                    selfSimulation.handoffReceipt.packet.approvalItems,
                    selfSimulation.handoffReceipt.packet.expectedEvidenceArtifacts
                  )}
                </p>
              </article>
              <div className="engineering-handoff-lanes">
                {selfSimulation.handoffReceipt.lanes.map((lane) => (
                  <span data-status={lane.status} key={lane.id} title={lane.summary}>
                    {copy.handoffLane(lane.id)}
                    <small>{copy.handoffLaneStatus(lane.status)}</small>
                  </span>
                ))}
              </div>
              <article className="engineering-handoff-script">
                <strong>{copy.handoffOperatorScriptLabel}</strong>
                <ul>
                  {selfSimulation.handoffReceipt.operatorScript.slice(0, 3).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            </div>
            <div
              className="engineering-completion-gate"
              data-decision={selfSimulation.completionGate.decision}
            >
              <article className="engineering-completion-gate-heading">
                <small>{copy.completionGateLabel}</small>
                <strong>{copy.completionGateDecision(selfSimulation.completionGate.decision)}</strong>
                <p>
                  {copy.completionGateSummary(
                    selfSimulation.completionGate.canClaimCompletion,
                    selfSimulation.completionGate.canClaimCodeChanged,
                    selfSimulation.completionGate.canClaimExternalWrite
                  )}
                </p>
              </article>
              <div className="engineering-completion-gate-checks">
                {selfSimulation.completionGate.checks.map((check) => (
                  <span data-status={check.status} key={check.id} title={check.summary}>
                    {copy.completionGateCheck(check.id)}
                    <small>{copy.completionGateCheckStatus(check.status)}</small>
                  </span>
                ))}
              </div>
              <div className="engineering-completion-gate-review">
                <article>
                  <strong>{copy.completionGateNextActionLabel}</strong>
                  <p>{selfSimulation.completionGate.nextAction}</p>
                </article>
                <article>
                  <strong>{copy.completionGateBlockedClaimsLabel}</strong>
                  <ul>
                    {(selfSimulation.completionGate.blockedClaims.length
                      ? selfSimulation.completionGate.blockedClaims
                      : selfSimulation.completionGate.allowedClaims
                    ).slice(0, 3).map((claim) => (
                      <li key={claim}>{claim}</li>
                    ))}
                  </ul>
                </article>
              </div>
            </div>
            <div className="engineering-self-simulation-review">
              <article>
                <strong>{copy.selfSimulationNextActionsLabel}</strong>
                <ul>
                  {selfSimulation.nextActions.slice(0, 4).map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </article>
              <article>
                <strong>{copy.selfSimulationHonestyLabel}</strong>
                <p>{selfSimulation.honestyClaim.claim}</p>
                <small>{selfSimulation.honestyClaim.limitations[0]}</small>
              </article>
            </div>
            <div className="engineering-self-simulation-export">
              {selfSimulationJsonLink ? (
                <a href={selfSimulationJsonLink.href} download={selfSimulationJsonLink.fileName}>
                  {copy.downloadSelfSimulationJson}
                </a>
              ) : null}
              {selfSimulationMarkdownLink ? (
                <a href={selfSimulationMarkdownLink.href} download={selfSimulationMarkdownLink.fileName}>
                  {copy.downloadSelfSimulationMarkdown}
                </a>
              ) : null}
            </div>
          </>
        ) : null}
      </div>

      <div className="engineering-action-row">
        <button type="button" onClick={onFocusMission}>
          <ClipboardCheck size={15} /> {copy.focusMission}
        </button>
        <button type="button" onClick={onRunCabinet} disabled={runStatus === "running"}>
          <PlayCircle size={15} /> {copy.runCabinet}
        </button>
        <button type="button" onClick={onPrepareEngineeringPack} disabled={!briefs.briefs.length}>
          <PackageCheck size={15} /> {copy.preparePack}
        </button>
        <button type="button" onClick={onRunPreflight} disabled={!runnerSelfTest}>
          <ShieldCheck size={15} /> {copy.preflight}
        </button>
        <button type="button" onClick={onRunSandbox} disabled={!canRunSandbox}>
          <Terminal size={15} /> {copy.runSandbox}
        </button>
        <button type="button" onClick={onExportIssueScript} disabled={!issueDrafts.drafts.length}>
          <CheckCircle2 size={15} /> {copy.exportIssues}
        </button>
        <button type="button" onClick={onApplyMissionTemplate}>
          <WandSparkles size={15} /> {copy.applyMissionTemplate}
        </button>
        <button className="engineering-self-simulation-button" type="button" onClick={onRunSelfSimulation}>
          <FlaskConical size={15} /> {copy.runSelfSimulation}
        </button>
      </div>

      <div className="engineering-flow-grid">
        {copy.steps.map((step, index) => (
          <article className="engineering-flow-step" data-ready={stepReady(index, state)} key={step.title}>
            <strong>{step.title}</strong>
            <p>{step.body}</p>
          </article>
        ))}
      </div>

      <div className="engineering-permission-grid">
        {copy.permissionGroups.map((group) => (
          <article className="engineering-permission-card" key={group.title}>
            <strong>{group.title}</strong>
            <ul>
              {group.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

function launchState({
  run,
  runnerSelfTest,
  sandboxRunnerPreflight,
  sandboxRunnerReport
}: {
  run: CabinetRun | null;
  runnerSelfTest: CodingAgentRunnerSelfTest | null;
  sandboxRunnerPreflight: CodingAgentSandboxRunnerPreflight | null;
  sandboxRunnerReport: CodingAgentSandboxRunnerReport | null;
}) {
  if (sandboxRunnerReport?.decision === "sandbox-runner-verified") return "runner-verified";
  if (sandboxRunnerReport) return "runner-needs-review";
  if (sandboxRunnerPreflight?.decision === "ready") return "ready-to-run";
  if (runnerSelfTest?.decision === "self-test-ready") return "runner-ready";
  if (runnerSelfTest) return "runner-needs-review";
  if (run) return "cabinet-ready";
  return "needs-mission";
}

function stepReady(index: number, state: string) {
  const progress: Record<string, number> = {
    "needs-mission": 0,
    "cabinet-ready": 1,
    "runner-needs-review": 2,
    "runner-ready": 3,
    "ready-to-run": 4,
    "runner-verified": 5
  };
  return (progress[state] || 0) > index;
}
