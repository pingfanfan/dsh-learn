# DSH plugin terminology: GitHub `dsh-plugin` topic vs legacy `.dsh-plugin`

This note prevents a common DeepSeek Harness documentation mix-up.

- `.dsh-plugin` was part of the removed repository-plugin route in the pinned `47f9438` baseline. It is not a current manifest to create or extend.
- `dsh-plugin` is the GitHub repository topic mentioned by the current official README for plugin discoverability. It is a search/index label, not an install mechanism.

The two names describe different layers. Adding the topic does not install a package, load a profile, or prove runtime compatibility. Conversely, a package may be installed in a profile even if its repository has not added the topic.

For old tutorials, check the pinned DSH commit and npm version first. If the tutorial also uses a repository source list, `dsh-plugin-prepare`, or a dedicated repository cache, treat it as historical and compare it with the profile-based path:

```bash
dsh plugin --profile <name> add <package-or-git-spec>
```

The command is an installation entry point, not proof that an arbitrary third-party plugin has migrated successfully. Record the package source, exact version, build result, profile configuration, and runtime test separately.

Evidence boundary: this note checks the current README's GitHub topic guidance and the pinned official removal note. It does not install an unknown third-party package or claim a concrete plugin is compatible.

- [Current official README](https://github.com/deepseek-ai/deepseek-harness/blob/master/README.md)
- [Current contribution policy](https://github.com/deepseek-ai/deepseek-harness/blob/master/CONTRIBUTING.md)
- [Pinned repository-plugin removal note](https://github.com/deepseek-ai/deepseek-harness/blob/47f943859bef60e4160492346772ded9b24f765a/.agents/notes/implemented/simplification/2026-08-09-remove-repository-plugin.zh.md)
