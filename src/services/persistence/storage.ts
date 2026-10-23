export type StorageLike = Pick<Storage, "getItem" | "setItem"> &
  Partial<Pick<Storage, "removeItem">>;
