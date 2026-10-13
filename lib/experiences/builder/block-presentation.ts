export type TextSize = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
export type BlockPresentation = { header: string; body: string; headerSize: TextSize; bodySize: TextSize; placement: "above" | "between" | "below"; subtitle?: string; caption?: string; appearance?: { alignment?: "left" | "center" | "right"; padding?: number; width?: number; background?: string; border?: boolean; fit?: "contain" | "cover"; columns?:1|2|3; columnGap?:number; fontSize?:number; lineHeight?:number; letterSpacing?:number; color?:string; family?:"sans"|"editorial"|"mono" } };
export function readBlockPresentation(settings: unknown): BlockPresentation | null {
  if (!settings || typeof settings !== "object") return null;
  const value = (settings as Record<string, unknown>).textPresentation;
  if (!value || typeof value !== "object") return null;
  const p = value as Record<string, unknown>;
  const size = (value: unknown, fallback: TextSize): TextSize => ["h1", "h2", "h3", "h4", "h5", "h6"].includes(String(value)) ? value as TextSize : fallback;
  const additional: Pick<BlockPresentation,"subtitle"|"caption"|"appearance"> = {};
  for(const key of ["subtitle","caption"] as const)if(typeof p[key]==="string")additional[key]=p[key] as string;
  if(p.appearance && typeof p.appearance==="object") {
    const raw=p.appearance as Record<string,unknown>,a:NonNullable<BlockPresentation["appearance"]>={};
    if(["left","center","right"].includes(String(raw.alignment)))a.alignment=raw.alignment as typeof a.alignment;
    for(const [key,min,max] of [["padding",0,120],["width",20,100]] as const)if(typeof raw[key]==="number"&&Number.isFinite(raw[key])&&raw[key]>=min&&raw[key]<=max)a[key]=raw[key];
    if(typeof raw.background==="string"&&/^#[0-9a-f]{6}$/i.test(raw.background))a.background=raw.background;
    if(["contain","cover"].includes(String(raw.fit)))a.fit=raw.fit as "contain"|"cover";
    for(const [key,min,max] of [["fontSize",1,256],["lineHeight",1,3],["letterSpacing",-2,20]] as const)if(typeof raw[key]==="number"&&Number.isFinite(raw[key])&&raw[key]>=min&&raw[key]<=max)a[key]=raw[key];
    if(typeof raw.color==="string"&&/^#[0-9a-f]{6}$/i.test(raw.color))a.color=raw.color;
    if(["sans","editorial","mono"].includes(String(raw.family)))a.family=raw.family as "sans"|"editorial"|"mono";
    if([1,2,3].includes(Number(raw.columns))&&typeof raw.columns==="number")a.columns=raw.columns as 1|2|3;
    if(typeof raw.columnGap==="number"&&Number.isFinite(raw.columnGap)&&raw.columnGap>=0&&raw.columnGap<=120)a.columnGap=raw.columnGap;
    if(typeof raw.border==="boolean")a.border=raw.border;
    if(Object.keys(a).length)additional.appearance=a;
  }
  return { ...additional, header: typeof p.header === "string" ? p.header : "", body: typeof p.body === "string" ? p.body : "", headerSize: size(p.headerSize, "h3"), bodySize: size(p.bodySize, "h4"), placement: p.placement === "above" || p.placement === "between" ? p.placement : "below" };
}
export function presentationSettings(current: unknown, form: FormData):Record<string,unknown> {
  const settings = current && typeof current === "object" && !Array.isArray(current) ? current as Record<string, unknown> : {};
  if (!form.has("presentation_header")) {
    if(!form.has("presentation_appearance"))return settings;
    const withText=new FormData();for(const [key,value] of form.entries())withText.append(key,value);withText.set("presentation_header","");withText.set("presentation_body","");
    const candidate=presentationSettings({},withText);
    return {...settings,blockAppearance:readBlockPresentation(candidate)?.appearance??{}};
  }
  // The legacy question controls and rich text fields share one visible prompt.
  // If the rich text was untouched, use the question edits rather than its seed.
  const header = form.has("prompt") && form.get("presentation_header") === form.get("presentation_header_initial")
    ? String(form.get("prompt") ?? "") : String(form.get("presentation_header") ?? "");
  const body = form.has("instructions") && form.get("presentation_body") === form.get("presentation_body_initial")
    ? String(form.get("instructions") ?? "") : String(form.get("presentation_body") ?? "");
  if (header.length > 12000 || body.length > 12000) throw new Error("Each text area must be at most 12,000 characters.");
  const previous=readBlockPresentation(settings);
  const extras:Record<string,unknown>={...previous};
  for(const [key,field] of [["subtitle","presentation_subtitle"],["caption","presentation_caption"]])if(form.has(field)){const text=String(form.get(field)??"");if(text.length>12000)throw new Error("Additional text must be at most 12,000 characters.");extras[key]=text;}
  if(form.has("presentation_appearance")){
    const appearance:Record<string,unknown>={};
    for(const key of ["alignment","background","fit","color","family"])if(form.get(`presentation_${key}`))appearance[key]=String(form.get(`presentation_${key}`));
    for(const key of ["padding","width"])if(String(form.get(`presentation_${key}`)??"").trim()) {const n=Number(form.get(`presentation_${key}`));if(!Number.isFinite(n)||(key==="padding"?(n<0||n>120):(n<20||n>100)))throw new Error("Invalid presentation dimensions.");appearance[key]=n;}
    for(const [key,min,max] of [["fontSize",1,256],["lineHeight",1,3],["letterSpacing",-2,20]] as const)if(String(form.get(`presentation_${key}`)??"").trim()){const n=Number(form.get(`presentation_${key}`));if(!Number.isFinite(n)||n<min||n>max)throw new Error("Invalid typography override.");appearance[key]=n;}
    if(form.get("presentation_columns")){const columns=Number(form.get("presentation_columns"));if(![1,2,3].includes(columns))throw new Error("Choose one, two or three text columns.");appearance.columns=columns;}
    if(String(form.get("presentation_columnGap")??"").trim()){const gap=Number(form.get("presentation_columnGap"));if(!Number.isFinite(gap)||gap<0||gap>120)throw new Error("Column gap must be between 0 and 120px.");appearance.columnGap=gap;}
    appearance.border=form.get("presentation_border")==="yes";extras.appearance=appearance;
  }
  const textPresentation = readBlockPresentation({ textPresentation: { ...extras, header, body, headerSize: form.get("presentation_header_size"), bodySize: form.get("presentation_body_size"), placement: form.get("presentation_placement") } });
  return { ...settings, textPresentation };
}

// Recover prompts hidden by an earlier save of the generic presentation seed.
export function responsePresentationSettings(settings: unknown, label?: string, instructions?: string | null) {
  const p = readBlockPresentation(settings);
  if (!p || !label || !["Short Response", "Long Response"].includes(p.header.trim()) || label === p.header.trim()) return settings;
  return { ...(settings as Record<string, unknown>), textPresentation: { ...p, header: label, body: p.body || instructions || "" } };
}

export function readBlockAppearance(settings:unknown){if(!settings||typeof settings!=="object")return undefined;return readBlockPresentation({textPresentation:{header:"",body:"",appearance:(settings as Record<string,unknown>).blockAppearance}})?.appearance;}
