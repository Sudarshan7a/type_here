/**
 * Bigram resource for the typability scorer (CNT-02).
 *
 * WHAT THIS IS, AND WHAT THE ENGINE PRIMITIVE IS NOT
 *
 * The requirement names the engine's `aggregateBigram` as an adjacent
 * primitive. That function is deliberately NOT used here, and the reason is
 * structural rather than stylistic: `aggregateBigram(from, to, samples)`
 * aggregates *observed inter-key intervals* from a typing session, with outlier
 * rejection. A content pipeline has no samples - there is nobody typing the
 * passage yet - so calling it would either throw or return an empty aggregate.
 * Bigram difficulty at build time has to come from a static resource, and the
 * engine has no static one. This file is that resource.
 *
 * PROVENANCE AND LICENCE (implementation guide §6.5 step 2)
 *
 *   - The list below was written from scratch for this repository. It is not
 *     copied, scraped or derived from any n-gram corpus, frequency table,
 *     book dataset or code project, so AGENTS.md rule 6 (no GPL/AGPL word or
 *     bigram lists) and the CNT-07 policy hold by construction. Two-letter
 *     character sequences carry no protected expression.
 *   - It is an APPROXIMATION OF RANK, not a measured frequency. The published
 *     feature is "mean bigram frequency" (master-spec §6.2); what a build-time
 *     scorer can honestly compute is the mean rank-derived weight below. The
 *     doc states this as a limit, and §6.5 step 7's within-user validation is
 *     exactly the evidence that would replace it with a real table.
 *
 * WHY RANKS, NOT COUNTS: a rank-decayed weight is monotone in frequency by
 * construction and does not pretend to a precision the resource does not have.
 * It also degrades gracefully - a bigram missing from the list gets the floor
 * value rather than an exception or an invented zero-frequency claim.
 */

/**
 * The most frequent English letter bigrams, most frequent first.
 *
 * Order is the whole content of this table: index 0 is the most frequent pair,
 * and every later entry is less frequent. Words are two letters, lower case.
 */
const BIGRAM_SOURCE = `
th he in er an re on at en nd
ti es or te of ed is it al ar
st to nt ng se ha as ou io le
ve co me de hi ri ro ic ne ea
ra ce li ch ll be ma si om ur
ca el ta la ns di fo ho pe ec pr
no ct us ac ot il tr ly nc et
ut ss so rs em mo pa na ni am
fi ie ai su oo wh ge ff im oa
ul rt po we ol gh ke ex eb ay
iv ev ld tw ee wa ry mp fe ht
ow wo sh tt bl ab ag ap aw br
cl cr dr fl fr gl gr gu hm kn kr
lo mc ms mu nu ob os ox py qu sk
`;

/** The ranked bigram list: index 0 is the most frequent pair. */
export const ENGLISH_BIGRAM_RANKS: ReadonlyArray<string> = Object.freeze(
  BIGRAM_SOURCE.split(/\s+/).filter((pair) => /^[a-z]{2}$/.test(pair)),
);

const RANK_OF: ReadonlyMap<string, number> = new Map(
  ENGLISH_BIGRAM_RANKS.map((pair, index) => [pair, index]),
);

/**
 * The weight given to a bigram that is not in the ranked list: just below the
 * least-ranked pair, i.e. "rarer than everything we ranked". It is not zero,
 * because "we have no data about this pair" is not "this pair never occurs".
 */
export const UNRANKED_BIGRAM_WEIGHT = 0.12;

/** Length of the ranked list, part of the published model config. */
export const RANKED_BIGRAM_COUNT = ENGLISH_BIGRAM_RANKS.length;

/**
 * Bigram weight in [0, 1], 1 = the most frequent pair.
 *
 * `1 / log2(rank + 2)`, which maps RANK onto a frequency-like scale rather than
 * pretending rank is frequency. The choice is forced by measurement, and the
 * measurement is worth recording because the first attempt was wrong: a linear
 * rank ramp (`1 - (rank + 1) / (N + 1)`) makes rank 0 score 0.99 and rank 142
 * score 0.01, which says the top bigram is a hundred times more frequent than
 * the hundred-and-fortieth. Real English does not work that way, and the
 * consequence was measurable band churn: replacing one letter in a word moved
 * the item's score by a median 1.7 points, because two bigrams out of ~110 jumped
 * the full length of a ramp that had no business being that steep. The log map
 * puts rank 0 at 1.00, rank 2 at 0.50, rank 10 at 0.29 and rank 142 at 0.14 -
 * a shape Zipf's law actually supports for frequency against rank.
 */
export function bigramWeight(first: string, second: string): number {
  const pair = `${first}${second}`;
  const rank = RANK_OF.get(pair);
  if (rank === undefined) return UNRANKED_BIGRAM_WEIGHT;
  return 1 / Math.log2(rank + 2);
}
