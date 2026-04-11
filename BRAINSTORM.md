# Digital Iran Freedom Congress (DIFC)
## A Continuous Political Engagement Space for Iranians

---

## 1. The Gap This Fills

| Existing Initiative | What It Does Well | What's Missing |
|---|---|---|
| **IFCongress** (London, Mar 2026) | Physical congress, 30-member coordination council, structured deliberation on transition questions | One-off 2-day event, no continuous engagement, no digital infrastructure, membership gate-kept by review |
| **Jomhoor / Republic** | Full tech stack (ZKP identity, Agora Polis deliberation, Rarimo voting, DeFi treasury), privacy-first architecture | Platform-focused, not yet a political engagement *process*; Phase 2 "Democratic Activation" not yet reached |
| **Atlas Iran** | Civil society mapping, organization/party network graph | Research/documentation tool, not an engagement or decision-making space |
| **UpdateDeutschland** | Open Social Innovation model: challenge collection → 48h sprint → 4-month implementation with government partners | German context, government partnership model — but the *process design* is highly transferable |

**The DIFC fills the gap between these**: a *continuous, digital-first political engagement process* that connects diaspora and inside-Iran actors, uses existing tech (Jomhoor stack), builds on existing mapping (Atlas), and learns the process design from UpdateDeutschland and IFCongress.

---

## 2. Core Principles

