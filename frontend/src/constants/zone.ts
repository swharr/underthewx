export const USDA_ZONE = "6b-7a";
export const SPRING_FROST_MMDD = "04-25";
export const FALL_FROST_MMDD = "10-05";

export function getFrostDates(year: number) {
  return {
    springFrost: new Date(`${year}-${SPRING_FROST_MMDD}`),
    fallFrost: new Date(`${year}-${FALL_FROST_MMDD}`),
  };
}
