"use client";

import { useState } from "react";
import { Document, G, Image, Page, Path, PDFDownloadLink, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";

export type LifeMapPdfSection = {
  id: string;
  number?: number;
  title: string;
  rankLabel: string;
  preview: string;
  heading: string;
  items: Array<{ primary: string; secondary?: string; body?: string }>;
};

const orange = "#f36a21";
const charcoal = "#252a28";
const cream = "#fbf8f1";
const border = "#d8d1c4";

const styles = StyleSheet.create({
  page: { backgroundColor: "#ffffff", color: charcoal, fontFamily: "Helvetica", fontSize: 8.5, paddingBottom: 42, paddingHorizontal: 34, paddingTop: 0 },
  header: { alignItems: "center", backgroundColor: charcoal, flexDirection: "row", height: 42, justifyContent: "space-between", marginBottom: 12, marginHorizontal: -34, overflow: "hidden", paddingHorizontal: 34, position: "relative" },
  headerTerrain: { height: 105, opacity: .15, position: "absolute", right: -8, top: -31, width: 150 },
  logo: { height: 22, objectFit: "contain", width: 110 },
  headerText: { color: "#c4c8c5", fontSize: 6.5, letterSpacing: 1.2, position: "relative", textTransform: "uppercase" },
  footer: { alignItems: "center", borderTopColor: border, borderTopWidth: .7, bottom: 13, flexDirection: "row", fontSize: 6.2, justifyContent: "space-between", left: 34, paddingTop: 6, position: "absolute", right: 34, textTransform: "uppercase" },
  footerCenter: { color: "#666b68" },
  wayfindersLogo: { height: 20, objectFit: "contain", width: 84 },
  eyebrow: { color: orange, fontSize: 7, fontWeight: 700, letterSpacing: 1.6, marginBottom: 7, textTransform: "uppercase" },
  title: { fontSize: 20, fontWeight: 700, letterSpacing: -.6, lineHeight: 1.05, marginBottom: 11, textTransform: "uppercase" },
  rule: { backgroundColor: orange, height: 2, marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginBottom: 13 },
  card: { backgroundColor: cream, borderColor: border, borderRadius: 3, borderWidth: .7, flexDirection: "row", minHeight: 55, padding: 7, width: "32.3%" },
  foundationCard: { backgroundColor: cream, borderColor: orange, borderLeftWidth: 3, borderRadius: 3, borderWidth: .7, flexDirection: "row", marginBottom: 9, minHeight: 55, padding: 8, width: "100%" },
  prioritiesLabel: { color: orange, fontSize: 7, fontWeight: 700, letterSpacing: 1.4, marginBottom: 6, textTransform: "uppercase" },
  number: { color: orange, fontFamily: "Times-Roman", fontSize: 8, marginRight: 5, marginTop: 3, width: 13 },
  cardBody: { flex: 1, paddingLeft: 5 },
  cardTitle: { fontSize: 7.6, fontWeight: 700, letterSpacing: .7, marginBottom: 3, textTransform: "uppercase" },
  cardRank: { color: orange, fontSize: 6.2, letterSpacing: .7, marginBottom: 4, textTransform: "uppercase" },
  preview: { color: "#6d706e", fontFamily: "Times-Roman", fontSize: 6.4, lineHeight: 1.3 },
  detailsGrid: { gap: 7 },
  detailRow: { alignItems: "stretch", flexDirection: "row", gap: 8 },
  detailCell: { width: "49%" },
  section: { flexGrow: 1, width: "100%" },
  sectionHeader: { alignItems: "center", flexDirection: "row", marginBottom: 4 },
  sectionNumber: { color: orange, fontFamily: "Times-Roman", fontSize: 8, marginRight: 6, width: 16 },
  sectionMeta: { flex: 1, paddingLeft: 8 },
  rank: { color: orange, fontSize: 6.3, letterSpacing: 1.1, marginBottom: 2, textTransform: "uppercase" },
  sectionTitle: { fontSize: 11, fontWeight: 700, letterSpacing: .2, textTransform: "uppercase" },
  sectionRule: { backgroundColor: orange, height: 1.25, marginBottom: 5 },
  box: { backgroundColor: cream, borderColor: border, borderRadius: 3, borderWidth: .7, flexGrow: 1, paddingHorizontal: 8, paddingVertical: 5 },
  boxHeading: { color: orange, fontSize: 6.4, fontWeight: 700, letterSpacing: 1.3, marginBottom: 4, textTransform: "uppercase" },
  item: { borderBottomColor: border, borderBottomWidth: .55, marginBottom: 3, paddingBottom: 3 },
  itemLast: { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 },
  primary: { fontSize: 7.1, fontWeight: 700, lineHeight: 1.18 },
  secondary: { color: "#6c706d", fontSize: 5.8, marginTop: 1 },
  body: { fontFamily: "Times-Roman", fontSize: 6.2, lineHeight: 1.22, marginTop: 1.5 },
});

const iconPaths: Record<string, string[]> = {
  "success-stories": ["M3 5h7l2 2 2-2h7v14h-7l-2 2-2-2H3Z", "M12 7v14M6 9h3M15 9h3"],
  "transferable-skills": ["M10 2h4l.5 3 2 .8L19 4.1 21.9 7l-1.7 2.5.8 2 3 .5v4l-3 .5-.8 2 1.7 2.5-2.9 2.9-2.5-1.7-2 .8-.5 3h-4l-.5-3-2-.8L5 23.9 2.1 21l1.7-2.5-.8-2-3-.5v-4l3-.5.8-2L2.1 7 5 4.1l2.5 1.7 2-.8Z", "M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6"],
  teammates: ["M12 4.4a2.6 2.6 0 1 0 0 5.2 2.6 2.6 0 0 0 0-5.2M5.5 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4M18.5 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4", "M7.5 19v-2.5c0-2.6 2-4.5 4.5-4.5s4.5 1.9 4.5 4.5V19ZM1.8 18v-1.6c0-2.1 1.6-3.7 3.7-3.7M22.2 18v-1.6c0-2.1-1.6-3.7-3.7-3.7"],
  supervisor: ["M9 6.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5", "M4.5 20v-3c0-2.8 1.8-4.8 4.5-4.8s4.5 2 4.5 4.8v3M14 11l5-5M15 6h4v4M15 15h5M18 12l2 3-2 3"],
  values: ["M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17", "m15.5 8.5-2 5-5 2 2-5Z"],
  growth: ["M5 20h5v-5h5v-5h5", "M4 14l9-9M9 5h4v4"],
  location: ["m3.5 11 8.5-7 8.5 7", "M5.5 9.5V20h13V9.5M10 20v-6h4v6"],
  "x-factor": ["M5 5l14 14M19 5 5 19"],
  salary: ["M16.8 7.2c-.9-1.3-2.5-2-4.5-2-2.6 0-4.4 1.3-4.4 3.3 0 4.8 9.1 2.4 9.1 7.3 0 2.1-1.9 3.5-4.7 3.5-2.1 0-4-.8-5-2.2M12.2 2.8v18.4"],
};

function Badge({ id, size = 28 }: { id: string; size?: number }) {
  return <Svg height={size} viewBox="0 0 32 31" width={size}>
    <Path d="M1 1h30v25.5L16 30 1 26.5Z" fill={orange}/>
    <G transform="translate(7 5) scale(.75)">{iconPaths[id]?.map((path, index) => <Path d={path} fill="none" key={index} stroke="#fff" strokeLinecap="square" strokeLinejoin="bevel" strokeWidth={id === "x-factor" ? 2.2 : 1.65}/>)}</G>
  </Svg>;
}

function RunningChrome({ assetBase = "", pageKey }: { assetBase?: string; pageKey: string }) {
  return <>
    {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no HTML alt prop */}
    <View key={`header-${pageKey}`} style={styles.header}><Image src={`${assetBase}/brand/lmu/maps/map-gray-header.png`} style={styles.headerTerrain}/><Image src={`${assetBase}/brand/lmu/lmu-wordmark-invert.png`} style={styles.logo}/><Text style={styles.headerText}>Assessment Results · Your Life Map</Text></View>
    {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no HTML alt prop */}
    <View fixed key={`footer-${pageKey}`} style={styles.footer}><Text>Life Mapping U</Text><Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} style={styles.footerCenter}/><Image src={`${assetBase}/brand/wayfinders/Wayfinders_Logo_SecondaryFull_Black.png`} style={styles.wayfindersLogo}/></View>
  </>;
}