1. **Continuous, not episodic** — Not a 2-day congress but an ongoing cycle of deliberation → decision → action → review
2. **Digital-first, physical-supported** — Primary engagement online (accessible to Iranians globally + inside Iran via circumvention tools); periodic in-person summits as milestones
3. **Pluralist & non-monopolistic** — Like IFCongress: explicitly not a governing body, not a leadership contest; a *space* where many organizations participate
4. **Privacy by design** — ZKP identity verification (Jomhoor's INID SDK + Rarimo ZK Passport) to protect participants, especially those inside Iran
5. **Subsidiarity** — Decisions at the lowest possible level; working groups self-govern
6. **Transparency** — All processes, budgets, and decisions auditable on-chain
7. **Inclusive of all anti-regime forces** — Across ethnic, linguistic, political, and generational lines

---

## 3. What We Learn from Each Model

### From UpdateDeutschland: **The Process Engine**
- **Challenge-first approach**: Don't start with solutions — start by collecting the real problems Iranians face (inside and diaspora)
- **Sprint model**: Time-boxed intensive sessions (48h or 72h) where teams form around challenges and prototype solutions
- **Implementation phase**: Winning teams get support (funding, mentorship, partnerships) to execute over months
- **Scientific accompaniment**: Independent researchers documenting the process, producing learning reports
- **Open Social Innovation**: Bringing together civil society, technologists, academics, legal experts, and diaspora organizations

### From IFCongress: **The Political Framing**
- **Key deliberation questions** (directly applicable):
  - How to rebuild trust in a damaged, polarized society?
  - How to engage non-liberal or non-pragmatic opposition actors?
  - What does transition from subject to citizen require?
  - How to handle foreign intervention and its consequences?
  - How to manage the transitional period?
- **What the congress is NOT** statement — critical for managing expectations
- **Coordination Council** model — but make it elected/rotating, not appointed

### From Jomhoor: **The Tech Infrastructure**
- ZKP Identity (INID SDK + ZK Passport) for verified but anonymous participation
- Agora Polis / Taraaz for consensus mapping at scale
- Ranked Pairs (Tideman) for Condorcet-optimal elections
- Multi-Sig wallets for trust in small groups
- Civic Compass for multidimensional political positioning
- DeFi treasury with participatory budgeting
- Iranians.Vote mobile app as the interface

### From Atlas Iran: **The Network Intelligence**
- Map of civil society organizations, parties, and activist groups
- Network graph showing connections and gaps
- Use this as the *invitation and coalition-building* basis for DIFC

---

## 4. Proposed Structure

### 4.1 Engagement Cycles (Borrowed from UpdateDeutschland, adapted)

```
┌─────────────────────────────────────────────────────────────┐
│                    DIFC Engagement Cycle                     │
│                     (repeats every 3 months)                │
│                                                             │
│  Phase 1: LISTEN (2 weeks)                                  │
│  ├── Collect challenges from Iranians (inside + diaspora)   │
│  ├── Thematic categorization                                │
│  ├── Prioritization via Polis/Taraaz deliberation           │
│  └── Output: Top 10-20 challenges for the cycle             │
│                                                             │
│  Phase 2: SPRINT (72 hours)                                 │
│  ├── Open call for teams to form around challenges          │
│  ├── Cross-organizational teams (deliberate mixing)         │
│  ├── Expert mentors and advisors available                  │
│  ├── Output: Solution proposals / position papers / plans   │
│  └── Livestreamed, subtitled Farsi/English/Kurdish/...      │
│                                                             │
│  Phase 3: DELIBERATE & DECIDE (2 weeks)                     │
│  ├── Community review of sprint outputs                     │
│  ├── Agora Polis consensus mapping on proposals             │
│  ├── Ranked Pairs voting on resource allocation             │
│  └── Output: Funded/supported initiatives for the cycle     │
│                                                             │
│  Phase 4: IMPLEMENT (2 months)                              │
│  ├── Teams execute with support (funding, mentorship)       │
│  ├── Bi-weekly check-ins                                    │
│  ├── Mid-cycle public progress report                       │
│  └── Output: Tangible outcomes, documented learnings        │
│                                                             │
│  Phase 5: REVIEW (1 week)                                   │
│  ├── Public retrospective                                   │
│  ├── Learning report published                              │
│  ├── Cycle metrics dashboard update                         │
│  └── Feeds into next cycle's LISTEN phase                   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Permanent Working Groups (Thematic Tracks)

| Track | Focus | Key Questions |
|---|---|---|
| **Transition & Governance** | Constitutional design, transitional justice, interim governance | What comes after the Islamic Republic? How to prevent 1979 repeat? |
| **Human Rights & Documentation** | Documenting violations, supporting victims, accountability mechanisms | How to build an evidence base for future tribunals? |
| **Economic Futures** | Post-sanctions economy, DeFi for Iranians, labor rights, development | How to plan economic transition while under sanctions? |
| **Culture & Identity** | Ethnic/linguistic pluralism, women's rights, secularism, cultural heritage | How to protect Iran's diversity in a future republic? |
| **Digital Sovereignty** | Censorship circumvention, digital rights, tech infrastructure | How to maintain digital access and protect activists? |
| **Diaspora Coordination** | Connecting diaspora organizations, lobbying, diplomatic strategy | How to amplify the diaspora voice effectively? |
| **Inside-Iran Engagement** | Safely connecting with civil society inside Iran, labor unions, students | How to bridge the inside-outside divide? |
| **Security & Defense** | Territorial integrity, IRGC transition, militia disarmament | How to address security vacuum during transition? |

### 4.3 Governance Structure

```
┌──────────────────────────────────────────────────────────┐
│              DIFC Governance Structure                    │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │         General Assembly (GA) — مجمع عمومی         │  │
│  │  All verified members (ZKP-based)                  │  │
│  │  NOT a permanent body — convenes quarterly         │  │
│  │  Powers:                                           │  │
│  │   • Elect/recall Coordination Council members      │  │
│  │   • Approve/reject annual budget                   │  │
│  │   • Amend the charter (⅔ supermajority)            │  │
│  │   • Vote of no-confidence in CC (simple majority)  │  │
│  │  Accountability:                                   │  │
│  │   • Participation threshold: must vote in 2 of 4   │  │
│  │     quarterly sessions to retain verified status   │  │
│  │   • Any 10% of GA can trigger emergency session    │  │
│  │   • All votes auditable on-chain via Iranians.Vote │  │
│  └───────────────────┬────────────────────────────────┘  │
│                      │                                   │
│  ┌───────────────────▼────────────────────────────────┐  │
│  │     Coordination Council (CC) — شورای هماهنگی      │  │
│  │  15-21 elected members                             │  │
│  │  Term: 6 months, staggered (½ rotate each cycle)   │  │
│  │  Max consecutive terms: 2 (then must sit out 1)    │  │
│  │  Elected by GA via Ranked Pairs (Tideman)          │  │
│  │  Diversity requirements enforced:                  │  │
│  │   • Min 40% any gender                             │  │
│  │   • Min 3 ethnic/linguistic backgrounds            │  │
│  │   • Min 2 members based inside Iran (if possible)  │  │
│  │   • Max 3 members from any single organization     │  │
│  │  Accountability:                                   │  │
│  │   • Monthly public report to GA                    │  │
│  │   • GA can recall any member (simple majority)     │  │
│  │   • All CC meetings recorded and published         │  │
│  │   • Budget decisions require CC vote (⅔ majority)  │  │
│  │   • No CC member may serve as WG facilitator       │  │
│  └───────────────────┬────────────────────────────────┘  │
│                      │                                   │
│  ┌───────────────────▼────────────────────────────────┐  │
│  │        Working Groups (WGs) — کارگروه‌ها            │  │
│  │  Self-organizing, open membership                  │  │
│  │  Each WG has 2-3 elected facilitators              │  │
│  │  Facilitator term: 3 months, elected by WG members │  │
│  │  Propose challenges, run sprints, implement        │  │
│  │  Accountability:                                   │  │
│  │   • Weekly output report to #documentation         │  │
│  │   • Facilitators can be recalled by WG members     │  │
│  │   • Any WG member can escalate issues to CC        │  │
│  └───────────────────┬────────────────────────────────┘  │
│                      │                                   │
│  ┌───────────────────▼────────────────────────────────┐  │
│  │       Technical Secretariat — دبیرخانه فنی         │  │
│  │  Maintains platform, ensures security,             │  │
│  │  moderation, translation, accessibility            │  │
│  │  Staffed (paid) roles under CC oversight           │  │
│  │  Accountability:                                   │  │
│  │   • Hired/fired by CC with GA approval             │  │
│  │   • Quarterly performance review by CC             │  │
│  │   • Security audit by independent party annually   │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │       Accountability Watchdog — ناظر پاسخگویی      │  │
│  │  3 elected members (NOT on CC, NOT WG leads)       │  │
│  │  Term: 1 year, non-renewable consecutively         │  │
│  │  Powers:                                           │  │
│  │   • Audit any CC/WG/Secretariat decision           │  │
│  │   • Publish findings directly to GA                │  │
│  │   • Trigger recall votes                           │  │
│  │   • Investigate code-of-conduct complaints         │  │
│  │  Cannot: make policy, control budget, block votes  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  Legal Custodian: TCF e.V. (or new entity)              │
│  On-chain: DeXe DAO (when threshold reached)            │
└──────────────────────────────────────────────────────────┘
```

### 4.4 GA Accountability Mechanisms (Why the Assembly Doesn't Become a Rubber Stamp)

The GA is every verified member — it's not a body you "join" like a parliament. But passive membership is a real risk: people verify once and never show up, leaving decisions to a shrinking active minority. Here's how to prevent that:

| Mechanism | What It Does |
|---|---|
| **Participation threshold** | Must vote in 2 of 4 quarterly sessions to keep verified status. Miss too many? You're moved to Observer until you re-engage. |
| **Staggered CC elections** | Half the CC rotates every 6 months, so there's always a fresh election to participate in. |
| **Recall power** | Any 10% of GA can trigger a recall vote on any CC member at any time. Simple majority removes them. |
| **Emergency sessions** | 10% of GA can force an emergency assembly outside the quarterly schedule. |
| **Term limits** | CC: max 2 consecutive terms. Watchdog: max 1. Facilitators: max 3 consecutive. Prevents entrenchment. |
| **Transparency mandates** | CC monthly reports, all meetings recorded, all budgets on-chain. No back-room deals. |
| **Independent watchdog** | 3 elected auditors who can investigate anything and report directly to the GA. They have no executive power — only sunlight. |
| **Charter amendment** | GA can change the rules themselves with ⅔ supermajority. The structure is not imposed — it's owned by participants. |

---

## 5. Technology Stack (Leverage Existing Jomhoor Infrastructure)

| Layer | Tool | Purpose |
|---|---|---|
| **Identity** | INID SDK + Rarimo ZK Passport | Prove Iranian citizenship without revealing identity |
| **Deliberation** | Agora Polis / Taraaz | Consensus mapping, opinion clustering at scale |
| **Voting** | Iranians.Vote + Ranked Pairs | Anonymous, verifiable, Condorcet-optimal decisions |
| **Communication** | Slack (organized channels, threads, video calls) | Persistent chat, working group channels |
| **Treasury** | Multi-Sig wallets + DeXe DAO | Participatory budgeting, transparent fund management |
| **Mapping** | Atlas Iran data + custom dashboards | Network visualization, participation metrics |
| **Civic Profile** | Civic Compass | 8-dimensional political identity, coalition discovery |
| **Content** | Livestreaming + recording platform | Sprint sessions, plenary deliberations, subtitles |
| **Circumvention** | Tor, VPN integration, .onion mirrors | Accessibility for participants inside Iran |
| **Documentation** | Git-based wiki / open knowledge base | All proposals, decisions, learning reports |

### New Tech to Build
- **Challenge Collection Platform** — Structured submission form (inspired by UpdateDeutschland's "Herausforderungsprozess")
- **Sprint Workspace** — Virtual collaboration space for 72h sprints (video rooms, shared docs, kanban boards)
- **Progress Dashboard** — Public metrics on participation, decisions, implementation outcomes per cycle
- **Multi-language Interface** — Farsi, English, Kurdish (Sorani + Kurmanji), Arabic, Azerbaijani Turkish, Balochi

---

## 6. Coalition Building Strategy

### Tier 1: Core Partners (co-organizers)
- **[Jomhoor-Academia Consortium](https://iranacademia.com/news/launching-the-jomhoor-academia-consortium-to-restore-citizen-agency-and-rebuild-democratic-capacity-for-iranians/?lang=en)** — The strategic backbone. A joint initiative of:
  - **[Jomhoor / Republic](https://jomhoor.org/en)** — Provides the technological and civic infrastructure (ZKP identity, Taraaz deliberation, Iranians.Vote, DeFi treasury, Civic Compass)
  - **[Iran Academia (ISSH)](https://iranacademia.com/?lang=en)** — Provides the intellectual, research, educational, and institutional engine. Experienced in critical education, open knowledge production, civic empowerment
  - **Role in DIFC**: Thought leaders and knowledge partners. Can design and run the educational/research dimensions of the congress — democratic literacy programs, policy research, drafting of foundational documents, facilitation methodology, learning reports. Their trans-partisan, non-ideological framing aligns perfectly with DIFC's pluralist principles.
  - **Status**: DIFC organizers are consortium members. Formal endorsement for DIFC as a consortium initiative pending — anticipated to be positive given alignment with consortium's stated mission of "restoring citizen agency" and "creating a platform for secure participation, dialogue, and collective decision-making."
  - **First consortium project**: [Progressive Iranians Party](https://iranacademia.com) — demonstrates the consortium model can support independent political initiatives, which validates DIFC's approach
- **[Atlas Iran / TCF e.V.](https://atlasiran.github.io/Atlas-website/)** — Network mapping, legal custodian
- **[Iran Freedom Congress](https://www.ifcongress.org/)** — Political legitimacy, existing council members as advisors

### Tier 2: Participating Organizations (invited to working groups)
- Iranian diaspora civil society organizations (use Atlas map to identify)
- Political parties and movements across the spectrum
- Labor unions with diaspora connections (teachers, workers, nurses)
- Student organizations (inside and outside Iran)
- Women's rights organizations
- Ethnic minority organizations (Kurdish, Baloch, Arab, Azerbaijani, etc.)
- Artists, journalists, and media organizations
- Legal and human rights documentation groups

### Tier 3: Institutional Support
- Democracy-focused foundations (e.g., National Endowment for Democracy, Open Society, Heinrich Böll, Friedrich Naumann)
- Academic institutions with Iran programs
- International human rights organizations
- Tech companies providing infrastructure (circumvention tools, hosting)

### Outreach Approach
1. **Start with Atlas data** — Identify 100+ organizations, map their focus areas
2. **Personal invitations** — Not mass email; individual outreach explaining the specific role each org can play
3. **Observer status** — Organizations can observe before committing
4. **No exclusivity requirement** — Participating in DIFC doesn't prevent participation in other initiatives

---

## 7. Funding Model

### Revenue Streams
| Source | Model | Target |
|---|---|---|
| **Civic Sponsorship** (Jomhoor model) | €10/month diaspora "citizen tax" → 1 governance credit | €1.08M/year at 9,000 donors |
| **Foundation Grants** | Project-based funding for specific cycles/tracks | Variable |
| **Crypto Treasury** | On-chain donations (ETH, BTC, SOL) | Variable |
| **Institutional Sponsors** | Democracy/human rights organizations | Variable |
| **In-kind** | Tech infrastructure, hosting, volunteer labor | Significant |

### Budget Allocation (example cycle)
- 40% — Implementation support for winning sprint teams
- 20% — Technical Secretariat (platform maintenance, moderation, security)
- 15% — Communication & translation
- 10% — Event costs (virtual infrastructure, livestreaming)
- 10% — Research & documentation
- 5% — Emergency/contingency fund

### Principle
**One person, one vote. Donors get badges, not extra votes.** (Jomhoor model)

---

## 8. Launch Roadmap

### Phase 0: Foundation (Now → Month 2)
- [ ] Assemble founding team (5-7 people across existing orgs)
- [ ] Draft charter and "What DIFC Is / Is Not" statement
- [ ] Secure initial seed funding (€50K target)
- [ ] Set up technical infrastructure (Slack workspace, challenge platform, Taraaz instance)
- [ ] Build coalition: contact first 20 organizations via Atlas data
- [ ] Design visual identity and bilingual (Farsi/English) website
- [ ] Establish security protocols (threat model, operational security guide for participants)

### Phase 1: Pilot Cycle (Month 3 → Month 5)
- [ ] LISTEN: First challenge collection (focus on 2-3 themes only)
- [ ] SPRINT: First 72-hour sprint (smaller scale, ~50-100 participants)
- [ ] DELIBERATE: First Polis/Taraaz deliberation round
- [ ] IMPLEMENT: Support 3-5 winning teams
- [ ] REVIEW: Publish first learning report
- [ ] Collect feedback, iterate on process

### Phase 2: Scale (Month 6 → Month 12)
- [ ] Open membership to full General Assembly (ZKP-verified)
- [ ] First Coordination Council election
- [ ] All 8 Working Groups active
- [ ] Full Engagement Cycles running quarterly
- [ ] Reach 1,000+ verified participants
- [ ] Second and third cycles completed
- [ ] Partnership with 30+ organizations

### Phase 3: Institutionalize (Year 2+)
- [ ] DAO activation (≥5,000 verified citizens, per Jomhoor threshold)
- [ ] Permanent Technical Secretariat with paid staff
- [ ] Annual "Digital Iran Freedom Summit" (hybrid physical+digital)
- [ ] Published constitutional framework proposals from working groups
- [ ] Formal relationships with international institutions
- [ ] Replication toolkit for other diaspora movements

---

## 9. Key Differentiators from Existing Initiatives

| | IFCongress | Jomhoor | DIFC (proposed) |
|---|---|---|---|
| **Format** | 2-day physical event | Digital platform | Continuous digital process + periodic summits |
| **Participation** | Reviewed membership, ~30 council | Open (ZKP-verified) | Open (ZKP-verified) + structured cycles |
| **Decision-making** | Deliberation forum | Voting infrastructure | Full cycle: challenge → sprint → deliberate → vote → implement → review |
| **Output** | Dialogue, position statements | Votes, budgets | Funded projects, learning reports, policy proposals |
| **Continuity** | One-off (may repeat) | Always-on platform | Quarterly cycles with permanent working groups |
| **Inside Iran** | Limited (London-based) | ZKP protects identity | ZKP + circumvention + challenge collection from inside |

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| **Regime surveillance / infiltration** | ZKP identity, E2E encryption, Tor accessibility, operational security training |
| **Fragmentation / infighting** | Clear "What DIFC Is Not" statement, facilitated deliberation (Polis), process-focused not personality-focused |
| **Low participation / engagement fatigue** | Time-boxed cycles (not always-on demand), gamification (civic compass, badges), visible impact from implementations |
| **Capture by any single political faction** | Diversity requirements in CC, proportional representation, explicit pluralism charter |
| **Funding dependency on any single source** | Diversified funding (civic sponsorship + grants + crypto + institutional), transparent budget |
| **Tech failure / platform attack** | Slack Enterprise Grid (if needed), backup channels on Telegram/Signal, offline-capable tools, regular security audits |
| **Legitimacy questions** | Transparent process, open-source everything, scientific accompaniment, explicit "not a government" framing |

---

## 11. Immediate Next Steps (Brainstorm → Action)

1. **Write the Charter** — 2-page document: purpose, principles, what it is/isn't, governance overview
2. **Identify Founding Team** — 5-7 people from Jomhoor, Atlas/TCF, and 2-3 other orgs
3. **Technical Setup** — Set up Slack workspace, Taraaz instance, basic website
4. **First Outreach Round** — 10 organizations, personal calls, explain the vision
5. **Funding Pitch Deck** — For foundation grants and initial supporters
6. **Security Assessment** — Threat model specific to DIFC, opsec guide for participants
7. **Name & Identity** — Finalize name (DIFC? کنگره دیجیتال آزادی ایران?), logo, domain

---

## 12. Open Questions for Discussion

- [ ] Should DIFC be a new entity or a program under TCF e.V.?
- [ ] What's the relationship to IFCongress — complementary? Federated? Successor?
- [ ] How to handle the inside/outside divide practically (not just technically)?
- [ ] What languages are mandatory from day one vs. added later?
- [ ] Should the first cycle focus on one urgent theme (e.g., humanitarian response given current conflict) or multiple?
- [ ] How to prevent the congress from becoming a talk shop — what accountability mechanisms?
- [ ] What's the minimum viable participation number for the pilot cycle?
- [ ] How to handle organizations that refuse to work with each other?

---

*Document started: April 2026*
*Status: Brainstorm / Draft*
*Contributors: [to be filled]*
