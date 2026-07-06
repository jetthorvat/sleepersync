/** User-facing import format guidance. Column order does not matter. */
export const IMPORT_FORMAT = {
  title: "Ranking import format",
  summary:
    "Column order does not matter. We auto-detect headers from the first row. Export from Google Sheets or Excel as CSV, or paste a copied table.",
  required: [
    { column: "Player", aliases: "Name, Full Name" },
    { column: "Rank", aliases: "Overall, RK — or use ADP if you rank by ADP" },
  ],
  optional: [
    { column: "ADP", aliases: "Average Draft Position" },
    { column: "Projection", aliases: "Proj, Points, FPTS" },
    { column: "Position", aliases: "Pos" },
    { column: "Team", aliases: "TM, NFL Team" },
    { column: "Tier", aliases: "Group" },
    { column: "Bye", aliases: "Bye Week" },
    { column: "Notes", aliases: "Comment" },
  ],
  exampleHeaders: "Rank,Player,Position,Team,ADP,Projection",
  exampleRow: "1,Ja'Marr Chase,WR,CIN,5.2,756.6",
} as const;
