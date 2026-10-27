# Section deletion

Section deletion uses the existing confirmed, authorized draft-only action. Migration `20261027173228_delete_draft_section_dependencies.sql` adds a BEFORE DELETE trigger that removes unused block response definitions and resource links before the existing block cascade. Shared resources are retained. The trigger runs as the invoking role, with an empty search path and no direct public execution grant.

The version, blocks, and definitions are locked before history checks. Any saved participant response blocks deletion. Existing foreign keys continue to protect other dependencies, including embedded assessment attempts and delivery plans. All cleanup runs in the DELETE transaction, so any later constraint failure restores the removed definitions and resource links.

The application translates foreign-key failures into a participant-friendly explanation instead of exposing constraint names.

## Validation

An isolated PGlite PostgreSQL instance executed the actual migration against a minimal relational fixture on October 27, 2026. Passed:

- An unused draft section and its blocks/definitions/resource links delete successfully.
- Shared resource files and sibling sections remain.
- Saved responses block deletion and retain all section records.
- Published sections cannot be deleted.
- A later block dependency failure rolls back definitions and resource-link cleanup.

Production migration applied on October 27, 2026 through the linked Supabase CLI. Release staging contained only this migration and the existing remote history; three unrelated pending migrations were excluded. Two older local filenames were aligned with their production timestamps after verifying identical SQL. No participant data was deleted during verification.
