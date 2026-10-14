import {literalRichText,plainRichText} from './rich-text-document';
import type {VideoTextStyle} from './video-editor';

// The native affirmativeLabel remains authoritative. Formatting is used only
// when its plain text still matches, including after a legacy editor saves.
export function confirmationStatement(config:Record<string,unknown>){
 const label=String(config.affirmativeLabel??'');
 return typeof config.statementFormatting==='string'&&plainRichText(config.statementFormatting)===label
  ?config.statementFormatting:literalRichText(label);
}
export function confirmationStyle(value:unknown,fallback:VideoTextStyle):VideoTextStyle{
 return ['h1','h2','h3','h4','h5','h6','body','small'].includes(String(value))?value as VideoTextStyle:fallback;
}
export const REQUIRED_CONFIRMATION_MESSAGE='Check the box to confirm before submitting.';