function Section({ section }: { section: LifeMapPdfSection }) {
  return <View minPresenceAhead={85} style={styles.section} wrap={false}>
    <View style={styles.sectionHeader} wrap={false}>{section.number ? <Text style={styles.sectionNumber}>{String(section.number).padStart(2, "0")}</Text> : <View style={styles.sectionNumber}/>}<Badge id={section.id} size={27}/><View style={styles.sectionMeta}><Text style={styles.rank}>{section.rankLabel}</Text><Text style={styles.sectionTitle}>{section.title}</Text></View></View>
    <View style={styles.sectionRule}/><View style={styles.box}><Text style={styles.boxHeading}>{section.heading}</Text>{section.items.map((item, index) => <View key={`${item.primary}-${index}`} style={[styles.item, index === section.items.length - 1 ? styles.itemLast : {}]} wrap={false}><Text style={styles.primary}>{item.primary}</Text>{item.secondary ? <Text style={styles.secondary}>{item.secondary}</Text> : null}{item.body ? <Text style={styles.body}>{item.body}</Text> : null}</View>)}</View>
  </View>;
}

function SectionRows({ sections }: { sections: LifeMapPdfSection[] }) {
  const rows = Array.from({ length:Math.ceil(sections.length / 2) }, (_, index) => sections.slice(index * 2, index * 2 + 2));
  return <View style={styles.detailsGrid}>{rows.map((row, rowIndex) => <View key={rowIndex} style={styles.detailRow} wrap={false}>{row.map((section) => <View key={section.id} style={styles.detailCell}><Section section={section}/></View>)}</View>)}</View>;
}

