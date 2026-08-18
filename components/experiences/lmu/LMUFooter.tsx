export function LMUFooter() {
  return (
    <footer className="site-footer">
      <p>Life Mapping U</p>
      {/* A plain img keeps this public SVG direct and avoids image-optimizer rendering differences. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt="Wayfinders — Activate Your Purpose"
        className="footer-wayfinders-logo"
        height="64"
        src="/brand/wayfinders/Wayfinders_Logo_SecondaryFull_Black.svg"
        width="200"
      />
    </footer>
  );
}
