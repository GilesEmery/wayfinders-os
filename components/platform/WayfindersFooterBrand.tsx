export function WayfindersFooterBrand() {
  return (
    <a
      aria-label="Visit the Wayfinders website"
      className="footer-wayfinders-link"
      href="https://yourwayfinders.org"
    >
      {/* A plain img keeps this public SVG direct and avoids image-optimizer rendering differences. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt="Wayfinders — Activate Your Purpose"
        className="footer-wayfinders-logo"
        height="64"
        src="/brand/wayfinders/Wayfinders_Logo_SecondaryFull_Black.svg"
        width="200"
      />
    </a>
  );
}
