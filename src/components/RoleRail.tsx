import { Check, Circle, Copy, Crown, Plus, ShieldCheck } from "lucide-react";
import type { CabinetRole } from "../domain/types";

interface RoleRailProps {
  roles: CabinetRole[];
  selectedRoleId: string;
  onSelect: (roleId: string) => void;
  onToggle: (roleId: string, enabled: boolean) => void;
  onCreateRole: () => void;
  onDuplicateRole: () => void;
}

export function RoleRail({
  roles,
  selectedRoleId,
  onSelect,
  onToggle,
  onCreateRole,
  onDuplicateRole
}: RoleRailProps) {
  return (
    <aside className="role-rail">
      <div className="rail-heading">
        <span>Cabinet</span>
        <strong>{roles.filter((role) => role.enabled).length}/{roles.length}</strong>
      </div>
      <div className="rail-actions">
        <button type="button" onClick={onCreateRole}>
          <Plus size={15} /> Add role
        </button>
        <button type="button" onClick={onDuplicateRole} disabled={!selectedRoleId}>
          <Copy size={15} /> Duplicate
        </button>
      </div>
      <div className="role-list">
        {roles.map((role) => (
          <button
            className="role-row"
            data-active={selectedRoleId === role.id}
            data-enabled={role.enabled}
            key={role.id}
            type="button"
            onClick={() => onSelect(role.id)}
          >
            <span className="role-icon">
              {role.id === "prime-minister" ? <Crown size={17} /> : role.stage === "supervision" ? <ShieldCheck size={17} /> : <Circle size={17} />}
            </span>
            <span className="role-copy">
              <strong>{role.name}</strong>
              <small>{role.ministry}</small>
            </span>
            <span
              className="toggle-dot"
              role="switch"
              aria-checked={role.enabled}
              tabIndex={0}
              onClick={(event) => {
                event.stopPropagation();
                onToggle(role.id, !role.enabled);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  onToggle(role.id, !role.enabled);
                }
              }}
            >
              {role.enabled ? <Check size={13} /> : null}
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
