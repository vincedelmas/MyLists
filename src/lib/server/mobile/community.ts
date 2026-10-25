import type {HallOfFameSearch} from "@/lib/schemas/common.schema";
import {getContainer} from "@/lib/server/core/container";
import {mobileImagePath} from "./images";
import {getTrendsMediaData} from "@/lib/server/domain/media/trends";

export const getMobileTrends = async () => getTrendsMediaData();

export const getMobileHallOfFame = async (userId: number, filters: HallOfFameSearch) => {
    const { services } = await getContainer();
    const data = await services.stats.userHallOfFameData(filters, userId);
    return { ...data, items: data.items.map(item => ({ ...item, image: item.image ? mobileImagePath(item.image) : null, isOwn: item.id === userId })) };
};
