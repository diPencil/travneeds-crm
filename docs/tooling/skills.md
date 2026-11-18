# Installed engineering tools and skills

Installed on 18 November 2026 using the Codex Skill Installer. Skills live in the user-level `C:/Users/mahmo/.codex/skills/` directory, outside the application repository. They become available on the next Codex turn. Restart Codex to load the newly registered REA MCP server.

| Requested repository | Installed scope | Source commit |
| --- | --- | --- |
| https://github.com/21st-dev/skill | 7 skills, including UI build/explore/review, CLI, AI, registry and design sync | 15c7436c41dc88c54094f1be93ce53bda456b114 |
| https://github.com/nextlevelbuilder/ui-ux-pro-max-skill | UI/UX Pro Max under `ui-ux-pro-max-upstream` | ed766d3bf62f32c8d27762ad49abdc3a4744c84f |
| https://github.com/addyosmani/agent-skills | All 25 engineering skills | 39b723ceebf81474d0557c1fecd01eddab585563 |
| https://github.com/morluto/rea | `reverse-engineer-anything` workflow skill | b236bcfe34a006fa61e6df0924ba6b4784870b09 |

The existing UI/UX Pro Max installation was preserved. The added copy has a distinct directory and frontmatter name. Addy's repository-level shared references were copied into each installed skill under `references/upstream-shared/`, and relative links were adjusted so the installed guidance remains usable.

## Runtime tools

- 21st CLI 1.18.0 is installed globally. `21st help` was verified. Account-backed retrieval and AI generation require the owner's 21st login and entitlements. No login, paid generation or publishing was performed.
- REA 6.0.0 is installed globally and registered for Codex only. Its setup reported Codex registration aligned and ready, with a configuration backup at `C:/Users/mahmo/.codex/config.toml.rea.backup`.
- REA 6.0.0 supports the installed Node 24.13.0. The newer repository release requires a newer Node runtime. The installed workflow comes from the pinned repository commit, so consult the connected runtime's actual tool catalog before using a capability.
- Ghidra/IDA/Hopper and other optional native-analysis engines were not installed. REA setup reported native-analysis providers unavailable. Native-binary analysis requires an appropriate provider. Source-code analysis of this CRM uses ordinary repository tools.

Skills guide the work when relevant. Their availability does not mean every skill runs on every task. Project code, schemas, design and owner instructions remain the basis for implementation decisions. External publishing and paid operations require their own authorization.