export function LifeMapDocument({ sections, assetBase = "" }: { sections: LifeMapPdfSection[]; assetBase?: string }) {
  const foundation = sections.find((section) => section.id === "success-stories");
  const priorities = sections.filter((section) => section.id !== "success-stories");
  const detailSections = foundation ? [foundation, ...priorities] : priorities;
  return <Document title="Life Mapping U - Your Life Map" author="Wayfinders">
    <Page size="LETTER" style={styles.page} wrap><RunningChrome assetBase={assetBase} pageKey="one"/><Text style={styles.eyebrow}>Your Life Map</Text><Text style={styles.title}>Your foundation and current priorities.</Text><View style={styles.rule}/>{foundation ? <View style={styles.foundationCard} wrap={false}><Badge id={foundation.id} size={26}/><View style={styles.cardBody}><Text style={styles.cardRank}>Foundation</Text><Text style={styles.cardTitle}>{foundation.title}</Text><Text style={styles.preview}>{foundation.preview}</Text></View></View> : null}<Text style={styles.prioritiesLabel}>Your Priorities</Text><View style={styles.grid}>{priorities.map((section) => <View key={section.id} style={styles.card} wrap={false}><Text style={styles.number}>{String(section.number).padStart(2, "0")}</Text><Badge id={section.id} size={26}/><View style={styles.cardBody}><Text style={styles.cardTitle}>{section.title}</Text><Text style={styles.cardRank}>{section.rankLabel}</Text><Text style={styles.preview}>{section.preview}</Text></View></View>)}</View><SectionRows sections={detailSections.slice(0,4)}/></Page>
    <Page size="LETTER" style={styles.page} wrap>
      <View style={styles.header}>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no HTML alt prop */}
        <Image src={`${assetBase}/brand/lmu/maps/map-gray-header.png`} style={styles.headerTerrain}/>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no HTML alt prop */}
        <Image src={`${assetBase}/brand/lmu/lmu-wordmark-invert.png`} style={styles.logo}/>
        <Text style={styles.headerText}>Assessment Results · Your Life Map</Text>
      </View>
      <View fixed style={styles.footer}>
        <Text>Life Mapping U</Text>
        <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} style={styles.footerCenter}/>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no HTML alt prop */}
        <Image src={`${assetBase}/brand/wayfinders/Wayfinders_Logo_SecondaryFull_Black.png`} style={styles.wayfindersLogo}/>
      </View>
      <SectionRows sections={detailSections.slice(4)}/>
    </Page>
  </Document>;
}

export function LifeMapPdfDownload({ enabled, sections }: { enabled: boolean; sections: LifeMapPdfSection[] }) {
  const [started, setStarted] = useState(false);
  if (!enabled) return <button className="button button-primary" disabled type="button">Download My Life Map</button>;
  return <PDFDownloadLink document={<LifeMapDocument sections={sections}/>} fileName="Life-Mapping-U-Life-Map.pdf" className="button button-primary" onClick={() => setStarted(true)}>{({ loading }) => <><span>{loading ? "Preparing PDF…" : started ? "Download Again" : "Download My Life Map"}</span><span aria-hidden="true">↓</span></>}</PDFDownloadLink>;
}
