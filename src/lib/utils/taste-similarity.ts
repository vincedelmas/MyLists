const RATING_RANGE = 10;
const CONFIDENCE_PRIOR = 10;
const CORRELATION_WEIGHT = 0.6;
const MINIMUM_CORRELATION_SAMPLE = 5;
const AGREEMENT_WEIGHT = 1 - CORRELATION_WEIGHT;


export type RatingAggregate = {
    count: number;
    sumMine: number;
    sumTheirs: number;
    sumProduct: number;
    sumMineSquared: number;
    sumTheirsSquared: number;
    sumAbsoluteDifference: number;
};


export const emptyRatingAggregate = (): RatingAggregate => ({
    count: 0,
    sumMine: 0,
    sumTheirs: 0,
    sumProduct: 0,
    sumMineSquared: 0,
    sumTheirsSquared: 0,
    sumAbsoluteDifference: 0,
});


export const mergeRatingAggregates = (target: RatingAggregate, source: RatingAggregate) => {
    target.count += source.count;
    target.sumMine += source.sumMine;
    target.sumTheirs += source.sumTheirs;
    target.sumProduct += source.sumProduct;
    target.sumMineSquared += source.sumMineSquared;
    target.sumTheirsSquared += source.sumTheirsSquared;
    target.sumAbsoluteDifference += source.sumAbsoluteDifference;

    return target;
};


export const calculateTasteSimilarity = (aggregate: RatingAggregate, confidenceAdjusted = true) => {
    if (aggregate.count === 0) return 0;

    const agreement = 1 - aggregate.sumAbsoluteDifference / aggregate.count / RATING_RANGE;
    const mineVariance = aggregate.count * aggregate.sumMineSquared - aggregate.sumMine ** 2;
    const theirVariance = aggregate.count * aggregate.sumTheirsSquared - aggregate.sumTheirs ** 2;
    const denominator = Math.sqrt(Math.max(0, mineVariance * theirVariance));

    const correlation = aggregate.count < MINIMUM_CORRELATION_SAMPLE || denominator === 0
        ? null
        : (aggregate.count * aggregate.sumProduct - aggregate.sumMine * aggregate.sumTheirs) / denominator;

    const rawSimilarity = correlation === null
        ? agreement
        : CORRELATION_WEIGHT * ((Math.max(-1, Math.min(1, correlation)) + 1) / 2) + AGREEMENT_WEIGHT * agreement;

    if (!confidenceAdjusted) {
        return Math.round(Math.max(0, Math.min(1, rawSimilarity)) * 100);
    }

    const confidence = aggregate.count / (aggregate.count + CONFIDENCE_PRIOR);
    const adjustedSimilarity = confidence * rawSimilarity + (1 - confidence) * 0.5;

    return Math.round(Math.max(0, Math.min(1, adjustedSimilarity)) * 100);
};
