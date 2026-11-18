-- Accepted-answer counts per question (no player ids). Used offline by tools/adapt.mjs to blend real play into the tier prior.
CREATE TABLE IF NOT EXISTS answer_counts (
  qid TEXT NOT NULL,
  answer TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(qid,answer)
);
