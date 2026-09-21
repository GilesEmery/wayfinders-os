import {
  getParticipantBlockDefinition,
  isParticipantRuntimeReady,
  type BlockDefinition,
} from "../builder/block-registry.ts";

/** Source-controlled participant-runtime gate used by Draft publication. */
export function getPublishBlockDefinition(blockType: string, rendererKey: string | null): BlockDefinition | null {
  const definition = getParticipantBlockDefinition(blockType, rendererKey);
  return definition && isParticipantRuntimeReady(definition) ? definition : null;
}
