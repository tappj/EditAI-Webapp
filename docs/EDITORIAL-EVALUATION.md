# AI verification

EditAI's hosted AI service proposes edits. The open-source editor validates
source references and applies accepted edits atomically. Original source word
IDs and media remain stable.

Prompts, internal editorial evaluation cases and inference orchestration are
maintained in the private service source. They are not included in public
source or app downloads.

See [verification](VERIFICATION.md) for released behavior, observed checks and
remaining limits. Fixture tests verify contracts and media behavior; they do not
prove genuine provider connectivity.
