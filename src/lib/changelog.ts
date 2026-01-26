export type ChangelogEntry = {
  version: string;
  date?: string;
  changes: string[];
};

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.2.1",
    date: "2026-01-26",
    changes: [
      "Add TinyURL integration for shortened share links",
      "Improved QR code generation using short URLs for easier scanning",
      "Updated share modal with collapsible full URL section",
    ],
  },
  {
    version: "0.2.0",
    date: "2026-01-21",
    changes: [
      "Add Plate Notation (PN) for quick unencrypted sharing",
      "Add QR code generation for shareable URLs",
      "Share plates via compact encoded URLs",
    ],
  },
  {
    version: "0.1.0",
    date: "2026-01-21",
    changes: [
      "Initial release",
      "Support for 6, 12, 24, 48, 96, and 384-well plates",
      "CSV import/export",
      "Titration series setup",
      "Edge effect exclusion",
      "Compound color legend",
    ],
  },
];
