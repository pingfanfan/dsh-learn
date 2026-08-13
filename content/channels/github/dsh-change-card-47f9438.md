# DSH change card at `47f9438`

Chinese canonical article: `content/canonical/dsh-change-card-47f9438.md`

## What changed

- DeepSeek Harness is still in Developer Preview and explicitly allows breaking changes.
- The dedicated repository-plugin path was removed. `.dsh-plugin`, `dsh-plugin-prepare`, repository source-list patches, the dedicated cache and compatibility migration are no longer supported.
- The supported external distribution path is an installable profile bundle:

  ```bash
  dsh plugin --profile <name> add <package-or-git-spec>
  ```

- The unreleased SDK project toolchain was removed without aliases or a compatibility layer.
- The runtime SDK remains. `@deepseek-ai/dsh-sdk-client`, `@deepseek-ai/dsh-sdk-protocol` and `@deepseek-ai/dsh-sdk-jsonrpc-server` moved from `packages/scaffold/` to `packages/sdk/` without npm-name or wire-protocol changes.

## Version boundary

- Repository HEAD verified on 2026-08-13: `47f943859bef60e4160492346772ded9b24f765a`.
- `apps/cli/package.json` at that commit: `@deepseek-ai/dsh@0.1.0-rc.5`.
- npm registry `latest` at verification time: `0.1.0-rc.6`.
- The rc.6 CLI help, version output, isolated demo-profile initialization and `--dump-config` passed locally. Web UI boot, model calls and third-party plugin installation were not tested.

## User action

Pin both a repository commit and package version in tutorials. Treat content that still uses `.dsh-plugin` or the removed SDK project scaffolding as historical. Review and pin third-party Git/npm sources before installation because package lifecycle scripts can execute outside the agent sandbox.

## Primary sources

- [README](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/README.md)
- [Remove repository plugin](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/.agents/notes/implemented/simplification/2026-08-09-remove-repository-plugin.zh.md)
- [Remove SDK project toolchain](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/.agents/notes/implemented/simplification/2026-08-11-remove-sdk-project-toolchain.md)
- [npm registry latest](https://registry.npmjs.org/@deepseek-ai%2Fdsh/latest)
- Local reproduction: <https://github.com/pingfanfan/dsh-learn/blob/main/labs/rc6-cli-smoke/README.md>
