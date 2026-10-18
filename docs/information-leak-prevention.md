# Data Loss Prevention (DLP) & Information Security Architecture

**Maintained by**: 合同会社EMYSTI (EMYSTI LLC)  
**Japanese Documentation**: [docs/information-leak-prevention.ja.md](./information-leak-prevention.ja.md)  

---

## 1. Overview & Threat Model

Autonomous AI agents present tremendous efficiency gains for software engineering, but also introduce critical data security risks for enterprises:

1. **Exfiltration to Foreign Clouds**: Uncontrolled external API calls streaming proprietary source code, prompts, or confidential business logic to third-party endpoints.
2. **Local Credential Harvesters**: Ungoverned agents reading `.env`, `~/.ssh/id_rsa`, `~/.aws/credentials`, or `/etc/shadow` and exposing them through logs, diffs, or prompts.
3. **Prompt Injections & Jailbreaks**: Adversarial instructions overriding safety policies to exfiltrate database contents or system tokens.
4. **PII & Regulatory Non-Compliance**: Accidental leakage of Japanese My Number (マイナンバー), credit cards, phone numbers, or customer records in test fixtures and logs.
5. **Lack of Verifiable Audit Receipts**: Inability to mathematically prove to security officers and regulators which files were touched, which tests passed, and what data left the perimeter.

To address these enterprise requirements, **Naikaku AI Togo System** implements a rigorous **7-Layer Defense-in-Depth** Data Loss Prevention (DLP) architecture.

---

## 2. Seven-Layer Defense-in-Depth Security Model

```
 [ Untrusted User / External Input ]
                │
                ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ Layer 1: Zero External Egress / Air-Gapped Local LLM (Ollama)│ ── 100% offline, physical network isolation
 └──────────────────────────────────────────────────────────────┘
                │
                ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ Layer 2: Zero-Raw-Secret Environment Variable Alias Isolation │ ── Never store secrets in UI or browser
 └──────────────────────────────────────────────────────────────┘
                │
                ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ Layer 3: Role Data Access Classification Matrix              │ ── 6-tier classification (Public to Secret)
 └──────────────────────────────────────────────────────────────┘
                │
                ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ Layer 4: Real-Time DLP Sanitizer & Automated Masking         │ ── Auto-redact cloud keys, PII, My Numbers
 └──────────────────────────────────────────────────────────────┘
                │
                ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ Layer 5: Isolated Worktree Sandbox & Boundary Containment    │ ── Path traversal protection & file blocklists
 └──────────────────────────────────────────────────────────────┘
                │
                ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ Layer 6: Opposition Critic & Public Safety Auditor Checks    │ ── Automatic veto on exfiltration commands
 └──────────────────────────────────────────────────────────────┘
                │
                ▼
 ┌──────────────────────────────────────────────────────────────┐
 │ Layer 7: Tamper-Evident SHA-256 Session Receipts & Evidence  │ ── Verifiable compliance audit bundles
 └──────────────────────────────────────────────────────────────┘
```

---

### Layer 1: Zero External Egress / Air-Gapped Local LLM (Ollama)

Naikaku natively supports local open-source LLMs through Ollama:
- **Zero outbound network packets**: Runs completely offline inside air-gapped VPCs or on developer laptops.
- **Zero API keys & zero token billing**: Eliminates key theft and unexpected cloud billing.
- **Tested Models**: Qwen 2.5-Coder, Llama 3, DeepSeek, Mistral.

```bash
naikaku goal "Implement session timeout guard with vitest" --provider ollama
```

---

### Layer 2: Zero-Raw-Secret Environment Variable Aliases

- Raw API keys and passwords are never accepted in browser forms or stored in `localStorage`/cookies.
- The system refers to provider tokens only via designated shell environment variable aliases (e.g., `NAIKAKU_OPENAI_API_KEY`).
- In-memory references are strictly ephemeral.

---

### Layer 3: Role Data Access Classification Matrix

Data is categorized into six security tiers:
- `public`: External documentation and open-source specifications.
- `internal`: Internal engineering specifications and non-sensitive code.
- `confidential`: Proprietary business logic.
- `secret`: Passwords, private keys, database credentials (**never transmitted to external models**).
- `personal-data`: PII, contact info, Japanese My Numbers (**never transmitted without redacting**).
- `customer-data`: Real customer transactions and logs (**local-only handling**).

---

### Layer 4: Real-Time DLP Sanitizer & Automated Redaction

Integrated into `dataLeakProtection.ts`, the DLP sanitizer scans text, commands, outputs, and diffs in real time:
- **Cloud Credentials**: AWS Access Keys (`AKIA...`), GitHub Personal Access Tokens (`ghp_...`), Google Cloud Keys (`AIza...`), Bearer JWTs, and private RSA/SSH key blocks.
- **PII & Identifiers**: Japanese Individual Number (マイナンバー - 12 digits), credit card numbers, and phone numbers.
- **Sensitive File References**: `.env`, `.env.local`, `.ssh/id_rsa`, `.aws/credentials`.

Any detected secret is replaced with standardized redaction tokens (e.g. `[REDACTED_AWS_ACCESS_KEY]`, `[REDACTED_MY_NUMBER]`) before artifacts are saved or passed downstream.

---

### Layer 5: Isolated Worktree Sandbox & Boundary Containment

- All code generation and test execution occur within an isolated Git worktree.
- `validateWorktreeSafeBoundary` ensures that any path attempting to escape (`../../`) or targeting root filesystems (`/etc`, `/var`, `/home`) throws a hard security error.
- Direct access to sensitive files within the repository (`.env`, `.git/config`, `.git/hooks`) is strictly prohibited.

---

### Layer 6: Opposition Critic & Public Safety Auditor Checks

- **Public Safety & DLP Auditor**: Evaluates all planned commands for exfiltration vectors (`curl -d @...`, `wget --post-data`, netcat reverse shells, unauthorized `git push`). Any detected violation triggers an immediate Cabinet safety veto (`BLOCK`).
- **Opposition Critic**: Verifies that new dependencies or network calls have not been injected without explicit justification.

---

### Layer 7: Tamper-Evident SHA-256 Session Receipts & Evidence

Completed goals produce immutable evidence:
- `receipt.json`: Signed session receipt containing timestamps, participating cabinet roles, and SHA-256 checksums of all modified files.
- `git.diff`: Sanitized unified diff of all code modifications.
- `evidence.json`: Audit log capturing execution time, command outputs, critique flaw reports, and ratification votes.

---

## 3. Verification & Compliance Drill

Run the official automated compliance drill:

```bash
# 1. Scan for leaked secrets in repository
npm run public-scope:check

# 2. Run DLP unit test suite
npx vitest run src/domain/dataLeakProtection.test.ts

# 3. Run governed 2-second autonomous goal smoke test
npm run goal:smoke
```

---

## 4. Maintained by

- **Developer & Maintainer**: 合同会社EMYSTI (EMYSTI LLC)
- **Product Site**: <https://naikaku.emysti.net/>
- **Japanese Site**: <https://naikaku.emysti.net/ja/>
- **Corporate**: <https://www.emysti.net>
- **License**: PolyForm Noncommercial License 1.0.0
