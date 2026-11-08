// Slot identity is encoded in new bouquet IDs; existing cards retain their IDs.
export function bouquetSlots(collection) {
  const slots = Array(6).fill(null);
  const legacy = [];
  for (const card of collection) {
    const match = /^bouquet-slot-([1-6])$/.exec(card.id);
    if (match && !slots[Number(match[1]) - 1])
      slots[Number(match[1]) - 1] = card;
    else legacy.push(card);
  }
  for (const card of legacy) {
    const index = slots.indexOf(null);
    if (index !== -1) slots[index] = card;
  }
  return slots;
}
export const nextBouquetSlot = (collection) =>
  bouquetSlots(collection).indexOf(null) + 1;
